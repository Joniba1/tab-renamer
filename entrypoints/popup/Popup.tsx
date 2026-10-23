import { useEffect, useRef, useState } from 'preact/hooks'
import { browser } from 'wxt/browser'
import {
	PREFIX_RULE_KEY,
	defaultPattern,
	isRestrictedUrl,
	normalizePrefix,
	normalizeUrl,
	prefixKeys,
	type Resolved,
} from '../../lib/core'
import { ensureInjected } from '../../lib/inject'
import { removeKey, removeMapping, resolveForUrl, setMapping, setPrefixRule } from '../../lib/mappings'
import styles from './Popup.module.scss'

type Scope = 'exact' | 'prefix'

/** The active tab, once it is known to be renamable. */
interface Page {
	tabId: number
	url: string
	resolved: Resolved | null
	supportsPrefix: boolean
}

const RESTRICTED_NOTICE =
	"Chrome doesn't allow extensions to rename this page " +
	'(browser pages, the Chrome Web Store, and local files unless file access is enabled).'

const UNREACHABLE_NOTICE =
	'Couldn\'t reach this page. For local files, enable "Allow access to file URLs" ' +
	'for Tab Renamer in chrome://extensions.'

export function Popup() {
	const [page, setPage] = useState<Page | null>(null)
	const [title, setTitle] = useState('')
	const [scope, setScope] = useState<Scope>('exact')
	const [pattern, setPattern] = useState('')
	const [error, setError] = useState<string | null>(null)
	const [notice, setNotice] = useState<string | null>(null)
	const [saving, setSaving] = useState(false)
	const titleInput = useRef<HTMLInputElement>(null)

	useEffect(() => {
		void (async () => {
			const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
			if (tab?.id == null || isRestrictedUrl(tab.url)) {
				setNotice(RESTRICTED_NOTICE)
				return
			}
			const url = tab.url!
			const resolved = await resolveForUrl(url)
			const supportsPrefix = prefixKeys(url).length > 0
			setTitle(resolved?.title ?? tab.title ?? '')
			if (supportsPrefix) setPattern(resolved?.kind === 'prefix' ? resolved.pattern : defaultPattern(url))
			if (resolved?.kind === 'prefix') setScope('prefix')
			setPage({ tabId: tab.id, url, resolved, supportsPrefix })
		})()
	}, [])

	// The form appears with the current title selected, ready to be typed over.
	useEffect(() => {
		if (page == null) return
		titleInput.current?.focus()
		titleInput.current?.select()
	}, [page])

	async function save(event: Event): Promise<void> {
		event.preventDefault()
		if (page == null) return
		setError(null)

		const usePrefix = scope === 'prefix'
		const prefix = usePrefix ? normalizePrefix(pattern) : null
		if (usePrefix) {
			if (prefix == null) {
				setError('Enter a pattern like github.com/user/repo/*')
				return
			}
			if (!prefixKeys(page.url).includes(PREFIX_RULE_KEY + prefix)) {
				setError("That pattern doesn't match this page.")
				return
			}
		}

		setSaving(true)
		// Check the page is reachable first, so we never store a rename that
		// can't be shown (e.g. file:// without file access, PDF viewer).
		if (!(await ensureInjected(page.tabId))) {
			setSaving(false)
			setNotice(UNREACHABLE_NOTICE)
			return
		}

		if (prefix != null) {
			await setPrefixRule(prefix, title)
			// An exact rename of this page would outrank the new rule here.
			if (page.resolved?.kind === 'exact') await removeMapping(page.url)
		} else {
			await setMapping(page.url, title)
		}
		window.close()
	}

	async function reset(): Promise<void> {
		if (page?.resolved != null) await removeKey(page.resolved.key)
		window.close()
	}

	const resolved = page?.resolved ?? null

	return (
		<main class={styles.main}>
			<h1 class={styles.heading}>Rename tab</h1>

			<form id="form" hidden={page == null} onSubmit={(event) => void save(event)}>
				<input
					id="title"
					class={styles.input}
					ref={titleInput}
					type="text"
					maxLength={256}
					autocomplete="off"
					spellcheck={false}
					aria-label="Custom tab title"
					value={title}
					onInput={(event) => setTitle(event.currentTarget.value)}
				/>

				<fieldset class={styles.fieldset}>
					<legend class={styles.legend}>Apply to</legend>
					<label class={styles.scope}>
						<input
							type="radio"
							name="scope"
							value="exact"
							checked={scope === 'exact'}
							onChange={() => setScope('exact')}
						/>
						<span>
							This page only
							<span class={styles.url} id="url" title={page?.url}>
								{page != null && normalizeUrl(page.url)}
							</span>
						</span>
					</label>
					<label class={styles.scope} id="prefix-option" hidden={page != null && !page.supportsPrefix}>
						<input
							type="radio"
							name="scope"
							value="prefix"
							checked={scope === 'prefix'}
							onChange={() => setScope('prefix')}
						/>
						<span>
							All pages under
							<input
								id="pattern"
								class={`${styles.input} ${styles.pattern}`}
								type="text"
								autocomplete="off"
								spellcheck={false}
								aria-label="URL prefix pattern"
								value={pattern}
								onInput={(event) => setPattern(event.currentTarget.value)}
								// Editing or focusing the pattern selects the prefix scope.
								onFocus={() => setScope('prefix')}
							/>
						</span>
					</label>
				</fieldset>

				{resolved?.kind === 'prefix' && (
					<p class={styles.source} id="source">
						{`Title comes from the rule ${resolved.pattern}`}
					</p>
				)}
				{error != null && (
					<p class={styles.error} id="error" role="alert">
						{error}
					</p>
				)}

				<div class={styles.actions}>
					<button type="submit" class={`${styles.button} ${styles.primary}`} id="save" disabled={saving}>
						Save
					</button>
					<button
						type="button"
						class={styles.button}
						id="reset"
						disabled={resolved == null}
						onClick={() => void reset()}
					>
						{resolved?.kind === 'prefix' ? 'Remove rule' : 'Reset to original'}
					</button>
				</div>
			</form>

			{notice != null && (
				<p class={styles.notice} id="notice">
					{notice}
				</p>
			)}

			<footer class={styles.footer}>
				<a
					href="#"
					id="shortcuts"
					class={styles.link}
					onClick={(event) => {
						event.preventDefault()
						void browser.tabs.create({ url: 'chrome://extensions/shortcuts' })
					}}
				>
					Keyboard shortcuts
				</a>
				<a
					href="#"
					id="manage"
					class={styles.link}
					onClick={(event) => {
						event.preventDefault()
						void browser.runtime.openOptionsPage()
					}}
				>
					Manage all renames
				</a>
			</footer>
		</main>
	)
}
