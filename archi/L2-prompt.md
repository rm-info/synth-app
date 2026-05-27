# Prompt L.2 — Iteration L Phase 2 (4e onglet Documentation)

## Contexte

L.1 livrée (cf. CONTEXT.md historique 2026-05-27). Fondation
overlay raccourcis posée, table `src/lib/shortcuts.js` consommable,
convention `data-anchor` + `data-anchor-key` opérationnelle, helper
`getAnchoredPosition` réutilisable.

**Objectif L.2** : livrer le 4e onglet **Documentation** — squelette
fonctionnel avec layout TOC + zone contenu, renderer Markdown maison
~200 lignes, persistance de la position de lecture, et trois contenus
initiaux pour valider le rendu (À propos, Raccourcis auto-générée
depuis `SHORTCUTS`, un article témoin "Pourquoi 12 notes ?").

Pas de `<DocLink>` actif en L.2 — le renderer le parse mais le
traite comme un lien inerte (texte affiché, pas de comportement
click). L.3 le branchera.

**Sortie de L.2 attendue** : l'utilisateur peut basculer vers
l'onglet Documentation, parcourir la TOC, lire les 3 articles
disponibles. Le rendu Markdown valide les features (titres,
paragraphes, listes, code inline, code blocks, emphase, liens
externes, images, blockquotes). La position de lecture (article
courant + scroll) survit au changement d'onglet pendant la session.
L'app principale reste inchangée.

## Pré-lecture obligatoire

1. `CONTEXT.md` (racine) — section TL;DR, État actuel, Historique
   L.1 phase 1
2. `archi/BACKLOG.md` section "Iteration L" — vue d'ensemble,
   architecture, carte des contenus
3. `src/lib/shortcuts.js` (livré en L.1) — sera consommé par la
   page Raccourcis auto-générée

## Décisions de design figées (session 2026-05-27)

- **Position de l'onglet** : 4e à droite — ordre
  `Bibliothèque | Designer | Composer | Documentation`. Le bouton
  Tour `Compass` (L.4) viendra dans le header, pas dans les tabs.
- **Layout** : `aside` sidebar TOC à gauche + zone contenu central.
  Pattern identique aux sidebars Designer/Composer (collapsible,
  resizable, largeur persistée).
