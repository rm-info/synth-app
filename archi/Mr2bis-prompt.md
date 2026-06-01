# Prompt — Iteration M rattrapage, Phase M.r.2 bis : finitions UX

> Suite immédiate de M.r.2 — passe d'usage utilisateur. Trois points
> ciblés : un fix de rendu (point 4 du retour), deux ajustements UX
> (point 5). Phase courte.

## Contexte

M.r.2 a livré la barre du haut, le cap unifié, le switch Libre/Ancres et
les boutons Reset/Normaliser. La passe d'usage a remonté trois choses :

1. (déjà patché côté archi, mentionné pour traçabilité) Reset / Nouveau
   patch produisaient une sin fondamentale d'amplitude 1. Décision
   utilisateur : retour au silence (canonical à zéro). Patch posé dans
   `src/reducer.js` (DEFAULT_EDITOR.canonical + RESET_EDITOR_WAVEFORM).
   À garder en l'état — ne pas recâbler.
2. **Bug de redraw au switch Ancres → Libre** : la canvas Forme d'onde
   reste figée sur l'état précédent (souvent vide, parfois un résidu
   visuel du SplineEditor) jusqu'à ce que l'utilisateur modifie le
   tracé. Repasser sur Ancres restaure proprement. Hypothèse : le canvas
   du mode Libre est démonté/remonté à chaque switch (parce que la zone
   alterne entre `<SplineEditor>` JSX et le canvas Libre JSX dans
   `renderCanvasArea`), et la première frame ne se redessine pas — soit
   le useEffect dépend mal de `currentLens`, soit `pointsRef.current`
   n'est pas réinjecté assez tôt, soit le canvas natif a été cleared
   par un changement de `.width`/`.height` post-layout.
3. **UX du header Forme d'onde** : les contrôles spécifiques au mode
   Ancres (toggle Doux/Anguleux + slider Nombre d'ancres) apparaissent
   et disparaissent au switch — ça fait sauter le layout des contrôles
   adjacents. Aussi : le slider Nombre d'ancres n'a pas d'input text
   pour saisir directement une valeur (ex. taper `24`).

## Sous-commits

### M.r.2.5.1 — Redraw au switch Ancres → Libre

Investigation : ouvrir l'app, basculer en Ancres, modifier une ancre,
basculer en Libre — observer la canvas Forme d'onde. Elle doit afficher
la canonical courante immédiatement (pas après une modif utilisateur).

Pistes à explorer dans l'ordre :

1. **useEffect drawing** dans WaveformEditor : vérifier qu'il dépend de
   `currentLens` (ou de `points` / `editor.canonical`) et qu'il se
   redéclenche bien au switch. Si la dépendance est manquante, l'ajouter.
2. **Démontage/remontage** : en mode Ancres, le JSX rend
   `<SplineEditor>` ; en mode Libre, le JSX rend un `<canvas>` direct.
   React démonte/remonte donc le canvas Libre à chaque aller-retour.
   Vérifier que le `useLayoutEffect` (ou `useEffect`) de drawing
   s'attache bien sur le **nouveau** canvas via le `ref`, et que la
   première frame post-montage déclenche un draw. Si nécessaire,
   ajouter un `requestAnimationFrame` ou un déclencheur explicite au
   re-mount (par exemple un effect dont la dépendance inclut le canvas
   ref lui-même, ou un layout effect qui force un draw initial).
3. **`canvas.width` / `.height`** : si le canvas est dans un conteneur
   dont la largeur change au switch (auto-sizing, ou simplement parce
   que les contrôles du header changent), le navigateur peut le
   redimensionner et donc le clear. S'assurer que le drawing est
   re-déclenché après le redim.

Test de non-régression manuel :
- Ouvrir le Designer, dessiner librement quelque chose.
- Switch Libre → Ancres → Libre : la canonical doit s'afficher
  immédiatement à chaque switch, sans modif requise.
- Switch Libre → Ancres → modif d'une ancre → Libre : la canonical
  modifiée doit s'afficher immédiatement.
- Switch Libre → Harmoniques (drag de barre) → Libre : la canonical
  modifiée doit s'afficher immédiatement (déjà OK normalement, à
  reconfirmer).
- Faire varier rapidement le slider `cap` ou les proportions des
  colonnes : aucun artefact résiduel.

Tag : `fix(iter-M/phase-r.2.5.1): redraw canvas Forme d'onde au switch de lentille`.

