import { useEffect, useRef } from 'react'
import { STRINGS } from '../lib/strings'
import './DesignerColumns.css'

// iter-M phase-2 : les 3 colonnes de la moitié principale du Designer
// (Forme d'onde / Harmoniques / Spectro) avec proportions ajustables —
// presets en un clic + séparateurs glissables. L'état de proportions
// (tableau de 3 fractions sommant à 1) est porté/persisté par le parent.

// Presets de répartition (cf. spec §7.1) : ⅓⅓⅓ · ½¼¼ · ¼½¼ · ¼¼½.
const PRESETS = [
  { id: 'even', label: '⅓ ⅓ ⅓', widths: [1 / 3, 1 / 3, 1 / 3], title: 'Trois colonnes égales' },
  { id: 'wave', label: '½ ¼ ¼', widths: [0.5, 0.25, 0.25], title: 'Forme d’onde large' },
  { id: 'harm', label: '¼ ½ ¼', widths: [0.25, 0.5, 0.25], title: 'Harmoniques large' },
  { id: 'spec', label: '¼ ¼ ½', widths: [0.25, 0.25, 0.5], title: 'Spectrogramme large' },
]

// Plancher d'une colonne (fraction) pendant le drag : empêche qu'un voisin
// soit écrasé à zéro et reste re-saisissable.
const MIN_FRACTION = 0.12

// iter-M phase-2-as : 3 états stables pilotés par le focus (essai). La colonne
// focus prend 60 %, les deux autres 20 %. Le repos = focus-spectro (pas de 4ᵉ
// état ; le ⅓⅓⅓ reste dispo via les presets en manuel).
const FOCUS_WIDTHS = [
  [0.6, 0.2, 0.2], // focus Forme d'onde
  [0.2, 0.6, 0.2], // focus Harmoniques
  [0.2, 0.2, 0.6], // focus Spectro
]
const REST_WIDTHS = [0.2, 0.2, 0.6]

