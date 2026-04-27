import { useMemo } from 'react'
import { xEdoLayoutForN } from '../lib/xEdoLayouts'

// Palette dynamique : hue par colonne (équidistantes sur le cercle
// chromatique, pas de teinte = 360° / numCols), lightness par rangée
// (rangée 0 = la plus basse = la plus claire). Convention héritée de l'ancien
// grid-31 (75%/60%/45%/30% pour 4 rangées) : la rangée du bas est claire,
// la rangée du haut sombre — alignée sur l'intuition "altération vers le
// haut = couleur plus marquée".
//
// Pour les layouts à 1 ou 2 rangées seulement, on choisit des lightness qui
// préservent la lisibilité (50-65%). Pour 3 rangées on échelonne 70/50/30.
const LIGHTNESS_BY_ROWCOUNT = {
  1: [55],
  2: [62, 42],
  3: [70, 50, 30],
  4: [75, 60, 45, 30],
}

// Hauteur de la grille en fonction du nombre de rangées. 1 rangée = 90px
// (aligné sur les anciens grid-5/grid-7), 4 rangées = 160px (aligné sur
// l'ancien grid-31). Compact = la moitié approximativement.
const HEIGHT_BY_ROWCOUNT = { 1: 90, 2: 120, 3: 140, 4: 160 }
const COMPACT_HEIGHT_BY_ROWCOUNT = { 1: 56, 2: 80, 3: 96, 4: 80 }

// Layout générique pour le système X-EDO et les systèmes qui partagent sa
// grammaire de grille (Slendro N=5, Pelog N=7 depuis F.8.1.4). `gridSize`
// est le N à rendre (≠ `xEdoN` du state global pour Slendro/Pelog qui ont
// leur propre N statique). `names` est facultatif : si absent, on affiche
// `String(degré + 1)` (X-EDO numérique) ; sinon on lit `names[degree]`
// (Slendro = I..V, Pelog = I..VII, etc.).
//
// Les états `is-active` / `is-playing` / `is-cued` s'appliquent à la
// cellule (1 half) en mode classique, et à la half spécifique en mode
// Shift (vient en F.8.2.2).
function GridXEdoLayout({
  noteIndex,
  active,
  cued,
  compact,
  names,
  handleMouseDown,
  gridSize,
}) {
  const layout = useMemo(() => xEdoLayoutForN(gridSize), [gridSize])
  if (!layout) return null

  const { cells, numCols, numRows } = layout
  const lightnesses = LIGHTNESS_BY_ROWCOUNT[numRows] ?? LIGHTNESS_BY_ROWCOUNT[4]
  const heightMap = compact ? COMPACT_HEIGHT_BY_ROWCOUNT : HEIGHT_BY_ROWCOUNT
  const height = heightMap[numRows] ?? heightMap[4]

  const containerClasses = [
    'piano-keyboard',
    'piano-keyboard-grid-x-edo',
  ]
  if (compact) containerClasses.push('piano-keyboard-compact')

  return (
    <div
      className={containerClasses.join(' ')}
      role="group"
      aria-label={`Clavier ${gridSize} degrés`}
      data-rows={numRows}
      style={{
        gridTemplateColumns: `repeat(${numCols}, 1fr)`,
        gridTemplateRows: `repeat(${numRows}, 1fr)`,
        height: `${height}px`,
      }}
    >
      {cells.map((cell) => {
        const hue = Math.round((cell.col - 1) * 360 / numCols)
        const lightness = lightnesses[cell.visualRow] ?? lightnesses[lightnesses.length - 1]
        // CSS Grid : ligne 1 en haut. visualRow 0 = bas → gridRow = numRows.
        const gridRow = numRows - cell.visualRow
        return (
          <div
            key={cell.code}
            className="gridx-cell"
            style={{
              gridColumn: cell.col,
              gridRow,
              '--hue': hue,
              '--lightness': `${lightness}%`,
            }}
          >
            {cell.halves.map((half) => {
              const classes = ['gridx-key']
              if (half.shift) classes.push('gridx-key-shifted')
              else classes.push('gridx-key-base')
              if (noteIndex === half.degree) classes.push('is-active')
              if (active.has(half.degree)) classes.push('is-playing')
              if (cued.has(half.degree)) classes.push('is-cued')
              const label = names?.[half.degree] ?? String(half.degree + 1)
              return (
                <button
                  key={half.degree}
                  type="button"
                  className={classes.join(' ')}
                  onMouseDown={handleMouseDown(half.degree)}
                  aria-label={label}
                  aria-pressed={noteIndex === half.degree}
                  title={compact ? label : undefined}
                >
                  {!compact && <span className="gridx-key-label">{label}</span>}
                </button>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

export default GridXEdoLayout
