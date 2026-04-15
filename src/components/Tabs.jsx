import './Tabs.css'

const TABS = [
  { id: 'designer', label: 'Designer', hint: 'Dessiner et éditer des sons' },
  { id: 'composer', label: 'Composer', hint: 'Composer la timeline' },
]

function Tabs({ activeTab, onChange }) {
  return (
    <nav className="tabs" role="tablist">
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
    </nav>
  )
}

export default Tabs
