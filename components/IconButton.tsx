import type { ComponentProps } from 'preact'
import styles from './IconButton.module.scss'

// Material Symbols paths, on a 24×24 grid.
const ICONS = {
	close: 'M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
	edit: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
}

type Props = Omit<ComponentProps<'button'>, 'class' | 'children' | 'type'> & {
	icon: keyof typeof ICONS
	label: string
}

export const IconButton = ({ icon, label, ...props }: Props) => {
	return (
		<button type="button" {...props} class={styles.button} aria-label={label} title={label}>
			<svg viewBox="0 0 24 24" aria-hidden="true">
				<path d={ICONS[icon]} />
			</svg>
		</button>
	)
}
