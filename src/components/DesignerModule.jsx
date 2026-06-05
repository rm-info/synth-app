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
// `data-module` sert au ciblage CSS du maximize (O.5b). `maximized` pose la
// classe `is-maximized` (prioritaire sur `is-collapsed` : maximize > collapse,
// le contenu est montré et la bande masquée même si le module était replié).
function DesignerModule({ id, name, collapsed, onReopen, maximized, children }) {
  return (
    <div
      className={`designer-module${collapsed ? ' is-collapsed' : ''}${maximized ? ' is-maximized' : ''}`}
      data-module={id}
    >
      {collapsed && !maximized && (
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
