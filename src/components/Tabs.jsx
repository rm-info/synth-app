// lucide-react est déjà utilisée par App.jsx (ChevronLeft/Right, Library, Play, etc.) ;
// on s'appuie sur la même dépendance pour les icônes de toggle thème +
// bouton raccourcis (Keyboard, iter-L phase-1.6).
import { Moon, Sun, Keyboard, Compass } from 'lucide-react'
import './Tabs.css'

// iter-L phase-2.1 : ajout du 4e onglet Documentation à droite des trois
// existants. `dataAnchor` posé uniquement sur Documentation pour préparer
// d'éventuels DocLink/Tour pointant vers l'onglet (cohérence avec la
// convention `data-anchor` de L.1).
const TABS = [
  { id: 'library', label: 'Bibliothèque', hint: 'Gérer la bibliothèque de patches' },
  { id: 'designer', label: 'Designer', hint: 'Dessiner et éditer des sons' },
  { id: 'composer', label: 'Composer', hint: 'Composer la timeline' },
  { id: 'documentation', label: 'Documentation', hint: 'Aide, raccourcis et articles', dataAnchor: 'tab-documentation' },
]

// Constante injectée au build par Vite (vite.config.js define).
// Source de vérité : `version` de package.json.
const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev'

function Tabs({ activeTab, onChange, theme, onToggleTheme, shortcutsOverlayOpen, onToggleShortcuts, tourActive, onToggleTour }) {
  const isLight = theme === 'light'
  return (
    <nav className="tabs" role="tablist">
      <div className="tabs-title" title="On Synth App (« on s'en tape »)">
        On_Synth_App
      </div>
      {/* iter-L phase-4.3 : pendant le tour, les boutons d'onglet sont masqués
          (visibility:hidden — le rect reste résolu pour ancrer la progress bar
          que Tour.jsx superpose ici via data-anchor). Navigation d'onglet
          bloquée par construction. */}
      <div
        className={`tabs-buttons${tourActive ? ' is-tour-hidden' : ''}`}
        data-anchor="header-tabs-zone"
      >
        {TABS.map((t) => (
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
        ))}
      </div>
      <button
        type="button"
        className="theme-toggle"
        onClick={onToggleTheme}
        aria-label={isLight ? 'Passer en mode sombre' : 'Passer en mode clair'}
        title={isLight ? 'Passer en mode sombre' : 'Passer en mode clair'}
      >
        {isLight ? <Moon size={16} fill="currentColor" strokeWidth={0} /> : <Sun size={16} fill="currentColor" strokeWidth={1.5} />}
      </button>
      {/* iter-L phase-1.6 : bouton Keyboard = toggle overlay raccourcis.
          État actif quand overlay ouvert. data-anchor pour que l'overlay
          ancre son propre raccourci Ctrl+K dessus (récursion contrôlée). */}
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
      {/* iter-L phase-4.4 : bouton Compass = démarre la visite guidée de
          l'onglet actif. État actif pendant un tour. data-anchor pour de
          futurs DocLink + cohérence convention. */}
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
      <div className="tabs-version" title={`Version ${APP_VERSION}`}>
        v{APP_VERSION}
      </div>
    </nav>
  )
}

export default Tabs
