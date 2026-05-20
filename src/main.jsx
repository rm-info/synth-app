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
