import { FolderOpenDot, Eraser, FoldHorizontal } from 'lucide-react'
import { IconColumnLayout, IconAuto } from './icons'
import { STRINGS } from '../lib/strings'
import OverflowToolbar from './OverflowToolbar'
import './DesignerToolbar.css'

// iter-M phase-r.2 : barre d'outils unique du Designer, posée au-dessus des
// 3 colonnes (Forme d'onde / Harmoniques / Spectro). Regroupe l'identité du
// patch (gauche) et les contrôles de proportions des colonnes (droite,
// desktop uniquement — sans objet dans l'accordéon mobile). Les boutons
// Presets / Reset / Normaliser s'ajoutent dans les sous-commits suivants
// (r.2.2 / r.2.3).

// Presets de répartition des 3 colonnes — déplacés depuis DesignerColumns en
// phase r.2.1 (cf. spec §7.1). r.2.6.6 : libellés Unicode ⅓⅓⅓ · ½¼¼ · ¼½¼ · ¼¼½
// remplacés par un aperçu SVG (IconColumnLayout) des proportions.
const COLUMN_PRESETS = [
  { id: 'even', widths: [1 / 3, 1 / 3, 1 / 3], title: 'Trois colonnes égales' },
  { id: 'wave', widths: [0.5, 0.25, 0.25], title: 'Forme d’onde large' },
  { id: 'harm', widths: [0.25, 0.5, 0.25], title: 'Harmoniques large' },
  { id: 'spec', widths: [0.25, 0.25, 0.5], title: 'Spectrogramme large' },
]

// Égalité de proportions à epsilon près (les widths persistées sont
// renormalisées à somme 1, donc un preset y atterrit à ~1e-9 près ; 1e-3
// couvre largement). Sert à dériver le preset actif depuis designerColumnWidths.
function widthsEqual(a, b) {
  return Array.isArray(a) && Array.isArray(b) && a.length === b.length
    && a.every((v, i) => Math.abs(v - b[i]) < 1e-3)
}

// iter-N N.6.2 : le dimensionnement est un groupe radio de 5 boutons (4 presets
// + AUTO), un seul actif à la fois. L'actif est DÉRIVÉ (aucun nouvel état
// persisté) : autoSizing → AUTO ; sinon le preset dont les widths égalent
// designerColumnWidths ; sinon (drag manuel = custom) aucun.
function DesignerToolbar({ patchLabel, onPresets, onReset, onSelectPreset, widths, autoSizing, onToggleAutoSizing, autoCollapse, onToggleAutoCollapse, autoCollapseForced }) {
  // Les contrôles de proportions n'ont de sens qu'en layout 3-colonnes : on
  // ne les affiche que si le parent fournit le sélecteur de preset (desktop).
  const showColumnControls = typeof onSelectPreset === 'function'
  const activePresetId = autoSizing
    ? null
    : (COLUMN_PRESETS.find((p) => widthsEqual(p.widths, widths))?.id ?? null)

  // iter-O phase-2.3 : le groupe radio de dimensionnement (4 presets + AUTO) est
  // un OverflowToolbar (priority-plus). bar = bouton actuel ; tray = même bouton
  // + libellé. Le séparateur reste en chrome fixe via la prop `prefix`. is-active
  // / aria-pressed (état dérivé) conservés dans les deux formes.
  const renderColumnControls = () => {
    const trayLabel = (txt) => <span className="overflow-toolbar-tray-label">{txt}</span>
    const presetItems = COLUMN_PRESETS.map((p) => {
      const active = activePresetId === p.id
      const btn = (
        <button
          type="button"
          className={`designer-toolbar-preset-btn${active ? ' is-active' : ''}`}
          title={p.title}
          aria-label={p.title}
          aria-pressed={active}
          onClick={() => onSelectPreset(p.widths)}
        ><IconColumnLayout widths={p.widths} /></button>
      )
      return { id: `preset-${p.id}`, bar: btn, tray: <>{btn}{trayLabel(p.title)}</> }
    })
    // AUTO = 5ᵉ item du groupe radio. Bascule autoSizing ; actif quand ON.
    const autoBtn = (
      <button
        type="button"
        className={`designer-toolbar-preset-btn${autoSizing ? ' is-active' : ''}`}
        title={STRINGS.editor.autoSizingTitle}
        aria-label={STRINGS.editor.autoSizing}
        aria-pressed={autoSizing}
        onClick={onToggleAutoSizing}
      ><IconAuto /></button>
    )
    // iter-O phase-5d : toggle Auto-réduction — item INDÉPENDANT (pas dans le
    // groupe radio des proportions), précédé d'un séparateur. Actif si activé OU
    // forcé en écran étroit (auquel cas il est aussi désactivé : on ne peut pas
    // le couper, l'espace l'impose).
    const acActive = autoCollapse || autoCollapseForced
    const acTitle = autoCollapseForced
      ? 'Auto-réduction active automatiquement en écran étroit'
      : 'Auto-réduction des modules (ouvrir un module réduit les autres de sa rangée)'
    const acBtn = (
      <button
        type="button"
        className={`designer-toolbar-preset-btn${acActive ? ' is-active' : ''}`}
        title={acTitle}
        aria-label="Auto-réduction des modules"
        aria-pressed={acActive}
        disabled={autoCollapseForced}
        onClick={onToggleAutoCollapse}
      ><FoldHorizontal size={18} /></button>
    )
    const items = [
      ...presetItems,
      { id: 'auto', bar: autoBtn, tray: <>{autoBtn}{trayLabel(STRINGS.editor.autoSizing)}</> },
      {
        id: 'auto-collapse',
        bar: <><span className="designer-toolbar-divider" aria-hidden="true" />{acBtn}</>,
        tray: <>{acBtn}{trayLabel('Auto-réduction des modules')}</>,
      },
    ]
    return (
      <OverflowToolbar
        items={items}
        ariaLabel="Disposition des colonnes"
        menuLabel="Disposition des colonnes"
        prefix={<span className="designer-toolbar-divider" aria-hidden="true" />}
      />
    )
  }

  return (
    <div className="designer-toolbar">
      <div className="designer-toolbar-left">
        <span className="we-sound-tag">{patchLabel}</span>
        {onPresets && (
          <button
            type="button"
            className="icon-btn"
            onClick={onPresets}
            title={STRINGS.timbrePresets.loadButtonTitle}
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
      </div>
      {showColumnControls && renderColumnControls()}
    </div>
  )
}

export default DesignerToolbar
