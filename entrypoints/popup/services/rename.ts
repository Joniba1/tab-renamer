import { PREFIX_RULE_KEY, defaultPattern, normalizePrefix, prefixKeys } from '../../../lib/core'
import { ensureInjected } from '../../../lib/inject'
import { removeKey, removeMapping, setMapping, setPrefixRule } from '../../../lib/storage'
import type { Draft, Page } from '../types'

/** Where a validated draft gets saved. */
export type Target = { kind: 'exact' } | { kind: 'prefix'; prefix: string }

export type ParseResult = { ok: true; target: Target } | { ok: false; error: string }

/** The form's starting values: the rename in effect, else the tab's own title. */
export const initialDraft = (page: Page): Draft => {
	const { resolved } = page
	let pattern = ''
	if (page.supportsPrefix) pattern = resolved?.kind === 'prefix' ? resolved.pattern : defaultPattern(page.url)
	return {
		title: resolved?.title ?? page.tabTitle,
		scope: resolved?.kind === 'prefix' ? 'prefix' : 'exact',
		pattern,
	}
}

/** Validates the draft against the page. Pure: no storage access. */
export const parseDraft = (page: Page, draft: Draft): ParseResult => {
	if (draft.scope === 'exact') return { ok: true, target: { kind: 'exact' } }
	const prefix = normalizePrefix(draft.pattern)
	if (prefix == null) return { ok: false, error: 'Enter a pattern like github.com/user/repo/*' }
	if (!prefixKeys(page.url).includes(PREFIX_RULE_KEY + prefix)) {
		return { ok: false, error: "That pattern doesn't match this page." }
	}
	return { ok: true, target: { kind: 'prefix', prefix } }
}

/**
 * Stores the rename. Stores nothing and returns 'unreachable' when the page
 * can't run our scripts (e.g. file:// without file access, the PDF viewer),
 * because the rename could never be shown there.
 */
export const saveRename = async (page: Page, title: string, target: Target): Promise<'saved' | 'unreachable'> => {
	if (!(await ensureInjected(page.tabId))) return 'unreachable'
	if (target.kind === 'prefix') {
		await setPrefixRule(target.prefix, title)
		// An exact rename of this page would outrank the new rule here.
		if (page.resolved?.kind === 'exact') await removeMapping(page.url)
	} else {
		await setMapping(page.url, title)
	}
	return 'saved'
}

/** Removes whichever rename gives this page its title. */
export const resetRename = async (page: Page): Promise<void> => {
	if (page.resolved != null) await removeKey(page.resolved.key)
}
