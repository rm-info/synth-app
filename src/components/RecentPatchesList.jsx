import { useCallback } from 'react'
import { Clock } from 'lucide-react'
import PatchThumbnail from './PatchThumbnail'
import './RecentPatchesList.css'

// iter-K phase-2.f11 : liste verticale des 10 derniers patches utilisés,
// affichée en bas de la sidebar Composer en mode collapsed. Drag depuis
// chaque chip → timeline (réutilise le contrat 'application/x-patchbank-drag').
// Drop sur la zone (depuis le picker) → ajoute en tête via onAddToRecents.
export default function RecentPatchesList({
  recentPatchIds,
  patches,
  onDragStart,
  onAddToRecents,
}) {
  const patchById = new Map(patches.map(p => [p.id, p]))
  const items = (recentPatchIds || [])
    .map(id => patchById.get(id))
    .filter(Boolean)

  const handleDragOver = useCallback((e) => {
    // N'accepte que les drags issus de la banque (patches uniquement).
    if (Array.from(e.dataTransfer.types).includes('application/x-patchbank-drag')) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
    }
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    const raw = e.dataTransfer.getData('application/x-patchbank-drag')
    if (!raw) return
    try {
      const parsed = JSON.parse(raw)
      // PatchPicker envoie un singleton { type, id }, PatchBank un array.
      const item = Array.isArray(parsed) ? parsed[0] : parsed
      if (item?.type === 'patch' && item?.id) {
        onAddToRecents?.(item.id)
      }
    } catch {
      // payload non-JSON ou non-patchbank → ignore
    }
  }, [onAddToRecents])

  return (
    <div
      className="recent-patches-list"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="recent-patches-header" title="Derniers patches utilisés">
        <Clock size={12} />
      </div>
      {items.length === 0 && (
        <div className="recent-patches-empty">∅</div>
      )}
      {items.map(patch => (
        <div
          key={patch.id}
          className="recent-patch-item"
          draggable
          onDragStart={(e) => onDragStart?.(e, 'patch', patch.id)}
          title={patch.name}
          style={{ '--chip-color': patch.color || '#00d4ff' }}
        >
          <PatchThumbnail
            points={patch.canonical}
            color={patch.color || '#00d4ff'}
            width={28}
            height={16}
          />
        </div>
      ))}
    </div>
  )
}
