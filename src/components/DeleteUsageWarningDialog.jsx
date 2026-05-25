import { useEffect } from 'react'
import './DeleteUsageWarningDialog.css'

export default function DeleteUsageWarningDialog({
  warning,
  onGoToComposer,
  onClose,
}) {
  useEffect(() => {
    if (!warning) return
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose?.() }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [warning, onClose])

  if (!warning) return null

  const { blockedPatches, freedCount } = warning
  const allBlocked = freedCount === 0
  const header = allBlocked ? '⚠ Suppression refusée' : '⚠ Suppression partielle'

  return (
    <>
      <div className="delete-warning-backdrop" onClick={onClose} />
      <div className="delete-warning-dialog">
        <h4>{header}</h4>
        {freedCount > 0 && (
          <p className="delete-warning-success">
            {freedCount} élément{freedCount > 1 ? 's' : ''} supprimé{freedCount > 1 ? 's' : ''}.
          </p>
        )}
        <p className="delete-warning-blocked-intro">
          {blockedPatches.length} patch{blockedPatches.length > 1 ? 'es' : ''} non supprimé{blockedPatches.length > 1 ? 's' : ''} car utilisé{blockedPatches.length > 1 ? 's' : ''} dans le Composer :
        </p>
        <ul className="delete-warning-list">
          {blockedPatches.map(p => (
            <li key={p.id}>
              <span className="delete-warning-name">{p.name}</span>
              <span className="delete-warning-usage">
                ({p.usageCount} clip{p.usageCount > 1 ? 's' : ''})
              </span>
            </li>
          ))}
        </ul>
        <div className="delete-warning-actions">
          <button
            className="delete-warning-btn primary"
            onClick={() => onGoToComposer?.({ patchIds: blockedPatches.map(p => p.id) })}
          >Voir dans le Composer</button>
          <button className="delete-warning-btn" onClick={onClose}>OK</button>
        </div>
      </div>
    </>
  )
}
