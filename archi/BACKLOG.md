# BACKLOG.md — Synth App

> Suivi des idées, pistes et dettes techniques reportées.
> Tenu par l'archi. Source de vérité pour ce qui n'est pas encore planifié.
> Dernière mise à jour : 2026-06-12.

> Note : itération T close (Effets sans mémoire, release v1.12.0,
> 2026-06-12 ; cf. CONTEXT.md). **Itération U en cours : documentation
> utilisateur de la Création (mode Info)** — cadrée 2026-06-12, cf.
> entrée ci-dessous.

---

## Itération U (en cours) : documentation utilisateur de la Création — CADRÉE 2026-06-12

Vision : un **mode Info** (bouton icône Info dans le header entre
Raccourcis et Tour, raccourci **Ctrl+I** — libre, même preventDefault
que Ctrl+K/J) calqué sur l'overlay Raccourcis : chaque **contrôle
logique visible** de l'onglet Création porte un overlay cliquable qui
bascule vers le paragraphe dédié de l'onglet Documentation. Paragraphe =
raison d'être accessible + accordéon « sous le capot » (formules, DSP)
+ illustrations SVG éventuelles + liens de retour `DocLink` (highlight
existant).

Décisions de cadrage actées :
- **Granularité = contrôle logique** (un graphe = un overlay, pas une
  poignée = un overlay ; le paragraphe détaille les poignées).
- **Un article par module** (~8 : toolbar, bibliothèque/patches, Forme
  d'onde, Harmoniques, Spectrogramme, Instrument, Enveloppe, Effets) ;
  `guide-designer.md` reste le survol narratif et pointe vers eux.
- **Navigation = bascule d'onglet** Documentation (réutilise DocLink /
  highlightElement / sessionStorage doc) — pas de panneau in-situ.
- **Ids de headings explicites `{#id}`** (pas d'auto-slug : les ids
  doivent survivre aux reformulations de titres par le writer).
- **Frontière des rôles** : dev pose structure + squelettes, **writer
  peuple la prose** (prompts distincts).

Phases :
- **U.1** — ✅ **livrée** (2026-06-12, commits 4a75bf6→b238067) : `{#id}`
  + liens profonds `doc:article#fragment` (scroll + flash, nonce
  one-shot vs restauration session), bloc accordéon `<Details>`, images
  SVG `public/docs/`, `_renderer-test.md` recréé ; point d'entrée
  externe `navigateToDoc(articleId, fragment)` (App.jsx).
- **U.2** — ✅ **livrée** (2026-06-12, commits 97e2dee→91c3108) : bouton
  Info + Ctrl+I (entrée SHORTCUTS), `infoOverlayOpen` volatile,
  `InfoOverlay` + registre `lib/docTargets.js` (16 entrées →
  guide-designer `{#id}`). Corrections notables : badges passés en
  **pastille icône-seule au repos, libellé au survol/focus + ancrage
  anti-débordement par zone** (edeb35d — c'est ce qui rend la densité
  U.3 viable) ; sonde rAF de scrollToFragment robuste à StrictMode
  (91c3108) ; warn DEV fragment introuvable (ca7c05a).
- **U.3** — couverture : 7 articles squelettes section TOC « La
  Création en détail » (faits dev, prose writer en U.4, ligne
  « version provisoire »), ~18 `data-anchor` nouveaux (pattern item
  OverflowToolbar = précédent designer-presets-button), registre
  complet ~45 entrées + **remap** des 16 entrées U.2 hors de
  guide-designer (qui redevient survol narratif, couture writer U.4) +
  bonus Bibliothèque (`library-*` → guide-bibliotheque `{#id}`,
  contexts partagés). Inventaire : 78 contrôles logiques, 34 ancrés.
  → `archi/U3-prompt.md`.
- **U.3.r** — rectificatif validation : (1) **retrait Bibliothèque**
  (hors scope — mauvais arbitrage archi en U.3 ; registre + `{#id}`
  guide-bibliotheque revertés) ; (2) **badges Effets sur les 9 boutons
  du switcher** (plus de présélection + clic canvas ; ancres déplacées
  header, entrée `designer-modulation` retirée) ; (3) **badges centrés
  au repos** (découplage position/sens d'ouverture du libellé — fin du
  décalage aux bords) ; (4) **4 trous Création comblés** (catégorie
  système, tonique repères, degrés X-EDO, auto-réduction ; bannière
  X-EDO en prose). Audit au sol approfondi : **+5 badges segments AHDSR**
  (Attaque/Maintien/Déclin/Soutien/Relâche, vue sliders ; granularité
  fine validée), **affinage ancre Catégorie/Système** (l'ancre couvrait
  toute la rangée → 2 badges distincts), **découplage ancre overview
  Enveloppe** (graphe-only, sinon superposition en vue sliders), **fix
  mapping `designer-sustain-pastille`** (cadenas de maintien = Instrument,
  pas le Soutien d'enveloppe). Structurels (chrome de module, repli
  sidebar) → **prose, pas de badge** (décision validée).
  **+ sous-contrôles des effets** (steppers/forme/graphe) badgés via
  **sections de concept partagées par famille** (LFO/enveloppe/filtre/
  disto — 18 fragments, ~43 entrées registre générées par boucle dans
  les builders partagés ; décision validée). → `archi/U3r-prompt.md`.
- **U.3.r livrée** (commits 78a2017→bac04e5, 2026-06-13/14) : r1 retrait
  Biblio, r2 badges Effets sur boutons, r3 centrage badges, r4 Instrument/
  Atelier, r5 segments AHDSR ; + correctifs dev r7 (badges fantômes du
  tiroir ⋯) et r8 (badge Écouter survit au repli sidebar, badge Lissage).
  Validé archi : 47 headings, **tous les fragments résolvent** (aucun
  badge mort). **MANQUE** : §4c (sous-contrôles des effets) ajouté au
  prompt après clôture côté dev → non implémenté.
- **U.3.s livrée + validée** (commits 5d32f33→69f8c36, 2026-06-14) :
  sous-contrôles des effets badgés via 18 sections de concept partagées
  (`FX_FAMILIES` générant ~43 entrées). Validé archi : les 18 fragments
  existent, le générateur les émet tous, **aucun badge mort**, `tsc`
  propre. → `archi/U3s-prompt.md`.

> **Jalon : mécanique du mode Info COMPLÈTE** (U.1→U.3.s). Reste de
> l'itération U : **U.4 = peuplement de la prose** (writer). Brief archi
> rédigé → `archi/U4-writer-brief.md`. Puis **2ᵉ gros morceau : mise à
> jour du Tour de découverte** (Création), avec passe sur l'article
> généré Raccourcis.
- **U.4 livrée + validée** (commits 1887956, 3e1095a, 2026-06-14) :
  7 articles `creation-*` peuplés + **6 SVG** (`public/docs/`), guide-
  designer recousu en porte d'entrée (liens vers les 7 articles). Brief
  → `archi/U4-writer-brief.md`. Validé archi : **tous les fragments
  résolvent** (aucun badge mort, `{#id}` préservés), zéro tableau/Details
  imbriqué, « Version provisoire » retiré, pièges factuels signalés
  (unité profondeur par effet, piège Q dB/linéaire) rendus fidèlement.

> **Jalon : documentation interactive de la Création COMPLÈTE & PEUPLÉE**
> (U.1→U.4). Reste de l'itération U / suite : **2ᵉ gros morceau — mise à
> jour du Tour de découverte** (Création), + passe sur l'article généré
> Raccourcis (Ctrl+I déjà présent via SHORTCUTS).
- **Ensuite** : mise à jour du **Tour guidé** (2ᵉ gros morceau, U.5+ ou
  itération V) ; passe sur l'article généré Raccourcis au passage.

Reportés dans l'itération, non perdus :
- **Compléter les stubs de l'iter L** (`about.md`, `why-12-notes.md`) —
  writer, peut s'adosser à U.4.

## Bibliothèque : anomalies sur petit écran — QUALIFIÉ (1 symptôme)

Constat utilisateur (2026-06-12, v1.12.0, post-déploiement prod) :
**sous 900px de large, le bloc Bibliothèque se réduit à ~250px de
haut**.

**Diagnostic (archi, 2026-06-12)** : collision d'héritage.
`PatchBank.css` porte une règle `@media (max-width: 900px)` qui
bascule `.sound-bank-panel` en « bandeau horizontal » `max-height:
180px` (+ `.sound-bank-list` en row/wrap). Écrite pour la **sidebar**
banque de patches (bien avant l'iter K), elle s'applique aussi à
l'onglet Bibliothèque plein écran qui réutilise ces classes
(`PatchBank` partagé) → l'onglet entier est écrasé en bandeau.

**Deux niveaux de réponse possibles** :
- *Quick fix* : scoper la règle à l'usage sidebar (sélecteur de
  contexte ou prop/classe dédiée), l'onglet plein écran y échappe.
  Faisable en un petit prompt indépendant, sans attendre le chantier.
- *Chantier complet* : passe responsive/tactile de la Bibliothèque
  (l'onglet date de l'iter K, antérieur aux refontes R/S — jamais eu
  sa propre passe ; vérifier aussi Tiles/liste, popover, lasso au
  doigt déjà backloggé).

---

## Repenser le concept « écrans minuscules » (ex-R.4) — ACTIF

**R.4 (orientation adaptative des toolbars) a été annulée en bloc** : trop de casse
pour un résultat médiocre. Le confort réel en très petit écran — surtout en
**paysage `500×300`** où la hauteur manque — reste **à reconcevoir from scratch**
(l'approche « toolbars qui pivotent gauche/haut selon le ratio » est abandonnée).
R.3 rend l'app *utilisable* à ces tailles ; ce qui manque, c'est de la rendre
*agréable*. À cadrer comme un sujet de design à part entière (pas un simple patch
CSS). En attendant, passe de correctifs **R.3.rectif** livrée (header compacte
amincie, marge gauche mobile → 0, Instrument mobile aligné sur l'intermédiaire,
toolbar Designer mobile en wrap) — voir `archi/R3-rectif-prompt.md`.

Note (spectro live/peak en petit écran) : les toggles **live/peak** du Spectrogramme
restent **utiles tant qu'un clavier matériel joue** (le chemin clavier est un listener
`window` global, ungated → desktop ET tablette+clavier BT, quel que soit le module
affiché par le switcher). Décision : **on les garde** (inoffensifs ; « clavier matériel
présent ? » est indétectable proprement). Le seul cas impossible — clavier **à l'écran**
+ spectro **simultanés** — découle du switcher « un module plein cadre » et ne changerait
qu'avec un **layout petit-écran à deux zones** (objet de ce re-concept).

Lié : le **support tactile** part en **itération S dédiée** (cadrage en cours). Le
volet **(A) « rendre le tactile fonctionnel »** (Pointer Events + `touch-action` +
verrouillage viewport/overscroll + **PWA standalone**) y est traité, web pur. Le
volet **(B) « confort du tracé fin au doigt »** (cibles ≥ 44px, édition par poignées
plutôt que main-levée, loupe/offset) **reste ici en backlog** — ouverture conditionnée
à un usage tactile confirmé.

## Dette (iter S.1) : icônes PWA raster — apple-touch-icon + maskable

S.1 a livré le manifest en **SVG-only** (`favicon.svg`, `sizes:"any"`) faute de
rasteriseur système sur la machine du dev (ni ImageMagick, rsvg-convert, Inkscape,
resvg, cairosvg, ni Chromium headless), et `favicon.svg` exploite des filtres
gaussian-blur + `color(display-p3)` → un fallback raster fait main rendrait mal.

