import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gdk from 'gi://Gdk';
import Gio from 'gi://Gio';

import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

/**
 * Preferences window for Event Planner
 */
export default class EventPlannerPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        
        // Create a preferences page
        const page = new Adw.PreferencesPage({
            title: 'General',
            icon_name: 'dialog-information-symbolic',
        });
        window.add(page);

        // Notifications group
        const notificationsGroup = new Adw.PreferencesGroup({
            title: 'Notifications',
            description: 'Configure event notifications',
        });
        page.add(notificationsGroup);

        // Enable notifications toggle
        const enableNotificationsRow = new Adw.SwitchRow({
            title: 'Enable Notifications',
            subtitle: 'Show desktop notifications for events',
        });
        settings.bind(
            'enable-notifications',
            enableNotificationsRow,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );
        notificationsGroup.add(enableNotificationsRow);

        // Notification timing
        const notificationMinutesRow = new Adw.SpinRow({
            title: 'Notification Timing',
            subtitle: 'Minutes before event to show notification',
            adjustment: new Gtk.Adjustment({
                lower: 5,
                upper: 60,
                step_increment: 5,
                page_increment: 10,
            }),
        });
        settings.bind(
            'notification-minutes',
            notificationMinutesRow,
            'value',
            Gio.SettingsBindFlags.DEFAULT
        );
        notificationsGroup.add(notificationMinutesRow);

        // Note about per-event notifications
        const noteRow = new Adw.ActionRow({
            title: 'Per-Event Notifications',
            subtitle: 'Enable the checkbox when creating/editing an event to receive a notification for that specific event',
        });
        notificationsGroup.add(noteRow);

        // Categories group
        const categoriesGroup = new Adw.PreferencesGroup({
            title: 'Custom Categories',
            description: 'Add your own event categories with custom colors',
        });
        page.add(categoriesGroup);

        // Load existing custom categories
        this._customCategories = this._loadCustomCategories(settings);
        
        // Display existing categories
        this._categoryRows = [];
        this._refreshCategoryList(categoriesGroup, settings);

        // Add category button
        const addButton = new Gtk.Button({
            label: 'Add Custom Category',
            css_classes: ['suggested-action'],
            valign: Gtk.Align.CENTER,
        });

        addButton.connect('clicked', () => {
            this._showAddCategoryDialog(window, settings, categoriesGroup);
        });

        const addRow = new Adw.ActionRow({
            title: 'Add New Category',
        });
        addRow.add_suffix(addButton);
        addRow.activatable_widget = addButton;
        categoriesGroup.add(addRow);

        // About section
        const aboutGroup = new Adw.PreferencesGroup({
            title: 'About',
        });
        page.add(aboutGroup);

        const aboutRow = new Adw.ActionRow({
            title: 'Event Planner',
            subtitle: 'Manage your events with calendar and categories'
        });
        aboutGroup.add(aboutRow);

        const versionRow = new Adw.ActionRow({
            title: 'Version',
            subtitle: '1.0'
        });
        aboutGroup.add(versionRow);

        // Data info
        const infoRow = new Adw.ActionRow({
            title: 'Data Storage',
            subtitle: 'Events are stored locally in JSON files'
        });
        aboutGroup.add(infoRow);
    }

    _loadCustomCategories(settings) {
        try {
            const jsonString = settings.get_string('custom-categories');
            return JSON.parse(jsonString);
        } catch (e) {
            return [];
        }
    }

    _saveCustomCategories(settings) {
        try {
            const jsonString = JSON.stringify(this._customCategories);
            settings.set_string('custom-categories', jsonString);
            return true;
        } catch (e) {
            console.error('Error saving custom categories:', e);
            return false;
        }
    }

    _refreshCategoryList(group, settings) {
        // Remove old category rows
        this._categoryRows.forEach(row => group.remove(row));
        this._categoryRows = [];

        // Add category rows
        this._customCategories.forEach((category, index) => {
            const row = this._createCategoryRow(category, index, group, settings);
            group.add(row);
            this._categoryRows.push(row);
        });
    }

    _createCategoryRow(category, index, group, settings) {
        const row = new Adw.ActionRow({
            title: category.name,
        });

        // Color indicator
        const colorBox = new Gtk.Box({
            width_request: 30,
            height_request: 30,
            css_classes: ['color-box'],
            valign: Gtk.Align.CENTER,
        });
        
        const cssProvider = new Gtk.CssProvider();
        cssProvider.load_from_data(
            `.color-box { background-color: ${category.color}; border-radius: 15px; margin: 5px; }`,
            -1
        );
        colorBox.get_style_context().add_provider(
            cssProvider,
            Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
        );
        
        row.add_prefix(colorBox);

        // Edit button
        const editButton = new Gtk.Button({
            icon_name: 'document-edit-symbolic',
            valign: Gtk.Align.CENTER,
            css_classes: ['flat'],
        });
        editButton.connect('clicked', () => {
            this._showEditCategoryDialog(row.get_root(), settings, category, index, group);
        });
        row.add_suffix(editButton);

        // Delete button
        const deleteButton = new Gtk.Button({
            icon_name: 'edit-delete-symbolic',
            valign: Gtk.Align.CENTER,
            css_classes: ['flat', 'destructive-action'],
        });
        deleteButton.connect('clicked', () => {
            this._customCategories.splice(index, 1);
            this._saveCustomCategories(settings);
            this._refreshCategoryList(group, settings);
        });
        row.add_suffix(deleteButton);

        return row;
    }

    _showAddCategoryDialog(window, settings, group) {
        const dialog = new Gtk.Dialog({
            title: 'Add Custom Category',
            transient_for: window,
            modal: true,
        });

        dialog.add_button('Cancel', Gtk.ResponseType.CANCEL);
        dialog.add_button('Add', Gtk.ResponseType.OK);

        const contentBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 12,
            margin_top: 12,
            margin_bottom: 12,
            margin_start: 12,
            margin_end: 12,
        });

        // Name entry
        const nameLabel = new Gtk.Label({
            label: 'Category Name:',
            xalign: 0,
        });
        contentBox.append(nameLabel);

        const nameEntry = new Gtk.Entry({
            placeholder_text: 'e.g., Sport, Hobby, Shopping',
        });
        contentBox.append(nameEntry);

        // Color picker
        const colorLabel = new Gtk.Label({
            label: 'Category Color:',
            xalign: 0,
            margin_top: 12,
        });
        contentBox.append(colorLabel);

        const colorButton = new Gtk.ColorButton();
        const rgba = new Gdk.RGBA();
        rgba.parse('#FFFFFF');
        colorButton.set_rgba(rgba);
        contentBox.append(colorButton);

        dialog.get_content_area().append(contentBox);

        dialog.connect('response', (dialog, response) => {
            if (response === Gtk.ResponseType.OK) {
                const name = nameEntry.get_text().trim();
                if (name) {
                    const rgba = colorButton.get_rgba();
                    const color = `#${Math.round(rgba.red * 255).toString(16).padStart(2, '0')}${Math.round(rgba.green * 255).toString(16).padStart(2, '0')}${Math.round(rgba.blue * 255).toString(16).padStart(2, '0')}`;
                    
                    this._customCategories.push({ name, color });
                    this._saveCustomCategories(settings);
                    this._refreshCategoryList(group, settings);
                }
            }
            dialog.destroy();
        });

        dialog.show();
    }

    _showEditCategoryDialog(window, settings, category, index, group) {
        const dialog = new Gtk.Dialog({
            title: 'Edit Custom Category',
            transient_for: window,
            modal: true,
        });

        dialog.add_button('Cancel', Gtk.ResponseType.CANCEL);
        dialog.add_button('Save', Gtk.ResponseType.OK);

        const contentBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 12,
            margin_top: 12,
            margin_bottom: 12,
            margin_start: 12,
            margin_end: 12,
        });

        // Name entry
        const nameLabel = new Gtk.Label({
            label: 'Category Name:',
            xalign: 0,
        });
        contentBox.append(nameLabel);

        const nameEntry = new Gtk.Entry({
            text: category.name,
        });
        contentBox.append(nameEntry);

        // Color picker
        const colorLabel = new Gtk.Label({
            label: 'Category Color:',
            xalign: 0,
            margin_top: 12,
        });
        contentBox.append(colorLabel);

        const colorButton = new Gtk.ColorButton();
        const rgba = new Gdk.RGBA();
        rgba.parse(category.color);
        colorButton.set_rgba(rgba);
        contentBox.append(colorButton);

        dialog.get_content_area().append(contentBox);

        dialog.connect('response', (dialog, response) => {
            if (response === Gtk.ResponseType.OK) {
                const name = nameEntry.get_text().trim();
                if (name) {
                    const rgba = colorButton.get_rgba();
                    const color = `#${Math.round(rgba.red * 255).toString(16).padStart(2, '0')}${Math.round(rgba.green * 255).toString(16).padStart(2, '0')}${Math.round(rgba.blue * 255).toString(16).padStart(2, '0')}`;
                    
                    this._customCategories[index] = { name, color };
                    this._saveCustomCategories(settings);
                    this._refreshCategoryList(group, settings);
                }
            }
            dialog.destroy();
        });

        dialog.show();
    }
}