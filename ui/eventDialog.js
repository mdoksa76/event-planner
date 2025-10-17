import St from 'gi://St';
import Clutter from 'gi://Clutter';
import * as ModalDialog from 'resource:///org/gnome/shell/ui/modalDialog.js';

import { Event } from '../models/event.js';
import { getAllCategories, getCategoryName, getCategoryColor } from '../utils/constants.js';
import { formatTime } from '../utils/dateUtils.js';

const DEBUG = false;

/**
 * Dialog for adding/editing events
 */
export class EventDialog {
    
    constructor(existingEvent, settings, callback) {
        this._existingEvent = existingEvent || null;
        this._settings = settings;
        this._callback = callback;
        
        // Initialize form values
        if (existingEvent) {
            this._titleText = existingEvent.title;
            this._startTime = { ...existingEvent.startTime };
            this._endTime = { ...existingEvent.endTime };
            this._descriptionText = existingEvent.description;
            this._category = existingEvent.category;
            this._showNotification = existingEvent.showNotification;
            this._notificationMinutes = existingEvent.notificationMinutes || this._settings.get_int('notification-minutes');
        } else {
            this._titleText = '';
            const now = new Date();
            this._startTime = { hour: now.getHours(), minute: 0 };
            this._endTime = { hour: (now.getHours() + 1) % 24, minute: 0 };
            this._descriptionText = '';
            this._category = 'work';
            this._showNotification = false;
            this._notificationMinutes = this._settings.get_int('notification-minutes');
        }

        // Create modal dialog
        this._dialog = new ModalDialog.ModalDialog({ styleClass: 'event-dialog' });
        
        this._buildDialog();
    }

