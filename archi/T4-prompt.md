# Prompt T.4 — Filtre statique (BiquadFilter par voix : type, fréquence, résonance + graphe de réponse)

## Contexte

Itération T « Effets sans mémoire », phase 4 — la plus grosse de
l'itération : premier `BiquadFilterNode` dans la chaîne de voix, et
premier **graphe fréquentiel** du module Effets (courbe de réponse du
filtre, éditable). T.5 ajoutera l'enveloppe de cutoff + le wah sur ce
socle. Pas de bump `.osa` (règle v4 : champ absent → défaut injecté).

## Spec fonctionnelle

### 1. Modèle de données

- `Patch` et `Editor` += **`filter`** :
  ```ts
  type PatchFilter = {
    enabled: boolean
    type: 'lowpass' | 'highpass' | 'bandpass' | 'notch'
    cutoff: number   // Hz, 20..20000
    q: number        // résonance LINÉAIRE, 0.1..20 (cf. mapping §2)
  }
  ```
- `DEFAULT_FILTER` : `{ enabled:false, type:'lowpass', cutoff:2000, q:1 }`.
- `types.ts`, hydratation localStorage, validation `osaFormat` (enum
  type + bornes), `libraryTransfer` — même mécanique que T.2.1/T.3.1.
- Édition via `SET_EDITOR_MODULATION` (`effect:'filter'`, clés
  `enabled`/`type`/`cutoff`/`q`, clamps ci-dessus), undoable.
- `DESIGNER_EFFECT_IDS` += `'filter'`.

### 2. Audio — biquad par voix

- **⚠ Piège d'unité `Q` (à documenter en commentaire)** : dans la spec
  Web Audio, le `Q` d'un biquad est **en dB pour lowpass/highpass** et
  **linéaire (facteur de qualité) pour bandpass/notch**. Le modèle
  stocke un `q` linéaire unique ; la couche audio convertit :
  - lowpass/highpass : `biquad.Q.value = 20 * Math.log10(q)` ;
  - bandpass/notch : `biquad.Q.value = q`.
  Ainsi `q:1` ≈ neutre partout, `q:20` ≈ +26 dB de pic en LP/HP. Le
  graphe de mesure (§4) DOIT appliquer le même mapping, sinon il ment.
