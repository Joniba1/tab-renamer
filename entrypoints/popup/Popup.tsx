import { useState } from 'preact/hooks'
import { Notice } from './components/Notice'
import { PopupFooter } from './components/PopupFooter'
import { RenameForm } from './components/RenameForm'
import styles from './Popup.module.scss'
import { closePopup } from './services/navigation'
import type { Page } from './types'

const RESTRICTED_NOTICE =
	"Chrome doesn't allow extensions to rename this page " +
	'(browser pages, the Chrome Web Store, and local files unless file access is enabled).'

const UNREACHABLE_NOTICE =
	'Couldn\'t reach this page. For local files, enable "Allow access to file URLs" ' +
	'for Tab Renamer in chrome://extensions.'

interface Props {
	page: Page | null
}

/** Composes the popup: the rename form, or a notice explaining why renaming isn't possible. */
export const Popup = ({ page }: Props) => {
	const [unreachable, setUnreachable] = useState(false)

	let notice: string | null = null
	if (page == null) notice = RESTRICTED_NOTICE
	else if (unreachable) notice = UNREACHABLE_NOTICE

	return (
		<main class={styles.main}>
			<h1 class={styles.heading}>Rename tab</h1>

			{page != null && <RenameForm page={page} onDone={closePopup} onUnreachable={() => setUnreachable(true)} />}
			{notice != null && <Notice id="notice">{notice}</Notice>}

			<PopupFooter />
		</main>
	)
}
