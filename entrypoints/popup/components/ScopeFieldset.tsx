import { normalizeUrl } from '../../../lib/core'
import type { Scope } from '../types'
import styles from './ScopeFieldset.module.scss'
import { ScopeOption } from './ScopeOption'
import { TextInput } from '../../../components/TextInput'

interface Props {
	url: string
	/** False for pages prefix rules don't apply to (file://); hides that choice. */
	supportsPrefix: boolean
	scope: Scope
	pattern: string
	onScopeChange: (scope: Scope) => void
	onPatternChange: (pattern: string) => void
}

/** Chooses between renaming this exact page and every page under a prefix. */
export const ScopeFieldset = ({ url, supportsPrefix, scope, pattern, onScopeChange, onPatternChange }: Props) => {
	return (
		<fieldset class={styles.fieldset}>
			<legend class={styles.legend}>Apply to</legend>
			<ScopeOption value="exact" checked={scope === 'exact'} onSelect={onScopeChange}>
				This page only
				<span class={styles.url} id="url" title={url}>
					{normalizeUrl(url)}
				</span>
			</ScopeOption>
			{supportsPrefix && (
				<ScopeOption value="prefix" id="prefix-option" checked={scope === 'prefix'} onSelect={onScopeChange}>
					All pages under
					<TextInput
						id="pattern"
						variant="code"
						class={styles.pattern}
						aria-label="URL prefix pattern"
						value={pattern}
						onInput={(event) => onPatternChange(event.currentTarget.value)}
						// Editing or focusing the pattern selects the prefix scope.
						onFocus={() => onScopeChange('prefix')}
					/>
				</ScopeOption>
			)}
		</fieldset>
	)
}
