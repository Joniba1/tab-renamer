import { useEffect, useState } from 'preact/hooks'
import { browser } from 'wxt/browser'
import { clearMappings, exportMappings, importMappings, isOwnKey, listEntries, type Entry } from '../../lib/mappings'
import { AddForm } from './AddForm'
import styles from './App.module.scss'
import { EntriesTable } from './EntriesTable'

export function App() {
	// null until the first load, so the empty-state text doesn't flash.
	const [entries, setEntries] = useState<Entry[] | null>(null)
	const [search, setSearch] = useState('')
	const [status, setStatus] = useState<string | null>(null)

	useEffect(() => {
		const refresh = () => void listEntries().then(setEntries)
		const onChanged = (changes: Record<string, unknown>, area: string) => {
			if (area === 'local' && Object.keys(changes).some(isOwnKey)) refresh()
		}
		refresh()
		browser.storage.onChanged.addListener(onChanged)
		return () => browser.storage.onChanged.removeListener(onChanged)
	}, [])

	const all = entries ?? []
	const query = search.trim().toLowerCase()
	const visible = query
		? all.filter((e) => e.pattern.toLowerCase().includes(query) || e.title.toLowerCase().includes(query))
		: all

	async function clearAll(): Promise<void> {
		if (all.length === 0) return
		if (!confirm(`Remove all ${all.length} custom tab titles?`)) return
		await clearMappings()
		setStatus('All custom titles removed.')
	}

	async function exportAll(): Promise<void> {
		const data = await exportMappings()
		const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
		const link = document.createElement('a')
		link.href = URL.createObjectURL(blob)
		link.download = `tab-renamer-${new Date().toISOString().slice(0, 10)}.json`
		link.click()
		URL.revokeObjectURL(link.href)
	}

	async function importFile(input: HTMLInputElement): Promise<void> {
		const file = input.files?.[0]
		input.value = ''
		if (file == null) return
		try {
			const result = await importMappings(JSON.parse(await file.text()))
			setStatus(`Imported: ${result.added} added, ${result.updated} updated, ${result.skipped} skipped.`)
		} catch (error) {
			setStatus(`Import failed: ${error instanceof Error ? error.message : String(error)}`)
		}
	}

	return (
		<main class={styles.main}>
			<header>
				<h1 class={styles.heading}>Tab Renamer</h1>
				<p class={styles.intro}>
					{'Exact renames match one URL (query parameters included, #hash ignored). Prefix rules such as '}
					<code>github.com/user/repo/*</code> match every page under that path. An exact rename wins over a
					prefix rule, and a longer prefix over a shorter one. Everything is stored only on this computer.
				</p>
			</header>

			<AddForm entries={all} onStatus={setStatus} />

			<div class={styles.toolbar}>
				<input
					id="search"
					class={styles.search}
					type="search"
					placeholder="Search URL or title…"
					aria-label="Search"
					value={search}
					onInput={(event) => setSearch(event.currentTarget.value)}
				/>
				<button id="export" class={styles.button} onClick={() => void exportAll()}>
					Export JSON
				</button>
				<label class={styles.button}>
					Import JSON
					<input
						id="import"
						type="file"
						accept="application/json,.json"
						hidden
						onChange={(event) => void importFile(event.currentTarget)}
					/>
				</label>
				<button id="clear" class={`${styles.button} ${styles.danger}`} onClick={() => void clearAll()}>
					Clear all
				</button>
			</div>

			{/* Always in the DOM so screen readers announce changes to it. */}
			<p id="status" class={styles.status} role="status" hidden={status == null}>
				{status}
			</p>

			<EntriesTable entries={visible} />
			{entries != null && visible.length === 0 && (
				<p id="empty" class={styles.empty}>
					{all.length === 0 ? 'No renamed tabs yet.' : 'No matches.'}
				</p>
			)}
		</main>
	)
}
