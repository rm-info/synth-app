import { useState } from 'react'
import './SpectrogramPlaceholder.css'

/**
 * Placeholder pour le spectrogramme. Toggle non fonctionnel (UX seulement).
 * Implémentation réelle prévue en itération B.
 */
function SpectrogramPlaceholder() {
  const [enabled, setEnabled] = useState(true)

  return (
    <div className="spectrogram-placeholder">
      <header className="spectrogram-header">
        <h3>Spectrogramme</h3>
        <label className="spectrogram-toggle">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          <span>{enabled ? 'On' : 'Off'}</span>
        </label>
      </header>
      <div className={`spectrogram-canvas-area ${enabled ? '' : 'is-off'}`}>
        <span className="spectrogram-placeholder-text">
          Spectrogramme (à venir)
        </span>
      </div>
    </div>
  )
}

export default SpectrogramPlaceholder
