# Prompt T.6 — Distorsion (WaveShaper par voix : courbe, drive, mix)

## Contexte

Itération T « Effets sans mémoire », phase 6 — la dernière. Distorsion
par **waveshaping par voix** : chaque note est distordue séparément
(pas d'intermodulation entre notes — la variante « somme par patch »
appartiendrait au futur chantier des nœuds persistants, décision de
cadrage). Pas de bump `.osa` (règle v4).

## Spec fonctionnelle

### 1. Modèle de données

- `Patch`/`Editor` += **`distortion`** :
  ```ts
  type Distortion = {
    enabled: boolean
    curve: 'soft' | 'hard' | 'fold'
    drive: number   // 1..50
    mix: number     // 0..1 — dosage wet/dry (1 = tout distordu)
  }
  ```
- `DEFAULT_DISTORTION` : `{ enabled:false, curve:'soft', drive:5,
  mix:1 }`.
- Courbes de transfert (k = drive), normalisées pour que ±1 → ±1 :
  - `soft` : `y = tanh(k·x) / tanh(k)` — saturation chaude ;
  - `hard` : `y = clamp(k·x, −1, 1)` — clipping dur ;
  - `fold` : `y = sin(k·x·π/2)` — wavefolding (à k élevé la courbe
    replie plusieurs fois → timbres métalliques).
- `types.ts`, hydratation, validation `osaFormat`, `libraryTransfer`,
  `DESIGNER_EFFECT_IDS` += `'distortion'` (8ᵉ et dernier bouton),
  `SET_EDITOR_MODULATION` (clés `enabled`/`curve`/`drive`/`mix`).

### 2. Audio — WaveShaper par voix

- **Position dans la chaîne : `osc → shaper → biquad → gain →
  [panner] → suite`** — la disto AVANT le filtre (logique
  soustractive : on enrichit le spectre, le filtre le dompte ensuite ;
  bonus pédagogique : l'enveloppe de filtre et le wah sculptent le
  spectre distordu). À documenter en commentaire.
- Insertion conditionnelle (`enabled && mix > 0`), comme panner/biquad.
- **`oversample = '4x'`** obligatoire : le waveshaping crée des
  harmoniques au-delà de Nyquist → aliasing sans suréchantillonnage
  (précédent : le soft-clip du master, S.audio). À noter : l'alias
  résiduel à drive très élevé sur notes aiguës est accepté (limites
  Web Audio documentées, même esprit que l'iter J).
- **Mix** : split autour du seul shaper — `osc → shaper → wetGain` et
  `osc → dryGain`, les deux sommés vers la suite (biquad ou gain).
  `wetGain.gain = mix`, `dryGain.gain = 1 − mix`. Statique (pas
  d'automation).
- Courbe : `Float32Array` de **2048 points** posée sur
  `shaper.curve`. Mémo simple dans un `lib/distortion.js` (cache de la
  dernière `(curve, drive)` calculée — les voix d'un même patch
  réutilisent le même tableau) ; helper partagé chaîne audio + graphe
  (même esprit que `lib/filter.js`).
- **4 chemins** + **signature scheduler** += `distortion`. Cleanup
  symétrique (shaper/wet/dry sans `.stop()`, comme panner/biquad).
- Niveaux : courbes normalisées (pic ≤ 1) mais la disto **compresse**
  (loudness perçue ↑) — le master headroom-bas absorbe, rien à faire,
  vérifier à l'oreille en polyphonie.

### 3. UI — panneau Distorsion

- Bouton **« Disto »** (8ᵉ), titre de panneau « Distorsion ».
  Pastille/highlight/badge hérités.
- Interrupteur + **switch segmenté 3 courbes** (glyphes SVG custom
  style Lucide des courbes de transfert : S douce / créneau écrêté /
  repli sinueux ; tooltips « Douce / Dure / Repliée ») + steppers
  **Drive** (1..50, step 1, shiftStep 5) et **Mix** (0..1, step 0.05).
- **Graphe de la courbe de transfert** (entrée x ∈ [−1,1] →
  sortie y ∈ [−1,1]) : tracé de la courbe active via le helper
  partagé, **diagonale identité en pointillé** (référence « pas de
  disto »), axes ±1. **Une poignée** : drag vertical → `drive`
  (mapping log 1..50). Pas d'animation (statique, redraw aux
  changements). Discipline standard (draft + un dispatch, Pointer
  Events, géométrie gelée). Effet désactivé → courbe grisée, poignée
  inerte, diagonale seule en accent.

## Découpage en sous-commits

1. `feat(iter-T/phase-6.1): modèle distortion (curve/drive/mix) +
   défauts + hydratation + validation .osa`
2. `feat(iter-T/phase-6.2): audio — WaveShaper 4x par voix
   (osc→shaper→biquad), mix wet/dry, 4 chemins + signature`
3. `feat(iter-T/phase-6.3): UI — bouton + panneau Distorsion (switch 3
   courbes, graphe de transfert à poignée Drive)`
4. `docs: CONTEXT.md — Iteration T phase 6 (distorsion)` (+
   CONTEXT-ARCHIVE).

## Comportement attendu

- Sinus + `soft` drive 15 : chaleur type tube, le spectro montre les
  harmoniques impaires qui apparaissent. `hard` : clipping net,
  spectre plus agressif. `fold` drive 30 : timbre métallique riche.
- `mix` 0.5 : disto parallèle (fondamentale propre + grain) ;
  `mix` 0 ≡ désactivé à l'oreille.
- Disto + filtre : l'enveloppe de filtre balaye le spectre **enrichi**
  (le « waouw » devient hurlant) — démonstration soustractive
  complète.
- Note aiguë (≥ C7) + drive max : aliasing contenu (oversample 4x),
  résiduel accepté.
- Effet désactivé / patch antérieur / round-trip `.osa` v4 /
  re-schedule live / undo : comme les phases précédentes, chaîne
  bit-identique si off.
- Header à 8 boutons : overflow vers le tiroir `⋯` fonctionnel,
  badge agrégé OK, mobile OK.

## Hors scope (T.6)

- Disto « sur la somme » par patch (intermodulation) → chantier
  effets à mémoire / nœuds persistants.
- Courbes asymétriques, bias, tone stack — non cadrés.
- Drive modulable (enveloppe/LFO sur le drive) : techniquement
  possible (mais le `curve` d'un WaveShaper n'est pas un AudioParam —
  il faudrait moduler un gain d'entrée), à noter au backlog
  « inattendus » si l'envie vient.

## Validation manuelle suggérée

3 courbes × drive bas/haut, mix 0/0.5/1, au casque et au spectro ;
polyphonie 6+ notes distordues (niveaux, pas de pompage) ; disto +
les 7 autres effets ensemble ; timeline + export WAV (le rendu
offline passe par le même chemin) ; round-trip `.osa` ; mobile +
overflow 8 boutons ; thèmes.
