import type { ComponentChildren } from 'preact'
import { useRef } from 'preact/hooks'
import { Button, type Variant } from './Button'

interface Props {
	id?: string
	variant?: Variant
	size?: 'default' | 'small'
	/** File types the picker offers, as in `<input accept>`. */
	accept: string
	onFile: (file: File) => void
	children: ComponentChildren
}

/** A button that opens a file picker and reports the chosen file. */
export const FileButton = ({ id, variant, size, accept, onFile, children }: Props) => {
	const input = useRef<HTMLInputElement>(null)

	return (
		<>
			<Button type="button" id={id} variant={variant} size={size} onClick={() => input.current?.click()}>
				{children}
			</Button>
			<input
				ref={input}
				type="file"
				accept={accept}
				hidden
				onChange={(event) => {
					const file = event.currentTarget.files?.[0]
					// Reset, so choosing the same file again still fires a change.
					event.currentTarget.value = ''
					if (file != null) onFile(file)
				}}
			/>
		</>
	)
}
