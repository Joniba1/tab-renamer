import type { Resolved } from '../../lib/core'

export type Scope = 'exact' | 'prefix'

/** The active tab, once it is known to be renamable. */
export interface Page {
	tabId: number
	url: string
	/** The tab's current title, the starting value when no rename applies. */
	tabTitle: string
	/** The rename currently giving this page its title, if any. */
	resolved: Resolved | null
	/** Prefix rules only apply to http(s) pages. */
	supportsPrefix: boolean
}

export interface Draft {
	title: string
	scope: Scope
	pattern: string
}
