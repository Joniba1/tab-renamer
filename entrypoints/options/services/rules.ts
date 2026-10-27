import {
	KEY_PREFIX,
	PREFIX_RULE_KEY,
	defaultPattern,
	formatPrefix,
	isRestrictedUrl,
	normalizePrefix,
	parseExactUrl,
	prefixKeys,
	sanitizeTitle,
} from '../../../lib/core'
import { removeKey, setMapping, setPrefixRule } from '../../../lib/storage'

export type Kind = 'exact' | 'prefix'

export const KIND_LABELS: Record<Kind, string> = {
	exact: 'This exact URL',
	prefix: 'All pages under',
}

export const PLACEHOLDERS: Record<Kind, string> = {
	exact: 'https://example.com/page?id=1',
	prefix: 'github.com/user/repo/*',
}

/** A rename as typed into the add form or an edit row. */
export interface RuleDraft {
	title: string
	kind: Kind
	pattern: string
}

/** A valid draft: its storage key, the address as shown to the user, and how to store it. */
export interface Rule {
	key: string
	label: string
	save: () => Promise<unknown>
}

export type ParseResult = { ok: true; rule: Rule } | { ok: false; error: string; field: 'title' | 'pattern' }

/** Validates a draft. Pure: nothing is stored until `rule.save()` runs. */
export const parseRule = ({ title, kind, pattern }: RuleDraft): ParseResult => {
	if (sanitizeTitle(title) == null) return { ok: false, error: 'Enter a title.', field: 'title' }

	if (kind === 'prefix') {
		const prefix = normalizePrefix(pattern)
		if (prefix == null) return { ok: false, error: 'Enter a pattern like github.com/user/repo/*', field: 'pattern' }
		const rule = {
			key: PREFIX_RULE_KEY + prefix,
			label: formatPrefix(prefix),
			save: () => setPrefixRule(prefix, title),
		}
		return { ok: true, rule }
	}

	const url = parseExactUrl(pattern)
	if (url == null) return { ok: false, error: 'Enter an http(s) or file:// URL.', field: 'pattern' }
	if (isRestrictedUrl(url)) {
		return {
			ok: false,
			error: "Chrome doesn't allow extensions to rename Chrome Web Store pages.",
			field: 'pattern',
		}
	}
	return { ok: true, rule: { key: KEY_PREFIX + url, label: url, save: () => setMapping(url, title) } }
}

/** Stores an edited rename. When its address or kind changed, the old one is removed once the new one is saved. */
export const replaceRule = async (oldKey: string, rule: Rule): Promise<void> => {
	await rule.save()
	if (rule.key !== oldKey) await removeKey(oldKey)
}

/**
 * Rewrites an address for the other kind, so switching kinds keeps it:
 * `https://github.com/a/b` ↔ `github.com/a/b/*`. Anything it can't convert is returned as is.
 */
export const convertPattern = (pattern: string, to: Kind): string => {
	if (to === 'prefix') {
		const url = parseExactUrl(pattern)
		return url != null && prefixKeys(url).length > 0 ? defaultPattern(url) : pattern
	}
	const prefix = normalizePrefix(pattern)
	return prefix == null ? pattern : `https://${prefix}`
}
