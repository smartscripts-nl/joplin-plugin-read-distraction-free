# Read Distraction Free

A Joplin Desktop plugin that opens the selected note in a separate reading window with adjustable side margins. The toolbar button or keyboard shortcut toggles the window. The plugin supports English and Dutch.

## Requirements

- Joplin Desktop 3.7.22 or newer
- Optional: Headings to Tabs for automatically showing tabs in eligible notes

## Build and install

From the repository root:

```sh
npm install
npm run dist
```

The installable archive is created in `publish/com.alexpot.read-distraction-free.jpl`.

In Joplin, open **Tools → Options → Plugins**, choose **Install from file** in the gear menu, select the archive, and restart Joplin.

Use **Tools → Options → Read Distraction Free** to adjust the plugin settings and **Keyboard Shortcuts** to change its shortcut. The default shortcut is **Ctrl+Alt+Shift+R**.

## License

[MIT](LICENSE)
