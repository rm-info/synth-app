import { FolderOpenDot, Eraser, FoldHorizontal, Table } from 'lucide-react'
import { STRINGS } from '../lib/strings'
import { MODULE_META } from '../lib/designerModules'
import OverflowToolbar from './OverflowToolbar'
import './DesignerToolbar.css'

// iter-M phase-r.2 : barre d'outils unique du Designer, posée au-dessus des
// 3 colonnes (Forme d'onde / Harmoniques / Spectro). Regroupe l'identité du
// patch (gauche) et les contrôles de disposition des modules (droite, desktop
// uniquement — sans objet dans l'accordéon mobile).

// Égalité de proportions à epsilon près (les widths persistées sont
// renormalisées à somme 1, donc ⅓⅓⅓ y atterrit à ~1e-9 près ; 1e-3 couvre
// largement). Sert à dériver l'état actif du bouton « Égaliser ».
function widthsEqual(a, b) {
  return Array.isArray(a) && Array.isArray(b) && a.length === b.length
    && a.every((v, i) => Math.abs(v - b[i]) < 1e-3)
}

const EVEN_WIDTHS = [1 / 3, 1 / 3, 1 / 3]

// iter-Q : les 4 presets de proportions + le bouton AUTO (auto-sizing) sont
// remplacés par un unique bouton « Égaliser » (action momentanée, deux rangées).
// Les proportions custom restent accessibles via le drag des séparateurs (haut
// + bas). État actif DÉRIVÉ (aucun nouvel état persisté) : vrai quand les DEUX
// rangées sont déjà à ⅓⅓⅓.
function DesignerToolbar({ patchLabel, onPresets, onReset, onEqualizeWidths, columnWidths, bottomRowWidths, autoCollapse, onToggleAutoCollapse, autoCollapseForced, mobileModuleIds, activeMobileModule, onSelectMobileModule, mobileModuleControls }) {
  // Les contrôles de disposition n'ont de sens qu'en layout 3-colonnes : on
  // ne les affiche que si le parent fournit le handler d'égalisation (desktop).
  const showColumnControls = typeof onEqualizeWidths === 'function'
  const allEqual = widthsEqual(columnWidths, EVEN_WIDTHS) && widthsEqual(bottomRowWidths, EVEN_WIDTHS)
  // iter-R phase-1.2 : switcher de modules (petit écran). Navigation primaire du
  // Designer mobile, toujours visible — un groupe flex simple (PAS d'OverflowToolbar :
  // 6 petites icônes tiennent), qui flowera row/column lors de la réorientation R.4.
  const showMobileSwitcher = Array.isArray(mobileModuleIds) && mobileModuleIds.length > 0
  // iter-R phase-1.3b : contrôles de header du module actif, relogés ici (mobile).
  // Si le module actif n'a aucun contrôle (Modulation, ou Instrument/AHDSR quand
  // leurs conditions sont fausses) : rien (pas de séparateur orphelin ni de « … »).
  const showMobileControls = Array.isArray(mobileModuleControls) && mobileModuleControls.length > 0

  // iter-Q : 2 items (Égaliser + Auto-réduction) dans un OverflowToolbar
  // (priority-plus) — le tiroir reste utile en header étroit. bar = bouton ;
  // tray = même bouton + libellé. is-active/aria-pressed (état dérivé)
  // conservés dans les deux formes.
  const renderColumnControls = () => {
    const trayLabel = (txt) => <span className="overflow-toolbar-tray-label">{txt}</span>
    // « Égaliser » : action momentanée (pas un toggle). Icône Table de Lucide
    // (grille 2×3) pivotée 90° → 3×2 = les deux rangées de trois colonnes du
    // Designer, soit exactement ce que le bouton égalise.
    const equalizeLabel = 'Égaliser les largeurs des deux rangées'
    const equalizeBtn = (
      <button
        type="button"
        className={`designer-toolbar-preset-btn${allEqual ? ' is-active' : ''}`}
        title={equalizeLabel}
        aria-label={equalizeLabel}
        aria-pressed={allEqual}
        onClick={onEqualizeWidths}
      ><Table size={18} style={{ transform: 'rotate(90deg)' }} /></button>
    )
    // iter-O phase-5d : toggle Auto-réduction — item INDÉPENDANT, précédé d'un
    // séparateur. Actif si activé OU
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
    // R.3.rectif.7 : en intermédiaire 924–1100, `autoCollapseForced` est vrai →
    // au plus un module ouvert par rangée, les autres sont des bandes repliées :
    // égaliser des largeurs de colonnes repliées ne produit rien → on masque
    // Égaliser. Auto-réduction reste visible (forcé/désactivé, informatif).
    const items = []
    if (!autoCollapseForced) {
      items.push({ id: 'equalize', bar: equalizeBtn, tray: <>{equalizeBtn}{trayLabel(equalizeLabel)}</> })
    }
    items.push({
      id: 'auto-collapse',
      // Le séparateur interne ne sert qu'à isoler Égaliser à sa gauche ; absent,
      // le `prefix` de l'OT suffit (sinon on aurait un double filet).
      bar: <>{!autoCollapseForced && <span className="designer-toolbar-divider" aria-hidden="true" />}{acBtn}</>,
      tray: <>{acBtn}{trayLabel('Auto-réduction des modules')}</>,
    })
    return (
      <OverflowToolbar
        items={items}
        ariaLabel="Disposition des modules"
        menuLabel="Disposition des modules"
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
      {showMobileSwitcher && (
        <span className="designer-toolbar-divider" aria-hidden="true" />
      )}
      {showMobileSwitcher && (
        <div className="designer-module-switcher" role="group" aria-label="Modules du Designer">
          {mobileModuleIds.map((id) => {
            const meta = MODULE_META[id]
            if (!meta) return null
            const { Icon, label } = meta
            const isActive = activeMobileModule === id
            return (
              <button
                key={id}
                type="button"
                className={`icon-btn${isActive ? ' is-active' : ''}`}
                title={label}
                aria-label={label}
                aria-pressed={isActive}
                onClick={() => onSelectMobileModule(id)}
              ><Icon size={18} /></button>
            )
          })}
        </div>
      )}
      {showMobileControls && (
        <OverflowToolbar
          items={mobileModuleControls}
          ariaLabel="Contrôles du module"
          menuLabel="Contrôles du module"
          prefix={<span className="designer-toolbar-divider" aria-hidden="true" />}
        />
      )}
      {showColumnControls && renderColumnControls()}
    </div>
  )
}

export default DesignerToolbar
