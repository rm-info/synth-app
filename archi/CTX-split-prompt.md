# Prompt dev — Découpage de CONTEXT.md (brief vivant / archive)

**Type de tâche** : `chore(ctx)` — refactor documentaire, **zéro code applicatif**.
Aucun fichier sous `src/` n'est touché. `CONTEXT.md` et les `CLAUDE.md` ne sont
pas importés par l'app (la doc embarquée vit dans `src/docs/`), donc **aucun
impact build/lint/typecheck** — mais lance-les quand même en fin pour la forme.

## Contexte & motivation

`CONTEXT.md` fait 6762 lignes / 433 Ko. Il dépasse la taille où on peut le lire
en un seul `Read` (limite 256 Ko), d'où le réflexe récurrent « CONTEXT est
conséquent, je le lis en plusieurs fois » en début de session.

Diagnostic (validé par l'archi) : **~56 % du fichier est de l'archive
append-only** qui ne sert jamais au briefing de session (Historique,
itérations terminées, détail des roadmaps closes). Le fichier a deux missions
contradictoires : **briefer** (état présent, concis, lu à chaque démarrage) et
**tracer** (historique exhaustif, croît sans fin). On les sépare en deux
fichiers frères à la racine.

**Principe directeur du protocole** (à retenir pour la maintenance future) :
une section « brief » se met à jour par **remplacement**, une section « trace »
par **append**. Les deux ne cohabitent plus dans le même fichier.

## Décision de périmètre (arbitrée par l'archi)

- **On déplace** vers `CONTEXT-ARCHIVE.md` : la saga du TL;DR, les itérations
  terminées A/B/C, l'Historique chronologique, le détail des roadmaps des
  itérations closes B→M.
- **On NE touche PAS** à la section « Décisions architecturales » : elle a été
  maintenue par réécriture sur place (pas d'empilement de décisions périmées),
  c'est un catalogue vivant du *pourquoi*, elle reste intégralement dans le
  brief.
- **On retaille** le TL;DR (texte fourni verbatim plus bas).

Résultat attendu : `CONTEXT.md` ≈ 2350 lignes (~150 Ko), lisible en un seul Read.

---

## Sous-commit 1 — `chore(ctx): scinde CONTEXT.md, crée CONTEXT-ARCHIVE.md`

### 1a. Créer `CONTEXT-ARCHIVE.md` à la racine

En-tête du nouveau fichier :

```markdown
# CONTEXT-ARCHIVE.md — Synth App (trace historique)

> **Archive append-only.** Itérations terminées, historique chronologique,
> détail des roadmaps closes, et l'ancienne saga narrative du TL;DR.
> Le **brief vivant** (état présent, modèle, composants, décisions en vigueur,
> contraintes, roadmap active) est dans `CONTEXT.md` — c'est lui qu'on lit en
> début de session ; ce fichier-ci ne se consulte qu'à la demande.
>
> Maintenance : on **append** ici (entrées d'historique, itérations qui
> clôturent). On ne réécrit pas l'existant.
```

### 1b. Déplacer les blocs (couper de CONTEXT.md, coller dans CONTEXT-ARCHIVE.md)

Repère les blocs **par leurs titres** (les numéros de ligne ci-dessous sont
indicatifs, ils dériveront au fur et à mesure des coupes — fie-toi aux
en-têtes). Ordre conseillé dans l'archive : saga d'abord, puis itérations
terminées, puis historique, puis roadmaps closes — c'est l'ordre du plus
synthétique au plus détaillé.

1. **La saga du TL;DR** : tout le contenu actuel sous `## TL;DR` (≈ lignes
   6→601, jusqu'à juste avant `## Objectif`). Colle-le dans l'archive sous un
   titre `## Saga narrative (ex-TL;DR)`. (Le `## TL;DR` de CONTEXT.md sera
   remplacé par le texte court fourni en 2a — ne supprime pas le titre, juste
   le corps.)

2. **Itérations terminées A/B/C** : les trois sections
   `## Itération terminée : A — Refonte UX core`,
   `## Itération terminée : B — édition avancée`,
   `## Itération terminée : C — Multipiste` (≈ lignes 2161→2436, jusqu'à juste
   avant `## État actuel`). Après coupe, `## Contraintes implicites` doit être
   directement suivi de `## État actuel`.

3. **Historique** : toute la section `## Historique (chronologie inverse)`
   (≈ lignes 3147→5011, jusqu'à juste avant `## Règles de travail`). Après
   coupe, `## État actuel` doit être directement suivi de `## Règles de travail`.

4. **Détail des roadmaps closes B→M** : sous `## Roadmap & Backlog`, tous les
   sous-blocs `### Itération B …` à `### Itération M …` (≈ lignes 5022→6681,
   c.-à-d. tout entre le titre `## Roadmap & Backlog` et `### Backlog général`).
   Dans l'archive, regroupe-les sous un titre `## Roadmaps des itérations closes
   (B→M)`. **Garde dans CONTEXT.md** le titre `## Roadmap & Backlog`, le
   pointeur (fourni en 2b) et la sous-section `### Backlog général (à caser
   quand pertinent)` intacte.

### 1c. Références internes

De nombreux passages disent « cf. Historique », « cf. section Historique »,
« cf. roadmap iter X ». Ne fais **pas** une chasse exhaustive. Ajoute juste, en
tête de `CONTEXT.md` (dans le bloc « Structure des fichiers de contexte » fourni
en 2a), la convention : *les renvois à l'Historique et aux itérations closes
pointent vers `CONTEXT-ARCHIVE.md`*. C'est suffisant.

---

## Sous-commit 2 — `chore(ctx): TL;DR resserré + pointeurs vers l'archive`

### 2a. Remplacer le corps de `## TL;DR` dans CONTEXT.md par EXACTEMENT ceci

```markdown
## TL;DR

Synth App — synthétiseur web pédagogique. On **dessine une forme d'onde**
(librement, par ancres/spline, ou via ses **harmoniques**), on la **place sur
une timeline multipiste**, on **exporte en WAV**. Quatre onglets :
Bibliothèque · Designer · Composer · Documentation.

**Stack minimale (non négociable)** : React 19 + Vite + Web Audio API native,
persistance localStorage (clé `synth-app-state`). **TypeScript incrémental**
(allowJs, opt-in fichier par fichier, depuis le préalable de l'iter M). Pas de
lib audio, pas de state manager (un `useReducer` global dans `App.jsx`), pas de
framework UI (CSS manuscrit), pas de routing, pas de backend.

**Version courante : v1.5.0** (2026-06-03).

**Itérations livrées** (détail complet dans `CONTEXT-ARCHIVE.md`) :

| It. | Sujet | Clôture |
|-----|-------|---------|
| A | Refonte UX core (2 onglets, dual save, zoom %, édition clips, undo/redo) | 2026-04-15 |
| B | Édition avancée (multi-sélection, copier/coller, spectro statique) | 2026-04-17 |
| C | Multipiste (mute/solo/volume, scheduler look-ahead) | 2026-04-18 |
| D | Designer UX (`tuningSystem`, clavier piano, sélecteur d'octave) | 2026-04-19 |
| E | Patches vs Notes (la hauteur passe du patch au clip) | 2026-04-22 |
| F | Multi-tempérament (Tier 1+2+3 : microtonal, gamelan, maqâm, shrutis…) | 2026-04-25→ |
| G | Designer UX (layout, dropdowns groupés) | 2026-05-20 |
| H | Import/Export (`.osa` = magic `OSA2` + gzip(JSON) versionné) | 2026-05-21 |
| I | Spectrogramme avancé | 2026-05-24 |
| J | Anti-aliasing audio (DFT truncation) | 2026-05-24 |
| K | Bibliothèque multi-mode + 3 sous-apps + thème clair/sombre | 2026-05-26 |
| L | Documentation (onglet + Raccourcis Ctrl+K + Tour Ctrl+J) — v1.4.0 | 2026-05-28 |
| M | Waveform Designer : modèle canonique unifié + 3 lentilles + patch typé — v1.5.0 | 2026-06-03 |

**État courant** : entre deux itérations. Iteration M close (code + doc).
Prochaine itération non cadrée — candidats au backlog (Monde B inharmonique +
morph A↔B, perf/latence audio, recherche plein-texte doc, refonte des presets
géométriques en séries de Fourier). Hygiène post-M restante : note de clôture,
purge des prompt-fichiers `archi/Mr*` et `archi/M5b*` consommés.

> **Structure des fichiers de contexte.** Ce `CONTEXT.md` est le **brief
> vivant** : état présent, modèle de données, composants, architecture,
> décisions en vigueur, contraintes implicites, roadmap active. C'est le seul
> fichier à lire en début de session. `CONTEXT-ARCHIVE.md` est la **trace** :
> saga narrative, itérations terminées, historique chronologique, roadmaps des
> itérations closes — consulté uniquement à la demande. Tout renvoi à
> « l'Historique » ou à une itération close pointe vers `CONTEXT-ARCHIVE.md`.
```

### 2b. Sous `## Roadmap & Backlog`, juste après le titre, insérer le pointeur

```markdown
## Roadmap & Backlog

> Détail des roadmaps des itérations livrées (A→M) → `CONTEXT-ARCHIVE.md`.
> Ci-dessous : le backlog général (non planifié) et, une fois cadrée, la
> prochaine itération.
```

Puis enchaîne directement sur `### Backlog général (à caser quand pertinent)`
(conservé tel quel).

---

## Sous-commit 3 — `chore(ctx): protocole de maintenance multi-fichiers`

### 3a. `CLAUDE.md` racine — section « Mise à jour du CONTEXT.md »

Remplace le corps de cette section pour refléter le découpage. Le protocole
cible :

- **`CONTEXT.md` (brief, par remplacement)** en fin de phase : mettre à jour
  `## État actuel`, le `## TL;DR` (le **garder court** — ne jamais le laisser
  redevenir une saga ; au plus, ajouter une ligne au tableau des itérations
  quand l'une clôture), et le `### Backlog général` / la prochaine itération
  dans `## Roadmap & Backlog`. La section `## Décisions architecturales` se met
  à jour **par réécriture sur place** (on corrige/remplace une décision
  périmée, on n'empile pas à côté).
- **`CONTEXT-ARCHIVE.md` (trace, par append)** : y écrire les entrées
  d'`## Historique`. Quand une itération clôture, **déplacer** le détail de sa
  roadmap depuis `CONTEXT.md` vers `## Roadmaps des itérations closes (B→M…)` de
  l'archive, et y ajouter au besoin une section `## Itération terminée : X`.
- Commit doc séparé, convention inchangée : `docs: CONTEXT.md — Iteration X
  phase N (résumé)` (étends à `CONTEXT-ARCHIVE.md` quand il est touché).

Garde le ton et la concision de la section existante.

### 3b. `archi/CLAUDE.md` — section « Contexte projet »

Adapter la phrase sur la lecture du contexte pour mentionner les deux fichiers :
`../CONTEXT.md` = brief vivant à lire en début de session ; `../CONTEXT-ARCHIVE.md`
= historique/itérations closes, à consulter seulement si besoin de détail
rétrospectif.

---

## Vérifications de fin

- `wc -l CONTEXT.md CONTEXT-ARCHIVE.md` : CONTEXT.md doit tomber à ~2300-2400
  lignes ; l'archive doit récupérer le gros (~4400 lignes).
- `CONTEXT.md` se lit en un seul `Read` (< 256 Ko).
- Vérifie qu'aucun bloc déplacé n'a été dupliqué ni laissé en double (grep des
  titres `## Historique`, `## Itération terminée`, `### Itération B` : ils ne
  doivent plus exister que dans l'archive).
- `npm run build && npm run lint` (et typecheck si script dédié) — doivent rester
  verts (sanity, même si rien d'importé n'est touché).
- Push sur `origin/main` après chaque sous-commit validé, comme d'habitude.

## Hors scope

- Aucun tri / déplacement des « Décisions architecturales ».
- Aucune réécriture de contenu autre que le TL;DR (le reste = couper/coller
  fidèle).
- Aucune modification de `src/`, des specs `docs/superpowers/`, ou de la doc
  utilisateur `src/docs/`.
- La purge des prompt-fichiers `archi/Mr*` / `archi/M5b*` et la note de clôture
  M : **pas dans ce prompt** (tâche d'hygiène séparée).
```
