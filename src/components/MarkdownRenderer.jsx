import { useMemo } from 'react'
import { parseMarkdown } from '../lib/markdown'
import './MarkdownRenderer.css'

// Rendu d'un AST Markdown en JSX (iter-L phase-2.2). Le parser
// `parseMarkdown` est appelé en mémo par `source` — recomposer un AST
// à chaque rendu est cheap (~µs) mais on évite quand même la
// reconstruction des arbres React enfants au passage.
export default function MarkdownRenderer({ source }) {
  const ast = useMemo(() => parseMarkdown(source || ''), [source])
  return (
    <div className="markdown-renderer">
      {ast.map((node, i) => renderBlock(node, i))}
    </div>
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
      // TODO L.3 : brancher DocLink (navigation cross-onglet + highlight
      // ancré via getAnchoredPosition). En L.2 : rendu inerte, style lien.
      return (
        <a
          key={key}
          href="#"
          className="md-link md-doclink"
          data-doclink-target={node.target}
          onClick={(e) => e.preventDefault()}
        >
          {node.children.map(renderInline)}
        </a>
      )
    default:
      return null
  }
}
