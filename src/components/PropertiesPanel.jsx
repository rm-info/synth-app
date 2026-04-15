import { useState } from 'react'
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
 * Panneau Properties (Composer) — phase 4.1.
 * Sur écran <1100px : bottom-sheet collapsible. Au-dessus : sidebar fixe.
 */
function PropertiesPanel({ selectedClipIds, clips, savedSounds, onUpdateClip, onRemoveClip }) {
  const [collapsed, setCollapsed] = useState(false)
  const count = selectedClipIds.length
  const selectedClip =
    count === 1 ? clips.find((c) => c.id === selectedClipIds[0]) ?? null : null

  return (
    <aside className={`properties-panel ${collapsed ? 'collapsed' : ''}`}>
      <header className="properties-header">
        <h3>Propriétés</h3>
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
            <>
              <p className="properties-multi">{count} clips sélectionnés</p>
              <p className="properties-empty">Édition multiple en phase B.</p>
            </>
          )}
          {count === 1 && selectedClip && (
            <ClipEditor
              clip={selectedClip}
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

function formatBeat(beat) {
  // Conserve jusqu'à 2 décimales (snap 16ᵉ = 0.25), sans zéros parasites.
  const rounded = Math.round(beat * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : String(rounded)
}

export default PropertiesPanel
