import type { ComponentChildren } from 'preact'
import type { Scope } from '../types'
import styles from './ScopeOption.module.scss'

interface Props {
	value: Scope
	checked: boolean
	onSelect: (scope: Scope) => void
	id?: string
	children: ComponentChildren
}

/** One radio choice of what the rename applies to, with its description. */
export const ScopeOption = ({ value, checked, onSelect, id, children }: Props) => {
	return (
		<label class={styles.option} id={id}>
			<input type="radio" name="scope" value={value} checked={checked} onChange={() => onSelect(value)} />
			<span>{children}</span>
		</label>
	)
}
