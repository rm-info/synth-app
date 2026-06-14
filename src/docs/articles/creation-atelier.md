# L'atelier : barre d'outils, actions, écoute

Autour des six modules d'édition, l'atelier réunit tout ce qui ne touche pas
*directement* au son mais te permet de travailler : l'identité du patch en
cours, les actions de fichier (créer, enregistrer), l'écoute, et la
disposition des modules à l'écran. C'est le cadre ; les modules sont la
toile.

## Le nom du patch {#nom-du-patch}

L'étiquette du patch en cours d'édition. C'est ce nom qu'on retrouve dans la
Bibliothèque et sur chaque clip qui utilise ce patch — soigne-le, c'est ta
seule prise pour t'y retrouver une fois tes timbres nombreux.

*→ <DocLink target="designer:designer-patch-name">Voir dans l'app</DocLink>*

## Timbres (presets) {#timbres-presets}

Ouvre le sélecteur de timbres : une collection de points de départ prêts à
l'emploi — les formes de base (sinus, carré, dent de scie, triangle) et des
timbres harmoniques paramétriques. Tu en charges un dans l'éditeur, puis tu
le façonnes à ta main. Le choix se fait dans une fenêtre dédiée.

*→ <DocLink target="designer:designer-presets-button">Voir dans l'app</DocLink>*

## Réinitialiser {#reinitialiser}

Repart d'une forme vierge : la forme d'onde et ses ancres reviennent à
plat. Le reste de l'éditeur — enveloppe, amplitude, système, et notamment le
**plafond d'harmoniques** — est préservé. Pratique pour redessiner un timbre
sans reperdre tes autres réglages.

*→ <DocLink target="designer:designer-reset-button">Voir dans l'app</DocLink>*

## Égaliser les rangées {#egaliser-rangees}

Remet les trois colonnes de chaque rangée de modules à largeur égale (un
tiers chacune) — un coup de balai sur la disposition desktop quand tes
ajustements de largeurs sont partis dans tous les sens. Les proportions
restent ensuite réglables en glissant les séparateurs.

*→ <DocLink target="designer:designer-equalize-button">Voir dans l'app</DocLink>*

## Le switcher de modules {#switcher-modules}

Sur petit écran, un seul module tient à la fois, plein cadre. Le switcher
est la rangée d'icônes qui choisit lequel afficher — forme d'onde,
harmoniques, spectrogramme, instrument, enveloppe, effets. C'est ta
navigation entre les six modules quand l'écran ne les montre pas côte à
côte.

*→ <DocLink target="designer:designer-module-switcher">Voir dans l'app</DocLink>*

## Annuler / Rétablir {#annuler-retablir}

Reviens en arrière ou refais ce que tu viens de défaire. L'historique est
**propre à l'onglet Création** : éditer ton patch ne touche pas à
l'historique du Composer, et inversement. Dessine sans crainte, tout est
réversible.

*→ <DocLink target="designer:global-undo-button-designer">Voir dans l'app</DocLink>*

## Nouveau patch {#nouveau-patch}

Crée un patch vierge et bascule l'éditeur dessus — un départ neuf, sans
toucher au patch précédent (qu'il soit déjà enregistré ou non). À utiliser
quand tu veux commencer un nouveau son de zéro plutôt que retoucher
l'actuel.

*→ <DocLink target="designer:designer-new-button">Voir dans l'app</DocLink>*

## Enregistrer {#enregistrer}

Écrit tes modifications dans le patch en cours (écrasement). Le patch garde
son identité et toutes ses utilisations dans tes compositions se mettent à
jour avec lui. C'est l'enregistrement « en place ».

*→ <DocLink target="designer:designer-save-button">Voir dans l'app</DocLink>*

## Enregistrer sous {#enregistrer-sous}

Enregistre l'état courant comme un **nouveau patch distinct**, sans modifier
l'original. À choisir quand tu veux décliner une variante d'un son existant
tout en gardant la version d'origine intacte.

*→ <DocLink target="designer:designer-save-as-button">Voir dans l'app</DocLink>*

## Écouter {#ecouter}

Le transport d'écoute lit ou arrête la composition courante, directement
depuis l'atelier — utile pour entendre ton patch dans son contexte sans
quitter la Création. La zone de progression indique le temps écoulé sur la
durée totale.

*→ <DocLink target="designer:designer-miniplayer">Voir dans l'app</DocLink>*

## Gérer les modules {#gerer-les-modules}

Chaque module porte, dans son coin, ses commandes de fenêtre : **Réduire**
(il se replie en bande verticale pour laisser la place aux autres) et
**Agrandir / Restaurer** (il occupe tout le cadre, puis revient). Ces
commandes existent sur chacun des six modules ; la sidebar de gauche se
replie de son côté via son chevron. Aucun de ces contrôles n'a de badge
propre — ils se documentent ici.

L'**auto-réduction**, dans la barre d'outils, automatise le geste : ouvrir
un module replie les autres de sa rangée, pour que tu te concentres sur un
seul à la fois.

*→ <DocLink target="designer:designer-auto-collapse">Voir dans l'app</DocLink>*
