import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Ellipsis } from 'lucide-react'
import './OverflowToolbar.css'

// iter-O phase-2.1 : barre d'outils générique « priority-plus ». Affiche un
// maximum d'items en ligne (forme `bar`) ; dès qu'un item ne tient plus, il
// part dans un tiroir popover (forme `tray`, ligne libellée) ouvert par un
// bouton `⋯`. Le repli se fait depuis la droite (index 0 = plus prioritaire,
// reste en ligne le plus longtemps).
//
// Anti-boucle ResizeObserver : le root remplit l'espace alloué par le flex
// parent (flex:1 1 0; min-width:0) et aligne son contenu à droite. Sa largeur
// mesurée = espace dispo, indépendante du nombre d'items en ligne → pas de
// rétroaction. Les largeurs naturelles viennent d'une « ghost row » hors flux
// observée par le même RO (variation de largeur d'un item ⇒ recalcul).
//
// Props :
// - items: [{ id, bar, tray }] ordonnés (index 0 = plus prioritaire). `bar` et
//   `tray` sont des nodes React fabriqués par le parent (l'état des contrôles
//   vit dans le parent ; on ne fait que relocaliser le rendu).
// - prefix?: node toujours visible, rendu en tête du cluster (chrome fixe, ex.
//   séparateur). Ne déborde jamais.
// - suffix?: node toujours visible, rendu en QUEUE (après les items, avant le
//   trigger). Ne déborde jamais (iter-R phase-2.3 : séparateur + version d'app).
// - triggerIcon?: node de l'icône du bouton d'overflow (défaut `⋯` Ellipsis).
//   iter-R phase-2.1 : le header compact passe un hamburger `Menu`. La même icône
//   sert au clone ghost (mesure) et au trigger visible → largeurs cohérentes.
// - className?, ariaLabel?, menuLabel?

const GAP = 8 // px — doit coller au gap CSS de .overflow-toolbar-row

