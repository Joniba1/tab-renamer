import type { ComponentProps } from 'preact'
import styles from './IconButton.module.scss'

// Material Symbols paths, on a 24×24 grid.
const ICONS = {
	close: 'M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
}

type Props = Omit<ComponentProps<'button'>, 'class' | 'children' | 'type'> & {
	icon: keyof typeof ICONS
	/** What the button does; read by screen readers and shown as a tooltip. */
	label: string
}

/** A round icon-only button, like the clear button on the shortcuts page. */
export const IconButton = ({ icon, label, ...props }: Props) => {
	return (
		<button type="button" {...props} class={styles.button} aria-label={label} title={label}>
			<svg viewBox="0 0 24 24" aria-hidden="true">
				<path d={ICONS[icon]} />
			</svg>
		</button>
	)
}
