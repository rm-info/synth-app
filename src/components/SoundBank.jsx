import { useState } from 'react'
import './SoundBank.css'

/**
 * Banque de sons — composant partagé par les onglets Designer & Composer.
 * - Drag d'un chip vers la timeline (Composer) : payload `text/plain` = soundId.
 * - Double-clic : déclenche `onLoadSound(soundId)` (App fait alors le tab-switch
 *   + currentSoundId update, après dirty check).
 * - Single-clic sur le chip lui-même : aussi `onLoadSound` (raccourci).
 * - Bouton "rename" : icône, lance le mode édition inline (Enter valide, Esc annule).
 * - Bouton "×" : suppression avec confirm si utilisé.
 *
 * Le `currentSoundId` est passé en prop pour styliser le chip actif.
 */
function SoundBank({
  savedSounds,
  clips,
  currentSoundId,
  onLoadSound,
  onRenameSound,
  onDeleteSound,
}) {
  const [editingSoundId, setEditingSoundId] = useState(null)
  const [editingValue, setEditingValue] = useState('')

  const startEdit = (sound) => {
    setEditingSoundId(sound.id)
    setEditingValue(sound.name)
  }
  const commitEdit = () => {
    if (!editingSoundId) return
    const trimmed = editingValue.trim()
    if (trimmed) onRenameSound(editingSoundId, trimmed)
    setEditingSoundId(null)
    setEditingValue('')
  }
  const cancelEdit = () => {
    setEditingSoundId(null)
    setEditingValue('')
  }

  const handleDragStart = (e, soundId) => {
    e.dataTransfer.effectAllowed = 'copy'
    e.dataTransfer.setData('text/plain', soundId)
  }

  if (savedSounds.length === 0) {
    return (
      <aside className="sound-bank-panel">
        <header className="sound-bank-header">
          <h3>Banque</h3>
        </header>
        <p className="sound-bank-empty">
          Aucun son. Dessinez-en un dans l'onglet Designer.
        </p>
      </aside>
    )
  }

  return (
    <aside className="sound-bank-panel">
      <header className="sound-bank-header">
        <h3>Banque</h3>
        <span className="sound-bank-count">{savedSounds.length}</span>
      </header>
      <ul className="sound-bank-list">
        {savedSounds.map((sound) => {
          const usedCount = clips.filter((c) => c.soundId === sound.id).length
          const isEditing = editingSoundId === sound.id
          const isCurrent = currentSoundId === sound.id

          const handleDelete = (e) => {
            e.stopPropagation()
            if (usedCount > 0) {
              const ok = window.confirm(
                `Supprimer "${sound.name}" ? Il est utilisé ${usedCount} fois sur la timeline.`,
              )
              if (!ok) return
            }
            onDeleteSound(sound.id)
          }
          const handleLoad = () => {
            if (isEditing) return
            onLoadSound?.(sound.id)
          }

          return (
            <li
              key={sound.id}
              className={`sound-chip ${isCurrent ? 'is-current' : ''}`}
              style={{ '--chip-color': sound.color }}
              draggable={!isEditing}
              onDragStart={(e) => handleDragStart(e, sound.id)}
              onDoubleClick={handleLoad}
              title={isEditing ? undefined : 'Double-clic pour éditer, glisser pour placer sur la timeline'}
            >
              <span className="chip-dot" />
              {isEditing ? (
                <input
                  autoFocus
                  className="chip-rename-input"
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitEdit()
                    else if (e.key === 'Escape') cancelEdit()
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  draggable={false}
                />
              ) : (
                <>
                  <span className="chip-name">{sound.name}</span>
                  <span className="chip-info">{sound.frequency.toFixed(0)} Hz</span>
                  <button
                    type="button"
                    className="chip-rename"
                    onClick={(e) => { e.stopPropagation(); startEdit(sound) }}
                    onMouseDown={(e) => e.stopPropagation()}
                    draggable={false}
                    title={`Renommer ${sound.name}`}
                    aria-label={`Renommer ${sound.name}`}
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    className="chip-delete"
                    onClick={handleDelete}
                    onMouseDown={(e) => e.stopPropagation()}
                    draggable={false}
                    title={`Supprimer ${sound.name}`}
                    aria-label={`Supprimer ${sound.name}`}
                  >
                    ×
                  </button>
                </>
              )}
            </li>
          )
        })}
      </ul>
    </aside>
  )
}

export default SoundBank
