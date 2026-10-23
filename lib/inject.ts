import { browser } from 'wxt/browser'
import type { ContentMessage } from './core'

/** Built output paths of the content scripts (see entrypoints/*.content.ts). WXT types them, so a typo fails typecheck. */
const ISOLATED_SCRIPT = '/content-scripts/title-guard.js' as const
const MAIN_SCRIPT = '/content-scripts/title-main.js' as const

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
		})
		await browser.scripting.executeScript({
			target: { tabId },
			files: [ISOLATED_SCRIPT],
			injectImmediately: true,
		})
		return true
	} catch {
		return false
	}
}
