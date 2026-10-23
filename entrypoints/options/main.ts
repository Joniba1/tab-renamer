import { browser } from 'wxt/browser'
import {
	KEY_PREFIX,
	PREFIX_RULE_KEY,
	formatPrefix,
	isRestrictedUrl,
	normalizePrefix,
	normalizeUrl,
	sanitizeTitle,
} from '../../lib/core'
import {
	clearMappings,
	exportMappings,
	importMappings,
	listEntries,
	removeKey,
	setMapping,
	setPrefixRule,
	type Entry,
} from '../../lib/mappings'

const rows = document.querySelector<HTMLTableSectionElement>('#rows')!
const empty = document.querySelector<HTMLElement>('#empty')!
const search = document.querySelector<HTMLInputElement>('#search')!
const status = document.querySelector<HTMLElement>('#status')!
const importInput = document.querySelector<HTMLInputElement>('#import')!
const addForm = document.querySelector<HTMLFormElement>('#add')!
const addTitle = document.querySelector<HTMLInputElement>('#add-title')!
const addKind = document.querySelector<HTMLSelectElement>('#add-kind')!
const addPattern = document.querySelector<HTMLInputElement>('#add-pattern')!
const addError = document.querySelector<HTMLElement>('#add-error')!

const PLACEHOLDERS: Record<string, string> = {
	exact: 'https://example.com/page?id=1',
	prefix: 'github.com/user/repo/*',
}

let mappings: Entry[] = []

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

function showStatus(message: string): void {
	status.textContent = message
	status.hidden = false
}

function render(): void {
	const query = search.value.trim().toLowerCase()
	const visible = query
		? mappings.filter((m) => m.pattern.toLowerCase().includes(query) || m.title.toLowerCase().includes(query))
		: mappings

	rows.replaceChildren(
		...visible.map((mapping) => {
			const row = document.createElement('tr')

			const title = document.createElement('td')
			title.className = 'title'
			title.textContent = mapping.title

			const url = document.createElement('td')
			url.className = 'url'
			if (mapping.kind === 'exact') {
				const link = document.createElement('a')
				link.href = mapping.pattern
				link.target = '_blank'
				link.rel = 'noreferrer'
				link.textContent = mapping.pattern
				url.append(link)
			} else {
				const badge = document.createElement('span')
				badge.className = 'badge'
				badge.textContent = 'prefix'
				badge.title = 'Applies to every page under this path'
				url.append(badge, ` ${mapping.pattern}`)
			}

			const updated = document.createElement('td')
			updated.className = 'muted nowrap'
			updated.textContent = dateFormat.format(mapping.updatedAt)

			const actions = document.createElement('td')
			const remove = document.createElement('button')
			remove.textContent = 'Remove'
			remove.addEventListener('click', () => void removeKey(mapping.key))
			actions.append(remove)

			row.append(title, url, updated, actions)
			return row
		})
	)
	empty.hidden = visible.length > 0
	empty.textContent = mappings.length === 0 ? 'No renamed tabs yet.' : 'No matches.'
}

async function refresh(): Promise<void> {
	mappings = await listEntries()
	render()
}

search.addEventListener('input', render)

function showAddError(message: string | null): void {
	addError.textContent = message ?? ''
	addError.hidden = message == null
}

/** Accepts `example.com/page` as shorthand for `https://example.com/page`. */
function parseExactUrl(raw: string): string | null {
	const value = raw.trim()
	const hasScheme = /^[a-z][\w+.-]*:\/\//i.test(value)
	return normalizeUrl(value) ?? (hasScheme ? null : normalizeUrl(`https://${value}`))
}

addKind.addEventListener('change', () => {
	addPattern.placeholder = PLACEHOLDERS[addKind.value]!
	showAddError(null)
})

// A trailing `*` is a clear sign a prefix rule is meant.
addPattern.addEventListener('input', () => {
	if (addPattern.value.trim().endsWith('*') && addKind.value !== 'prefix') {
		addKind.value = 'prefix'
		addKind.dispatchEvent(new Event('change'))
	}
})

addForm.addEventListener('submit', async (event) => {
	event.preventDefault()
	showAddError(null)

	if (sanitizeTitle(addTitle.value) == null) {
		showAddError('Enter a title.')
		addTitle.focus()
		return
	}

	let key: string
	let label: string
	if (addKind.value === 'prefix') {
		const prefix = normalizePrefix(addPattern.value)
		if (prefix == null) {
			showAddError('Enter a pattern like github.com/user/repo/*')
			addPattern.focus()
			return
		}
		key = PREFIX_RULE_KEY + prefix
		label = formatPrefix(prefix)
		await setPrefixRule(prefix, addTitle.value)
	} else {
		const url = parseExactUrl(addPattern.value)
		if (url == null || isRestrictedUrl(url)) {
			showAddError(
				url == null
					? 'Enter an http(s) or file:// URL.'
					: "Chrome doesn't allow extensions to rename Chrome Web Store pages."
			)
			addPattern.focus()
			return
		}
		key = KEY_PREFIX + url
		label = url
		await setMapping(url, addTitle.value)
	}

	const existed = mappings.some((m) => m.key === key)
	showStatus(`${existed ? 'Updated' : 'Added'} rename for ${label}`)
	addForm.reset()
	addPattern.placeholder = PLACEHOLDERS.exact!
	addTitle.focus()
})

document.querySelector('#clear')!.addEventListener('click', async () => {
	if (mappings.length === 0) return
	if (!confirm(`Remove all ${mappings.length} custom tab titles?`)) return
	await clearMappings()
	showStatus('All custom titles removed.')
})

document.querySelector('#export')!.addEventListener('click', async () => {
	const data = await exportMappings()
	const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
	const link = document.createElement('a')
	link.href = URL.createObjectURL(blob)
	link.download = `tab-renamer-${new Date().toISOString().slice(0, 10)}.json`
	link.click()
	URL.revokeObjectURL(link.href)
})

importInput.addEventListener('change', async () => {
	const file = importInput.files?.[0]
	importInput.value = ''
	if (file == null) return
	try {
		const result = await importMappings(JSON.parse(await file.text()))
		showStatus(`Imported: ${result.added} added, ${result.updated} updated, ${result.skipped} skipped.`)
	} catch (error) {
		showStatus(`Import failed: ${error instanceof Error ? error.message : String(error)}`)
	}
})

browser.storage.onChanged.addListener((changes, area) => {
	const isOwn = (key: string) => key.startsWith(KEY_PREFIX) || key.startsWith(PREFIX_RULE_KEY)
	if (area === 'local' && Object.keys(changes).some(isOwn)) {
		void refresh()
	}
})

void refresh()
