import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import TooSmallGate from './components/TooSmallGate.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <TooSmallGate>
      <App />
    </TooSmallGate>
  </StrictMode>,
)

// Dev-only : exposer les utilitaires .osa pour tests manuels console.
// import.meta.env.DEV est inliné par Vite à false en prod → bloc supprimé.
if (import.meta.env.DEV) {
  import('./lib/osaFormat.js').then((mod) => { window.__osa = mod })
  import('./lib/libraryTransfer.js').then((mod) => { window.__libtransfer = mod })
}
