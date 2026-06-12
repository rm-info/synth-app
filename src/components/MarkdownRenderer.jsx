import { createContext, Fragment, useContext, useMemo } from 'react'
import { ArrowUpRight, ChevronRight } from 'lucide-react'
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
      // `id` posé seulement quand explicite (`{#id}`, iter-U phase-1.1) —
      // cible des liens profonds `doc:article#id`. null → attribut absent.
      return <Tag key={key} id={node.id || undefined} className={`md-h md-h${node.level}`}>{node.children.map(renderInline)}</Tag>
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
    case 'math':
      // Formule en bloc (centrée). Le mathAst est déjà construit au parse.
      // displayMode=true : pilote le layout empilé du `\sum` (cf. renderSum).
      return <div key={key} className="md-math md-math-block">{renderMath(node.mathAst, true)}</div>
    case 'details':
      // Accordéon (iter-U phase-1.2) : <details>/<summary> natif (toggle +
      // accessibilité gratuits), replié par défaut. Contenu = blocs markdown
      // récursifs (renderBlock), donc tout le V1 marche dedans (formules
      // incluses). Le chevron pivote via CSS sur details[open].
      return (
        <details key={key} className="md-details">
          <summary className="md-details-summary">
            <ChevronRight className="md-details-chevron" size={15} strokeWidth={2.2} aria-hidden="true" />
            <span className="md-details-title">{node.title}</span>
          </summary>
          <div className="md-details-body">
            {node.children.map((child, j) => renderBlock(child, j))}
          </div>
        </details>
      )
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
    case 'math':
      return <span key={key} className="md-math md-math-inline">{renderMath(node.mathAst, false)}</span>
    default:
      return null
  }
}

// Rendu récursif d'un mathAst (iter-L phase-R.2). Dispatch pur : sup/sub →
// balises natives, frac → barre CSS empilée, var → italique, text → string,
// sum → bornes à droite (inline) ou empilées (display). `displayMode` voyage
// dans la récursion : seul `\sum` s'en sert aujourd'hui (iter-M phase-5a).
function renderMath(nodes, displayMode = false) {
  return nodes.map((node, key) => {
    switch (node.type) {
      case 'text':
        return node.value
      case 'var':
        return <i key={key} className="md-math-var">{node.value}</i>
      case 'sup':
        return <sup key={key}>{renderMath(node.children, displayMode)}</sup>
      case 'sub':
        return <sub key={key}>{renderMath(node.children, displayMode)}</sub>
      case 'frac':
        return (
          <span key={key} className="md-frac">
            <span className="md-frac-num">{renderMath(node.num, displayMode)}</span>
            <span className="md-frac-den">{renderMath(node.den, displayMode)}</span>
          </span>
        )
      case 'sum':
        return renderSum(node, key, displayMode)
      case 'delim':
        return renderDelim(node, key, displayMode)
      default:
        return null
    }
  })
}

// `\sum` (iter-M phase-5a). Inline : Σ avec ses bornes en sub/sup à droite
// (primitives natives, compact, reste dans le flux). Display : grille
// verticale — borne haute au-dessus du Σ, basse en-dessous, op centré et un
// peu plus grand (« comme au tableau »). Les bornes sont toujours rendues en
// textstyle (displayMode=false) pour rester petites, même au-dessus/dessous.
function renderSum(node, key, displayMode) {
  if (displayMode) {
    return (
      <span key={key} className="md-sum-display">
        {node.upper && <span className="md-sum-upper">{renderMath(node.upper, false)}</span>}
        <span className="md-sum-op">Σ</span>
        {node.lower && <span className="md-sum-lower">{renderMath(node.lower, false)}</span>}
      </span>
    )
  }
  return (
    <span key={key} className="md-sum">
      <span className="md-sum-op">Σ</span>
      {node.upper && <sup>{renderMath(node.upper, false)}</sup>}
      {node.lower && <sub>{renderMath(node.lower, false)}</sub>}
    </span>
  )
}

// Vrai si le mathAst contient une fraction (à n'importe quelle profondeur)
// → le contenu est « haut », les délimiteurs qui l'entourent doivent grandir.
function isTall(nodes) {
  return nodes.some((n) => n.type === 'frac' || (n.children && isTall(n.children)))
}

// Délimiteurs ( ) [ ]. Contenu sur une ligne → glyphes littéraux (fidélité
// typographique). Contenu haut (fraction) → délimiteurs dessinés en CSS qui
// s'étirent à la hauteur du contenu (inline-flex stretch), sans mesure JS.
function renderDelim(node, key, displayMode = false) {
  const inner = renderMath(node.children, displayMode)
  if (!isTall(node.children)) {
    return <Fragment key={key}>{node.open}{inner}{node.close}</Fragment>
  }
  const shape = node.open === '(' ? 'md-delim-paren' : 'md-delim-bracket'
  return (
    <span key={key} className="md-delim">
      <span className={`md-delim-edge md-delim-open ${shape}`} aria-hidden="true" />
      <span className="md-delim-inner">{inner}</span>
      <span className={`md-delim-edge md-delim-close ${shape}`} aria-hidden="true" />
    </span>
  )
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

// Lien interne doc→doc (scheme `doc:article-id`, L.3.3 ; fragment U.1) :
// change l'article courant sans quitter l'onglet Documentation. Avec un
// fragment `doc:article-id#heading-id` (iter-U phase-1.1), scrolle en plus
// vers le heading ciblé. Rendu comme un lien normal (c'est un hyperlien
// classique, pas un saut vers l'UI). Inerte sans provider.
function DocNavLink({ node }) {
  const { onDocNav } = useContext(MarkdownNavContext)
  const raw = node.href.slice(4)
  const hash = raw.indexOf('#')
  const articleId = hash === -1 ? raw : raw.slice(0, hash)
  const fragment = hash === -1 ? null : raw.slice(hash + 1)
  return (
    <a
      href="#"
      className="md-link md-docnav"
      data-docnav-target={articleId}
      onClick={(e) => {
        e.preventDefault()
        onDocNav?.(articleId, fragment)
      }}
    >
      {node.children.map(renderInline)}
    </a>
  )
}
