import { browser } from 'wxt/browser'
import { isRestrictedUrl, prefixKeys } from '../../../lib/core'
import { resolveForUrl } from '../../../lib/storage'
import type { Page } from '../types'

/** Loads the active tab and the rename in effect for it, or null when Chrome doesn't allow renaming it. */
export const loadActivePage = async (): Promise<Page | null> => {
	const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
	if (tab?.id == null || isRestrictedUrl(tab.url)) return null
	const url = tab.url!

	return {
		tabId: tab.id,
		url,
		tabTitle: tab.title ?? '',
		resolved: await resolveForUrl(url),
		supportsPrefix: prefixKeys(url).length > 0,
	}
}
