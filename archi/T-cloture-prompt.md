# Prompt — Clôture de l'itération T (release v1.12.0)

## Contexte

L'itération T « Effets sans mémoire » est fonctionnellement complète et
validée : phases 1 → 6.9 livrées. Protocole de clôture habituel
(2 fichiers de contexte + release).

Rappel du périmètre livré (pour les résumés) :
- **T.1** — module « Effets » : switcher header (boutons + pastille
  activé + badge tiroir + clic = édition seule), un panneau à la fois.
- **T.2** — auto-pan (3ᵉ LFO, `StereoPannerNode` conditionnel par
  voix) + **bump `.osa` v4** (unique de l'itération, champ absent →
  défaut injecté).
- **T.3 / 3.4 / 3.5** — pitch envelope (`ParamEnv` → `osc.detune`) +
  mode Inverser + 4 formes de progression (`pitchProgression`,
  `setValueCurveAtTime`).
- **T.4** — filtre statique (`BiquadFilterNode` par voix,
  VCO→VCF→VCA, double mapping Q dB/linéaire via `lib/filter.js`
  partagé audio/graphe) + graphe de réponse en fréquence à poignée 2D
  + `NumberInput` `stepFactor` (steppers multiplicatifs).
- **T.5** — enveloppe de filtre + wah sur `biquad.detune`
  (`scheduleParamEnv` partagé, panneaux clones, hint filtre off).
- **T.6 / 6.4–6.9** — distorsion (WaveShaper 4x par voix, 3 courbes,
  mix wet/dry, `lib/distortion.js` partagé) + enveloppe de drive
  (gain d'entrée) + courbe effective + poignée 2D unique Drive/Mix au
  point caractéristique, drive continu.

Soit **9 effets par patch** dans le module Effets : vibrato, trémolo
(iter P), auto-pan, hauteur, filtre, env. filtre, wah, disto,
env. drive.

## À faire

### 1. Release v1.12.0

- Bump `package.json` → `1.12.0` (+ tout endroit où la version d'app
  est affichée/lue — trayFooter du header compact, etc. : vérifier
  qu'elle est lue dynamiquement, sinon mettre à jour).
- Commit : `feat(v1.12.0): Iteration T — effets sans mémoire
  (auto-pan, pitch env + formes, filtre + env + wah, disto vivante ;
  module Effets switcher, .osa v4)` (même format que la clôture S).

### 2. `CONTEXT.md` (brief vivant, par remplacement)

- **Tableau des itérations** (TL;DR) : une ligne T, concise —
  « Effets sans mémoire : module Effets (9 effets par patch),
  auto-pan, pitch env (Inverser + 4 formes), filtre + env + wah,
  disto vivante (env. drive, poignée 2D) — .osa v4 — v1.12.0 ». Le
  TL;DR reste court.
- **État actuel** : « Iteration T close (release v1.12.0) — entre deux
  itérations », résumé 4-6 lignes max, renvoi à l'archive.
- **Roadmap & Backlog** : remplacer la section d'itération par
  « Entre deux itérations (depuis la clôture de T, 2026-06-12) » ;
  prochaines pistes non cadrées = vague « inattendus » (ring mod, FM,
  LFO drive, fall au release, keytracking…) OU gros chantier « effets
  à mémoire » (delay-based, nœuds persistants + queues) — cf.
  `archi/BACKLOG.md`.
- **Décisions architecturales** (réécriture sur place, pas
  d'empilement) : intégrer/consolider les décisions de T qui
  méritent d'y rester — helper-par-lib partagé audio/graphe
  (`filter.js`/`distortion.js`/`pitchProgression` : « ce qu'on voit =
  ce qu'on entend » structurel), insertion conditionnelle des nœuds
  par l'appelant (panner/biquad/shaper/inputGain — chaîne
  bit-identique si off), règle `.osa` v4 unique + défauts injectés,
  ParamEnv généralisé. Élaguer ce qui est devenu redondant.
- Sections Composants/Architecture audio : passe de cohérence (le
  détail par-phase accumulé peut être condensé maintenant que
  l'itération est close — garder l'état final, pas la chronologie).

### 3. `CONTEXT-ARCHIVE.md` (trace, par append)

- Déplacer le détail de la roadmap T depuis `CONTEXT.md` vers
  `## Roadmaps des itérations closes`.
- Ajouter la section `## Itération terminée : T` (saga courte : du
  cadrage « tour du sans-mémoire » aux rectificatifs disto, y compris
  les leçons — poignée au point caractéristique, drive continu).
- Entrées d'historique au fil de l'eau si manquantes.

### 4. Commit doc

- `docs: CONTEXT.md + CONTEXT-ARCHIVE.md — cloture Iteration T
  (release v1.12.0)`.

## Hors scope

- Aucun changement de code fonctionnel (la release n'embarque que le
  bump de version).
- Pas de rédaction d'articles Documentation sur les effets (domaine
  writer, sera cadré à part si souhaité).
- `archi/BACKLOG.md` : déjà condensé par l'archi, n'y touche pas.
