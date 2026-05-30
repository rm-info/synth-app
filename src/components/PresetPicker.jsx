import { useEffect } from 'react'
import { STRINGS } from '../lib/strings'
import { TIMBRE_PRESETS, PRESET_CATEGORIES } from '../lib/presets'
import './PresetPicker.css'

// iter-M phase-4 : picker de presets de timbre. Liste la bibliothèque
// code-only groupée par catégorie (nom + description en ligne). Le clic sur un
// preset délègue au parent (qui gère le garde-fou dirty + dispatch LOAD_PRESET).
// Monté/démonté par le parent (pas de prop `open`). Escape ferme.
export default function PresetPicker({ onPick, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose?.() }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [onClose])

  return (
    <>
      <div className="preset-picker-backdrop" onClick={onClose} />
      <div className="preset-picker" role="dialog" aria-label={STRINGS.timbrePresets.pickerTitle}>
        <header className="preset-picker-header">
          <h4>{STRINGS.timbrePresets.pickerTitle}</h4>
          <button
            type="button"
            className="preset-picker-close"
            onClick={onClose}
            aria-label="Fermer"
          >×</button>
        </header>
        <div className="preset-picker-body">
          {PRESET_CATEGORIES.map((cat) => (
            <section key={cat.id} className="preset-picker-group">
              <h5 className="preset-picker-group-title">{cat.label}</h5>
              <ul className="preset-picker-list">
                {TIMBRE_PRESETS.filter((p) => p.category === cat.id).map((preset) => (
                  <li key={preset.id}>
                    <button
                      type="button"
                      className="preset-picker-item"
                      onClick={() => onPick(preset)}
                      title={preset.description}
                    >
                      <span className="preset-picker-name">{preset.name}</span>
                      {preset.description && (
                        <span className="preset-picker-desc">{preset.description}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </>
  )
}
