import { useEffect, useRef, useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'

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
 *
 * Mode stepper (iter-O phase-1.1) — props optionnelles, comportement inchangé
 * si absentes :
 * - showSteppers (bool) : rend la colonne de chevrons `▴▾` à droite du champ et
 *   active la gestion clavier ↑/↓.
 * - step (number, défaut 1) : incrément d'un clic / d'une flèche.
 * - shiftStep (number, défaut 10) : incrément quand Shift est tenu.
 * Clic chevron = ±step (commit immédiat) ; appui maintenu = un cran tout de
 * suite puis auto-répétition accélérée après ~300 ms (120 ms → ×0.85 → 30 ms),
 * arrêt au relâchement / sortie / borne atteinte. Shift = shiftStep.
 *
 * Pas MULTIPLICATIFS (iter-T phase-4.3) — props optionnelles `stepFactor` /
 * `shiftFactor`. Quand `stepFactor` est fourni, le chevron ×/÷ le facteur au lieu
 * d'additionner `step` : indispensable sur une plage géométrique (cutoff 20–20 000
 * Hz, où un pas fixe est inutilisable). Pas musicaux suggérés : `stepFactor`
 * 2^(1/12) (un demi-ton), `shiftFactor` 2 (une octave). Saisie clavier libre
 * inchangée. Sans `stepFactor`, comportement additif strictement identique.
 */
function NumberInput({ value, onChange, min, max, parse, format, className, ariaLabel, disabled, showSteppers, step = 1, shiftStep = 10, stepFactor, shiftFactor }) {
  const fmt = format ?? String
  const parser = parse ?? defaultParse
  const [text, setText] = useState(fmt(value))
  const [focused, setFocused] = useState(false)
  const [lastSeenValue, setLastSeenValue] = useState(value)
  const preFocusValueRef = useRef(value)
  const skipBlurCommitRef = useRef(false)
  // Miroir synchrone de `value` : base des crans stepper, indépendante du
  // cycle async de React (l'auto-répétition tire ses délais d'un setTimeout
  // dont la closure capturerait sinon une `value` périmée).
  const liveValueRef = useRef(value)
  const repeatTimerRef = useRef(null)

  useEffect(() => { liveValueRef.current = value }, [value])

  // Cleanup du timer d'auto-répétition : à l'unmount ET sur un pointerup/cancel
  // global (relâchement hors du chevron — anticipe O.2 où le stepper voyage).
  useEffect(() => {
    const stop = () => {
      if (repeatTimerRef.current != null) {
        clearTimeout(repeatTimerRef.current)
        repeatTimerRef.current = null
      }
    }
    window.addEventListener('pointerup', stop)
    window.addEventListener('pointercancel', stop)
    return () => {
      window.removeEventListener('pointerup', stop)
      window.removeEventListener('pointercancel', stop)
      stop()
    }
  }, [])

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

  // Applique un cran clampé selon la direction (`dir` ±1) et l'état Shift. En mode
  // multiplicatif (`stepFactor`), le cran ×/÷ le facteur depuis la base courante
  // (recalculé à chaque tick → progression géométrique) ; sinon ±step additif.
  // Renvoie true si la valeur a bougé (false = borne atteinte → l'auto-répétition
  // s'arrête).
  const stepBy = (dir, shift) => {
    const base = liveValueRef.current
    let next
    if (stepFactor) {
      const factor = shift ? (shiftFactor ?? stepFactor) : stepFactor
      next = dir > 0 ? base * factor : base / factor
    } else {
      next = base + dir * (shift ? shiftStep : step)
    }
    next = clamp(next, min, max)
    if (next === base) return false
    liveValueRef.current = next
    setText(fmt(next))
    onChange(next)
    return true
  }

  const stopRepeat = () => {
    if (repeatTimerRef.current != null) {
      clearTimeout(repeatTimerRef.current)
      repeatTimerRef.current = null
    }
  }

  const startRepeat = (dir, shift) => {
    stepBy(dir, shift) // cran immédiat
    let interval = 120
    const tick = () => {
      if (!stepBy(dir, shift)) { stopRepeat(); return }
      repeatTimerRef.current = setTimeout(tick, interval)
      interval = Math.max(30, interval * 0.85)
    }
    repeatTimerRef.current = setTimeout(tick, 300) // délai avant l'accélération
  }

  const handleChevronDown = (e, dir) => {
    if (disabled) return
    e.preventDefault() // pas de vol de focus / sélection texte
    startRepeat(dir, e.shiftKey)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.target.blur()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      skipBlurCommitRef.current = true
      e.target.blur()
    } else if (showSteppers && !disabled && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault() // ne pas déplacer le curseur texte
      stepBy(e.key === 'ArrowUp' ? 1 : -1, e.shiftKey)
    }
  }

  const input = (
    <input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      spellCheck={false}
      className={className}
      aria-label={ariaLabel}
      disabled={disabled}
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

  if (!showSteppers) return input

  return (
    <span className="number-input-stepper">
      {input}
      <span className="number-input-steppers">
        <button
          type="button"
          className="number-input-stepper-btn"
          aria-label="Augmenter"
          tabIndex={-1}
          disabled={disabled}
          onPointerDown={(e) => handleChevronDown(e, 1)}
          onPointerLeave={stopRepeat}
          onPointerUp={stopRepeat}
          onContextMenu={(e) => e.preventDefault()}
        ><ChevronUp size={12} /></button>
        <button
          type="button"
          className="number-input-stepper-btn"
          aria-label="Diminuer"
          tabIndex={-1}
          disabled={disabled}
          onPointerDown={(e) => handleChevronDown(e, -1)}
          onPointerLeave={stopRepeat}
          onPointerUp={stopRepeat}
          onContextMenu={(e) => e.preventDefault()}
        ><ChevronDown size={12} /></button>
      </span>
    </span>
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
