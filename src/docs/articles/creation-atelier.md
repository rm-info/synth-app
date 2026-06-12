# L'atelier : barre d'outils, actions, écoute

*Version provisoire — rédaction en cours.*

L'atelier réunit l'identité du patch en cours, les actions de fichier
(nouveau, enregistrer), l'écoute et la disposition des modules.

## Le nom du patch {#nom-du-patch}

Affiche le nom du patch en cours d'édition. C'est l'étiquette reprise
dans la Bibliothèque et sur les clips qui utilisent ce patch.

*→ <DocLink target="designer:designer-patch-name">Voir dans l'app</DocLink>*

## Timbres (presets) {#timbres-presets}

Ouvre le sélecteur de timbres : une bibliothèque de formes prêtes à
l'emploi (formes de base et timbres harmoniques paramétriques) qu'on
charge dans l'éditeur. Le choix se fait dans une fenêtre dédiée.

*→ <DocLink target="designer:designer-presets-button">Voir dans l'app</DocLink>*

## Réinitialiser {#reinitialiser}

Efface le timbre courant — la forme d'onde (canonical) et ses ancres
reviennent à zéro. Le plafond d'harmoniques, lui, est préservé.

*→ <DocLink target="designer:designer-reset-button">Voir dans l'app</DocLink>*

## Égaliser les rangées {#egaliser-rangees}

Remet les trois colonnes de chacune des deux rangées de modules à des
largeurs égales (un tiers chacune). Contrôle de disposition desktop ;
les proportions restent ensuite ajustables au glissement des
séparateurs.

*→ <DocLink target="designer:designer-equalize-button">Voir dans l'app</DocLink>*

## Le switcher de modules {#switcher-modules}

Sur petit écran, un seul module est affiché plein cadre à la fois. Le
switcher est la rangée d'icônes qui sélectionne le module visible
(forme d'onde, harmoniques, spectrogramme, instrument, enveloppe,
effets).

*→ <DocLink target="designer:designer-module-switcher">Voir dans l'app</DocLink>*

## Annuler / Rétablir {#annuler-retablir}

Annule ou rétablit la dernière modification de l'éditeur. L'historique
est propre à l'onglet Création.

*→ <DocLink target="designer:global-undo-button-designer">Voir dans l'app</DocLink>*

## Nouveau patch {#nouveau-patch}

Crée un patch vierge et bascule l'éditeur dessus — un point de départ
neuf, sans toucher au patch précédent (déjà enregistré ou non).

*→ <DocLink target="designer:designer-new-button">Voir dans l'app</DocLink>*

## Enregistrer {#enregistrer}

Enregistre les modifications dans le patch en cours (écrasement). Le
patch garde son identité et ses utilisations dans les compositions.

*→ <DocLink target="designer:designer-save-button">Voir dans l'app</DocLink>*

## Enregistrer sous {#enregistrer-sous}

Enregistre l'état courant comme un nouveau patch distinct, sans modifier
l'original.

*→ <DocLink target="designer:designer-save-as-button">Voir dans l'app</DocLink>*

## Écouter {#ecouter}

Le transport d'écoute lit ou arrête la composition courante. La zone de
progression indique le temps écoulé sur la durée totale.

*→ <DocLink target="designer:designer-miniplayer">Voir dans l'app</DocLink>*

## Gérer les modules {#gerer-les-modules}

Chaque module porte, en coin, ses commandes de fenêtre : **Réduire**
(le module se replie en bande verticale) et **Agrandir / Restaurer**
(le module occupe tout le cadre, puis revient). Une option
d'auto-réduction peut replier les autres modules d'une rangée quand on
en ouvre un.
