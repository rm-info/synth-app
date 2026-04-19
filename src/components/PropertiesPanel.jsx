import { useState } from 'react'
import { BEATS_PER_MEASURE } from '../reducer'
import {
  layoutClips,
  computeBounds,
  MIN_CLIP_DURATION,
} from '../lib/timelineLayout'
import { formatClipNote } from '../lib/clipNote'
import { durationName } from '../lib/durations'
import { PianoKeyboard, OctaveSelector } from './PianoKeyboard'
import FreqInput from './FreqInput'
import DurationButtons from './DurationButtons'
import './PropertiesPanel.css'

const FREE_FREQ_MIN = 16
const FREE_FREQ_MAX = 32768

// Comparaison stricte de hauteur : même tuningSystem ET mêmes coordonnées.
function sameClipPitch(a, b) {
  if (a.tuningSystem !== b.tuningSystem) return false
  if (a.tuningSystem === 'free') return a.frequency === b.frequency
  return a.noteIndex === b.noteIndex && a.octave === b.octave
}

/**
 * Panneau Properties (Composer). Trois modes :
 *  - vide : placeholder
 *  - mono (1 clip) : édition complète (patch + note + durée)
 *  - multi (>1 clips) : patch (si homogène), note (si homogène),
 *    durée (si homogène), bouton supprimer la sélection.
 */
function PropertiesPanel({
  selectedClipIds,
  clips,
  patches,
  tracks,
  numMeasures,
  durationMode,
  onUpdateClip,
  onRemoveClip,
  onUpdateClipsPatch,
  onUpdateClipsDuration,
  onUpdateClipsPitch,
  onDeleteSelected,
  mergeStatus,
  onMergeClips,
  canSplit2,
  canSplit3,
  onSplitClips,
}) {
  const [collapsed, setCollapsed] = useState(false)
  const count = selectedClipIds.length
  const selectedClips = clips.filter((c) => selectedClipIds.includes(c.id))
  const mono = count === 1 ? selectedClips[0] ?? null : null

  return (
    <aside className={`properties-panel ${collapsed ? 'collapsed' : ''}`}>
      <header className="properties-header">
        <h3>
          Propriétés
          {count > 1 && <span className="properties-badge">{count}</span>}
        </h3>
        <button
          type="button"
          className="properties-toggle"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? 'Déployer' : 'Réduire'}
          title={collapsed ? 'Déployer' : 'Réduire'}
        >
          {collapsed ? '▴' : '▾'}
        </button>
      </header>
      {!collapsed && (
        <div className="properties-body">
          {count === 0 && (
            <p className="properties-empty">
              Sélectionnez un clip pour afficher ses propriétés.
            </p>
          )}
          {count > 1 && (
            <MultiClipEditor
              selectedClips={selectedClips}
              clips={clips}
              patches={patches}
              tracks={tracks}
              numMeasures={numMeasures}
              durationMode={durationMode}
              onUpdateClipsPatch={onUpdateClipsPatch}
              onUpdateClipsDuration={onUpdateClipsDuration}
              onUpdateClipsPitch={onUpdateClipsPitch}
              onDeleteSelected={onDeleteSelected}
              mergeStatus={mergeStatus}
              onMergeClips={onMergeClips}
              canSplit2={canSplit2}
              canSplit3={canSplit3}
              onSplitClips={onSplitClips}
            />
          )}
          {count === 1 && mono && (
            <ClipEditor
              clip={mono}
              patches={patches}
              tracks={tracks}
              durationMode={durationMode}
              onUpdateClip={onUpdateClip}
              onUpdateClipsPitch={onUpdateClipsPitch}
              onRemoveClip={onRemoveClip}
              canSplit2={canSplit2}
              canSplit3={canSplit3}
              onSplitClips={onSplitClips}
            />
          )}
        </div>
      )}
    </aside>
  )
}

