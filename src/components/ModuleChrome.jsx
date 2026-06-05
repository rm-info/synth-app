import { PanelLeftClose } from 'lucide-react'
import './ModuleChrome.css'

// iter-O phase-5a : chrome « façon fenêtre » d'un module Designer, rendu dans le
// header à l'extrême droite, HORS de l'OverflowToolbar (toujours atteignable).
//
// O.5a n'expose que « Réduire ». La signature reste extensible : le 2ᵉ bouton
// « Agrandir » (maximize) arrivera en O.5b sans toucher les sites d'appel.
function ModuleChrome({ onCollapse }) {
  return (
    <div className="module-chrome">
      <button
        type="button"
        className="icon-btn module-chrome-btn"
        onClick={onCollapse}
        title="Réduire le module"
        aria-label="Réduire le module"
      >
        <PanelLeftClose size={16} />
      </button>
    </div>
  )
}

export default ModuleChrome
