import { formatTime, parseTime } from '../utils/dateUtils.js';

/**
 * Event model class
 * Represents a single event with title, time, description, and category
 */
export class Event {
    constructor(title, startTime, endTime, description, category, showNotification = false, notificationMinutes = null) {
        this.title = title;
        this.startTime = startTime; // {hour, minute}
        this.endTime = endTime; // {hour, minute}
        this.description = description;
        this.category = category;
        this.showNotification = showNotification; // Opt-in notifications
        this.notificationMinutes = notificationMinutes; // Per-event notification timing (null = use default)
    }

    /**
     * Convert event to JSON object
     */
    toJson() {
        return {
            title: this.title,
            startTime: formatTime(this.startTime.hour, this.startTime.minute),
            endTime: formatTime(this.endTime.hour, this.endTime.minute),
            description: this.description,
            category: this.category,
            showNotification: this.showNotification,
            notificationMinutes: this.notificationMinutes
        };
    }

    /**
     * Create Event from JSON object
     */
    static fromJson(json) {
        return new Event(
            json.title,
            parseTime(json.startTime),
            parseTime(json.endTime),
            json.description,
            json.category,
            json.showNotification !== undefined ? json.showNotification : false,
            json.notificationMinutes !== undefined ? json.notificationMinutes : null
        );
    }

    /**
     * Get formatted time range string (e.g., "09:00–10:30")
     */
    getTimeRangeString() {
        return `${formatTime(this.startTime.hour, this.startTime.minute)}–${formatTime(this.endTime.hour, this.endTime.minute)}`;
    }

    /**
     * Get start time in minutes since midnight (for sorting)
     */
    getStartMinutes() {
        return this.startTime.hour * 60 + this.startTime.minute;
    }

    /**
     * Check if event overlaps with another event
     */
    overlaps(otherEvent) {
        const thisStart = this.getStartMinutes();
        const thisEnd = this.endTime.hour * 60 + this.endTime.minute;
        const otherStart = otherEvent.getStartMinutes();
        const otherEnd = otherEvent.endTime.hour * 60 + otherEvent.endTime.minute;

        return thisStart < otherEnd && thisEnd > otherStart;
    }

    /**
     * Create a copy of this event
     */
    clone() {
        return new Event(
            this.title,
            { ...this.startTime },
            { ...this.endTime },
            this.description,
            this.category,
            this.showNotification,
            this.notificationMinutes
        );
    }

    /**
     * Validate event data
     */
    isValid() {
        if (!this.title || this.title.trim().length === 0) {
            return { valid: false, error: 'Title is required' };
        }

        const startMinutes = this.getStartMinutes();
        const endMinutes = this.endTime.hour * 60 + this.endTime.minute;

        if (startMinutes >= endMinutes) {
            return { valid: false, error: 'End time must be after start time' };
        }

        return { valid: true };
    }
}