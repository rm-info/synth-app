# CONTEXT-ARCHIVE.md — Synth App (trace historique)

> **Archive append-only.** Itérations terminées, historique chronologique,
> détail des roadmaps closes, et l'ancienne saga narrative du TL;DR.
> Le **brief vivant** (état présent, modèle, composants, décisions en vigueur,
> contraintes, roadmap active) est dans `CONTEXT.md` — c'est lui qu'on lit en
> début de session ; ce fichier-ci ne se consulte qu'à la demande.
>
> Maintenance : on **append** ici (entrées d'historique, itérations qui
> clôturent). On ne réécrit pas l'existant.

## Saga narrative (ex-TL;DR)

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
edit-bars si non normalisé. **Le code du rattrapage M.r.* est désormais clos.**

**Passe doc M.5b livrée le 2026-06-03 — Iteration M close.** Quatre chantiers
writer sur le modèle stabilisé : **M.5b.2** glossaire technique enrichi (+7
entrées : Ancre, Cap, iDFT, Normalisation, Phase, Résidu, Son, avec renvois
bidirectionnels) ; **M.5b.1** `guide-designer.md` refondu (13 sections, intro
« trois lentilles sur une seule courbe », sections Forme d'onde Libre/Ancres,
Harmoniques avec code couleur et dialog, Spectrogramme, lecture des courbes
empilées bleue/grise/orange, barre du haut) ; **M.5b.3** `comprendre-forme-onde.md`
étendu (+3 sections : trois angles sur la même courbe, l'ombre invisible —
phase, le calque du dessin — résidu, avec métaphores horloge/calques) ;
**M.5b.4** `limites-connues.md` actualisé (+5 limites assumées : régression de
phase, précision finie de la DFT, dépassements splines, latence machine modeste,
ghosting clavier — distinction explicite app/matériel). Ton « honnête mais
rassurant » préservé, aucun mot interdit (bug/défaut/anomalie/problème).
Triangulation pédagogique : glossaire (quoi) → guide (comment) → comprendre
(pourquoi) → limites (quand pas).

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

## Historique (chronologie inverse)

