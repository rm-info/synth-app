# On_Synth_App

Synthétiseur web **pédagogique**. Le geste tient en trois temps : on dessine
une forme d'onde, on la place sur une timeline multipiste, on exporte en WAV.

(`On_Synth_App` est le nom du produit ; `synth-app` celui du paquet npm et du
dépôt.)

## Ce qui le distingue

Tout le son passe par la **Web Audio API native** — aucune bibliothèque audio
externe. L'oscillateur n'est pas un générateur standard : c'est une
`PeriodicWave` recalculée par **DFT** à partir d'une courbe canonique éditable,
tronquée à **256 harmoniques** et anti-aliasée. Ce qu'on dessine devient
littéralement le spectre qu'on entend.

## Multi-tempérament

Le second volet est plus inhabituel pour un synthé web : une quinzaine de
systèmes d'accordage, du standard au microtonal, regroupés en familles.

- **Tempéraments égaux** — 12-TET, 24-TET, et un **X-EDO paramétrique**
  (microtonal, jusqu'à 53 divisions de l'octave).
- **Justes & historiques** — pythagoricien, juste intonation, mésotonique
  ¼ de comma, Werckmeister III.
- **Hors tradition occidentale** — maqâm (Le Caire 1932), gamelan
  (Slendro, Pelog), shrutis indiens.
- **Libre** — fréquence continue, sans grille.

Le catalogue détaillé (origine, époque, particularité acoustique de chaque
système) vit dans l'onglet Documentation de l'application ; ce README ne le
duplique pas.

## Stack

- **React 19** + **Vite 8** (SWC via `@vitejs/plugin-react`)
- **Web Audio API** native
- **TypeScript incrémental** — voir l'encart ci-dessous
- Persistance : `localStorage`. Icônes : `lucide-react`.

> **Sur le TypeScript.** Le projet a longtemps tenu la contrainte « pas de
> TypeScript ». Elle a été levée au profit d'une **migration incrémentale** :
> `allowJs` actif, adoption fichier par fichier, `strict` activé au cas par cas.
> JavaScript et TypeScript cohabitent, sans réécriture en masse — une décision
> d'architecture assumée plutôt qu'un grand soir.

### Contraintes volontaires

Le projet tient par son minimalisme. On s'en tient donc à : pas de
bibliothèque audio, pas de state manager (un seul `useReducer` global dans
`App.jsx`), pas de framework UI (CSS manuscrit), pas de routing, pas de backend.

## Architecture

Une application monobloc, sans routeur, organisée en **quatre onglets
autonomes**. Chacun dispose de sa propre pile undo/redo (le `Ctrl+Z` est routé
selon l'onglet actif).

1. **Bibliothèque** — un explorateur de patches façon gestionnaire de fichiers :
   affichages Tree/Nav × List/Details/Tiles, multi-sélection, presse-papiers
   Copier/Couper/Coller, drag-and-drop, enregistrement avec sélecteur de
   dossier, import/export `.osa`, et bascule de thème clair/sombre.
2. **Designer** — l'édition d'un patch. Une même **courbe canonique** se
   travaille à travers **trois lentilles** : tracé libre, ancres/spline, et
   éditeur d'harmoniques (barres). Le tout avec spectrogramme, presets de
   timbre, normalisation de phase, et édition de l'enveloppe **AHDSR** (handles
   draggables). La preview est polyphonique, via un clavier visuel adapté au
   système d'accordage choisi (souris ou QWERTY physique, avec pédale de
   sustain).
3. **Composer** — la timeline multipiste : mute/solo/volume par piste,
   placement de clips par glisser depuis la bibliothèque ou au clavier,
   spectrogramme, et **export WAV** PCM 16-bit. La hauteur est portée par chaque
   clip — un même patch se joue à n'importe quelle note sans duplication.
4. **Documentation** — un manuel intégré (renderer Markdown maison), doublé de
   deux aides contextuelles déclenchables partout : l'overlay **Raccourcis**
   (`Ctrl+K`) et le **Tour** guidé (`Ctrl+J`).

## Setup

```bash
npm install
npm run dev        # serveur de développement (localhost:5173)
npm run build      # build de production (dist/)
npm run preview    # preview du build
npm run lint
npm run typecheck  # vérification TypeScript (tsc --noEmit)
```

## Résolutions supportées

L'application est conçue pour une résolution de **1920×1080** ou plus (≈ 1740×900
de fenêtre après chrome navigateur et OS).

- **< 1024×768** (≈ 924×668 de fenêtre) : placeholder pleine page, app
  inutilisable.
- **Entre les deux** : modale d'avertissement dismissible, app utilisable mais
  UX dégradée.
- **≥ 1920×1080** : passe-plat.

L'adaptation aux résolutions intermédiaires est en backlog.

## Versions

Versionnage [SemVer](https://semver.org/) :

- **patch** (1.0.x) — bugfix sans changement de comportement ;
- **minor** (1.x.0) — feature non-breaking ;
- **major** (x.0.0) — rupture (modèle de données, etc.).

La version courante s'affiche en haut à droite de la barre d'onglets, injectée
au build depuis `package.json` via le `define` de Vite.

## Contribution

Le projet se construit en collaboration humain ↔ Claude, avec des rôles
séparés : l'**architecte** rédige les prompts et valide ; l'**implémenteur**
applique et tient le contexte à jour ; le **writer** s'occupe de la rédaction.
Les commits sont linéaires sur `main`.

Pour aller plus loin : `CONTEXT.md` est le brief technique vivant,
`CONTEXT-ARCHIVE.md` l'historique détaillé, et `CLAUDE.md` les conventions de
collaboration.
