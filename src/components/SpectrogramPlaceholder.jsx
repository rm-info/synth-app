import './SpectrogramPlaceholder.css'

/**
 * Placeholder pour le spectrogramme. Implémentation réelle prévue en
 * itération B. Le toggle on/off est désormais dans le header de la zone
 * Waveform (phase 3.6), pour rester accessible même quand la zone
 * Spectrogramme est masquée.
 */
function SpectrogramPlaceholder() {
  return (
    <div className="spectrogram-placeholder">
      <header className="spectrogram-header">
        <h3>Spectrogramme</h3>
      </header>
      <div className="spectrogram-canvas-area">
        <span className="spectrogram-placeholder-text">
          Spectrogramme (à venir)
        </span>
      </div>
    </div>
  )
}

export default SpectrogramPlaceholder
