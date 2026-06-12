# Prompt U.1 — Socle renderer doc : liens profonds, accordéon, images SVG

## Contexte

Ouverture de l'**itération U « Documentation utilisateur de la
Création »**. Objectif global : un **mode Info** (bouton à icône Info
dans le header, entre Raccourcis et Tour, raccourci **Ctrl+I**) qui,
à la manière de l'overlay Raccourcis (Ctrl+K), pose un **overlay
cliquable sur chaque contrôle logique visible** de l'onglet Création ;
le clic bascule vers l'onglet Documentation, sur le **paragraphe dédié**
à ce contrôle. Chaque paragraphe explique la raison d'être de l'élément
en termes accessibles, propose un approfondissement technique (formules,
détails DSP) dans un **accordéon replié**, peut s'appuyer sur des
**illustrations SVG**, et se termine par des liens discrets de retour
vers l'élément (mécanique `DocLink`/`highlightElement` existante).

Découpage de l'itération :
- **U.1 (ce prompt)** : socle renderer/doc — tout ce qui manque au
  système de documentation pour accueillir la suite. Aucune UI nouvelle
  dans l'app, chantier confiné au markdown et à l'onglet Documentation.
- **U.2** : mode Info — bouton, Ctrl+I, composant overlay, registre
  déclaratif ancre → paragraphe, amorcé sur les ancres existantes.
- **U.3** : couverture complète — pose des `data-anchor` manquants sur
  l'onglet Création + articles squelettes par module + registre complet.
- **U.4** : peuplement des contenus — **domaine writer**, hors scope dev
  (brief séparé).
- Ensuite (U.5+ ou itération suivante) : mise à jour du Tour guidé.

Décisions de cadrage actées (2026-06-12) : granularité = **contrôle
logique** (un graphe = un overlay, pas une poignée = un overlay) ;
structure doc = **un article par module** dans une nouvelle section TOC,
`guide-designer.md` restant le survol narratif ; navigation = **bascule
d'onglet** (pas de panneau in-situ) ; prose = writer.

**U.1 ne touche ni le modèle de données, ni le reducer (hors éventuel
état doc), ni l'audio, ni l'onglet Création.**

## Spec fonctionnelle

### 1. Ids explicites sur les headings

- Nouvelle syntaxe dans `lib/markdown.js` : un heading peut porter un
  id explicite en suffixe, style pandoc — `## Mon titre {#mon-id}`.
  Le suffixe est retiré du texte affiché ; le nœud AST `heading` gagne
  un champ `id` (string ou null).
- `MarkdownRenderer` pose `id={node.id}` sur le `<h1>`…`<h4>` rendu
  (seulement quand l'id est explicite).
- **Pas d'auto-slug** dérivé du texte : le writer reformulera les titres
  en U.4, les ids du futur registre doivent survivre aux reformulations.
  Un heading sans `{#id}` n'est simplement pas ciblable.
- Format d'id : kebab-case `[a-z0-9-]+`. Pas de validation d'unicité au
  parse (responsabilité d'autorat) ; premier trouvé gagne au scroll.

### 2. Liens profonds `doc:article#fragment`

- Le scheme interne existant `doc:article-id` (liens inter-articles,
  géré par `DocumentationTab`/`MarkdownRenderer`) s'étend en
  `doc:article-id#heading-id`. Sans fragment : comportement actuel
  inchangé (ouverture en haut d'article, restauration de scroll session
  comprise).
- Avec fragment : ouvrir l'article puis **scroller le heading ciblé**
  dans la zone de contenu (`scrollIntoView`, `block: 'start'`,
  `behavior: 'smooth'`). Le heading prend un **flash de surbrillance**
  temporaire — réutilise la classe et l'animation de
  `styles/highlight.css` (`doc-highlight-flash`) plutôt que d'inventer
  un second langage visuel.
- Le contenu de l'article monte de façon asynchrone (switch d'article) :
  sonde le DOM avec un **retry RAF borné**, même esprit que
  `highlightElement` (`lib/highlightElement.js`). Fragment introuvable
  après le délai → ouverture en haut d'article, sans erreur console.
- **Le fragment prime sur la restauration de scroll** (sessionStorage,
  débounce 200 ms) : pas de course visible entre les deux scrolls.
- Cas article déjà ouvert : scroll direct vers le heading (pas de
  remount).
- Point d'entrée réutilisable : la navigation « ouvre article + fragment »
  doit être appelable **depuis l'extérieur de l'onglet Documentation**
  (c'est ce que fera le mode Info en U.2 : bascule d'onglet + cible).
  Expose-la proprement (handler App.jsx ou équivalent), sans la câbler
  à une UI nouvelle dans cette phase.

### 3. Bloc accordéon `<Details>`

- Nouveau **tag bloc** custom dans le markdown, précédent `DocLink` :

  ```
  <Details title="Sous le capot">
  …blocs markdown…
  </Details>
  ```

- Le contenu est parsé **récursivement** comme des blocs markdown
  normaux : paragraphes, listes, code, math `$…$`/`$$…$$`, images,
  `DocLink`, liens `doc:` — tout ce que le renderer V1 sait faire doit
  marcher à l'intérieur (c'est là que vivront les formules).
