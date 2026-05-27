// src/lib/markdown.js — Renderer Markdown maison (iter-L phase-2.2).
//
// Sous-ensemble V1 :
//   blocs : H1-H4, paragraphe, liste ordonnée/non-ordonnée (1 niveau
//           d'imbrication simple), code block, blockquote.
//   inlines : gras (**), italique (*), code inline (`), lien externe
//             [label](href), image ![alt](src), <DocLink target="...">
//             label</DocLink> (parsé, rendu inerte en L.2).
// Hors V1 : tableaux, footnotes, strikethrough, HTML brut (sauf DocLink),
// autoliens, task lists.
//
// API publique : `parseMarkdown(source) → AST` consommé par
// `MarkdownRenderer.jsx`. Pas de dépendance npm — JS pur, ~200 lignes.
// Deux passes : (1) block-level ligne par ligne, (2) inline sur les
// chunks textuels via regex/scan. L'AST n'est pas exposé comme contrat
// public stable ; il peut évoluer si le V2 en a besoin.

// ----- Parser inline -----

// Parse une chaîne en suite de noeuds inline. Algorithme : scan
// linéaire avec buffer textuel, flush à chaque match d'un token
// (image / lien / DocLink / strong / em / code inline). Les tokens
// imbriqués (ex. `**[label](url)**`) sont gérés par récursion sur le
// contenu interne. Pas de support pour les escapes (`\*`) en V1 — la
// grammaire est volontairement petite ; on ajoutera si un article en a
// besoin.
function parseInline(text) {
  const nodes = []
  let buffer = ''
  let i = 0
  const flush = () => {
    if (buffer.length > 0) {
      nodes.push({ type: 'text', value: buffer })
      buffer = ''
    }
  }

  while (i < text.length) {
    const c = text[i]
    const rest = text.slice(i)

    // Image ![alt](src) — testée avant le lien pour le `!` prefix.
    if (c === '!' && text[i + 1] === '[') {
      const m = rest.match(/^!\[([^\]]*)\]\(([^)]+)\)/)
      if (m) { flush(); nodes.push({ type: 'image', alt: m[1], src: m[2] }); i += m[0].length; continue }
    }

    // <DocLink target="...">label</DocLink> — parsé, traité comme lien
    // inerte par le renderer en L.2. L.3 branchera le comportement.
    if (c === '<' && rest.startsWith('<DocLink')) {
      const m = rest.match(/^<DocLink\s+target="([^"]+)"\s*>([\s\S]*?)<\/DocLink>/)
      if (m) { flush(); nodes.push({ type: 'docLink', target: m[1], children: parseInline(m[2]) }); i += m[0].length; continue }
    }

    // Lien [label](href).
    if (c === '[') {
      const m = rest.match(/^\[([^\]]+)\]\(([^)]+)\)/)
      if (m) { flush(); nodes.push({ type: 'link', href: m[2], children: parseInline(m[1]) }); i += m[0].length; continue }
    }

    // Gras **text** — testé avant l'italique (préfixe ** vs *).
    if (c === '*' && text[i + 1] === '*') {
      const close = text.indexOf('**', i + 2)
      if (close > -1) {
        flush()
        nodes.push({ type: 'strong', children: parseInline(text.slice(i + 2, close)) })
        i = close + 2
        continue
      }
    }

    // Italique *text*.
    if (c === '*') {
      const close = text.indexOf('*', i + 1)
      if (close > -1) {
        flush()
        nodes.push({ type: 'emphasis', children: parseInline(text.slice(i + 1, close)) })
        i = close + 1
        continue
      }
    }

    // Code inline `text`.
    if (c === '`') {
      const close = text.indexOf('`', i + 1)
      if (close > -1) {
        flush()
        nodes.push({ type: 'codeInline', value: text.slice(i + 1, close) })
        i = close + 1
        continue
      }
    }

    buffer += c
    i++
  }
  flush()
  return nodes
}

// ----- Parser blocs -----

