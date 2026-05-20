import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ResolutionGate from './components/ResolutionGate.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ResolutionGate>
      <App />
    </ResolutionGate>
  </StrictMode>,
)
