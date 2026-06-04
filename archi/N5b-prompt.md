# Prompt dev — Itération N · Phase 5b : moteur de formes (idéal + band-limité)

**Type** : `feat(iter-N/phase-5b)`. Capacité interne **purement additive** : on
ajoute les fonctions qui génèrent les formes, **sans changer aucun comportement
visible** (la barre actuelle et son `generatePresetPoints` continuent de marcher).
N.5c branchera ce moteur dans la modale.

## Objectif

Fournir, pour chaque forme classique, les deux canonicals du modèle verrouillé :
- **Idéale** : la forme brute (plate/droite), telle qu'aujourd'hui.
- **Band-limitée** : la reconstruction **en phase naturelle** des N premières
  harmoniques (ondulée/arrondie, ressemble à la forme, see=audio honnête).

## Déliverables (pures, dans un lib — ex. `src/lib/waveforms.js`)

Déplacer `generatePresetPoints` (actuellement dans `WaveformEditor.jsx`) vers ce
lib et l'enrichir. Trois fonctions pures (600 points, convention `points` du
projet, pas de mutation) :

1. **`idealWaveform(type)`** → 600 points de la forme brute.
   `'sine'` = `sin(2πt)` ; `'square'` = `t<0.5 ? 1 : -1` ; `'sawtooth'` = `2t−1` ;
   `'triangle'` = `t<0.5 ? 4t−1 : 3−4t`. (= l'actuel `generatePresetPoints`.)

2. **`bandlimitWaveform(points, N)`** → 600 points, reconstruction des harmoniques
   `1..N` **par DFT directe sur la grille native 600** (pas via la FFT 512 → pas
   de leakage, on évite le mismatch #12) :
   ```
   pour k = 1..N :
     a_k = (2/600) Σ_i points[i]·cos(2π k i/600)
     b_k = (2/600) Σ_i points[i]·sin(2π k i/600)
   reconstruction[i] = Σ_{k=1..N} a_k·cos(2π k i/600) + b_k·sin(2π k i/600)
   ```
   O(N·600) analyse + O(N·600) synthèse ≈ sub-ms pour N ≤ 256. **Phase naturelle**
   conservée (les `a_k`/`b_k` portent la phase réelle de la forme → triangle
   arrondi, pas une bosse abstraite). Générique (marche pour une forme quelconque).

3. **`bandlimitedWaveform(type, N)`** → `bandlimitWaveform(idealWaveform(type), N)`,
   **normalisé pour que la plus grande magnitude d'harmonique = 1** (→ barres
   honnêtes, pas de clamp). C'est purement de l'amplitude d'affichage : l'audio est
   normalisé à la lecture (`disableNormalization: false`), donc idéal et
   band-limité **sonnent pareil à N égal** — la normalisation ne change que le dessin.

## Notes de cohérence

- `bandlimitedWaveform('square', 16)` doit redonner la forme du preset
  « carré sinusoïdal » actuel de `lib/presets.js` (`[1,0,1/3,…,1/15]`, a1=1) — bon
  test de non-régression.
- `bandlimitedWaveform('sine', 1)` = sinus pur (le sinus n'a qu'une vue).
- Les barres du band-limité resteront propres à l'affichage : `canonicalToBars`
  passe par la FFT 512 (un peu de leakage) mais le **snap `HARMONIC_EPSILON`**
  (N.1.2) écrase les harmoniques parasites sub-1e-4 → barres nettes.

## Hors scope (→ N.5c)

- La modale (vignettes, N éditable, snapping, anchorCount), le **retrait de la
  barre** (point 1), le câblage reducer/chargement. N.5b n'ajoute **que** les
  fonctions ; rien ne les appelle encore en prod (sauf, si tu veux, rebrancher la
  barre actuelle sur `idealWaveform` pour valider le déplacement — comportement
  identique).

## Vérifications

- `bandlimitedWaveform('square', 16)` ≈ preset carré sinusoïdal actuel (forme).
- `bandlimitedWaveform('triangle', N)` ressemble à un **triangle arrondi** (phase
  naturelle), pas à une bosse sinus-phase.
- DFT directe 600 : pas de leakage (un sin pur d'harmonique k rendu et ré-analysé
  redonne k seul).
- `npm run build && npm run lint && npm run typecheck` verts. Aucun comportement
  UI changé.
- MAJ `CONTEXT.md` + backlog. Commit `feat(iter-N/phase-5b): …`, push.
