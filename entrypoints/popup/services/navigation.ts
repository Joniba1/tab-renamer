import { browser } from 'wxt/browser'

export const openShortcutsPage = (): void => {
	void browser.tabs.create({ url: 'chrome://extensions/shortcuts' })
}

export const openManagePage = (): void => {
	void browser.runtime.openOptionsPage()
}

export const closePopup = (): void => {
	window.close()
}
