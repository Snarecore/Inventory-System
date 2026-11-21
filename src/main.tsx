import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.tsx'

// Auto-recover from Vite dynamic import chunk failures during dev HMR restarts or new deploys
window.addEventListener('vite:preloadError', () => {
  const reloadKey = `vite_preload_error_${window.location.pathname}`
  if (!sessionStorage.getItem(reloadKey)) {
    try {
      sessionStorage.setItem(reloadKey, 'true')
    } catch {
      // ignore
    }
    window.location.reload()
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
