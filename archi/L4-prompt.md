# Prompt L.4 — Iteration L Phase 4 (Tour guidé)

## Contexte

L.1-L.3 livrées : overlay raccourcis, convention `data-anchor` +
`getAnchoredPosition` (résolution "premier visible", no-op gracieux
sur ancre absente), onglet Documentation + renderer Markdown,
DocLink actif + `highlightElement` (halo via RAF borné).

**Objectif L.4** : le **Tour guidé** — diaporama d'info-bulles
localisées sur les éléments d'UI de l'onglet actif. C'est le 3e et
dernier entrypoint additif (après l'onglet Documentation et le
bouton Raccourcis). Sortie de L.4 = **V1 fonctionnelle** de
l'Iteration L.

**Sortie attendue** : un bouton `Compass` dans le header (+ Ctrl+J)
démarre le tour de l'onglet actif. L'app passe en mode "spotlight"
(non-interactive, élément courant mis en lumière), une bulle pointe
l'élément avec titre + description, une progress bar remplace la
barre d'onglets. L'utilisateur navigue (Précédent/Suivant, étapes
cliquables, ESC/croix pour quitter). En fin de tour : "Continuer
vers X, Y ou Z ?". Tout état UI modifié par le tour est restauré à
la sortie (tour *stateless du point de vue utilisateur*).

## Pré-lecture obligatoire

1. `CONTEXT.md` — historique L.1 à L.3, section "Décisions
   architecturales" (convention `data-anchor`, `getAnchoredPosition`,
   navigation interne doc).
2. `src/lib/getAnchoredPosition.js` — résolution ancre → rect/élément
   (réutilisé pour positionner spotlight + bulle).
3. `src/lib/highlightElement.js` — pattern RAF borné pour le montage
   différé (le tour fait face au même problème au changement d'onglet
   + ouverture de sidebar).
4. `src/components/Tabs.jsx` — le header où va le bouton `Compass` ;
   la progress bar recouvrira `tabs-buttons` pendant le tour.
