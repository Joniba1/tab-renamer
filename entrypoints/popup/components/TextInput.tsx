import type { PartialInputHTMLAttributes, Ref } from 'preact'
import { cx } from '../../../lib/cx'
import styles from './TextInput.module.scss'

type Props = Omit<PartialInputHTMLAttributes<HTMLInputElement>, 'class' | 'role' | 'type'> & {
	ref?: Ref<HTMLInputElement>
	variant?: 'default' | 'code'
	class?: string
}

export const TextInput = ({ variant = 'default', class: className, ...props }: Props) => {
	return (
		<input
			type="text"
			autocomplete="off"
			spellcheck={false}
			{...props}
			class={cx(styles.input, variant === 'code' && styles.code, className)}
		/>
	)
}
