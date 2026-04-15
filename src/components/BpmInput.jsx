import { useEffect, useState } from 'react'

const MIN_BPM = 60
const MAX_BPM = 240

function clamp(v) {
  return Math.max(MIN_BPM, Math.min(MAX_BPM, v))
}

/**
 * Input BPM avec validation différée :
 * - Frappe libre (pas de clamp pendant la saisie).
 * - Commit au blur ou à Entrée : parse + clamp [60,240]. Si invalide / vide,
 *   revient à la dernière valeur valide.
 * - Échap : annule la saisie et revient à la valeur courante.
 * - ArrowUp/ArrowDown : ±1 (±10 si Shift). Commit immédiat.
 */
function BpmInput({ value, onChange, className }) {
  const [text, setText] = useState(String(value))
  const [focused, setFocused] = useState(false)

  // Re-sync depuis l'extérieur seulement quand pas en train d'éditer.
  useEffect(() => {
    if (!focused) setText(String(value))
  }, [value, focused])

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
      setText(String(value))
      e.target.blur()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      stepBy(e.shiftKey ? 10 : 1)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      stepBy(e.shiftKey ? -10 : -1)
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
        e.target.select()
      }}
      onBlur={() => {
        setFocused(false)
        commit(text)
      }}
      onKeyDown={handleKeyDown}
    />
  )
}

export default BpmInput