- **2026-06-06 — Iteration P « Effets & modulations : vibrato & trémolo (LFO par
  patch) » — CLOSE. Release v1.8.0.** Première itération de la section « Effets et
  modulations » du backlog. Deux LFO **par patch** (pas par clip) : vibrato (LFO
  sur la hauteur) et trémolo (LFO sur le volume). L'enjeu était la **plomberie
  transverse** réutilisable par les futurs effets : modèle typé, migration,
  persistance `.osa`, helper audio partagé sur les **4 chemins de synthèse**, 6ᵉ
  module Designer inséré dans le gestionnaire de modules d'O. Features additives,
  zéro breaking → bump **minor**. Composant/fichier nouveau : `lib/modulation.js` ;
  champ persisté nouveau : `designerCollapsed.modulation` ; `OSA_VERSION 3`.
  - **P.1 — Fondation typée** (`feat(iter-P/phase-1)`). Type `Lfo`
    (enabled/rate/depth/onset/shape) strictement symétrique vibrato/trémolo ;
    `Patch`/`PatchData`/`Editor` += vibrato/tremolo. Constantes
    (`LFO_RATE_MIN/MAX`, `VIBRATO_DEPTH_MAX`=200 cents, `TREMOLO_DEPTH_MAX`=1,
    `LFO_ONSET_MAX`=2000 ms, `LFO_SHAPES`) + fabriques de défauts
    (`DEFAULT_VIBRATO` rate:5 depth:20, `DEFAULT_TREMOLO` rate:5 depth:0.3,
    désactivés mais musicaux) + sanitizers clampants. Action paramétrée unique
    `SET_EDITOR_MODULATION` ({effect,key,value}, clampée selon effect+key,
    undoable) au lieu de 10 actions. Câblé dans `DEFAULT_EDITOR`,
    `buildInitialState`, `RESET_EDITOR`, `RESET_EDITOR_WAVEFORM`,
    `HYDRATE_EDITOR_FROM_PATCH`, `SAVE_PATCH`, `UPDATE_PATCH`, `patchMeta`
    (migration). Dirty check étendu (`lfoEqual` + snapshots). `.osa` :
    `OSA_VERSION 2→3`, `validatePayload` accepte v1/v2/v3 (modulations tolérées à
    l'absence, validées si présentes) ; `libraryTransfer` émet vibrato/tremolo ;
    migration localStorage via `migrateLegacyPatch` (défauts injectés pour v1/v2).
    Aucun son, aucune UI : vérifié par `npx tsc --noEmit` + round-trip
    migration/export/import.
  - **P.2 — Helper `modulation.js` + 4 chemins** (`feat(iter-P/phase-2)`).
    `applyModulation(ctx, {osc, gain, vibrato, tremolo, startTime, stopTime,
    baseAmplitude})` ajoute les branches LFO sur un couple (osc, gain) déjà créé
    par l'appelant, sans jamais l'allouer ni le connecter à `dest` ; retourne
    `{ nodes, tremoloDepthGain }` pour le cleanup. Vibrato → `osc.detune` (cents),
    trémolo → `gain.gain` (sommé à l'AHDSR). Onset = fondu d'installation ;
    extinction du trémolo programmée à `stopTime` (timeline/export) ou rampée au
    release (previews) → pas de souffle dans la traîne. Branché sur
    `scheduleOneClip` + `scheduleAllClips` (`usePlayback`, cleanup aux 3 sites :
    stopScheduler, invalidation tick, unmount) ET `playInstrumentNote` +
    `playFreeNote` (`WaveformEditor`, `mod`+`tremoloDepthGain` dans le record de
    voix, fermés à retrigger/release/stopAll/onended). Son piloté par l'état ;
    aucune régression quand les deux effets sont off (helper retourne `[]`).
  - **P.3 — 6ᵉ module Designer « Modulation »** (`feat(iter-P/phase-3)`).
    `MODULE_META.modulation` (icône Lucide `Vibrate`), `DESIGNER_ROWS.bottom` à 3
    cellules (params/adsr/modulation) — `rowSiblings`, auto-réduction (O.5d),
    collapse/maximize (O.5a/b), `OverflowToolbar` (O.6.2) marchent génériquement
    sur le 3ᵉ membre (sélecteurs `:has()` + état par id). `DesignerModuleId` /
    `DesignerCollapsed` / `DESIGNER_MODULE_IDS` / `sanitizeDesignerCollapsed` +=
    modulation (persistance du repli). `renderModulationArea` (patron
    `renderAdsrArea`) : 2 sous-blocs Vibrato/Trémolo — interrupteur pastille,
    switch de forme en icônes SVG (`IconSine`/`IconTriangleWave`/`IconSquareWave`,
    style Lucide), 3 `NumberInput` à steppers (vitesse 0.1/1 ; profondeur vibrato
    1/10, trémolo 0.05/0.1 ; installation 10/100). **Mini-courbe LFO animée** : 1
    seule boucle `rAF` par module dessinant les deux courbes, gatée par
    `modulationVisible` (prop App.jsx : onglet+collapse+maximize+mobile) ET ≥1
    effet `enabled` ; sous-bloc désactivé = ligne plate figée ; arrêt propre
    (`cancelAnimationFrame`) au repli/maximize/démontage (audit perf N.1). Mobile :
    6ᵉ zone d'accordéon.
  - **P.4 — Re-schedule live + clôture** (`feat(iter-P/phase-4)` +
    `feat(v1.8.0)`). `usePlayback.sigOf` étendu (vibrato + trémolo sérialisés) →
    éditer une modulation d'un patch utilisé en cours de lecture re-schedule les
    clips concernés, comme l'AHDSR (F.3.12.1). Bump mineur SemVer **v1.8.0**
    (package.json + about.md). Décisions consignées dans `CONTEXT.md` : modulations
    par patch via helper partagé sur les 4 chemins ; detune cents (vibrato) /
    addition sur `gain.gain` (trémolo). Hors scope (→ backlog) : pitch envelope,
    filtre + enveloppe, distorsion, effets temporels/mixage par piste, surfaçage
    Composer read-only, override par clip, synchro tempo du LFO.

- **2026-06-06 — Iteration O « Ergonomie & responsive du Designer » — CLOSE.
  Release v1.7.0.** Désencombrement / densification / responsive du **Designer**
  (tout scopé Designer), calibré jusqu'au plancher accordéon 924×668. Features
  additives, zéro breaking change → bump **minor**. Composants nouveaux :
  `OverflowToolbar`, `DesignerModule`, `ModuleChrome`, `lib/designerModules.js` ;
  champs persistés nouveaux : `adsrView`, `designerCollapsed`, `maximized`,
  `autoCollapse`.
  - **O.1 — Steppers `▴▾`** (`feat(iter-O/phase-1.{1,2})`). `NumberInput` étendu
    en opt-in (`showSteppers`/`step`/`shiftStep` : chevrons `▴▾` Lucide, clic `±1` /
    `Shift` `±10` / appui-maintenu accéléré / clavier `↑↓`). Les deux **sliders
    range** (nombre d'ancres `4..32`, plafond d'harmoniques `1..256`) sont remplacés
    par des steppers ; l'appui-maintenu récupère le « scrub live » de l'ancien
    slider du cap. Livre l'item backlog « flèches ↑↓ NumberInput ».
  - **O.2 — `OverflowToolbar` priority-plus** (`feat(iter-O/phase-2.{1,2,3})` +
    `fix 2.3`). Composant générique : items `bar`/`tray`, débordement → tiroir `⋯`
    (popover libellé), repli droite→gauche. Mesure par *ghost row* +
    `ResizeObserver` ; anti-boucle par root rempli du flex parent (largeur observée
    indépendante du contenu) ; état des contrôles dans le parent (relocalisation au
    resize). Branché en O.2 au **header Forme d'onde** (6 contrôles, même node
    Libre/Ancres) et au **groupe droit de la `DesignerToolbar`** (séparateur en
    `prefix`, fix : tient compte de la largeur du prefix).
  - **O.3 — Quadrant Instrument responsive, desktop only** (`feat(iter-O/phase-3.{1,2})`).
    Dégradation à **2 étages** (seuils `width OU height`, au-dessus du plancher
    accordéon). Étage 1 (`instrumentCollapsed`) : contrôles système → icône `[⚙]`
    dans le header (modale inchangée). Étage 2 (`octaveInHeader`, ⟹ étage 1) : les
    11 boutons d'octave → **stepper `▴▾`** dans le header. `WaveformEditor` reçoit
    `isMobile` (prop App.jsx) ; `data-anchor="designer-octave-selector"` suit le
    contrôle. Mobile (accordéon < 924×668) strictement inchangé.
  - **O.4 — Enveloppe AHDSR compacte** (`feat(iter-O/phase-4.{1,2})`).
    `ResizeObserver` sur `.we-adsr-area` (mesure de la **zone**, pas `windowWidth`
    → layout-agnostique). Sous `ADSR_COMPACT_*`, **switch segmenté Graphe/Sliders**
    dans le header, **une vue à la fois** ; vue Sliders seule en **grille 2
    colonnes**. `adsrView: 'graph'|'sliders'` persisté (défaut `graph`,
    non-undoable). Canvas jamais démonté (`display:none` + redraw forcé au retour
    Graphe).
  - **O.5 — Gestionnaire de modules** (`feat(iter-O/phase-5a→5d)` + fixes `5a.3`,
    `5b`, `5c.f1→f7`). Les 5 modules sont enveloppés dans `DesignerModule` +
    `ModuleChrome`. **5a** collapse en bande (icône en tête + titre en rotation,
    `designerCollapsed`, libère l'espace via flexGrow normalisé + gap inerte).
    **5b** maximize plein-cadre (`maximized`, autres modules masqués CSS, étalement).
    **5c** chrome détachée centralisée en coin haut-droit (boutons nus
    Réduire/Agrandir-Restaurer, icônes contrôles-fenêtre SVG) + identité par module
    (`MODULE_META` : icône Lucide + label, source unique ; bande = icône + titre en
    rotation). **5d** politique d'**auto-réduction par rangée** (`autoCollapse` +
    toggle DesignerToolbar, `effectiveAutoCollapse` forcé en écran étroit),
    coexiste avec l'AUTO du dimensionnement (auto-collapse = à l'ouverture / AUTO =
    au focus). Série de fixes `5c.f*` : le re-câblage des `ResizeObserver` (canvas
    figés 300×150, décision compact AHDSR erratique) résolu en posant les RO via
    **callback ref** (anti-orphelin — la render-prop remonte les nodes sans démonter
    `WaveformEditor`) ; abandon du masquage auto du titre par RO au profit du CSS.
  - **O.6 — Généralisation + titres ellipsis** (`feat(iter-O/phase-6.{1,2})` +
    fixes `6.f1/f2`). **6.1** titres en **ellipsis progressive** sur les 5 headers
    (« … » puis icône seule en dernier recours, l'icône d'identité reste). **6.2**
    `OverflowToolbar` **généralisé aux 5 headers** (Harmoniques cap, Instrument
    octave + ⚙ conditionnels, AHDSR switch compact, Spectro live/dB/peak) ; l'icône
    + le titre restent hors de la barre (`we-header-left`) ; `getAnchoredPosition`
    ignore les clones `visibility:hidden` des ghost rows. Fixes : « … » caché
    derrière le titre + modale système sous le popover (`6.f1`), Forme d'onde —
    toolbar à cheval sur la chrome (`6.f2`).

