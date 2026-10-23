import { browser } from 'wxt/browser'
import {
	KEY_PREFIX,
	PREFIX_RULE_KEY,
	formatPrefix,
	isMapping,
	isPrefixRule,
	lookupKeys,
	normalizePrefix,
	normalizeUrl,
	resolveTitle,
	sanitizeTitle,
	storageKey,
	type Mapping,
	type PrefixRule,
	type Resolved,
} from './core'

export const EXPORT_VERSION = 2

export interface ExportFile {
	version: number
	exportedAt: string
	mappings: Mapping[]
	/** Added in version 2. */
	prefixRules?: PrefixRule[]
}

export interface ImportResult {
	added: number
	updated: number
	skipped: number
}

/** A stored rename of either kind, for listing in the UI. */
export interface Entry {
	key: string
	kind: 'exact' | 'prefix'
	pattern: string
	title: string
	updatedAt: number
}

export const isOwnKey = (key: string): boolean => {
	return key.startsWith(KEY_PREFIX) || key.startsWith(PREFIX_RULE_KEY)
}

export const getMapping = async (href: string): Promise<Mapping | null> => {
	const key = storageKey(href)
	if (key == null) return null
	const result = await browser.storage.local.get(key)
	const value = result[key]
	return isMapping(value) ? value : null
}

/** The rename currently in effect for a URL: exact first, then longest prefix. */
export const resolveForUrl = async (href: string): Promise<Resolved | null> => {
	const keys = lookupKeys(href)
	if (keys.length === 0) return null
	return resolveTitle(keys, await browser.storage.local.get(keys))
}

/**
 * Saves a custom title for the URL. An empty (after sanitizing) title removes
 * the mapping instead. Returns the stored mapping, or null if none remains.
 */
export const setMapping = async (href: string, title: string): Promise<Mapping | null> => {
	const url = normalizeUrl(href)
	if (url == null) throw new Error(`Unsupported URL: ${href}`)
	const clean = sanitizeTitle(title)
	if (clean == null) {
		await removeMapping(url)
		return null
	}
	const mapping: Mapping = { url, title: clean, updatedAt: Date.now() }
	await browser.storage.local.set({ [KEY_PREFIX + url]: mapping })
	return mapping
}

/**
 * Saves a title for every page under a prefix pattern such as
 * `github.com/user/repo/*`. An empty title removes the rule.
 */
export const setPrefixRule = async (pattern: string, title: string): Promise<PrefixRule | null> => {
	const prefix = normalizePrefix(pattern)
	if (prefix == null) throw new Error(`Invalid pattern: ${pattern}`)
	const key = PREFIX_RULE_KEY + prefix
	const clean = sanitizeTitle(title)
	if (clean == null) {
		await browser.storage.local.remove(key)
		return null
	}
	const rule: PrefixRule = { prefix, title: clean, updatedAt: Date.now() }
	await browser.storage.local.set({ [key]: rule })
	return rule
}

export const removeMapping = async (href: string): Promise<void> => {
	const key = storageKey(href)
	if (key != null) await browser.storage.local.remove(key)
}

export const removeKey = async (key: string): Promise<void> => {
	if (isOwnKey(key)) await browser.storage.local.remove(key)
}

/** Removes whichever rename gives this URL its title (exact or prefix rule). */
export const removeEffective = async (href: string): Promise<Resolved | null> => {
	const resolved = await resolveForUrl(href)
	if (resolved != null) await browser.storage.local.remove(resolved.key)
	return resolved
}

export const listMappings = async (): Promise<Mapping[]> => {
	const all = await browser.storage.local.get(null)
	return Object.entries(all)
		.filter(([key, value]) => key.startsWith(KEY_PREFIX) && isMapping(value))
		.map(([, value]) => value as Mapping)
		.sort((a, b) => b.updatedAt - a.updatedAt)
}

export const listPrefixRules = async (): Promise<PrefixRule[]> => {
	const all = await browser.storage.local.get(null)
	return Object.entries(all)
		.filter(([key, value]) => key.startsWith(PREFIX_RULE_KEY) && isPrefixRule(value))
		.map(([, value]) => value as PrefixRule)
		.sort((a, b) => b.updatedAt - a.updatedAt)
}

/** Every stored rename, newest first. */
export const listEntries = async (): Promise<Entry[]> => {
	const all = await browser.storage.local.get(null)
	const entries: Entry[] = []
	for (const [key, value] of Object.entries(all)) {
		if (key.startsWith(KEY_PREFIX) && isMapping(value)) {
			entries.push({
				key,
				kind: 'exact',
				pattern: value.url,
				title: value.title,
				updatedAt: value.updatedAt,
			})
		} else if (key.startsWith(PREFIX_RULE_KEY) && isPrefixRule(value)) {
			entries.push({
				key,
				kind: 'prefix',
				pattern: formatPrefix(value.prefix),
				title: value.title,
				updatedAt: value.updatedAt,
			})
		}
	}
	return entries.sort((a, b) => b.updatedAt - a.updatedAt)
}

export const clearMappings = async (): Promise<void> => {
	const all = await browser.storage.local.get(null)
	const keys = Object.keys(all).filter(isOwnKey)
	if (keys.length > 0) await browser.storage.local.remove(keys)
}

export const exportMappings = async (): Promise<ExportFile> => {
	return {
		version: EXPORT_VERSION,
		exportedAt: new Date().toISOString(),
		mappings: await listMappings(),
		prefixRules: await listPrefixRules(),
	}
}

/**
 * Merges an export file (version 1 or 2) into storage. An incoming entry wins
 * only when it is newer than the stored one; invalid entries are skipped.
 */
export const importMappings = async (data: unknown): Promise<ImportResult> => {
	if (typeof data !== 'object' || data == null || !Array.isArray((data as ExportFile).mappings)) {
		throw new Error('Not a Tab Renamer export file.')
	}
	const file = data as ExportFile
	const result: ImportResult = { added: 0, updated: 0, skipped: 0 }
	const existing = await browser.storage.local.get(null)
	const updates: Record<string, Mapping | PrefixRule> = {}

	const merge = (key: string, entry: Mapping | PrefixRule): void => {
		const current = existing[key] as { updatedAt?: unknown } | undefined
		const currentTime = typeof current?.updatedAt === 'number' ? current.updatedAt : null
		if (currentTime != null && currentTime >= entry.updatedAt) {
			result.skipped++
			return
		}
		updates[key] = entry
		if (currentTime != null) result.updated++
		else result.added++
	}

	for (const entry of file.mappings) {
		const url = isMapping(entry) ? normalizeUrl(entry.url) : null
		const title = isMapping(entry) ? sanitizeTitle(entry.title) : null
		if (url == null || title == null) result.skipped++
		else merge(KEY_PREFIX + url, { url, title, updatedAt: entry.updatedAt })
	}

	for (const entry of Array.isArray(file.prefixRules) ? file.prefixRules : []) {
		const prefix = isPrefixRule(entry) ? normalizePrefix(entry.prefix) : null
		const title = isPrefixRule(entry) ? sanitizeTitle(entry.title) : null
		if (prefix == null || title == null) result.skipped++
		else
			merge(PREFIX_RULE_KEY + prefix, {
				prefix,
				title,
				updatedAt: entry.updatedAt,
			})
	}

	if (Object.keys(updates).length > 0) await browser.storage.local.set(updates)
	return result
}
