import type { ComponentProps } from 'preact'
import { cx } from '../lib/cx'
import styles from './Button.module.scss'

type Variant = 'outlined' | 'action'

type Props = Omit<ComponentProps<'button'>, 'class'> & {
	/** `action`: filled, for the main action of a section. */
	variant?: Variant
	/** `small`: shorter and tighter, for compact surfaces such as the popup. */
	size?: 'default' | 'small'
	/** Extra class for layout set by the parent, such as grid placement. */
	class?: string
}

/** A pill button, outlined or filled. */
export const Button = ({ variant = 'outlined', size = 'default', class: className, ...props }: Props) => {
	return (
		<button
			{...props}
			class={cx(
				styles.button,
				variant === 'action' && styles.action,
				size === 'small' && styles.small,
				className
			)}
		/>
	)
}
