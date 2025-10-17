# Event Planner - GNOME Shell Extension

A comprehensive calendar-based event planner for GNOME Shell that helps you organize your daily events with categories, colors, and customizable notifications.

## Credits
Developed with assistance from Claude (Anthropic)

## Features

- **Calendar View** - Monthly calendar with date selection and event indicators
- **Event Management** - Add, edit, and delete events with start/end times
- **Smart Notifications** - Desktop notifications before events start
  - Per-event notification timing (5-60 minutes before)
  - Global default notification timing
  - Opt-in per event (enable/disable notifications individually)
- **Custom Categories** - Create your own color-coded event categories
  - 5 built-in categories (Work, Personal, Fun, Family, Friends)
  - Add unlimited custom categories with custom colors
- **Local Storage** - Events stored securely in JSON files
- **Clean Interface** - Integrates seamlessly with GNOME Shell design

## Requirements

- GNOME Shell 45, 46, or 47
- No additional dependencies

## Installation

### From extensions.gnome.org (Recommended)

1. Visit [extensions.gnome.org](https://extensions.gnome.org) and search for "Event Planner"
2. Click the toggle to install
3. Configure preferences if needed

### Manual Installation

1. Download or clone this repository
2. Copy to GNOME Shell extensions directory:

```bash
mkdir -p ~/.local/share/gnome-shell/extensions/
cp -r event-planner@shell.extensions.gnome.org ~/.local/share/gnome-shell/extensions/
```

3. Compile GSettings schema:

```bash
cd ~/.local/share/gnome-shell/extensions/event-planner@shell.extensions.gnome.org/schemas
glib-compile-schemas .
```

4. Restart GNOME Shell:
   - On X11: Press `Alt+F2`, type `r`, press Enter
   - On Wayland: Log out and log back in

5. Enable the extension:

```bash
gnome-extensions enable event-planner@shell.extensions.gnome.org
```

Or use the GNOME Extensions app.

## Usage

### Adding Events

1. Click the calendar icon in the top panel
2. Select a date from the calendar
3. Click "Add Event"
4. Fill in event details:
   - **Title** - Event name (required)
   - **Start/End Time** - Use arrow buttons to adjust times
   - **Description** - Optional event details
   - **Category** - Choose from built-in or custom categories
   - **Show notification** - Enable to receive a notification before the event
   - **Notify Before Event** - Choose 5-60 minutes (only if notifications enabled)
5. Click "Save"

### Editing Events

1. Click the calendar icon in the top panel
2. Select the date containing the event
3. Click the edit (pencil) icon next to the event
4. Modify event details
5. Click "Save"

**Note:** When you edit an event's time, the notification schedule automatically updates. You'll receive a new notification at the appropriate time before the event.

### Deleting Events

1. Click the calendar icon in the top panel
2. Select the date containing the event
3. Click the delete (trash) icon next to the event

### Managing Notifications

#### Global Settings

1. Right-click the calendar icon in the top panel
2. Select "Settings" or "Preferences"
3. In the Notifications section:
   - **Enable Notifications** - Toggle to enable/disable all notifications
   - **Notification Timing** - Set default time (5-60 minutes) before events

#### Per-Event Settings

Each event can have individual notification settings:
- Enable the "Show notification for this event" checkbox when creating/editing
- Set custom timing (5-60 minutes) for that specific event
- Events without notifications enabled won't trigger any alerts

**How it works:**
- Notifications appear as desktop notifications approximately 5-60 minutes before the event starts
- Notifications remain in the notification center until dismissed
- If you edit an event's time, the old notification is automatically cleared and a new one is scheduled

### Custom Categories

1. Open extension preferences (right-click calendar icon → Settings)
2. In the Custom Categories section:
   - Click "Add Custom Category"
   - Enter category name (e.g., "Sport", "Shopping", "Hobby")
   - Choose a custom color
   - Click "Add"
3. Edit or delete custom categories using the buttons next to each category

Custom categories appear alongside built-in categories when creating events.

## Data Storage

Events are stored locally in:
```
~/.local/share/event-planner/
```

Each day with events has its own JSON file named `YYYY-MM-DD.json`.

## Default Categories

- **Work** - Blue (#1e88e5)
- **Personal** - Green (#43a047)
- **Fun** - Orange (#fb8c00)
- **Family** - Purple (#8e24aa)
- **Friends** - Red (#e53935)

## Project Structure

```
event-planner@shell.extensions.gnome.org/
├── extension.js              # Main entry point
├── prefs.js                  # Preferences UI
├── metadata.json             # Extension metadata
├── stylesheet.css            # UI styling
├── README.md                # This file
├── models/
│   ├── event.js             # Event data model
│   └── eventManager.js      # Event CRUD operations
├── services/
│   └── notificationService.js  # Background notification service
├── ui/
│   ├── panelButton.js       # Top bar button
│   ├── calendarWidget.js    # Calendar UI
│   ├── eventList.js         # Event list display
│   └── eventDialog.js       # Add/Edit dialog
├── utils/
│   ├── constants.js         # Categories and utilities
│   ├── dateUtils.js         # Date helper functions
│   └── storage.js           # File I/O operations
└── schemas/
    └── org.gnome.shell.extensions.event-planner.gschema.xml
```

## Development

### Enabling Debug Mode

For development, you can enable detailed logging by setting `DEBUG = true` in each JavaScript file at the top:

```javascript
const DEBUG = true;  // Enable debug logging
```

This will output detailed logs for debugging. Remember to set it back to `false` for production.

### Testing

After making changes:

1. Reload the extension:
```bash
gnome-extensions disable event-planner@shell.extensions.gnome.org
gnome-extensions enable event-planner@shell.extensions.gnome.org
```

2. On Wayland, log out and log back in to reload

3. Check logs:
```bash
journalctl -f -o cat /usr/bin/gnome-shell | grep "Event Planner"
```

## Troubleshooting

### Extension doesn't appear in top bar

1. Check if extension is enabled:
```bash
gnome-extensions list --enabled | grep event-planner
```

2. Check for errors:
```bash
journalctl -f -o cat /usr/bin/gnome-shell
```

3. Ensure schemas are compiled:
```bash
cd ~/.local/share/gnome-shell/extensions/event-planner@shell.extensions.gnome.org/schemas
glib-compile-schemas .
```

### Notifications not appearing

1. Open extension preferences and ensure "Enable Notifications" is checked
2. When creating an event, ensure "Show notification for this event" is checked
3. Verify GNOME Shell notifications are enabled system-wide:
```bash
gsettings get org.gnome.desktop.notifications show-banners
```

### Events not saving

Check permissions on data directory:
```bash
ls -la ~/.local/share/event-planner/
```

If the directory doesn't exist, the extension will create it automatically on first use.

### Calendar not displaying correctly

1. Restart GNOME Shell (X11: `Alt+F2` → `r`, Wayland: log out/in)
2. Check JavaScript console for errors:
```bash
journalctl -f -o cat /usr/bin/gnome-shell
```

## Known Limitations

- Events are stored locally only (no cloud sync)
- No recurring event support
- Notification timing limited to 5-60 minutes before event
- One notification per event

## License

GPL-3.0 - See LICENSE file for details.

## Credits

Developed as a GNOME Shell adaptation of calendar planning concepts. Built with modern GNOME Shell ESM modules and GObject introspection.

## Support

For issues, questions, or feature requests, please use the issue tracker on extensions.gnome.org or contact the maintainer.