import { useEffect } from 'react'

export default function BibContextMenu({
  menu, onClose,
  onRename, onCopy, onCut, onPaste, onDelete,
  onExportFolder, onExportPatch, onNewFolder, onSelectAll,
  clipboardHasItems,
  folderHasAnyPatch,
  selectionSize = 1,
}) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose() }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [onClose])

  if (!menu) return null

  const isItem = menu.type === 'patch' || menu.type === 'folder'
  const isFolder = menu.type === 'folder'
  const isPatch = menu.type === 'patch'
  const isEmpty = menu.type === 'empty'

  return (
    <>
      <div
        className="bib-context-backdrop"
        onClick={onClose}
        onContextMenu={(e) => { e.preventDefault(); onClose() }}
      />
      <div
        className="bib-context-menu"
        style={{ left: menu.clientX, top: menu.clientY }}
      >
        {isItem && (
          <>
            <button
              className="bib-ctx-item"
              disabled={selectionSize !== 1}
              onClick={() => { onRename(menu.id, menu.type); onClose() }}
            >
              Renommer <span className="shortcut">F2</span>
            </button>
            <div className="bib-ctx-sep" />
            <button className="bib-ctx-item" onClick={() => { onCopy(); onClose() }}>
              Copier <span className="shortcut">Ctrl+C</span>
            </button>
            <button className="bib-ctx-item" onClick={() => { onCut(); onClose() }}>
              Couper <span className="shortcut">Ctrl+X</span>
            </button>
            {isFolder && (
              <button
                className="bib-ctx-item"
                onClick={() => { onPaste(menu.id); onClose() }}
                disabled={!clipboardHasItems}
              >
                Coller dans <span className="shortcut">Ctrl+V</span>
              </button>
            )}
            <div className="bib-ctx-sep" />
            {isFolder && (
              <button
                className="bib-ctx-item"
                onClick={() => { onExportFolder(menu.id); onClose() }}
                disabled={selectionSize !== 1 || !folderHasAnyPatch(menu.id)}
              >
                Exporter ce dossier
              </button>
            )}
            {isPatch && (
              <button
                className="bib-ctx-item"
                disabled={selectionSize !== 1}
                onClick={() => { onExportPatch(menu.id); onClose() }}
              >
                Exporter ce patch
              </button>
            )}
            <div className="bib-ctx-sep" />
            <button className="bib-ctx-item delete" onClick={() => { onDelete(); onClose() }}>
              Supprimer <span className="shortcut">Suppr</span>
            </button>
          </>
        )}
        {isEmpty && (
          <>
            <button className="bib-ctx-item" onClick={() => { onNewFolder(); onClose() }}>
              Nouveau dossier
            </button>
            <button className="bib-ctx-item" onClick={() => { onSelectAll?.(); onClose() }}>
              Sélectionner tout <span className="shortcut">Ctrl+A</span>
            </button>
            <button
              className="bib-ctx-item"
              onClick={() => { onPaste(null); onClose() }}
              disabled={!clipboardHasItems}
            >
              Coller <span className="shortcut">Ctrl+V</span>
            </button>
          </>
        )}
      </div>
    </>
  )
}
