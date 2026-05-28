import { createContext, useContext, useMemo } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { parseMarkdown } from '../lib/markdown'
import './MarkdownRenderer.css'

// Propage les handlers de navigation doc aux feuilles interactives
// (DocLink cross-onglet, liens doc→doc) sans prop-drilling à travers les
// fonctions de rendu récursives module-level (renderBlock/renderInline,
// qui ne sont pas des composants et ne peuvent pas consommer de contexte).
// Défaut null → rendu inerte (réutilisabilité du renderer hors onglet
// Documentation préservée).
const MarkdownNavContext = createContext({ onDocLink: null, onDocNav: null })

// Rendu d'un AST Markdown en JSX (iter-L phase-2.2). Le parser
// `parseMarkdown` est appelé en mémo par `source` — recomposer un AST
// à chaque rendu est cheap (~µs) mais on évite quand même la
// reconstruction des arbres React enfants au passage.
export default function MarkdownRenderer({ source, onDocLink = null, onDocNav = null }) {
  const ast = useMemo(() => parseMarkdown(source || ''), [source])
  const nav = useMemo(() => ({ onDocLink, onDocNav }), [onDocLink, onDocNav])
  return (
    <MarkdownNavContext.Provider value={nav}>
      <div className="markdown-renderer">
        {ast.map((node, i) => renderBlock(node, i))}
      </div>
    </MarkdownNavContext.Provider>
  )
}

function renderBlock(node, key) {
  switch (node.type) {
    case 'heading': {
      const Tag = `h${node.level}`
      return <Tag key={key} className={`md-h md-h${node.level}`}>{node.children.map(renderInline)}</Tag>
    }
    case 'paragraph':
      return <p key={key} className="md-p">{node.children.map(renderInline)}</p>
    case 'list':
      return renderList(node, key)
    case 'codeBlock':
      // Pas de syntax highlighting (hors scope V1) ; on signale juste
      // la présence d'un `lang` via un badge discret en haut à droite
      // pour distinguer un bloc js d'un bloc texte brut.
      return (
        <pre key={key} className="md-pre">
          {node.lang && <span className="md-pre-lang" aria-hidden="true">{node.lang}</span>}
          <code className={`md-code${node.lang ? ` md-code-${node.lang}` : ''}`}>{node.code}</code>
        </pre>
      )
    case 'blockquote':
      return <blockquote key={key} className="md-blockquote">{node.children.map(renderInline)}</blockquote>
    default:
      return null
  }
}

function renderList(node, key) {
  const Tag = node.ordered ? 'ol' : 'ul'
  const cls = node.ordered ? 'md-ol' : 'md-ul'
  return (
    <Tag key={key} className={cls}>
      {node.items.map((it, j) => (
        <li key={j} className="md-li">
          {it.children.map(renderInline)}
          {it.subList && renderList(it.subList, `${j}-sub`)}
        </li>
      ))}
    </Tag>
  )
}

function renderInline(node, key) {
  switch (node.type) {
    case 'text':
      return node.value
    case 'strong':
      return <strong key={key}>{node.children.map(renderInline)}</strong>
    case 'emphasis':
      return <em key={key}>{node.children.map(renderInline)}</em>
    case 'codeInline':
      return <code key={key} className="md-code-inline">{node.value}</code>
    case 'link': {
      // Lien interne doc→doc : scheme `doc:article-id` (L.3.3) → change
      // l'article courant sans quitter l'onglet Documentation.
      if (node.href.startsWith('doc:')) {
        return <DocNavLink key={key} node={node} />
      }
      // Lien externe : ouvre dans un nouvel onglet avec noopener/noreferrer
      // (protection contre window.opener hijack). Lien interne (ancre `#…`
      // ou chemin relatif) : laissé natif au navigateur — pas de routing
      // en V1, donc rare en pratique.
      const ext = /^https?:\/\//.test(node.href)
      return (
        <a
          key={key}
          href={node.href}
          className="md-link"
          {...(ext ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        >
          {node.children.map(renderInline)}
        </a>
      )
    }
    case 'image':
      return <img key={key} className="md-image" src={node.src} alt={node.alt} />
    case 'docLink':
      return <DocLinkAnchor key={key} node={node} />
    default:
      return null
  }
}

// DocLink : navigation cross-onglet + halo sur l'élément ciblé. Consomme
// le contexte (onDocLink). Sans provider actif → reste inerte (preventDefault
// sans action), pour préserver la réutilisabilité du renderer hors doc.
function DocLinkAnchor({ node }) {
  const { onDocLink } = useContext(MarkdownNavContext)
  return (
    <a
      href="#"
      className="md-link md-doclink"
      data-doclink-target={node.target}
      onClick={(e) => {
        e.preventDefault()
        onDocLink?.(node.target)
      }}
    >
      {node.children.map(renderInline)}
      <ArrowUpRight className="md-doclink-icon" size={13} strokeWidth={2.2} aria-hidden="true" />
    </a>
  )
}

// Lien interne doc→doc (scheme `doc:article-id`, L.3.3) : change l'article
// courant sans quitter l'onglet Documentation. Rendu comme un lien normal
// (c'est un hyperlien classique, pas un saut vers l'UI). Inerte sans provider.
function DocNavLink({ node }) {
  const { onDocNav } = useContext(MarkdownNavContext)
  const articleId = node.href.slice(4)
  return (
    <a
      href="#"
      className="md-link md-docnav"
      data-docnav-target={articleId}
      onClick={(e) => {
        e.preventDefault()
        onDocNav?.(articleId)
      }}
    >
      {node.children.map(renderInline)}
    </a>
  )
}
