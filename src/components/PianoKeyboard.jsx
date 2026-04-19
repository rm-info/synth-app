import { useRef } from 'react'
import { NOTE_NAMES } from '../lib/clipNote'
import './PianoKeyboard.css'

export { NOTE_NAMES }

// Clavier piano : 7 touches blanches (diatoniques), 5 touches noires (altérées).
// Les touches noires se placent entre deux blanches ; rien entre E-F et B-C
// (demi-tons diatoniques). `afterWhite` = index (0-based) de la blanche qui
// précède la noire dans le rang des 7 blanches.
const WHITE_KEYS = [0, 2, 4, 5, 7, 9, 11] // C D E F G A B
const BLACK_KEYS = [
  { note: 1,  afterWhite: 0 }, // C♯ entre C et D
  { note: 3,  afterWhite: 1 }, // D♯ entre D et E
  { note: 6,  afterWhite: 3 }, // F♯ entre F et G
  { note: 8,  afterWhite: 4 }, // G♯ entre G et A
  { note: 10, afterWhite: 5 }, // A♯ entre A et B
]

const OCTAVES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
const REFERENCE_OCTAVE = 4

// Deux modes d'interaction :
//
//  1. **Sélection** (Properties) : onSelectNote(idx) — fired at mousedown, pas
//     de release. Utilisé pour mettre à jour une valeur dans le state.
//
//  2. **Instrument** (Designer E.3) : onKeyPress(idx) + onKeyRelease(idx).
//     onKeyPress est déclenché au mousedown, onKeyRelease sur le mouseup
//     window-level (option B du brief : tenir la note tant que la souris
//     n'est pas relâchée, même si elle quitte la touche).
//
// `activeNotes` (Set<number>) colore en permanence les touches dont la note
// est actuellement jouée (sert au feedback visuel pendant un sustain).
//
// `compact` : variante plus petite pour Properties.
export function PianoKeyboard({
  noteIndex,
  activeNotes,
  onSelectNote,
  onKeyPress,
  onKeyRelease,
  compact = false,
}) {
  // Notes déjà "pressées" côté souris dans cette instance de clavier — évite
  // d'enregistrer deux listeners window pour le même mousedown répété.
  const pressedRef = useRef(new Set())
  const active = activeNotes ?? new Set()

  const handleMouseDown = (idx) => (e) => {
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

  const className = `piano-keyboard${compact ? ' piano-keyboard-compact' : ''}`
  return (
    <div className={className} role="group" aria-label="Clavier piano">
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
              aria-label={NOTE_NAMES[idx]}
              aria-pressed={noteIndex === idx}
              title={compact ? NOTE_NAMES[idx] : undefined}
            >
              {!compact && <span className="piano-key-label">{NOTE_NAMES[idx]}</span>}
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
              title={NOTE_NAMES[note]}
              aria-label={NOTE_NAMES[note]}
              aria-pressed={noteIndex === note}
            />
          )
        })}
      </div>
    </div>
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
