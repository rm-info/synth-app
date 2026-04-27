import { useRef } from 'react'
import { NOTE_NAMES } from '../lib/clipNote'
import {
  DEFAULT_X_EDO_N,
  getNoteNames,
  getNotesPerOctave,
  getTuningSystem,
} from '../lib/tuningSystems'
import GridXEdoLayout from './GridXEdoLayout'
import './PianoKeyboard.css'

export { NOTE_NAMES }

const OCTAVES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
const REFERENCE_OCTAVE = 4

// Hook partagé : un mousedown commence l'attaque (onKeyPress), un mouseup
// window-level finit le release (option B du brief E.3 — la note tient même
// si la souris quitte la touche). `pressedRef` empêche d'enregistrer deux
// listeners pour le même mousedown répété.
function useMouseDownHandler({ onSelectNote, onKeyPress, onKeyRelease }) {
  const pressedRef = useRef(new Set())
  return (idx) => (e) => {
    if (e.button !== 0) return
    e.preventDefault()
    onSelectNote?.(idx)
    onKeyPress?.(idx)
    if (!onKeyRelease) return
    if (pressedRef.current.has(idx)) return
    pressedRef.current.add(idx)
    const release = () => {
      window.removeEventListener('mouseup', release)
      pressedRef.current.delete(idx)
      onKeyRelease(idx)
    }
    window.addEventListener('mouseup', release)
  }
}

// Clavier piano 12 notes : 7 touches blanches (diatoniques), 5 touches noires
// (altérées). Les touches noires se placent entre deux blanches ; rien entre
// E-F et B-C (demi-tons diatoniques). `afterWhite` = index de la blanche qui
// précède la noire dans le rang des 7 blanches.
const WHITE_KEYS = [0, 2, 4, 5, 7, 9, 11] // C D E F G A B
const BLACK_KEYS = [
  { note: 1,  afterWhite: 0 }, // C♯ entre C et D
  { note: 3,  afterWhite: 1 }, // D♯ entre D et E
  { note: 6,  afterWhite: 3 }, // F♯ entre F et G
  { note: 8,  afterWhite: 4 }, // G♯ entre G et A
  { note: 10, afterWhite: 5 }, // A♯ entre A et B
]

function PianoLayout12({ noteIndex, active, cued, compact, names, handleMouseDown }) {
  return (
    <div className={`piano-keyboard piano-keyboard-12${compact ? ' piano-keyboard-compact' : ''}`} role="group" aria-label="Clavier piano">
      <div className="piano-whites">
        {WHITE_KEYS.map((idx) => {
          const classes = ['piano-key', 'piano-key-white']
          if (noteIndex === idx) classes.push('is-active')
          if (active.has(idx)) classes.push('is-playing')
          if (cued.has(idx)) classes.push('is-cued')
          return (
            <button
              key={idx}
              type="button"
              className={classes.join(' ')}
              onMouseDown={handleMouseDown(idx)}
              aria-label={names[idx]}
              aria-pressed={noteIndex === idx}
              title={compact ? names[idx] : undefined}
            >
              {!compact && <span className="piano-key-label">{names[idx]}</span>}
            </button>
          )
        })}
      </div>
      <div className="piano-blacks">
        {BLACK_KEYS.map(({ note, afterWhite }) => {
          const classes = ['piano-key', 'piano-key-black']
          if (noteIndex === note) classes.push('is-active')
          if (active.has(note)) classes.push('is-playing')
          if (cued.has(note)) classes.push('is-cued')
          return (
            <button
              key={note}
              type="button"
              className={classes.join(' ')}
              style={{ left: `${((afterWhite + 1) / WHITE_KEYS.length) * 100}%` }}
              onMouseDown={handleMouseDown(note)}
              title={names[note]}
              aria-label={names[note]}
              aria-pressed={noteIndex === note}
            />
          )
        })}
      </div>
    </div>
  )
}

