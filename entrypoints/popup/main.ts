import { browser } from 'wxt/browser'
import {
	PREFIX_RULE_KEY,
	formatPrefix,
	isRestrictedUrl,
	normalizePrefix,
	normalizeUrl,
	prefixKeys,
} from '../../lib/core'
import { ensureInjected } from '../../lib/inject'
import { removeKey, removeMapping, resolveForUrl, setMapping, setPrefixRule } from '../../lib/mappings'

const form = document.querySelector<HTMLFormElement>('#form')!
const input = document.querySelector<HTMLInputElement>('#title')!
const urlEl = document.querySelector<HTMLElement>('#url')!
const prefixOption = document.querySelector<HTMLElement>('#prefix-option')!
const patternInput = document.querySelector<HTMLInputElement>('#pattern')!
const sourceEl = document.querySelector<HTMLElement>('#source')!
const errorEl = document.querySelector<HTMLElement>('#error')!
const saveBtn = document.querySelector<HTMLButtonElement>('#save')!
const resetBtn = document.querySelector<HTMLButtonElement>('#reset')!
const notice = document.querySelector<HTMLElement>('#notice')!

document.querySelector('#shortcuts')!.addEventListener('click', (event) => {
	event.preventDefault()
	void browser.tabs.create({ url: 'chrome://extensions/shortcuts' })
})
document.querySelector('#manage')!.addEventListener('click', (event) => {
	event.preventDefault()
	void browser.runtime.openOptionsPage()
})

function showNotice(message: string): void {
	notice.textContent = message
	notice.hidden = false
}

function showError(message: string | null): void {
	errorEl.textContent = message ?? ''
	errorEl.hidden = message == null
}

function scopeRadio(value: 'exact' | 'prefix'): HTMLInputElement {
	return document.querySelector<HTMLInputElement>(`input[name="scope"][value="${value}"]`)!
}

/** `https://github.com/a/b/?x=1` → `github.com/a/b/*`. */
function defaultPattern(href: string): string {
	const url = new URL(href)
	return formatPrefix(url.host + url.pathname.replace(/\/+$/, ''))
}

async function init(): Promise<void> {
	const [tab] = await browser.tabs.query({ active: true, currentWindow: true })

	if (tab?.id == null || isRestrictedUrl(tab.url)) {
		showNotice(
			"Chrome doesn't allow extensions to rename this page " +
				'(browser pages, the Chrome Web Store, and local files unless file access is enabled).'
		)
		return
	}

	const tabId = tab.id
	const url = tab.url!
	const resolved = await resolveForUrl(url)
	const supportsPrefix = prefixKeys(url).length > 0

	input.value = resolved?.title ?? tab.title ?? ''
	urlEl.textContent = normalizeUrl(url)
	urlEl.title = url
	prefixOption.hidden = !supportsPrefix
	if (supportsPrefix) {
		patternInput.value = resolved?.kind === 'prefix' ? resolved.pattern : defaultPattern(url)
	}
	if (resolved?.kind === 'prefix') {
		scopeRadio('prefix').checked = true
		sourceEl.textContent = `Title comes from the rule ${resolved.pattern}`
		sourceEl.hidden = false
		resetBtn.textContent = 'Remove rule'
	}
	resetBtn.disabled = resolved == null

	// Editing or focusing the pattern selects the prefix scope.
	patternInput.addEventListener('focus', () => (scopeRadio('prefix').checked = true))

	form.hidden = false
	input.focus()
	input.select()

	form.addEventListener('submit', async (event) => {
		event.preventDefault()
		showError(null)

		const usePrefix = scopeRadio('prefix').checked
		const prefix = usePrefix ? normalizePrefix(patternInput.value) : null
		if (usePrefix) {
			if (prefix == null) {
				showError('Enter a pattern like github.com/user/repo/*')
				return
			}
			if (!prefixKeys(url).includes(PREFIX_RULE_KEY + prefix)) {
				showError("That pattern doesn't match this page.")
				return
			}
		}

		saveBtn.disabled = true
		// Check the page is reachable first, so we never store a rename that
		// can't be shown (e.g. file:// without file access, PDF viewer).
		if (!(await ensureInjected(tabId))) {
			saveBtn.disabled = false
			showNotice(
				'Couldn\'t reach this page. For local files, enable "Allow access to file URLs" ' +
					'for Tab Renamer in chrome://extensions.'
			)
			return
		}

		if (prefix != null) {
			await setPrefixRule(prefix, input.value)
			// An exact rename of this page would outrank the new rule here.
			if (resolved?.kind === 'exact') await removeMapping(url)
		} else {
			await setMapping(url, input.value)
		}
		window.close()
	})

	resetBtn.addEventListener('click', async () => {
		if (resolved != null) await removeKey(resolved.key)
		window.close()
	})
}

void init()