5. `src/lib/shortcuts.js` — inventaire des `data-anchor` existants
   (cibles potentielles d'étapes de tour).
6. `src/App.jsx` — `setActiveTab` (l.991), toggles sidebar
   (`SET_DESIGNER_SIDEBAR_COLLAPSED`, `TOGGLE_DOC_SIDEBAR`…),
   montage conditionnel des onglets.

## Décisions de design figées (session 2026-05-28)

- **Contenu des bulles** : le dev définit la **séquence d'étapes**
  (ancres + ordre) et écrit un **premier jet** des textes (titre
  3-5 mots + 1-2 phrases). Un agent rédacteur polira ensuite le ton
  sur un prompt séparé (`archi/L4-redaction-prompt.md`, livré après
  L.4). Écris des textes corrects mais sans te soucier de la
  perfection stylistique.
- **Snapshot/restore — périmètre médian** : le tour peut **déplier
  une sidebar repliée** pour révéler une ancre intérieure. Il
  snapshot/restore l'ensemble minimal des prefs UI qu'il mute :
  `activeTab` + les états `*SidebarCollapsed`
  (`designerSidebarCollapsed`, `docSidebarCollapsed`, et l'équivalent
  Composer s'il existe). **Pas** de chargement de patch démo, **pas**
  d'ouverture de dropdown, **pas** de création de clip témoin. Toute
  ancre restant invisible après ouverture de sa sidebar est
  **skippée gracieusement** (cf. no-op de `getAnchoredPosition`).
- **Interaction — app gelée + spotlight** : pendant le tour, l'UI
  est non-interactive (backdrop semi-opaque avec "trou" lumineux sur
  l'ancre courante). Navigation uniquement via la bulle
  (Précédent/Suivant) et la progress bar (étapes cliquables). Ça
  rend le snapshot/restore tractable (l'utilisateur ne peut pas
  muter l'état en plein tour).
- **"En savoir plus"** : champ `article` **optionnel** par étape. Si
  présent ET l'article existe dans `DOC_TOC`, la bulle affiche un
  bouton "En savoir plus" → quitte le tour + bascule onglet
  Documentation + ouvre l'article. En L.4 seuls `about` et
  `why-12-notes` existent ; la plupart des étapes n'auront pas ce
  champ pour l'instant.
- **Snapshot unique sur toute la chaîne** : le snapshot est capturé
  une seule fois au **premier** `START_TOUR` (quand l'utilisateur
  presse Ctrl+J / clique Compass). Le chaînage entre onglets ne
  re-snapshot pas. La restauration finale ramène à l'état initial
  exact (onglet + sidebars d'avant le tour). C'est ça, "stateless du
  point de vue utilisateur".
- **Ordre des tours** : aucun ordre canonique. Le tour démarre sur
  l'onglet actif. En fin de tour, proposition de chaînage vers les
  3 autres (l'utilisateur choisit).
- **`prefers-reduced-motion`** : respecter (cohérence avec le halo
  L.3) — transitions de spotlight/bulle réduites ou supprimées.

## Architecture cible

**State reducer** (non persisté — un tour ne survit jamais à un
refresh) :

```js
ui.tour = {
  active: false,
  tabId: null,          // onglet du tour en cours
  stepIndex: 0,
  snapshot: null,       // { activeTab, designerSidebarCollapsed, ... }
}
```

Actions : `START_TOUR(tabId)` (capture snapshot si pas déjà actif),
`TOUR_GOTO(index)`, `TOUR_NEXT`, `TOUR_PREV`, `TOUR_CHAIN(tabId)`
(passe au tour d'un autre onglet sans re-snapshot), `END_TOUR`
(restaure le snapshot), `END_TOUR_NO_RESTORE` (pour "En savoir plus"
qui part volontairement vers la doc).

**Déclarations de tours** : `src/lib/tours/{library,designer,
composer,documentation}.js`, chacun exporte un array d'étapes :

```js
export const designerTour = [
  {
    anchor: 'designer-keyboard',
    title: 'Le clavier de test',
    body: 'Joue les notes du système courant pour écouter ton patch en direct.',
    article: null,            // ou 'why-12-notes' si pertinent
    sidebar: null,            // ou 'designer' si l'ancre est dans une sidebar repliable
  },
  // ...
]
```

`src/lib/tours/index.js` mappe `tabId → steps`.

Le champ `sidebar` (optionnel) indique au moteur quelle sidebar
ouvrir avant de pointer l'ancre (scope médian). Si l'ancre est
toujours visible sans ça, laisser `null`.

**Composants** :
- `src/components/Tour.jsx` — le moteur d'affichage (spotlight +
  bulle + progress bar).
- CSS dédié `src/components/Tour.css`.

## Découpage en sous-commits

### L.4.1 — State reducer + déclarations de tours (1er jet dev)

`feat(iter-L/phase-4.1): state tour + déclarations de tours`

- State `ui.tour` + actions (START/GOTO/NEXT/PREV/CHAIN/END/
  END_NO_RESTORE). Logique snapshot (capture à START si
  `!active`) et restore (à END) dans le reducer. Non persisté
  (absent de la sérialisation localStorage).
- `src/lib/tours/{library,designer,composer,documentation}.js` +
  `index.js`. Chaque tour = séquence d'étapes couvrant les
  fonctions clés de l'onglet. **Premier jet des textes** (titre +
  body courts, corrects, ton à polir plus tard).
- Suggestions de couverture par tour (à compléter selon ton
  jugement) :
  - **Bibliothèque** : modes d'affichage, sélection multiple,
    clipboard (chip), dossiers, raccourcis (renvoi overlay).
  - **Designer** : zone de dessin de forme d'onde, sliders ADSR,
    sélecteur de système musical, clavier de test, pastille
    Sustain, boutons Enregistrer/Nouveau, spectrogramme.
  - **Composer** : timeline + pistes, toolbar durées, BPM, octave,
    Copier/Couper/Coller, bouton Coller (ghost clip), Fusionner/
    Diviser, lecture/transport.
  - **Documentation** : sommaire (TOC), zone contenu, DocLink
    (renvoi vers un élément), bouton Raccourcis.
- **Tu peux poser de nouveaux `data-anchor`** sur des éléments pas
  encore ancrés (zone de dessin, conteneur timeline, spectrogramme,
  sliders ADSR…) pour les besoins des étapes — cohérent avec la
  convention, ces ancres serviront aussi aux futurs DocLink. Pose
  ces ancres dans ce sous-commit.
- Pas de composant Tour encore — commit testable par inspection
  du state (dispatch manuel en dev).

### L.4.2 — `Tour.jsx` : spotlight + bulle (tour mono-onglet)

`feat(iter-L/phase-4.2): Tour.jsx spotlight + bulle pointée`

- **Spotlight** : backdrop plein écran semi-opaque avec un "trou"
  sur le rect de l'ancre courante. Technique au choix — suggestion :
  un élément positionné sur le rect avec
  `box-shadow: 0 0 0 9999px rgba(0,0,0,.6)` (masque tout sauf le
  trou), `pointer-events: none` sur le trou, `pointer-events`
  bloquants ailleurs (l'app est gelée). Léger padding autour du
  rect pour ne pas coller à l'élément.
- **Résolution de l'ancre** : `getAnchoredPosition(step.anchor)`.
  Si `step.sidebar` est défini et la sidebar est repliée, dispatch
  l'ouverture **avant** de résoudre (et attendre le montage via
  RAF borné, pattern `highlightElement`). Si l'ancre reste
  introuvable/invisible après ça → **skip l'étape** (passer à la
  suivante automatiquement, ou marquer l'étape "indisponible" et
  l'ignorer dans la séquence effective — à toi de choisir le plus
  propre).
- **Bulle** : positionnée près de l'ancre (au-dessus/dessous/côté
  selon l'espace disponible, clampée au viewport façon overlay
  L.1). Contient : titre, body, compteur d'étape ("3 / 7"), boutons
  Précédent / Suivant. Une petite flèche/pointeur vers l'ancre est
  un plus (pas obligatoire si trop coûteux).
- **Re-position** au resize/scroll (l'ancre peut bouger). Pattern
  identique à l'overlay raccourcis.
- À ce stade, câbler un **déclencheur temporaire** (ex. un bouton
  debug ou un `window.__startTour('designer')` en dev) pour tester
  un tour mono-onglet de bout en bout. Le vrai déclenchement
  (Compass + Ctrl+J) vient en L.4.4.

### L.4.3 — Progress bar header-overlay + sortie

`feat(iter-L/phase-4.3): progress bar tour + ESC/croix`

- Pendant le tour (`ui.tour.active`), **masquer `tabs-buttons`**
  dans `Tabs.jsx` et afficher à la place une **progress bar**
  recouvrant cette zone : une cellule/segment par étape, l'étape
  courante mise en évidence, **étapes cliquables**
  (`TOUR_GOTO(index)`). Les étapes skippées (ancre indisponible)
  n'apparaissent pas dans la progress bar (cohérence avec la
  séquence effective).
- **Navigation onglet bloquée** par construction (les boutons
  d'onglet sont recouverts).
- **Croix close** bien visible (haut-droite, ≥ 32px) → `END_TOUR`.
- **ESC** → `END_TOUR` (capture phase pour devancer d'éventuels
  autres listeners ESC ; cohérent avec l'overlay raccourcis).
- Le reste du header (titre, theme-toggle, Keyboard, Compass,
  version) : à toi de juger s'il reste visible ou est aussi
  recouvert. Suggestion : la progress bar occupe la zone centrale
  (`tabs-buttons`), les toggles latéraux peuvent rester mais sont
  inertes (l'app est gelée). Le plus simple visuellement prime.

### L.4.4 — Bouton Compass + Ctrl+J + snapshot/restore réel

`feat(iter-L/phase-4.4): bouton Compass + Ctrl+J + snapshot`

- **Bouton `Compass`** (Lucide) dans `Tabs.jsx`, entre le bouton
  Keyboard et la version (ordre header :
  `[theme] [Keyboard] [Compass] vX.X.X`). `title="Visite guidée
  (Ctrl+J)"`, `aria-label`, état actif quand un tour tourne.
  `data-anchor="header-tour-button"` (cohérence + cible DocLink
  future).
- **Ctrl+J** : handler global dans `App.jsx`. `preventDefault()`
  impératif (Ctrl+J = ouvre les téléchargements sur Firefox/Chrome).
  Skip si form field, skip si modale ouverte (heuristique backdrops
  existante), skip si overlay raccourcis ouvert. Démarre le tour de
  l'onglet actif (`START_TOUR(activeTab)`).
- **Snapshot/restore réel** : `START_TOUR` capture
  `{ activeTab, designerSidebarCollapsed, docSidebarCollapsed, … }`.
  `END_TOUR` ré-applique ce snapshot (dispatch les resets
  nécessaires, ou restauration directe dans le reducer). Vérifier le
  cycle complet : démarrer sur Composer, le tour ouvre une sidebar,
  quitter → retour exact à l'état initial (onglet Composer, sidebar
  dans son état d'origine).
- Brancher `<Tour>` au top-level d'`App.jsx` (rendu quand
  `ui.tour.active`). Retirer le déclencheur debug de L.4.2.

### L.4.5 — Chaînage fin de tour + "En savoir plus"

`feat(iter-L/phase-4.5): chaînage tours + En savoir plus`

- **Fin de tour** (Suivant sur la dernière étape) : la bulle (ou un
  panneau dédié) affiche **"Continuer vers X, Y ou Z ?"** listant
  les 3 autres onglets, + "Quitter (ESC)". Choisir un onglet →
  `TOUR_CHAIN(tabId)` (démarre son tour **sans re-snapshot**, le
  snapshot initial est conservé). Quitter → `END_TOUR` (restaure).
- **"En savoir plus"** : si l'étape courante a un champ `article`
  valide (présent dans `DOC_TOC`), la bulle affiche le bouton.
  Clic → `END_TOUR_NO_RESTORE` (le snapshot est abandonné : on part
  volontairement) + `setActiveTab('documentation')` +
  `SET_CURRENT_ARTICLE(article)`. L'utilisateur atterrit sur
  l'article.
- Vérifier que le chaînage Composer → Designer → Library → quitter
  restaure bien l'onglet de départ.

### L.4.6 — Documentation CONTEXT.md

`docs(iter-L/phase-4): CONTEXT.md — Iteration L phase 4`

- **État actuel** : Tour guidé (bouton Compass + Ctrl+J, spotlight,
  progress bar, chaînage, snapshot/restore, "En savoir plus").
  Marquer **V1 Iteration L atteinte** (sortie de L.4).
- **Roadmap & Backlog** : cocher L.4. Prochaines : L.R (math
  renderer), L.5 (rédaction contenus). Noter que les bulles de tour
  attendent une passe writer (`archi/L4-redaction-prompt.md`).
- **Historique** : entrée Iteration L Phase 4 (6 sous-commits).
- **Modèle de données** : `ui.tour` (volatile, non persisté).
- **Décisions architecturales** : Tour = 3e consommateur de
  `getAnchoredPosition` ; spotlight + app gelée ; snapshot unique
  sur la chaîne ; tours déclaratifs par onglet
  (`src/lib/tours/*.js`).
- **Arborescence** : `src/components/Tour.jsx` + `.css`,
  `src/lib/tours/{index,library,designer,composer,documentation}.js`.

## Hors scope L.4 explicite

- **Polish rédactionnel des bulles** : 1er jet par le dev, passe
  writer sur prompt séparé (`archi/L4-redaction-prompt.md`).
- **Math renderer** (L.R).
- **Rédaction des articles** (L.5).
- **Chargement de patch démo / création de clip témoin pendant le
  tour** : hors scope médian. Si une étape Composer veut montrer le
  ghost clip (`composer-anchor-clip`) mais qu'aucun clip ancre
  n'existe, l'étape est skippée gracieusement (pas de création
  automatique).
- **Ouverture de dropdowns / menus contextuels** pendant le tour.
- **Tour au premier démarrage** (le cadrage interdit toute modale
  d'onboarding — découverte par visibilité du bouton Compass
  uniquement).
- **Deep-link vers une étape de tour** (`#tour=designer&step=3`) —
  hors scope ; à rapprocher du backlog "Routing / deep-links" si
  jamais le besoin émerge.
- **Persistance "tour déjà vu"** (ne pas re-proposer) — pas en V1,
  le bouton reste toujours disponible.

## Spec comportement attendu (résumé)

1. Bouton `Compass` visible dans le header. Ctrl+J le déclenche.
2. Démarrage → l'app gèle, backdrop + spotlight sur le 1er élément,
   bulle avec titre/description, progress bar à la place des onglets.
3. Suivant/Précédent + clic sur un segment de progress bar
   naviguent. Le spotlight et la bulle suivent l'ancre (y compris si
   le tour a ouvert une sidebar pour la révéler).
4. Une étape dont l'ancre est introuvable est silencieusement
   omise (pas de bulle vide).
5. "En savoir plus" (si l'étape a un article) → quitte le tour,
   ouvre l'article dans la doc.
6. Dernière étape → "Continuer vers X, Y ou Z ?" → chaînage ou
   quitter.
7. ESC / croix → quitte. **L'état UI revient exactement à l'avant-
   tour** (onglet + sidebars).
8. Aucune dépendance npm ajoutée. Aucun changement de comportement
   métier hors le tour.

## Workflow

1. Lire les pré-requis.
2. Implémenter L.4.1 → L.4.6 dans l'ordre. Tester chaque
   sous-commit (notamment : le cycle snapshot/restore complet, le
   skip gracieux d'une ancre absente, le chaînage multi-onglets).
3. Commit `docs: CONTEXT.md` en fin de phase.
4. Push après chaque sous-commit ou batch raisonnable.

**Interpelle** si :
- Le spotlight via box-shadow pose problème sur un élément à
  `overflow` ou `transform` parent (le rect viewport peut être
  faussé) — signale, on ajustera la technique.
- Le snapshot/restore d'un état que je n'ai pas listé s'avère
  nécessaire (ex. un popover Composer qui interfère) — remonte
  avant d'élargir le périmètre.
- Le "gel" de l'app laisse passer une interaction non voulue
  (focus clavier, scroll) — signale, on renforcera le blocage.
- Une étape de tour te paraît impossible à ancrer proprement
  (élément trop fugace, pas de référent stable) — propose de la
  retirer ou de la repenser plutôt que de forcer.

Bon vent.
