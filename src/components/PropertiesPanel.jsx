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

/**
 * Panneau Properties (Composer). Trois modes :
 *  - vide : placeholder
 *  - mono (1 clip) : édition complète
 *  - multi (>1 clips, phase 2.5) : son (si homogène), durée (si homogène),
 *    bouton supprimer la sélection.
 */
function PropertiesPanel({
  selectedClipIds,
  clips,
  savedSounds,
  numMeasures,
  onUpdateClip,
  onRemoveClip,
  onUpdateClipsSound,
  onUpdateClipsDuration,
  onDeleteSelected,
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
              savedSounds={savedSounds}
              numMeasures={numMeasures}
              onUpdateClipsSound={onUpdateClipsSound}
              onUpdateClipsDuration={onUpdateClipsDuration}
              onDeleteSelected={onDeleteSelected}
            />
          )}
          {count === 1 && mono && (
            <ClipEditor
              clip={mono}
              savedSounds={savedSounds}
              onUpdateClip={onUpdateClip}
              onRemoveClip={onRemoveClip}
            />
          )}
        </div>
      )}
    </aside>
  )
}

function ClipEditor({ clip, savedSounds, onUpdateClip, onRemoveClip }) {
  const currentSound = savedSounds.find((s) => s.id === clip.soundId)

  return (
    <div className="clip-editor">
      <label className="field">
        <span className="field-label">Son</span>
        <div className="sound-select-wrapper">
          {currentSound && (
            <span
              className="sound-dot"
              style={{ backgroundColor: currentSound.color }}
              aria-hidden="true"
            />
          )}
          <select
            className="field-input"
            value={clip.soundId}
            onChange={(e) => onUpdateClip(clip.id, { soundId: e.target.value })}
          >
            {savedSounds.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
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

      <label className="field">
        <span className="field-label">Durée musicale</span>
        <select
          className="field-input"
          value={clip.duration}
          onChange={(e) => onUpdateClip(clip.id, { duration: parseFloat(e.target.value) })}
        >
          {DURATION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

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
  savedSounds,
  numMeasures,
  onUpdateClipsSound,
  onUpdateClipsDuration,
  onDeleteSelected,
}) {
  const firstSoundId = selectedClips[0].soundId
  const allSameSound = selectedClips.every((c) => c.soundId === firstSoundId)
  const firstDuration = selectedClips[0].duration
  const allSameDuration = selectedClips.every((c) => c.duration === firstDuration)
  const commonSound = allSameSound ? savedSounds.find((s) => s.id === firstSoundId) : null

  const handleChangeSound = (newSoundId) => {
    if (!allSameSound) return
    if (newSoundId === firstSoundId) return
    onUpdateClipsSound?.(selectedClips.map((c) => c.id), newSoundId)
  }

  const handleChangeDuration = (newDuration) => {
    if (!allSameDuration) return
    if (newDuration === firstDuration) return
    const totalBeats = numMeasures * BEATS_PER_MEASURE
    const { items } = layoutClips(clips, savedSounds)
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

      <label className="field">
        <span className="field-label">Son</span>
        {allSameSound ? (
          <div className="sound-select-wrapper">
            {commonSound && (
              <span
                className="sound-dot"
                style={{ backgroundColor: commonSound.color }}
                aria-hidden="true"
              />
            )}
            <select
              className="field-input"
              value={firstSoundId}
              onChange={(e) => handleChangeSound(e.target.value)}
            >
              {savedSounds.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        ) : (
          <span className="field-readonly">Sons mixtes</span>
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
            {DURATION_OPTIONS.map((o) => (
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
    </div>
  )
}

function formatBeat(beat) {
  // Conserve jusqu'à 2 décimales (snap 16ᵉ = 0.25), sans zéros parasites.
  const rounded = Math.round(beat * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : String(rounded)
}

export default PropertiesPanel