- **Largeur sidebar par défaut** : 240px (un peu plus large que les
  PatchPicker Designer/Composer pour accommoder les titres
  d'articles).
- **Persistance lecture** : **sessionStorage**. Article courant +
  scroll position par article. Restauré au switch d'onglet. Reset
  à chaque ouverture de session navigateur.
- **Stockage des contenus** : fichiers `.md` dans `src/docs/articles/`,
  bundled au build (pas de fetch). Une table `src/docs/index.js`
  déclare la TOC et fait le mapping `articleId → import`.
- **Features Markdown supportées** : titres H1-H4, paragraphes,
  listes ordonnées et non ordonnées, code inline (` `` `), code
  blocks (` ``` `), emphase (`**gras**`, `*italique*`), liens
  externes (`[label](https://...)`), images (`![alt](path)`),
  blockquotes (`>`), `<DocLink target="...">label</DocLink>` (parsé
  mais inerte en L.2). **Pas de tableaux** en V1.
- **Article témoin** : "Pourquoi 12 notes ?" (C.9 vulgarisation,
  ~600-1000 mots, rédigé en L.2 cf. spec ci-dessous).
- **3 contenus livrés en L.2** : "À propos" (E.13 minimal),
  "Raccourcis" (auto-générée depuis `SHORTCUTS`), "Pourquoi 12
  notes ?" (article témoin).

## Découpage en sous-commits

5 sous-commits livrables + 1 docs final. Ordre obligatoire (les
dépendances coulent).

### L.2.1 — Structure onglet + state reducer + Tabs

`feat(iter-L/phase-2.1): 4e onglet Documentation + state doc`

- Nouvelle entrée onglet `'documentation'` dans `Tabs.jsx` (4e
  position, après `composer`). Icône Lucide `BookOpen` (ou
  `FileText` — au choix, à valider à l'œil).
- `data-anchor="tab-documentation"` posé sur le bouton onglet (pas
  d'overlay raccourci à ancrer dessus en L.2, mais cohérence avec
  la convention).
- Nouveau state dans le reducer global :
  - `doc.currentArticleId` (string | null) — id de l'article ouvert.
    Initial `'about'` (À propos) au boot, ou `null` si on préfère
    afficher une vue "accueil TOC" (à toi de juger l'UX).
  - `doc.scrollPositions` ({ [articleId]: number }) — map des
    positions de scroll par article.
  - `ui.docSidebarCollapsed` (boolean) — pattern identique à
    `ui.designerSidebarCollapsed` / `ui.composerSidebarCollapsed`.
  - `ui.docSidebarWidth` (number) — largeur en px, clampée comme
    les autres sidebars.
- **Persistance** :
  - `ui.docSidebarCollapsed` et `ui.docSidebarWidth` → localStorage
    (cohérent avec les autres sidebars).
  - `doc.currentArticleId` et `doc.scrollPositions` → **sessionStorage**
    sous une clé dédiée `synth-app-doc-session` ou similaire.
    Sérialisation simple JSON, hydratation à l'init du reducer
    (Map sérialisable en plain object).
- Actions reducer : `SET_CURRENT_ARTICLE(articleId)`,
  `SET_ARTICLE_SCROLL(articleId, scrollTop)`,
  `TOGGLE_DOC_SIDEBAR()`, `SET_DOC_SIDEBAR_WIDTH(width)`.
- À ce stade, l'onglet existe mais la zone contenu est vide
  (placeholder type "Bientôt"). TOC vide aussi. **Commit
  fonctionnellement neutre côté app principale**.

---

### L.2.2 — Renderer Markdown maison

`feat(iter-L/phase-2.2): renderer Markdown maison`

Module `src/lib/markdown.js` (~200 lignes cible) :

- Fonction `parseMarkdown(source: string) → AST` qui produit un
  arbre de noeuds typés. Suggestions de noeuds :
  ```
  { type: 'heading', level: 1..4, children: [...] }
  { type: 'paragraph', children: [...] }
  { type: 'list', ordered: boolean, items: [...] }
  { type: 'listItem', children: [...] }
  { type: 'codeBlock', lang: string|null, code: string }
  { type: 'blockquote', children: [...] }
  { type: 'image', src: string, alt: string }
  { type: 'text', value: string }
  { type: 'emphasis', children: [...] }
  { type: 'strong', children: [...] }
  { type: 'codeInline', value: string }
  { type: 'link', href: string, children: [...] }
  { type: 'docLink', target: string, children: [...] }
  ```
- Parser ligne par ligne pour les blocs (titre, liste, code block,
  blockquote, paragraphe), puis parser inline (gras, italique, code
  inline, liens, `<DocLink>`) à l'intérieur des `children` texte.
- Pas de support tableau, pas de footnote, pas de strikethrough,
  pas de HTML brut (sauf le tag `<DocLink>` qu'on intercepte).

Composant `src/components/MarkdownRenderer.jsx` :

- Prop `source: string` (le contenu .md brut).
- Parse à la volée (memoizé par `source` via `useMemo` —
  l'AST n'est pas dispendieux à reconstruire mais autant éviter
  les re-renders inutiles).
- Render récursif AST → JSX.
- Tag `<DocLink target="...">label</DocLink>` rendu comme `<a>`
  inerte (`href="#"`, `onClick={e => e.preventDefault()}`) en L.2.
  Style identique à un lien externe pour cohérence visuelle. **À
  noter** : un commentaire `// TODO L.3 : brancher DocLink` dans le
  renderer signalera le hook futur.
- Liens externes (`href` commence par `http://` ou `https://`) :
  `target="_blank" rel="noopener noreferrer"`.
- Images : `<img>` standard, path résolu côté article (cf. L.2.3
  pour le mapping). Pas de lazy loading en V1 — les articles sont
  courts.
- CSS dans `src/styles/markdown.css` (ou `src/components/MarkdownRenderer.css`)
  avec classes scoped — typographie lisible, espacement aéré,
  cohérent avec la palette CSS sémantique (variables) du projet.
  Cible : lisibilité pédagogique, pas style "MDN technique".

**Tests mentaux à exécuter** : un fichier `.md` qui exerce toutes
les features doit rendre proprement — un fichier dédié
`_renderer-test.md` listé dans la TOC est livré en L.2.5 pour
cette validation.

**À noter** : aucune dépendance npm ajoutée. Tout doit être écrit
en JS pur. Si tu hésites entre une implé sophistiquée (state
machine pour parser) et une simple (regex + split par ligne), va
au plus simple — la grammaire visée est petite.

---

### L.2.3 — Layout onglet Documentation (TOC + zone contenu)

`feat(iter-L/phase-2.3): layout onglet Documentation (TOC + contenu)`

Composant `src/components/DocumentationTab.jsx` :

- **Sidebar gauche** (TOC) :
  - Réutilise le pattern `SidebarResizer` existant + le pattern de
    collapse en bouton vertical (cf. Designer/Composer sidebars).
  - Rendue depuis `src/docs/index.js` (table déclarative —
    cf. L.2.4 pour le format complet).
  - Items : titre d'article cliquable. Item actif (= `currentArticleId`)
    en highlight accent.
  - Si la TOC est groupée (sections type "Référence", "Guides",
    "Articles"), rendu hiérarchique avec titres de section
    non-cliquables.
- **Zone contenu central** :
  - Si `currentArticleId === null` ou article inexistant : afficher
    une **page d'accueil TOC** simple (liste des articles, peut-être
    avec un mot d'introduction). À styliser sobrement.
  - Sinon : `<MarkdownRenderer source={articleSource} />`.
  - **Scroll position** : restaure `doc.scrollPositions[currentArticleId]`
    au mount / au switch d'article. Sauvegarde via débounce léger
    (~200ms) au scroll (action `SET_ARTICLE_SCROLL`). Conteneur
    overflow-y scroll, pas le `body` (sinon impossible de
    sauvegarder par article).
- **Sidebar collapsée** : icône de toggle + label vertical
  "Documentation" ou "TOC". Toggle restaure à la dernière largeur.
- **Switch d'article** : clic sur item TOC → dispatch
  `SET_CURRENT_ARTICLE(articleId)`. Scroll restauré côté
  `<MarkdownRenderer>` ou wrapper. Reset au scrollTop 0 si pas de
  position sauvée pour ce nouvel article.

Le composant est branché dans `App.jsx` au niveau du switch
`activeTab === 'documentation'`. Aucun impact sur les 3 autres
onglets.

À ce stade, on peut naviguer dans l'onglet, voir la TOC, ouvrir un
article — mais les contenus sont encore minimaux (à venir en
L.2.4-L.2.5).

---

### L.2.4 — Page "Raccourcis" auto-générée + structure index

`feat(iter-L/phase-2.4): page Raccourcis auto-générée depuis SHORTCUTS`

Fichier `src/docs/index.js` — déclare la table TOC. Format suggéré :

```js
// Imports raw via Vite query suffix
import aboutMd from './articles/about.md?raw';
import why12Md from './articles/why-12-notes.md?raw';

export const DOC_TOC = [
  {
    id: 'shortcuts',  // article auto-généré, pas de .md
    title: 'Raccourcis clavier',
    section: 'Référence',
    type: 'generated',  // flag de rendu spécial
  },
  {
    id: 'about',
    title: 'À propos',
    section: 'Le projet',
    type: 'markdown',
    source: aboutMd,
  },
  {
    id: 'why-12-notes',
    title: 'Pourquoi 12 notes ?',
    section: 'Articles',
    type: 'markdown',
    source: why12Md,
  },
];
```

Note : Vite supporte nativement `import x from './foo.md?raw'`
(retourne le contenu brut en string). Pas besoin de plugin.

Composant `src/components/ShortcutsReference.jsx` (article généré) :

- Consomme la table `SHORTCUTS` de `src/lib/shortcuts.js`.
- Groupe par contexte (`global`, `library`, `designer`, `composer`).
- Pour chaque groupe : titre de section + liste d'entrées.
  - Format suggéré par entrée : `[combo display] — label (description)`
    en rangs structurés (DL/DT/DD ou tableau visuel CSS — pas Markdown table).
- Les entrées composite (touches notes Designer, durées Composer)
  affichent un label générique sans énumérer les touches
  (renvoie à l'overlay pour le mapping live, ou affiche une note
  "varie selon le système musical actif").
- Style cohérent avec `MarkdownRenderer` (typographie, espacement)
  pour que le passage d'un article rédigé à l'article généré ne
  soit pas visuellement disruptive.

Le `<DocumentationTab>` dispatch sur `entry.type` :
- `type: 'markdown'` → `<MarkdownRenderer source={entry.source} />`
- `type: 'generated'` + `id === 'shortcuts'` → `<ShortcutsReference />`

À ce stade, la page Raccourcis est lisible dans l'onglet
Documentation. Les autres articles ont encore besoin de leurs
sources (L.2.5).

---

### L.2.5 — Stubs minimaux des articles + fichier de test renderer

`feat(iter-L/phase-2.5): stubs articles + test renderer`

**Pivot par rapport au cadrage initial** : la rédaction des
articles "À propos" et "Pourquoi 12 notes ?" est confiée à un
**agent rédacteur dédié** (cf. `writer/CLAUDE.md`) sur un prompt
séparé (`archi/L2-redaction-prompt.md`). Le dev livre ici les
fichiers `.md` avec un **stub placeholder minimal** suffisant pour
valider la navigation TOC, plus un **fichier de test exhaustif**
dédié à la validation visuelle du renderer.

#### `src/docs/articles/about.md` (stub)

```
# À propos

*[Article en cours de rédaction — un brief séparé est confié à
l'agent rédacteur (writer).]*

Synth App est un instrument web minimaliste pour la composition
musicale par dessin de forme d'onde, avec un soutien fort du
**multi-tempérament**.

- Code ouvert sur [le repo GitHub](https://github.com/rm-info/synth-app).
- Stack : React 19 + Vite + Web Audio API native.
```

~50 mots. Exerce H1, italique, paragraphe, emphase forte, liste,
lien externe.

#### `src/docs/articles/why-12-notes.md` (stub)

```
# Pourquoi 12 notes ?

*[Article en cours de rédaction — un brief détaillé est confié à
l'agent rédacteur (writer).]*

La question paraît anodine — pourtant la réponse traverse 2500
ans d'histoire de la musique et un peu de mathématiques.
```

~30 mots. Exerce H1, italique, paragraphe.

#### `src/docs/articles/_renderer-test.md` — fichier de test exhaustif

Article **listé dans la TOC** sous la section "Référence" avec le
titre `"Test renderer"`. À retirer (du dossier ET de l'index) en
L.5 quand les vrais articles sont livrés et que le rendu est
validé en conditions réelles.

Le fichier exerce **toutes les features du set V1 supporté** :

- H1, H2, H3, H4
- Paragraphes (simples, multi-lignes, multi-paragraphes)
- Listes non ordonnées et ordonnées (avec un cas d'imbrication
  simple si tu veux pousser)
- Code inline avec backticks
- Code blocks avec `lang` (au moins un avec `js`, un avec `text`)
- Emphase `*italique*` et `**gras**`
- Blockquote `>`
- Lien externe `[label](https://...)`
- Image `![alt](path)` — référence une petite image quelconque
  placée dans `src/docs/articles/_renderer-test/` (un PNG ou SVG
  16x16 ou plus, peu importe le contenu visuel — un dégradé, un
  pictogramme, ce que tu veux). Si tu préfères éviter d'ajouter
  un binaire au repo, fais une image SVG inline en référence
  externe (`![alt](data:image/svg+xml;...)`) ou omets cette
  feature en notant que le rendu image sera testé manuellement
  une fois un article réel en contient.
- `<DocLink target="composer:composer-paste-button">Coller (Composer)</DocLink>`
  — rendu inerte en L.2, validation que le parser ne crashe pas.

Le contenu **n'a pas besoin d'être pédagogique** — c'est
explicitement un fichier de validation visuelle. Type "Lorem ipsum
avec features Markdown" suffit, mais texte en français cohérent
avec le projet (pas du faux latin) pour vérifier le rendu
typographique sur du texte naturel.

#### `src/docs/index.js` mis à jour

Inclut quatre entrées au total :

- Section "Le projet" : `about` (À propos)
- Section "Référence" : `shortcuts` (Raccourcis clavier, généré),
  `_renderer-test` (Test renderer, markdown)
- Section "Articles" : `why-12-notes` (Pourquoi 12 notes ?)

L'ordre TOC = ordre des entrées dans le tableau exporté `DOC_TOC`.
Tu choisis l'ordre intra-section selon ce qui te paraît naturel.

À ce stade, l'onglet est complet pour validation du rendu et de
la navigation. Le contenu pédagogique des stubs sera livré
séparément par l'agent rédacteur sur un prompt distinct.

---

### L.2.6 — Documentation `CONTEXT.md`

`docs(iter-L/phase-2): CONTEXT.md — Iteration L phase 2`

Section **"État actuel"** : ajouter l'onglet Documentation, le
renderer Markdown maison, la persistance sessionStorage de la
lecture, les 3 articles initiaux.

Section **"Roadmap & Backlog"** : cocher L.2 livré, mentionner
L.3 (DocLink + highlight) prochaine étape.

Section **"Historique"** : entrée pour Iteration L Phase 2
résumant les ajouts (5 sous-commits L.2.1-L.2.5).

Section **"Modèle de données"** : ajouter `doc.currentArticleId`,
`doc.scrollPositions`, `ui.docSidebarCollapsed`,
`ui.docSidebarWidth`. Mentionner la clé sessionStorage
`synth-app-doc-session`.

Section **"Décisions architecturales"** : ajouter référence à
- `src/docs/index.js` comme table TOC source unique
- Renderer Markdown maison comme convention (pas de lib externe)
- Pattern `entry.type` = `'markdown'` | `'generated'` pour
  l'extensibilité (un article généré ne demande qu'un nouveau type
  + un nouveau composant)

Section **"Arborescence"** : ajouter
- `src/docs/index.js`
- `src/docs/articles/about.md`
- `src/docs/articles/why-12-notes.md`
- `src/lib/markdown.js`
- `src/components/DocumentationTab.jsx`
- `src/components/MarkdownRenderer.jsx`
- `src/components/ShortcutsReference.jsx`
- `src/styles/markdown.css` (ou colocaté avec MarkdownRenderer.jsx)

---

## Hors scope L.2 explicite

- `<DocLink>` actif (L.3) — le tag est parsé et rendu inerte, c'est
  tout. Pas de navigation, pas de highlight.
- Bouton Tour, Ctrl+J, tours déclarés (L.4)
- **Rédaction des articles "À propos" et "Pourquoi 12 notes ?"** —
  les stubs sont posés par le dev en L.2.5, le contenu rédigé
  vient sur un prompt séparé (`archi/L2-redaction-prompt.md`)
  livré par l'agent rédacteur (cf. `writer/CLAUDE.md`).
- Rédaction des autres contenus du backlog (A.2 tempéraments,
  A.4 limites, B.5 guides, B.6 recettes, C.7 glossaire technique,
  C.8 glossaire musical, autres articles C.9, D.11 démos, D.12
  exercices) — ils viendront en L.5, également par l'agent
  rédacteur.
- Tableaux Markdown
- Strikethrough, footnotes, HTML brut, autoliens, task lists
- Lazy loading des images, syntax highlighting des code blocks
- Recherche dans la doc, filtrage de la TOC
- Routing avec URL fragment (`#section`) — la persistance
  sessionStorage suffit pour V1
- Bouton "Article suivant / précédent" en fin d'article — la TOC
  est l'unique navigation V1
- Navigation au clavier dans la TOC (↑↓/Enter) — peut être un
  follow-up si l'usage le demande
- Raccourci global pour basculer vers l'onglet Documentation
  (type Ctrl+4) — pas en L.2

## Spec comportement attendu (résumé)

À la fin de L.2, voici ce que l'utilisateur perçoit :

1. Un 4e onglet **Documentation** à droite des trois autres.
2. Clic dessus → page avec une TOC sidebar à gauche (collapsible /
   resizable comme les autres sidebars) et une zone contenu central.
3. La TOC liste : "À propos" (stub), "Raccourcis clavier"
   (généré), "Test renderer" (validation features), "Pourquoi
   12 notes ?" (stub). Groupage par section.
4. Clic sur un item TOC → article s'affiche.
5. Le rendu Markdown est lisible, typographié, espacé. Toutes
   les features du set complet fonctionnent visiblement via le
   fichier "Test renderer" qui les exerce exhaustivement. Les
   stubs "À propos" et "Pourquoi 12 notes ?" affichent leur
   placeholder en attendant la rédaction par l'agent writer.
6. Bascule entre onglets (ex. Designer → Documentation → Designer)
   → restitue exactement l'article qu'on lisait, scroll inclus.
7. Refresh navigateur → on retombe sur l'article par défaut ("À
   propos" ou accueil TOC).
8. Aucun changement de comportement dans les 3 autres onglets.

Sous le capot :

- Nouveau state global : `doc.currentArticleId`,
  `doc.scrollPositions`, `ui.docSidebarCollapsed`,
  `ui.docSidebarWidth`.
- localStorage inchangé sauf les nouvelles prefs sidebar
  (`docSidebarCollapsed`, `docSidebarWidth`).
- Nouveau sessionStorage key `synth-app-doc-session` avec
  `{ currentArticleId, scrollPositions }`.
- Aucune nouvelle dépendance npm.

## Workflow

1. Lire `CONTEXT.md`, `archi/BACKLOG.md` section Iteration L,
   `src/lib/shortcuts.js`.
2. Implémenter L.2.1 → L.2.5 dans l'ordre. Tester manuellement
   chaque sous-commit avant le suivant.
3. Commit `docs: CONTEXT.md` séparé en fin de phase.
4. Push après chaque sous-commit ou batch raisonnable.

**Interpelle** si :
- Une décision archi te paraît bancale à l'implé.
- Tu hésites sur la structure de l'AST Markdown (le format suggéré
  est une proposition, pas une obligation — propose un autre format
  si tu vois mieux).
- L'article "Pourquoi 12 notes ?" te bloque sur un point factuel
  précis — préfère interroger plutôt que d'inventer.
- Tu trouves un cas d'edge (ex. comportement du scroll restore si
  l'article a changé de longueur entre deux sessions — peu probable
  vu que les articles sont versionnés avec le code, mais à
  considérer).

Bon vent.
