'use strict';

const fs = require('fs');
const path = require('path');

const autoTabsKey = Symbol.for('com.joplin.plugin.headings-to-tabs.enable-on-load');

function closeReaderAndFocusMain(reader) {
  let mainWindow;
  try {
    // This script runs in Joplin's main renderer, where Electron Remote is enabled.
    mainWindow = require('@electron/remote').getCurrentWindow();
    if (mainWindow.isMinimized()) mainWindow.restore();
    if (!mainWindow.isVisible()) mainWindow.showInactive();
  } catch (error) {
    mainWindow = undefined;
    console.warn('Read Distraction Free: could not restore the main window', error);
  }

  reader.close();

  // Joplin defers destruction of detached windows in its native close handler.
  let attempts = 0;
  const timer = setInterval(() => {
    if (!reader.closed && ++attempts < 40) return;
    clearInterval(timer);
    try {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.focus();
      } else if (!mainWindow) {
        window.focus();
      }
    } catch (error) {
      console.warn('Read Distraction Free: could not focus the main window', error);
    }
  }, 50);
}

// Joplin loads Markdown renderer modules in its main renderer, which owns
// the Window objects returned by its native note-window component.
exports.default = () => {
  const directory = path.dirname(__filename);
  const request = path.join(directory, 'window-request.json');
  const response = path.join(directory, 'window-response.json');
  const stateKey = Symbol.for('com.joplin.plugin.read-distraction-free.window-control');

  if (!window[stateKey]) {
    let reader;
    let armTimer;
    let restore;

    const reply = (id, status) => {
      fs.writeFileSync(response, JSON.stringify({ id, status }));
    };

    const handleRequest = () => {
      let message;
      try {
        message = JSON.parse(fs.readFileSync(request, 'utf8'));
      } catch {
        return;
      }
      const { id } = message;
      if (!id || window[stateKey].lastId === id) return;
      window[stateKey].lastId = id;
      if (reader && !reader.closed) {
        closeReaderAndFocusMain(reader);
        reply(id, 'closed');
        return;
      }

      reader = undefined;
      if (message.closeOnly) {
        reply(id, 'idle');
        return;
      }
      restore?.();
      const original = window.open;
      function capture(url, ...args) {
        const popup = original.call(this, url, ...args);
        if (url === 'about:blank' && popup) {
          reader = popup;
          restore();
          reply(id, 'opened');
          if (message.autoTabs) {
            popup[autoTabsKey] = true;
          }
        }
        return popup;
      }
      restore = () => {
        if (window.open === capture) window.open = original;
        clearTimeout(armTimer);
        restore = undefined;
      };
      window.open = capture;
      armTimer = setTimeout(() => {
        restore();
        reply(id, 'timeout');
      }, 3000);
      reply(id, 'ready');
    };

    window[stateKey] = {};
    fs.watch(directory, { persistent: false }, (_event, filename) => {
      if (filename === path.basename(request)) handleRequest();
    });
    handleRequest();
  }

  return { plugin() {} };
};
