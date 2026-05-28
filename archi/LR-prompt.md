# Prompt L.R — Iteration L (extension renderer Markdown : math support maison)

## Contexte

V1 Iteration L atteinte (L.0-L.4 livrées). Le renderer Markdown
maison (`src/lib/markdown.js` + `src/components/MarkdownRenderer.jsx`)
couvre titres, paragraphes, listes, code inline/block, emphase,
liens, images, DocLink. **Pas de support des formules
mathématiques.**

**Objectif L.R** : étendre le renderer pour afficher proprement
les formules dont la doc a besoin (ratios, exposants, fractions,
indices, quelques symboles grecs/opérateurs). Maison, ~80 lignes de
parser + ~20 de CSS. **Pas de KaTeX** — préserve le principe "no npm
dep" du projet, et le besoin réel (musique/tempéraments) est petit
et le restera (pas de matrices, pas d'intégrales).

**Pourquoi maintenant** (entre L.4 et L.5) : les contenus L.5
(fiches tempéraments A.2, glossaires C.7/C.8, articles C.9)
généreront massivement des ratios (`3:2`), cents, exposants
(`2^{1/12}`), fractions (`\frac{3}{2}`), commas. Sans le math
support, le writer contournerait avec du Markdown approximatif
qu'on devrait réécrire. Donc L.R **avant** la rédaction de masse.

**Sortie attendue** : `$...$` (inline) et `$$...$$` (block) rendent
exposants, indices, fractions, lettres en italique, symboles
Unicode. Le `_renderer-test.md` est étendu pour valider visuellement.
Aucune dépendance ajoutée.

## Pré-lecture obligatoire

1. `src/lib/markdown.js` — parser actuel (scan inline `parseInline`,
   blocs `parseMarkdown` ligne-par-ligne). Tu l'étends.
2. `src/components/MarkdownRenderer.jsx` — `renderBlock` /
   `renderInline` (dispatch AST → JSX). Tu ajoutes les cas math.
3. `src/docs/articles/_renderer-test.md` — fichier de validation à
   enrichir.
4. `archi/BACKLOG.md` section "L.R" du plan en phases — spec figée.

## Décisions de design figées (arbitré 2026-05-28)

- **Délimiteurs** : `$...$` math inline, `$$...$$` math block
  (centré, espacement vertical). Le block `$$` est détecté au
  niveau bloc (ligne commençant par `$$`, mono- ou multi-ligne
  jusqu'à la fermeture). L'inline `$` est détecté dans `parseInline`.
- **Constructs supportés** :
  - `^{x}` exposant (**accolades obligatoires** — pas de `^x` nu,
    pour désambiguïser où l'exposant se termine)
  - `_{x}` indice (accolades obligatoires)
  - `\frac{a}{b}` fraction (rendu empilé : numérateur / barre / dénom)
  - **Italique auto** sur les lettres latines isolées (`a-z`, `A-Z`)
    **à l'intérieur des délimiteurs math uniquement** — convention
    LaTeX (les variables sont en italique). N'affecte JAMAIS le
    texte hors `$...$`.
  - Récursivité : le contenu des accolades est re-parsé en math
    (ex. `\frac{a^{2}}{b}` → exposant dans le numérateur).
- **Mapping Unicode** (~12 entrées, commandes `\xxx`) :
  `\pi`→π, `\alpha`→α, `\beta`→β, `\gamma`→γ, `\cdot`→⋅,
  `\times`→×, `\div`→÷, `\approx`→≈, `\neq`→≠, `\leq`→≤,
  `\geq`→≥, `\pm`→±. (Liste extensible trivialement plus tard.)
- **Syntaxe LaTeX-like assumée** (pas de DSL "visuel" maison) : pour
  la **réversibilité** — si un jour on devait passer à KaTeX, les
  articles ne changeraient pas. Et désambiguïsation par accolades.
- **Pas d'escape `\$`** en V1 (cohérent avec l'absence d'escape
  `\*` du parser actuel) : un `$` non apparié reste littéral (le
  scan ne crée un nœud math que si un `$` fermant est trouvé). Si
  un article a besoin d'un `$` littéral à côté de math, on ajoutera
  l'escape.

**Hors scope V1** : matrices, intégrales, sommes (`\sum`), produits,
racines (`\sqrt`), overline/underline, vecteurs, alignements
multi-lignes, environnements `\begin{...}`, opérateurs en roman
(`\sin`, `\cos`, `\log`). Si l'un devient nécessaire, on étend
ponctuellement — **ne pas** anticiper. Et **ne jamais** glisser un
`\begin{matrix}` "parce que ce serait pratique" : la ligne maison
ne tient que si elle reste petite.

## Découpage en sous-commits

### L.R.1 — Parsing math (markdown.js + sous-parser)

`feat(iter-L/phase-R.1): parsing math ($...$, $$...$$)`

- **`parseInline`** : nouveau token `$...$` → nœud
  `{ type: 'math', inline: true, content: <brut entre les $> }`.
  Le contenu brut est conservé tel quel ici (le sous-parsing math
  peut se faire au rendu ou immédiatement — au choix ; si immédiat,
  stocker `mathAst` au lieu de `content`).
- **`parseMarkdown`** : nouveau bloc détecté quand une ligne
  commence par `$$` → nœud `{ type: 'math', inline: false,
  content }`. Gérer le cas mono-ligne (`$$ ... $$`) et multi-ligne
  (ligne `$$`, contenu, ligne `$$` fermante), sur le modèle du code
  block fence existant.
- **Sous-parser math** `parseMath(src) → mathAst` (nouveau module
  `src/lib/mathParse.js`, ou fonction dans markdown.js — au choix) :
  - Scanner récursif avec matching d'accolades.
  - Tokens : `^{...}` → `{type:'sup', children}`, `_{...}` →
    `{type:'sub', children}`, `\frac{a}{b}` →
    `{type:'frac', num, den}`, `\cmd` → lookup Unicode →
    `{type:'text', value}`, lettre latine isolée →
    `{type:'var', value}` (italique), autre → `{type:'text'}`.
  - `num`, `den`, et le contenu de `sup`/`sub` sont eux-mêmes des
    `mathAst` (récursion).
  - Commande inconnue (`\foo` hors mapping) : rendre littéralement
    (`\foo` en texte) + `console.warn` en dev. Pas de crash.

### L.R.2 — Rendu JSX des nœuds math + CSS

`feat(iter-L/phase-R.2): rendu math (sup/sub/frac) + CSS`

- **`MarkdownRenderer.jsx`** :
  - `renderInline` : cas `math` inline → `<span class="md-math
    md-math-inline">` contenant le rendu du `mathAst`.
  - `renderBlock` : cas `math` block → `<div class="md-math
    md-math-block">` (centré).
  - Fonction `renderMath(node)` récursive :
    - `sup` → `<sup>`, `sub` → `<sub>`
    - `frac` → `<span class="md-frac"><span class="md-frac-num">…
      </span><span class="md-frac-den">…</span></span>`
    - `var` → `<i class="md-math-var">` (ou `<em>`)
    - `text` → string
  - Si le parsing math est fait au rendu (pas en L.R.1), appeler
    `parseMath(node.content)` ici, mémoïsé si pertinent.
- **CSS** (`MarkdownRenderer.css` ou dédié) :
  - `.md-frac` : `display: inline-flex; flex-direction: column;
    vertical-align: middle; text-align: center;` ; `.md-frac-den`
    avec `border-top` (la barre de fraction).
  - `.md-math-block` : centré, marge verticale, taille légèrement
    accrue.
  - `.md-math-var` : `font-style: italic`.
  - `sup`/`sub` : taille réduite, alignement standard (les balises
    HTML natives suffisent, juste ajuster `font-size`/`line-height`
    pour ne pas casser l'interligne).
  - Cohérent avec la palette/typo du renderer existant.

### L.R.3 — Validation `_renderer-test.md` + docs

`docs(iter-L/phase-R): _renderer-test math + CONTEXT.md`

- Enrichir `src/docs/articles/_renderer-test.md` d'une section
  "Formules (L.R)" exerçant : inline `$2^{1/12}$`, `$3{:}2$` (ou
  `$3:2$`), fraction `$\frac{3}{2}$`, indice `$a_{0}$`, block
  `$$f = a4 \times 2^{(n/12)}$$`, symboles `$\pi$`, `$\approx$`,
  un cas imbriqué `$\frac{a^{2}}{b}$`, et une commande inconnue
  `$\foo$` (valider le fallback littéral + warn dev).
- `CONTEXT.md` :
  - **État actuel** : renderer math (inline/block, exposants,
    indices, fractions, italique auto, ~12 symboles).
  - **Roadmap & Backlog** : cocher L.R. Prochaine : L.5 (rédaction).
  - **Historique** : entrée Iteration L Phase R.
  - **Décisions architecturales** : math maison LaTeX-like (pas de
    KaTeX), réversibilité, périmètre volontairement borné.
  - **Arborescence** : `src/lib/mathParse.js` si module dédié.

## Hors scope L.R explicite

- Tout ce qui est listé "Hors scope V1" ci-dessus (matrices,
  intégrales, racines, etc.).
- KaTeX ou toute lib externe.
- Syntax highlighting des code blocks (toujours hors scope).
- Rédaction de contenu (L.5) — L.R ne touche qu'au renderer + au
  fichier de test.

## Spec comportement attendu (résumé)

1. Dans un article, `$2^{1/12}$` rend "2" avec "1/12" en exposant.
2. `$\frac{3}{2}$` rend une fraction empilée (3 sur 2, barre).
3. `$$f = a4 \times 2^{(n/12)}$$` rend une formule centrée en bloc.
4. Les lettres dans `$...$` sont en italique ; le texte hors `$`
   est inchangé.
5. `\pi`, `\approx`, etc. rendent les symboles Unicode.
6. Une commande inconnue rend littéralement (pas de crash, warn dev).
7. Aucune dépendance npm. Le reste du renderer inchangé.

## Workflow

1. Lire les pré-requis.
2. Implémenter L.R.1 → L.R.3 dans l'ordre. Tester sur le
   `_renderer-test.md` après L.R.2.
3. Commit `docs: CONTEXT.md` en fin de phase.
4. Push.

**Interpelle** si :
- Le sous-parsing math récursif te paraît dépasser ~80 lignes pour
  le périmètre visé — signale, on resserrera le scope.
- Tu hésites sur stocker `mathAst` (parse en L.R.1) vs `content`
  brut (parse au rendu) — choisis, mais mentionne ton choix.
- Un cas de la grammaire est ambigu (ex. `$` littéral dans une
  formule, accolade non fermée) — propose le comportement, ne
  devine pas en silence.

Bon vent.
