import { removeKey, type Entry } from '../../lib/mappings'
import styles from './EntriesTable.module.scss'

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

export function EntriesTable({ entries }: { entries: Entry[] }) {
	return (
		<table class={styles.table}>
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
				{entries.map((entry) => (
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
							<button class={styles.button} onClick={() => void removeKey(entry.key)}>
								Remove
							</button>
						</td>
					</tr>
				))}
			</tbody>
		</table>
	)
}
