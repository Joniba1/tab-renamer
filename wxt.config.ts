import preact from '@preact/preset-vite'
import { defineConfig } from 'wxt'

export default defineConfig({
	imports: false,
	vite: () => ({ plugins: [preact()] }),
	manifest: {
		name: 'Tab Renamer',
		description: 'Persistently rename browser tabs by exact URL or URL prefix.',
		minimum_chrome_version: '127',
		permissions: ['storage', 'contextMenus', 'scripting'],
		host_permissions: ['<all_urls>'],

		commands: {
			_execute_action: {
				description: 'Open the rename popup',
			},
			'rename-tab': {
				suggested_key: { default: 'Ctrl+Shift+E' },
				description: 'Rename the current tab',
			},
			'reset-tab-title': {
				description: 'Reset the current tab to its original title',
			},
		},
	},
})
