import { useEffect, useRef, useState } from 'preact/hooks'
import { Button } from '../../../components/Button'
import { Select } from '../../../components/Select'
import { TextInput } from '../../../components/TextInput'
import { MAX_TITLE_LENGTH } from '../../../lib/core'
import type { Entry } from '../../../lib/storage'
import {
	KIND_LABELS,
	PLACEHOLDERS,
	convertPattern,
	parseRule,
	replaceRule,
	type Kind,
	type RuleDraft,
} from '../services/rules'
import styles from './RuleRow.module.scss'

const EMPTY_DRAFT: RuleDraft = { title: '', kind: 'exact', pattern: '' }

interface Props {
	entry?: Entry
	all: Entry[]
	onDone: (message?: string) => void
}

/** A table row that adds a rename, or edits one in place. Enter saves, Escape cancels. */
export const RuleRow = ({ entry, all, onDone }: Props) => {
	const [draft, setDraft] = useState<RuleDraft>(
		entry == null ? EMPTY_DRAFT : { title: entry.title, kind: entry.kind, pattern: entry.pattern }
	)
	const [error, setError] = useState<string | null>(null)
	const titleInput = useRef<HTMLInputElement>(null)
	const patternInput = useRef<HTMLInputElement>(null)

	useEffect(() => {
		titleInput.current?.select()
	}, [])

	const update = (changes: Partial<RuleDraft>): void => {
		setDraft({ ...draft, ...changes })
		setError(null)
	}

	const changePattern = (pattern: string): void => {
		// A trailing `*` is a clear sign a prefix rule is meant.
		const kind = pattern.trim().endsWith('*') ? 'prefix' : draft.kind
		update({ pattern, kind })
	}

	const fail = (message: string, field: 'title' | 'pattern'): void => {
		setError(message)
		const input = field === 'title' ? titleInput : patternInput
		input.current?.focus()
	}

	const submit = async (event: Event): Promise<void> => {
		event.preventDefault()
		const result = parseRule(draft)
		if (!result.ok) return fail(result.error, result.field)

		const { rule } = result
		if (rule.key !== entry?.key && all.some((e) => e.key === rule.key)) {
			return fail('Another rename already applies to this address.', 'pattern')
		}
		if (entry == null) {
			await rule.save()
			onDone(`Added rename for ${rule.label}`)
		} else {
			await replaceRule(entry.key, rule)
			onDone(`Updated rename for ${rule.label}`)
		}
	}

	const cancelOnEscape = (event: KeyboardEvent): void => {
		if (event.key === 'Escape' && !event.defaultPrevented) onDone()
	}

	return (
		<tr class={styles.row}>
			<td colSpan={4}>
				<form class={styles.form} onSubmit={(event) => void submit(event)} onKeyDown={cancelOnEscape}>
					<TextInput
						ref={titleInput}
						class={styles.title}
						aria-label="Custom title"
						placeholder="Custom title"
						maxLength={MAX_TITLE_LENGTH}
						value={draft.title}
						onInput={(event) => update({ title: event.currentTarget.value })}
					/>
					<Select
						aria-label="Applies to"
						value={draft.kind}
						onChange={(event) => {
							const kind = event.currentTarget.value as Kind
							update({ kind, pattern: convertPattern(draft.pattern, kind) })
						}}
					>
						<option value="exact">{KIND_LABELS.exact}</option>
						<option value="prefix">{KIND_LABELS.prefix}</option>
					</Select>
					<TextInput
						ref={patternInput}
						variant="code"
						aria-label={draft.kind === 'prefix' ? 'URL prefix' : 'URL'}
						placeholder={PLACEHOLDERS[draft.kind]}
						value={draft.pattern}
						onInput={(event) => changePattern(event.currentTarget.value)}
					/>
					{error != null && (
						<p class={styles.error} role="alert">
							{error}
						</p>
					)}
					<div class={styles.buttons}>
						<Button type="button" size="small" onClick={() => onDone()}>
							Cancel
						</Button>
						<Button type="submit" variant="action" size="small">
							{entry == null ? 'Add' : 'Save'}
						</Button>
					</div>
				</form>
			</td>
		</tr>
	)
}