- **2026-06-04 — Iteration N « Stabilité & fluidité » — CLOSE. Release v1.6.0.**
  Apurement et polish de la base avant le prochain grand saut créatif (Monde B).
  Pas de rupture du modèle de données → bump **minor**.
  - **N.1 — Latence audio** (`fix(iter-N/phase-1.2)` + `1.4.x`, 2026-06-03).
    Régression de fluidité depuis M.r.5 corrigée à la cause. Diagnostic N.1.1
    (profilage, sans commit) : sur 4 suspects, seul **(b)** confirmé — le leakage
    du resample 600↔512 rend les 256 barres de `canonicalToBars` non-nulles,
    défaisant le garde `if (a)` de `harmonicsToPoints` → iDFT 600×cap à chaque
    mousemove (4,8 ms à cap=256 ; `WaveformEditor:395` non mémoïsée + `normalizedBg`
    au changement de cap). (a) rAF auto-fit, (c) empilement rAF, (d) cache miss :
    **infirmés** (boucles lerp convergentes et arrêtées, identités `useCallback`
    stables, cache canonical stable hors édition). Correctif N.1.2 :
    `HARMONIC_EPSILON = 1e-4` (`audio.js`) — garde anti-zéro à seuil dans
    `harmonicsToPoints` + snap du leakage sub-epsilon à un vrai zéro dans
    `canonicalToBars`. Gain re-mesuré : iDFT/frame 4,93→0,65 ms à cap=256
    (**7,6×**), 2,40→0,40 ms à cap=128 (6,0×). Transparence tenue (créneau
    broadband : max|Δ canonical| = 8e-15, quasi bit-identique ; signal sparse :
    1e-4 = −80 dB, sous-pixel ; 0 harmonique légitime tuée). **Quick wins Groupe A**
    (`fix(iter-N/phase-1.4.{1,2,3})`) : 1.4.1 cache de `themeColor()`
    (`src/lib/themeColor.js`, `Map` module-level vidée sur l'event `themechange`)
    — évite un `getComputedStyle()` ~9×/`drawCanvas`, 9+2×N_ancres/`SplineEditor`,
    ~13×/`drawAdsr` sur le hot path de drag (meilleur gain du lot) ; 1.4.2 cache de
    `PeriodicWave` (`src/audio.js`, WeakMap par réf `canonical`, sous-clé `cut`) —
    plus de reconstruction de wavetable à chaque note (~0,13 ms/note) ; 1.4.3
    arrondi `canonical`/`residual` à 1e-4 **au seul point d'écriture localStorage**
    (`App.jsx`, `patchForStorage`) → payload forme d'onde **−63 %** (24,2→8,9
    Ko/patch ; 30 patches 708→262 Ko), modèle mémoire + export `.osa` en pleine
    précision. Le **Groupe B/C** (re-renders par note/frame, isolation drafts,
    mémoïsation d'arbre, débounce persistance) reste **gelé** jusqu'au verdict du
    profilage prod. Hors scope inchangé : refactor de la grille FFT 600↔512 (#12).
  - **N.2 — Disposition des ancres / Douglas-Peucker** (`feat(iter-N/phase-2)`).
    `fitAnchorsToCurve` réécrit : DP à compte fixe (déviation verticale, signal
    périodique avec borne virtuelle `x=600`) au lieu de l'équiréparti `x=i·600/N`.
    Ancres aux points qui comptent (créneau : pile sur les transitions ; N=2 →
    `x=0` + déviation max globale ; courbe plate → complétion par milieu
    géométrique). Contrat inchangé (exactement N ancres, x entiers distincts triés,
    `y=canonical[x]`) → ~8 call-sites héritent. Canonical INCHANGÉE, le résidu
    absorbe le delta. Densité plus forte aux transitions → atténue l'overshoot
    Catmull-Rom.
  - **N.2.1 — Bascule Doux/Anguleux = no-op canonical** (`fix(iter-N/phase-2.1)`).
    `SET_SPLINE_INTERPOLATION` ne recompose plus la canonical via
    `splinePlusResidual` (résidu gelé → tracé déformé sans drag) : canonical
    strictement inchangée, **résidu recalculé** contre le nouveau mode,
    `canonicalNormalized` préservé. Le switch ne change que la tendance (courbe
    orange « spline des ancres ») et la façon dont un futur drag déformera.
  - **N.3 — Drag d'ancre = déformation 2D à support local** (`feat(iter-N/phase-3)`).
    **Remplace** l'ancien N.3 (PCHIP/overshoot, abandonné). `MOVE_SPLINE_ANCHOR`
    warpe horizontalement le résidu sur le support `(ancre_gauche, ancre_droite)`
    (helper pur `warpResidualForAnchorMove`, wrap périodique aux bords) au lieu de
    le geler → le détail dessiné « ride » sur la tendance (plus de double pointe),
    la verticale est portée par la spline. Réf figée au début du drag (draft local
    `SplineEditor`, 1 commit/1 undo au mouseup). Pas de re-fit DP.
  - **N.3.1 — Warp lisse en mode doux** (`fix(iter-N/phase-3.1)`). La pré-image PL
    créait des angles **parasites** sur l'ancre et la voisine (glaring en Doux).
    Pré-image branchée sur le mode : bump smoothstep **C¹** (`W=3t²−2t³`, dérivée
    nulle en Lx/xN/Rx) en `soft`, PL conservé en `hard`. Garde anti-repli (clamp
    d'amplitude à `(2/3)·h`). On ne lisse pas les vrais angles du dessin.
  - **N.3.2 — ADD/REMOVE préservent la canonical** (`fix(iter-N/phase-3.2)`).
    `ADD`/`REMOVE_SPLINE_ANCHOR` recomposaient la canonical via le résidu gelé →
    déformation + ancre flottante. Désormais : canonical inchangée, résidu
    recalculé, `canonicalNormalized` préservé ; ADD **snappe sur le tracé**
    (`y=canonical[x]`, x entier, hauteur du clic ignorée). Principe
    « représentation vs forme » posé en décision archi.
  - **N.4 — Boutons de lissage du tracé** (`feat(iter-N/phase-4)`) — **les deux
    gardés** (fonctions distinctes et complémentaires, tranché en passe d'usage) :
    4.1 `SMOOTH_EDITOR_CANONICAL` (icône `Waves`) = passe-bas Gaussien périodique
    (σ 3 pts, wrap) indépendant des ancres → re-fit DP des ancres + résidu ; 4.2
    `TEND_TOWARD_SPLINE` (icône `ChartSpline`) = lerp canonical→spline(anchors) à
    α=0.5, **garde les ancres**, recalcule le résidu (répété → résidu→0). Les deux
    posent `canonicalNormalized:false` + `preset:null`.
  - **N.5 — Refonte des presets « Timbres »** (N.5a→f, N.5 close). 5a **Effacer
    sans confirmation** : `Eraser` (`DesignerToolbar`) applique `resetWaveform`
    direct (undo = filet ; state `confirmResetWaveformOpen` / `doResetWaveform` /
    dialog retirés). 5b **moteur de formes** : lib pur `src/lib/waveforms.js` —
    `idealWaveform(type)` (forme brute, ex-`generatePresetPoints`) +
    `bandlimitWaveform(points, N)` / `bandlimitedWaveform(type, N)` (reconstruction
    des harmoniques 1..N par **DFT directe sur la grille 600**, phase naturelle,
    normalisée magnitude-max=1). 5c **refonte modale** : `PresetPicker` = point
    d'entrée unique (Formes de base à 2 vues idéale/band-limitée + N éditable
    snappé, Timbres conçus, Inattendus), chargement unifié `LOAD_PRESET` (payload
    résolu par la modale : canonical + cap + ancres DP à `anchorCount` + flags),
    barre des 4 presets géométriques du mode Libre **retirée**
    (`APPLY_EDITOR_PRESET` supprimé). 5d **finitions** (2 correctifs non-clamp) :
    `PatchThumbnail` auto-fit Y vers le bas (`peak=max(1,|points|)`) → formes à pic
    > ±1 affichées entières ; retrait du clamp `[-1,1]` oublié dans
    `fitAnchorsToCurve` (garde anti-NaN conservée). 5e **chargement en place +
    phase scie** : `LOAD_PRESET` conserve `currentPatchId` (chargement en place,
    marque dirty), confirmation d'écrasement retirée (`pendingPresetPayload` /
    `ConfirmDialog` preset supprimés) ; `idealWaveform('sawtooth')` passe de `2t−1`
    à `1−2t` (scie descendante → série en +sin = phase canonique, plus de flip au
    Normaliser). 5f **timbres paramétriques + renommage** : modale « Presets » →
    **« Timbres »** ; `idealWaveform(type, params)` généralisé + 7 formes
    **paramétriques** (`PARAMETRIC_WAVEFORMS` : escalier, scie à étages, sinus
    décroissante, pulse, trapèze, demi-sinus, impulsion ; chacune 0/1/2 params de
    forme + N, `anchorCount` nombre|fn(K)) + section dédiée dans la modale (param(s)
    + N + 2 vignettes idéale/band-limitée, redraw live).
  - **N.6 — Durcissements** (`feat(iter-N/phase-6.{1,2})`) — dernière phase. 6.1
    `// @ts-check` sur `reducer.js` (opt-in, checkJs:false global) — 4 erreurs
    réelles corrigées sans `@ts-ignore` : signature dérivée
    `defaultColumnWidthsForLens`, widening `'hard'|'soft'`→string du literal
    `newPatch` annoté `@type {Patch}`, narrowing `never` d'un guard `typeof
    action.payload` extrait en local ; eslint `argsIgnorePattern '^_'`. 6.2
    auto-sizing devient le **5ᵉ bouton (AUTO) d'un groupe radio** avec les 4
    presets de proportions (checkbox retirée), nouvel `IconAuto` (SVG `<text>`
    « AUTO »), **actif dérivé** (autoSizing → AUTO ; sinon preset dont les widths
    == `designerColumnWidths` à epsilon ; sinon aucun), coloration active =
    toggles radio du Spectrogramme (M.r.2.6.7) ; `setAutoSizing(false)` aux
    call-sites manuels (clic preset, début de drag), jamais dans `onWidths`.

- **2026-06-03 — Iteration M — passe doc M.5b livrée. ITERATION M CLOSE (code + doc).**
  Quatre chantiers writer enchaînés sur le modèle stabilisé. Triangulation
  pédagogique : glossaire (quoi) → guide (comment) → comprendre (pourquoi) →
  limites (quand pas).
  - **M.5b.2** — `glossaire-technique.md` enrichi de **7 entrées** alphabétiques
    (Ancre, Cap, iDFT, Normalisation, Phase, Résidu, Son) avec renvois
    bidirectionnels mis à jour dans 4 entrées existantes (DFT, Forme d'onde,
    Harmonique, Spectre + Fréquence/Amplitude/Hauteur/Timbre vers Son). 20
    entrées au total. Volontairement pas d'entrée Magnitude (pollue plus
    qu'éclaire le lecteur cible). Initiative writer : mention textuelle du
    « bouton Σ » dans l'entrée Normalisation comme pont UI/concept.
  - **M.5b.1** — `guide-designer.md` **refondu** (77 → 192 lignes, 7 → 13
    sections). Concept structurant « Trois lentilles sur une seule courbe »
    posé en section 2 dès l'intro. Sections lentilles Forme d'onde
    (Libre/Ancres), Harmoniques (code couleur bleu/gris, dialog, clic droit,
    bouton Σ), Spectrogramme. Section pédagogique « Lire les courbes
    empilées » (bleue/grise/orange). Section « La barre du haut » pour les 4
    outils (Presets/Reset/Σ/proportions). Sections existantes préservées
    (AHDSR, amplitude, système musical, clavier, enregistrer).
  - **M.5b.3** — `comprendre-forme-onde.md` **étendu** (62 → 140 lignes, 5 → 8
    sections). 4 premières sections **intactes** (l'équilibre éditorial était
    précieux). 3 nouvelles sections ajoutées : « Trois angles sur la même
    courbe » (les 3 vues comme fait mathématique, pas UI — DFT/iDFT comme
    voyage réversible), « L'ombre invisible : la phase » (métaphore horloge
    sous deux angles, justification du dialog edit-bars), « Le calque du
    dessin : le résidu » (métaphore deux calques, didactique « deux solutions
    naïves échouent » avant la voie Designer). Conclusion réécrite : « pas
    *une* boucle, c'est un **réseau** ».
  - **M.5b.4** — `limites-connues.md` **actualisé** (43 → 99 lignes). 4
    sections H2 préservées. 5 limites intégrées : (1) régression de phase à
    l'édition de barre → Synthèse ; (2) précision finie de la DFT (round-trip
    600↔512 non idempotent, ~15 % de leakage / passe sur signaux riches) →
    Synthèse, métaphore « toute fenêtre a une bordure » ; (3) dépassements
    splines sur transitions verticales, workarounds densifier ancres /
    Anguleux → Synthèse ; (4) latence à l'appui sur machine modeste →
    Performance ; (5) ghosting clavier QWERTY (S+E+D etc.) → Périmètre audio
    avec **distinction explicite « Ce n'est pas l'app »** + clin d'œil futur
    MIDI USB. Ton « rien de bloquant, autant les connaître » préservé. Aucun
    mot interdit (bug/défaut/anomalie/problème).
  - **Bilan iter-M complet** : 5 phases principales code (M.r.1 modèle unifié
    → M.r.2 UI refonte → M.r.3 lentilles vivantes → M.r.4 normalisation
    explicite → M.r.5 convention d'amplitude) + 3 finitions (M.r.2.5 / r.2.6
    / r.5.bis) + 4 chantiers doc (M.5b.1 → .4). Le Designer a basculé du
    modèle siloté (3 modes verrouillés, conversions destructives, 🔒) au
    modèle unifié (canonical + cap + ancres + résidu, 3 lentilles vivantes
    toujours synchronisées, normalisation pédagogique, marqueur ±1
    didactique). Doctrine non-clamp étendue à la persistance, doctrine
    iconographie Lucide instaurée projet-wide.

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
    à ce stade les ancres restaient clampées à ±1 par le reducer (auto-fit dilaté
    seulement via `normalizedBg` / overshoot Catmull-Rom) — **clamp levé ensuite**
    en passe d'usage (cf. ci-dessous).
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
    factorise les boucles de tracé insettées. Marges verticales ensuite portées à
    26/24px (asymétriques) pour loger légende/hint hors du tracé sans frôler ±1.
    (d) **Alignement non-clamp du mode Ancres sur le tracé libre, persistance
    comprise** : 5 clamps levés (`splinePlusResidual`, `MOVE`/`ADD_SPLINE_ANCHOR`,
    `SplineEditor.eventToData`, **`sampleSpline`** — la courbe spline elle-même,
    sinon orange/aperçu flatlinaient à ±1 — et les bornes de persistance). Décision
    archi : le dépassement ±1 est **réel et persisté** (l'audio est normalisé à la
    lecture, clamper changerait le timbre) ; une **borne défensive [-10, 10]**
    (résidu [-12, 12]) remplace l'ancien ±1 dans `validatePayload` (.osa v2, sans
    bump), `sanitizeAnchors` et `clampToCanonicalRange` (ex-`clampToUnit`). Résout
    les 3 symptômes : orange clampée, auto-fit qui se réduit à la sélection d'ancre,
    bleu écrêté pendant un drag. Export WAV inchangé (oscillateur normalisé).
    (e) **Grille de repères d'amplitude** (`drawAmplitudeGrid`, partagée) : niveaux
    par pas de 0.5 jusqu'au pic affiché (`+0.5`, `+1.5`, `+2`, `+2.5`, …) labellisés,
    apparaissant à mesure que l'auto-fit dilate ; ±1 reste le marqueur accent ; les
    étiquettes positives reprennent le préfixe `+`. (f) **fix playback** :
    `scheduleOneClip` (lecture timeline d'un seul clip) oubliait de passer
    `patch.cap` à `pointsToPeriodicWave` → 256 harmoniques jouées (leakage spectral
    `[cap+1..256]` audible, exacerbé par les pics > ±1) ; `scheduleAllClips` le
    faisait déjà.
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

## Roadmaps des itérations closes (B→O)

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
- ✅ **M.5b** *(2026-06-03)* — Passe doc « cœur de la synthèse » livrée par le
  writer en 4 chantiers (M.5b.2 glossaire +7 entrées → M.5b.1 guide-designer
  refondu 13 sections → M.5b.3 comprendre-forme-onde +3 sections → M.5b.4
  limites-connues +5 limites). Triangulation pédagogique glossaire/guide/comprendre/limites.
  **→ Iteration M intégralement close (code + doc).** Reste hors iter : note de
  clôture, nettoyage des prompt-fichiers archi consommés (`archi/Mr*` et
  `archi/M5b*`), audit final.

### Itération N (Stabilité & fluidité) — clôturée 2026-06-04 (v1.6.0)

Apurement et polish de la base avant le prochain grand saut créatif (Monde B).
Cadrage et suspects initiaux dans `archi/BACKLOG.md`. Détail par-phase (texte
exhaustif) dans l'Historique ci-dessus.

- ✅ **N.1 — Latence audio** : `fix(iter-N/phase-1.2)` = seuil epsilon
  anti-leakage sur l'iDFT harmonique (drag de barre 7,6× plus rapide à cap=256 ;
  cause (b) confirmée, (a)/(c)/(d) infirmés au profilage). `fix(iter-N/phase-1.4.x)`
  = quick wins perf Groupe A (cache `themeColor`, cache `PeriodicWave`, arrondi
  payload localStorage −63 %). Groupe B/C (re-renders, isolation drafts,
  mémoïsation d'arbre, débounce persistance) **gelé** jusqu'au verdict prod.
- ✅ **N.2 — Disposition des ancres / Douglas-Peucker** (`feat(iter-N/phase-2)`) :
  `fitAnchorsToCurve` réécrit en DP à compte fixe (ancres sur les transitions),
  contrat inchangé, canonical inchangée (le résidu absorbe le delta).
- ✅ **N.2.1 — Bascule Doux/Anguleux = no-op canonical** (`fix(iter-N/phase-2.1)`) :
  canonical strictement inchangée, résidu recalculé contre le nouveau mode.
- ✅ **N.3 — Drag d'ancre = déformation 2D à support local** (`feat(iter-N/phase-3)`) :
  warp horizontal du résidu sur le support, le détail « ride » sur la tendance.
  Remplace l'ancien N.3 (PCHIP/overshoot, abandonné).
- ✅ **N.3.1 — Warp lisse en mode doux** (`fix(iter-N/phase-3.1)`) : pré-image
  smoothstep C¹ en `soft`, PL en `hard`, garde anti-repli.
- ✅ **N.3.2 — ADD/REMOVE préservent la canonical** (`fix(iter-N/phase-3.2)`) :
  canonical inchangée, ADD snappe sur le tracé. Principe « représentation vs forme ».
- ✅ **N.4 — Boutons de lissage du tracé** (`feat(iter-N/phase-4)`) — les deux
  gardés : passe-bas Gaussien (`SMOOTH_EDITOR_CANONICAL`) + lerp vers la spline
  (`TEND_TOWARD_SPLINE`).
- ✅ **N.5 — Refonte des presets « Timbres »** (N.5a→f) : modale = point d'entrée
  unique (2 vues idéale/band-limitée + N éditable + formes paramétriques),
  moteur `lib/waveforms.js`, chargement unifié `LOAD_PRESET` en place, barre
  géométrique retirée, renommage « Timbres ».
- ✅ **N.6 — Durcissements** (`feat(iter-N/phase-6.x)`) : `// @ts-check` opt-in
  sur `reducer.js` (4 erreurs réelles corrigées, 0 `@ts-ignore`) ; auto-sizing
  intégré au groupe radio de dimensionnement (5ᵉ bouton AUTO).

### Itération O (Ergonomie & responsive du Designer) — clôturée 2026-06-06 (v1.7.0)

Désencombrement / densification / responsive du **Designer** (tout scopé Designer),
calibré jusqu'au plancher accordéon 924×668. Détail par-phase (texte exhaustif) dans
l'Historique ci-dessus.

- ✅ **O.1 — Steppers `▴▾`** (`feat(iter-O/phase-1.{1,2})`) : `NumberInput` étendu
  en opt-in ; sliders range ancres (`4..32`) / cap (`1..256`) remplacés par steppers
  (appui-maintenu = scrub live). Livre l'item backlog « flèches ↑↓ NumberInput ».
- ✅ **O.2 — `OverflowToolbar` priority-plus** (`feat(iter-O/phase-2.x)`) : barre
  générique (items `bar`/`tray`, tiroir `⋯`, mesure ghost-row + RO, anti-boucle,
  relocalisation au resize). Branchée au header Forme d'onde + groupe droit
  DesignerToolbar (généralisée aux 5 headers en O.6.2).
- ✅ **O.3 — Quadrant Instrument responsive, desktop only** (`feat(iter-O/phase-3.x)`) :
  dégradation 2 étages (système → `[⚙]`, octaves → stepper `▴▾`) sur largeur OU
  hauteur ; mobile (accordéon) inchangé.
- ✅ **O.4 — Enveloppe AHDSR compacte** (`feat(iter-O/phase-4.x)`) : switch
  Graphe/Sliders (détection mesurée sur la zone via RO), une vue à la fois, sliders
  2 colonnes ; `adsrView` persisté ; canvas jamais démonté.
- ✅ **O.5 — Gestionnaire de modules** (`feat(iter-O/phase-5a→5d)` + fixes) :
  collapse en bande (`designerCollapsed`), maximize plein-cadre (`maximized`),
  chrome détachée en coin + identité par module (`MODULE_META`), auto-réduction par
  rangée (`autoCollapse`, coexiste avec l'AUTO). Collapse/maximize = CSS pur, canvas
  jamais démonté ; RO posés via callback ref (anti-orphelin).
- ✅ **O.6 — Généralisation + titres ellipsis** (`feat(iter-O/phase-6.x)` + fixes) :
  titres en ellipsis progressive (« … » puis icône seule), `OverflowToolbar`
  généralisé aux 5 headers.

**Différé / reste (future itération)** : épuration responsive sous 924×668
(accordéon mobile non retravaillé) ; switch AHDSR exposé aussi en résolution
normale ; séparateurs glissables dans la rangée du bas (si besoin avéré) ;
calibration fine des seuils (en variables).
