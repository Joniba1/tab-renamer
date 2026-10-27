import { useState } from 'preact/hooks'
import { removeKey, type Entry } from '../../../lib/storage'
import styles from './EntriesTable.module.scss'
import { IconButton } from '../../../components/IconButton'
import { EditRow } from './EditRow'

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

interface Props {
	/** The renames to show (possibly filtered by the search). */
	entries: Entry[]
	/** Every rename, so an edit can't take an address another rename already has. */
	all: Entry[]
	onStatus: (message: string) => void
}

export const EntriesTable = ({ entries, all, onStatus }: Props) => {
	// One row is edited at a time.
	const [editing, setEditing] = useState<string | null>(null)

	const finishEditing = (message?: string): void => {
		setEditing(null)
		if (message != null) onStatus(message)
	}

	return (
		<table class={styles.table}>
			<colgroup>
				<col />
				<col class={styles.appliesCol} />
				<col class={styles.updatedCol} />
				<col class={styles.actionCol} />
			</colgroup>
			<thead>
				<tr>
					<th>Title</th>
					<th>Applies to</th>
					<th>Updated</th>
					<th>
						<span class={styles.visuallyHidden}>Actions</span>
					</th>
				</tr>
			</thead>
			<tbody id="rows">
				{entries.map((entry) =>
					entry.key === editing ? (
						<EditRow key={entry.key} entry={entry} all={all} onDone={finishEditing} />
					) : (
						<tr key={entry.key}>
							<td class={styles.title}>{entry.title}</td>
							<td class={styles.url}>
								{entry.kind === 'exact' ? (
									<a href={entry.pattern} target="_blank" rel="noreferrer">
										{entry.pattern}
									</a>
								) : (
									<>
										<span class={styles.badge} title="Applies to every page under this path">
											prefix
										</span>
										{` ${entry.pattern}`}
									</>
								)}
							</td>
							<td class={styles.updated}>{dateFormat.format(entry.updatedAt)}</td>
							<td>
								<div class={styles.actions}>
									<IconButton
										icon="edit"
										label={`Edit ${entry.title}`}
										onClick={() => setEditing(entry.key)}
									/>
									<IconButton
										icon="close"
										label={`Remove ${entry.title}`}
										onClick={() => void removeKey(entry.key)}
									/>
								</div>
							</td>
						</tr>
					)
				)}
			</tbody>
		</table>
	)
}
