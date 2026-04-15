import BpmInput from './BpmInput'
import './Toolbar.css'

/**
 * Toolbar de l'onglet Composer.
 * Phase 2 : transport + BPM + clear + export + zoom existant.
 * Phases ultérieures : BPM input refondu (phase 3), zoom % continu (phase 3),
 * +/- mesures (phase 5), undo/redo (phase 6).
 */
function Toolbar({
  bpm,
  onSetBpm,
  isPlaying,
  hasClips,
  isExporting,
  onPlay,
  onStop,
  onClearTimeline,
  onExportWav,
  measureWidth,
  onZoomIn,
  onZoomOut,
  zoomMin,
  zoomMax,
  currentTime,
  totalDurationSec,
}) {
  return (
    <div className="toolbar">
      <div className="toolbar-section transport">
        <button
          type="button"
          className={`transport-btn ${isPlaying ? 'playing' : ''}`}
          onClick={isPlaying ? onStop : onPlay}
          disabled={!hasClips}
          aria-label={isPlaying ? 'Stop' : 'Play'}
        >
          {isPlaying ? '■ Stop' : '▶ Play'}
        </button>
        {isPlaying && (
          <span className="time-display">
            {currentTime.toFixed(1)}s / {totalDurationSec.toFixed(1)}s
          </span>
        )}
      </div>

      <div className="toolbar-section">
        <label className="bpm-control" title="Tempo (noires par minute) — flèches haut/bas pour ±1, +Shift pour ±10">
          BPM
          <BpmInput value={bpm} onChange={onSetBpm} className="bpm-input" />
        </label>
      </div>

      <div className="toolbar-section">
        <div className="zoom-controls" title="Zoom">
          <button onClick={onZoomOut} disabled={measureWidth <= zoomMin} aria-label="Dézoomer">−</button>
          <span className="zoom-value">{measureWidth}px</span>
          <button onClick={onZoomIn} disabled={measureWidth >= zoomMax} aria-label="Zoomer">+</button>
        </div>
      </div>

      <div className="toolbar-section toolbar-spacer" />

      <div className="toolbar-section">
        <button
          type="button"
          className="toolbar-secondary"
          onClick={onClearTimeline}
          disabled={!hasClips}
        >
          Effacer la timeline
        </button>
        <button
          type="button"
          className="toolbar-export"
          onClick={onExportWav}
          disabled={!hasClips || isExporting}
        >
          {isExporting ? 'Export…' : 'Exporter WAV'}
        </button>
      </div>
    </div>
  )
}

export default Toolbar
