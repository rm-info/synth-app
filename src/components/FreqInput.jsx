import { useRef, useState } from 'react'

const DEFAULT_MIN = 20
const DEFAULT_MAX = 20000

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v))
}

// Arrondi à 1 décimale. Si la partie décimale est nulle, on tombe sur un
// entier propre — c'est la forme d'affichage choisie par la spec 3.7.
function roundFreq(hz) {
  return Math.round(hz * 10) / 10
}

function formatFreq(hz) {
  const r = roundFreq(hz)
  if (Number.isInteger(r)) return String(r)
  return r.toFixed(1)
}

// Parse permissif :
//   - suffixe "Hz" (insensible à la casse) optionnel
//   - virgule ou point comme séparateur décimal
//   - espaces ignorés
function parseFreq(raw) {
  if (typeof raw !== 'string') return NaN
  let s = raw.trim().toLowerCase()
  s = s.replace(/\s*hz\s*$/, '').trim()
  s = s.replace(',', '.')
  if (s === '') return NaN
  const v = parseFloat(s)
  return Number.isFinite(v) ? v : NaN
}

/**
 * Input éditable pour la fréquence libre. Modèle BpmInput (validation
 * différée, Échap annule, re-sync depuis props quand pas focus).
 *
 * - Pendant la frappe : pas de validation ni de clamp.
 * - Blur / Entrée : parse + clamp [min,max], arrondi à 1 décimale.
 *   Si invalide : revient à la dernière valeur valide.
 * - Échap : restaure la valeur d'AVANT le focus (capture au focus-in via
 *   preFocusValueRef + flag skipBlurCommitRef que onBlur consulte pour
 *   skip la validation).
 * - Synchro avec le slider (parent) : quand value prop change et que l'input
 *   n'est pas focus, on re-formate dans le text (pattern React officiel
 *   "setState in render via comparison").
 */
function FreqInput({ value, onChange, min = DEFAULT_MIN, max = DEFAULT_MAX, className }) {
  const [text, setText] = useState(formatFreq(value))
  const [focused, setFocused] = useState(false)
  const [lastSeenValue, setLastSeenValue] = useState(value)
  const preFocusValueRef = useRef(value)
  const skipBlurCommitRef = useRef(false)

  if (value !== lastSeenValue && !focused) {
    setLastSeenValue(value)
    setText(formatFreq(value))
  }

  const commit = (raw) => {
    const v = parseFreq(raw)
    if (!Number.isFinite(v)) {
      setText(formatFreq(value))
      return
    }
    const clamped = clamp(v, min, max)
    const rounded = roundFreq(clamped)
    setText(formatFreq(rounded))
    if (rounded !== value) onChange(rounded)
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
          setText(formatFreq(restored))
          if (value !== restored) onChange(restored)
          return
        }
        commit(text)
      }}
      onKeyDown={handleKeyDown}
    />
  )
}

export default FreqInput
