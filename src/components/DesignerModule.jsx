import ModuleChrome from './ModuleChrome'
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
// 5 headers. Rendue DANS le contenu → masquée gratuitement avec lui quand replié
// (la bande n'a pas de chrome, juste le clic). `data-module` sert au maximize.
function DesignerModule({ id, name, collapsed, maximized, onToggleCollapse, onToggleMaximize, children }) {
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
          title={`Rouvrir ${name}`}
          aria-label={`Rouvrir ${name}`}
        >
          <span className="module-band-label">{name}</span>
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
