# Prompt dev — Clôture de l'itération N + release v1.6.0

**Type** : `docs` + `chore`/`feat(v1.6.0)`. **Pas de code applicatif** (sauf le
bump de version). Applique le **protocole de contexte 2-fichiers** (cf. ton
CLAUDE.md) pour clore l'itération N.

## Contexte

Iteration N (Stabilité & fluidité) entièrement livrée : N.1 (latence + audit),
N.2/2.1/3 + polish (édition d'ancres refondue, warp 2D), N.5a→f (système de
presets « Timbres » refondu), N.4 (lissage), N.6 (durcissements TS + auto-sizing
radio). Pas de rupture de modèle de données → **release minor v1.6.0**.

## 1. `CONTEXT.md` — brief vivant (mise à jour **par remplacement**)

- **TL;DR** : ajouter **une seule ligne** au tableau des itérations :
  ```
  | N | Stabilité & fluidité : édition d'ancres refondue (warp 2D), presets « Timbres » (vues idéale/band-limitée + formes paramétriques), lissage, durcissements — v1.6.0 | 2026-06-04 |
  ```
  Mettre à jour **« Version courante : v1.6.0 »** et la ligne **« État courant »**
  (N close ; entre deux itérations ; prochaine non cadrée). **Ne pas gonfler le
  TL;DR** au-delà de ça.
- **État actuel** : **consolider par remplacement** les entrées N.1→N.6 que tu as
  ajoutées au fil des phases en une **description de l'état présent** du Designer
  (le modèle d'édition d'ancres : *représentation → canonical inchangée / forme →
  warp* ; le système de presets « Timbres » : 2 vues idéale/band-limitée + formes
  paramétriques + N éditable ; les boutons de lissage ; `@ts-check` sur reducer.js).
  **Pas l'empilement des 6 phases verbatim** — l'état, pas l'historique.
- Mettre à jour les sections **Composants / Décisions architecturales** touchées
  par N (modèle de warp d'ancre, système presets/`waveforms.js`/`PARAMETRIC_WAVEFORMS`,
  groupe radio dimensionnement) **par réécriture sur place**.

## 2. `CONTEXT-ARCHIVE.md` — trace (par **append**)

- **Déplacer** le détail par-phase de N (l'historique des phases que tu avais mis
  dans `## État actuel`/roadmap de `CONTEXT.md`) vers l'archive : entrée
  `## Roadmaps des itérations closes` (ou section `## Itération terminée : N`),
  avec le détail N.1→N.6 (audit perf + verdict prod, warp 2D, presets, etc.).
  C'est là que vit l'historique exhaustif, pas dans le brief.

## 3. Version + release

- `package.json` : `1.5.0` → **`1.6.0`**.
- Commit de release `feat(v1.6.0): Iteration N — stabilité & fluidité (édition
  d'ancres refondue, presets « Timbres », lissage, durcissements)`.
- Commit doc séparé pour CONTEXT/ARCHIVE : `docs: clôture iter-N (brief consolidé
  + détail archivé)`.

## Vérifications

- `CONTEXT.md` reste **lisible en un seul Read** (le brief n'a pas regrossi ;
  l'État actuel est consolidé, pas un journal de phases).
- TL;DR : +1 ligne pour N, version 1.6.0.
- Détail de N présent dans `CONTEXT-ARCHIVE.md`, absent (au-delà du résumé d'état)
  de `CONTEXT.md`.
- `npm run build && npm run lint && npm run typecheck` verts.
- Push `origin/main`.

## Hors scope

- Purge des prompt-fichiers `archi/N*` (décision archi, traitée à part).
