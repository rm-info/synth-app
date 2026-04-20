import BpmInput from './BpmInput'
import DurationButtons from './DurationButtons'
import './Toolbar.css'

/**
 * Toolbar de l'onglet Composer.
 * Phase 3 : nouveau zoom H en %, zoom V (hauteur), sélecteur durée par défaut.
 * Phase 5 : +/- mesures. Phase 6 : undo/redo.
 */
function Toolbar({
  bpm,
  onSetBpm,
  hasSelection,
  hasClipboard,
  onCopy,
  onCut,
  isPlaying,
  hasClips,
  isExporting,
  onPlay,
  onStop,
  onClearTimeline,
  onExportWav,
  zoomH,
  onSetZoomH,
  onZoomHIn,
  onZoomHOut,
  zoomHMin,
  zoomHMax,
  trackHeight,
  onSetTrackHeight,
  trackHeightMin,
  trackHeightMax,
  defaultClipDuration,
  onSetDefaultClipDuration,
  durationMode,
  onToggleDurationMode,
  currentTime,
  totalDurationSec,
  composerFlash,
  pressedNoteLabel,
  testOctave,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
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
        <span className="duration-control-label" title="Durée des nouveaux clips déposés. Raccourcis 1-7 bases, 8-0 coefs.">
          Durée
        </span>
        <DurationButtons
          duration={defaultClipDuration}
          mode={durationMode}
          onChange={onSetDefaultClipDuration}
        />
        <button
          type="button"
          className="duration-mode-toggle"
          onClick={onToggleDurationMode}
          title={`Affichage : ${durationMode === 'solfège' ? 'solfège (♩)' : 'fraction (½)'}. Clic pour basculer.`}
          aria-label="Basculer mode d'affichage durée"
        >
          {durationMode === 'solfège' ? '♩' : '½'}
        </button>
      </div>

      <div className="toolbar-section zoom-h-section">
        <label className="zoom-label" title="Zoom horizontal">Zoom</label>
        <button
          type="button"
          className="zoom-step"
          onClick={onZoomHOut}
          disabled={zoomH <= zoomHMin}
          aria-label="Dézoomer"
        >−</button>
        <input
          type="range"
          min={zoomHMin}
          max={zoomHMax}
          step="0.1"
          value={zoomH}
          onChange={(e) => onSetZoomH(parseFloat(e.target.value))}
          className="zoom-slider"
          aria-label="Niveau de zoom horizontal"
        />
        <button
          type="button"
          className="zoom-step"
          onClick={onZoomHIn}
          disabled={zoomH >= zoomHMax}
          aria-label="Zoomer"
        >+</button>
        <span className="zoom-value">{zoomH < 10 ? zoomH.toFixed(1) : Math.round(zoomH)}%</span>
      </div>

      <div className="toolbar-section zoom-v-section">
        <label className="zoom-label" title="Hauteur des clips">Hauteur</label>
        <input
          type="range"
          min={trackHeightMin}
          max={trackHeightMax}
          step="1"
          value={trackHeight}
          onChange={(e) => onSetTrackHeight(parseInt(e.target.value, 10))}
          className="zoom-slider zoom-v-slider"
          aria-label="Hauteur de piste"
        />
        <span className="zoom-value">{trackHeight}px</span>
      </div>

      <div className="toolbar-section clipboard-section">
        <button
          type="button"
          className="toolbar-secondary"
          onClick={onCopy}
          disabled={!hasSelection}
          title="Copier les clips sélectionnés (Ctrl+C)"
        >
          Copier
        </button>
        <button
          type="button"
          className="toolbar-secondary"
          onClick={onCut}
          disabled={!hasSelection}
          title="Couper les clips sélectionnés (Ctrl+X)"
        >
          Couper
        </button>
        {hasClipboard && (
          <span className="clipboard-hint">Ctrl+V ou clic droit pour coller</span>
        )}
      </div>

      <div className="toolbar-section history-section">
        <button
          type="button"
          className="history-btn"
          onClick={onUndo}
          disabled={!canUndo}
          aria-label="Annuler"
          title="Annuler (Ctrl+Z)"
        >⟲</button>
        <button
          type="button"
          className="history-btn"
          onClick={onRedo}
          disabled={!canRedo}
          aria-label="Rétablir"
          title="Rétablir (Ctrl+Shift+Z)"
        >⟳</button>
      </div>

      <div className="toolbar-section toolbar-spacer">
        {typeof testOctave === 'number' && (
          <span
            className={`toolbar-octave${testOctave === 4 ? ' is-reference' : ''}`}
            title="Octave courante — Shift seul = +1, Ctrl seul = −1"
          >
            Octave : <strong>{testOctave}</strong>
          </span>
        )}
        {pressedNoteLabel && (
          <span className="toolbar-pressed-note" role="status" title="Note ciblée (touche maintenue)">
            ♪ {pressedNoteLabel}
          </span>
        )}
        {composerFlash && (
          <span className="toolbar-flash" role="status">{composerFlash}</span>
        )}
      </div>

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
