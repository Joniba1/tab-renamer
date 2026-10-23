/**
 * Pure helpers shared by every entrypoint. Must stay dependency-free: it is
 * bundled into the document_start content script, where every byte of parse
 * time delays the storage lookup.
 */

/** Storage key prefix for exact-URL renames: `t:<normalized url>`. */
export const KEY_PREFIX = 't:'
/** Storage key prefix for prefix rules: `p:<host><path>` (scheme-less). */
export const PREFIX_RULE_KEY = 'p:'
export const MAX_TITLE_LENGTH = 256

/** Pages the content scripts are registered on. */
export const CONTENT_MATCHES = ['http://*/*', 'https://*/*', 'file:///*']

const SUPPORTED_PROTOCOLS = new Set(['http:', 'https:', 'file:'])

/** CustomEvent names used to talk between the ISOLATED and MAIN worlds. */
export const EVT_LOCK = 'tab-renamer:lock'
export const EVT_UNLOCK = 'tab-renamer:unlock'
export const EVT_READY = 'tab-renamer:ready'

/** Marks the <title> element owned by the extension. */
export const TITLE_ATTR = 'data-tab-renamer'

/** Rename of one exact URL. */
export interface Mapping {
	url: string
	title: string
	updatedAt: number
}

/** Rename of every page under `<prefix>/*`, e.g. prefix `github.com/user/repo`. */
export interface PrefixRule {
	prefix: string
	title: string
	updatedAt: number
}

/** The rename that applies to a page, and where it came from. */
export interface Resolved {
	kind: 'exact' | 'prefix'
	key: string
	title: string
	/** Human-readable form: the URL, or `host/path/*`. */
	pattern: string
}

export type ContentMessage = { type: 'ping' } | { type: 'urlChanged' }

/**
 * Canonical form of a URL used as the mapping key: scheme/host/port are
 * normalized by the URL parser, path and query are kept exactly, and the
 * #fragment is dropped. Returns null for URLs the extension can't act on.
 */
export const normalizeUrl = (href: string): string | null => {
	let url: URL
	try {
		url = new URL(href)
	} catch {
		return null
	}
	if (!SUPPORTED_PROTOCOLS.has(url.protocol)) return null
	url.hash = ''
	return url.href
}

export const storageKey = (href: string): string | null => {
	const normalized = normalizeUrl(href)
	return normalized == null ? null : KEY_PREFIX + normalized
}

/**
 * Parses a user-entered prefix pattern such as `github.com/user/repo/*`
 * (scheme optional, trailing `/*` optional) into its canonical form
 * `github.com/user/repo`. Returns null for invalid input, including `*`
 * anywhere but the end, or a query/hash.
 */
export const normalizePrefix = (pattern: string): string | null => {
	let rest = pattern.trim().replace(/^https?:\/\//i, '')
	if (rest.endsWith('*')) rest = rest.slice(0, -1)
	if (rest === '' || /[*?#\s]/.test(rest)) return null
	let url: URL
	try {
		url = new URL(`https://${rest}`)
	} catch {
		return null
	}
	if (url.hostname === '' || url.username !== '' || url.password !== '') return null
	return url.host + url.pathname.replace(/\/+$/, '')
}

export const formatPrefix = (prefix: string): string => {
	return `${prefix}/*`
}

/** The suggested prefix pattern for a page: `https://github.com/a/b/?x=1` → `github.com/a/b/*`. */
export const defaultPattern = (href: string): string => {
	const url = new URL(href)
	return formatPrefix(url.host + url.pathname.replace(/\/+$/, ''))
}

/**
 * Parses a user-typed exact URL, accepting `example.com/page` as shorthand for
 * `https://example.com/page`. Returns the normalized URL, or null.
 */
export const parseExactUrl = (raw: string): string | null => {
	const value = raw.trim()
	const hasScheme = /^[a-z][\w+.-]*:\/\//i.test(value)
	return normalizeUrl(value) ?? (hasScheme ? null : normalizeUrl(`https://${value}`))
}

/**
 * Every prefix-rule key that could match the URL, longest first: for
 * `https://github.com/a/b?x` → `p:github.com/a/b`, `p:github.com/a`,
 * `p:github.com`. Prefix rules only apply to http(s) pages.
 */
export const prefixKeys = (href: string): string[] => {
	let url: URL
	try {
		url = new URL(href)
	} catch {
		return []
	}
	if (url.protocol !== 'http:' && url.protocol !== 'https:') return []
	let path = url.host
	const keys = [PREFIX_RULE_KEY + path]
	for (const segment of url.pathname.split('/')) {
		if (segment === '') continue
		path += `/${segment}`
		keys.push(PREFIX_RULE_KEY + path)
	}
	return keys.reverse()
}

/**
 * All storage keys that can supply this page's title, in precedence order:
 * the exact URL first, then prefix rules from longest to shortest. Fetching
 * them is a single storage call, however many rules exist.
 */
export const lookupKeys = (href: string): string[] => {
	const exact = storageKey(href)
	return exact == null ? [] : [exact, ...prefixKeys(href)]
}

/** Picks the winning rename from the values fetched for `lookupKeys`. */
export const resolveTitle = (keys: string[], items: Record<string, unknown>): Resolved | null => {
	for (const key of keys) {
		const value = items[key]
		if (key.startsWith(KEY_PREFIX) && isMapping(value)) {
			return { kind: 'exact', key, title: value.title, pattern: value.url }
		}
		if (key.startsWith(PREFIX_RULE_KEY) && isPrefixRule(value)) {
			return { kind: 'prefix', key, title: value.title, pattern: formatPrefix(value.prefix) }
		}
	}
	return null
}

/**
 * True for pages where Chrome doesn't let extensions run content scripts:
 * browser-internal schemes, other extensions, and the Chrome Web Store.
 * An undefined URL (no host permission for the tab) counts as restricted.
 */
export const isRestrictedUrl = (href: string | undefined): boolean => {
	if (!href) return true
	let url: URL
	try {
		url = new URL(href)
	} catch {
		return true
	}
	if (!SUPPORTED_PROTOCOLS.has(url.protocol)) return true
	if (url.hostname === 'chromewebstore.google.com') return true
	if (url.hostname === 'chrome.google.com' && url.pathname.startsWith('/webstore')) return true
	return false
}

/** Trims and caps a user-entered title; returns null when nothing is left. */
export const sanitizeTitle = (title: string): string | null => {
	const trimmed = title.replace(/\s+/g, ' ').trim().slice(0, MAX_TITLE_LENGTH).trim()
	return trimmed.length > 0 ? trimmed : null
}

export const isMapping = (value: unknown): value is Mapping => {
	if (typeof value !== 'object' || value == null) return false
	const v = value as Record<string, unknown>
	return typeof v.url === 'string' && typeof v.title === 'string' && typeof v.updatedAt === 'number'
}

export const isPrefixRule = (value: unknown): value is PrefixRule => {
	if (typeof value !== 'object' || value == null) return false
	const v = value as Record<string, unknown>
	return typeof v.prefix === 'string' && typeof v.title === 'string' && typeof v.updatedAt === 'number'
}
