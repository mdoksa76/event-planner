import GObject from 'gi://GObject';
import St from 'gi://St';
import Clutter from 'gi://Clutter';

import { getDaysInMonth, getFirstDayOfMonth, isSameDay, formatDateKey } from '../utils/dateUtils.js';

const DEBUG = false;

/**
 * Calendar widget for selecting dates
 */
export const CalendarWidget = GObject.registerClass(
class CalendarWidget extends St.Widget {
    
    _init(selectedDate, eventManager, onDateSelected) {
        super._init({
            layout_manager: new Clutter.GridLayout({ orientation: Clutter.Orientation.VERTICAL }),
            style_class: 'event-planner-calendar'
        });

        // Create clean local dates (no time component)
        this._selectedDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
        this._focusedMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        this._eventManager = eventManager;
        this._onDateSelected = onDateSelected; // Callback function
        
        if (DEBUG) console.log('CalendarWidget initialized with _selectedDate:', this._selectedDate, 'Year:', this._selectedDate.getFullYear(), 'Month:', this._selectedDate.getMonth() + 1, 'Day:', this._selectedDate.getDate());

        this._buildCalendar();
    }

    /**
     * Build the calendar UI
     */
    _buildCalendar() {
        const layout = this.layout_manager;

        // Month navigation header
        const headerBox = new St.BoxLayout({
            vertical: false,
            x_expand: true,
            style_class: 'calendar-header'
        });

        // Previous month button
        const prevButton = new St.Button({
            style_class: 'calendar-nav-button',
            child: new St.Icon({ icon_name: 'go-previous-symbolic' })
        });
        prevButton.connect('clicked', () => this._previousMonth());
        headerBox.add_child(prevButton);

        // Month/Year label
        this._monthLabel = new St.Label({
            x_expand: true,
            x_align: Clutter.ActorAlign.CENTER,
            style_class: 'calendar-month-label'
        });
        this._updateMonthLabel();
        headerBox.add_child(this._monthLabel);

        // Next month button
        const nextButton = new St.Button({
            style_class: 'calendar-nav-button',
            child: new St.Icon({ icon_name: 'go-next-symbolic' })
        });
        nextButton.connect('clicked', () => this._nextMonth());
        headerBox.add_child(nextButton);

        layout.attach(headerBox, 0, 0, 7, 1);

        // Day names header (Sun, Mon, Tue, etc.)
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        for (let i = 0; i < 7; i++) {
            const label = new St.Label({
                text: dayNames[i],
                style_class: 'calendar-day-name',
                x_align: Clutter.ActorAlign.CENTER
            });
            layout.attach(label, i, 1, 1, 1);
        }

        // Day buttons container (will be rebuilt when month changes)
        this._dayButtons = [];
        this._buildDayButtons();
    }

    /**
     * Build day buttons for the current month
     */
    _buildDayButtons() {
        // Clear existing buttons
        this._dayButtons.forEach(btn => btn.destroy());
        this._dayButtons = [];

        const layout = this.layout_manager;
        const year = this._focusedMonth.getFullYear();
        const month = this._focusedMonth.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);

        let row = 2;
        let col = firstDay;

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dayButton = this._createDayButton(day, date);
            
            layout.attach(dayButton, col, row, 1, 1);
            this._dayButtons.push(dayButton);

            col++;
            if (col > 6) {
                col = 0;
                row++;
            }
        }
    }

    /**
     * Create a single day button
     */
    _createDayButton(day, date) {
        const isSelected = isSameDay(date, this._selectedDate);
        const isToday = isSameDay(date, new Date());
        const hasEvents = this._eventManager.hasEventsOnDay(date);

        const button = new St.Button({
            style_class: 'calendar-day-button',
            x_expand: true,
            y_expand: true
        });

        // Add style classes
        if (isSelected) {
            button.add_style_class_name('selected');
        }
        if (isToday) {
            button.add_style_class_name('today');
        }

        // Create button content with day number and optional event indicator
        const box = new St.BoxLayout({
            vertical: true,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER
        });

        const label = new St.Label({
            text: day.toString(),
            style_class: 'calendar-day-label'
        });
        box.add_child(label);

        // Add event indicator dot if this day has events
        if (hasEvents) {
            const eventCount = this._eventManager.getEventCount(date);
            const indicator = new St.Label({
                text: '●',
                style_class: 'calendar-event-indicator'
            });
            box.add_child(indicator);
        }

        button.set_child(box);

        // Handle click
        button.connect('clicked', () => {
            if (DEBUG) console.log('=== CALENDAR BUTTON CLICKED ===');
            if (DEBUG) console.log('Clicked date - Year:', date.getFullYear(), 'Month:', date.getMonth() + 1, 'Day:', date.getDate());
            
            // Create date info object
            const dateInfo = {
                year: date.getFullYear(),
                month: date.getMonth(),
                day: date.getDate()
            };
            
            // Update internal selected date
            this._selectedDate = new Date(dateInfo.year, dateInfo.month, dateInfo.day);
            
            if (DEBUG) console.log('Calendar sending dateInfo:', dateInfo);
            if (DEBUG) console.log('About to call onDateSelected callback');
            
            // Call callback instead of emitting signal
            if (this._onDateSelected) {
                try {
                    this._onDateSelected(dateInfo);
                    if (DEBUG) console.log('Callback called successfully');
                } catch (e) {
                    console.error('Error calling callback:', e);
                }
            } else {
                if (DEBUG) console.warn('No onDateSelected callback set!');
            }
            
            this._rebuildDayButtons();
            if (DEBUG) console.log('=== CALENDAR BUTTON CLICK COMPLETE ===');
        });

        return button;
    }

    /**
     * Update month label
     */
    _updateMonthLabel() {
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const monthName = months[this._focusedMonth.getMonth()];
        const year = this._focusedMonth.getFullYear();
        this._monthLabel.set_text(`${monthName} ${year}`);
    }

    /**
     * Go to previous month
     */
    _previousMonth() {
        this._focusedMonth.setMonth(this._focusedMonth.getMonth() - 1);
        this._updateMonthLabel();
        this._rebuildDayButtons();
    }

    /**
     * Go to next month
     */
    _nextMonth() {
        this._focusedMonth.setMonth(this._focusedMonth.getMonth() + 1);
        this._updateMonthLabel();
        this._rebuildDayButtons();
    }

    /**
     * Rebuild day buttons (when month changes or events update)
     */
    _rebuildDayButtons() {
        this._buildDayButtons();
    }

    /**
     * Set selected date externally
     */
    setSelectedDate(date) {
        if (DEBUG) console.log('CalendarWidget.setSelectedDate called with:', date, 'Year:', date.getFullYear(), 'Month:', date.getMonth() + 1, 'Day:', date.getDate());
        this._selectedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        this._focusedMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        this._updateMonthLabel();
        this._rebuildDayButtons();
    }

    /**
     * Refresh calendar (when events change)
     */
    refresh() {
        if (DEBUG) console.log('CalendarWidget.refresh() called');
        this._rebuildDayButtons();
    }
});