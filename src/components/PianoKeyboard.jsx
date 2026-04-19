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

// `compact` : variante plus petite (Properties). Pas de labels sur les touches.
export function PianoKeyboard({ noteIndex, onSelectNote, compact = false }) {
  const className = `piano-keyboard${compact ? ' piano-keyboard-compact' : ''}`
  return (
    <div className={className} role="group" aria-label="Clavier piano">
      <div className="piano-whites">
        {WHITE_KEYS.map((idx) => (
          <button
            key={idx}
            type="button"
            className={`piano-key piano-key-white${noteIndex === idx ? ' is-active' : ''}`}
            onClick={() => onSelectNote(idx)}
            aria-label={NOTE_NAMES[idx]}
            aria-pressed={noteIndex === idx}
            title={compact ? NOTE_NAMES[idx] : undefined}
          >
            {!compact && <span className="piano-key-label">{NOTE_NAMES[idx]}</span>}
          </button>
        ))}
      </div>
      <div className="piano-blacks">
        {BLACK_KEYS.map(({ note, afterWhite }) => (
          <button
            key={note}
            type="button"
            className={`piano-key piano-key-black${noteIndex === note ? ' is-active' : ''}`}
            style={{ left: `${((afterWhite + 1) / WHITE_KEYS.length) * 100}%` }}
            onClick={() => onSelectNote(note)}
            title={NOTE_NAMES[note]}
            aria-label={NOTE_NAMES[note]}
            aria-pressed={noteIndex === note}
          />
        ))}
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
