import { Button } from '../../../components/Button'
import { FileButton } from '../../../components/FileButton'
import { clearRenames } from '../../../lib/storage'
import { downloadExport, importFile } from '../services/backup'

interface Props {
	count: number
	onStatus: (message: string) => void
}

export const RenameActions = ({ count, onStatus }: Props) => {
	const importBackup = async (file: File): Promise<void> => {
		try {
			const result = await importFile(file)
			onStatus(`Imported: ${result.added} added, ${result.updated} updated, ${result.skipped} skipped.`)
		} catch (error) {
			onStatus(`Import failed: ${error instanceof Error ? error.message : String(error)}`)
		}
	}

	const clearAll = async (): Promise<void> => {
		if (count === 0) return
		if (!confirm(`Remove all ${count} custom tab titles?`)) return
		await clearRenames()
		onStatus('All custom titles removed.')
	}

	return (
		<>
			<FileButton
				id="import"
				variant="text"
				size="small"
				accept="application/json,.json"
				onFile={(file) => void importBackup(file)}
			>
				Import
			</FileButton>
			<Button type="button" id="export" variant="text" size="small" onClick={() => void downloadExport()}>
				Export
			</Button>
			<Button
				type="button"
				id="clear"
				variant="text"
				size="small"
				disabled={count === 0}
				onClick={() => void clearAll()}
			>
				Clear all
			</Button>
		</>
	)
}