Conséquence acceptée temporairement : **installabilité Android dégradée** (pas
d'icône **maskable** adaptative) + **icône iOS générique** (pas d'`apple-touch-icon`).
Le standalone (barre d'adresse réglée) fonctionne quand même sur les deux.

À compléter quand un vrai rasteriseur est dispo : produire **apple-touch-icon.png
180×180** + **icon-maskable.png 512×512** (marge de sécurité ~10 %) depuis
`favicon.svg`, puis recâbler `manifest.webmanifest` (entrées `icons`) + la méta
`<link rel="apple-touch-icon">`. Mise à niveau triviale (pas de refonte). **Sans
ajouter de dépendance npm** : outil système ou PNG fournis à la main.

## Idée : mode « clavier déporté » smartphone — priorité FAIBLE (gros chantier)

Sur smartphone uniquement : on ouvre l'app sur un **ordi** (usage normal), on ouvre
**en parallèle** l'app sur son **smartphone**, on bascule celui-ci en **mode
clavier**, il **rejoint la session de l'ordi** et **pilote l'app desktop** (le
smartphone devient une surface de jeu / contrôleur déporté).

Implique une **liaison temps réel entre deux appareils** (appairage de session +
transport WebRTC/WebSocket + relais) — donc, pour la première fois, **une brique
serveur / signaling** (rupture du « pas de backend »). À ne lancer que si le besoin
se confirme ; **priorité faible**, à cadrer comme un sujet à part entière.

## Iteration O (Ergonomie & responsive du Designer) — livrée 2026-06-06

Désencombrement / densification / responsive du **Designer** (tout scopé Designer).
**Détail par-phase : git + CONTEXT-ARCHIVE.** Livré (O.1→O.6, release v1.7.0) :

- **Steppers (O.1)** — sliders ancres/cap remplacés par champ + chevrons `▴▾`
  (clic ±1 / appui long accéléré / Shift ±10 / clavier) ; `NumberInput` étendu
  (livre l'item backlog « flèches ↑↓ NumberInput »).
- **OverflowToolbar (O.2, généralisé O.6)** — barre « priority-plus » réutilisable
  (mesure ghost-row + ResizeObserver, tiroir de contrôles `bar`/`tray`), sur les
  5 headers + la DesignerToolbar.
- **Instrument responsive (O.3)** — dégradation à 2 étages (⚙ système puis stepper
  octave dans le header) sur largeur **OU** hauteur ; desktop only.
- **AHDSR (O.4)** — switch Graphe/Sliders en compact (détection mesurée sur la
  zone), sliders en 2 colonnes ; `adsrView` persisté.
- **Gestionnaire de modules (O.5a→d)** — collapse en bande (icône + nom), maximize
  plein-cadre Designer (canvas jamais démonté), auto-collapse par rangée
  (coexiste avec AUTO), chrome détachée en coin + identité par icône
  (`MODULE_META`). États `designerCollapsed` / `maximized` / `autoCollapse` persistés.
- **Titres en ellipsis progressive (O.6)** — tronque puis icône seule en dernier
  recours.

**Différé / reste** (mise à jour : plusieurs items résorbés par l'itération P,
prompt `archi/P6-prompt.md`) :
- **Épuration responsive sous 924×668 (accordéon mobile)** : la bande intermédiaire
  **924–1100** (desktop serré) est désormais traitée par **P.6** — auto-collapse
  « essentiel » (Forme d'onde + Instrument ouverts, reste replié, réversible au
  ré-élargissement ; livré P.6.1, `bd35a96`), panneau gauche **verrouillé fermé**
  sous 1100, Instrument remis **en fin d'accordéon** (P.6.3). L'accordéon mobile
  **sous 924** reste **non retravaillé** → passe d'épuration dédiée à prévoir.
  Lié à « Adaptation UI résolutions intermédiaires » (Roadmap CONTEXT).
- Switch Graphe/Sliders exposé **aussi en résolution normale** (replier une vue par
  choix) — différé.
- ✅ Séparateurs glissables dans la **rangée du bas** (parité avec le haut) —
  *besoin avéré* avec le 6ᵉ module Modulation (rangée à 3 cellules) → **repris en
  P.6.2** (réutilisation de `DesignerColumns`, largeurs `designerBottomRowWidths`).
- Calibration : ajustée en direct jusqu'à 924×668 ; seuils en variables
  (`INSTRUMENT_*`, `ADSR_COMPACT_*`, `AUTO_COLLAPSE_DEFAULT_WIDTH`/`ESSENTIALS_WIDTH`,
  container-query) pour réglage ultérieur.

---

## Iteration N (Stabilité & fluidité) — livrée 2026-06-04

Apurement et polish post-rattrapage M. **Détail par-phase : git + CONTEXT-ARCHIVE.**
Livré (N.1→N.6) :

- **Latence (N.1)** — audit perf (workflow multi-agents + profilage dev/prod) →
  verdict « latence ressentie = artefact du mode dev, **prod saine** » ; fix
  epsilon iDFT (N.1.2) + quick wins (cache themeColor/PeriodicWave, arrondi payload
  −63 %). Groupe B/C de l'audit (re-renders) = **dette dormante, inutile en prod**.
- **Édition d'ancres refondue (N.2/2.1/3 + polish)** — placement Douglas-Peucker ;
  switch Doux/Anguleux = no-op ; drag = **warp 2D** (le détail ride sur la tendance,
  fin de la double-pointe) ; warp lisse en doux ; add/remove sans déformation.
  Principe : *représentation* (add/remove, switch) → canonical inchangée ; *forme*
  (drag) → warp.
- **Système de presets refondu (N.5a→f)** — modale **« Timbres »** = point d'entrée
  unique ; **2 vues idéale/band-limitée + N éditable** ; thumbnails live ; **formes
  paramétriques** (escalier, scie à étages, sinus décroissante, PWM, trapèze,
  demi-sinus, impulsion-doublet) ; chargement = comportement Effacer. Moteur
  leakage-free `src/lib/waveforms.js`.
- **Lissage (N.4)** — passe-bas + tendre-vers-spline (**les deux gardés**).
- **Durcissements (N.6)** — `@ts-check` sur `reducer.js` (4 bugs réels corrigés,
  0 résiduel) ; auto-sizing intégré en **groupe radio** (état actif dérivé).

**Différés hors itération N** :
- **#12 Mismatch FFT 600↔512** : correctness, pas perf ; fix « propre » coûteux
  (DFT directe *plus lente*, ou refactor transverse `POINTS_RESOLUTION`). Reste
  backlog ci-dessous.
- **Moteur de recherche dans la doc** : c'est une *feature*, hors thème
  stabilité/fluidité. À faire en itération dédiée.
- **Monde B inharmonique + morph, MIDI USB, i18n** : grands arcs / ouvertures
  futures, après consolidation.

---

## Iteration M (Waveform) — cadrée 2026-05-29

Cœur création de son : donner le contrôle du contenu harmonique pour des
timbres maîtrisés (proches d'instruments dans les limites du modèle, ou
inattendus mais propres). **Spec complète** :
`docs/superpowers/specs/2026-05-29-waveform-designer-design.md`.

Résumé : **Monde A** (série harmonique, mono-`PeriodicWave`) ; trois modes de
fabrication coexistants — **dessin libre** (inchangé), **points/spline**,
**éditeur d'harmoniques** (barres + N) — avec **passerelle de conversion** ;
**slider de définition** (troncature, nettoie un dessin sans quitter la 2D) ;
**bump 128→256 harmoniques** (resample 600→512) ; **layout 3 colonnes** Forme
d'onde / Harmoniques / Spectro (read-only), proportions adaptatives au mode +
presets + drag, **auto-sizing en option (essai à confirmer/jeter)** ; **patch
typé** (prérequis migration TS Phase 0+1) ; **francisation** des libellés ;
**passe doc** sur le cœur de la synthèse (+ extension renderer `\sum`).

Découpage : **préalable** TS Phase 0+1 + francisation groundwork → **M.1**
(bump 256 + slider définition) → **M.2** (layout + patch typé + éditeur barres
+ passerelle + toggle auto-sizing) → **M.3** (spline) → **M.4** (presets) →
**M.5a** (renderer `\sum`) → **M.5b** (doc writer).

Hors scope : inharmonique (Monde B), morph A↔B, toggles miroir (inaudibles),
>600 points.

Items backlog issus de la session :
- **Moteur de recherche dans la doc** (remonté passe d'usage M.5b.2,
  2026-06-02) : l'onglet Documentation a déjà ~24 articles (à enrichir par
  M.5b.1/.3/.4) — l'absence de recherche plein-texte commence à se faire
  sentir. Approches possibles :
  (a) **Recherche client pure JS** sur le `?raw` Markdown déjà importé —
  tokenisation simple, scoring TF-IDF naïf, ~100 lignes. Zéro dépendance,
  cohérent avec la philosophie minimaliste du projet. Limite : pas de
  fuzzy / stemming.
  (b) **Lunr / FlexSearch** : index plus riche, fuzzy matching,
  internationalisation. Ajout d'une dépendance npm — à valider archi.
  Côté UX : champ de recherche dans la sidebar de l'onglet Documentation,
  résultats avec aperçu contextuel (titre article + ligne où le terme
  apparaît, lien direct). À prioriser si la doc continue de grossir.
- ✅ **Latence audio à l'appui de touche** — **traité en N.1.2** (2026-06-03).
  Verdicts du profilage N.1.1 :
  (a) **rAF lerp auto-fit Y** — ✗ **infirmé** : les deux boucles
  (`WaveformEditor:665`, `SplineEditor:217`) convergent et s'arrêtent (snap à
  `peakTarget` sous 0,01, plus de `rAF` planifiée) ; `drawCanvas`/`draw` ont une
  identité `useCallback` stable (deps `[]`). Pas de boucle perpétuelle.
  (b) **recompute des 3 courbes** — ✓ **confirmé, c'est LA cause**. Pas les
  `useMemo` (correctement gatés), mais **`WaveformEditor:395` non mémoïsée**
  (`harmonicsToPoints(draftAmplitudes, cap)` à chaque mousemove de drag de barre)
  + `normalizedBg` (au changement de `cap`). Le leakage du mismatch 600↔512 rend
  les 256 barres non-nulles → le garde `if (a)` ne saute rien → 600×cap `sin()`
  (4,8 ms à cap=256). Fix : seuil epsilon (`HARMONIC_EPSILON = 1e-4`) + snap
  amont → 7,6×.
  (c) **pression rendu canvas** — ✗ **infirmé** : une seule boucle lerp par
  composant, même `drawCanvas` partout ; pas d'empilement de sources rAF.
  (d) **`pointsToHarmonics` cache miss** — ✗ **infirmé** : `pointsRef.current ===
  editor.canonical` et `usePlayback` lit `patch.canonical` (réf stable hors
  édition) → le `harmonicsCache` tient entre frappes, la FFT 512 ne se refait pas
  par note. La part audio-pure d'un éventuel retard frappe→son n'est pas
  reproductible hors navigateur (demanderait une trace Performance) — la
  contention thread par (b) suffit à l'expliquer.
  **Quick wins Groupe A livrés en N.1.4** (sans regret, indép. du verdict prod) :
  cache `themeColor()` invalidé au `themechange` (rank 6), cache `PeriodicWave`
  par (canonical, cap, ctx) (rank 7), arrondi 1e-4 du payload localStorage
  −63 % (rank 4a). **Groupe B/C gelé** (ranks 1-5, 8, 9 : re-renders par
  note/frame, isolation des drafts, mémoïsation d'arbre, mount-gating Timeline,
  débounce persistance) jusqu'à ce qu'une re-mesure **prod** prouve un résiduel
  réel. (Les numéros de rank renvoient à l'audit perf 5-dim de l'archi, hors
  repo.)
- **Support clavier MIDI USB** (longue échéance) : Web MIDI API native,
  mapping note MIDI → fréquence via le système de tempérament actif,
  vélocité → amplitude, sustain pedal MIDI → reuse de la pédale Espace
  actuelle. Vrais avantages au-delà de QWERTY : polyphonie illimitée
  (pas de ghosting), pression mesurable, gestes musicaux fluides. Hors
  scope rattrapage et doc M.5b.
- **i18n / multilingue complet** : la francisation M sème les chaînes
  centralisées ; le multilingue (ajout de langues) vient après.