    /**
     * Build the dialog UI
     */
    _buildDialog() {
        // Main content box
        const contentBox = new St.BoxLayout({
            vertical: true,
            style_class: 'event-dialog-content'
        });

        // Title input
        contentBox.add_child(new St.Label({
            text: 'Title',
            style_class: 'event-dialog-label'
        }));

        this._titleEntry = new St.Entry({
            text: this._titleText,
            style_class: 'event-dialog-entry',
            can_focus: true,
            hint_text: 'Event title'
        });
        contentBox.add_child(this._titleEntry);

        // Time selection
        const timeBox = new St.BoxLayout({
            vertical: false,
            style_class: 'event-dialog-time-box'
        });

        // Start time
        const startBox = new St.BoxLayout({
            vertical: true,
            x_expand: true
        });
        startBox.add_child(new St.Label({
            text: 'Start Time',
            style_class: 'event-dialog-label'
        }));
        this._startTimeLabel = new St.Label({
            text: formatTime(this._startTime.hour, this._startTime.minute),
            style_class: 'event-dialog-time-display'
        });
        startBox.add_child(this._startTimeLabel);

        const startButtonBox = new St.BoxLayout({ vertical: false });
        const startHourUp = this._createTimeButton('⯅', () => this._adjustTime('start', 'hour', 1));
        const startHourDown = this._createTimeButton('⯆', () => this._adjustTime('start', 'hour', -1));
        const startMinuteUp = this._createTimeButton('⯅', () => this._adjustTime('start', 'minute', 1));
        const startMinuteDown = this._createTimeButton('⯆', () => this._adjustTime('start', 'minute', -1));
        
        startButtonBox.add_child(startHourUp);
        startButtonBox.add_child(startHourDown);
        startButtonBox.add_child(startMinuteUp);
        startButtonBox.add_child(startMinuteDown);
        startBox.add_child(startButtonBox);

        timeBox.add_child(startBox);

        // End time
        const endBox = new St.BoxLayout({
            vertical: true,
            x_expand: true
        });
        endBox.add_child(new St.Label({
            text: 'End Time',
            style_class: 'event-dialog-label'
        }));
        this._endTimeLabel = new St.Label({
            text: formatTime(this._endTime.hour, this._endTime.minute),
            style_class: 'event-dialog-time-display'
        });
        endBox.add_child(this._endTimeLabel);

        const endButtonBox = new St.BoxLayout({ vertical: false });
        const endHourUp = this._createTimeButton('⯅', () => this._adjustTime('end', 'hour', 1));
        const endHourDown = this._createTimeButton('⯆', () => this._adjustTime('end', 'hour', -1));
        const endMinuteUp = this._createTimeButton('⯅', () => this._adjustTime('end', 'minute', 1));
        const endMinuteDown = this._createTimeButton('⯆', () => this._adjustTime('end', 'minute', -1));
        
        endButtonBox.add_child(endHourUp);
        endButtonBox.add_child(endHourDown);
        endButtonBox.add_child(endMinuteUp);
        endButtonBox.add_child(endMinuteDown);
        endBox.add_child(endButtonBox);

        timeBox.add_child(endBox);

        contentBox.add_child(timeBox);

        // Description input
        contentBox.add_child(new St.Label({
            text: 'Description',
            style_class: 'event-dialog-label'
        }));

        this._descriptionEntry = new St.Entry({
            text: this._descriptionText,
            style_class: 'event-dialog-entry',
            hint_text: 'Event description (optional)'
        });
        contentBox.add_child(this._descriptionEntry);

        // Category selection
        contentBox.add_child(new St.Label({
            text: 'Category',
            style_class: 'event-dialog-label'
        }));

        const categoryBox = new St.BoxLayout({
            vertical: false,
            style_class: 'event-dialog-category-box'
        });

        // Get all categories (default + custom)
        const allCategories = getAllCategories(this._settings);
        this._categoryButtons = [];

        allCategories.forEach(categoryInfo => {
            const button = new St.Button({
                style_class: 'event-category-button',
                x_expand: true
            });

            const buttonBox = new St.BoxLayout({
                vertical: true,
                x_align: Clutter.ActorAlign.CENTER
            });

            const colorBox = new St.Widget({
                style: `background-color: ${categoryInfo.color}; width: 30px; height: 30px; border-radius: 15px;`,
                x_align: Clutter.ActorAlign.CENTER
            });
            buttonBox.add_child(colorBox);

            const label = new St.Label({
                text: categoryInfo.name,
                style_class: 'event-category-label'
            });
            buttonBox.add_child(label);

            button.set_child(buttonBox);

            if (categoryInfo.id === this._category) {
                button.add_style_class_name('selected');
            }

            button.connect('clicked', () => {
                this._selectCategory(categoryInfo.id);
            });

            this._categoryButtons.push({ button, categoryId: categoryInfo.id });
            categoryBox.add_child(button);
        });

        contentBox.add_child(categoryBox);

        // Notification checkbox
        const notificationBox = new St.BoxLayout({
            vertical: false,
            style_class: 'event-dialog-notification-box'
        });

        this._notificationCheckbox = new St.Button({
            style_class: 'event-notification-checkbox',
            toggle_mode: true,
            checked: this._showNotification
        });

        const checkboxIcon = new St.Icon({
            icon_name: this._showNotification ? 'object-select-symbolic' : 'window-close-symbolic',
            icon_size: 16
        });
        this._notificationCheckbox.set_child(checkboxIcon);

        this._notificationCheckbox.connect('clicked', () => {
            this._showNotification = this._notificationCheckbox.checked;
            const newIcon = new St.Icon({
                icon_name: this._showNotification ? 'object-select-symbolic' : 'window-close-symbolic',
                icon_size: 16
            });
            this._notificationCheckbox.set_child(newIcon);
            
            // Show/hide notification timing controls
            this._notificationTimingBox.visible = this._showNotification;
        });

        notificationBox.add_child(this._notificationCheckbox);

        const notificationLabel = new St.Label({
            text: 'Show notification for this event',
            style_class: 'event-notification-label',
            y_align: Clutter.ActorAlign.CENTER
        });
        notificationBox.add_child(notificationLabel);

        contentBox.add_child(notificationBox);

        // Notification timing (only show if notifications are enabled)
        this._notificationTimingBox = new St.BoxLayout({
            vertical: true,
            style_class: 'event-dialog-notification-timing',
            visible: this._showNotification
        });

        const timingLabel = new St.Label({
            text: 'Notify Before Event',
            style_class: 'event-dialog-label'
        });
        this._notificationTimingBox.add_child(timingLabel);

        const timingControlBox = new St.BoxLayout({
            vertical: false,
            style_class: 'event-notification-timing-controls'
        });

        this._notificationMinutesLabel = new St.Label({
            text: `${this._notificationMinutes} minutes`,
            style_class: 'event-notification-minutes-display',
            x_expand: true
        });
        timingControlBox.add_child(this._notificationMinutesLabel);

        const timingButtonBox = new St.BoxLayout({ vertical: false });
        
        const minutesUp = new St.Button({
            label: '⯅',
            style_class: 'event-time-button'
        });
        minutesUp.connect('clicked', () => {
            this._notificationMinutes = Math.min(60, this._notificationMinutes + 5);
            this._updateNotificationMinutesDisplay();
        });
        
        const minutesDown = new St.Button({
            label: '⯆',
            style_class: 'event-time-button'
        });
        minutesDown.connect('clicked', () => {
            this._notificationMinutes = Math.max(5, this._notificationMinutes - 5);
            this._updateNotificationMinutesDisplay();
        });

        timingButtonBox.add_child(minutesUp);
        timingButtonBox.add_child(minutesDown);
        timingControlBox.add_child(timingButtonBox);

        this._notificationTimingBox.add_child(timingControlBox);
        contentBox.add_child(this._notificationTimingBox);

        this._dialog.contentLayout.add_child(contentBox);

        // Dialog buttons
        this._dialog.addButton({
            label: 'Cancel',
            action: () => this._onCancel(),
            key: Clutter.KEY_Escape
        });

        this._dialog.addButton({
            label: 'Save',
            action: () => this._onSave(),
            default: true
        });
    }

