# Spec — Anti-aliasing des fréquences parasites (DFT mirror + FFT)

> Date : 2026-05-24
> Statut : spec validée — en attente de plan d'implémentation
> Hérité du backlog général ("Anti-aliasing / qualité de synthèse audio — harmoniques parasites découvertes via spectrogramme sur les basses fréquences")

## 1. Objectif

Corriger un bug audio fondamental : les **harmoniques miroirs** générés
par la DFT actuelle sont passés tels quels à `createPeriodicWave`, qui
les joue comme des harmoniques indépendants à des fréquences élevées.
Conséquence audible à basse fréquence (par exemple C0 / 16.35 Hz) :
des "parasites" sonores dans la bande 4-8 kHz, indépendants des
harmoniques légitimes de la forme dessinée.

Au passage, profiter de la refactorisation pour :
- Implémenter une **FFT Cooley-Tukey** en remplacement du DFT naïf
  (O(N log N) au lieu de O(N²)) — sobriété énergétique, alignée sur
  les valeurs du projet.
- Ajouter une **memoization runtime** via `WeakMap` pour éviter de
  recalculer la transformation à chaque playback/redraw quand le
  dessin n'a pas changé.

## 2. Diagnostic du bug

### 2.1 Phénomène mathématique

`pointsToHarmonics` calcule une DFT de taille `N=256`. Pour un signal
réel d'entrée (notre cas : amplitudes dessinées sans partie
imaginaire), la DFT a la propriété de **symétrie conjuguée** :

```
X[N-k] = conj(X[k])    pour k = 1..N-1
```

Donc les coefficients `k=129..255` sont entièrement déterminés par les
coefficients `k=1..127`. Information mathématiquement redondante.

### 2.2 Pourquoi c'est audible

`createPeriodicWave` n'interprète PAS la symétrie conjuguée comme
redondance. Il traite chaque coefficient comme un harmonique distinct
à la fréquence `k × f_fondamentale`. Le résultat est une série de
Fourier qui inclut **TOUS** les coefficients comme harmoniques
indépendants.

Pour une forme dessinée jouée à C0 (16.35 Hz) :

- Harmoniques légitimes (k=1..128) : 16, 49, ..., 2093 Hz
- **Harmoniques miroirs (k=129..255)** : 2109, ..., 4170 Hz
  → audibles, considérés comme des "parasites" par l'utilisateur

À haute fréquence, le problème est mathématiquement toujours là mais
masqué partiellement par l'anti-aliasing interne de `createPeriodicWave`
(qui drop les harmoniques au-dessus de Nyquist du sample rate).

### 2.3 Le fix

Tronquer la sortie de la DFT à `N/2 + 1 = 129` coefficients (k=0..128)
avant de la passer à `createPeriodicWave`. Les harmoniques miroirs
disparaissent, l'audio devient propre.

Tradeoff : on a maintenant **128 harmoniques utiles** au lieu de
256. Suffisant pour la musique courante (un piano vivant en a 40-60
perceptibles). Si plus de détail spectral est nécessaire un jour,
bumper `NUM_SAMPLES` à 512 → 256 harmoniques utiles (changement
localisé dans `audio.js`).

## 3. Scope

### In scope

- `src/audio.js` : refactor complet de `pointsToHarmonics` pour :
  - Utiliser un FFT Cooley-Tukey radix-2 in-place (~30 lignes JS pur)
  - Tronquer le résultat aux 129 premiers coefficients (k=0..128)
  - Memoiser via `WeakMap` keyed par référence du buffer `points`
- `src/audio.js` : ajouter un self-test en dev mode pour valider la
  correctness numérique du FFT
- Export `HARMONIC_COUNT` mis à jour de 256 à 128 (anciennement dead
  code mais sémantiquement aligné)

### Hors scope

- **N configurable par patch** (de 2^0 à 2^9). Pédagogiquement
  intéressant mais ajoute UI, persistance, décision preset par
  défaut. Backlog comme projet séparé.
- **iFFT** : `createPeriodicWave` se charge de la synthèse
  temps-domaine côté Web Audio. On n'a jamais besoin du sens
  fréquence → temps dans notre code.
- **Cache des coefficients dans le `.osa`** : refusé. Polluerait le
  format avec données dérivées, problèmes de migration si on change
  `NUM_SAMPLES` plus tard.
- **WebAssembly/SIMD FFT** : gold-plating. La FFT JS pure suffit
  amplement pour notre échelle.
- **Investigation des 2 pics > 10 kHz observés en live + C0 + carré**
  (suspect : artefact wavetable interne de `createPeriodicWave`).
  Déféré au suivi, après vérification post-livraison.

## 4. Architecture

### 4.1 Fichiers modifiés

Un seul : `src/audio.js`. Aucun fichier créé.

### 4.2 Nouvelle structure de `audio.js`

