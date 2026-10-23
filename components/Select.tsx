import type { PartialSelectHTMLAttributes } from 'preact'
import { cx } from '../lib/cx'
import styles from './Select.module.scss'

// A single-choice dropdown, so no `multiple` or `size`.
type Props = Omit<PartialSelectHTMLAttributes<HTMLSelectElement>, 'class' | 'role' | 'multiple' | 'size'> & {
	/** Extra class for layout set by the parent, such as margins. */
	class?: string
}

/** An outlined dropdown; pass `<option>`s as children. */
export const Select = ({ class: className, ...props }: Props) => {
	return <select {...props} class={cx(styles.select, className)} />
}
