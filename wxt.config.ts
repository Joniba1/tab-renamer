import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  // Explicit imports keep the document_start content script bundle minimal.
  imports: false,
  manifest: {
    name: 'Tab Renamer',
    description: 'Persistently rename browser tabs by exact URL.',
    minimum_chrome_version: '127',
    permissions: ['storage', 'contextMenus', 'scripting'],
    host_permissions: ['<all_urls>'],
    // The action tooltip comes from entrypoints/popup/index.html's <title>.
    commands: {
      _execute_action: {
        description: 'Open the rename popup',
      },
      // Listed by name on chrome://extensions/shortcuts, unlike _execute_action
      // ("Activate the extension"). Opens the popup: type, then Enter to save.
      'rename-tab': {
        suggested_key: { default: 'Ctrl+Shift+E' },
        description: 'Rename the current tab',
      },
      'reset-tab-title': {
        description: 'Reset the current tab to its original title',
      },
    },
  },
});
