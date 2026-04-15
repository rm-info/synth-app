import { useState } from 'react'
import './PropertiesPanel.css'

/**
 * Panneau Properties (Composer).
 * Phase 2 : placeholder. Sera fonctionnel en phase 4 (édition de clip sélectionné).
 * Sur écran <1100px : bottom-sheet collapsible. Au-dessus : sidebar fixe.
 */
function PropertiesPanel({ selectedClip }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside className={`properties-panel ${collapsed ? 'collapsed' : ''}`}>
      <header className="properties-header">
        <h3>Propriétés</h3>
        <button
          type="button"
          className="properties-toggle"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? 'Déployer' : 'Réduire'}
          title={collapsed ? 'Déployer' : 'Réduire'}
        >
          {collapsed ? '▴' : '▾'}
        </button>
      </header>
      {!collapsed && (
        <div className="properties-body">
          {selectedClip ? (
            <p className="properties-empty">
              Édition du clip — disponible en phase 4.
            </p>
          ) : (
            <p className="properties-empty">
              Sélectionnez un clip pour afficher ses propriétés.
            </p>
          )}
        </div>
      )}
    </aside>
  )
}

export default PropertiesPanel
