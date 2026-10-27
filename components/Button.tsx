import type { ComponentProps } from 'preact'
import { cx } from '../lib/cx'
import styles from './Button.module.scss'

export type Variant = 'outlined' | 'action' | 'text'

type Props = Omit<ComponentProps<'button'>, 'class'> & {
	/** `action`: filled, for the main action of a section. `text`: borderless, for secondary actions. */
	variant?: Variant
	/** `small`: shorter and tighter, for compact surfaces such as the popup. */
	size?: 'default' | 'small'
	/** Extra class for layout set by the parent, such as grid placement. */
	class?: string
}

/** A pill button: outlined, filled, or borderless text. */
export const Button = ({ variant = 'outlined', size = 'default', class: className, ...props }: Props) => {
	return (
		<button
			{...props}
			class={cx(
				styles.button,
				variant === 'action' && styles.action,
				variant === 'text' && styles.text,
				size === 'small' && styles.small,
				className
			)}
		/>
	)
}