- ~~**Auto-sizing au focus** : à confirmer ou jeter avant clôture de M.~~
  **TRANCHÉ → JETÉ (iter-Q, 2026-06-07).** Gardé en essai jusqu'en P, le whiplash
  de reflow et la gêne d'éditer avec un spectro rétréci l'ont emporté : feature
  retirée nette. Proportions = drag des séparateurs (haut + bas, depuis P.6.2) +
  bouton « Égaliser » deux rangées (iter-Q).
- **Itération « timbres riches / évolutifs »** (future) : Monde B inharmonique
  (cloches, métal) + morph A↔B (spectre évolutif). Les deux vrais chemins vers
  les sons « inattendus » qu'une mono-forme-d'onde ne peut pas produire.
- **Presets `sine`/`square`/`sawtooth`/`triangle` à refondre** (iter A héritage,
  remonté en passe d'usage M.r.1) : actuellement définis comme **formes
  géométriques** (carré stepped +1/-1, dent de scie linéaire, etc.). Trois
  conséquences gênantes : (1) la troncature DFT à `cap` harmoniques produit
  du ringing de Gibbs sur les discontinuités → forme audible et affichée ≠
  forme « idéale » ; (2) la fondamentale d'un carré véritable est `4/π ≈
  1.27`, donc clampée à 1 dans `canonicalToBars` → l'affichage des barres
  ment légèrement ; (3) l'utilisateur voit un signal carré mais l'audio
  jouera la version tronquée. Refonte attendue : redéfinir ces presets
  comme **séries de Fourier bande-limitées** (amplitudes harmoniques pures,
  pas formes brutes). À planifier après M.r.5, probablement comme un
  premier remplissage de la bibliothèque de presets harmoniques (M.4).
- **TS strict opt-in `src/reducer.js`** (remonté M.r.1.6) : l'oubli
  `DEFAULT_EDITOR.points` n'a pas été attrapé par le typecheck — `strict:
  false` global laisse passer les accès à des propriétés absentes (retour
  `undefined` au lieu d'erreur). Passer `reducer.js` en `// @ts-check`
  strict est dans la continuité du préalable M.0 (TS incrémental).
- ✅ **Fit intelligent des ancres via Douglas-Peucker** (livré iter-N phase-2,
  2026-06-03) — remonté en cours de
  passe d'usage M.r.5, à traiter post-M.5b) : `fitAnchorsToCurve` pose
  actuellement les ancres à `x = i · 600/N` (équiréparties). Sous-optimal :
  sur un signal carré, deux ancres tombent au plat (inutile) et aucune à la
  transition (utile). Refactor proposé : remplacer par une simplification
  Douglas-Peucker (sélection récursive des points de plus grande déviation,
  jusqu'à atteindre `N` ancres). Bénéfices : drag d'ancre intuitif (ancres
  aux points qui *comptent*), atténue mécaniquement l'**overshoot Catmull-Rom
  sur transitions verticales** (densité plus forte autour des transitions
  raides), résidu plus petit en pratique. API du helper inchangée
  (`(canonical, count) → SplineAnchor[]`) — 5 call-sites + migration + Reset
  héritent automatiquement. Coût : ~1 sous-commit dev.
- **Boutons de lissage du tracé** (remonté en cours de passe d'usage M.r.5,
  à traiter post-M.5b) : deux opérations distinctes proposées en parallèle,
  on avise à l'usage si on garde les deux ou une seule.
  (A) **Filtre passe-bas** sur la canonical : moyenne mobile / Gaussien
  local. Gomme les tremblements de souris du tracé libre. Ne dépend pas
  des ancres. Le résidu est recalculé après. Clic répétable pour lisser
  plus. Icône Lucide candidate : `Brush` ou `Waves`.
  (B) **Tendre vers la spline pure** : `canonical_new = lerp(canonical,
  splineToPoints(anchors), alpha)` avec alpha modéré (~0.5), répétable. À
  alpha=1 la canonical devient exactement la spline et le résidu = 0.
  Dépend du nombre d'ancres : 4 ancres = lisse vers un signal très plat,
  32 = peu d'effet. Icône candidate : `WandSparkles` ou `ChartSpline`.
  Note d'arbitrage : (A) et (B) sont sémantiquement différents — (A)
  supprime les hautes fréquences spatiales du tracé, (B) force le tracé à
  respecter la lentille Spline. Tester les deux en passe d'usage avant
  d'éventuellement supprimer le redondant. Conséquence sur
  `canonicalNormalized` : passe à `false` après lissage (l'opération ne
  produit pas une canonical à phase canonique iDFT).
- **Overshoot Catmull-Rom sur transitions verticales** (remonté passe d'usage
  M.r.3) : quand la canonical présente une chute quasi-verticale (signal carré,
  pulse rapide), un drag d'ancre proche de la transition produit des
  overshoots/undershoots visibles. Inhérent à Catmull-Rom : l'interpolation
  n'est pas monotone par segment, les tangentes calculées via les voisins
  font des dépassements. Workarounds utilisateur disponibles : densifier les
  ancres (slider Nombre d'ancres) ou basculer en Anguleux (polyligne stricte).
  Fix éventuel : interpolation monotone type PCHIP / Fritsch-Carlson (clamp
  des tangentes pour préserver la monotonie sur chaque segment) — soit en
  remplacement de « Doux », soit comme 3ᵉ mode. Changement de rendu sur
  tous les patches existants, donc décision archi à arbitrer si la
  limitation devient gênante.
- **Mismatch de grille FFT 600 ↔ 512** (remonté passe d'usage M.r.2.5) :
  `harmonicsToPoints` écrit sur 600 points (`Σ a_k · sin(2πkx/600)`),
  `pointsToHarmonics` resample en 512 (interp. linéaire) avant FFT.
  Ratio non-entier ⇒ leakage spectral : un sin pur d'harmonique `k` sur
  600 « fuit » sur les bins voisins en grille 512. Bug visible : éditer
  une barre haute fait bouger des barres adjacentes (et basses) à la
  relecture via `canonicalToBars`. Négligeable sur les premières
  harmoniques, amplifié quand `k` approche de Nyquist du resampling
  (~256). Le commentaire historique d'`audio.js` (« k ≤ 256 tombe sur
  un bin FFT à NUM_SAMPLES = 512 ») est trop optimiste — il suppose un
  alignement de grilles qui n'existe pas. Décision passe d'usage :
  **accepter, à documenter dans M.5b comme limitation pédagogique
  honnête**. Fix profond possible (DFT directe O(N²) sur 600 — ~150k
  multiplications, sub-ms ; OU passage canonical de 600 à 512 partout
  — refactor transverse `POINTS_RESOLUTION`, validation `.osa`,
  miniatures, etc.). Hors scope rattrapage.

---

## Iteration L (Documentation) — cadrée 2026-05-26

### Vue d'ensemble

Production de la documentation utilisateur (manuel, vulgarisation,
référence, parcours d'orientation) **sans modifier l'app principale**.
Trois entrypoints additifs : un onglet Documentation, deux boutons
d'aide contextuelle dans le header.

Slogan directeur (validé en session) : **"compatible 3 publics
(prof / élève / curieux), n'impose rien, propose tout"**. Conséquences :
pas de modale d'onboarding au premier démarrage, pas de "mode global"
qui modifie l'app, pas de parcours linéaire forcé. Tout est *additif*
et *skippable*.

### Architecture (3 entrypoints additifs)

1. **4e onglet "Documentation"** (à côté de Bibliothèque/Designer/Composer)
   - Sidebar TOC + zone contenu central
   - Rendu Markdown (renderer maison, voir Décisions de design)
   - Persistance de l'état de lecture (section ouverte + scroll) au
     changement d'onglet (sessionStorage probablement)
   - Liens internes `<DocLink target="onglet:ancre-element">` qui :
     navigation simple vers l'onglet cible **+** highlight visuel
     temporaire (halo/flash) de l'élément référencé

2. **Bouton Raccourcis** dans le header, icône `Keyboard` (Lucide)
   - Raccourci clavier toggle : **Ctrl+K**
   - Ouvre une **couche transparente semi-opaque par-dessus tout**,
     avec **étiquettes flottantes ancrées sur les éléments d'UI**
     qu'elles pilotent (un raccourci = une étiquette positionnée
     au-dessus de son référent visuel)
   - Localisée à l'onglet actif (on ne montre que les raccourcis du
     contexte courant)
   - Fermeture : ESC + croix close en évidence haut-droite
   - Navigation onglet bloquée tant que l'overlay est ouvert
   - Toggle rapide via Ctrl+K = workflow "lever le voile 1 seconde
     pour vérifier ce qu'il y a dessous"

3. **Bouton Tour** dans le header, icône `Compass` (Lucide)
   - Raccourci clavier démarrage : **Ctrl+J**
   - Démarre le tour de l'**onglet actif** (diaporama d'info-bulles
     localisées sur les éléments d'UI)
   - **Progress bar header-overlay** : pendant le tour, la barre
     `Tabs` est masquée et remplacée par une progress bar cliquable
     (étapes navigables, ESC pour quitter, croix close en évidence
     haut-droite)
   - Navigation onglet bloquée pendant le tour (la progress bar
     recouvre les boutons d'onglet, par construction)
   - **Tour stateless** du point de vue utilisateur : snapshot/restore
     de tout état UI modifié par le tour (sidebars ouvertes,
     dropdowns, patches chargés temporairement, etc.)
   - Fin de tour : "Continuer vers X, Y ou Z ? (ESC pour quitter)" —
     pas d'ordre canonique imposé, l'utilisateur choisit la suite à
     chaque fin
   - Info-bulles compactes : titre 3-5 mots + 1-2 phrases courtes.
     Bouton optionnel "En savoir plus" → ouvre l'article doc
     correspondant (seul mécanisme app→doc qu'on s'autorise,
     considéré comme intra-doc puisque le Tour fait partie de la doc)

### Principes structurels (figés)

1. **App principale (Bibliothèque/Designer/Composer) inchangée**.
2. **3 entrypoints additifs** : onglet Documentation + bouton
   Raccourcis + bouton Tour. Pas de `?` saupoudrés dans l'app.
3. **Tout est localisé à l'onglet actif** (Tour, Overlay).
4. **Un raccourci a un référent visuel** dans l'UI :
   - soit un **bouton** (pour les actions abstraites : Ctrl+Z, Ctrl+S…)
   - soit un **objet manipulé** (pour les manipulations directes :
     ↑↓/←→ sur clip sélectionné, touches notes qui placent un clip,
     drag-like)
   - cas dégénéré (raccourci sans bouton ni objet) : **promouvoir
     son feedback visuel en élément permanent** (cas Espace Sustain :
     l'info affichée actuellement à l'appui devient un indicateur
     visible avec toggle). Sinon → soit ajouter un bouton, soit
     retirer le raccourci.
5. **Tour stateless du point de vue utilisateur** (snapshot/restore).
6. **Pas de modale au premier démarrage** (découverte par visibilité
   des entrypoints).
7. **Pas d'ordre canonique des tours** (à chaque fin : "Continuer
   vers X, Y ou Z ?").
8. **Mutualisation** :
   - une table déclarative `src/lib/shortcuts.js` source de vérité,
     handlers refactorés pour la consommer
   - un attribut `data-anchor` unique posé sur les éléments d'UI,
     consommé par Tour + Overlay + DocLink/highlight
   - contenus Markdown source unique, rendus par un mini-renderer
     maison (titres, paragraphes, listes, code inline, liens
     `<DocLink>`, images)

### Carte des contenus

Sont **générés** (pas à rédiger comme texte autonome) :
- ~~A.1 Liste des raccourcis~~ → générée depuis `shortcuts.js`
- ~~D.10 Parcours découverte de l'app~~ → absorbé par le Tour

À **rédiger** (10 items) :
- **A.2 Tempéraments** — 14 fiches courtes (origine, époque,
  particularité acoustique, source citable)
- **A.4 Limites connues** — résolutions supportées, anti-aliasing
  haute fréquence, etc.
- **B.5 Guide par onglet** — Bibliothèque, Designer, Composer
  (3 articles)
- **B.6 Recettes** — exporter en WAV, créer un patch et le réutiliser,
  comparer deux tempéraments A/B, export pour distribution en classe…
- **C.7 Glossaire technique** — harmonique, DFT, période, ADSR,
  attaque/sustain, A4, Hz, octave
- **C.8 Glossaire musical** — comma syntonique vs pythagoricien,
  quinte pure vs tempérée, EDO, méantone, shruti, maqâm, raga,
  gamelan
- **C.9 Articles longs vulgarisés** — "pourquoi 12 notes ?",
  "qu'est-ce qu'un tempérament et pourquoi en a-t-on inventé
  plusieurs ?", "ce que tu entends quand tu dessines une forme
  d'onde", "pourquoi le piano n'est pas juste"
- **D.11 Démos écoutables** — compos `.osa` pré-chargées dans un
  dossier "Démos" + textes d'accompagnement (option L.6)
- **D.12 Exercices guidés** — format à inventer après retour terrain
  (option L.7)
- **E.13 À propos** — pourquoi cette app, philosophie, version,
  crédits, lien repo

### Plan en phases

| Phase | Contenu |
|---|---|
| **L.0** | **Audit raccourcis** (rapport d'inventaire par agent dev, aucune modif code). Liste exhaustive raccourci/action/fichier:ligne/contexte/bouton-équivalent/catégorie d'ancrage. Sert de base aux décisions L.1. |
| **L.1** | Table `shortcuts.js` complète + refacto handlers (consommation de la table) + convention `data-anchor` posée sur les éléments + utilitaire `getAnchoredPosition` + composant `ShortcutsOverlay` (couche transparente, étiquettes flottantes) + bouton header (`Keyboard`) + Ctrl+K toggle + ESC + croix close + corrections UI issues de L.0 (boutons ajoutés / promotions visuelles type Espace Sustain). |
| **L.2** | 4e onglet **Documentation** : squelette layout TOC + zone contenu, renderer Markdown maison, persistance lecture, contenus initiaux minimaux (À propos, Raccourcis auto, 1 article témoin pour valider rendu). |
| **L.3** | Composant `<DocLink>` consommé par le renderer + utilitaire `highlightElement` réutilisant les ancres de L.1. Navigation simple vers l'onglet cible + halo temporaire sur l'élément. |
| **L.4** | Bouton Tour header (`Compass`) + Ctrl+J démarrage + composant `Tour.jsx` (positionnement dynamique, info-bulle pointée, snapshot/restore, ESC + croix) + progress bar header-overlay cliquable (recouvre `Tabs`) + chaînage "Continuer vers X, Y ou Z ?" + tours déclarés par onglet (`src/lib/tours/{library,designer,composer,documentation}.js`). |
| **L.R** | **Extension renderer Markdown — math support maison** (arbitré 2026-05-28 ; renommée de "L.4.5" → "L.R" le 2026-05-28 pour éviter la collision avec le sous-commit `phase-4.5` du Tour). Délimiteurs `$...$` (inline) et `$$...$$` (block centré). Constructs : `^{x}` exposants, `_{x}` indices, `\frac{a}{b}` fractions, italique auto sur lettres latines isolées **à l'intérieur des délimiteurs uniquement**. Mapping Unicode ~10 entrées (`\pi \alpha \beta \gamma \cdot \times \div \approx \neq \leq \geq`). Pas de KaTeX (préserve le principe "no npm dep" du projet), syntaxe LaTeX-like pour réversibilité future. Le fichier `_renderer-test.md` est étendu en même temps pour couvrir le rendu math. Hors scope : matrices, intégrales, sommes, overline, vecteurs, environnements `\begin{...}`. Sortie : indispensable avant L.5 (fiches tempéraments et glossaires généreront beaucoup de ratios, cents, exposants). |
| **L.5** | Rédaction des contenus restants (peut commencer en parallèle dès L.2 pour les articles sans formules ; les fiches tempéraments et glossaires C.7/C.8 attendent L.R). |
| **L.6** *(option)* | Démos écoutables : dossier "Démos" pré-chargé + boutons "Écouter" dans les articles qui chargent une compo. |
| **L.7** *(option)* | Exercices guidés. Format à inventer après retour terrain (prof réel ou simulé). Pas en V1. |

**Sortie de L.4** = V1 fonctionnelle. L.5 enrichit les contenus
sans toucher au code. L.6/L.7 différables sans bloquer. La phase
**L.R** (math renderer) s'intercale entre L.4 et L.5 (cf. table).

> **Enrichissement Tour post-V1** (noté 2026-05-28) : le Tour rend
> bien en V1. Les séquences d'étapes par onglet peuvent être
> enrichies de spotlights additionnels au fil des retours (couvrir
> plus de features, affiner l'ordre, ajouter des liens "En savoir
> plus" à mesure que les articles L.5 existent). Purement additif —
> chaque tour est une liste déclarative dans `src/lib/tours/*.js`,
> on ajoute des étapes sans toucher au moteur.

> **Versioning** (noté 2026-05-28) : la version (`package.json` →
> `__APP_VERSION__` → header) est restée à **1.3.0** pendant toute
> l'itération L. Bump prévu **1.4.0 en fin de L.5** — quand le
> corpus de doc rend l'itération réellement utile côté utilisateur
> (une doc dont la mécanique marche mais sans contenu n'est pas une
> release). Minor bump SemVer (feature additive, zéro breaking
> change), cohérent avec le pattern iter-K = 1.3.0. Commit
> `feat(v1.4.0): …`. L.6/L.7 (optionnels) viendront en 1.4.x ou
> 1.5.0 plus tard.

> **Découpage L.5** (arbitré 2026-05-28) : rédaction par lots
> ordonnés par dépendance, confiés à l'agent rédacteur.
> - **L.5a** Glossaires (C.7 technique + C.8 musical) — *fondation
>   des références croisées, en premier*. Prompt :
>   `archi/L5a-redaction-glossaires-prompt.md`.
> - **L.5b / L.5c** Fiches tempéraments (A.2, 14 fiches) — scindées
>   en 2 lots (occidentaux/historiques, puis monde).
> - **L.5d** Articles longs vulgarisés (C.9, 3 restants). ✅
> - **L.5e** Guides par onglet (B.5, 3 guides). ✅ — équivalence
>   do=C explicitée dans le Guide Designer.
> - **L.5f** Limites connues (A.4). ✅
> - **Recettes (B.6)** — **différées post-1.4.0** (décidé
>   2026-05-28). Le corpus de la V1 (guides + articles + fiches +
>   glossaires + limites) est jugé suffisant pour la release ; les
>   recettes how-to (« exporter en WAV », « créer un patch et le
>   réutiliser », « comparer deux tempéraments A/B », « export pour
>   la classe ») seront rédigées en **1.4.1**, informées par un
>   premier retour terrain (quelles tâches les utilisateurs
>   cherchent réellement). Contenu pur → ajout sans coût code.
>
> **Clôture L.5** (prompts émis 2026-05-28) : tout le contenu
> rédactionnel est livré. Reste — (1) writer
> (`L5-cloture-redaction-prompt.md`) : rebrancher guides→ancres UI
> (export/track/amplitude/dossier, posées par le dev) +
> glossaire→12 fiches, retirer `_renderer-test.md` ; (2) dev
> (`L5-cloture-release-dev-prompt.md`) : bump **1.4.0** (package.json
> + about.md + CONTEXT), commit de release. Ordre : writer puis dev.
> NB : le "bug" `composer-duration-buttons` signalé en L.5e était un
> faux positif (grep littéral sur ancre dynamique `data-anchor={prop}`)
> — l'ancre est bien posée, rien à corriger.
> Section TOC **"Concepts"** introduite pour les glossaires (puis
> fiches/articles). `_renderer-test.md` à retirer en fin de L.5.
> Conversion préalable des 2 articles existants (about,
> why-12-notes) au tutoiement.

> **Ordre cible des sections TOC** (arbitré 2026-05-28, du narratif
> vers la référence) : **Le projet** (À propos) → **Prise en main**
> (guides B.5, recettes B.6) → **Comprendre** (articles longs C.9)
> → **Concepts** (glossaires) → **Tempéraments** (12 fiches) →
> **Référence** (raccourcis généré, limites A.4). `why-12-notes`
> est encore dans une section "Articles" héritée de L.2 → à
> reranger en "Comprendre" lors de L.5d. Fiches = articles séparés
> (ids `temperament-<nom>`), cibles des `doc:` du glossaire à
> rebrancher en clôture.

### Décisions de design figées (session 2026-05-26)

- **Renderer Markdown** : maison, minimaliste, ~200 lignes (titres,
  paragraphes, listes, code inline, `<DocLink>`, images). Pas de
  lib externe.
- **Tour : navigation linéaire** avec progress bar cliquable
  (sauts d'étape possibles). ESC + croix pour quitter.
- **Tour : scope onglet actif** + proposition de chaînage en fin
  ("Continuer vers X, Y ou Z ?"), pas d'ordre canonique.
- **Position des boutons** dans le header : à droite près du
  numéro de version. Ordre proposé `[Soleil/Lune] [Keyboard]
  [Compass] v1.x.x`.
- **Source unique des raccourcis** : table déclarative consommée
  par les handlers. Refacto fait dès L.1 (pas de dette).
- **Découvrabilité initiale** : pure visibilité des entrypoints
  (icônes parlantes + tooltip natif au survol). Pas de halo
  "découvre-moi" automatique.
- **Overlay raccourcis** : pas de groupement "onglet/global" (le
  principe "un raccourci = un référent visuel" rend la catégorie
  "globaux" non nécessaire). Pour les actions sur sélection
  (Composer clips), ancrage sur la sélection si présente, sur la
  zone parent sinon (label "clip sélectionné").
- **Multi-raccourcis sur même ancre** : étiquette compacte avec
  modifieurs ("↑↓ ±1 / Shift ±10") si le cas se présente vraiment.
- **Pas de `?` saupoudrés** dans l'app (seul mécanisme app→doc :
  "En savoir plus" dans les info-bulles du Tour, considéré
  intra-doc).

### Spécifications L.1 (arbitrées 2026-05-27)

Suite à l'arbitrage des orphelins identifiés dans
`archi/L0-audit-raccourcis.md`. Détails de mise en œuvre dans
`archi/L1-prompt.md` (prompt destiné au dev).

**O1 — Espace sustain Designer** : pastille `Sustain` permanente
dans la zone d'indicateurs Designer (remplace le badge SUSTAIN
éphémère). Trois états : inactif / actif (Espace maintenue) /
verrouillé. **Clic = toggle sustain verrouillé** (équivalent
pédale verrouillable d'un piano numérique). L'overlay L.1 ancrera
l'étiquette `Espace` dessus.

**O2 — Ctrl+V Composer** : nouveau bouton `Coller (Ctrl+V)`
cliquable dans la toolbar Composer (à côté de Copier/Couper).
Désactivé visuellement si `clipboard === null`. Sémantique du
clic = colle sur l'**anchor halo** (cf. O5) si présent, sinon au
**début de la piste sélectionnée** (cf. nouveau concept ci-dessous),
sinon fallback piste 0. Le hint texte actuel "Ctrl+V ou clic droit
pour coller" est supprimé (devenu redondant). L'overlay L.1 ancrera
l'étiquette `Ctrl+V` sur le bouton.

**O3 — Esc clipboard Bibliothèque** : comportement Esc inchangé
(clipboard d'abord, sélection au second appui). Ajout d'un chip
`📋 N éléments` dans la toolbar PatchBank, visible quand
`bibClipboard.items.length > 0`, avec `×` cliquable pour vider
explicitement. Le chip rend lisible le séquencement Esc. L'overlay
L.1 ancrera l'étiquette `Esc` sur le chip.

**O4 — Touche note maintenue pendant drag (C17)** : **REPORTÉ**
au sujet "UX ajout de clips Composer" (cf. section dédiée
ci-dessous). Pas de modification UI en L.1, pas d'entrée dans la
table SHORTCUTS, pas d'ancre. Statu quo.

**O5 — Anchor placement contigu (C18)** : halo subtil ton-sur-ton
sur le clip identifié par `lastAnchorClipId`. Style sobre (liseré
fin, opacité réduite, couleur accent UI), choix nuance laissé au
dev. Visible en permanence quand un anchor est défini, disparaît
si l'anchor est supprimé. L'overlay L.1 ancrera l'étiquette
"touches notes = placement contigu après ancre" sur ce halo (ou
sur le conteneur timeline avec libellé adapté si pas d'anchor).

**Nouveau concept — Piste sélectionnée Composer** : state
`composer.selectedTrackId` (string | null), persisté en
localStorage, mis à jour au dernier clic utilisateur (clic clip,
clic header track, clic zone vide piste). Signifiant visuel :
outline subtil sur le header de la piste active. Sert au fallback
O2 et probablement à d'autres usages futurs (cf. sujet UX
ci-dessous).

**Cas-limites exclus de l'overlay** (ergo standard, l'utilisateur
les connaît via les conventions OS) :
- C2 Esc Composer désélectionner
- B7 Esc Bibliothèque vider sélection (au second appui)
- B9 Enter Bibliothèque ouvrir patch/folder
- PatchBank ↑↓ navigation et Shift+↑↓ extension sélection

**Corrections textuelles incluses en L.1** :
- CP1 tooltip obsolète `"Octave courante — Shift seul = +1, Ctrl
  seul = −1"` (Composer Toolbar) → remplacer par
  `"Octave courante — PageUp/PageDown ±1"`.
- CP2 incohérence Ctrl+Y vs Ctrl+Shift+Z → uniformiser tous les
  tooltips Rétablir sur **Ctrl+Shift+Z** (PatchBank ajusté ;
  Composer/Designer déjà OK). Les deux raccourcis restent
  fonctionnels (handler `App.jsx:172` inchangé).

**Asymétrie Designer/Composer PageUp/Down** : non corrigée. Designer
ancre sur OctaveSelector (11 boutons), Composer ancre sur l'indicateur
"Octave : N" passif. Pas d'OctaveSelector ajouté en Composer (l'octave
Composer = pré-hauteur de placement, pas clavier joué, 11 boutons en
toolbar serait du bruit). L'overlay accepte un ancrage **objet** sur
un indicateur de valeur d'état.

**Autres décisions techniques de L.1** (consolidées du cadrage
2026-05-26) :
- **Touches notes Designer** : étiquettes générées sur les touches
  visuelles du clavier piano, avec détection du système actif
  (mappings QWERTY varient par système). Logique d'overlay
  composite — chaque touche du clavier visuel reçoit un
  `data-anchor-key="<code>"` pour positionnement.
- **Ancrage clips Composer** (↑↓ Shift+↑↓ ←→ Shift+←→) : étiquettes
  s'ancrent sur le clip sélectionné dans la timeline (ou la zone
  parent label "clip sélectionné" si pas de sélection). Multi-
  raccourcis sur même ancre = étiquette compacte combinée
  (`↑↓ ±1 / Shift+↑↓ ±10`).
- **Ctrl+J démarrage Tour (L.4)** : `preventDefault()` pour bloquer
  le raccourci navigateur (téléchargements). Même posture que Ctrl+K
  (focus barre adresse) et Ctrl+S (save page) déjà interceptés.

### Workflow archi/implémenteur pour Iteration L

1. ✅ Cadrage architecture — 2026-05-26.
2. ✅ **L.0 audit** livré par le dev — `archi/L0-audit-raccourcis.md`
   (commit `a70c714`).
3. ✅ Session archi d'arbitrage des orphelins — 2026-05-27. Décisions
   consignées dans la section "Spécifications L.1 (arbitrées
   2026-05-27)" ci-dessus.
4. ✅ Prompt **L.1** rédigé — `archi/L1-prompt.md` (2026-05-27).
5. ⏳ Implémentation L.1 → L.4, prompts successifs.
6. ⏳ L.5 rédaction des contenus (peut commencer en parallèle).
7. ⏳ L.6/L.7 décidés selon le rythme et le retour terrain.

---

## UX ajout de clips Composer (session dédiée — spawned par L.1)

Sujet identifié lors de l'arbitrage L.1 (2026-05-27). Les gestes
implicites d'écriture / d'ajout de clips en Composer manquent de
signifiants visuels et de cohérence ergonomique. À cadrer dans
une session dédiée, idéalement après L.4 (V1 doc livrée) — la doc
fera probablement remonter d'autres frictions à intégrer au
cadrage.

**Concernés** (non exhaustif) :

- **Touche note maintenue pendant drag (C17, orphelin O4 différé)** :
  pendant un drag de patch depuis la banque ou le PatchPicker,
  maintenir une touche de note override la hauteur du clip déposé.
  Badge `♪ XN` éphémère dans la Toolbar Composer, invisible avant
  l'appui. Geste totalement implicite sans la doc. Options
  ouvertes : promouvoir le badge en élément permanent ou conditionnel
  au drag, retirer le raccourci, ou intégrer dans un workflow plus
  large d'ajout de clips.
- **Drag depuis la banque / PatchPicker** : feedback de position
  pendant le drag, ghosting prévisualisation, snap visuels.
- **PatchPicker (Composer)** : ouvert à droite du clic, pas
  d'indication "voici le patch courant / le patch pré-sélectionné".
- **Création d'un clip "vierge"** : on ne peut pas créer un clip
  vide sans drag depuis la banque, alors que la mécanique de
  placement contigu (C18) suppose qu'on en a un comme ancre. Cycle
  amorce-then-extend asymétrique.
- **Notion "piste sélectionnée"** : introduite en L.1 pour le
  fallback du bouton Coller. À généraliser et exploiter (placement
  par défaut sur la piste active ? raccourci pour basculer entre
  pistes ?).
- **Multi-clip écriture mélodique au clavier (C18)** : la mécanique
  cœur de E.4. Halo anchor ajouté en L.1, mais le workflow complet
  (frappe au clavier → ligne mélodique se construit) mériterait
  d'être pensé end-to-end avec retour terrain.
- **Clavier visuel pour le placement des clips** (ajouté 2026-05-28) :
  réfléchir à l'inclusion d'un clavier visuel dans le Composer (ou
  un mini-clavier) au moment de placer / choisir la hauteur d'un
  clip — l'utilisateur verrait et cliquerait la note plutôt que de
  la deviner au clavier physique. À intégrer à la réflexion globale
  sur le placement des clips (alternative ou complément au geste
  touches-notes ; lien avec le PatchPicker et la notion de hauteur
  par défaut).

L'idée : retour utilisateur (prof ou élève en situation réelle)
sur "comment veux-tu écrire une mélodie au clavier ?", puis design
cohérent englobant ces gestes. Out of scope avant la livraison V1
doc.

---

## Petites bricoles (quick wins entre grosses sessions)

Correctifs/améliorations légers, à piocher entre deux grosses
itérations. Faible coût, faible risque.

- **Icônes undo/redo Composer** : différentes de celles des autres
  onglets (Designer, Bibliothèque). Harmoniser sur un seul jeu
  d'icônes ⟲/⟳ cohérent partout. (relevé 2026-05-28)
- **Indicateur "patch modifié non sauvegardé" (Designer)** : quand
  le patch courant est dirty (édité mais pas enregistré), le
  signaler visuellement — dans le PatchPicker et/ou sur le
  `we-sound-tag`. Évite de perdre des modifs sans s'en rendre
  compte. (relevé 2026-05-28)
- **Marges autour des canvas éditables (Designer)** : ajouter une
  petite marge interne autour des canvas de la forme d'onde ET de
  l'enveloppe, pour que (1) les tracés ne sortent pas du cadre et
  (2) le drag de dessin ne se perde pas quand la souris frôle les
  bordures. (relevé 2026-05-28)
- **Nommage "On_Synth_App"** : remplacer "Synth App" par
  "On_Synth_App" partout, **via une constante** unique (titre,
  exports, métadonnées…) plutôt que des littéraux dispersés.
  (relevé 2026-05-28)

---

## Mécanisme d'undo — cohérence à revoir (Designer)

À cadrer (relevé 2026-05-28) : l'utilisateur a constaté des
comportements **incohérents** de l'undo au fil de ses essais,
notamment dans le **Designer**.

Piste principale : le **chargement d'un nouveau patch** (ou la
création via Ctrl+Alt+N) pourrait être l'occasion de **vider la
pile d'undo** du Designer. Aujourd'hui la pile semble survivre aux
chargements, si bien qu'un undo après chargement peut ramener à un
état appartenant à un patch précédent — incohérent du point de vue
utilisateur.

Contexte technique (cf. CONTEXT.md) : piles undo isolées par onglet
(iter-K), `RESET_EDITOR` (Ctrl+Alt+N) préserve l'exploration mais
réinitialise le contenu du patch, `HYDRATE_EDITOR_FROM_PATCH` au
chargement. La question : ces transitions (charger / nouveau patch)
doivent-elles **réinitialiser la pile undo** du Designer ? Probable
oui — un patch chargé est un nouveau point de départ. À investiguer
(reproduire les incohérences, lister les transitions concernées)
avant de trancher la politique exacte.

---

## État global de l'itération F (réf. CONTEXT.md pour le détail)

Itération F (multi-tempérament) **majoritairement livrée**. Le registre
`tuningSystems.js` héberge 14 systèmes (12-TET, Pythag-12, Just-major-c,
Mésotonique 1/4-comma, Werckmeister III, 24-TET équipartite, Maqâmât
Cairo 1932 mesuré, 5-TET, 31-EDO, Slendro, Pelog, shrutis Bhatkhande,
shrutis Sarngadeva, free). Quatre layouts clavier dédiés (piano-12,
grid-24, grid-5, grid-7, grid-22-bhatkhande, grid-22-sarngadeva,
grid-31). Visual cues passifs (catalogue universel en cents + halo
magenta `is-cued`) sur 8 systèmes. Persistance Designer cohérente
(F.4.4.3) et guards transverses navigateur (F.7.5).

**Reste à faire en F** : F.8 (X-EDO paramétrique) puis dette UI
dropdown catégorisée par tradition.

## Prochaines pistes probables (ordre indicatif)

1. **F.8 — X-EDO paramétrique** (planifié, design layout adaptatif en
   cours par l'archi).
2. **Dette UI dropdown catégorisée par tradition** (post-F.8, le
   dropdown atteindra 13-15 entrées et sa lisibilité plate
   commence à frotter).
3. **Itération G — Performance Designer** (clics résiduels post-E.9
   probablement liés à `PeriodicWave` non mémoïsée + cost
   d'infrastructure au démarrage à chaud — diagnostic à faire avant
   optimisation).
4. **Backlog général** ci-dessous, à piocher selon priorité ressentie.

---

## Itération F — Reste à faire et candidats futurs

### F.8 X-EDO paramétrique (planifié, design en cours)

Entrée registre `'x-edo'` paramétrée par un X variable choisi par
l'utilisateur entre 1 et 40 (40 = max maintenable sur QWERTY en
gardant toutes les notes accessibles au clavier). Une seule entrée
registre, layout adaptatif selon la valeur de X.

- **État** : `editor.xEdoX` (number, 1..40), `clip.xEdoX` (number,
  optionnel — valable seulement si `clip.tuningSystem === 'x-edo'`).
  Persistés alongside les autres champs `editor.test*`. Cohérent avec
  l'invariant F.4.4.3 (clamp défensif à l'hydratation pour indices
  hors borne).
