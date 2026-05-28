# Prompt L.3 — Iteration L Phase 3 (DocLink actif + highlight)

## Contexte

L.2 livrée : 4e onglet Documentation, renderer Markdown maison
(`src/lib/markdown.js` + `src/components/MarkdownRenderer.jsx`),
TOC (`src/components/DocumentationTab.jsx`), persistance lecture
sessionStorage. Le parser produit déjà des nœuds `docLink`
(`{ type: 'docLink', target, children }`), rendus **inerte** par
le renderer (`<a href="#" class="md-doclink" data-doclink-target>`
avec `onClick preventDefault`, cf. `MarkdownRenderer.jsx:89-102`,
commentaire `// TODO L.3`).

L.1 a livré `src/lib/getAnchoredPosition.js`, qui documente
explicitement son usage L.3 ("DocLink highlight — halo temporaire
sur l'élément ciblé") et retourne `{ found, top, left, width,
height, element }` en résolvant le premier élément **visible**
parmi les candidats `[data-anchor="<id>"]`.

**Objectif L.3** : rendre la navigation interne de la doc active.
Deux mécanismes :

1. **`<DocLink target="onglet:ancre">`** → bascule vers l'onglet
   cible + **halo temporaire** sur l'élément d'UI référencé (via
   son `data-anchor`).
2. **Liens internes doc→doc** (`[label](doc:article-id)`) →
   change l'article courant sans quitter l'onglet Documentation.

**Sortie de L.3 attendue** : dans un article, cliquer un DocLink
amène l'utilisateur à l'élément ciblé (dans le bon onglet, mis en
évidence par un halo qui s'efface). Cliquer un lien `doc:` ouvre
l'article référencé. Aucun changement par ailleurs.

## Pré-lecture obligatoire

1. `CONTEXT.md` — historique L.1 (overlay, `getAnchoredPosition`,
   convention `data-anchor`) et L.2 (onglet Documentation, renderer).
2. `src/lib/markdown.js` — nœud `docLink` (parsing du `target`),
   nœud `link` (liens Markdown standard).
3. `src/components/MarkdownRenderer.jsx` — rendu inerte actuel du
   `docLink` (lignes ~70-102) à brancher.
4. `src/lib/getAnchoredPosition.js` — résolution d'un `data-anchor`
   en élément + position viewport (réutiliser pour le highlight).
5. `src/components/DocumentationTab.jsx` — navigation article
   (`onSetCurrentArticle`), montage conditionnel
   (`App.jsx:1997-2007`).
6. `src/lib/shortcuts.js` — liste des `data-anchor` posés en L.1
   (cibles valides des DocLink).
7. `src/docs/articles/_renderer-test.md` — contient déjà un
   `<DocLink>` (validation parser L.2), à enrichir.

## Décisions de design figées (2026-05-28)

- **Format `target`** : `"onglet:ancre"` (déjà produit par le
  parser). `onglet` ∈ `{ library, designer, composer, documentation }`,
  `ancre` = valeur d'un `data-anchor`. Split sur le **premier** `:`
  (l'ancre peut théoriquement contenir un `:` — improbable vu la
  convention, mais split sur le premier est robuste).
- **DocLink cross-onglet** : bascule onglet + halo. L'utilisateur
  quitte volontairement la doc pour voir l'élément réel — c'est le
  comportement voulu (un DocLink "le bouton Coller du Composer"
  amène au bouton, pas à une capture d'écran).
- **Lien doc→doc** : convention `[label](doc:article-id)` (scheme
  `doc:`). Reste dans l'onglet Documentation, change l'article.
  C'est un **lien Markdown standard** intercepté par le renderer,
  pas un `<DocLink>`. (Cohérent avec la note posée dans
  `writer/CLAUDE.md`.)
- **Halo** : flash temporaire (~1800 ms) + scroll-into-view de
  l'élément. Sobre, dans la palette accent du projet. Le dev
  choisit l'animation exacte (pulse, outline animé…).
- **Timing post-switch** : l'élément cible n'existe pas encore au
  moment du `setActiveTab` (l'onglet cible se monte après). Le
  highlight doit **attendre** que l'ancre apparaisse (retry via
  `requestAnimationFrame` borné, cf. L.3.1). Pas de nouveau state
  reducer nécessaire.
- **Propagation des handlers** : via **React Context** dans
  `MarkdownRenderer`, pas de prop-drilling à travers les fonctions
  récursives module-level (`renderBlock`/`renderInline`). Les nœuds
  `docLink` et les liens `doc:` sont rendus par de petits
  sous-composants consommant le contexte. Défaut du contexte =
  comportement inerte (réutilisabilité du renderer hors doc
  préservée).
- **Résolution gracieuse** : ancre introuvable, onglet invalide,
  ou élément non visible (ex. dans un panneau collapsed, ou
  `composer-anchor-clip` sans clip ancre) → **no-op silencieux**
  + `console.warn` en mode dev uniquement. Pas de crash, pas de
  toast utilisateur.

## Découpage en sous-commits

### L.3.1 — Utilitaire `highlightElement` + CSS halo

`feat(iter-L/phase-3.1): highlightElement + halo temporaire`

Module `src/lib/highlightElement.js` :

```js
// highlightElement(anchorId, options?) → void
// Résout l'élément via getAnchoredPosition (premier visible),
// le scroll dans la vue, applique une classe flash retirée après
// `duration`. Retry borné car l'élément peut apparaître après un
// switch d'onglet (montage différé).
export function highlightElement(anchorId, {
  duration = 1800,    // durée du halo (ms)
  maxWaitMs = 800,    // budget de retry pour l'apparition de l'ancre
} = {}) { ... }
```

Implémentation attendue :

- Boucle de retry via `requestAnimationFrame`, bornée par
  `maxWaitMs` (mesure `performance.now()`).
- À chaque tentative : `getAnchoredPosition(anchorId)`. Si
  `found && element` → procéder ; sinon re-RAF tant que dans le
  budget.
- Procéder = `element.scrollIntoView({ behavior: 'smooth',
  block: 'center' })` puis `element.classList.add(FLASH_CLASS)`,
  et `setTimeout` pour retirer la classe après `duration`.
- Si une nouvelle demande de highlight arrive sur le même élément
  pendant qu'un flash est actif : retirer/réappliquer proprement
  (re-trigger l'animation). Garde-fou simple suffisant.
- Échec (budget épuisé sans trouver l'ancre) :
  `if (import.meta.env.DEV) console.warn('[DocLink] ancre introuvable:', anchorId)`.

CSS (dans un fichier dédié `src/styles/highlight.css` importé une
fois, ou colocaté) :

- Classe `FLASH_CLASS` (ex. `doc-highlight-flash`) : outline
  accent + animation de pulse qui s'atténue. Doit fonctionner sur
  des éléments variés (boutons, indicateurs, conteneurs, clips de
  timeline) — donc `outline` + `box-shadow` plutôt que toucher au
  layout (pas de margin/border qui déplacerait l'élément).
- Utiliser les variables CSS sémantiques du thème (accent), pour
  cohérence clair/sombre.

À ce stade, l'utilitaire existe mais n'est appelé par personne.
Tu peux le valider en l'appelant manuellement depuis la console
(`window.__hl = highlightElement` en dev, optionnel).

### L.3.2 — DocLink actif (navigation cross-onglet + highlight)

`feat(iter-L/phase-3.2): DocLink actif (navigation + highlight)`

**`MarkdownRenderer.jsx`** :

- Créer un contexte `MarkdownNavContext` portant
  `{ onDocLink, onDocNav }` (defaults `null`).
- `MarkdownRenderer` accepte deux nouvelles props `onDocLink`
  (target → void) et `onDocNav` (articleId → void), les fournit
  via le Provider.
- Remplacer le rendu inerte du nœud `docLink` par un sous-composant
  `<DocLinkAnchor node={...} />` qui consomme le contexte :
  - `onClick` : `e.preventDefault()` puis `onDocLink?.(node.target)`.
  - Si `onDocLink` absent (pas de provider) → reste inerte (garde
    le `preventDefault`, pas d'action). Préserve la réutilisabilité.
  - Conserver `data-doclink-target={node.target}` et la classe
    `md-doclink`.
  - Curseur pointer + style indiquant l'interactivité (à distinguer
    visuellement d'un lien externe — ex. petite icône, ou teinte
    différente — au choix, sobre).

**`App.jsx`** :

- Nouveau handler `handleDocLink(target)` :
  - Split `target` sur le premier `:` → `[tab, anchor]`.
  - Valider `tab` ∈ tabs connus ; sinon `console.warn` dev + return.
  - `setActiveTab(tab)` (helper existant ligne 991).
  - `highlightElement(anchor)` — le retry interne gère le délai de
    montage de l'onglet cible.
  - Cas `tab === 'documentation'` : pas de changement d'onglet
    nécessaire si on y est déjà, mais highlight quand même (un
    DocLink peut pointer un `data-anchor` dans la doc elle-même —
    rare mais cohérent).
- Passer `onDocLink={handleDocLink}` à `<DocumentationTab>`.

**`DocumentationTab.jsx`** :

- Accepter la prop `onDocLink` et la transmettre à
  `<MarkdownRenderer onDocLink={onDocLink} ... />` (le renderer
  n'est utilisé que pour les entrées `type: 'markdown'`).

Validation : un DocLink `composer:composer-paste-button` depuis un
article bascule sur le Composer et fait flasher le bouton Coller.

### L.3.3 — Liens internes doc→doc (`doc:` scheme)

`feat(iter-L/phase-3.3): liens internes doc→doc`

**`MarkdownRenderer.jsx`** — nœud `link` :

- Détecter `node.href` commençant par `doc:` → rendre un
  sous-composant `<DocNavLink node={...} />` (consomme le contexte) :
  - `onClick` : `e.preventDefault()` puis
    `onDocNav?.(node.href.slice(4))` (l'`article-id`).
  - Sinon (lien `http(s)://` ou autre) : comportement L.2 inchangé
    (lien externe `target=_blank` / lien natif).

