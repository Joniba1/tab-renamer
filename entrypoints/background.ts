import { browser, type Browser } from 'wxt/browser'
import { defineBackground } from 'wxt/utils/define-background'
import { isRestrictedUrl } from '../lib/core'
import { ensureInjected, sendToTab } from '../lib/inject'
import { removeEffective } from '../lib/storage'

const COMMAND_RENAME = 'rename-tab'
const COMMAND_RESET = 'reset-tab-title'

export default defineBackground(() => {
	browser.runtime.onInstalled.addListener(() => {
		void injectIntoOpenTabs()
	})

	browser.commands.onCommand.addListener((command, tab) => {
		if (command === COMMAND_RENAME) void renameActiveTab()
		else if (command === COMMAND_RESET) void resetActiveTab(tab)
	})

	// Fallback for SPA navigations the content script's Navigation API
	// listener might miss.
	browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
		if (changeInfo.url != null) void sendToTab(tabId, { type: 'urlChanged' })
	})
})

/** Manifest content scripts don't run in tabs that were open before install. */
const injectIntoOpenTabs = async (): Promise<void> => {
	const tabs = await browser.tabs.query({})
	await Promise.all(
		tabs
			.filter((tab) => tab.id != null && !tab.discarded && !isRestrictedUrl(tab.url))
			.map((tab) => ensureInjected(tab.id!))
	)
}

/**
 * Opens the popup even on restricted pages, where it explains why renaming
 * isn't available; silently doing nothing would look like a broken shortcut.
 * openPopup only fails when the popup is already open (e.g. the key was
 * pressed twice), which needs no handling.
 */
const renameActiveTab = async (): Promise<void> => {
	try {
		await browser.action.openPopup()
	} catch {
		// Popup already open.
	}
}

const resetActiveTab = async (tab?: Browser.tabs.Tab): Promise<void> => {
	const target = tab ?? (await browser.tabs.query({ active: true, currentWindow: true }))[0]
	if (target?.url == null || isRestrictedUrl(target.url)) return
	await removeEffective(target.url)
}
