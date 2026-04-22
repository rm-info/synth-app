import { useRef, useState } from 'react'

// Fourchette : couvre les diapasons historiques standards avec marge.
// Baroque Versailles ~392, baroque standard ~415, XIXe français ~435,
// moderne 440, orchestres contemporains 442-444. Bornes larges pour
// laisser explorer (e.g. "A=450" pour courbes pédagogiques).
const MIN_A4 = 380
const MAX_A4 = 480

function clamp(v) {
  return Math.max(MIN_A4, Math.min(MAX_A4, v))
}

/**
 * Input A4 (hauteur de référence, en Hz entiers) avec validation différée.
 * Pattern identique à BpmInput (F.2.2 — candidat à extraction en helper
 * ValidatedIntegerInput si un 3e input similaire apparaît) :
 * - Frappe libre (pas de clamp pendant la saisie).
 * - Commit au blur ou à Entrée : parse + clamp [380, 480]. Invalide → revert.
 * - Échap : restaure la valeur d'AVANT focus, annule même les modifs flèches.
 * - ArrowUp/ArrowDown : ±1 (±5 avec Shift). Commit immédiat.
 */
function A4Input({ value, onChange, className }) {
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

export default A4Input