- **Anchorage** : degré 0 oct 4 = a4Ref (cohérent 5-TET, 31-EDO,
  gamelan, shrutis).
- **Layout adaptatif** : design en cours par l'archi. Plages
  pressenties — X=1 trivial (1 cellule = octaves seules), X∈[2,7]
  ligne unique, X∈[8,14] deux rangs avec escalier 1/2, X∈[15,32]
  3-4 rangs en escalier façon grid-31 généralisé, X∈[33,40] 4 rangs
  pleins.
- **QWERTY** : parcours déterministe des touches selon X (Z-row 7,
  A-row 9, Q-row 10, digit row 10, ponctuations à risque pour
  atteindre 40).
- **Visual cues** : désactivés par défaut (le sens des patterns
  dépend de X, pas pédagogique sans calibration). Activable
  conditionnellement plus tard (X=12, 24, 31) si la demande émerge.
- **UI** : input numérique X dans la toolbar Composer (à côté de A4),
  visible quand `testTuningSystem === 'x-edo'`. Pattern à la
  BpmInput / A4Input (validation différée, ↑↓ ±1, Shift ±5).
- **Suppressions associées** : drop des entrées `'5-tet'` et `'31-edo'`
  du registre (acoustiquement redondantes une fois X-EDO en place).
  Pas de migration localStorage (stade dev, aucun utilisateur réel
  impacté). Composants Grid5Layout et Grid31Layout **conservés**
  (Slendro réutilise grid-5 ; Grid31Layout potentiellement réutilisable
  comme cas interne de X-EDO X=31).

