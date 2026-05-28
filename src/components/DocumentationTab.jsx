import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, List, Keyboard, X } from 'lucide-react'
import SidebarResizer from './SidebarResizer'
import MarkdownRenderer from './MarkdownRenderer'
import ShortcutsReference from './ShortcutsReference'
import { DOC_TOC } from '../docs/index.js'
import { DOC_SIDEBAR_COLLAPSED_WIDTH, DOC_SIDEBAR_MIN_WIDTH } from '../reducer'
import './DocumentationTab.css'

// Layout de l'onglet Documentation (iter-L phase-2.3) : sidebar TOC à
// gauche (collapsible + resizable, pattern Designer / Composer) + zone
// contenu scrollable à droite. La position de scroll par article est
// sauvegardée avec un débounce léger ; restaurée au switch d'article.
//
// Mode collapsed (refonte L.2 follow-up) : barre verticale de boutons
// icônes — chevron (expand) + Sommaire (popover style PatchPicker) +
// Raccourcis (bascule directe sur l'article 'shortcuts'). Le label
// vertical "Sommaire" initial débordait sous l'icône en mode étroit ;
// on revient sur des affordances actionnables.
//
// Dispatch sur `entry.type` :
//   - 'markdown'  → MarkdownRenderer source={entry.source}
//   - 'generated' → cf. ShortcutsReference pour id 'shortcuts'
//
// Si `currentArticleId` est null ou pointe vers une entrée inexistante,
// affiche une page d'accueil TOC (liste des articles, ou empty-state
// quand la TOC est encore vide).
const SCROLL_SAVE_DEBOUNCE_MS = 200
const SHORTCUTS_ARTICLE_ID = 'shortcuts'

