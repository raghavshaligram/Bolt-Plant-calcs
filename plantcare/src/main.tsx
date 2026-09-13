import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './app/ui/theme.css'
import { App } from './app/ui/App.tsx'
import { DEMO_LOCK } from './app/demo-lock.ts'
import { setupPWA } from './app/pwa.ts'

/*
 * Does nothing in the downloaded copy — see src/app/pwa.ts.
 *
 * And nothing in the demo either: the demo must not be installable to a home
 * screen, because an icon that looks like the app and cannot keep anything is a
 * worse first impression than no icon. A service worker there would also cache
 * the demo under the site's own origin for no benefit to anybody.
 */
if (!DEMO_LOCK) setupPWA()

const root = document.getElementById('root')
if (!root) throw new Error('no #root in the document')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
)
