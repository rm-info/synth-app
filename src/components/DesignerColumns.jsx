import { useRef } from 'react'
import './DesignerColumns.css'

// iter-M phase-2 : les 3 colonnes de la moitié principale du Designer
// (Forme d'onde / Harmoniques / Spectro) avec séparateurs glissables.
// L'état de proportions (tableau de 3 fractions sommant à 1) est
// porté/persisté par le parent.
//
// iter-Q : l'auto-sizing (redimensionnement automatique au focus) a été retiré
// (impraticable). Ce composant ne gère plus que les séparateurs glissables ;
// l'égalisation des proportions passe par le bouton « Égaliser » de la
// DesignerToolbar (les deux rangées à la fois).

// Plancher d'une colonne (fraction) pendant le drag : empêche qu'un voisin
// soit écrasé à zéro et reste re-saisissable.
const MIN_FRACTION = 0.12

// `sepLabels` : libellés aria des 2 séparateurs (défaut = rangée du haut). La
// rangée du bas (P.6.2) réutilise ce composant en passant ses propres libellés.
const DEFAULT_SEP_LABELS = [
  'Redimensionner Forme d’onde / Harmoniques',
  'Redimensionner Harmoniques / Spectrogramme',
]

function DesignerColumns({ widths, onWidths, columns, collapsed = [false, false, false], sepLabels = DEFAULT_SEP_LABELS }) {
  const rowRef = useRef(null)

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

  // iter-O phase-5a : une colonne repliée sort du flexGrow (largeur fixe de
  // bande), les ouvertes conservent leurs ratios (flex distribue l'espace
  // restant). designerColumnWidths n'est PAS modifié → réouverture = retour
  // direct au ratio. Le séparateur adjacent à une colonne repliée est neutralisé.
  //
  // iter-O phase-5a.3 (fix) : on NORMALISE le flexGrow des colonnes ouvertes par
  // leur somme. Sinon Σ(flex-grow) tombe sous 1 quand une colonne se replie, et
  // par spec Flexbox seule cette fraction de l'espace libre est distribuée → un
  // trou subsiste. Σ=1 garantit que tout l'espace libéré est repris (ratios
  // préservés) ; une seule ouverte ⇒ flexGrow 1 ⇒ elle remplit tout.
  const openSum = widths.reduce((s, w, i) => (collapsed[i] ? s : s + w), 0)
  const colStyle = (i) => collapsed[i]
    ? { flex: '0 0 var(--module-band-width, 28px)' }
    : { flexGrow: openSum > 0 ? widths[i] / openSum : 1 }
  const sepHidden = (i) => collapsed[i] || collapsed[i + 1]

  return (
    <div className="designer-columns">
      <div className="designer-columns-row" ref={rowRef}>
        <div className="designer-column" style={colStyle(0)}>{columns[0]}</div>
        <div
          className={`designer-columns-sep${sepHidden(0) ? ' is-hidden' : ''}`}
          role="separator"
          aria-orientation="vertical"
          aria-label={sepLabels[0]}
          onMouseDown={startDrag(0)}
        ><span className="designer-columns-sep-grip" aria-hidden="true" /></div>
        <div className="designer-column" style={colStyle(1)}>{columns[1]}</div>
        <div
          className={`designer-columns-sep${sepHidden(1) ? ' is-hidden' : ''}`}
          role="separator"
          aria-orientation="vertical"
          aria-label={sepLabels[1]}
          onMouseDown={startDrag(1)}
        ><span className="designer-columns-sep-grip" aria-hidden="true" /></div>
        <div className="designer-column" style={colStyle(2)}>{columns[2]}</div>
      </div>
    </div>
  )
}

export default DesignerColumns
