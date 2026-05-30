import { useRef } from 'react'
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

function DesignerColumns({ widths, onWidths, columns }) {
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

  return (
    <div className="designer-columns">
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
