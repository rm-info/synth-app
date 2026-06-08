// lucide-react est déjà utilisée par App.jsx (ChevronLeft/Right, Library, Play, etc.) ;
// on s'appuie sur la même dépendance pour les icônes de toggle thème +
// bouton raccourcis (Keyboard, iter-L phase-1.6).
import { Moon, Sun, Keyboard, Compass, Menu } from 'lucide-react'
import { STRINGS } from '../lib/strings'
import OverflowToolbar from './OverflowToolbar'
import './Tabs.css'

// iter-L phase-2.1 : ajout du 4e onglet Documentation à droite des trois
// existants. `dataAnchor` posé uniquement sur Documentation pour préparer
// d'éventuels DocLink/Tour pointant vers l'onglet (cohérence avec la
// convention `data-anchor` de L.1).
const TABS = [
  { id: 'library', label: STRINGS.tabs.library, hint: 'Gérer la bibliothèque de patches' },
  { id: 'designer', label: STRINGS.tabs.designer, hint: 'Dessiner et éditer des sons' },
  { id: 'composer', label: STRINGS.tabs.composer, hint: 'Composer la timeline' },
  { id: 'documentation', label: STRINGS.tabs.documentation, hint: 'Aide, raccourcis et articles', dataAnchor: 'tab-documentation' },
]

// Constante injectée au build par Vite (vite.config.js define).
// Source de vérité : `version` de package.json.
const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev'

function Tabs({ activeTab, onChange, theme, onToggleTheme, shortcutsOverlayOpen, onToggleShortcuts, tourActive, onToggleTour, isMobile }) {
  const isLight = theme === 'light'
  const themeLabel = isLight ? 'Passer en mode sombre' : 'Passer en mode clair'

  // iter-R phase-2.2 : nodes des boutons construits une fois, réutilisés par le
  // header desktop (rendu à plat) ET la variante compacte (items OverflowToolbar).
  const tabButton = (t) => (
    <button
      key={t.id}
      role="tab"
      aria-selected={activeTab === t.id}
      className={`tab ${activeTab === t.id ? 'active' : ''}`}
      onClick={() => onChange(t.id)}
      title={t.hint}
      data-anchor={t.dataAnchor}
    >
      {t.label}
    </button>
  )
  const themeBtn = (
    <button
      type="button"
      className="theme-toggle"
      onClick={onToggleTheme}
      aria-label={themeLabel}
      title={themeLabel}
    >
      {isLight ? <Moon size={16} fill="currentColor" strokeWidth={0} /> : <Sun size={16} fill="currentColor" strokeWidth={1.5} />}
    </button>
  )
  // iter-L phase-1.6 : bouton Keyboard = toggle overlay raccourcis (actif si ouvert).
  const shortcutsBtn = (
    <button
      type="button"
      className={`shortcuts-toggle${shortcutsOverlayOpen ? ' is-active' : ''}`}
      onClick={onToggleShortcuts}
      aria-label={shortcutsOverlayOpen ? 'Fermer les raccourcis' : 'Afficher les raccourcis'}
      aria-pressed={!!shortcutsOverlayOpen}
      title="Raccourcis (Ctrl+K)"
      data-anchor="header-shortcuts-button"
    >
      <Keyboard size={16} strokeWidth={1.8} />
    </button>
  )
  // iter-L phase-4.4 : bouton Compass = démarre la visite guidée de l'onglet actif.
  const tourBtn = (
    <button
      type="button"
      className={`tour-toggle${tourActive ? ' is-active' : ''}`}
      onClick={onToggleTour}
      aria-label="Visite guidée"
      aria-pressed={!!tourActive}
      title="Visite guidée (Ctrl+J)"
      data-anchor="header-tour-button"
    >
      <Compass size={16} strokeWidth={1.8} />
    </button>
  )

  const title = (
    <div className="tabs-title" title="On Synth App (« on s'en tape »)">
      On_Synth_App
    </div>
  )

  // iter-R phase-2.2 : sous 924×668, le header passe en priority-plus (hamburger).
  if (isMobile) {
    const trayLabel = (txt) => <span className="overflow-toolbar-tray-label">{txt}</span>
    const tabId = (id) => TABS.find((t) => t.id === id)
    // Ordre de priorité (index 0 = gardé le plus longtemps, débordement droite→
    // gauche) : Création/Composition d'abord, auxiliaires en premiers à filer.
    const items = [
      { id: 'designer', bar: tabButton(tabId('designer')), tray: tabButton(tabId('designer')) },
      { id: 'composer', bar: tabButton(tabId('composer')), tray: tabButton(tabId('composer')) },
      { id: 'library', bar: tabButton(tabId('library')), tray: tabButton(tabId('library')) },
      { id: 'documentation', bar: tabButton(tabId('documentation')), tray: tabButton(tabId('documentation')) },
      { id: 'theme', bar: themeBtn, tray: <>{themeBtn}{trayLabel(themeLabel)}</> },
      { id: 'shortcuts', bar: shortcutsBtn, tray: <>{shortcutsBtn}{trayLabel('Raccourcis')}</> },
      { id: 'tour', bar: tourBtn, tray: <>{tourBtn}{trayLabel('Visite guidée')}</> },
      // R.3.rectif.1b : la version est un item en dernière position (index le plus
      // élevé = premier à déborder) — inline tant qu'il y a la place, sinon elle
      // file dans le tiroir ☰. Remplace l'ancien trayFooter (invisible quand rien
      // ne débordait).
      {
        id: 'version',
        bar: <div className="tabs-version" title={`Version ${APP_VERSION}`}>v{APP_VERSION}</div>,
        tray: <div className="tabs-version-tray" title={`Version ${APP_VERSION}`}>v{APP_VERSION}</div>,
      },
    ]
    return (
      <nav className="tabs tabs-compact" role="tablist">
        {title}
        {/* Pendant le Tour : nav masquée (visibility:hidden, le rect reste résolu
            pour ancrer la progress bar via data-anchor) ; navigation bloquée par
            construction. Même contrat que le desktop (.tabs-buttons.is-tour-hidden). */}
        <div
          className={`tabs-compact-nav${tourActive ? ' is-tour-hidden' : ''}`}
          data-anchor="header-tabs-zone"
        >
          <OverflowToolbar
            items={items}
            ariaLabel="Navigation et options"
            menuLabel="Menu"
            triggerIcon={<Menu size={18} />}
            closeOnSelect
          />
        </div>
      </nav>
    )
  }

  return (
    <nav className="tabs" role="tablist">
      {title}
      {/* iter-L phase-4.3 : pendant le tour, les boutons d'onglet sont masqués
          (visibility:hidden — le rect reste résolu pour ancrer la progress bar
          que Tour.jsx superpose ici via data-anchor). Navigation d'onglet
          bloquée par construction. */}
      <div
        className={`tabs-buttons${tourActive ? ' is-tour-hidden' : ''}`}
        data-anchor="header-tabs-zone"
      >
        {TABS.map((t) => tabButton(t))}
      </div>
      {themeBtn}
      {shortcutsBtn}
      {tourBtn}
      <div className="tabs-version" title={`Version ${APP_VERSION}`}>
        v{APP_VERSION}
      </div>
    </nav>
  )
}

export default Tabs
