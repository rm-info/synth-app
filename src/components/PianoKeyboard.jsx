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

// Clavier 24 notes en grille 4 rangées × 14 colonnes (chaque naturelle occupe
// 2 colonnes, les altérations s'insèrent entre — d'où la grille à 14 colonnes
// pour un placement précis au demi-pas).
//
// Layout (col 1..14) :
//   r1 : ─── C♯  D♯ ─── ─── F♯  G♯  A♯ ───        (dièses pleins)
//   r2 : C↑  D↑  E↑  F↑  G↑  A↑  B↑               (demi-dièses)
//   r3 : C   D   E   F   G   A   B                (naturelles)
//   r4 : ─── D↓  E↓ ─── ─── G↓  A↓  B↓ ───        (demi-bémols)
//
// Les rangées 1 et 4 ont des trous à col 6-7 (Mi/Si — pas d'enharmonie F♭ ou
// E♯) et col 14 (Si — pas de B♯). C'est l'absence visuelle qui matérialise
// l'enharmonie Mi♯=Fa et Si♯=Do.
const GRID_24_CELLS = [
  // [noteIndex, gridRow, gridColumnStart, rowKind]
  // rowKind ∈ 'sharp' (rangée 1), 'half' (rangées 2 et 4), 'natural' (rangée 3)
  [2,  1,  3, 'sharp'],   // C♯
  [6,  1,  5, 'sharp'],   // D♯
  [12, 1,  9, 'sharp'],   // F♯
  [16, 1, 11, 'sharp'],   // G♯
  [20, 1, 13, 'sharp'],   // A♯
  [1,  2,  1, 'half'],    // C↑
  [5,  2,  3, 'half'],    // D↑
  [9,  2,  5, 'half'],    // E↑
  [11, 2,  7, 'half'],    // F↑
  [15, 2,  9, 'half'],    // G↑
  [19, 2, 11, 'half'],    // A↑
  [23, 2, 13, 'half'],    // B↑
  [0,  3,  1, 'natural'], // C
  [4,  3,  3, 'natural'], // D
  [8,  3,  5, 'natural'], // E
  [10, 3,  7, 'natural'], // F
  [14, 3,  9, 'natural'], // G
  [18, 3, 11, 'natural'], // A
  [22, 3, 13, 'natural'], // B
  [3,  4,  3, 'half'],    // D↓
  [7,  4,  5, 'half'],    // E↓
  [13, 4,  9, 'half'],    // G↓
  [17, 4, 11, 'half'],    // A↓
  [21, 4, 13, 'half'],    // B↓
]

function Grid24Layout({ noteIndex, active, compact, names, handleMouseDown }) {
  return (
    <div className={`piano-keyboard piano-keyboard-grid24${compact ? ' piano-keyboard-compact' : ''}`} role="group" aria-label="Clavier 24-TET">
      {GRID_24_CELLS.map(([idx, row, col, kind]) => {
        const classes = ['grid24-key', `grid24-key-${kind}`]
        if (noteIndex === idx) classes.push('is-active')
        if (active.has(idx)) classes.push('is-playing')
        const label = names?.[idx] ?? ''
        return (
          <button
            key={idx}
            type="button"
            className={classes.join(' ')}
            style={{ gridRow: row, gridColumn: `${col} / span 2` }}
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

// Dispatcher : chaque tempérament déclare son `layout`, on cherche le composant
// correspondant ici. Pour ajouter un grid-N (5-TET, 31-EDO, …) : déclarer
// l'entrée registre + ajouter le composant ci-dessous, rien d'autre.
const LAYOUT_COMPONENTS = {
  'piano-12': PianoLayout12,
  'grid-24': Grid24Layout,
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
