# Prompt — Iteration M rattrapage, Phase M.r.2.6 : finitions UX (Reset resserré + iconographie Lucide)

> Suite directe de M.r.2.5 — deux ajustements remontés en passe d'usage :
> portée du bouton Reset à réduire, boutons et switches à transformer en
> icônes Lucide. Phase courte (deux sous-commits + docs).

## Contexte

Le bouton Reset de la barre du haut réinitialise actuellement
**canonical + cap + ancres + interpolation + résidu**. La passe d'usage
remonte que c'est trop large : on a déjà `Ctrl+Alt+N` (RESET_EDITOR) pour
une remise à zéro complète. Reset doit garder une portée plus restreinte
: **préserver le plafond d'harmoniques `cap`**, tout le reste retourne
aux defaults.

Par ailleurs, les boutons de la barre du haut (Presets, Reset, Normaliser)
et les switches du header Forme d'onde (Libre/Ancres, Doux/Anguleux)
sont actuellement rendus en **texte**. Demande UX : les passer en
**icônes Lucide** (déjà dépendance du projet — `lucide-react ^1.16.0`).

**Convention iconographique du projet (décision tranchée passe d'usage)** :
- **Lucide en priorité.** Plus jamais de caractères Unicode comme icônes
  — ni emojis, ni symboles graphiques (↺, ∼, ⌫, Σ, etc.), nulle part
  dans le projet.
- Si rien dans Lucide ne convient sémantiquement, faire un **SVG inline
  dans le style Lucide** : stroke fin (~2 px), pas de fill, formes
  simples, `currentColor`, taille cohérente avec les icônes Lucide
  voisines (24×24 par défaut).
- Cette règle s'applique à toutes les phases futures du projet, pas
  uniquement à M.r.2.6.

## Décisions techniques actées avant le découpage

- **`RESET_EDITOR_WAVEFORM` resserre sa portée** : `canonical`,
  `residual`, `anchors`, `interpolation`, `preset` retournent aux
  defaults. **Seul `cap` est préservé** par rapport à l'ancienne version
  totale. ADSR / amplitude / test* / visualCue* / currentPatchId /
  currentLens étaient déjà préservés et le restent.
- **Switch Libre/Ancres → un seul bouton toggle** porteur de l'icône
  Spline. Toggled = lentille spline active ; non-toggled = lentille
  libre. Ce bouton sert aussi de **label visuel pour le slider Nombre
  d'ancres** (placé juste à sa droite). Plus simple qu'un switch
  2-state. Le toggle Doux/Anguleux reste un toggle 2-state séparé,
  visible/désactivé selon le même état (cf. M.r.2.5.2).
- **Icône devant le slider Harmoniques** : indicateur visuel sans
  bouton, juste pour repérer la sémantique (« voici le contrôle des
  harmoniques »). Tooltip via `title`. Pas d'action au click.

## Choix d'icônes Lucide

| Cible | Icône Lucide | Tooltip (title) |
|---|---|---|
| Bouton Presets (barre du haut) | `FolderOpenDot` | « Charger un preset de timbre » |
| Bouton Reset (barre du haut) | `Eraser` | « Effacer le timbre (canonical, ancres) — préserve le plafond d'harmoniques » |
| Bouton Normaliser (barre du haut) | `Sigma` | « Normaliser : redessiner le tracé comme la somme des harmoniques courantes (phase canonique) » |
| Toggle Libre↔Ancres (header Forme d'onde) | `Spline` | toggled : « Lentille Ancres — édition par points de contrôle » / non-toggled : « Cliquer pour basculer en lentille Ancres » |
| Indicateur slider Harmoniques (header Harmoniques, non-interactif) | `AlignEndHorizontal` (premier choix) ; `AudioLines` ou `BarChart3` si meilleur rendu | « Plafond d'harmoniques (1..256) » |
| Toggle Doux/Anguleux (header Forme d'onde) | **SVG custom** (Lucide n'a rien d'approprié) | Doux : « Courbe lisse (Catmull-Rom) » / Anguleux : « Polyligne (segments droits) » |

**Le choix `Sigma`** pour Normaliser est sémantiquement parfait : la
normalisation calcule littéralement `Σ amplitudes_k · sin(2πkx/600)`,
et ça raccroche aussi au renderer math M.5a (`\sum` à bornes empilées).

**Note sur `Spline`** : si cette icône précise n'existe pas dans la
version 1.16 de `lucide-react` (le catalogue évolue), fallback :
`Waypoints` (un trajet avec points intermédiaires) ou `Workflow`.
Le dev arbitre visuellement.

**SVG Doux/Anguleux** : deux SVG inline complémentaires, ~24×24, dans
le style Lucide (stroke 2, `currentColor`, pas de fill). Un sin
sinusoïdal lisse pour Doux ; le même profil mais rendu en zigzag
triangulaire (segments droits) pour Anguleux. Visuellement, l'idée est
que l'utilisateur voit la **différence de courbure** entre les deux
boutons.

## Sous-commits

### M.r.2.6.1 — Resserrer la portée du Reset

`src/reducer.js`, case `RESET_EDITOR_WAVEFORM` :

```
return {
  ...state,
  editor: {
    ...state.editor,
    canonical: new Array(POINTS_RESOLUTION).fill(0),
    residual: new Array(POINTS_RESOLUTION).fill(0),
    anchors: defaultSplineAnchors(),          // 8 ancres équiréparties à y=0
    interpolation: DEFAULT_SPLINE_INTERPOLATION, // 'soft'
    preset: null,
    // cap : PRÉSERVÉ (≠ Nouveau patch Ctrl+Alt+N qui réinitialise tout)
  },
}
```

Mettre à jour le commentaire de la case pour refléter la nouvelle
portée (« réinitialise canonical, ancres, interpolation, résidu. `cap`
est préservé pour ne pas perdre le réglage de plafond. Ctrl+Alt+N
(RESET_EDITOR) reste l'outil de remise à zéro complète. »).

Mettre à jour le message du `ConfirmDialog` côté UI pour qu'il reflète
la portée actuelle : par exemple « Effacer le timbre actuel ? Le tracé,
les ancres et le résidu seront réinitialisés. Le plafond d'harmoniques
et le reste de l'éditeur sont conservés. »

**Test de non-régression manuel** :
- Configurer un éditeur : tracer librement, modifier le cap à 64,
  ajouter / déplacer des ancres, modifier l'ADSR.
- Reset → confirme → vérifier que :
  - Le tracé canvas est plat (silence).
  - **Le cap reste à 64** (pas remis à 256).
  - Les ancres sont remises à 8 équiréparties à y=0.
  - L'ADSR reste inchangé.

Tag : `feat(iter-M/phase-r.2.6.1): Reset → canonical+ancres+résidu réinitialisés, cap préservé`.

### M.r.2.6.2 — Iconographie Lucide pour barre du haut et headers de zone

Selon le tableau de choix d'icônes ci-dessus. Trois groupes :

**Groupe A — Boutons d'action de la barre du haut**
(`src/components/DesignerToolbar.jsx`) :
- Importer les icônes depuis `lucide-react` : `FolderOpenDot`, `Eraser`,
  `Sigma`.
- Remplacer le texte des trois boutons par l'icône correspondante.
- Conserver `title` (tooltip natif) avec le sens complet.
- Conserver `aria-label` pour l'accessibilité.

**Groupe B — Toggle unique Libre↔Ancres dans le header Forme d'onde**
(`src/components/WaveformEditor.jsx`) :
- Supprimer le switch 2-state actuel (deux boutons Libre / Ancres
  séparés).
- Remplacer par **un seul bouton toggle** porteur de l'icône `Spline`.
- État `aria-pressed={currentLens === 'spline'}` ; `is-active` class
  quand toggled. Tooltip dynamique selon état (cf. tableau).
- Click → `editorActions.setCurrentLens(currentLens === 'spline' ? 'free' : 'spline')`.
- Le bouton sert visuellement de label devant le slider Nombre
  d'ancres. Layout suggéré : `[Spline⌥] [—————●———] [24]` (toggle +
  slider + input number) sur la même ligne.
- Le toggle Doux/Anguleux reste séparé, après le bloc Spline.

**Groupe C — Toggle Doux/Anguleux dans le header Forme d'onde**
(`src/components/WaveformEditor.jsx`) :
- Créer deux SVG inline (`IconDoux`, `IconAnguleux`) — sin lisse vs sin
  zigzag, style Lucide (stroke 2, `currentColor`, 24×24, pas de fill).
- Suggestion d'emplacement : un nouveau fichier
  `src/components/icons.jsx` qui exporte aussi `IconDoux`,
  `IconAnguleux`, et tout autre SVG custom à venir (pour grouper la
  convention).
- Si tu produis 2-4 SVG distincts, regroupe-les dans ce fichier ; un
  seul SVG isolé peut rester inline dans le composant.

**Groupe D — Indicateur devant le slider Harmoniques**
(`src/components/WaveformEditor.jsx`, header zone Harmoniques) :
- Icône Lucide non-interactive (un simple `<AlignEndHorizontal />` à
  côté du label « Harmoniques : N / 256 »).
- Tooltip via `title` sur le conteneur, pas de `button`.
- Si `AlignEndHorizontal` rend bizarrement (orientation, taille),
  fallback : `AudioLines` ou `BarChart3`. À toi de juger visuellement.

**CSS partagée** : prévoir une classe `.icon-btn` (ou réutilise une
classe existante équivalente si elle existe) qui homogénéise la taille,
le padding, la couleur. Les icônes Lucide s'utilisent comme des
composants React :

```jsx
import { Eraser } from 'lucide-react'
<button className="icon-btn" title="..." aria-label="...">
  <Eraser size={16} />
</button>
```

`size={16}` ou `size={18}` selon le rendu visuel attendu dans la barre
du haut. Pour le toggle Spline et le toggle Doux/Anguleux, harmoniser
sur la même taille.

Tag : `feat(iter-M/phase-r.2.6.2): iconographie Lucide (Eraser/FolderOpenDot/Sigma/Spline) + SVG custom Doux/Anguleux`.

## Mise à jour CONTEXT.md (commit séparé)

En fin de phase, commit `docs: CONTEXT.md — Iteration M phase r.2.6
(Reset resserré + iconographie Lucide)`. Sections à toucher :

- **TL;DR** : mention r.2.6.
- **État actuel** :
  - `RESET_EDITOR_WAVEFORM` : mettre à jour sa description (canonical
    + ancres + interpolation + résidu réinitialisés ; **cap** préservé).
  - Mention des icônes Lucide dans la barre du haut + toggle Spline
    unique + toggles Doux/Anguleux en SVG custom.
- **Décisions architecturales** :
  - Reset Designer : « efface le timbre et ramène les ancres à leur
    état initial, mais préserve le plafond d'harmoniques. Ctrl+Alt+N
    (RESET_EDITOR) reste l'outil de remise à zéro complète. »
  - **Convention iconographique du projet** : Lucide en priorité, SVG
    style Lucide en fallback, **plus jamais d'Unicode** comme icône
    ni séparateur visuel. À appliquer partout dans le projet.
- **Historique** : entrée r.2.6.

## Hors scope M.r.2.6 (rappel)

- Lentilles vivantes (re-fit auto, sync) : M.r.3.
- Détection d'état normalisé + dialog edit-bars-requires-normalize : M.r.4.
- Courbe normalisée en background : M.r.4.
- Cosmétique zone Harmoniques (axes labellisés, repères) : M.r.5.
- Refonte chaîne FFT 600↔512 (bug remonté passe d'usage M.r.2.5, accepté
  au backlog) : hors rattrapage.
- Migration des autres parties du Designer (ADSR, fréquence test…) à
  l'iconographie Lucide : à faire au fil de l'eau si une icône y passe,
  pas une phase dédiée.

## Workflow

- Commits linéaires sur `main`. Ne push pas tout seul.
- Sur le rendu visuel des icônes (taille, alignement vertical avec les
  labels textes adjacents), faire confiance à l'œil et ajuster. Si une
  icône Lucide candidate (`AlignEndHorizontal`, `Spline`) rend
  visuellement décevant, choisir un fallback raisonnable et le mentionner
  dans le commit message — l'utilisateur arbitrera à la passe d'usage.
- Sur les SVG custom (Doux/Anguleux), prioriser la lisibilité immédiate
  à la sophistication. Un sinus lisse contre un zigzag triangulaire est
  plus parlant qu'une nuance subtile.
