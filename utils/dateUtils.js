import GLib from 'gi://GLib';

/**
 * Format date to YYYY-MM-DD string
 */
export function formatDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Parse YYYY-MM-DD string to Date
 */
export function parseDateKey(dateKey) {
    const [year, month, day] = dateKey.split('-').map(Number);
    return new Date(year, month - 1, day);
}

/**
 * Get normalized Date (at midnight LOCAL time, not UTC)
 */
export function normalizeDate(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Check if two dates are the same day
 */
export function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

/**
 * Format time from hour and minute
 */
export function formatTime(hour, minute) {
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/**
 * Parse time string to {hour, minute}
 */
export function parseTime(timeString) {
    const [hour, minute] = timeString.split(':').map(Number);
    return { hour, minute };
}

/**
 * Compare two times (returns -1, 0, or 1)
 */
export function compareTime(time1, time2) {
    const minutes1 = time1.hour * 60 + time1.minute;
    const minutes2 = time2.hour * 60 + time2.minute;
    return minutes1 - minutes2;
}

/**
 * Get current date/time
 */
export function now() {
    return new Date();
}

/**
 * Format date for display (e.g., "January 15, 2025")
 */
export function formatDateDisplay(date) {
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

/**
 * Get days in month
 */
export function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

/**
 * Get first day of month (0 = Sunday, 6 = Saturday)
 */
export function getFirstDayOfMonth(year, month) {
    return new Date(year, month, 1).getDay();
}