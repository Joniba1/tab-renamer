import { useState } from 'preact/hooks'
import { initialDraft, parseDraft, resetRename, saveRename } from '../services/rename'
import type { Draft, Page } from '../types'
import { Button } from '../../../components/Button'
import styles from './RenameForm.module.scss'
import { ScopeFieldset } from './ScopeFieldset'
import { TitleField } from './TitleField'

interface Props {
	page: Page
	onDone: () => void
	onUnreachable: () => void
}

export const RenameForm = ({ page, onDone, onUnreachable }: Props) => {
	const [draft, setDraft] = useState(() => initialDraft(page))
	const [error, setError] = useState<string | null>(null)
	const [saving, setSaving] = useState(false)

	const { resolved } = page

	const update = (changes: Partial<Draft>) => setDraft((current) => ({ ...current, ...changes }))

	const save = async (event: Event): Promise<void> => {
		event.preventDefault()
		const parsed = parseDraft(page, draft)
		if (!parsed.ok) return setError(parsed.error)

		setError(null)
		setSaving(true)

		const isSaved = (await saveRename(page, draft.title, parsed.target)) === 'saved'
		if (isSaved) return onDone()

		setSaving(false)
		onUnreachable()
	}

	const reset = async (): Promise<void> => {
		await resetRename(page)
		onDone()
	}

	return (
		<form id="form" onSubmit={(event) => void save(event)}>
			<TitleField value={draft.title} onChange={(title) => update({ title })} />

			<ScopeFieldset
				url={page.url}
				supportsPrefix={page.supportsPrefix}
				scope={draft.scope}
				pattern={draft.pattern}
				onScopeChange={(scope) => update({ scope })}
				onPatternChange={(pattern) => update({ pattern })}
			/>

			{resolved?.kind === 'prefix' && (
				<p class={styles.source} id="source">
					{`Title comes from the rule ${resolved.pattern}`}
				</p>
			)}
			{error != null && (
				<p class={styles.error} id="error" role="alert">
					{error}
				</p>
			)}

			<div class={styles.actions}>
				<Button type="submit" variant="action" size="small" id="save" disabled={saving}>
					Save
				</Button>
				<Button type="button" size="small" id="reset" disabled={resolved == null} onClick={() => void reset()}>
					{resolved?.kind === 'prefix' ? 'Remove rule' : 'Reset to original'}
				</Button>
			</div>
		</form>
	)
}
