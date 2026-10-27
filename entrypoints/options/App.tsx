import { useState } from 'preact/hooks'
import type { Entry } from '../../lib/storage'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { TextInput } from '../../components/TextInput'
import styles from './App.module.scss'
import { EntriesTable, NEW_RULE, readable } from './components/EntriesTable'
import { RenameActions } from './components/RenameActions'
import { useEntries } from './hooks/useEntries'

/** Entries whose title or URL/pattern contains the query, case-insensitively. */
const filterEntries = (entries: Entry[], query: string): Entry[] => {
	const needle = query.trim().toLowerCase()
	if (needle === '') return entries
	// The readable address too, so text shown in the table (such as decoded Hebrew) is findable.
	return entries.filter((e) =>
		[e.title, e.pattern, readable(e.pattern)].some((text) => text.toLowerCase().includes(needle))
	)
}

export const App = () => {
	const entries = useEntries()
	const [search, setSearch] = useState('')
	const [status, setStatus] = useState<string | null>(null)
	const [editing, setEditing] = useState<string | null>(null)

	const all = entries ?? []
	const visible = filterEntries(all, search)
	const adding = editing === NEW_RULE

	const closeRow = (message?: string): void => {
		setEditing(null)
		if (message != null) setStatus(message)
	}

	return (
		<main class={styles.main}>
			<header class={styles.header}>
				<img class={styles.icon} src="/icon/32.png" alt="" />
				<h1 class={styles.heading}>Tab Renamer</h1>
			</header>
			<p class={styles.intro}>
				{'Rename one exact URL, or every page under a path such as '}
				<code>github.com/user/repo/*</code>. Everything is stored only on this computer.
			</p>

			<Card title="Renames" actions={<RenameActions count={all.length} onStatus={setStatus} />}>
				<div class={styles.toolbar}>
					<TextInput
						id="search"
						type="search"
						class={styles.search}
						placeholder="Search URL or title…"
						aria-label="Search renames"
						value={search}
						onInput={(event) => setSearch(event.currentTarget.value)}
					/>
					<Button type="button" id="add" variant="action" onClick={() => setEditing(NEW_RULE)}>
						Add rename
					</Button>
				</div>

				<p id="status" class={styles.status} role="status" hidden={status == null}>
					{status}
				</p>

				{(visible.length > 0 || adding) && (
					<EntriesTable entries={visible} all={all} editing={editing} onEdit={setEditing} onDone={closeRow} />
				)}
				{entries != null && visible.length === 0 && !adding && (
					<p id="empty" class={styles.empty}>
						{all.length === 0 ? 'No renamed tabs yet.' : 'No matches.'}
					</p>
				)}
			</Card>
		</main>
	)
}
