import { FolderOpenDot, Eraser, Sigma } from 'lucide-react'
import { STRINGS } from '../lib/strings'
import './DesignerToolbar.css'

// iter-M phase-r.2 : barre d'outils unique du Designer, posée au-dessus des
// 3 colonnes (Forme d'onde / Harmoniques / Spectro). Regroupe l'identité du
// patch (gauche) et les contrôles de proportions des colonnes (droite,
// desktop uniquement — sans objet dans l'accordéon mobile). Les boutons
// Presets / Reset / Normaliser s'ajoutent dans les sous-commits suivants
// (r.2.2 / r.2.3).

// Presets de répartition des 3 colonnes — déplacés depuis DesignerColumns en
// phase r.2.1 (cf. spec §7.1). ⅓⅓⅓ · ½¼¼ · ¼½¼ · ¼¼½.
const COLUMN_PRESETS = [
  { id: 'even', label: '⅓ ⅓ ⅓', widths: [1 / 3, 1 / 3, 1 / 3], title: 'Trois colonnes égales' },
  { id: 'wave', label: '½ ¼ ¼', widths: [0.5, 0.25, 0.25], title: 'Forme d’onde large' },
  { id: 'harm', label: '¼ ½ ¼', widths: [0.25, 0.5, 0.25], title: 'Harmoniques large' },
  { id: 'spec', label: '¼ ¼ ½', widths: [0.25, 0.25, 0.5], title: 'Spectrogramme large' },
]

function DesignerToolbar({ patchLabel, onPresets, onReset, onNormalize, onWidths, autoSizing, onToggleAutoSizing }) {
  // Les contrôles de proportions n'ont de sens qu'en layout 3-colonnes : on
  // ne les affiche que si le parent fournit un setter (desktop).
  const showColumnControls = typeof onWidths === 'function'
  return (
    <div className="designer-toolbar">
      <div className="designer-toolbar-left">
        <span className="we-sound-tag">{patchLabel}</span>
        {onPresets && (
          <button
            type="button"
            className="icon-btn"
            onClick={onPresets}
            title="Charger un preset de timbre"
            aria-label={STRINGS.timbrePresets.loadButton}
            data-anchor="designer-presets-button"
          ><FolderOpenDot size={18} /></button>
        )}
        {onReset && (
          <button
            type="button"
            className="icon-btn"
            onClick={onReset}
            title="Effacer le timbre (canonical, ancres) — préserve le plafond d'harmoniques"
            aria-label="Réinitialiser le timbre"
            data-anchor="designer-reset-button"
          ><Eraser size={18} /></button>
        )}
        {onNormalize && (
          <button
            type="button"
            className="icon-btn"
            onClick={onNormalize}
            title="Normaliser : redessiner le tracé comme la somme des harmoniques courantes (phase canonique)"
            aria-label="Normaliser"
            data-anchor="designer-normalize-button"
          ><Sigma size={18} /></button>
        )}
      </div>
      {showColumnControls && (
        <div className="designer-toolbar-right" role="group" aria-label="Proportions des colonnes">
          <span className="designer-toolbar-divider" aria-hidden="true" />
          {COLUMN_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className="designer-toolbar-preset-btn"
              title={p.title}
              onClick={() => onWidths(p.widths)}
            >{p.label}</button>
          ))}
          <label className="designer-toolbar-auto-toggle" title={STRINGS.editor.autoSizingTitle}>
            <input type="checkbox" checked={autoSizing} onChange={onToggleAutoSizing} />
            <span>{STRINGS.editor.autoSizing}</span>
          </label>
        </div>
      )}
    </div>
  )
}

export default DesignerToolbar
