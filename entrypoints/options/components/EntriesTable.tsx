import { removeKey, type Entry } from '../../../lib/storage'
import styles from './EntriesTable.module.scss'
import { IconButton } from '../../../components/IconButton'
import { RuleRow } from './RuleRow'

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

/** An address as people read it: `%D7%93…` back to `ד…`. Display only; stored addresses stay encoded. */
export const readable = (address: string): string => {
	try {
		return decodeURI(address)
	} catch {
		return address // malformed escapes
	}
}

export const NEW_RULE = 'new'

interface Props {
	entries: Entry[]
	all: Entry[]
	editing: string | null
	onEdit: (key: string) => void
	onDone: (message?: string) => void
}

export const EntriesTable = ({ entries, all, editing, onEdit, onDone }: Props) => {
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
				{editing === NEW_RULE && <RuleRow key={NEW_RULE} all={all} onDone={onDone} />}
				{entries.map((entry) =>
					entry.key === editing ? (
						<RuleRow key={entry.key} entry={entry} all={all} onDone={onDone} />
					) : (
						<tr key={entry.key}>
							<td class={styles.title}>{entry.title}</td>
							<td class={styles.url} title={readable(entry.pattern)}>
								{entry.kind === 'exact' ? (
									<a href={entry.pattern} target="_blank" rel="noreferrer">
										{readable(entry.pattern)}
									</a>
								) : (
									<>
										<span class={styles.badge}>prefix</span>
										{` ${readable(entry.pattern)}`}
									</>
								)}
							</td>
							<td class={styles.updated}>{dateFormat.format(entry.updatedAt)}</td>
							<td>
								<div class={styles.actions}>
									<IconButton
										icon="edit"
										label={`Edit ${entry.title}`}
										onClick={() => onEdit(entry.key)}
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
