import { openManagePage, openShortcutsPage } from '../services/navigation'
import { ActionLink } from '../../../components/ActionLink'
import styles from './PopupFooter.module.scss'

export const PopupFooter = () => {
	return (
		<footer class={styles.footer}>
			<ActionLink id="shortcuts" onActivate={openShortcutsPage}>
				Keyboard shortcuts
			</ActionLink>

			<ActionLink id="manage" onActivate={openManagePage}>
				Manage all renames
			</ActionLink>
		</footer>
	)
}
