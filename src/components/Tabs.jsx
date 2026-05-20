import './Tabs.css'

const TABS = [
  { id: 'designer', label: 'Designer', hint: 'Dessiner et éditer des sons' },
  { id: 'composer', label: 'Composer', hint: 'Composer la timeline' },
]

// Constante injectée au build par Vite (vite.config.js define).
// Source de vérité : `version` de package.json.
const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev'

function Tabs({ activeTab, onChange }) {
  return (
    <nav className="tabs" role="tablist">
      <div className="tabs-title" title="On Synth App (« on s'en tape »)">
        On_Synth_App
      </div>
      <div className="tabs-buttons">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={activeTab === t.id}
            className={`tab ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => onChange(t.id)}
            title={t.hint}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="tabs-version" title={`Version ${APP_VERSION}`}>
        v{APP_VERSION}
      </div>
    </nav>
  )
}

export default Tabs
