// src/components/ImportModal.jsx
//
// Modale post-validation .osa : affiche les compteurs détectés, propose
// le placement (sous-ensemble dans un dossier wrapper / racine).
// Appelle onConfirm(mode, wrapperName) où wrapperName est ignoré si
// mode === 'root'.

import { useState, useEffect } from 'react'
import Modal from './Modal.jsx'

function stripExtension(fileName) {
  const idx = fileName.lastIndexOf('.')
  return idx > 0 ? fileName.slice(0, idx) : fileName
}

export default function ImportModal({ isOpen, payload, fileName, onConfirm, onCancel }) {
  const [mode, setMode] = useState('subset')
  const [wrapperName, setWrapperName] = useState('')

  // Resync form state when the modal opens fresh (cf. ExportModal).
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMode('subset')
      setWrapperName(stripExtension(fileName || ''))
    }
  }, [isOpen, fileName])

  const patchCount = payload?.patches.length ?? 0
  const folderCount = payload?.soundFolders.length ?? 0
  const wrapperTrimmed = wrapperName.trim()
  const canSubmit = mode === 'root' || wrapperTrimmed.length > 0

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!canSubmit) return
    onConfirm(mode, wrapperTrimmed)
  }

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={`Importer ${fileName ?? ''}`}>
      <form onSubmit={handleSubmit}>
        <p className="modal-summary">
          {patchCount} patch{patchCount > 1 ? 'es' : ''}, {folderCount} dossier{folderCount > 1 ? 's' : ''} détecté{folderCount > 1 ? 's' : ''}
        </p>

        <label className="modal-radio">
          <input
            type="radio"
            name="import-mode"
            checked={mode === 'subset'}
            onChange={() => setMode('subset')}
          />
          <span>Comme sous-ensemble dans un nouveau dossier</span>
        </label>
        {mode === 'subset' && (
          <label className="modal-field modal-field-indent">
            <span>Nom du dossier</span>
            <input
              type="text"
              value={wrapperName}
              onChange={(e) => setWrapperName(e.target.value)}
              autoFocus
            />
          </label>
        )}

        <label className="modal-radio">
          <input
            type="radio"
            name="import-mode"
            checked={mode === 'root'}
            onChange={() => setMode('root')}
          />
          <span>À la racine de la bibliothèque</span>
        </label>
        {mode === 'root' && (
          <p className="modal-hint modal-field-indent">
            Les dossiers de premier niveau du fichier deviennent racines.
          </p>
        )}

        <div className="modal-actions">
          <button type="button" className="modal-btn" onClick={onCancel}>Annuler</button>
          <button
            type="submit"
            className="modal-btn modal-btn-primary"
            disabled={!canSubmit}
          >Importer</button>
        </div>
      </form>
    </Modal>
  )
}
