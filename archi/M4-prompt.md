# Prompt — Iteration M, Phase M.4 : presets de timbre

> Spec de référence : `docs/superpowers/specs/2026-05-29-waveform-designer-design.md` (§5, §10).
> Phase **légère par construction** — les représentations sont en place
> depuis M.2 / M.3, un preset n'est qu'« un vecteur d'amplitudes (ou des
> points) sous un nom ».

## Contexte

Une petite bibliothèque de **timbres prêts à charger** depuis le Designer.
Deux objectifs portés par le brief initial :

1. **Évocateurs d'instruments** : rappeler des familles connues (orgue, anche,
   cuivre, flûte…) — sans prétention d'émulation (un waveform statique +
   amplitude ADSR ne peut pas imiter un vrai instrument).
2. **Inattendus-propres** : timbres inhabituels mais maîtrisés (harmoniques
   impaires seules, octaves seules, clusters non triviaux…) — l'argument
   « sons inattendus mais *propres* » du cadrage de M.

Tous les presets de M.4 sont en mode **`harmonic`** (les recettes les plus
nettes et compactes en restituent l'idée). Pas de presets `spline` — un
utilisateur peut convertir un preset harmonique vers spline s'il veut éditer
en ancres.

## Découpage en sous-commits

### Sous-commit 4.1 — Bibliothèque de presets (data)

Nouveau module `src/lib/presets.js` qui exporte une liste structurée. Chaque
preset :

- `id` (string unique).
- `name` (libellé via `strings.js`).
- `category` (`'evocateurs' | 'inattendus'`).
- `description` (optionnel, 1 phrase, pour tooltip).
- `patch` : un `HarmonicPatch` minimal (`mode: 'harmonic'`, `N`, `amplitudes`).
  Les autres champs (amplitude globale, ADSR) prennent les défauts du
  Designer.

**Recettes initiales** (à encoder telles quelles — l'utilisateur tunera à
l'oreille en passe audio) :

**Évocateurs** (6) :

| nom | N | amplitudes (k=1..N) |
|---|---|---|
| Onde carrée | 16 | `[1, 0, 1/3, 0, 1/5, 0, 1/7, 0, 1/9, 0, 1/11, 0, 1/13, 0, 1/15, 0]` |
| Triangle | 16 | `[1, 0, 1/9, 0, 1/25, 0, 1/49, 0, 1/81, 0, 1/121, 0, 1/169, 0, 1/225, 0]` |
| Dent-de-scie | 16 | `[1/k for k=1..16]` |
| Flûte | 8 | `[1, 0.15, 0.05, 0.02, 0, 0, 0, 0]` |
| Orgue (drawbars pleines) | 8 | `[1, 1, 1, 1, 1, 1, 1, 1]` |
| Cuivre | 12 | `1/k` avec emphase légère 2ᵉ/3ᵉ : `[1, 0.6, 0.37, 0.25, 0.2, 0.17, 0.14, 0.13, 0.11, 0.10, 0.09, 0.08]` |

**Inattendus-propres** (6) :

| nom | N | amplitudes (k=1..N) |
|---|---|---|
| Impaires seules | 8 | `[1, 0, 1, 0, 1, 0, 1, 0]` |
| Paires seules | 8 | `[0, 1, 0, 1, 0, 1, 0, 1]` |
| Triade 1+3+5 | 8 | `[1, 0, 1, 0, 1, 0, 0, 0]` |
| Octaves (1, 2, 4, 8, 16) | 16 | `[1, 0.7, 0, 0.5, 0, 0, 0, 0.3, 0, 0, 0, 0, 0, 0, 0, 0.1]` |
| Cluster 1+4+7 | 8 | `[1, 0, 0, 1, 0, 0, 1, 0]` |
| 1+5+9 (creux) | 9 | `[1, 0, 0, 0, 1, 0, 0, 0, 1]` |

Libellés et catégories via `strings.js`.

Tag : `feat(iter-M/phase-4.1): bibliothèque de presets de timbre (12 entrées)`.

### Sous-commit 4.2 — UI : charger un preset

- **Bouton de chargement** dans le Designer (header, sidebar, ou toolbar —
  là où c'est cohérent avec le pattern « charger un patch » existant). Au
  choix du dev, mais visible et trouvable.
- **Click** → ouverture d'un panel / dialog / dropdown listant les presets,
  **groupés par catégorie** (Évocateurs / Inattendus-propres), nom + courte
  description (tooltip ou ligne visible — à toi).
- **Click sur un preset** → action `LOAD_PRESET(id)` qui :
  - écrit le `patch` du preset dans l'editor draft (mode `harmonic`,
    amplitudes, N) ;
  - **bypass la passerelle de conversion** (on ne convertit pas, on
    *remplace*).
  - undoable atomique (un cran Ctrl+Z revient à l'état précédent).
- **Garde-fou** : si l'editor draft contient des modifications non
  sauvegardées par rapport au patch courant (dirty), demander confirmation
  avant d'écraser (dialog simple « Charger ce preset ? Tes modifications non
  sauvegardées seront perdues. [Charger] [Annuler] »). Si tu n'as pas de
  signal `dirty` fiable, demander la confirmation systématiquement plutôt
  que pas du tout.
- Le **PatchBank utilisateur n'est pas touché** — les presets sont une
  bibliothèque indépendante, code-only, read-only.
- Tag : `feat(iter-M/phase-4.2): UI charger un preset`.

## Comportement attendu

- Sélection d'un preset → le Designer reflète immédiatement les amplitudes,
  la Forme d'onde montre l'iDFT du preset, le Spectro statique montre les
  harmoniques posées, le son joué correspond.
- Undo annule le chargement (revient à l'état d'avant).
- Le PatchBank de l'utilisateur reste intact — les presets ne s'y mélangent
  pas.

## Hors scope

- **Édition / suppression** des presets factory (ce sont des `const`,
  read-only).
- **Sauvegarder un preset** créé par l'utilisateur : le PatchBank existant
  est le canal pour ça, pas la bibliothèque factory.
- **Presets en mode `spline` ou `draw`** : pas en M.4 (un user peut convertir
  un preset harmonique).
- Tri / recherche / filtres avancés dans la liste — pas en M.4.
- Animation de transition entre presets.

## Règles techniques

- `LOAD_PRESET` est distinct des actions de passerelle : il **remplace**
  l'editor draft (avec une copie défensive du preset, pour ne pas muter la
  donnée immuable).
- `strings.js` : ajouter les libellés des noms, descriptions, catégories,
  ainsi que les libellés UI (« Presets », « Évocateurs d'instruments »,
  « Inattendus-propres », libellé du bouton, libellé du dialog dirty).
- Build / typecheck / lint OK. Passe audio à l'utilisateur (c'est là qu'il
  jugera si une recette sonne mal et veut être ajustée).
- CONTEXT.md : composants (nouveau panel presets + module `presets.js`),
  État actuel, Historique, Roadmap M.4 cochée.
