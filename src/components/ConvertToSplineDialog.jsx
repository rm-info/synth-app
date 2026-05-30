import { useState, useEffect } from 'react'
import NumberInput from './NumberInput'
import { STRINGS } from '../lib/strings'
import { SPLINE_ANCHOR_MIN, SPLINE_ANCHOR_MAX } from '../reducer'
import './ConfirmDialog.css'
import './ConvertToHarmonicDialog.css'
import './SplineEditor.css'

function parseCount(raw) {
  if (typeof raw !== 'string') return NaN
  const s = raw.trim()
  if (s === '') return NaN
  const v = parseInt(s, 10)
  return Number.isFinite(v) ? v : NaN
}

// iter-M phase-3 : dialog de la passerelle draw/harmonic → spline. Choix du
// nombre d'ancres + du type d'interpolation avant l'échantillonnage. Réutilise
// le visuel de ConfirmDialog + le toggle de SplineEditor. Escape annule ;
// monté/démonté par le parent (l'état repart aux défauts à chaque ouverture).
export default function ConvertToSplineDialog({ defaultCount, defaultInterpolation, onConfirm, onCancel }) {
  const [count, setCount] = useState(defaultCount)
  const [interp, setInterp] = useState(defaultInterpolation === 'hard' ? 'hard' : 'soft')

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onCancel?.() }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [onCancel])

  return (
    <>
      <div className="confirm-dialog-backdrop" onClick={onCancel} />
      <div className="confirm-dialog">
        <h4>{STRINGS.convert.toSplineTitle}</h4>
        <p className="confirm-dialog-message">{STRINGS.convert.toSplineBody}</p>
        <label className="convert-dialog-field">
          <span>{STRINGS.convert.anchorCount}</span>
          <NumberInput
            value={count}
            onChange={setCount}
            min={SPLINE_ANCHOR_MIN}
            max={SPLINE_ANCHOR_MAX}
            parse={parseCount}
            format={String}
            className="convert-dialog-n-input"
            ariaLabel={STRINGS.convert.anchorCount}
          />
        </label>
        <div className="convert-dialog-field">
          <span>{STRINGS.editor.splineInterpolation}</span>
          <div className="spline-interp-toggle" role="group" aria-label={STRINGS.editor.splineInterpolation}>
            <button
              type="button"
              className={`spline-interp-btn${interp !== 'hard' ? ' is-active' : ''}`}
              onClick={() => setInterp('soft')}
              aria-pressed={interp !== 'hard'}
            >{STRINGS.editor.splineSoft}</button>
            <button
              type="button"
              className={`spline-interp-btn${interp === 'hard' ? ' is-active' : ''}`}
              onClick={() => setInterp('hard')}
              aria-pressed={interp === 'hard'}
            >{STRINGS.editor.splineHard}</button>
          </div>
        </div>
        <div className="confirm-dialog-actions">
          <button className="confirm-dialog-btn" onClick={onCancel}>{STRINGS.convert.cancel}</button>
          <button
            className="confirm-dialog-btn primary"
            onClick={() => onConfirm(count, interp)}
            autoFocus
          >{STRINGS.convert.toSplineConfirm}</button>
        </div>
      </div>
    </>
  )
}
