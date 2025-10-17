import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as MessageTray from 'resource:///org/gnome/shell/ui/messageTray.js';

import { formatDateKey } from '../utils/dateUtils.js';

const DEBUG = false;

/**
 * Notification Service
 * Manages background timer and shows notifications for upcoming events
 */
export class NotificationService {
    constructor(eventManager, settings) {
        this._eventManager = eventManager;
        this._settings = settings;
        this._timeoutId = null;
        this._notifiedEvents = new Set(); // Track already notified events
        this._notificationSource = null; // Persistent notification source
        
        // Listen for event updates to clear notification history
        this._eventUpdateHandler = this._eventManager.connect('event-updated', (manager, dateKey, eventTitle) => {
            this._clearEventNotifications(eventTitle, dateKey);
        });
        
        if (DEBUG) console.log('NotificationService: Created');
    }

    /**
     * Start the notification service
     */
    start() {
        if (this._timeoutId) {
            if (DEBUG) console.log('NotificationService: Already running');
            return;
        }

        if (DEBUG) console.log('NotificationService: Starting...');
        
        // Check immediately
        this._checkEvents();
        
        // Then check every 15 seconds
        // IMPORTANT: Use arrow function to preserve 'this' context
        this._timeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 15, () => {
            if (DEBUG) console.log('NotificationService: Timer tick');
            try {
                this._checkEvents();
            } catch (e) {
                console.error('NotificationService: Error in timer:', e);
            }
            return GLib.SOURCE_CONTINUE; // Keep repeating
        });
        
