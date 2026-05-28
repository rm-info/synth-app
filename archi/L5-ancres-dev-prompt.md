# Prompt dev — Ancres data-anchor : 1 fix + 4 poses (prépa clôture L.5)

## Contexte

La rédaction des guides (L.5e) a fait remonter, par vérification du
DOM réel, **un bug actif** et **plusieurs ancres manquantes** que
les guides voudront cibler en DocLink. Cette passe les traite côté
code. Le **rebranchement** des DocLink (côté writer) viendra
ensuite.

## 1. FIX — `composer-duration-buttons` (bug actif, prioritaire)

**Symptôme** : l'ancre est déclarée (`shortcuts.js`, tour Composer)
et **passée en prop** — `Toolbar.jsx:118` :
`<DurationButtons … dataAnchor="composer-duration-buttons" />` —
mais le composant `DurationButtons` **n'applique jamais cette prop**
sur son élément DOM. Aucun `data-anchor="composer-duration-buttons"`
n'existe dans le rendu.

**Conséquences (features livrées cassées)** :
- Overlay raccourcis **Ctrl+K** en Composer : l'étiquette des durées
  (NumPad / Shift+Digit) ne se positionne pas (`getAnchoredPosition`
  renvoie `found:false`).
- **Tour Composer** : l'étape « La durée par défaut » est skippée
  gracieusement (donc absente du tour).

**Fix** : dans `DurationButtons.jsx`, consommer la prop `dataAnchor`
et la poser sur le conteneur racine du composant
(`<div … data-anchor={dataAnchor}>`). Vérifier le nom exact de la
prop reçue (Toolbar passe `dataAnchor`).

**Validation** : après fix, Ctrl+K en Composer affiche l'étiquette
des durées sur les boutons ; le Tour Composer inclut l'étape « La
durée par défaut ».

## 2. POSE — 4 ancres manquantes (pour DocLink des guides)

Ces éléments existent fonctionnellement mais ne portent pas
d'ancre. Pose un `data-anchor` (convention existante) sur l'élément
visible pertinent. **Pas d'effet immédiat** (aucun consommateur
encore) — elles seront ciblées par les DocLink des guides au
rebranchement writer.

| Ancre à poser | Élément cible | Indice |
|---|---|---|
| `composer-export-button` | bouton déclencheur de l'export WAV (ouvre `ExportModal`) dans la toolbar Composer | `playback.exportWav` / `ExportModal` |
| `composer-add-track-button` | bouton de création de piste | reducer `CREATE_TRACK` (max 16) |
| `designer-amplitude` | le réglage d'amplitude du patch dans le Designer | patch = forme d'onde + AHDSR + **amplitude** |
| `library-new-folder-button` *(à vérifier)* | bouton « nouveau dossier » Bibliothèque **s'il existe** comme élément stable | sinon, signale qu'il n'y a pas d'élément ancrable |

Pour `composer-export-button` et `designer-amplitude`, le writer
n'était pas certain de l'emplacement/label exact — c'est toi qui
tranches en posant l'ancre sur le bon élément.

## Hors scope

- Ne touche pas aux contenus `.md` (c'est le writer qui rebranchera
  les DocLink vers ces ancres).
- Pas de nouvelle feature : tu ne fais qu'ancrer l'existant (+ le
  fix duration-buttons).
- Retrait de `_renderer-test.md`, bump version : autres étapes de
  clôture, pas ici.

## Livraison

- Commits : `fix(iter-L): DurationButtons applique data-anchor` +
  `feat(iter-L): ancres export/track/amplitude pour DocLink guides`
  (ou regroupés).
- CONTEXT.md : si tu juges utile, une ligne sur les ancres ajoutées
  (sinon RAS, c'est mineur).
- Compte-rendu : ancres posées (ids exacts), et le cas
  `library-new-folder-button` (posée ou inexistante).

Bon vent.
