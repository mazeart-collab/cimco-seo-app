import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Remise à zéro : changer DATA_VERSION efface toutes les données locales de l'app (statuts, pages générées,
// photos, onboarding, caches) chez chaque visiteur, qui retrouve l'app comme à sa première ouverture.
const DATA_VERSION = '2026-11-24-reset'
try {
  if (localStorage.getItem('cimco.data.version') !== DATA_VERSION) {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('cimco'))
      .forEach((k) => localStorage.removeItem(k))
    localStorage.setItem('cimco.data.version', DATA_VERSION)
  }
} catch {
  /* stockage indisponible */
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
