import type { ComponentChildren } from 'preact'
import { cx } from '../lib/cx'
import styles from './Field.module.scss'

interface Props {
	label: string
	/** Extra class for layout set by the parent, such as grid placement. */
	class?: string
	children: ComponentChildren
}

/** A form control with a small label above it. */
export const Field = ({ label, class: className, children }: Props) => {
	return (
		<label class={cx(styles.field, className)}>
			<span class={styles.label}>{label}</span>
			{children}
		</label>
	)
}
