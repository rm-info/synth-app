# CONTEXT.md — Synth App

> Document maintenu automatiquement par Claude Code. Mis à jour à chaque fin de phase.
> Coller en début de session pour briefer un nouveau modèle/contexte.

## TL;DR

Synthétiseur web pédagogique : on dessine une forme d'onde à la souris,
on la place sur une timeline multipiste, on exporte en WAV. Stack minimale :
React 19 + Vite, Web Audio API native, persistance localStorage. **TypeScript
incrémental (allowJs, opt-in fichier par fichier ; depuis le préalable de
l'Iteration M), pas de lib audio, pas de state manager, pas de framework UI,
pas de routing.** Itération A (refonte UX core : 2 onglets Designer/Composer,
dual save, zoom %, édition clips, undo/redo) **clôturée le 2026-04-15**.
Itération B **clôturée le 2026-04-17** (spectrogramme statique ;
multi-sélection + drag/resize/dup/delete groupés + Properties multi ;
copier/coller/fusion/split clips ; scroll/zoom Ctrl/Alt+drag ;
répertoires de sons arborescents avec drag interne ; menu contextuel
mesures avec supprimer/insérer/couper/copier/coller).
Itération C **clôturée le 2026-04-18** (multipiste : UI multi-tracks,
mute/solo/volume, moteur audio look-ahead, adaptation features A/B).
Itération D (Designer UX) **clôturée le 2026-04-19** : Phase 1 — sélecteur
de système `tuningSystem` (12-TET + Libre), mode libre étendu à 2^4-2^15
Hz (16-32768), clavier piano 12 notes + sélecteur d'octave 0-10, trois
boutons Test (impact/court/tenu).
Itération E (Patches vs Notes) **clôturée le 2026-04-22** — refonte
conceptuelle majeure. Phase 1 (2026-04-19) : les **sons** deviennent des **patches**
sans fréquence ni note ; la hauteur est portée par chaque **clip**
(tuningSystem + noteIndex/octave en 12-TET, ou frequency en Libre).
Un patch peut être joué à n'importe quelle hauteur sans duplication.
Pas de migration : ancien localStorage détecté → reset propre.
Phase 2 (2026-04-19) : la note s'affiche dans chaque clip (label
adaptatif selon largeur), s'édite dans Properties via un mini-clavier
(ou un FreqInput en mode libre), et s'ajuste au clavier (↑↓ demi-ton,
Shift octave, ←→ ±0.125 beat, Shift+←→ ±1 beat). Phase 3 (2026-04-19) :
le Designer devient un instrument de test polyphonique — clic/mouseup
sur le clavier, raccourcis QWERTY physique (SDFGHJK + ERYUI), PageUp/
PageDown pour décaler l'octave, Espace = pédale de sustain. Les 3 anciens
boutons Test impact/court/tenu sont retirés. Phase 4 (2026-04-19) :
dans le Composer, touche maintenue pendant un drag = drop à la note
correspondante (au lieu de la note par défaut du Designer). Touche
seule sans drag = placement contigu après le dernier clip touché
(permet d'écrire une mélodie au clavier en quelques touches).
Phase 6 (2026-04-20) : durées en boutons toggle (7 bases + 3 coefs),
snap triple croche (0.125), indicateur d'octave dans la toolbar,
animation des corridors 0.35s. Phase 7 (2026-04-20) : ajustements UI
— sync invariant `lastAnchorClipId ↔ selectedClipIds`, fraction
réf noire (1=noire, 1/2=croche), sidebars Composer resizables et
collapsibles (persist localStorage, label vertical en mode fermé),
settling frame pour animation drag cross-piste.
Phases 8-9 (2026-04-22) : fixes audio — release ADSR sur appui bref
(capture `gain.value` avant `cancelScheduledValues`), micro-fades
anti-clic démarrage (`MIN_ATTACK = 3ms`) et retrigger
(`RETRIGGER_FADE = 8ms`).
Itération F (multi-tempérament) **ouverte le 2026-04-22**. Phase 1 :
infrastructure posée — registre des systèmes de tempérament
(`src/lib/tuningSystems.js`) comme point d'extension unique, A4 de
référence configurable dans le modèle (champ `a4Ref`, défaut 440 Hz,
persisté, sans UI encore exposée). Phase 2 (2026-04-22) : premier
tempérament alternatif — **Pythagoricien 12 centré sur C** (chaîne
de quintes pures 3:2, loup entre F# et Db), sélecteurs de système
dynamisés (Designer + Properties), ajout du sélecteur dans
PropertiesPanel avec logique de bascule verrouillée au reducer
(`UPDATE_CLIPS_PITCH` dérive les champs cohérents — frequency /
noteIndex-octave — au changement de système). Nouvel input A4 dans
la toolbar Composer (`A4Input`, 380-480 Hz entiers).
Phase 3 (2026-04-23) : **multi-tempérament 24 notes**. Registre
enrichi (champs `layout` et `keyboardMap` portés par chaque entrée),
`keyboardMap.js` supprimé. Deux nouveaux tempéraments **24-TET égal**
et **24-TET Le Caire 1932** (table en dur, source aly-abbara.com,
ancrée 'Oshairan = A4 = 440 Hz). Clavier visuel adaptatif :
`PianoKeyboard` devient un dispatcher (`piano-12` / `grid-24`),
`Grid24Layout` rend une grille 4 rangées × 14 colonnes avec 4 niveaux
de couleur (naturelles, demi-dièses/-bémols, dièses pleins). Mapping
QWERTY 24 positions exactement (S/D/F/G/H/J/K + E/R/T/Y/U/I/O +
2/4/6/8/0 + X/C/B/N/,). Refonte raccourcis durées : NumPad sans Shift
ET Shift+Digit (les Digit nus sont libérés pour les notes 24-TET).
Snap inter-systèmes généralisé : `frequencyToNearestNote` (12-TET
only) → `frequencyToNearestIn(hz, sysId, a4Ref)` qui itère sur la
grille du système cible et minimise la distance en cents.
Phase 4.1 (2026-04-25) : **Juste intonation majeure centrée sur C**
— table d'Ellis 5-limit en dur (ratios canoniques pour les 7
naturelles, enharmoniques bémols fonctionnels pour les accidentels),
ancrage `C4 = a4Ref × 3/5` pour préserver A4 = a4Ref. Mêmes noms de
notes et même clavier physique que 12-TET (réutilise `piano-12` et
`TWELVE_KEY_MAP`). Phase 4.2 (2026-04-25) : **5-TET pentatonique
égale** — 5 degrés nommés I..V, ratio de pas 2^(1/5) ≈ 240 cents,
tonique I ancrée à `a4Ref` à l'octave 4 (plus de A en 5-TET : la
"hauteur de référence" glisse du A vers le I). Nouveau layout
`grid-5` (5 rectangles colorés en ligne, palette 5 hues à 72° de
pas), mapping QWERTY `FIVE_KEY_MAP` = sous-ensemble SDFGH du 12-TET
(mêmes positions physiques, sémantique de degrés).
Phase 4.3 (2026-04-25) : **31-EDO explorateur micro-tonal** — 31
divisions égales de l'octave (step ≈ 38.71¢), tierce 10 degrés à
+0.78¢ du ratio juste 5/4 (quasi-pure, signature méantone du
système). Interprétation abstraite : degrés numérotés 1..31, pas
d'import de la nomenclature méantone (cohérent avec 5-TET). Tonique
deg 0 ancrée à `a4Ref` à oct 4. Nouveau layout `grid-31` (4 rangées
× 8 colonnes moins la case haut-droite, escalier 1/4 d'unité par
rangée → 35 sub-cols, palette 4 hues à 90° de pas). Mapping QWERTY
`THIRTYONE_KEY_MAP` 31 positions sur les 4 rangées physiques du
clavier en serpentin-colonne (KeyZ KeyS KeyE Digit4 KeyX … KeyP).
**Tier 1 multi-tempérament clos** (4.1 juste-majeure, 4.2 5-TET,
4.3 31-EDO). Tier 2 (Slendro, Pelog, 22-TET, 53-EDO) reste en
backlog ; Tier 3 (mésotoniques historiques, Werckmeister) livré
en F.5.
Phase 4.4 (2026-04-25) : **repères visuels passifs** sur le clavier
— catalogue universel de gammes & accords en cents (`src/lib/visualCues.js`,
8 patterns), snappés vers les degrés du système courant via
`frequencyToNearestIn` (la même "triade majeure" produit [0,4,7] en
12-TET et [0,10,18] en 31-EDO). UI barre "Repère + Tonique" dans
le Designer (masquée pour 5-TET et Libre). Halo magenta
`.is-cued` cross-layout, coexiste avec `is-active`/`is-playing`.
Saveur B (sélection compositionnelle active) en backlog.
Phase 5 (2026-04-25) : **Tier 3 historiques européens**.
Deux tempéraments 12 notes ajoutés : **Mésotonique 1/4 de comma**
(centré sur C, chaîne E♭→G♯, tierces majeures 5/4 pures, loup G♯↔E♭ ;
Renaissance/début Baroque) et **Werckmeister III** (1691, 4 quintes
tempérées par 1/4 de comma pythagoricien + 8 pures ; tempérament
Bach, toutes tonalités utilisables avec couleurs progressives).
Tables de cents inline (Helmholtz/Ellis pour mésotonique, Barbour
1951 pour Werckmeister). Aucun nouveau layout ni mapping —
réutilisation de `piano-12` et `TWELVE_KEY_MAP`. Visual cues
activés pour les deux. Registre à 10 entrées. Tier 2 (gamelan,
22-TET, 53-EDO) reste en backlog.
Phase 6 (2026-04-25) : **Tier 2 gamelan**. Deux tempéraments
javanais d'après Surjodiningrat-Sudarjana-Susanto 1972 (étude
empirique de référence) : **Slendro** (5 notes, pas presque
égaux mais avec déviations audibles vs 5-EDO — signature
gamelan ; réutilise grid-5 et FIVE_KEY_MAP) et **Pelog** (7
notes, pas très inégaux, deux grands trous ; nouveau layout
`grid-7` calqué sur grid-5, mapping QWERTY home row SDFGHJK).
Cellules équidistantes (convention piano-12), nomenclature
romaine I..V / I..VII (pas d'import javanais natif). Tonique
deg 0 = a4Ref. Visual cues désactivés (les patterns du
catalogue n'ont pas de sens en gamelan). Registre à 12
entrées.
Phase 7 (2026-04-26) : **Tier 2 shrutis indiens**, deux
frameworks théoriques sur les mêmes 22 shrutis canoniques
5-limit. **Bhatkhande** (1909-1932, modernisation hindustani,
distribution 1-4-4-4-1-4-4 — sa et pa sont des piliers
étroits) et **Sarngadeva** (Sangita Ratnakara XIIIe,
distribution Bharata classique 4-3-2-4-4-3-2 — sa, ma, pa
habitent 4 sub-shrutis chacun, "piliers larges"). Substrat
acoustique partagé (`SHRUTI_CANONICAL_CENTS` + `shrutiFreq`
factorisés) ; sémantique différente (deux layouts dédiés
`grid-22-bhatkhande` et `grid-22-sarngadeva`, deux
nomenclatures romaines avec sous-lettres I/IIa..IId/…/V/…,
deux mappings QWERTY). Ancrage sa = a4Ref. Visual cues
désactivés. Pédagogiquement complémentaires : on entend la
même chose, on lit deux grammaires. Registre à 14 entrées.
Reste 22-EDO Erlich (distinct des shrutis indiens) et 53-EDO
en backlog. Dette UI dropdown (14 entrées) devient urgente —
à traiter en phase dédiée.
Phase 8.1 (2026-04-27) : **X-EDO paramétrique — infrastructure
backend**. Une seule entrée registre `'x-edo'` paramétrée par un N
choisi par l'utilisateur (défaut 31, borne livrée 1..43 — 44..53
attendent la logique Shift de F.8.2). Champs `notesPerOctave`,
`noteNames` et `keyboardMap` deviennent des **factories** prenant
`xEdoN` ; helpers `getNotesPerOctave / getNoteNames /
getKeyboardMap` cachent ce polymorphisme aux call-sites.
`xEdoLayouts.js` génère le mapping QWERTY de chaque N en
serpentin-colonne ascendant selon la spec `archi/layouts_x-edo.txt`
(escalier +1 col par rangée, AZERTY-FR : '!' = Slash, '^' =
BracketLeft, etc.). Champ d'état global `state.xEdoN` (composer-
undoable, persisté), action `SET_X_EDO_N` qui resnap les clips
'x-edo' vers la nouvelle grille (cohérence acoustique > conservation
noteIndex). Migration localStorage : les clips '5-tet' et '31-edo'
sont convertis à l'hydratation vers 'x-edo' avec snap (formules
inline `legacyEqualFreq`, indépendantes du registre). Suppressions
en F.8.1.4 : entrées '5-tet' et '31-edo' du registre, composants
Grid5Layout / Grid7Layout / Grid31Layout ; Slendro et Pelog
basculent sur `layout: 'grid-x-edo'` avec keyboardMap statique
précalculé `xEdoKeyboardMapForN(5/7)`. **Régression
inter-phase** : Slendro / Pelog / X-EDO n'ont temporairement pas
de clavier visible (le composant GridXEdoLayout vient en F.8.2)
— interaction au clic indisponible, lecture audio préservée.
`window.__store` exposé en mode dev pour modifier xEdoN via
console (UI input N à venir en F.8.3). Registre passe de 14 à
13 entrées (-5-tet -31-edo +x-edo).
**Interpellation archi** : l'exemple N=12 du prompt diverge du
schéma N=12 du fichier (KeyL/KeyK absents du schéma). Implémentation
suit le fichier (source de vérité déclarée).
Phase 8.2 (2026-04-27) : **composant GridXEdoLayout + cellules
splittées Shift**. `xEdoLayouts.js` étendu à N=53 (mode
SHIFT_ANCHOR pour 44..53, `SHIFT_BASE_CELLS` ordonnée
progressivement pour que la "touche sans Shift" en N impair soit
toujours la dernière). Nouveau composant React `GridXEdoLayout.jsx`
générique, palette HSL dynamique (hue par col, lightness par row,
héritage 75/60/45/30% du grid-31 historique). Architecture
`.gridx-cell` > `.gridx-key` (1 ou 2 halves selon le mode Shift).
Slendro / Pelog (basculés en grid-x-edo en F.8.1.4) retrouvent
leur clavier visible (gridSize=5/7), X-EDO l'utilise via
state.xEdoN. Captation Shift en mode SHIFT_ANCHOR :
WaveformEditor + App.jsx routent `e.shiftKey` vers les degrés
shifted ; Shift reste guard pour les durées Composer ailleurs.
Au passage : bug latent F.8.1.3 corrigé (App.jsx composer
accédait directement à `.keyboardMap` qui retournait la factory
pour 'x-edo'). Régression UX inter-phase de F.8.1.4 résolue.
Phase 8.3 (2026-04-27) : **UI X-EDO complète** — exposition
utilisateur. Composant `XEdoInput.jsx` (calqué sur A4Input,
validation différée, bornes [X_EDO_MIN, X_EDO_MAX]) intégré dans
trois sites quand `tuningSystem === 'x-edo'` : Toolbar Composer
(à côté de A4), Designer (sous le sélecteur de système),
PropertiesPanel mono + multi (sous le TuningSystemSelect, tooltip
rappelle que la valeur est globale). Bannière info au-dessus du
clavier Designer quand `xEdoN === 12 || xEdoN === 24` :
"Correspond à 12-TET / 24-TET équipartite. Utiliser le layout
dédié." — clic dispatch UPDATE_CLIPS_PITCH (snap des clips x-edo
vers la cible) + SET_EDITOR_TEST_TUNING_SYSTEM. Le `tuning-select`
de la Toolbar passé à max-width 220px pour aérer les 13 entrées.
Itération F (multi-tempérament) **clôturée** ; reste en backlog
le redesign optgroup catégorisé du dropdown (B.dropdown-tuning).
Itération G (Designer UX) phases 1 + 2 **clôturées le 2026-05-20**.
Phase 1 (refonte ciblée saturation bas-gauche) :
1.1 extraction Nouveau/Update/Save vers un panneau Actions dans la
sidebar gauche entre Bibliothèque et MiniPlayer ; renommages
"Paramètres" → "Instrument" et "Banque" → "Bibliothèque". 1.2
sidebar Designer redimensionnable + réductible (calqué Composer),
mode collapsed avec popover flottant Bibliothèque. 1.3 zone
Instrument refondue (Catégorie + Système musical filtré, Libre
testable via bouton + raccourci 's'). 1.4 `ResolutionGate` au
mount.
Phase 2 (raffinements UX) :
2.1 Lucide-react ajouté ; tous les glyphes remplacés par icônes ;
mode collapsed restructuré en 3 groupes (haut Bibliothèque /
spacer / Actions + séparateur + Play). 2.2 panneau Actions inline
d'icônes groupées en mode ouvert (patch / historique / import-export
placeholders) ; Undo/Redo migrés du header Waveform vers Actions.
2.3 nouveau composant `ShortLabelSelect` (libellé court trigger,
complet menu) ; les 4 contrôles Catégorie / Système / Repère /
Tonique unifiés sur une seule ligne flex-wrap, avec X-EDO N inline ;
rename "Actuel / Moderne" → "Moderne". 2.4 patch porte un
`defaultTuningSystem` (capturé au save) ; propagation au drop :
clé maintenue → editor.testTuningSystem ; drop simple → patch.default
(fallback editor) ; placement contigu → anchor.tuningSystem.
2.5 OctaveSelector au-dessus du clavier avec libellé "Octaves" ;
clavier en `flex:1` qui s'étire verticalement selon espace ; ligne
Note ancrée tout en bas. 2.6 ResolutionGate réactif au resize +
overlay (app jamais unmount, localStorage et mémoire React
préservés) ; wording explicite "taille de fenêtre" vs
"résolution d'écran" + nominaux 1024×768 / 1920×1080 cités.
Backlog : adaptation UI pour résolutions intermédiaires
[924×668..1740×900] ; implémentation effective Import/Export
bibliothèque (boutons placeholders dans Actions).

**Itération H (Import/Export)** **clôturée le 2026-05-21**. Phase 1
(import/export bibliothèque) : nouveau format binaire `.osa` (magic header OSA2 + gzip(JSON versionné)
avec 4 octets garbage injectés à offset 10 du flux gzip pour défaire
les archiveurs permissifs type 7-zip, zéro dépendance npm via
CompressionStream natif). Trois voies d'export — bouton Actions
Download (bibliothèque complète), clic droit row dossier ("Exporter ce
dossier", désactivé si sous-arbre vide), clic droit row patch
("Exporter ce patch"). Modale "Export as..." avec saisie du nom de
fichier, suffixe `.osa` auto (case-insensitive), slugification des
chars filesystem interdits. Import unique via bouton Actions Upload :
validation pré-modale strict-strict (magic / gzip / JSON parse /
schéma), puis modale de placement (sous-ensemble dans un dossier
wrapper / racine). IDs systématiquement régénérés à l'import →
invariant timeline préservé (les clips existants ne peuvent jamais
être affectés). Déduplication des noms de dossiers via
`nextAvailableFolderName` (extrait dans `src/lib/folderNames.js` au
passage). Nouveau primitive `Modal.jsx` partagé (backdrop / Escape /
focus trap basique). Persistance auto via la pile undo Designer.

**Itération I (Spectrogramme avancé)** **clôturée le 2026-05-24**.
Phase 1 : enrichissement du Spectrogram Designer avec deux modes
(statique = DFT canonique d'un cycle + Live FFT = AnalyserNode
temps réel pendant les notes test). Toggle Static/Live **explicite**
via bouton header (l'auto-switch initial avec grace period 1s a été
remplacé après retour utilisateur — option A du brainstorming choisie
finalement). Toggle dB / linéaire applicable aux deux modes.
Toggle peak hold pour le mode Live (peaks persistants décroissant en
~1s, stockés en linéaire pour décroissance multiplicative naturelle).
Graduations Y sur les deux modes (majors + minors traversant le plot,
labels "0/0.25/0.5/0.75/1" en linéaire, "−80/−60/−40/−20/0" en dB).
Nouveau routage audio dans WaveformEditor (`osc → gain → analyserGain
→ analyser + ctx.destination`) ; compteur `activeVoicesCountRef`
maintenu via `osc.onended` (réagit au release réel, pas au timeout
nominal). Refs `analyserRef` et `activeVoicesCountRef` partagés
App → WaveformEditor (peuple) → Spectrogram (lit). Scope α Designer-only.
Au passage, fix d'un bug pré-existant : les actions `SET_EDITOR_TEST_*`
n'étaient plus undoable et leurs valeurs ne sont plus écrasées par les
snapshots undo (deep-merge editor au restore via `restoreSnapshot`).

**Itération J (Anti-aliasing audio)** **clôturée le 2026-05-24**.
Phase 1 : correction d'un bug audio fondamental — les harmoniques
miroirs de la DFT (k=129..255, conjugués de k=1..127 pour un signal
réel) étaient passés à `createPeriodicWave`, qui les traitait comme
des harmoniques indépendants à des fréquences `k×f`, produisant des
parasites audibles à basse fréquence (4-8 kHz pour C0). Fix :
truncation à `N/2+1 = 129` coefficients (k=0..128). Au passage,
remplacement de la DFT naïve O(N²) par une FFT Cooley-Tukey radix-2
in-place O(N log N) (~30 lignes JS pur, zéro dépendance), avec
self-test en dev mode. Memoization runtime via WeakMap keyed par
référence du buffer `points` — le reducer créant un nouveau tableau
à chaque modif (immutable updates), le cache hit naturel évite les
recalculs entre playback audio et Spectrogram statique. Single-file
refactor (`src/audio.js`). Aucun changement de signature publique
— consumers transparents.

**Itération K (Bibliothèque multi-mode)** **clôturée le 2026-05-25**.
Phase 1 : transformation de `PatchBank` en bibliothèque type file
explorer. 5 combinaisons d'affichage (Tree × List/Details + Nav ×
List/Details/Tiles ; Tiles caché en Tree). Mode Navigation avec
breadcrumb cliquable+éditable et ligne ".." pour remonter. Multi-
sélection (Ctrl+clic toggle, Shift+clic range, drag rectangle lasso).
Clipboard Copier/Couper/Coller avec anti-cycle (refus de coller un
folder dans son sous-arbre, notification utilisateur). Menu contextuel
enrichi : Renommer (F2), Copier (Ctrl+C), Couper (Ctrl+X), Coller
(Ctrl+V), Exporter, Supprimer (Suppr). Raccourcis clavier complets
quand focus dans la bibliothèque. Mode Tiles affiche un mini-SVG de
la waveform de chaque patch. Popup Bibliothèque (Designer sidebar
collapsed) redimensionnable via drag handle bord droit, largeur
persistée. **Sélection comme concept UX distinct de `currentPatchId`** :
simple clic = sélection visuelle, double-clic = ouvrir/charger. État
partagé entre instances Designer et Composer (un seul jeu de
préférences globales). Default Navigation mode au load (vs Tree
historique).

**Itération K phase 2 (Bibliothèque dédiée + 3 sous-apps)** **clôturée le 2026-05-25**.
Restructuration en 3 sous-applications autonomes (Bibliothèque, Designer,
Composer) avec piles undo séparées routées par activeTab. Ajout d'un
3e onglet "Bibliothèque" en premier dans le header, qui héberge le full
PatchBank avec toolbar d'actions icônes. Les sidebars Designer/Composer
sont downgrade en `PatchPicker` lightweight (Tree+List, click=load,
drag-out, menu "Ouvrir dans Bibliothèque"). Popup `SavePatchDialog`
remplace l'auto-save : breadcrumb+dropdown picker, bouton "Nouveau
dossier" inline non-undoable. `DELETE_BIB_ITEMS` batch atomique (1 undo
= 1 batch) + `DeleteUsageWarningDialog` modal pour patches utilisés en
Composer (lien "Voir dans le Composer" sélectionne les clips concernés).
Clipboard cut→copy après premier paste (multi-paste). `OPEN_IN_LIBRARY`
action atomique. SAVE_PATCH non-undoable. skipUndo flag dans
action.meta pour les opérations non-undoable contextuelles.

**Release v1.2.0** (2026-05-21) — Mode mobile complet + suppression
de ResolutionGate. En dessous de 924 × 668 px : (1) la sidebar Designer
est forcée en mode réduit (preference utilisateur préservée en state) ;
(2) le main du Designer passe d'une grille 2×2 à un accordéon vertical
1 colonne (Waveform / Spectrogramme / Instrument / Enveloppe AHDSR) ;
une seule zone dépliée à la fois, toggle classique au clic sur le
header. Le `ResolutionGate` (modale soft + placeholder bloquant) est
entièrement retiré — les breakpoints UI (v1.1.0 + cette release)
couvrent tout le spectre, l'app n'a plus de gate. UX mobile
volontairement dégradée (controls header internes masqués), mais
accessible. Renommage `useWindowWidth` → `useWindowSize` (besoin de
la hauteur aussi).

**Release v1.1.0** (2026-05-20) — Premier responsive intermédiaire :
deux breakpoints sur la zone Instrument. Sous 1170 px, le mot
"musical" du label "Système musical" est masqué par CSS @media
(wrappé dans un span dédié). Sous 950 px, la row de contrôles
(Catégorie / Système / X-EDO / Repère / Tonique) est remplacée par
un bouton "Paramètres du système musical" qui ouvre une modale
centrée plein écran (backdrop blur, max-width 480 px) avec les
mêmes contrôles arrangés verticalement. Fermeture via clic
backdrop / Escape / bouton ×. Nouveau hook `useWindowWidth`,
sous-fonction `renderInstrumentControls()` extraite pour
réutilisation entre la row directe et la modale.

**Itération L (Documentation) — phase 1 livrée le 2026-05-27**. Fondation
technique de l'onglet Documentation utilisateur, sans modifier le
comportement de l'app principale. Six sous-commits : (1.1) table
déclarative `src/lib/shortcuts.js` source de vérité des raccourcis +
helpers `matchesShortcut` / `getAnchor` ; (1.2) refacto des handlers
clavier App / WaveformEditor / PatchBank pour consommer la table ;
(1.3) convention `data-anchor` posée sur tous les éléments d'UI
référencés (boutons toolbar Composer + Bibliothèque, OctaveSelector
Designer, conteneur clavier, boutons Actions panel open/collapsed, etc.) ;
(1.4) corrections UI dérivées de l'audit L.0 — pastille `Sustain`
permanente cliquable dans le Designer (verrouillage style pédale piano),
bouton `Coller` permanent dans la toolbar Composer avec sémantique
ancre/piste sélectionnée/fallback piste 0, concept `selectedTrackId`
persisté + signifiant visuel border-left sur le header, chip
`📋 N éléments` dans la toolbar Bibliothèque (× pour vider), halo subtil
ton-sur-ton sur le clip ancre Composer (`lastAnchorClipId`), correction
des tooltips obsolètes CP1 (Octave Composer) et CP2 (Rétablir
Bibliothèque) ; (1.5) utilitaire `src/lib/getAnchoredPosition.js`
(résolution viewport rect d'un `[data-anchor]`, multi-élément →
premier visible) + composant `src/components/ShortcutsOverlay.jsx`
(couche transparente plein écran, étiquettes flottantes par anchor,
composite designer-notes / composer-notes-contiguous) ; (1.6) bouton
header Keyboard (toggle, icône Lucide) + raccourci global Ctrl+K
(preventDefault, skip form fields, skip si modale ouverte) + state
`shortcutsOverlayOpen` non persisté. Pose les ancres pour L.3
(DocLink + highlight) et L.4 (Tour). Nouveau champ persisté
`selectedTrackId`. Aucune modification de comportement métier hors des
ajouts ci-dessus.

**Itération L (Documentation) — phase 2 livrée le 2026-05-27**.
Squelette fonctionnel du 4e onglet **Documentation** (à droite de
Bibliothèque / Designer / Composer). Cinq sous-commits : (2.1)
nouvel onglet `documentation` dans Tabs + state `doc.currentArticleId`
/ `doc.scrollPositions` (sessionStorage `synth-app-doc-session`) +
prefs sidebar `docSidebarCollapsed` / `docSidebarWidth` (localStorage)
+ actions `SET_CURRENT_ARTICLE` / `SET_ARTICLE_SCROLL` /
`TOGGLE_DOC_SIDEBAR` / `SET_DOC_SIDEBAR_WIDTH` ; (2.2) renderer
Markdown maison `src/lib/markdown.js` (~200 lignes, deux passes :
blocs ligne-par-ligne + inline scan/flush) + composant
`MarkdownRenderer.jsx` (H1-H4, paragraphes, listes ord/non-ord +
imbrication, code inline/block, gras/italique, liens, images,
`<DocLink>` parsé mais inerte en L.2 — TODO L.3) — zéro dépendance
npm ; (2.3) layout `DocumentationTab.jsx` avec sidebar TOC
collapsible/resizable (calqué Designer/Composer) + zone contenu
scrollable + restauration de scroll par article au switch
(débounce 200 ms à la sauvegarde) ; (2.4) page "Raccourcis clavier"
auto-générée depuis `SHORTCUTS` (`ShortcutsReference.jsx`, groupage
Global / Designer / Composer / Bibliothèque, DL/DT/DD avec `<kbd>`)
+ dispatch `entry.type === 'generated'` ; (2.5) stubs articles "À
propos" (~50 mots) et "Pourquoi 12 notes ?" (~30 mots) avec
placeholders explicites, fichier de test exhaustif
`_renderer-test.md` (toutes features V1, image SVG inline data URI)
+ table TOC `src/docs/index.js` à 4 entrées. La rédaction réelle
des stubs est confiée à un agent rédacteur dédié (cf.
`writer/CLAUDE.md`) sur un prompt séparé. Aucun nouveau npm,
aucun impact sur les 3 autres onglets.

**Itération L (Documentation) — phase 3 livrée le 2026-05-28**.
Navigation interne de la doc rendue active, deux mécanismes. (1) Les
`<DocLink target="onglet:ancre">` deviennent cliquables : bascule sur
l'onglet cible + halo clignotant (~3,6 s, 3 pulses lents en fondu) sur
l'élément d'UI ancré.
Nouvel utilitaire `src/lib/highlightElement.js` (2e consommateur de
`getAnchoredPosition` après l'overlay) : sonde le DOM via
`requestAnimationFrame` borné pour absorber le montage différé de
l'onglet, scroll + flash class, halo CSS dédié `src/styles/highlight.css`
(outline + box-shadow hors flux, variables accent, `prefers-reduced-motion`).
(2) Les liens Markdown `[label](doc:article-id)` changent l'article
courant sans quitter l'onglet Documentation. Propagation des handlers
via un `MarkdownNavContext` (pas de prop-drilling dans les fonctions de
rendu récursives) ; défaut null → renderer inerte hors doc. Résolution
gracieuse partout (ancre/onglet/article inconnu = no-op + warn dev).
Quatre sous-commits (3.1 → 3.4), zéro nouveau npm, aucun impact sur les
3 autres onglets.

**Itération L (Documentation) — phase 4 livrée le 2026-05-28 — V1 de
l'Itération L atteinte.** Le **Tour guidé** : 3e et dernier entrypoint
additif (après l'onglet Documentation et le bouton Raccourcis). Un bouton
**Compass** dans le header + le raccourci **Ctrl/Cmd+J** démarrent la
visite de l'onglet actif. L'app passe en mode spotlight : un blocker plein
écran gèle toute interaction (clic, molette, clavier hors ESC), un voile
box-shadow assombrit tout sauf l'ancre courante, une bulle ancrée (titre +
description + compteur + Précédent/Suivant) la commente, et une progress
bar cliquable recouvre la zone des onglets (segments = séquence effective,
étapes skippées absentes). Tours déclaratifs par onglet
(`src/lib/tours/{library,designer,composer,documentation}.js` + `index.js`),
premier jet des textes — passe rédactionnelle à venir
(`archi/L4-redaction-prompt.md`). 3e consommateur de `getAnchoredPosition` ;
résolution en RAF borné (montage différé d'un onglet, ouverture d'une
sidebar repliée pour révéler une ancre intérieure). Étape dont l'ancre est
absente = skippée gracieusement. State `tour` volatile (jamais persisté,
hors undo) : snapshot unique capturé au 1er `START_TOUR` (onglet + 4 états
de sidebars repliables) restauré à la sortie → « stateless du point de vue
utilisateur » ; le chaînage entre onglets en fin de tour (« Continuer vers
X, Y ou Z ? ») ne re-snapshot pas. « En savoir plus » par étape (si
`article` présent dans `DOC_TOC`) quitte vers l'article. Six sous-commits
(4.1 → 4.6), zéro nouveau npm, aucun impact métier hors le tour.

**Itération L phase R livrée le 2026-05-28 — math renderer maison.**
Extension du renderer Markdown au support des formules (musique/
tempéraments), sans KaTeX (~100 lignes). Délimiteurs `$…$` (inline) et
`$$…$$` (block centré) ; exposants `^{x}`, indices `_{x}`, fractions
`\frac{a}{b}`, italique auto sur lettres latines isolées dans les
délimiteurs, ~12 symboles Unicode. Syntaxe LaTeX-like (réversibilité),
périmètre volontairement borné. Sous-parser dédié `src/lib/mathParse.js`,
rendu sup/sub/frac + CSS dans MarkdownRenderer. Trois sous-commits
(R.1 → R.3), zéro npm. Posé entre L.4 et L.5 car les contenus L.5
généreront massivement ratios, cents et exposants. **Phase R.4
(2026-05-28)** : délimiteurs extensibles `( )` `[ ]` qui grandissent avec
la fraction (révise la borne « pas de `\left\right` » de R, sur décision
archi) — la forme correcte de $(3/2)^{12}$ au tableau les exige. **Phase
M.5a (2026-05-31)** : `\sum` réintégré (opérateur à bornes `_{…}`/`^{…}`),
rendu sub/sup à droite en inline et empilé sous/dessus le Σ en display
(grille CSS) — prérequis de la DFT (M.5b). `displayMode` propagé du
renderer markdown jusqu'à `renderMath`. `\prod`/`\int`/matrices restent
hors scope. **Rattrapage M.r.1 (2026-06-01)** : pivot du Designer vers une
**courbe canonique unique** + trois lentilles (Forme d'onde / Harmoniques /
Spectro), `cap` unifié (ex-`definition`/`N`), résidu spline, plus de conversion
destructive ; migration localStorage/`.osa` v1→v2, hygiène canvas systématique.
**Rattrapage M.r.2 (2026-06-01)** : réorganisation UI — une **barre du haut**
unique (nom du patch | Presets | Reset | proportions des colonnes | Auto ;
Normaliser déplacé dans le header Forme d'onde en r.2.6.8) au-dessus des 3
colonnes ; **contrôle unique du cap** (slider+readout
« N / 256 ») dans le header Harmoniques ; **switch Libre/Ancres** pour les deux
modes d'édition de la zone Forme d'onde (plus aucun bouton « Convertir vers… ») ;
barres d'harmoniques toujours éditables ; Reset (timbre seul) + Normaliser
(iDFT phase canonique) fonctionnels. **Passe d'usage M.r.2.5 (2026-06-01)** :
Reset / Nouveau patch reviennent au **silence** (canonical à zéro, pas de timbre
imposé) ; fix du redraw de la canvas Forme d'onde au switch Ancres→Libre ; les
contrôles Doux/Anguleux + Nombre d'ancres restent **toujours visibles**
(désactivés en mode Libre au lieu d'être masqués) + input number pour saisir le
nombre d'ancres. **Passe d'usage M.r.2.6 (2026-06-01)** : portée du **Reset
resserrée** (réinitialise canonical + ancres + interpolation + résidu, mais
**préserve le cap ET le nombre d'ancres** — Ctrl+Alt+N reste la remise à zéro
complète) ; **iconographie Lucide** généralisée — barre du haut
(Eraser/FolderOpenDot/Sigma), switch Libre/Ancres devenu un **toggle unique**
(icône Spline), switch segmenté Doux/Anguleux en **SVG custom**, indicateur
AlignEndHorizontal, Spectrogramme (Direct→Radio, Crête→SVG) et presets de
proportions en SVG. **Convention projet actée : plus jamais d'Unicode comme
icône, Lucide en priorité, SVG style Lucide en fallback.** **Rattrapage M.r.3
(2026-06-01)** : **lentilles vivantes** — les 5 actions qui modifient la
canonical par une voie non-spline (tracé libre, drag de barre, Normaliser,
preset picker, presets rapides Sinus/Carré/…) **re-fittent automatiquement les
ancres** sur la nouvelle canonical (helper `refitAnchorsAndResidual`) avant de
recalculer le résidu ; la lentille Spline reflète toujours le tracé courant (fini
les ancres figées à `y=0` après un dessin libre). Cleanup : `'bars'` retiré du
type `WaveformLens` (vestigial depuis r.2.4). **Rattrapage M.r.4 (2026-06-02)** :
**normalisation explicite**. Flag d'état `editor.canonicalNormalized` (déterministe,
posé par les actions ; la détection numérique initiale a été abandonnée — le
round-trip FFT 600↔512 n'est pas idempotent) pilote trois chemins : bouton
Normaliser **désactivé** quand déjà normalisé, **courbe grise en background**
(aperçu « phase canonique » sous la canonical, dans les deux modes d'édition) +
légende, et **dialog edit-bars** qui intercepte l'édition d'une barre sur une
canonical non normalisée (normalise + applique en un geste). Dompte la régression
de phase (le « saut » silencieux au premier drag de barre).
**Rattrapage M.r.5 (2026-06-02) — dernier chantier de code du rattrapage.**
Convention d'amplitude de la zone Forme d'onde : **axe Y auto-fit** à
`[-peak, +peak]` (peak = max(|canonical|, |normalizedBg|, 1)) au lieu de
`[-1, +1]` fixe, **marqueur ±1** = niveau audio référence en pointillés
d'accent atténué (étiquettes 1/-1 dessinées sur le canvas, suivent l'auto-fit),
**transition douce** du zoom par lerp rAF ; tracé libre non clampé à ±1
(décision archi). Cosmétique de la zone Harmoniques : **code couleur des barres**
(bleu = normalisé/éditable, gris = non normalisé/dialog) selon
`editor.canonicalNormalized`, **repères horizontaux** 0/0.5/1 et **axes
labellisés** (X en `kf` — puissances de 2 si cap ≥ 8, sinon toutes ; Y en
0/0.5/1). Pure cosmétique de rendu, reducer intact.
**Rattrapage M.r.5.bis (2026-06-02) — finitions UX, clôture définitive du code
du rattrapage.** Trois points remontés en passe d'usage : (1) **auto-fit Y aligné
en mode Ancres** — `SplineEditor` adopte la même échelle dynamique + marqueur ±1
que `WaveformEditor` (primitive `drawAmplitudeMarker` partagée, `peakDisplayedRef`
lazy-init pour zéro saut au switch Libre↔Ancres) ; (2) **spline parfaite en
background permanent** — 3ᵉ courbe orange (`splineToPoints(anchors)`, squelette
des ancres sans résidu) affichée dans les deux lentilles tant que le résidu n'est
pas négligeable (écart > 0.01 à la courbe affichée), légende `NormalizeLegend`
étendue à 3 entrées conditionnelles ; (3) **clic droit sur barre d'harmonique =
mise à zéro** (raccourci « éteindre cette harmonique »), préservant la garde
edit-bars si non normalisé. **Le code du rattrapage M.r.* est désormais clos ;
reste M.5b (passe doc writer sur le modèle stabilisé).**

**Itération L (Documentation) — phase 5 (corpus) + clôture livrées le
2026-05-28 — release v1.4.0. Itération L close.** Rédaction du contenu
utilisateur (agent writer) sur la mécanique des phases 1-4+R : 2 glossaires
(technique, musical), 4 articles de vulgarisation « Comprendre » (forme
d'onde, piano pas juste, 12 notes, tempérament), 12 fiches tempéraments (une
par système du registre), 3 guides de prise en main (Designer, Bibliothèque,
Composer) et un article « Limites connues » (périmètre V1 assumé : résolution
600 pts / 128 harmoniques, aliasing résiduel, mono, pas de MIDI, 16 pistes,
localStorage). TOC à 6 sections (Le projet / Prise en main / Comprendre /
Concepts / Tempéraments / Référence). Clôture : rebranchement des DocLink
(guides + glossaire→fiches), retrait du fichier de test renderer, ancres
`data-anchor` manquantes posées (export WAV / + Piste / amplitude / nouveau
dossier). Au terme de l'itération, Synth App expose **4 onglets** dont une
Documentation complète — renderer Markdown maison + math (zéro dépendance),
overlay raccourcis (Ctrl+K), Tour guidé (Ctrl+J), DocLink bidirectionnels.
Aucun npm ajouté sur toute l'Itération L.

**Iteration M — préalable A (migration TypeScript, phases 0+1) livré le
2026-05-29.** Adoption TS incrémentale, fichier par fichier, sans casse, posée
avant la perf et avant M.2 (Patch typé). Phase 0 : devDep `typescript`,
`tsconfig.json` (allowJs, checkJs:false, strict:false, noEmit). Phase 1 :
`src/types.ts` (modèle actuel — Patch/Clip/Track/TuningSystem/AppState + union
discriminée `Action`), conversion `tuningSystems.js → .ts` (registre central),
câblage JSDoc des types sur le reducer. Zéro changement runtime (bundle vite
byte-identique). `// @ts-check` non retenu sur le reducer : une garde défensive
le pousse à `never`, et le forcer violerait « zéro changement / s'efface au
build » ; JSDoc retenu (option sanctionnée par le prompt archi).

**Iteration M — Waveform Designer (M.1→M.4) livré (M.1→M.3 le 2026-05-30,
M.4 le 2026-05-31).** Le Designer
gagne **trois modes de fabrication de timbre** coexistants, discriminés par
`Patch.mode` : `draw` (tracé libre + plafond `definition` 1..256, M.1), `harmonic`
(barres d'amplitudes, iDFT, M.2) et `spline` (4..32 ancres interpolées Catmull-Rom
ou polyligne, M.3). Layout 3 colonnes ajustables Forme d'onde / Harmoniques /
Spectrogramme (M.2.2, toggle auto-sizing en essai M.2-AS). `points` reste l'ombre
dérivée unique de la vérité de chaque mode → toute la chaîne audio (playback /
export WAV / miniatures / spectro) demeure mono-chemin, zéro modif. Passerelle de
conversion entre les 3 modes (dialogs, conversions atomiques undoables).

**Release v1.0.0-1.0.4** (2026-05-20) — Premier déploiement prod. Sortie
du 0.x exploratoire après 7 itérations majeures (A→G) stables.
Branding : titre commercial **On_Synth_App** (jeu de mots « on s'en
tape ») dans la barre des onglets à gauche, tampon de version
\`v1.0.0\` à droite (inliné au build via Vite `define` depuis
`package.json`, source de vérité unique). Tag git `v1.0.0`. README
remplacé (boilerplate Vite → vrai README projet).

## Objectif

Synthétiseur web pédagogique / créatif : dessiner des formes d'onde à la souris,
les assembler en compositions musicales sur une timeline, exporter en WAV.
**Contrainte forte** : Web Audio API natif uniquement, pas de lib audio externe.

## Stack

- React 19 + Vite 8 (SWC via `@vitejs/plugin-react`)
- ESLint 9
- TypeScript 6 incrémental (devDep) — `tsconfig.json` allowJs/noEmit/strict:false ;
  type-check via `npx tsc --noEmit`, transpile/strip par Vite (esbuild). Pas de
  state manager, pas de routing.
- Persistance : `localStorage` (clé `synth-app-state`)

## Arborescence

```
synth-app/
├── CONTEXT.md                # ce fichier
├── index.html
├── package.json
├── vite.config.js
├── eslint.config.js
├── tsconfig.json            # (iter-M) TypeScript incrémental : allowJs, checkJs:false, strict:false, noEmit
└── src/
    ├── main.jsx              # entry point React
    ├── App.jsx               # orchestration, persistance, raccourcis clavier
    ├── App.css               # layout grid responsive Designer/Composer
    ├── index.css
    ├── types.ts             # (iter-M) types du modèle : Patch/Clip/Track/TuningSystem/AppState + union Action
    ├── audio.js              # FFT 512 pts, cap 256 harmoniques (pointsToHarmonics, pointsToPeriodicWave + définition, harmonicsToPoints iDFT M.2), encodage WAV, palette couleurs
    ├── reducer.js            # useReducer global + withUndo (historique par onglet) — JSDoc typé (Action/AppState)
    ├── assets/               # résiduel template Vite (non utilisé)
    ├── hooks/
    │   └── usePlayback.js    # moteur de lecture timeline (partagé Designer/Composer)
    ├── lib/
    │   ├── timelineLayout.js # layoutClips + computeBounds (partagés Timeline/Properties)
    │   ├── durations.js      # catalogue durées (bases + coefs, phase 6.1)
    │   ├── clipNote.js       # formatClipNote + NOTE_NAMES Unicode
    │   ├── tuningSystems.ts  # (iter-M, .ts) registre tempéraments + freq + keyboardMap par système
    │   ├── strings.js        # (iter-M, préalable B) graine i18n : libellés UI centralisés (FR)
    │   ├── visualCues.js     # catalogue gammes/accords en cents + cuedNoteIndices (F.4.4)
    │   ├── keyboardCandidates.js  # NOTE_GUARD_KEYS — touches du mode note (F.7.5)
    │   ├── osaFormat.js      # format binaire .osa (encode/decode/validate)
    │   ├── libraryTransfer.js # transformations état ↔ payload .osa
    │   ├── folderNames.js    # nextAvailableFolderName partagé (extraction H.1.4)
    │   ├── bibTransfer.js               # wouldCreateCycle + duplicateItemsToFolder (K.1.7)
    │   ├── shortcuts.js      # table déclarative + matchesShortcut / getAnchor (iter-L phase-1.1)
    │   ├── getAnchoredPosition.js # résolution viewport rect d'un [data-anchor] (iter-L phase-1.5)
    │   ├── highlightElement.js # halo temporaire ancré (DocLink), retry RAF (iter-L phase-3.1)
    │   ├── markdown.js       # parser Markdown maison + AST, délègue le math à mathParse (iter-L phase-2.2 / R.1)
    │   ├── mathParse.js      # sous-parser math récursif ($…$, $$…$$ → mathAst), \sum à bornes (iter-L phase-R.1 / iter-M phase-5a.1)
    │   ├── spline.js         # (iter-M M.3) splineSoft Catmull-Rom périodique / splineHard polyligne → points
    │   ├── presets.js        # (iter-M M.4) bibliothèque code-only de 12 presets de timbre harmoniques
    │   └── tours/            # déclarations du Tour guidé par onglet (iter-L phase-4)
    │       ├── index.js      # map tabId → étapes + TOUR_TABS (ordre chaînage)
    │       ├── library.js / designer.js / composer.js / documentation.js  # séquences d'étapes
    ├── styles/               # CSS transverses non colocatées
    │   └── highlight.css     # halo flash DocLink (iter-L phase-3.1)
    ├── docs/                 # contenu de l'onglet Documentation (iter-L phase-2)
    │   ├── index.js          # table DOC_TOC + sources .md importées via ?raw
    │   └── articles/         # fichiers Markdown bundled au build
    │       ├── about.md             # stub L.2.5 (rédaction confiée à writer/)
    │       ├── why-12-notes.md      # stub L.2.5 (rédaction confiée à writer/)
    │       └── _renderer-test.md    # validation visuelle des features V1 + math L.R (à retirer en L.5)
    └── components/
        ├── Tabs.jsx + .css                    # bascule Bibliothèque / Designer / Composer / Documentation
        ├── PatchBank.jsx + .css               # banque de patches partagée
        ├── WaveformEditor.jsx + .css          # éditeur ondes / patch (Designer)
        ├── Spectrogram.jsx + .css             # spectrogramme statique (Designer)
        ├── DesignerColumns.jsx + .css         # layout 3 colonnes ajustables (Designer, M.2.2)
        ├── SplineEditor.jsx + .css            # éditeur points/courbe mode spline (Designer, M.3)
        ├── ConvertToHarmonicDialog.jsx + .css # dialog passerelle draw/spline→harmonic (M.2.5)
        ├── ConvertToSplineDialog.jsx          # dialog passerelle draw/harmonic→spline (M.3.3)
        ├── PresetPicker.jsx + .css            # modal de chargement des presets de timbre (M.4)
        ├── MiniPlayer.jsx + .css              # transport simplifié (Designer)
        ├── PianoKeyboard.jsx + .css           # dispatcher clavier (piano-12 / grid-24 / grid-5 / grid-7 / grid-31 / grid-22-bhatkhande / grid-22-sarngadeva) + octaves + halo .is-cued (F.4.4)
        ├── DurationButtons.jsx + .css         # boutons durée 7 bases + 3 coefs (phase 6.1)
        ├── SidebarResizer.jsx + .css          # poignée drag bordure sidebar (phase 7.4)
        ├── BpmInput.jsx                       # input BPM validation différée
        ├── A4Input.jsx                        # input A4 validation différée (F.2.2)
        ├── FreqInput.jsx                      # input fréquence libre (phase 3.7)
        ├── NumberInput.jsx                    # input numérique générique paramétré par parse/format (F.3.11.2)
        ├── Toast.jsx + .css                   # toast d'erreur (undo cross-onglet)
        ├── Toolbar.jsx + .css                 # toolbar (Composer)
        ├── Timeline.jsx + .css                # grille + clips + curseur (Composer)
        ├── PropertiesPanel.jsx + .css         # édition du clip sélectionné (Composer)
        ├── ResolutionGate.jsx + .css          # gate résolution mount + resize (G.1.4 + G.2.6)
        ├── Modal.jsx + .css                   # primitive modale partagé (H.1.8)
        ├── ExportModal.jsx                    # modale "Export as..." (H.1.9)
        ├── ImportModal.jsx                    # modale post-validation (H.1.13)
        ├── ShortLabelSelect.jsx + .css        # dropdown custom libellé court trigger / complet menu (G.2.3)
        ├── BibBreadcrumb.jsx + .css           # breadcrumb cliquable + éditable (K.1.2)
        ├── BibContextMenu.jsx                 # menu contextuel enrichi (K.1.10)
        ├── PatchThumbnail.jsx                 # mini-SVG waveform pour Tiles (K.1.4)
        ├── PopupResizer.jsx + .css            # poignée resize du popup (K.1.12)
        ├── PatchPicker.jsx + .css            # sidebar lightweight (K.2.6)
        ├── SavePatchDialog.jsx + .css        # modal popup save patch (K.2.7)
        ├── DeleteUsageWarningDialog.jsx + .css # modal warning patches utilisés (K.2.8)
        ├── ConfirmDialog.jsx + .css          # modal confirmation générique (K.2.f16)
        ├── RecentPatchesList.jsx + .css      # LRU 10 derniers patches Composer (K.2.f11)
        ├── ShortcutsOverlay.jsx + .css       # overlay raccourcis "lever le voile" Ctrl+K (iter-L phase-1.5)
        ├── DocumentationTab.jsx + .css       # layout TOC + zone contenu de l'onglet Documentation (iter-L phase-2.3)
        ├── MarkdownRenderer.jsx + .css       # rendu AST Markdown maison → JSX + DocLink/doc: actifs via MarkdownNavContext + rendu math sup/sub/frac/sum, displayMode (iter-L phase-2.2 / 3.2-3.3 / R.2 / iter-M phase-5a.2)
        ├── ShortcutsReference.jsx + .css     # article généré "Raccourcis clavier" depuis SHORTCUTS (iter-L phase-2.4)
        └── Tour.jsx + .css                   # moteur du Tour guidé : spotlight + bulle + progress bar (iter-L phase-4)
```

### Layout

L'`App` rend **les deux layouts en permanence** et toggle leur visibilité via
l'attribut `hidden` (override CSS pour battre `display:grid`). Raison : ne pas
démonter le `WaveformEditor`, sinon perte de l'état local + du dirty check.

## Modèle de données

```ts
type SoundFolder = {              // racine virtuelle si parentId === null
  id: string                      // "folder-N"
  name: string
  parentId: string | null
}

// Depuis itération E : un patch ne porte PLUS ni fréquence ni note —
// c'est le clip qui porte la hauteur. Un même patch peut être joué à
// n'importe quelle hauteur sans duplication.
//
// Depuis iter-M rattrapage (M.r.1, 2026-06-01) : modèle UNIFIÉ. Plus d'union
// discriminée — un seul `Patch` porte une courbe `canonical` (LA vérité audio)
// et trois lentilles qui la lisent/éditent (Forme d'onde / Harmoniques /
// Spectro). `cap` (ex-`definition` ET ex-`N`) borne les harmoniques. La
// lentille spline (anchors + interpolation + residual) permet une réédition
// préservant les détails fins du tracé : le résidu survit au drag d'ancre
// (cf. spec §4.1). Plus de conversion destructive entre représentations.
type Patch = {
  id: string                      // "patch-N"
  name: string                    // "Patch N" par défaut
  color: string                   // hex, palette SOUND_COLORS (12 couleurs)
  preset: 'sine'|'square'|'sawtooth'|'triangle'|null  // null = dessin custom
  defaultTuningSystem: string     // système musical actif à l'enreg (iter G.2.4)
  folderId: string | null         // null = racine
  updatedAt: number
  amplitude: number               // 0..1
  canonical: number[]             // 600 échantillons [-1, 1] — LA vérité audio
                                  // (remplace `points`). Toute la chaîne audio la lit.
  cap: number                     // 1..256 — plafond d'harmoniques unique
                                  // (remplace `definition` du tracé ET `N` des barres)
  anchors: { x: number, y: number }[]  // 4..32 ancres spline, x ∈ [0,600), y ∈ [-1,1]
  interpolation: 'soft' | 'hard'  // soft = Catmull-Rom périodique, hard = polyligne
  residual: number[]              // 600 : canonical − spline(anchors) (peut sortir
                                  // de [-1,1]). Détails du tracé qui survivent au drag.
  attack: number                  // ms, 0-1000 (F.3.11)
  hold: number                    // ms, 0-1000 (F.3.12) — plateau au peak entre attack et decay
  decay: number                   // ms, 0-1000 (F.3.11)
  sustain: number                 // 0..1
  release: number                 // ms, 0-1000 (F.3.11)
}
// Editor : mêmes champs + `currentLens: 'free'|'spline'` (volatile, non
// persisté) = quelle lentille est active (M.r.3.2 : 'bars' retiré, vestigial).
// Migration v1→v2 (M.r.1) : les anciens
// patches (draw/harmonic/spline) sont convertis à l'hydratation localStorage et
// à l'import .osa v1 (reducer.migrateLegacyPatch, idempotent). OSA_VERSION = 2 ;
// l'import accepte v1 (legacy) ET v2.

type Track = {
  id: string                      // "track-N"
  name: string                    // "Piste 1" par défaut
  color: string                    // hex, palette TRACK_COLORS (8 couleurs muted)
  muted: boolean
  solo: boolean
  volume: number                  // 0..1
  height: number                  // px
}

type Clip = {                     // placement timeline + hauteur
  id: string                      // "clip-N"
  trackId: string
  patchId: string                 // ex-soundId, référence un Patch
  measure: number                 // 1-indexée, 1..numMeasures
  beat: number                    // en noires dans la mesure, 0..3.75 (snap 0.25 = 16ᵉ)
  duration: number                // en noires : 4=ronde, 2=blanche, 1.5=noire pointée,
                                  // 1=noire, 0.75=croche pointée, 0.5=croche, 0.25=double
  // Hauteur sonore (itération E) :
  tuningSystem: string            // clé du registre `TUNING_SYSTEMS` : '12-TET',
                                  // 'pythagorean-12', 'free' (F.2). Extensible.
  noteIndex: number | null        // 0..(notesPerOctave-1) du système courant,
                                  // null en Libre. 0..11 pour 12-TET aujourd'hui.
  octave: number | null           // 0-10 en 12-TET, null en Libre
  frequency: number | null        // null en systèmes-based (calculée), explicite en Libre
}

// State global (itération F) : champ `a4Ref` (Hz, défaut 440) — hauteur de
// référence utilisée par tous les systèmes-based pour calculer leurs
// fréquences. Persisté. Pas d'UI d'édition en F.1 (reportée en F.2 avec le
// premier tempérament non 12-TET).

// Fréquence effective d'un clip → `clipFrequency(clip, a4Ref)` (reducer.js) :
// délègue au registre `src/lib/tuningSystems.js`. Chaque entrée définit une
// fonction `freq(noteIndex, octave, a4Ref) → Hz` (ou null pour 'free' qui lit
// `clip.frequency`). Point d'extension unique : ajouter une entrée suffit,
// aucun autre code n'a besoin d'en savoir plus. Systèmes actuels (F.2) :
//   - '12-TET' : `a4Ref × 2^((midi-69)/12)`.
//   - 'pythagorean-12' : chaîne de quintes 3:2 centrée sur C, ancrée sur A4
//     (C4 = a4Ref × 16/27). 6 quintes montantes, 5 descendantes ; loup entre
//     F# (+6) et Db (-5). Ratios dérivés à l'init dans `PYTH_RATIOS_FROM_C`.
//   - 'free' : lit `clip.frequency` directement.

// Persistance (localStorage, clé "synth-app-state") :
// { patches, soundFolders, tracks, clips, bpm, numMeasures, a4Ref,
//   spectrogramVisible, durationMode, activeTab,
//   patchCounter, clipCounter, folderCounter, trackCounter,
//   composerBankWidth, composerAsideWidth,
//   composerBankCollapsed, composerAsideCollapsed,
//   docSidebarWidth, docSidebarCollapsed (iter-L phase-2.1),
//   editorTestTuningSystem, editorTestNoteIndex, editorTestOctave,
//   editorTestFrequency, editorVisualCuePattern, editorVisualCueTonic,
//   selectedTrackId (iter-L phase-1.4.b) }
//
// Persistance auxiliaire (sessionStorage, clé "synth-app-doc-session",
// iter-L phase-2.1) — position de lecture de l'onglet Documentation :
// { currentArticleId: string | null,  // article ouvert
//   scrollPositions: { [articleId]: number }  // scroll top par article
// }
// Scopé session navigateur : à chaque ouverture, on retombe sur
// l'article par défaut ('about'). Décorrélé du localStorage métier
// pour ne pas polluer le retour du jour suivant.
//
// NON persisté (volatile) : selectedClipIds, currentPatchId, zoomH,
// defaultClipDuration, lastAnchorClipId, composerFlash,
// shortcutsOverlayOpen (iter-L phase-1.6, runtime uniquement),
// tour (iter-L phase-4, runtime uniquement — un tour ne survit pas à un refresh),
// editor.points / amplitude / ADSR / preset (vides au reload, l'éditeur
// de patch n'est pas restauré ; seuls les champs `test*` et `visualCue*`
// d'exploration Designer le sont — F.4.4.3), clipboard, measureClipboard,
// piles undo/redo, settlingTops (Timeline local).
//
// Champs iter-L phase 1 :
//   selectedTrackId: string | null  // piste sélectionnée Composer.
//     Mise à jour au dernier clic utilisateur (clip / header / zone vide
//     d'une piste). Persistée. Validation contre tracks à l'hydratation
//     (reset null si piste introuvable). Reset à null sur DELETE_TRACK
//     de la piste active.
//   shortcutsOverlayOpen: boolean   // overlay raccourcis (Ctrl+K).
//     Non persisté (toujours fermé au boot).
//
// Champs iter-L phase 2 (onglet Documentation) :
//   doc.currentArticleId: string | null  // article ouvert dans la TOC.
//     Hydraté depuis sessionStorage ; défaut 'about' (DEFAULT_DOC_ARTICLE_ID)
//     au boot. null = page d'accueil TOC (liste). Persisté en sessionStorage.
//   doc.scrollPositions: { [articleId]: number }  // scroll top par article.
//     Mis à jour avec un débounce 200 ms côté DocumentationTab.
//     Persisté en sessionStorage. Restauré au switch d'article.
//   docSidebarCollapsed: boolean  // état réduit de la sidebar TOC.
//     Persisté en localStorage (préférence UX longue durée).
//   docSidebarWidth: number  // largeur en px de la sidebar TOC.
//     Min DOC_SIDEBAR_MIN_WIDTH (180), défaut DOC_SIDEBAR_DEFAULT_WIDTH
//     (240). Persisté en localStorage.
//   activeTab étendu à 'documentation' (4ᵉ valeur possible).
//
// Champ iter-L phase 4 (Tour guidé) :
//   tour: { active, tabId, stepIndex, snapshot }  // visite guidée.
//     Volatile (jamais persisté, hors undo). snapshot = { activeTab,
//     designerSidebarCollapsed, docSidebarCollapsed, composerBankCollapsed,
//     composerAsideCollapsed } capturé une seule fois au 1er START_TOUR,
//     restauré à END_TOUR (tour « stateless du point de vue utilisateur »).
//     stepIndex indexe les étapes brutes du tour ; le moteur Tour.jsx mappe
//     vers la séquence effective (ancres résolvables) pour la navigation.
//
// État `editor` (Designer, non persisté en bloc) — extrait pertinent :
//   testTuningSystem, testNoteIndex, testOctave, testFrequency  // preview
//   amplitude, attack, hold, decay, sustain, release, points    // patch
//   visualCuePattern: string  // F.4.4, défaut 'none'
//   visualCueTonic:   number  // F.4.4, défaut 0, snap à 0 si > notesPerOctave
//                              du nouveau système à la bascule
// Détection d'ancien format (savedSounds/soundCounter/noteCounter/
// placementCounter) → reset complet, pas de migration (deal assumé E.1).
```

⚠️ Vocabulaire : les **notes musicales** (C, D, E…) restent appelées "notes".
Seuls les **placements timeline** s'appellent "clips".

**Track par défaut** (créé en migration si absent) :
`{ id:"track-default", name:"Piste 1", color:TRACK_COLORS[0], muted:false, solo:false, volume:1, height:80 }`
**MAX_TRACKS** = 16. `trackCounter` persisté pour IDs uniques (`track-N`).

**Constantes** : `BEATS_PER_MEASURE=4`, BPM 60-240 (défaut 120),
`numMeasures` 16 par défaut (modifiable, prochainement).
**Formule temps** : `seconds = beats * 60 / bpm` (1 noire à 120 bpm = 0.5s).

## Composants

### `App.jsx` — racine
- Un seul `useReducer(withUndo(reducer))` détient tout l'état : `patches`,
  `soundFolders`, `tracks`, `clips`, `bpm`, `numMeasures`, `editor`,
  compteurs (`patchCounter`, `clipCounter`, `folderCounter`, `trackCounter`),
  `selectedClipIds`, `zoomH`, `clipboard`, `measureClipboard`, etc.
- `editorRef` (imperative handle) pour le dirty check de `WaveformEditor`.
- Persistance auto via `useEffect` (données métier uniquement, pas l'UI state).
- Appelle `usePlayback({ clips, patches, tracks, bpm, totalDurationSec })` ;
  useEffect synchro `updateTrackGains(tracks)` quand mute/solo/volume changent
  pendant la lecture.
- Handlers CRUD pistes : `handleCreateTrack`, `handleRenameTrack`,
  `handleDeleteTrack` (confirm si clips), `handleUpdateTrack`, `handleReorderTracks`.
- Handlers clipboard cross-piste : `handlePaste(absoluteBeat, targetTrackId)` calcule
  un delta de piste si targetTrackId fourni (clic droit ou Ctrl+V).
- `handleAddClip(patchId, measure, beat, duration, trackId)` : la hauteur du
  nouveau clip est lue depuis l'éditeur (`editorTestNoteFields(editor)`) —
  règle par défaut E.1, remplacée par les raccourcis clavier en E.4.

### `WaveformEditor.jsx`
- Canvas 600×300 dessinable à la souris (interpolation linéaire)
- Presets Sine / Square / Sawtooth / Triangle / Clear (tracking `activePreset`)
- Depuis itération E : le clavier, l'octave et le slider fréquence pilotent
  **uniquement la preview** (champs `testTuningSystem`, `testNoteIndex`,
  `testOctave`, `testFrequency` de `state.editor`). Ils ne sont pas copiés
  dans le patch sauvegardé — c'est le clip qui portera la hauteur au drop.
  Sélecteur "Système musical" (G.1.3) éclaté en deux dropdowns —
  Catégorie (Moderne / Historique / Théorique) + Système filtré.
  Bascule entre deux UIs selon le système choisi :
  - Système-based (12-TET, pythag, juste, etc.) : clavier piano /
    grid 24 / grid-x-edo / grid-22 + 11 boutons d'octave + affichage
    "Note : X Hz — N4".
  - Libre : slider log 2^4-2^15 Hz + FreqInput éditable + bouton
    **Test** (canal mono via `playFreeNote()` lisant `testFrequency`
    direct, raccourci `s`).
- Children-API (iter-M phase-2, étendue r.2) : `renderCanvasArea`,
  `renderHarmonicsArea`, `renderParamsArea` (≡ zone "Instrument" depuis
  G.1.1), `renderAdsrArea`, `renderActions` ({collapsed}) + valeurs/handlers
  pour la barre du haut : `patchLabel`, `openPresetPicker`,
  `requestResetWaveform`, `normalizeWaveform` (le picker de presets et les
  ConfirmDialog restent montés dans `WaveformEditor` ; la barre ne fait que
  piloter leur ouverture). App.jsx compose la moitié haute = `DesignerToolbar`
  (barre du haut) + 3 colonnes via `DesignerColumns` (Forme d'onde /
  Harmoniques / Spectrogramme), et garde la moitié basse (Instrument / ADSR).
  Le panneau Actions est placé par App.jsx dans la sidebar gauche.
- **Modèle unifié + lentilles (M rattrapage r.1 → r.3)** : la vérité audio est
  `editor.canonical` ; `editor.currentLens` ('free' | 'spline', M.r.3.2 :
  'bars' retiré) pilote l'affichage. Plus de mode silotant : les 3 zones
  regardent la même canonical.
  - **Lentilles vivantes (M.r.3)** : synchronisation **ascendante** câblée — les
    5 actions qui modifient la canonical par une voie non-spline re-fittent les
    ancres avant de recalculer le résidu (helper `refitAnchorsAndResidual`,
    count préservé). La lentille Spline reflète donc toujours le tracé courant
    (plus d'ancres figées à `y=0` après tracé libre / preset). Cf. « Décisions
    architecturales » pour la liste exacte des actions concernées / exemptées.
  - **Normalisation explicite (M.r.4)** : un flag d'état
    `editor.canonicalNormalized: boolean` répond à « la canonical est-elle à
    phase canonique sinus pur ? ». Posé par chaque action qui écrit canonical
    (true : NORMALIZE, édition de barre, LOAD_PRESET, `APPLY_EDITOR_PRESET('sine')`,
    Reset×2 ; false : tracé libre, drag d'ancre, interpolation, `SET_EDITOR_CAP`,
    hydratation d'un patch, presets carré/dent de scie/triangle ; inchangé :
    actions qui ne touchent pas canonical). Volatile (non persisté dans le patch
    ni `.osa`). **Pas** une détection numérique : le round-trip
    `harmonicsToPoints(canonicalToBars(x))` n'est pas idempotent (resample
    600↔512 linéaire → leakage). Le flag pilote trois chemins UX :
    - bouton **Normaliser désactivé** (`disabled`, tooltip « Déjà normalisé »)
      quand le flag est true ;
    - **courbe normalisée en background** (`normalizedBg`,
      `harmonicsToPoints(canonicalToBars(canonical, cap), cap)`) dessinée en gris
      discret (`canvas-text-primary`, alpha 0.5, 1px) **sous** la canonical, dans
      le canvas Libre (`drawCanvas`) ET le mode Ancres (`SplineEditor`), tant que
      le flag est false ; + légende overlay `NormalizeLegend` (« actuelle » /
      « si normalisée ») ;
    - **dialog edit-bars** (`pendingBarEdit` → `ConfirmDialog`) : `handleHarmonicMouseDown`
      intercepte le mousedown sur une barre quand le flag est false (n'initie
      aucun draft) ; « Normaliser et continuer » enchaîne `normalize()` +
      `setHarmonicAmplitude(index, value)` du mousedown originel (2 dispatchs =
      2 crans d'undo, assumé) ; « Annuler » ne dispatch rien.
  - **Forme d'onde** (`renderCanvasArea`) : deux modes d'édition exclusifs
    pilotés par le **toggle Libre↔Ancres** du header (bascule `currentLens`
    free↔spline). Libre = tracé main levée ; Ancres = `SplineEditor` (poignées).
    Header partagé entre les deux (`renderWaveformHeaderControls`). **r.2.6.2** :
    l'ancien switch 2-boutons est devenu un **toggle unique** porteur de l'icône
    `Spline` (`is-active`/`aria-pressed` = mode interpolé ; tooltips « Mode Dessin
    libre/interpolé » sans le mot « lentille », r.2.6.4), qui sert aussi de label
    visuel devant le slider Nombre d'ancres. Le toggle **Doux/Anguleux** (icônes
    **SVG custom** `IconDoux`/`IconAnguleux`, style Lucide, **joint en switch
    segmenté** r.2.6.4) + le slider/input « N / 32 » (input aligné sur la hauteur
    des boutons, r.2.6.4) + le bouton **Normaliser** (icône `Sigma`, déplacé
    depuis la barre du haut en r.2.6.8 → `NORMALIZE_EDITOR_CANONICAL` ; **M.r.4 :
    `disabled` quand `editor.canonicalNormalized`**, tooltip « Déjà normalisé »)
    y sont **toujours rendus** (positions stables) ; les contrôles d'ancres sont
    `disabled` en mode Libre (M.r.2.5.2) ; saisie directe du nombre d'ancres via
    `<NumberInput>` (M.r.2.5.3).
    - **Convention d'amplitude (M.r.5.1)** : l'axe Y du canvas s'**auto-fit** à
      `[-peak, +peak]` (peak = `max(max(|canonical|), max(|normalizedBg|), 1)`,
      minimum 1 pour garder le marqueur visible) au lieu de `[-1, +1]` fixe — la
      canonical qui dépasse ±1 (cumul `Σ|amplitudes_k|`) est affichée en entier.
      `valueToY(v) = midY − (v/peak)·(H/2)` encapsule l'échelle ; le zoom Y suit
      une **transition douce** (`peakDisplayedRef` lerpé `+= (target−cur)·0.15`
      par frame dans une boucle rAF, ~150 ms). **Marqueur ±1** = niveau audio
      référence, deux pointillés d'accent atténués (`setLineDash([4,4])`, alpha
      0.4) + étiquettes `1`/`-1` **dessinées sur le canvas** (suivent l'auto-fit ;
      les labels DOM `+1`/`-1` ont été retirés, seul le `0` médian subsiste). Le
      tracé libre n'est **pas clampé** à ±1 (`getCanvasPoint` borne à ±peak) — le
      navigateur normalise la `PeriodicWave` à la lecture.
    - **Auto-fit Y commun aux deux lentilles (M.r.5.bis.1)** : `SplineEditor`
      (lentille Ancres) calcule son propre `peakTarget`/`peakDisplayedRef` (même
      logique + lerp rAF) et mappe `[-peak, +peak]` partout (courbe, normalizedBg,
      grille ±0.5, poignées, `eventToData`, `hitTest`). Marqueur ±1 extrait en
      primitive partagée `drawAmplitudeMarker` (`lib/canvas.js`) → rendu identique.
      `peakDisplayedRef` **lazy-init à la cible** dans les deux composants : au
      switch Libre↔Ancres l'échelle est déjà bonne, **aucun saut animé**. En mode
      Ancres l'auto-fit ne dilate que via `normalizedBg` ou l'overshoot Catmull-Rom
      (la canonical y est clampée à ±1 par `splinePlusResidual`, les ancres par
      `MOVE/ADD_SPLINE_ANCHOR`).
    - **Spline parfaite — 3ᵉ courbe (M.r.5.bis.2)** : `splineToPoints(anchors,
      interpolation)` (squelette des ancres SANS résidu) dessinée en **orange**
      (`--canvas-spline-perfect`) entre le gris normalisé et la canonical bleue,
      dans **les deux lentilles**, en permanence tant que l'écart à la courbe
      affichée (= résidu) dépasse **0.01** (sinon cachée, se confondrait). Permet
      de voir simultanément la spline éditée et le tracé résultant (spline +
      résidu). `peakTarget` l'inclut quand affichée pour ne pas l'écrêter.
      `NormalizeLegend` étendue à 3 entrées conditionnelles (bleu « actuelle »
      toujours ; gris « normalisée » si `!canonicalNormalized` ; orange « spline
      des ancres » si visible) ; montée seulement si ≥ 1 entrée conditionnelle
      active. **Passe d'usage** : pendant un **drag d'ancre**, le tracé bleu
      (canonical) est prévisualisé comme `spline(draft) + résidu` (clampé ±1, =
      sortie reducer au commit) au lieu de la spline pure — les trois courbes
      restent donc visibles avec leur rôle (bleu = résultat, orange = spline
      éditée, gris = normalisée) et rien ne saute au relâchement.
    - **Marge tampon aux bords (M.r.5.bis, passe d'usage)** : `DRAW_MARGIN` (12px
      horizontal) et `DRAW_MARGIN_V` (20px vertical pour les canvas Forme d'onde),
      partagés via `lib/canvas`, confinent le tracé / les poignées / les barres à
      l'intérieur (rendu ET mapping d'entrée insettés), tandis que l'élément
      capteur garde sa taille pleine → la souris a une bande tampon avant de
      quitter l'élément et de **perdre le geste** au bord (même esprit que le lasso
      de la bibliothèque). La marge verticale plus large réserve une **gouttière
      haut/bas** où loger la **légende** (haut) et le **hint d'usage** (bas, lentille
      Ancres) HORS du tracé (ils ne le chevauchent plus) — symétrique pour garder
      l'amplitude 0 au centre. Appliqué au canvas Libre (`strokeWave`/
      `getCanvasPoint`), au canvas Ancres (`SplineEditor`) et à la zone Harmoniques
      (padding 12px + `harmonic*FromEvent` insettés ; pas de gouttière, pas
      d'overlay). Les lignes de repère (0, ±0.5, marqueur ±1) restent pleine largeur.
  - **Harmoniques** (`renderHarmonicsArea`) : barres **toujours
    éditables** (drag vertical = amplitude [0..1], 1 barre/geste verrouillée à
    l'index au mousedown, commit unique → 1 undo), indépendantes de
    `currentLens` (le type ne porte plus 'bars' depuis M.r.3.2). Header : **indicateur non
    interactif** (icône `AlignEndHorizontal`, r.2.6.2) + **contrôle unique du
    cap** (slider 1..256 + readout « N / 256 », NumberInput éditable).
    - **Cosmétique (M.r.5.2)** : **code couleur des barres** — bleu (accent) quand
      `editor.canonicalNormalized` est true (édition directe possible), gris
      (classe `is-unnormalized`) sinon (un clic ouvre le dialog edit-bars
      M.r.4.3). **Repères horizontaux** 0/0.5/1 en overlay pointillé sous les
      barres ; **axe Y** étiqueté 0/0.5/1 à gauche, **axe X** étiqueté `kf` sous
      les barres (toutes les harmoniques si cap < 8, puissances de 2 sinon). Plot
      en grille CSS (`.we-harmonics-plot`) ; repères, étiquettes Y et X alignés
      sur la zone des barres. Pur DOM/CSS.
    - **Clic droit = mise à zéro (M.r.5.bis.3)** : clic droit sur une barre éteint
      l'harmonique (`setHarmonicAmplitude(index, 0)`), sans initier de draft/drag.
      `onContextMenu` bloque le menu natif. La garde de phase edit-bars s'applique
      comme au clic gauche : si `!canonicalNormalized`, le dialog (`value:0`)
      précède l'opération — pas de raccourci silencieux contournant la convention.
  - `draftAmplitudes` (geste continu) → reconstruction iDFT live (forme d'onde
    + audio). `cap` (1..256) borne les harmoniques à la synthèse
    (`pointsToPeriodicWave`), pas au modèle.
- **Plus de passerelle « Convertir vers… » (supprimée en M.r.2.4)** : la
  bascule entre les deux modes d'édition de la Forme d'onde passe par le switch
  Libre/Ancres ; aucun chemin utilisateur explicite vers 'bars' (l'édition de
  barres est directe dans la zone Harmoniques).
- Éditeur AHDSR **visuel** 380×120 : 4 poignées draggables — P1
  (attack+amplitude en 2D), P1h (hold seul en 1D depuis F.3.13.1),
  P2 (decay+sustain en 2D), P4 (release seul en 1D). Courbe cyan +
  remplissage, 6 sliders éditables en colonne à droite (Amp →
  Attack → Hold → Decay → Sustain → Release, F.3.12.2). Graph
  fidèle : `p1.y = adsrLevelToY(amplitude)` (peak), `p2.y =
  adsrLevelToY(amp×sustain)` (sustain absolu = ratio du peak). À
  amp=0.5 et sustain=1, P2 atteint visuellement P1/P1h. P1h est
  rendu et testé en priorité sur P1 (z-order — P1h dessiné après,
  hit-testé avant) à hold=0 : grab attrape P1h, drag horizontal tire
  le hold à partir de 0. Pour accéder à P1 dans cette configuration,
  passer par les sliders Attack/Amp ou augmenter d'abord le hold via
  le slider dédié. Plateau sustain restauré en tirets symboliques
  entre P2 et P3 (P3 géométrique non-draggable, fin du plateau) — ne
  représente pas une durée audio, c'est un repère visuel de la phase.
  Constantes : `ADSR_W = 4 × ADSR_SEGMENT_PX + ADSR_SUSTAIN_PX = 380`,
  `ADSR_MAX_MS = 1000` ms, `ADSR_SEGMENT_PX = 80`,
  `ADSR_SUSTAIN_PX = 60`, `ADSR_HANDLE_RADIUS = 5`. Les 6 valeurs
  sont éditables au clavier via `NumberInput` (clic, parse permissif,
  Enter/blur commit, Esc annule).
  Polish handles (F.3.13.2-3) : cercles isotropes (dessinés en coords
  physiques après reset transform, pas d'ellipses), curseur dynamique
  (default → grab au survol d'un handle → grabbing pendant drag),
  tooltips au survol indiquant le rôle de chaque handle (P1, P1h, P2,
  P4) — composant `AdsrTooltip` positionné absolument dans le
  container, bascule sous le handle si proche du bord haut.
- Hydratation auto depuis `currentPatch` (prop) via `useEffect` qui compare l'id
  contre `hydratedFromIdRef`. Hydrate uniquement les champs du patch (points,
  ADSR, amplitude, preset) ; les champs `test*` (contexte de test de
  l'utilisateur) ne sont PAS écrasés.
- **Dirty check** exposé via `useImperativeHandle` (`isDirty()`). Compare
  uniquement les champs du patch (pas les `test*`) vs `referenceRef`.
- Deux boutons sauvegarder :
  - "Mettre à jour" (visible si `currentPatch`) : `onUpdatePatch(id, payload)`,
    flash "Patch mis à jour".
  - "Enregistrer comme nouveau" / "Sauvegarder le patch" : `onSavePatch(payload)`,
    bascule la référence et le `hydratedFromIdRef` vers le nouvel id, déclenche
    `onPatchCreated(id)` pour que App set `currentPatchId`.
- L'identité du patch ("Patch N" en création / "Édition : NOM" chargé) est
  affichée dans la barre du haut (`DesignerToolbar`) — plus dans le header de
  la zone Forme d'onde (M.r.2.1).

### `DesignerToolbar.jsx` (iter-M phase-r.2)
- Barre du haut unique du Designer, au-dessus des 3 colonnes. Style aligné sur
  les headers de colonne. Rendue par App.jsx en desktop (au-dessus de
  `DesignerColumns`) **et** en mobile (au-dessus de l'accordéon).
- Gauche : identité du patch (`patchLabel`) + boutons **Presets** (ouvre
  `PresetPicker`, déplacé depuis le header Harmoniques) et **Reset** (timbre seul,
  ConfirmDialog → `RESET_EDITOR_WAVEFORM`). **r.2.6.2** : rendus en **icônes
  Lucide** (Presets → `FolderOpenDot`, Reset → `Eraser`) via la classe partagée
  `.icon-btn` — `title` complet + `aria-label` conservés. **r.2.6.8** : le bouton
  **Normaliser** (`Sigma`) a quitté la barre du haut pour le **header de la zone
  Forme d'onde** (cf. `renderWaveformHeaderControls`), où il est visible dans les
  deux modes d'édition.
- **r.2.6.5/.6** : les presets de proportions des colonnes (anciens libellés
  Unicode ⅓⅓⅓ · ½¼¼ · ¼½¼ · ¼¼½) sont rendus par un **aperçu SVG**
  (`IconColumnLayout` : rectangle 48×16 + 2 séparateurs aux proportions).
- Droite (desktop seulement, si `onWidths` fourni) : séparateur visuel + presets
  de proportions ⅓⅓⅓ · ½¼¼ · ¼½¼ · ¼¼½ + toggle « Dimension auto ». En mobile,
  ces contrôles sont sans objet (accordéon mono-colonne) et non rendus.
- Présentational : tous les handlers viennent d'App.jsx (proportions/auto) et de
  `WaveformEditor` via l'API children (Presets/Reset/Normaliser/patchLabel).

### `DesignerColumns.jsx` (iter-M phase-2.2, allégé r.2.1)
- Moitié haute du Designer en 3 colonnes ajustables (Forme d'onde /
  Harmoniques / Spectrogramme). Props : `widths` (3 fractions sommant à 1,
  persistées), `onWidths`, `columns` (3 nodes), `autoSizing`, `focusGuardRef`.
- **r.2.1** : les presets de proportions ⅓⅓⅓ · ½¼¼ · ¼½¼ · ¼¼½ et le toggle
  « Dimension auto » ont migré dans `DesignerToolbar`. Ce composant ne gère plus
  que les séparateurs glissables + le tracking du focus auto-sizing.
- Séparateurs glissables (`flex-grow` = fractions) : `mousedown` capture l'event
  (`stopPropagation`, recalcul absolu depuis `startWidths`/`startX`, plancher
  12 % par colonne). Le `stopPropagation` isole le drag du clic-colonne.
- État `designerColumnWidths` (reducer, non-undoable, persisté). Défaut piloté
  par la lentille (½¼¼ en free/spline) tant qu'aucune valeur n'est persistée. Le
  spectro est une **colonne permanente** (toggle « Spectro » retiré ;
  `spectrogramVisible` vestigial, clé localStorage conservée).
- **Auto-sizing (iter-M phase-2-as, essai)** : props `autoSizing`,
  `focusGuardRef` (toggle « Dimension auto » désormais dans `DesignerToolbar`).
  Quand ON, un `useEffect` attache un listener `mousedown` (capture)
  qui pilote `designerColumnWidths` selon le focus (3 états : `[0.6,0.2,0.2]` /
  `[0.2,0.6,0.2]` / `[0.2,0.2,0.6]`=repos) et lève `focusGuardRef` le temps du
  geste qui change le focus (consommé par `WaveformEditor` pour supprimer
  l'édition sur ce mousedown). Focus volatile (`focusColRef`). OFF → aucun
  listener, comportement M.2 strict. Retrait = supprimer toggle + `useEffect`.

### `ConvertToHarmonicDialog.jsx` — SUPPRIMÉ (M.r.1.4)
- Dialog de la passerelle draw→harmonic. **Supprimé** avec les conversions
  destructives : les lentilles partagent désormais la même `canonical`, le
  toggle bascule via `setCurrentLens` (plus de dialog).

### `SplineEditor.jsx` (iter-M phase-3)
- Éditeur du mode spline (points/courbe), rendu dans la colonne Forme d'onde.
  Canvas : courbe (`points`/draft) + poignées d'ancres draggables (pattern
  visuel ADSR : pastilles cerclées d'accent, pleine si sélectionnée/survolée).
- Interactions : drag poignée → `MOVE_SPLINE_ANCHOR` (X clampé entre voisins,
  Y ∈ [-1,1], **draft local** committé au mouseup → 1 cran undo, courbe live via
  `splineToPoints`) ; clic hors poignée → `ADD_SPLINE_ANCHOR` à ce point ;
  poignée + Suppr/Backspace **ou** clic droit → menu contextuel « Supprimer »
  → `REMOVE_SPLINE_ANCHOR`. Curseur grab/grabbing/crosshair. Réutilise
  `.we-canvas-area` / `.canvas-container` / `.label` (WaveformEditor.css, globaux).
- **r.2.4** : prop `convertButtons` + toggle Doux/Anguleux interne supprimés,
  remplacés par une prop `headerControls` (le switch Libre/Ancres + Doux/Anguleux
  + nombre d'ancres sont remontés dans `WaveformEditor.renderWaveformHeaderControls`
  et rendus dans le header partagé). `onSetInterpolation` retiré des props.
- Refs miroir mis à jour en `useEffect` (jamais pendant le render —
  react-hooks/refs), double-rAF ResizeObserver (contournement Firefox).

### `ConvertToSplineDialog.jsx` — SUPPRIMÉ (M.r.1.4)
- Dialog draw/harmonic → spline. **Supprimé** avec les conversions destructives
  (cf. ConvertToHarmonicDialog ci-dessus).

### `PresetPicker.jsx` (iter-M phase-4)
- Modal de chargement des presets de timbre, ouvert par le bouton « Presets »
  de la **barre du haut** (`DesignerToolbar`, déplacé depuis le header
  Harmoniques en M.r.2.2 ; modale inchangée). Reprend le langage visuel des
  dialogs (backdrop + carte centrée). Escape ferme.
- Liste `TIMBRE_PRESETS` groupée par `PRESET_CATEGORIES` (nom + description en
  ligne). Clic → `onPick(preset)` délégué au parent. Le garde-fou dirty
  (`ConfirmDialog` avant écrasement) et le dispatch `LOAD_PRESET` vivent côté
  `WaveformEditor` (qui détient le signal dirty `patchFieldsEqual`).
- `LOAD_PRESET` (reducer, undoable atomique) remplace le draft en mode
  harmonique sans passerelle ; amplitude/ADSR aux défauts, champs test*
  préservés. `sanitizeAmplitudes` = copie défensive de la donnée immuable.

### `Timeline.jsx` (Composer)
- Layout multipiste : colonne d'en-têtes de piste (sticky left, 120px) +
  grille scrollable (overflow-x/y) + zone d'extension (+1/+4/+16 mesures).
- En-tête de piste (2 lignes) : pastille couleur + nom (double-clic renomme) +
  × supprime | boutons M/S + slider volume. Drag en-tête = réordonnancement.
  Ghost flottant + indicateur d'insertion pendant le drag.
- Couloirs de piste : fond alternant, bordure gauche colorée, lane assignment
  greedy par piste, surbrillance au survol pendant drop/paste.
- Drop de patches : `findTrackAtY` identifie la piste cible depuis la coordonnée Y.
- Drag de clips cross-piste : `trackDelta` via `mouseStartTrackIndex`,
  `effectiveLane = 0` pendant le preview, commit `trackId` au drop.
- Clips : position absolue, snap 16ᵉ, drag/resize/duplication, multi-sélection
  (rectangle, Ctrl+clic, Shift+drag). Clic droit clip = retirer.
- Grille : lignes absolues, subdivision adaptative (noire/croche/double/triple),
  Ctrl+molette zoom centré souris. Numéros de mesure sticky top.
- Menu contextuel : clic droit zone vide = "Coller ici" (avec surbrillance
  pistes cibles), clic droit mesure = CRUD mesure. Échap ferme le menu.
- Curseur de lecture + visualiseur oscilloscope persistant.

### `PatchBank.jsx` (partagé Designer & Composer)
- Liste verticale de chips (responsive : bandeau horizontal en <900px).
- Drag → payload `text/plain` = patchId (drop sur Timeline).
- **Designer** : clic charge le patch dans l'éditeur ; double-clic = renommer
  inline ; pas de bouton ✎. × supprime.
- **Composer** : clic = no-op ; double-clic = renommer inline ; ✎ = éditer
  dans Designer (dirty check + bascule onglet) ; × supprime.
- **Dossiers** : clic = toggle ; double-clic = renommer inline ; × supprime.
- Chip avec `currentPatchId` reçoit la classe `is-current` (highlight bordure,
  Designer only). Plus d'affichage de fréquence : un patch n'a plus de hauteur.

### `usePlayback` (hook, `src/hooks/usePlayback.js`)
- Une instance dans App. Singleton de fait pour le moteur audio timeline.
- Retourne `{ isPlaying, cursorPos, currentTime, isExporting, analyserRef,
  play, stop, exportWav, updateTrackGains }`.
- AudioContext créé paresseusement. Cleanup à l'unmount d'App.
- **Scheduler look-ahead** : `setInterval` 25ms programme les clips dans
  une fenêtre de 100ms d'avance. Refs (`clipsRef`, `tracksRef`,
  `patchesRef`, `bpmRef`) pour lire le state frais à chaque tick.
  La fréquence effective est calculée par `clipFrequency(clip)` (pas lue
  sur le patch). Signature de changement inclut tuningSystem/note/octave/
  frequency → un clip dont la hauteur change pendant la lecture est
  invalidé et reprogrammé comme les autres modifications.
  `scheduledClipIds` (Set) évite le double-scheduling. `activeNodesRef`
  stocke les oscillators actifs.
- **GainNode par piste** (`trackGainNodesRef`) : chaque piste a son propre
  gain, tous convergent vers `analyserGain` → `AnalyserNode` + `destination`.
- `updateTrackGains(tracks)` : met à jour les gains en temps réel pendant
  la lecture (appelé par un useEffect dans App quand `tracks` change).
- **Export WAV** : scheduling one-shot via `scheduleAllClips` (pas de
  look-ahead dans l'OfflineAudioContext).

### `audio.js`
- `pointsToPeriodicWave(points, ctx, definition)` — FFT 512 points, troncature
  optionnelle des harmoniques k > `definition` (iter-M phase-1 ; absente = spectre
  complet). `pointsToHarmonics(points)` mémoïsé par `points` (cap 256 harmoniques).
- `harmonicsToPoints(amplitudes, N)` (iter-M phase-2) — iDFT
  `Σ aₖ·sin(2πkx/600)`, k=1..N, sur 600 points. Reconstruction de la courbe
  d'un patch harmonique ; stockée dans `points` → l'audio reste mono-chemin
  (round-trip iDFT→DFT propre à 512 échantillons, k≤256 sur un bin exact).

### `lib/presets.js` (iter-M phase-4)
- Bibliothèque **code-only, read-only** de presets de timbre, indépendante du
  PatchBank utilisateur. `TIMBRE_PRESETS` (12 entrées) + `PRESET_CATEGORIES`.
- Chaque entrée `{ id, category, name, description, patch }` où `patch` est un
  HarmonicPatch minimal `{ mode:'harmonic', N, amplitudes }`. 6 évocateurs
  d'instruments + 6 inattendus-propres. Libellés (noms, descriptions,
  catégories) importés de `STRINGS.timbrePresets`. Pas de presets
  `spline`/`draw` (un user convertit un preset harmonique).

### `lib/spline.js` (iter-M phase-3)
- `splineSoft(anchors)` (Catmull-Rom périodique, Hermite cubique y(x) — voisins
  wrappés ±600 pour x monotone, continuité C¹ à la frontière x=600↔0) /
  `splineHard(anchors)` (polyligne périodique) / `splineToPoints(anchors, interp)`
  (dispatcher). Sortie `Float32Array(600)` clampée [-1,1]. Reconstruction de la
  courbe d'un patch spline ; stockée dans `points` (même rôle que harmonicsToPoints).
- `HARMONIC_COUNT = 256` — plafond d'harmoniques (= défaut/max du slider Définition)
- `SOUND_COLORS` — palette de 12 couleurs
- `audioBufferToWav(buffer)` — encode PCM 16 bits stéréo (mono dupliqué L+R)
- `downloadWav(ab, filename)` — blob + `<a download>` programmatique

## Architecture audio

- **Live (look-ahead)** : scheduler à fenêtre glissante (25ms tick,
  100ms look-ahead). Chaque clip → `OscillatorNode` (PeriodicWave) →
  `GainNode` (AHDSR) → `trackGainNode` → `analyserGain` →
  `AnalyserNode` + `destination`. Un `GainNode` par piste ;
  gain = `track.volume` si audible, 0 si muté/solo-exclu.
  Changements de clips détectés par comparaison de signatures ;
  clips modifiés invalidés et reprogrammés. Depuis F.3.12.1, la
  signature inclut l'enveloppe du patch référencé → modifier
  attack/hold/decay/sustain/release/amplitude pendant la lecture
  re-schedule les clips à venir.
- **Export WAV** : `OfflineAudioContext(2, sampleRate * totalDurationSec, 44100)`,
  même routage per-track GainNode, mono up-mixé en stéréo, encodage RIFF/PCM16
- **AHDSR par note** : rampes linéaires
  attack→peak→hold(plateau)→decay→sustain→release→0 avec
  `clipDuration = max(noteDurationSec, attack + hold + decay + release)`.
  Le plateau hold est rendu par deux `linearRampToValueAtTime` au même
  niveau (peak), formulation idiomatique sans discontinuité
  (pas de `setValueAtTime` au milieu).

## Décisions architecturales

Choix non évidents pris pour de bonnes raisons. À ne pas remettre en question
à la légère — relire ici avant de refactorer.

- **Courbe canonique unique + lentilles (M rattrapage, 2026-06-01)** : le timbre
  est UNE courbe `canonical` (600 pts, vérité audio) regardée/éditée par trois
  lentilles toujours synchronisées (Forme d'onde / Harmoniques / Spectro), pas
  trois représentations silotées. **Plus de `mode` discriminé ni de conversion
  destructive.** `cap` unifié remplace `definition` (tracé) et `N` (barres). Le
  résidu (`canonical − spline(anchors)`) préserve les détails fins du tracé au
  drag d'ancre. **Hygiène canvas systématique** (`src/lib/canvas.js` →
  `withSavedCtx`) : aucune propriété de contexte ne fuit entre deux rendus. Cf.
  `docs/superpowers/specs/2026-06-01-waveform-rattrapage-design.md`.
- **UI Designer « d'une seule voix » (M rattrapage r.2, 2026-06-01)** : une
  **barre du haut unique** (`DesignerToolbar`) regroupe identité du patch +
  Presets/Reset/Normaliser + proportions des colonnes. Le **cap a un contrôle
  unique** (slider+readout dans le header Harmoniques) — fini le double contrôle
  hérité de M.r.1 (slider « Définition » sidebar + NumberInput « Harmoniques »).
  Les deux modes d'édition de la zone Forme d'onde se choisissent via un
  **switch Libre/Ancres** (free↔spline) ; **plus aucun bouton « Convertir
  vers… »** (reliques du modèle siloté). `WaveformLens` ne porte plus que
  `'free' | 'spline'` (M.r.3.2 : `'bars'` retiré, vestigial depuis r.2.4) — les
  barres d'harmoniques sont éditées directement (toujours éditables,
  indépendantes de la lentille).
- **Lentilles vivantes — re-fit auto des ancres (M.r.3, 2026-06-01)** : les **5
  actions** qui modifient `canonical` par une voie autre que le drag d'ancre
  (`SET_EDITOR_CANONICAL`, `SET_EDITOR_HARMONIC_AMPLITUDE`,
  `NORMALIZE_EDITOR_CANONICAL`, `LOAD_PRESET`, `APPLY_EDITOR_PRESET`) **re-fittent
  automatiquement les ancres** sur la nouvelle canonical (en préservant leur
  nombre) puis recalculent le résidu, via le helper unique
  `refitAnchorsAndResidual(canonical, currentAnchors, interpolation)`. La lentille
  Spline est donc *toujours* représentative du tracé courant ; un drag d'ancre
  subséquent produit une déformation cohérente (amplitude du delta proportionnelle
  à la finesse de la spline, modulée par le résidu). `APPLY_EDITOR_PRESET` (presets
  rapides Sinus/Carré/…) est le 5ᵉ call-site : non listé dans le prompt initial,
  ajouté par décision archi car il exhibait la même bizarrerie. Spec §4.1.
- **Normalisation explicite + détection par flag d'état (M.r.4, 2026-06-02)** :
  les barres d'harmoniques ne portent que des **magnitudes**, pas de phase. La
  convention de reconstruction iDFT est la **phase canonique sinus pur** pour
  toutes les harmoniques (la phase est inaudible, cf. spec §4) — d'où le « saut »
  visuel de la canonical au premier drag de barre depuis une phase quelconque
  (régression de phase). M.r.4 l'explicite (dialog edit-bars + courbe grise
  d'aperçu + bouton désactivé), piloté par un flag `editor.canonicalNormalized`.
  - **Détection « normalisée » par flag d'état, PAS par comparaison numérique**
    (amendement 2026-06-02 suite à mesure du dev). La v1 du prompt prévoyait
    `isCanonicalNormalized(canonical, cap, eps)` comparant la canonical à son
    round-trip `harmonicsToPoints(canonicalToBars(x))`. Mesure : ce round-trip
    **n'est pas idempotent** à haut `cap` sur signaux riches en hautes harmoniques
    (resample 600→512 par **interp linéaire** = leakage ~15 %/passe ; un créneau
    à `cap=256` demande **4 normalisations** pour converger). Les classes
    « vraiment normalisé » et « tracé libre quasi-en-phase » se chevauchent sur la
    métrique → **aucun seuil ne sépare**. Le flag est déterministe, idempotent
    (1 click → grisé), et sémantiquement plus honnête : « normalisé » est une
    propriété de l'**histoire de l'éditeur**, pas du tableau `canonical`. Effets
    par action câblés dans le reducer (cf. Contraintes implicites).
  - **Commentaire corrigé** dans `audio.js` (`harmonicsToPoints`, ~l.176) : il
    affirmait à tort que le round-trip « redonne exactement les mêmes magnitudes ».
    Corrigé : admet le leakage 600→512, pointe le backlog « Mismatch de grille
    FFT 600 ↔ 512 ». La détection numérique aurait été le 1ᵉʳ symptôme bloquant de
    ce bug ; le flag d'état la contourne (le bug FFT reste backlog, hors scope).
- **Convention d'amplitude Forme d'onde — auto-fit Y, pas de clamp (M.r.5.1,
  2026-06-02)** : le canvas Forme d'onde affiche `[-peak, +peak]` au lieu de
  `[-1, +1]` fixe ; le **pic minimum affiché reste 1** pour que le marqueur ±1
  (niveau audio référence) demeure visible même au silence ou sur de petites
  amplitudes (sinon écrasé au bord). Le **tracé libre n'est pas clampé à ±1** :
  l'utilisateur peut dessiner au-delà du niveau audio référence (le marqueur ±1
  sert de repère), `SET_EDITOR_CANONICAL` ne clampe pas, le navigateur normalise
  la `PeriodicWave` à la lecture. Cohérent avec « la canonical = vérité audio
  éditée ». Transition douce du zoom (lerp rAF coeff 0.15) car le rendu canvas
  est au pixel — pas de transition CSS possible. Spec §7.
- **Étiquetage de l'axe X de la zone Harmoniques (M.r.5.2, 2026-06-02)** :
  étiquettes `kf` aux **puissances de 2** (`{1,2,4,…,256}` filtré à `≤ cap`) si
  `cap ≥ 8`, **toutes** les harmoniques (1..cap) si `cap < 8` (pas saturé à ce
  niveau). La première (`1f`) est donc toujours présente. Pas d'algorithme de
  placement fin : positionnement au centre de la barre via `left:%`, overflow
  occasionnel sur cap dégénéré assumé. Étiquetage Y en 0/0.5/1 (amplitude vraie,
  plus mathématique que des pourcentages). Spec §5.3.
- **Spline parfaite affichée en permanence (M.r.5.bis.2, 2026-06-02)** : la 3ᵉ
  courbe orange (`splineToPoints(anchors)`, sans résidu) est dessinée en continu
  dans les deux lentilles, **cachée uniquement quand le résidu est négligeable**
  (écart à la courbe affichée ≤ 0.01). Avant : elle n'apparaissait que pendant un
  drag d'ancre — apparition/disparition contextuelle perçue comme perturbante. Le
  critère de visibilité est **dérivé de l'écart aux courbes effectivement
  affichées** (et non de `editor.residual`) : il reste juste pendant un tracé
  libre (résidu committé périmé). **Passe d'usage** : pendant un drag d'ancre, la
  courbe affichée (bleu) est désormais la prévisualisation `spline(draft) +
  résidu` (et non la spline pure), de sorte que l'orange (spline) reste visible et
  distincte du bleu — les trois courbes coexistent pendant le geste. Seuil 0.01
  pragmatique (baisser à 0.005 si elle disparaît trop tôt, monter à 0.02 si elle
  reste visible alors qu'elle se confond). Couleur via `--canvas-spline-perfect`
  (orange, déclinée clair/sombre).
- **Clic droit sur barre = mise à zéro, garde de phase conservée (M.r.5.bis.3,
  2026-06-02)** : le clic droit éteint l'harmonique mais **passe par la même garde
  edit-bars** que le clic gauche — si la canonical n'est pas normalisée, le dialog
  `edit-bars-requires-normalize` précède l'opération (au lieu d'un raccourci
  silencieux qui contournerait la convention de phase canonique). Aucun draft/drag
  initié au bouton droit (sinon un draft resterait coincé en attente d'un mouseup
  gauche). Menu contextuel natif bloqué (`onContextMenu`).
- **Marge tampon aux bords des zones d'édition (M.r.5.bis, passe d'usage,
  2026-06-02)** : `DRAW_MARGIN = 12px` (horizontal + zone Harmoniques) et
  `DRAW_MARGIN_V = 20px` (vertical des canvas Forme d'onde), exportés par
  `lib/canvas` (source unique → les deux canvas restent à la même échelle). Le
  tracé / les poignées / les barres sont confinés à l'intérieur (rendu ET mapping
  d'entrée insettés), pendant que l'élément capteur garde sa taille pleine →
  bande tampon avant de quitter l'élément et de perdre le geste (même solution
  que le lasso de la bibliothèque, qui suit la souris au niveau window). La marge
  verticale plus large (20 vs 12) réserve une **gouttière haut/bas** où loger la
  légende et le hint d'usage **hors du tracé** ; symétrique pour garder
  l'amplitude 0 au centre (`midY = H/2`). Les lignes de repère restent pleine
  largeur.
- **Silence comme état neutre (M.r.2.5, 2026-06-01)** : `DEFAULT_EDITOR.canonical`
  et `RESET_EDITOR_WAVEFORM` repartent du **silence** (canonical à zéro). M.r.2.2
  avait tenté une sin fondamentale (« un nouveau patch sonne »), annulée à la
  passe d'usage : ne pas imposer un timbre arbitraire à l'utilisateur — il part
  d'une toile vierge et façonne son son.
- **Reset Designer = effacer le timbre, pas l'éditeur (M.r.2.6.1/.3, 2026-06-01)** :
  le bouton Reset (`RESET_EDITOR_WAVEFORM`) efface le timbre (canonical → silence)
  et aplatit les ancres, **mais préserve le plafond d'harmoniques `cap` ET le
  nombre d'ancres** — deux réglages posés par l'utilisateur, conservés à
  l'identique (r.2.6.3 : `defaultSplineAnchors(count)` régénère N ancres plates où
  N = compte courant). Ctrl+Alt+N (`RESET_EDITOR`) reste l'outil de remise à zéro
  complète (cap + ancres inclus). On a déjà un chemin pour tout réinitialiser ;
  Reset doit avoir une portée plus restreinte.
- **Convention iconographique du projet (M.r.2.6.2, 2026-06-01)** : **Lucide en
  priorité** pour toute icône d'UI. Si rien dans Lucide ne convient
  sémantiquement, **SVG inline dans le style Lucide** (stroke ~2 px, pas de fill,
  `currentColor`, viewBox 24×24, line cap/join arrondis) — regroupés dans
  `src/components/icons.jsx`. **Plus jamais de caractère Unicode comme icône** ni
  comme séparateur graphique (emoji, ↺, ∼, ⌫, Σ, etc.), nulle part. Classe
  partagée `.icon-btn` (taille/padding/états). S'applique à **toutes les phases
  futures**, pas seulement M.r.2.6.
- **L'éditeur de patch n'est plus détaché** : son state (points, ADSR,
  preset, etc.) vit dans `state.editor` du reducer global, pas en local
  dans `WaveformEditor`. Raison : l'undo/redo doit couvrir l'éditeur.
  Conséquence : les gestes continus (dessin canvas, drag poignées ADSR,
  sliders) **doivent** utiliser un draft local et ne dispatcher qu'au
  mouseup/touchend/blur, sinon chaque pixel pollue la pile d'historique.
- **Patches vs clips (itération E)** : un Patch ne porte que la forme
  (points + ADSR + amplitude + preset). La hauteur (tuningSystem +
  noteIndex/octave ou frequency) est portée par le Clip. Raison : on
  veut pouvoir jouer le même timbre à différentes hauteurs sans
  dupliquer le patch. Le calcul de la fréquence effective passe par
  `clipFrequency(clip, a4Ref)` qui délègue au registre des tempéraments
  (voir entrée suivante).
- **Registre des tempéraments (itération F.1)** : `src/lib/tuningSystems.js`
  est le **point d'extension unique** pour les systèmes d'accordage.
  Chaque entrée expose `{ id, label, notesPerOctave, noteNames, freq }`
  où `freq(noteIndex, octave, a4Ref)` donne la fréquence (ou `null` pour
  un système "libre" qui lit `clip.frequency` directement). Règle :
  tout calcul de fréquence depuis une note doit passer par le registre
  (moteur de lecture, preview Designer, affichage Properties,
  spectrogramme). Raison : en E.1 la formule 12-TET était dupliquée
  dans plusieurs fichiers, source de divergence potentielle. En F,
  ajouter 24-TET ou Pythagoricien = ajouter une entrée au registre,
  zéro `if/else` à modifier ailleurs. `formatClipNote` et `NOTE_NAMES`
  dérivent aussi du registre (pas de copie locale).
- **Persistance unifiée de l'état d'exploration Designer (F.4.4.3)** :
  tous les champs `editor.test*` (testTuningSystem, testNoteIndex,
  testOctave, testFrequency) ET `editor.visualCue*` (visualCuePattern,
  visualCueTonic) sont persistés ensemble dans localStorage. L'éditeur
  de patch lui-même (points, ADSR, amplitude, preset) reste volatile —
  séparation entre **état d'exploration** (préférences de session,
  persistées) et **brouillon de patch** (intermédiaire, jeté au reload).
  Validation/clamp défensifs au load (`loadPersistedState`) : un système
  inconnu du registre → fallback `'12-TET'`, indices hors borne → clamp
  à `[0, notesPerOctave-1]`, pattern visual cue inconnu → `'none'`,
  champ absent → fallback `DEFAULT_EDITOR` via `??`. Avant 4.4.3 :
  testTuningSystem volatil retournait silencieusement à `'12-TET'` au
  reload pendant que `visualCueTonic` survivait avec son ancienne
  valeur — produit des indices hors borne potentiellement crashants.
- **Tempéraments à accordage variable : référence documentée
  explicite (F.6)** : pour les systèmes dont l'accordage varie
  ethnographiquement (gamelan javanais, et plus tard maqâmât en
  pratique vivante, shrutis indiens, etc.), on s'engage sur **un**
  accordage mesuré et publié, cité en commentaire dans
  `tuningSystems.js`. Principe : pas d'invention, pas de moyenne
  inventée, pas d'extrapolation. Pour Slendro et Pelog : Surjodiningrat,
  Sudarjana & Susanto, "Tone Measurements of Outstanding Javanese
  Gamelans in Jogjakarta and Surakarta" (1972). Si un autre accordage
  est demandé (Yogyakarta, Sumarsam, Tenzer), c'est une **entrée
  séparée** du registre — pas un override paramétrable.
  Conséquence : le label de l'entrée mentionne explicitement la
  région/source ("Slendro (gamelan javanais, Surakarta)"). Cohérent
  avec la posture humble du BACKLOG ("ne pas inventer pour les
  traditions sous-documentées") et avec le 24-TET Le Caire 1932 qui
  cite déjà aly-abbara.com. Le mécanisme d'import custom de cents
  par l'utilisateur (backlog) couvrira les cas où aucune référence
  pré-existante ne convient.
- **Convention de nommage des tempéraments : TET réservé aux
  équipartites (F.7.6)** : le sigle "TET" (Tempérament Égal /
  Tone Equal Temperament) est réservé aux systèmes mathématiquement
  équipartis (12-TET, 24-TET équipartite, 5-TET, 31-EDO — qui utilise
  la variante EDO mais relève du même principe). Les systèmes
  mesurés ou irréguliers (Maqâmât Cairo 1932 mesurés, Slendro et
  Pelog Surakarta, shrutis indiens) ne portent pas ce sigle dans
  leur libellé. Raison : un libellé "24-TET (Le Caire 1932)"
  laissait croire à une équipartition mathématique alors que les
  mesures dévient sciemment (tierces neutres des maqâmat). Cette
  convention vaut pour les ajouts futurs : si un nouveau système
  est dérivé de mesures ou d'une accordage non-uniforme, son
  libellé doit l'indiquer (e.g. "Maqâmât …", "Gamelan …", "shrutis
  …") plutôt que d'emprunter "TET". Les ids existants sont conservés
  malgré cette convention (`'24-tet-cairo-1932'` reste, le coût d'un
  rename global dépasse le bénéfice — ils restent des identifiants
  internes invisibles à l'utilisateur).
- **Source unique des raccourcis clavier (iter-L phase-1.1)** :
  `src/lib/shortcuts.js` est le **point d'extension unique** pour les
  raccourcis clavier. Chaque entrée de `SHORTCUTS` expose
  `{ id, contexts, label, description, keys: { primary, alternative,
  display }, anchor, condition?, composite? }`. Les handlers
  (App.jsx, WaveformEditor.jsx, PatchBank.jsx) consomment via
  `matchesShortcut(e, id)` plutôt que de comparer e.key/e.code
  inline. Raison : avant L.1, les conditions étaient dupliquées entre
  handlers, l'overlay devait re-déduire la liste, et l'ajout/changement
  d'un raccourci nécessitait de toucher plusieurs fichiers. Avec la
  table : un seul endroit pour ajouter un raccourci, l'overlay le rend
  automatiquement, la future page A.1 (Doc / Raccourcis) le génère.
  Exceptions composites (touches notes Designer / placement contigu
  Composer) : entrées marquées `composite: true`, le matching reste
  côté handler (mapping system-dependent via `getKeyboardMap`). Le
  `NOTE_GUARD_KEYS` (cf. décision F.7.5) reste séparé — c'est un
  guard transverse, pas une action utilisateur.
- **Convention `data-anchor` sur les éléments d'UI (iter-L phase-1.3)** :
  chaque élément d'UI référencé par un raccourci, un futur DocLink
  (L.3) ou une étape de Tour (L.4) porte un attribut
  `data-anchor="<id>"`. La valeur correspond au champ `anchor` dans
  `SHORTCUTS` (ou à des ancres dédiées DocLink/Tour). L'utilitaire
  `src/lib/getAnchoredPosition.js` résout l'id en rect viewport ;
  si plusieurs éléments matchent (cas des boutons dupliqués open/
  collapsed Designer ou des boutons Undo/Redo par onglet), prend le
  premier visible. Les ancres dynamiques (anchor halo Composer,
  boutons Undo/Redo selon `activeTab`) sont gérées via `anchor`
  exprimé comme fonction `(state) => string` dans la table. Les
  touches du clavier visuel portent en plus un `data-anchor-key=
  "<noteIndex>"` pour permettre aux overlays composite (étiquettes
  par touche QWERTY) de se positionner sur la cellule correspondante
  via `getAnchoredKeyPositions`.
- **Navigation interne de la doc (iter-L phase-3)** : deux mécanismes
  distincts, volontairement séparés. (1) `<DocLink target="onglet:ancre">`
  = saut vers un élément d'UI réel → bascule d'onglet + halo via
  `src/lib/highlightElement.js`, **2e consommateur de
  `getAnchoredPosition`** après l'overlay raccourcis (la sémantique
  "premier visible / rect dégénéré = absent" donne gratuitement le no-op
  gracieux pour un panneau replié ou une ancre dépendant d'une sélection).
  Le highlight sonde le DOM par `requestAnimationFrame` borné (`maxWaitMs`)
  car l'onglet cible se monte *après* le `setActiveTab` — pas de state
  reducer dédié. (2) Lien Markdown `[label](doc:article-id)` = navigation
  doc→doc, **lien standard intercepté** au rendu (scheme `doc:`), reste
  dans l'onglet. Les handlers (`onDocLink`, `onDocNav`) sont propagés aux
  feuilles interactives par un **`MarkdownNavContext`** plutôt qu'en
  prop-drilling : `renderBlock`/`renderInline` sont des fonctions
  module-level récursives, pas des composants, et ne peuvent pas consommer
  de contexte ; seules les feuilles (`DocLinkAnchor`, `DocNavLink`) le
  font. Défaut null = rendu inerte → le renderer reste réutilisable hors
  onglet Documentation. Validation des cibles en runtime (warn dev), pas
  au build (un linter d'articles pourra venir si le volume L.5 le justifie).
- **Tour guidé = 3e consommateur de `getAnchoredPosition` (iter-L phase-4)** :
  `src/components/Tour.jsx` réutilise la même résolution d'ancre que
  l'overlay raccourcis et `highlightElement`, et le même RAF borné pour le
  montage différé (bascule d'onglet + ouverture de sidebar repliée). Choix
  structurants : (a) **app gelée** par un blocker plein écran qui avale
  clic/molette/clavier — pas un simple voile : le box-shadow du spotlight ne
  capture aucun événement, donc le gel est une couche transparente distincte.
  Ça rend le snapshot/restore tractable (l'utilisateur ne peut rien muter
  pendant le tour). (b) **Snapshot unique sur toute la chaîne** capturé au 1er
  `START_TOUR` (onglet + 4 sidebars repliables), restauré à `END_TOUR` ; le
  chaînage entre onglets (`TOUR_CHAIN`) ne re-snapshot pas — c'est la
  définition de « stateless du point de vue utilisateur ». Garde dédiée :
  pendant `tour.active`, l'effet de persistance localStorage est court-circuité
  (un refresh en plein tour ne doit pas figer une sidebar dépliée par le tour).
  (c) **Tours déclaratifs par onglet** (`src/lib/tours/*.js`) : une étape =
  `{ anchor, title, body, article?, sidebar? }`. La *séquence effective*
  (étapes dont l'ancre est résolvable, ou révélable via `sidebar`) est calculée
  côté `Tour.jsx` ; les ancres absentes (clip témoin inexistant, presse-papier
  vide, bouton conditionnel) sont skippées gracieusement — pas de création de
  contenu témoin (scope médian). Aucun ordre canonique entre tours.
  **Contrainte d'écriture des étapes** : une étape portant `sidebar` est tenue
  pour disponible *a priori* (la sidebar la révélera), donc son ancre **doit
  être inconditionnellement présente** une fois la sidebar ouverte — sinon la
  bulle reste vide sans skip (cas vécu : `designer-save-button` n'existe
  qu'avec un patch chargé ; on cible `designer-save-as-button`, toujours là).
  (d) **Panneau de fin = position virtuelle** après la dernière étape (état
  `atEnd` explicite, jamais dérivé de `stepIndex` — sinon revenir sur la
  dernière étape le re-déclencherait). Là, le spotlight s'éteint (voile plein
  écran) et la bulle se centre dans le viewport. Navigation clavier ← / → en
  plus des boutons, lue via une ref synchronisée hors render.
- **Posture mode note : possession totale du clavier
  alphanumérique (F.7.5)** : hors form-field et hors raccourcis OS
  (Ctrl/Alt/Meta), le mode note "possède" l'ensemble fixe
  `NOTE_GUARD_KEYS` (alphanumériques + ponctuations à risque
  navigateur — Slash, Quote, Backquote, etc.) défini dans
  `src/lib/keyboardCandidates.js`. Les listeners notes Designer et
  Composer appellent `preventDefault()` sur ces touches *avant* tout
  lookup `keyboardMap` ou check Shift, indépendamment du système
  courant. Raison : sinon un utilisateur qui tâtonne avec un système
  ne mappant pas une touche donnée se fait happer par le navigateur
  (Firefox QuickFind sur ' = Digit4 AZERTY en 12-TET, par exemple).
  La constante est statique et inclut volontairement des codes hors
  registre (les ponctuations) ; ne pas la dériver dynamiquement
  depuis `TUNING_SYSTEMS`. Si un nouveau système mappe une touche
  absente d'ici, l'ajouter explicitement. Cohérent avec la décision
  F.3 (registre = seul point d'extension) : le registre dicte
  *quelles touches déclenchent une note dans un système donné*, mais
  la posture mode note est *transverse à l'app* — d'où le fichier
  séparé.
- **Catalogue partagé pour systèmes équivalents acoustiquement
  (F.7)** : quand deux systèmes du registre se distinguent par leur
  *grammaire culturelle* (grouping, layout, labels, mapping QWERTY)
  mais reposent sur les **mêmes cents**, on factorise la table de
  cents et la fonction `freq` dans une seule constante / un seul
  helper réutilisé par les deux entrées. Posé pour Bhatkhande et
  Sarngadeva (`SHRUTI_CANONICAL_CENTS` + `shrutiFreq` partagés ;
  deux entrées registre `'shrutis-bhatkhande'` et
  `'shrutis-sarngadeva'`, deux layouts `grid-22-*` et deux paires
  `*_NAMES` / `*_KEY_MAP` distinctes). Raison : les sons sont
  strictement les mêmes (un noteIndex donné produit la même
  fréquence dans les deux systèmes — la bascule entre les deux
  préserve la hauteur tout en changeant les labels), c'est la
  *lecture musicologique* qui diffère. Conséquence : aucun risque
  de divergence numérique entre les deux systèmes, et un éventuel
  3e framework sur le même substrat (ex. Bharata reconstructed
  selon Sambamoorthy) ne demande qu'un nouveau triplet
  `noms + keymap + layout` + une nouvelle entrée registre. Cohérent
  avec la décision F.6 (référence documentée explicite par accordage)
  et avec le pattern d'extension F.3 (le registre reste le point
  d'extension unique — on n'étend pas son schéma, on ajoute des
  entrées qui se partagent du code).
- **Catalogue de visual cues universel en cents (itération F.4.4)** :
  `src/lib/visualCues.js` définit chaque pattern (triade, gamme,
  septième…) comme une liste d'intervalles **en cents depuis la
  tonique**, indépendamment de tout système. Le snap vers les degrés
  du système courant est fait dynamiquement par `cuedNoteIndices()`
  via `frequencyToNearestIn`. Choix vs alternative (catalogues
  per-système, ex. mapping `[0, 4, 7]` pour 12-TET, `[0, 8, 14]`
  pour 24-TET) : 1) le catalogue universel est *intentionnellement
  unique* — la "triade majeure" est un objet musical pur (5/4 et 3/2),
  les écarts de chaque système par rapport à la pureté sont
  précisément ce qu'on veut donner à voir pédagogiquement ; 2) ajouter
  un système ou un pattern reste une opération O(1) — pas de
  multiplication NxM des entrées de catalogue. Effet de bord
  intéressant : la "gamme par tons" 12-TET (200¢) ne se ferme pas
  régulièrement en 31-EDO (séquence non périodique [0,5,10,16,21,26]
  au lieu de [0,5,10,15,20,25,31]), ce qui est la signature de la
  non-divisibilité de 1200 par 200 dans une grille de pas 38.71¢.
- **A4 de référence configurable (itération F.1)** : champ d'état
  `a4Ref` (Hz, défaut 440), persisté, global — pas un champ d'éditeur.
  Passé explicitement à `clipFrequency` et aux fonctions `freq` du
  registre (paramètre, pas import global → testable et découplé).
  Dans `usePlayback`, propagé via `a4RefRef` (comme `bpmRef`) lu au
  tick du scheduler : un changement pendant la lecture prend effet
  pour les clips schedulés après le changement (lag ≤ look-ahead =
  100 ms). Raison : un éventuel "A=432 Hz" est un réglage global,
  pas par-clip ; passer en argument le rend testable unitairement
  sans stub de state.
- **Éditeur = champs `test*` pour la preview** : le clavier piano /
  octave / slider fréquence du Designer pilotent uniquement la preview
  audio. Au drop d'un patch sur la timeline, `handleAddClip` lit
  `editorTestNoteFields(editor)` pour fixer la hauteur du nouveau clip
  (règle par défaut E.1). Les raccourcis clavier pour override au drop
  viendront en E.4.
- **Piles undo/redo en RAM pure** : pas de persistance localStorage.
  Motifs : taille (snapshots complets × 50 × 2 onglets), complexité
  (migration de format à chaque évolution du reducer), coût faible
  pour l'utilisateur (historique qui s'efface au reload est un comportement
  standard).
- **Snapshots undo complets (pas de diff)** : chaque entrée d'historique
  est un clone superficiel des champs trackés. Le partage de références
  via l'immutabilité du reducer rend ça bon marché en mémoire (un clip
  non modifié est la même référence dans tous les snapshots).
- **Moteur audio look-ahead** : `usePlayback` utilise un scheduler à
  fenêtre glissante (setInterval 25ms, look-ahead 100ms) qui programme
  les clips par petits blocs à l'avance. Les modifications de clips
  pendant la lecture sont prises en compte : le scheduler compare
  les signatures des clips à chaque tick et invalide/reprogramme les
  clips modifiés, supprimés ou ajoutés. L'export WAV conserve le
  scheduling one-shot (optimal pour OfflineAudioContext).
- **Lane assignment greedy, calculé au rendu** : la polyphonie (clips
  qui se chevauchent → lanes empilées) est calculée à chaque render de
  `Timeline` à partir des clips triés par position. Pas stocké dans le
  state. Raison : le calcul est O(n) et le layout se redébrouille après
  chaque drag/resize/drop sans invalidation manuelle.
- **Piles undo/redo isolées par onglet** (Option A parmi les alternatives
  discutées) : une pile pour Designer, une pile pour Composer. Raison :
  un Ctrl+Z doit annuler ce que l'utilisateur vient de faire *dans
  l'onglet où il est* ; partager une pile globale rendrait l'undo
  imprévisible (on annulerait une action invisible faite dans l'autre
  onglet). Conséquence : cross-onglet à gérer explicitement — un undo
  Designer qui supprimerait un son référencé par des clips du Composer
  est bloqué avec un Toast explicite, et symétriquement un undo
  Composer qui restaurerait des clips dont le son a été supprimé est
  aussi bloqué. Pas d'états incohérents possibles.
- **Pile undo classée par nature de l'action, pas par onglet
  source** (F.3.9) : `editor.testTuningSystem` est exposé dans deux
  endroits — sélecteur Designer ET sélecteur dans la toolbar
  Composer. Quel que soit le point de déclenchement, l'action
  `SET_EDITOR_TEST_TUNING_SYSTEM` reste dans `DESIGNER_UNDOABLE`
  (l'éditeur est sa juridiction sémantique). Un Ctrl+Z depuis le
  Composer ne défait pas un changement de tempérament fait depuis
  le Composer — il faut basculer vers le Designer. À surveiller
  comme accroc UX éventuel ; alternative déjà étudiée (déplacer
  l'action dans `COMPOSER_UNDOABLE` quand déclenchée depuis le
  Composer) écartée pour ne pas faire dépendre la classification
  de l'origine du dispatch (couplage UI ↔ reducer).
- **Suppression patches/dossiers : blocage avec assistance, pas de
  cascade**. Si des clips référencent le patch, on bloque la suppression,
  on affiche un toast, on auto-sélectionne les clips concernés et on
  bascule vers Composer. Raison : la cascade (supprimer patches + clips
  en une seule action) nécessitait un dual-stack undo complexe avec des
  edge cases insolubles (actions intercalées entre les deux piles). Le
  blocage est simple, robuste, et l'utilisateur garde le contrôle total.
- **Check undo symétrique bidirectionnel** : UNDO_DESIGNER vérifie que
  les clips actuels ne deviennent pas orphelins (via `patchId`) ;
  UNDO_COMPOSER vérifie que les patches référencés existent. Dans les
  deux cas : blocage + toast + auto-sélection des éléments concernés
  + bascule vers l'onglet approprié.
- **Deux clipboards séparés** : un pour les clips (Ctrl+C/X/V,
  positionné à la souris) et un pour les mesures (menu contextuel
  en-tête de mesure). Les deux sont volatils (RAM, non persistés).
  Raison : les deux opérations de collage ont des sémantiques
  différentes (clips = positionnement libre, mesures = insertion
  structurelle avec décalage).
- **Lanes = mécanisme d'affichage** : le lane assignment est greedy,
  recalculé à chaque rendu, jamais stocké dans le clip. Conséquence :
  la fusion (Ctrl+M) ignore les lanes et ne considère que l'adjacence
  temporelle, le patchId, la hauteur (tuningSystem/note/octave/frequency)
  et le trackId (même piste obligatoire).
- **Lane assignment par piste** : depuis C.1, le layout greedy est
  calculé indépendamment pour chaque piste (clips filtrés par trackId).
  Chaque piste a son propre `laneCount` et sa propre hauteur de
  corridor (`max(1, laneCount) × trackHeight`). Les bornes de resize
  (`computeBounds`) sont aussi filtrées par piste.
- **`tracks` dans COMPOSER_FIELDS** : inclus pour que CREATE/DELETE/
  RENAME_TRACK soient undoable. Conséquence : un undo d'action
  Composer peut aussi revert un changement de hauteur de piste
  (SET_TRACK_HEIGHT). Compromis accepté — la hauteur est un détail
  d'UI, pas une donnée métier.
- **Invariant `lastAnchorClipId ↔ selectedClipIds`** (E.7.1) : quand
  la sélection est non vide, l'anchor doit être égal au dernier clip
  sélectionné. Toutes les actions métier respectent déjà cette règle ;
  le helper `syncAnchorWithSelection(state)`, appliqué en sortie de
  `withUndo` sur chaque action (idempotent : retour direct si déjà
  aligné), garantit l'invariant dans les chemins UNDO/REDO qui ne
  mettent pas l'anchor à jour (anchor est non undoable). Corrige la
  classe de bugs où la sélection restaurée par un undo divergeait
  de l'anchor.
- **Settling frame pour animation drop drag** (E.7.6) : le retrait
  de la classe `is-dragging` (et donc le passage de `transition: none`
  à `transition: top 0.35s`) conjugué au changement de `top` dans
  le même frame ne déclenche pas la transition (race condition CSS
  Transitions). Solution : état local `settlingTops` dans Timeline
  qui capture `el.style.top` au mouseup, l'impose comme override
  inline pour le frame post-commit, et le libère via
  `requestAnimationFrame` au frame suivant. Permet à la transition
  de s'appliquer sur un changement de top détecté après activation
  de la transition-property.
- **Jamais de discontinuité dans le signal audio** (E.9) : un
  changement brutal de gain (saut 0→amp) ou une coupure d'oscillator
  en pleine phase (osc.stop() sans rampe) produit un clic audible.
  Règle : toute transition d'amplitude passe par une rampe ≥ quelques
  ms. Matérialisée par deux constantes :
    - `MIN_ATTACK = 0.003` (`audio.js`) : plancher appliqué via
      `Math.max(user_attack, MIN_ATTACK)` au démarrage de chaque
      voix. Concerne `WaveformEditor.playInstrumentNote` et les
      `scheduleXxxClip` de `usePlayback`. Sous le seuil perceptif
      d'attaque (~10 ms) → l'utilisateur ne "ressent" pas la
      contrainte.
    - `RETRIGGER_FADE = 0.008` (`WaveformEditor.jsx`) : durée du
      micro-fade-out appliqué à la voix précédente quand une note
      est retriggerée. La nouvelle voix démarre immédiatement, les
      deux se superposent 8 ms — imperceptible mais pas de clic.
  Pattern récurrent pour tout fade programmatique : capture
  `gain.value` AVANT `cancelScheduledValues`, sinon l'annulation
  fait retomber le param sur le dernier `setValueAtTime` antérieur
  et la valeur lue est fausse (voir aussi E.8 pour le release ADSR).
- **Format `.osa` = magic `OSA2` + gzip(JSON) versionné avec injection
  4 octets garbage à offset 10 du flux gzip** — zéro dépendance npm
  (CompressionStream natif). L'injection mid-stream casse les
  archiveurs permissifs (7-zip et al.) qui scannent la signature gzip
  à n'importe quel offset : ils détectent le `1F 8B` à offset 4 du
  fichier, tentent la décompression, et échouent immédiatement sur la
  corruption du premier bloc DEFLATE. C'est de la **dissuasion casual
  uniquement** — un lecteur de code source trouve l'offset en 2 minutes.
  Tout changement incompatible du schéma → bump version (`migrateVNtoVN+1`
  explicite à l'import) ou bump magic (`OSA3`) si on change le wire
  format. Pas de tolérance silencieuse.
- **IDs régénérés à l'import (jamais d'overlap)** — garantit que
  les clips de la timeline ne peuvent jamais être affectés par un
  import. Les `folderId` / `parentId` internes au payload sont
  remappés via une table `oldId → newId`. **Règle non négociable.**
- **Validation strict-strict des fichiers `.osa`** — un seul champ
  malformé = rejet complet. Pas de tolérance partielle. Raison :
  un fichier partiellement importé est une banque dans un état
  indéterminé, source de bugs subtils plus tard.
- **Pas de compression du localStorage** (décision *contre*) — on
  compresse au transport (`.osa`), pas au stockage actif. Le path
  chaud localStorage doit rester synchrone et bon marché. Si la
  pression sur le quota devient réelle, IndexedDB (async-natif,
  gros quota) ou quantification des points, pas gzip-in-localStorage.
- **Modale comme primitive partagé** (`Modal.jsx`) — pattern
  manuscrit léger (backdrop, Escape, focus trap basique), réutilisé
  par les modales import / export. Pas de framework UI. Si une 4ème
  modale émerge, vérifier la cohérence d'UX (backdrop close-on-outside,
  animation, padding) plutôt que diverger.

- **Spectrogram : double mode statique/live, toggle explicite** — le
  statique reste la vue par défaut (DFT canonique d'un cycle du dessin),
  le live consomme l'AnalyserNode du WaveformEditor pendant les notes
  test. Un bouton "Live" dans le header bascule explicitement entre les
  deux modes. **Évolution** : l'iter I phase 1 avait initialement choisi
  l'auto-switch (mode bascule automatiquement quand une voix joue,
  grace period 1s post-release pour éviter le flicker en jeu rapide).
  À l'usage, le retour utilisateur a montré que l'auto-switch est
  surprenant et complique la lecture comparative — le toggle explicite
  (option A du brainstorming initial) est plus prévisible. Refactor
  appliqué dans `4a22400` : compteur `activeVoicesCountRef` conservé
  comme primitive mais ne pilote plus le mode.

- **AnalyserNode Designer-only (scope α)** — le Spectrogram Designer
  ne reflète que les notes test du clavier piano, pas la lecture
  Composer (qui a son propre AnalyserNode dans usePlayback). Cohérent
  avec le placement du Spectrogram (Designer uniquement). Si on veut
  un Spectrogram Composer un jour, c'est une feature séparée.

- **Refs partagés entre WaveformEditor et Spectrogram** (`analyserRef`,
  `activeVoicesCountRef`) gérés par App — pattern de coordination
  cross-composant pour éviter re-renders à 60fps. Précédent :
  `editorRef` (imperative handle) existant déjà entre App et
  WaveformEditor.

- **Compteur `activeVoicesCountRef` côté WaveformEditor** — primitive
  utile au-delà du spectrogramme (indicateur visuel "ça joue", limiteur
  de polyphonie, etc.). Décrémentation via `osc.onended` (event natif
  Web Audio) qui fire quand l'oscillator s'arrête effectivement
  (release naturel OU osc.stop() forcé via retrigger / stopAll). Plus
  précis qu'un `setTimeout` planifié au start (qui sous-évaluait la
  durée des notes en sustain long). Guard anti-dérive `Math.max(0, …)`.
  `stopAllInstrumentNotes` reset explicitement à 0 (cleanup forcé).

- **Snapshots undo Designer : exclure les `editor.test*` fields** — les
  champs preview du clavier (testNoteIndex, testOctave, testTuningSystem,
  testFrequency) sont mutables hors undo : leur intent est "quelle touche
  je teste en ce moment", pas "à quoi je veux revenir avec Ctrl+Z".
  Implémentation (commit `68a58f1`) : `pickFields` filtre ces champs au
  snapshot, `restoreSnapshot` deep-merge editor au restore pour préserver
  les test* fields courants. Symétrique : ce qui n'est pas snapshotté
  n'est jamais restauré. Pattern applicable à tout futur "preview/transient"
  state qu'on voudrait exclure de la pile undo.

- **Cache "déjà dessiné" basé sur le succès effectif du draw** — la
  rAF loop du Spectrogram ne marque sa cache `lastPoints/lastFrequency/
  lastDbScale` qu'**après** que `drawStatic` ait réussi (canvas sizé,
  dimensions valides). Si le draw échoue (e.g. canvas pas encore
  dimensionné au mount initial), la cache reste invalide et le prochain
  tick réessaiera. Évite le bug de "cache marquée mais draw raté" qui
  laissait le Spectrogramme vide au chargement.

- **FFT truncation à N/2+1 = 257 coefficients** (iter-M phase-1, bump
  128→256) — pour un signal réel d'entrée, les k=257..511 de la FFT sont les
  conjugués miroirs de k=1..255 (information redondante). Mais
  `createPeriodicWave` les traite comme des harmoniques indépendants à des
  fréquences `k×f`, produisant des "parasites" audibles. On tronque à
  k=0..256 avant `createPeriodicWave`. `NUM_SAMPLES = 512`,
  `HALF_HARMONICS = 257`, `HARMONIC_COUNT = 256`. Le bump récupère la
  richesse que les 600 points portaient et qu'on jetait au rééchantillonnage :
  les **basses** (G2 ≈ 98 Hz → ~204 harmoniques audibles, dont 128 seulement
  livrées avant) gagnent leur plein potentiel ; au-dessus de ~156 Hz aucun
  changement (les harmoniques manquantes passaient > 20 kHz). Le slider
  **Définition** (1..256, per-patch) tronque en aval à M/256 pour nettoyer un
  dessin sans quitter la 2D — troncature dans `pointsToPeriodicWave`, pas dans
  le cache spectral.

- **FFT Cooley-Tukey radix-2 in-place** — remplace la DFT naïve O(N²)
  par un algorithme O(N log N) (~30 lignes JS pur, zéro dépendance).
  Speedup ~30× pour N=256. Pas critique en performance mais aligné
  avec sobriété énergétique. Self-test en dev mode garantit la
  correctness numérique. Convention `exp(-iθ)` préservée — équivalence
  numérique avec la DFT naïve précédente (sons inchangés sur les
  patches existants).

- **Cache memoization de `pointsToHarmonics` via WeakMap** — keyed par
  référence du buffer `points`. Cache hit naturel quand le dessin n'a
  pas changé (le reducer crée des nouveaux arrays sur modif → référence
  différente → cache miss → recalcul). WeakMap garantit pas de fuite
  mémoire (entrée GC'd quand le patch est supprimé). Le cache est
  partagé entre playback audio et Spectrogram statique → une seule
  transformation par changement de dessin.

- **Limites Web Audio à haute fréquence — acceptées** — après iter-J,
  la vérification manuelle a révélé plusieurs comportements observables
  à hautes fréquences (≥ B6/2 kHz) : (1) le live FFT affiche moins
  d'harmoniques que le statique car l'anti-aliasing interne de
  `createPeriodicWave` applique un rolloff progressif près de Nyquist
  (24 kHz à 48 kHz sample rate) au lieu d'un cut net, (2) les amplitudes
  des harmoniques individuelles sont non-monotones (scalloping FFT de
  l'AnalyserNode + interpolation wavetable + aliasing résiduel près de
  Nyquist), (3) certains peaks à très hautes fréquences (~G#9, 13 kHz+)
  décroissent visuellement à -80 dB même si l'audio reste stable
  (artefact interne createPeriodicWave). Ces phénomènes sont des
  **conséquences attendues du modèle PeriodicWave + AnalyserNode** et
  ne sont pas un bug du code applicatif. Les corriger demanderait un
  refactor majeur vers `AudioWorkletNode` (synthèse custom sample-par-
  sample en thread audio dédié, avec anti-aliasing custom). Backlog.

- **Bibliothèque multi-mode (5 combinaisons valides)** — Tree × List/Details
  + Nav × List/Details/Tiles. Tiles caché en mode Tree (incohérent
  visuellement). État `bibHierarchyMode` et `bibDisplayMode` persistés
  partagés entre instances Designer et Composer (un seul jeu de
  préférences globales). Default `'nav'` + `'list'` au load.

- **Sélection comme concept UX distinct de `currentPatchId`** —
  `bibSelectedIds` est la sélection visuelle multi-items dans la
  bibliothèque ; `currentPatchId` reste le patch chargé dans le
  Designer. Simple clic sélectionne, double-clic ouvre/charge.
  Cohérent avec les file explorers modernes.

- **Anti-cycle paste/drag via `wouldCreateCycle`** — toute opération
  qui prend un folder pour cible doit refuser le folder lui-même ou
  tout descendant. Helper centralisé dans `src/lib/bibTransfer.js`,
  appelé par `PASTE_BIB_CLIPBOARD` et `MOVE_BIB_ITEMS`. Notification
  utilisateur en cas de refus (`SET_NOTIFICATION` dispatch).

- **Clipboard transient, PASTE/MOVE undoable** — `bibClipboard`,
  `bibSelectedIds`, `bibSelectionAnchor` non persistés, non undoable
  (UI state). `PASTE_BIB_CLIPBOARD` et `MOVE_BIB_ITEMS` dans
  `DESIGNER_UNDOABLE` (mutent patches/folders).

- **Lasso selection via `data-bib-item-id`** — chaque DOM node d'item
  (chip, folder row, tile) porte des attributs `data-bib-item-id` et
  `data-bib-item-type`. Le hit-test du lasso itère `querySelectorAll`
  + `getBoundingClientRect()`. Robuste aux indentations variables
  (tree mode) et aux changements de display mode.

- **Composants extraits pour la croissance de PatchBank** — quatre
  nouveaux composants (`BibBreadcrumb`, `BibContextMenu`,
  `PatchThumbnail`, `PopupResizer`) extraits pour maintenir
  `PatchBank.jsx` à une taille gérable (~700 lignes après refonte).
  Convention : un sous-élément qui dépasse ~80 lignes mérite son
  fichier.

- **3 sous-applications autonomes** (Bibliothèque, Designer, Composer)
  avec piles undo séparées (`history.library`, `history.designer`,
  `history.composer`). Chaque onglet a son cycle de vie, son raccourci
  Ctrl+Z. Co-dépendances : delete patch utilisé bloqué avec modal +
  lien Composer ; suppression du currentPatch vide le Designer.

- **Routing Ctrl+Z par activeTab** (`UNDO_LIBRARY` si `activeTab ===
  'library'`, etc.). Trivial et prédictible. Remplace le focus tracking
  introduit en phase 1 Task 11. Le keydown PatchBank ne traite plus
  Ctrl+Z (délégué à App.jsx).

- **`SAVE_PATCH` non-undoable** — action explicite via `SavePatchDialog`
  popup (location + nom validés par l'utilisateur). Suppression manuelle
  assumée. Évite le cross-cut entre piles Designer et Library.

- **Clipboard cut→copy après premier paste** — `bibClipboard.mode`
  bascule de `'cut'` à `'copy'` au premier paste. Items préservés pour
  multi-paste. Ghost `is-cut` disparaît naturellement.

- **`DELETE_BIB_ITEMS` batch atomique undoable** — multi-delete = 1
  action = 1 entrée undo. Détecte les patches utilisés en Composer,
  supprime les libres, retourne `pendingDeleteWarning` pour modal récap.

- **`skipUndo` flag dans `action.meta`** — extension générique pour
  bypasser le snapshot undo sur certaines actions contextuelles
  (ex : `CREATE_FOLDER` depuis le popup Save). Pattern réutilisable.

- **Sidebar Designer/Composer = `PatchPicker` lightweight** — composant
  ~155 lignes (Tree+List forcé, click=load Designer / drag-out Composer,
  aucune manipulation directe). Menu contextuel unique : "Ouvrir dans
  Bibliothèque" (dispatch `OPEN_IN_LIBRARY`). Réduit la complexité
  runtime des sidebars et clarifie le paradigme.

- **Onglet Bibliothèque en premier dans l'ordre visuel du header** —
  Bibliothèque, Designer, Composer. Cohérent avec flow logique
  ressources → édition → composition. `activeTab` default reste
  `'designer'` au premier load.

- **Right-click sur item non sélectionné met à jour la sélection** à cet
  item avant d'ouvrir le menu. Invariant garanti : "menu = sélection
  courante". Simplifie `handleCopy/Cut/Delete` (plus de fallback
  `contextMenu.id` ajouté en phase 1).

- **Table TOC Documentation = source unique (`src/docs/index.js`)**
  (iter-L phase-2.3). Tout article qui apparaît dans la sidebar de
  l'onglet Documentation est déclaré là, ordre du tableau = ordre
  d'affichage, groupage par champ `section`. Le format est extensible
  via `type` : `'markdown'` (source brute importée via le suffix `?raw`
  de Vite) ou `'generated'` (composant React dédié, dispatché par id
  dans `DocumentationTab`). Le pattern `type` permet d'ajouter un
  nouveau type d'article (auto-généré depuis un autre registre, ou
  page interactive) sans changer le contrat des entrées existantes —
  cohérent avec le pattern d'extension F.3 (registre tempéraments) et
  L.1 (table SHORTCUTS) : on étend en ajoutant des entrées, pas en
  modifiant le schéma. Ajouter un article rédigé = ajouter un `.md`
  + une entrée. Ajouter un article généré = créer le composant +
  ajouter un cas dans le dispatch + une entrée.

- **Renderer Markdown maison = convention "pas de lib externe"**
  (iter-L phase-2.2). `src/lib/markdown.js` est un parser ~200 lignes
  en JS pur (deux passes : blocs ligne-par-ligne, inline scan/flush)
  qui couvre le sous-ensemble V1 nécessaire à la documentation interne
  (H1-H4, paragraphes, listes ord/non-ord avec 1 niveau d'imbrication,
  blockquote, code block fenced, gras/italique, code inline, liens,
  images, `<DocLink>`). Pas de dépendance npm cohérent avec la
  posture stack minimale du projet, et la grammaire est volontairement
  petite — pas de tableaux, footnotes, strikethrough, HTML brut (sauf
  DocLink intercepté). Limites connues : pas d'escape `\*`, les
  parenthèses non-encodées dans une URL d'image cassent le regex
  (workaround : URL-encoder en `%28`/`%29`). Si une fonctionnalité
  manque pour un futur article, étendre le parser plutôt que d'ajouter
  remark/markdown-it.

- **Math renderer maison, LaTeX-like, pas de KaTeX** (iter-L phase-R).
  Le besoin réel (musique/tempéraments) est petit et le restera : ratios
  (`3:2`), cents, exposants (`2^{1/12}`), fractions (`\frac{3}{2}`),
  indices, ~12 symboles grecs/opérateurs. ~100 lignes (sous-parser
  `src/lib/mathParse.js` + rendu dans MarkdownRenderer + CSS) plutôt
  qu'une dépendance KaTeX (~280 ko) — cohérent avec « no npm dep ».
  Délimiteurs `$…$` (inline) / `$$…$$` (block centré). Trois choix
  structurants : (1) **syntaxe LaTeX-like** (pas de DSL visuel maison)
  pour la **réversibilité** — si le besoin explose un jour, passer à
  KaTeX ne touche pas aux articles. (2) **Accolades obligatoires**
  (`^{x}`, pas `^x`) pour désambiguïser la fin de l'exposant sans
  parser de précédence. (3) **mathAst construit au parse** (pas de
  `content` brut différé au rendu) : le renderer reste un dispatch pur,
  et le mémo par `source` de MarkdownRenderer couvre le parse math
  gratuitement. Italique auto sur lettres latines isolées **à
  l'intérieur des délimiteurs uniquement** (convention LaTeX des
  variables ; n'affecte jamais le texte hors `$`). Périmètre
  volontairement borné — **hors scope** : matrices, intégrales, sommes,
  racines, vecteurs, environnements `\begin{…}`. La ligne maison ne
  tient que si elle reste petite : étendre ponctuellement au besoin,
  ne jamais anticiper. Commande inconnue / construct mal formé → rendu
  littéral + `console.warn` en dev, jamais de crash. Pas d'escape `\$`
  en V1 (cohérent avec l'absence d'escape `\*`) : un `$` non apparié
  reste littéral.
  **Révision 2026-05-28 (phase R.4)** : ajout des **délimiteurs
  extensibles** `( )` et `[ ]`, sur décision archi — la forme correcte
  de `(3/2)^12` au tableau exige des parenthèses qui grandissent avec la
  fraction. Implémenté sans `\left\right` ni mesure JS : appariement des
  délimiteurs au parse (`matchDelim`, respecte parenthèses + accolades),
  et au rendu, si le contenu contient une fraction, les bords sont
  **dessinés en CSS** (bordure + `border-radius` vertical en %) dans un
  `inline-flex; align-items: stretch` qui les étire à la hauteur du
  contenu. Contenu sur une ligne (`(n/12)`) → glyphes littéraux normaux
  (pas de régression). Reste hors scope : matrices, intégrales, racines —
  la ligne maison ne tient que petite.

- **Persistance Documentation : double sink localStorage +
  sessionStorage** (iter-L phase-2.1). Les *préférences UX* de la
  sidebar TOC (`docSidebarCollapsed`, `docSidebarWidth`) vivent en
  localStorage avec les autres prefs sidebar — l'utilisateur veut
  retrouver son réglage au jour suivant. La *position de lecture*
  (`doc.currentArticleId`, `doc.scrollPositions`) vit en
  sessionStorage sous une clé dédiée `synth-app-doc-session` — elle
  est restaurée pendant qu'on bascule entre onglets dans la même
  session, mais elle est jetée à l'ouverture d'une nouvelle session
  pour ne pas surprendre l'utilisateur ("pourquoi suis-je au milieu
  de cet article ?"). Hydratation au boot via `loadDocSession()`
  défensive (types filtrés silencieusement) ; aucune migration en
  cas de format inattendu.

## Contraintes implicites

Conventions tacites. Les enfreindre sans raison crée des bugs subtils.

- **TypeScript incrémental** (depuis Iteration M, préalable A) : `allowJs`,
  `checkJs:false`, `strict:false`, `noEmit` ; migration fichier par fichier,
  pas de big-bang. Les types du modèle vivent dans `src/types.ts` (source de
  vérité du modèle, plus seulement « TS-like » dans ce doc). Ne pas activer
  `strict:true` global ni ajouter de lib de types lourde sans validation archi.
- **Modèle unifié (M rattrapage)** : `cap` (1..256) remplace `definition` (tracé)
  ET `N` (barres) ; `editor.currentLens` (`'free'|'spline'`, M.r.3.2) est
  **volatile** (non persisté en localStorage, non écrit dans `.osa`) ; le résidu
  (`residual`) vit sur l'editor ET le patch. `.osa` : `OSA_VERSION = 2`, l'import
  accepte v1 (legacy, migré à l'hydratation) et v2. Migration idempotente
  `reducer.migrateLegacyPatch` — une implémentation, deux call-sites
  (localStorage + import .osa).
- **Reset vs Normaliser vs Nouveau patch (M.r.2, portée resserrée r.2.6.1)** :
  trois actions distinctes. `RESET_EDITOR_WAVEFORM` (bouton Reset) réinitialise
  **le timbre seul** (canonical = silence, ancres aplaties, interpolation =
  défaut, résidu nul, preset null) mais **préserve le `cap`** (plafond
  d'harmoniques) **et le nombre d'ancres** — resserrement r.2.6.1/.3 vs l'ancienne
  remise du cap à 256 et du compte à 8. Ne touche pas non plus ADSR / amplitude /
  test* / visualCue* / currentLens / currentPatchId. Distinct de `RESET_EDITOR`
  (Ctrl+Alt+N « Nouveau patch »), qui reste l'outil de **remise à zéro complète**
  de l'éditeur (cap + ancres inclus). `NORMALIZE_EDITOR_CANONICAL` (bouton Normaliser)
  exécute l'iDFT à phase canonique. **M.r.4** : `disabled` quand
  `editor.canonicalNormalized` (plus de no-op à 1 cran undo possible).
- **Re-fit auto des ancres = uniquement les voies non-spline (M.r.3)** : seules
  les 5 actions qui *écrivent* canonical par une autre voie (cf. Décisions
  architecturales) appellent `refitAnchorsAndResidual`. Les actions suivantes
  **n'invoquent PAS** le re-fit, chacune pour une raison documentée dans le
  reducer : `MOVE_SPLINE_ANCHOR` / `ADD_SPLINE_ANCHOR` / `REMOVE_SPLINE_ANCHOR`
  (édition *explicite* des ancres ; un re-fit annulerait le geste — le résidu
  préservé porte les détails du tracé original) ; `SET_SPLINE_INTERPOLATION` (ne
  change pas les ancres, juste `canonical = spline(anchors, new_interp) + résidu`) ;
  `SET_EDITOR_ANCHOR_COUNT` (re-fit explicite déjà câblé, c'est sa raison d'être) ;
  `RESET_EDITOR_WAVEFORM` (aplatit explicitement les ancres au count courant) ;
  `SET_EDITOR_CAP` (ne touche pas la canonical — la troncature vit dans la chaîne
  audio, `pointsToPeriodicWave`).
- **Flag `editor.canonicalNormalized` (M.r.4)** : propriété de l'histoire de
  l'éditeur (≠ détection numérique — le round-trip FFT n'est pas idempotent, cf.
  Décisions). `DEFAULT_EDITOR.canonicalNormalized = true` (canonical = 0 =
  iDFT(0)). Chaque action qui *écrit* canonical le repositionne explicitement —
  un oubli n'est PAS attrapé par typecheck/lint. Tableau exhaustif :
  - **→ `true`** : `NORMALIZE_EDITOR_CANONICAL`, `SET_EDITOR_HARMONIC_AMPLITUDE`
    (iDFT phase canonique par construction), `LOAD_PRESET`,
    `APPLY_EDITOR_PRESET('sine')` (sin pur), `RESET_EDITOR_WAVEFORM` (silence),
    `RESET_EDITOR` (hérite de `DEFAULT_EDITOR`).
  - **→ `false`** : `SET_EDITOR_CANONICAL` (tracé libre, phase arbitraire),
    `MOVE`/`ADD`/`REMOVE_SPLINE_ANCHOR` (`splinePlusResidual` ≠ iDFT canonique),
    `SET_SPLINE_INTERPOLATION`, `SET_EDITOR_CAP` (change l'interprétation des
    barres — conservative), `HYDRATE_EDITOR_FROM_PATCH` (flag non persisté → phase
    inconnue au rechargement ; la branche patch null hérite `true` = silence),
    `APPLY_EDITOR_PRESET('square'|'sawtooth'|'triangle')` (formes stepped, phase
    non-canonique au sens DFT — la refonte presets en séries de Fourier, backlog,
    basculera les 4 à `true`).
  - **inchangé** : `SET_EDITOR_ANCHOR_COUNT` (re-fit ancres + résidu mais NE
    touche pas canonical), `SET_EDITOR_CURRENT_LENS`, `SET_EDITOR_AMPLITUDE`,
    `SET_EDITOR_ADSR`, etc. (le spread `...state.editor` préserve la valeur).
- **`DEFAULT_EDITOR.canonical` = silence (canonical à zéro)**. La passe d'usage
  M.r.2.5 a annulé la sin fondamentale de M.r.2.2 (décision utilisateur : ne pas
  imposer un timbre arbitraire) — `DEFAULT_EDITOR.canonical` et
  `RESET_EDITOR_WAVEFORM` repartent du silence. `RESET_EDITOR` en hérite.
- **Pas de chemin utilisateur vers la lentille 'bars' (M.r.2.4)** : les barres
  d'harmoniques s'éditent directement (zone Harmoniques toujours éditable), le
  switch Forme d'onde ne bascule qu'entre 'free' et 'spline'. `cap` a un contrôle
  unique (header Harmoniques) ; les alias `editorActions.setN`/`setDefinition`
  sont supprimés (seul `setCap`).
- **IDs via compteurs persistés** (`soundCounter`, `clipCounter`,
  `folderCounter`, `trackCounter`) : jamais les recalculer depuis `.length`.
  Après des suppressions, deux créations successives auraient le même
  ID → collisions silencieuses.
- **Snapshots historique : mouseup pour gestes continus, dispatch direct
  pour contrôles discrets**. Un dropdown / un toggle / un clic preset
  dispatche directement (1 action = 1 snapshot). Un drag / un dessin /
  un slider utilise un draft local puis un dispatch unique au relâchement.
- **Non persisté dans localStorage** : `zoomH`, `zoomV` (par track),
  `selectedClipIds`, l'éditeur (drafts + state complet), l'historique
  undo/redo, `currentSoundId`, `composerFlash`. Au reload on retombe
  sur un état "propre" côté UI, seules les données métier survivent.
- **Lanes = affichage, pas de champ Clip** : le lane assignment est un
  calcul greedy au rendu (O(n) à chaque render de Timeline), jamais
  stocké dans le type Clip. Ne pas ajouter de champ `lane` au modèle.

## Itération terminée : A — Refonte UX core

Découpée en 6 phases. Voir le brief original pour les détails.
Phases listées ci-dessous dans l'ordre chronologique d'implémentation.

- ✅ **Phase 1** — Refonte modèle de données + migration (Note→Clip, +Track,
  +SoundFolder, +numMeasures, IDs préfixés, migration localStorage transparente)
- ✅ **Phase 2** — Layout split en 2 onglets (Designer / Composer) + responsive,
  banque partagée, mini-player, hydratation de l'éditeur, dual-save (Mettre à jour
  / Enregistrer comme nouveau), dirty check sur switch
- ✅ **Phase 2.5** — correctifs UX : double-clic seul charge (clic simple = no-op),
  nom intelligent pour duplication ("X" en note, "Copie de X" en free, suffixe
  collision), `allowDuplicate` flag pour bypass dup detect en duplication explicite,
  bouton "Nouveau" (reset complet + currentSoundId=null), defaults amp=1 / release=200ms.
- ✅ **Phase 2.6** — sliders ADSR draggables (Attack/Decay/Sustain/Release), même
  source de vérité que le canvas (les deux contrôles éditent le state local) ;
  banque contextuelle : clic simple charge en Designer, double-clic only en Composer
  (`activeTab` prop sur SoundBank).
- ✅ **Phase 2.7** — surbrillance currentSound uniquement dans Designer (chip
  is-current masquée dans Composer où l'info n'est pas pertinente).
- ✅ **Phase 3.1** — input BPM avec validation différée (composant `BpmInput`,
  type=text, commit au blur/Enter, ±1/±10 via flèches+Shift, Échap annule).
- ✅ **Phase 3.2-3.6** — nouveau zoom % basé triple croche (2-1000%, défaut 5%),
  zoom V (hauteur lane 30-200px stockée dans `track.height`), sélecteur durée
  par défaut sorti des clips et déplacé dans Toolbar, grille rendue en lignes
  absolues avec subdivision adaptative (noire/croche/double/triple selon
  pxPerBeat), labels adaptatifs via container queries (`@container max-width:20px`),
  oscilloscope persistant + fade entre repos (ligne plate) et lecture (signal),
  Ctrl+molette zoom centré sur la souris.
- ✅ **Phase 3.5 (fixes)** — Échap BPM corrigé (flag skipBlurCommitRef + restore
  preFocusValue), alignement Properties Composer (colonnes grid symétriques).
- ✅ **Phase 3.5 (Designer layout)** — refonte en 2 colonnes : sidebar gauche
  (banque + mini-player stackés verticalement) + zone centrale en grid 2×2
  (waveform | spectrogramme / params+boutons | ADSR). Plus de sidebar droite
  ni de footer.
  WaveformEditor passe en render-prop `children({ renderCanvasArea,
  renderParamsArea, renderAdsrArea })` : son state reste dans le composant
  (hydratation, dirty check, imperative handle isDirty) mais le parent (App)
  place les 3 zones où il veut dans le grid.
  Canvases waveform + ADSR dynamiques via ResizeObserver. Points array découplé
  (POINTS_RESOLUTION=600) de la taille pixel du canvas. ADSR utilise setTransform
  pour préserver ses coordonnées virtuelles 400×120. Bouton "Play" éditeur
  renommé en "Test" (preview du son en édition, pas lecture timeline).
  Mini-player simplifié : plus de marqueurs de mesure, juste un trait qui avance.
- ✅ **Phase 3.6** — toggle spectrogramme fonctionnel (state `spectrogramVisible`
  persisté dans localStorage, toggle dans le header de la zone Waveform, cell
  spectrogramme retirée du DOM quand OFF), mini-player avec barre de progression
  intégrée (linear-gradient --progress sur un seul élément texte, plus de bar
  séparée), fréquence libre étendue à 20-20000 Hz avec slider log (conversion
  via sliderToFreq/freqToSlider, arrondi entier, affichage formatFreq "X Hz"
  ou "X.X kHz"), contrastes renforcés (bordures cards #2a2a4a→#3a3a5a, inputs
  #3a3a5a→#4a4a6a, chip-info #6a6a8a→#9aa2b8, empty text #5a5a7a→#8a8fa8).
- ✅ **Phase 3.7** — fréquence libre éditable au clavier. Nouveau composant
  `FreqInput.jsx` (modèle BpmInput : `type=text inputMode=decimal`, validation
  différée au blur/Enter, Échap restaure preFocusValue via skipBlurCommitRef,
  re-sync depuis props quand pas focus). Parser permissif : `"440"`, `"440.5"`,
  `"440,5"`, suffixe `"Hz"` optionnel et insensible à la casse. Commit =
  parse + clamp [20, 20000] + arrondi 0.1 Hz ; invalide → revient à la dernière
  valeur valide. Slider onChange stocke `freeFrequency` en flottant arrondi
  à 0.1 Hz pour que la grille du slider colle à la précision affichée.
  `formatFreq` unifié en Hz avec 1 décimale max (plus de conversion kHz).
  Le label fréquence passe de `<label>` à `<div>` pour ne pas focus l'input
  sur clic dans la zone.
- ✅ **Phase 4** — Édition de clips (sélection + Properties + drag + resize) :
  - **4.1** `selectedClipIds` (tableau, préparation multi-sélect phase B) géré
    dans App ; clic clip = sélection, clic zone vide = désélection, outline
    blanc 2px + shadow sur le clip sélectionné (classe `.is-selected`). Clic
    droit conservé pour suppression rapide. PropertiesPanel refondu :
    dropdown son (avec dot couleur), position "Mesure X, beat Y" en lecture
    seule, dropdown durée (7 options), bouton Supprimer. Si 0 clips :
    placeholder. Si >1 : "N clips sélectionnés — édition phase B". Global
    keydown Delete/Backspace supprime les clips sélectionnés (skip si focus
    input/textarea/select/contenteditable).
  - **4.2** Drag à la souris via `onMouseDown` sur clip : session unifiée
    avec refs mutables + listeners window installés à l'ouverture de la
    session (pas de ré-attachement sur chaque mousemove). Seuil 5px
    (distance euclidienne) différencie clic (commit select) vs drag (commit
    measure/beat). Snap 16ᵉ, clamp `[0, totalBeats - duration]`.
    `document.body.style.cursor = 'grabbing' + userSelect:none` pendant le
    drag, reset sur mouseup. Layout greedy se redébrouille au commit.
  - **4.3** Resize via zones de 7px aux bords G/D (overlay `.resize-handle`
    positionnées absolument, cursor ew-resize). resize-right modifie
    `duration` ; resize-left modifie `measure + beat + duration` (bord droit
    fixe). Snap 16ᵉ, min 0.25. Bornes pré-calculées au mousedown :
    `minStartLeft` = fin du clip précédent dans la même lane (ou 0),
    `maxDurationRight` = espace jusqu'au clip suivant (ou fin). Drag et
    resize unifiés dans un même système `interactionRef`/`interactionVisual`
    avec champ `mode: 'drag' | 'resize-left' | 'resize-right'`. Resize actif
    immédiatement, pas de seuil 5px.
- ✅ **Phase 5** — Mesures dynamiques : boutons +/− dans la toolbar Composer
  (section "Mesures" à côté de Hauteur), affichage du compte entre les
  boutons. Ajout : `numMeasures++`, pas de plafond, grille s'étend. Suppression :
  si la dernière mesure contient ou reçoit un clip débordant (critère
  `clipEnd > (numMeasures-1)*4`), confirm window listant le nombre de clips
  à supprimer ; si confirmé, filter les clips affectés + désélection, puis
  `numMeasures--`. Plancher 1 mesure (bouton `−` désactivé à `numMeasures === 1`).
  Pas de raccourci clavier. Insertion au milieu reportée en phase B.
- ✅ **Phase 5.1** — Manipulation contextuelle des mesures :
  - Section "Mesures" retirée de la toolbar.
  - × discret au survol de la dernière mesure (header `.measure-label.is-last-measure`)
    déclenche `onRemoveLastMeasure`. Masqué si `numMeasures === 1`.
  - Zone d'extension à droite de la grille (sibling de `.timeline-grid` dans
    le wrapper flex `.timeline-grid-wrapper`) avec 3 boutons `+1` / `+4` / `+16`.
    Fond hachuré pour signaler "extension".
  - Suppression revue : pour chaque clip dont la fin > début de la dernière
    mesure, on distingue **suppression** (clip entièrement dans la dernière
    mesure) vs **troncature** (clip qui commence avant et déborde, sa
    `duration` est ramenée pile à la limite). Confirm uniquement si ≥1
    suppression ; troncatures-only = pas de confirm + flash transitoire
    `composerFlash` rendu dans la toolbar (auto-clear 3s).
- ✅ **Phase 5.2** — Fix persistance `numMeasures` : `loadState` faisait
  `Math.max(persisted, maxClipMeasure, DEFAULT_NUM_MEASURES)` → un user qui
  réduisait à 8 mesures retombait sur 16 au reload. Suppression du 3ᵉ
  argument (plancher remplacé par `1`). Audit du reste : `savedSounds || []`
  et `soundCounter || 0` migrés vers `??` pour cohérence (pas de bug actif).
- ✅ **Phase 6.1** — Refactor : un seul `useReducer` (src/reducer.js) qui
  remplace une dizaine de useState d'App.jsx. State de l'éditeur de son
  remonté dans `state.editor` (points, freeMode, noteIndex, octave,
  freeFrequency, amplitude, ADSR, preset). WaveformEditor lit ses valeurs
  via la prop `editor` et dispatche via `editorActions`. Drafts locaux
  pour les gestes continus (canvas drawing, drag poignées ADSR, sliders) :
  pas de pollution d'historique pendant le geste, dispatch unique au
  mouseup/touchend/keyup/blur. Compteurs (sound/clip) en state mais hors
  snapshot pour ne pas reculer sur undo. Hydratation déclenchée dans App
  via `HYDRATE_EDITOR_FROM_SOUND` (non-undoable). Aucun changement de
  comportement utilisateur.
- ✅ **Phase 6.2** — Undo/redo avec piles séparées par onglet (Designer
  et Composer indépendants). `withUndo(reducer)` wrapper qui gère
  `UNDO_*` / `REDO_*` et enregistre les snapshots avant chaque action
  undoable. Profondeur 50 actions/pile, FIFO. Snapshots par champs :
  Composer = `[clips, numMeasures, bpm, selectedClipIds, tracks]`,
  Designer = `[savedSounds, soundFolders, editor]`. Vérification
  cross-onglet : un undo Designer qui ferait disparaître un son utilisé
  par des clips est bloqué + Toast d'erreur (composant Toast.jsx, auto-clear
  4.5s). Boutons ⟲/⟳ dans la toolbar Composer et dans l'en-tête de la
  zone Waveform du Designer. Raccourcis Ctrl/Cmd+Z (undo) et
  Ctrl/Cmd+Shift+Z / Ctrl+Y (redo) au niveau window, skip si focus dans
  input/textarea/select/contenteditable. Historique RAM uniquement (non
  persisté).

## Itération terminée : B — édition avancée

- ✅ **Phase 1** (2026-04-16) — Spectrogramme statique. Remplace le placeholder
  par un vrai afficheur de spectre synchronisé avec l'éditeur :
  - DFT 256 harmoniques extraite d'`audio.js` dans une fonction partagée
    `pointsToHarmonics(points)` qui retourne `{ real, imag, magnitudes }`.
    `pointsToPeriodicWave` l'utilise sans changement fonctionnel.
  - Nouveau composant `Spectrogram.jsx` : canvas ResizeObserver, axe X log
    20 Hz→20 kHz, axe Y linéaire normalisé par max(magnitudes), barres
    verticales cyan (#00d4ff) 2px par harmonique k à fréquence k×f0.
    Grille à 100 Hz / 1 kHz / 10 kHz avec labels. Canvas vide → message
    "Dessinez une onde pour voir le spectre".
  - **Lecture seule** : aucun état interne, aucune interaction. Se redessine
    uniquement quand `editor.points` ou la fréquence fondamentale changent
    (drafts locaux absorbent les gestes continus — le redraw n'a lieu qu'au
    mouseup). `amplitude` n'est PAS appliquée (le spectrogramme montre la
    forme harmonique, pas le volume).
  - `App.jsx` calcule `editorFrequency` (freeFrequency ou note tempérée) et
    passe `points` + `frequency` au composant. `SpectrogramPlaceholder.*`
    supprimés.
  - Toggle On/Off dans le header Waveform inchangé (phase A.3.6) ; spec
    reste masqué côté DOM quand OFF.
- ✅ **Phase 2** (2026-04-16) — Multi-sélection et opérations groupées.
  Découpée en 5 sous-commits indépendants pour isoler les régressions.
  - **2.1** Multi-sélection : clic replace, Ctrl+clic toggle, rectangle
    de sélection sur zone vide (pointillé cyan), Shift+drag additif,
    Ctrl+drag sur zone vide réservé (futur scroll B.2.6). Échap vide la
    sélection. API sélection consolidée sous `onSetSelection(ids)` — le
    caller (Timeline) calcule la nouvelle liste finale. Suppression des
    props `onSelectClip`/`onDeselectAll`.
  - **2.2** Drag multi : action `MOVE_CLIPS` atomique et undoable. Quand
    le drag démarre sur un clip d'une multi-sélection, tous les membres
    prennent le même delta ; bornes = intersection des bornes individuelles
    (le groupe s'arrête quand le membre le plus contraignant butte). Drag
    d'un clip hors sélection remplace la sélection puis drag mono.
    Aperçu visuel : tous les membres du groupe rendus à leur offset.
  - **2.3** Resize multi absolu (non-proportionnel) : action `RESIZE_CLIPS`
    atomique. `computeBounds` généralisé avec `excludeIds` (les autres
    membres du groupe ne se contraignent pas entre eux). Delta intersecté
    pour respecter les min/max individuels (MIN_CLIP_DURATION et clip
    suivant non-sélectionné). Resize-left gère l'ajustement de
    mesure/beat + durée (bord droit de chaque membre fixe).
  - **2.4** Duplication (Ctrl+drag sur clip) : action `DUPLICATE_CLIPS`
    atomique qui reçoit les positions/soundId/trackId des copies,
    attribue les ids à partir de `clipCounter+1`, remplace
    `selectedClipIds` par les copies. Ctrl+mousedown démarre une session
    dont l'issue est décidée au mouseup : sous seuil → toggle de
    sélection (via `preselectionIds` capturés au mousedown), au-delà
    → duplication à l'offset. Curseur `copy` pendant le drag, ghosts
    pointillés à l'offset pour le preview. `selectedClipIds` ajouté aux
    champs snapshot Composer pour que l'undo restaure la sélection pré-
    action.
  - **2.5** Suppression multi + Properties multi-sélection : helpers
    `layoutClips` + `computeBounds` extraits dans `src/lib/timelineLayout.js`.
    Nouvelles actions `UPDATE_CLIPS_SOUND` et `UPDATE_CLIPS_DURATION`
    (durées pré-clampées par bornes individuelles côté Panel).
    `PropertiesPanel` gère désormais 3 modes : vide, mono, multi. En
    multi : badge du compte dans l'en-tête, dropdown Son/Durée si
    homogène sinon "Sons mixtes"/"Durées mixtes" lecture seule, bouton
    "Supprimer la sélection" rouge. Raccourci Delete/Backspace déjà
    opérationnel via `DELETE_SELECTED_CLIPS` existant.
- ✅ **Phase 6** (2026-04-16) — Répertoires de sons. Banque refactorée en
  arborescence dépliable/repliable avec dossiers imbriqués. 2 commits :
  - **6.1** UI répertoires : SoundBank passe de liste plate à arborescence.
    Bouton "+ Dossier" (nom auto `nextAvailableFolderName`). Dossiers avec
    chevron ▶/▼, icône 📁, badge compteur, bouton × inline.
    Renommage par double-clic (✎ retiré des dossiers en C). Suppression bloquée si des clips
    référencent les sons (toast + auto-sélection + bascule Composer) ;
    sinon confirmation si dossier non-vide puis suppression directe.
    `folderCounter` persisté en localStorage. Actions reducer
    `CREATE_FOLDER`, `RENAME_FOLDER`, `DELETE_FOLDER` — toutes undoable
    (pile Designer). Tri alphabétique, état déplié/replié volatile (tous
    dépliés par défaut). Indentation 16px par niveau de profondeur.
  - **6.2** Drag dans l'arborescence : drag d'un son vers un dossier
    (`folderId = folder.id`) ou vers la zone racine (`folderId = null`).
    Drag d'un dossier vers un autre (`parentId = target.id`) avec
    protection anti-boucle (vérification récursive des descendants). Zone
    "Déposer ici → racine" affichée pendant le drag. Feedback visuel :
    surbrillance cyan sur la cible, opacité réduite sur l'élément draggé.
    Drag vers la timeline inchangé (`text/plain` payload préservé pour les
    sons, les dossiers n'en émettent pas). Actions `MOVE_SOUND_TO_FOLDER`,
    `MOVE_FOLDER` undoable (pile Designer). Tri alphabétique, pas de
    sortOrder custom.
  - **6.4** Refonte suppression sons/dossiers + check undo symétrique.
    La suppression cascade (son/dossier → clips supprimés) est remplacée
    par un **blocage avec assistance** : si des clips référencent le son
    (ou des sons du dossier), la suppression est bloquée, un toast
    s'affiche, les clips concernés sont auto-sélectionnés et on bascule
    vers le Composer pour que l'utilisateur les supprime manuellement.
    Si aucun clip ne référence : suppression directe (avec confirmation
    pour les dossiers non-vides). Retrait de `DESIGNER_CASCADE` /
    `DESIGNER_CASCADE_FIELDS` — les snapshots Designer ne capturent plus
    les champs Composer. `DELETE_FOLDER` et `DELETE_SOUND` ne touchent
    plus aux clips. Check undo Composer symétrique ajouté :
    `UNDO_COMPOSER` / `REDO_COMPOSER` vérifient via `checkClipReferences`
    que le snapshot à restaurer ne contient pas de clips dont le soundId
    est absent des `savedSounds` actuels ; si oui, toast d'erreur et
    undo bloqué. Le check undo Designer existant (`findOrphanReferences`)
    est simplifié (plus de branche cascade). SoundBank ne reçoit plus
    la prop `clips` (logique de blocage remontée dans App.jsx).
  - **6.5** Alignement undo bloqué avec le comportement de suppression
    directe. Quand `UNDO_DESIGNER` / `REDO_DESIGNER` est bloqué par
    le check de référence : auto-sélection des clips orphelins +
    bascule vers Composer. Quand `UNDO_COMPOSER` / `REDO_COMPOSER`
    est bloqué par des sons manquants : bascule vers Designer.
- ✅ **Phase 7** (2026-04-17) — Menu contextuel sur en-tête de mesure.
  - **7.1** Clic droit sur un numéro de mesure → menu contextuel avec
    "Supprimer cette mesure" (split/truncate/shift des clips affectés,
    confirmation si destructif), "Insérer avant…" / "Insérer après…"
    (input inline nombre de mesures, split des clips à cheval, shift).
    Actions reducer `DELETE_MEASURE` et `INSERT_MEASURES_AT`, undoable.
    Helpers `snapBeat`, `beatToMeasureBeat`, `clipAbsoluteStart`
    extraits dans le reducer. Phase 7.2 grisée dans le menu.
  - **7.2** Couper/Copier/Coller mesures. `measureClipboard` volatile
    en RAM (séparé du clipboard clips). Copier copie les clips de la
    mesure (tronqués aux bords) avec offsets relatifs. Couper = copie +
    suppression. Coller avant/après insère N mesures et y place les
    clips du clipboard. Actions `CUT_MEASURE`, `PASTE_MEASURES`,
    `SET_MEASURE_CLIPBOARD`. Boutons activés dans le menu contextuel.

## Itération terminée : C — Multipiste

- ✅ **Phase 1** (2026-04-17) — UI Multi-tracks (5 sous-commits, voir Roadmap)
- ✅ **Phase 2** (2026-04-17) — Mute/Solo/Volume par piste (voir Roadmap)
- ✅ **Phase 3** (2026-04-17) — Refonte moteur audio look-ahead (voir Roadmap)
- ✅ **Phase 4** (2026-04-17) — Adaptation features A/B au multipiste (voir Roadmap)

**Décisions UX clés (à mémoire pour Iter A)**
- Sauvegarde dans l'éditeur quand `currentPatchId` est non-null : 2 boutons distincts
  ("Mettre à jour" + "Enregistrer comme nouveau"). Action "Mettre à jour" undoable.
- Banque de patches : sidebar gauche (les 2 onglets, composant partagé).
- Properties panel : sidebar droite sur grand écran, bottom-sheet collapsible <1100px.
- Éditeur waveform : son state vit dans `state.editor` du reducer (undo couvre
  l'éditeur). `useEffect` hydrate l'éditeur quand `currentPatchId` change.
  Confirm si modifs non sauvegardées au moment du switch.

## État actuel

✅ **Terminé**
- Iteration M — phase M.3 (mode points/spline, 2026-05-30). 3ᵉ mode de
  fabrication de timbre, propre par construction. 3 sous-commits :
  - **3.1** `SplinePatch` (`mode:'spline'`, `anchors` 4..32, `interpolation`
    'soft'|'hard', **pas de `definition`**) ajouté à l'union ; `src/lib/spline.js`
    (`splineSoft` Catmull-Rom périodique via Hermite y(x) à voisins wrappés ±600,
    continuité C¹ à x=600↔0 ; `splineHard` polyligne périodique ; sortie
    `Float32Array(600)` clampée) ; reducer : `MOVE`/`ADD`/`REMOVE_SPLINE_ANCHOR`
    + `SET_SPLINE_INTERPOLATION` (undoable, draft commit côté éditeur),
    `sanitizeAnchors`, hydratation forward-compat localStorage. `points` =
    reconstruction (ombre), chaîne audio inchangée.
  - **3.2** `SplineEditor.jsx` (canvas courbe + poignées draggables façon ADSR,
    clic = ajout, Suppr/clic droit = retrait, toggle Doux/Anguleux) ; dispatch
    dans `WaveformEditor.renderCanvasArea` ; couplage Harmoniques read-only
    montrant la DFT **pleine** (pas de `definition` en spline) + 🔒.
  - **3.3** Passerelle étendue : `ConvertToSplineDialog` (N ancres défaut 8 +
    interpolation, réutilisé draw→spline et harmonic→spline), spline→draw
    (`ConfirmDialog`, `CONVERT_EDITOR_TO_DRAW` rendu mode-agnostique sur
    `editor.points`), spline→harmonic (`ConvertToHarmonicDialog`, DFT). 2 boutons
    par mode actif, conversions atomiques, snap proportions (spline = ½¼¼).
    osaFormat + libraryTransfer round-trip `.osa` du mode spline.
  - **Hors scope** : presets de formes spline → M.4 ; auto-fit depuis un tracé →
    backlog ; B-spline/Bézier → non retenu (Catmull-Rom + polyligne).
- Iteration M — phase M.2-AS (toggle auto-sizing, **livré en essai** —
  keep/drop avant clôture M, 2026-05-30). Opt-in, OFF par défaut, posé
  **par-dessus** l'état de proportions de M.2 (il l'écrit ; aucun nouvel état
  canonique). 3 sous-commits :
  - **AS.1** Champ `autoSizing: boolean` (initial `false`, persisté localStorage,
    action `SET_AUTO_SIZING` non undoable) + toggle « Dimension auto » dans la
    barre des presets. OFF → comportement M.2 strictement inchangé.
  - **AS.2** Focus contextuel : listener `mousedown` (capture) attaché
    uniquement quand ON. 3 états stables — focus Forme d'onde `[0.6,0.2,0.2]`,
    Harmoniques `[0.2,0.6,0.2]`, Spectro/repos `[0.2,0.2,0.6]` (le repos *est*
    le focus-spectro, pas de 4ᵉ état). Focus **volatile** (ref, non persisté) :
    activation/ouverture/sortie = repos. Clic hors widget → repos ; clics sur
    la barre presets/toggle neutres (préserve le « figer en basculant OFF »).
  - **AS.3** Anti-conflit (quand ON) : (1) séparateur = cible indépendante, son
    drag écrit comme en manuel, le prochain changement de focus l'écrase (pas
    de pinning en auto) ; (2) le clic qui *change* le focus ne fait que focuser
    — guard (ref partagé `DesignerColumns`→`WaveformEditor`) levé le temps du
    geste, canvas/barres s'abstiennent, l'édition reprend au geste suivant ;
    (3) sortie → repos. **Retrait éventuel (« jeter ») = supprimer le toggle +
    le `useEffect` de focus + le champ persisté → retour à M.2 intact.**
- Iteration M — phase M.2 (layout 3-vues + Patch typé + éditeur Harmoniques +
  passerelle, 2026-05-30). 5 sous-commits :
  - **2.1** Patch typé : union discriminée `Patch = DrawPatch | HarmonicPatch`
    par `mode`. `audio.harmonicsToPoints` (iDFT) reconstruit `points` pour un
    patch harmonique → toute la chaîne audio (playback/export/miniatures) reste
    mono-chemin sur `points`, zéro modif. Hydratation rétro-compat (mode absent
    → 'draw'), SAVE/UPDATE/HYDRATE/RESET mode-aware, round-trip `.osa`.
  - **2.2** Layout 3 colonnes (`DesignerColumns`) Forme d'onde / Harmoniques /
    Spectro : presets + séparateurs glissables, `designerColumnWidths` persisté
    (défaut par mode). Spectro = colonne permanente (toggle « Spectro » retiré,
    `spectrogramVisible` vestigial).
  - **2.3** Éditeur Harmoniques : N barres bleues éditables (drag vertical,
    1 barre/geste, bouton N 16..256) ; en mode dessin, read-only = magnitudes
    DFT tronquées à `definition` (🔒).
  - **2.4** Vue éditable suit le mode (l'autre → read-only 🔒) ; Forme d'onde
    read-only en harmonic (reconstruction iDFT) ; slider Définition masqué.
  - **2.5** Passerelle : « Convertir en Harmoniques » (dialog choix N, DFT +
    troncature) / « Convertir en Dessin » (iDFT) — conversions atomiques
    undoables. **Follow-up** : la conversion snappe `designerColumnWidths` au
    défaut du mode cible (la vue éditable récupère sa largeur de référence).
  - **Hors scope traité ailleurs** : toggle auto-sizing → M.2-AS (séparée) ;
    mode spline → M.3 ; presets → M.4 ; doc/renderer `\sum` → M.5.
- Iteration M — phase M.1 (bump cap 256 + slider Définition, 2026-05-30).
  SC1 : `NUM_SAMPLES` 256→512, cap harmoniques 128→256 (rééchantillonnage
  600→512, même troncature miroir-conjugué). Les basses récupèrent jusqu'à
  ~128 harmoniques audibles ; au-dessus de ~156 Hz, aucun changement. Stade
  dev → pas de migration localStorage. SC2 : champ `Patch.definition`
  (1..256, défaut 256) + slider « Définition » dans la colonne de paramètres
  du Designer (readout « N / 256 »), troncature M/256 appliquée en aval dans
  `pointsToPeriodicWave` (preview live, lecture Composer, export WAV) ; le
  spectro statique reflète le couperet. `editor.definition` +
  `SET_EDITOR_DEFINITION` (undoable designer), mirroré au save, hydraté depuis
  le patch ; rétro-compat localStorage + imports `.osa` → 256 injecté.
  Reste mono-mode (le typage `draw`/`spline`/`harmonic` vient en M.2).
- Iteration M — préalable B (francisation des libellés, 2026-05-29). Graine
  i18n via `src/lib/strings.js` (clés sémantiques → FR, sans lib i18n). SC1 :
  audit (`archi/M0-audit-francisation.md`) + centralisation (refactor neutre,
  composants consommant les clés). SC2 : traductions claires — onglets
  Designer→Création / Composer→Composition (+ toutes leurs références),
  Forme d'onde, presets, étapes AHDSR (Attaque/Tenue/Déclin/Maintien/
  Relâchement), Mute→Sourdine, root→Racine. Cas « à arbitrer » tranchés par
  l'archi (2026-05-29, révision AHDSR le 2026-05-30) : Play/Stop→Lire/Arrêter,
  Export…→Exporter…, Test→Tester, Peak→Crête, Live→Direct, Canvas vide→Zone de
  dessin vide, Hold→Tenue, Sustain (+ pédale Espace)→Maintien ; conservés :
  Spectro, Solo, OK.
- Iteration M — préalable A (migration TypeScript, phases 0+1, 2026-05-29).
  Adoption TS **incrémentale** posée avant la perf et avant M.2 (Patch typé) :
  devDep `typescript` + `tsconfig.json` (allowJs/noEmit/strict:false) ;
  `src/types.ts` (modèle actuel typé — Patch/Clip/Track/TuningSystem/AppState +
  union discriminée `Action`) ; `tuningSystems.js → .ts` (registre central) ;
  câblage JSDoc des types sur le reducer. Zéro changement runtime (bundle vite
  byte-identique, lint vert, `tsc --noEmit` clean).
- Iteration L phase 5 (corpus utilisateur) + clôture — **release v1.4.0,
  Itération L close** : documentation complète rédigée par l'agent writer.
  Corpus : 2 glossaires (technique, musical), 4 articles de vulgarisation
  (« Comprendre » : forme d'onde, piano pas juste, 12 notes, tempérament),
  12 fiches tempéraments (une par système du registre), 3 guides de prise en
  main (Designer, Bibliothèque, Composer), article « Limites connues »
  (périmètre V1 assumé). TOC à 6 sections (Le projet / Prise en main /
  Comprendre / Concepts / Tempéraments / Référence). Clôture : rebranchement
  des DocLink, retrait de `_renderer-test.md`, ancres `data-anchor` posées
  (export / + Piste / amplitude / nouveau dossier), bump 1.3.0 → 1.4.0
  (`package.json` + `about.md`). Zéro npm ajouté sur toute l'itération.
- Iteration L phase R (extension renderer Markdown — math maison) :
  support des formules dont la doc a besoin, sans KaTeX (~100 lignes).
  Délimiteurs `$…$` (inline) et `$$…$$` (block centré, mono- ou
  multi-ligne). Constructs : exposants `^{x}`, indices `_{x}` (accolades
  obligatoires), fractions `\frac{a}{b}` (barre CSS empilée), italique
  auto sur lettres latines isolées **dans les délimiteurs uniquement**,
  ~12 symboles Unicode (`\pi \alpha \beta \gamma \cdot \times \div
  \approx \neq \leq \geq \pm`). Récursif (contenu des accolades re-parsé
  en math). Sous-parser dédié `src/lib/mathParse.js` (mathAst construit
  au parse), rendu sup/sub/frac dans MarkdownRenderer. Commande inconnue
  → rendu littéral + warn dev, pas de crash. `_renderer-test.md` enrichi
  d'une section Formules. Zéro npm ajouté. Posé entre L.4 et L.5 car les
  contenus L.5 (tempéraments, glossaires) génèrent beaucoup de ratios,
  cents et exposants. **Phase R.4** : délimiteurs extensibles `( )` `[ ]`
  qui grandissent avec la fraction (bords dessinés en CSS, flex stretch,
  sans mesure JS) ; `why-12-notes.md` migré vers la syntaxe math (1er
  consommateur réel).
- Iteration L phase 4 (Tour guidé) — **V1 de l'Itération L atteinte** :
  visite guidée par diaporama d'info-bulles ancrées. Bouton **Compass**
  (header) + **Ctrl/Cmd+J** démarrent le tour de l'onglet actif. Mode
  spotlight : blocker plein écran (gel clic/molette/clavier hors ESC),
  voile box-shadow sur l'ancre courante, bulle ancrée, progress bar
  cliquable à la place des onglets, navigation ← / → (ou Précédent/Suivant),
  croix + ESC pour quitter. Tours
  déclaratifs par onglet (`src/lib/tours/*.js`, 1er jet des textes — passe
  writer en attente). 3e consommateur de `getAnchoredPosition` ; RAF borné
  pour le montage différé + ouverture de sidebar repliée ; étape sans ancre
  skippée. State `tour` volatile (snapshot onglet + sidebars capturé une
  fois, restauré à la sortie ; chaînage entre onglets sans re-snapshot).
  « En savoir plus » par étape → article de doc. Zéro npm ajouté.
- Iteration L phases 2-3 (onglet Documentation navigable) : 4e onglet
  Documentation (renderer Markdown maison `src/lib/markdown.js`, TOC
  collapsible/resizable, restauration de scroll par article, page
  Raccourcis auto-générée depuis `SHORTCUTS`). Navigation interne active
  (L.3) : les `<DocLink target="onglet:ancre">` basculent sur l'onglet
  cible + halo temporaire sur l'élément d'UI (via `highlightElement`,
  2e consommateur de `getAnchoredPosition`) ; les liens `[label](doc:id)`
  changent l'article courant sans quitter la doc. Handlers propagés via
  `MarkdownNavContext` ; cibles inconnues = no-op gracieux + warn dev.
- Iteration L phase 1 (fondation Documentation) : infrastructure pour
  l'onglet Documentation utilisateur sans modification du comportement
  métier. Table déclarative `src/lib/shortcuts.js` (source unique des
  raccourcis), convention `data-anchor` posée sur les éléments d'UI,
  composant `ShortcutsOverlay` opérationnel via bouton header Keyboard
  ou Ctrl+K. Promotions UI permanentes : pastille `Sustain` cliquable
  (verrouillable) dans le Designer, bouton `Coller` dans la toolbar
  Composer (sémantique ancre/piste sélectionnée/fallback piste 0),
  chip `📋 N éléments` dans la toolbar Bibliothèque (× pour vider),
  halo subtil sur le clip ancre Composer, outline subtil sur le header
  de la piste sélectionnée Composer (nouveau concept `selectedTrackId`
  persisté). Tooltips CP1/CP2 corrigés (Octave Composer, Rétablir
  Bibliothèque).
- Bibliothèque dédiée + 3 sous-apps autonomes (itér K phase 2) : onglet
  Bibliothèque dédié avec full PatchBank + toolbar d'actions icônes,
  sidebars en PatchPicker simplifié, popup SavePatchDialog avec folder
  picker, modal DeleteUsageWarningDialog, piles undo séparées routées
  par activeTab, clipboard multi-paste, batch delete atomique.
- Bibliothèque multi-mode style file explorer (itér K phase 1) :
  5 combinaisons Tree/Nav × List/Details/Tiles, breadcrumb, multi-
  sélection (Ctrl/Shift/lasso), clipboard Copier/Couper/Coller avec
  anti-cycle, raccourcis clavier, popup redimensionnable, état partagé
  Designer + Composer.
- Spectrogramme Designer avancé (itér I phase 1) : mode statique (DFT)
  + mode Live FFT (AnalyserNode temps réel), basculés via **toggle
  explicite "Live"** dans le header. Toggle dB / linéaire applicable
  aux deux modes. Peak hold optionnel pour le Live. Graduations Y
  (majors + minors) sur les deux modes pour lecture précise des
  amplitudes.
- Import / Export bibliothèque format `.osa` (itér H phase 1) : 3 voies
  d'export (Actions Download bibliothèque complète / menu contextuel
  folder / menu contextuel patch), import unique avec choix de placement
  (sous-ensemble wrapper / racine), IDs régénérés systématiquement,
  déduplication des noms de dossiers, IMPORT_LIBRARY undoable Designer.
- Dessin waveform + presets
- Éditeur ADSR visuel draggable
- Preview polyphonique via clavier piano interactif + raccourcis QWERTY
  (event.code) + Espace = sustain (E.3)
- Banque de patches : drag, rename, delete, dossiers arborescents
- Drop timeline avec snap triple croche (0.125 beat), polyphonie
  multi-lanes, multi-pistes
- Hauteur par clip (12-TET ou Libre) via `clipFrequency(clip)` (E.1)
- Durée par clip : 7 bases (carrée à triple croche) × 4 coefs (pur,
  ×1.25, pointé, double-pointé) via `DurationButtons` (E.6.1)
- BPM ajustable + recalcul durée totale
- Curseur animé + affichage temps
- Zoom horizontal + vertical (hauteur de piste modifiable)
- Visualiseur oscilloscope temps réel
- Sidebars Composer resizables et collapsibles (E.7.4-7.5)
- Sidebar Designer resizable et collapsible avec popover Bibliothèque
  flottant en mode réduit (G.1.2) — mode réduit organisé en 3 groupes
  (haut Bibliothèque / spacer / Actions + Play en bas, G.2.1)
- Panneau **Actions** dans la sidebar Designer en barre d'icônes
  inline groupées (patch / historique Undo/Redo / Import-Export
  placeholders) — G.1.1 + G.2.2. Icônes Lucide-react partout (G.2.1).
- Sélecteur de système musical à deux étages dans le Designer :
  Catégorie (Moderne / Historique / Théorique) + Système filtré.
  Composant **ShortLabelSelect** (libellé court trigger / complet menu)
  appliqué uniformément à Catégorie / Système / Repère / Tonique sur
  une même ligne flex-wrap (G.1.3 + G.2.3).
- Système Libre testable (bouton Test + raccourci `s`, dette technique
  fermée en G.1.3)
- Patches portent un **defaultTuningSystem** capturé au save —
  propagation cohérente au drop : key-held → editor, drop simple →
  patch default, placement contigu → clip référent (G.2.4)
- Zone clavier : OctaveSelector au-dessus avec libellé "Octaves",
  clavier en `flex:1` qui s'étire verticalement selon espace, ligne
  Note ancrée tout en bas (G.2.5)
- `ResolutionGate` réactif au resize : placeholder pleine page (overlay,
  app reste montée) &lt; 924×668, modale soft dismissible &lt; 1740×900
  (G.1.4 + G.2.6)
- Export WAV PCM 16-bit stéréo
- Persistance localStorage (pas de migration vers nouveau format en E.1 :
  reset si ancien format détecté)

✅ **Itération A terminée**.

✅ **Itération B terminée** (2026-04-17)
- Spectrogramme statique synchronisé (DFT, échelle log)
- Multi-sélection (rectangle, Ctrl+clic, Shift+drag additionnel)
- Drag/resize/duplication multi avec bornes groupées
- Copier/couper/coller clips (Ctrl+C/X/V, clic droit, positionnement souris)
- Fusion (Ctrl+M) et split (Ctrl+D ÷2, Ctrl+Shift+D ÷3)
- Ctrl+drag scroll horizontal, Alt+drag zoom rectangle
- Répertoires de sons arborescents (CRUD, drag interne, indentation)
- Suppression sons/dossiers avec blocage si clips référencent + assistance
- Check undo symétrique cross-onglet (Designer ↔ Composer)
- Menu contextuel mesures : supprimer/insérer/couper/copier/coller
  avec split automatique des clips à cheval
- Properties panel multi-sélection (son/durée mixtes, actions groupées)

✅ **Itération C terminée** (2026-04-18)
- UI multi-tracks : en-têtes + couloirs, CRUD pistes, drop/drag cross-piste,
  réordonnancement par drag, refactor banque double-clic=renommer (phase 1)
- Mute/Solo/Volume par piste : UI M/S/slider, logique solo DAW, GainNode
  per-track, gains temps réel, atténuation visuelle clips (phase 2)
- Moteur audio look-ahead : scheduler fenêtre glissante, réactivité temps
  réel aux modifications de clips pendant lecture (phase 3)
- Adaptation multipiste : fusion check trackId, coller cross-piste (clic droit
  + Ctrl+V), PropertiesPanel affiche piste, Échap ferme menu contextuel (phase 4)

✅ **Itération D terminée** (2026-04-19) — Refonte Designer
- Phase 1 — Refonte sélecteur de notes : dropdown "Système"
  (12-TET / Libre), clavier piano 12 notes, sélecteur d'octave 0-10,
  extension mode libre 2^4-2^15 Hz. Les trois boutons Test
  (impact/court/tenu) introduits ici ont été remplacés par la preview
  polyphonique au clavier en E.3 puis retirés en F.3.5.
  Modèle : `mode: 'note' | 'free'` → `tuningSystem: '12-TET' | 'free'`
  (migration transparente via `normalizeSound`).

✅ **Itération E terminée** (2026-04-22) — Patches vs Notes (refonte conceptuelle majeure)
- ✅ **Phase 1** (2026-04-19) — Patches remplacent Sounds, notes portées par
  les clips. Commit unique.
  - Modèle : `SavedSound` → `Patch` (id `patch-N`) sans fréquence ni note ;
    champs supprimés : `frequency`, `mode`, `tuningSystem`, `noteIndex`,
    `octave`.
  - `Clip` enrichi : `soundId` → `patchId`, + `tuningSystem`, `noteIndex`,
    `octave`, `frequency` (null côté non applicable). Helper partagé
    `clipFrequency(clip)` dans reducer.js.
  - Éditeur : nouveaux champs `testTuningSystem`, `testNoteIndex`,
    `testOctave`, `testFrequency` — uniquement pour piloter la preview,
    pas copiés dans le patch sauvegardé. Hydratation d'un patch préserve
    ces champs (contexte de test utilisateur).
  - Drop de patch sur timeline : la hauteur du nouveau clip est celle du
    clavier de test courant (règle par défaut, raccourcis clavier prévus
    en E.4). `handleAddClip` utilise `editorTestNoteFields(editor)`.
  - Actions reducer renommées : `SAVE_SOUND` → `SAVE_PATCH`,
    `UPDATE_SOUND` → `UPDATE_PATCH`, `DELETE_SOUND` → `DELETE_PATCH`,
    `RENAME_SOUND` → `RENAME_PATCH`, `MOVE_SOUND_TO_FOLDER` →
    `MOVE_PATCH_TO_FOLDER`, `UPDATE_CLIPS_SOUND` → `UPDATE_CLIPS_PATCH`,
    `SET_CURRENT_SOUND_ID` → `SET_CURRENT_PATCH_ID`,
    `HYDRATE_EDITOR_FROM_SOUND` → `HYDRATE_EDITOR_FROM_PATCH`,
    `SET_EDITOR_NOTE/OCTAVE/TUNING_SYSTEM/FREQUENCY` →
    `SET_EDITOR_TEST_NOTE/OCTAVE/TUNING_SYSTEM/FREQUENCY`.
  - State renommé : `savedSounds` → `patches`, `soundCounter` →
    `patchCounter`, `currentSoundId` → `currentPatchId`.
  - Split/merge/paste/cut/insert/delete measure propagent désormais les
    champs de hauteur du clip source vers les nouveaux clips créés
    (helper `buildSplitPart` dans App, `cloneClipNote` dans reducer).
  - `canMergeClips` ajoute la vérification que tous les clips aient la
    même hauteur (en plus du même `patchId` et `trackId`).
  - Plus de détection de doublons au save : un patch est toujours créé
    avec un id unique (un même timbre peut exister plusieurs fois sous
    des noms différents, c'est permis).
  - **Pas de migration** : si `loadPersistedState` détecte un ancien format
    (clés `savedSounds`, `soundCounter`, `noteCounter`, `placementCounter`),
    on log un warning et on repart d'un état initial vide. Deal assumé.
  - Renommage fichier : `SoundBank.jsx/.css` → `PatchBank.jsx/.css` ;
    props renommées (`savedSounds` → `patches`, `onLoadSound` →
    `onLoadPatch`, etc.). Affichage de la fréquence retiré des chips
    (un patch n'en a plus).
  - `usePlayback` : signature `{ clips, patches, tracks, bpm, ... }`,
    résolution fréquence via `clipFrequency(clip)` à l'attaque de
    chaque clip (live + export WAV). Signature de changement inclut
    les champs de hauteur pour invalider les clips reprogrammés.
- ✅ **Phase 2** (2026-04-19) — Affichage note dans clips + édition
  Properties + flèches clavier. 3 sous-commits :
  - **2.1** Label adaptatif : `src/lib/clipNote.js` exporte
    `formatClipNote(clip)` (12-TET → "A4", free → "440.0 Hz") et
    `NOTE_NAMES` avec ♯ Unicode. Dans Timeline, la `.placed-name` est
    scindée en `.placed-note` (gras) + `.placed-patch-name` (opacité
    0.7). Container queries : patch name masqué sous 120px, tout
    masqué sous 30px.
  - **2.2** `PianoKeyboard`/`OctaveSelector` extraits dans
    `src/components/PianoKeyboard.{jsx,css}`, prop `compact` pour la
    variante Properties (56px de haut, pas de labels). Action
    `UPDATE_CLIPS_PITCH` (payload `[{id, tuningSystem?, noteIndex?,
    octave?, frequency?}]`, undoable pile Composer). Handler
    `handleUpdateClipsPitch`. PropertiesPanel mono : nouveau champ
    "Note" entre Patch et Position (mini-clavier + octave en 12-TET,
    FreqInput en Libre). PropertiesPanel multi : éditable si toutes
    les hauteurs identiques, sinon "Notes mixtes" lecture seule.
  - **2.3** Listener keydown global (App, activeTab=composer). ↑↓ :
    ±1 demi-ton via arithmétique midi (passage d'octave auto).
    Shift+↑↓ : ±1 octave entière. ←→ : ±0.25 beat. Shift+←→ : ±1 beat.
    Bornes intersectées : midi ∈ [12, 143] (C0..B10), position ∈
    [0, totalBeats]. Groupe bloqué si le membre le plus contraint
    ne peut pas bouger. Clips free ignorés pour ↑↓ (édition libre
    via input Hz). Exclusions : input/textarea/select/contenteditable,
    `.timeline-context-menu` ouvert, body cursor en drag.
- ✅ **Phase 3** (2026-04-19) — Designer = instrument de test
  polyphonique. 5 sous-commits :
  - **3.1** PianoKeyboard accepte `onKeyPress(idx)` / `onKeyRelease(idx)`
    + prop `activeNotes` (Set). mousedown → onSelectNote + onKeyPress ;
    un listener window mouseup déclenche onKeyRelease (option B : la
    note tient tant que la souris n'est pas relâchée, même hors de la
    touche). WaveformEditor maintient `activeNotesMapRef` (Map<idx,
    {osc, gain, octave}>) et `instrumentParamsRef` (valeurs ADSR /
    amplitude / testOctave fraîches pour les handlers). Cleanup à
    l'unmount et au changement de patch. Classe `.is-playing` jaune
    vif pour les touches actives (distincte du cyan is-active).
  - **3.2** Mapping `event.code` → noteIndex : KeyS/D/F/G/H/J/K pour
    les blanches (C D E F G A B), KeyE/R/Y/U/I pour les noires. Utilise
    event.code (position physique) donc fonctionne identiquement QWERTY /
    AZERTY / DVORAK. event.repeat ignoré. `instrumentBridgeRef` stable
    sert de pont entre le listener (attaché une fois par activeTab) et
    les fonctions play/release recréées à chaque render. Sortie du
    Designer = stopAllInstrumentNotes.
  - **3.3** PageUp/PageDown décalent testOctave (±1, bornes [0, 10]).
    Keydown unique, skip form fields et combos Ctrl/Alt/Cmd
    (navigation d'onglet navigateur). e.repeat autorisé : maintenir la
    touche traverse les octaves. Initialement Shift/Ctrl "seuls" via
    flags shiftAloneRef/ctrlAloneRef invalidés par toute autre touche
    ou mousedown, remplacé car l'ordre de relâchement dans des combos
    créait des octaves intempestives.
  - **3.4** Pédale de sustain : Espace maintenue = sustainActiveRef.
    Le release est extrait dans `performRelease` et
    `releaseInstrumentNote` le diffère vers `sustainedNotesRef` quand
    sustain est actif. Au relâchement de Espace, performRelease est
    appelé sur toutes les notes sustainées. `playInstrumentNote`
    gère le retrigger : si la note est déjà active (sustainée ou non),
    la voix existante est coupée net avant d'en démarrer une nouvelle.
    preventDefault sur Space (empêche scroll). Badge SUSTAIN orange
    à côté du label "Note".
  - **3.5** Suppression des 3 boutons Test impact/court/tenu et toute
    la logique associée (startAudio, stopAudio, handleTestClick,
    playingMode, oscRef/gainRef, COURT_HOLD_SEC, useEffect live
    frequency/amplitude, CSS .test-btn-mode/.test-buttons). Le test
    d'un patch passe exclusivement par le clavier interactif.
- ✅ **Phase 4** (2026-04-19) — Drop intelligent + placement contigu.
  2 sous-commits :
  - **4.1** `KEY_CODE_TO_NOTE_INDEX` déplacé dans
    `src/lib/keyboardMap.js` partagé. App maintient `pressedNoteKeyRef`
    (synchrone) + `pressedNoteKey` state. Listener Composer : keydown
    enregistre la touche (skip sur Ctrl/Cmd combos + repeat), keyup
    clear. `handleAddClip` priorise pressedNoteKey : si set, clip créé
    en 12-TET à cette note + testOctave, sinon fallback
    `editorTestNoteFields`. Badge ♪ XN orange dans la toolbar Composer
    pendant qu'une touche est maintenue. Raccourcis d'octave (PageUp/
    PageDown) logés dans un useEffect dédié de App (actif les deux
    onglets).
  - **4.2** State `lastAnchorClipId` (non undoable, non persisté)
    ajouté au reducer. Mis à jour par ADD_CLIP, DUPLICATE_CLIPS,
    SPLIT_CLIPS, MERGE_CLIPS, PASTE_CLIPS, SELECT_CLIPS (dernier du
    payload). Nettoyé à REMOVE_CLIP / DELETE_SELECTED_CLIPS /
    CLEAR_TIMELINE si l'anchor disparaît. Le keyup Composer, si aucun
    drag en cours (dragstart/dragend window listeners + body cursor
    check), dispatch ADD_CLIP après l'anchor : même patch, même piste,
    même durée par défaut, note = touche pressée, octave = testOctave.
    ADD_CLIP accepte `extraMeasures` pour étendre automatiquement la
    composition. `handleAddClip` consomme pressedNoteKey au drop pour
    que le keyup suivant ne double pas le placement.
- ✅ **Phase 5** (2026-04-19) — Fixes placement contigu (voir Roadmap).
- ✅ **Phase 6** (2026-04-20) — UX enrichie : durées en boutons toggle
  (7 bases + 3 coefs, snap 0.125), indicateur octave dans la toolbar,
  animation CSS des corridors (voir Roadmap).
- ✅ **Phase 7** (2026-04-20) — Ajustements UI : invariant
  `lastAnchorClipId ↔ selectedClipIds`, fractions réf noire
  (1=noire, 1/2=croche), pas flèche Composer 0.125, sidebars
  resizables + collapsibles, settling frame drag cross-piste
  (voir Roadmap).
- ✅ **Phase 8** (2026-04-22) — Fix release ADSR Designer sur appui
  bref : `gain.value` lu avant `cancelScheduledValues` + marge 20ms
  sur `osc.stop()` (voir Roadmap).
- ✅ **Phase 9** (2026-04-22) — Micro-fades anti-clic. `MIN_ATTACK`
  (3 ms) en plancher d'attack côté Designer + Composer (clic au
  démarrage), `RETRIGGER_FADE` (8 ms) en fade-out de la voix
  précédente lors d'un retrigger (clic de voice-stealing sur note
  déjà active ou sustainée) (voir Roadmap).

🚧 **Itération F — Tier 1 + Tier 2 (gamelan + shrutis indiens) + Tier 3 livrés** — Multi-tempérament
- ✅ **Phase 1** (2026-04-22) — Infrastructure multi-tempérament.
  Création de `src/lib/tuningSystems.js` : registre `TUNING_SYSTEMS`
  (clé = id de système) avec `{ id, label, notesPerOctave, noteNames,
  freq }`. `clipFrequency(clip, a4Ref)` délègue au registre —
  `sys.freq(noteIndex, octave, a4Ref)` pour les systèmes note/octave,
  `clip.frequency` pour `free`. `frequencyToNearestNote` et les noms
  de notes 12-TET migrés dans le registre. `formatClipNote` lit
  `noteNames` depuis le registre (plus de copie locale).
  `WaveformEditor` (preview polyphonique) passe par le même registre
  que `usePlayback` — plus de copie locale de `noteToFrequency`.
  `PropertiesPanel` et `App.jsx` (spectrogramme) routent leurs
  calculs MIDI via le registre. Nouveau champ d'état `a4Ref` (défaut
  440 Hz, persisté, propagé via ref dans le scheduler live, via prop
  directe pour l'export WAV). Aucune UI d'édition exposée — A4 reste
  à 440 Hz pour l'utilisateur final. Comportement strictement
  identique à E.9.
- ✅ **Phase 2** (2026-04-22) — Premier tempérament alternatif +
  UI A4. 2 sous-commits :
  - **2.1** Tempérament Pythagoricien 12 centré sur C. Ratios dérivés
    à l'init par parcours de la chaîne (6 montantes, 5 descendantes,
    loup F#↔Db ~678 cents). Mêmes noms de notes que 12-TET → clavier
    et UI existants réutilisés. Ordre registre : 12-TET,
    pythagorean-12, free. Sélecteurs dynamisés (Designer +
    PropertiesPanel — ajout du sélecteur dans Properties, absent
    auparavant : multi avec check `allSameTuningSystem` →
    "Systèmes mixtes" en lecture seule sinon). Logique de bascule
    portée par le reducer (`UPDATE_CLIPS_PITCH` étendu) pour
    verrouiller l'invariant "clip cohérent" au modèle : vers 'free'
    calcule la fréquence courante, entre systèmes de même grille
    garde note/octave, sinon snap via 12-TET. Fix latent dans
    `SET_EDITOR_TEST_TUNING_SYSTEM` du Designer (hardcode '12-TET'
    en branche non-free) corrigé au passage.
  - **2.2** Input A4 dans la toolbar Composer. Nouveau composant
    `A4Input` (même pattern que `BpmInput` — validation différée,
    Échap restaure, ±1 flèches / ±5 Shift). Fourchette 380-480 Hz
    entiers. Action `SET_A4_REF` undoable, `a4Ref` ajouté à
    `COMPOSER_FIELDS`. `A4Input` candidat à extraction en
    `ValidatedIntegerInput` partagé si un 3e input similaire
    apparaît (pas extrait par choix de scope en F.2).
- ✅ **Phase 3** (2026-04-23 → 2026-04-24) — Multi-tempérament 24
  notes + refonte UI ADSR. ~13 sous-commits (détail dans Historique
  et Roadmap). Registre enrichi : chaque entrée porte ses champs
  `layout` et `keyboardMap` — `src/lib/keyboardMap.js` supprimé,
  les consommateurs lisent `getTuningSystem(id).keyboardMap`. Deux
  nouveaux tempéraments **24-TET égal** et **24-TET Le Caire 1932**
  (table en dur, source aly-abbara.com, ancrée 'Oshairan = A4 = 440).
  `PianoKeyboard` devient un dispatcher (`LAYOUT_COMPONENTS` :
  `piano-12` → `PianoLayout12`, `grid-24` → `Grid24Layout`). Nouveau
  `Grid24Layout` en CSS Grid 4×30 sub-cols (escalier 1/4 d'unité par
  rangée), palette HSL par degré — 7 hues naturelles, lightness
  différencié par kind ♮/♯/↑/↓ ; `is-active` et `is-playing` en
  outlines pour préserver la couleur de position. Mapping QWERTY 24
  positions géométriquement alignées (SDFGHJK naturelles, ERTYUIO
  demi-dièses, 24680 dièses pleins, XCBNM demi-bémols). Refonte
  raccourcis durées : NumPad sans Shift + Shift+Digit (Digit nus
  libérés pour les notes 24-TET). Snap inter-systèmes généralisé :
  `frequencyToNearestNote` (12-TET only) → `frequencyToNearestIn(hz,
  sysId, a4Ref)` qui itère sur la grille du système cible × 11
  octaves et minimise |cents|. Sélecteur de tempérament ajouté dans
  la toolbar Composer (à côté de A4). **ADSR → AHDSR** : nouveau
  champ `hold` (0-1000 ms, défaut 0) — plateau au peak entre attack
  et decay, pédagogiquement précieux pour distinguer hold forcé vs
  sustain tant que la touche est tenue. UI Enveloppe refondue :
  Amplitude rapatriée dans la zone ADSR (6 sliders Amp/A/H/D/S/R
  empilés), valeurs éditables au clavier via composant générique
  `NumberInput`, tooltips au survol (`AdsrTooltip`), handles
  isotropes, curseur dynamique, P3 retiré (sustain = niveau
  sémantique, pas plateau temporel). Action combinée
  `SET_EDITOR_ADSR_AND_AMP` pour unifier le drag P1 diagonal en un
  seul snapshot undo. P1h géré en z-order (au-dessus de P1 en ordre
  de dessin + hit-test), pas en Y-offset : silhouette fidèle.
- ✅ **Phase 4.1** (2026-04-25) — Juste intonation majeure centrée
  sur C. Ajout de l'entrée `'just-major-c'` au registre (3e
  position, entre `pythagorean-12` et `24-tet-equal`). Table d'Ellis
  5-limit en dur (`JUST_MAJOR_RATIOS_FROM_C`) ; ancrage `C4 = a4Ref
  × 3/5` pour préserver l'invariant A4 = a4Ref exact (A/C = 5/3 dans
  la table). Accidentels en enharmoniques bémols fonctionnels
  (D♯=6/5, G♯=8/5, A♯=9/5, C♯=16/15, F♯=45/32) — écart vs dièses
  non enharmoniques que le tempérament égal efface, point
  pédagogique assumé. Aucun nouveau layout ni mapping : réutilise
  `piano-12` et `TWELVE_KEY_MAP`. Sélecteurs et reducer consomment
  la nouvelle entrée sans modification — le pattern d'extension
  posé en F.3 tient.
- ✅ **Phase 4.2** (2026-04-25) — 5-TET pentatonique égale + layout
  `grid-5`. Premier tempérament avec `notesPerOctave ∉ {12, 24}` :
  5 divisions égales de l'octave, nomenclature I..V (pas d'emprunt
  chromatique), tonique I ancrée à `a4Ref` à l'octave 4 —
  généralisation sémantique de `a4Ref` comme "fréquence du degré 0
  à oct 4". `FIVE_KEY_MAP` réutilise les positions SDFGH (sous-
  ensemble strict du `TWELVE_KEY_MAP`) pour préserver la mémoire
  motrice. Nouveau `Grid5Layout` dans `PianoKeyboard.jsx` : 5
  rectangles en ligne (CSS Grid 1×5), palette 5 hues à 72° de pas
  avec lightness uniforme (pas de hiérarchie d'altération en 5-TET),
  patterns `is-active` (inset cyan) et `is-playing` (outline jaune
  + glow) hérités de grid-24. Entrée insérée en 6e position
  (avant `free`) pour ne pas disrupter les positions déjà adoptées.
- ✅ **Phase 4.3** (2026-04-25) — 31-EDO explorateur micro-tonal +
  layout `grid-31`. Nouvelle entrée `'31-edo'` au registre (7e
  position, avant `free`). 31 divisions égales (step 1200/31 ≈
  38.71¢) ; tonique deg 0 ancrée à `a4Ref` à oct 4 (cohérence avec
  5-TET). Interprétation abstraite : degrés numérotés 1..31
  (`THIRTYONE_EDO_NOTE_NAMES`), pas d'emprunt à la nomenclature
  méantone (C♯/D♭, double-dièses) — cohérent avec la position
  pédagogique de 5-TET. Suffixe "." dans les noms (`"1."` à `"31."`)
  comme séparateur visuel pour `formatClipNote` (`"23." + "4"` →
  `"23.4"`), masqué sur les touches du clavier. `THIRTYONE_KEY_MAP`
  31 positions sur les 4 rangées physiques du clavier QWERTY en
  serpentin-colonne (KeyZ KeyS KeyE Digit4 KeyX KeyD KeyR Digit5 …
  KeyP) — 8 colonnes × 4 rangées moins la case haut-droite manquante
  (degré 31 = octave non représenté). Nouveau `Grid31Layout` dans
  `PianoKeyboard.jsx` : CSS Grid 4×35 sub-cols, escalier 1/4
  d'unité par rangée (extension du pattern grid-24 à 8 colonnes au
  lieu de 7). Axe horizontal monotone : `start_subCol(k+1) =
  start_subCol(k) + 1` que ce soit une montée intra-colonne ou un
  saut de colonne. Palette `GRID31_HUE_PER_COL` (8 hues par
  colonne, étendant le pattern `HUE_PER_NATURAL` de grid-24 à 8
  entrées) + 4 lightness par rangée (75/60/45/30%, alignée sur la
  grammaire ↓→♮→↑→♯ de grid-24) ; voir 4.3.1 pour la correction
  par rapport à la palette initiale 4-hues-par-rangée.
  Hauteur 160px / 80px compact alignée sur grid-24 (autre layout
  4-rangées) plutôt que sur grid-5 (1 rangée). Patterns `is-active`
  (inset cyan) et `is-playing` (outline jaune + glow) hérités du
  pattern grid-24. `LAYOUT_COMPONENTS` enrichi de `'grid-31'`.
  Vérifs numériques (a4Ref=440) : deg 0 oct 4 = 440 Hz exact, deg 0
  oct 5 = 880 Hz exact (octave juste), deg 10 vs 5/4 = +0.78¢
  (tierce méantone quasi-pure, signature 31-EDO), deg 18 vs 3/2 =
  −5.18¢ (quinte méantone). Snap 12-TET C4 → 31-EDO deg 8 oct 3
  (écart 9.68¢ < step/2 = 19.35¢). **Tier 1 multi-tempérament clos**
  (4.1 juste-majeure, 4.2 5-TET, 4.3 31-EDO).
- ✅ **Phase 4.4** (2026-04-25) — Repères visuels (gammes & accords)
  sur le clavier, saveur A passive. Nouveau fichier
  `src/lib/visualCues.js` : `VISUAL_CUE_PATTERNS` (8 entrées : `none`
  + 3 accords + 4 gammes — triade majeure/mineure, septième de
  dominante, gamme majeure/mineure naturelle, pentatonique majeure,
  gamme par tons), définis comme listes d'intervalles **en cents
  depuis la tonique** (ratios purs 5-limit / 7-limit pour dom7).
  Helper `cuedNoteIndices(patternId, tonicDeg, sysId, a4Ref)` snappe
  vers les degrés du système courant via `frequencyToNearestIn` —
  même définition produit [0,4,7] en 12-TET et [0,10,18] en 31-EDO,
  ce qui est précisément l'intérêt pédagogique. Systèmes supportés
  via `VISUAL_CUE_SUPPORTED_SYSTEMS` : 12-TET, Pythag-12, juste-
  majeure, 24-TET égal, Le Caire 1932, 31-EDO. Pas 5-TET (errs > 90¢
  sur la triade majeure) ni Libre (pas de degrés). État éditeur :
  `editor.visualCuePattern` (défaut `'none'`) + `editor.visualCueTonic`
  (défaut 0), pile undo Designer, persistés à plat dans localStorage
  (clés `editorVisualCuePattern` + `editorVisualCueTonic`, ré-injectés
  dans `editor` au `buildInitialState`). `SET_EDITOR_TEST_TUNING_SYSTEM`
  enrichi : si `visualCueTonic` dépasse `notesPerOctave` du nouveau
  système, snap à 0 (le pattern reste). UI WaveformEditor : barre
  "Repère + Tonique" au-dessus du clavier, visible uniquement quand
  le système supporte les cues. PianoKeyboard : nouvelle prop
  `cuedNotes` propagée à chaque layout (les 4 layouts ajoutent
  `is-cued` à la className des cellules concernées). CSS `.is-cued` :
  halo magenta `box-shadow: 0 0 0 2px #e832e2` en externe, préserve
  le fill HSL ; combinaisons avec `is-active` (inset cyan) et
  `is-playing` (outline jaune + glow) gérées via box-shadow
  comma-separated. Saveur B (sélection compositionnelle active par
  clic-multi) reste en BACKLOG. Vérifs : 12-TET tonic 7 (G) triade
  maj → [2,7,11] ; 31-EDO tonic 0 pentat. maj → [0,5,10,18,23] ;
  31-EDO tonic 0 whole-tone → [0,5,10,16,21,26] (séquence non
  régulière car 200¢ ne divise pas 31-EDO).
- ✅ **Phase 5** (2026-04-25) — Tier 3 historiques européens.
  Deux tempéraments 12 notes ajoutés au registre :
  **`'meantone-quarter-comma'`** (Mésotonique 1/4 de comma centré
  sur C, chaîne E♭→G♯, tierces majeures 5/4 pures à 386.314¢ exact,
  loup G♯↔E♭ ; cents Helmholtz/Ellis) et **`'werckmeister-iii'`**
  (Andreas Werckmeister 1691, 4 quintes tempérées chacune par 1/4
  de comma pythagoricien sur C-G/G-D/D-A/B-F♯ + 8 quintes pures ;
  tempérament Bach pour le Wohltemperierte Klavier ; cents Barbour
  1951). Tables de cents inline (les fonctions ratio existantes
  pythagorean/just ne motivent pas un helper unifié — abstractions
  natives différentes). Ancrage A4 = a4Ref via
  `c4 = a4Ref × 2^(-CENTS[9]/1200)` (pattern symétrique aux autres
  systèmes 12-notes basés sur C). Insérés en 4e/5e position du
  registre (entre `just-major-c` et `24-tet-equal`) — regroupement
  des systèmes 12-notes. Aucun nouveau layout, aucun nouveau
  mapping — réutilisation de `piano-12` et `TWELVE_KEY_MAP`. Visual
  cues activés (`VISUAL_CUE_SUPPORTED_SYSTEMS` étendu). Registre
  à 10 entrées. Vérifs (a4Ref=440) : Mésotonique C4=263.181,
  E4=328.977 (= C4×5/4 exact), G4=393.548, A4=440.000 ; Werckmeister
  III C4=263.404, E4=329.998, G4=393.768, A4=440.000.
  Triptyque pédagogique complété : Pythagoricien (quintes pures,
  tierces fausses) → Mésotonique 1/4-comma (tierces pures, wolf
  marqué) → Werckmeister III (compromis bien-tempéré, toutes
  tonalités utilisables) → 12-TET (uniforme). Tier 2 (gamelan,
  22-TET, 53-EDO) reste en backlog.
- ✅ **Phase 6** (2026-04-25) — Tier 2 gamelan. Deux tempéraments
  javanais d'après Surjodiningrat, Sudarjana & Susanto, "Tone
  Measurements of Outstanding Javanese Gamelans in Jogjakarta
  and Surakarta" (1972) — étude empirique de référence, citée
  en commentaire du registre. **`'slendro'`** (5 notes, accordage
  Surakarta moyen, cents [0, 241, 481, 719, 958] ; réutilise
  layout `grid-5` et `FIVE_KEY_MAP` — strict alignement avec
  5-TET côté UI, audio différent par les ~3¢ de déviation par
  rapport à 5-EDO) et **`'pelog'`** (7 notes, cents [0, 119, 258,
  539, 678, 794, 1058] ; nouveau layout `grid-7` calqué sur
  grid-5 avec 7 hues à 360°/7 ≈ 51° de pas, mapping QWERTY home
  row SDFGHJK = `PELOG_KEY_MAP`, sous-ensemble strict de
  `TWELVE_KEY_MAP`). Cellules équidistantes alors que les pitchs
  Pelog ne le sont pas — convention partagée avec piano-12 et
  tous les autres layouts. Nomenclature romaine I..V / I..VII —
  pas d'import des noms javanais natifs (barang/gulu/dada/lima/
  nem ou ji/ro/lu/pat/mo/nem/pi), décision de scope assumée
  pour limiter la friction terminologique en classe. Tonique
  deg 0 = `a4Ref` (cohérence 5-TET / 31-EDO ; pas d'A en
  gamelan). Visual cues **désactivés** : `slendro`/`pelog` absents
  de `VISUAL_CUE_SUPPORTED_SYSTEMS`, la barre se masque
  automatiquement via la logique F.4.4 existante. Pelog Bem /
  Pelog Barang non modélisés comme entrées séparées — le clavier
  expose les 7 notes, l'utilisateur choisit son sous-ensemble
  joué. Insérés en 10e/11e position du registre (entre `31-edo`
  et `free`). `LAYOUT_COMPONENTS` enrichi de `'grid-7'` →
  `Grid7Layout` (nouveau composant dans `PianoKeyboard.jsx`,
  parallèle à `Grid5Layout`). Vérifs (a4Ref=440) : Slendro I oct 4
  = 440.000, V = 765.200, I oct 5 = 880.000 (octave juste).
  Pelog I = 440.000, II = 471.308 (~119¢ — intervalle "petit"
  caractéristique), IV = 600.711 (~539¢ — 4e degré loin du
  tonique), VII = 810.701, I oct 5 = 880.000. Registre à 12
  entrées. Reste en backlog : 22-EDO et 53-EDO du Tier 2 ; refonte
  UI dropdown catégorisé (12 entrées commencent à frotter).
- ✅ **Phase 7** (2026-04-26) — Tier 2 shrutis indiens (deux
  frameworks). Path B : on ship deux entrées registre dédiées
  (`'shrutis-bhatkhande'` et `'shrutis-sarngadeva'`) plutôt qu'un
  unique "22 shrutis" générique, parce que la grammaire culturelle
  est précisément ce que les frameworks encodent. 2 sous-commits :
  - **7.1** Catalogue partagé + Bhatkhande. `SHRUTI_CANONICAL_CENTS`
    (22 valeurs entières dérivées du 5-limit just intonation,
    sources Te Nijenhuis 1974 / Rowell 1992 / Bhatkhande 1909-1932)
    et helper `shrutiFreq(noteIndex, octave, a4Ref)` ancré sa = a4Ref
    à oct 4 (cohérence 5-TET / 31-EDO / gamelan). Bhatkhande
    (V.N. Bhatkhande, *Hindustani Sangeet Paddhati*, 1909-1932) :
    distribution **1-4-4-4-1-4-4** — sa (I) et pa (V) sont des
    piliers à 1 cellule chacun, re/ga/ma/dha/ni reçoivent chacune
    4 sub-shrutis. Nomenclature romaine `I, IIa..IId, IIIa..IIId,
    IVa..IVd, V, VIa..VId, VIIa..VIId` (22 noms terminés par lettre
    → pas besoin de séparateur "." pour `formatClipNote`). Mapping
    QWERTY `BHATKHANDE_KEY_MAP` 22 positions : Z-row = 7 svaras à
    leur position la plus grave (ZXCVBNM = sa, IIa, IIIa, IVa, pa,
    VIa, VIIa), 3 rangées au-dessus pour les sub-shrutis ascendantes
    des 5 clusters non-piliers (gaps physiques au-dessus de sa et pa
    — reflet de la grammaire visuelle). Nouveau layout
    `grid-22-bhatkhande` dans `PianoKeyboard.jsx` : 7 colonnes svaras
    sur grille 4 rangées × 32 sub-cols, escalier 1 sub-col par rangée
    (extension du pattern grid-31 à 7 colonnes), gaps visuels
    au-dessus des colonnes sa (col 1) et pa (col 5). Palette
    `HUE_PER_SHRUTI_SVARA = [0, 51, 103, 154, 206, 257, 309]`
    (réutilise les 7 hues de grid-7 — cohérence visuelle cross-system
    pelog/shrutis) × 4 lightness par rangée (75/60/45/30%, alignée
    sur grid-31 ↓→♮→↑→♯). CSS `.grid22-key` posé en 7.1 mutualisé
    avec 7.2.
  - **7.2** Sarngadeva. Sarngadeva (*Sangita Ratnakara*, XIIIe s.) :
    distribution **4-3-2-4-4-3-2** (Bharata classique préservé) — sa,
    ma, pa habitent 4 sub-shrutis chacun (zones étendues), ri et dha
    3, ga et ni 2. Mêmes 22 cents canoniques que Bhatkhande (`shrutiFreq`
    partagé) — différence purement organisationnelle. Nomenclature
    `Ia..Id, IIa..IIc, IIIa..IIIb, IVa..IVd, Va..Vd, VIa..VIc,
    VIIa..VIIb` (la sub-shruti la plus grave porte le nom de la svara :
    Ia = sa, IIa = ri, IIIa = ga, IVa = ma, Va = pa, VIa = dha,
    VIIa = ni). Mapping QWERTY `SARNGADEVA_KEY_MAP` 22 positions :
    Z-row = 7 svaras nommées (mêmes ZXCVBNM que Bhatkhande pour
    préserver la mémoire motrice cross-framework), colonnes hautes
    pour sa/ma/pa (jusqu'au digit row), basses pour ga/ni (s'arrêtent
    à la rangée A). Nouveau composant `Grid22SarngadevaLayout` qui
    réutilise strictement les classes CSS `.piano-keyboard-grid22` et
    `.grid22-key` posées en 7.1 — la grille géométrique est identique
    (32 sub-cols, 4 rangées, mêmes hues svara), seules les cellules
    peuplées diffèrent. Grammaire visuelle "piliers larges" (sa/ma/pa
    montent jusqu'au digit row) contraste avec "piliers étroits" de
    Bhatkhande — c'est l'écart pédagogique central qu'on veut donner
    à voir. `LAYOUT_COMPONENTS` enrichi de `'grid-22-bhatkhande'` et
    `'grid-22-sarngadeva'`. Visual cues désactivés sur les deux
    (patterns 5-limit harmoniques ne s'appliquent pas au contexte
    modal-mélodique indien). Insérés en 12e/13e position du registre
    (entre `pelog` et `free`). Vérifs (a4Ref=440) : sa oct 4 = 440.000
    Hz exact (Bhatkhande I = noteIndex 0 ; Sarngadeva Ia = noteIndex
    0), re shuddha = 495.026 (Bhatkhande IId = noteIndex 4 ;
    Sarngadeva IIa = noteIndex 4 ; ~9/8 à +0.09¢ d'écart vs ratio
    pur — conséquence du choix d'arrondir SHRUTI_CANONICAL_CENTS à
    l'entier, conforme à la pratique slendro/pelog), pa = 660.017
    (3/2 à +0.06¢), ni shuddha (Bhatkhande VIId = Sarngadeva indice
    21) = 835.421, sa oct 5 = 880.000 (octave juste). Bascule
    Bhatkhande ↔ Sarngadeva : noteIndex préservé → fréquence
    préservée, seuls les labels changent (ex. "IId.4" → "IIa.4"
    pour la même 495 Hz). Registre à 14 entrées. Reste en backlog :
    22-EDO Erlich (distinct des shrutis indiens — reste un candidat
    xenharmonique séparé), 53-EDO, refonte UI dropdown (14 entrées
    rend la dette urgente), Bharata reconstructed (Sambamoorthy)
    comme 3e framework potentiel si demande explicite, modes
    indiens (ragas/pathets) comme sous-ensembles surlignés —
    feature pédagogique future.
- ✅ **Phase 8** (2026-04-27) — X-EDO paramétrique livrée.
  Sous-phases 8.1 (infrastructure backend), 8.2 (composant
  GridXEdoLayout + captation Shift) et 8.3 (UI XEdoInput +
  bannière de bascule 12/24) toutes livrées. Slendro / Pelog /
  X-EDO sont entièrement jouables (clavier physique + souris),
  X-EDO 44..53 via Shift en mode SHIFT_ANCHOR. Détail dans
  Roadmap & Backlog. Registre à 13 entrées
  (-5-tet -31-edo +x-edo). **Itération F (multi-tempérament)
  clôturée** — reste en backlog le redesign optgroup catégorisé
  du dropdown (B.dropdown-tuning, dette UI marquée comme
  prochaine candidate).

## Historique (chronologie inverse)

- **2026-06-02 — Iteration M rattrapage phase r.5.bis : finitions UX (auto-fit Y en spline + spline parfaite permanente + clic droit barres) — CLÔTURE DÉFINITIVE DU CODE DU RATTRAPAGE**
  Trois finitions remontées en passe d'usage, 3 sous-commits dev + docs.
  - **bis.1** (`fix`) : **auto-fit Y aligné en mode Ancres**. `SplineEditor`
    rendait encore en `[-1, +1]` fixe (sa propre logique de mapping) → saut visuel
    au switch Libre↔Ancres dès que l'amplitude dépassait ±1. Il calcule désormais
    son `peakTarget`/`peakDisplayedRef` (même logique + lerp rAF 0.15) et mappe
    `[-peak, +peak]` partout (courbe, normalizedBg, grille ±0.5, poignées,
    `eventToData`, `hitTest`). Marqueur ±1 extrait en primitive partagée
    `drawAmplitudeMarker` (`lib/canvas.js`) → rendu identique aux deux canvas.
    `peakDisplayedRef` **lazy-init à la cible** dans les deux composants : au
    montage (switch) l'échelle est déjà bonne, pas de faux saut animé depuis 1.
    Labels DOM `+1`/`-1` retirés du SplineEditor (portés par le marqueur). Note :
    les ancres restent clampées à ±1 par le reducer → en mode Ancres l'auto-fit
    dilate via `normalizedBg` / overshoot Catmull-Rom, pas via un drag d'ancre.
  - **bis.2** (`feat`) : **spline parfaite en background permanent**. La courbe
    `splineToPoints(anchors, interpolation)` (squelette des ancres SANS résidu) est
    affichée en continu (orange `--canvas-spline-perfect`) dans les deux lentilles,
    entre le gris normalisé et la canonical bleue, tant que l'écart à la courbe
    affichée (= résidu) dépasse 0.01. Avant : visible seulement pendant un drag
    d'ancre (apparition/disparition perturbante). Critère dérivé de l'écart aux
    courbes affichées (pas de `editor.residual`) → juste pendant les gestes ; masque
    auto la spline pendant un drag (la courbe affichée EST la spline). `peakTarget`
    l'inclut quand visible (anti-écrêtage de l'overshoot). `NormalizeLegend` portée
    à 3 entrées conditionnelles (`{showNormalized, showSpline}`), montée seulement
    si ≥ 1 entrée conditionnelle. `anchors` stabilisé en `useMemo` (alimente le
    useMemo de la spline).
  - **bis.3** (`feat`) : **clic droit sur barre d'harmonique = mise à zéro**.
    `handleHarmonicMouseDown` intercepte `e.button === 2` → `setHarmonicAmplitude(
    index, 0)`, sans draft/drag. Garde de phase conservée : si non normalisé, le
    dialog edit-bars (`value:0`) précède l'opération. `onContextMenu` bloque le
    menu natif.
  - **Passe d'usage post-bis** (mêmes specs, 3 commits) : (a) pendant un drag
    d'ancre, le tracé bleu prévisualise `spline(draft) + résidu` (au lieu de la
    spline pure) → bleu/gris/orange restent visibles avec leur rôle, pas de saut
    au relâchement ; (b) hint d'usage de la lentille Ancres reformulé en
    « Action : geste » et déplacé en overlay bas du canvas ; (c) **marge tampon
    `DRAW_MARGIN = 12px`** aux bords des zones Forme d'onde et Harmoniques (tracé/
    barres confinés à l'intérieur, élément capteur plein → 12px de tolérance avant
    de perdre le geste au bord ; esprit du lasso bibliothèque). `strokeWave`
    factorise les boucles de tracé insettées.
  - **Le code du rattrapage M.r.* est définitivement clos.** Bilan : 5 phases
    principales (r.1→r.5) + 3 finitions (r.2.5, r.2.6, r.5.bis). Reste **M.5b**
    (passe doc writer sur le modèle stabilisé), hors implémenteur.
  Spec : `docs/superpowers/specs/2026-06-01-waveform-rattrapage-design.md`.

- **2026-06-02 — Iteration M rattrapage phase r.5 : convention d'amplitude (auto-fit Y + marqueur ±1) + cosmétique zone Harmoniques**
  Dernier chantier de code du rattrapage Iteration M. Deux sujets indépendants,
  pure cosmétique de rendu (reducer intact), 2 sous-commits dev + docs.
  - **r.5.1** (`feat`) : zone Forme d'onde — l'axe Y du canvas `drawCanvas`
    s'**auto-fit** à `[-peak, +peak]` (peak = `max(max(|canonical|),
    max(|normalizedBg|), 1)`) au lieu de `[-1, +1]` fixe ; la canonical qui
    dépasse ±1 (cumul `Σ|amplitudes_k|`, ex. preset Carré) est désormais affichée
    en entier au lieu d'être écrêtée silencieusement. `valueToY` encapsule
    l'échelle ; `peakDisplayedRef` lerpé (`+= (target−cur)·0.15` par frame, boucle
    rAF déclenchée par un effet sur `peakTarget` mémoïsé) donne une **transition
    douce** ~150 ms. **Marqueur ±1** = niveau audio référence, deux pointillés
    d'accent atténués + étiquettes `1`/`-1` **dessinées sur le canvas** (suivent
    l'auto-fit). Labels DOM `+1`/`-1` retirés (devenus faux sous auto-fit), `0`
    médian conservé. `getCanvasPoint` borne le tracé à ±peak (**pas** de clamp à
    ±1 — décision archi : la canonical reste la vérité audio, le navigateur
    normalise la `PeriodicWave`). Subtilité : à peak=1 (cas courant), le tracé
    libre reste de facto dans ±1 puisque le canvas affiche ±1.
  - **r.5.2** (`feat`) : zone Harmoniques (DOM, pas canvas) — **code couleur des
    barres** via classe `is-unnormalized` sur `.we-harmonics-bars` : bleu (accent)
    quand `editor.canonicalNormalized`, gris sinon (signal « un clic ouvre le
    dialog edit-bars M.r.4.3 »). **Repères horizontaux** 0/0.5/1 en overlay
    pointillé (`.we-harmonics-grid`, `pointer-events:none`) sous les barres ;
    **axe Y** étiqueté 0/0.5/1 à gauche, **axe X** `kf` sous les barres
    (`xLabels` = toutes les harmoniques si cap < 8, sinon `{1,2,4,…,256} ≤ cap`).
    Plot en grille CSS (`.we-harmonics-plot`) ; le conteneur interactif des barres
    garde sa géométrie de hit-test, son **padding vertical passe à 0** pour aligner
    barres / repères / étiquettes sur les mêmes niveaux d'amplitude (corrige au
    passage un léger décalage hit-test pré-existant lié aux 6px de padding).
  - **Point signalé en revue** : les labels DOM `+1`/`-1` du canvas Forme d'onde
    devenaient faux dès que peak > 1 ; le dev les a remplacés par des étiquettes
    canvas suivant le marqueur (initiative hors prompt strict, à valider — un
    label « ±1 » textuel ailleurs reste possible si préféré).
  - Pensé comme dernier chantier de code du rattrapage ; trois finitions UX
    remontées ensuite en passe d'usage ont donné **r.5.bis** (clôture définitive).
  Spec : `docs/superpowers/specs/2026-06-01-waveform-rattrapage-design.md` (§§5.3, 7).

- **2026-06-02 — Iteration M rattrapage phase r.4 : normalisation explicite (flag d'état + courbe background + dialog edit-bars)**
  Phase UX-sémantique, 3 sous-commits dev + docs. **Diagnostic en cours de phase
  (à retenir)** : le prompt initial prévoyait une détection numérique
  `isCanonicalNormalized(canonical, cap, eps)` comparant la canonical à son
  round-trip `harmonicsToPoints(canonicalToBars(x))`, en supposant ce round-trip
  idempotent. Le dev a **mesuré** que c'est faux : le resample 600→512 par interp
  linéaire (`pointsToHarmonics`) réinjecte du leakage ~15 %/passe ; un créneau à
  `cap=256` demande 4 normalisations pour converger, et aucun seuil ne sépare
  « vraiment normalisé » de « tracé libre quasi-en-phase ». Bug remonté à l'archi
  → **pivot vers un flag d'état** `editor.canonicalNormalized` (amendement du
  prompt). Le commentaire d'`audio.js` qui affirmait l'idempotence (faux) a été
  corrigé.
  - **r.4.1** (`feat`) : flag `editor.canonicalNormalized: boolean` (type +
    `DEFAULT_EDITOR = true`), câblé dans toutes les actions qui écrivent canonical
    (true : NORMALIZE, édition de barre, LOAD_PRESET, `APPLY_EDITOR_PRESET('sine')`,
    Reset×2 ; false : tracé libre, drag d'ancre, interpolation, `SET_EDITOR_CAP`,
    hydratation, presets carré/scie/triangle ; inchangé : actions ne touchant pas
    canonical). Bouton Normaliser `disabled` + tooltip « Déjà normalisé » quand
    true. Commentaire faux d'`audio.js` (`harmonicsToPoints`) corrigé.
  - **r.4.2** (`feat`) : **courbe normalisée en background** gris discret
    (`harmonicsToPoints(canonicalToBars(canonical, cap))`, `canvas-text-primary`
    alpha 0.5, 1px) sous la canonical, dans `drawCanvas` (Libre) ET `SplineEditor`
    (Ancres), tant que le flag est false. Légende overlay `NormalizeLegend`
    (composant partagé) « actuelle » / « si normalisée ».
  - **r.4.3** (`feat`) : **dialog edit-bars** — `handleHarmonicMouseDown`
    intercepte le mousedown sur barre quand le flag est false (`pendingBarEdit` →
    `ConfirmDialog`) ; « Normaliser et continuer » enchaîne `normalize()` +
    `setHarmonicAmplitude(index, value)` du mousedown originel (2 crans undo,
    assumé) ; « Annuler » ne dispatch rien.
  - Build / typecheck / lint verts. Test manuel (9 scénarios) passé.

- **2026-06-01 — Iteration M rattrapage phase r.3 : lentilles vivantes + cleanup 'bars'**
  Phase chirurgicale (reducer + type), 2 sous-commits dev + docs :
  - **r.3.1** (`feat`) : **re-fit auto des ancres**. Nouveau helper
    `refitAnchorsAndResidual(canonical, currentAnchors, interpolation)` — re-fitte
    les ancres sur la nouvelle canonical (count préservé) puis recalcule le résidu.
    Câblé dans **5 actions** qui modifient canonical par voie non-spline :
    `SET_EDITOR_CANONICAL` (tracé libre), `SET_EDITOR_HARMONIC_AMPLITUDE` (drag de
    barre), `NORMALIZE_EDITOR_CANONICAL`, `LOAD_PRESET` (preset picker),
    `APPLY_EDITOR_PRESET` (presets rapides Sinus/Carré/Dent de scie/Triangle).
    Corrige la bizarrerie « ancres figées à `y=0` après tracé libre puis bascule
    Spline » (synchronisation ascendante de la spec §2.1/§4.1). Les actions
    d'édition explicite des ancres (`MOVE/ADD/REMOVE_SPLINE_ANCHOR`,
    `SET_SPLINE_INTERPOLATION`, `SET_EDITOR_ANCHOR_COUNT`, `RESET_EDITOR_WAVEFORM`,
    `SET_EDITOR_CAP`) n'invoquent **pas** le re-fit (raisons documentées dans le
    reducer). `APPLY_EDITOR_PRESET` = 5ᵉ call-site, non listé dans le prompt
    initial, ajouté par décision archi (même bizarrerie). Test de non-régression
    manuel (10 scénarios) passé.
  - **r.3.2** (`refactor`) : **cleanup `'bars'`** du type `WaveformLens`
    (`'free' | 'spline' | 'bars'` → `'free' | 'spline'`), vestigial depuis r.2.4
    (suppression des boutons « Convertir vers »). Mapping `currentLens → mode`
    simplifié dans `WaveformEditor.jsx` (branche `'harmonic'` inatteignable
    retirée) ; `defaultColumnWidthsForLens` ne teste plus `'bars'`.
  - Build / typecheck / lint verts.

- **2026-06-01 — Iteration M rattrapage phase r.2.6 : finitions UX (Reset resserré + iconographie Lucide)**
  Passe d'usage, 2 sous-commits dev + docs :
  - **r.2.6.1** (`feat`) : portée du **Reset resserrée** — `RESET_EDITOR_WAVEFORM`
    réinitialise canonical + ancres + interpolation + résidu (+ preset → null)
    mais **préserve le `cap`**. Ctrl+Alt+N (`RESET_EDITOR`) reste la remise à zéro
    totale. Message du ConfirmDialog adapté.
  - **r.2.6.2** (`feat`) : **iconographie Lucide** généralisée. Barre du haut :
    Presets → `FolderOpenDot`, Reset → `Eraser`, Normaliser → `Sigma`. Header
    Forme d'onde : switch 2-boutons Libre/Ancres → **toggle unique** icône
    `Spline` (label visuel du slider d'ancres) ; toggle Doux/Anguleux en **SVG
    custom** (`IconDoux`/`IconAnguleux`, nouveau `src/components/icons.jsx`, sin
    lisse vs zigzag). Header Harmoniques : indicateur non interactif
    `AlignEndHorizontal` devant le slider de plafond. Classe partagée `.icon-btn` ;
    CSS segmentées (`.we-lens-switch`, `.spline-interp-btn`) devenues mortes
    retirées. Toutes les icônes du tableau présentes en `lucide-react` 1.16 (aucun
    fallback nécessaire).
  - **r.2.6.3** (`fix`) : le **Reset préserve aussi le nombre d'ancres** (pas
    seulement le cap) — `defaultSplineAnchors(count)` régénère N ancres plates.
  - **r.2.6.4** (`feat`) : finitions header Forme d'onde — tooltips du toggle
    reformulés sans « lentille » (Mode Dessin libre/interpolé), toggle
    Doux/Anguleux **rejoint en switch segmenté**, inputs nombre d'ancres +
    harmoniques **alignés sur la hauteur des boutons**.
  - **r.2.6.5** (`feat`) : iconographie étendue au fil de l'eau — Spectrogramme
    (Direct → `Radio`, Crête → `IconCrete` SVG custom — mini-barres verticales
    coiffées de traits de crête, redessinées en r.2.6.6 ; dB reste texte) +
    presets de proportions des colonnes (`IconColumnLayout` SVG, fin des
    libellés Unicode).
  - **r.2.6.7** (`feat`) : `IconCrete` redessinée — barres + crêtes en rectangles
    pleins de **même largeur** (au lieu de traits) ; tooltip « Tenir les pics » →
    « Maintenir les crêtes ».
  - **r.2.6.8** (`feat`) : bouton **Normaliser** (Σ) déplacé de la barre du haut
    vers le **header de la zone Forme d'onde** (partagé Libre/Ancres).
  - **Convention projet actée** : Lucide en priorité, SVG style Lucide en fallback,
    **plus jamais d'Unicode** comme icône ni séparateur graphique — partout, toutes
    phases futures.

- **2026-06-01 — Iteration M rattrapage phase r.2.5 : finitions UX (silence au Reset + redraw switch lentille + header stable)**
  Passe d'usage immédiate après M.r.2. 1 fix archi + 3 sous-commits dev :
  - **(fix archi)** `RESET_EDITOR_WAVEFORM` + `DEFAULT_EDITOR.canonical` →
    **retour au silence** (canonical à zéro). Décision utilisateur : la sin
    fondamentale de r.2.2 imposait un timbre arbitraire ; on repart d'une toile
    vierge. Commit `fix(iter-M/phase-r.2.5)`.
  - **r.2.5.1** (`fix`) : redraw de la canvas Forme d'onde au switch
    Ancres→Libre. `renderCanvasArea` alterne `<SplineEditor>` ↔ `<canvas>` nu →
    React démonte/remonte le canvas Libre ; les effets draw `[points, drawCanvas]`
    et ResizeObserver `[drawCanvas]` ne se redéclenchaient pas (même canonical,
    ancien observer sur container détaché) → canvas vide jusqu'à une modif. Fix :
    re-keyer les deux effets sur `currentLens`.
  - **r.2.5.2** (`feat`) : header Forme d'onde — toggle Doux/Anguleux + slider
    Nombre d'ancres **toujours rendus** (positions stables), `disabled` en mode
    Libre (opacité + not-allowed) au lieu d'être masqués (fin du saut de layout
    au switch).
  - **r.2.5.3** (`feat`) : `<NumberInput>` à côté du slider Nombre d'ancres
    (saisie directe 4..32, commit Enter/blur → `setAnchorCount`). Prop `disabled`
    ajoutée à `NumberInput`. Partage l'état désactivé du mode Libre.
  Hors scope (inchangé) : désync ancres/canonical au switch → M.r.3 ; régression
  de phase édition barres/Normaliser → M.r.4 ; cosmétique Harmoniques → M.r.5.
- **2026-06-01 — Iteration M rattrapage phase r.2 : réorganisation UI (barre du haut + cap unifié + switch Libre/Ancres + Reset/Normaliser)**
  Mise en ordre de l'héritage transitoire de M.r.1 : l'UI restait celle de M.4
  (boutons « Convertir vers… », double contrôle cap, pas de barre globale). 4
  sous-commits :
  - **r.2.1** (`refactor`) : `DesignerToolbar` (nouveau) — barre du haut unique
    au-dessus des 3 colonnes. Gauche = identité du patch (sound tag, déplacé
    depuis le header Forme d'onde) ; droite = presets de proportions + toggle
    Auto (déplacés depuis `DesignerColumns`, qui ne garde que les séparateurs +
    le tracking focus). Rendue desktop **et** mobile (identité seule en mobile).
    `patchLabel` exposé via l'API children. SplineEditor perd `soundTag`.
  - **r.2.2** (`feat`) : boutons **Presets** (déplacé depuis le header
    Harmoniques) et **Reset** dans la barre. Reset → ConfirmDialog systématique
    → `RESET_EDITOR_WAVEFORM` (réinit du timbre seul : canonical, cap 256,
    8 ancres plates, résidu nul, preset null ; ADSR / amplitude / test* /
    currentLens / currentPatchId préservés). Distinct de `RESET_EDITOR`
    (« Nouveau patch »). [r.2.2 avait posé `DEFAULT_EDITOR.canonical` = sin
    fondamentale ; **annulé en r.2.5** → retour au silence, cf. plus haut.]
  - **r.2.3** (`feat`) : bouton **Normaliser** + séparateur visuel.
    `NORMALIZE_EDITOR_CANONICAL` (undoable) — iDFT à phase canonique sur les
    `cap` premières amplitudes véritables, résidu recalculé. Toujours cliquable,
    pas de dialog, aucune détection d'état (M.r.4).
  - **r.2.4** (`feat`) : **contrôle unique du cap** (slider 1..256 + readout
    « N / 256 ») dans le header Harmoniques — fin du double contrôle (NumberInput
    N + slider Définition supprimés). Barres **toujours éditables** (décision
    archi ; plus de chemin vers 'bars'). **Switch Libre/Ancres** dans le header
    Forme d'onde (free↔spline) + (en Ancres) Doux/Anguleux remonté depuis
    SplineEditor + slider « Ancres : N / 32 » (`SET_EDITOR_ANCHOR_COUNT`,
    re-fit `fitAnchorsToCurve`, canonical inchangée). Tous les boutons
    « Convertir vers… » supprimés ; `SplineEditor.convertButtons` →
    `headerControls` ; alias `setN`/`setDefinition` supprimés (seul `setCap`).
  Hors scope (rappel) : synchronisation vivante des lentilles + re-fit auto au
  tracé → M.r.3 ; détection d'état normalisé + courbe normalisée en background
  → M.r.4 ; repères/axes Harmoniques + auto-fit Y Forme d'onde → M.r.5.
  Spec : `docs/superpowers/specs/2026-06-01-waveform-rattrapage-design.md` (§§5.1-5.3, 6).
- **2026-06-01 — Iteration M rattrapage phase r.1 : modèle unifié + migration v1→v2 + hygiène canvas**
  Pivot du Designer silo-té (union discriminée draw/harmonic/spline + conversions
  destructives + verrou 🔒) vers une **courbe canonique unique** et trois
  lentilles toujours synchronisées. 5 sous-commits :
  - **r.1.1** (`refactor`) : `types.ts` — drop `WaveformMode` + `DrawPatch`/
    `HarmonicPatch`/`SplinePatch` + l'union ; `Patch` unique (`canonical` 600,
    `cap` 1..256, `anchors`, `interpolation`, `residual` 600). Editor gagne
    `currentLens` (volatile). Constantes reducer `CAP_MIN/MAX/DEFAULT_CAP/clampCap`.
  - **r.1.2** (`refactor`) : reducer — `SET_EDITOR_CANONICAL` (ex-POINTS),
    `SET_EDITOR_CAP` (ex-DEFINITION/N), `SET_EDITOR_CURRENT_LENS` (volatile) ;
    drop `CONVERT_EDITOR_TO_*`. Édition de barre → iDFT à phase canonique
    (régression de phase assumée jusqu'à M.r.4). `LOAD_PRESET` (handler ajouté).
    Drag d'ancre : `canonical = spline(anchors) + residual` (le résidu survit).
  - **r.1.3** (`feat`) : migration v1→v2 idempotente (`migrateLegacyPatch`,
    `spline.fitAnchorsToCurve`) à l'hydratation localStorage ET à l'import .osa
    v1 ; `OSA_VERSION = 2`, `validatePayload` accepte v1+v2.
  - **r.1.4** (`refactor`) : chaîne audio + composants → `canonical`/`cap` ;
    anciens boutons de conversion → bascules de lentille (`setCurrentLens`) ;
    suppression des dialogs `ConvertTo{Harmonic,Spline}Dialog` et des badges 🔒 ;
    bug « preset ne charge pas » résolu (handler reducer + action creator
    manquants). Build/typecheck/lint verts.
  - **r.1.5** (`chore`) : `src/lib/canvas.js` (`withSavedCtx`) appliqué à tous
    les rendus canvas du Designer (WaveformEditor `drawCanvas`/`drawAdsr`,
    SplineEditor, Spectrogram `drawStatic`/`drawLive`).
  Déviation M.r.1 assumée : double contrôle (slider « Définition » + input
  « Harmoniques ») pilotant `cap`, à consolider en un seul contrôle en M.r.2.
  Spec : `docs/superpowers/specs/2026-06-01-waveform-rattrapage-design.md`.
- **2026-05-31 — Iteration M phase M.5a : extension renderer math `\sum`**
  Réintègre `\sum` dans le renderer maison (exclu en L.R avec `\prod`/`\int`/
  matrices), parce que la DFT (`X_k = Σ_{n=0}^{N-1} x_n · e^{-i2πkn/N}`, à
  poser en M.5b) est la seule formule du corpus qui en a besoin. Le reste des
  grands opérateurs reste hors scope. 2 sous-commits.
  - **5a.1 (`feat phase-5a.1`)** : `mathParse.js` reconnaît `\sum` comme
    opérateur à bornes — capture jusqu'à deux groupes `_{…}`/`^{…}` qui suivent,
    **dans n'importe quel ordre** (boucle 2 passes, assignation par caractère),
    en sous-AST récursifs ; nœud compact `{type:'sum', lower, upper}` (null si
    borne absente). `\sum` seul → Σ littéral. `_`/`^` sans accolade → warn dev
    + retombe en littéral via le scan principal (pas de crash, cohérent ^/_).
  - **5a.2 (`feat phase-5a.2`)** : `displayMode` propagé de `renderMath` (block →
    true, inline → false) à travers la récursion (info déjà portée par le nœud
    math `inline` côté `markdown.js`). `renderSum` : inline → Σ + bornes en
    sub/sup natifs à droite (compact) ; display → grille CSS `.md-sum-display`
    (borne haute / Σ agrandi / borne basse, centrées, « comme au tableau »).
    Bornes toujours rendues en textstyle. Pas de vérif visuelle dédiée (M.5b
    posera la DFT) : AST validé sur les 5 cas de la table + build OK.
- **2026-05-30 — Iteration M phase M.3 : mode points/spline**
  3ᵉ et dernier mode de fabrication de timbre, propre par construction (les
  courbes lisses portent peu d'harmoniques hautes). Réutilise le pattern
  d'interaction de l'éditeur ADSR (poignées draggables, courbe recalculée au
  drag). Principe M.2 conservé : une vérité éditable (`anchors` + `interpolation`)
  + un dérivé `points` (ombre) → chaîne audio inchangée. 3 sous-commits.
  - **3.1 (`refactor phase-3.1`)** : `SplinePatch` (`mode:'spline'`, `anchors`
    4..32 `{x∈[0,600), y∈[-1,1]}`, `interpolation` 'soft'|'hard', **pas de
    `definition`**) ajouté à l'union discriminée. `src/lib/spline.js` : `splineSoft`
    (Catmull-Rom périodique — Hermite cubique y(x), voisins wrappés ±600 pour x
    monotone, continuité C¹ à la frontière x=600↔0) et `splineHard` (polyligne
    périodique fermant la boucle), sortie `Float32Array(600)` clampée [-1,1].
    Reducer : `MOVE`/`ADD`/`REMOVE_SPLINE_ANCHOR` (X clampé entre voisins,
    refus au min 4 / max 32) + `SET_SPLINE_INTERPOLATION`, toutes undoable
    (draft local committé au mouseup côté éditeur → 1 cran undo/geste).
    `sanitizeAnchors`, `defaultSplineAnchors`, hydratation forward-compat
    localStorage. `patchModeFields`/`HYDRATE`/`UPDATE_PATCH` mode-aware.
  - **3.2 (`feat phase-3.2`)** : `SplineEditor.jsx` — canvas courbe + poignées
    d'ancres (pastilles cerclées d'accent, pleine si active). Clic hors poignée
    = ajout, Suppr/Backspace + menu contextuel clic droit = retrait, toggle
    Doux/Anguleux dans le header. `WaveformEditor.renderCanvasArea` dispatche
    vers lui en mode spline ; Harmoniques read-only montre la **DFT pleine**
    (pas de `definition`) + 🔒 ; `effectiveDefinition` = full pour harmonic ET
    spline. Refs miroir mis à jour en effet (react-hooks/refs), double-rAF RO.
  - **3.3 (`feat phase-3.3`)** : `ConvertToSplineDialog` (N ancres défaut 8 +
    interpolation défaut Doux), réutilisé draw→spline et harmonic→spline
    (échantillonne N ancres équiréparties depuis `editor.points`). spline→draw
    réutilise `ConfirmDialog` (`CONVERT_EDITOR_TO_DRAW` rendu mode-agnostique :
    part de `editor.points`, l'ombre du mode) ; spline→harmonic réutilise
    `ConvertToHarmonicDialog` (DFT). 2 boutons contextuels par mode, conversions
    atomiques, snap proportions au mode cible (spline = ½¼¼). osaFormat +
    libraryTransfer : round-trip `.osa` du mode spline.
- **2026-05-30 — Iteration M phase M.2-AS : toggle auto-sizing (essai)**
  Couche opt-in (OFF par défaut) posée par-dessus l'état de proportions M.2 :
  la disposition des 3 colonnes devient contextuelle au focus. **Essai
  explicite** — à confirmer/jeter avant clôture M (critère : accélère sans
  distraire vs whiplash de reflow / gêne d'éditer un spectro rétréci). 3
  sous-commits.
  - **AS.1 (`feat phase-2-as.1`)** : champ `autoSizing` (persisté, défaut
    `false`), action `SET_AUTO_SIZING` (non undoable, comme
    `SET_DESIGNER_COLUMN_WIDTHS`), toggle « Dimension auto » poussé à droite de
    la barre des presets. OFF = M.2 + son follow-up snap-on-convert inchangés.
  - **AS.2 (`feat phase-2-as.2`)** : tracking de focus dans `DesignerColumns`
    via `document.addEventListener('mousedown', …, true)` — capture, attaché
    seulement quand ON (rien sinon). Décision clé : la capture résout le focus
    et réécrit `designerColumnWidths` **avant** que l'éditable ne traite son
    mousedown (React délègue à la racine, descendante de `document`). 3 états
    stables, le repos = focus-spectro. Focus volatile (ref `focusColRef`, jamais
    persisté). « Hors widget » testé sur `.designer-columns` (root) → la barre
    presets/toggle reste neutre, ce qui préserve le pin-en-basculant-OFF.
  - **AS.3 (`feat phase-2-as.3`)** : guard partagé (`useRef` créé dans `App`,
    passé à `DesignerColumns` writer + `WaveformEditor` reader). Levé le temps
    du mousedown qui *change* le focus ; `handleMouseDown` (canvas) et
    `handleHarmonicMouseDown` (barres) testent `autoSizing && guard.current` en
    tête et s'abstiennent → le premier clic focuse, l'édition reprend au geste
    suivant (colonne à 60 %, contenu stable). Séparateur déjà isolé par le
    `stopPropagation` de M.2 (2.2). **Retrait = supprimer toggle + `useEffect` +
    champ persisté → M.2 intact, zéro détricotage.**
- **2026-05-30 — Iteration M phase M.2 : layout 3-vues + patch typé + éditeur
  Harmoniques + passerelle**
  Phase la plus structurante de M : coexistence des modes de timbre et layout
  adaptatif qui les héberge. 5 sous-commits.
  - **SC1 (`refactor phase-2.1`)** : Patch typé en union discriminée
    `DrawPatch | HarmonicPatch` (`mode`). Décision clé : `harmonicsToPoints`
    (iDFT `Σ aₖ·sin(2πkx/600)`) reconstruit `points` pour un patch harmonique
    et le stocke → **toute la chaîne audio existante (playback timeline, export
    WAV, miniatures) joue un patch harmonique sans une ligne de code modifiée**,
    car le round-trip iDFT→DFT est propre à 512 échantillons (k≤256 sur un bin
    exact). `amplitudes` est la vérité éditable, `points` son ombre dérivée.
    Hydratation rétro-compat (mode absent → 'draw', pas de migration), SAVE/
    UPDATE/HYDRATE/RESET mode-aware, actions `SET_EDITOR_N` /
    `SET_EDITOR_HARMONIC_AMPLITUDE` / `CONVERT_EDITOR_TO_{HARMONIC,DRAW}`
    (undoables), round-trip `.osa` + libraryTransfer.
  - **SC2 (`feat phase-2.2`)** : `DesignerColumns` — moitié haute en 3 colonnes
    (Forme d'onde / Harmoniques / Spectro) ajustables. Presets ⅓⅓⅓·½¼¼·¼½¼·¼¼½,
    séparateurs glissables (`mousedown` capture l'event, `stopPropagation` →
    anticipation M.2-AS), `designerColumnWidths` persisté (défaut par mode). Le
    spectro devient une colonne permanente : toggle « Spectro » retiré,
    `spectrogramVisible` vestigial (clé localStorage conservée).
  - **SC3 (`feat phase-2.3`)** : éditeur de barres. Mode harmonic = N barres
    bleues éditables (drag vertical = amplitude, 1 barre/geste verrouillée à
    l'index, commit unique → 1 undo ; bouton N 16..256). Mode draw = read-only,
    magnitudes DFT tronquées à `definition` (lues sur `editor.points` committé,
    cohérent spectro), grisées + 🔒. `draftAmplitudes` → reconstruction iDFT
    live (forme d'onde + audio).
  - **SC4 (`feat phase-2.4`)** : la vue éditable suit le mode, les autres
    deviennent read-only (🔒). Forme d'onde read-only en harmonic
    (reconstruction iDFT, handlers coupés, presets masqués, `effectiveDefinition
    = HARMONIC_COUNT` à l'audio). Slider Définition masqué en harmonic (N joue
    ce rôle). Spectro inchangé (moniteur).
  - **SC5 (`feat phase-2.5`)** : passerelle. « Convertir en Harmoniques »
    (`ConvertToHarmonicDialog`, choix N défaut 24, DFT + troncature k=1..N,
    phase abandonnée) et « Convertir en Dessin » (`ConfirmDialog`, iDFT vers
    points ré-éditables, definition remise à 256). Conversions atomiques
    undoables (un cran annule toute la conversion). Follow-up (2026-05-30) : la
    conversion snappe aussi `designerColumnWidths` au défaut du mode cible (vue
    éditable large) — non-undoable, comme les autres ajustements de proportions.
  - **Décisions / limites** (à confirmer par l'archi à la passe visuelle) :
    spectro = colonne permanente (toggle retiré) ; pas de color-coding
    vert/bleu/ambre (accent cyan partout, bars éditables en accent,
    read-only grisées) ; sweep multi-barres reporté (BACKLOG) ; pas d'animation
    de transition au changement de N.
  - Hors scope (phases dédiées) : auto-sizing → M.2-AS ; spline → M.3 ;
    presets → M.4 ; doc + renderer `\sum` → M.5a/b.

- **2026-05-30 — Iteration M phase M.1 : bump cap 256 + slider Définition**
  Première phase audio de M, volontairement détachée et en tête : dé-risque
  l'UX cœur « dessine sale → glisse → propre » au coût le plus bas, avant la
  refonte structurelle M.2 (layout 3-vues + patch typé + barres).
  - **SC1 (`feat phase-1.1`)** : bump du plafond d'harmoniques 128→256.
    `NUM_SAMPLES` 256→512, `HALF_HARMONICS` 129→257, `HARMONIC_COUNT` 128→256.
    Rééchantillonnage 600→512 (même interpolation linéaire), même troncature
    (miroir conjugué redondant, désormais k=257..511). On récupère la richesse
    que les 600 points portaient et qu'on jetait : les basses (G2 ≈ 98 Hz →
    ~204 harmoniques audibles, dont 128 seulement livrées) gagnent leur plein
    potentiel ; au-dessus de ~156 Hz, aucun changement. Self-test FFT DEV
    inchangé (invariant en N). Stade dev → pas de migration localStorage.
  - **SC2 (`feat phase-1.2`)** : slider « Définition ». Champ `Patch.definition`
    (number 1..256, défaut 256 = aucune coupe) ajouté à `types.ts`, persisté.
    Troncature M/256 **en aval** dans `pointsToPeriodicWave(points, ctx,
    definition)` (zéroe k > definition après le cache `pointsToHarmonics`, cheap
    O(N), pas de cache composite). Câblée partout où l'on synthétise :
    preview live + mode Libre (`WaveformEditor`), lecture Composer + export WAV
    (`usePlayback`). Spectro statique tronqué à l'identique (prop `definition`,
    redraw sur changement). Modèle : `editor.definition` + action
    `SET_EDITOR_DEFINITION` (undoable designer, pattern `amplitude` — le slider
    édite le working state, mirroré sur le Patch au save via `buildPayload`/
    `SAVE_PATCH`/`UPDATE_PATCH`, hydraté par `HYDRATE_EDITOR_FROM_PATCH`).
    Rétro-compat : patches localStorage et imports `.osa` sans champ → 256
    injecté (son préservé) ; validation `.osa` optionnelle (entier [1,256] si
    présent), export normalisé. UI : slider en tête de la colonne de paramètres
    du Designer, readout « N / 256 », libellé via `strings.js`.
    **Note d'implémentation** : le prompt suggérait l'action `SET_PATCH_DEFINITION`
    et présentait `definition` comme un champ « patch » ; routé via l'`editor`
    (`SET_EDITOR_DEFINITION`) pour coller au pattern existant (amplitude/ADSR) et
    fonctionner sur un patch neuf non encore sauvegardé. Le champ persisté reste
    `Patch.definition`.
  - Reste mono-mode (dessin libre) ; le typage `draw`/`spline`/`harmonic` et
    l'éditeur de barres viennent en M.2 (le slider disparaîtra alors au profit
    du N du mode barres). Build / lint / typecheck verts.
  - 2 commits : `feat(iter-M/phase-1.1)` + `feat(iter-M/phase-1.2)`.

- **2026-05-29 — Iteration M préalable B : francisation des libellés**
  Normalisation FR du chrome UI via chaînes centralisées (graine i18n posée
  avant M.2, pour que les nouveaux libellés Waveform naissent cohérents). Pas
  de lib i18n, pas de multilingue : juste l'infra + le FR.
  - **SC1 (refactor)** : audit `archi/M0-audit-francisation.md` (app déjà
    ~99 % FR ; reliquats EN concentrés). Module `src/lib/strings.js` (clés
    sémantiques → texte, termes gardés + cas « à arbitrer » inclus). 9
    composants recâblés pour consommer les clés. Valeurs inchangées → rendu
    identique.
  - **SC2 (feat)** : traductions claires. Onglets Designer→**Création**,
    Composer→**Composition** (+ toutes les références en prose, accord
    d'article). Forme d'onde, presets (Sinusoïde/Carrée/Dent de scie),
    Effacer ; AHDSR Attaque/Tenue/Déclin/Maintien/Relâchement ; Mute/Unmute→Mettre
    en sourdine/Réactiver le son ; root→Racine (BibBreadcrumb.parsePath
    accepte 'racine' en plus de 'root', additif). « patch » et acronymes
    (ADSR/BPM/Hz/A4…) conservés.
  - **Arbitrage archi (2026-05-29, appliqué)** : Play/Stop→Lire/Arrêter,
    Export…→Exporter…, Test→Tester, Peak→Crête, Live→Direct, « Canvas vide »→
    « Zone de dessin vide ». Révision AHDSR (2026-05-30) : Hold→**Tenue**,
    Sustain→**Maintien** (idem pédale clavier Espace) — set
    Attaque/Tenue/Déclin/Maintien/Relâchement. Conservés : Spectro, Solo, OK.
    Commits : `feat(iter-M/phase-0b): libellés arbitrés` puis `… libellés AHDSR`.
  - Hors scope respecté : zéro changement fonctionnel/audio, aucune clé
    localStorage / data-anchor / action-type / id touchée, aucun fichier ni
    composant renommé. build/typecheck/lint OK. dev server non touché.
  - 2 commits : `refactor(iter-M/phase-0b)` + `feat(iter-M/phase-0b)`.

- **2026-05-29 — Iteration M préalable A : migration TypeScript (phases 0+1)**
  Adoption TS incrémentale, fichier par fichier, sans casse — posée avant la
  perf et avant M.2 (qui a besoin d'un Patch typé). Contrainte « Pas de
  TypeScript » levée par décision archi (CLAUDE.md racine mis à jour).
  - **Phase 0** : devDep `typescript` (les `@types/react*` étaient déjà là),
    `tsconfig.json` (allowJs, checkJs:false, strict:false, noEmit, jsx
    react-jsx, moduleResolution bundler, skipLibCheck). Build vite inchangé.
  - **Phase 1** : `src/types.ts` — modèle actuel typé tel quel (Patch, Clip,
    Track, TuningSystem + registre polymorphe xEdoN, AppState complet, union
    **discriminée** `Action` = toutes les actions du switch + 6 UNDO/REDO_* +
    `meta.skipUndo` distribué). Conversion `tuningSystems.js → tuningSystems.ts`
    (git mv pour le blame ; registre `Record<TuningSystemId, TuningSystem>`,
    helpers/freq/frequencyToNearestIn annotés ; import explicite corrigé dans
    `osaFormat.js`). Câblage reducer : JSDoc `@param/@returns` (Action/AppState)
    + `@type Editor` sur DEFAULT_EDITOR — commentaires qui s'effacent au build.
  - **Choix `// @ts-check` vs JSDoc** : un passage @ts-check temporaire a
    validé que le corps du reducer est cohérent avec l'union `Action`, à un
    seul détail — la garde défensive `typeof … || … === null` de
    SET_CURRENT_ARTICLE que TS sur-restreint à `never`. La forcer imposait soit
    un changement de code (bundle non identique), soit un cast contournant le
    check : les deux contre « zéro changement runtime / s'efface au build ».
    JSDoc retenu (option explicitement sanctionnée par le prompt archi).
  - Pas d'anticipation des champs Waveform de M.2 (draw/spline/harmonic).
  - Vérifs : `tsc --noEmit` clean, build vite byte-identique (même hash), lint
    vert. dev server non touché (géré côté utilisateur).
  - 4 commits : `chore(iter-M/phase-0)`, puis 3× `refactor(iter-M/phase-1)`
    (types / tuningSystems / câblage reducer).

- **2026-05-28 — Iteration L phase 5 + clôture (release v1.4.0)**
  Fin de l'Itération L (Documentation). Deux pistes parallèles convergent :
  l'agent writer livre le corpus, le dev acte la release.
  - **Corpus (writer)** : 2 glossaires, 4 articles de vulgarisation
    « Comprendre », 12 fiches tempéraments, 3 guides de prise en main,
    article « Limites connues ». TOC réorganisée en 6 sections (Le projet /
    Prise en main / Comprendre / Concepts / Tempéraments / Référence).
  - **Rebranchement des liens (writer)** : DocLink des guides vers les
    ancres d'UI + liens glossaire→fiches tempéraments rendus actifs
    (commit `f1d6790`).
  - **Ancres `data-anchor` (dev)** : pose côté code de `composer-export-button`
    (Toolbar), `composer-add-track-button` (Timeline), `designer-amplitude`
    (WaveformEditor), `library-new-folder-button` (PatchBank), consommées par
    les DocLink des guides. `composer-duration-buttons` était déjà appliquée
    depuis L.1.3 (le « fix » du prompt s'est révélé sans objet, vérifié au
    blame). Commit `63ea102`.
  - **Retrait du fichier de test** : `_renderer-test.md` supprimé de
    `src/docs/` et de `index.js` (commit `66e703f`), le renderer étant
    désormais exercé par le corpus réel.
  - **Release** : `package.json` 1.3.0 → 1.4.0 (injecté `__APP_VERSION__`,
    affiché dans le header), sync de la chaîne version dans `about.md`.
  - **Bilan itération** : 4e onglet Documentation, renderer Markdown maison
    + math, overlay raccourcis (Ctrl+K), Tour guidé (Ctrl+J), DocLink
    bidirectionnels, corpus complet. Zéro dépendance npm ajoutée. L.6 (démos
    écoutables) / L.7 (exercices guidés) restent en option de backlog.

- **2026-05-28 — Iteration L phase R.4 (délimiteurs extensibles)**
  Extension du renderer math décidée par l'archi en cours de route : la
  forme « tableau » de $(3/2)^{12}$ veut des parenthèses qui grandissent
  avec la fraction. Révise la borne « pas de `\left\right` » de la phase R.
  - **Parsing** (`mathParse.js`) : `matchDelim` apparie `( )` et `[ ]` en
    respectant l'imbrication des délimiteurs ET des accolades
    (`(\frac{a}{b})` : le `)` est après le `}`). Noeud `{type:'delim',
    open, close, children}`. Délimiteur non fermé → littéral (gracieux).
  - **Rendu** (`MarkdownRenderer.jsx`) : `renderDelim` + `isTall`. Contenu
    sans fraction → glyphes littéraux (`Fragment`, aucune régression sur
    `(n/12)`). Contenu avec fraction → bords dessinés en CSS (bordure +
    `border-radius` % pour les parenthèses, angles droits pour les
    crochets) dans un `inline-flex; align-items: stretch` qui les étire à
    la hauteur du contenu — sans mesure JS.
  - **Doc** : `why-12-notes.md` passe `(3/2)^{12}` → `(\frac{3}{2})^{12}`
    (vraie fraction empilée sous parenthèses extensibles) ;
    `_renderer-test.md` exerce le cas. Zéro npm ajouté.

- **2026-05-28 — Iteration L phase R (math renderer maison)**
  Extension du renderer Markdown au support des formules (pas de KaTeX),
  intercalée entre L.4 et L.5 : les contenus L.5 (fiches tempéraments,
  glossaires, articles) généreront massivement ratios, cents et exposants.
  Trois sous-commits.

  - **L.R.1 — parsing math** : sous-parser récursif `src/lib/mathParse.js`
    (scan à buffer + matching d'accolades). Tokens `^{…}`/`_{…}` (accolades
    obligatoires pour désambiguïser), `\frac{a}{b}`, `\cmd` → ~12 symboles
    Unicode, lettre latine isolée → `var` (italique), reste → texte ;
    contenu des accolades re-parsé en math (récursion). Dans `markdown.js` :
    token inline `$…$` dans `parseInline`, bloc `$$…$$` (mono/multi-ligne)
    dans `parseMarkdown` sur le modèle du code fence, `$$` ajouté à
    `BLOCK_BREAK`. mathAst construit au parse (pas de content brut). Pas
    d'escape `\$` (un `$` non apparié reste littéral). Commande inconnue /
    construct mal formé → littéral + `console.warn` dev, jamais de crash.

  - **L.R.2 — rendu + CSS** : `renderMath` récursif dans MarkdownRenderer
    (sup/sub → balises natives, frac → barre CSS empilée via `border-top`
    du dénominateur, var → `<i>`, text → string), cas `math` inline (span)
    et block (div centré). CSS : `.md-frac` inline-flex colonne recentré,
    `.md-math-block` centré/agrandi, sup/sub à `line-height: 0` pour ne pas
    casser l'interligne. Dispatch pur (mathAst déjà construit).

  - **L.R.3 — validation + doc** : `_renderer-test.md` enrichi d'une
    section « Formules (L.R) » (inline, exposant, indice, fraction,
    imbrication, symboles, block mono/multi-ligne, commande inconnue).
    Validé par rendu SSR du composant (DOM conforme aux sélecteurs CSS) +
    `parseMath`/`parseMarkdown` testés unitairement ; rendu pixel à
    confirmer à l'œil. Zéro npm ajouté. **Prochaine : L.5 (rédaction).**

- **2026-05-28 — Iteration L phase 4 (Tour guidé) — V1 Itération L**
  Diaporama d'info-bulles ancrées sur l'UI de l'onglet actif. 3e et dernier
  entrypoint additif de l'Itération L. Six sous-commits.

  - **L.4.1 — state tour + déclarations** : state plat `tour`
    (`{active, tabId, stepIndex, snapshot}`), volatile — absent de la
    sérialisation localStorage, hors `*_UNDOABLE`. Actions `START_TOUR`
    (snapshot unique si `!active` : `activeTab` + `designerSidebarCollapsed`
    + `docSidebarCollapsed` + `composerBank/AsideCollapsed`), `TOUR_GOTO`,
    `TOUR_NEXT`, `TOUR_PREV`, `TOUR_CHAIN` (sans re-snapshot), `END_TOUR`
    (restaure le snapshot), `END_TOUR_NO_RESTORE`. Tours déclaratifs
    `src/lib/tours/{library,designer,composer,documentation}.js` + `index.js`
    (1er jet des textes). Nouvelles `data-anchor` : `designer-waveform`,
    `designer-system-selector`, `designer-adsr`, `designer-spectrogram`,
    `composer-transport`, `composer-bpm`, `composer-timeline`,
    `composer-properties`, `library-hierarchy-mode`, `library-display-mode`,
    `doc-toc`, `doc-content`.

  - **L.4.2 — `Tour.jsx` spotlight + bulle** : blocker plein écran (gel
    clic/molette), spotlight box-shadow sur l'ancre, bulle ancrée (placement
    dessous/dessus/clampé viewport, mesurée pour la hauteur). 3e consommateur
    de `getAnchoredPosition` ; résolution en RAF borné 800 ms (timestamp rAF,
    pas `performance.now`) pour le montage différé + ouverture de sidebar.
    Séquence effective : disponibilité statique (ancre présente OU sidebar à
    déplier) → navigation `TOUR_GOTO(rawIndex)` ; ancre absente sans sidebar
    = skip. `prefers-reduced-motion`. Déclencheur debug retiré en L.4.4.

  - **L.4.3 — progress bar + sortie** : `tabs-buttons` masqué
    (`visibility:hidden`, rect préservé) ; progress bar superposée ancrée sur
    `header-tabs-zone`, un segment par étape effective, courante mise en
    évidence, segments cliquables (`TOUR_GOTO`). Croix 36px haut-droite →
    `END_TOUR`. ESC + gel clavier en capture phase (absorbe toute frappe,
    devance les handlers métier et l'overlay raccourcis).

  - **L.4.4 — Compass + Ctrl+J + snapshot réel** : bouton `Compass` dans le
    header (`data-anchor="header-tour-button"`, état actif, style calqué sur
    le toggle raccourcis), ordre `[theme] [Keyboard] [Compass] vX.X.X`.
    Handler global `Ctrl/Cmd+J` (`preventDefault`, exclusions form field /
    modale / overlay / tour actif). Cycle snapshot/restore vérifié. Garde de
    persistance pendant le tour (un refresh en plein tour ne fige pas une
    sidebar dépliée).

  - **L.4.5 — chaînage + En savoir plus** : fin de tour → panneau « Continuer
    vers X, Y ou Z ? » (`TOUR_CHAIN` sans re-snapshot) + Quitter (`END_TOUR`).
    « En savoir plus » si l'étape porte un `article` présent dans `DOC_TOC`
    → `END_TOUR_NO_RESTORE` + bascule Documentation + `SET_CURRENT_ARTICLE`.
    État de fin dérivé d'une clé d'étape (zéro effet setState).

  - **L.4.6 — doc** : CONTEXT.md (TL;DR, État actuel, Historique, Modèle de
    données, Décisions architecturales, Arborescence, Roadmap).

  - **Correctifs post-livraison (2026-05-28)** : (a) l'étape « Enregistrer »
    du tour Designer ciblait `designer-save-button`, rendu uniquement avec un
    patch chargé → bulle vide au démarrage à froid ; recible sur
    `designer-save-as-button` (toujours présent). (b) Navigation au clavier
    ← / → entre étapes (handler de gel clavier, nav lue via une ref synchronisée
    hors render). (c) Panneau de fin transformé en **position virtuelle**
    (état `atEnd` explicite, plus dérivé de `stepIndex`) : ← y revient à la
    dernière étape puis → ré-ouvre le panneau (le bug « impossible de revoir
    la dernière étape » venait de la dérivation par clé d'index). (d) Au
    panneau de fin, spotlight éteint (voile plein écran `tour-dim`) et bulle
    centrée dans le viewport (plus d'ancre à pointer).

- **2026-05-28 — Iteration L phase 3 (DocLink actif + highlight)**
  Navigation interne de la doc rendue active. Quatre sous-commits.

  - **L.3.1 — `highlightElement` + halo CSS** : `src/lib/highlightElement.js`
    (`highlightElement(anchorId, {duration=3600, maxWaitMs=800})`), 2e
    consommateur de `getAnchoredPosition`. Boucle de retry
    `requestAnimationFrame` bornée par `performance.now()` pour absorber
    le montage différé de l'onglet cible ; à la résolution, `scrollIntoView`
    + ajout d'une classe flash retirée après `duration`, re-trigger propre
    via `WeakMap` de timers. Halo `src/styles/highlight.css` (outline +
    box-shadow hors flux pour ne pas déplacer l'élément, variables accent,
    durée pilotée par `--doc-highlight-duration`, `prefers-reduced-motion`).
    Importé une fois dans `App.jsx`. Pas encore appelé à ce stade.

  - **L.3.2 — DocLink actif** : `MarkdownRenderer` crée un
    `MarkdownNavContext` (`{onDocLink, onDocNav}`, défauts null) et accepte
    les props correspondantes. Le nœud `docLink` devient le sous-composant
    `DocLinkAnchor` (consomme le contexte, `preventDefault` +
    `onDocLink?.(target)`, inerte sans provider), distingué visuellement
    (soulignement pointillé + icône `ArrowUpRight`). `App.jsx` :
    `handleDocLink(target)` splitte sur le 1er `:`, valide l'onglet
    (sinon warn dev), `setActiveTab` + `highlightElement(anchor)`. Prop
    `onDocLink` threadée via `DocumentationTab` → `MarkdownRenderer`.

  - **L.3.3 — liens doc→doc** : dans `renderInline`, un nœud `link` dont
    `href` commence par `doc:` est rendu par `DocNavLink` (`preventDefault`
    + `onDocNav?.(href.slice(4))`) ; les liens http(s)/natifs gardent le
    comportement L.2. `DocumentationTab` fabrique `onDocNav` borné à
    `DOC_TOC` (cible inconnue = no-op + warn dev) ; le scroll de l'article
    cible repart de sa position sauvée via l'effet L.2 existant.

  - **L.3.4 — doc** : `_renderer-test.md` enrichi d'une section
    "Navigation interne (L.3)" couvrant les 4 cas (DocLink valide /
    ancre introuvable, lien doc→doc valide / cassé) ; note L.2-inerte
    obsolète mise à jour. CONTEXT.md (TL;DR, État actuel, Roadmap,
    Décisions architecturales, Arborescence, cet historique).

- **2026-05-27 — Iteration L phase 2 (onglet Documentation)**
  Squelette fonctionnel du 4e onglet utilisateur. Cinq sous-commits
  cumulatifs (chacun testable indépendamment) suivis de la doc.

  - **L.2.1 — onglet + state reducer** : `Tabs.jsx` étendu à 4
    onglets (Bibliothèque / Designer / Composer / **Documentation**)
    avec `data-anchor="tab-documentation"` (cohérence convention L.1).
    Nouveau state `doc.{currentArticleId, scrollPositions}` hydraté
    depuis sessionStorage `synth-app-doc-session` via
    `loadDocSession()` ; nouvelles prefs `docSidebarCollapsed`,
    `docSidebarWidth` en localStorage. Actions `SET_CURRENT_ARTICLE`,
    `SET_ARTICLE_SCROLL`, `TOGGLE_DOC_SIDEBAR`,
    `SET_DOC_SIDEBAR_WIDTH`. Constantes `DOC_SIDEBAR_*`,
    `DOC_SESSION_KEY`, `DEFAULT_DOC_ARTICLE_ID = 'about'`. Validation
    `activeTab` étendue. Commit fonctionnellement neutre côté app
    principale (placeholder "bientôt").
  - **L.2.2 — renderer Markdown maison** : `src/lib/markdown.js` =
    parser ~200 lignes JS pur, deux passes — blocs ligne-par-ligne
    (BLOCK_BREAK regex pour clore un paragraphe) + inline scan/flush
    récursif (tokens imbriqués gérés par re-parse de la sous-chaîne).
    Sous-ensemble V1 : H1-H4, paragraphes, listes ord/non-ord +
    1 niveau d'imbrication, blockquote, code block fenced avec lang,
    gras (`**`), italique (`*`), code inline (`` ` ``), liens
    `[label](href)`, images `![alt](src)`, `<DocLink target="…">…
    </DocLink>` parsé mais rendu inerte en L.2 (TODO L.3).
    `MarkdownRenderer.jsx` : `useMemo` sur source, dispatcher
    `renderBlock` / `renderInline`. CSS `MarkdownRenderer.css` :
    typographie pédagogique (line-height 1.65, max-width 72ch),
    palette CSS sémantique. Liens externes `target=_blank` +
    `rel="noopener noreferrer"` automatiques. Limitations connues :
    pas d'escape `\*`, parenthèses non-encodées dans une URL
    d'image cassent le regex (workaround : `%28`/`%29`).
  - **L.2.3 — layout DocumentationTab** : `DocumentationTab.jsx`
    avec sidebar TOC collapsible/resizable (pattern Designer/Composer,
    `--doc-sidebar-width` + `DOC_SIDEBAR_COLLAPSED_WIDTH`) et zone
    contenu scrollable. Restauration de scroll par article au switch
    via `setTimeout 0` (attendre le paint) ; sauvegarde au scroll
    avec débounce 200 ms. Cleanup du timer au switch et à l'unmount
    pour éviter d'écraser une position fraîchement restaurée. Dispatch
    sur `entry.type === 'markdown'` → `MarkdownRenderer`. Page
    d'accueil avec empty-state quand TOC vide ou article null.
    `src/docs/index.js` créé (DOC_TOC vide à ce stade, format
    documenté inline). Branché dans `App.jsx` en mount conditionnel
    (vs `hidden`) : aucun état audio/éditeur à préserver, la lecture
    vit en sessionStorage.
  - **L.2.4 — page Raccourcis générée** : `ShortcutsReference.jsx`
    consomme `SHORTCUTS` de `src/lib/shortcuts.js`, groupe via
    `primarySection()` en 4 sections (Global / Designer / Composer /
    Bibliothèque). Layout DL/DT/DD avec `<kbd>` stylisé (cohérence
    typographique avec `.markdown-renderer` via hérité des classes
    md-*). Entrées composite affichent le `display` tel quel ("—
    mapping live —", "1-7 (Numpad ou Shift+Digit)", etc.) — pas de
    duplication de la logique d'overlay ici. Dispatch
    `entry.type === 'generated' && id === 'shortcuts'` ajouté dans
    `DocumentationTab.jsx`. `src/docs/index.js` ajoute l'entrée
    'shortcuts' (section "Référence").
  - **L.2.5 — stubs + test renderer** : trois fichiers `.md` créés
    dans `src/docs/articles/`. `about.md` (~50 mots) et
    `why-12-notes.md` (~30 mots) avec placeholder explicite "Article
    en cours de rédaction — un brief séparé est confié à l'agent
    rédacteur (writer)." — la rédaction réelle est faite séparément
    par l'agent `writer/` sur un prompt distinct
    (`archi/L2-redaction-prompt.md`). `_renderer-test.md` exerce
    toutes les features V1 : H1-H4, paragraphes courts/longs,
    imbrication de listes, code inline + 2 blocs (js / text), emphase,
    blockquote, lien externe, image SVG inline (data URI, `url()`
    encodé en `url%28%29` pour cohabiter avec le regex de lien),
    DocLink dans le texte. À retirer du dossier ET de l'index en
    L.5 quand les vrais articles couvrent la même surface en
    conditions réelles. `src/docs/index.js` finalisé à 4 entrées,
    sections "Le projet" / "Référence" / "Articles".

  Sortie : l'utilisateur ouvre Documentation → voit la TOC à gauche,
  peut lire "À propos" (stub), "Raccourcis clavier" (généré, exhaustif
  et à jour), "Test renderer" (validation), "Pourquoi 12 notes ?"
  (stub). Switch d'onglet → restitue article + scroll dans la même
  session navigateur. Refresh → revient sur 'about'. Aucun changement
  dans les 3 autres onglets. Pas de nouvelle dépendance npm.

- **2026-05-27 — Iteration L phase 1 (follow-ups après test utilisateur)**
  Une série de fixes incrémentaux sur la livraison L.1 initiale du
  même jour, suite à retours utilisateur.

  - **Ctrl+letter cross-layout** : `matchesShortcut` utilise `e.key`
    (logique, layout-dependent) au lieu de `e.code` (physique
    QWERTY) pour les lettres A-Z. Régression AZERTY : la touche Z
    est physiquement à `e.code === 'KeyW'`, donc Ctrl+Z et Ctrl+A
    ne fonctionnaient pas. Convention navigateur standard pour les
    raccourcis app. Les touches notes Designer/Composer restent
    layout-independent via `getKeyboardMap` + `e.code`.
  - **Halo anchor refondu en ghost clip externe** : remplacement du
    `box-shadow inset` à l'intérieur du clip par un rectangle dashed
    accent positionné juste après le clip ancre, de largeur =
    `defaultClipDuration`. Visuel "clip fantôme" qui préfigure
    exactement où la prochaine note de placement contigu (C18) se
    déposera. `data-anchor="composer-anchor-clip"` déplacé du clip
    vers le ghost. `pointer-events: none`. Nouveau wrapper reducer
    `clampAnchorToExistingClip` conservé (toujours utile pour les
    delete/cut/split de mesure qui rotate les ids).
  - **Ctrl+V Composer unifié** sur la sémantique du bouton Coller
    (ancre halo → piste sélectionnée → fallback piste 0). Le clic
    droit menu "Coller ici" reste le chemin pour le coller-à-la-souris.
  - **Overlay raccourcis refondu (fit-and-zoom)** : abandon du smart
    placement 4-quadrants (impossible à scaler dans les zones denses
    type Designer Actions où 5 boutons 34px reçoivent des labels
    60-110px). Nouveau pattern : chaque étiquette occupe exactement
    le rect de son ancre, texte réduit via CSS scale au repos ; au
    survol, dimensions explicites (width/height/left/top animés via
    CSS vars) qui épousent le contenu naturel + padding. Pas de
    collision possible par construction. Mesure réelle du texte via
    `canvas.measureText` (font matchée), pas char-count heuristique.
    Wrapping inter-combos (séparateur `\n` entre combinaisons
    multiples sur même ancre, jamais à l'intérieur d'une combo).
    Padding repos minimal (2px) / hover généreux (12×10px).
    Position au hover clampée au viewport (EDGE_MARGIN 16px).
  - **Capture clavier complète pendant overlay** : remplacement du
    listener Esc-only par un catch-all keydown en capture phase.
    Toute touche non-modifier ferme l'overlay et est absorbée
    (stopPropagation + stopImmediatePropagation) avant d'atteindre
    les handlers métier. Modificateurs seuls (Shift/Ctrl/Alt/Meta
    press) laissés passer pour permettre Ctrl+K (capté au K). Keyup
    aussi absorbé pour éviter sustain résiduel.
  - **Per-key composite généralisé** : `composite: 'per-key'`
    appliqué aux durées Composer (composer-duration-base/coef) en
    plus de designer-notes. `data-anchor-key={digit}` posé sur
    chaque bouton de durée. L'overlay dispatch selon l'id :
    designer-notes mapping system-dependent ; composer-duration
    générique (data-anchor-key value = display). Dédup par parent
    anchor.
  - **Bouton Fusionner PropertiesPanel** : aligné sur les boutons
    Diviser. `.clip-merge-btn` avait `margin-top: 4px` + padding
    différent ; dans une rangée flex `align-items: stretch`, la
    margin cross-axis rétrécit l'item. Fix : `flex: 1`, padding
    6×8 aligné, plus de margin-top.
  - **RESET_EDITOR préserve les champs test/visualCue** : Ctrl+Alt+N
    (Nouveau patch) ne remet plus le système musical à 12-TET,
    l'octave à 4, etc. Symétrique avec HYDRATE_EDITOR_FROM_PATCH
    qui ne touche jamais ces champs. Seul le contenu de patch
    (points, amplitude, preset, ADSR) est réinitialisé.
  - **PageUp/PageDown overlay** mesuré correctement via
    `canvas.measureText` (l'estimation char-count sous-évaluait
    les majuscules larges P/U/D/W). Le label rentre désormais
    dans l'indicateur Octave Composer.

- **2026-05-27 — Iteration L phase 1 : fondation overlay raccourcis + corrections UI**
  Mise en place de la couche technique pour l'onglet Documentation
  utilisateur sans toucher au comportement de l'app principale.
  Six sous-commits dans l'ordre :

  - **L.1.1** : `src/lib/shortcuts.js` — table déclarative `SHORTCUTS`
    (28 entrées) + helpers `matchesShortcut(e, id)`, `getAnchor(entry,
    state)`, `listShortcutsForContext(ctx)`. Couvre tous les raccourcis
    listés dans `archi/L0-audit-raccourcis.md` sauf exclusions
    documentées. Tests mentaux en commentaire (pas de runner Vitest
    installé, cf. CLAUDE.md). Anchors statiques pour la majorité,
    dynamiques `(state) => string` pour les boutons Undo/Redo
    contextualisés par onglet et l'indicateur Octave divergent
    Designer/Composer. Touches notes (Designer + Composer placement
    contigu) déclarées comme entries composites (mapping live).
  - **L.1.2** : refacto handlers App.jsx (undo/redo, save/saveAs/new,
    Delete/Backspace, ↑↓←→, PageUp/Down, durées, Ctrl+CXVMD),
    WaveformEditor.jsx (Espace sustain, s mode Libre — keydown
    uniquement, keyup reste e.code direct pour robustesse aux changements
    de modifier entre keydown/keyup), PatchBank.jsx (Ctrl+CXVA, F2,
    Delete, Escape clipboard — Esc selection reste inline car ergo
    standard exclu). Order d'évaluation et guards préservés.
  - **L.1.3** : pose des attributs `data-anchor` sur les éléments d'UI
    existants — boutons toolbar Composer (Copier, Couper, Undo, Redo,
    Octave indicator, DurationButtons via prop dataAnchor), boutons
    Designer Actions (×2 open + collapsed pour Nouveau, Mettre à jour,
    Enregistrer, Undo, Redo), test free, conteneur clavier,
    OctaveSelector Designer, boutons PropertiesPanel (Delete, Merge,
    Split2, Split3 — en mono ET multi), toolbar Bibliothèque (Undo,
    Redo, Rename, Copy, Cut, Paste, Select all, Delete), 3 conteneurs
    sound-bank-tiles/list.
  - **L.1.4** : cinq corrections UI dérivées de l'audit L.0.
    **4.a** pastille `Sustain` permanente cliquable dans la
    we-note-row Designer (remplace l'ancien badge SUSTAIN éphémère) ;
    trois états inactif/actif/verrouillé, click = toggleSustainLock
    (équivalent pédale verrouillable de piano numérique). Espace
    maintenue inchangée ; `spaceHeldRef` tracke l'état physique pour
    que le déverrouillage n'ait pas d'effet de bord si l'utilisateur
    tient Espace simultanément. Verrou non persisté (runtime only).
    **4.b** bouton `Coller` permanent dans la toolbar Composer
    (sémantique clic = priorité ancre halo → piste sélectionnée →
    fallback piste 0 ; différent de Ctrl+V qui colle à la souris).
    Nouveau état `selectedTrackId` persisté, mis à jour au dernier
    clic utilisateur dans la zone Composer (clip / header / zone vide
    d'une piste). Signifiant visuel : border-left accent subtil sur
    le track-header. Validation à l'hydratation contre `tracks` ;
    reset à null sur DELETE_TRACK de la piste active.
    **4.c** chip `📋 N éléments` dans la toolbar Bibliothèque,
    visible quand `bibClipboard.items.length > 0`, × cliquable vide
    le clipboard (équivalent comportemental d'Esc). Esc comportement
    inchangé. **4.d** halo subtil ton-sur-ton sur le clip ancre
    Composer (`lastAnchorClipId`) : box-shadow inset right liseré
    accent + glow halo réduit. `data-anchor="composer-anchor-clip"`
    dynamique (suit `lastAnchorClipId`). Nouveau wrapper reducer
    `clampAnchorToExistingClip` (exécuté entre `applyUndoAware` et
    `syncAnchorWithSelection`) qui reset `lastAnchorClipId` à null si
    le clip pointé n'existe plus — couvre DELETE_MEASURE / CUT_MEASURE
    / DELETE_TRACK / splits de mesure (REMOVE_CLIP, DELETE_SELECTED_CLIPS,
    CLEAR_TIMELINE géraient déjà la cohérence localement).
    **4.e** correction des tooltips obsolètes — CP1 indicateur Octave
    Composer "Shift seul = +1, Ctrl seul = −1" → "PageUp/PageDown ±1"
    (raccourci retiré en F.3.3), CP2 bouton Rétablir Bibliothèque
    "Ctrl+Y" → "Ctrl+Shift+Z" (uniformisation cross-onglet ; Ctrl+Y
    reste fonctionnel via le handler).
  - **L.1.5** : `src/lib/getAnchoredPosition.js` — résout
    `getAnchoredPosition(anchorId)` en `{ found, top, left, width,
    height }` viewport, retourne le premier élément visible si
    plusieurs candidats. `getAnchoredKeyPositions(parentAnchorId)`
    indexe les enfants `[data-anchor-key]` du parent (utilisé par la
    composite touches notes Designer). Stateless, pas de cache.
    Composant `src/components/ShortcutsOverlay.jsx` — couche fixed
    plein écran avec backdrop semi-opaque (rgba(0,0,0,0.45)), bouton
    close en haut à droite (32px+), étiquette par anchor positionnée
    au-dessus (ou en dessous si trop haut). Multi-raccourcis sur même
    ancre = libellé combiné via " / ". Composite designer-notes itère
    sur le keyboardMap du système actif, pose une étiquette compacte
    par touche QWERTY mappée. Composite composer-notes-contiguous :
    étiquette sur le halo si présent, sinon bandeau supérieur
    explicatif. ESC ferme (capture phase pour devancer Esc clipboard
    Bibliothèque). Re-render au resize / scroll. `data-anchor-key`
    posés sur les 4 layouts visuels (PianoLayout12 whites + blacks,
    Grid24Layout, Grid22Bhatkhande, Grid22Sarngadeva, GridXEdoLayout)
    — valeur = noteIndex stable, le mapping QWERTY → noteIndex est
    résolu côté overlay. À ce stade, le composant existe mais n'est
    pas branché.
  - **L.1.6** : branchement final. Nouvelle entrée SHORTCUTS
    `global-shortcuts` (Ctrl/Cmd+K), ancrée sur
    `header-shortcuts-button`. Nouveau bouton header Keyboard dans
    Tabs.jsx (icône Lucide), classe `.shortcuts-toggle` calquée sur
    `.theme-toggle`, état actif (highlight accent) quand overlay
    ouvert. Nouveau state `shortcutsOverlayOpen` au reducer global,
    action `SET_SHORTCUTS_OVERLAY` (boolean), non persisté. App.jsx
    ajoute un handler global Ctrl+K (preventDefault impératif, skip
    form fields, skip si modale ouverte via heuristique DOM des
    backdrops *-backdrop). Render `<ShortcutsOverlay>` au top-level.

  Modèle de données : `selectedTrackId` (persisté) et
  `shortcutsOverlayOpen` (volatile) ajoutés au state global.
  Décisions architecturales mises à jour : `shortcuts.js` comme
  source unique des raccourcis, convention `data-anchor` pour les
  éléments d'UI consommés par overlay/Tour/DocLink.

  Aucun changement de comportement métier hors des nouveaux éléments
  visibles (pastille, bouton Coller, chip clipboard, halo anchor,
  outline piste sélectionnée, bouton header Keyboard) et du toggle
  Ctrl+K. Tous les raccourcis pré-existants fonctionnent exactement
  comme avant. Build vite OK. Lint OK (4 warnings react-hooks
  pré-existants hors scope L.1).

- **2026-05-27 — L.0 audit raccourcis (rapport)**
  `archi/L0-audit-raccourcis.md` livré (commit `a70c714`) :
  inventaire exhaustif des 28 raccourcis d'action de l'app
  (Global 3, Designer 5, Composer 16, Bibliothèque 9). Catégorisation
  par ancrage (bouton / objet / dégénéré). 5 orphelins identifiés
  (Espace sustain Designer, Ctrl+V Composer, Escape clipboard
  Bibliothèque, touche note maintenue pendant drag, placement
  contigu). Cas particuliers documentés (tooltip obsolète Octave
  Composer, incohérence Ctrl+Y vs Ctrl+Shift+Z, mapping notes
  system-dependent, NOTE_GUARD_KEYS transverse, etc.). Pas de
  modification de code. Sert de base aux arbitrages de
  `archi/L1-prompt.md`.

- **2026-05-25 — Itération K phase 2 : Bibliothèque dédiée + 3 sous-apps autonomes**
  Restructure de l'app en 3 sous-applications avec piles undo séparées.
  Onglet Bibliothèque dédié (en premier dans le header) hébergeant le
  full PatchBank avec toolbar d'actions icônes. Sidebars downgrade en
  PatchPicker simplifié. Popup SavePatchDialog avec folder picker
  breadcrumb+dropdown + "Nouveau dossier" inline non-undoable.
  DELETE_BIB_ITEMS batch + DeleteUsageWarningDialog modal pour patches
  utilisés en Composer. Clipboard cut→copy multi-paste.

  **Décisions UX clés** :
  - Routing Ctrl+Z par activeTab (trivial, remplace le focus tracking
    phase 1).
  - SAVE_PATCH non-undoable (popup explicite = commit).
  - Sidebars = pickers, pas éditeurs.
  - Right-click invariant : menu = sélection courante.

  Spec + plan archivés : `docs/superpowers/specs/2026-05-25-bibliotheque-multi-mode-phase-2.md`,
  `docs/superpowers/plans/2026-05-25-bibliotheque-multi-mode-phase-2.md`.

  Tests manuels (26 scénarios listés dans la spec §10) attendus de
  l'utilisateur : 3 piles undo séparées, save patch popup, clipboard
  multi-paste, multi-delete avec warning Composer, right-click semantics,
  sidebar PatchPicker, onglet Bibliothèque dédié, co-dépendances cross-tabs.

- **2026-05-25 — Itération K phase 1 : Bibliothèque multi-mode**
  Refonte de `PatchBank` en bibliothèque type file explorer.
  Sous-commits 1.1 à 1.12 :
  - 1.1 : state UI prefs (bibHierarchyMode, bibDisplayMode,
    bibCurrentFolderId, bibPopupWidth) + actions reducer + persistance
    + handlers App.
  - 1.2 : toolbar avec 2 toggles icônes (Tree/Nav, List/Details/Tiles
    avec Tiles caché en Tree) + composant `BibBreadcrumb` (segments
    cliquables, édition au clic dans zone vide, parse path insensible
    casse) + rendering nav mode (single folder + ligne ".." +
    navigation).
  - 1.3 : mode Details — colonnes méta (tuning system, swatch couleur)
    pour patches ; count descendants pour folders.
  - 1.4 : composant `PatchThumbnail` (mini-SVG d'une waveform, 60
    samples sur 600 points, memoizé) + mode Tiles avec grille 2D.
  - 1.5 : state selection (bibSelectedIds, bibSelectionAnchor) + actions
    SELECT_BIB_ITEMS (modes set/add/toggle/range) + handlers
    Ctrl+clic / Shift+clic / simple click + visuel `.is-selected`.
  - 1.6 : lasso selection — drag rectangle dans zone vide, hit-test
    via querySelectorAll + getBoundingClientRect, listeners window
    pour mouseup hors body, coords content-space pour scroll.
  - 1.7 : state clipboard (bibClipboard) + actions COPY/CUT/CLEAR +
    PASTE_BIB_CLIPBOARD + MOVE_BIB_ITEMS dans DESIGNER_UNDOABLE +
    `src/lib/bibTransfer.js` avec `wouldCreateCycle` et
    `duplicateItemsToFolder` (récursion sur folders, dédup noms via
    `nextAvailableFolderName`).
  - 1.8 : handlers clipboard côté PatchBank + visuel `.is-cut` (ghost
    opacity 0.4 + italic) + helper `filterOutDescendants` pour éviter
    parent+enfant en mouvement.
  - 1.9 : drag-and-drop refactor — utilise bibSelectedIds si l'item
    draggé y est, dispatch MOVE_BIB_ITEMS au drop. Drop sur ".." vers
    parent.
  - 1.10 : composant `BibContextMenu` extrait + entrées Renommer (F2),
    Copier, Couper, Coller dans (folder), Exporter, Supprimer (Suppr) ;
    zone vide → Nouveau dossier + Coller ; fallback contextMenu.id si
    pas de sélection.
  - 1.11 : raccourcis clavier globaux avec focus tracking sur
    `<aside tabIndex={-1}>` — Ctrl+C/X/V, F2, Suppr/Backspace, ↑↓ (avec
    Shift pour range), Enter (ouvre selected), Esc (clear clipboard
    puis selection). Capture phase + stopPropagation pour isoler des
    listeners globaux d'App.jsx.
  - 1.12 : composant `PopupResizer` + intégration dans le wrapper du
    popup Bibliothèque (sidebar Designer collapsed). Drag handle bord
    droit, largeur clampée [320, viewport×0.8 ou 1200], persistée.

  **Décisions UX clés** :
  - Sélection visuelle distincte du `currentPatchId` (simple clic
    sélectionne, double-clic ouvre/charge).
  - État de la bibliothèque partagé entre Designer et Composer (un
    seul jeu de préférences, sélection synchronisée).
  - Default navigation mode au load (vs tree historique).
  - Tiles mode caché en Tree (incohérent visuellement).
  - Anti-cycle paste/drag systématique via `wouldCreateCycle`.

  Spec + plan archivés : `docs/superpowers/specs/2026-05-25-bibliotheque-multi-mode-design.md`,
  `docs/superpowers/plans/2026-05-25-bibliotheque-multi-mode.md`.

  Tests manuels attendus de l'utilisateur (33 scénarios listés dans
  la spec §8) : modes & navigation, sélection, clipboard, multi-
  sélection avec ops, keyboard nav, Tiles, popup resize, sync
  Designer/Composer.

- **2026-05-24 — Itération J phase 1 : Anti-aliasing audio**
  Correction d'un bug audio fondamental : les harmoniques miroirs de
  la DFT (k=129..255) étaient passés à `createPeriodicWave` comme des
  harmoniques indépendants à des fréquences `k×f`, produisant des
  parasites audibles à basse fréquence (typiquement 4-8 kHz pour C0).
  Trois sous-commits + un fix mineur + un docs :
  - 1.1 : Ajout du FFT Cooley-Tukey radix-2 in-place (~30 lignes JS
    pur, convention forward `exp(-iθ)`) + self-test en dev mode au
    module load (vérifie les coefficients attendus pour une sine pure).
    La FFT remplace la DFT naïve O(N²) par O(N log N) sans changer le
    résultat numérique. Fix EPS du self-test à 1e-5 (1e-10 trop serré
    pour Float32).
  - 1.2 : Refactor de `pointsToHarmonics` pour utiliser FFT et
    tronquer aux 129 premiers coefficients (k=0..128). `HARMONIC_COUNT`
    export mis à jour à 128 (anciennement dead code à 256).
  - 1.3 : Cache memoization via WeakMap keyed par référence du buffer
    `points`. Cache partagé entre `pointsToPeriodicWave` (audio
    playback) et `Spectrogram` (display statique). Pas de fuite mémoire
    (GC libère les entrées quand le patch est supprimé).

  Aucun consumer impacté — signatures publiques (`pointsToHarmonics`,
  `pointsToPeriodicWave`, `HARMONIC_COUNT`) inchangées. Le Spectrogram
  itère sur `magnitudes.length` (= 129 maintenant au lieu de 256), donc
  s'adapte naturellement à la nouvelle taille.

  Effets attendus :
  - Audio : disparition des parasites 4-8 kHz à basse fréquence (C0,
    C1) — testable empiriquement.
  - Spectrogram statique : disparition de la "remontée" miroir à droite
    du graphe (les bars k=129..255 ne s'affichent plus). Vue plus
    cohérente avec le live FFT.
  - Performance : speedup ~30× sur la transformation (FFT vs DFT
    naïve), mais invisible vu l'échelle (microsecondes vs nanosecondes).
  - Sons inchangés pour les patches existants : la convention
    `exp(-iθ)` et la normalisation `/N` sont préservées bit-pour-bit.

  **Vérification post-livraison utilisateur** (2026-05-24) : parasites
  audio 4-8 kHz à C0 confirmés disparus (objectif principal atteint).
  Au passage, exploration manuelle plus poussée à hautes fréquences a
  révélé d'autres phénomènes (rolloff Nyquist, amplitudes
  non-monotones, peaks décroissants à ≥ 13 kHz, certains affichages
  manquants type D10) qui sont des limites attendues du modèle
  `createPeriodicWave` + `AnalyserNode`, pas un bug du code applicatif.
  Documentées en décision archi "Limites Web Audio à haute fréquence —
  acceptées" et options d'amélioration (refactor `AudioWorkletNode`)
  en backlog.

  Spec + plan archivés : `docs/superpowers/specs/2026-05-24-anti-aliasing-design.md`,
  `docs/superpowers/plans/2026-05-24-anti-aliasing.md`.

  Tests manuels round-trip attendus de l'utilisateur :
  - Spectrogram statique à C0 + square → décroissance harmonique
    propre, pas de remontée à droite.
  - Audio square à C0 → plus de parasites 4-8 kHz.
  - Notes hautes (A4, A5, A6) inchangées.
  - Self-test FFT en dev console : pas de message "FFT self-test FAIL".
  - Vérification follow-up : les 2 pics > 10 kHz observés en live + C0
    + carré pré-fix sont-ils toujours là ? Si oui, sujet séparé à
    investiguer.

- **2026-05-21 — Itération I phase 1 : Spectrogramme avancé**
  Enrichissement du Spectrogram Designer avec un mode Live FFT, un
  toggle dB / linéaire (applicable aux deux modes) et un toggle peak
  hold (mode Live).
  - 1.1 : reducer — `spectrogramDbScale` et `spectrogramPeakHold` +
    persistance.
  - 1.2 : `WaveformEditor.jsx` — analyser tap (`osc → gain → analyserGain
    → analyser + ctx.destination`), compteur `activeVoicesCountRef`
    maintenu (incrément/décrément planifié via `setTimeout(release+epsilon)`).
    Fix complémentaire : reset du compteur dans `stopAllInstrumentNotes`.
  - 1.3 : `App.jsx` — création des refs partagés (`analyserRef`,
    `activeVoicesCountRef`), handlers toggle, passing aux deux
    composants. Refactor DRY : extraction d'un `spectrogramNode` local
    pour ne pas dupliquer les 8 props sur les deux instances (mobile +
    desktop).
  - 1.4 : `Spectrogram.jsx` — refactor `drawStatic` avec support dB
    scale, ajout du header controls (`<button>` toggle dB / Peak).
    Static mode complet. dB conversion via `20*log10(ratio)` (amplitude
    convention), clamp `< DB_FLOOR (-80)` via `continue`.
  - 1.5 : `Spectrogram.jsx` — rAF loop permanente (auto-switch
    statique/live avec grace period 1s), implémentation `drawLive`
    (interpolation des bins FFT sur axe log, peak hold optionnel
    stocké en linéaire 0..1 pour decay multiplicatif `* 0.97`).
    Polish : `PEAK_DECAY` const, `valuesBuffer` caché dans `stateRef`
    pour éviter allocation hot-path, commentaire explicatif sur le
    fill-after-stroke trick, JSDoc mis à jour pour décrire les deux
    modes.

  Cas d'usage typique : utilisateur dessine une onde → spectre
  statique en barres ; presse une touche du clavier piano → bascule
  immédiate en mode Live (ligne continue cyan + aire fill légère) qui
  suit l'enveloppe ADSR ; relâche → décroissance fluide, retour au
  statique après 1 seconde. Si peak hold actif, traits clairs
  persistent au-dessus de la courbe et redescendent en ~1s.

  Sécurité audio : le routage modifié dans WaveformEditor introduit
  un `GainNode` passif (`analyserGain`) entre les voix et la
  destination ; aucune altération du signal audible. L'AnalyserNode
  ne consomme que des copies des samples (lecture passive).

  **Évolution post-livraison initiale (commits du 2026-05-21 au
  2026-05-24)** : retours utilisateur ont révélé plusieurs ajustements
  nécessaires. (1) Ctrl+Z annulait les notes test du clavier piano —
  fix en deux étapes : retirer `SET_EDITOR_TEST_*` de DESIGNER_UNDOABLE
  (les actions ne déclenchent plus de snapshot) puis ajouter
  `restoreSnapshot` pour deep-merge `editor` au restore (préserve les
  test* fields courants au lieu de les écraser avec le snapshot).
  (2) Peak hold / courbe live qui restaient figés après expiration de
  la grace period — fix : invalider `lastPointsKey` au passage live →
  static. (3) Compteur de voix décrémenté trop tôt en sustain long —
  refactor majeur : remplacer le `setTimeout(release+epsilon)` initial
  par `osc.onended` (event natif Web Audio), modifie 5 sites dans
  `WaveformEditor.jsx`. (4) Hash de détection de changements statics
  avec false negatives sur certains dessins — remplacé par comparaison
  de référence du buffer `points` (le reducer crée toujours un nouveau
  tableau à chaque modif, donc la ref change). (5) Graduations Y (P3)
  ajoutées pour rendre les amplitudes lisibles — majors avec labels
  "0..1" (linéaire) ou "−80..0" (dB), minors sans labels entre les
  majors. (6) **Évolution UX majeure (P4)** : remplacer l'auto-switch
  par un toggle "Live" explicite. À l'usage, l'auto-switch créait des
  surprises (vue qui clignotait pendant un jeu rapide, sustain long
  qui passait en static après 1-2s alors que la note jouait encore).
  Le toggle explicite, choisi en option A au brainstorming initial,
  s'est révélé plus prévisible. Le compteur `activeVoicesCountRef`
  reste comme primitive disponible mais ne pilote plus le mode.
  Constantes `GRACE_MS` et `lastActivityTime` supprimées. (7) Edge
  cases du mode Live : `drawLive` qui ne dessinait rien si analyser
  null (avant la 1ère note), ligne plate cohérente au floor dans tous
  les cas "Live actif sans signal" (avant 1ère note OU après release
  OU au reload), cache d'optimisation statique qui marquait "déjà
  dessiné" même quand le canvas n'était pas encore sizé — fix :
  `drawStatic` retourne true/false, la cache n'est marquée valide que
  si le draw a réussi.

  Spec + plan archivés : `docs/superpowers/specs/2026-05-21-spectrogramme-avance-design.md`,
  `docs/superpowers/plans/2026-05-21-spectrogramme-avance.md`.

  Tests manuels round-trip attendus de l'utilisateur (jeu de notes,
  toggles dB/peak hold, vérification non-régression sur la lecture
  Composer).

- **2026-05-21 — Iter H follow-up : bump format à OSA2 + injection mid-stream**
  7-zip a été trouvé capable d'extraire le JSON malgré le magic header
  OSA1 (scanne la signature gzip à offset 4 et l'attaque directement).
  Mitigation : on injecte 4 octets garbage (`0xDE 0xAD 0xBE 0xEF`) à
  offset 10 du flux gzip — juste après le header standard de 10 octets,
  donc dans le premier bloc DEFLATE. Toute tentative de décompression
  naïve échoue immédiatement. Bump du magic à `OSA2` pour signaler le
  format-break (aucun OSA1 en circulation, juste des tests locaux —
  pas de migration). Reste de la dissuasion casual ; un lecteur des
  sources trouve l'offset en 2 minutes — assumé.

- **2026-05-21 — Itération H phase 1 : Import/Export bibliothèque .osa**
  Livraison complète du format binaire `.osa` et de l'UI associée. 14
  sous-commits principaux (1.1-1.14) plus 4 mineurs (refactor DRY,
  cleanup eslint-disable inutile, fix .osa case-insensitive, etc.) :
  - 1.1-1.3 : `src/lib/osaFormat.js` — `encodeOsa` (magic + gzip),
    `decodeOsa` avec 3 classes d'erreurs, `validatePayload` strict-strict
    couvrant tous les champs du schéma (folders, patches, points, ADSR,
    presets, defaultTuningSystem, cycle detection).
  - 1.4 : extraction `nextAvailableFolderName` de PatchBank vers
    `src/lib/folderNames.js` (préalable pour réutilisation à l'import).
  - 1.5-1.6 : `src/lib/libraryTransfer.js` — `buildExportPayload` (3
    scopes : all / folder / patch), `applyImport` (modes subset / root,
    regen IDs systématique, déduplication folders).
  - 1.7 : action reducer `IMPORT_LIBRARY` ajoutée à `DESIGNER_UNDOABLE`.
  - 1.8 : `src/components/Modal.jsx` + `.css` — primitive partagé
    (backdrop, Escape, focus trap basique, scroll body lock).
  - 1.9 : `ExportModal.jsx` — saisie nom de fichier, slugify chars
    filesystem-interdits, suffix `.osa` case-insensitive auto.
  - 1.10 : wiring export bibliothèque complète depuis App
    (`handleExportAll` + `handleConfirmExport` + `triggerDownload`
    helper, Download button activé dans WaveformEditor Actions).
  - 1.11 : menu contextuel PatchBank (state inline calqué Timeline,
    entrées "Exporter ce dossier" / "Exporter ce patch", disabled si
    sous-arbre vide).
  - 1.12 : wiring export folder/patch depuis App.
  - 1.13 : `ImportModal.jsx` — radio mode subset/root, champ wrapper
    name conditionnel, compteurs détectés.
  - 1.14 : wiring import depuis App — `<input type="file" accept=".osa"
    hidden>` + validation pré-modale (4 erreurs distinctes → toasts) +
    `applyImport` + dispatch `IMPORT_LIBRARY`.

  Sécurité timeline : règle non négociable — les IDs des patches/folders
  du fichier importé sont systématiquement régénérés via les counters
  destination, jamais réutilisés tels quels. Conséquence directe : un
  clip existant qui pointait vers `patch-3` continue de pointer vers le
  patch-3 *original* après l'import, jamais vers le patch importé qui
  reçoit un ID neuf au-delà du counter actuel.

  Spec + plan archivés : `docs/superpowers/specs/2026-05-21-import-export-bibliotheque-design.md`,
  `docs/superpowers/plans/2026-05-21-import-export-bibliotheque.md`.

  Tests manuels round-trip attendus de l'utilisateur (lecture audio,
  cycle export/clear-localStorage/reimport en mode racine et subset).

000000000000000000000000000000. **Iter G — Phase 2** (2026-05-20) :
    Raffinements UX en 6 sous-phases livrées le même jour, suite
    aux retours utilisateur sur la livraison de la phase 1.
    - **2.1** : ajout dépendance `lucide-react` (validation explicite,
      tree-shakeable). Tous les glyphes émoji/Unicode remplacés par
      Lucide (chevrons, Library, Plus/Save/SaveAll, Play/Square, X).
      Mode collapsed restructuré en 3 groupes verticaux (haut /
      spacer / Actions+Play). Fix vertical XEdoInput aligné sur
      .tuning-system-select (padding 5px).
    - **2.2** : Actions inline d'icônes groupées en mode ouvert
      (patch / historique / import-export disabled). Undo/Redo migrés
      du header Waveform vers Actions. Préparation Import/Export
      placeholders.
    - **2.3** : nouveau composant `ShortLabelSelect` (trigger
      libellé court / menu libellé complet) — pourquoi pas
      `<select>` natif : impossible d'afficher deux textes. Tous
      les registres enrichis d'un champ `shortLabel`
      (TUNING_CATEGORIES, TUNING_SYSTEMS, VISUAL_CUE_PATTERNS).
      4 contrôles Catégorie / Système / Repère / Tonique unifiés
      sur une ligne flex-wrap. Suppression `.visual-cues-bar`
      séparée. Rename "Actuel / Moderne" → "Moderne".
    - **2.4** : `patch.defaultTuningSystem` (capturé au save).
      Propagation au drop : (1) key-held → editor.system ; (2) drop
      simple patch sys ≠ editor sys → patch's default avec note
      degré 0 oct 4 ; (3) drop simple même sys ou patch sans default
      → editor (rétro-compat). Placement contigu (E.4.2) revisité :
      utilise `anchor.tuningSystem` + son keyboardMap pour résoudre
      e.code → idx. Touche non mappée dans le système référent →
      no-op silencieux.
    - **2.5** : OctaveSelector au-dessus du clavier (avec libellé
      "Octaves"). Zone clavier `flex:1` qui s'étire verticalement
      (override `height: 100% !important` ciblé sur les 5 layouts).
      Ligne "Note : X Hz — Y" + badge SUSTAIN ancrée tout en bas
      via `margin-top:auto`. Chaîne flex propre du panneau au
      clavier (we-params-fields + control-group passés en flex:1).
    - **2.6** : `ResolutionGate` réactif au `window.resize` en plus
      de la lecture au mount. App **toujours montée** (transition
      placeholder devient un overlay z-index 10000) → localStorage
      jamais effacé + état mémoire React préservé. Wording revu
      avec mention explicite "Taille de fenêtre" vs "résolution
      d'écran" + nominaux 1024×768 / 1920×1080 cités.

00000000000000000000000000000. **Iter G — Phase 1** (2026-05-20) :
    Refonte UX du Designer en 4 sous-phases livrées en un jour.
    Déclencheur : saturation du quart bas-gauche (zone Paramètres
    cumulant dropdown 14 entrées, clavier 22 cases, boutons save,
    visual cues bar, X-EDO banner, save-message-slot).
    - **1.1** : extraction du groupe Nouveau/Mettre à jour/
      Enregistrer + saveMessage dans un panneau Actions ajouté à
      la sidebar gauche entre Bibliothèque (ex-Banque) et MiniPlayer.
      Children-API `WaveformEditor` étendu d'un slot `renderActions
      ({collapsed})` — le panneau Actions n'est plus mélangé avec
      les paramètres de test. Renommages "Paramètres" → "Instrument"
      et "Banque" → "Bibliothèque" (Designer + Composer).
    - **1.2** : sidebar Designer redimensionnable (SidebarResizer
      à droite) + réductible (toggle ◀/▶ calqué Composer). Mode
      collapsed (36px) avec verticale d'icônes — expand, Bibliothèque
      (📚, ouvre un **popover flottant** à droite ancré sur
      `position:absolute`, fermable par clic en dehors / Escape /
      bouton ×), Actions icons (＋ ✓ 💾 via `renderActions(
      {collapsed:true})`), Play/Stop. Nouveau state reducer
      `designerSidebarWidth` (clamp min 200, défaut 220) +
      `designerSidebarCollapsed`. Suppression du
      `grid-template-columns: 200px 1fr` hard-codé dans le
      `@media (max-width: 1100px)` (incompatible avec la CSS var
      `--designer-sidebar-width`).
    - **1.3** : zone Instrument refondue. Sélecteur de système
      éclaté en deux dropdowns Catégorie / Système musical filtré.
      Catégorisation des 13 systèmes du registre via
      `TUNING_CATEGORIES` + `getCategoryOfSystem(systemId)` dans
      `tuningSystems.js` : Moderne (12-TET) / Historique (9 systèmes
      ancrés culturellement) / Théorique (24-TET équipartite,
      X-EDO, Libre). Dette technique Libre fermée : nouveau
      `playFreeNote()` / `releaseFreeNote()` qui lisent
      `testFrequency` directement (canal mono `freeVoiceRef`),
      bouton **Test** sous le slider Libre + raccourci **`s`**
      (capté avant le lookup keyboardMap pour ne pas être happé
      par 12-TET=C).
    - **1.4** : `ResolutionGate` au mount (`useState(init)` une
      seule fois, **pas réactif au resize**). < 924×668 →
      placeholder pleine page (titre, message, `<img
      src="/preview-1920x1080.png">` avec `onError` qui masque la
      figure tant que l'image n'est pas fournie). < 1740×900 →
      modale soft dismissible (session-only). Sinon passe-plat.
      Constantes `MIN_USABLE_{WIDTH,HEIGHT}` /
      `RECOMMENDED_{WIDTH,HEIGHT}` exportées pour la phase
      d'adaptation intermédiaire en backlog.

0000000000000000000000000000. **Iter F — Phase 3.13.5** (2026-05-12) :
    hotfix canvas vides au mount sur Firefox. Symptôme : ADSR /
    waveform principal / Spectrogramme ne s'affichaient pas tant que
    l'utilisateur n'avait pas interagi (slider, hover, etc.) — Edge
    OK, donc Firefox-spécifique. Diagnostic empirique :
    `getImageData` retourne `(0,0,0,0)` en sync juste après
    `ctx.fillRect`, et redevient correct ~80ms plus tard. Cause :
    après `canvas.width = N`, Firefox invalide le backing store et
    ne le réalloue qu'au prochain paint cycle ; les ops 2D entre
    les deux sont silencieusement avalées. Pattern existant
    (`canvas.width = w; canvas.height = h; draw()` dans le
    ResizeObserver) déclenchait le bug à chaque mount frais. Le bug
    était latent depuis F.3 mais ne s'est révélé qu'avec une
    configuration Firefox+GPU+Linux particulière (cf. reinstall
    serveur 2026-05-11). Fix : après chaque resize, on conserve le
    draw immédiat (canvas chaud — param tweaks) et on enchaîne un
    **double** `requestAnimationFrame` qui redessine après le paint
    allocateur. Single rAF est insuffisant : il tire au début de la
    prochaine frame, AVANT le style→layout→paint de cette frame.
    Double rAF garantit qu'un paint complet (donc l'allocation du
    backing store) s'est intercalé. Appliqué aux 3 useEffect
    ResizeObserver concernés (WaveformEditor: canvas waveform +
    canvas ADSR ; Spectrogram) + à l'effet 1 du draw ADSR
    (`[drawAdsr, activeTab]`). Coût : ~32ms invisibles au mount
    sur Chromium, qui n'a pas le bug.

000000000000000000000000000. **Iter F — Phase 9.1** (2026-04-27) :
    micro-affinement éditorial (F ré-ouverte ponctuellement). Ajout
    de `'shrutis-bhatkhande'` et `'shrutis-sarngadeva'` à
    `VISUAL_CUE_SUPPORTED_SYSTEMS`. Justification : les 22 shrutis
    canoniques sont en 5-limit pur, donc la triade majeure (0c,
    386.314c, 701.955c depuis sa) snappe à 0¢ près sur les degrés
    `{0, 7, 13}` (= sa, tivra-ga = IIIc Bhatkhande / IIIa Sarngadeva,
    pa = V Bhatkhande / Va Sarngadeva). Pédagogiquement : révèle la
    commensurabilité acoustique entre théorie indienne et harmonie
    classique 5-limit — précisément l'intérêt de la feature visual
    cues. Décision F.7 (cues désactivés) revue : la justification
    "patterns 5-limit harmoniques inappliquables au modal-mélodique
    indien" tenait pour l'usage **mélodique** des shrutis, mais pas
    pour la lecture **acoustique** (le substrat reste 5-limit
    occidental). Slendro/Pelog restent désactivés (déviations gamelan
    au-delà de 90¢ sur la triade majeure → patterns sans sens).

00000000000000000000000000. **Iter F — Phase 8.5** (2026-04-27) :
    hotfix CSS — visual cues invisibles sur grid-x-edo. Bug F.8.2.1 :
    `overflow: hidden` sur `.gridx-cell` (posé pour faire respecter le
    border-radius aux fonds des enfants) clippait les `box-shadow`
    externes des `.gridx-key`. Conséquence : les classes `.is-cued`
    (halo magenta de F.4.4) et `.is-playing` (glow jaune de F.3.10)
    étaient invisibles en X-EDO / Slendro / Pelog. Fix option A :
    `overflow: hidden` retiré, `border-radius` déplacé sur les
    `.gridx-key:first-child` / `:last-child`. Cas N≤43 : un seul
    `.gridx-key` qui est first ET last → 4 coins arrondis. Cas N≥44 :
    deux `.gridx-key` côte à côte → premier reçoit les coins gauches,
    second les coins droits ; le séparateur central reste posé via la
    `border-left` interne de `.gridx-key-shifted` (indépendant de
    l'overflow). Pas de changement JS.

0000000000000000000000000. **Iter F — Phase 8.4** (2026-04-27) :
    hotfix layouts X-EDO (3 sous-commits + doc). Diagnostic : la
    numérotation des layouts N≥9 était fausse — le calcul utilisait
    un offset par rangée (`OFFSET_HOME_ANCHOR.alpha = 2` etc.) qui
    décalait artificiellement la col logique des touches alpha vers
    la droite. Conséquence pour N=9 : KeyS en col 1 mais KeyE en
    col 2 (au lieu de col 1) → numérotation `KeyS=1, KeyD=2, KeyE=3,
    KeyR=4, …` (incorrect) au lieu de `KeyS=1, KeyE=2, KeyD=3,
    KeyR=4, …` (spec).
    F.8.4.1 : suppression d'OFFSET_HOME_ANCHOR / OFFSET_BOTTOM_ANCHOR
    dans buildClassicLayout. La col logique d'une cellule = i+1
    (1-based dans la rangée), peu importe la rangée. L'effet
    "escalier" du clavier physique est désormais reproduit côté CSS
    (cf. F.8.4.3), pas dans la numérotation logique.
    F.8.4.2 : SHIFT_BASE_CELLS réécrite en col-major (col 1 =
    bottom+home+alpha, col 2 = idem, …) ; les extensions
    progressives (KeyL, KeyP, Period, Semicolon, BracketLeft) sont
    ajoutées en fin pour préserver l'invariant "+ Shift sauf X" en
    N impair. **Deux bugs additionnels corrigés au passage** :
    (a) bottom commençait par `KeyW` (= AZERTY `z`, rangée alpha)
    au lieu de `KeyZ` (= AZERTY `w`, rangée bottom) — bug F.8.1.2
    issu d'une confusion event.code (position-based depuis QWERTY)
    vs label AZERTY ; (b) extension N=49 utilisait `Slash` (= `!`
    AZERTY) au lieu de `Period` (= `:` AZERTY) — bug du correctif
    archi 8.4 lui-même, contredisant le patch 3 de F.8.1 qui
    assignait `! = Slash`.
    F.8.4.3 : effet escalier reproduit en CSS Grid via subdivisions.
    Chaque cellule occupe `cellWidth = numRows` sub-cols et est
    décalée de `visualRow` sub-cols vers la droite. Total sub-cols
    = numCols × cellWidth + (numRows − 1). Pattern hérité des
    anciens grid-24 (7×4+3=31) et grid-31 (8×4+3=35), désormais
    généralisé. Hue indexé sur cell.col (col logique), pas sur
    sub-col — cohérent avec la spec "1 col logique = 1 hue".
    Vérifications post-fix : N=9 → KeyS=1 KeyE=2 KeyD=3 KeyR=4 …
    KeyH=9 ; N=17 → col 1 {S, E, 4} = 1, 2, 3 ; N=25 → col 1
    {IntlBackslash, A, W, 3} = 1, 2, 3, 4, col 7 {N seul} = 25 ;
    N=44 → col 1 {KeyZ, KeyS, KeyE} avec degrés (1,2)/(3,4)/(5,6).

000000000000000000000000. **Iter F — Phase 8.3** (2026-04-27) :
    UI X-EDO complète — exposition utilisateur (3 sous-commits).
    F.8.3.1 : `tuning-select` de la Toolbar passé de max-width 180px
    à 220px pour aérer les 13 entrées du registre (avec X-EDO).
    Refonte complète (optgroup catégorisé par tradition) reste en
    backlog (B.dropdown-tuning).
    F.8.3.2 : nouveau composant `src/components/XEdoInput.jsx` —
    input numérique avec validation différée, bornes
    [X_EDO_MIN, X_EDO_MAX]. Pattern identique à A4Input et BpmInput
    — candidat à extraction en `ValidatedIntegerInput` partagé
    maintenant qu'on a trois inputs identiques (refactor à part,
    hors scope F.8.3). Intégré dans trois sites quand
    `tuningSystem === 'x-edo'` : Toolbar Composer (à côté de A4),
    Designer (sous le sélecteur de système), PropertiesPanel mono +
    multi (sous le TuningSystemSelect, tooltip rappelle que la
    valeur est globale et snappe tous les clips x-edo).
    `editorActions.setXEdoN` ajouté pour le Designer ; `setXEdoN`
    callback global pour Toolbar et PropertiesPanel.
    F.8.3.3 : bannière info au-dessus du clavier Designer quand
    `testTuningSystem === 'x-edo' && (xEdoN === 12 || xEdoN === 24)` :
    "Correspond à 12-TET / 24-TET équipartite. Utiliser le layout
    dédié." Style discret (rgba bleu info, pas alarme), persistant
    tant que la condition est vraie (non dismissible — la
    suggestion redevient pertinente si l'utilisateur retourne sur
    N=12/24). Au clic, `App.handleConvertXEdoTo(targetSystem)`
    dispatch UPDATE_CLIPS_PITCH (snap des clips x-edo vers
    '12-TET' / '24-tet-equal') + SET_EDITOR_TEST_TUNING_SYSTEM
    (éditeur). Deux entrées undo séparées — reflète la double
    nature de la bascule. Pas de bannière inverse (12-TET → x-edo) :
    décision design assumée — c'est la version mathématique qui
    invite à la version musicale, pas l'inverse.

00000000000000000000000. **Iter F — Phase 8.2** (2026-04-27) :
    composant GridXEdoLayout + cellules splittées Shift pour N≥44
    (2 sous-commits).
    F.8.2.1 : `xEdoLayouts.xEdoLayoutForN(N)` retourne désormais une
    description complète du layout (cells avec col/visualRow/code/
    halves, numCols/numRows, useShift) — `xEdoKeyboardMapForN`
    consomme cette structure et reste rétro-compatible. Tables
    étendues à N=53 (mode SHIFT_ANCHOR, cf. xEdoLayouts.js).
    Nouveau composant `src/components/GridXEdoLayout.jsx` :
    générique, lit la description via xEdoLayoutForN(gridSize),
    construit la palette HSL dynamique (hue par col, lightness par
    row, héritage 75/60/45/30% du grid-31 historique), rend les
    cellules en CSS Grid avec containers `.gridx-cell` et halves
    `.gridx-key`. Architecture déjà prête pour Shift (1 ou 2 halves
    par cellule, états is-active/is-playing/is-cued portés par la
    half). Hauteur fixée inline selon numRows (90/120/140/160px).
    `'grid-x-edo'` ajouté à LAYOUT_COMPONENTS de PianoKeyboard.jsx
    avec calcul de `gridSize = getNotesPerOctave(sys, xEdoN)` —
    Slendro et Pelog (basculés en grid-x-edo en F.8.1.4) retrouvent
    leur clavier visible (gridSize=5/7), X-EDO l'utilise via
    state.xEdoN.
    F.8.2.2 : captation Shift en mode SHIFT_ANCHOR. WaveformEditor
    (Designer) et App.jsx (Composer placement contigu) routent
    `e.shiftKey + e.code` vers `xEdoShiftedKeyboardMapForN(xEdoN)`
    quand testTuningSystem === 'x-edo' && xEdoN >= 44 ; sinon Shift
    reste guard pour les durées Composer (F.3.4). Pas de collision :
    les layouts SHIFT_ANCHOR n'utilisent pas la rangée digit. Au
    keyup, on relâche AUSSI BIEN la voix base que la voix shifted
    pour la touche (l'état Shift peut différer entre keydown et
    keyup). **Bug latent corrigé** : depuis F.8.1.3, App.jsx
    composer keydown accédait directement à
    `getTuningSystem(...).keyboardMap` qui retournait la **factory**
    pour 'x-edo' au lieu d'un mapping → remplacé par
    `getKeyboardMap(sys, xEdoN)`. CSS : `.gridx-key-shifted` reçoit
    un border-left sombre comme séparateur visuel (la cellule garde
    sa couleur HSL unifiée — hue=col, lightness=row).

0000000000000000000000. **Iter F — Phase 8.1** (2026-04-27) : X-EDO
    paramétrique — infrastructure backend (4 sous-commits).
    F.8.1.1 : entrée `'x-edo'` au registre, factory polymorphe
    pour `noteNames` / `keyboardMap` / `notesPerOctave` (helpers
    `getNoteNames` / `getKeyboardMap` / `getNotesPerOctave`),
    `freq(noteIndex, octave, a4Ref, xEdoN)` ; `frequencyToNearestIn`
    accepte xEdoN comme 4ᵉ argument. Constantes
    `X_EDO_MIN/MAX/DEFAULT_X_EDO_N`. F.8.1.2 :
    `xEdoLayouts.js` génère les mappings QWERTY 1..43 selon la spec
    `archi/layouts_x-edo.txt` (escalier +1 col par rangée,
    serpentin-colonne ascendant, AZERTY-FR). 44..53 : table laissée
    vide en attendant la logique Shift de F.8.2 — X_EDO_MAX bridé à
    43 dans cette phase. F.8.1.3 : `state.xEdoN` (composer-undoable,
    persisté), action `SET_X_EDO_N` (clamp + snap des clips 'x-edo'
    vers la nouvelle grille + resnap éditeur si testTuningSystem
    matche), migration localStorage des clips '5-tet' et '31-edo'
    vers 'x-edo' (formules inline `legacyEqualFreq`, indépendantes
    du registre). Propagation de `xEdoN` aux call-sites :
    `clipFrequency`, `UPDATE_CLIPS_PITCH`,
    `SET_EDITOR_TEST_TUNING_SYSTEM`, `loadPersistedState` (clamp
    testNoteIndex), `usePlayback` (scheduler + WAV export),
    `PianoKeyboard`, `WaveformEditor` (preview, keyboardMap,
    cueTonicMax, affichage), `PropertiesPanel` (NoteEditor),
    `Timeline` (formatClipNote), `clipNote.formatClipNote`,
    `visualCues.cuedNoteIndices`. `window.__store` exposé en mode
    dev pour modifier xEdoN via console (UI input à venir en F.8.3).
    F.8.1.4 : suppression des entrées '5-tet' et '31-edo' du
    registre, des constantes associées (FIVE_KEY_MAP,
    THIRTYONE_KEY_MAP, fiveTetFreq, thirtyOneEdoFreq) et des
    composants Grid5Layout / Grid7Layout / Grid31Layout (~233
    lignes CSS retirées). Slendro / Pelog basculent sur `layout:
    'grid-x-edo'` avec keyboardMap statique précalculé via
    `xEdoKeyboardMapForN(5)` / `xEdoKeyboardMapForN(7)` (partage la
    grammaire serpentin avec X-EDO). VISUAL_CUE_SUPPORTED_SYSTEMS :
    '31-edo' → 'x-edo'. **Régression assumée le temps du
    hiatus inter-phase** : les claviers Slendro / Pelog / X-EDO
    rendent `null` (composant GridXEdoLayout livré en F.8.2) —
    interaction au clic indisponible, lecture audio préservée.
    Tests numériques (a4Ref=440) : 5-tet deg 2 oct 4 (580.583 Hz)
    snappe vers x-edo N=12 deg 5 oct 4 (587.330 Hz, +20¢) ; vers
    x-edo N=31 deg 12 oct 4 (575.414 Hz, -15.48¢). 31-edo deg 12
    → x-edo N=31 = identité (delta 0¢). **Interpellation archi** :
    l'exemple N=12 du prompt
    (`[KeyS, KeyE, KeyD, KeyR, KeyF, KeyT, KeyG, KeyY, KeyH, KeyJ,
    KeyK, KeyL]`) contient KeyK et KeyL absents du schéma N=12 du
    fichier de spec. Implémentation suit le fichier (canonique) :
    `[KeyS, KeyD, KeyE, KeyF, KeyR, KeyG, KeyT, KeyH, KeyY, KeyJ,
    KeyU, KeyI]`.

000000000000000000000. **Iter F — Phase 7.6** (2026-04-26) : libellés
    Cairo 1932 clarifiés. L'entrée `'24-tet-cairo-1932'` portait un
    libellé `'24-TET (Le Caire 1932, source: aly-abbara.com)'`
    trompeur : TET implique équipartite mathématique, or les valeurs
    sont des MESURES empiriques sur instruments réels qui dévient
    sciemment (tierces et sixtes neutres des maqâmat — E à +46¢, B
    à +42¢). Le congrès du Caire 1932 a deux héritages distincts :
    adoption théorique de 24-TET équipartite comme grille de notation
    savante (= notre entrée `'24-tet-equal'`) ET publication de
    mesures empiriques non-équiparties (= notre entrée
    `'24-tet-cairo-1932'`). Libellés rectifiés :
    `'24-TET équipartite (Cairo 1932 théorique)'` et `'Maqâmât Le
    Caire 1932 (24 hauteurs mesurées, aly-abbara.com)'`. Commentaire
    de la table `CAIRO_1932_HZ_OCT4` reformulé pour expliciter
    "mesures empiriques" et la distinction avec l'équipartite. Ids
    inchangés (`'24-tet-equal'` et `'24-tet-cairo-1932'`) — pas de
    coût utilisateur, évite find-replace global. Single commit
    ~5 lignes effectives.
00000000000000000000. **Iter F — Phase 7.5** (2026-04-26) : guard
    preventDefault systémique sur les touches alphanumériques et
    ponctuations candidates au mode note. Complète F.3.6 pour les
    systèmes ne mappant pas une touche donnée — en 12-TET, presser
    `'` (= Digit4 AZERTY) ouvrait toujours Firefox QuickFind parce
    que F.3.6 conditionnait le `preventDefault` au lookup
    `keyboardMap[e.code]`. Posture renforcée : nouvelle constante
    `NOTE_GUARD_KEYS` (`src/lib/keyboardCandidates.js`) listant
    toutes les touches qui peuvent être mappées comme note-trigger
    dans au moins un système, plus les ponctuations à risque
    (Slash, Quote, Backquote, …). Les listeners notes Designer
    (`WaveformEditor.jsx`) et Composer (`App.jsx`) appellent
    `preventDefault()` dès que `e.code ∈ NOTE_GUARD_KEYS` et qu'on
    est en mode note (hors form-field, sans Ctrl/Alt/Meta), avant
    le check Shift et le lookup keyboardMap. Ctrl/Alt/Meta restent
    exemptés (Ctrl+F navigateur, raccourcis a11y screen reader) ;
    Shift n'est exempté que du dispatch métier (réservé aux durées
    Composer, listener séparé non touché). Single commit ~30 lignes
    effectives.
0000000000000000000. **Iter F — Phase 7** (2026-04-26) : Tier 2 shrutis
    indiens, deux frameworks théoriques sur les mêmes 22 cents
    canoniques 5-limit (Path B). **Bhatkhande** (V.N. Bhatkhande,
    *Hindustani Sangeet Paddhati*, 1909-1932) — distribution
    1-4-4-4-1-4-4 (sa/pa piliers étroits) ; layout
    `grid-22-bhatkhande` avec gaps visuels au-dessus des colonnes
    sa et pa. **Sarngadeva** (*Sangita Ratnakara*, XIIIe s.) —
    distribution Bharata classique 4-3-2-4-4-3-2 (sa/ma/pa piliers
    larges, ga/ni minces) ; layout `grid-22-sarngadeva` partage la
    même grille géométrique 4×32 sub-cols mais peuple les cellules
    selon une autre distribution. Substrat acoustique partagé via
    `SHRUTI_CANONICAL_CENTS` + helper `shrutiFreq` factorisés
    (décision archi : "Catalogue partagé pour systèmes équivalents
    acoustiquement"). Nomenclatures romaines avec sous-lettres
    (Bhatkhande : I/IIa..IId/V/… ; Sarngadeva : Ia..Id/IIa..IIc/…),
    pas de séparateur "." pour `formatClipNote`. Mappings QWERTY
    dédiés ; Z-row = 7 svaras dans les deux (ZXCVBNM = sa, ri/IIa,
    ga/IIIa, ma/IVa, pa, dha/VIa, ni/VIIa) — mémoire motrice
    cross-framework préservée. Ancrage sa = a4Ref à oct 4 (cohérence
    5-TET/31-EDO/gamelan). Visual cues désactivés (patterns
    harmoniques 5-limit ne s'appliquent pas au contexte
    modal-mélodique indien). Insérés en 12e/13e position (entre
    `pelog` et `free`). Vérifs (a4Ref=440) : sa = 440.000 exact, re
    shuddha = 495.026 (~9/8 à +0.09¢, écart dû à l'arrondi entier
    des cents canoniques — conforme à la pratique slendro/pelog),
    pa = 660.017 (~3/2 à +0.06¢), sa oct 5 = 880.000. Bascule
    Bhatkhande ↔ Sarngadeva : noteIndex et fréquence préservés,
    seuls les labels changent. 2 sous-commits (7.1 catalogue +
    Bhatkhande ; 7.2 Sarngadeva). Registre à 14 entrées. Reste en
    backlog : 22-EDO Erlich (xenharmonique distinct des shrutis),
    53-EDO, refonte UI dropdown (urgente avec 14 entrées), Bharata
    reconstructed (Sambamoorthy) si demande explicite, modes
    indiens (ragas/pathets) en sous-ensembles surlignés.
000000000000000000. **Iter F — Phase 6** (2026-04-25) : Tier 2 gamelan —
    Slendro et Pelog d'après Surjodiningrat, Sudarjana & Susanto 1972
    (étude empirique de référence). Slendro 5 notes (cents [0, 241, 481,
    719, 958], déviations audibles vs 5-EDO — signature gamelan, ~3¢ sur
    II), réutilise grid-5 + FIVE_KEY_MAP de F.4.2 — strict alignement UI
    avec 5-TET. Pelog 7 notes (cents [0, 119, 258, 539, 678, 794, 1058],
    deux grands trous ~281¢ et ~264¢), nouveau layout grid-7 calqué sur
    grid-5 (7 hues à 360°/7 ≈ 51° de pas, hauteur 90/56px alignée), nouveau
    PELOG_KEY_MAP home row SDFGHJK (sous-ensemble strict de TWELVE_KEY_MAP).
    Cellules équidistantes (convention piano-12) alors que les pitchs ne
    le sont pas. Nomenclature romaine I..V / I..VII — pas d'import des
    noms javanais natifs (décision de scope). Tonique deg 0 = a4Ref.
    Visual cues désactivés (slendro/pelog absents de
    VISUAL_CUE_SUPPORTED_SYSTEMS, masquage automatique). Pelog Bem /
    Barang non modélisés (sous-ensembles que l'utilisateur joue
    directement sur les 7 notes). Insérés en 10e/11e position. Registre
    à 12 entrées. Reste en backlog : 22-EDO, 53-EDO, refonte UI dropdown
    catégorisé.
00000000000000000. **Iter F — Phase 5** (2026-04-25) : Tier 3 historiques
    européens — Mésotonique 1/4 de comma (centré sur C, chaîne E♭→G♯,
    tierces 5/4 pures à 386.314¢ exact, loup G♯↔E♭, cents Helmholtz/
    Ellis) et Werckmeister III (1691, 4 quintes tempérées par 1/4 de
    comma pythagoricien C-G/G-D/D-A/B-F♯ + 8 pures, tempérament Bach,
    cents Barbour 1951). Tables de cents inline (les fonctions ratio
    pythagorean/just ne motivent pas un helper unifié). Ancrage
    A4 = a4Ref par `c4 = a4Ref × 2^(-CENTS[9]/1200)`. Insérés en 4e/
    5e position dans le registre, regroupement des 12-notes.
    Réutilisation `piano-12` + `TWELVE_KEY_MAP` — aucune ligne ailleurs
    qu'au registre + visualCues. Visual cues activés. Registre à 10
    entrées. Vérifs : Mésotonique E/C = 1.250000 exact (5/4),
    A4 = 440.000 dans les deux. Triptyque pédagogique complété
    (Pythagoricien → Mésotonique → Werckmeister → 12-TET).
0000000000000000. **Iter F — Phase 4.4.3** (2026-04-25) : persistance
    cohérente de l'état d'exploration Designer + clamp défensif.
    F.4.4 avait livré la persistance de `visualCuePattern`/
    `visualCueTonic` mais laissé `testTuningSystem`/`testNoteIndex`/
    `testOctave`/`testFrequency` volatiles. Après reload, le système
    revenait silencieusement à `'12-TET'` pendant que `visualCueTonic`
    gardait sa valeur précédente, produisant des indices hors borne
    (e.g. tonic=25 alors que 12-TET plafonne à 11). Bug latent depuis
    F.3 mais visible depuis F.4.4. Correction : 4 nouveaux champs au
    JSON localStorage (`editorTestTuningSystem`, `editorTestNoteIndex`,
    `editorTestOctave`, `editorTestFrequency`), aux deps du useEffect
    de persistance ; `loadPersistedState` enrichi d'un bloc de
    validation/clamp défensif unifié pour les 6 champs Designer.
    Trois cas distincts : **absent** (undefined dans JSON) → propage
    undefined pour que `buildInitialState` retombe sur `DEFAULT_EDITOR`
    via `??` (préserve la migration F.4.4.2 → F.4.4.3) ; **présent et
    valide** → utilisé tel quel ; **présent mais invalide** (système
    retiré du registre, indice hors borne, pattern inconnu) →
    sanitize/clamp. Règles : système inconnu → fallback `'12-TET'` ;
    `testNoteIndex`/`visualCueTonic` clampés à `[0, notesPerOctave-1]`
    du système résolu (Libre = pas de clamp) ; `testOctave` clampé à
    `[0, 10]` ; `visualCuePattern` validé contre `VISUAL_CUE_PATTERNS`.
    Nouveau couplage `reducer → visualCues` (import de
    `VISUAL_CUE_PATTERNS`) : justifié — la validation defensive a
    besoin du catalogue ; pas de cycle.
000000000000000. **Iter F — Phase 4.4** (2026-04-25) : repères visuels
    passifs (gammes & accords) sur le clavier — saveur A pédagogique,
    feature transverse (multi-systèmes). Nouveau `src/lib/visualCues.js`
    avec catalogue universel en cents depuis la tonique (8 patterns :
    `none`, triade majeure/mineure, dom7, gamme majeure, mineure
    naturelle, pentatonique majeure, gamme par tons). `cuedNoteIndices()`
    snappe vers les degrés du système courant via `frequencyToNearestIn`
    — la même définition produit [0,4,7] en 12-TET, [0,10,18] en 31-EDO.
    `VISUAL_CUE_SUPPORTED_SYSTEMS` exclut 5-TET (errs > 90¢ sur triade
    majeure) et Libre (pas de degrés). 2 sous-commits :
    - **4.4.1** Catalogue + état éditeur (`visualCuePattern`,
      `visualCueTonic`), 2 actions reducer dans `DESIGNER_UNDOABLE`,
      persistance à plat dans localStorage (clés
      `editorVisualCuePattern`/`editorVisualCueTonic`, ré-injectées
      dans `editor` au `buildInitialState`). `SET_EDITOR_TEST_TUNING_SYSTEM`
      enrichi : tonic snap à 0 si > `notesPerOctave` du nouveau système.
    - **4.4.2** UI barre "Repère + Tonique" dans WaveformEditor au-dessus
      du clavier, visible uniquement si système supporté.
      `PianoKeyboard` reçoit prop `cuedNotes` (Set<number>) propagée à
      chaque layout (PianoLayout12, Grid24Layout, Grid5Layout,
      Grid31Layout). CSS `.is-cued` : halo magenta box-shadow externe,
      combinaisons avec `is-active` (inset cyan) et `is-playing`
      (outline jaune + glow) via comma-separated. Triple superposition
      possible (cued + active + playing) sans masquer le fill HSL.
    Saveur B (sélection compositionnelle active) reste en BACKLOG.
00000000000000. **Iter F — Phase 4.3.1** (2026-04-25) : correction
    palette grid-31. La palette livrée en 4.3 (`HUE_PER_ROW = 4 hues
    par rangée`) produisait 4 grosses bandes horizontales — peu
    informatif et déconnecté de la grammaire visuelle de
    Grid24Layout. Rectifié : hue par colonne (8 hues —
    `GRID31_HUE_PER_COL = [0, 38, 76, 130, 180, 220, 280, 320]`,
    extension du pattern `HUE_PER_NATURAL`) + lightness par rangée
    (75/60/45/30% du bas vers le haut, reprise stricte de la
    progression ↓→♮→↑→♯ de grid-24). Lightness portée par 4 classes
    `.grid31-key-r0..r3` (texte sombre/clair flippé au seuil ~52%),
    hue inline via `--hue`. is-active/is-playing inchangés.
0000000000000. **Iter F — Phase 4.3** (2026-04-25) : 31-EDO,
    explorateur micro-tonal — 31 divisions égales de l'octave
    (step ≈ 38.71¢), 7e tempérament non-libre. Interprétation
    abstraite (degrés 1..31 via `THIRTYONE_EDO_NOTE_NAMES`, pas
    d'emprunt à la nomenclature méantone — cohérent avec la
    position prise en 5-TET). Tonique deg 0 ancrée à `a4Ref` oct 4
    (`thirtyOneEdoFreq(i, oct, a4) = a4 · 2^(i/31 + oct-4)`).
    Suffixe "." dans les noms comme séparateur visuel pour
    `formatClipNote`, masqué sur les touches. `THIRTYONE_KEY_MAP`
    31 positions sur les 4 rangées physiques du clavier QWERTY en
    serpentin-colonne (Z-row, A-row, Q-row, digit ; KeyZ KeyS KeyE
    Digit4 KeyX … KeyP). Nouveau `Grid31Layout` dans
    `PianoKeyboard.jsx` : 4 rangées × 8 colonnes moins la case
    haut-droite (degré 31 = octave non représenté → 31 cellules),
    escalier 1/4 d'unité par rangée → 35 sub-cols, palette `HUE_PER_ROW
    = [0, 90, 180, 270]` (4 hues à 90° de pas), lightness uniforme
    62%, hauteur 160px / 80px compact alignée sur grid-24.
    `LAYOUT_COMPONENTS` enrichi de `'grid-31'`. Vérifs : deg 0 oct 4
    = 440 Hz exact, deg 10 ≈ 5/4 à +0.78¢ (tierce méantone
    quasi-pure, signature 31-EDO), deg 18 ≈ 3/2 à −5.18¢ (quinte
    méantone). **Tier 1 multi-tempérament clos** (4.1 juste-majeure,
    4.2 5-TET, 4.3 31-EDO) ; Tier 2 (Slendro, Pelog, 22-TET, 53-EDO)
    et Tier 3 (mésotoniques historiques, Werckmeister) restent en
    backlog si itération F est reprise.
000000000000. **Iter F — Phase 4.2** (2026-04-25) : 5-TET
    pentatonique égale + layout `grid-5`. 6e tempérament non-libre,
    premier avec `notesPerOctave` hors {12, 24}. Degrés I..V
    (nomenclature ratifiée, pas d'emprunt chromatique), ratio de
    pas 2^(1/5) ≈ 240¢, tonique I ancrée à `a4Ref` à oct 4 (plus
    de A → glissement sémantique de "A4 Hz" vers "fréquence de
    référence du degré 0"). Mapping QWERTY `FIVE_KEY_MAP` =
    sous-ensemble SDFGH du 12-TET (positions physiques préservées,
    sémantique différente). Nouveau `Grid5Layout` dans
    `PianoKeyboard.jsx` : grille 1×5, palette HSL à 72° de pas
    (HUE_PER_DEGREE = [0, 72, 144, 216, 288]), lightness uniforme
    (55%) — pas d'altération à hiérarchiser. `LAYOUT_COMPONENTS`
    enrichi de `'grid-5'`. Le dispatcher posé en F.3.3 accueille
    sans effort : le pattern d'extension tient.
00000000000. **Iter F — Phase 4.1** (2026-04-25) : Juste intonation
    majeure centrée sur C. 5e tempérament non-libre : table d'Ellis
    5-limit en dur (7 naturelles aux ratios canoniques, 5
    accidentels en enharmoniques bémols — D♯=6/5, G♯=8/5, A♯=9/5,
    plus C♯=16/15 et F♯=45/32). Ancrage `C4 = a4Ref × 3/5`
    (A/C = 5/3 dans la table, invariant A4 = a4Ref préservé). Même
    `notesPerOctave=12`, mêmes noms, même mapping QWERTY et même
    layout `piano-12` que 12-TET et Pythag-12 — sélecteurs et
    reducer consomment la nouvelle entrée sans modification. Le
    pattern d'extension posé en F.3 tient : une seule entrée de
    registre suffit.
0000000000. **Iter F — Phase 3.13.4** (2026-04-24) : correction
    z-order P1h. Rollback de l'offset vertical de 3.13.3 (mauvaise
    interprétation de "P1h au-dessus de P1" — voulait dire z-order,
    pas Y). `p1h.y` revient à `peakY`. À hold=0, P1h prend la priorité
    via z-order (dessin) + ordre de hit-test (P1h avant P1). Grab
    attrape P1h, drag horizontal tire le hold. Pour P1 dans cette
    configuration : sliders ou augmenter d'abord le hold.
000000000. **Iter F — Phase 3.13.3** (2026-04-24) : affinages
    visuels ADSR. Rayon handles 4 → 5 px. Plateau sustain restauré
    en tirets symboliques (`ADSR_SUSTAIN_PX = 60`, `ADSR_W = 380`,
    P3 géométrique non-draggable). Tentative de décalage vertical
    de P1h corrigée en 3.13.4.
00000000. **Iter F — Phase 3.13** (2026-04-24) : UX handles ADSR.
    P1h passe à 1D (X=hold seul, plus d'édition d'amplitude — la
    double édition P1/P1h post-3.12.2 était confuse). P3 et le
    segment plateau sustain visuel supprimés : `ADSR_W` 480 → 320,
    `ADSR_SUSTAIN_PX` retirée. Le sustain devient un niveau
    (point d'arrivée à P2), la release descend directement de P2
    vers P4. Polish handles : cercles isotropes (reset transform
    + coords physiques), curseur dynamique
    `default`/`grab`/`grabbing`, tooltips au survol indiquant le
    rôle (`AdsrTooltip`). Audio inchangé.
0000000. **Iter F — Phase 3.12** (2026-04-24) : ADSR → AHDSR.
    Champ `hold` (0-1000 ms, défaut 0) ajouté à l'enveloppe —
    plateau au peak entre attack et decay, utile percussifs avec
    punch et pédagogiquement précieux pour distinguer hold (forcé)
    vs sustain (tant que la touche est tenue). Audio Designer +
    Composer (live + WAV export) insèrent un plateau via deux
    rampes linéaires successives au même niveau. Persistance
    rétrocompat (?? 0). Re-scheduling pendant lecture désormais
    sensible aux changements d'enveloppe du patch (signature
    enrichie). UI : `ADSR_W` 400 → 480, nouveau handle P1h
    (X=hold, Y=amp en 2D, indexé `5`), 6e slider Hold inséré entre
    Attack et Decay. Drag P1h diagonal réutilise l'action combinée
    `SET_EDITOR_ADSR_AND_AMP` de F.3.11.3.
000000. **Iter F — Phase 3.11** (2026-04-24) : UI Enveloppe ADSR.
    Slider Amplitude rapatrié dans la zone Enveloppe (colonne droite
    à côté du canvas, 5 sliders Amp/A/D/S/R empilés). Graph fidèle
    au signal joué : `p1.y` reflète `amplitude`, `p2/p3.y` reflètent
    `amp×sustain` (sustain absolu = ratio du peak). Drag P1 devient
    2D (X=attack, Y=amp). ADSR_MAX_MS étendu à 1000 ms (plages A/D/R
    plus longues). Les 5 valeurs sont éditables au clavier via un
    nouveau composant générique `NumberInput` (parse/format
    paramétrables) — clic, parse permissif sur "%"/"ms"/virgule,
    Enter/blur commit, Esc annule. Allège la zone Paramètres pour
    le clavier grid-24 24-TET.
00000. **Iter F — Phase 3** (2026-04-23) : multi-tempérament 24 notes.
    Registre enrichi (`layout` + `keyboardMap`), `keyboardMap.js`
    supprimé. Deux nouvelles entrées 24-TET (égal + Le Caire 1932,
    table en dur ancrée 'Oshairan = A4 = 440). `PianoKeyboard`
    devient un dispatcher (`piano-12` / `grid-24`). Nouveau
    `Grid24Layout` (CSS Grid 4×14, 4 niveaux de couleur, cases
    d'enharmonie absentes). Refonte raccourcis durées : NumPad sans
    Shift + Shift+Digit (Digit nus libérés pour 24-TET).
    `frequencyToNearestNote` → `frequencyToNearestIn(hz, sysId,
    a4Ref)` (snap inter-systèmes en cents). Mapping QWERTY 24
    positions exactement.
0000. **Iter F — Phase 2** (2026-04-22) : premier tempérament alternatif
    (Pythagoricien 12 centré sur C, loup F#↔Db), sélecteurs dynamiques
    Designer + Properties, nouveau sélecteur dans PropertiesPanel avec
    logique de bascule verrouillée au reducer (dérivation cohérente des
    champs hauteur au changement de système), nouveau composant
    `A4Input` dans la toolbar Composer (380-480 Hz, undoable).
000. **Iter F — Phase 1** (2026-04-22) : infrastructure multi-tempérament.
   Registre `src/lib/tuningSystems.js` comme point d'extension unique pour
   les systèmes d'accordage ; `clipFrequency(clip, a4Ref)` délégué au
   registre ; champ d'état `a4Ref` (défaut 440 Hz, persisté) propagé à
   `usePlayback`, `WaveformEditor`, `PropertiesPanel`. Aucune UI nouvelle,
   comportement strictement identique à E.9.
00. **Iter A — Phase 2** : split onglets Designer/Composer + responsive (grid),
    SoundBank partagée extraite, MiniPlayer/Toolbar séparés, `usePlayback` hook
    partagé, hydratation de l'éditeur depuis `currentSoundId`, dual save
    (Mettre à jour / Enregistrer comme nouveau), dirty check via imperative handle,
    SpectrogramPlaceholder + PropertiesPanel placeholders, suppression de la
    largeur max globale.
0. **Iter A — Phase 1** : refonte modèle (Note→Clip, +Track/SoundFolder/numMeasures,
   migration localStorage transparente, IDs préfixés). Aucun changement d'UI.
1. **Refactor son↔note** : duration retirée des sounds, déplacée sur les notes ;
   BPM, beat, duration musicale ; beat subdivisions dans la grille ; migration localStorage
2. **Éditeur ADSR visuel** : canvas + poignées draggables remplacent les sliders
3. **Export WAV + zoom + visualiseur**
4. **Durée + ADSR par son** (avant refactor son↔note)
5. **Nom par défaut + doublons + rename inline**
6. **Persistance localStorage + suppression de sons**
7. **Sélecteur note musicale tempérée**
8. **Timeline initiale** : grille + drag-drop + lecture polyphonique + curseur
9. **WaveformEditor initial** : canvas + PeriodicWave + Play/Stop

## Règles de travail

- Pas de lib audio externe, Web Audio natif uniquement
- Formule BPM utilisée : `seconds = beats * 60 / bpm` (pas `× 4`, pour cohérence
  musicale standard : noire = 1 unité)
- Git : remote `origin` = `git@github.com:rm-info/synth-app.git`, branche `main`
- CONTEXT.md mis à jour à chaque fin de phase par Claude Code

## Roadmap & Backlog

### Itération B (édition avancée) — clôturée 2026-04-17

- ✅ Spectrogramme statique lecture seule (phase 1)
- ✅ Multi-sélection + drag/resize/dup/delete groupés + Properties multi
  (phase 2, commits 2.1–2.5)
- ✅ Copier/couper/coller (phase B.3)
- ✅ Fusion de clips (phase B.4)
- ✅ Compléments drag Composer : Ctrl+drag scroll, Alt+drag zoom (phase B.5)
- ✅ Répertoires de sons : arborescence, drag interne, CRUD dossiers (phase B.6)
- ✅ Menu contextuel mesures : supprimer/insérer/couper/copier/coller
  avec split clips à cheval (phase B.7)

### Itération C (multipiste) — clôturée 2026-04-18

- ✅ **Phase 1** (2026-04-17) — UI Multi-tracks. 5 sous-commits :
  - **1.1** En-têtes de pistes + couloirs visuels : refonte layout timeline
    en empilement vertical de couloirs. Colonne d'en-têtes sticky left (120px)
    avec pastille couleur + nom. Palette `TRACK_COLORS` (8 couleurs muted).
    Lane assignment greedy par piste. Fond alternant pair/impair. Bordure
    gauche colorée par corridor. Migration tracks color null → palette.
    `SET_TRACK_HEIGHT` appliqué uniformément à toutes les pistes.
  - **1.2** Création/renommage/suppression : `CREATE_TRACK` (bouton "+ Piste",
    max 16), `RENAME_TRACK` (double-clic input inline), `DELETE_TRACK`
    (× au survol, confirmation si clips, cascade suppression, plancher 1).
    `trackCounter` persisté. `tracks` ajouté à `COMPOSER_FIELDS` pour undo.
  - **1.3** Drop de sons sur la piste survolée : `findTrackAtY` identifie
    le couloir cible depuis la coordonnée Y, surbrillance cyan du couloir
    pendant le drag, `trackId` passé à `onAddClip`.
  - **1.4** Drag de clips entre pistes : `trackDelta` calculé en temps réel
    depuis le Y de la souris via `mouseStartTrackIndex` (corridor sous le
    curseur au mousedown, pas le track du clip — évite les sauts depuis
    lane > 0). Preview : `effectiveLane = 0` quand trackDelta ≠ 0 (la lane
    réelle est recalculée au drop). Multi-sélection cross-piste : même
    delta appliqué à tous, bornes intersectées. `MOVE_CLIPS` enrichi
    avec `trackId` optionnel.
  - **1.5** Réordonnancement des pistes par drag : mousedown sur l'en-tête
    + drag vertical. `REORDER_TRACKS` action (undoable). Feedback visuel :
    opacité réduite + bordure cyan d'insertion.
- ✅ **Phase 2** (2026-04-17) — Mute/Solo/Volume par piste. UI dans
    l'en-tête : boutons M/S toggle + slider volume compact. Logique
    solo standard DAW (mute prioritaire sur solo). GainNode par piste
    dans le graphe audio, gains mis à jour en temps réel pendant la
    lecture. Export WAV respecte mute/solo/volume. Clips des pistes
    mutées/solo-exclues affichés à opacité réduite. `UPDATE_TRACK`
    action undoable (pile Composer).
- ✅ **Phase 3** (2026-04-17) — Refonte moteur audio look-ahead.
    Scheduler à fenêtre glissante (25ms tick, 100ms look-ahead).
    Clips programmés par petits blocs au lieu d'un seul burst.
    Détection de changements par signatures (measure:beat:duration:
    soundId:trackId) : clips modifiés/supprimés invalidés et
    reprogrammés en temps réel. Export WAV inchangé (one-shot).
- ✅ **Phase 4** (2026-04-17) — Adaptation features A/B au multipiste.
    `canMergeClips` vérifie même trackId. Coller cross-piste : clic droit
    et Ctrl+V passent le trackId de la piste survolée → delta de piste
    appliqué à tous les clips collés (clampé aux bornes). Surbrillance
    des pistes cibles au clic droit "Coller ici". `mousePositionRef`
    enrichi avec `trackId`. PropertiesPanel affiche la piste (mono: nom,
    multi: "Pistes mixtes"). Échap ferme le menu contextuel timeline
    (listener capture phase, priorité sur désélection globale).
    Audit : clipboard, measure clipboard, split, delete/insert mesure,
    export WAV, multi-sélection cross-piste — tous déjà corrects.

### Itération D (Designer UX) — clôturée 2026-04-19

- ✅ **Phase 1** (2026-04-19) — Refonte sélecteur de notes + boutons Test :
  - **1.1** Sélecteur de système : dropdown "Système" (12-TET, Libre)
    remplace le toggle "Mode libre". Mode libre étendu à 2^4-2^15 Hz.
  - **1.2** Clavier piano 12 notes + rangée 11 boutons d'octave 0-10.
  - **1.3** Trois boutons Test : impact (•), court (━), tenu (∞).

### Itération E (Patches vs Notes) — clôturée 2026-04-22

- ✅ **Phase 1** (2026-04-19) — Refonte modèle : patches remplacent sounds,
  notes portées par les clips. Commit unique. Voir section État actuel.
- ✅ **Phase 2** (2026-04-19) — Affichage note dans les clips, édition
  via Properties (mini-clavier + octave), flèches clavier pour ajuster
  note/position. 3 sous-commits (2.1, 2.2, 2.3).
- ✅ **Phase 3** (2026-04-19) — Designer = instrument de test
  polyphonique : mousedown/mouseup sur le clavier, raccourcis QWERTY
  physique (event.code), PageUp/PageDown pour décaler l'octave, pédale
  de sustain Espace. 5 sous-commits (3.1, 3.2, 3.3, 3.4, 3.5). Les 3
  boutons Test impact/court/tenu sont retirés. Phase 3.3 initialement
  basée sur Shift/Ctrl "seuls", remplacée le 2026-04-23 par
  PageUp/PageDown (l'ordre de relâchement dans les combos créait des
  octaves intempestives).
- ✅ **Phase 4** (2026-04-19) — Drop intelligent au Composer +
  placement contigu au clavier. 2 sous-commits (4.1, 4.2).
  Extraction de `KEY_CODE_TO_NOTE_INDEX` dans `src/lib/keyboardMap.js`
  partagé entre les deux onglets. Raccourcis d'octave logés dans App
  (actif les deux onglets).
- ✅ **Phase 5** (2026-04-19) — Fixes placement contigu. Commit unique.
  (1) dragstart/dragend en phase capture (PatchBank stopPropagation
  empêchait dragInProgressRef d'être set). (2) preventDefault sur
  toutes les touches de note mappées dans le Composer (bloque F=Find
  et autres raccourcis navigateur), sauf combos Ctrl/Cmd et form
  fields. (3) Fallback anchor après UNDO/REDO_COMPOSER : si l'anchor
  a disparu, on retombe sur le clip avec la fin la plus tardive sur
  la même piste. (4) ADD_CLIP sélectionne le nouveau clip (drop OU
  placement contigu) pour permettre flèches/Ctrl+C immédiats.
- ✅ **Phase 6** (2026-04-20) — UX enrichie. 3 sous-commits :
  - **6.1** Durées en boutons toggle (7 bases + 3 coefs mutuellement
    exclusifs) remplaçant les dropdowns du toolbar et du panneau
    Properties. Snap 0.25 → 0.125 (triple croche). Module partagé
    `src/lib/durations.js` (catalogue, validité coef). Composant
    `DurationButtons`. Mode d'affichage solfège/fraction toggleable
    (state `durationMode` persisté). Raccourcis 1-7 (bases) et 8-0
    (coefs) actifs en Composer.
  - **6.2** Indicateur "Octave : N" dans la toolbar Composer,
    synchronisé avec `state.editor.testOctave` (partagé avec
    Designer). Fond "référence" bleuté quand octave 4.
  - **6.3** Transition CSS 0.35s ease-out sur `.track-corridor`
    (top + height) et `.track-header` (height) : ajout/retrait
    d'une lane s'anime au lieu de sauter. `.placed-sound` suit via
    transition sur `top` (désactivée pendant drag/resize/ghost).
- ✅ **Phase 7** (2026-04-20) — Ajustements UI et cohérence. 6 sous-commits :
  - **7.1** Invariant `lastAnchorClipId === selectedClipIds.at(-1)` quand
    la sélection est non vide. Helper `syncAnchorWithSelection(state)`
    appliqué en sortie de `withUndo` sur chaque action (idempotent).
    Corrige le bug où une cascade d'undo Composer pouvait laisser
    l'anchor sur une piste vidée pendant que la sélection restaurée
    pointait ailleurs → le placement contigu au clavier (touches note
    mappées) agissait sur la mauvaise piste.
  - **7.2** Mode fraction des durées réaligné sur la noire (= 1 beat,
    cohérent avec `seconds = beats * 60 / bpm`). Noire = "1", blanche
    = "2", ronde = "4", carrée = "8", croche = "1/2", double croche =
    "1/4", triple croche = "1/8". Icône du toggle solfège/fraction
    passée de `1/4` à `½` (plus de collision avec la double croche).
  - **7.3** Pas de déplacement clavier ←→ passé de 0.25 à **0.125** beat
    (aligné sur le snap triple croche depuis E.6.1). Shift+←→ reste à
    ±1 beat.
  - **7.4** Redimensionnement manuel des sidebars Composer. Nouveau
    composant `SidebarResizer` (poignée sur la bordure externe). State
    persisté `composerBankWidth` / `composerAsideWidth` (min/défaut
    `COMPOSER_SIDEBAR_MIN_WIDTH = 300`). Max dynamique : la zone
    centrale doit rester ≥ `COMPOSER_MAIN_MIN_WIDTH = 200` px
    (constantes dans `reducer.js`, clamp côté handler dans App).
    useEffect resize de la fenêtre reclampe si la fenêtre rétrécit.
    Largeurs appliquées via CSS variables `--composer-bank-width` /
    `--composer-aside-width` sur `.composer-layout` ; responsive
    (<1100px) ignore ces variables via media query existante.
    `PatchBank.css` et `PropertiesPanel.css` : `max-width: 280px`
    retiré (contraignait l'élargissement). `DurationButtons.css` :
    `flex-wrap: wrap` ajouté sur le conteneur et les sous-groupes
    bases/coefs pour que les boutons passent sur plusieurs lignes si
    la sidebar Properties est étroite.
  - **7.5** Toggle collapse/expand des sidebars. State persisté
    `composerBankCollapsed` / `composerAsideCollapsed` (défaut false).
    Action `SET_COMPOSER_SIDEBAR_COLLAPSED`. En mode fermé, la sidebar
    prend une largeur fixe `COMPOSER_SIDEBAR_COLLAPSED_WIDTH = 32px`
    via override de la CSS variable ; le panneau est démonté (state
    local volatile perdu — dossiers ouverts de la banque) et remplacé
    par le bouton `▶`/`◀` en haut + un label vertical "BANQUE" /
    "PROPRIÉTÉS" (`writing-mode: vertical-rl`). En mode ouvert, le
    bouton est injecté dans le header du panneau via nouvelle prop
    `headerExtra` (PatchBank + PropertiesPanel) — placement naturel
    dans le flex, pas de chevauchement avec le titre.
  - **7.6** Animation cohérente du drag cross-piste ("settling frame").
    Race condition CSS Transitions corrigée : le changement simultané
    de `transition-property` (none → top 0.35s, via retrait de la
    classe `is-dragging`) et de la valeur de `top` dans le même frame
    ne déclenche pas la transition. Fix : au mouseup, capture du `top`
    visuel de chaque clip déplacé/resizé via `el.style.top` (attribut
    `data-clip-id` ajouté), stockage dans le state local `settlingTops`
    appliqué au render suivant comme override inline, puis
    `requestAnimationFrame(() => setSettlingTops(null))` libère la
    valeur. Résultat : le clip glisse en 0.35s synchrone avec les
    corridors qui s'étirent/rétractent. Pendant le drag, la transition
    reste désactivée (réactivité instantanée préservée).
- ✅ **Phase 8** (2026-04-22) — Fix release ADSR Designer sur appui
  bref. Symptôme : appui court sur une touche (souris ou QWERTY) →
  clic sec au lieu d'attack+release. Cause réelle : dans
  `performRelease`, la lecture de `node.gain.gain.value` se faisait
  APRÈS `cancelScheduledValues(now)`. Or ce dernier annule la
  `linearRampToValueAtTime` d'attack encore en cours et fait retomber
  le param sur le dernier `setValueAtTime` antérieur à `now` — c'est-à-
  dire 0 (posé au start de la note). Donc `gain.value` lu juste après
  valait 0, et la rampe de release programmée allait de 0 à 0 : silence
  instantané perçu comme un clic. Fix minimal : capturer `currentGain
  = node.gain.gain.value` AVANT `cancelScheduledValues`, et réinjecter
  cette valeur via `setValueAtTime(currentGain, now)` avant la rampe
  vers 0. Complément : `osc.stop(now + r + 0.02)` au lieu de
  `osc.stop(now + r)` pour garantir une marge de 20ms évitant la coupe
  prématurée. Branches sustain (E.3.4) et retrigger (E.3.4) intactes.
- ✅ **Phase 9** (2026-04-22) — Micro-fades anti-clic. Deux clics
  résiduels post-E.8, causes distinctes, fix indépendants :
  - **9.1** Clic au démarrage d'une voix (Designer + Composer).
    Cause : `OscillatorNode` démarre à une phase arbitraire, et
    avec `attack = 0` le gain passe de 0 à amplitude en un
    sample-block → discontinuité. Fix : `MIN_ATTACK = 0.003s`
    exportée depuis `audio.js`, appliquée via
    `Math.max(user_attack, MIN_ATTACK)` dans
    `WaveformEditor.playInstrumentNote` et dans les deux
    `scheduleXxxClip` de `usePlayback` (temps réel + export WAV).
    Plancher de 3 ms sous le seuil perceptif (~10 ms) → l'attack
    utilisateur ≥ 3 ms n'est pas affecté.
  - **9.2** Clic au retrigger (rejeu d'une note déjà active ou
    sustainée). Cause : la branche retrigger coupait la voix
    précédente via `osc.stop()` sans argument — osc interrompu en
    pleine phase à gain élevé → clic marqué, pire en sustain.
    Fix : `RETRIGGER_FADE = 0.008s` (local `WaveformEditor.jsx`).
    Avant démarrage de la nouvelle voix, on applique à l'ancienne
    le pattern E.8 (capture `gain.value` AVANT
    `cancelScheduledValues`, `setValueAtTime`, rampe vers 0 en
    8 ms, `osc.stop` différé avec marge 20 ms, cleanup dans
    `onended`). La nouvelle voix démarre immédiatement, les deux
    se superposent 8 ms — imperceptible mais supprime le tick.
    `sustainedNotesRef.delete(idx)` préservé : la voix retriggée
    ne réapparaît pas au relâchement de Espace. Invariant
    retrigger "perçu net" (E.3.4) respecté.

### Itération F (multi-tempérament) — Tier 1 + Tier 2 (gamelan + shrutis indiens) + Tier 3 livrés

- ✅ **Phase 1** (2026-04-22) — Infrastructure multi-tempérament.
  Deux sous-commits :
  - **1.1** Registre des systèmes de tempérament. Création de
    `src/lib/tuningSystems.js` exposant `TUNING_SYSTEMS` (entrées
    '12-TET' et 'free' pour l'instant), `getTuningSystem(id)`,
    `DEFAULT_A4 = 440`, et `frequencyToNearestNote(hz, a4Ref)`.
    `clipFrequency(clip, a4Ref)` (reducer.js) délègue à `sys.freq(...)` ;
    les cas "free" sont détectés par `sys.freq === null`. Les copies
    locales de `noteToFrequency` (reducer.js et WaveformEditor.jsx)
    et les formules MIDI inline (App.jsx pour le spectrogramme,
    PropertiesPanel.jsx pour l'affichage Hz) sont toutes remplacées
    par des appels au registre. `formatClipNote` et `NOTE_NAMES`
    (clipNote.js) lisent les noms de notes depuis l'entrée '12-TET'
    du registre.
  - **1.2** A4 de référence dans le modèle. Nouveau champ d'état
    `a4Ref` (Hz, défaut 440), persisté dans localStorage avec les
    autres champs métier, validé au chargement (fallback 440 si
    absent/invalide). Propagé : App → `usePlayback` (miroir
    `a4RefRef` comme `bpmRef`, lu au tick du scheduler → lag ≤ 100ms
    pour un changement mid-playback ; `exportWav` lit depuis les
    props directement, OfflineAudioContext one-shot), App →
    `WaveformEditor` (preview polyphonique + spectrogramme), App →
    `PropertiesPanel` (affichage Hz dans NoteEditor). Aucune UI
    d'édition exposée — A4 reste à 440 Hz pour l'utilisateur final.
    Comportement strictement identique à E.9.
- ✅ **Phase 2** (2026-04-22) — Premier tempérament alternatif +
  UI A4. 2 sous-commits :
  - **2.1** Tempérament Pythagoricien 12 centré sur C. Nouvelle
    entrée `'pythagorean-12'` dans `TUNING_SYSTEMS`, label
    "Pythagoricien 12 (quintes pures, centré sur C)". Mêmes 12 noms
    de notes que 12-TET → clavier et UI existants réutilisés sans
    modification. Ratios pythagoriciens dérivés à l'init par parcours
    de la chaîne (constantes `PYTH_FIFTHS_FROM_C` = position dans la
    chaîne par noteIndex, 6 montantes G D A E B F# et 5 descendantes
    F Bb Eb Ab Db ; puis `PYTH_RATIOS_FROM_C` = (3/2)^k replié dans
    [1, 2) par octave-fold). `pythagoreanFreq(noteIndex, octave,
    a4Ref)` ancre C4 = a4Ref × 16/27 et multiplie par le ratio et
    2^(octave-4). La quinte du loup tombe naturellement entre F#
    (+6) et Db (-5) : ~678 cents au lieu de 702 — audible, attendu.
    Ordre dans le registre : `12-TET`, `pythagorean-12`, `free`.
    Sélecteurs de système dérivés du registre (itération
    `Object.values(TUNING_SYSTEMS)`) — Designer et Properties
    Composer. **Ajout du sélecteur dans PropertiesPanel** (absent
    auparavant, seul le Designer en avait un) via composant local
    `TuningSystemSelect` réutilisé en mono (ClipEditor) et multi
    (MultiClipEditor). En multi, check `allSameTuningSystem` ajouté
    à côté de `allSamePitch` → sélecteur éditable si homogène, sinon
    "Systèmes mixtes" read-only. Logique de bascule portée par le
    reducer (`UPDATE_CLIPS_PITCH` étendu) : vers `'free'` calcule
    la fréquence courante (via `clipFrequency`), entre systèmes de
    même `notesPerOctave` garde noteIndex/octave tels quels, sinon
    snap via `frequencyToNearestNote` (12-TET ref pour F.2). Pattern
    symétrique appliqué à `SET_EDITOR_TEST_TUNING_SYSTEM` du
    Designer — corrige un bug latent (le hardcode `'12-TET'` en
    branche non-free aurait snappé aléatoirement à la bascule
    12-TET → Pythagoricien). Libre → Pythagoricien reste un snap
    via 12-TET en F.2 : acceptable puisque les 12 noms de notes
    sont partagés.
  - **2.2** Input A4 dans la toolbar Composer. Nouveau composant
    `A4Input.jsx` — pattern identique à `BpmInput` (validation
    différée au blur/Enter, Échap restaure `preFocusValue`,
    ArrowUp/Down ±1, Shift ±5). Fourchette 380-480 Hz entiers
    (couvre tous les diapasons historiques usuels : Versailles 392,
    baroque 415, XIXe français 435, moderne 440, contemporain
    442-444). Ignoré pour F.2 : décimales (si besoin ressenti) et
    extraction d'un helper `ValidatedIntegerInput` partagé avec
    BpmInput (candidat si un 3e input similaire apparaît). Nouvelle
    action `SET_A4_REF` ajoutée à `COMPOSER_UNDOABLE` ; `a4Ref`
    ajouté à `COMPOSER_FIELDS` pour que l'undo Composer restaure
    aussi la hauteur de référence. Intégration visuelle à côté du
    BPM dans la même `toolbar-section` (même gap, suffixe "Hz" en
    gris clair, style aligné).
- ✅ **Phase 3** (2026-04-23) — Multi-tempérament 24 notes. 4 sous-commits :
  - **3.1** Enrichissement du registre (`layout`, `keyboardMap`).
    Chaque entrée porte désormais son layout (`'piano-12'`,
    `'grid-24'`, `'free'`) et son mapping QWERTY (event.code →
    noteIndex, ou `null` pour 'free'). `src/lib/keyboardMap.js`
    supprimé : les consommateurs (listener Composer App.jsx,
    listener Designer WaveformEditor) lisent dynamiquement
    `getTuningSystem(testTuningSystem).keyboardMap`. Le clip placé
    via touche maintenue hérite du `editor.testTuningSystem` (au
    lieu de `'12-TET'` hardcodé). Guard modificateurs unifié
    (note = pas de Shift/Ctrl/Alt/Meta) en préparation des durées
    Shift+Digit et des notes Digit2..0 en 24-TET.
    `getTuningSystem(id)` inconnu : `console.warn` + fallback
    explicite (plus de fallback silencieux).
  - **3.2** Ajout des deux 24-TET au registre. `'24-tet-equal'` :
    formule `a4Ref·2^((i-18)/24)·2^(oct-4)` (A=index 18 ancré).
    `'24-tet-cairo-1932'` : table en dur des 24 fréquences de
    l'octave 4 (`CAIRO_1932_HZ_OCT4`), réindexée C-centrée, ancrée
    'Oshairan = A4 = 440. Les "anomalies" — E à +46¢, E↑ à +38¢,
    B à +42¢ — sont la signature des tierces et sixtes neutres des
    maqâmat, à ne pas "corriger" vers le 24-TET égal. Noms partagés
    (`TWENTYFOUR_NOTE_NAMES`) : `C, C↑, C♯, D♭, D, …, B↑`. Mapping
    QWERTY 24 positions (`TWENTYFOUR_KEY_MAP`) : naturelles SDFGHJK,
    demi-dièses ERTYUIO, dièses pleins 24680, demi-bémols XCBN,.
    Ordre dans le registre : `12-TET`, `pythagorean-12`,
    `24-tet-equal`, `24-tet-cairo-1932`, `free`.
  - **3.3** Clavier visuel `Grid24Layout`. `PianoKeyboard` devient
    un dispatcher (`LAYOUT_COMPONENTS = { 'piano-12':
    PianoLayout12, 'grid-24': Grid24Layout }`). L'implémentation
    piano historique est extraite telle quelle dans `PianoLayout12`
    — aucun changement comportemental pour 12-TET / Pythag-12.
    `Grid24Layout` : CSS Grid 4 rangées × 14 colonnes (chaque
    naturelle occupe 2 cols, les altérations s'insèrent entre avec
    décalage), 3 niveaux de couleur (naturelles claires,
    demi-dièses/-bémols intermédiaires, dièses pleins sombres),
    4 cases "réellement absentes" (Mi/Si rangée 1 et 4) qui
    matérialisent l'enharmonie F♯=…, B♯=C, F♭=E, C♭=B. Hook
    partagé `useMouseDownHandler` factorise la logique
    mousedown→onKeyPress + window-mouseup→onKeyRelease entre les
    deux layouts. Nouvelle prop `tuningSystem` passée par
    WaveformEditor (`testTuningSystem`) et PropertiesPanel
    (`clip.tuningSystem`).
  - **3.4** Refonte raccourcis durées + snap inter-systèmes
    généralisé. Durées : retiré Digit1..0 sans Shift (libérés pour
    les notes 24-TET), ajouté NumPad1..0 sans Shift et Shift+Digit
    en fallback laptop. `decodeRank()` factorise event → rang 1..10
    (1..7 = bases, 8..10 = coefs ×1.25/Pointé/Double-pointé).
    Snap : `frequencyToNearestNote` (12-TET only) →
    `frequencyToNearestIn(hz, sysId, a4Ref)` qui itère sur la
    grille du système cible × 11 octaves et minimise
    `|1200·log2(candidate/hz)|`. Reducer
    (`UPDATE_CLIPS_PITCH` + `SET_EDITOR_TEST_TUNING_SYSTEM`) lit la
    fréquence source depuis le rendu de l'ancien système (et plus
    de `clip.frequency`, qui peut être `null`) puis snappe vers le
    système cible. Tests-clés : 12-TET C4 → 24-TET-egal reste C4
    (0¢), 24-TET-egal C↑4 → 12-TET snap C4 (~49¢ < ~51¢ de C♯4),
    24-TET-cairo Busalik (E +46¢) → 12-TET snap E.
  - **3.5** (2026-04-23) Signes ↓ au lieu de ♭ en 24-TET. D♭ plein
    et C♯ plein sont enharmoniques dans une grille 24-TET → écrire
    ♭ pour les positions 3, 7, 13, 17, 21 attribuait deux noms à la
    même position. Remplacement par ↓ (demi-bémol) dans
    `TWENTYFOUR_NOTE_NAMES` ; `formatClipNote` et Grid24Layout
    s'alignent automatiquement (lecture du registre).
  - **3.6** (2026-04-23) Remapping QWERTY géométrique + preventDefault
    Firefox. Rangée 1 (♯) décalée d'un cran : Digit4=C♯, Digit5=D♯,
    Digit7=F♯, Digit8=G♯, Digit9=A♯ — chaque chiffre est centré
    entre les deux lettres de la rangée du dessous (Digit4 entre
    KeyE et KeyR → C♯ entre C↑ et D↑). Rangée 4 : Comma → KeyM
    pour B↓ (KeyM entre KeyJ et KeyK = entre A et B). Designer
    onKeyDown : `e.preventDefault()` déplacé AVANT le check
    `e.repeat` — Firefox déclenche QuickFind sur ' (AZERTY Digit4)
    à chaque keydown répété, pas seulement au premier.
  - **3.7** (2026-04-23) Alignement grid-24 escalier + palette par
    hue. Grid passe de 14 à 15 sub-cols pour permettre l'escalier :
    chaque rangée décalée d'+1 sub-col par rapport à celle du
    dessous (r3 offset 0, r2 +1, r1 +2, r4 +3). Chaque
    demi-altération centrée entre les naturelles voisines, chaque
    dièse plein centré entre les demi-dièses voisins — géométrie
    cohérente avec le mapping QWERTY. Palette : 7 hues répartis
    (HUE_PER_NATURAL = [0, 38, 76, 145, 200, 256, 310]), un par
    naturelle. Altérations héritent du hue de leur "parente"
    (↑ et ♯ → naturelle ascendante, ↓ → naturelle suivante).
    Lightness varie par kind (♯ 35%, ♮ 62%, ↑/↓ 75%) →
    différenciation conservée en niveaux de gris. États is-active
    (cyan) et is-playing (jaune) écrasent par !important.
  - **3.8** (2026-04-23) Escalier 1/4 + palette différenciée +
    surbrillance qui préserve la couleur. Grid passe de 15 à 30
    sub-cols (4 sub-cols par naturelle). Décalage 1/4 d'unité par
    rangée : r3 offset 0, r2 +1, r1 +2, r4 −1 (au lieu de +3).
    D↑ et D↓ s'organisent désormais en diamant autour de D
    (équidistants sur côtés opposés). Centre visuel = 3 +
    noteIndex/2 → la grille devient une vraie gamme chromatique
    24-TET linéaire de gauche à droite. Palette : ♮ 60%, ↑ 45%,
    ♯ 30%, ↓ 75% (4 lightness distincts au lieu de 3, ↑ et ↓ ne
    partagent plus la même teinte). is-playing devient outline
    jaune épais (`outline: 3px solid #ffc600` + `outline-offset:
    -3px` + glow) → le fill HSL natif reste visible, l'utilisateur
    garde son repère couleur+position pendant la lecture. is-active
    (sélection cyan) inchangé.
  - **3.9** (2026-04-23) Sélecteur de tempérament dans la toolbar
    Composer. Nouveau dropdown à côté de A4, options identiques
    au sélecteur Designer (`Object.values(TUNING_SYSTEMS)`).
    Reflète `editor.testTuningSystem` (single source of truth) ;
    changement → dispatch `SET_EDITOR_TEST_TUNING_SYSTEM` (action
    existante, pile undo `DESIGNER_UNDOABLE` inchangée). Permet de
    vérifier/changer le tempérament des nouveaux clips placés au
    clavier dans le Composer sans revenir au Designer. Aucun
    raccourci clavier (report si besoin émerge).
  - **3.10** (2026-04-23) Sélection grid-24 préserve aussi la
    couleur HSL. Oubli de F.3.8 : `is-active` gardait `background
    cyan !important` qui écrasait le fill par-degré. Remplacé par
    `box-shadow: inset 0 0 0 3px #00d4ff` — le fond HSL reste
    visible. Combiné avec `is-playing` (outline jaune) via une
    règle dédiée `.is-active.is-playing` qui pose `inset cyan` +
    `glow jaune` simultanément. Triple indication possible sans
    écraser la couleur. Piano-12 inchangé.
  - **3.11** (2026-04-24) UI Enveloppe — Amplitude rapatriée dans
    l'ADSR + valeurs éditables + range étendu. 2 sous-commits :
    - **3.11.1** Layout colonne sliders à droite du canvas ADSR
      (.adsr-body flex row : canvas flex 1 + .adsr-sliders fixed
      150px). Slider Amp déplacé depuis Paramètres → tête de
      colonne, suivi de A/D/S/R. Allège la zone Paramètres pour
      le clavier grid-24. Graph fidèle au signal joué :
      `adsrLevelToY(level) = ADSR_PEAK_Y + (1-level)·(ADSR_H-
      ADSR_PEAK_Y)`, `p1.y = adsrLevelToY(amp)`,
      `p2.y = p3.y = adsrLevelToY(amp×sustain)`. À amp=0.5
      sustain=1, P2 atteint visuellement P1 (drop decay disparaît,
      comme dans l'audio). Drag P1 devient 2D : X édite attack
      (draftAdsr), Y édite amp (draftAmp). Drag P2 Y inverse :
      `sustain = level/amp` clampé ; amp=0 → no-op. ADSR_MAX_MS
      passe de 500 à 1000 — sliders A/D/R max=1000, ADSR_SEGMENT_PX
      reste 80 (les valeurs longues remplissent les 80 px alloués).
      Pas de migration patch (les valeurs existantes restent
      audibles à l'identique).
    - **3.11.2** Valeurs ADSR éditables au clavier. Nouveau
      composant générique `NumberInput` (paramétré par parse/format)
      remplace les `<strong>` par des inputs cliquables. Pattern
      FreqInput généralisé : pas de validation pendant la frappe,
      parse + clamp + format au blur/Enter, Esc restaure
      preFocusValueRef. Helpers : `parsePercent` / `formatPercent`
      ("75" ↔ 0.75 ↔ "75%") et `parseMs` / `formatMs` ("240" ↔
      240 ↔ "240 ms"), permissifs sur "%", "ms" suffix et virgule
      décimale. `commitInputAdsr(key, v)` retire la clé du draftAdsr
      avant le dispatch (sinon le slider afficherait la valeur draft
      pré-input après commit). Slider et input partagent le draft —
      le dernier qui commit gagne, pas de verrou. Focus guard
      existant (`isFormField`) couvre déjà les nouveaux inputs.
    - **3.11.3** Fix undo : drag P1 diagonal unifié en un snapshot
      via nouvelle action `SET_EDITOR_ADSR_AND_AMP` (payload
      `{ adsr?, amplitude? }` fusionnés dans un seul update reducer).
      Avant : endAdsrDrag dispatchait `SET_EDITOR_ADSR` puis
      `SET_EDITOR_AMPLITUDE` → withUndo créait 2 snapshots → 2
      Ctrl+Z pour annuler un geste. Filtre no-op factorisé dans
      `filterAdsrPatch(draft)` — réutilisé par les chemins simple
      et combiné. Bifurcation dans endAdsrDrag selon les drafts
      effectivement modifiés (adsr+amp / adsr seul / amp seul /
      rien). Autres chemins (sliders, NumberInputs, drag P2/P4)
      inchangés.
  - **3.12** (2026-04-24) Champ Hold — ADSR → AHDSR. 2 sous-commits :
    - **3.12.1** Modèle + audio + persistance. Nouveau champ
      `hold` (0-1000 ms, défaut 0) sur `editor` et `Patch`. Plateau
      au peak inséré entre attack et decay via deux
      `linearRampToValueAtTime` au même niveau (Designer
      `playInstrumentNote`, Composer `usePlayback` schedulers live
      et WAV export). `clipDuration = max(noteDurationSec, a + h +
      d + r)`. Hydratation rétrocompat (`?? 0`) — patches
      localStorage existants restent audibles à l'identique. La
      signature de re-scheduling dans usePlayback inclut désormais
      l'enveloppe du patch référencé (attack, hold, decay, sustain,
      release, amplitude) — modifier ces champs pendant la lecture
      re-schedule les clips à venir. `prevPatchesRef` track le
      delta inter-patches. Pas d'UI dans ce sous-commit.
    - **3.12.2** UI hold. `ADSR_W` 400 → 480 (unité de dessin,
      canvas reste responsive). Nouveau point P1h = `{ x: attackPx
      + holdPx, y: adsrLevelToY(amp) }` — même Y que P1 (peak
      line). Trait dessiné P1 → P1h horizontal au peak (le plateau
      hold), puis P1h → P2 (decay). p2/p3/p4.x recalés avec holdPx.
      Drag P1h (idx 5) : 2D comme P1 (X=hold, Y=amp). Réutilise
      sans nouveau code l'infrastructure F.3.11.3 (`endAdsrDrag`
      bifurque vers `SET_EDITOR_ADSR_AND_AMP` si les deux drafts
      ont bougé). Drags P2/P4 corrigés : la base X intègre désormais
      `holdPx` (avant, calculait depuis attackPx seul → faux dès
      qu'un hold était présent). Hit-test ordre P1, P1h, P2, P4 —
      à hold=0 P1h gagne (préfère introduire du hold). 6e
      slider/NumberInput Hold inséré entre Attack et Decay (ordre
      Amp → Attack → Hold → Decay → Sustain → Release). Colonne
      sliders 150 → 160 px, gap 8 → 6 px.
  - **3.13** (2026-04-24) UX handles ADSR : recadrage P1h, P3 retiré,
    polish. 2 sous-commits :
    - **3.13.1** Canvas sémantique. P1h passe à 1D (X=hold seul, Y
      ignoré) — la double édition d'amplitude P1/P1h post-3.12.2
      était confuse. P3 et le segment plateau sustain visuel
      supprimés : sustain est sémantiquement un NIVEAU (point
      d'arrivée à P2), pas une zone temporelle, le moteur audio
      n'a jamais tenu de plateau sustain fixe. La courbe descend
      directement de P2 vers P4. `ADSR_W = 4 × ADSR_SEGMENT_PX =
      320` (plus de zone fixe), `ADSR_SUSTAIN_PX` supprimée. Drag
      P4 base recalculée sans le segment fixe. Hit-test à hold=0 :
      P1 testé en premier → tie-break favorise drag attack+amp,
      hold démarre via slider/NumberInput. Audio inchangé.
    - **3.13.2** Polish handles : cercles isotropes (dessinés en
      coords physiques après `setTransform(1,0,0,1,0,0)` — plus
      d'ellipses dues au scale anisotrope du canvas), curseur
      dynamique (`default` ailleurs → `grab` au survol → `grabbing`
      pendant drag), tooltips au survol via composant `AdsrTooltip`
      (P1: Attack+Amplitude, P1h: Hold, P2: Decay+Sustain, P4:
      Release). État `hover = { idx, px, py }` populé à event-time
      dans `handleAdsrMouseMove` — coords px DOM calculées via
      `getBoundingClientRect`, passées en props au tooltip
      (interdiction ESLint d'accéder au ref pendant render).
      Tooltip caché pendant un drag, bascule sous le handle si
      proche du bord haut. `findHoveredHandle(pos)` factorise le
      hit-test géométrique avec `handleAdsrMouseDown`.
    - **3.13.3** Affinages visuels. Rayon des handles 4 → 5 px
      (`ADSR_HANDLE_RADIUS`), HIT_RADIUS 11. Plateau sustain
      restauré en tirets symboliques (`setLineDash([4, 4])`)
      entre P2 et P3 — `ADSR_SUSTAIN_PX = 60`, `ADSR_W = 380`.
      P3 géométrique non-draggable (fin du plateau), pas de
      handle visible, drag P4 base réintègre `ADSR_SUSTAIN_PX`.
      Tentative de décalage vertical de P1h (8 px au-dessus de la
      peak line) — corrigée en 3.13.4.
    - **3.13.4** Correction P1h via z-order, pas Y-offset. Mauvaise
      interprétation de "P1h au-dessus de P1" en 3.13.3 : voulait
      dire en z-order, pas en Y. Rollback de
      `ADSR_P1H_Y_OFFSET` ; `p1h.y = peakY`. Ordre de hit-test
      inversé (P1h avant P1) dans `handleAdsrMouseDown` et
      `findHoveredHandle` → tie-break à hold=0 favorise P1h. Ordre
      de dessin déjà correct (P1 dessiné avant P1h, donc P1h sur
      le dessus). Conséquence : à hold=0, un seul cercle visible
      (P1h sur P1), grab attrape P1h, drag horizontal tire le hold.
      Pour P1 dans cette configuration : sliders Attack/Amp ou
      augmenter d'abord le hold. Silhouette de l'enveloppe à
      nouveau strictement fidèle (plus de dérogation visuelle de
      la peak line).
    - **3.13.5** (2026-05-12) Hotfix Firefox — canvas vides au
      mount. Sur Firefox, `canvas.width = N` invalide le backing
      store ; les ops 2D entre le set et le paint allocateur sont
      silencieusement avalées (`getImageData` retourne `(0,0,0,0)`
      en sync post-fillRect). Affecte les 3 canvases du Designer
      (ADSR, waveform, Spectrogramme) qui partagent le pattern
      `canvas.width = w; canvas.height = h; draw()` dans le
      ResizeObserver. Fix : draw immédiat (cas canvas chaud — param
      tweaks sans resize) **+** double `requestAnimationFrame` qui
      redessine après le paint allocateur de FF. Single rAF
      insuffisant car son callback tire AVANT le paint de la même
      frame. Cleanup approprié (cancel des deux rAF). Chromium n'a
      pas le bug mais le double rAF y est inoffensif (~32ms
      invisibles au mount).
  majeure centrée sur C. 5e entrée du registre (`'just-major-c'`),
  3e position (entre `pythagorean-12` et `24-tet-equal`). Table
  d'Ellis 5-limit `JUST_MAJOR_RATIOS_FROM_C` en dur (valeurs
  canoniques — dériver procéduralement obscurcirait) : `[1, 16/15,
  9/8, 6/5, 5/4, 4/3, 45/32, 3/2, 8/5, 5/3, 9/5, 15/8]`.
  `justMajorCFreq(noteIndex, octave, a4Ref)` ancre `C4 = a4Ref ×
  3/5` (A/C = 5/3 dans la table → A4 = a4Ref exactement, invariant
  F.2 préservé) et multiplie par le ratio et `2^(octave-4)`. Les 5
  accidentels sont les enharmoniques bémols fonctionnels
  (D♯=6/5=E♭ mineur, G♯=8/5=A♭ mineur, A♯=9/5=B♭ mineur, C♯=16/15,
  F♯=45/32) — conséquence pédagogique assumée : D♯ sonne comme un
  mi bémol pur. Aucun nouveau layout ni mapping clavier :
  réutilisation de `piano-12` et `TWELVE_KEY_MAP`. Sélecteurs
  (Designer, Composer, PropertiesPanel mono et multi) et reducer
  (`UPDATE_CLIPS_PITCH`, `SET_EDITOR_TEST_TUNING_SYSTEM`, snap
  `frequencyToNearestIn`) consomment la nouvelle entrée sans
  modification — le pattern d'extension posé en F.3 tient.
  Vérifs numériques : à `a4Ref=440`, C4=264 Hz, A4=440 Hz exactement ;
  triade C-E-G en ratios 5:4 et 3:2 purs (battements supprimés vs
  12-TET). À `a4Ref=415`, C4=249 Hz.
- ✅ **Phase 4.2** (2026-04-25) — Tempérament 5-TET pentatonique
  égale + layout `grid-5`. Nouvelle entrée `'5-tet'` au registre
  (6e position, avant `free`). `FIVE_TET_NOTE_NAMES = ['I', 'II',
  'III', 'IV', 'V']` — nomenclature ratifiée I..V, pas de reprise
  de noms chromatiques (5-TET n'est pas un sous-ensemble du
  chromatique). `fiveTetFreq(i, oct, a4Ref) = a4Ref · 2^(i/5 +
  oct-4)` ancre la tonique I à `a4Ref` à l'octave 4 — en l'absence
  de A en 5-TET, la "hauteur de référence A4" glisse vers "degré I
  à oct 4". `FIVE_KEY_MAP` = sous-ensemble SDFGH du `TWELVE_KEY_MAP`
  (mêmes `event.code` que les naturelles C/D/E/F/G, sémantique
  différente — la mémoire motrice est préservée). Nouveau
  `Grid5Layout` dans `PianoKeyboard.jsx` (parallèle à
  `PianoLayout12` et `Grid24Layout` du même fichier) : CSS Grid 1×5,
  largeur égale, labels I..V en chiffres romains monospace,
  `HUE_PER_DEGREE = [0, 72, 144, 216, 288]`, lightness uniforme
  (55%). Patterns `is-active` (inset cyan) et `is-playing` (outline
  jaune + glow) repris de grid-24 pour préserver le fill HSL.
  Dispatcher `LAYOUT_COMPONENTS` enrichi de `'grid-5'`. Vérifs
  numériques : à `a4Ref=440`, I4=440, V4=766.08 Hz (960¢), I5=880
  (octave juste) ; snap 12-TET C4 (261.63 Hz) → 5-TET retourne
  II3 (252.71 Hz, meilleure approximation dans la grille) ;
  bascule inverse II3 5-TET → 12-TET snappe à B3 (40¢ vs 60¢ pour
  C4).
- ✅ **Phase 4.3** (2026-04-25) — Tempérament 31-EDO + layout
  `grid-31`. Nouvelle entrée `'31-edo'` au registre (7e position,
  avant `free`). 31 divisions égales (step 1200/31 ≈ 38.71¢) ;
  tonique deg 0 ancrée à `a4Ref` oct 4 (cohérence avec 5-TET —
  généralisation `a4Ref` = "fréquence du degré 0 à oct 4").
  Interprétation abstraite : `THIRTYONE_EDO_NOTE_NAMES` numérotés
  1..31 (avec suffixe "." comme séparateur visuel pour
  `formatClipNote`), pas d'emprunt à la nomenclature méantone.
  `THIRTYONE_KEY_MAP` 31 positions sur les 4 rangées physiques du
  clavier QWERTY en serpentin-colonne (Z/A/Q/digit, 8 colonnes
  moins la case haut-droite). Nouveau `Grid31Layout` (4×35 sub-cols,
  escalier 1/4 d'unité par rangée — extension du pattern grid-24 à
  8 colonnes), palette `HUE_PER_ROW = [0, 90, 180, 270]` à 90° de
  pas, lightness uniforme 62%, hauteur 160px / 80px compact (aligné
  grid-24, pas grid-5). `LAYOUT_COMPONENTS` enrichi de `'grid-31'`.
  Vérifs numériques : deg 10 ≈ tierce 5/4 à +0.78¢ (signature
  méantone 31-EDO), deg 18 ≈ quinte 3/2 à −5.18¢. Hors scope :
  nomenclature méantone optionnelle (C♯/D♭, double-dièses), repères
  visuels triades/gammes (transverse, voir backlog), clavier
  isomorphique Wicki-Hayden, autres N-EDO, tonique alternative,
  tooltip pédagogique micro-intervalles.
  - ✅ **4.3.1** (2026-04-25) — Correction palette grid-31. Hue par
    colonne (8 hues) + lightness par rangée (75/60/45/30%, alignée
    sur la grammaire ↓→♮→↑→♯ de grid-24), au lieu de la palette
    initiale 4-hues-par-rangée qui produisait des bandes
    horizontales peu informatives. 4 classes
    `.grid31-key-r0..r3` portent la lightness (texte
    sombre/clair flippé au seuil ~52%), hue inline via `--hue`.
- **Tier 1 multi-tempérament clos** : 4.1 juste-majeure, 4.2 5-TET,
  4.3 31-EDO livrés.
- ✅ **Phase 4.4** (2026-04-25) — Repères visuels (gammes & accords)
  passifs sur le clavier — saveur A pédagogique, feature transverse
  (multi-systèmes, hors 5-TET et Libre). 2 sous-commits :
  - **4.4.1** Catalogue `src/lib/visualCues.js` (8 patterns :
    none + 3 accords + 4 gammes, en cents purs depuis la tonique).
    Helper `cuedNoteIndices(patternId, tonicDeg, sysId, a4Ref)` snappe
    vers les degrés du système courant via `frequencyToNearestIn` —
    [0,4,7] en 12-TET, [0,10,18] en 31-EDO pour la même triade
    majeure. État éditeur (`visualCuePattern` + `visualCueTonic`)
    + 2 actions reducer dans `DESIGNER_UNDOABLE`. Persistance à plat
    dans localStorage. `SET_EDITOR_TEST_TUNING_SYSTEM` snap tonic à 0
    si > nouvelle `notesPerOctave`.
  - **4.4.2** UI barre "Repère + Tonique" dans WaveformEditor au-dessus
    du clavier (visible si `systemSupportsVisualCues(testTuningSystem)`).
    Sélecteur Tonique numéroté 1..N, n'apparaît que si pattern non-`none`.
    Prop `cuedNotes` propagée à tous les layouts (PianoLayout12,
    Grid24Layout, Grid5Layout, Grid31Layout). CSS `.is-cued` halo
    magenta box-shadow externe (#e832e2) ; combinaisons avec
    `is-active` et `is-playing` via comma-separated, fill HSL préservé.
  - ✅ **4.4.3** (2026-04-25) — Fix persistance cohérente état Designer.
    `editor.testTuningSystem`/`testNoteIndex`/`testOctave`/`testFrequency`
    désormais persistés en localStorage (4 nouvelles clés à plat dans
    le JSON). `loadPersistedState` enrichi d'un bloc de validation/clamp
    défensif : système inconnu → fallback 12-TET, indices hors borne →
    clamp `[0, notesPerOctave-1]`, pattern inconnu → 'none', champ
    absent → propagé pour fallback `DEFAULT_EDITOR` via `??` (préserve
    la migration F.4.4.2 → F.4.4.3). Avant 4.4.3 : reload perdait
    silencieusement le système courant tout en gardant le tonic des
    visual cues — cas pathologique d'indice hors borne possible.
- **Saveur B (active/compositionnelle)** reste en backlog : sélection
  par clic-multi sur le clavier pour mémoriser un accord/gamme custom,
  édition utilisateur du catalogue. À reconsidérer si le besoin émerge.
- ✅ **Phase 5** (2026-04-25) — Tier 3 historiques européens.
  Deux tempéraments 12 notes au registre :
  **`'meantone-quarter-comma'`** (Mésotonique 1/4 de comma centré
  sur C, chaîne E♭→G♯, tierces 5/4 pures à 386.314¢ exact, loup
  G♯↔E♭, cents Helmholtz/Ellis) et **`'werckmeister-iii'`** (1691,
  4 quintes tempérées C-G/G-D/D-A/B-F♯ par 1/4 de comma pythagoricien
  + 8 pures, tempérament Bach pour Wohltemperierte Klavier, cents
  Barbour 1951). Tables de cents inline ; ancrage A4 = a4Ref par
  `c4 = a4Ref × 2^(-CENTS[9]/1200)`. Insérés en 4e/5e position
  (entre `just-major-c` et `24-tet-equal`), regroupement des 12-notes.
  Aucun nouveau layout, aucun nouveau mapping — réutilisation
  `piano-12` + `TWELVE_KEY_MAP`. Visual cues activés
  (`VISUAL_CUE_SUPPORTED_SYSTEMS` étendu). Registre à 10 entrées.
  Vérifs : Mésotonique E/C = 1.250000 exact (5/4) ; les deux ancrent
  A4 = 440.000 exactement. Triptyque pédagogique européen complété :
  Pythagoricien (quintes pures, tierces fausses) → Mésotonique
  1/4-comma (tierces pures, wolf marqué) → Werckmeister III
  (compromis bien-tempéré, toutes tonalités utilisables) → 12-TET
  (uniforme, tempéré partout). Hors scope : Werckmeister IV/V/VI
  (moins documentés), Kirnberger I/II/III, Vallotti, Young
  (catalogue baroque non-exhaustif assumé), tempéraments
  non-européens (Tier 2 — gamelan, shrutis indiens — restent en
  backlog), tonique alternative pour mésotonique.
- ✅ **Phase 6** (2026-04-25) — Tier 2 gamelan : Slendro et Pelog
  d'après Surjodiningrat, Sudarjana & Susanto, "Tone Measurements
  of Outstanding Javanese Gamelans in Jogjakarta and Surakarta"
  (1972). Single commit (~80 lignes effectives, scope cohérent
  bloc gamelan).
  **`'slendro'`** : 5 notes, accordage Surakarta moyen, cents
  [0, 241, 481, 719, 958]. Réutilise layout `grid-5` et
  `FIVE_KEY_MAP` — aucun nouveau code UI, juste une entrée registre
  + table de cents + freq. Différence audible vs 5-TET (~3¢ sur II,
  ~0.2¢ sur V) — c'est précisément ce qu'on veut faire entendre.
  **`'pelog'`** : 7 notes, accordage Surakarta moyen, cents
  [0, 119, 258, 539, 678, 794, 1058]. Nouveau layout `grid-7`
  calqué strictement sur `grid-5` (7 cellules équidistantes,
  palette `HUE_PER_PELOG_DEGREE = [0, 51, 103, 154, 206, 257, 309]`
  à 360°/7 ≈ 51° de pas, lightness uniforme alignée sur grid-5,
  hauteur 90px / 56px compact). `PELOG_KEY_MAP` home row SDFGHJK,
  sous-ensemble strict de `TWELVE_KEY_MAP` — préserve la mémoire
  motrice. Cellules équidistantes alors que les pitchs Pelog ne le
  sont pas (deux grands trous ~281¢ et ~264¢) — convention partagée
  avec piano-12 et tous les autres layouts. Nomenclature romaine
  I..V / I..VII — pas d'import des noms javanais natifs (barang/
  gulu/dada/lima/nem ou ji/ro/lu/pat/mo/nem/pi), décision de scope
  pour limiter la friction terminologique en classe. Tonique
  deg 0 = a4Ref (cohérence 5-TET / 31-EDO ; pas d'A en gamelan).
  Visual cues **désactivés** (slendro/pelog absents de
  `VISUAL_CUE_SUPPORTED_SYSTEMS`) — les patterns du catalogue n'ont
  pas de sens en gamelan, la barre se masque automatiquement via
  `systemSupportsVisualCues()` (logique F.4.4). Pelog Bem / Pelog
  Barang non modélisés comme entrées séparées — le clavier expose
  les 7 notes, l'utilisateur choisit son sous-ensemble joué.
  Référence académique citée en commentaire dans `tuningSystems.js`
  pour traçabilité. Insérés en 10e/11e position du registre (entre
  `31-edo` et `free`). Vérifs (a4Ref=440) : Slendro I oct 4 = 440.000,
  V = 765.200, I oct 5 = 880.000 (octave juste). Pelog I = 440.000,
  II = 471.308 (~119¢), IV = 600.711 (~539¢), VII = 810.701, I oct 5
  = 880.000. Hors scope F.6 : Pelog Bem/Barang séparés, autres
  accordages (Yogyakarta, Sumarsam, Tenzer), noms javanais natifs,
  visual cues gamelan-spécifiques (Pathet), import custom de cents
  par l'utilisateur, 22-EDO et 53-EDO, refonte UI dropdown.
- ✅ **Phase 7** (2026-04-26) — Tier 2 shrutis indiens : Bhatkhande
  et Sarngadeva (deux frameworks théoriques, mêmes 22 cents). Path
  B ratifié en session de design — un seul "22 shrutis" générique
  aurait perdu la grammaire culturelle, c'est précisément l'objet
  de la phase. 2 sous-commits :
  - **7.1** Catalogue partagé (cents + freq helper) + Bhatkhande.
    `SHRUTI_CANONICAL_CENTS` (22 valeurs entières dérivées du
    5-limit just intonation, sources Te Nijenhuis 1974 / Rowell 1992
    / Bhatkhande 1909-1932) + `shrutiFreq(noteIndex, octave, a4Ref)`
    ancré sa = a4Ref. Bhatkhande (V.N. Bhatkhande, *Hindustani
    Sangeet Paddhati*, 1909-1932) : **distribution 1-4-4-4-1-4-4** —
    sa et pa piliers à 1 sub-shruti chacun, re/ga/ma/dha/ni
    reçoivent chacune 4 sub-shrutis. Nomenclature romaine avec
    sous-lettres `I, IIa..IId, …, V, VIa..VId, VIIa..VIId` (22
    noms terminés par lettre — pas de séparateur "." nécessaire
    pour `formatClipNote`, contrairement à 31-EDO). `BHATKHANDE_KEY_MAP`
    22 positions QWERTY : Z-row = 7 svaras à leur position la plus
    grave (ZXCVBNM = sa, IIa, IIIa, IVa, pa, VIa, VIIa) ; A-row /
    Q-row / Digit-row = sub-shrutis ascendantes des 5 clusters
    non-piliers (gaps physiques au-dessus de sa et pa). Nouveau
    layout `grid-22-bhatkhande` dans `PianoKeyboard.jsx` : grille
    4 rangées × 32 sub-cols, escalier 1 sub-col par rangée
    (extension du pattern grid-31 à 7 colonnes svara au lieu de
    8 colonnes 31-EDO), gaps visuels au-dessus des colonnes sa
    (col 1) et pa (col 5) — c'est la signature "piliers étroits"
    de Bhatkhande. Palette `HUE_PER_SHRUTI_SVARA = [0, 51, 103, 154,
    206, 257, 309]` (réutilise les 7 hues de grid-7 pour cohérence
    visuelle pelog/shrutis cross-system) × 4 lightness par rangée
    (75/60/45/30%, alignée sur grid-31). CSS `.grid22-key` /
    `.piano-keyboard-grid22` posé en 7.1 mutualisé avec 7.2 (les
    deux layouts partagent strictement la grille géométrique).
  - **7.2** Sarngadeva. Sarngadeva (*Sangita Ratnakara*, XIIIe s.) :
    **distribution 4-3-2-4-4-3-2** (Bharata classique préservé) —
    sa, ma, pa habitent 4 sub-shrutis chacun (zones étendues),
    ri et dha 3, ga et ni 2. Mêmes 22 cents canoniques que
    Bhatkhande (`shrutiFreq` partagé) ; différence purement
    organisationnelle. Nomenclature `Ia..Id, IIa..IIc, IIIa..IIIb,
    IVa..IVd, Va..Vd, VIa..VIc, VIIa..VIIb` — la sub-shruti la plus
    grave porte le nom de la svara (Ia=sa, IIa=ri, IIIa=ga, IVa=ma,
    Va=pa, VIa=dha, VIIa=ni). `SARNGADEVA_KEY_MAP` 22 positions
    QWERTY : Z-row = 7 svaras nommées sur les mêmes ZXCVBNM que
    Bhatkhande (préserve la mémoire motrice cross-framework) ;
    colonnes hautes pour sa/ma/pa (jusqu'au digit row), basses
    pour ga/ni (s'arrêtent à la rangée A). Nouveau composant
    `Grid22SarngadevaLayout` réutilise `.grid22-key` /
    `.piano-keyboard-grid22` posés en 7.1 — la grille géométrique
    est identique (32 sub-cols, 4 rangées, mêmes hues svara, même
    escalier), seules les cellules peuplées diffèrent. Grammaire
    visuelle "piliers larges" (sa/ma/pa montent jusqu'au digit row)
    contraste avec "piliers étroits" de Bhatkhande — c'est l'écart
    pédagogique central qu'on veut donner à voir. `LAYOUT_COMPONENTS`
    enrichi de `'grid-22-bhatkhande'` et `'grid-22-sarngadeva'`.
    Visual cues désactivés sur les deux entrées (patterns 5-limit
    harmoniques ne s'appliquent pas au contexte modal-mélodique
    indien — les ragas mériteraient un catalogue dédié, hors scope
    F.7). Insérés en 12e/13e position du registre (entre `pelog`
    et `free`). Vérifs (a4Ref=440) : sa oct 4 = 440.000 exact
    (Bhatkhande I = noteIndex 0 ; Sarngadeva Ia = noteIndex 0),
    re shuddha = 495.026 (Bhatkhande IId / Sarngadeva IIa = noteIndex
    4 ; ~9/8 à +0.09¢ d'écart vs ratio pur — conséquence du choix
    d'arrondir SHRUTI_CANONICAL_CENTS à l'entier, conforme à la
    pratique slendro/pelog), pa = 660.017 (3/2 à +0.06¢), ni
    shuddha (noteIndex 21) = 835.421, sa oct 5 = 880.000 (octave
    juste). Bascule Bhatkhande ↔ Sarngadeva : noteIndex et
    fréquence préservés, seuls les labels changent (ex. "IId.4" en
    Bhatkhande devient "IIa.4" en Sarngadeva pour la même 495 Hz).
    Hors scope F.7 : 22-EDO Erlich (système distinct des shrutis
    indiens authentiques, candidat xenharmonique séparé), Bharata
    reconstructed (Sambamoorthy — 3e framework potentiel mais
    reconstruction trop variable selon l'auteur), noms natifs
    sanskrits (sa/re/ga/ma/pa/dha/ni ou komal/shuddha re — feature
    "tooltips culturels" éventuelle, transverse), modes indiens
    (ragas/pathets) avec sous-ensembles surlignés (équivalent
    gamelan Pelog Bem/Barang — belle feature pédagogique future
    avec catalogue de ragas Bhairav, Yaman, etc.), 53-EDO et autres
    EDO Tier 2, refonte UI dropdown.
**22-EDO et 53-EDO** : couverts par le système X-EDO paramétrique (N=22
et N=53, livré en F.8.1-3). La contribution propre de Paul Erlich à
22-EDO (gammes décatoniques pajara) pourrait éventuellement émerger
comme un pattern de `visualCues.js` — pas comme une entrée registre
distincte. Décision prise à l'ouverture de l'itération H (2026-05-21).
- **Dette UI dropdown tempéraments** (13 entrées avec X-EDO) —
  devient urgente, prochaine phase F candidate après F.8. Pistes :
  optgroup HTML ("Égaux occidentaux", "Justes", "Historiques
  européens", "Maqâmât", "Gamelan", "Shrutis indiens",
  "Expérimental paramétrique", "Libre") ou modal catégorisé.
  Bénéfice pédagogique direct : la catégorisation explicite la
  structure du domaine.

- ✅ **Phase 8** (2026-04-27) — X-EDO paramétrique (1..53 cible).
  Une seule entrée registre paramétrée par un N choisi par
  l'utilisateur ; `'5-tet'` et `'31-edo'` redeviennent des cas
  particuliers. Sous-phases 8.1 (infrastructure backend), 8.2
  (composant + logique Shift) et 8.3 (UI XEdoInput + bannière de
  bascule 12/24) livrées le 2026-04-27. **Itération F clôturée.**
  - ✅ **Sous-phase 8.1** (2026-04-27) — Infrastructure backend.
    4 sous-commits :
    - **8.1.1** Entrée `'x-edo'` au registre. `freq(noteIndex,
      octave, a4Ref, xEdoN) = a4Ref·2^(noteIndex/xEdoN +
      (octave−4))` (généralisation de l'ancien 31-EDO). Champs
      `notesPerOctave` / `noteNames` / `keyboardMap` deviennent
      des **factories** prenant `xEdoN` ; helpers
      `getNotesPerOctave / getNoteNames / getKeyboardMap` cachent
      ce polymorphisme — les call-sites ne se contaminent pas
      avec un cas spécial 'x-edo'. `frequencyToNearestIn(hz, sysId,
      a4Ref, xEdoN)` accepte le 4ᵉ argument (ignoré sauf 'x-edo').
      Constantes `X_EDO_MIN = 1`, `X_EDO_MAX` (importé de
      xEdoLayouts), `DEFAULT_X_EDO_N = 31`. Layout `'grid-x-edo'`
      (composant GridXEdoLayout livré en F.8.2). Smoke tests inline
      (Node) : `freq(0,4,440,N) = 440` pour tout N (degré 0 = A4
      par convention) ; snap 660 Hz → x-edo(12) = noteIndex 7 oct 4
      (= G4 ≈ 659.26 Hz).
    - **8.1.2** Table de layouts QWERTY 1..43. Nouveau fichier
      `src/lib/xEdoLayouts.js` exporte `xEdoKeyboardMapForN(N)`
      qui génère le mapping `event.code → noteIndex` selon la spec
      `archi/layouts_x-edo.txt`. Algorithme : décalage +1 col par
      rangée (escalier physique du clavier), lecture
      serpentin-colonne ascendant (deg 0 = bas-gauche, on monte la
      colonne, puis colonne suivante en bas). Distribution des
      rangées validée case-par-case contre les schémas du fichier :
        N ∈ [1..8]   home seule (KeyS, KeyD, KeyF, KeyG, KeyH,
                     KeyJ, KeyK, KeyL)
        N ∈ [9..16]  home + alpha (ajout KeyE..KeyP)
        N ∈ [17..24] home + alpha + digit (ajout Digit4..Minus)
        N ∈ [25..43] bottom + home + alpha + digit (ajout
                     IntlBackslash..Slash, KeyA..Quote, KeyW..
                     BracketRight, Digit3..Equal)
      Conventions AZERTY-FR documentées : `!` = Slash, `^` =
      BracketLeft, `$` = BracketRight, `'` = Digit4, `m` =
      Semicolon, `ù` = Quote, `<` = IntlBackslash. Pour N=44..53
      (logique Shift hors scope F.8.1), `xEdoKeyboardMapForN`
      retourne `{}` — fail-safe : aucune touche ne déclenche en
      attendant F.8.2. **X_EDO_MAX bridé à 43** dans cette phase.
      **Interpellation archi** : l'exemple N=12 du prompt
      `[KeyS, KeyE, KeyD, KeyR, KeyF, KeyT, KeyG, KeyY, KeyH, KeyJ,
      KeyK, KeyL]` (12 entrées dont KeyK/KeyL) diverge du schéma
      N=12 du fichier (qui montre 6 cellules en bas + 6 en haut
      décalées, pas de KeyK ni KeyL). Implémentation suit le
      fichier (source de vérité déclarée), mapping résultant
      pour N=12 : `[KeyS, KeyD, KeyE, KeyF, KeyR, KeyG, KeyT,
      KeyH, KeyY, KeyJ, KeyU, KeyI]`.
    - **8.1.3** State global `xEdoN` + migration localStorage.
      Champ `state.xEdoN` (composer-undoable, persisté), validateur
      `sanitizeXEdoN` qui clamp à `[X_EDO_MIN, X_EDO_MAX]` sinon
      retombe sur `DEFAULT_X_EDO_N`. Action `SET_X_EDO_N` :
      met à jour xEdoN, snap chaque clip 'x-edo' vers la nouvelle
      grille (cohérence acoustique > conservation noteIndex),
      resnap aussi l'éditeur si `testTuningSystem === 'x-edo'`,
      borne `visualCueTonic` à la nouvelle grille. Migration à
      l'hydratation : pour chaque clip avec
      `tuningSystem === '5-tet'` ou `'31-edo'`, recalcule la
      fréquence selon l'ancien système (formule inline
      `legacyEqualFreq(noteIndex, octave, a4Ref, npo)`,
      indépendante du registre — fonctionnera après 8.1.4) puis
      snap vers la grille `xEdoN` cible (lue depuis localStorage,
      sinon défaut 31). `tuningSystem` ← 'x-edo'. Si plusieurs
      clips étaient dans des systèmes différents, ils convergent
      tous vers le même xEdoN (pas d'inférence par clip).
      Propagation de `xEdoN` aux call-sites :
      `clipFrequency(clip, a4Ref, xEdoN)`, `UPDATE_CLIPS_PITCH`,
      `SET_EDITOR_TEST_TUNING_SYSTEM`, `loadPersistedState` (clamp
      testNoteIndex via `getNotesPerOctave(sys, xEdoN)`),
      `usePlayback` (scheduler + WAV export, ref miroir
      `xEdoNRef` aligné sur le pattern `a4RefRef`),
      `PianoKeyboard` (prop `xEdoN`, `getNoteNames(sys, xEdoN)`),
      `WaveformEditor` (preview, lookup keyboardMap, cueTonicMax,
      affichage noteNames), `PropertiesPanel.NoteEditor`
      (`sys.freq` + `formatClipNote` + PianoKeyboard),
      `Timeline.formatClipNote(clip, xEdoN)`,
      `clipNote.formatClipNote(clip, xEdoN)`,
      `visualCues.cuedNoteIndices(..., xEdoN)`.
      `window.__store = { state, dispatch }` exposé en `import.meta
      .env.DEV` pour permettre les tests manuels via console
      (ex. `window.__store.dispatch({type:'SET_X_EDO_N',
      payload: 24})`) — UI input N à venir en F.8.3. Validation
      numérique (a4Ref=440) : 5-tet deg 2 oct 4 (580.583 Hz)
      snappe vers x-edo N=12 deg 5 oct 4 (587.330 Hz, +20¢) ;
      vers x-edo N=31 deg 12 (575.414 Hz, −15.48¢). 31-edo deg 12
      → x-edo N=31 = identité (delta 0¢, propriété attendue).
    - **8.1.4** Suppression de '5-tet' et '31-edo' du registre.
      Entrées et helpers obsolètes retirés
      (`FIVE_TET_NOTE_NAMES`, `FIVE_KEY_MAP`, `fiveTetFreq`,
      `THIRTYONE_EDO_NOTE_NAMES`, `THIRTYONE_KEY_MAP`,
      `thirtyOneEdoFreq`, `PELOG_KEY_MAP`). Slendro et Pelog
      gardent leur `tuningSystem` et leur table de cents propres
      (SLENDRO_SURAKARTA_CENTS, PELOG_SURAKARTA_CENTS) mais
      basculent sur `layout: 'grid-x-edo'` avec keyboardMap
      statique précalculé via `xEdoKeyboardMapForN(5)` / (7) —
      partage la grammaire serpentin-colonne avec X-EDO. Slendro
      et Pelog partagent désormais `ROMAN_NOTE_NAMES_7`
      (nomenclature romaine I..V / I..VII). Composants
      `Grid5Layout`, `Grid7Layout`, `Grid31Layout` retirés
      (~240 lignes JSX) ; entrées correspondantes purgées de
      `LAYOUT_COMPONENTS`. CSS associés également retirés
      (~233 lignes — règles `.grid5-key`, `.grid7-key`,
      `.grid31-key` et leurs combinaisons `is-cued`).
      `VISUAL_CUE_SUPPORTED_SYSTEMS` : `'31-edo'` → `'x-edo'`.
      **Régression inter-phase assumée** : Slendro / Pelog /
      X-EDO rendent `null` dans le dispatcher PianoKeyboard
      (composant GridXEdoLayout livré en F.8.2) — interaction
      au clic indisponible, lecture audio préservée. Registre
      passe de 14 à 13 entrées.
  - ✅ **Sous-phase 8.2** (2026-04-27) — Composant GridXEdoLayout +
    cellules splittées Shift. 2 sous-commits :
    - **8.2.1** Composant React `GridXEdoLayout.jsx` + palette
      dynamique. `xEdoLayouts.js` étendu : nouveau export
      `xEdoLayoutForN(N)` qui retourne `{ totalDegrees, useShift,
      numCols, numRows, cells: [{ col, visualRow, code, halves: [{
      degree, shift }] }] }`. Tables étendues à N=53 avec mode
      `SHIFT_ANCHOR` (offsets décalés d'+1, exclut IntlBackslash/
      KeyA/KeyW/KeyQ, pas de digit row), `SHIFT_BASE_CELLS` ordonnée
      progressivement pour que la "touche sans Shift" en N impair
      soit toujours la dernière (KeyL en 45, KeyP en 47, Period en
      49, Semicolon en 51, BracketLeft en 53). `xEdoKeyboardMapForN`
      consomme la nouvelle structure (rétro-compatible). Nouveau
      `xEdoShiftedKeyboardMapForN(N)` pour les degrés shifted.
      Composant `GridXEdoLayout.jsx` : générique, palette HSL
      dynamique (hue = (col-1)·360/numCols, lightness selon
      numRows : 1=[55%], 2=[62/42%], 3=[70/50/30%], 4=[75/60/45/30%]
      — héritage grid-31). Hauteur fixée inline selon numRows
      (90/120/140/160px ; compact 56/80/96/80px). Architecture
      `.gridx-cell` (container) > `.gridx-key` (1 ou 2 halves) — déjà
      prête pour Shift. États is-active/is-playing/is-cued portés
      par la half. CSS dans PianoKeyboard.css. PianoKeyboard.jsx
      ajoute `'grid-x-edo'` à LAYOUT_COMPONENTS et calcule
      `gridSize = getNotesPerOctave(sys, xEdoN)` — Slendro/Pelog
      (basculés en grid-x-edo en F.8.1.4) ont leur clavier visible
      avec gridSize=5/7, X-EDO l'utilise via state.xEdoN.
      Vérifs visuelles : N=5 → 5 cells en 1 rangée (grid-5
      historique répliqué), N=12 → 12 cells en 2 rangées avec
      escalier, N=31 → 31 cells en 4 rangées (grid-31 historique
      reconstitué), N=43 → 43 cells en 4 rangées × 13 cols max.
    - **8.2.2** Captation Shift pour layouts N≥44. WaveformEditor
      (Designer) et App.jsx (Composer placement contigu) :
      `e.shiftKey` route vers `xEdoShiftedKeyboardMapForN(xEdoN)`
      quand `testTuningSystem === 'x-edo' && xEdoN >= 44` ; sinon
      Shift reste guard pour les durées Composer (F.3.4). Pas de
      collision : les layouts SHIFT_ANCHOR n'utilisent pas la
      rangée digit, donc Shift+Digit (durées) reste libre. Au
      keyup, on relâche AUSSI BIEN la voix base que la voix
      shifted pour la touche, parce que l'état Shift peut différer
      entre keydown et keyup (utilisateur relâche Shift en premier
      ou en dernier). `bridge.release(idx)` est no-op pour un
      degré non-actif → safe. **Bug latent corrigé** : depuis
      F.8.1.3, App.jsx composer keydown accédait directement à
      `getTuningSystem(editor.testTuningSystem).keyboardMap` —
      pour 'x-edo' (factory), ça retournait la fonction au lieu
      d'un mapping. Remplacé par `getKeyboardMap(sys, xEdoN)`. CSS
      `.gridx-cell .gridx-key-shifted` reçoit un border-left 2px
      sombre comme séparateur visuel — la cellule garde sa couleur
      HSL unifiée (hue=col, lightness=row), seule la frontière
      interne marque la séparation entre les deux degrés.
  - ✅ **Sous-phase 8.3** (2026-04-27) — UI X-EDO complète. 3 sous-commits :
    - **8.3.1** `tuning-select` de la Toolbar passé de max-width 180px
      à 220px pour aérer les 13 entrées (avec X-EDO). Refonte
      complète (optgroup catégorisé) reste en backlog
      (B.dropdown-tuning).
    - **8.3.2** Composant `src/components/XEdoInput.jsx` — input
      numérique avec validation différée (parse au blur ou Enter,
      Échap restaure, ArrowUp/Down ±1 / ±5 avec Shift). Bornes
      [X_EDO_MIN, X_EDO_MAX] via clamp. Pattern identique à
      A4Input et BpmInput — candidat à extraction en
      `ValidatedIntegerInput` partagé maintenant qu'on a trois
      inputs identiques (refactor à part, hors scope F.8.3).
      Intégré quand `tuningSystem === 'x-edo'` dans 3 sites :
      Toolbar Composer (à côté de A4), Designer (sous le sélecteur
      de système), PropertiesPanel mono + multi (sous le
      TuningSystemSelect, tooltip rappelle que la valeur est
      globale et snappe TOUS les clips x-edo).
      `editorActions.setXEdoN` ajouté pour le Designer ;
      `setXEdoN` callback global pour Toolbar/PropertiesPanel.
    - **8.3.3** Bannière info au-dessus du clavier Designer quand
      `testTuningSystem === 'x-edo' && (xEdoN === 12 || xEdoN === 24)` :
      "Correspond à 12-TET / 24-TET équipartite. Utiliser le layout
      dédié." Style discret (rgba(0, 212, 255, 0.08), pas alarme),
      persistant (non dismissible). `App.handleConvertXEdoTo(targetSystem)`
      au clic : dispatch UPDATE_CLIPS_PITCH pour tous les clips
      x-edo (snap vers '12-TET' / '24-tet-equal' via reducer) +
      SET_EDITOR_TEST_TUNING_SYSTEM (éditeur). Deux entrées undo
      séparées — reflète la double nature de la bascule.
      Pas de bannière inverse (12-TET → x-edo) : décision design —
      la version mathématique invite à la version musicale, pas
      l'inverse.

  **Itération F (multi-tempérament) clôturée le 2026-04-27.**

### Itération G (Designer UX) — clôturée 2026-05-20

Refonte ciblée de l'UI du Designer suite à saturation visuelle du
quart bas-gauche (zone Paramètres trop chargée : 14 entrées dropdown,
clavier 22 cases, octave selector, boutons save, message slot).

- ✅ **Phase 1.1** (2026-05-20) — Sidebar Designer réorganisée.
  - Extraction du groupe `Nouveau / Mettre à jour / Enregistrer`
    + slot message du bas de la zone Paramètres vers un nouveau
    panneau **Actions** dans la sidebar gauche, intercalé entre
    PatchBank et MiniPlayer (séparateurs `border-top`, bord unifié
    autour des trois enfants).
  - Le children-API de `WaveformEditor` expose un 4ᵉ slot
    `renderActions({ collapsed })` — App.jsx place `renderActions()`
    entre la Bibliothèque et le MiniPlayer ; `handleNew /
    handleUpdate / handleSaveAsNew` + `saveMessage` restent
    encapsulés dans le composant. Mode `collapsed` (anticipation
    1.2) renvoie une volée d'icônes ＋ ✓ 💾 au lieu des libellés.
  - Renommages :
    - "Paramètres" → **"Instrument"** (we-area-title)
    - "Banque" → **"Bibliothèque"** (`PatchBank.jsx` ×2 +
      collapsed-label Composer dans `App.jsx`)
  - Cohérent Designer + Composer (les renames dans la Composer
    portent uniquement sur l'affichage "Bibliothèque" — pas de
    rename "Paramètres" côté Composer, le terme n'y existe pas).

- ✅ **Phase 1.2** (2026-05-20) — Sidebar Designer redimensionnable
  et réductible (calqué Composer).
  - Drag-resize via `SidebarResizer side="right"` ; toggle ◀/▶
    dans le `headerExtra` de PatchBank en mode ouvert, standalone
    en mode fermé.
  - État persisté : `designerSidebarWidth` (clamp min 200,
    défaut 220) et `designerSidebarCollapsed` (bool). Actions
    reducer `SET_DESIGNER_SIDEBAR_WIDTH` / `SET_DESIGNER_SIDEBAR_COLLAPSED`,
    constantes `DESIGNER_SIDEBAR_{MIN,DEFAULT,COLLAPSED}_WIDTH`
    (200 / 220 / 36).
  - Mode collapsed (36 px) : verticale d'icônes empilées —
    expand (▶), Bibliothèque (📚, ouvre un popover flottant),
    Actions icons (via `renderActions({collapsed:true})`),
    Play/Stop (▶/■). Couleurs Play/Stop empruntées au MiniPlayer
    (vert/rouge actif).
  - **Popover Bibliothèque** (mode collapsed) : panneau
    `position:absolute` ancré à droite de la sidebar
    (`left: calc(100% + 6px)`, width 320 px), fermé par clic en
    dehors (`document.mousedown` avec exception sur le trigger
    et le panneau), Escape, ou bouton ×. État `libraryPopoverOpen`
    local React (UI éphémère, pas dans le reducer). Charge un
    patch fait fermer le popover automatiquement.
  - App.css : suppression du `grid-template-columns: 200px 1fr`
    hard-codé dans `@media (max-width: 1100px)` — incompatible
    avec la CSS var `--designer-sidebar-width`. Le clamp min
    reste assuré par le reducer.

- ✅ **Phase 1.3** (2026-05-20) — Refonte zone Instrument.
  - Renommage "Système de test" → **"Système musical"**.
  - Sélecteur de système éclaté en **deux dropdowns** :
    - "Catégorie" (Actuel/Moderne, Historique, Théorique)
    - "Système musical" filtré dynamiquement par la catégorie
  - Ligne `instrument-system-row` en flex-wrap : sur sidebar
    large les deux dropdowns sont côte à côte, sinon empilés.
    Input X-EDO N reste inline dans la même ligne quand
    `'x-edo'` est sélectionné (label `X` compact).
  - Catégorisation des 13 systèmes (`TUNING_CATEGORIES` +
    `getCategoryOfSystem(systemId)` dans `tuningSystems.js`) :
    - **Moderne** : 12-TET
    - **Historique** : pythagoricien, juste-majeure, mésotonique
      1/4 comma, Werckmeister III, Le Caire 1932, slendro, pelog,
      shrutis Bhatkhande, shrutis Sarngadeva
    - **Théorique** : 24-TET équipartite, X-EDO, Libre
  - **Système Libre testable** (dette technique de longue date
    fermée) : `playFreeNote()` / `releaseFreeNote()` nouveaux,
    mêmes mécanismes que `playInstrumentNote` (ADSR, retrigger
    fade, périodique), mais lisant directement `testFrequency`
    au lieu de `sys.freq()`. Canal mono unique stocké dans
    `freeVoiceRef` (un seul Test à la fois suffit). Bouton **Test**
    inséré sous le slider Libre, raccourci clavier **`s`**
    (capté avant le lookup keyboardMap dans le handler, sinon
    KeyS=C en 12-TET interfère). `mouseDown/Up/Leave` gèrent
    le release même si la souris quitte le bouton.
  - **Backlog inscrit** : appliquer la même catégorisation aux
    dropdowns Composer (Toolbar + PropertiesPanel) — restent
    flat pour l'instant. Cohérent avec l'ancien backlog F
    "B.dropdown-tuning".

- ✅ **Phase 1.4** (2026-05-20) — `ResolutionGate` (gate de
  résolution au chargement).
  - Nouveau composant `src/components/ResolutionGate.jsx`,
    wrap `<App />` dans `main.jsx`.
  - Détection au mount (lecture une fois de
    `window.innerWidth/Height` via `useState(init)`), **pas
    réactif au resize** — décision délibérée pour ne pas
    interrompre une session en cours.
  - Trois branches :
    - `w < 924 || h < 668` → placeholder pleine page (titre,
      message, figure `<img src="/preview-1920x1080.png">`
      avec `onError` qui masque la figure si l'image n'est pas
      encore fournie). App non chargée.
    - `w < 1740 || h < 900` (mais ≥ minimum) → modale soft
      dismissible ("Compris, continuer"). App utilisable
      derrière. Dismiss session-only (pas persisté — re-shows
      au reload).
    - Sinon → passe-plat.
  - Constantes exportées : `MIN_USABLE_WIDTH=924`,
    `MIN_USABLE_HEIGHT=668`, `RECOMMENDED_WIDTH=1740`,
    `RECOMMENDED_HEIGHT=900` — réutilisables par la phase
    d'adaptation intermédiaire en backlog.
  - Image preview `public/preview-1920x1080.png` à fournir
    (screenshot fullsize). En attendant, `onError` cache
    silencieusement `<figure>`.

  **Itération G phase 1 (refonte ciblée) clôturée le 2026-05-20.**

- ✅ **Phase 2.1** (2026-05-20) — Icônes Lucide + polish sidebar
  réduite. Ajout dépendance `lucide-react` (validation utilisateur,
  tree-shakeable). Tous les glyphes émoji/Unicode du Designer +
  Composer remplacés par des icônes Lucide (chevrons sidebar,
  Library popover, Plus/Save/SaveAll Actions, Play/Square MiniPlayer,
  X popover close). Mode collapsed sidebar Designer restructuré en
  3 groupes verticaux (haut expand+Library / spacer flex:1 / Actions
  icons compacts + séparateur hr + Play/Stop tout en bas). Fix
  vertical : padding XEdoInput aligné sur .tuning-system-select
  (même hauteur dans instrument-system-row).

- ✅ **Phase 2.2** (2026-05-20) — Actions panel inline + Undo/Redo
  migration + prep Import/Export. Mode normal du panneau Actions
  refondu en barre horizontale d'icônes groupées (flex-wrap si
  étroit) : groupe **patch** (Plus / Save / SaveAll) — groupe
  **historique** (Undo2 / Redo2, migrés depuis le header Waveform —
  le header ne porte plus que le toggle Spectro) — groupe
  **bibliothèque** (Upload / Download, placeholders disabled pour
  itération future). Style `:disabled` ajouté à `.actions-icon-btn`.

- ✅ **Phase 2.3** (2026-05-20) — ShortLabelSelect + 4 contrôles
  unifiés + Moderne. Nouveau composant `ShortLabelSelect` (button
  trigger + ul listbox, fermeture clic-extérieur / Escape / sélection,
  tooltip = label complet). Pourquoi : un `<select>` natif ne peut
  pas afficher deux textes distincts dans le trigger vs les options.
  Tous les registres enrichis d'un champ `shortLabel` —
  `TUNING_CATEGORIES`, `TUNING_SYSTEMS`, `VISUAL_CUE_PATTERNS`.
  Zone Instrument refondue : Catégorie / Système musical / Repère /
  Tonique unifiés sur une seule ligne flex-wrap (largeur min 80 px
  par champ pour favoriser le 1-ligne sur sidebar large). X-EDO N
  inline. Suppression de l'ancien `.visual-cues-bar` (Repère + Tonique
  en ligne séparée). Rename "Actuel / Moderne" → **"Moderne"** —
  justification : 12-TET est seul dans la catégorie, aucun autre
  système courant à intégrer aujourd'hui (Bohlen-Pierce et autres
  xenharmoniques modernes restent classés Théorique).

- ✅ **Phase 2.4** (2026-05-20) — `patch.defaultTuningSystem` +
  propagation. Un patch capture désormais le `testTuningSystem` du
  Designer au moment du save (`buildPayload` + reducer SAVE_PATCH /
  UPDATE_PATCH). `App.handleAddClip` propage avec une priorité à
  3 cas : (1) touche maintenue (E.4.1) → editor.testTuningSystem ;
  (2) drop simple, patch.default ≠ editor.system → patch's default
  (note degré 0 oct 4 ou testFrequency si Libre) ; (3) drop simple,
  patch sans default ou même système → editor (rétro-compat patches
  < G.2.4). Placement contigu au clavier (E.4.2) reprend
  `anchor.tuningSystem` (et son keyboardMap pour résoudre e.code →
  idx). Touche non mappée dans le système du référent → no-op
  silencieux. Pas de migration localStorage nécessaire — l'absence
  de `defaultTuningSystem` est gérée par fallback.

- ✅ **Phase 2.5** (2026-05-20) — Layout vertical Instrument :
  Octaves au-dessus, clavier flex stretchy, Note en bas.
  - `we-octave-row` au-dessus du clavier avec libellé "Octaves"
    devant le `OctaveSelector`. Plus d'octaves planqués en fond de
    panneau.
  - `we-keyboard-area` (flex:1) absorbe l'espace vertical restant.
    Override `height: 100% !important` ciblé sur tous les layouts
    internes (piano-12, grid-24, grid-x-edo, grid-22-bhatkhande,
    grid-22-sarngadeva) — leur hauteur intrinsèque fixe (90 à 160 px,
    inline pour grid-x-edo) est annulée pour permettre l'étirement.
    Sur grand écran (≥ 1080p), le clavier remplit visuellement la
    zone, plus d'espace vide.
  - `we-note-row` (`margin-top: auto`) ancre "Note : 155.6 Hz —
    D♯3" + badge SUSTAIN tout en bas de l'encadré, peu importe la
    hauteur du clavier.
  - `we-params-fields` passe en `flex:1` + `control-group` aussi —
    chaîne flex propre du panneau au clavier.

- ✅ **Phase 2.6** (2026-05-20) — ResolutionGate réactif au resize.
  Listener `window.resize` ajouté en plus de la capture au mount,
  l'état du gate suit dynamiquement la taille de fenêtre. App reste
  **toujours montée** : transition vers le placeholder est purement
  visuelle via overlay `z-index:10000` — plus d'unmount/remount.
  Conséquences :
    - **localStorage jamais effacé** (manip temporaire de réduction
      de fenêtre = perte zéro).
    - **état mémoire React préservé** (drafts ADSR/slider en cours,
      dirty check, etc.).
  Wording revu :
    - "Taille de fenêtre actuelle" pour les dimensions détectées
      (au lieu de "votre écran" ambigu — l'écran physique peut
      différer).
    - Mention explicite des résolutions d'écran standard cibles
      `NOMINAL_MIN_*` (1024×768) et `NOMINAL_RECOMMENDED_*`
      (1920×1080), avec explication de la marge ~100/180 px réservée
      aux barres navigateur + OS qui donne les seuils `MIN_USABLE_*`
      (924×668) et `RECOMMENDED_*` (1740×900).

- ✅ **Phase 2.10** (2026-05-20) — Fix 16px persistant.
  La cause réelle du 16px entre dropdowns et octaves : un
  `margin-bottom: 8px` resté sur `.instrument-system-row` depuis
  G.2.3, qui s'ajoutait au `gap: 8px` du parent `.we-params-fields`
  unifié en G.2.8 → 8 + 8 = **16 px** visible. Vestige non nettoyé
  lors du passage au gap unifié. Suppression de la marge — le parent
  flex dicte tous les espacements verticaux comme prévu. Le
  `margin-top: auto` de G.2.9 reste utile comme défense quand un
  label wrappe sur sidebar étroite mais n'était pas la cause de
  l'écart constant observé.

- ✅ **Phase 2.9** (2026-05-20) — Fix gap octaves 16px + descenders
  tronqués (suite).
  - **Cause du 16px** entre octaves et dropdowns (alors que tout le
    reste est à 8px) : alignement intra-row. Quand un libellé wrappe
    à 2 lignes sur sidebar étroite (typ. "SYSTÈME MUSICAL", 16 chars),
    le champ devient plus haut, et les autres champs (libellés courts)
    étirent à la même hauteur via `align-items: stretch` — mais leurs
    triggers restent packés au haut (flex-column default) →
    espace vide en bas de ~8-14px sous les dropdowns courts. Plus le
    gap de 8px = 16-22px visibles.
  - **Fix** : `margin-top: auto` sur `.short-select` et
    `.xedo-input-designer` à l'intérieur de
    `.instrument-system-field`. Les triggers se collent au bas du
    champ, alignement horizontal garanti indépendamment des longueurs
    de label. L'écart effectif revient à 8px (le seul gap du parent
    flex).
  - **Descenders (q, j, g, y) encore tronqués** : `min-height: 32px`
    (au lieu de 30) + `line-height: 1.4` (au lieu de 1.2) sur
    `.short-select-trigger` ET `.xedo-input-designer` ET
    `.short-select-option` (menu). Donne ~18px de line-box pour
    ~12.8px de glyph + ascender + descender — confortable, aucune
    coupure visible.

- ✅ **Phase 2.8** (2026-05-20) — Polish round 2.
  - Troncature des descenders (j, g, p, y) sur dropdowns + XEdoInput :
    `min-height: 30px` + `line-height: 1.2` + padding restauré à 5px
    sur `.short-select-trigger` ET `.xedo-input-designer` (mêmes
    valeurs → hauteurs strictement identiques, plus de coupure).
  - Gap unifié **8 px** partout dans la zone Instrument
    (`we-params-fields`, `control-group`, `octave-selector` interne)
    — plus de marge ad-hoc, c'est le parent flex qui dicte tous les
    espacements.
  - **Navigation clavier `ShortLabelSelect`** (a11y) : ArrowUp/Down
    (cyclique), Home/End, Enter/Space (sélectionne et ferme),
    Escape (ferme et restaure focus trigger), Tab (ferme et laisse
    focus sortir). À l'état fermé, ArrowDown/Up/Enter/Space ouvrent.
    `aria-activedescendant` + ids stables (`useId`) sur les options ;
    auto-scroll de l'option highlightée. Surbrillance unifiée
    `.is-highlighted` pour hover et clavier (distincte de
    `.is-selected`).
  - **Actions icon buttons mode ouvert : 28 → 34 px** + icônes 15-16
    → 18-19. La règle scopée
    `.designer-sidebar.is-collapsed .actions-icon-btn` (G.2.7) garde
    le 30 en mode réduit — pas de régression.

- ✅ **Phase 2.7** (2026-05-20) — Polish suite aux retours utilisateur
  sur G.2.x. Purement visuel, aucun changement fonctionnel.
  - shortLabel `'Caire 32'` → **`'Maqâmât'`** (`32` ambigu — prêtait
    à croire à une subdivision EDO).
  - Mode réduit sidebar **complet** : ajout des 4 boutons manquants
    (Undo / Redo / Upload / Download) avec mini-séparateurs entre
    les 3 sous-groupes (patch / historique / import-export).
    Boutons unifiés à **30×30** (au lieu du mix 22 / 28 / 28) —
    scopé à `.designer-sidebar.is-collapsed` pour ne pas affecter
    Composer ni le mode ouvert.
  - Champ X-EDO aligné en hauteur sur les dropdowns : `box-sizing:
    border-box` + `min-height: 28px` + `line-height: 1` appliqués
    aux deux (input HTML et button SVG calculent leur hauteur
    différemment par défaut — forcer ces 3 props rend la mesure
    prévisible et identique).
  - Header `PatchBank` : `align-items: baseline` → `align-items:
    center`. Robuste à toutes les futures icônes (les SVG n'ont pas
    de baseline texte).
  - Popover Bibliothèque : **un seul titre** (`<header>` wrapper
    retiré, le bouton close passe via `PatchBank.headerExtra` à côté
    de "+ Dossier"). PatchBank reste agnostique de son contexte.
    Largeur **320 → 480 px**.
  - `.we-octave-row` : `margin-bottom: 8px` (espace avec le clavier),
    `line-height: 1` sur le label (centrage vertical robuste),
    `flex: 1` sur OctaveSelector + override des caps `min-width: 28` /
    `max-width: 40` des boutons globaux — les 11 boutons d'octave
    remplissent toute la largeur disponible.

  **Itération G phase 2 (raffinements UX) clôturée le 2026-05-20.**

### Itération H (Import/Export) — clôturée 2026-05-21

- ✅ **Phase 1** (2026-05-21) — Import/Export bibliothèque format `.osa`.
  16 sous-commits + 4 refactor/fix mineurs (1.1-1.14 + cleanup) couvrant :
  osaFormat (encode/decode/validate strict-strict), libraryTransfer
  (buildExportPayload + applyImport avec regen IDs), extraction
  folderNames vers lib partagé, action reducer IMPORT_LIBRARY undoable
  Designer, primitive Modal partagé, ExportModal (slugify + .osa suffix
  case-insensitive), ImportModal (radio mode + wrapper name + counts),
  menu contextuel PatchBank folder+patch (calqué Timeline), wiring App
  complet (handlers + state + render + props), Upload/Download buttons
  activés dans WaveformEditor Actions panel. Spec + plan dans
  `docs/superpowers/{specs,plans}/2026-05-21-import-export-bibliotheque-*.md`.

### Itération I (Spectrogramme avancé) — clôturée 2026-05-24

- ✅ **Phase 1** (2026-05-24) — Spectrogramme avancé. **Livraison
  principale** : 5 sous-commits (1.1-1.5) ; reducer (state +
  persistance), WaveformEditor (analyser tap + compteur voix), App
  (refs + handlers + props), Spectrogram refactor (static + dB toggle
  + controls), Spectrogram Live FFT (rAF loop + drawLive + auto-switch
  initial + peak hold). **10+ fixes/polish post-livraison** ont
  affiné le résultat : alignement style cases reducer, reset compteur
  dans stopAll, DRY spectrogramNode, PEAK_DECAY const + valuesBuffer
  cache + JSDoc, Ctrl+Z notes test (en 2 étapes : retire actions de
  DESIGNER_UNDOABLE puis deep-merge editor au restore), peak/live
  figé après grace period, sustain long via osc.onended, hash
  détection static par ref equality, graduations Y majors + minors
  (P3), **toggle Static/Live explicite remplaçant l'auto-switch
  (P4)**, drawLive sans analyser, cohérence ligne plate au floor,
  initial draw vide. Spec + plan archivés dans
  `docs/superpowers/{specs,plans}/2026-05-21-spectrogramme-avance-*.md`.
  Zoom X axis et Spectrogram Composer restent en backlog.

### Itération J (Anti-aliasing audio) — clôturée 2026-05-24

- ✅ **Phase 1** (2026-05-24) — Anti-aliasing des fréquences parasites.
  3 sous-commits (1.1-1.3) + 1 fix EPS self-test + 1 docs : FFT
  Cooley-Tukey + self-test dev, `pointsToHarmonics` via FFT avec
  truncation à 129 coefficients, cache memoization via WeakMap,
  CONTEXT.md update.
  Spec + plan dans `docs/superpowers/{specs,plans}/2026-05-24-anti-aliasing*.md`.
  Backlog résiduel : configurabilité de N par patch (pédagogique),
  investigation des 2 pics > 10 kHz en live + C0 + carré observés
  pré-fix (à vérifier post-livraison, suspect : artefact wavetable
  interne `createPeriodicWave`).

### Itération K (Bibliothèque multi-mode) — clôturée 2026-05-25

- ✅ **Phase 1** (2026-05-25) — Bibliothèque type file explorer.
  Sous-commits 1.1-1.12 couvrant : state UI prefs (modes, current
  folder, popup width), toolbar toggles + BibBreadcrumb + nav mode
  rendering, mode Details avec colonnes méta, mode Tiles avec
  PatchThumbnail SVG, multi-sélection (Ctrl/Shift), lasso rectangle,
  clipboard state + PASTE/MOVE actions + bibTransfer helper, ghost
  visual cut, drag-and-drop refactor multi-sélection, BibContextMenu
  extrait avec entrées enrichies, raccourcis clavier (Ctrl+C/X/V,
  F2, Suppr, ↑↓, Enter, Esc), PopupResizer pour le popup sidebar
  collapsed.
  Spec + plan dans `docs/superpowers/{specs,plans}/2026-05-25-bibliotheque-multi-mode*.md`.

### Itération K phase 2 (Bibliothèque dédiée + 3 sous-apps) — clôturée 2026-05-25

- ✅ **Phase 2** (2026-05-25) — Restructure en 3 sous-applications
  autonomes. Sous-commits 2.1-2.14 : reducer foundation (LIBRARY_UNDOABLE
  + skipUndo + migration actions), SAVE_PATCH avec folderId, PASTE
  cut→copy, DELETE_BIB_ITEMS batch + pendingDeleteWarning,
  OPEN_IN_LIBRARY + GO_TO_COMPOSER_WITH_CLIPS, PatchPicker composant,
  SavePatchDialog, DeleteUsageWarningDialog, WaveformEditor delegate
  popup, App.jsx 3 onglets + routing Ctrl+Z + popup mounts + library
  tab, PatchBank toolbar d'actions, right-click sync + retrait Ctrl+Z
  keydown, sidebars → PatchPicker, CONTEXT.md.
  Spec + plan dans `docs/superpowers/{specs,plans}/2026-05-25-bibliotheque-multi-mode-phase-2.md`.

### Itération K phase 2 follow-up fixes (2026-05-25 → 2026-05-26)

23 commits de fixes/improvements après la livraison de la phase 2,
issus de tests utilisateur successifs. Documenté en détail dans le
git log (`fix(iter-K/phase-2.fN)`). Liste compactée :

- **f1 skipUndo additive** — helper `patchLibrarySnapshotsAdditive`
  appliqué à `CREATE_FOLDER(skipUndo)` et `SAVE_PATCH` pour préserver
  les ajouts à travers tous les undos LIBRARY (anciens snapshots
  patchés rétroactivement).
- **f2 drag patch→timeline** (critical) — `effectAllowed = 'copyMove'`
  pour les patches matche le `dropEffect='copy'` du Timeline.
- **f3 layout/toolbar** — library full-screen, retrait dup "+ Dossier",
  patch count center, lasso lateral margins, Designer header
  export/import retirés, Library toolbar Import + Undo/Redo,
  PopupResizer overflow.
- **f4 lasso/clipboard/context** — Ctrl+V tree mode résout selon
  sélection, getOrderedItemList sort sync, lasso Ctrl/Shift mode 'add',
  Rename/Export disabled multi-select, Export fallback dossier courant,
  ".." double-click only, breadcrumb ligne dédiée, Details padding.
- **f5 SavePatchDialog auto-select** — folder créé via popup auto-
  sélectionné dans le picker.
- **f6 count vertical center + lasso cadre extérieur** — onMouseDown
  déplacé du body vers aside, `pointToContentSpace` clamp à 0+, count
  `inline-flex` + `min-height: 28px` sur header-main.
- **f7 padding asymétrique toolbars** — `padding: 0 8px` (sans bottom)
  pour aligner visuellement count avec icônes.
- **f8 polish biblio** — hide chevron nav, retirer crayon, user-select
  none, breadcrumb root hover, retirer carré couleur, Trash2 icon,
  tooltips counts.
- **f9 logic biblio** — Nouveau dossier popup inline + parent tree
  mode, F2 tile rename, toggle List highlight tree+tiles, persist
  `bibCollapsedFolders` + auto-expand nav→tree, drop sur patches.
- **f10 Designer sidebar** — persist state F5 + séparation visuelle
  Bibliothèque/Actions.
- **f11 Composer sidebar + LRU** — min-width 200 (aligné Designer),
  bouton picker en mode plié (popover comme Designer), nouveau
  composant `RecentPatchesList` avec miniature waveform.
- **f12 retest fixes** — right-click rename débloqué (guard menu dans
  handleBodyMouseDown), chevron span retiré, lasso text userSelect
  globalisé, counters folder (badge=direct patches, meta=descendants
  only), Clock icon pour Récents.
- **f13 sidebar Designer "Outils"** — header global + sous-titre
  "Actions".
- **f14 sidebar uniformity** — chevron au niveau header global,
  dup Actions retirée, PatchPicker header div vs h3 cohérent avec
  Actions.
- **f15 updir alignment + patch-picker-header sans border** —
  `.bib-updir` icon override retirée, header sans `border-bottom`.
- **f16 Designer shortcuts + ConfirmDialog** — Ctrl+S/+Alt+S/+Alt+N,
  composant `ConfirmDialog` réutilisable, remplacement de 6 `confirm()`
  natifs.
- **f17 Batch B Biblio** — pastilles alignment (wrapper 14px width),
  bouton "Vider la bibliothèque" avec ConfirmDialog danger, Ctrl+A +
  bouton "Sélectionner tout" + entrée menu contextuel.
- **f18 PatchPicker borders indentées** — `marginLeft` au lieu de
  `paddingLeft` (cohérent avec PatchBank).
- **f19 Composer édit clip dans Designer** (corrigé en f23 : mauvaise
  interprétation initiale, le menu contextuel clip et le double-click
  ont été retirés ; uniquement "Retirer le clip" reste).
- **f20 mode Détail enrichi** — `[pastille] [nom] [thumbnail] [tuning]
  [updatedAt] [usage count] [poubelle]`. Nouveau field `patch.updatedAt`
  (timestamp set sur SAVE_PATCH, UPDATE_PATCH, RENAME_PATCH).
- **f21 ajustements** — date format DD/MM/YYYY HH:MM:SS, modal labels
  "Annuler" / "Abandonner et ouvrir", widths icon/dot wrappers unifiés
  à 14px.
- **f22 vrai Composer édit patch** — sur PatchPicker (sidebar Composer)
  : double-click load avec garde unsaved-changes, entrée menu
  contextuel "Éditer dans Designer" (conditionnel Composer + patch).
- **f23 clip menu cleanup** — retrait onDoubleClick et "Éditer le
  patch" du menu contextuel clip (patch ≠ clip, séparation propre).
  Menu clip = uniquement "Retirer le clip".

### Itération K phase 3 (Thème clair/sombre) — clôturée 2026-05-26

- ✅ **Phase 3** (2026-05-26) — Mode clair sélectionnable, en plus du
  thème sombre historique. Bouton soleil/lune (Lucide `Sun`/`Moon`,
  rempli) dans la barre `Tabs` à droite, visible sur les 3 onglets.
  `state.theme` (`'dark' | 'light'`, défaut `dark`) persisté dans
  localStorage via la même clé `synth-app-state`. `App.jsx` propage
  vers `<html data-theme=…>` et émet un `CustomEvent('themechange')`.
  Refonte de `src/index.css` en palette sémantique double-thème
  (`--surface-bg`, `--text-default`, `--accent`, `--canvas-bg`, etc.) —
  cyan `#00d4ff` → `#0095c0` en light pour contraste AAA. Migration
  des ~22 CSS de composants vers les variables (sed batch sur ~25
  couleurs structurelles). Pour les canvas (`Timeline`, `Spectrogram`,
  `WaveformEditor`), nouveau helper `src/lib/themeColor.js` qui lit
  `getComputedStyle(:root).getPropertyValue('--xxx')` en runtime ;
  listeners `themechange` dans Spectrogram + WaveformEditor pour
  forcer un redraw (Timeline tourne déjà en RAF continu). Couleurs
  identitaires hardcodées : touches piano blanches/noires (convention
  culturelle), tuple `--playhead-rgb` exposé pour composer `rgba()`
  à intensité variable. Couleurs sémantiques ad hoc (jaune warning
  `#ffc600`, violet biblio `#c084fc`, magenta cued `#e832e2`) laissées
  inchangées : palette light choisie pour rester lisible avec elles.

### Itération L (Documentation) — cadrée 2026-05-26, clôturée 2026-05-28 (v1.4.0)

Production de la documentation utilisateur (manuel, vulgarisation,
référence, parcours d'orientation) **sans modifier l'app principale**.
Trois entrypoints additifs : un onglet Documentation, deux boutons
d'aide contextuelle dans le header (Raccourcis ✓ livré L.1, Tour ✓ livré
L.4). Détails dans `archi/BACKLOG.md` section "Iteration L".

- ✅ **L.0** (2026-05-27) — Audit raccourcis. Rapport
  `archi/L0-audit-raccourcis.md` listant les 28 raccourcis d'action,
  ancrage (bouton/objet/dégénéré), orphelins à arbitrer.

- ✅ **L.1** (2026-05-27) — Fondation overlay. Table `src/lib/shortcuts.js`
  (source unique), refacto handlers (App/WaveformEditor/PatchBank),
  convention `data-anchor` sur les éléments d'UI, utilitaire
  `getAnchoredPosition`, composant `ShortcutsOverlay`, bouton header
  Keyboard + raccourci Ctrl+K. Corrections UI dérivées de l'audit
  (pastille Sustain permanente cliquable, bouton Coller Composer avec
  fallback piste sélectionnée, chip clipboard Bibliothèque, halo
  anchor clip Composer, tooltips CP1/CP2). Nouveau concept
  `composer.selectedTrackId` (persisté). Cf. historique pour le
  détail des sous-commits 1.1 → 1.6.

- ✅ **L.2** (2026-05-27) — 4e onglet Documentation. Cinq sous-commits :
  (2.1) onglet + state `doc.*` + persistance localStorage (sidebar) +
  sessionStorage (lecture) ; (2.2) renderer Markdown maison
  (~200 lignes, zéro dépendance) ; (2.3) layout TOC + zone contenu
  avec scroll restore par article ; (2.4) page Raccourcis générée
  depuis `SHORTCUTS` ; (2.5) stubs articles "À propos" / "Pourquoi
  12 notes ?" (rédaction confiée à l'agent writer/) + fichier de
  validation `_renderer-test.md`. Cf. historique pour le détail.

- ✅ **L.3** (2026-05-28) — Navigation interne de la doc active.
  Quatre sous-commits : (3.1) utilitaire `highlightElement` + halo CSS
  (retry RAF borné, 2e consommateur de `getAnchoredPosition`) ; (3.2)
  `<DocLink>` actif (bascule d'onglet + halo) via `MarkdownNavContext`
  + handler `handleDocLink` (App.jsx) ; (3.3) liens doc→doc (scheme
  `doc:`, `onDocNav` borné à `DOC_TOC`) ; (3.4) enrichissement
  `_renderer-test.md` (cas valides + cassés) + doc. Cf. historique pour
  le détail.

- ✅ **L.4** (2026-05-28) — **Tour guidé. V1 de l'Itération L atteinte.**
  Bouton `Compass` header + Ctrl/Cmd+J démarrent la visite de l'onglet
  actif. Six sous-commits : (4.1) state `tour` volatile + actions
  START/GOTO/NEXT/PREV/CHAIN/END/END_NO_RESTORE + tours déclaratifs
  `src/lib/tours/*.js` + nouvelles `data-anchor` ; (4.2) `Tour.jsx`
  spotlight (blocker + box-shadow) + bulle ancrée, RAF borné, skip
  gracieux ; (4.3) progress bar header-overlay + croix + ESC/gel clavier ;
  (4.4) bouton `Compass` + Ctrl+J + snapshot/restore réel ; (4.5) chaînage
  fin de tour + « En savoir plus » ; (4.6) doc. **Les bulles sont un 1er
  jet dev — passe rédactionnelle en attente (`archi/L4-redaction-prompt.md`).**

- ✅ **L.R** (2026-05-28) — **Math renderer maison** (renommée de « L.4.5 »
  le 2026-05-28 pour éviter la collision avec le sous-commit `phase-4.5` du
  Tour). Extension du renderer Markdown : `$…$` inline / `$$…$$` block,
  exposants `^{x}`, indices `_{x}`, fractions `\frac{a}{b}`, italique auto
  sur lettres latines isolées dans les délimiteurs, ~12 symboles Unicode.
  Pas de KaTeX, syntaxe LaTeX-like (réversibilité), périmètre borné (pas de
  matrices/intégrales/racines). Sous-commits R.1 parsing
  `src/lib/mathParse.js` + `markdown.js` ; R.2 rendu sup/sub/frac + CSS ;
  R.3 `_renderer-test.md` + doc ; **R.4 délimiteurs extensibles `( )` `[ ]`**
  (décision archi, révise « pas de `\left\right` »). Zéro npm ajouté. Posé
  entre L.4 et L.5.

- ✅ **L.5** (2026-05-28) — **Rédaction des contenus + clôture release.**
  Corpus complet rédigé par l'agent writer : 2 glossaires (technique, musical),
  4 articles de vulgarisation « Comprendre » (forme d'onde, piano pas juste,
  12 notes, tempérament), **12 fiches tempéraments** (une par système du
  registre), 3 guides de prise en main (Designer, Bibliothèque, Composer),
  article « Limites connues » (périmètre V1 assumé : résolution 600 pts /
  128 harmoniques, aliasing résiduel, mono, pas de MIDI, 16 pistes,
  localStorage). TOC à 6 sections (Le projet / Prise en main / Comprendre /
  Concepts / Tempéraments / Référence). **Clôture** : rebranchement des
  DocLink (guides + glossaire→fiches), retrait du fichier de test
  `_renderer-test.md`, ancres `data-anchor` manquantes posées côté code
  (export WAV / + Piste / amplitude Designer / nouveau dossier Bibliothèque ;
  `composer-duration-buttons` était déjà appliquée depuis L.1.3). Bump
  `package.json` 1.3.0 → 1.4.0 + sync `about.md`. **Release v1.4.0.**

- ⏳ **L.6** *(option, hors 1.4.0)* — Démos écoutables.

- ⏳ **L.7** *(option, hors 1.4.0)* — Exercices guidés.

**Itération L clôturée le 2026-05-28 (release v1.4.0).** V1 atteinte à la
sortie de L.4 ; L.R (math renderer) et L.5 (corpus + rebranchement + ancres)
l'ont enrichie sans toucher à l'architecture du tour. L.6 (démos écoutables)
et L.7 (exercices guidés) restent des options de backlog, hors périmètre 1.4.0.

### Itération M (Waveform Designer + Patch typé) — M.3 livré 2026-05-30 (M.2-AS en essai)

- ✅ **Préalable A — Migration TypeScript (phases 0+1)** (2026-05-29) :
  adoption TS incrémentale, fichier par fichier, sans casse. Posée avant la
  perf et avant M.2 (Patch typé). Cf. section Historique pour le détail.
  - **Phase 0** : setup — devDep `typescript`, `tsconfig.json` (allowJs,
    checkJs:false, strict:false, noEmit), CLAUDE.md racine (contrainte TS levée).
  - **Phase 1** : `src/types.ts` (modèle actuel + union `Action`),
    `tuningSystems.js → .ts`, câblage JSDoc du reducer.
- ✅ **Préalable B — Francisation des libellés** (2026-05-29) : graine i18n
  (`src/lib/strings.js`), libellés UI normalisés en FR. SC1 audit + infra
  (refactor neutre), SC2 traductions claires. Cas « à arbitrer » tranchés et
  appliqués le 2026-05-29 (cf. `archi/M0-audit-francisation.md`).
- ✅ **M.1 — Bump cap 256 + slider Définition** (2026-05-30) : première phase
  audio, détachée et en tête (dé-risque l'UX « dessine sale → glisse → propre »).
  SC1 cap harmoniques 128→256 (FFT 512 pts). SC2 champ `Patch.definition`
  (1..256) + slider « Définition » (troncature M/256 en aval, spectro statique
  inclus ; rétro-compat localStorage/`.osa` → 256). Reste mono-mode. Cf.
  Historique pour le détail. Spec : `docs/superpowers/specs/2026-05-29-waveform-designer-design.md`.
- ✅ **M.2 — Layout 3-vues + Patch typé + éditeur Harmoniques + passerelle**
  (2026-05-30). 5 sous-commits :
  - **2.1** Patch typé : union discriminée `DrawPatch | HarmonicPatch` (`mode`).
    `audio.harmonicsToPoints` (iDFT) reconstruit `points` → audio mono-chemin
    (zéro modif playback/export/miniatures). Hydratation rétro-compat,
    SAVE/UPDATE/HYDRATE/RESET mode-aware, round-trip `.osa`.
  - **2.2** Layout 3 colonnes (`DesignerColumns`) : presets + drag des
    séparateurs, `designerColumnWidths` persisté (défaut par mode). Spectro =
    colonne permanente (toggle retiré).
  - **2.3** Éditeur Harmoniques (N barres + bouton N) ; draw read-only = DFT
    tronquée à `definition`.
  - **2.4** Vue éditable suit le mode (verrouillage 🔒) ; Définition masquée en
    harmonic.
  - **2.5** Passerelle de conversion draw ↔ harmonic (dialogs, undoable atomique).
  - Spec : `docs/superpowers/specs/2026-05-29-waveform-designer-design.md` §4,5,7.1.
- 🧪 **M.2-AS** — Toggle auto-sizing (3 états contextuels, focus-click sans
  édition), branché sur le même `designerColumnWidths`. **Livré 2026-05-30, en
  essai** — keep/drop avant clôture M (critère : accélère sans distraire vs
  whiplash de reflow / gêne d'éditer un spectro rétréci). 3 sous-commits (AS.1
  toggle+état, AS.2 focus contextuel, AS.3 anti-conflit). Cf. spec §7.2 et
  Historique. **Retrait = supprimer toggle + `useEffect` focus + champ persisté.**
- ✅ **M.3** — Mode `spline` (2026-05-30). Éditeur points/courbe (soft
  Catmull-Rom périodique / hard polyligne, pattern poignées ADSR). 3 sous-commits :
  3.1 `SplinePatch` + `src/lib/spline.js` + actions reducer ; 3.2 `SplineEditor`
  + couplage mode (Harmoniques read-only DFT pleine) ; 3.3 passerelle étendue
  (`ConvertToSplineDialog`, aller-retour avec draw/harmonic, round-trip `.osa`).
  Spec : `docs/superpowers/specs/2026-05-29-waveform-designer-design.md` §4,5,10.
- ✅ **M.4** — Presets de timbre (2026-05-31). Bibliothèque code-only de 12
  presets harmoniques (`src/lib/presets.js`), action `LOAD_PRESET` (undoable,
  remplace le draft sans passerelle), `PresetPicker` (modal groupé par
  catégorie) + garde-fou dirty. Préalable 4.0 : `HARMONIC_N_MIN` 16→4.
- ✅ **M.5a** — Extension renderer `\sum` (2026-05-31). Opérateur à bornes
  `_{…}`/`^{…}` (n'importe quel ordre), rendu sub/sup inline / empilé display
  (grille CSS), `displayMode` propagé jusqu'à `renderMath`. 2 sous-commits.
  `\prod`/`\int`/matrices restent hors scope.
- ✅ **M.r.1 — Rattrapage : modèle canonique unifié** (2026-06-01). Pivot vers
  une courbe `canonical` unique + trois lentilles, `cap` unifié, résidu spline,
  migration v1→v2 (localStorage + `.osa`), hygiène canvas. Plus de conversion
  destructive ni de 🔒. 5 sous-commits (r.1.1 types/constantes, r.1.2 actions,
  r.1.3 migration, r.1.4 audio/composants/dialogs, r.1.5 canvas). Build/
  typecheck/lint verts. Spec :
  `docs/superpowers/specs/2026-06-01-waveform-rattrapage-design.md`.
- ✅ **M.r.2 — Réorganisation UI** (2026-06-01) : barre du haut unique
  `DesignerToolbar` (nom + Presets + Reset + Normaliser + séparateur +
  proportions/Auto) ; contrôle `cap` unique (slider+readout) dans le header
  Harmoniques (fin du double contrôle de M.r.1) ; switch Libre/Ancres pour les
  deux modes d'édition de la Forme d'onde (plus aucun « Convertir vers… ») ;
  barres toujours éditables ; Reset (timbre seul) + Normaliser (iDFT phase
  canonique) fonctionnels ; `SET_EDITOR_ANCHOR_COUNT` (re-fit). 4 sous-commits
  (r.2.1 barre, r.2.2 Presets/Reset, r.2.3 Normaliser, r.2.4 cap/switch/ancres).
  Build/typecheck/lint verts.
- ✅ **M.r.2.5 — Finitions UX** (2026-06-01) : Reset / Nouveau patch → **silence**
  (canonical à zéro ; la sin fondamentale de r.2.2 annulée, pas de timbre
  imposé) ; fix redraw canvas Forme d'onde au switch Ancres→Libre (re-key des
  effets sur `currentLens`) ; contrôles Doux/Anguleux + Nombre d'ancres toujours
  visibles, désactivés en mode Libre ; input number pour le nombre d'ancres.
  1 fix archi + 3 sous-commits dev. Build/typecheck/lint verts.
- ✅ **M.r.2.6 — Finitions UX (Reset resserré + iconographie Lucide)**
  (2026-06-01) : portée du Reset resserrée (canonical + ancres + interpolation +
  résidu réinitialisés, **`cap` ET nombre d'ancres préservés** ; Ctrl+Alt+N =
  remise à zéro totale) ; iconographie Lucide généralisée (barre du haut
  Eraser/FolderOpenDot/Sigma, toggle unique Spline + tooltips sans « lentille »,
  switch segmenté Doux/Anguleux en SVG custom, indicateur AlignEndHorizontal,
  Spectrogramme Direct→Radio / Crête→SVG mini-barres+crêtes, presets de
  proportions en SVG), classe partagée `.icon-btn`, inputs alignés sur la hauteur
  des boutons. **Normaliser** (Σ) déplacé de la barre du haut vers le header de
  la zone Forme d'onde (r.2.6.8, visible dans les deux modes). **Convention
  projet : plus jamais d'Unicode comme icône.** 8 sous-commits dev (r.2.6.1→.8)
  + docs. Build/lint verts.
- ✅ **M.r.3 — Lentilles vivantes** (2026-06-01) : re-fit auto des ancres sur la
  canonical après chaque modification par voie non-spline (helper
  `refitAnchorsAndResidual`, count préservé), câblé dans **5 actions**
  (`SET_EDITOR_CANONICAL`, `SET_EDITOR_HARMONIC_AMPLITUDE`,
  `NORMALIZE_EDITOR_CANONICAL`, `LOAD_PRESET`, `APPLY_EDITOR_PRESET` — 5ᵉ par
  décision archi) ; fin de la désync ancres/canonical (plus d'ancres à `y=0`
  après tracé libre / preset). Cleanup : `'bars'` retiré du type `WaveformLens`
  (vestigial depuis r.2.4). 2 sous-commits (r.3.1 re-fit, r.3.2 cleanup) + docs.
  Test de non-régression manuel (10 scénarios) passé. Build/typecheck/lint verts.
- ✅ **M.r.4 — Normalisation explicite** (2026-06-02) : flag d'état
  `editor.canonicalNormalized` (déterministe — la détection numérique initiale a
  été abandonnée, round-trip FFT 600↔512 non idempotent, mesuré par le dev)
  pilotant 3 chemins : bouton Normaliser désactivé quand normalisé, courbe grise
  d'aperçu « phase canonique » en background (modes Libre + Ancres) + légende,
  dialog edit-bars (intercepte l'édition d'une barre non-normalisée → normalise +
  applique en un geste). Dompte la régression de phase. 3 sous-commits (r.4.1
  flag+bouton+commentaire audio.js, r.4.2 courbe+légende, r.4.3 dialog) + docs.
  Test manuel (9 scénarios) passé. Build/typecheck/lint verts.
- ✅ **M.r.5 — Convention d'amplitude + cosmétique zone Harmoniques** (2026-06-02) :
  zone Forme d'onde — **axe Y auto-fit** `[-peak, +peak]` (min 1), **marqueur ±1**
  pointillé d'accent (étiquettes 1/-1 sur canvas), **transition douce** du zoom
  (lerp rAF 0.15), tracé libre non clampé ; zone Harmoniques — **code couleur
  barres** (bleu normalisé / gris non normalisé), **repères horizontaux** 0/0.5/1,
  **axes labellisés** (X `kf` puissances de 2 si cap ≥ 8 / Y 0/0.5/1). Reducer
  intact (pure cosmétique de rendu). 2 sous-commits (r.5.1 Forme d'onde, r.5.2
  Harmoniques) + docs. Build/lint verts.
- ✅ **M.r.5.bis — Finitions UX (auto-fit Y en spline + spline parfaite permanente
  + clic droit barres)** (2026-06-02) : (1) `SplineEditor` adopte la même échelle
  auto-fit + marqueur ±1 que `WaveformEditor` (primitive partagée
  `drawAmplitudeMarker`, lazy-init `peakDisplayedRef` → pas de saut au switch) ;
  (2) **spline parfaite** (3ᵉ courbe orange, squelette des ancres) en background
  permanent dans les deux lentilles, cachée si résidu ≤ 0.01, légende à 3 entrées
  conditionnelles ; (3) **clic droit sur barre = mise à zéro** (garde edit-bars
  conservée si non normalisé). 3 sous-commits (bis.1 / bis.2 / bis.3) + docs.
  Build/lint verts. **→ Le code du rattrapage M.r.* est définitivement clos.**
- ⏳ **M.5b** — Passe doc « cœur de la synthèse » (pose la DFT avec le `\sum`),
  **après** le rattrapage (sur modèle stable). **Seul reliquat du rattrapage** :
  passe d'écriture (rôle writer), à confier hors implémenteur.

### Backlog général (à caser quand pertinent)

- **(iter-M) Sweep horizontal multi-barres** dans l'éditeur Harmoniques :
  peindre plusieurs barres en un drag (actuellement 1 barre/geste). Nice-to-have
  noté dans le prompt M.2 (nécessiterait une action « set amplitudes en bloc »
  pour rester atomique côté undo).
- **(iter-M) Color-coding des 3 vues** (Forme d'onde vert / Harmoniques bleu /
  Spectro ambre, cf. spec §7) : aujourd'hui l'accent cyan est partagé (barres
  éditables en accent, dérivées grisées). Polish visuel différé.
- **(iter-M) Nettoyage `spectrogramVisible`** : vestigial depuis M.2 (spectro =
  colonne permanente). Clé localStorage conservée (consigne « ne pas toucher aux
  clés ») ; retrait complet (état + action + reducer) à faire si jamais.
- **(iter-M) Mismatch de grille FFT 600 ↔ 512** : `pointsToHarmonics` resample
  la canonical (600 pts) vers 512 par **interpolation linéaire** avant la FFT, ce
  qui réinjecte du leakage spectral (~15 %/passe sur un créneau à `cap=256`,
  mesuré en M.r.4). Conséquence : le round-trip
  `harmonicsToPoints → pointsToHarmonics` n'est **pas** idempotent à haut `cap` —
  d'où l'abandon de la détection numérique de normalisation au profit d'un flag
  d'état (M.r.4). Correctif propre : resample band-limité (sinc/poly-phase) ou
  travailler nativement sur une grille puissance-de-2. Hors scope tant que l'audio
  reste acceptable ; deviendra prioritaire si un futur besoin exige un round-trip
  exact (ex. édition de barres sans « saut » résiduel).

- **Adaptation UI résolutions intermédiaires [924×668..1740×900]**
  (G.1.4 ouvre la voie) : layout repensé pour viewports plus
  étroits — dropdowns compactés, clavier scrollable horizontal,
  sidebars repliables au seuil viewport, étirement intelligent
  des zones Designer/Composer. Les mêmes mécanismes (resize,
  collapse, popovers) pourront aussi enrichir les résolutions
  supérieures (mode "expanded canvas" en plein écran, etc.).
  Cohérence avec les constantes `MIN_USABLE_*` / `RECOMMENDED_*`
  de `ResolutionGate.jsx`.
- Catégorisation optgroup ou cat+système split pour les dropdowns
  Composer (Toolbar + PropertiesPanel) — alignement sur G.1.3
  côté Designer. Hérité de l'ancien backlog F "B.dropdown-tuning".

- Spectrogramme — zoom X axis (frequency range) — gardé en backlog
  depuis iter I phase 1, l'échelle log actuelle étale déjà
  suffisamment.
- Spectrogramme Composer (visualiser la lecture timeline via le
  AnalyserNode existant dans usePlayback) — gardé en backlog depuis
  iter I phase 1.
- Bouton "Vider la banque" (avec undo)
- Améliorations contrastes (passe 2)
- Section stats (nb mesures, nb clips, durée totale)
- Migration timeline DOM → Canvas (perf à grand nombre de clips)
- Annulation drag par Échap (selon ressenti)
- Optimisation stockage localStorage (résolution points, quantification,
  ou IndexedDB)
- Fréquence libre : flèches haut/bas dans FreqInput pour incréments fins
- Flèches haut/bas dans NumberInput (sliders ADSR : Amp, A, D, S, R) pour
  incréments fins, sur le modèle de A4Input/BpmInput
- N configurable par patch (de 2^0 à 2^9) — pédagogique : l'utilisateur
  pourrait voir/entendre l'effet du nombre d'harmoniques sur le timbre.
  Demande UI dédiée (slider + persistance + decision preset). Reporté
  comme projet séparé depuis l'iter J.
- Synthèse audio pro-grade via `AudioWorkletNode` — l'iter-J a éliminé
  les parasites à basse fréquence via DFT truncation, mais Web Audio
  `createPeriodicWave` montre toujours des limites à hautes fréquences :
  rolloff Nyquist progressif au lieu de cut net, scalloping FFT,
  amplitudes non-monotones à cause de l'aliasing résiduel et de
  l'interpolation wavetable, peaks décroissants à ≥ 13 kHz. Pour
  audio pro-grade ce serait un refactor majeur : synthèse custom
  sample-par-sample dans un AudioWorklet, avec anti-aliasing
  oversampled. Reste en backlog — l'usage actuel est acceptable
  pédagogiquement avec ces limites documentées (cf. décision archi
  "Limites Web Audio à haute fréquence — acceptées").
- D10 (18794 Hz, sous Nyquist) qui n'affiche rien en live malgré
  un signal audio actif — observation post iter-J, à creuser
  séparément si le sujet revient.
- Refonte système notes/durées : boutons au lieu de dropdowns pour
  note/octave, durées manquantes dans le sélecteur (blanche pointée,
  ronde pointée, double-pointées)
- Pause/reprise de lecture + curseur de lecture déplaçable par clic
  sur la timeline
- Bug intermittent : Ctrl+D déclenche parfois le bookmark navigateur
  malgré preventDefault (mode opératoire à reproduire)
- DynamicsCompressorNode sur master bus (protection clipping quand
  plusieurs pistes jouent simultanément, identifié en C.2)
- Loop : marqueurs de boucle, activation, affichage (rendu possible
  par le scheduler look-ahead de C.3)
