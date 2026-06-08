import { useEffect } from 'react'
import './ConfirmDialog.css'

export default function ConfirmDialog({
  open,
  title = 'Confirmer',
  message,
  confirmLabel = 'OK',
  cancelLabel = 'Annuler',
  variant = 'default',  // 'default' | 'danger'
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onCancel?.() }
      else if (e.key === 'Enter') { e.preventDefault(); onConfirm?.() }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [open, onCancel, onConfirm])

  if (!open) return null

  return (
    <>
      {/* S.2.fix.2 — fermeture sur `onPointerDown` (pas `onClick`) : un dialog
          ouvert depuis un pointerdown (barre harmonique non normalisée au doigt)
          ne se referme plus par le click synthétique du même tap qui retombe sur
          le backdrop fraîchement monté. Un tap neuf sur le fond le ferme toujours. */}
      <div className="confirm-dialog-backdrop" onPointerDown={onCancel} />
      <div className="confirm-dialog">
        <h4>{title}</h4>
        <p className="confirm-dialog-message">{message}</p>
        <div className="confirm-dialog-actions">
          <button className="confirm-dialog-btn" onClick={onCancel}>{cancelLabel}</button>
          <button
            className={`confirm-dialog-btn primary ${variant === 'danger' ? 'danger' : ''}`}
            onClick={onConfirm}
            autoFocus
          >{confirmLabel}</button>
        </div>
      </div>
    </>
  )
}