// Éditeur de hauteur : mini-clavier + octave en 12-TET, FreqInput en Libre.
// `clipIds` est un tableau — utilisé aussi bien pour mono (1 élément) que
// pour multi homogène (N éléments) afin que l'action propage à tous les clips.
function NoteEditor({ clipIds, tuningSystem, noteIndex, octave, frequency, onUpdateClipsPitch }) {
  const isFree = tuningSystem === 'free'

  const applyNote = (newNoteIndex) => {
    onUpdateClipsPitch?.(clipIds.map((id) => ({ id, noteIndex: newNoteIndex })))
  }
  const applyOctave = (newOctave) => {
    onUpdateClipsPitch?.(clipIds.map((id) => ({ id, octave: newOctave })))
  }
  const applyFrequency = (hz) => {
    onUpdateClipsPitch?.(clipIds.map((id) => ({ id, frequency: hz })))
  }

  if (isFree) {
    return (
      <div className="note-editor">
        <div className="note-editor-free">
          <FreqInput
            value={frequency ?? 440}
            onChange={applyFrequency}
            min={FREE_FREQ_MIN}
            max={FREE_FREQ_MAX}
            className="freq-input"
          />
          <span className="note-editor-unit">Hz</span>
        </div>
      </div>
    )
  }

  const midi = (octave + 1) * 12 + noteIndex
  const displayFreq = 440 * Math.pow(2, (midi - 69) / 12)

  return (
    <div className="note-editor">
      <PianoKeyboard compact noteIndex={noteIndex} onSelectNote={applyNote} />
      <OctaveSelector compact octave={octave} onSelectOctave={applyOctave} />
      <div className="note-editor-display">
        <strong>{formatClipNote({ tuningSystem: '12-TET', noteIndex, octave })}</strong>
        <span className="note-editor-hz"> — {displayFreq.toFixed(1)} Hz</span>
      </div>
    </div>
  )
}

