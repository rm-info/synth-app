import './DesignerModule.css'

// iter-O phase-5a : wrapper uniforme des 5 modules du Designer. Gère la
// bascule bande ↔ contenu, PAS sa propre largeur (c'est le conteneur de rangée
// — DesignerColumns ou .designer-cell — qui pose la largeur de bande).
//
// Contrainte imposée : le contenu (qui peut contenir un <canvas>) est TOUJOURS
// monté ; replié = `display:none` (jamais démonté, sinon canvas vide au retour
// — le ResizeObserver du canvas redessine au retour à dimensions non nulles).
// La bande n'éclate donc pas le contenu : elle est un frère affiché à sa place.
//
// `data-module` servira au maximize (O.5b). La signature reste minimale ici.
function DesignerModule({ id, name, collapsed, onReopen, children }) {
  return (
    <div className={`designer-module${collapsed ? ' is-collapsed' : ''}`} data-module={id}>
      {collapsed && (
        <button
          type="button"
          className="module-band"
          onClick={onReopen}
          title={`Rouvrir ${name}`}
          aria-label={`Rouvrir ${name}`}
        >
          <span className="module-band-label">{name}</span>
        </button>
      )}
      <div className="designer-module-content">{children}</div>
    </div>
  )
}

export default DesignerModule
