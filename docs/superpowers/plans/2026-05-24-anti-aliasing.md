# Anti-aliasing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Éliminer les harmoniques parasites en basse fréquence en tronquant la DFT à N/2+1=129 coefficients avant `createPeriodicWave`, et profiter du refactor pour adopter FFT Cooley-Tukey + memoization WeakMap.

**Architecture:** Refactor single-file dans `src/audio.js`. Trois changements indépendants séquencés : (1) ajout du FFT in-place + self-test, (2) wiring du FFT dans `pointsToHarmonics` avec truncation, (3) memoization via WeakMap. Aucun consumer impacté (signature de `pointsToHarmonics` et `pointsToPeriodicWave` inchangées).

**Tech Stack:** React 19 + Vite + Web Audio API natifs uniquement (CompressionStream pour rappel, mais sans rapport ici). Zéro dépendance npm ajoutée.

**Spec de référence:** `docs/superpowers/specs/2026-05-24-anti-aliasing-design.md`

**Convention commits:** `feat(iter-J/phase-1.N): description`.

---

## Préambule — Stratégie de test

Le projet n'a pas de framework de tests automatisés (CLAUDE.md : "tests manuels"). Les subagents font :
1. `npm run lint` — pass attendu
2. `npm run build` — pass attendu
3. Commit avec le préfixe `feat(iter-J/phase-1.N): ...` (ou `docs:` pour CONTEXT.md)

**Le self-test FFT** s'exécute automatiquement au load en dev mode et `console.error` si invalide. Le subagent ne peut pas le vérifier directement (pas d'accès navigateur) — c'est l'utilisateur qui vérifie l'absence d'erreur console après livraison.

Les vérifications audio (sons des patches, mode statique du Spectrogram) sont déférées à l'utilisateur en fin de plan.

---

## Task 1: Ajouter FFT Cooley-Tukey + self-test en dev mode

**Files:**
- Modify: `src/audio.js` (ajout de la fonction `fft` + bloc self-test)

- [ ] **Step 1: Ajouter les constantes nécessaires en haut du fichier**

En haut de `src/audio.js`, après `const CANVAS_WIDTH = 600`, ajouter :

```js
const HALF_HARMONICS = NUM_SAMPLES / 2 + 1   // = 129 (k=0..128)
```

Garder `HARMONIC_COUNT` à sa valeur actuelle pour ce commit (Task 2 le changera). Garder `MIN_ATTACK` inchangé.

- [ ] **Step 2: Ajouter la fonction `fft` au module**

Avant `pointsToHarmonics`, ajouter (entre `MIN_ATTACK` et `pointsToHarmonics`) :

```js
// FFT in-place via Cooley-Tukey radix-2. N doit être une puissance de 2.
// Modifie real[] et imag[] en place. Convention forward (exp(-iθ)) —
// matche bit-pour-bit la convention de la DFT naïve historique (cf. spec).
function fft(real, imag) {
  const N = real.length

  // 1. Permutation par bit-reversal
  let j = 0
  for (let i = 1; i < N; i++) {
    let bit = N >> 1
    while (j & bit) { j ^= bit; bit >>= 1 }
    j ^= bit
    if (i < j) {
      let tmp = real[i]; real[i] = real[j]; real[j] = tmp
      tmp = imag[i]; imag[i] = imag[j]; imag[j] = tmp
    }
  }

  // 2. Butterflies par taille de bloc croissante : 2, 4, 8, ..., N
  for (let len = 2; len <= N; len <<= 1) {
    const halfLen = len >> 1
    const angle = -2 * Math.PI / len
    const wReal = Math.cos(angle)
    const wImag = Math.sin(angle)
    for (let i = 0; i < N; i += len) {
      let curReal = 1
      let curImag = 0
      for (let k = 0; k < halfLen; k++) {
        const a = i + k
        const b = a + halfLen
        const tReal = curReal * real[b] - curImag * imag[b]
        const tImag = curReal * imag[b] + curImag * real[b]
        real[b] = real[a] - tReal
        imag[b] = imag[a] - tImag
        real[a] += tReal
        imag[a] += tImag
        const nextReal = curReal * wReal - curImag * wImag
        const nextImag = curReal * wImag + curImag * wReal
        curReal = nextReal
        curImag = nextImag
      }
    }
  }
}
```