### Dette UI : dropdown catégorisé par tradition

Le dropdown des tempéraments a 14 entrées actuellement (15 avec X-EDO
ajouté en F.8). Au-delà de 12-13, la liste plate devient peu lisible.
Solution simple : `optgroup` HTML par catégorie sémantique. Coût
implé faible, bénéfice immédiat.

Catégories pressenties :
- **Égaux occidentaux** : 12-TET
- **Justes** : just-major-c
- **Historiques européens** : pythagorean-12, meantone-quarter-comma,
  werckmeister-iii
- **Maqâmât** : 24-tet-equal (théorique Cairo 1932), 24-tet-cairo-1932
  (mesuré)
- **Gamelan** : slendro, pelog
- **Indiens** : shrutis-bhatkhande, shrutis-sarngadeva
- **Expérimental paramétrique** : x-edo
- **Libre** : free

Bénéfice double : (1) lisibilité dropdown ; (2) **affordance
d'enseignement** — le prof voit la structure du domaine d'un coup
d'œil. C'est plus qu'un gain UI, c'est de la pédagogie embarquée.

### Tempéraments candidats futurs (priorité moyenne)

À réintégrer si la demande émerge :

- **53-EDO** (Holder XVIIe siècle, Mercator). Approxime quasi-parfaitement
  la juste intonation et le pythagoricien. Layout très large (53
  cellules) — design non-trivial, dépasse la capacité QWERTY 40 keys.
  À reconsidérer post-F.8 si X-EDO ne couvre pas le besoin (X-EDO max
  est 40).
