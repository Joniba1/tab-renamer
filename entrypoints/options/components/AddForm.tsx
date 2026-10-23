import type { RefObject } from 'preact'
import { useRef, useState } from 'preact/hooks'
import {
	KEY_PREFIX,
	MAX_TITLE_LENGTH,
	PREFIX_RULE_KEY,
	formatPrefix,
	isRestrictedUrl,
	normalizePrefix,
	parseExactUrl,
	sanitizeTitle,
} from '../../../lib/core'
import { Button } from '../../../components/Button'
import { Field } from '../../../components/Field'
import { Select } from '../../../components/Select'
import { TextInput } from '../../../components/TextInput'
import { setMapping, setPrefixRule, type Entry } from '../../../lib/mappings'
import styles from './AddForm.module.scss'

type Kind = 'exact' | 'prefix'

const PLACEHOLDERS: Record<Kind, string> = {
	exact: 'https://example.com/page?id=1',
	prefix: 'github.com/user/repo/*',
}

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

	const fail = (message: string, field: RefObject<HTMLInputElement | null>): void => {
		setError(message)
		field.current?.focus()
	}

	const submit = async (event: Event): Promise<void> => {
		event.preventDefault()
		setError(null)

		if (sanitizeTitle(title) == null) return fail('Enter a title.', titleInput)

		let key: string
		let label: string
		let save: () => Promise<unknown>
		if (kind === 'prefix') {
			const prefix = normalizePrefix(pattern)
			if (prefix == null) return fail('Enter a pattern like github.com/user/repo/*', patternInput)
			key = PREFIX_RULE_KEY + prefix
			label = formatPrefix(prefix)
			save = () => setPrefixRule(prefix, title)
		} else {
			const url = parseExactUrl(pattern)
			if (url == null) return fail('Enter an http(s) or file:// URL.', patternInput)
			if (isRestrictedUrl(url)) {
				return fail("Chrome doesn't allow extensions to rename Chrome Web Store pages.", patternInput)
			}
			key = KEY_PREFIX + url
			label = url
			save = () => setMapping(url, title)
		}

		const existed = entries.some((e) => e.key === key)
		await save()
		onStatus(`${existed ? 'Updated' : 'Added'} rename for ${label}`)
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
						<option value="exact">This exact URL</option>
						<option value="prefix">All pages under</option>
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
