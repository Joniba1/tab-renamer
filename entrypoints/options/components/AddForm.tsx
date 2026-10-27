import { useRef, useState } from 'preact/hooks'
import { MAX_TITLE_LENGTH } from '../../../lib/core'
import { Button } from '../../../components/Button'
import { Field } from '../../../components/Field'
import { Select } from '../../../components/Select'
import { TextInput } from '../../../components/TextInput'
import type { Entry } from '../../../lib/storage'
import { KIND_LABELS, PLACEHOLDERS, parseRule, type Kind } from '../services/rules'
import styles from './AddForm.module.scss'

interface Props {
	/** Current renames, to tell "Added" from "Updated". */
	entries: Entry[]
	onStatus: (message: string) => void
}

export const AddForm = ({ entries, onStatus }: Props) => {
	const [title, setTitle] = useState('')
	const [kind, setKind] = useState<Kind>('exact')
	const [pattern, setPattern] = useState('')
	const [error, setError] = useState<string | null>(null)
	const titleInput = useRef<HTMLInputElement>(null)
	const patternInput = useRef<HTMLInputElement>(null)

	const changeKind = (next: Kind): void => {
		setKind(next)
		setError(null)
	}

	const changePattern = (value: string): void => {
		setPattern(value)
		// A trailing `*` is a clear sign a prefix rule is meant.
		if (value.trim().endsWith('*') && kind !== 'prefix') changeKind('prefix')
	}

	const submit = async (event: Event): Promise<void> => {
		event.preventDefault()
		setError(null)

		const result = parseRule({ title, kind, pattern })
		if (!result.ok) {
			setError(result.error)
			const field = result.field === 'title' ? titleInput : patternInput
			field.current?.focus()
			return
		}

		const { rule } = result
		const existed = entries.some((e) => e.key === rule.key)
		await rule.save()
		onStatus(`${existed ? 'Updated' : 'Added'} rename for ${rule.label}`)
		setTitle('')
		setKind('exact')
		setPattern('')
		titleInput.current?.focus()
	}

	return (
		<form id="add" class={styles.form} onSubmit={(event) => void submit(event)}>
			<div class={styles.grid}>
				<Field label="Custom title">
					<TextInput
						id="add-title"
						ref={titleInput}
						maxLength={MAX_TITLE_LENGTH}
						placeholder="My project"
						required
						value={title}
						onInput={(event) => setTitle(event.currentTarget.value)}
					/>
				</Field>
				<Field label="Applies to">
					<Select
						id="add-kind"
						value={kind}
						onChange={(event) => changeKind(event.currentTarget.value as Kind)}
					>
						<option value="exact">{KIND_LABELS.exact}</option>
						<option value="prefix">{KIND_LABELS.prefix}</option>
					</Select>
				</Field>
				<Field label={kind === 'prefix' ? 'URL prefix' : 'URL'}>
					<TextInput
						id="add-pattern"
						variant="code"
						ref={patternInput}
						placeholder={PLACEHOLDERS[kind]}
						required
						value={pattern}
						onInput={(event) => changePattern(event.currentTarget.value)}
					/>
				</Field>
				<Button type="submit" variant="action" class={styles.submit}>
					Add
				</Button>
			</div>
			{error != null && (
				<p id="add-error" class={styles.error} role="alert">
					{error}
				</p>
			)}
		</form>
	)
}
