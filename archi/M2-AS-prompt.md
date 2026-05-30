# Prompt — Iteration M, Phase M.2-AS : toggle auto-sizing (essai)

> Spec de référence : `docs/superpowers/specs/2026-05-29-waveform-designer-design.md` (§7.2).
> **Essai à confirmer/jeter avant clôture d'itération M.** Critère de décision :
> on garde si ça accélère sans distraire ; on jette si le whiplash de reflow
> l'emporte sur le confort, ou si éditer les barres avec un spectro rétréci
> gêne.

## Contexte

M.2 a posé un **état de proportions** unique (persisté), piloté par presets +
drag, avec un défaut au boot par mode. M.2-AS ajoute par-dessus un **toggle
opt-in, OFF par défaut**, qui rend la disposition **contextuelle au focus**.

**Important** : le mécanisme se branche **sur le même état de proportions**
que M.2 — il l'écrit. Aucun nouvel état canonique. Le retrait éventuel
(décision « jeter ») = supprimer le toggle + le focus listener, sans aucun
détricotage.

Le mode auto échange explicitement le **pinning** contre le **suivi du
contexte** : on ne fige rien. Si l'utilisateur veut figer une dispo, il
**repasse en manuel**.

## Découpage en sous-commits

### Sous-commit AS.1 — Toggle + état persisté

- Champ état global `autoSizing: boolean` (initial `false`), persisté
  localStorage. Suivre le pattern des autres bool persistés du Designer.
- UI : un petit interrupteur dans la **même barre que les presets de
  proportions** (⅓⅓⅓ etc.), libellé via `strings.js` (« Auto » ou
  « Dimension auto » — au choix).
- Quand `autoSizing === false` : comportement M.2 strictement inchangé.
- Quand `autoSizing === true` : la logique des sous-commits AS.2/AS.3
  s'active.
- Tag : `feat(iter-M/phase-2-as.1): toggle auto-sizing (état + UI)`.

### Sous-commit AS.2 — Focus contextuel + 3 états stables

Quand `autoSizing` est ON, **3 états stables** seulement, le focus bascule
automatiquement :

| Focus | Proportions |
|---|---|
| Forme d'onde | `[0.6, 0.2, 0.2]` |
| Harmoniques  | `[0.2, 0.6, 0.2]` |
| Spectro **ou** repos (aucun focus) | `[0.2, 0.2, 0.6]` |

Le repos *est* l'état focus-spectro (pas de 4ᵉ état ; le ⅓⅓⅓ reste dispo
en manuel).

**Tracking du focus** :
- Premier interaction (mousedown) dans une colonne → cette colonne devient
  focus → écriture dans l'état de proportions.
- Clic **hors** des 3 colonnes (clavier visuel, toolbar, autre onglet…) →
  focus retiré → écriture du repos `[0.2, 0.2, 0.6]`.
- Focus **volatile** : non persisté entre sessions. À l'ouverture (et après
  toute « sortie ») = pas de focus = repos.

- Tag : `feat(iter-M/phase-2-as.2): focus contextuel + 3 états stables`.

### Sous-commit AS.3 — Règles d'interaction (anti-conflit)

Trois règles, **uniquement quand `autoSizing === true`** :

1. **Séparateur = cible indépendante.** Le `stopPropagation` déjà câblé en
   M.2 (sous-commit 2.2) tient. Un drag de séparateur écrit dans l'état de
   proportions comme en manuel — mais le **prochain changement de focus
   écrasera** ces proportions (cohérent avec « pas de pinning en auto »).
   Si l'utilisateur veut figer, il bascule auto OFF.

2. **Le clic qui *change* le focus ne fait que focuser — il n'édite pas.**
   Un `mousedown` dans une colonne **non focus** déclenche la prise de
   focus + le resize, **mais aucune édition** sur ce geste-là. L'édition
   reprend sur le geste suivant (la colonne est maintenant à 60 %, le
   contenu ne reflue plus sous le curseur). Implémentation : à toi de
   choisir le wiring le plus propre — probablement les composants éditables
   (canvas Forme d'onde, barres Harmoniques) consultent l'état de focus
   avant d'engager un drag/click et n'engagent rien si la colonne vient de
   prendre focus sur ce même geste.

3. **Sortie des zones → repos.** Click hors des 3 colonnes → `[0.2, 0.2, 0.6]`
   (cf. AS.2).

- Tag : `feat(iter-M/phase-2-as.3): règles d'interaction (focus, séparateur, sortie)`.

## Comportement attendu

- **Auto OFF (défaut)** : aucune différence visible vs M.2 + son follow-up
  snap-on-convert.
- **Auto ON, repos** : `[0.2, 0.2, 0.6]`. Le spectro a la part belle —
  cohérent avec « hors édition, on joue/écoute, et le live FFT compte ».
- **Auto ON, clic dans une éditable non focus** : la zone s'élargit à 60 %,
  ce premier clic *focuse seulement*, l'édition démarre au geste suivant.
- **Auto ON, clic dans la colonne déjà focus** : édition normale.
- **Auto ON, clic spectro** : la colonne spectro reste à 60 % (était déjà
  l'état repos).
- **Auto ON, clic en dehors des 3 colonnes** : retour au repos.
- **Auto ON, drag séparateur** : prend effet immédiat ; le prochain changement
  de focus le réécrase.

## Hors scope

- **Animation** des transitions de proportions — purement esthétique, à
  affiner en polish post-essai *si* on décide de garder le toggle.
- Persistance du focus entre sessions (volontaire — le focus est volatile).
- Pinning en mode auto (par design : pour figer, on bascule auto OFF).

## Règles techniques

- L'auto-sizing écrit dans **l'état de proportions existant** de M.2. **Aucun
  nouvel état canonique.** Au retrait du mode (décision « jeter »), supprimer
  le toggle + le focus listener = retour à M.2 intact.
- Le tracking de focus est **inactif** quand `autoSizing === false` (pas de
  listener attaché inutilement).
- `strings.js` : libellé du toggle.
- Build + typecheck + lint OK. **Passe visuelle/d'usage à l'utilisateur** —
  c'est là que se joue le keep/drop.
- CONTEXT.md : État actuel + Historique. Roadmap : marquer M.2-AS comme
  « livré, en essai (keep/drop avant clôture M) ».
