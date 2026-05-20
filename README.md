# On_Synth_App

Synthétiseur web pédagogique : on dessine une forme d'onde à la souris,
on la place sur une timeline multipiste, on exporte en WAV.

Spécificité : **Web Audio API natif uniquement, pas de lib audio externe**.
Multi-tempérament (12-TET, Pythagoricien, Juste intonation, mésotonique,
Werckmeister, Caire 1932, gamelan Slendro/Pelog, shrutis indiens
Bhatkhande/Sarngadeva, X-EDO paramétrique, Libre).

## Stack

- **React 19** + **Vite 8** (SWC via `@vitejs/plugin-react`)
- **Web Audio API** native (oscillateur custom via `PeriodicWave` calculé
  par DFT depuis les points dessinés)
- Persistance : `localStorage`
- Icônes : `lucide-react`

Contraintes volontaires :
- Pas de TypeScript
- Pas de state manager (un seul `useReducer` global dans `App.jsx`)
- Pas de framework UI (CSS manuscrit)
- Pas de routing (app monobloc à deux onglets)
- Pas de backend

## Architecture

L'app est un monobloc à deux onglets :

- **Designer** : dessin de la forme d'onde, édition de l'enveloppe AHDSR
  (4 handles draggables), preview polyphonique via clavier visuel adapté
  au système musical choisi.
- **Composer** : timeline multipiste (mute/solo/volume par piste),
  placement de clips par drag depuis la bibliothèque ou raccourcis
  clavier, export WAV PCM 16-bit stéréo.

La source de vérité projet est `CONTEXT.md` à la racine : modèle de
données, composants, décisions architecturales, itérations livrées,
roadmap.

## Setup

```bash
npm install
npm run dev      # serveur de développement (localhost:5173)
npm run build    # build de production (dist/)
npm run preview  # preview du build
npm run lint
```

## Résolutions supportées

L'application est conçue pour une résolution d'écran de **1920×1080**
ou plus (≈ 1740×900 de taille de fenêtre après chrome navigateur + OS).

- **< 1024×768** (≈ 924×668 de fenêtre) : placeholder pleine page,
  app non utilisable.
- **Entre les deux** : modale d'avertissement dismissible, app
  utilisable mais UX dégradée.
- **≥ 1920×1080** : passe-plat.

L'adaptation UI pour les résolutions intermédiaires est en backlog.

## Versions

Versionnage [SemVer](https://semver.org/) :
- **patch** (1.0.x) : bugfix sans changement de comportement
- **minor** (1.x.0) : nouvelle feature non-breaking
- **major** (x.0.0) : rupture (modèle de données, breaking API, etc.)

La version courante s'affiche en haut à droite de la barre des onglets,
injectée au build depuis `package.json` via Vite `define`.

## Contribution

Architecte : prompts précis. Implémenteur : applique tel quel et tient
`CONTEXT.md` à jour à chaque phase. Commits linéaires sur `main`,
nommés `type(iter-X/phase-N.M): description`.

Voir `CLAUDE.md` pour les conventions de collaboration humain ↔ Claude
Code et `CONTEXT.md` pour les détails techniques.
