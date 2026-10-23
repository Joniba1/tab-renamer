import type { ComponentChildren } from 'preact'
import styles from './ActionLink.module.scss'

interface Props {
	id?: string
	onActivate: () => void
	children: ComponentChildren
}

/** A link that runs an action instead of navigating. */
export const ActionLink = ({ id, onActivate, children }: Props) => {
	return (
		<a
			href="#"
			id={id}
			class={styles.link}
			onClick={(event) => {
				event.preventDefault()
				onActivate()
			}}
		>
			{children}
		</a>
	)
}