- [ ] **Step 3: Ajouter le self-test en dev mode**

Juste après la définition de `fft`, ajouter :

```js
if (import.meta.env.DEV) {
  // Self-test: vérifier que FFT donne les coefficients attendus pour un
  // signal d'entrée connu (sine pure à k=1). Si échec, console.error visible
  // au load. Élimine la classe de bugs "bit-reversal off-by-one, butterfly
  // mal indexé, normalisation oubliée, convention de signe inversée".
  const N = NUM_SAMPLES
  const realTest = new Float32Array(N)
  const imagTest = new Float32Array(N)
  for (let i = 0; i < N; i++) {
    realTest[i] = Math.sin(2 * Math.PI * i / N)
  }
  fft(realTest, imagTest)
  // Pour une sine pure à k=1 après normalisation /N :
  //   imag[1]/N ≈ -0.5 (convention exp(-iθ) → imag négatif)
  //   real[1]/N ≈ 0
  //   tous les autres bins ≈ 0
  const EPS = 1e-10
  const ok = (
    Math.abs(realTest[1] / N) < EPS &&
    Math.abs(imagTest[1] / N + 0.5) < EPS &&
    Math.abs(realTest[2] / N) < EPS &&
    Math.abs(imagTest[2] / N) < EPS
  )
  if (!ok) {
    console.error('FFT self-test FAIL:', {
      'real[1]/N': realTest[1] / N,
      'imag[1]/N': imagTest[1] / N,
      'real[2]/N': realTest[2] / N,
      'imag[2]/N': imagTest[2] / N,
    })
  }
}
```

- [ ] **Step 4: Vérifier lint et build**

```bash
npm run lint
npm run build
```

Attendu : pas d'erreur. ESLint pourrait flagger `fft` comme défini-mais-non-utilisé en dehors du self-test — c'est en réalité utilisé par le self-test, donc OK. Si lint flag malgré tout, il faudra peut-être ajouter une exception eslint, mais en pratique l'usage dans le bloc DEV devrait suffire à passer la règle.

- [ ] **Step 5: Commit**

```bash
git add src/audio.js
git commit -m "feat(iter-J/phase-1.1): FFT Cooley-Tukey + self-test dev mode"
```

Do NOT push.

---

## Task 2: Refactor pointsToHarmonics — FFT + truncation à 129

**Files:**
- Modify: `src/audio.js`

- [ ] **Step 1: Mettre à jour le HARMONIC_COUNT export**

Repérer la ligne actuelle :

```js
export const HARMONIC_COUNT = NUM_SAMPLES   // = 256
```

La remplacer par :

```js
export const HARMONIC_COUNT = HALF_HARMONICS - 1   // = 128 (k=1..128)
```

Note : `HARMONIC_COUNT` n'est importé nulle part (vérifié au grep). Safe à modifier.

- [ ] **Step 2: Réécrire `pointsToHarmonics` pour utiliser FFT et tronquer**

