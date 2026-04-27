import { useRef, useState } from 'react'
import { X_EDO_MAX, X_EDO_MIN } from '../lib/tuningSystems'

function clamp(v) {
  return Math.max(X_EDO_MIN, Math.min(X_EDO_MAX, v))
}

/**
 * Input X-EDO (nombre de degrés par octave) avec validation différée.
 * Pattern identique à BpmInput / A4Input — candidat à extraction en helper
 * `ValidatedIntegerInput` partagé maintenant qu'on a 3 inputs identiques
 * (cf. note F.2.2 dans CONTEXT). Pour F.8.3.2 on garde le triplet manuel,
 * l'extraction est un refactor à part.
 *
 * - Frappe libre (pas de clamp pendant la saisie).
 * - Commit au blur ou à Entrée : parse + clamp [X_EDO_MIN, X_EDO_MAX].
 *   Invalide → revert à la valeur d'entrée. Out-of-range → clamp.
 * - Échap : restaure la valeur d'AVANT focus, annule même les modifs flèches.
 * - ArrowUp/ArrowDown : ±1 (±5 avec Shift). Commit immédiat.
 */
function XEdoInput({ value, onChange, className }) {
  const [text, setText] = useState(String(value))
  const [focused, setFocused] = useState(false)
  const [lastSeenValue, setLastSeenValue] = useState(value)
  const preFocusValueRef = useRef(value)
  const skipBlurCommitRef = useRef(false)

  if (value !== lastSeenValue && !focused) {
    setLastSeenValue(value)
    setText(String(value))
  }

  const commit = (raw) => {
    const v = parseInt(raw, 10)
    if (!Number.isFinite(v)) {
      setText(String(value))
      return
    }
    const next = clamp(v)
    setText(String(next))
    if (next !== value) onChange(next)
  }

  const stepBy = (delta) => {
    const next = clamp(value + delta)
    setText(String(next))
    if (next !== value) onChange(next)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.target.blur()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      skipBlurCommitRef.current = true
      e.target.blur()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      stepBy(e.shiftKey ? 5 : 1)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      stepBy(e.shiftKey ? -5 : -1)
    }
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      spellCheck={false}
      className={className}
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
          setText(String(restored))
          if (value !== restored) onChange(restored)
          return
        }
        commit(text)
      }}
      onKeyDown={handleKeyDown}
    />
  )
}

export default XEdoInput
