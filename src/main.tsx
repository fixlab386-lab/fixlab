import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import 'driver.js/dist/driver.css'
import App from './App.tsx'

if (import.meta.env.VITE_ELECTRON !== 'true') {
  await import('./pwaBootstrap')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)