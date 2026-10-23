import type { ComponentChildren } from 'preact'
import styles from './Card.module.scss'

interface Props {
	title: string
	/** Buttons shown at the right of the header. */
	actions?: ComponentChildren
	children: ComponentChildren
}

/** A titled section on a raised surface, with optional header actions. */
export const Card = ({ title, actions, children }: Props) => {
	return (
		<section class={styles.card}>
			<header class={styles.header}>
				<h2 class={styles.title}>{title}</h2>
				{actions != null && <div class={styles.actions}>{actions}</div>}
			</header>
			{children}
		</section>
	)
}