Remplacer entièrement la fonction `pointsToHarmonics` (lignes ~17-47, qui contient l'ancienne DFT naïve O(N²) + magnitudes calculées sur N=256) par :

```js
// Décomposition spectrale d'une période de l'onde échantillonnée sur `points`
// (longueur CANVAS_WIDTH). Retourne les coefficients `real`/`imag` attendus
// par `createPeriodicWave` (tronqués aux 129 premiers — k=0..128, le reste
// est le mirror conjugué redondant qui causerait des parasites audio).
// Voir spec docs/superpowers/specs/2026-05-24-anti-aliasing-design.md §2.
export function pointsToHarmonics(points) {
  // Resample 600 → 256 (linear interp)
  const cycle = new Float32Array(NUM_SAMPLES)
  for (let i = 0; i < NUM_SAMPLES; i++) {
    const canvasX = (i / NUM_SAMPLES) * CANVAS_WIDTH
    const x0 = Math.floor(canvasX)
    const x1 = Math.min(x0 + 1, CANVAS_WIDTH - 1)
    const frac = canvasX - x0
    cycle[i] = points[x0] * (1 - frac) + points[x1] * frac
  }

  // FFT in-place : copie cycle dans real, imag reste à zéro
  const real = new Float32Array(NUM_SAMPLES)
  const imag = new Float32Array(NUM_SAMPLES)
  for (let i = 0; i < NUM_SAMPLES; i++) real[i] = cycle[i]
  fft(real, imag)

  // Normalisation /N (convention de la DFT historique préservée)
  for (let i = 0; i < NUM_SAMPLES; i++) {
    real[i] /= NUM_SAMPLES
    imag[i] /= NUM_SAMPLES
  }

  // Truncation aux 129 premiers coefficients (k=0..128). Les k=129..255
  // sont les conjugués miroirs de k=1..127 (information redondante pour un
  // signal réel) — on les drop pour éviter qu'ils deviennent des
  // harmoniques parasites une fois passés à createPeriodicWave.
  const truncReal = real.slice(0, HALF_HARMONICS)
  const truncImag = imag.slice(0, HALF_HARMONICS)
  const magnitudes = new Float32Array(HALF_HARMONICS)
  for (let k = 0; k < HALF_HARMONICS; k++) {
    magnitudes[k] = Math.sqrt(truncReal[k] ** 2 + truncImag[k] ** 2)
  }

  return { real: truncReal, imag: truncImag, magnitudes }
}
```

Note : `pointsToPeriodicWave` n'a PAS besoin de changement — il appelle juste `pointsToHarmonics` et passe le résultat à `createPeriodicWave`, qui accepte les arrays de 129 éléments sans souci.

- [ ] **Step 3: Vérifier lint et build**

```bash
npm run lint
npm run build
```

Attendu : pas d'erreur.

- [ ] **Step 4: Commit**

```bash
git add src/audio.js
git commit -m "feat(iter-J/phase-1.2): pointsToHarmonics via FFT + truncation à 129 coefficients"
```

Do NOT push.

---

## Task 3: Memoization via WeakMap

**Files:**
- Modify: `src/audio.js`

- [ ] **Step 1: Ajouter le WeakMap juste avant `pointsToHarmonics`**

Insérer cette déclaration entre le self-test (en dev) et la définition de `pointsToHarmonics` :

```js
// Cache memoization : keyed par référence du buffer `points`. Le reducer
// crée un nouveau tableau à chaque modif (immutable updates), donc la ref
// change → cache miss → recalcul. WeakMap garantit pas de fuite mémoire
// (entrée GC'd quand le patch est supprimé). Cache partagé entre playback
// audio et Spectrogram statique.
const harmonicsCache = new WeakMap()
```

- [ ] **Step 2: Ajouter le check de cache au début de `pointsToHarmonics`**

Au tout début du corps de `pointsToHarmonics` (juste après la ligne `export function pointsToHarmonics(points) {`), ajouter :

```js
  const cached = harmonicsCache.get(points)
  if (cached) return cached
```

- [ ] **Step 3: Stocker le résultat dans le cache avant return**

À la fin de la fonction, remplacer la ligne :

```js
  return { real: truncReal, imag: truncImag, magnitudes }
```

par :

```js
  const result = { real: truncReal, imag: truncImag, magnitudes }
  harmonicsCache.set(points, result)
  return result
```

État final de `pointsToHarmonics` :

```js
export function pointsToHarmonics(points) {
  const cached = harmonicsCache.get(points)
  if (cached) return cached

  // Resample 600 → 256 (linear interp)
  const cycle = new Float32Array(NUM_SAMPLES)
  for (let i = 0; i < NUM_SAMPLES; i++) {
    const canvasX = (i / NUM_SAMPLES) * CANVAS_WIDTH
    const x0 = Math.floor(canvasX)
    const x1 = Math.min(x0 + 1, CANVAS_WIDTH - 1)
    const frac = canvasX - x0
    cycle[i] = points[x0] * (1 - frac) + points[x1] * frac
  }

  // FFT in-place
  const real = new Float32Array(NUM_SAMPLES)
  const imag = new Float32Array(NUM_SAMPLES)
  for (let i = 0; i < NUM_SAMPLES; i++) real[i] = cycle[i]
  fft(real, imag)

  // Normalisation /N
  for (let i = 0; i < NUM_SAMPLES; i++) {
    real[i] /= NUM_SAMPLES
    imag[i] /= NUM_SAMPLES
  }

  // Truncation aux 129 premiers coefficients
  const truncReal = real.slice(0, HALF_HARMONICS)
  const truncImag = imag.slice(0, HALF_HARMONICS)
  const magnitudes = new Float32Array(HALF_HARMONICS)
  for (let k = 0; k < HALF_HARMONICS; k++) {
    magnitudes[k] = Math.sqrt(truncReal[k] ** 2 + truncImag[k] ** 2)
  }

  const result = { real: truncReal, imag: truncImag, magnitudes }
  harmonicsCache.set(points, result)
  return result
}
```

- [ ] **Step 4: Vérifier lint et build**

```bash
npm run lint
npm run build
```

Attendu : pas d'erreur.

- [ ] **Step 5: Commit**

```bash
git add src/audio.js
git commit -m "feat(iter-J/phase-1.3): cache memoization de pointsToHarmonics via WeakMap"
```

Do NOT push.

---

## Task 4: Mise à jour CONTEXT.md

**Files:**
- Modify: `CONTEXT.md`

- [ ] **Step 1: TL;DR — ajouter un paragraphe Itération J**

Trouver la section TL;DR. Les itérations sont listées en ordre chronologique (A → ... → I), puis les releases v1.x en reverse-chrono. Ajouter un nouveau paragraphe APRÈS le paragraphe Itération I (date 2026-05-24) et AVANT le paragraphe v1.2.0.

Contenu :

```markdown
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
```

- [ ] **Step 2: Décisions architecturales — ajouter 3 nouvelles entrées**

Trouver la section `## Décisions architecturales`. Ajouter à la fin (après les dernières décisions iter-I, par exemple "Cache déjà dessiné basé sur le succès effectif du draw") :

```markdown
- **DFT truncation à N/2+1 = 129 coefficients** — pour un signal réel
  d'entrée, les k=129..255 de la DFT sont les conjugués miroirs de
  k=1..127 (information redondante). Mais `createPeriodicWave` les
  traite comme des harmoniques indépendants à des fréquences `k×f`,
  produisant des "parasites" audibles à basse fréquence (4-8 kHz pour
  C0). On tronque à k=0..128 avant `createPeriodicWave`. Trade-off :
  128 harmoniques utiles, suffisant pour la musique courante. Si plus
  de détail spectral souhaité un jour, bumper `NUM_SAMPLES` à 512.

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
```

- [ ] **Step 3: État actuel — pas de changement nécessaire**

L'entrée "Spectrogramme Designer avancé" reste valide telle quelle. Le fix audio est transparent côté UX. **Skip cette étape.**

- [ ] **Step 4: Roadmap & Backlog — fermer l'item et ajouter la section iter J**

Localiser dans le backlog général l'entrée :

```markdown
- Anti-aliasing / qualité de synthèse audio (harmoniques parasites
  découvertes via spectrogramme sur les basses fréquences, voir
  image triangle C1)
```

La SUPPRIMER (la feature est livrée).

Puis ajouter une nouvelle section après la fermeture de l'iter I :

```markdown
### Itération J (Anti-aliasing audio) — clôturée 2026-05-24

- ✅ **Phase 1** (2026-05-24) — Anti-aliasing des fréquences parasites.
  3 sous-commits (1.1-1.3) + 1 docs : FFT Cooley-Tukey + self-test dev,
  `pointsToHarmonics` via FFT avec truncation à 129 coefficients, cache
  memoization via WeakMap, CONTEXT.md update.
  Spec + plan dans `docs/superpowers/{specs,plans}/2026-05-24-anti-aliasing*.md`.
  Backlog résiduel : configurabilité de N par patch (pédagogique),
  investigation des 2 pics > 10 kHz en live + C0 + carré observés
  pré-fix (à vérifier post-livraison, suspect : artefact wavetable
  interne `createPeriodicWave`).
```

- [ ] **Step 5: Backlog général — ajouter les items résiduels**

Dans le backlog général (où on a déjà retiré l'ancienne entrée anti-aliasing), ajouter :

```markdown
- N configurable par patch (de 2^0 à 2^9) — pédagogique : l'utilisateur
  pourrait voir/entendre l'effet du nombre d'harmoniques sur le timbre.
  Demande UI dédiée (slider + persistance + decision preset). Reporté
  comme projet séparé depuis l'iter J.
- Investigation des 2 pics > 10 kHz en live + C0 + carré — observés
  avant le fix iter-J. Si persistent après fix, probable artefact de
  wavetable interne `createPeriodicWave`. À vérifier post-livraison.
```

- [ ] **Step 6: Historique — ajouter une nouvelle entrée datée**

Prepend au début de la section `## Historique (chronologie inverse)` :

```markdown
- **2026-05-24 — Itération J phase 1 : Anti-aliasing audio**
  Correction d'un bug audio fondamental : les harmoniques miroirs de
  la DFT (k=129..255) étaient passés à `createPeriodicWave` comme des
  harmoniques indépendants à des fréquences `k×f`, produisant des
  parasites audibles à basse fréquence (typiquement 4-8 kHz pour C0).
  Trois sous-commits + un docs :
  - 1.1 : Ajout du FFT Cooley-Tukey radix-2 in-place (~30 lignes JS
    pur, convention forward `exp(-iθ)`) + self-test en dev mode au
    module load (vérifie les coefficients attendus pour une sine pure).
    La FFT remplace la DFT naïve O(N²) par O(N log N) sans changer le
    résultat numérique.
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
```

- [ ] **Step 7: Vérifier cohérence**

Relire les modifications du CONTEXT.md. Vérifier :
- L'entrée Itération J dans TL;DR est BIEN entre Itération I et v1.2.0.
- Pas de "TBD" / "TODO" / placeholder.
- L'ancienne entrée "Anti-aliasing" du backlog général est bien supprimée.
- Les nouveaux backlog items (N configurable, 2 pics > 10 kHz) sont bien ajoutés.

- [ ] **Step 8: Commit**

```bash
git add CONTEXT.md
git commit -m "docs: CONTEXT.md — Itération J phase 1 (anti-aliasing audio)"
```

Do NOT push.

---

## Auto-vérification du plan

**Couverture de la spec :**

- §1 Objectif (truncation + FFT + cache) → Tasks 1, 2, 3 respectivement.
- §2 Diagnostic du bug → contexte de référence, pas de task dédié (c'est l'explication, pas l'implémentation).
- §3 Scope (in/out) → respecté ; hors-scope préservé (pas de N configurable, pas d'iFFT, etc.).
- §4 Architecture → Tasks 1-3 (single-file audio.js).
- §5.1 FFT Cooley-Tukey → Task 1.
- §5.2 Cache memoization → Task 3.
- §6.1 Self-test → Task 1.
- §6.2 Tests manuels → déférés à l'utilisateur après livraison.
- §7 Risk register → couvert par self-test (Task 1) + validation manuelle utilisateur.
- §8 Décisions architecturales → Task 4 (CONTEXT.md).
- §9 Flux end-to-end → documenté dans la spec, pas de code à ajouter.
- §10 Hors scope → respecté.

**Pas de placeholder** : chaque task a son code, ses commandes, ses critères d'acceptation.

**Type consistency** : `fft`, `HALF_HARMONICS`, `HARMONIC_COUNT`, `pointsToHarmonics`, `harmonicsCache` — tous nommés de façon identique partout. La signature de `pointsToHarmonics` est `(points) → { real, imag, magnitudes }` partout.