```js
const NUM_SAMPLES = 256
const CANVAS_WIDTH = 600
const HALF_HARMONICS = NUM_SAMPLES / 2 + 1   // = 129 (k=0..128)

// Mis à jour : nombre d'harmoniques utiles (k=1..128).
export const HARMONIC_COUNT = HALF_HARMONICS - 1   // = 128

export const MIN_ATTACK = 0.003   // inchangé

// Self-test FFT en dev mode (cf. §6.1).

// FFT in-place Cooley-Tukey radix-2.
function fft(real, imag) {
  /* ~30 lignes — cf. §5.1 */
}

// Cache memoization (cf. §5.2).
const harmonicsCache = new WeakMap()

export function pointsToHarmonics(points) {
  const cached = harmonicsCache.get(points)
  if (cached) return cached

  // Resample 600 → 256 (linear interp, inchangé)
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

  // Normalisation /N (convention de la DFT actuelle)
  for (let i = 0; i < NUM_SAMPLES; i++) {
    real[i] /= NUM_SAMPLES
    imag[i] /= NUM_SAMPLES
  }

  // Truncation aux 129 premiers coefficients (drop le mirror redondant)
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

// Inchangé en signature, profite naturellement du cache + FFT.
export function pointsToPeriodicWave(points, audioCtx) {
  const { real, imag } = pointsToHarmonics(points)
  return audioCtx.createPeriodicWave(real, imag, { disableNormalization: false })
}

// audioBufferToWav, downloadWav, SOUND_COLORS : inchangés
```

### 4.3 Consumers — aucune modification

- `WaveformEditor.jsx` appelle `pointsToPeriodicWave(points, ctx)` —
  passe par le cache + FFT en interne, signature inchangée.
- `usePlayback.js` : idem.
- `Spectrogram.jsx` itère `for (k=1; k < magnitudes.length; k++)`.
  Après fix, `magnitudes.length = 129`, donc boucle de 1 à 128. Aucun
  changement de code requis — le composant s'adapte naturellement.

## 5. Algorithmes et détails techniques

### 5.1 FFT Cooley-Tukey radix-2

```js
// FFT in-place via Cooley-Tukey radix-2. N doit être une puissance de 2.
// Modifie real[] et imag[] en place. Convention forward (exp(-iθ)).
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

  // 2. Butterflies, par taille de bloc len = 2, 4, 8, ..., N
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

Notes :
- L'algo modifie `real` et `imag` en place. L'appelant passe les
  buffers et reçoit le résultat dans les mêmes buffers.
- Convention `exp(-iθ)` (angle négatif dans `wReal/wImag`) — matche
  exactement la convention de la DFT actuelle.
- Bit-reversal : permute les indices selon leur représentation
  binaire inversée. Étape standard avant les butterflies.
- Butterflies : combinaisons additives/soustractives multipliées par
  les "twiddle factors" (`wReal, wImag`). Cœur de l'algorithme.

### 5.2 Cache memoization

```js
const harmonicsCache = new WeakMap()
```

- Clé = référence du `points` array.
- Le reducer crée toujours un nouveau array sur modif (immutable
  updates) → nouvelle référence → cache miss → recalcul.
- Si rien n'a changé, même référence à chaque appel → cache hit →
  retour immédiat.
- WeakMap : quand un patch est supprimé et que plus rien ne référence
  ses points, le GC libère l'entrée. Pas de fuite mémoire.

Hypothèses critiques :
1. **Le reducer ne mute jamais `points` en place**. Convention
   respectée dans tout le projet (immutable updates). Pas de garde
   runtime — si quelqu'un viole la convention un jour, le cache
   retournera des données obsolètes silencieusement.
2. **Les patches ne partagent pas leurs points par référence**.
   Chaque patch a son propre array.

## 6. Validation

### 6.1 Self-test FFT en dev mode

À l'import du module en mode dev (`import.meta.env.DEV`), un
self-test vérifie la correctness numérique du FFT contre des
signaux d'entrée connus :

```js
if (import.meta.env.DEV) {
  // Self-test: vérifier que FFT donne les coefficients attendus
  // pour des signaux d'entrée connus.
  // Test 1: pure sine à k=1 → après normalisation /N :
  //   imag[1] ≈ -0.5, real[1] ≈ 0, autres ≈ 0
  const N = NUM_SAMPLES
  const realTest = new Float32Array(N)
  const imagTest = new Float32Array(N)
  for (let i = 0; i < N; i++) {
    realTest[i] = Math.sin(2 * Math.PI * i / N)
  }
  fft(realTest, imagTest)
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
    })
  }
}
```

Si le bit-reversal ou les butterflies sont buggés, le test échoue
avec un message console.error qui flag l'erreur. Pas de crash en
production : `import.meta.env.DEV` est inliné à `false` par Vite, le
bloc disparaît du bundle prod.

### 6.2 Tests manuels (déférés à l'utilisateur)

1. **Spectrogram statique square à C0** : vérifier que la
   décroissance harmonique est claire (1, 1/3, 1/5, ...) avec pas
   de "remontée" à droite (mirror disparu).
2. **Audio square à C0** : son net, plus de parasites audibles
   dans la bande 4-8 kHz.
3. **Comparaison statique vs live à C0 + sine pure** : pic unique
   à la fondamentale sur les deux modes (live à -14 dB ±1, statique
   à 1.0 ratio).
4. **Notes hautes inchangées** : A4, A5, A6 sonnent comme avant
   (au playback à haute fréquence, l'anti-aliasing interne de
   `createPeriodicWave` masquait déjà le problème, pas de
   différence audible).
5. **Tous les presets** : sine, square, sawtooth, triangle se
   chargent et sonnent comme prévu.
6. **Performance** : pas de lag perceptible.
7. **Self-test FFT** : ouvrir devtools console au load → aucun
   message "FFT self-test FAIL".
8. **Vérification follow-up des 2 pics > 10 kHz** observés en live
   + C0 + carré : sont-ils encore là après le fix ?
   - Si oui : sujet à part, à investiguer séparément.
   - Si non : couvert par le fix.

## 7. Risk register

| Risque | Mitigation |
|--------|------------|
| FFT bugué (bit-reversal off-by-one, butterfly mal indexé, normalisation oubliée) | Self-test en dev mode au module load. Plus tests manuels utilisateur sur les presets. |
| Convention de signe inversée (imag inversé, normalisation 1/N vs 2/N) | Self-test vérifie le signe de imag attendu pour une sine pure. |
| Mutation in-place de `points` quelque part (anti-pattern) | Pas de protection runtime. Discipline du reducer (déjà bien établie). |
| Pics > 10 kHz en live persistent après le fix | Note "à investiguer en suivi" dans la spec. Probable artefact de wavetable interne de `createPeriodicWave`. |
| `HARMONIC_COUNT` export change | Grep confirmé dead code — sans consumer. Safe à modifier. |

## 8. Décisions architecturales à inscrire dans CONTEXT.md

À ajouter en section "Décisions architecturales" après livraison :

1. **DFT truncation à N/2+1 = 129 coefficients** — pour un signal
   réel d'entrée, les k=129..255 de la DFT sont les conjugués miroirs
   de k=1..127 (information redondante). Mais `createPeriodicWave`
   les traite comme des harmoniques indépendants à des fréquences
   `k×f`, produisant des "parasites" audibles à basse fréquence
   (4-8 kHz pour C0). On tronque à k=0..128 avant `createPeriodicWave`.
   Trade-off : 128 harmoniques utiles, suffisant pour la musique
   courante. Si plus de détail spectral souhaité un jour, bumper
   `NUM_SAMPLES` à 512.

2. **FFT Cooley-Tukey radix-2 in-place** — remplace la DFT naïve
   O(N²) par un algorithme O(N log N) (~30 lignes JS pur, zéro
   dépendance). Speedup ~30× pour N=256. Pas critique en performance
   mais aligné avec sobriété énergétique. Self-test en dev mode
   garantit la correctness numérique. Convention `exp(-iθ)` préservée
   — équivalence numérique avec la DFT naïve précédente.

3. **Cache memoization de `pointsToHarmonics` via WeakMap** — keyed
   par référence du buffer `points`. Cache hit naturel quand le
   dessin n'a pas changé (le reducer crée des nouveaux arrays sur
   modif → référence différente → cache miss → recalcul). WeakMap
   garantit pas de fuite mémoire (entrée GC'd quand le patch est
   supprimé). Le cache est partagé entre playback audio et
   Spectrogram statique → une seule transformation par changement
   de dessin.

## 9. Flux end-to-end

```
1. Utilisateur dessine sur le canvas
   ↓
