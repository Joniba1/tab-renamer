import { browser } from 'wxt/browser'
import type { ContentMessage } from './core'

/** Built output paths of the content scripts (see entrypoints/*.content.ts). */
const ISOLATED_SCRIPT = '/content-scripts/title-guard.js'
const MAIN_SCRIPT = '/content-scripts/title-main.js'

export const sendToTab = async (tabId: number, message: ContentMessage): Promise<unknown> => {
	try {
		return await browser.tabs.sendMessage(tabId, message)
	} catch {
		return undefined
	}
}

/**
 * Makes sure the content scripts run in the tab. Manifest content scripts only
 * run on navigations after install, so tabs that were already open need them
 * injected. Returns false when Chrome refuses (restricted or file:// without
 * access).
 */
export const ensureInjected = async (tabId: number): Promise<boolean> => {
	if ((await sendToTab(tabId, { type: 'ping' })) === true) return true
	try {
		await browser.scripting.executeScript({
			target: { tabId },
			files: [MAIN_SCRIPT],
			world: 'MAIN',
			injectImmediately: true,
		} as Parameters<typeof browser.scripting.executeScript>[0])
		await browser.scripting.executeScript({
			target: { tabId },
			files: [ISOLATED_SCRIPT],
			injectImmediately: true,
		} as Parameters<typeof browser.scripting.executeScript>[0])
		return true
	} catch {
		return false
	}
}
