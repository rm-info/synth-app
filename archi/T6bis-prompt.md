# Prompt T.6bis — Distorsion vivante : courbe effective (mix) + enveloppe de drive

## Contexte

Suite de T.6 (livré). Deux constats d'usage :
1. Le stepper **Mix** n'est pas lisible sur le graphe (qui trace la
   courbe wet pure).
2. La disto **statique** (entrée à niveau constant) équivaut, pour une
   note tenue, à redessiner la forme d'onde. Son intérêt musical
   historique — le timbre qui **évolue dans la note** — exige que
   quelque chose varie à travers la non-linéarité. On ajoute donc une
   **enveloppe de drive** : un gain d'entrée du shaper piloté par le
   pattern `ParamEnv` existant.

Périmètre : toujours sans mémoire (GainNode + automation), pas de bump
`.osa`. La variante **LFO sur le drive** reste au backlog
« inattendus » (hors scope ici).

## Spec fonctionnelle

### 1. Graphe : courbe de transfert effective (mix)

- La courbe **accent** devient la courbe **effective** :
  `y = mix·f(x) + (1−mix)·x` — ce qui est réellement entendu. À
  `mix:1` elle coïncide avec f ; en baissant le mix elle se couche
  visiblement vers la diagonale identité.
- Quand `mix < 1`, tracer en plus la **wet pure** `f(x)` en gris
  discret (même convention que la « normalisée » du canvas Forme
  d'onde). Diagonale identité pointillée inchangée.
- La poignée Drive continue de manipuler `drive` sur la courbe
  effective.

### 2. Enveloppe de drive — modèle

- **Principe (à documenter en commentaire)** : la courbe d'un
  `WaveShaperNode` n'est pas un `AudioParam` — on ne module pas `k`.
  Le standard : courbe figée + **gain d'entrée modulé**
  (`inputGain.gain`, base 1) ; le drive effectif suit le niveau
  d'entrée.
- `Patch`/`Editor` += **`driveEnv: ParamEnv`** (le type T.5) —
  `amount` = **décalage du gain d'entrée**, −1..+1 (gain résultant
  clampé ≥ 0 ; > 1 sur-attaque la courbe, assumé et amusant sur
  `fold`) ; `time` 0..2000 ms ; `invert`/`curve` standard.
- `DEFAULT_DRIVEENV` : `{ enabled:false, amount:−0.8, time:300,
  invert:true, curve:'linear' }` — **invert par défaut** : part du
  drive nominal (attaque saturée) et s'éclaircit vers `1+amount` =
  0.2, où la note reste. C'est le comportement « ampli » (l'attaque
  croustille, la tenue se nettoie) ; le mode normal donne l'inverse
  (swell into saturation). Choix documenté.
- Mécanique standard : `types.ts`, hydratation, validation `osaFormat`
  (bornes propres), `libraryTransfer`, `DESIGNER_EFFECT_IDS` +=
  `'driveEnv'` (9ᵉ bouton, après Disto), `SET_EDITOR_MODULATION`.

### 3. Audio

- Routage quand `distortion.enabled && driveEnv.enabled` :
  **`osc → inputGain → shaper → …`** (inputGain inséré par
  l'appelant, comme panner/biquad — sinon `osc → shaper` direct
  inchangé).
- `applyModulation` : signature += `inputGain` (optionnel) +
  `driveEnv` ; **`scheduleParamEnv(inputGain.gain, driveEnv,
  startTime)`** avec base 1 (normal : part de `1+amount` → rejoint 1 ;
  invert : part de 1 → va vers `1+amount` et y reste). Les 4 formes et
  Inverser opèrent — une seule implémentation, toujours.
- 4 chemins + **signature scheduler** += `driveEnv`. Cleanup
  symétrique (pas de `.stop()`).
- Niveau : moduler l'entrée d'une courbe normalisée module aussi la
  sortie (drive bas = plus doux ET moins fort) — inhérent au drive
  réel, assumé, pas de compensation.

### 4. UI — panneau « Env. drive »

- Clone du panneau Env. filtre : interrupteur, Inverser, switch 4
  formes, steppers **Départ** (−1..+1, step 0.05) / **Durée** (ms),
  graphe d'enveloppe 2 poignées (médiane = drive nominal).
- **Hint disto désactivée** : reprise du pattern T.5 — « La distorsion
  est désactivée — cet effet est muet » + bouton inline « Activer la
  distorsion ». Gating sur `distortion.enabled` (et il est inerte
  aussi si `mix` 0, pas de hint dédié pour ça).
- Header à 9 boutons : rien à faire, l'OverflowToolbar absorbe.

## Découpage en sous-commits

1. `feat(iter-T/phase-6.4): graphe disto — courbe effective (mix) +
   wet pure en repère`
2. `feat(iter-T/phase-6.5): modèle + audio driveEnv (gain d'entrée du
   shaper, ParamEnv, 4 chemins + signature)`
3. `feat(iter-T/phase-6.6): UI — bouton + panneau Env. drive (clone,
   hint disto off)`
4. `docs: CONTEXT.md — Iteration T phase 6.4–6.6 (disto : mix lisible +
   enveloppe de drive)` (+ CONTEXT-ARCHIVE).

## Comportement attendu

- Mix 0.5 : la courbe accent se couche à mi-chemin de la diagonale,
  la wet pure reste visible en gris ; mix 1 : courbes confondues,
  gris absent.
- Défauts Env. drive activés sur un carré + soft drive 15 : attaque
  saturée qui **s'éclaircit** en ~300 ms — timbre vivant dans la
  note, sur les 4 chemins et au WAV. Mode normal : crescendo de
  saturation. Les 4 formes changent le caractère de la transition.
- Env. drive + env. filtre + AHDSR : trois enveloppes indépendantes
  qui sculptent la même note (démo synthèse soustractive complète).
- Disto off → Env. drive muet + hint ; patch antérieur → défaut
  injecté ; round-trip `.osa` v4 ; re-schedule live ; undo ; chaîne
  bit-identique si tout off.

## Hors scope

- **LFO sur le drive** (AM/effets spéciaux) — backlog « inattendus ».
- Compensation de loudness du drive, courbes asymétriques/bias.
- C'était la dernière brique de T : la **clôture d'itération**
  (release, condensation CONTEXT, roadmap → archive) fera l'objet du
  prompt suivant, ne pas l'anticiper ici.

## Validation manuelle suggérée

Mix 0/0.5/1 au graphe et à l'oreille ; Env. drive défauts (invert) vs
mode normal, 4 formes ; drive env + trémolo (interaction de niveau
post-gain : aucune — l'inputGain est pré-shaper, le trémolo
post-shaper, vérifier que ça reste propre) ; les 9 effets ensemble ;
timeline + export ; `.osa` ; mobile 9 boutons ; thèmes.
