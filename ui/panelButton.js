import GObject from 'gi://GObject';
import St from 'gi://St';
import Clutter from 'gi://Clutter';

import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import { CalendarWidget } from './calendarWidget.js';
import { EventListWidget } from './eventList.js';
import { EventDialog } from './eventDialog.js';
import { formatDateDisplay } from '../utils/dateUtils.js';

const DEBUG = false;

/**
 * Panel button that appears in the top bar
 */
export const PanelButton = GObject.registerClass(
class PanelButton extends PanelMenu.Button {
    _init(extension, eventManager, settings) {
        super._init(0.0, 'Event Planner');

        this._extension = extension;
        this._eventManager = eventManager;
        this._settings = settings;
        
        // Initialize selected date as clean local date (today)
        const today = new Date();
        this._selectedDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        if (DEBUG) console.log('PanelButton initialized with _selectedDate:', this._selectedDate, 'Year:', this._selectedDate.getFullYear(), 'Month:', this._selectedDate.getMonth() + 1, 'Day:', this._selectedDate.getDate());

        // Create panel icon
        const icon = new St.Icon({
            icon_name: 'x-office-calendar-symbolic',
            style_class: 'system-status-icon'
        });

        this.add_child(icon);

        // Build menu content
        this._buildMenu();

        // Connect to event manager signals
        this._eventManagerSignals = [
            this._eventManager.connect('events-changed', this._onEventsChanged.bind(this)),
            this._eventManager.connect('all-events-loaded', this._onAllEventsLoaded.bind(this))
        ];
    }

    /**
     * Build the dropdown menu
     */
    _buildMenu() {
        // Header with current date
        this._headerLabel = new St.Label({
            text: formatDateDisplay(this._selectedDate),
            style_class: 'event-planner-header',
            x_expand: true
        });

        const headerBox = new St.BoxLayout({
            vertical: false,
            style_class: 'event-planner-header-box'
        });
        headerBox.add_child(this._headerLabel);

        const headerItem = new PopupMenu.PopupBaseMenuItem({
            reactive: false,
            can_focus: false
        });
        headerItem.add_child(headerBox);
        this.menu.addMenuItem(headerItem);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // Calendar widget with callback
        this._calendar = new CalendarWidget(
            this._selectedDate, 
            this._eventManager,
            (dateInfo) => {
                if (DEBUG) console.log('=== PANELBUTTON RECEIVED DATE FROM CALENDAR ===');
                if (DEBUG) console.log('Callback received dateInfo:', dateInfo);
                
                // Create Date from dateInfo object
                const newDate = new Date(dateInfo.year, dateInfo.month, dateInfo.day);
                if (DEBUG) console.log('Created newDate:', newDate, 'Year:', newDate.getFullYear(), 'Month:', newDate.getMonth() + 1, 'Day:', newDate.getDate());
                
                // Store the new date
                this._selectedDate = newDate;
                if (DEBUG) console.log('PanelButton _selectedDate updated to:', this._selectedDate, 'Year:', this._selectedDate.getFullYear(), 'Month:', this._selectedDate.getMonth() + 1, 'Day:', this._selectedDate.getDate());
                
                this._updateSelectedDate();
                if (DEBUG) console.log('=== PANELBUTTON CALLBACK COMPLETE ===');
            }
        );

        const calendarItem = new PopupMenu.PopupBaseMenuItem({
            reactive: false,
            can_focus: false
        });
        calendarItem.add_child(this._calendar);
        this.menu.addMenuItem(calendarItem);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // Event list
        this._eventList = new EventListWidget(
            this._selectedDate,
            this._eventManager,
            this._settings,
            this._onEditEvent.bind(this),
            this._onDeleteEvent.bind(this)
        );

        const eventListItem = new PopupMenu.PopupBaseMenuItem({
            reactive: false,
            can_focus: false
        });
        eventListItem.add_child(this._eventList);
        this.menu.addMenuItem(eventListItem);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // Add event button
        const addButton = new PopupMenu.PopupMenuItem('Add Event');
        addButton.connect('activate', () => {
            this._showEventDialog(null);
        });
        this.menu.addMenuItem(addButton);
    }

    /**
     * Update UI when selected date changes
     */
    _updateSelectedDate() {
        if (DEBUG) console.log('PanelButton._updateSelectedDate() called for:', this._selectedDate, 'Year:', this._selectedDate.getFullYear(), 'Month:', this._selectedDate.getMonth() + 1, 'Day:', this._selectedDate.getDate());
        this._headerLabel.set_text(formatDateDisplay(this._selectedDate));
        
        // Create fresh date object to ensure EventListWidget gets updated
        const freshDate = new Date(this._selectedDate.getFullYear(), this._selectedDate.getMonth(), this._selectedDate.getDate());
        if (DEBUG) console.log('Passing fresh date to EventListWidget:', freshDate);
        this._eventList.setDate(freshDate);
        this._calendar.setSelectedDate(this._selectedDate);
    }

    /**
     * Show event dialog for adding or editing
     */
    _showEventDialog(existingEvent, index) {
        if (DEBUG) console.log('_showEventDialog called. Current _selectedDate:', this._selectedDate, 'Year:', this._selectedDate.getFullYear(), 'Month:', this._selectedDate.getMonth() + 1, 'Day:', this._selectedDate.getDate());
        
        // Create a clean copy of the selected date to pass to the dialog callback
        const eventDate = new Date(this._selectedDate.getFullYear(), this._selectedDate.getMonth(), this._selectedDate.getDate());
        
        const dialog = new EventDialog(existingEvent, this._settings, (event) => {
            if (event) {
                if (DEBUG) console.log('Event saved:', event.title, 'for date:', eventDate);
                if (existingEvent) {
                    // Edit existing event
                    if (DEBUG) console.log('Updating event at index:', index);
                    this._eventManager.updateEvent(eventDate, index, event);
                } else {
                    // Add new event
                    if (DEBUG) console.log('Adding new event for date:', eventDate, 'Year:', eventDate.getFullYear(), 'Month:', eventDate.getMonth() + 1, 'Day:', eventDate.getDate());
                    this._eventManager.addEvent(eventDate, event);
                }
            }
        });

        dialog.open();
    }

    /**
     * Handle edit event
     */
    _onEditEvent(index, event) {
        if (DEBUG) console.log('Edit event called for index:', index, 'date:', this._selectedDate);
        const eventDate = new Date(this._selectedDate.getFullYear(), this._selectedDate.getMonth(), this._selectedDate.getDate());
        this._showEventDialog(event, index);
    }

    /**
     * Handle delete event
     */
    _onDeleteEvent(index) {
        if (DEBUG) console.log('Delete event called for index:', index, 'date:', this._selectedDate);
        const eventDate = new Date(this._selectedDate.getFullYear(), this._selectedDate.getMonth(), this._selectedDate.getDate());
        this._eventManager.deleteEvent(eventDate, index);
    }

    /**
     * Handle events changed signal
     */
    _onEventsChanged(manager, dateKey) {
        if (DEBUG) console.log('PanelButton._onEventsChanged called for:', dateKey);
        this._eventList.refresh();
        this._calendar.refresh();
    }

    /**
     * Handle all events loaded signal
     */
    _onAllEventsLoaded() {
        if (DEBUG) console.log('PanelButton._onAllEventsLoaded called');
        this._eventList.refresh();
        this._calendar.refresh();
    }

    /**
     * Destroy and clean up
     */
    destroy() {
        // Disconnect signals
        if (this._eventManagerSignals) {
            this._eventManagerSignals.forEach(id => {
                this._eventManager.disconnect(id);
            });
            this._eventManagerSignals = null;
        }

        super.destroy();
    }
});