// Clavier 24 notes en grille 4 rangées × 30 sub-colonnes. Chaque naturelle
// occupe 4 sub-cols (= largeur "unité naturelle"), chaque rangée décalée
// d'1 sub-col (= 1/4 d'unité) par rapport à la rangée 3. ↑ va à droite de
// sa naturelle, ↓ à gauche de sa naturelle ascendante (motif diamant).
//
// Layout (sub-col 1..30) :
//   r3 (♮) :  C    D    E    F    G    A    B            offset  0 (start k)
//   r2 (↑) :   C↑   D↑   E↑   F↑   G↑   A↑   B↑          offset +1 (start k+1)
//   r1 (♯) :    C♯   D♯ ▢▢   F♯   G♯   A♯ ▢▢             offset +2 (start k+2)
//   r4 (↓) : ▢▢ D↓   E↓ ▢▢ ▢▢   G↓   A↓   B↓ ▢▢          offset −1 (start k−1)
//
// Centre visuel = noteIndex/2 → la lecture gauche-droite parcourt la gamme
// chromatique 24-TET dans l'ordre. Pas d'overlap dans une rangée (cellules
// 4 sub-cols espacées de 4). Trous d'enharmonie : pas de E♯/B♯ (rangée 1)
// ni F↓/C↓ (rangée 4).
//
// `parent` (0..6, index dans HUE_PER_NATURAL) : ↑ et ♯ héritent du hue de
// la naturelle ascendante (C↑/C♯ → hue C), ↓ hérite du hue de la naturelle
// suivante (D↓ → hue D, pas hue C — diamant cohérent : D↑ et D↓ même hue).
const GRID_24_CELLS = [
  // [noteIndex, gridRow, gridColStart, gridColEnd, kind, parent]
  // kind ∈ 'sharp' (r1) | 'half-up' (r2) | 'natural' (r3) | 'half-dn' (r4)
  [2,  1,  3,  7,  'sharp',   0], // C♯ → hue C  (entre C et D)
  [6,  1,  7,  11, 'sharp',   1], // D♯ → hue D  (entre D et E)
  [12, 1, 15, 19, 'sharp',   3], // F♯ → hue F  (entre F et G)
  [16, 1, 19, 23, 'sharp',   4], // G♯ → hue G  (entre G et A)
  [20, 1, 23, 27, 'sharp',   5], // A♯ → hue A  (entre A et B)
  [1,  2,  2,  6,  'half-up', 0], // C↑ → hue C
  [5,  2,  6,  10, 'half-up', 1], // D↑ → hue D
  [9,  2, 10, 14, 'half-up', 2], // E↑ → hue E
  [11, 2, 14, 18, 'half-up', 3], // F↑ → hue F
  [15, 2, 18, 22, 'half-up', 4], // G↑ → hue G
  [19, 2, 22, 26, 'half-up', 5], // A↑ → hue A
  [23, 2, 26, 30, 'half-up', 6], // B↑ → hue B
  [0,  3,  1,  5,  'natural', 0], // C
  [4,  3,  5,  9,  'natural', 1], // D
  [8,  3,  9, 13, 'natural', 2], // E
  [10, 3, 13, 17, 'natural', 3], // F
  [14, 3, 17, 21, 'natural', 4], // G
  [18, 3, 21, 25, 'natural', 5], // A
  [22, 3, 25, 29, 'natural', 6], // B
  [3,  4,  4,  8,  'half-dn', 1], // D↓ → hue D  (entre C♯ et D)
  [7,  4,  8, 12, 'half-dn', 2], // E↓ → hue E  (entre D♯ et E)
  [13, 4, 16, 20, 'half-dn', 4], // G↓ → hue G  (entre F♯ et G)
  [17, 4, 20, 24, 'half-dn', 5], // A↓ → hue A  (entre G♯ et A)
  [21, 4, 24, 28, 'half-dn', 6], // B↓ → hue B  (entre A♯ et B)
]

// 7 hues répartis sur le cercle chromatique, un par naturelle. Lightness et
// saturation vivent dans le CSS via classes par kind. Les choix exacts (hues
// répartis ~uniformément, ordre C-D-E-F-G-A-B) sont arbitraires mais stables
// — l'utilisateur apprend l'association couleur ↔ note, comme sur un xylophone
// pédagogique.
const HUE_PER_NATURAL = [0, 38, 76, 145, 200, 256, 310]

function Grid24Layout({ noteIndex, active, cued, compact, names, handleMouseDown }) {
  return (
    <div className={`piano-keyboard piano-keyboard-grid24${compact ? ' piano-keyboard-compact' : ''}`} role="group" aria-label="Clavier 24-TET">
      {GRID_24_CELLS.map(([idx, row, colStart, colEnd, kind, parent]) => {
        const classes = ['grid24-key', `grid24-key-${kind}`]
        if (noteIndex === idx) classes.push('is-active')
        if (active.has(idx)) classes.push('is-playing')
        if (cued.has(idx)) classes.push('is-cued')
        const label = names?.[idx] ?? ''
        return (
          <button
            key={idx}
            type="button"
            className={classes.join(' ')}
            style={{
              gridRow: row,
              gridColumn: `${colStart} / ${colEnd}`,
              '--hue': HUE_PER_NATURAL[parent],
            }}
            onMouseDown={handleMouseDown(idx)}
            aria-label={label}
            aria-pressed={noteIndex === idx}
            title={compact ? label : undefined}
          >
            {!compact && <span className="grid24-key-label">{label}</span>}
          </button>
        )
      })}
    </div>
  )
}