2. WaveformEditor onMouseMove → dispatch SET_EDITOR_POINTS
   ↓
3. Reducer crée editor.points = nouveau Float32Array (immutable update)
   ↓
4a. WaveformEditor.playInstrumentNote() ou usePlayback.scheduleClip()
    ↓
    pointsToPeriodicWave(points, ctx)
    ↓
    pointsToHarmonics(points)
    ├── Cache hit ? → retour immédiat
    └── Cache miss :
        ├── Resample 600 → 256 (linear interp)
        ├── FFT in-place sur Float32Array(256)
        ├── Normalisation /N
        ├── Truncation aux 129 premiers coefficients
        ├── Stockage dans WeakMap
        └── Retour { real, imag, magnitudes } à 129 entrées chacun
    ↓
    createPeriodicWave(real, imag) — 129 harmoniques (k=0..128, plus de mirror)
    ↓
    osc.setPeriodicWave(...)

4b. En parallèle, Spectrogram (mode static)
    ↓
    pointsToHarmonics(points) — même cache !
    ↓
    Affichage des 128 bars légitimes (k=1..128 dans la boucle d'affichage)
```

Le **cache est partagé** entre l'audio (PeriodicWave) et le visuel
(Spectrogram statique). Une seule transformation par changement de
dessin, peu importe combien de voix ou redraws s'enchaînent.

## 10. Hors scope explicite (résumé)

Réaffirmé pour clarté à l'implémentation :

- Pas de N configurable par patch (backlog feature séparée).
- Pas d'iFFT (Web Audio s'en charge en interne).
- Pas de cache sur disque ni dans `.osa`.
- Pas de WebAssembly/SIMD FFT.
- Pas d'investigation des 2 pics > 10 kHz live+C0+carré dans cet
  iter (à vérifier post-livraison, sujet à part si persistent).
