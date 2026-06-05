import { PanelLeftClose, Maximize2, Minimize2 } from 'lucide-react'
import './ModuleChrome.css'

// iter-O phase-5a/5b : chrome « façon fenêtre » d'un module Designer, rendu dans
// le header à l'extrême droite, HORS de l'OverflowToolbar (toujours atteignable).
//
// - Réduire (O.5a) : replie le module en bande verticale fine.
// - Agrandir / Restaurer (O.5b) : `maximized` true pour CE module → le module
//   remplit la zone Designer (les autres cachés CSS) ; le bouton bascule
//   l'icône (Maximize2 ↔ Minimize2) et le libellé. `onMaximize` reste un toggle.
function ModuleChrome({ onCollapse, onMaximize, maximized }) {
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
      {onMaximize && (
        <button
          type="button"
          className={`icon-btn module-chrome-btn${maximized ? ' is-active' : ''}`}
          onClick={onMaximize}
          title={maximized ? 'Restaurer le module' : 'Agrandir le module'}
          aria-label={maximized ? 'Restaurer le module' : 'Agrandir le module'}
          aria-pressed={!!maximized}
        >
          {maximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      )}
    </div>
  )
}

export default ModuleChrome