// Patterns de lignes qui terminent un paragraphe en cours. Utilisés pour
// décider quand un paragraphe agrège la ligne suivante ou s'arrête.
const BLOCK_BREAK = /^(#{1,4}\s|>\s?|[-*]\s+|\d+\.\s+|```)/

export function parseMarkdown(source) {
  const lines = (source || '').split('\n')
  const blocks = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Code block ``` … ```
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim() || null
      const start = ++i
      while (i < lines.length && !lines[i].startsWith('```')) i++
      blocks.push({ type: 'codeBlock', lang, code: lines.slice(start, i).join('\n') })
      i++ // skip closing fence
      continue
    }

    // Ligne vide : séparateur de blocs.
    if (line.trim() === '') { i++; continue }

    // Titre #..####
    const h = line.match(/^(#{1,4})\s+(.*)$/)
    if (h) {
      blocks.push({ type: 'heading', level: h[1].length, children: parseInline(h[2]) })
      i++
      continue
    }

    // Blockquote (lignes successives `> …` agrégées en un seul paragraphe).
    if (line.startsWith('> ') || line === '>') {
      const acc = []
      while (i < lines.length && (lines[i].startsWith('> ') || lines[i] === '>')) {
        acc.push(lines[i].replace(/^>\s?/, ''))
        i++
      }
      blocks.push({ type: 'blockquote', children: parseInline(acc.join(' ')) })
      continue
    }

    // Liste non-ordonnée (`- ` ou `* `). Imbrication 1 niveau : un sous-
    // item est une ligne `  - …` (≥ 2 espaces d'indent) ; rendu comme une
    // sous-liste à l'intérieur du parent. Suffisant pour V1.
    if (/^[-*]\s+/.test(line)) {
      const items = parseList(lines, i, false)
      blocks.push({ type: 'list', ordered: false, items: items.items })
      i = items.next
      continue
    }

    // Liste ordonnée (`N. `).
    if (/^\d+\.\s+/.test(line)) {
      const items = parseList(lines, i, true)
      blocks.push({ type: 'list', ordered: true, items: items.items })
      i = items.next
      continue
    }

    // Paragraphe : ligne courante + lignes suivantes non vides et non
    // démarrant un autre bloc, jointes par espace (comportement Markdown
    // standard pour les retours simples).
    const para = [line]
    i++
    while (i < lines.length && lines[i].trim() !== '' && !BLOCK_BREAK.test(lines[i])) {
      para.push(lines[i])
      i++
    }
    blocks.push({ type: 'paragraph', children: parseInline(para.join(' ')) })
  }

  return blocks
}

// Parse une suite d'items de liste à partir de `lines[start]`. Continue
// tant que les lignes correspondent au marker (ordonné ou non). Les lignes
// indentées ≥ 2 espaces sont des continuations de l'item courant (joined
// par espace) ; un sous-item indenté démarre une sous-liste (un seul
// niveau d'imbrication supporté en V1, cohérent avec le scope du prompt).
function parseList(lines, start, ordered) {
  const marker = ordered ? /^(\d+)\.\s+(.*)$/ : /^[-*]\s+(.*)$/
  const items = []
  let i = start

  while (i < lines.length) {
    const line = lines[i]
    const m = line.match(marker)
    if (!m) break
    const head = ordered ? m[2] : m[1]
    const contentLines = [head]
    i++

    // Continuations (lignes indentées sans marker à leur tour).
    while (i < lines.length) {
      const l = lines[i]
      if (l.trim() === '') break
      if (marker.test(l)) break
      // Sous-liste : ligne avec indent + marker enfant. Récursion pour 1
      // niveau seulement (les sous-sous-listes sont aplaties comme texte).
      const sub = l.match(/^\s{2,}([-*]|\d+\.)\s+/)
      if (sub) break // sera traité comme sous-liste ci-dessous
      contentLines.push(l.replace(/^\s+/, ''))
      i++
    }

    const item = { type: 'listItem', children: parseInline(contentLines.join(' ')), subList: null }

    // Capture une sous-liste si la ligne suivante est indentée avec marker.
    if (i < lines.length) {
      const l = lines[i]
      const sub = l.match(/^\s{2,}([-*]|\d+\.)\s/)
      if (sub) {
        const isOrdered = /^\d+\.$/.test(sub[1])
        // Désindente d'autant qu'il faut pour rendre la sous-liste parsable
        // de façon homogène (on enlève l'indent commun ≥ 2 espaces).
        const indentMatch = l.match(/^(\s+)/)
        const indent = indentMatch ? indentMatch[1].length : 0
        const dedented = []
        while (i < lines.length && lines[i].startsWith(' '.repeat(indent))) {
          dedented.push(lines[i].slice(indent))
          i++
        }
        const sublist = parseList(dedented, 0, isOrdered)
        item.subList = { type: 'list', ordered: isOrdered, items: sublist.items }
      }
    }

    items.push(item)
  }

  return { items, next: i }
}
