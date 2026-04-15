import { useRef, useState } from 'react'

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
 * - Échap : annule la saisie ET toute modif faite pendant le focus (via
 *   flèches), revient à la valeur d'AVANT le focus. Le blur qui suit Échap
 *   ne déclenche PAS de validation (flag `skipBlurCommit`), sinon Échap
 *   finirait par clamp/valider ce qu'on voulait justement annuler.
 * - ArrowUp/ArrowDown : ±1 (±10 si Shift). Commit immédiat (visible par
 *   l'utilisateur, Échap peut encore tout annuler).
 */
function BpmInput({ value, onChange, className }) {
  const [text, setText] = useState(String(value))
  const [focused, setFocused] = useState(false)
  const [lastSeenValue, setLastSeenValue] = useState(value)
  // Valeur au moment du focus-in. Cible du restore sur Échap.
  const preFocusValueRef = useRef(value)
  // Quand true, le prochain onBlur ne valide pas et restaure preFocusValue.
  const skipBlurCommitRef = useRef(false)

  // Sync depuis l'extérieur via comparaison en render (pattern React officiel)
  // — uniquement quand l'utilisateur n'est pas focus, pour ne pas écraser sa saisie.
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

export default BpmInput