**`DocumentationTab.jsx`** :

- Fabriquer `onDocNav = (articleId) => { ... }` :
  - Si `articleId` existe dans `DOC_TOC` → `onSetCurrentArticle(articleId)`.
  - Sinon → `console.warn` dev + no-op.
- Le scroll de l'article cible repart de sa position sauvée (ou 0)
  via le mécanisme L.2 existant (effet sur `currentArticleId`).
- Passer `onDocNav` à `<MarkdownRenderer>`.

Validation : un lien `[voir l'article sur les 12 notes](doc:why-12-notes)`
ouvre l'article correspondant.

### L.3.4 — Enrichissement `_renderer-test.md` + docs CONTEXT.md

`docs(iter-L/phase-3): _renderer-test DocLink + CONTEXT.md`

- Enrichir `src/docs/articles/_renderer-test.md` avec :
  - Un DocLink cross-onglet valide (ex.
    `<DocLink target="composer:composer-copy-button">Copier (Composer)</DocLink>`).
  - Un DocLink avec ancre **introuvable** (ex.
    `target="composer:zzz-inexistant"`) pour valider le no-op
    gracieux + warn dev.
  - Un lien doc→doc valide (ex. `[À propos](doc:about)`).
  - Un lien doc→doc cassé (ex. `[cassé](doc:nope)`) pour valider
    le no-op.