- **22-EDO Erlich** (xenharmonique théorique XXe). Aucune tradition
  culturelle (le mythe "shrutis indiens = 22-EDO" debunké en
  conversation). Couvert par X-EDO X=22 ; entrée distincte seulement
  si quelqu'un réclame le label spécifique.
- **Bharata reconstructed shrutis** : 3e framework indien historique.
  Reconstruction académique divergente selon les auteurs (Sambamoorthy,
  Daniélou, Lewis Rowell) — shippable seulement avec citation explicite
  du reconstructeur. Bénéfice pédagogique marginal vs Bhatkhande +
  Sarngadeva déjà présents.
- **17-EDO** : a une histoire arabe théorique (Safi al-Din al-Urmawi,
  XIIIe). Pas joué historiquement mais étudié dans les manuscrits.
  Couvert par X-EDO X=17.
- **19-EDO** : tempérament intermédiaire entre méantone 1/4-comma et
  12-TET. Salinas XVIe siècle, Yasser XXe. Couvert par X-EDO X=19.
- **Slendro / Pelog autres accordages** : Yogyakarta (vs Surakarta
  actuel), variations Sumarsam ou Tenzer. Chaque ensemble gamelan
  ayant sa micro-variante, ajouter une entrée registre par accordage
  spécifique si demande. La référence actuelle (Surakarta,
  Surjodiningrat 1972) couvre l'usage générique.

### Modes expérimentaux (à designer ultérieurement)

- **Série harmonique custom** : l'utilisateur entre des ratios libres
  pour un système de N notes. Distinct de `'free'` (mode Hz arbitraire)
  — proche conceptuellement de X-EDO mais avec ratios non-équipartis.
- **Fibonacci tuning** : positions à intervalles fibonacciens.
- **Nombres premiers tuning** : positions à intervalles basés sur les
  nombres premiers.
- **Alien tuning** : générateur aléatoire avec seed reproductible.
  Pour exploration créative pure.

Ces modes sont des spécialisations de "système avec table de cents
arbitraire" — architecturalement faisable mais demande une UI
d'édition de la table. Idéal pour une session pédagogique
"construis ton propre système".

### Gestion humble des systèmes sous-documentés

Traditions pour lesquelles la littérature accessible est fragmentaire
(Aztèque / Maya, aborigène australien, pré-colonial africain, etc.).

- **Ne pas inventer** (principe codifié en F.6 et F.7) : on commit à
  une référence documentée explicite avec source citable, sinon on
  n'ajoute pas. Précédents : Cairo 1932 (aly-abbara.com), Surakarta
  (Surjodiningrat 1972), shrutis (Bhatkhande 1909-1932 et Sangita
  Ratnakara via Te Nijenhuis 1974 / Rowell 1992).
- Mécanisme **import custom** (ratios / cents définis par l'utilisateur,
  cf. Modes expérimentaux ci-dessus) utilisable comme contournement
  pour les traditions non-représentables aujourd'hui faute de source.

### Features transverses sur les tempéraments

- **Noms culturels en hover/tooltip** : afficher les noms natifs au
  survol — sa/re/ga/ma/pa/dha/ni (indiens), barang/gulu/dada/lima/nem
  (Slendro), ji/ro/lu/pat/mo/nem/pi (Pelog), Yakah/Ushayran/Iraq/Sika
  (maqâmat). Couche optionnelle complétant les labels romains/arabes
  de base. Demande un nouveau pattern tooltip cross-layout (similaire
  à AdsrTooltip de F.3.13.2 mais pour les cellules clavier).
- **Visual cues gamelan-spécifiques** : Pathet Nem / Sanga / Manyura
  pour Slendro, Pathet Lima / Nem pour Pelog ; ou Pelog Bem / Pelog
  Barang comme sous-ensembles 5 notes des 7 Pelog. Catalogue dédié
  par système, sélectable en parallèle des cues classiques.
- **Visual cues indien-spécifiques** : ragas (Bhairav, Yaman, Kafi,
  Bhairavi, Khamaj…) avec sous-ensembles de shrutis surlignés.
  Catalogue dédié, parallèle aux cues classiques.
- **Visual cues "compositionnel actif" (Saveur B)** : sélection
  multi-clic par l'utilisateur sur le clavier pour bookmarker
  visuellement un accord ou gamme custom. Reporté de F.4.4 — à
  rouvrir si l'usage utilisateur le justifie (saveur A — bibliothèque
  pédagogique passive — semble couvrir la majorité des cas).
- **Catalogue visual cues éditable user-defined** : permettre à
  l'utilisateur d'ajouter ses propres patterns au catalogue. UI
  d'édition (cents ou intervalles), persistance custom dans
  localStorage.
- **Multiples patterns simultanés** : afficher 2-3 patterns ensemble
  avec des halos de couleurs distinctes (triade majeure + septième
  dominante + gamme) pour démonstrations harmoniques riches.
  Aujourd'hui un seul pattern à la fois.
- **Repères en Composer et PropertiesPanel** : les visual cues
  n'apparaissent que dans le clavier Designer. Étendre aux
  PropertiesPanel (mono et multi) et au Composer pour cohérence
  cross-vue.

### Anchorage configurable

Aujourd'hui chaque système ancre la fréquence selon une convention
implicite (A pour 12-TET et compagnie, deg 0 pour 5-TET / 31-EDO /
gamelan / shrutis / X-EDO). Pour les systèmes sans A, l'utilisateur
ne peut pas choisir un autre degré comme tonique de référence sans
calculer manuellement un a4Ref adapté.

Petit ajout possible : champ **"anchor degree"** configurable par
système (par défaut = convention actuelle). Surcharge utilisateur
pour les systèmes sans A. Friction marginale aujourd'hui, à ajouter
si quelqu'un en exprime le besoin réel en classe.

### Questions de design F encore ouvertes

- **Affichage A4 dans la toolbar** : actuellement libellé "A4 = X Hz"
  même quand le système courant n'a pas d'A (5-TET, 31-EDO, gamelan,
  shrutis, X-EDO à venir). Pas trompeur en pratique (l'utilisateur
  comprend "hauteur de référence"), mais pourrait gagner un libellé
  conditionnel ("Hauteur de référence" pour les systèmes sans A,
  "A4" pour les autres). Lié à l'item "Anchorage configurable"
  ci-dessus.

---

## Backlog général (hors itération F)

### Notation / interopérabilité — import LilyPond

Idée (relevée 2026-06-05) : **compatibilité avec LilyPond** = pouvoir **importer**
un fichier `.ly` et le transformer en composition (tracks + clips) jouable dans
l'app. Sens = LilyPond → app (PAS export ; l'export est un autre sujet, non
demandé).

- **Difficulté principale : LilyPond est un vrai langage**, pas un format de
  données — variables, `\include`, macros, `\score`/`\new Staff`/`\new Voice`,
  modes `\relative` vs absolu, durées « collantes »… Parser le LilyPond *général*
  est impraticable. Il faut **cibler un sous-ensemble strictement défini** et
  **refuser/avertir** sur les constructs hors périmètre (plutôt que mâchouiller en
  silence). C'est l'arbitrage central.
- **Sous-ensemble V1 pressenti** : suites de notes (hauteur + octave, absolu **et**
  `\relative`), durées collantes (`4 8. 2`…), `\time` (défaut 4/4), `\tempo`,
  plusieurs `\new Staff`/voix → plusieurs `Track`. Ignorer/approximer : liaisons,
  slurs, n-olets, ornements, nuances, paroles.
- **Mapping vers le modèle** : hauteur LilyPond → `noteIndex`/`octave` (12-TET) ;
  token de durée (`1 2 4 8 16` + points) → `Clip.duration` (noires) ; position
  dans la mesure → `measure`/`beat` (BEATS_PER_MEASURE=4) ; `\tempo 4=N` → `bpm` ;
  chaque portée/voix → un `Track`.
- **Pièges concrets** :
  - `\relative` : inférence d'octave par rapport à la note précédente (la quarte
    de référence) — logique d'état à tenir.
  - **durées collantes** : une note sans durée hérite de la précédente — le parser
    doit suivre l'état.
  - **accords** `<c e g>` : un `Clip` joue **une** hauteur → soit éclater en N
    clips empilés (même beat, pistes ≠ ou même piste), soit non supporté V1.
  - **patch à assigner** : un clip importé doit référencer un `patchId` → choisir
    le patch courant / un patch par défaut par track (l'import ne crée pas de
    timbre).
- **Tempéraments — caveat *inversé* vs l'export** : LilyPond est nativement 12-TET,
  donc l'import retombe proprement en 12-TET — **pas** le problème bloquant qu'on
  aurait à l'export. (La notation microtonale LilyPond existe mais est rare ; hors
  périmètre V1.)
- **Périmètre / coût** : parser autonome `src/lib/lilypondImport.js` + entrée
  d'import à côté du `.osa` (modale Import existante). **Aucune dépendance npm**
  (parsing texte, comme `osaFormat`/`markdown` maison) — cohérent avec la
  philosophie. Risque = le scope du sous-ensemble (à border serré). Valeur :
  faire **entendre/synthétiser une partition écrite** avec les timbres de l'app
  (fort en usage classe).
- À cadrer en itération dédiée. **Décision préalable indispensable** : la liste
  exacte des constructs supportés vs refusés-avec-message.

### Clavier

- **Clavier piano étendu (2 octaves)** : afficher 2 octaves d'un coup sur le
  clavier visuel (aujourd'hui 1 octave + décalage PageUp/PageDown). Lecture plus
  naturelle des mélodies à large ambitus, plus de notes jouables sans changer
  d'octave. À penser pour les layouts (a minima `piano-12`, idéalement
  `grid-24`/`grid-31`/`grid-x-edo`). Contrainte : largeur écran (un clavier 2
  octaves prend plus de place — cohérence avec les seuils de résolution).
