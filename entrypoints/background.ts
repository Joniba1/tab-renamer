import { browser, type Browser } from 'wxt/browser'
import { defineBackground } from 'wxt/utils/define-background'
import { CONTENT_MATCHES, isRestrictedUrl, sanitizeTitle } from '../lib/core'
import { ensureInjected, sendToTab } from '../lib/inject'
import { removeEffective, resolveForUrl, setMapping } from '../lib/storage'

const MENU_RENAME = 'rename-tab'
const MENU_RESET = 'reset-tab-title'
const COMMAND_RENAME = 'rename-tab'
const COMMAND_RESET = 'reset-tab-title'

export default defineBackground(() => {
	browser.runtime.onInstalled.addListener(() => {
		void createMenus()
		void injectIntoOpenTabs()
	})

	browser.contextMenus.onClicked.addListener((info, tab) => {
		if (tab?.id == null || isRestrictedUrl(tab.url)) return
		if (info.menuItemId === MENU_RENAME) void renameTab(tab)
		else if (info.menuItemId === MENU_RESET) void removeEffective(tab.url!)
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

const createMenus = async (): Promise<void> => {
	await browser.contextMenus.removeAll()
	browser.contextMenus.create({
		id: MENU_RENAME,
		title: 'Rename this tab…',
		contexts: ['page', 'frame', 'selection', 'link', 'image'],
		documentUrlPatterns: CONTENT_MATCHES,
	})
	browser.contextMenus.create({
		id: MENU_RESET,
		title: 'Reset tab title',
		contexts: ['page', 'frame', 'selection', 'link', 'image'],
		documentUrlPatterns: CONTENT_MATCHES,
	})
}

/** Manifest content scripts don't run in tabs that were open before install. */
const injectIntoOpenTabs = async (): Promise<void> => {
	const tabs = await browser.tabs.query({})
	await Promise.all(
		tabs
			.filter((tab) => tab.id != null && !tab.discarded && !isRestrictedUrl(tab.url))
			.map((tab) => ensureInjected(tab.id!))
	)
}

const renameTab = async (tab: Browser.tabs.Tab): Promise<void> => {
	try {
		await browser.action.openPopup()
		return
	} catch {
		// openPopup can fail (e.g. no focused window); fall back to prompt().
	}
	const current = (await resolveForUrl(tab.url!))?.title ?? tab.title ?? ''
	const [result] = await browser.scripting.executeScript({
		target: { tabId: tab.id! },
		func: (value: string) => window.prompt('Rename this tab (leave empty to reset):', value),
		args: [current],
	})
	const answer = result?.result
	if (typeof answer !== 'string') return // cancelled
	if (!(await ensureInjected(tab.id!))) return
	// Empty means reset: remove whichever rename is in effect, which may be a
	// prefix rule rather than an exact rename of this URL.
	if (sanitizeTitle(answer) == null) await removeEffective(tab.url!)
	else await setMapping(tab.url!, answer)
}

/**
 * Opens the popup even on restricted pages, where it explains why renaming
 * isn't available; silently doing nothing would look like a broken shortcut.
 * No prompt() fallback here: a shortcut always comes from a focused window,
 * so openPopup only fails when the popup is already open (e.g. the key was
 * pressed twice), and that should not stack a native prompt on top of it.
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
