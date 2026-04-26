import { useRef } from 'react'
import { NOTE_NAMES } from '../lib/clipNote'
import { getTuningSystem } from '../lib/tuningSystems'
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

// Clavier pentatonique égal (5-TET) : 5 rectangles en ligne, largeur égale,
// labels I..V. Palette : 5 hues répartis sur le cercle chromatique (72° de
// pas), lightness et saturation uniformes — 5-TET n'a pas de sous-catégorie
// de "kind" (pas d'altération), un seul niveau suffit. `is-active` (inset
// cyan) et `is-playing` (outline jaune) réutilisent les patterns grid-24
// qui préservent la couleur de fond par-degré.
const HUE_PER_DEGREE = [0, 72, 144, 216, 288]

function Grid5Layout({ noteIndex, active, cued, compact, names, handleMouseDown }) {
  return (
    <div className={`piano-keyboard piano-keyboard-grid5${compact ? ' piano-keyboard-compact' : ''}`} role="group" aria-label="Clavier 5-TET">
      {HUE_PER_DEGREE.map((hue, idx) => {
        const classes = ['grid5-key']
        if (noteIndex === idx) classes.push('is-active')
        if (active.has(idx)) classes.push('is-playing')
        if (cued.has(idx)) classes.push('is-cued')
        const label = names?.[idx] ?? ''
        return (
          <button
            key={idx}
            type="button"
            className={classes.join(' ')}
            style={{ '--hue': hue }}
            onMouseDown={handleMouseDown(idx)}
            aria-label={label}
            aria-pressed={noteIndex === idx}
            title={compact ? label : undefined}
          >
            {!compact && <span className="grid5-key-label">{label}</span>}
          </button>
        )
      })}
    </div>
  )
}

// Clavier gamelan Pelog (grid-7) : 7 rectangles en ligne, largeur égale,
// labels I..VII. Strictement calqué sur Grid5Layout — cellules équidistantes
// alors que les pitchs ne le sont pas (deux grands trous Pelog), même
// convention que piano-12 et tous les autres layouts. Palette : 7 hues à
// 360°/7 ≈ 51° de pas, lightness uniforme alignée sur grid-5 — pas de
// hiérarchie d'altération à représenter dans un système gamelan.
const HUE_PER_PELOG_DEGREE = [0, 51, 103, 154, 206, 257, 309]

function Grid7Layout({ noteIndex, active, cued, compact, names, handleMouseDown }) {
  return (
    <div className={`piano-keyboard piano-keyboard-grid7${compact ? ' piano-keyboard-compact' : ''}`} role="group" aria-label="Clavier 7 degrés">
      {HUE_PER_PELOG_DEGREE.map((hue, idx) => {
        const classes = ['grid7-key']
        if (noteIndex === idx) classes.push('is-active')
        if (active.has(idx)) classes.push('is-playing')
        if (cued.has(idx)) classes.push('is-cued')
        const label = names?.[idx] ?? ''
        return (
          <button
            key={idx}
            type="button"
            className={classes.join(' ')}
            style={{ '--hue': hue }}
            onMouseDown={handleMouseDown(idx)}
            aria-label={label}
            aria-pressed={noteIndex === idx}
            title={compact ? label : undefined}
          >
            {!compact && <span className="grid7-key-label">{label}</span>}
          </button>
        )
      })}
    </div>
  )
}

// Clavier 31-EDO en grille 4 rangées × 8 colonnes moins la case haut-droite
// (degré 31 = octave, non représenté → 31 cellules). Chaque cellule occupe
// 4 sub-cols, et chaque rangée est décalée d'+1 sub-col par rapport à la
// rangée du dessous (escalier 1/4 d'unité — extension du pattern grid-24).
// Conséquence : l'axe horizontal encode linéairement la hauteur — le degré
// k commence à `1 + k` en sub-col (relation monotone, vrai aussi bien pour
// une montée intra-colonne que pour un saut de colonne). 35 sub-cols au
// total (k=30 → start_subCol=31, end_subCol=35).
//
// Mapping rangée physique du clavier QWERTY ↔ visualRow :
//   r1 (visualRow 1, en haut)    = rangée chiffres (Digit4..Digit0)
//   r2 (visualRow 2)              = Q-row (KeyE..KeyP)
//   r3 (visualRow 3)              = A-row (KeyS..KeyL)
//   r4 (visualRow 4, en bas)      = Z-row (KeyZ..Comma)
// Au clavier physique : rangée chiffres en haut, rangée Z en bas — le layout
// reflète directement la position des doigts. Le serpentin-colonne (k=0
// bas-gauche, k=3 haut col 1, k=4 bas col 2…) découle de THIRTYONE_KEY_MAP.
//
// Palette : hue par colonne (8 zones de hauteur), lightness par rangée
// (4 crans modulant la "phase" au sein de la zone) — alignée sur la
// grammaire de Grid24Layout (hue = naturelle, lightness = altération).
// 8 hues étendant le pattern HUE_PER_NATURAL de grid-24 à 8 entrées.
// Lightness reprend la progression grid-24 ↓→♮→↑→♯ (75%, 60%, 45%, 30%) :
// rangée 4 (bas) la plus claire, rangée 1 (haut) la plus sombre. is-active
// et is-playing hérités du pattern grid-24/grid-5 (inset cyan + outline
// jaune, fond HSL préservé).
const GRID31_HUE_PER_COL = [0, 38, 76, 130, 180, 220, 280, 320]

function Grid31Layout({ noteIndex, active, cued, compact, handleMouseDown }) {
  return (
    <div className={`piano-keyboard piano-keyboard-grid31${compact ? ' piano-keyboard-compact' : ''}`} role="group" aria-label="Clavier 31-EDO">
      {Array.from({ length: 31 }, (_, k) => {
        const rangeIndex = k % 4
        const visualRow = 4 - rangeIndex
        const col = 1 + Math.floor(k / 4)
        const startSubCol = 1 + (col - 1) * 4 + rangeIndex
        const endSubCol = startSubCol + 4
        const classes = ['grid31-key', `grid31-key-r${rangeIndex}`]
        if (noteIndex === k) classes.push('is-active')
        if (active.has(k)) classes.push('is-playing')
        if (cued.has(k)) classes.push('is-cued')
        const label = String(k + 1)
        return (
          <button
            key={k}
            type="button"
            className={classes.join(' ')}
            style={{
              gridRow: visualRow,
              gridColumn: `${startSubCol} / ${endSubCol}`,
              '--hue': GRID31_HUE_PER_COL[col - 1],
            }}
            onMouseDown={handleMouseDown(k)}
            aria-label={label}
            aria-pressed={noteIndex === k}
            title={compact ? label : undefined}
          >
            {!compact && <span className="grid31-key-label">{label}</span>}
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

// Dispatcher : chaque tempérament déclare son `layout`, on cherche le composant
// correspondant ici. Pour ajouter un grid-N (31-EDO, …) : déclarer
// l'entrée registre + ajouter le composant ci-dessous, rien d'autre.
const LAYOUT_COMPONENTS = {
  'piano-12': PianoLayout12,
  'grid-24': Grid24Layout,
  'grid-5': Grid5Layout,
  'grid-7': Grid7Layout,
  'grid-31': Grid31Layout,
  'grid-22-bhatkhande': Grid22BhatkhandeLayout,
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
  const names = sys.noteNames ?? NOTE_NAMES
  return (
    <Layout
      noteIndex={noteIndex}
      active={active}
      cued={cued}
      compact={compact}
      names={names}
      handleMouseDown={handleMouseDown}
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
