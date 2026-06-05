import { useRef, useState, useEffect } from 'react'
import ModuleChrome from './ModuleChrome'
import { MODULE_META } from '../lib/designerModules'
import './DesignerModule.css'

// iter-O phase-5c : largeur sous laquelle le titre du module est masqué (reste
// icône + « … » + chrome). Mesurée par ResizeObserver (5c.f3) — l'approche
// container-query d'origine posait `container-type:inline-size` sur le wrapper,
// ce qui empêchait l'item flex de rétrécir (Chromium) → le layout ne se
// contractait plus et le mode compact AHDSR ne se déclenchait jamais.
const MODULE_NARROW_WIDTH = 260

// iter-O phase-5a/5c : wrapper uniforme des 5 modules du Designer. Gère la
// bascule bande ↔ contenu, PAS sa propre largeur (c'est le conteneur de rangée
// — DesignerColumns ou .designer-cell — qui pose la largeur de bande).
//
// Contrainte imposée : le contenu (qui peut contenir un <canvas>) est TOUJOURS
// monté ; replié = `display:none` (jamais démonté, sinon canvas vide au retour
// — le ResizeObserver du canvas redessine au retour à dimensions non nulles).
// La bande n'éclate donc pas le contenu : elle est un frère affiché à sa place.
//
// O.5c : la `ModuleChrome` (Réduire/Agrandir) est rendue ICI, une seule fois, en
// position absolue au coin haut-droit (cf. .css), au lieu d'être répétée dans les
// 5 headers. L'identité (icône + libellé) vient de MODULE_META[id] : icône en
// tête de bande, titre en rotation dessous (clippé si la hauteur ne suffit pas).
function DesignerModule({ id, collapsed, maximized, onToggleCollapse, onToggleMaximize, children }) {
  const rootRef = useRef(null)
  const [isNarrow, setIsNarrow] = useState(false)
  useEffect(() => {
    const el = rootRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width
        if (!w) continue
        setIsNarrow((prev) => {
          const narrow = w < MODULE_NARROW_WIDTH
          return prev === narrow ? prev : narrow
        })
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const meta = MODULE_META[id]
  const Icon = meta?.Icon
  const label = meta?.label ?? id
  return (
    <div
      ref={rootRef}
      className={`designer-module${collapsed ? ' is-collapsed' : ''}${maximized ? ' is-maximized' : ''}${isNarrow ? ' is-narrow' : ''}`}
      data-module={id}
    >
      {collapsed && !maximized && (
        <button
          type="button"
          className="module-band"
          onClick={onToggleCollapse}
          title={`Rouvrir ${label}`}
          aria-label={`Rouvrir ${label}`}
        >
          {Icon && <Icon className="module-band-icon" size={16} aria-hidden="true" />}
          <span className="module-band-label">{label}</span>
        </button>
      )}
      <div className="designer-module-content">
        <ModuleChrome
          onCollapse={onToggleCollapse}
          onMaximize={onToggleMaximize}
          maximized={maximized}
        />
        {children}
      </div>
    </div>
  )
}

export default DesignerModule