// Clavier Bhatkhande (grid-22-bhatkhande) : 22 shrutis indiens regroupés
// en 7 svaras avec distribution 1-4-4-4-1-4-4. Sa (col 1) et pa (col 5)
// sont des "piliers" : 1 cellule en bas seulement. Re/ga/ma/dha/ni
// (cols 2,3,4,6,7) reçoivent 4 sub-shrutis empilées (a en bas, d en
// haut). La grammaire visuelle "piliers étroits" est la signature
// pédagogique de Bhatkhande vs Sarngadeva.
//
// Géométrie partagée avec grid-31 : escalier 1 sub-col par rangée,
// chaque cellule 4 sub-cols de large. Visualisation des 7 colonnes
// svaras à intervalles réguliers (équidistance visuelle malgré les
// pitchs inégaux — convention partagée avec piano-12 et tous les
// autres layouts).
//
//   visualRow 4 (Z, bas) : I  IIa IIIa IVa V  VIa VIIa
//   visualRow 3 (A)      :    IIb IIIb IVb    VIb VIIb
//   visualRow 2 (Q)      :    IIc IIIc IVc    VIc VIIc
//   visualRow 1 (Digit)  :    IId IIId IVd    VId VIId
//
// Palette HSL : 7 hues par colonne svara (HUE_PER_PELOG_DEGREE
// réutilisé — même grammaire que grid-7, cohérence cross-system),
// lightness modulée par rangée (75/60/45/30%, reprise stricte de
// grid-31). Hauteur 160px / compact 80px alignée sur grid-31/grid-24
// (autres layouts 4-rangées).
const HUE_PER_SHRUTI_SVARA = [0, 51, 103, 154, 206, 257, 309]

// Cellules Bhatkhande : [noteIndex, svaraCol (1..7), rangeIndex (0=Z, 3=Digit)].
// noteIndex suit l'ordre du tableau SHRUTI_BHATKHANDE_NAMES dans
// tuningSystems.js (I=0, IIa=1..IId=4, IIIa=5..IIId=8, IVa=9..IVd=12,
// V=13, VIa=14..VId=17, VIIa=18..VIId=21).
const GRID_22_BHATKHANDE_CELLS = [
  // Z-row (rangeIndex 0) : 7 svaras à leur position la plus grave
  [0,  1, 0], // I    (sa)
  [1,  2, 0], // IIa
  [5,  3, 0], // IIIa
  [9,  4, 0], // IVa
  [13, 5, 0], // V    (pa)
  [14, 6, 0], // VIa
  [18, 7, 0], // VIIa
  // A-row (rangeIndex 1) : sub-shruti b des 5 clusters non-piliers
  [2,  2, 1], // IIb
  [6,  3, 1], // IIIb
  [10, 4, 1], // IVb
  [15, 6, 1], // VIb
  [19, 7, 1], // VIIb
  // Q-row (rangeIndex 2) : sub-shruti c
  [3,  2, 2], // IIc
  [7,  3, 2], // IIIc
  [11, 4, 2], // IVc
  [16, 6, 2], // VIc
  [20, 7, 2], // VIIc
  // Digit row (rangeIndex 3) : sub-shruti d (= shuddha "standard")
  [4,  2, 3], // IId
  [8,  3, 3], // IIId
  [12, 4, 3], // IVd
  [17, 6, 3], // VId
  [21, 7, 3], // VIId
]

