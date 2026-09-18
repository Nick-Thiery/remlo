import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n.js'
import App from './App.jsx'
import safeStorage, { safeSession } from './lib/safeStorage.js'
import { initAnalytics, track } from './lib/analytics.js'
import { registerServiceWorker } from './lib/serviceWorker.js'

initAnalytics()
if (!safeSession.getItem('remlo_opened')) {
  track('app_opened', { return_session: safeStorage.getItem('remlo_visited') === 'true' })
  safeSession.setItem('remlo_opened', 'true')
}
safeStorage.setItem('remlo_visited', 'true')
if (import.meta.env.PROD) registerServiceWorker()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
