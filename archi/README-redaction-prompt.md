# Prompt writer — Rédaction du README.md

**Rôle** : writer. Tâche de **rédaction** : réécrire le `README.md` racine du
dépôt. Pas de code, pas de modification de `src/`. L'archi te fournit ici
l'audit, la vérité-terrain et les contraintes ; **la prose est la tienne** — ne
te contente pas de mettre en puces la matière brute ci-dessous, écris un vrai
README qui se lit.

## Pourquoi cette tâche

Le `README.md` GitHub a vieilli là où le projet a le plus bougé (itérations L et
M). Il affirme des choses fausses aujourd'hui. On le resynchronise sur l'état
v1.5.0.

## Audience & registre

- **Public** : visiteurs / développeurs qui découvrent le projet sur GitHub.
  Secondairement, toute personne curieuse du produit.
- **Registre** : **présentation de projet**, neutre/auctorial (« on »). Ce
  **n'est pas** un article guidé ni une bulle d'aide → **pas de tutoiement** ici
  (le tutoiement reste réservé aux articles et bulles in-app). Français.
- **Discipline factuelle** (convention projet) : pas de superlatif gonflé. On
  peut dire que le volet multi-tempérament est « inhabituel pour un synthé web »,
  pas « le plus complet du monde ». On borne, on ne survend pas.
- Ton : sobre, précis, un peu fier du minimalisme assumé. Le lecteur doit
  comprendre en 30 secondes ce que fait l'app et ce qui la distingue.

## Décisions de cadrage (arbitrées par l'archi — à respecter tel quel)

1. **Titre H1 `On_Synth_App` conservé** : c'est le **nom commercial**.
   `synth-app` est le **nom technique** (package npm, dépôt). Le README doit
   expliciter ce rapport en une touche légère (une parenthèse suffit), sans en
   faire un paragraphe.
2. **Image hero** : `src/assets/hero.png` existe. **Avant de l'inclure**,
   ouvre-la et vérifie qu'elle reflète l'UI actuelle (**4 onglets**, Designer
   post-M avec les 3 lentilles / spectro). Si oui → place-la en tête, en
   relatif (`![On_Synth_App](src/assets/hero.png)`). Si elle est **périmée**
   (capture pré-M, 3 onglets) → **ne l'inclus pas** et signale-le en fin de
   livraison (« hero.png à regénérer »). Ne fabrique pas de capture toi-même.
3. **Pas de traduction anglaise** : projet francophone, README en français. (Une
   version EN viendra peut-être plus tard, hors scope.)

## Vérité-terrain (la matière exacte — à reformuler, pas à recopier)

### Pitch
Synthétiseur web **pédagogique**. Trois gestes : on **dessine une forme d'onde**,
on la **place sur une timeline multipiste**, on **exporte en WAV**.

### La spécificité technique distinctive
- **Web Audio API native uniquement, aucune lib audio externe.** L'oscillateur
  est une `PeriodicWave` calculée par **DFT** (tronquée à **256 harmoniques**,
  anti-aliasée) à partir d'une **courbe canonique** éditable.

### Le volet multi-tempérament (argument fort, à présenter sans survendre)
Une quinzaine de systèmes d'accordage, du standard au microtonal. Familles :
- **Tempéraments égaux** : 12-TET, 24-TET, et **X-EDO paramétrique** (microtonal,
  jusqu'à 53 divisions de l'octave).
- **Justes & historiques** : Pythagoricien, juste intonation, mésotonique
  ¼ de comma, Werckmeister III.
- **Hors tradition occidentale** : maqâm (Le Caire 1932), gamelan (Slendro,
  Pelog), shrutis indiens.
- **Libre** : fréquence continue, sans grille.

Le catalogue détaillé (origine, époque, particularité acoustique) vit dans
l'onglet Documentation de l'app — le README n'a pas à le dupliquer.

### Stack
- **React 19** + **Vite 8** (SWC via `@vitejs/plugin-react`)
- **Web Audio API** native
- **TypeScript incrémental** : `allowJs`, adoption opt-in fichier par fichier,
  `strict` activé au cas par cas. ⚠️ **Point de péremption n°1** : l'ancien
  README disait « Pas de TypeScript » — c'est **faux** depuis le préalable de
  l'iter M. À corriger explicitement (un encart « la contrainte historique a été
  levée au profit d'une migration incrémentale » est le bienvenu, ça raconte une
  décision d'archi assumée).
- Persistance : `localStorage`. Icônes : `lucide-react`.