- `CONTEXT.md` :
  - **État actuel** : DocLink actif (navigation cross-onglet +
    halo), liens doc→doc.
  - **Roadmap & Backlog** : cocher L.3 livré, prochaine étape L.4
    (Tour).
  - **Historique** : entrée Iteration L Phase 3.
  - **Décisions architecturales** : `highlightElement` comme 2e
    consommateur de `getAnchoredPosition` (après l'overlay), Context
    `MarkdownNavContext`, scheme `doc:` pour les liens internes.
  - **Arborescence** : `src/lib/highlightElement.js`,
    `src/styles/highlight.css` (si fichier dédié).

## Hors scope L.3 explicite

- Bouton Tour, Ctrl+J, tours (L.4).
- Math rendering (L.R).
- Rédaction de contenus (L.5).
- **Ouverture automatique d'un panneau collapsed** pour révéler une
  ancre cachée (ex. déplier le Designer Actions panel si la cible y
  est repliée). V1 : si l'ancre n'est pas visible, no-op gracieux.
  Si ce cas se révèle gênant à l'usage, on le rouvrira.
- **Highlight d'un élément dépendant d'une sélection** (ex.
  `composer-anchor-clip` qui n'existe que si un clip ancre est
  défini) : no-op si absent. Pas de logique pour "créer" l'ancre.
- Validation statique des targets DocLink au build (lint des
  articles). Pour l'instant, la validation est runtime (warn dev).
  Un linter de doc pourra venir plus tard si le volume L.5 le
  justifie.
- Animation de transition entre onglets. Le switch reste instantané
  comme aujourd'hui ; seul le halo signale la cible.

## Spec comportement attendu (résumé)

1. Dans un article, un `<DocLink>` est visuellement distinct d'un
   lien externe (interactif, pointer).
2. Clic sur un DocLink `onglet:ancre` → bascule sur l'onglet,
   scroll vers l'élément, halo temporaire (~1.8s) qui s'efface.
3. Clic sur un lien `[label](doc:article-id)` → ouvre l'article
   dans l'onglet Documentation (sans changer d'onglet).
4. Cible introuvable / onglet invalide / élément non visible →
   rien ne se passe (warn dev en console, pas d'erreur).
5. Tout le reste de l'app inchangé. Les liens externes Markdown
   gardent leur comportement L.2.

## Workflow

1. Lire les pré-requis.
2. Implémenter L.3.1 → L.3.4 dans l'ordre, tester chaque
   sous-commit (notamment le timing post-switch : DocLink depuis
   la doc vers Composer doit flasher après le mount).
3. Commit `docs: CONTEXT.md` en fin de phase.
4. Push après chaque sous-commit ou batch raisonnable.

**Interpelle** si :
- Le contexte React te paraît surdimensionné pour 2 handlers et
  que tu vois plus simple (prop-drilling explicite assumé) — propose.
- Le retry RAF pour le highlight post-switch s'avère fragile (ex.
  onglet lourd à monter > 800ms) — on basculera sur un state
  `pendingHighlight` consommé par effet. Signale-le plutôt que
  d'augmenter le budget à l'aveugle.
- Tu repères que `getAnchoredPosition` ne suffit pas pour un cas
  d'ancre (ex. plusieurs candidats tous invisibles) — on ajustera
  la résolution.

Bon vent.
