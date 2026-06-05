import ModuleChrome from './ModuleChrome'
import { MODULE_META } from '../lib/designerModules'
import './DesignerModule.css'

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
//
// Note (5c.f5) : le masquage auto du titre quand le module rétrécit (5c.2) est
// RETIRÉ. Les deux implémentations possibles cassaient le Designer : la container
// query (`container-type:inline-size`) empêchait le shrink flex des modules ; un
// ResizeObserver JS perturbait la livraison des notifications des RO canvas
// (Forme d'onde non rafraîchie) et du mode compact AHDSR. À ré-aborder autrement
// si souhaité.
function DesignerModule({ id, collapsed, maximized, onToggleCollapse, onToggleMaximize, children }) {
  const meta = MODULE_META[id]
  const Icon = meta?.Icon
  const label = meta?.label ?? id
  return (
    <div
      className={`designer-module${collapsed ? ' is-collapsed' : ''}${maximized ? ' is-maximized' : ''}`}
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
