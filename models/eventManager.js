import { Event } from './event.js';
import { StorageManager } from '../utils/storage.js';
import { formatDateKey, compareTime, normalizeDate } from '../utils/dateUtils.js';
import GObject from 'gi://GObject';

const DEBUG = false;

/**
 * Event Manager - handles all event CRUD operations
 * Emits signals when events change
 */
export const EventManager = GObject.registerClass({
    GTypeName: 'EventPlanner_EventManager',
    Signals: {
        'events-changed': { param_types: [GObject.TYPE_STRING] }, // dateKey
        'all-events-loaded': {},
        'event-updated': { param_types: [GObject.TYPE_STRING, GObject.TYPE_STRING] } // dateKey, eventTitle
    }
}, class EventManager extends GObject.Object {
    
    _init() {
        super._init();
        this._storage = new StorageManager();
        this._eventsMap = new Map(); // Map<dateKey, Event[]>
    }

    /**
     * Load all events from storage
     */
    loadAllEvents() {
        if (DEBUG) console.log('EventManager.loadAllEvents() called');
        const eventsDataMap = this._storage.loadAllEvents();
        
        if (DEBUG) console.log('Loaded', eventsDataMap.size, 'dates from storage');
        
        this._eventsMap.clear();
        
        eventsDataMap.forEach((eventJsonArray, dateKey) => {
            if (DEBUG) console.log('Processing dateKey:', dateKey, 'with', eventJsonArray.length, 'events');
            const events = eventJsonArray.map(json => Event.fromJson(json));
            // Sort events by start time
            events.sort((a, b) => compareTime(a.startTime, b.startTime));
            this._eventsMap.set(dateKey, events);
        });

        if (DEBUG) console.log('EventManager now has', this._eventsMap.size, 'dates with events');
        this.emit('all-events-loaded');
    }

    /**
     * Get events for a specific date
     */
    getEventsForDay(date) {
        const dateKey = formatDateKey(date);
        if (DEBUG) console.log('EventManager.getEventsForDay for date:', date, 'Year:', date.getFullYear(), 'Month:', date.getMonth() + 1, 'Day:', date.getDate(), '-> dateKey:', dateKey);
        const events = this._eventsMap.get(dateKey) || [];
        if (DEBUG) console.log('Found events:', events.length);
        return events;
    }

    /**
     * Add a new event for a specific date
     */
    addEvent(date, event) {
        const dateKey = formatDateKey(date);
        if (DEBUG) console.log('EventManager.addEvent for date:', date, 'Year:', date.getFullYear(), 'Month:', date.getMonth() + 1, 'Day:', date.getDate(), '-> dateKey:', dateKey, 'Event title:', event.title);
        
        if (!this._eventsMap.has(dateKey)) {
            this._eventsMap.set(dateKey, []);
        }

        const events = this._eventsMap.get(dateKey);
        events.push(event);
        
        // Sort by start time
        events.sort((a, b) => compareTime(a.startTime, b.startTime));
        
        this._saveAndNotify(date);
        if (DEBUG) console.log('Event added successfully. Total events for', dateKey, ':', events.length);
    }

    /**
     * Update an existing event
     */
    updateEvent(date, index, updatedEvent) {
        const dateKey = formatDateKey(date);
        if (DEBUG) console.log('EventManager.updateEvent for date:', date, 'Year:', date.getFullYear(), 'Month:', date.getMonth() + 1, 'Day:', date.getDate(), '-> dateKey:', dateKey, 'index:', index);
        
        const events = this._eventsMap.get(dateKey);
        
        if (!events || index < 0 || index >= events.length) {
            console.error('Invalid event index');
            return false;
        }

        // Get old event title before updating
        const oldEventTitle = events[index].title;

        events[index] = updatedEvent;
        
        // Sort by start time
        events.sort((a, b) => compareTime(a.startTime, b.startTime));
        
        this._saveAndNotify(date);
        
        // Emit event-updated signal to clear notification history
        this.emit('event-updated', dateKey, oldEventTitle);
        if (DEBUG) console.log('Emitted event-updated signal for', oldEventTitle);
        
        return true;
    }

    /**
     * Delete an event
     */
    deleteEvent(date, index) {
        const dateKey = formatDateKey(date);
        if (DEBUG) console.log('EventManager.deleteEvent for date:', date, 'Year:', date.getFullYear(), 'Month:', date.getMonth() + 1, 'Day:', date.getDate(), '-> dateKey:', dateKey, 'index:', index);
        
        const events = this._eventsMap.get(dateKey);
        
        if (!events || index < 0 || index >= events.length) {
            console.error('Invalid event index');
            return false;
        }

        events.splice(index, 1);
        
        if (events.length === 0) {
            this._eventsMap.delete(dateKey);
        }
        
        this._saveAndNotify(date);
        return true;
    }

    /**
     * Check if a date has any events
     */
    hasEventsOnDay(date) {
        const dateKey = formatDateKey(date);
        const events = this._eventsMap.get(dateKey);
        return events && events.length > 0;
    }

    /**
     * Get event count for a specific date
     */
    getEventCount(date) {
        const dateKey = formatDateKey(date);
        const events = this._eventsMap.get(dateKey);
        return events ? events.length : 0;
    }

    /**
     * Get all dates that have events
     */
    getDatesWithEvents() {
        return Array.from(this._eventsMap.keys());
    }

    /**
     * Get upcoming events (from today onwards, limited count)
     */
    getUpcomingEvents(limit = 5) {
        const today = normalizeDate(new Date());
        const todayKey = formatDateKey(today);
        const upcoming = [];

        // Get sorted date keys
        const sortedKeys = Array.from(this._eventsMap.keys()).sort();

        for (const dateKey of sortedKeys) {
            if (dateKey >= todayKey) {
                const events = this._eventsMap.get(dateKey);
                for (const event of events) {
                    upcoming.push({ date: dateKey, event });
                    if (upcoming.length >= limit) {
                        return upcoming;
                    }
                }
            }
        }

        return upcoming;
    }

    /**
     * Save events to storage and emit signal
     */
    _saveAndNotify(date) {
        const dateKey = formatDateKey(date);
        const events = this._eventsMap.get(dateKey) || [];
        
        if (DEBUG) console.log('_saveAndNotify called for date:', date, 'Year:', date.getFullYear(), 'Month:', date.getMonth() + 1, 'Day:', date.getDate(), '-> dateKey:', dateKey, '- Count:', events.length);
        
        // Convert to JSON
        const eventsJson = events.map(e => e.toJson());
        
        // Save to storage
        const success = this._storage.saveEventsForDay(date, eventsJson);
        if (DEBUG) console.log('Storage save result:', success);
        
        // Emit signal
        this.emit('events-changed', dateKey);
        if (DEBUG) console.log('Emitted events-changed signal for', dateKey);
    }

    /**
     * Clear all events (for testing)
     */
    clearAllEvents() {
        this._eventsMap.clear();
        this._storage.clearAllData();
        this.emit('all-events-loaded');
    }

    /**
     * Get statistics
     */
    getStatistics() {
        let totalEvents = 0;
        let categoryCount = {};

        this._eventsMap.forEach((events) => {
            totalEvents += events.length;
            events.forEach(event => {
                categoryCount[event.category] = (categoryCount[event.category] || 0) + 1;
            });
        });

        return {
            totalEvents,
            daysWithEvents: this._eventsMap.size,
            categoryCount
        };
    }
});