### Contraintes volontaires (le projet tient par son minimalisme)
Pas de lib audio · pas de state manager (un seul `useReducer` global dans
`App.jsx`) · pas de framework UI (CSS manuscrit) · pas de routing · pas de
backend.

### Architecture : app monobloc à **QUATRE** onglets autonomes
⚠️ **Point de péremption n°2** : l'ancien README dit « trois onglets ». Il y en
a **quatre** depuis l'iter L. Pile undo/redo dédiée par onglet (routing Ctrl+Z
par `activeTab`).

1. **Bibliothèque** — explorateur de patches type file-explorer (affichages
   Tree/Nav × List/Details/Tiles, multi-sélection, clipboard Copier/Couper/
   Coller, drag-and-drop, enregistrement avec folder picker, **import/export
   `.osa`**, toggle **thème clair/sombre**).
2. **Designer** — ⚠️ **Point de péremption n°3** : refonte complète à l'iter M,
   l'ancienne description (« dessin + AHDSR ») est obsolète. Réalité actuelle :
   une même **courbe canonique** éditée par **trois lentilles** — **tracé
   libre**, **ancres/spline**, **éditeur d'harmoniques** (barres) — avec
   **spectrogramme**, **presets de timbre**, **normalisation** de phase, et
   édition de l'**enveloppe AHDSR** (handles draggables). Preview polyphonique
   via clavier visuel adapté au système d'accordage (souris + QWERTY physique,
   pédale de sustain).
3. **Composer** — timeline multipiste (mute/solo/volume par piste), placement de
   clips par drag depuis la bibliothèque ou au clavier, **spectrogramme**,
   **export WAV** PCM 16-bit. La hauteur est portée par chaque clip (un patch se
   joue à n'importe quelle note sans duplication).
4. **Documentation** — manuel intégré (renderer Markdown maison), plus deux aides
   contextuelles déclenchables partout : **Raccourcis** (overlay `Ctrl+K`) et
   **Tour** guidé (`Ctrl+J`).

### Features à rendre visibles (absentes de l'ancien README)
Documentation/Tour/Raccourcis (iter L), import/export `.osa` (H), spectrogramme
avancé (I), anti-aliasing audio (J), thème clair/sombre (K), waveform designer
(M).

### Setup
```bash
npm install
npm run dev        # serveur de développement (localhost:5173)
npm run build      # build de production (dist/)
npm run preview    # preview du build
npm run lint
npm run typecheck  # vérification TypeScript (tsc --noEmit)  ← à ajouter, absent de l'ancien README
```

### Résolutions supportées (toujours exact, à conserver)
Conçue pour **1920×1080** ou plus (≈ 1740×900 de fenêtre). < 1024×768 :
placeholder pleine page, inutilisable. Entre les deux : modale d'avertissement
dismissible, UX dégradée. ≥ 1920×1080 : passe-plat. L'adaptation aux résolutions
intermédiaires est en backlog.

### Versionnage (toujours exact, à conserver)
[SemVer](https://semver.org/) — patch = bugfix ; minor = feature non-breaking ;
major = rupture (modèle de données, etc.). Version affichée en haut à droite de
la barre d'onglets, injectée au build depuis `package.json` via Vite `define`.

### Source de vérité / contribution
Workflow humain ↔ Claude en rôles séparés (architecte : prompts + validation ;
implémenteur : applique + tient le contexte ; writer : rédaction). Commits
linéaires sur `main`. `CONTEXT.md` = brief technique vivant ; `CONTEXT-ARCHIVE.md`
= historique détaillé ; `CLAUDE.md` = conventions de collaboration.

## Structure suggérée (squelette — l'agencement final est ton choix)

`# On_Synth_App` → (hero conditionnel) → pitch + spécificité → multi-tempérament
→ Stack → Contraintes volontaires → Architecture (4 onglets) → Setup →
Résolutions → Versions → Contribution.

## Vérifications de fin

- `git grep -n "trois onglets\|Pas de TypeScript" README.md` → doit ne **rien**
  retourner.
- 4 onglets présents et nommés ; Designer décrit en version post-M ; `typecheck`
  dans le setup.
- Hero : incluse seulement si à jour, sinon signalée.
- Livraison : commit `docs(readme): synchronise avec l'état v1.5.0 (4 onglets, TS incrémental, Designer post-M)` selon ta convention de livraison habituelle.

## Hors scope

- Régénérer une capture d'écran (vérifier/omettre l'existante seulement).
- Toute modif de `src/`, `CONTEXT.md`, `CONTEXT-ARCHIVE.md`.
- Version anglaise du README.
