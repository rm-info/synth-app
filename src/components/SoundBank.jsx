import { useState } from 'react'
import './SoundBank.css'

/**
 * Banque de sons — composant partagé par les onglets Designer & Composer.
 * - Drag d'un chip vers la timeline (Composer) : payload `text/plain` = soundId.
 * - Comportement clic dépend du contexte (`activeTab`) :
 *   - Designer (banque centrale) : clic simple = charge le son.
 *   - Composer (banque secondaire) : clic simple = no-op (trop intrusif), il faut
 *     double-cliquer pour bascule + chargement.
 *   - Double-clic : charge le son dans tous les contextes.
 * - Bouton "rename" (✎) : édition inline (Enter valide, Esc annule).
 * - Bouton "×" : suppression avec confirm si le son est utilisé.
 * - `currentSoundId` est passé en prop pour styliser le chip actif.
 */
function SoundBank({
  savedSounds,
  clips,
  currentSoundId,
  activeTab,
  onLoadSound,
  onRenameSound,
  onDeleteSound,
}) {
  const loadOnSingleClick = activeTab === 'designer'
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
          const handleSingleClick = () => {
            if (isEditing) return
            if (loadOnSingleClick) handleLoad()
          }
          const titleText = loadOnSingleClick
            ? 'Clic pour éditer, glisser pour placer sur la timeline'
            : 'Double-clic pour éditer, glisser pour placer sur la timeline'

          return (
            <li
              key={sound.id}
              className={`sound-chip ${isCurrent ? 'is-current' : ''}`}
              style={{ '--chip-color': sound.color }}
              draggable={!isEditing}
              onDragStart={(e) => handleDragStart(e, sound.id)}
              onClick={handleSingleClick}
              onDoubleClick={handleLoad}
              title={isEditing ? undefined : titleText}
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
