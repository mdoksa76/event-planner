import GObject from 'gi://GObject';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Pango from 'gi://Pango';

import { formatDateDisplay } from '../utils/dateUtils.js';
import { getCategoryColor, getCategoryName } from '../utils/constants.js';

const DEBUG = false;

/**
 * Event list widget - shows events for selected date
 */
export const EventListWidget = GObject.registerClass(
class EventListWidget extends St.ScrollView {
    
    _init(date, eventManager, settings, onEdit, onDelete) {
        super._init({
            style_class: 'event-planner-event-list',
            x_expand: true,
            y_expand: true,
            overlay_scrollbars: true
        });

        // Create clean local date (no time component)
        this._date = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        this._eventManager = eventManager;
        this._settings = settings;
        this._onEdit = onEdit;
        this._onDelete = onDelete;
        
        if (DEBUG) console.log('EventListWidget initialized with _date:', this._date, 'Year:', this._date.getFullYear(), 'Month:', this._date.getMonth() + 1, 'Day:', this._date.getDate());

        // Container for event items
        this._container = new St.BoxLayout({
            vertical: true,
            style_class: 'event-list-container'
        });

        this.set_child(this._container);
        this._buildEventList();
    }

    /**
     * Build the event list
     */
    _buildEventList() {
        if (DEBUG) console.log('EventListWidget._buildEventList() called for date:', this._date, 'Year:', this._date.getFullYear(), 'Month:', this._date.getMonth() + 1, 'Day:', this._date.getDate());
        
        // Clear existing items
        this._container.destroy_all_children();

        const events = this._eventManager.getEventsForDay(this._date);
        if (DEBUG) console.log('Building list with', events.length, 'events for this date');

        if (events.length === 0) {
            this._showEmptyState();
            return;
        }

        // Add each event
        events.forEach((event, index) => {
            const eventItem = this._createEventItem(event, index);
            this._container.add_child(eventItem);
        });
    }

    /**
     * Show empty state when no events
     */
    _showEmptyState() {
        const emptyBox = new St.BoxLayout({
            vertical: true,
            style_class: 'event-list-empty',
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER
        });

        const icon = new St.Icon({
            icon_name: 'x-office-calendar-symbolic',
            icon_size: 48,
            style_class: 'event-list-empty-icon'
        });
        emptyBox.add_child(icon);

        const label = new St.Label({
            text: `No events for ${formatDateDisplay(this._date)}`,
            style_class: 'event-list-empty-label'
        });
        // Enable wrapping for long dates too
        label.clutter_text.line_wrap = true;
        label.clutter_text.line_wrap_mode = Pango.WrapMode.WORD_CHAR;
        
        emptyBox.add_child(label);

        const hint = new St.Label({
            text: 'Click "Add Event" to create one',
            style_class: 'event-list-empty-hint'
        });
        hint.clutter_text.line_wrap = true;
        hint.clutter_text.line_wrap_mode = Pango.WrapMode.WORD_CHAR;
        
        emptyBox.add_child(hint);

        this._container.add_child(emptyBox);
    }

    /**
     * Create a single event item
     */
    _createEventItem(event, index) {
        const itemBox = new St.BoxLayout({
            vertical: false,
            style_class: 'event-list-item',
            reactive: true,
            track_hover: true,
            natural_width: 380  // Force fixed width for entire item
        });

        // Category color indicator
        const categoryColor = getCategoryColor(event.category, this._settings);
        const colorBar = new St.Widget({
            style: `background-color: ${categoryColor}; width: 4px;`,
            y_expand: true
        });
        itemBox.add_child(colorBar);

        // Event content
        const contentBox = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            style_class: 'event-item-content'
        });

        // Time and title
        const titleBox = new St.BoxLayout({
            vertical: false,
            x_expand: true
        });

        const timeLabel = new St.Label({
            text: event.getTimeRangeString(),
            style_class: 'event-item-time'
        });
        timeLabel.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
        titleBox.add_child(timeLabel);

        const titleLabel = new St.Label({
            text: event.title,
            style_class: 'event-item-title',
            x_expand: false,  // Changed from true
            natural_width: 250  // Force fixed width (shorter because of time label)
        });
        // Enable word wrapping
        titleLabel.clutter_text.line_wrap = true;
        titleLabel.clutter_text.line_wrap_mode = Pango.WrapMode.WORD_CHAR;
        titleLabel.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
        
        titleBox.add_child(titleLabel);

        contentBox.add_child(titleBox);

        // Description and category
        if (event.description) {
            const descLabel = new St.Label({
                text: event.description,
                style_class: 'event-item-description',
                natural_width: 280  // Force fixed width
            });
            // Enable word wrapping for description too
            descLabel.clutter_text.line_wrap = true;
            descLabel.clutter_text.line_wrap_mode = Pango.WrapMode.WORD_CHAR;
            descLabel.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
            
            contentBox.add_child(descLabel);
        }

        const categoryLabel = new St.Label({
            text: getCategoryName(event.category, this._settings),
            style_class: 'event-item-category'
        });
        categoryLabel.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
        contentBox.add_child(categoryLabel);

        itemBox.add_child(contentBox);

        // Action buttons
        const actionBox = new St.BoxLayout({
            vertical: false,
            style_class: 'event-item-actions'
        });

        // Edit button
        const editButton = new St.Button({
            style_class: 'event-action-button',
            child: new St.Icon({
                icon_name: 'document-edit-symbolic',
                icon_size: 16
            })
        });
        editButton.connect('clicked', () => {
            if (this._onEdit) {
                this._onEdit(index, event);
            }
        });
        actionBox.add_child(editButton);

        // Delete button
        const deleteButton = new St.Button({
            style_class: 'event-action-button event-delete-button',
            child: new St.Icon({
                icon_name: 'edit-delete-symbolic',
                icon_size: 16
            })
        });
        deleteButton.connect('clicked', () => {
            if (this._onDelete) {
                this._onDelete(index);
            }
        });
        actionBox.add_child(deleteButton);

        itemBox.add_child(actionBox);

        return itemBox;
    }

    /**
     * Set the date to display events for
     */
    setDate(date) {
        if (DEBUG) console.log('EventListWidget.setDate() called with:', date, 'Year:', date.getFullYear(), 'Month:', date.getMonth() + 1, 'Day:', date.getDate());
        // Create fresh copy of the date
        this._date = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        if (DEBUG) console.log('EventListWidget internal _date now:', this._date);
        this.refresh();
    }

    /**
     * Refresh the event list
     */
    refresh() {
        if (DEBUG) console.log('EventListWidget.refresh() called for date:', this._date);
        this._buildEventList();
    }
});