        if (DEBUG) console.log('NotificationService: Started with timeout ID:', this._timeoutId);
    }

    /**
     * Stop the notification service
     */
    stop() {
        if (this._timeoutId) {
            GLib.Source.remove(this._timeoutId);
            this._timeoutId = null;
            if (DEBUG) console.log('NotificationService: Stopped');
        }
        
        // Disconnect event update handler
        if (this._eventUpdateHandler) {
            this._eventManager.disconnect(this._eventUpdateHandler);
            this._eventUpdateHandler = null;
        }
        
        // Destroy notification source
        if (this._notificationSource) {
            this._notificationSource.destroy();
            this._notificationSource = null;
        }
        
        // Clear notified events tracking
        this._notifiedEvents.clear();
    }

    /**
     * Check all events for today and show notifications if needed
     */
    _checkEvents() {
        if (DEBUG) console.log('NotificationService: _checkEvents called');
        
        // Check if notifications are enabled globally
        const notificationsEnabled = this._settings.get_boolean('enable-notifications');
        if (DEBUG) console.log('NotificationService: Notifications enabled:', notificationsEnabled);
        
        if (!notificationsEnabled) {
            if (DEBUG) console.log('NotificationService: Notifications disabled in settings');
            return;
        }

        const globalNotificationMinutes = this._settings.get_int('notification-minutes');
        if (DEBUG) console.log('NotificationService: Global notification minutes:', globalNotificationMinutes);
        
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const dateKey = formatDateKey(today);
        
        if (DEBUG) console.log('NotificationService: Today is:', dateKey);
        
        // Clear notifications from previous days
        this._cleanupOldNotifications(dateKey);
        
        // Get today's events
        const events = this._eventManager.getEventsForDay(today);
        
        if (DEBUG) console.log(`NotificationService: Checking ${events.length} events for ${dateKey}`);
        
        // Build set of valid event IDs to cleanup deleted events
        const validEventIds = new Set();
        
        events.forEach((event, index) => {
            if (DEBUG) console.log(`NotificationService: Event ${index}: "${event.title}", showNotification: ${event.showNotification}`);
            
            // Skip if this event doesn't have notifications enabled
            if (!event.showNotification) {
                if (DEBUG) console.log(`NotificationService: Skipping "${event.title}" - notifications disabled for this event`);
                return;
            }

            // Create unique ID based on event details (not just index)
            // This way if event is deleted and recreated, it gets a new ID
            const eventId = `${dateKey}-${event.title}-${event.startTime.hour}:${event.startTime.minute}`;
            validEventIds.add(eventId);
            
            // Skip if already notified
            if (this._notifiedEvents.has(eventId)) {
                if (DEBUG) console.log(`NotificationService: Already notified for "${event.title}"`);
                return;
            }

            // Use per-event notification minutes if set, otherwise use global default
            const notificationMinutes = event.notificationMinutes !== null && event.notificationMinutes !== undefined 
                ? event.notificationMinutes 
                : globalNotificationMinutes;
            
            if (DEBUG) console.log(`NotificationService: Using ${notificationMinutes} minutes for "${event.title}" (per-event: ${event.notificationMinutes}, global: ${globalNotificationMinutes})`);

            // Calculate event start time in minutes since midnight
            const eventMinutes = event.startTime.hour * 60 + event.startTime.minute;
            
            // Calculate current time in minutes since midnight
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            
            // Calculate notification time (event time - notification minutes)
            const notificationTime = eventMinutes - notificationMinutes;
            
            if (DEBUG) console.log(`NotificationService: Event "${event.title}" - Event time: ${eventMinutes}, Current: ${currentMinutes}, Notify at: ${notificationTime}`);
            
            // Check if we should notify now
            // Notify if current time is within 1 minute of notification time
            if (currentMinutes >= notificationTime && currentMinutes <= notificationTime + 1) {
                if (DEBUG) console.log(`NotificationService: TIME TO NOTIFY "${event.title}"!`);
                this._showNotification(event, notificationMinutes);
                this._notifiedEvents.add(eventId);
                if (DEBUG) console.log(`NotificationService: Notified for event "${event.title}" at ${currentMinutes} minutes`);
            } else {
                if (DEBUG) console.log(`NotificationService: Not time yet for "${event.title}"`);
            }
        });
        
        // Cleanup notifications for deleted events (those not in validEventIds)
        this._cleanupDeletedEvents(dateKey, validEventIds);
    }

    /**
     * Show a notification for an event
     */
    _showNotification(event, minutesBefore) {
        const title = '📅 Event Planner';
        const timeString = `${String(event.startTime.hour).padStart(2, '0')}:${String(event.startTime.minute).padStart(2, '0')}`;
        
        let body = `${event.title}\n`;
        body += `Starts at ${timeString}`;
        
        if (minutesBefore > 0) {
            body += ` (in ${minutesBefore} minutes)`;
        }

        try {
            // Destroy old source if exists and create fresh one each time
            if (this._notificationSource) {
                this._notificationSource.destroy();
                this._notificationSource = null;
            }
            
            // Always create fresh source for each notification
            this._notificationSource = new MessageTray.Source({
                title: 'Event Planner',
                icon_name: 'x-office-calendar',
            });
            Main.messageTray.add(this._notificationSource);
            if (DEBUG) console.log('NotificationService: Created fresh notification source');

            // Create persistent notification
            const notification = new MessageTray.Notification({
                source: this._notificationSource,
                title: title,
                body: body,
                isTransient: false,
            });
            
            // Set as resident and critical urgency
            notification.resident = true;
            notification.urgency = MessageTray.Urgency.CRITICAL;
            
            // Show the notification
            this._notificationSource.addNotification(notification);
            
            if (DEBUG) console.log(`NotificationService: Notification sent for "${event.title}"`);
        } catch (e) {
            console.error('NotificationService: Error showing notification:', e);
        }
    }

    /**
     * Clear notification history (useful when day changes)
     */
    clearHistory() {
        this._notifiedEvents.clear();
        if (DEBUG) console.log('NotificationService: History cleared');
    }

    /**
     * Remove notifications from previous days
     */
    _cleanupOldNotifications(currentDateKey) {
        const toRemove = [];
        
        for (const eventId of this._notifiedEvents) {
            // Extract date from event ID (format: YYYY-MM-DD-title-time)
            const datePart = eventId.split('-').slice(0, 3).join('-');
            
            if (datePart !== currentDateKey) {
                toRemove.push(eventId);
            }
        }
        
        if (toRemove.length > 0) {
            toRemove.forEach(id => this._notifiedEvents.delete(id));
            if (DEBUG) console.log(`NotificationService: Cleaned up ${toRemove.length} old notifications`);
        }
    }

    /**
     * Remove notifications for events that no longer exist
     */
    _cleanupDeletedEvents(dateKey, validEventIds) {
        const toRemove = [];
        
        for (const eventId of this._notifiedEvents) {
            // Only check events from today
            if (eventId.startsWith(dateKey + '-')) {
                if (!validEventIds.has(eventId)) {
                    toRemove.push(eventId);
                }
            }
        }
        
        if (toRemove.length > 0) {
            toRemove.forEach(id => this._notifiedEvents.delete(id));
            if (DEBUG) console.log(`NotificationService: Cleaned up ${toRemove.length} deleted events`);
        }
    }

    /**
     * Clear notification history for a specific event (called when event is edited)
     */
    _clearEventNotifications(eventTitle, dateKey) {
        const toRemove = [];
        
        for (const eventId of this._notifiedEvents) {
            // Remove any notification for this event title on this date
            if (eventId.startsWith(`${dateKey}-${eventTitle}-`)) {
                toRemove.push(eventId);
            }
        }
        
        if (toRemove.length > 0) {
            toRemove.forEach(id => this._notifiedEvents.delete(id));
            if (DEBUG) console.log(`NotificationService: Cleared ${toRemove.length} notification(s) for edited event "${eventTitle}"`);
        }
    }
}