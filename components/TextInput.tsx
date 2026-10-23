import type { PartialInputHTMLAttributes, Ref } from 'preact'
import { cx } from '../lib/cx'
import styles from './TextInput.module.scss'

type Props = Omit<PartialInputHTMLAttributes<HTMLInputElement>, 'class' | 'role' | 'type'> & {
	ref?: Ref<HTMLInputElement>
	type?: 'text' | 'search'
	/** `code`: smaller and monospaced, for URLs and patterns. */
	variant?: 'default' | 'code'
	/** Extra class for layout set by the parent, such as margins. */
	class?: string
}

/** A filled single-line field, without autocomplete or spellcheck. */
export const TextInput = ({ type = 'text', variant = 'default', class: className, ...props }: Props) => {
	const attributes = {
		autocomplete: 'off',
		spellcheck: false,
		...props,
		class: cx(styles.input, variant === 'code' && styles.code, className),
	}

	// A literal `type` per branch: Preact types <input> as a union keyed on it.
	return type === 'search' ? <input type="search" {...attributes} /> : <input type="text" {...attributes} />
}