function ClipEditor({ clip, patches, tracks, durationMode, onUpdateClip, onUpdateClipsPitch, onRemoveClip, canSplit2, canSplit3, onSplitClips }) {
  const currentPatch = patches.find((p) => p.id === clip.patchId)
  const clipTrack = tracks?.find(t => t.id === clip.trackId)

  return (
    <div className="clip-editor">
      <label className="field">
        <span className="field-label">Patch</span>
        <div className="sound-select-wrapper">
          {currentPatch && (
            <span
              className="sound-dot"
              style={{ backgroundColor: currentPatch.color }}
              aria-hidden="true"
            />
          )}
          <select
            className="field-input"
            value={clip.patchId}
            onChange={(e) => onUpdateClip(clip.id, { patchId: e.target.value })}
          >
            {patches.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </label>

      <div className="field field-note">
        <span className="field-label">Note</span>
        <NoteEditor
          clipIds={[clip.id]}
          tuningSystem={clip.tuningSystem}
          noteIndex={clip.noteIndex}
          octave={clip.octave}
          frequency={clip.frequency}
          onUpdateClipsPitch={onUpdateClipsPitch}
        />
      </div>

      <div className="field">
        <span className="field-label">Position</span>
        <span className="field-readonly">
          Mesure {clip.measure}, beat {formatBeat(clip.beat)}
        </span>
      </div>

      {clipTrack && (
        <div className="field">
          <span className="field-label">Piste</span>
          <span className="field-readonly">{clipTrack.name}</span>
        </div>
      )}

      <div className="field field-duration">
        <span className="field-label">Durée ({durationName(clip.duration, durationMode)})</span>
        <DurationButtons
          duration={clip.duration}
          mode={durationMode}
          onChange={(d) => onUpdateClip(clip.id, { duration: d })}
        />
      </div>

      <div className="split-buttons">
        <button
          type="button"
          className="clip-split-btn"
          onClick={() => onSplitClips?.(2)}
          disabled={!canSplit2}
          title={canSplit2 ? 'Diviser par 2 (Ctrl+D)' : 'Durée non divisible par 2'}
        >
          ÷2
        </button>
        <button
          type="button"
          className="clip-split-btn"
          onClick={() => onSplitClips?.(3)}
          disabled={!canSplit3}
          title={canSplit3 ? 'Diviser par 3 (Ctrl+Shift+D)' : 'Durée non divisible par 3'}
        >
          ÷3
        </button>
      </div>

      <button
        type="button"
        className="clip-delete-btn"
        onClick={() => onRemoveClip(clip.id)}
      >
        Supprimer ce clip
      </button>
    </div>
  )
}

function MultiClipEditor({
  selectedClips,
  clips,
  patches,
  tracks,
  numMeasures,
  durationMode,
  onUpdateClipsPatch,
  onUpdateClipsDuration,
  onUpdateClipsPitch,
  onDeleteSelected,
  mergeStatus,
  onMergeClips,
  canSplit2,
  canSplit3,
  onSplitClips,
}) {
  const first = selectedClips[0]
  const firstPatchId = first.patchId
  const allSamePatch = selectedClips.every((c) => c.patchId === firstPatchId)
  const firstDuration = first.duration
  const allSameDuration = selectedClips.every((c) => c.duration === firstDuration)
  const commonPatch = allSamePatch ? patches.find((p) => p.id === firstPatchId) : null
  const allSamePitch = selectedClips.every((c) => sameClipPitch(c, first))

  const handleChangePatch = (newPatchId) => {
    if (!allSamePatch) return
    if (newPatchId === firstPatchId) return
    onUpdateClipsPatch?.(selectedClips.map((c) => c.id), newPatchId)
  }

  const handleChangeDuration = (newDuration) => {
    if (!allSameDuration) return
    if (newDuration === firstDuration) return
    const totalBeats = numMeasures * BEATS_PER_MEASURE
    const { items } = layoutClips(clips, patches)
    const excludeIds = new Set(selectedClips.map((c) => c.id))
    const updates = selectedClips.map((clip) => {
      const b = computeBounds(clip.id, items, totalBeats, excludeIds)
      const clamped = Math.max(MIN_CLIP_DURATION, Math.min(b.maxDurationRight, newDuration))
      return { id: clip.id, duration: clamped }
    })
    onUpdateClipsDuration?.(updates)
  }

  return (
    <div className="clip-editor">
      <p className="properties-multi">{selectedClips.length} clips sélectionnés</p>

      {tracks && (() => {
        const trackIds = new Set(selectedClips.map(c => c.trackId))
        if (trackIds.size === 1) {
          const t = tracks.find(tr => tr.id === selectedClips[0].trackId)
          return t ? (
            <div className="field">
              <span className="field-label">Piste</span>
              <span className="field-readonly">{t.name}</span>
            </div>
          ) : null
        }
        return (
          <div className="field">
            <span className="field-label">Piste</span>
            <span className="field-readonly">Pistes mixtes</span>
          </div>
        )
      })()}

      <label className="field">
        <span className="field-label">Patch</span>
        {allSamePatch ? (
          <div className="sound-select-wrapper">
            {commonPatch && (
              <span
                className="sound-dot"
                style={{ backgroundColor: commonPatch.color }}
                aria-hidden="true"
              />
            )}
            <select
              className="field-input"
              value={firstPatchId}
              onChange={(e) => handleChangePatch(e.target.value)}
            >
              {patches.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        ) : (
          <span className="field-readonly">Patches mixtes</span>
        )}
      </label>

      <div className="field field-note">
        <span className="field-label">Note</span>
        {allSamePitch ? (
          <NoteEditor
            clipIds={selectedClips.map((c) => c.id)}
            tuningSystem={first.tuningSystem}
            noteIndex={first.noteIndex}
            octave={first.octave}
            frequency={first.frequency}
            onUpdateClipsPitch={onUpdateClipsPitch}
          />
        ) : (
          <span className="field-readonly">Notes mixtes</span>
        )}
      </div>

      <div className="field field-duration">
        <span className="field-label">
          Durée{allSameDuration && ` (${durationName(firstDuration, durationMode)})`}
        </span>
        {allSameDuration ? (
          <DurationButtons
            duration={firstDuration}
            mode={durationMode}
            onChange={handleChangeDuration}
          />
        ) : (
          <span className="field-readonly">Durées mixtes</span>
        )}
      </div>

      <button
        type="button"
        className="clip-delete-btn"
        onClick={() => onDeleteSelected?.()}
      >
        Supprimer la sélection
      </button>

      <div className="split-buttons">
        <button
          type="button"
          className="clip-split-btn"
          onClick={() => onSplitClips?.(2)}
          disabled={!canSplit2}
          title={canSplit2 ? 'Diviser par 2 (Ctrl+D)' : 'Durée non divisible par 2'}
        >
          ÷2
        </button>
        <button
          type="button"
          className="clip-split-btn"
          onClick={() => onSplitClips?.(3)}
          disabled={!canSplit3}
          title={canSplit3 ? 'Diviser par 3 (Ctrl+Shift+D)' : 'Durée non divisible par 3'}
        >
          ÷3
        </button>
        <button
          type="button"
          className="clip-merge-btn"
          onClick={() => onMergeClips?.()}
          disabled={!mergeStatus?.canMerge}
          title={mergeStatus?.canMerge ? 'Fusionner (Ctrl+M)' : mergeStatus?.reason}
        >
          Fusionner
        </button>
      </div>
    </div>
  )
}

function formatBeat(beat) {
  const rounded = Math.round(beat * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : String(rounded)
}

export default PropertiesPanel
