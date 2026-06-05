import { PanelLeftClose, Maximize2, Minimize2 } from 'lucide-react'
import './ModuleChrome.css'

// iter-O phase-5a/5b/5c : chrome « contrôle de fenêtre » d'un module Designer.
// Centralisée dans DesignerModule (O.5c) : rendue UNE fois, en position absolue
// au coin haut-droit du wrapper, hors des headers. Style volontairement distinct
// des .icon-btn d'action (pastille discrète) pour ne pas la confondre avec une
// action du module.
//
// - Réduire (O.5a) : replie le module en bande. **Désactivé en maximisé** (O.5c)
//   — réduire un module plein écran n'a pas de sens (« Restaurer d'abord »).
// - Agrandir / Restaurer (O.5b) : `maximized` true → le module remplit la zone
//   Designer ; le bouton bascule l'icône (Maximize2 ↔ Minimize2). Toggle.
function ModuleChrome({ onCollapse, onMaximize, maximized }) {
  return (
    <div className="module-chrome">
      <button
        type="button"
        className="module-chrome-btn"
        onClick={onCollapse}
        disabled={!!maximized}
        title={maximized ? "Restaurer d'abord" : 'Réduire le module'}
        aria-label={maximized ? "Restaurer le module d'abord" : 'Réduire le module'}
      >
        <PanelLeftClose size={14} />
      </button>
      {onMaximize && (
        <button
          type="button"
          className={`module-chrome-btn${maximized ? ' is-active' : ''}`}
          onClick={onMaximize}
          title={maximized ? 'Restaurer le module' : 'Agrandir le module'}
          aria-label={maximized ? 'Restaurer le module' : 'Agrandir le module'}
          aria-pressed={!!maximized}
        >
          {maximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
      )}
    </div>
  )
}

export default ModuleChrome