export default function DocumentationTab({
  doc,
  sidebarCollapsed,
  sidebarWidth,
  onDocLink,
  onSetCurrentArticle,
  onSetArticleScroll,
  onToggleSidebar,
  onSetSidebarWidth,
}) {
  const { currentArticleId, scrollPositions } = doc

  const currentEntry = useMemo(
    () => DOC_TOC.find((e) => e.id === currentArticleId) ?? null,
    [currentArticleId],
  )

  // Regroupement par section (ordre des sections = ordre d'apparition).
  const sections = useMemo(() => {
    const map = new Map()
    for (const entry of DOC_TOC) {
      const key = entry.section ?? '—'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(entry)
    }
    return Array.from(map.entries()).map(([title, items]) => ({ title, items }))
  }, [])

  const contentRef = useRef(null)
  const saveTimerRef = useRef(null)

  // Restaure la position de scroll au mount / switch d'article. setTimeout
  // 0 = attendre que le DOM soit peint après le changement de contenu
  // (sinon le scrollTop est appliqué avant le re-render).
  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    const saved = currentArticleId != null ? (scrollPositions[currentArticleId] ?? 0) : 0
    // Annule un éventuel save en cours du précédent article — la frame
    // de transition ne doit pas écraser la position que l'on s'apprête
    // à restaurer pour le nouvel article.
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    const id = window.setTimeout(() => { el.scrollTop = saved }, 0)
    return () => window.clearTimeout(id)
    // Volontairement on ne dépend pas de scrollPositions : la map est
    // mise à jour à chaque scroll, ce qui re-tirerait l'effet et
    // forcerait un reset visuel pendant la lecture.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentArticleId])

  const handleScroll = useCallback(() => {
    if (!currentArticleId) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = window.setTimeout(() => {
      const el = contentRef.current
      if (!el) return
      onSetArticleScroll(currentArticleId, el.scrollTop)
      saveTimerRef.current = null
    }, SCROLL_SAVE_DEBOUNCE_MS)
  }, [currentArticleId, onSetArticleScroll])

  // Cleanup à l'unmount pour éviter un dispatch après que la tab a quitté
  // l'écran (l'onglet est conditionnellement monté).
  useEffect(() => () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
  }, [])

  const handleResize = useCallback((w) => onSetSidebarWidth(w), [onSetSidebarWidth])

  // Popover Sommaire (mode collapsed uniquement). Pattern click-outside
  // + Escape calqué sur composerLibraryPopover (App.jsx). Fermé
  // automatiquement quand on étend la sidebar (sinon orphelin visuel).
  const [tocPopoverOpen, setTocPopoverOpen] = useState(false)
  const tocPopoverRef = useRef(null)
  const tocTriggerRef = useRef(null)
  useEffect(() => {
    if (!tocPopoverOpen) return
    const onDocClick = (e) => {
      if (tocPopoverRef.current?.contains(e.target)) return
      if (tocTriggerRef.current?.contains(e.target)) return
      setTocPopoverOpen(false)
    }
    const onEscape = (e) => { if (e.key === 'Escape') setTocPopoverOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onEscape)
    }
  }, [tocPopoverOpen])
  // Ferme la popup quand la sidebar repasse en étendu (la nav est déjà
  // visible inline, garder la popover ouverte serait redondant).
  useEffect(() => {
    if (!sidebarCollapsed) setTocPopoverOpen(false)
  }, [sidebarCollapsed])

  const pickArticleAndClose = useCallback((id) => {
    onSetCurrentArticle(id)
    setTocPopoverOpen(false)
  }, [onSetCurrentArticle])

  const jumpToShortcuts = useCallback(() => {
    onSetCurrentArticle(SHORTCUTS_ARTICLE_ID)
    setTocPopoverOpen(false)
  }, [onSetCurrentArticle])

  return (
    <main
      className="documentation-layout"
      style={{
        '--doc-sidebar-width': sidebarCollapsed
          ? `${DOC_SIDEBAR_COLLAPSED_WIDTH}px`
          : `${sidebarWidth}px`,
      }}
    >
      <aside className={`doc-sidebar${sidebarCollapsed ? ' is-collapsed' : ''}`}>
        {sidebarCollapsed ? (
          <>
            <button
              type="button"
              className="sidebar-toggle sidebar-toggle-standalone"
              onClick={onToggleSidebar}
              title="Ouvrir le sommaire"
              aria-label="Ouvrir le sommaire"
              aria-expanded={false}
            >
              <ChevronRight size={14} strokeWidth={2.2} />
            </button>
            <button
              type="button"
              ref={tocTriggerRef}
              className={`doc-collapsed-btn${tocPopoverOpen ? ' is-active' : ''}`}
              onClick={() => setTocPopoverOpen((v) => !v)}
              title="Sommaire (flottant)"
              aria-label="Sommaire"
              aria-expanded={tocPopoverOpen}
            >
              <List size={16} strokeWidth={1.9} />
            </button>
            <button
              type="button"
              className={`doc-collapsed-btn${currentArticleId === SHORTCUTS_ARTICLE_ID ? ' is-active' : ''}`}
              onClick={jumpToShortcuts}
              title="Raccourcis clavier"
              aria-label="Raccourcis clavier"
              aria-pressed={currentArticleId === SHORTCUTS_ARTICLE_ID}
            >
              <Keyboard size={16} strokeWidth={1.9} />
            </button>
            {tocPopoverOpen && (
              <div
                className="doc-toc-popover"
                ref={tocPopoverRef}
                role="dialog"
                aria-label="Sommaire"
              >
                <div className="doc-toc-popover-header">
                  <h3>Sommaire</h3>
                  <button
                    type="button"
                    className="popover-close-btn"
                    onClick={() => setTocPopoverOpen(false)}
                    title="Fermer le sommaire"
                    aria-label="Fermer le sommaire"
                  >
                    <X size={14} strokeWidth={2.2} />
                  </button>
                </div>
                <nav className="doc-toc" aria-label="Sommaire">
                  <TocNav
                    sections={sections}
                    currentArticleId={currentArticleId}
                    onPick={pickArticleAndClose}
                  />
                </nav>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="doc-sidebar-header">
              <h3>Documentation</h3>
              <button
                type="button"
                className="sidebar-toggle sidebar-toggle-inline"
                onClick={onToggleSidebar}
                title="Réduire le sommaire"
                aria-label="Réduire le sommaire"
                aria-expanded={true}
              >
                <ChevronLeft size={14} strokeWidth={2.2} />
              </button>
            </div>
            <nav className="doc-toc" aria-label="Sommaire">
              <TocNav
                sections={sections}
                currentArticleId={currentArticleId}
                onPick={onSetCurrentArticle}
              />
            </nav>
            <SidebarResizer
              side="right"
              width={sidebarWidth}
              minWidth={DOC_SIDEBAR_MIN_WIDTH}
              onChange={handleResize}
              ariaLabel="Redimensionner le sommaire"
            />
          </>
        )}
      </aside>

      <section className="doc-content" ref={contentRef} onScroll={handleScroll}>
        {renderArticle(currentEntry, sections, onSetCurrentArticle, onDocLink)}
      </section>
    </main>
  )
}

// Rendu factorisé de la nav TOC : utilisé à la fois par la sidebar
// étendue (onPick = bascule directe) et la popover du mode collapsed
// (onPick = bascule + ferme la popover).
function TocNav({ sections, currentArticleId, onPick }) {
  if (sections.length === 0) {
    return <div className="doc-toc-empty">Aucun article disponible.</div>
  }
  return sections.map((sec) => (
    <div key={sec.title} className="doc-toc-section">
      <div className="doc-toc-section-title">{sec.title}</div>
      <ul className="doc-toc-list">
        {sec.items.map((entry) => (
          <li key={entry.id}>
            <button
              type="button"
              className={`doc-toc-item${entry.id === currentArticleId ? ' is-active' : ''}`}
              onClick={() => onPick(entry.id)}
            >
              {entry.title}
            </button>
          </li>
        ))}
      </ul>
    </div>
  ))
}

function renderArticle(entry, sections, onSetCurrentArticle, onDocLink) {
  if (!entry) {
    // Page d'accueil : liste des articles disponibles, ou empty-state quand
    // la TOC est encore vide (L.2.3 brut, avant L.2.4/2.5).
    return (
      <div className="doc-home">
        <h1>Documentation</h1>
        {sections.length === 0 ? (
          <p>Aucun article n'est encore disponible.</p>
        ) : (
          <>
            <p>Sélectionne un article dans le sommaire pour démarrer.</p>
            {sections.map((sec) => (
              <div key={sec.title} className="doc-home-section">
                <h3>{sec.title}</h3>
                <ul>
                  {sec.items.map((e) => (
                    <li key={e.id}>
                      <button
                        type="button"
                        className="doc-home-link"
                        onClick={() => onSetCurrentArticle(e.id)}
                      >
                        {e.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </>
        )}
      </div>
    )
  }

  // Dispatch par type :
  //   - 'markdown'  → MarkdownRenderer + source brute (L.2.3).
  //   - 'generated' → composant React dédié, dispatché par id (L.2.4).
  //                   Pour ajouter un nouveau type généré, ajouter un cas
  //                   ici et un import du composant correspondant.
  if (entry.type === 'markdown') {
    return <MarkdownRenderer source={entry.source} onDocLink={onDocLink} />
  }
  if (entry.type === 'generated' && entry.id === 'shortcuts') {
    return <ShortcutsReference />
  }
  return (
    <div className="doc-home">
      <h1>{entry.title}</h1>
      <p>Type de contenu non géré : <code>{entry.type}</code>.</p>
    </div>
  )
}