- **Insertion conditionnelle** (`filter.enabled`) dans la chaîne de
  voix : **`osc → biquad → gain (AHDSR) → [panner] → suite`** —
  convention synthé VCO→VCF→VCA (filtrer avant le gain d'enveloppe
  évite de lisser les transitoires d'enveloppe dans le filtre).
  Désactivé → aucun nœud, chaîne bit-identique.
- Statique : `type`, `frequency` (cutoff), `Q` posés à la création de
  la voix. Pas d'automation (T.5).
- **4 chemins de synthèse** + **signature scheduler** += `filter`
  (re-schedule live). Cleanup symétrique : biquad déconnecté partout
  où l'`osc` l'est (pas de `.stop()`, comme le panner — `stopModNodes`
  tolère déjà).
- **Niveaux** : à résonance haute le biquad **ajoute** du gain au
  cutoff (jusqu'à ~+26 dB). Le filet est le master headroom-bas +
  soft-clip (iter S) — rien à faire, mais le noter en commentaire et
  vérifier à l'oreille qu'un patch résonant ne déclenche pas de
  pompage (il n'y en a pas : WaveShaper sans mémoire).

### 3. UI — panneau Filtre (hors graphe)

- Bouton **« Filtre »** en 5ᵉ position du header Effets
  (pastille/highlight/badge hérités de T.1).
- Panneau : interrupteur on/off + **switch segmenté 4 types** (glyphes
  SVG custom style Lucide des réponses LP/HP/BP/notch, tooltips
  « Passe-bas / Passe-haut / Passe-bande / Coupe-bande ») + 2
  `NumberInput` : **Fréquence** (Hz) et **Résonance** (0.1–20, step
  0.1, shiftStep 1).
- **Steppers de Fréquence multiplicatifs** : un pas fixe est
  inutilisable sur 20–20000 Hz. Étendre `NumberInput` d'une prop
  **opt-in** `stepFactor` (chevron = ×/÷ le facteur ; proposé
  2^(1/12) = un demi-ton, Shift = 2 = une octave — pas musicaux,
  pédagogiquement cohérents). Même esprit d'extension que
  `triggerBadge` en T.1 : les usages existants inchangés. Saisie
  libre au clavier inchangée.

### 4. Graphe de réponse en fréquence (le gros morceau)

- **Tracé** : `BiquadFilterNode.getFrequencyResponse(freqs, mag,
  phase)` sur un **biquad de mesure** jamais connecté au graphe audio
  (créé sur le contexte existant du Designer), configuré avec le
  **même mapping Q** que §2. ~128 fréquences échantillonnées en log
  sur 20 Hz–20 kHz.
- **Axes** : X log 20–20k (même convention que l'échelle log du
  spectrogramme ; repères étiquetés 100 / 1k / 10k), Y en dB
  (magnitude → `20·log10`), fenêtre −30..+30 dB, ligne **0 dB**
  accentuée. Marges/gouttières : réutiliser les conventions
  `lib/canvas` existantes.
- **Une poignée 2D unique** au point de cutoff sur la courbe : drag
  horizontal (log) → `cutoff`, drag vertical → `q` (mapping log
  0.1–20). Précédent : P1/P2 de l'AHDSR sont déjà des poignées 2D.
  Cercle isotrope, curseur grab/grabbing, tooltip de rôle
  (« Fréquence / Résonance »), draft local pendant le drag + **un
  dispatch au relâchement**, géométrie gelée au pointerdown — toute la
  discipline T.1/AHDSR. Pointer Events + `setPointerCapture` +
  `pointercancel` (conventions iter S).
- **Pas d'animation** : redraw uniquement aux changements
  (type/cutoff/q/draft/thème/resize). La boucle rAF du module ignore
  ce panneau (comme le panneau Hauteur).
- Effet désactivé : courbe en gris atténué (médiane morte comme les
  LFO désactivés), poignée inerte.

## Découpage en sous-commits

1. `feat(iter-T/phase-4.1): modèle filter (type/cutoff/q) + défauts +
   hydratation + validation .osa`
2. `feat(iter-T/phase-4.2): audio — BiquadFilter conditionnel par voix
   (VCO→VCF→VCA), mapping Q dB/linéaire, 4 chemins + signature`
3. `feat(iter-T/phase-4.3): UI — bouton + panneau Filtre (switch 4
   types, steppers, NumberInput stepFactor)`
4. `feat(iter-T/phase-4.4): graphe de réponse en fréquence à poignée 2D
   (getFrequencyResponse)`
5. `docs: CONTEXT.md — Iteration T phase 4 (filtre statique)` (+
   CONTEXT-ARCHIVE).

## Comportement attendu

- Carré + lowpass 500 Hz : adoucissement net, audible sur les 4
  chemins et dans le WAV. Monter la résonance → pic sifflant au
  cutoff. Highpass 2 kHz sur le même patch → squelette aigu.
  Bandpass/notch cohérents (Q linéaire : bande qui se resserre quand
  q monte).
- **Le graphe colle à l'audio** : à type/cutoff/q égaux, ce qu'on voit
  (pic, pente, creux) correspond à ce qu'on entend — y compris le pic
  de résonance LP/HP (validation du double mapping Q).
- Drag de la poignée : cutoff suit en log (la même excursion de souris
  déplace d'une octave partout), q en vertical ; un seul cran d'undo
  par geste ; steppers et graphe synchronisés.
- Effet désactivé → chaîne bit-identique ; patch antérieur
  rechargé/importé → `DEFAULT_FILTER` ; round-trip `.osa` v4.
- Édition pendant lecture → re-schedule. 12 notes tenues + résonance
  haute → pas de pompage (soft-clip sans mémoire), pas de saturation
  brutale.
- Combinaisons : filtre + vibrato/pitch env (le sweep de hauteur
  traverse un filtre résonant fixe → le timbre change avec la
  hauteur — comportement attendu et pédagogiquement intéressant),
  filtre + auto-pan, filtre + trémolo.

## Hors scope (T.4)

- **Enveloppe de cutoff + wah (LFO)** : T.5.
- **Keytracking du cutoff** (cutoff suivant la hauteur de la note —
  classique synthé) : à noter au backlog, non cadré.
- Types `peaking`/`shelving`/`allpass`, gain de filtre, pente
  variable (12/24 dB), distorsion (T.6).
- Indicateur d'effets côté Composer (backlog).

## Validation manuelle suggérée

Les 4 types × résonance basse/haute, à l'oreille ET au spectrogramme
(le spectro est en amont du master : il montre la vraie somme
filtrée — comparer le pic de résonance affiché par le graphe et la
bosse correspondante au spectro). Drag poignée (bords : 20 Hz,
20 kHz, q min/max), steppers multiplicatifs, saisie libre. Timeline
multipiste + export WAV. Round-trip `.osa`. Mobile (panneau dans le
switcher, drag tactile de la poignée). Thèmes clair/sombre.
