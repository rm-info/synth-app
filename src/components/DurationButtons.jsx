import {
  DURATION_BASES,
  DURATION_COEFS,
  deriveBaseAndCoef,
  effectiveDuration,
  isValidCoef,
} from '../lib/durations'
import './DurationButtons.css'

// Boutons compacts : 7 bases (mutuellement exclusives) + 3 coefs
// (mutuellement exclusifs, un seul ou aucun actif). Remplace les
// dropdowns "Durée" du toolbar et du panneau Properties (E.6.1).
//
// Props :
// - duration: number — durée effective courante (ex: 1.5 pour noire pointée)
// - mode: 'solfège' | 'fraction' — affichage des labels
// - onChange(newDuration): appelé avec la nouvelle durée effective
// - disabled: bool — toute la rangée grisée
function DurationButtons({ duration, mode, onChange, disabled }) {
  const { base: activeBase, coef: activeCoef } = deriveBaseAndCoef(duration)
  const currentBase = activeBase ?? 1 // base de référence pour tester la validité

  const handleSelectBase = (newBase) => {
    if (disabled) return
    if (newBase === activeBase) return
    // Si le coef actif est invalide avec la nouvelle base, on le lâche.
    const keepCoef = activeCoef != null && isValidCoef(newBase, activeCoef)
      ? activeCoef
      : null
    onChange(effectiveDuration(newBase, keepCoef))
  }

  const handleToggleCoef = (targetCoef) => {
    if (disabled) return
    const base = activeBase ?? currentBase
    if (activeCoef === targetCoef) {
      // Toggle off → retour à la durée pure.
      onChange(effectiveDuration(base, null))
      return
    }
    if (!isValidCoef(base, targetCoef)) return // coef invalide sur cette base
    onChange(effectiveDuration(base, targetCoef))
  }

  const baseLabel = (b) => (mode === 'fraction' ? b.fraction : b.solfège)
  const coefLabel = (c) => (mode === 'fraction' ? c.fraction : c.solfège)

  const baseTitle = (b) => mode === 'fraction'
    ? `${b.fraction} (${b.name} ${b.solfège})`
    : `${b.name} (${b.fraction})`

  const coefTitle = (c) => mode === 'fraction'
    ? `${c.fraction} (${c.name})`
    : `${c.name} (${c.fraction})`

  return (
    <div className="duration-buttons" role="group" aria-label="Durée">
      <div className="duration-buttons-bases">
        {DURATION_BASES.map((b) => {
          const isActive = b.value === activeBase
          return (
            <button
              key={b.value}
              type="button"
              className={`dur-btn dur-btn-base${isActive ? ' is-active' : ''}`}
              onClick={() => handleSelectBase(b.value)}
              disabled={disabled}
              title={baseTitle(b)}
              aria-label={b.name}
              aria-pressed={isActive}
            >
              {baseLabel(b)}
            </button>
          )
        })}
      </div>
      <div className="duration-buttons-coefs">
        {DURATION_COEFS.map((c) => {
          const isActive = c.value === activeCoef
          const valid = isValidCoef(activeBase ?? currentBase, c.value)
          return (
            <button
              key={c.value}
              type="button"
              className={`dur-btn dur-btn-coef${isActive ? ' is-active' : ''}`}
              onClick={() => handleToggleCoef(c.value)}
              disabled={disabled || !valid}
              title={
                !valid
                  ? `${c.name} non applicable à cette durée`
                  : coefTitle(c)
              }
              aria-label={c.name}
              aria-pressed={isActive}
            >
              {coefLabel(c)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default DurationButtons
