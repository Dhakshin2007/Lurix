import { createRoot } from 'react-dom/client'
import App from './App'
import { applyTheme } from './applyTheme'
import { getSettings } from '@/shared/storage'
import { augmentContestDashboard } from './contestDashboard'
import './styles.css'
import dockCss from './dock.css?inline'

async function bootstrap() {
  // Apply theme as early as possible to avoid a flash of
  // unstyled/default Codeforces UI.
  const settings = await getSettings()
  applyTheme(settings.themeId)


  // Mount the floating dock inside its own shadow root so none of our CSS
  // leaks onto the page and none of Codeforces' CSS leaks onto us.
  const host = document.createElement('div')
  host.id = 'cfp-dock-host'
  document.documentElement.appendChild(host)

  const shadow = host.attachShadow({ mode: 'open' })
  const styleTag = document.createElement('style')
  styleTag.textContent = dockCss
  shadow.appendChild(styleTag)

  // Create workspace root in the main DOM (not shadow DOM) for the split layout
  const wsRoot = document.createElement('div')
  wsRoot.id = 'cfp-workspace-root'
  document.body.appendChild(wsRoot)

  const mountPoint = document.createElement('div')
  shadow.appendChild(mountPoint)

  createRoot(mountPoint).render(<App />)

  // Run the contest page redesign asynchronously
  augmentContestDashboard()
}

bootstrap()
