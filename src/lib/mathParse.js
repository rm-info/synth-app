// src/lib/mathParse.js — Sous-parser math maison (iter-L phase-R.1).
//
// Second langage imbriqué dans le Markdown : le contenu entre `$…$`
// (inline) ou `$$…$$` (block) est parsé ici en un `mathAst` récursif,
// consommé par `renderMath` dans MarkdownRenderer.jsx. Grammaire
// LaTeX-like volontairement minuscule (musique/tempéraments : ratios,
// cents, exposants, fractions). Pas de KaTeX — voir CONTEXT.md
// (« Décisions architecturales »). Désambiguïsation par accolades
// obligatoires (`^{x}`, pas `^x`).
//
// Constructs : `^{…}` exposant, `_{…}` indice, `\frac{a}{b}` fraction,
// `\cmd` → symbole Unicode, lettre latine isolée → variable italique,
// tout le reste → texte. Le contenu des accolades est re-parsé en math
// (récursion). Hors scope : matrices, intégrales, racines, sommes — ne
// pas anticiper (la ligne maison ne tient que si elle reste petite).

const MATH_SYMBOLS = {
  pi: 'π', alpha: 'α', beta: 'β', gamma: 'γ',
  cdot: '⋅', times: '×', div: '÷', approx: '≈',
  neq: '≠', leq: '≤', geq: '≥', pm: '±',
}

const warnDev = (msg) => {
  if (import.meta.env?.DEV) console.warn(`[mathParse] ${msg}`)
}

// Renvoie le contenu d'un groupe `{…}` ouvrant à `open` (qui doit pointer
// sur `{`) et l'index juste après le `}` correspondant. Gère l'imbrication
// via un compteur de profondeur (`\frac{a^{2}}{b}`). null si non fermé.
function matchBrace(src, open) {
  if (src[open] !== '{') return null
  let depth = 0
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++
    else if (src[i] === '}' && --depth === 0) {
      return { content: src.slice(open + 1, i), end: i + 1 }
    }
  }
  return null
}

// Apparie un délimiteur ouvrant `openCh` à `open` avec son fermant `closeCh`.
// Respecte l'imbrication du même délimiteur ET ignore tout ce qui est dans
// des accolades (`(\frac{a}{b})` : le `)` est après le `}`). null si non
// fermé (la parenthèse restera alors littérale).
function matchDelim(src, open, openCh, closeCh) {
  let depth = 0
  let brace = 0
  for (let i = open; i < src.length; i++) {
    const ch = src[i]
    if (ch === '{') brace++
    else if (ch === '}') brace = Math.max(0, brace - 1)
    else if (brace === 0) {
      if (ch === openCh) depth++
      else if (ch === closeCh && --depth === 0) {
        return { content: src.slice(open + 1, i), end: i + 1 }
      }
    }
  }
  return null
}

const DELIM_PAIRS = { '(': ')', '[': ']' }

// Parse une formule brute en tableau de noeuds math. Scan linéaire à
// buffer (même modèle que `parseInline`) : on accumule le texte courant
// et on le flush dès qu'un token structurant (^ _ \ ou lettre) apparaît.
export function parseMath(src) {
  const nodes = []
  let buffer = ''
  let i = 0
  const flush = () => {
    if (buffer.length > 0) { nodes.push({ type: 'text', value: buffer }); buffer = '' }
  }

  while (i < src.length) {
    const c = src[i]

    // Exposant ^{…} / indice _{…} — accolades obligatoires. Sans accolade
    // fermante, on retombe sur le traitement littéral (caractère bufferisé).
    if ((c === '^' || c === '_') && src[i + 1] === '{') {
      const g = matchBrace(src, i + 1)
      if (g) {
        flush()
        nodes.push({ type: c === '^' ? 'sup' : 'sub', children: parseMath(g.content) })
        i = g.end
        continue
      }
      warnDev(`accolade non fermée après '${c}' — rendu littéral`)
    }

    // Commandes \xxx : \frac, symboles Unicode, ou inconnue (littérale).
    if (c === '\\') {
      const m = src.slice(i).match(/^\\([a-zA-Z]+)/)
      if (m) {
        const cmd = m[1]
        if (cmd === 'frac') {
          const num = matchBrace(src, i + m[0].length)
          const den = num && matchBrace(src, num.end)
          if (num && den) {
            flush()
            nodes.push({ type: 'frac', num: parseMath(num.content), den: parseMath(den.content) })
            i = den.end
            continue
          }
          warnDev('\\frac mal formé (attend deux groupes {…}{…}) — rendu littéral')
        } else if (MATH_SYMBOLS[cmd]) {
          flush()
          nodes.push({ type: 'text', value: MATH_SYMBOLS[cmd] })
          i += m[0].length
          continue
        } else {
          warnDev(`commande inconnue \\${cmd} — rendu littéral`)
          buffer += m[0]
          i += m[0].length
          continue
        }
      }
    }

    // Délimiteurs ( ) et [ ] : appariés en un noeud `delim` pour pouvoir
    // s'agrandir avec leur contenu au rendu (cf. fraction). Sans fermant,
    // la parenthèse retombe en littéral (caractère bufferisé plus bas).
    if (DELIM_PAIRS[c]) {
      const g = matchDelim(src, i, c, DELIM_PAIRS[c])
      if (g) {
        flush()
        nodes.push({ type: 'delim', open: c, close: DELIM_PAIRS[c], children: parseMath(g.content) })
        i = g.end
        continue
      }
    }

    // Lettre latine isolée → variable en italique (convention LaTeX).
    if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z')) {
      flush()
      nodes.push({ type: 'var', value: c })
      i++
      continue
    }

    buffer += c
    i++
  }
  flush()
  return nodes
}
