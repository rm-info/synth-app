# Prompt dev — Itération N · Phase 5c : refonte de la modale Presets

**Type** : `feat(iter-N/phase-5c)`. La modale Presets devient **l'unique point
d'entrée** des sons pré-fabriqués. S'appuie sur le moteur N.5b (`src/lib/waveforms.js`).
Inclut le **retrait de la barre de presets géométriques** (point 1). Découpé en 3
sous-commits.

## Modèle (rappel, verrouillé)

- **Formes de base** (sinus/carré/scie/triangle, via le moteur) : carré/scie/
  triangle ont **deux vues du même son** — *idéale* (forme brute, plate/droite,
  `cap=256`) et *band-limitée* (reconstruction phase naturelle à N, `cap=N`). Le
  **sinus** n'a qu'une vue (N figé à 1). N éditable **seulement** ici.
- **Timbres conçus** (flûte/orgue/cuivre + inattendus, `TIMBRE_PRESETS` existants) :
  une vue, chargés tels quels, **pas de N éditable**.
- Chaque preset a un **`anchorCount` idéal**, posé via DP (N.2) au chargement.

Maquette de référence :

```
┌─ Presets ─────────────────────────────────────────────── × ┐
│  FORMES DE BASE                                             │
│   ┌─────┐  Sinus                              N : 1 (figé)  │
│   │ ∿∿∿ │  une seule forme                                  │
│   └─────┘                                                   │
│   ┌─────┐ ┌─────┐  Carré                      N : [ 16 ]    │
│   │ ⊓‾⊔ │ │∿‾⊓‾∿│   idéale  ·  band-limitée               │
│   └─────┘ └─────┘   (plate)     (ondulée, suit N, live)     │
│   … scie, triangle : 2 vignettes + champ N                  │
│  TIMBRES   (flûte/orgue/cuivre)   — grille, 1 vignette      │
│  INATTENDUS                        — grille, 1 vignette     │
└─────────────────────────────────────────────────────────── ┘
```
Clic sur une vignette = charge cette vue/preset (avec garde-fou dirty).

---

## Sous-commit 5c.1 — données + chargement (reducer/lib)

1. **`BASE_WAVEFORMS`** (nouvelle liste, dans `src/lib/waveforms.js` ou
   `presets.js`) décrivant les 4 formes de base :
   ```
   { id:'sine',     type:'sine',     twoViews:false, snap:'fixed1', anchorCount:4 }
   { id:'square',   type:'square',   twoViews:true,  defaultN:16, snap:'odd', anchorCount:8 }
   { id:'sawtooth', type:'sawtooth', twoViews:true,  defaultN:16, snap:'all', anchorCount:6 }
   { id:'triangle', type:'triangle', twoViews:true,  defaultN:16, snap:'odd', anchorCount:6 }
   ```
   (libellés via `strings.js`, valeurs `anchorCount` à ajuster à l'œil ensuite.)
2. **`anchorCount`** ajouté à chaque entrée de `TIMBRE_PRESETS` (défaut ~8).
3. **Snapping de N** (helper pur) : saisie libre → recadre au plus proche selon
   `snap` : `'odd'` → impair le plus proche ; `'all'` → entier ; `'fixed1'` → 1.
   Borné `[1, 256]`.
4. **Chargement** : un chemin qui pose, en une action **undoable**, `canonical` +
   `cap` + **ancres DP à `anchorCount`** (via `fitAnchorsToCurve(canonical, anchorCount)`
   + résidu) :
   - base idéale → `canonical = idealWaveform(type)`, `cap = 256`,
     `canonicalNormalized = false`.
   - base band-limitée → `canonical = bandlimitedWaveform(type, N)`, `cap = N`,
     `canonicalNormalized = false`.
   - timbre conçu → `canonical = harmonicsToPoints(amplitudes, N_vecteur)` (chemin
     `LOAD_PRESET` actuel), `cap` = défaut, `canonicalNormalized = true` (phase
     sinus par construction), **+ ancres DP à `anchorCount`** (ajout).
   Étendre/unifier `LOAD_PRESET`/`APPLY_EDITOR_PRESET` plutôt que multiplier les
   actions. La passerelle « dirty » existante (confirmation d'écrasement) doit
   continuer de s'appliquer.

---

## Sous-commit 5c.2 — UI de la modale (`PresetPicker`)

Refonte du rendu (cf. maquette). Trois sections :

- **Formes de base** :
  - **sinus** : 1 vignette, pas de champ N (figé 1).
  - **carré/scie/triangle** : **2 vignettes côte à côte** — *idéale* (statique) et
    *band-limitée* — + un **champ numérique N** (saisie libre, snappé au blur/Enter).
    La vignette band-limitée **se redessine en live** quand N change. **Clic sur une
    vignette = charge cette vue** (idéale → cap 256 ; band-limitée → cap N courant),
    via `onPick` + garde-fou dirty.
- **Timbres** (évocateurs : flûte/orgue/cuivre) et **Inattendus** : grille de
  vignettes, 1 par preset, **clic = charge** tel quel.
- Vignettes via **`PatchThumbnail`** (iter-K) : lui passer les `points`
  (canonical générée par le moteur pour les bases, ou via `harmonicsToPoints` pour
  les timbres). La vignette band-limitée sélectionnée recalcule ses points sur
  changement de N (peu coûteux).

UX : Escape ferme (déjà là), clic backdrop ferme. Le `onPick` reçoit de quoi
résoudre le chargement (kind base/timbre, type/id, vue idéale/band-limitée, N) —
le composant peut résoudre la `canonical` lui-même (il a le moteur) et passer un
payload prêt au parent, qui applique dirty + dispatch.

CSS : adapter `PresetPicker.css` (grille de cartes, 2 vignettes pour les
classiques, champ N aligné). Latitude de style, mais lisible et cohérent avec le
thème (clair/sombre).

---

## Sous-commit 5c.3 — retrait de la barre Libre (point 1) + nettoyage

- **Supprimer la barre des 4 presets géométriques** affichée en mode Libre (+ son
  bouton Effacer, redondant avec l'Eraser no-confirm de N.5a). La modale la
  remplace intégralement.
- Nettoyer ce qui devient orphelin (anciens handlers de la barre ;
  `APPLY_EDITOR_PRESET` si plus appelé après unification en 5c.1 ;
  `generatePresetPoints` a déjà migré en N.5b).
- Vérifier qu'aucun chemin ne dépend plus de la barre.

---

## Vérifications globales

- Carré : vignette idéale = créneau plat ; band-limitée à N=16 = ondulée ; changer
  N redessine la band-limitée en live ; clic charge la bonne vue (cap 256 vs N).
- Triangle band-limité = triangle **arrondi** (phase naturelle), pas une bosse.
- Sinus : une vue, N figé.
- Timbres/inattendus : chargent comme avant, + ancres DP idéales.
- `anchorCount` : après chargement, la lentille Ancres a un jeu d'ancres
  exploitable (bien placées par DP).
- Garde-fou dirty toujours actif au chargement.
- La barre Libre a **disparu** ; plus aucun accès géométrique hors modale.
- `npm run build && npm run lint && npm run typecheck` verts ; thème clair/sombre OK.
- MAJ `CONTEXT.md` (la modale comme point d'entrée unique = décision archi ;
  modèle 2-vues) + backlog (N.5 clos). Commits `feat(iter-N/phase-5c.{1,2,3}): …`, push.

## Hors scope

- N éditable sur les timbres conçus (décision 1a : non).
- N.4 (lissage), N.6 (durcissements).