- Rendu : élément natif `<details><summary>` (accessibilité et
  toggle gratuits), **replié par défaut**, stylé cohérent avec la doc
  (chevron qui pivote, fond légèrement distinct, thèmes clair/sombre).
- `title` absent → libellé par défaut « Détails ».
- **Pas d'imbrication** Details dans Details (non supporté, documenté
  en commentaire du parser). Pas de heading ciblable (`{#id}`) à
  l'intérieur d'un Details — un fragment doit toujours atterrir sur du
  contenu visible.

### 4. Illustrations SVG

- La syntaxe `![alt](src)` existe déjà ; les articles étant importés en
  `?raw`, Vite ne réécrit pas les chemins → convention : **fichiers SVG
  dans `public/docs/`**, référencés en URL absolue `![schéma](/docs/nom.svg)`.
  Vérifie que ça marche en dev **et** en build (public/ est servi tel
  quel dans les deux cas).
- Styling `.md-image` : `max-width: 100%`, affichage bloc centré, marges
  verticales cohérentes avec le rythme de la doc.
- Crée **un SVG de démonstration** sobre dans `public/docs/` (par ex. un
  petit schéma sinusoïde annotée) pour valider la chaîne. Contrainte
  d'autorat à respecter pour tous les futurs SVG : **fond transparent +
  couleurs lisibles sur les deux thèmes** (un `<img>` n'hérite pas de
  `currentColor` — choisir des tons médians ou les gris de la palette).

### 5. Article de test du renderer

- `_renderer-test.md` a été retiré en fin d'iter L. **Recrée-le**
  (même nom, entrée TOC dans une section discrète en fin de liste) avec
  une couverture des features V1 existantes **plus** les trois
  nouveautés : headings à `{#id}`, liens `doc:` avec et sans fragment
  (dont un lien vers son propre contenu et un lien cross-article),
  `<Details>` contenant du math display et une liste, image SVG.
- Il sera retiré en fin d'itération U (comme en L) — le noter dans
  l'article lui-même.

## Découpage en sous-commits

1. `feat(iter-U/phase-1.1): markdown — ids explicites {#id} sur les
   headings + liens profonds doc:article#fragment (scroll + flash)` —
   parser + renderer + navigation DocumentationTab + point d'entrée
   externe.
2. `feat(iter-U/phase-1.2): markdown — bloc accordéon <Details>` —
   parser récursif + rendu details/summary + CSS deux thèmes.
3. `feat(iter-U/phase-1.3): doc — images SVG public/docs/ + article de
   test renderer` — convention chemins, styling .md-image, SVG de démo,
   `_renderer-test.md` recréé.
4. `docs: CONTEXT.md — Iteration U phase 1 (socle renderer doc)` —
   état actuel + arborescence si touchée (+ ouverture de l'entrée
   d'historique iter-U dans `CONTEXT-ARCHIVE.md`).

## Comportement attendu

- Un heading `## Titre {#mon-id}` s'affiche « Titre » (sans le suffixe)
  et porte `id="mon-id"` dans le DOM ; un heading sans suffixe n'a pas
  d'id.
- Clic sur un lien `doc:autre-article#frag` : l'article s'ouvre, le
  heading ciblé se positionne en haut de la zone de contenu avec un
  flash de surbrillance, la restauration de scroll session ne « tire »
  pas la vue ailleurs. Retour ensuite sur l'article par le TOC : la
  position de scroll session reprend ses droits (comportement actuel).
- Clic sur un lien `doc:même-article#frag` (article déjà ouvert) :
  scroll fluide vers le heading, flash, pas de rechargement visible.
- Fragment inexistant : ouverture en haut d'article, zéro erreur.
- Un `<Details>` se rend replié ; ouvert, son contenu markdown est
  complet (math display rendu, listes, liens actifs) ; re-replié, l'état
  de la page reste sain (pas de saut de scroll). Thèmes clair/sombre OK.
- L'image SVG s'affiche dans l'article de test, en dev et en build
  (`npm run build` + preview), sur les deux thèmes.
- Aucun changement visible dans les onglets Création / Composition /
  Bibliothèque ; aucun changement des articles existants (hors recréation
  de l'article de test) ; le rendu des 22 articles actuels est
  strictement inchangé (régression parser = interdit).

## Hors scope (U.1)

- Le bouton Info, Ctrl+I, l'overlay et le registre ancre → paragraphe
  (U.2).
- Toute pose de `data-anchor` ou modification de l'onglet Création (U.3).
- Les articles par module et leur contenu (squelettes U.3, prose U.4
  writer). Ne touche pas `guide-designer.md`.
- Auto-slugs de headings, tableaux, HTML brut, autres extensions
  markdown non listées.
- Imbrication de `<Details>`, fragments à l'intérieur d'un accordéon.
- Recherche plein-texte doc (backlog).

## Validation manuelle suggérée

Article de test : chaque feature nouvelle, deux thèmes, dev + build.
Liens profonds : cross-article, même article, fragment manquant,
aller-retour avec la restauration de scroll session. Non-régression :
relire 3-4 articles riches existants (`guide-designer`, un tempérament
avec math, glossaire technique) et l'article généré Raccourcis.