### M.r.2.5.2 — Header Forme d'onde : contrôles toujours visibles, désactivés

Aujourd'hui le header de la zone Forme d'onde affiche le toggle
Doux/Anguleux et le slider Nombre d'ancres **uniquement** quand
`currentLens === 'spline'`. Au switch vers Libre, ces deux contrôles
disparaissent → les boutons restants se réorganisent visuellement, ce
qui est désagréable.

Demande : **garder les deux contrôles visibles à tout moment**, mais
les rendre **désactivés** (HTML `disabled`, opacité réduite,
non-cliquable) quand `currentLens === 'free'`. Aucune position de
bouton ne doit changer entre les deux lentilles — seul l'état activé/
désactivé varie.

Concrètement :
- Le bloc JSX `{currentLens === 'spline' && (...)}` qui enveloppe ces
  contrôles dans le header disparaît ; les contrôles sont toujours
  rendus.
- Sur chaque contrôle, ajouter `disabled={currentLens !== 'spline'}`
  (ou équivalent pour les sliders custom).
- Côté CSS, prévoir une classe ou un sélecteur `:disabled` qui réduit
  l'opacité et change le curseur en `not-allowed`. Garder le label
  visible (ne pas masquer).

Tag : `feat(iter-M/phase-r.2.5.2): contrôles Doux/Anguleux et Nombre d'ancres toujours visibles, désactivés en mode Libre`.

### M.r.2.5.3 — Input text à côté du slider Nombre d'ancres

Aujourd'hui le slider Nombre d'ancres se manipule uniquement à la
souris (drag du range). Demande : ajouter un **input number** à côté,
qui :
- Affiche la valeur courante (lue sur `anchors.length` ou
  `draftAnchorCount`).
- Permet à l'utilisateur de **taper une valeur** entre 4 et 32, validée
  au commit (Enter / blur), avec clamp + clamp aux bornes.
- Dispatche `setAnchorCount` au commit (pas à chaque keystroke).

Réutilise idéalement le composant `<NumberInput>` existant (utilisé
ailleurs dans le Designer pour la fréquence libre, etc.) — il gère déjà
le pattern parse/format/clamp et le commit au blur/Enter. Si la
signature ne correspond pas pile, c'est OK d'ajouter un wrapping minimal.

Layout suggéré du header en mode Spline :
```
[Libre|Ancres]   [Doux|Anguleux]   Ancres: [—————●———] [24]
```

L'input number partage le même état `disabled` que le slider et le
toggle (cf. M.r.2.5.2 — désactivé en mode Libre).

Tag : `feat(iter-M/phase-r.2.5.3): input number pour saisir le nombre d'ancres directement`.

## Mise à jour CONTEXT.md (commit séparé)

En fin de phase, commit `docs: CONTEXT.md — Iteration M phase r.2.5
(finitions UX header Forme d'onde + retour au silence au Reset)`.
Sections à toucher :

- **TL;DR** : ajouter une mention de la passe d'usage M.r.2.5 (silence
  au Reset, redraw fixé, contrôles désactivés au lieu de masqués).
- **État actuel** : modifier la description du Reset / Nouveau patch
  pour pointer le silence (au lieu de sin pure). Décrire le nouveau
  comportement du header Forme d'onde (contrôles toujours visibles).
- **Décisions architecturales** : remplacer la décision « sin
  fondamentale comme état neutre » par « silence comme état neutre,
  pour éviter d'imposer un timbre arbitraire ».
- **Historique** : ajouter une entrée pour M.r.2.5.

## Hors scope

- La bizarrerie « ancres à y=0 quand on bascule en Spline depuis un
  tracé libre » persiste : c'est M.r.3 (lentilles vivantes, re-fit auto
  des ancres à chaque changement de canonical). M.r.2.5 ne s'attaque
  PAS à ça — uniquement aux 3 points ci-dessus.
- Régression de phase à l'édition de barres / au Normaliser : M.r.4.
- Cosmétique de la zone Harmoniques (axes labellisés, repères
  pointillés) : M.r.5.

## Workflow

- Commits linéaires sur `main`. Ne push pas tout seul.
- Le redraw (M.r.2.5.1) est le sujet le plus délicat : si tu n'arrives
  pas à reproduire ou à localiser la cause précise après une
  investigation raisonnable, remonte ton hypothèse pour qu'on en
  discute avant de bricoler à l'aveugle.
