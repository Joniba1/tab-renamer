import type { ComponentChildren } from 'preact'
import styles from './Notice.module.scss'

interface Props {
	id?: string
	children: ComponentChildren
}

export const Notice = ({ id, children }: Props) => {
	return (
		<p class={styles.notice} id={id}>
			{children}
		</p>
	)
}