- **Note de départ / transposition du clavier** : pouvoir choisir la note de
  départ des claviers pour **jouer dans une tonalité autre que C** (ex. clavier
  qui commence en D). **Distinct de « Anchorage configurable »** (section F
  ci-dessus, qui fixe la *référence de fréquence* d'un système d'accordage) : ici
  c'est une **transposition de jeu** (quelles notes les touches déclenchent), pour
  composer dans d'autres tonalités sans recalculer un a4Ref. UI : sélecteur de
  tonique/note de départ par clavier.

### Dette structurelle — Migration TypeScript progressive

Décision archi (session 2026-05-27) : adopter TypeScript de manière
**incrémentale, fichier par fichier**, sans casse intermédiaire.

**Justification** : le projet a grossi au-delà du seuil où le coût
type-checking devient inférieur au coût bugs-de-modèle. Iter-K (132
commits) aurait été plus safe avec un modèle typé. Le code audio
qui sera refacto en itération G (AudioWorklet, mémoïsation
PeriodicWave) gagnera énormément à être typé en amont.

**Principe** : Vite supporte JS et TS côte à côte. Un `.tsx` peut
importer un `.js` et inversement. Les types s'effacent au runtime
(zéro effet sur perf ou comportement).

**Phasage proposé** :

- **Phase 0** — Setup. `npm i -D typescript @types/react @types/react-dom`,
  créer `tsconfig.json` avec `allowJs: true`, `strict: false`,
  `checkJs: false`, `noEmit: true`. Vérifier `npm run dev` inchangé.
  1 commit, neutre fonctionnellement.
- **Phase 1** — Modèles d'abord (gros ROI). Convertir
  `src/lib/tuningSystems.js` en `.ts`, créer `src/types.ts` avec
  `Patch`, `Clip`, `Track`, `TuningSystem`, `Action` (reducer),
  `AppState`. Le reducer global peut rester en `.js` mais ses
  imports sont typés → tous les composants qui touchent un `Clip`
  ou un `TuningSystem` reçoivent autocomplétion + check
  automatiquement.
- **Phase 2** — Conversion au fil de l'eau. Quand on modifie un
  fichier pour autre chose, on le renomme en `.tsx` (composants)
  ou `.ts` (libs) et on annote ce qui en vaut la peine. Pas de
  rush pour tout convertir.

**Préconditions / timing** :

- **À faire AVANT itération G perf**. Typer les modules audio
  (`pointsToPeriodicWave`, `playInstrumentNote`, scheduler)
  facilite leur refacto AudioWorklet.
- Peut commencer dès que iter-L est livrée (V1 doc), avant ou en
  parallèle de F.8 (X-EDO paramétrique).

**Discipline à tenir** :

- Préférer `unknown` à `any` quand on ne sait pas (force narrowing
  explicite plutôt que désactiver le check silencieusement).
- Garder `strict: false` global tant que tous les fichiers ne sont
  pas annotés. Activer strict mode par fichier via opt-in.
- Les composants React vont en `.tsx` (pas `.ts`), pour parser le
  JSX.

**Pièges identifiés** :

- `useReducer` global : nécessite de typer `AppState` et l'union
  discriminée `Action`. Travail modeste mais réflexion à faire une
  fois. ROI énorme (plus de typos sur `dispatch({ type: '...' })`).
- Imports avec extension explicite (`'./foo.js'`) à transformer
  en `'./foo'` ou `'./foo.ts'`. À vérifier à la conversion.
- Libs sans types fournis : ajouter `@types/<lib>` ou
  `declare module '<lib>'` ponctuellement.

**Bénéfice secondaire** : les "contraintes implicites" du modèle
(IDs via compteurs persistés, drafts locaux pour gestes continus,
pas de champ `lane` dans `Clip`, etc.) peuvent devenir des
contraintes **explicites du typage** (types brandés, unions
discriminées). La doc se fait par les types eux-mêmes.

**Hors scope** :

- Pas de big bang. Pas de PR géante "tout passer en TS".
- Pas d'activation de `strict: true` global avant que la dernière
  conversion soit terminée et stable.
- Pas de changement de comportement runtime pendant la migration
  (les annotations sont muettes).

---

### Qualité audio

- **Anti-aliasing / harmoniques parasites** sur basses fréquences
  (identifié via spectrogramme sur triangle C1). Piste : oversampling
  + filtre passe-bas, ou synthèse limitée en bande (BLIT / PolyBLEP).
- **DynamicsCompressorNode sur master bus** (protection clipping
  quand plusieurs pistes jouent simultanément, identifié en C.2).

### Performance audio (itération G potentielle)

Observations 2026-04-21 / 2026-04-22 : qualité variable selon machine.
- **Composer** (scheduler look-ahead) : globalement fluide sur toutes
  les machines testées, y compris multipiste. Quelques craquements
  épars historiques sur machine faible (Xubuntu) jugés mineurs.
- **Designer** (clavier live polyphonique) : plus dégradé sur
  Xubuntu. E.8 + E.9 n'ont pas réduit les clics perçus dans le
  Designer, ce qui confirme qu'ils ont une cause distincte des
  discontinuités de signal ciblées par ces phases.
