import { useEffect, useState } from 'preact/hooks'
import { browser } from 'wxt/browser'
import { isOwnKey, listEntries, type Entry } from '../../../lib/storage'

/**
 * Every stored rename, kept in sync with storage, so renames made in the
 * popup or another tab show up here live. Null until the first load.
 */
export const useEntries = (): Entry[] | null => {
	const [entries, setEntries] = useState<Entry[] | null>(null)

	useEffect(() => {
		const refresh = () => void listEntries().then(setEntries)
		const onChanged = (changes: Record<string, unknown>, area: string) => {
			if (area === 'local' && Object.keys(changes).some(isOwnKey)) refresh()
		}
		refresh()
		browser.storage.onChanged.addListener(onChanged)
		return () => browser.storage.onChanged.removeListener(onChanged)
	}, [])

	return entries
}