function DesignerColumns({ widths, onWidths, autoSizing, onToggleAutoSizing, focusGuardRef, columns }) {
  const rootRef = useRef(null)
  const rowRef = useRef(null)
  // Focus courant (index colonne 0/1/2, ou null = repos). Volatile : vit dans
  // un ref, jamais persisté — à l'ouverture et après toute « sortie » = repos.
  const focusColRef = useRef(null)

  // iter-M phase-2-as : tracking du focus, actif UNIQUEMENT quand autoSizing
  // est ON (aucun listener attaché sinon). Écrit dans le même état de
  // proportions que M.2 — pas de nouvel état canonique. Retrait du mode =
  // supprimer ce useEffect + le toggle.
  useEffect(() => {
    if (!autoSizing) return
    // Activation (boot avec autoSizing persisté OU passage manuel→auto) :
    // pas de focus → repos.
    focusColRef.current = null
    onWidths(REST_WIDTHS)

    // Capture : on résout le focus AVANT que l'éditable ne traite son propre
    // mousedown (cf. règle AS.3.2 — le geste qui change le focus ne fait que
    // focuser).
    const onDown = (e) => {
      const root = rootRef.current
      const row = rowRef.current
      if (!root || !row) return
      // Par défaut ce geste n'est PAS une prise de focus → l'éditable peut
      // éditer normalement (règle AS.3.2). On ne lève le guard que dans la
      // branche « changement de focus » ci-dessous.
      if (focusGuardRef) focusGuardRef.current = false
      // Clic réellement hors du widget (clavier visuel, toolbar, ADSR/params,
      // autre onglet…) → repos.
      if (!root.contains(e.target)) {
        if (focusColRef.current !== null) {
          focusColRef.current = null
          onWidths(REST_WIDTHS)
        }
        return
      }
      // Séparateur : cible indépendante, son drag écrit les widths comme en
      // manuel (cf. règle AS.3.1). On ne touche pas au focus.
      if (e.target.closest('.designer-columns-sep')) return
      // Clic dans une des 3 colonnes → prise de focus (si changement).
      const colEl = e.target.closest('.designer-column')
      const cols = [...row.querySelectorAll(':scope > .designer-column')]
      const idx = colEl ? cols.indexOf(colEl) : -1
      if (idx !== -1) {
        if (idx !== focusColRef.current) {
          focusColRef.current = idx
          onWidths(FOCUS_WIDTHS[idx])
          // Ce geste *change* le focus → il ne fait que focuser, pas éditer
          // (règle AS.3.2). L'éditable consultera ce guard et s'abstiendra.
          if (focusGuardRef) focusGuardRef.current = true
        }
        return
      }
      // Reste : la barre de presets/toggle (dans le widget mais hors colonnes)
      // — geste neutre, ni focus ni repos (laisse figer en basculant auto OFF).
    }
    document.addEventListener('mousedown', onDown, true)
    return () => {
      document.removeEventListener('mousedown', onDown, true)
      if (focusGuardRef) focusGuardRef.current = false
    }
  }, [autoSizing, onWidths, focusGuardRef])

  // Drag d'un séparateur entre la colonne `sepIndex` et `sepIndex+1`. On
  // capture les largeurs de départ et on recalcule en absolu à chaque move
  // (pas d'accumulation d'erreur). `stopPropagation` isole le drag du clic
  // sur la colonne (anticipation M.2-AS : la poignée est une cible de hit
  // indépendante, le clic ne « fuit » jamais vers la zone éditable).
  const startDrag = (sepIndex) => (e) => {
    e.preventDefault()
    e.stopPropagation()
    const row = rowRef.current
    if (!row) return
    const totalW = row.getBoundingClientRect().width
    if (totalW <= 0) return
    const startX = e.clientX
    const startWidths = widths.slice()

    const onMove = (ev) => {
      const deltaFrac = (ev.clientX - startX) / totalW
      let a = startWidths[sepIndex] + deltaFrac
      let b = startWidths[sepIndex + 1] - deltaFrac
      if (a < MIN_FRACTION) { b -= MIN_FRACTION - a; a = MIN_FRACTION }
      if (b < MIN_FRACTION) { a -= MIN_FRACTION - b; b = MIN_FRACTION }
      const next = startWidths.slice()
      next[sepIndex] = a
      next[sepIndex + 1] = b
      onWidths(next)
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
    }
    document.body.style.cursor = 'col-resize'
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div className="designer-columns" ref={rootRef}>
      <div className="designer-columns-presets" role="group" aria-label="Proportions des colonnes">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className="designer-columns-preset-btn"
            title={p.title}
            onClick={() => onWidths(p.widths)}
          >{p.label}</button>
        ))}
        {/* iter-M phase-2-as : toggle auto-sizing (essai), opt-in, OFF par
            défaut. Quand ON, les presets restent un override manuel ponctuel. */}
        <label className="designer-columns-auto-toggle" title={STRINGS.editor.autoSizingTitle}>
          <input
            type="checkbox"
            checked={autoSizing}
            onChange={onToggleAutoSizing}
          />
          <span>{STRINGS.editor.autoSizing}</span>
        </label>
      </div>
      <div className="designer-columns-row" ref={rowRef}>
        <div className="designer-column" style={{ flexGrow: widths[0] }}>{columns[0]}</div>
        <div
          className="designer-columns-sep"
          role="separator"
          aria-orientation="vertical"
          aria-label="Redimensionner Forme d’onde / Harmoniques"
          onMouseDown={startDrag(0)}
        ><span className="designer-columns-sep-grip" aria-hidden="true" /></div>
        <div className="designer-column" style={{ flexGrow: widths[1] }}>{columns[1]}</div>
        <div
          className="designer-columns-sep"
          role="separator"
          aria-orientation="vertical"
          aria-label="Redimensionner Harmoniques / Spectrogramme"
          onMouseDown={startDrag(1)}
        ><span className="designer-columns-sep-grip" aria-hidden="true" /></div>
        <div className="designer-column" style={{ flexGrow: widths[2] }}>{columns[2]}</div>
      </div>
    </div>
  )
}

export default DesignerColumns
