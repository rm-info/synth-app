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

function PianoLayout12({ noteIndex, active, compact, names, handleMouseDown }) {
  return (
    <div className={`piano-keyboard piano-keyboard-12${compact ? ' piano-keyboard-compact' : ''}`} role="group" aria-label="Clavier piano">
      <div className="piano-whites">
        {WHITE_KEYS.map((idx) => {
          const classes = ['piano-key', 'piano-key-white']
          if (noteIndex === idx) classes.push('is-active')
          if (active.has(idx)) classes.push('is-playing')
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

function Grid24Layout({ noteIndex, active, compact, names, handleMouseDown }) {
  return (
    <div className={`piano-keyboard piano-keyboard-grid24${compact ? ' piano-keyboard-compact' : ''}`} role="group" aria-label="Clavier 24-TET">
      {GRID_24_CELLS.map(([idx, row, colStart, colEnd, kind, parent]) => {
        const classes = ['grid24-key', `grid24-key-${kind}`]
        if (noteIndex === idx) classes.push('is-active')
        if (active.has(idx)) classes.push('is-playing')
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

function Grid5Layout({ noteIndex, active, compact, names, handleMouseDown }) {
  return (
    <div className={`piano-keyboard piano-keyboard-grid5${compact ? ' piano-keyboard-compact' : ''}`} role="group" aria-label="Clavier 5-TET">
      {HUE_PER_DEGREE.map((hue, idx) => {
        const classes = ['grid5-key']
        if (noteIndex === idx) classes.push('is-active')
        if (active.has(idx)) classes.push('is-playing')
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

// Dispatcher : chaque tempérament déclare son `layout`, on cherche le composant
// correspondant ici. Pour ajouter un grid-N (31-EDO, …) : déclarer
// l'entrée registre + ajouter le composant ci-dessous, rien d'autre.
const LAYOUT_COMPONENTS = {
  'piano-12': PianoLayout12,
  'grid-24': Grid24Layout,
  'grid-5': Grid5Layout,
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
// `tuningSystem` détermine le layout et les noms de notes affichés. Default
// '12-TET' pour rétro-compat des call-sites qui ne le passent pas encore.
//
// `compact` : variante plus petite pour Properties.
export function PianoKeyboard({
  tuningSystem = '12-TET',
  noteIndex,
  activeNotes,
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
  const names = sys.noteNames ?? NOTE_NAMES
  return (
    <Layout
      noteIndex={noteIndex}
      active={active}
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
