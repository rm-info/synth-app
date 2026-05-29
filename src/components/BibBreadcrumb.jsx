import { useState, useMemo } from 'react'
import { STRINGS } from '../lib/strings'
import './BibBreadcrumb.css'

// Reconstruit la chaîne de parents jusqu'à currentFolderId.
// Retourne [{id, name}, ...] de la racine vers le current (exclu racine).
function buildTrail(currentFolderId, soundFolders) {
  const trail = []
  let cur = currentFolderId
  const byId = new Map(soundFolders.map(f => [f.id, f]))
  while (cur !== null && byId.has(cur)) {
    const f = byId.get(cur)
    trail.unshift({ id: f.id, name: f.name })
    cur = f.parentId
  }
  return trail
}

function pathFromTrail(trail) {
  if (trail.length === 0) return '/'
  return '/' + trail.map(n => n.name).join('/')
}

// Parse '/Basses/Sub' → folderId final. Insensible à la casse.
// Retourne le folderId ou { error: '...' } si invalide.
function parsePath(pathStr, soundFolders) {
  const cleaned = pathStr.trim().replace(/^\/+|\/+$/g, '')
  // Racine : accepte le libellé FR affiché ('racine', cf. STRINGS.library.root)
  // ET 'root' (rétro-compat / saisie historique). Additif, ne casse rien.
  if (cleaned === '' || cleaned.toLowerCase() === 'racine' || cleaned.toLowerCase() === 'root') return null
  const segments = cleaned.split('/').filter(s => s.length > 0)
  if (segments.length === 0) return null
  let parentId = null
  for (const seg of segments) {
    const match = soundFolders.find(f =>
      f.parentId === parentId && f.name.toLowerCase() === seg.toLowerCase()
    )
    if (!match) return { error: `Chemin invalide : "${seg}" introuvable.` }
    parentId = match.id
  }
  return parentId
}

export default function BibBreadcrumb({ currentFolderId, soundFolders, onNavigate, onNotify }) {
  const [editing, setEditing] = useState(false)
  const [pathInput, setPathInput] = useState('')
  const trail = useMemo(() => buildTrail(currentFolderId, soundFolders), [currentFolderId, soundFolders])

  const startEdit = () => {
    setPathInput(pathFromTrail(trail))
    setEditing(true)
  }

  const commitEdit = () => {
    const parsed = parsePath(pathInput, soundFolders)
    if (parsed && typeof parsed === 'object' && parsed.error) {
      onNotify?.(parsed.error, 'error')
      return
    }
    onNavigate(parsed)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="bib-breadcrumb editing">
        <input
          type="text"
          value={pathInput}
          onChange={(e) => setPathInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); commitEdit() }
            else if (e.key === 'Escape') { e.preventDefault(); setEditing(false) }
          }}
          onBlur={commitEdit}
          autoFocus
        />
      </div>
    )
  }

  const handleEmptyZoneClick = (e) => {
    if (e.target.classList.contains('bib-breadcrumb') ||
        e.target.classList.contains('empty-zone')) {
      startEdit()
    }
  }

  return (
    <div className="bib-breadcrumb" onClick={handleEmptyZoneClick}>
      <span
        className={`seg ${currentFolderId === null ? 'current' : ''}`}
        onClick={currentFolderId === null ? undefined : () => onNavigate(null)}
      >
        {STRINGS.library.root}
      </span>
      {trail.map((node, i) => (
        <span key={node.id} className="seg-wrap">
          <span className="sep">/</span>
          <span
            className={`seg ${i === trail.length - 1 ? 'current' : ''}`}
            onClick={i === trail.length - 1 ? undefined : () => onNavigate(node.id)}
          >
            {node.name}
          </span>
        </span>
      ))}
      <span className="empty-zone" />
    </div>
  )
}