function Grid22BhatkhandeLayout({ noteIndex, active, cued, compact, names, handleMouseDown }) {
  return (
    <div className={`piano-keyboard piano-keyboard-grid22${compact ? ' piano-keyboard-compact' : ''}`} role="group" aria-label="Clavier 22 shrutis (Bhatkhande)">
      {GRID_22_BHATKHANDE_CELLS.map(([idx, svaraCol, rangeIndex]) => {
        const visualRow = 4 - rangeIndex
        const startSubCol = 1 + (svaraCol - 1) * 4 + rangeIndex
        const endSubCol = startSubCol + 4
        const classes = ['grid22-key', `grid22-key-r${rangeIndex}`]
        if (noteIndex === idx) classes.push('is-active')
        if (active.has(idx)) classes.push('is-playing')
        if (cued.has(idx)) classes.push('is-cued')
        const label = names?.[idx] ?? ''
        return (
          <button
            key={idx}
            type="button"
            className={classes.join(' ')}
            style={{
              gridRow: visualRow,
              gridColumn: `${startSubCol} / ${endSubCol}`,
              '--hue': HUE_PER_SHRUTI_SVARA[svaraCol - 1],
            }}
            onMouseDown={handleMouseDown(idx)}
            aria-label={label}
            aria-pressed={noteIndex === idx}
            title={compact ? label : undefined}
          >
            {!compact && <span className="grid22-key-label">{label}</span>}
          </button>
        )
      })}
    </div>
  )
}

// Clavier Sarngadeva (grid-22-sarngadeva) : mêmes 22 shrutis indiens
// que Bhatkhande, mais distribution 4-3-2-4-4-3-2 (Bharata classique,
// Sangita Ratnakara XIIIe). Sa, ma et pa "habitent" 4 sub-shrutis
// chacun (zones étendues — colonnes les plus hautes), ri et dha 3,
// ga et ni 2 (colonnes les plus basses). Géométrie partagée avec
// Bhatkhande : mêmes 32 sub-cols, mêmes 4 rangées, même escalier 1
// sub-col par rangée, mêmes hues par colonne svara. Ce qui change :
// quelles cellules sont peuplées dans cette grille.
//
//   visualRow 4 (Z, bas) : Ia  IIa IIIa IVa Va  VIa VIIa
//   visualRow 3 (A)      : Ib  IIb IIIb IVb Vb  VIb VIIb
//   visualRow 2 (Q)      : Ic  IIc      IVc Vc  VIc
//   visualRow 1 (Digit)  : Id           IVd Vd
//
// La grammaire visuelle "piliers larges" (sa, ma, pa montent jusqu'au
// digit row) contraste avec Bhatkhande "piliers étroits" (sa et pa
// limités à la rangée du bas) — c'est l'écart pédagogique central
// entre les deux frameworks indiens.
const GRID_22_SARNGADEVA_CELLS = [
  // Z-row (rangeIndex 0) : 7 svaras nommées à leur position la plus grave
  [0,  1, 0], // Ia    (sa)
  [4,  2, 0], // IIa   (ri)
  [7,  3, 0], // IIIa  (ga)
  [9,  4, 0], // IVa   (ma)
  [13, 5, 0], // Va    (pa)
  [17, 6, 0], // VIa   (dha)
  [20, 7, 0], // VIIa  (ni)
  // A-row (rangeIndex 1) : sub-shruti b — toutes les svaras ont au moins 2 sub-shrutis
  [1,  1, 1], // Ib
  [5,  2, 1], // IIb
  [8,  3, 1], // IIIb
  [10, 4, 1], // IVb
  [14, 5, 1], // Vb
  [18, 6, 1], // VIb
  [21, 7, 1], // VIIb
  // Q-row (rangeIndex 2) : sub-shruti c — gaps au-dessus de ga (col 3) et ni (col 7)
  [2,  1, 2], // Ic
  [6,  2, 2], // IIc
  [11, 4, 2], // IVc
  [15, 5, 2], // Vc
  [19, 6, 2], // VIc
  // Digit row (rangeIndex 3) : sub-shruti d — uniquement sa, ma, pa
  [3,  1, 3], // Id
  [12, 4, 3], // IVd
  [16, 5, 3], // Vd
]

function Grid22SarngadevaLayout({ noteIndex, active, cued, compact, names, handleMouseDown }) {
  return (
    <div className={`piano-keyboard piano-keyboard-grid22${compact ? ' piano-keyboard-compact' : ''}`} role="group" aria-label="Clavier 22 shrutis (Sarngadeva)">
      {GRID_22_SARNGADEVA_CELLS.map(([idx, svaraCol, rangeIndex]) => {
        const visualRow = 4 - rangeIndex
        const startSubCol = 1 + (svaraCol - 1) * 4 + rangeIndex
        const endSubCol = startSubCol + 4
        const classes = ['grid22-key', `grid22-key-r${rangeIndex}`]
        if (noteIndex === idx) classes.push('is-active')
        if (active.has(idx)) classes.push('is-playing')
        if (cued.has(idx)) classes.push('is-cued')
        const label = names?.[idx] ?? ''
        return (
          <button
            key={idx}
            type="button"
            className={classes.join(' ')}
            style={{
              gridRow: visualRow,
              gridColumn: `${startSubCol} / ${endSubCol}`,
              '--hue': HUE_PER_SHRUTI_SVARA[svaraCol - 1],
            }}
            onMouseDown={handleMouseDown(idx)}
            aria-label={label}
            aria-pressed={noteIndex === idx}
            title={compact ? label : undefined}
          >
            {!compact && <span className="grid22-key-label">{label}</span>}
          </button>
        )
      })}
    </div>
  )
}

