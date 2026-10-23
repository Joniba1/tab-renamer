import { useEffect, useRef } from 'preact/hooks'
import { MAX_TITLE_LENGTH } from '../../../lib/core'
import { TextInput } from '../../../components/TextInput'

interface Props {
	value: string
	onChange: (value: string) => void
}

export const TitleField = ({ value, onChange }: Props) => {
	const input = useRef<HTMLInputElement>(null)

	useEffect(() => {
		input.current?.focus()
		input.current?.select()
	}, [])

	return (
		<TextInput
			id="title"
			ref={input}
			maxLength={MAX_TITLE_LENGTH}
			aria-label="Custom tab title"
			value={value}
			onInput={(event) => onChange(event.currentTarget.value)}
		/>
	)
}
