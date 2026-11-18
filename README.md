# Read Distraction Free

A Joplin Desktop plugin that opens the selected note in a separate reading window with adjustable side margins. The toolbar button or keyboard shortcut toggles the window. The plugin supports English and Dutch.

## Requirements

- Joplin Desktop 3.7.22 or newer
- Optional: Headings to Tabs for automatically showing tabs in eligible notes

## Build and install

From the repository root, create the Joplin plugin archive:

```sh
mkdir -p dist
tar --format=ustar -cf dist/Read-Distraction-Free.jpl manifest.json index.js window-control.js LICENSE
```

In Joplin, open **Tools → Options → Plugins**, choose **Install from file** in the gear menu, select the archive, and restart Joplin.

Use **Tools → Options → Read Distraction Free** to adjust the plugin settings and **Keyboard Shortcuts** to change its shortcut. The default shortcut is **Ctrl+Alt+Shift+R**.

## License

[MIT](LICENSE)