// Dispatcher : chaque tempérament déclare son `layout`, on cherche le composant
// correspondant ici. Pour ajouter un nouveau layout : déclarer l'entrée
// registre + ajouter le composant ci-dessous, rien d'autre. F.8.1.4 : les
// grilles fixes grid-5 / grid-7 / grid-31 ont été retirées au profit du
// layout générique 'grid-x-edo' (composant GridXEdoLayout livré en F.8.2).
// En attendant, Slendro / Pelog / X-EDO rendent `null` ici (clavier non
// affiché — interaction au clic indisponible, lecture audio préservée).
const LAYOUT_COMPONENTS = {
  'piano-12': PianoLayout12,
  'grid-24': Grid24Layout,
  'grid-22-bhatkhande': Grid22BhatkhandeLayout,
  'grid-22-sarngadeva': Grid22SarngadevaLayout,
  'grid-x-edo': GridXEdoLayout,
}

// Deux modes d'interaction :
//
//  1. **Sélection** (Properties) : onSelectNote(idx) — fired at mousedown,
//     pas de release. Utilisé pour mettre à jour une valeur dans le state.
//
//  2. **Instrument** (Designer E.3) : onKeyPress(idx) + onKeyRelease(idx).
//     onKeyPress au mousedown, onKeyRelease au mouseup window-level.
//
// `activeNotes` (Set<number>) colore en permanence les touches dont la note
// est actuellement jouée (feedback visuel pendant un sustain).
//
// `cuedNotes` (Set<number>, F.4.4) marque les touches d'un pattern visuel
// (gamme/accord). Halo magenta autour de la cellule, préserve le fill HSL
// et coexiste avec is-active/is-playing.
//
// `tuningSystem` détermine le layout et les noms de notes affichés. Default
// '12-TET' pour rétro-compat des call-sites qui ne le passent pas encore.
//
// `compact` : variante plus petite pour Properties.
export function PianoKeyboard({
  tuningSystem = '12-TET',
  xEdoN = DEFAULT_X_EDO_N,
  noteIndex,
  activeNotes,
  cuedNotes,
  onSelectNote,
  onKeyPress,
  onKeyRelease,
  compact = false,
}) {
  const sys = getTuningSystem(tuningSystem)
  const Layout = LAYOUT_COMPONENTS[sys.layout]
  const handleMouseDown = useMouseDownHandler({ onSelectNote, onKeyPress, onKeyRelease })
  if (!Layout) return null
  const active = activeNotes ?? new Set()
  const cued = cuedNotes ?? new Set()
  const names = getNoteNames(sys, xEdoN) ?? NOTE_NAMES
  // F.8.2 : pour le layout `grid-x-edo`, le nombre de degrés à rendre n'est
  // pas toujours `xEdoN` : Slendro le force à 5, Pelog à 7 (cf. F.8.1.4).
  // `getNotesPerOctave(sys, xEdoN)` retourne la bonne valeur pour les deux
  // cas (factory pour 'x-edo', constante statique pour les autres).
  const gridSize = getNotesPerOctave(sys, xEdoN)
  return (
    <Layout
      noteIndex={noteIndex}
      active={active}
      cued={cued}
      compact={compact}
      names={names}
      handleMouseDown={handleMouseDown}
      gridSize={gridSize}
    />
  )
}

export function OctaveSelector({ octave, onSelectOctave, compact = false }) {
  const className = `octave-selector${compact ? ' octave-selector-compact' : ''}`
  return (
    <div className={className} role="group" aria-label="Sélecteur d'octave">
      {OCTAVES.map((o) => {
        const classes = ['octave-btn']
        if (o === REFERENCE_OCTAVE) classes.push('is-reference')
        if (o === octave) classes.push('is-active')
        return (
          <button
            key={o}
            type="button"
            className={classes.join(' ')}
            onClick={() => onSelectOctave(o)}
            aria-label={`Octave ${o}`}
            aria-pressed={o === octave}
          >
            {o}
          </button>
        )
      })}
    </div>
  )
}
