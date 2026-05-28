# Prompt writer — Clôture L.5 (rebranchement des liens + retrait du fichier de test)

## Contexte

Tout le contenu rédactionnel L.5 est livré (glossaires, 12 fiches,
articles longs, guides, limites). Cette passe **rebranche les liens
qui attendaient leurs cibles** et **retire le fichier de test du
renderer**. Pas de nouveau contenu.

Les ancres `data-anchor` manquantes que tu avais signalées en L.5e
**ont été posées par le dev** (export, gestion pistes, amplitude,
nouveau dossier) — elles existent maintenant, tu peux les cibler.

## Pré-lecture

`writer/CLAUDE.md` (scheme `doc:`, DocLink, vérif ancre). Les
fichiers concernés ci-dessous.

## 1. Rebrancher les guides → nouvelles ancres UI

Dans les guides, tu avais dû décrire **en texte** des éléments
faute d'ancre. Elles existent désormais — remplace ces mentions
textuelles par des DocLink :

| Guide | Élément | Ancre (vérifiée, posée) |
|---|---|---|
| `guide-composer.md` | export WAV | `composer-export-button` |
| `guide-composer.md` | créer/gérer une piste | `composer-add-track-button` |
| `guide-designer.md` | réglage d'amplitude | `designer-amplitude` |
| `guide-bibliotheque.md` | nouveau dossier | `library-new-folder-button` |

Note : `composer-add-track-button` et `library-new-folder-button`
sont à **rendu conditionnel** (le bouton piste disparaît à 16
pistes ; le bouton dossier n'existe qu'en onglet Bibliothèque
plein). Le DocLink retombe en no-op gracieux si l'élément est
absent — c'est acceptable, mais formule le texte pour que ça reste
sensé même sans surlignage.

## 2. Rebrancher le glossaire musical → fiches tempéraments

Les 12 fiches existent maintenant (le glossaire a été écrit avant,
d'où des renvois restés textuels / vers `why-12-notes`). Ajoute un
`doc:` vers la fiche correspondante dans les entrées concernées du
**glossaire musical** :

| Entrée glossaire | Fiche(s) cible(s) |
|---|---|
| 12-TET | `doc:temperament-12-tet` |
| EDO | `doc:temperament-x-edo` |
| Gamelan | `doc:temperament-slendro`, `doc:temperament-pelog` |
| Intonation juste | `doc:temperament-juste-majeur` |
| Maqâm | `doc:temperament-24-tet`, `doc:temperament-cairo-1932` |
| Méantone | `doc:temperament-meantone` |
| Shruti | `doc:temperament-shrutis-bhatkhande`, `doc:temperament-shrutis-sarngadeva` |
| Tempérament (entrée) | renvois aux exemples (`pythagoricien`, `werckmeister`…) si naturel |
| Quinte / Tierce | une fiche illustrative si pertinent (pythagoricien / méantone) |

**Avec parcimonie et goût** : un lien par entrée là où c'est
naturel, pas un tapis de liens. Garde la lisibilité du glossaire.
Le glossaire **technique** n'a probablement pas de fiche à pointer
— laisse-le tel quel sauf évidence.

## 3. Retirer `_renderer-test.md`

Le fichier de validation visuelle du renderer n'a plus lieu d'être
(le corpus réel exerce toutes les features). **Supprime** :
- le fichier `src/docs/articles/_renderer-test.md` ;
- son entrée dans `src/docs/index.js` (section "Référence").

## Hors scope

- **Version / `about.md`** : ne touche pas au numéro de version.
  Le bump 1.4.0 (package.json + sync about.md + CONTEXT) est un
  acte de release fait par le dev, **après** ta passe.
- Tout fichier hors `src/docs/`.

## Livraison

- Commits, préfixe `docs(iter-L/phase-5-cloture): …` (ex. un pour
  le rebranchement, un pour le retrait test).
- Push.
- Compte-rendu : liens rebranchés (guides + glossaire), confirmation
  du retrait `_renderer-test`. **Signale quand c'est poussé** — le
  dev enchaîne alors sur la release 1.4.0.

Bon vent.
