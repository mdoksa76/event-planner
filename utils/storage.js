import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import { formatDateKey } from './dateUtils.js';

/**
 * Storage manager for event data
 * Handles reading/writing JSON files for each day
 */
export class StorageManager {
    constructor() {
        this.dataDir = GLib.build_filenamev([GLib.get_user_data_dir(), 'event-planner']);
        this._ensureDataDirectory();
    }

    /**
     * Ensure data directory exists
     */
    _ensureDataDirectory() {
        const dir = Gio.File.new_for_path(this.dataDir);
        if (!dir.query_exists(null)) {
            dir.make_directory_with_parents(null);
        }
    }

    /**
     * Get file path for a specific date
     */
    _getFilePath(date) {
        const filename = `${formatDateKey(date)}.json`;
        const filepath = GLib.build_filenamev([this.dataDir, filename]);
        console.log('StorageManager._getFilePath for date:', date, 'Year:', date.getFullYear(), 'Month:', date.getMonth() + 1, 'Day:', date.getDate(), '-> filepath:', filepath);
        return filepath;
    }

    /**
     * Load events for a specific date
     */
    loadEventsForDay(date) {
        const filepath = this._getFilePath(date);
        const file = Gio.File.new_for_path(filepath);

        if (!file.query_exists(null)) {
            return [];
        }

        try {
            const [success, contents] = file.load_contents(null);
            if (!success) {
                return [];
            }

            const decoder = new TextDecoder('utf-8');
            const jsonString = decoder.decode(contents);
            
            if (!jsonString || jsonString.trim().length === 0) {
                return [];
            }

            return JSON.parse(jsonString);
        } catch (e) {
            console.error(`Error loading events for ${formatDateKey(date)}: ${e.message}`);
            return [];
        }
    }

    /**
     * Save events for a specific date
     */
    saveEventsForDay(date, events) {
        const filepath = this._getFilePath(date);
        const file = Gio.File.new_for_path(filepath);

        console.log('StorageManager.saveEventsForDay called');
        console.log('  Date:', date, 'Year:', date.getFullYear(), 'Month:', date.getMonth() + 1, 'Day:', date.getDate());
        console.log('  Filepath:', filepath);
        console.log('  Events to save:', events.length);

        try {
            if (events.length === 0) {
                // Delete file if no events
                if (file.query_exists(null)) {
                    file.delete(null);
                    console.log('File deleted (no events)');
                }
                return true;
            }

            const jsonString = JSON.stringify(events, null, 2);
            console.log('JSON string length:', jsonString.length);
            
            const bytes = new GLib.Bytes(jsonString);
            file.replace_contents(
                bytes.get_data(),
                null,
                false,
                Gio.FileCreateFlags.REPLACE_DESTINATION,
                null
            );
            console.log('File saved successfully');
            return true;
        } catch (e) {
            console.error(`Error saving events for ${formatDateKey(date)}: ${e.message}`);
            return false;
        }
    }

    /**
     * Load all events from all files
     * Returns a Map with date keys and event arrays
     */
    loadAllEvents() {
        console.log('StorageManager.loadAllEvents() called');
        const eventsMap = new Map();
        const dir = Gio.File.new_for_path(this.dataDir);

        console.log('Data directory:', this.dataDir);

        if (!dir.query_exists(null)) {
            console.log('Data directory does not exist yet');
            return eventsMap;
        }

        try {
            const enumerator = dir.enumerate_children(
                'standard::name',
                Gio.FileQueryInfoFlags.NONE,
                null
            );

            let fileInfo;
            let fileCount = 0;
            while ((fileInfo = enumerator.next_file(null)) !== null) {
                const filename = fileInfo.get_name();
                
                // Only process .json files
                if (!filename.endsWith('.json')) {
                    continue;
                }

                fileCount++;
                console.log('Processing file:', filename);

                const dateKey = filename.replace('.json', '');
                
                // Validate date format (YYYY-MM-DD)
                if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
                    console.log('Invalid date format, skipping:', filename);
                    continue;
                }

                const filepath = GLib.build_filenamev([this.dataDir, filename]);
                const file = Gio.File.new_for_path(filepath);

                try {
                    const [success, contents] = file.load_contents(null);
                    if (success) {
                        const decoder = new TextDecoder('utf-8');
                        const jsonString = decoder.decode(contents);
                        
                        if (jsonString && jsonString.trim().length > 0) {
                            const events = JSON.parse(jsonString);
                            if (events.length > 0) {
                                console.log('Loaded', events.length, 'events for', dateKey);
                                eventsMap.set(dateKey, events);
                            }
                        }
                    }
                } catch (e) {
                    console.error(`Error loading ${filename}: ${e.message}`);
                }
            }

            enumerator.close(null);
            console.log('Processed', fileCount, 'files, loaded', eventsMap.size, 'dates with events');
        } catch (e) {
            console.error(`Error reading data directory: ${e.message}`);
        }

        return eventsMap;
    }

    /**
     * Delete all event files (for testing/reset)
     */
    clearAllData() {
        const dir = Gio.File.new_for_path(this.dataDir);

        if (!dir.query_exists(null)) {
            return;
        }

        try {
            const enumerator = dir.enumerate_children(
                'standard::name',
                Gio.FileQueryInfoFlags.NONE,
                null
            );

            let fileInfo;
            while ((fileInfo = enumerator.next_file(null)) !== null) {
                const filename = fileInfo.get_name();
                if (filename.endsWith('.json')) {
                    const filepath = GLib.build_filenamev([this.dataDir, filename]);
                    const file = Gio.File.new_for_path(filepath);
                    file.delete(null);
                }
            }

            enumerator.close(null);
        } catch (e) {
            console.error(`Error clearing data: ${e.message}`);
        }
    }
}