import type { ComponentProps } from 'preact'
import { cx } from '../../../lib/cx'
import styles from './Button.module.scss'

type Props = Omit<ComponentProps<'button'>, 'class'> & {
	variant?: 'primary' | 'secondary'
}

export const Button = ({ variant = 'secondary', ...props }: Props) => {
	return <button {...props} class={cx(styles.button, variant === 'primary' && styles.primary)} />
}
