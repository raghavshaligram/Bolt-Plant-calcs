import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './app/ui/theme.css'
import { App } from './app/ui/App.tsx'
import { setupPWA } from './app/pwa.ts'

/* Does nothing in the downloaded copy — see src/app/pwa.ts. */
setupPWA()

const root = document.getElementById('root')
if (!root) throw new Error('no #root in the document')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
)
