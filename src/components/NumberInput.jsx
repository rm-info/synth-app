import { useRef, useState } from 'react'

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v))
}

/**
 * Input numérique éditable, généralisation du pattern FreqInput pour des
 * valeurs arbitraires (ms entières, pourcentages, etc.). Utilisé par les 5
 * sliders de l'enveloppe ADSR (F.3.11.2) et candidat pour Hold (F.3.12).
 *
 * Mécanique :
 * - Pendant la frappe : pas de validation, juste setText.
 * - Blur / Entrée : parse permissif (parseProp), clamp [min, max], format
 *   (formatProp). Si parseProp retourne NaN, on revient au dernier `value`.
 * - Échap : restaure preFocusValueRef (capté au focus-in), skip le commit
 *   du blur via un flag.
 * - Sync externe (slider qui bouge) : si value prop change et qu'on n'a
 *   pas le focus, on re-formate dans le text via comparison render-time.
 *
 * Props :
 * - value (number) : valeur courante (model truth).
 * - onChange (number) : callback au commit (déjà clampé/arrondi).
 * - min, max : bornes du clamp.
 * - parse (string → number|NaN) : parser custom (ex. lit "75%" → 75).
 *   Défaut : parseFloat permissif (virgule = point, espaces ignorés).
 * - format (number → string) : formatter custom (ex. "75%"). Défaut : String.
 */
function NumberInput({ value, onChange, min, max, parse, format, className, ariaLabel }) {
  const fmt = format ?? String
  const parser = parse ?? defaultParse
  const [text, setText] = useState(fmt(value))
  const [focused, setFocused] = useState(false)
  const [lastSeenValue, setLastSeenValue] = useState(value)
  const preFocusValueRef = useRef(value)
  const skipBlurCommitRef = useRef(false)

  if (value !== lastSeenValue && !focused) {
    setLastSeenValue(value)
    setText(fmt(value))
  }

  const commit = (raw) => {
    const v = parser(raw)
    if (!Number.isFinite(v)) {
      setText(fmt(value))
      return
    }
    const clamped = clamp(v, min, max)
    setText(fmt(clamped))
    if (clamped !== value) onChange(clamped)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.target.blur()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      skipBlurCommitRef.current = true
      e.target.blur()
    }
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      spellCheck={false}
      className={className}
      aria-label={ariaLabel}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onFocus={(e) => {
        setFocused(true)
        preFocusValueRef.current = value
        e.target.select()
      }}
      onBlur={() => {
        setFocused(false)
        if (skipBlurCommitRef.current) {
          skipBlurCommitRef.current = false
          const restored = preFocusValueRef.current
          setText(fmt(restored))
          if (value !== restored) onChange(restored)
          return
        }
        commit(text)
      }}
      onKeyDown={handleKeyDown}
    />
  )
}

function defaultParse(raw) {
  if (typeof raw !== 'string') return NaN
  const s = raw.trim().replace(',', '.')
  if (s === '') return NaN
  const v = parseFloat(s)
  return Number.isFinite(v) ? v : NaN
}

export default NumberInput
