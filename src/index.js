(() => {
  'use strict';

  const name = 'Read Distraction Free';
  const command = 'readDistractionFree.open';
  const section = 'readDistractionFree';
  const icons = {
    book: ['openBook', 'fa-book-open'],
    column: ['textColumn', 'fa-align-center'],
    article: ['articlePage', 'fa-file-alt'],
    focus: ['focusFrame', 'fa-expand'],
  };
  const defaultShortcut = 'Ctrl+Alt+Shift+R';
  const translations = {
    "en": {
      "openBook": "Open book",
      "textColumn": "Text column",
      "articlePage": "Article page",
      "focusFrame": "Focus frame",
      "keymapError": "Could not read Joplin’s keyboard shortcuts file.",
      "noResponse": "Joplin did not report the status of the reading window.",
      "editorError": "Joplin could not switch to the Rich Text editor yet. Try again once the note has been saved.",
      "windowTimeout": "Could not register the new note window.",
      "windowError": "Could not open or close the Joplin reading window.",
      "margin": "Margin per side (px)",
      "marginHelp": "Applies to separate note windows. Margins shrink in narrow windows. Restart Joplin after changing this setting.",
      "autoTabs": "Enable Headings to Tabs automatically",
      "autoTabsHelp": "Show tabs in new reading windows for notes with ## headings when Headings to Tabs is enabled.",
      "shortcut": "Shortcut",
      "shortcutHelp": "Set in Joplin Keyboard Shortcuts",
      "unassigned": "Not assigned",
      "icon": "Note toolbar icon",
      "iconHelp": "Restart Joplin to apply the selected icon."
    },
    "nl": {
      "openBook": "Open boek",
      "textColumn": "Tekstkolom",
      "articlePage": "Artikelblad",
      "focusFrame": "Focuskader",
      "keymapError": "Joplins sneltoetsbestand kon niet worden gelezen.",
      "noResponse": "Joplin heeft de status van het leesvenster niet doorgegeven.",
      "editorError": "Joplin kon nog niet naar de Rich Text-editor schakelen. Probeer het opnieuw zodra de notitie is opgeslagen.",
      "windowTimeout": "Het nieuwe notitievenster kon niet worden geregistreerd.",
      "windowError": "Het Joplin-leesvenster kon niet worden geopend of gesloten.",
      "margin": "Marge per zijde (px)",
      "marginHelp": "Voor afzonderlijke notitievensters. Bij een smal venster worden de marges kleiner. Herstart Joplin na een wijziging.",
      "autoTabs": "Headings to Tabs automatisch activeren",
      "autoTabsHelp": "Toon tabbladen in nieuwe leesvensters met ##-koppen als Headings to Tabs actief is.",
      "shortcut": "Sneltoets",
      "shortcutHelp": "Ingesteld onder Joplin Sneltoetsen",
      "unassigned": "Niet toegewezen",
      "icon": "Pictogram rechtsboven",
      "iconHelp": "Herstart Joplin om het gekozen pictogram toe te passen."
    }
  };
  let messages = translations.en;
  let opening = false;

  async function effectiveShortcut(defaultAccelerator) {
    const fs = require('fs').promises;
    const path = require('path');
    const profile = await joplin.settings.globalValue('profileDir');
    if (!profile) return defaultAccelerator;

    try {
      const entries = JSON.parse(await fs.readFile(path.join(profile, 'keymap-desktop.json'), 'utf8'));
      const entry = Array.isArray(entries) && entries.findLast(item => item?.command === command);
      if (entry && (typeof entry.accelerator === 'string' || entry.accelerator === null)) {
        return entry.accelerator;
      }
    } catch (error) {
      if (error.code !== 'ENOENT') console.warn(name, messages.keymapError, error);
    }
    return defaultAccelerator;
  }

  async function waitForWindowResponse(response, id, accepted) {
    const fs = require('fs').promises;
    for (let attempt = 0; attempt < 80; attempt++) {
      const result = await fs.readFile(response, 'utf8').then(JSON.parse).catch(() => null);
      if (result?.id === id && accepted.includes(result.status)) return result.status;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    throw new Error(messages.noResponse);
  }

  async function toggleReader() {
    if (opening) return;
    opening = true;
    try {
      const fs = require('fs').promises;
      const path = require('path');
      const id = require('crypto').randomUUID();
      const noteIds = await joplin.workspace.selectedNoteIds();
      const directory = await joplin.plugins.installationDir();
      const request = path.join(directory, 'window-request.json');
      const response = path.join(directory, 'window-response.json');
      const pending = request + '.tmp';
      await fs.writeFile(pending, JSON.stringify({ id, closeOnly: noteIds.length !== 1, autoTabs: await joplin.settings.value('autoTabs') }));
      await fs.rename(pending, request);
      const status = await waitForWindowResponse(response, id, ['ready', 'closed', 'idle']);
      if (status === 'ready') {
        // The native note window inherits the current editor type.
        if (await joplin.settings.globalValue('editor.codeView')) {
          await joplin.commands.execute('toggleEditors');
          if (await joplin.settings.globalValue('editor.codeView')) {
            throw new Error(messages.editorError);
          }
        }
        await joplin.commands.execute('openNoteInNewWindow', noteIds[0]);
        if (await waitForWindowResponse(response, id, ['opened', 'timeout']) === 'timeout') {
          throw new Error(messages.windowTimeout);
        }
      }
    } catch (error) {
      console.error(name, error);
      await joplin.views.dialogs.showMessageBox(
        messages.windowError + '\n\n' + (error?.message || error),
      );
    } finally {
      opening = false;
    }
  }

  async function applyStyles(displayedShortcut) {
    const fs = require('fs').promises;
    const path = require('path');
    const value = Number(await joplin.settings.value('margin'));
    const margin = Number.isFinite(value) ? Math.max(0, Math.min(1000, Math.round(value))) : 240;
    const directory = await joplin.plugins.dataDir();
    const destination = path.join(directory, 'reading-margins.css');
    const settingsPanel = `[id="setting-section-plugin-com.joplin.plugin.read-distraction-free.${section}"]`;
    const settingsColumn = settingsPanel + ' .config-screen-settings-container > div';
    const shortcutInfo = messages.shortcutHelp + ': ' + (displayedShortcut || messages.unassigned);
    // Joplin loads the same chrome stylesheets into each native note window.
    const stylesheet = `
      .secondary-window-root .note-editor-wrapper {
        --rdf-side-margin: min(${margin}px, 23%);
      }
      .secondary-window-root .note-editor-viewer-row > :is(.editor, .viewer) {
        box-sizing: border-box;
        padding-inline: var(--rdf-side-margin);
      }
      .secondary-window-root .note-editor-viewer-row.-show-editor.-show-viewer > :is(.editor, .viewer) {
        padding-inline: min(${margin}px, 5%);
      }
      .secondary-window-root .joplin-tinymce .tox-edit-area__iframe {
        inset-inline-start: var(--rdf-side-margin);
        width: calc(100% - 2 * var(--rdf-side-margin));
      }
      ${settingsColumn} > div:has(+ [id^="advanced_settings_"])::after {
        content: ${JSON.stringify(messages.shortcut)};
        display: block;
        margin-top: 1em;
        font-weight: bold;
      }
      ${settingsColumn}:has(> [id^="advanced_settings_"])::after {
        content: ${JSON.stringify(shortcutInfo)};
        display: block;
        margin-top: 0.25em;
      }
    `;
    await fs.writeFile(destination, stylesheet, 'utf8');
    await joplin.window.loadChromeCssFile(require('url').pathToFileURL(destination).href);
  }

  joplin.plugins.register({
    onStart: async () => {
      await joplin.settings.registerSection(section, { label: name, iconName: 'fas fa-book-open' });
      const setting = { public: true, section };
      await joplin.settings.registerSettings({
        language: {
          ...setting, type: 2, value: 'en', isEnum: true,
          options: { en: 'English', nl: 'Nederlands' },
          label: 'Language / Taal',
          description: 'Restart Joplin to apply / Herstart Joplin om toe te passen.',
        },
      });
      messages = await joplin.settings.value('language') === 'nl' ? translations.nl : translations.en;
      const displayedShortcut = (await effectiveShortcut(defaultShortcut))
        ?.replace(/CmdOrCtrl/g, process.platform === 'darwin' ? 'Cmd' : 'Ctrl')
        .replace(/(^|\+)Alt(?=\+|$)/g, process.platform === 'darwin' ? '$1Option' : '$1Alt');
      await joplin.settings.registerSettings({
        margin: {
          ...setting, type: 1, value: 240, minimum: 0, maximum: 1000, step: 1,
          label: messages.margin,
          description: messages.marginHelp,
        },
        autoTabs: {
          ...setting, type: 3, value: true,
          label: messages.autoTabs,
          description: messages.autoTabsHelp,
        },
        icon: {
          ...setting, type: 2, value: 'book', isEnum: true,
          options: Object.fromEntries(Object.entries(icons).map(([id, [label]]) => [id, messages[label]])),
          label: messages.icon,
          description: messages.iconHelp,
        },
      });
      const directory = await joplin.plugins.installationDir();
      const fs = require('fs').promises;
      const path = require('path');
      await Promise.all(['window-request.json', 'window-response.json'].map(file =>
        fs.rm(path.join(directory, file), { force: true }),
      ));
      await joplin.contentScripts.register('markdownItPlugin', 'window-control', './window-control.js');
      await applyStyles(displayedShortcut);
      const icon = icons[await joplin.settings.value('icon')] || icons.book;
      await joplin.commands.register({
        name: command,
        label: displayedShortcut ? name + ' (' + displayedShortcut + ')' : name,
        iconName: 'fas ' + icon[1],
        execute: toggleReader,
      });
      await joplin.views.toolbarButtons.create('read', command, 'noteToolbar');
      await joplin.views.menuItems.create('read-menu', command, 'tools', { accelerator: defaultShortcut });
    },
  });
})();