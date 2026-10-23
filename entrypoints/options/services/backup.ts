import { exportRenames, importRenames, type ImportResult } from '../../../lib/storage'

/** Downloads every rename as `tab-renamer-<date>.json`. */
export const downloadExport = async (): Promise<void> => {
	const data = await exportRenames()
	const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
	const link = document.createElement('a')
	link.href = URL.createObjectURL(blob)
	link.download = `tab-renamer-${new Date().toISOString().slice(0, 10)}.json`
	link.click()
	URL.revokeObjectURL(link.href)
}

/** Merges an exported file into storage. Throws when it isn't valid JSON or not an export. */
export const importFile = async (file: File): Promise<ImportResult> => {
	return importRenames(JSON.parse(await file.text()))
}
