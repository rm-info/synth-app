import { useState, useEffect } from 'react'
import NumberInput from './NumberInput'
import { STRINGS } from '../lib/strings'
import { HARMONIC_N_MIN, HARMONIC_N_MAX } from '../reducer'
import './ConfirmDialog.css'
import './ConvertToHarmonicDialog.css'

function parseN(raw) {
  if (typeof raw !== 'string') return NaN
  const s = raw.trim()
  if (s === '') return NaN
  const v = parseInt(s, 10)
  return Number.isFinite(v) ? v : NaN
}

// iter-M phase-2.5 : dialog de la passerelle draw→harmonic. Choix de N (nombre
// d'harmoniques conservées) avant la DFT + troncature. Réutilise le visuel de
// ConfirmDialog. Escape annule ; pas de Enter→confirm (Enter valide le champ N).
// Monté/démonté par le parent (pas de prop `open`) → `n` repart à `defaultN`
// à chaque ouverture sans setState dans un effet.
export default function ConvertToHarmonicDialog({ defaultN, onConfirm, onCancel }) {
  const [n, setN] = useState(defaultN)

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
        <h4>{STRINGS.convert.toHarmonicTitle}</h4>
        <p className="confirm-dialog-message">{STRINGS.convert.toHarmonicBody}</p>
        <label className="convert-dialog-field">
          <span>{STRINGS.editor.harmonicCountTitle}</span>
          <NumberInput
            value={n}
            onChange={setN}
            min={HARMONIC_N_MIN}
            max={HARMONIC_N_MAX}
            parse={parseN}
            format={String}
            className="convert-dialog-n-input"
            ariaLabel={STRINGS.editor.harmonicCountTitle}
          />
        </label>
        <div className="confirm-dialog-actions">
          <button className="confirm-dialog-btn" onClick={onCancel}>{STRINGS.convert.cancel}</button>
          <button
            className="confirm-dialog-btn primary"
            onClick={() => onConfirm(n)}
            autoFocus
          >{STRINGS.convert.toHarmonicConfirm}</button>
        </div>
      </div>
    </>
  )
}
