# Prompt dev — Itération N « Stabilité & fluidité » · Phase N.1 : latence audio

**Type** : `fix(iter-N/phase-1.x)`. Correction d'une **régression de réactivité**
du Designer, apparue avec la complexification de M.r.5 (lerp auto-fit, 3 courbes
de fond, normalisation). L'utilisateur **ressent** un retard frappe→son et une
lourdeur d'interaction depuis ces ajouts.

## Objectif

Restaurer la fluidité (latence frappe→son + réactivité d'édition dans le
Designer) **sans changer ce qui sort** : même audio, mêmes courbes affichées,
juste plus rapide.

## ⚠️ Invariant non négociable — transparence perceptive

Chaque correctif doit être **perceptiblement transparent** : le son joué et les
courbes rendues doivent rester **identiques** (au bruit numérique près), seul le
coût change. Aucune modif du timbre, du rendu visuel, ni du modèle. Si un fix
modifie la sortie, il est hors scope — interpelle.

## Carte des coûts (vérifiée dans `src/audio.js`, à confirmer par profilage)

- **`pointsToHarmonics` (l.107)** : resample 600→512 + **FFT 512** (~4,6k ops) +
  magnitudes. **Mémoïsée** par référence de `points` (`harmonicsCache`, l.108).
  Coût **indépendant de `cap`** (la FFT est toujours sur 512). → *pas* le suspect
  principal tant que le cache tient.
- **`harmonicsToPoints` (l.212)** : l'iDFT `Σ aₖ·sin()` sur **600 points**.
  Coût ≈ `600 × (harmoniques parcourues)` : ~9,6k `sin()` pour 16 harmoniques,
  ~153k pour 256. **Garde anti-zéro l.220** (`if (a)`) qui saute les amplitudes
  nulles — **mais ne saute que les zéros exacts**.
- **Piège central** : le leakage du mismatch grille 600↔512 contamine les
  harmoniques « censées nulles » avec des micro-valeurs non-nulles → `if (a)` ne
  les saute plus → l'iDFT refait les 600×256 `sin()` **même quand l'utilisateur
  n'a posé que 16 barres**. C'est le mécanisme qui relie le bump `cap` 128→256 à
  la lenteur ressentie.

> Note : le refactor profond du mismatch FFT (backlog #12) est **hors scope**
> (c'est de la justesse, pas de la perf, et son fix « DFT directe » serait *plus*
> lent). Ici on neutralise son *effet de bord perf* par un seuil epsilon, pas par
> le refactor.

## Les 4 suspects (backlog « Latence audio à l'appui de touche »)

- **(a) rAF lerp auto-fit Y** (M.r.5.1, étendu SplineEditor M.r.5.bis.1) : boucle
  `requestAnimationFrame` qui ne s'arrête peut-être jamais quand la cible est
  atteinte (mange le frame budget en permanence).
- **(b) recompute des 3 courbes au render** (canonical + normalisée + spline
  parfaite) : chacune appelle `harmonicsToPoints` (~150k `sin()` si le garde
  anti-zéro est défait) ; la mémoïsation dépend de `[editor.canonical,
  editor.cap]` — vérifier qu'elle ne recalcule pas à chaque re-render.
- **(c) pression rendu canvas** : plusieurs sources lançant chacune leur boucle
  rAF (peak, normalizedBg, spline parfaite) qui s'empilent.
- **(d) cache miss `pointsToHarmonics`** : WeakMap par référence de `canonical` —
  si la canonical est passée avec une référence instable (nouvelle allocation à
  chaque note/render), le cache rate et la FFT 512 se refait à chaque fois.

## Méthode — mesurer AVANT de corriger (évidence d'abord)

### Sous-commit N.1.1 — Profilage & diagnostic (pas de fix, pas de commit de code)

Établis une mesure **reproductible** avant de toucher quoi que ce soit :

- Profiler navigateur (onglet Performance) en **enregistrant** deux scénarios :
  (1) frappes répétées au clavier pour jouer des notes ; (2) édition d'une barre
  / drag d'une ancre dans le Designer. Repère les fonctions qui dominent le
  flame chart.
- Instrumente temporairement (`performance.now()` / `console.count`) : nombre
  d'appels à `harmonicsToPoints` et `pointsToHarmonics` **par seconde** pendant
  l'interaction, et coût moyen ; taux de hit/miss du `harmonicsCache` ; si les
  boucles rAF tournent en continu (compteur de frames hors interaction).
- **Livre un compte-rendu** dans ta réponse : quel(s) suspect(s) dominent
  réellement, chiffres à l'appui. **Ne commite pas l'instrumentation** (throwaway).

C'est le SC qui pilote les suivants : on corrige ce que le profilage confirme.

### Sous-commits suivants — correctifs ciblés (un par cause confirmée)

À adapter selon le diagnostic ; voici les correctifs attendus, tous à faible
risque et transparents :

- **Seuil epsilon sur le garde anti-zéro** de `harmonicsToPoints`
  (`if (Math.abs(a) > 1e-6)` au lieu de `if (a)`) et/ou nettoyage des
  harmoniques résiduelles en vrais zéros en amont. Neutralise le coût du bump
  `cap` quand peu d'harmoniques portent de l'énergie. **Vérifie l'invariant de
  transparence** : à 1e-6, l'audio et les courbes ne doivent pas bouger à l'œil
  ni à l'oreille (le seuil est sous le plancher audible).
- **Arrêt des boucles rAF du lerp auto-fit** dès convergence
  (`|peak - target| < ε` → on cesse de planifier une frame). Couvre (a) et (c).
- **Mémoïsation correcte des 3 courbes** : confirmer que les `useMemo`
  (deps `[editor.canonical, editor.cap]`, etc.) ne se recalculent pas à chaque
  re-render ; stabiliser les références si besoin. Couvre (b).
- **Stabilité de référence de la canonical** sur le chemin de playback
  (`usePlayback` → `pointsToPeriodicWave`) pour que le `harmonicsCache` tienne
  entre notes. Couvre (d).

### Dernier sous-commit — re-mesure & doc

Re-joue les deux scénarios de profilage, **chiffre le gain** (avant/après), et
mets `CONTEXT.md` à jour (protocole 2-fichiers : section État actuel + ligne
roadmap N.1). Coche la cause traitée dans le backlog.

## Hors scope

- **Mismatch FFT 600↔512 (#12)** : pas de refactor de grille, pas de DFT directe.
  On ne touche au leakage que via le seuil epsilon (effet, pas cause).
- Toute nouvelle feature, Monde B, MIDI, doc search.
- Tout changement de timbre, de rendu visuel ou du modèle de données.
- Les autres phases de l'itération N (ancres Douglas-Peucker, presets Fourier,
  lissage, durcissements) : prompts séparés.

## Vérifications de fin

- Gain de latence mesuré et chiffré (pas « ça semble mieux » — des nombres).
- Invariant de transparence tenu : son identique, courbes identiques.
- `npm run build && npm run lint && npm run typecheck` verts.
- Aucune instrumentation throwaway laissée dans le code.
- Commits `fix(iter-N/phase-1.x): …`, push `origin/main` après chacun.
