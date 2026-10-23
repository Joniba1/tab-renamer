import { browser } from 'wxt/browser'
import { defineContentScript } from 'wxt/utils/define-content-script'
import {
	CONTENT_MATCHES,
	EVT_LOCK,
	EVT_READY,
	EVT_UNLOCK,
	TITLE_ATTR,
	lookupKeys,
	normalizeUrl,
	resolveTitle,
	type ContentMessage,
} from '../lib/core'

/**
 * ISOLATED world. Looks up the custom title for this page (exact URL first,
 * then the longest matching prefix rule, all in one storage call) and, when
 * one exists, owns the document's title:
 *
 * - Inserts its own <title> as the first title element in tree order. Both
 *   `document.title` and Chrome's tab strip read the first <title>, so the
 *   site's own <title> is inert from the moment it is parsed.
 * - A MutationObserver puts that element back if the page removes it, edits
 *   it, or inserts another <title> in front of it.
 * - Tells the MAIN-world script (title-main.content.ts) to drop page writes
 *   to `document.title` while locked.
 */
export default defineContentScript({
	matches: CONTENT_MATCHES,
	runAt: 'document_start',
	allFrames: false,
	noScriptStartedPostMessage: true,

	main(ctx) {
		let currentUrl = normalizeUrl(location.href)
		let currentKeys = lookupKeys(location.href)
		// Every lookup bumps seq, so a lookup that resolves after a newer one
		// (storage change or URL change) is ignored.
		let seq = 0
		let title: string | null = null
		let titleEl: HTMLTitleElement | null = null
		let observer: MutationObserver | null = null
		let observedHead: HTMLHeadElement | null = null

		const load = async (): Promise<void> => {
			const mySeq = ++seq
			const keys = currentKeys
			const result = await browser.storage.local.get(keys)
			if (mySeq !== seq || ctx.isInvalid) return
			apply(resolveTitle(keys, result)?.title ?? null)
		}

		// Kick off the lookup before any other setup: it is the only thing
		// between the page and its custom title. load() only reaches apply() and
		// the helpers below after its await, by which time they are defined.
		if (currentKeys.length > 0) void load()

		const apply = (next: string | null): void => {
			if (next == null) {
				release()
				return
			}
			title = next
			ensureTitle()
			observe()
			document.dispatchEvent(new CustomEvent(EVT_LOCK))
		}

		const release = (): void => {
			const wasLocked = title != null
			title = null
			observer?.disconnect()
			observer = null
			observedHead = null
			titleEl?.remove()
			// Removing ours makes the site's own <title> first again; MAIN then
			// replays the last title the page tried to set while locked.
			if (wasLocked) document.dispatchEvent(new CustomEvent(EVT_UNLOCK))
		}

		/** Idempotent, so reacting to our own mutations can't loop. */
		const ensureTitle = (): void => {
			if (title == null) return
			if (titleEl == null) {
				titleEl = document.createElement('title')
				titleEl.setAttribute(TITLE_ATTR, '')
			}
			if (titleEl.textContent !== title) titleEl.textContent = title
			if (!titleEl.isConnected || document.querySelector('title') !== titleEl) {
				// Before <head> exists, sit directly under <html>; the parser adds
				// <head> after us, keeping ours first in tree order.
				const parent = document.head ?? document.documentElement
				parent?.prepend(titleEl)
			}
		}

		const observe = (): void => {
			const root = document.documentElement
			if (root == null || titleEl == null) return
			if (observer == null) {
				observer = new MutationObserver(() => {
					observeHead()
					ensureTitle()
				})
				// <html> children catches <head> being created or replaced and our
				// element being removed while it sits under <html>.
				observer.observe(root, { childList: true })
				observer.observe(titleEl, { childList: true, characterData: true, subtree: true })
			}
			observeHead()
		}

		const observeHead = (): void => {
			const head = document.head
			if (observer == null || head == null || head === observedHead) return
			observedHead = head
			observer.observe(head, { childList: true })
		}

		const onUrlMaybeChanged = (): void => {
			const url = normalizeUrl(location.href)
			if (url === currentUrl) return
			currentUrl = url
			currentKeys = lookupKeys(location.href)
			if (currentKeys.length === 0) {
				seq++
				apply(null)
				return
			}
			// Keep the current lock until the lookup answers, to avoid flashing
			// the native title between two renamed URLs.
			void load()
		}

		const onStorageChanged = (changes: Record<string, unknown>, area: string): void => {
			if (area !== 'local' || !currentKeys.some((key) => key in changes)) return
			// A change to one key can expose or hide another (e.g. removing an
			// exact rename reveals a prefix rule), so re-resolve from storage.
			void load()
		}
		browser.storage.onChanged.addListener(onStorageChanged)

		const onMessage = (
			message: ContentMessage,
			_sender: unknown,
			sendResponse: (response: unknown) => void
		): void => {
			if (message?.type === 'ping') sendResponse(true)
			else if (message?.type === 'urlChanged') onUrlMaybeChanged()
		}
		browser.runtime.onMessage.addListener(onMessage)

		// The MAIN-world script may start after us; resend the lock when it does.
		ctx.addEventListener(document, EVT_READY, () => {
			if (title != null) document.dispatchEvent(new CustomEvent(EVT_LOCK))
		})

		// SPA navigations (pushState, replaceState, back/forward) don't reload
		// content scripts. The background also sends `urlChanged` as a fallback.
		const navigation = (window as { navigation?: EventTarget }).navigation
		if (navigation != null) {
			ctx.addEventListener(navigation, 'currententrychange', onUrlMaybeChanged)
		}

		// An orphaned copy (extension reloaded/updated) must hand the title back
		// instead of fighting the newly injected script.
		ctx.onInvalidated(() => {
			seq++
			release()
			try {
				browser.storage.onChanged.removeListener(onStorageChanged)
				browser.runtime.onMessage.removeListener(onMessage)
			} catch {
				// Extension context already gone.
			}
		})
	},
})