    _createTimeButton(label, callback) {
        const button = new St.Button({
            label: label,
            style_class: 'event-time-button'
        });
        button.connect('clicked', callback);
        return button;
    }

    _adjustTime(type, unit, delta) {
        const time = type === 'start' ? this._startTime : this._endTime;

        if (unit === 'hour') {
            time.hour = (time.hour + delta + 24) % 24;
        } else {
            time.minute = (time.minute + delta + 60) % 60;
        }

        this._updateTimeDisplays();
    }

    _updateTimeDisplays() {
        this._startTimeLabel.set_text(formatTime(this._startTime.hour, this._startTime.minute));
        this._endTimeLabel.set_text(formatTime(this._endTime.hour, this._endTime.minute));
    }

    _updateNotificationMinutesDisplay() {
        this._notificationMinutesLabel.set_text(`${this._notificationMinutes} minutes`);
    }

    _selectCategory(categoryId) {
        this._category = categoryId;
        
        this._categoryButtons.forEach(({ button, categoryId: btnCategoryId }) => {
            if (btnCategoryId === categoryId) {
                button.add_style_class_name('selected');
            } else {
                button.remove_style_class_name('selected');
            }
        });
    }

    _onCancel() {
        if (DEBUG) console.log('Dialog cancelled');
        if (this._callback) {
            this._callback(null);
        }
        this._dialog.close();
    }

    _onSave() {
        if (DEBUG) console.log('Dialog save clicked');
        const title = this._titleEntry.get_text().trim();

        if (!title) {
            if (DEBUG) console.log('Title is empty');
            return;
        }

        const description = this._descriptionEntry.get_text().trim();

        const event = new Event(
            title,
            { ...this._startTime },
            { ...this._endTime },
            description,
            this._category,
            this._showNotification,
            this._showNotification ? this._notificationMinutes : null
        );

        const validation = event.isValid();
        if (!validation.valid) {
            console.error('Event validation failed:', validation.error);
            return;
        }

        if (DEBUG) console.log('Event created successfully, calling callback');
        if (this._callback) {
            this._callback(event);
        }
        this._dialog.close();
    }

    open() {
        if (DEBUG) console.log('Opening EventDialog');
        this._dialog.open();
    }

    close() {
        this._dialog.close();
    }

    destroy() {
        if (this._dialog) {
            this._dialog.destroy();
            this._dialog = null;
        }
    }
}