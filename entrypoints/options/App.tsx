import { useState } from 'preact/hooks'
import type { Entry } from '../../lib/storage'
import { Card } from '../../components/Card'
import { TextInput } from '../../components/TextInput'
import styles from './App.module.scss'
import { AddForm } from './components/AddForm'
import { EntriesTable } from './components/EntriesTable'
import { RenameActions } from './components/RenameActions'
import { useEntries } from './hooks/useEntries'

/** Entries whose title or URL/pattern contains the query, case-insensitively. */
const filterEntries = (entries: Entry[], query: string): Entry[] => {
	const needle = query.trim().toLowerCase()
	if (needle === '') return entries
	return entries.filter((e) => e.pattern.toLowerCase().includes(needle) || e.title.toLowerCase().includes(needle))
}

/** The manage page: add a rename, then browse, search and remove existing ones. */
export const App = () => {
	const entries = useEntries()
	const [search, setSearch] = useState('')
	const [status, setStatus] = useState<string | null>(null)

	const all = entries ?? []
	const visible = filterEntries(all, search)

	return (
		<main class={styles.main}>
			<header class={styles.header}>
				<img class={styles.icon} src="/icon/32.png" alt="" />
				<h1 class={styles.heading}>Tab Renamer</h1>
			</header>
			<p class={styles.intro}>
				{'Exact renames match one URL (query parameters included, #hash ignored). Prefix rules such as '}
				<code>github.com/user/repo/*</code> match every page under that path. An exact rename wins over a prefix
				rule, and a longer prefix over a shorter one. Everything is stored only on this computer.
			</p>

			<Card title="Add a rename">
				<AddForm entries={all} onStatus={setStatus} />
			</Card>

			<Card title="Renames" actions={<RenameActions count={all.length} onStatus={setStatus} />}>
				<div class={styles.search}>
					<TextInput
						id="search"
						type="search"
						placeholder="Search URL or title…"
						aria-label="Search renames"
						value={search}
						onInput={(event) => setSearch(event.currentTarget.value)}
					/>
				</div>

				{/* Always in the DOM so screen readers announce changes to it. */}
				<p id="status" class={styles.status} role="status" hidden={status == null}>
					{status}
				</p>

				{visible.length > 0 && <EntriesTable entries={visible} all={all} onStatus={setStatus} />}
				{entries != null && visible.length === 0 && (
					<p id="empty" class={styles.empty}>
						{all.length === 0 ? 'No renamed tabs yet.' : 'No matches.'}
					</p>
				)}
			</Card>
		</main>
	)
}
