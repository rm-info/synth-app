// src/components/ExportModal.jsx
//
// Modale "Export as..." — saisit le nom du fichier, slugifie, ajoute .osa
// si absent, déclenche onConfirm(filename). Utilisée par les 3 voies
// d'export (panneau Actions, menu contextuel folder, menu contextuel patch).

import { useState, useEffect } from 'react'
import Modal from './Modal.jsx'

// eslint-disable-next-line no-control-regex
const FILESYSTEM_INVALID_RE = /[\\/:*?"<>|\x00-\x1f]/g

function slugifyForFilesystem(name) {
  return name.replace(FILESYSTEM_INVALID_RE, '_')
}

function ensureOsaSuffix(name) {
  return name.toLowerCase().endsWith('.osa') ? name : `${name}.osa`
}

export default function ExportModal({ isOpen, defaultName, onConfirm, onCancel }) {
  const [name, setName] = useState(defaultName)

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (isOpen) setName(defaultName) }, [isOpen, defaultName])

  const trimmed = name.trim()
  const isValid = trimmed.length > 0

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!isValid) return
    const finalName = ensureOsaSuffix(slugifyForFilesystem(trimmed))
    onConfirm(finalName)
  }

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title="Exporter">
      <form onSubmit={handleSubmit}>
        <label className="modal-field">
          <span>Nom du fichier</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </label>
        <p className="modal-hint">L'extension .osa sera ajoutée automatiquement.</p>
        <div className="modal-actions">
          <button type="button" className="modal-btn" onClick={onCancel}>Annuler</button>
          <button
            type="submit"
            className="modal-btn modal-btn-primary"
            disabled={!isValid}
          >Exporter</button>
        </div>
      </form>
    </Modal>
  )
}
