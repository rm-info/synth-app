# Prompt T.5 — Enveloppe de filtre + wah (sur `biquad.detune`)

## Contexte

Itération T « Effets sans mémoire », phase 5. Le filtre statique (T.4)
gagne ses deux modulations classiques — l'**enveloppe de cutoff** (le
« waouw » soustractif) et le **wah** (LFO de cutoff).

**Clé architecturale de la phase** : `BiquadFilterNode` possède un
paramètre **`detune` en cents** (comme l'oscillateur). Les deux effets
sont donc des **réutilisations à l'identique** des patterns 3.x :
- enveloppe de filtre = le pitch envelope (T.3 + Inverser T.3bis +
  4 formes T.3ter) appliqué à `biquad.detune` ;
- wah = le vibrato (branche LFO sommée) appliqué à `biquad.detune`.
Et comme pour le couple pitch env + vibrato sur `osc.detune`, les deux
**composent par construction** (automation de base + branche entrante
sommée).

UI (cadrage acté) : **2 nouveaux boutons** dans le header Effets —
« Env. filtre » et « Wah » (7 boutons, l'OverflowToolbar absorbe).
Leurs panneaux sont des **clones** des panneaux Hauteur et LFO. Pas de
bump `.osa` (règle v4).

## Spec fonctionnelle

### 1. Modèle de données

- **Généraliser le type d'enveloppe** : `PitchEnv` devient un type
  partagé (ex. `ParamEnv` : `{ enabled, amount, time, invert, curve }`)
  — `pitchEnv` et `filterEnv` en sont deux instances avec leurs bornes
  propres. Pas de migration : seuls les noms de types bougent.
- `Patch`/`Editor` += **`filterEnv: ParamEnv`** — `amount` en **cents
  de cutoff**, −4800..+4800 (± 4 octaves, un sweep de filtre va plus
  loin qu'un pitch env) ; `time` 0..2000 ms ; `invert`/`curve` idem
  pitch env. `DEFAULT_FILTERENV` : `{ enabled:false, amount:2400,
  time:200, invert:false, curve:'linear' }`.
- `Patch`/`Editor` += **`wah: Lfo`** (type existant) — depth en
  **cents** 0..3600. `DEFAULT_WAH` : `{ enabled:false, rate:2,
  depth:1200, onset:0, shape:'sine' }`.
- `types.ts`, hydratation, validation `osaFormat` (bornes propres ;
  `isLfoValidOrAbsent` avec depthMax 3600), `libraryTransfer`.
- `DESIGNER_EFFECT_IDS` += `'filterEnv'`, `'wah'` (positions 6 et 7,
  avant la future disto). Édition via `SET_EDITOR_MODULATION`.

### 2. Audio — `applyModulation`

- Signature += **`biquad`** (optionnel, comme `panner` en T.2) +
  `filterEnv` + `wah`. Les appelants passent le biquad **quand ils
  l'ont inséré** (= `filter.enabled`, T.4) ; biquad absent → les deux
  effets sont des no-ops silencieux.
- **Enveloppe de filtre** : extraire le bloc d'automation du pitch env
  en **helper partagé** (ex. `scheduleParamEnv(param, env, startTime)`
  — setValueAtTime/linearRamp/`setValueCurveAtTime` + garde durée
  nulle + invert + `pitchProgression`), appelé pour `osc.detune`
  (pitch) ET `biquad.detune` (filtre). Une seule implémentation des
  4 formes.
- **Wah** : même fabrique de branche LFO que le vibrato (osc LFO →
  depthGain avec onset → `biquad.detune`). Depth constant jusqu'au
  bout (pas de plateau/release spécial — comme vibrato/auto-pan).
  Nœuds dans le tableau `mod` (cleanup symétrique existant).
- Le cutoff effectif (`frequency × 2^(detune/1200)`) est clampé par la
  spec à [0, Nyquist] — sweeps extrêmes sans danger, à noter en
  commentaire.
- **Signature scheduler** += `filterEnv` + `wah` (re-schedule live).
- 4 chemins de synthèse, comme toujours.

### 3. UI — deux panneaux clones

- **Panneau « Env. filtre »** : clone du panneau Hauteur — interrupteur,
  toggle Inverser, switch 4 formes, steppers **Départ** (cents,
  ±4800) / **Durée** (ms), graphe d'enveloppe à 2 poignées (mêmes
  composants/discipline). Sémantique du graphe : médiane = cutoff
  réglé (T.4) ; la courbe = décalage en cents autour de lui.
- **Panneau « Wah »** : clone des panneaux LFO (vibrato/trémolo/
  auto-pan) — interrupteur, switch de forme, steppers vitesse/
  profondeur (cents)/installation, graphe LFO à poignées + point de
  phase animé. Le gating rAF du module (T.1) intègre le wah dans
  « au moins un enabled ».
- **Hint filtre maître désactivé** : si `!filter.enabled`, les deux
  panneaux affichent une ligne discrète « Le filtre est désactivé —
  cet effet est muet » + bouton inline **« Activer le filtre »**
  (dispatch `SET_EDITOR_MODULATION` filter/enabled/true, undoable).
  Les contrôles restent éditables (on peut configurer avant
  d'activer). Pastille des boutons header = `enabled` propre de
  chaque effet (état de configuration), le hint couvre la nuance
  « configuré mais muet ».
- Factoriser ce qui peut l'être proprement entre panneaux clones
  (composant de panneau enveloppe / panneau LFO paramétrés) — sans
  abstraction préventive au-delà des deux usages réels de chaque.

## Découpage en sous-commits

1. `feat(iter-T/phase-5.1): modèle — ParamEnv généralisé + filterEnv +
   wah + défauts + hydratation + validation .osa`
2. `feat(iter-T/phase-5.2): audio — enveloppe de filtre + wah sur
   biquad.detune (helper d'enveloppe partagé, 4 chemins + signature)`
3. `feat(iter-T/phase-5.3): UI — boutons + panneaux Env. filtre et Wah
   (clones, hint filtre off)`
4. `docs: CONTEXT.md — Iteration T phase 5 (enveloppe de filtre + wah)`
   (+ CONTEXT-ARCHIVE).

## Comportement attendu

- **Le « waouw »** : carré + lowpass 300 Hz Q 8 + env filtre +2400
  cents / 300 ms / décélérée → le filtre s'ouvre à l'attaque et se
  referme — LE son soustractif, sur les 4 chemins et dans le WAV.
- **Wah** : même patch, wah 2 Hz / 1200 cents → wah-wah périodique.
  Env + wah ensemble : le wah ondule autour de la trajectoire de
  l'enveloppe (sommation, comme pitch env + vibrato).
- Inverser et les 4 formes opèrent sur l'env de filtre exactement
  comme sur la Hauteur (mêmes poignées, mêmes glyphes).
- Filtre maître off → les deux effets muets, hint visible, bouton
  « Activer le filtre » opérant (1 cran d'undo).
- Le graphe de réponse (panneau Filtre, T.4) continue d'afficher la
  réponse **statique** (cutoff/q réglés) — il ne tente pas de suivre
  l'enveloppe ou le wah (assumé).
- Patch antérieur → défauts injectés ; round-trip `.osa` v4 ;
  re-schedule live ; undo/redo ; chaîne bit-identique si tout off.
- Perf : 12 notes tenues avec filtre + env + wah → pas de craquement
  notable (1 biquad + 2 nœuds LFO de plus par voix).

## Hors scope (T.5)

- **Keytracking du cutoff** (backloggé en T.4).
- Visualisation animée du cutoff dans le graphe de réponse (sweep en
  temps réel) — joli mais hors scope, à backloguer si l'envie vient.
- Distorsion (T.6), synchro tempo, override par clip.

## Validation manuelle suggérée

Le « waouw » de référence ci-dessus, les 4 formes × Inverser sur
l'env de filtre, wah aux extrêmes (depth 3600, rate 20 → effet
spécial), les 7 effets actifs simultanément (à l'oreille + spectro),
filtre off/on via le hint, timeline + export WAV, round-trip `.osa`,
mobile + overflow du header à 7 boutons, thèmes.
