# Prompt T.2 — Auto-pan (LFO → panoramique stéréo, par patch)

## Contexte

Itération T « Effets sans mémoire », phase 2. T.1 a livré le module
« Effets » avec switcher header (boutons + pastille activé + badge
tiroir) : ajouter un effet = un bouton + un panneau + un champ de
modèle. L'auto-pan inaugure le circuit complet : c'est le **premier
effet stéréo** de l'app (tout est centré aujourd'hui) et il porte le
**bump `.osa` v4** de l'itération.

L'auto-pan est un LFO classique : la position stéréo oscille
gauche↔droite autour du centre. Le modèle `Lfo` existant se réutilise
tel quel.

## Spec fonctionnelle

### 1. Modèle de données

- `Patch` et `Editor` += **`autoPan: Lfo`** — mêmes champs que
  vibrato/trémolo : `{ enabled, rate (0.1–20 Hz), depth, onset (0–2000
  ms), shape }`.
- **`depth` ∈ 0..1 = excursion symétrique autour du centre** : le pan
  oscille entre `-depth` et `+depth` (1 = pleine largeur G↔D).
- `DEFAULT_AUTOPAN` : `enabled:false, rate:1, depth:0.5, shape:'sine'`,
  onset aligné sur le défaut des deux autres. Désactivé mais musical,
  comme les existants (un auto-pan à 1 Hz s'entend immédiatement).
- `types.ts` : étendre `Patch`/union `Action` comme en P.1.
- Hydratation localStorage : patch sans `autoPan` → défaut injecté
  (même mécanique que vibrato/tremolo à l'iter P).
- **`.osa` : `OSA_VERSION = 4`.** L'import accepte v1→v4 ; `autoPan`
  absent (v1/v2/v3) → `DEFAULT_AUTOPAN` injecté. C'est le **seul** bump
  de l'itération T : les phases T.3→T.6 ajouteront leurs champs dans
  v4 avec la même règle « champ absent → défaut injecté » (décision
  archi, à noter dans CONTEXT.md).

### 2. Audio — chaîne de voix + LFO

- **Insertion d'un `StereoPannerNode` par voix**, entre le gain AHDSR
  et la suite de la chaîne (`osc → gain → panner → <inchangé>`),
  **uniquement quand `autoPan.enabled && depth > 0`**. Effet désactivé
  → aucun nœud inséré, chaîne strictement identique à aujourd'hui
  (zéro coût, zéro risque de régression mono).
- **Répartition des rôles (décision archi, cohérente avec P)** :
  l'**appelant** insère le panner — il possède la chaîne principale ;
  `applyModulation` (`lib/modulation.js`) ne fait qu'**ajouter la
  branche LFO** : oscillateur (shape, rate) → `depthGain` (montée
  0→`depth` sur `onset`) → **`panner.pan`** (base 0, le LFO s'y
  somme). Signature du helper étendue pour recevoir le panner
  (paramètre optionnel — absent = pas d'auto-pan, les appels existants
  restent valides).
- **Comportement au release : comme le vibrato** — depth constant
  jusqu'au bout de la note (le pan ne rajoute pas d'énergie,
  `StereoPannerNode` est equal-power : pas de souffle ni de problème
  de headroom, pas de plateau/release spécial à la trémolo).
- **Les 4 chemins de synthèse** (lecture timeline `scheduleOneClip`,
  export WAV `scheduleAllClips`, preview clavier, preview note libre)
  reçoivent le panner conditionnel + la branche LFO. Cleanup
  symétrique : panner et nœuds LFO stoppés/déconnectés partout où
  l'`osc` l'est (programmé via `stopTime` timeline/export, manuel au
  release pour les previews).
- **Signature scheduler** : inclure `autoPan` dans la signature de
  clip (comme vibrato/trémolo en P) → éditer l'auto-pan pendant la
  lecture re-schedule les clips à venir.
- Polyphonie : un panner + un LFO **par voix**, phase du LFO au début
  de chaque note (même convention que vibrato/trémolo).
- L'export `OfflineAudioContext` est déjà stéréo (2 canaux) ; le
  master bus (WaveShaper) traite chaque canal indépendamment — rien à
  changer, mais **vérifier** que le WAV exporté porte bien la stéréo.

### 3. UI — module Effets

- `DESIGNER_EFFECT_IDS` += `'autoPan'` (id = clé du champ, comme
  vibrato/tremolo). Bouton **« Auto-pan »** en 3ᵉ position dans le
  header (après Trémolo), pastille/highlight/badge hérités du
  mécanisme T.1 sans travail supplémentaire.
- Panneau identique aux deux autres : interrupteur on/off, switch de
  forme (mêmes icônes), 3 `NumberInput` à steppers — **vitesse** (Hz),
  **profondeur** (0..1), **installation** (ms) — + **graphe LFO
  éditable à poignées** (Profondeur / Installation / Vitesse),
  réutilisant le composant/pattern existant (draft local pendant le
  drag, un dispatch au relâchement, point de phase animé, gating rAF
  T.1).
- Sémantique du graphe : médiane = **centre stéréo** ; ajouter les
  étiquettes **G** (haut) / **D** (bas) — ou l'inverse, mais cohérent
  avec le signe de `pan` — discrètes en bord de gouttière, pour donner
  le sens pédagogique de l'axe Y (c'est le premier graphe dont l'axe
  n'est pas une amplitude).
- Édition via la même action paramétrée `SET_EDITOR_MODULATION`
  (`effect:'autoPan'`), clamps idem (rate 0.1–20, depth 0–1, onset
  0–2000), undoable.

## Découpage en sous-commits

1. `feat(iter-T/phase-2.1): modèle autoPan (Lfo) + défauts + hydratation
   + .osa v4` — types, reducer (état + clamps + injection défauts),
   `osaFormat`/`libraryTransfer` (OSA_VERSION 4, accept v1→v4).
2. `feat(iter-T/phase-2.2): audio — StereoPannerNode conditionnel par
   voix + branche LFO sur les 4 chemins` — insertion appelant,
   extension `applyModulation`, signature scheduler, cleanup.
3. `feat(iter-T/phase-2.3): UI — bouton + panneau Auto-pan dans le
   module Effets` — bouton header, panneau complet, étiquettes G/D.
4. `docs: CONTEXT.md — Iteration T phase 2 (auto-pan, .osa v4)` (+
   CONTEXT-ARCHIVE).

## Comportement attendu

- Au casque : note avec auto-pan activé → le son voyage G↔D à `rate`
  Hz, largeur d'excursion = `depth`, montée progressive sur `onset`.
  Audible sur les 4 chemins (clavier, note libre, timeline, WAV
  exporté — ouvrir le WAV dans un éditeur audio : les deux canaux
  diffèrent).
- Auto-pan désactivé : chaîne audio **bit-identique** à v1.11.0 (pas
  de panner inséré) ; un projet existant se charge et sonne à
  l'identique.
- Patch v3 importé (`.osa`) ou rechargé (localStorage) → `autoPan`
  par défaut, désactivé. Export `.osa` → v4 ; réimport v4 OK.
- Édition pendant lecture timeline → re-schedule (comme
  vibrato/trémolo).
- Mute/solo/volume de piste, master bus, spectrogramme : inchangés.
  Undo/redo : éditions de paramètres undoables, sélection de panneau
  non (T.1).
- 12 notes tenues avec auto-pan : pas de saturation nouvelle
  (equal-power, le master headroom-bas n'est pas plus sollicité).

## Hors scope (T.2)

- **Pan statique par piste** (mixage Composer — backlog).
- Pitch envelope (T.3), filtre (T.4+), distorsion (T.6).
- Synchro tempo du LFO, override par clip (hors scope itération,
  comme en P).
- Indicateur d'effets côté Composer/PropertiesPanel (backlog).

## Validation manuelle suggérée

Casque obligatoire. Preview clavier (polyphonie : 3 notes, chacune
panne indépendamment), note libre, timeline multi-pistes, export WAV
relu dans un éditeur (Audacity : formes d'onde G/D visiblement
déphasées). Round-trip `.osa` v3→import→export v4→réimport. Depth 0 /
enabled false → vérifier l'absence du panner (silence du diff
audio). Thèmes clair/sombre pour les étiquettes G/D.
