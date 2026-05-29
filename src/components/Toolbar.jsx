import BpmInput from './BpmInput'
import A4Input from './A4Input'
import XEdoInput from './XEdoInput'
import DurationButtons from './DurationButtons'
import { TUNING_SYSTEMS, X_EDO_MAX, X_EDO_MIN } from '../lib/tuningSystems'
import { STRINGS } from '../lib/strings'
import './Toolbar.css'

/**
 * Toolbar de l'onglet Composer.
 * Phase 3 : nouveau zoom H en %, zoom V (hauteur), sélecteur durée par défaut.
 * Phase 5 : +/- mesures. Phase 6 : undo/redo.
 */
function Toolbar({
  bpm,
  onSetBpm,
  a4Ref,
  onSetA4Ref,
  testTuningSystem,
  onSetTestTuningSystem,
  xEdoN,
  onSetXEdoN,
  hasSelection,
  hasClipboard,
  onCopy,
  onCut,
  onPasteFromButton,
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
          aria-label={isPlaying ? STRINGS.transport.stopAria : STRINGS.transport.playAria}
          data-anchor="composer-transport"
        >
          {isPlaying ? STRINGS.transport.stopLabel : STRINGS.transport.playLabel}
        </button>
        {isPlaying && (
          <span className="time-display">
            {currentTime.toFixed(1)}s / {totalDurationSec.toFixed(1)}s
          </span>
        )}
      </div>

      <div className="toolbar-section">
        <label className="bpm-control" title="Tempo (noires par minute) — flèches haut/bas pour ±1, +Shift pour ±10" data-anchor="composer-bpm">
          BPM
          <BpmInput value={bpm} onChange={onSetBpm} className="bpm-input" />
        </label>
        <label className="a4-control" title="Hauteur de référence A4 en Hz — flèches haut/bas pour ±1, +Shift pour ±5. Fourchette 380-480.">
          A4
          <A4Input value={a4Ref} onChange={onSetA4Ref} className="a4-input" />
          <span className="a4-unit">Hz</span>
        </label>
        {testTuningSystem !== undefined && (
          <label className="tuning-control" title={`Tempérament des nouveaux clips placés au clavier. Synchronisé avec le sélecteur de la ${STRINGS.tabs.designer}.`}>
            Tempérament
            <select
              className="tuning-select"
              value={testTuningSystem}
              onChange={(e) => onSetTestTuningSystem?.(e.target.value)}
            >
              {Object.values(TUNING_SYSTEMS).map((sys) => (
                <option key={sys.id} value={sys.id}>{sys.label}</option>
              ))}
            </select>
          </label>
        )}
        {testTuningSystem === 'x-edo' && typeof xEdoN === 'number' && (
          <label className="xedo-control" title={`Nombre de degrés du système X-EDO — flèches haut/bas pour ±1, +Shift pour ±5. Fourchette ${X_EDO_MIN}-${X_EDO_MAX}.`}>
            X
            <XEdoInput value={xEdoN} onChange={onSetXEdoN} className="xedo-input" />
          </label>
        )}
      </div>

      <div className="toolbar-section">
        <span className="duration-control-label" title="Durée des nouveaux clips déposés. Raccourcis 1-7 bases, 8-0 coefs.">
          Durée
        </span>
        <DurationButtons
          duration={defaultClipDuration}
          mode={durationMode}
          onChange={onSetDefaultClipDuration}
          dataAnchor="composer-duration-buttons"
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
          data-anchor="composer-copy-button"
        >
          Copier
        </button>
        <button
          type="button"
          className="toolbar-secondary"
          onClick={onCut}
          disabled={!hasSelection}
          title="Couper les clips sélectionnés (Ctrl+X)"
          data-anchor="composer-cut-button"
        >
          Couper
        </button>
        {/* iter-L phase-1.4.b : bouton Coller permanent (remplace l'ancien
            hint "Ctrl+V ou clic droit pour coller"). Sémantique du clic
            différente de Ctrl+V : colle après l'ancre halo si présente,
            sinon au début de la piste sélectionnée, sinon piste 0. */}
        <button
          type="button"
          className="toolbar-secondary"
          onClick={onPasteFromButton}
          disabled={!hasClipboard}
          title="Coller (Ctrl+V) — à la souris (Ctrl+V) ou ancre/piste sélectionnée (clic)"
          data-anchor="composer-paste-button"
        >
          Coller
        </button>
      </div>

      <div className="toolbar-section history-section">
        <button
          type="button"
          className="history-btn"
          onClick={onUndo}
          disabled={!canUndo}
          aria-label="Annuler"
          title="Annuler (Ctrl+Z)"
          data-anchor="global-undo-button-composer"
        >⟲</button>
        <button
          type="button"
          className="history-btn"
          onClick={onRedo}
          disabled={!canRedo}
          aria-label="Rétablir"
          title="Rétablir (Ctrl+Shift+Z)"
          data-anchor="global-redo-button-composer"
        >⟳</button>
      </div>

      <div className="toolbar-section toolbar-spacer">
        {typeof testOctave === 'number' && (
          <span
            className={`toolbar-octave${testOctave === 4 ? ' is-reference' : ''}`}
            title="Octave courante — PageUp/PageDown ±1"
            data-anchor="composer-octave-indicator"
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
          data-anchor="composer-export-button"
        >
          {isExporting ? STRINGS.transport.exportBusy : STRINGS.transport.exportIdle}
        </button>
      </div>
    </div>
  )
}

export default Toolbar
