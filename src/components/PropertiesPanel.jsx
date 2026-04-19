import { useState } from 'react'
import { BEATS_PER_MEASURE } from '../reducer'
import {
  layoutClips,
  computeBounds,
  MIN_CLIP_DURATION,
} from '../lib/timelineLayout'
import './PropertiesPanel.css'

const DURATION_OPTIONS = [
  { label: 'Ronde', value: 4 },
  { label: 'Blanche', value: 2 },
  { label: 'Noire pointée', value: 1.5 },
  { label: 'Noire', value: 1 },
  { label: 'Croche pointée', value: 0.75 },
  { label: 'Croche', value: 0.5 },
  { label: 'Double croche', value: 0.25 },
]

const KNOWN_DURATIONS = new Set(DURATION_OPTIONS.map((o) => o.value))

function durationOptionsFor(value) {
  if (KNOWN_DURATIONS.has(value)) return DURATION_OPTIONS
  const r = Math.round(value * 100) / 100
  const label = Number.isInteger(r) ? `${r} beats` : `${r} beats`
  return [{ label, value }, ...DURATION_OPTIONS]
}

/**
 * Panneau Properties (Composer). Trois modes :
 *  - vide : placeholder
 *  - mono (1 clip) : édition complète
 *  - multi (>1 clips) : patch (si homogène), durée (si homogène),
 *    bouton supprimer la sélection.
 */
function PropertiesPanel({
  selectedClipIds,
  clips,
  patches,
  tracks,
  numMeasures,
  onUpdateClip,
  onRemoveClip,
  onUpdateClipsPatch,
  onUpdateClipsDuration,
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
              onUpdateClipsPatch={onUpdateClipsPatch}
              onUpdateClipsDuration={onUpdateClipsDuration}
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
              onUpdateClip={onUpdateClip}
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

function ClipEditor({ clip, patches, tracks, onUpdateClip, onRemoveClip, canSplit2, canSplit3, onSplitClips }) {
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

      <label className="field">
        <span className="field-label">Durée musicale</span>
        <select
          className="field-input"
          value={clip.duration}
          onChange={(e) => onUpdateClip(clip.id, { duration: parseFloat(e.target.value) })}
        >
          {durationOptionsFor(clip.duration).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

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
  onUpdateClipsPatch,
  onUpdateClipsDuration,
  onDeleteSelected,
  mergeStatus,
  onMergeClips,
  canSplit2,
  canSplit3,
  onSplitClips,
}) {
  const firstPatchId = selectedClips[0].patchId
  const allSamePatch = selectedClips.every((c) => c.patchId === firstPatchId)
  const firstDuration = selectedClips[0].duration
  const allSameDuration = selectedClips.every((c) => c.duration === firstDuration)
  const commonPatch = allSamePatch ? patches.find((p) => p.id === firstPatchId) : null

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

      <label className="field">
        <span className="field-label">Durée musicale</span>
        {allSameDuration ? (
          <select
            className="field-input"
            value={firstDuration}
            onChange={(e) => handleChangeDuration(parseFloat(e.target.value))}
          >
            {durationOptionsFor(firstDuration).map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        ) : (
          <span className="field-readonly">Durées mixtes</span>
        )}
      </label>

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
