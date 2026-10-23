import { render } from 'preact'
import './global.scss'
import { Popup } from './Popup'
import { loadActivePage } from './services/activePage'

// The popup needs the tab once, before it can show anything useful, so load it before the first render.
const page = await loadActivePage()
render(<Popup page={page} />, document.getElementById('app')!)