export default function OverflowToolbar({ items, prefix, suffix, className, ariaLabel, menuLabel, triggerIcon }) {
  const renderTriggerIcon = () => triggerIcon ?? <Ellipsis size={18} />
  const rootRef = useRef(null)
  const ghostRef = useRef(null)
  const prefixRef = useRef(null)
  const suffixRef = useRef(null)
  const triggerRef = useRef(null)
  const popoverRef = useRef(null)
  const visibleCountRef = useRef(items?.length ?? 0)
  const [visibleCount, setVisibleCount] = useState(items?.length ?? 0)
  const [menuOpen, setMenuOpen] = useState(false)

  const closeMenu = useCallback(() => {
    setMenuOpen(false)
    triggerRef.current?.focus()
  }, [])

  // Recalcul purement DOM (lit les cellules de la ghost row, pas le tableau JS
  // `items`) → callback stable, RO posé une seule fois. La dernière cellule
  // ghost est le clone inerte du bouton `⋯` (réserve de largeur).
  const recompute = useCallback(() => {
    const root = rootRef.current
    const ghost = ghostRef.current
    if (!root || !ghost) return
    const cells = Array.from(ghost.children)
    if (cells.length < 1) return
    const triggerW = cells[cells.length - 1].getBoundingClientRect().width
    const widths = cells.slice(0, -1).map((c) => c.getBoundingClientRect().width)
    const n = widths.length
    // Le prefix (chrome fixe, ex. séparateur) consomme de la place en tête de la
    // rangée visible mais ne déborde jamais → on le retranche du dispo.
    let avail = root.clientWidth
    if (prefixRef.current) avail -= prefixRef.current.getBoundingClientRect().width + GAP
    // suffix : chrome fixe en QUEUE (ex. séparateur + version), jamais débordé. */
    if (suffixRef.current) avail -= suffixRef.current.getBoundingClientRect().width + GAP

    // Largeur de tous les items en ligne (sans `⋯`).
    let sumAll = 0
    for (let i = 0; i < n; i++) sumAll += widths[i] + (i > 0 ? GAP : 0)

    let count
    if (sumAll <= avail) {
      count = n
    } else {
      // Au moins un item déborde → réserver la largeur du `⋯` (et son gap).
      let acc = 0
      count = 0
      for (let i = 0; i < n; i++) {
        const next = acc + widths[i] + (i > 0 ? GAP : 0)
        if (next + GAP + triggerW <= avail) {
          acc = next
          count = i + 1
        } else {
          break
        }
      }
    }

    if (count !== visibleCountRef.current) {
      visibleCountRef.current = count
      setVisibleCount(count)
      // Un recalcul qui change le set visible ferme le tiroir (pas de contrôle
      // orphelin) — sans voler le focus (le `⋯` a pu disparaître).
      setMenuOpen(false)
    }
  }, [])

  useLayoutEffect(() => {
    const root = rootRef.current
    const ghost = ghostRef.current
    if (!root || typeof ResizeObserver === 'undefined') return
    // Le RO délivre un 1er callback à l'observe() (avant peinture) : il porte la
    // mesure initiale, on n'appelle donc pas recompute() en synchrone ici (ce
    // qui éviterait aussi un setState synchrone dans l'effet).
    const ro = new ResizeObserver(() => recompute())
    ro.observe(root)
    if (ghost) ro.observe(ghost)
    return () => ro.disconnect()
  }, [recompute])

  // Focus à l'ouverture du tiroir + Escape pour fermer (capture, comme
  // BibContextMenu). closeMenu rend le focus au `⋯`.
  useEffect(() => {
    if (!menuOpen) return
    popoverRef.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        closeMenu()
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [menuOpen, closeMenu])

  if (!items || items.length === 0) return null

  const visible = items.slice(0, visibleCount)
  const overflow = items.slice(visibleCount)

  return (
    <div className={`overflow-toolbar${className ? ` ${className}` : ''}`} ref={rootRef}>
      {/* Ghost row : toutes les formes `bar`, hors flux et inertes, pour la
          mesure des largeurs naturelles (+ clone du `⋯` en dernier). */}
      <div className="overflow-toolbar-row overflow-toolbar-ghost" ref={ghostRef} aria-hidden="true">
        {items.map((it) => (
          <div className="overflow-toolbar-item" key={it.id}>{it.bar}</div>
        ))}
        <div className="overflow-toolbar-item">
          <button type="button" className="icon-btn overflow-toolbar-trigger" tabIndex={-1}>{renderTriggerIcon()}</button>
        </div>
      </div>

      {/* Rangée visible (alignée à droite) : prefix + items qui tiennent + `⋯`. */}
      <div className="overflow-toolbar-row overflow-toolbar-visible" role="group" aria-label={ariaLabel}>
        {prefix && <span className="overflow-toolbar-item overflow-toolbar-prefix" ref={prefixRef}>{prefix}</span>}
        {visible.map((it) => (
          <div className="overflow-toolbar-item" key={it.id}>{it.bar}</div>
        ))}
        {suffix && <span className="overflow-toolbar-item overflow-toolbar-suffix" ref={suffixRef}>{suffix}</span>}
        {overflow.length > 0 && (
          <button
            type="button"
            className="icon-btn overflow-toolbar-trigger"
            ref={triggerRef}
            aria-haspopup="true"
            aria-expanded={menuOpen}
            aria-label={menuLabel ?? 'Plus de contrôles'}
            title={menuLabel ?? 'Plus de contrôles'}
            onClick={() => (menuOpen ? closeMenu() : setMenuOpen(true))}
          >{renderTriggerIcon()}</button>
        )}
      </div>

      {menuOpen && overflow.length > 0 && (
        <>
          <div className="overflow-toolbar-backdrop" onClick={closeMenu} />
          <div
            className="overflow-toolbar-popover"
            ref={popoverRef}
            role="group"
            aria-label={menuLabel ?? ariaLabel}
            tabIndex={-1}
          >
            {overflow.map((it) => (
              <div className="overflow-toolbar-tray-row" key={it.id}>{it.tray}</div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
