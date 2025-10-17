/* extension.js
 *
 * Event Planner - GNOME Shell Extension
 * Copyright (C) 2025 mdoksa
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import GObject from 'gi://GObject';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { EventManager } from './models/eventManager.js';
import { PanelButton } from './ui/panelButton.js';
import { NotificationService } from './services/notificationService.js';

const DEBUG = false;

/**
 * Main Extension class
 */
export default class EventPlannerExtension extends Extension {
    constructor(metadata) {
        super(metadata);
        this._indicator = null;
        this._eventManager = null;
    }

    /**
     * Enable the extension
     */
    enable() {
        if (DEBUG) console.log('=== Event Planner: Enabling extension ===');
        
        // Get settings
        this._settings = this.getSettings();
        if (DEBUG) console.log('Event Planner: Settings loaded');
        
        // Initialize event manager
        this._eventManager = new EventManager();
        if (DEBUG) console.log('Event Planner: EventManager created');
        
        this._eventManager.loadAllEvents();
        if (DEBUG) console.log('Event Planner: Events loaded');
        
        // Create and add panel button
        this._indicator = new PanelButton(this, this._eventManager, this._settings);
        if (DEBUG) console.log('Event Planner: PanelButton created');
        
        Main.panel.addToStatusArea(this.uuid, this._indicator);
        if (DEBUG) console.log('Event Planner: PanelButton added to status area');
        
        // Start notification service
        this._notificationService = new NotificationService(this._eventManager, this._settings);
        this._notificationService.start();
        if (DEBUG) console.log('Event Planner: NotificationService started');
        
        if (DEBUG) console.log('=== Event Planner: Extension enabled ===');
    }

    /**
     * Disable the extension
     */
    disable() {
        if (DEBUG) console.log('Disabling Event Planner extension');
        
        // Stop notification service
        if (this._notificationService) {
            this._notificationService.stop();
            this._notificationService = null;
            if (DEBUG) console.log('Event Planner: NotificationService stopped');
        }

        // Remove panel button
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }

        // Clean up event manager
        if (this._eventManager) {
            this._eventManager.run_dispose();
            this._eventManager = null;
        }

        // Clear settings reference
        this._settings = null;
        
        if (DEBUG) console.log('Event Planner extension disabled');
    }
}