- **Hypothèses Designer** (post E.9) :
  - **Cost d'infrastructure au démarrage à chaud** : le Composer
    schedule à `now + lookAhead` (100ms d'avance), ce qui laisse au
    navigateur le temps de router le graph audio et compiler la
    `PeriodicWave`. Le Designer start à `now` — ces coûts se paient
    pendant l'attaque et produisent un hoquet perçu comme un clic.
  - **`PeriodicWave` non mémoïsée par patch** : si
    `pointsToPeriodicWave(points, ctx)` est rappelée à chaque
    `playInstrumentNote`, la DFT 256 harmoniques bloque le main
    thread quelques ms à chaque key press. À mémoïser
    (clé = patch.id + version des points) pour n'appeler qu'une
    fois par patch.
  - **`AnalyserNode` + oscilloscope** qui tape en
    `requestAnimationFrame` pendant les attaques, ajoute de la
    pression CPU.
- **Diagnostic à faire en G** avant optimisation : Chrome/FF
  DevTools Performance sur Xubuntu, identifier la source dominante
  (GC, PeriodicWave, re-renders, dérive setInterval).
- Optimisations candidates (priorité à réévaluer après diagnostic) :
  - **Mémoïsation `PeriodicWave`** par patch → probable gain Designer.
  - **Pool d'oscillators** (réutilisation) → réduit GC pressure.
  - **Pré-warm du graph audio** au passage en Designer ou à la
    sélection d'un patch → absorbe le cost d'infrastructure avant
    la première note.
  - **React.memo** + découplage curseur Timeline.
  - **DFT dans Web Worker** (si la mémoïsation ne suffit pas).
  - **Migration Timeline DOM → Canvas**.
- Si insuffisant : AudioWorklet + synthèse bandlimited (BLIT/PolyBLEP)
  — résout aussi l'anti-aliasing.
- PWA / Service Worker : pas un gain audio direct, mais permet
  l'installation offline pour contourner les variations navigateur.

### Tenue des notes (Designer) — clics résiduels après E.9

Historique :
- E.8 a fixé le clic de coupure nette sur appui bref (rampe release
  qui partait de 0).
- E.9 a ajouté MIN_ATTACK (fade-in minimum) + RETRIGGER_FADE
  (micro-fade-out voice-stealing).
- **Reste non résolu** : le clic à la naissance d'une voix dans le
  Designer (appui bref ou non) et le clic de retrigger sustain,
  inchangés après E.9 sur Xubuntu.

Interprétation archi : ces clics ne sont probablement pas des
discontinuités de signal (puisque les fixes qui les ciblent n'ont
pas d'effet) mais des **pauses CPU ponctuelles** à l'attaque.
Voir "Performance audio" ci-dessus pour les pistes. À traiter en G
avec un diagnostic profiling.

### Lecture / transport

- **Pause/reprise** de lecture (actuellement stop = retour à 0).
- **Curseur déplaçable** par clic sur la timeline.
- **Loop** : marqueurs de début/fin, activation, affichage — faisable
  maintenant que le scheduler look-ahead est en place (C.3).

### Spectrogramme avancé

- Toggle dB / linéaire.
- Zoom (X et/ou Y).
- FFT temps réel pendant la lecture (AnalyserNode déjà exposé).
- Affichage post-ADSR (spectre effectif de la voix jouée, pas juste
  la forme d'onde).

### UX / thème

- Améliorations contrastes (passe 2).
- Section stats (nb mesures, nb clips, durée totale).

### Aide à l'utilisation (session dédiée)

**Découvrabilité des raccourcis** : beaucoup de raccourcis clavier
sont en place mais ne sont pas visibles pour un nouveau venu (↑↓
demi-ton, Shift+↑↓ octave, ←→ beat, Ctrl+C/X/V, Ctrl+D split,
Ctrl+M merge, touches note mappées QWERTY par système, NumPad/Shift+
Digit pour les durées, Espace sustain, Shift/Ctrl seul pour octave,
clic droit menus, etc.). Pistes possibles à trancher en session :
- Panneau d'aide toggleable (icône `?` + overlay listant tous les
  raccourcis contextuels selon l'onglet).
- Tour guidé au premier démarrage (skippable).
- Affichage des raccourcis en légende dans chaque menu contextuel /
  bouton (texte secondaire).
- Cheat sheet imprimable (utile pour usage classe — le prof peut
  distribuer).

### Matériel pédagogique (session dédiée)

Transformer l'app en véritable outil pédagogique (sans casser son
usage actuel de création libre). Pistes :
- **Tooltips explicatifs** sur les éléments techniques :
  qu'est-ce qu'un harmonique, un ADSR, un tempérament, un comma,
  une période de blanche, etc. Activables ou permanents selon le
  mode.
- **Glossaire intégré** pour les termes spécialisés (forme d'onde,
  DFT, quinte pure, comma syntonique vs pythagoricien, EDO,
  méantone, shruti, maqâm, raga, etc.).
- **Démonstrations pré-chargées** : petites compos types illustrant
  un concept (une gamme majeure, une quinte pure vs tempérée, les
  formes d'onde de base, la triade pure en 31-EDO vs 12-TET, le
  comma enharmonique en méantone, etc.).
- **Exercices guidés** : "reproduis ce son", "trouve la tierce
  majeure", "compose une cadence V-I"… à discuter avec le prof
  utilisateur pour cadrer le curriculum.
- **Tooltips dédiés aux tempéraments** : courte description
  contextuelle de chaque système au survol du label dropdown
  (origine historique, particularité acoustique).

### Système de modes (à discuter)

Question ouverte : comment concilier un outil de création libre
(utilisateur avancé) et un outil pédagogique (élève découvrant) ?

Options à discuter :
- **Un seul mode, tooltips toujours disponibles** (toggle global
  "aides visibles") — simple, peu intrusif.
- **Deux modes distincts** : "Découverte" (tooltips, curriculum,
  UI simplifiée ?) vs "Création" (tout débloqué, pas de
  hand-holding). Risque : UI divergent, maintenance doublée.
- **Progression** : l'app débloque des features au fur et à
  mesure que l'utilisateur les utilise (Duolingo-style). Trop
  ambitieux pour l'état actuel du projet.

Décision à prendre avec feedback du prof utilisateur (cf. context
pédagogique) avant de coder. Le bon choix dépend de l'usage réel
en classe.

### Performance / stockage

- **Migration timeline DOM → Canvas** (perf à grand nombre de clips).
  Seuil à mesurer avant de décider.
- **Optimisation stockage localStorage** : résolution points (600 →
  200 ?), quantification, ou migration IndexedDB.

### Routing / deep-links partageables (révise une contrainte du projet)

**Contexte** : aujourd'hui l'app est mono-route, accessible
uniquement sur `/`. La navigation interne (onglets, articles
de doc, patches chargés) n'est pas reflétée dans l'URL. La
contrainte technique "Pas de routing" est inscrite dans
`CLAUDE.md` racine — elle a été posée à l'origine pour minimaliser
le projet, mais l'arrivée de la documentation (Iteration L) crée
un besoin nouveau : **partager une URL d'article**.

**Motivation initiale** : pouvoir envoyer à quelqu'un un lien
direct vers, par exemple, l'article "Pourquoi 12 notes ?" ou la
page Raccourcis. Sans routing, on doit dire "ouvre l'app, va
dans l'onglet Documentation, clique sur l'article X".

**Options à trancher** :

- **(a) Hash-based** (`/#tab=documentation&article=why-12-notes`) :
  approche minimale, le hash n'est jamais envoyé au serveur,
  compatible avec n'importe quel hébergement statique sans
  configuration. Pas besoin de lib de routing. Lecture/écriture
  via `window.location.hash` + listener `hashchange`. Probablement
  le bon compromis pour ce projet.
- **(b) Query string** (`/?tab=documentation&article=why-12-notes`) :
  URLs un peu plus jolies. Lecture/écriture via `URLSearchParams`
  + `history.replaceState`. Pas besoin de config serveur non plus
  (la query string est envoyée mais le serveur sert index.html
  pour `/` quoi qu'il arrive).
- **(c) History API "pathname"**
  (`/documentation/why-12-notes`) : URLs les plus naturelles. Mais
  **nécessite que le serveur réponde par index.html sur toute
  route**, sinon refresh = 404. Contraintes d'hébergement plus
  fortes (config nginx, vercel.json, etc.). Probablement trop
  intrusif pour le ROI à ce stade.

**Recommandation** : **(a) hash-based**, cohérent avec le
minimalisme du projet. Permet de partager des URLs sans
infrastructure spéciale. Extensible naturellement à d'autres
deep-links plus tard (onglet actif, patch courant, etc.) si
le besoin émerge.

**Conséquences** :
- Mise à jour de `CLAUDE.md` racine : la contrainte "Pas de
  routing" devient "Routing minimal hash-based pour le partage
  de deep-links (pas de lib externe, lecture/écriture
  `window.location.hash` directe)".
- Refacto léger : un module `src/lib/deepLink.js` qui
  parse/sérialise le hash et expose `getDeepLink()` /
  `setDeepLink(partial)`. Listener `hashchange` qui dispatch
  vers le state global.
- Coexistence avec sessionStorage doc : l'URL prime au load
  (deep-link), sessionStorage prend le relais à la navigation
  interne (le hash est mis à jour au switch d'article pour que
  copy-paste de l'URL fonctionne).
- Compatibilité existant : si pas de hash, comportement actuel
  (état restauré depuis localStorage + sessionStorage).

**Périmètre V1 minimal** : juste l'onglet actif et l'article de
doc. Soit deux clés `tab` (4 valeurs) et `article` (id). À
implémenter probablement en **phase L.4 ou L.5** (après le Tour),
ou en hotfix dédié post-iteration L. Pas urgent — c'est une
amélioration de partage, pas un bug.

**Extensions possibles plus tard** (à designer si demande
émerge) :
- `patch=<id>` pour pré-charger un patch dans le Designer
  (mais les IDs sont locaux à l'utilisateur → utile uniquement
  pour le partage cross-device par export/import)
- `compo=<filename>` pour charger une compo `.osa` depuis un
  lien (pose la question d'où elle vit — repo, gist, autre ?)
- Section de doc (`#tab=documentation&article=...&section=intro`)
  via id de heading

### Interactions diverses

- **Menu contextuel clip enrichi** (Composer Timeline) : actuellement
  un seul item "Retirer le clip". Pistes pour itération future : mute
  clip, duplicate clip, copy/cut/paste clip, set clip color manuelle,
  ouvrir patch source dans la bibliothèque (différent d'"éditer dans
  Designer" qu'on a explicitement écarté pour garder la séparation
  patch ≠ clip). Cf. iter-K phase-2.f23.
- **↑/↓ Composer généralisé aux tempéraments non-12-TET** (dette
  UX). Actuellement les flèches ↑/↓ décalent la hauteur des clips
  sélectionnés de ±1 demi-ton **uniquement** en 12-TET (et systèmes
  qui réutilisent `piano-12` comme just-major-c, pythagorean-12,
  méantone, Werckmeister III) — les autres systèmes (24-TET, 5-TET,
  31-EDO, gamelan, shrutis, X-EDO) n'ont pas de réponse à ces
  raccourcis. Demande de définir la sémantique propre à chaque
  système : ±1 degré ? ±1 cellule ? ±1 colonne (pour les layouts
  grid) ? Probablement "±1 degré du système courant" comme
  convention universelle (cohérent avec l'idée de "demi-ton" en
  12-TET = 1 degré). Shift+↑/↓ resterait ±1 octave (octave
  universelle). À cadrer en session dédiée tempéraments.
- Flèches haut/bas dans `FreqInput` pour incréments fins.
- **Annulation drag par Échap** (selon ressenti utilisateur).
- **Édition précise amplitude + ADSR** dans le Designer. Aujourd'hui
  ces paramètres sont pilotés par sliders (amplitude) et poignées
  draggables (ADSR visuel). Ajouter des inputs texte précis à côté,
  même pattern que `FreqInput` en mode Libre : saisie au clavier,
  validation différée, fourchette claire (0-1 pour amplitude/sustain,
  0-1000 ms pour attack/hold/decay/release). Utile quand on veut
  reproduire un son spécifique ou comparer deux patches au cent de
  près.
- **Flèches haut/bas dans NumberInput** (sliders ADSR : Amp, A, H, D,
  S, R) pour incréments fins, sur le modèle de A4Input/BpmInput.

### Effets et modulations (enrichissement sonore)

Aujourd'hui un patch = forme d'onde + amplitude + AHDSR. Tout le reste
(modulations, effets) est absent. Grosse marge de richesse sonore à
gagner, tout en restant 100% Web Audio natif (nodes existants
suffisent pour 80% du catalogue).

✅ **Livré (iter P, v1.8.0→v1.9.0)** : vibrato (LFO → `osc.detune` cents),
trémolo (LFO sommé sur `gain.gain`), édition visuelle des LFO (graphe
temporel à poignées). Détail = git + CONTEXT-ARCHIVE.

✅ **Itération T livrée (v1.12.0, 2026-06-12) — « tour complet des
effets sans mémoire »** : module « Effets » à switcher header (un
panneau à la fois, pastille activé / highlight édition), puis **9
effets par patch** — vibrato, trémolo (iter P), auto-pan, pitch env
(Inverser + 4 formes), filtre + enveloppe + wah, disto vivante (mix,
env. drive, poignée 2D Drive/Mix au point caractéristique, drive
continu). `.osa` v4 (bump unique, champs absents → défauts). Détail =
git + CONTEXT-ARCHIVE.

**Gros chantier suivant — effets à mémoire** (delay-based, *par patch*
via bus d'effet partagé persistant, et/ou *par piste*) :
- **Delay / écho** : `DelayNode` + feedback loop. Params : time (ms
  ou synchro tempo), feedback, mix wet/dry.
- **Reverb** : `ConvolverNode` + impulse response. IR synthétique
  générée (simple room / hall) ou lib d'IRs fournies.
- **Chorus** : delays courts modulés par LFO (identité de timbre →
  défendable par patch, cf. discussion 2026-06-09).
- **Flanger** : delay très court modulé, fort feedback.
- Prérequis architectural : **nœuds à durée de vie longue** (bus
  d'effet par patch) + **gestion des queues** (durée d'export
  prolongée, cleanup différé, invalidation scheduler). C'est le
  chantier, pas les effets eux-mêmes.

**Vague « inattendus » (après T, à brainstormer)** : ring mod / AM à
taux audio, FM (pousser le `rate` des LFO existants dans le domaine
audio en donne un avant-goût), LFO sur le cap d'harmoniques, « fall »
de hauteur déclenché au release (chute type cuivres — ancrage sur
`releaseStart`, identifié en T.3bis), **keytracking du cutoff** (le
cutoff suit la hauteur de la note — classique synthé, identifié en
T.4), **LFO sur le drive** (la moitié enveloppe du « drive modulable »
est livrée en T.6bis via `driveEnv` ; reste la variante LFO —
territoire AM/effets spéciaux)…

**Effets de mixage** (par piste) :
- **Pan stéréo statique** : `StereoPannerNode`. (L'auto-pan T.2 ouvre
  la stéréo par patch ; le pan posé par piste reste à faire.)
- **Compresseur par piste** : en complément du master bus déjà
  backloggé.

**Questions restantes** (pour le chantier à mémoire) :
- Niveau d'application delay/reverb : par patch (bus partagé), par
  piste (`trackEffects` sur `Track`), ou les deux.
- UI Composer : rack par piste pour delay/reverb/pan ?
- **Impact perf** : chaque effet = des nodes Web Audio en plus par
  voix (T) ou par patch/piste (chantier suivant).

### Notation / solfège

- **Mode "expert" durées** : les combinaisons ×1.25 et les pointés /
  double-pointés sur durées très courtes sont actuellement grisées.
  Un toggle pourrait lever la contrainte pour les utilisateurs
  avancés.
- **Refonte système notes/durées** : boutons au lieu de dropdowns
  pour note/octave, durées manquantes dans le sélecteur (blanche
  pointée, ronde pointée, double-pointées).

---

## Bugs connus non résolus

- **Ctrl+D déclenche parfois le bookmark navigateur** malgré
  `preventDefault` (reproduction intermittente, mode opératoire à
  documenter quand observé). NOTE_GUARD_KEYS de F.7.5 ne couvre pas
  KeyD car le shortcut est Ctrl+D et on laisse passer Ctrl/Meta —
  c'est un cas spécifique qui demanderait une exception ciblée.
- **Dezoom molette Composer — petits sauts brefs de recalage**
  (régression observée post-L.1, à confirmer). Symptôme : un
  scroll molette de dezoom produit des micro-sauts de la timeline
  pendant l'animation, comme si la position scrollLeft était
  recalculée et appliquée légèrement à côté pendant un frame ou
  deux. Si on scroll cran par cran (un Δzoom à la fois), la
  position finale est correcte mais le saut transitoire reste
  visible. Piste : ordre de mise à jour entre `setZoom(newZoom)`
  et l'ajustement de `scrollLeft` (qui doit compenser pour garder
  le point sous la souris fixe). Possible interaction avec les
  re-renders introduits en L.1 ou les follow-ups overlay. À
  diagnostiquer avant fix.
- **Définitions des raccourcis incorrectes/incomplètes dans
  `src/lib/shortcuts.js`** (signalé post-L.2, à auditer). Au
  moins quelques entrées de la table déclarative ne reflètent
  pas fidèlement le comportement réel (libellé, description,
  conditions d'activation). Impact : la page Raccourcis
  auto-générée et l'overlay raccourcis affichent des infos
  inexactes. Mode opératoire : passer la table en revue contre
  les handlers réels (et le rapport L.0
  `archi/L0-audit-raccourcis.md`), corriger les écarts. Pas
  bloquant pour la livraison V1 doc — à traiter en fin de L
  ou en hotfix dédié.

(Note : l'ancienne entrée "Firefox raccourcis pendant drag (en cours
de fix en phase 7.1)" référençait le QuickFind sur ' / Digit4 et ses
variantes, fix initialement en F.3.6 et généralisé transversalement
en F.7.5 via la guard NOTE_GUARD_KEYS partagée. Plus de bug actif sur
ce point.)

---

## Reportés explicitement (décision prise)

- **Piano roll** (lanes = hauteurs de note au lieu de polyphonie).
  Mentionné pendant la réflexion E.3. Reporté car refonte UI majeure ;
  pourrait justifier sa propre itération. À reconsidérer si le besoin
  remonte côté utilisateur.
- **"Piste active" et "patch actif"** comme notions explicites de
  l'UI. Écarté pour E (confusion avec la sélection existante).
  Pourrait revenir si le besoin se fait sentir — typiquement pour
  piloter le placement contigu au clavier sur une piste précise sans
  sélection préalable.
