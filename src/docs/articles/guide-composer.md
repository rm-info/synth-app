# Guide : le Composer

Le Composer est l'onglet d'arrangement : tu y disposes tes patches
dans le temps pour bâtir une composition. Pour un survol rapide,
lance le Tour ; ce guide détaille la timeline, les gestes d'édition
et l'export.

## La timeline et les pistes

<DocLink target="composer:composer-timeline">La timeline</DocLink>
empile plusieurs pistes horizontales, chacune d'une couleur. Tu peux
en créer jusqu'à seize, les renommer, les réordonner, ajuster leur
hauteur ou les supprimer. Chaque piste porte des *clips* : un clip,
c'est un patch joué à une hauteur, pour une durée, à une position
données.

## Déposer et déplacer des clips

Pose un clip en jouant une note au clavier ; le **placement
contigu** enchaîne tout seul : le dernier clip touché sert d'ancre,
et la note suivante se pose juste après
(<DocLink target="composer:composer-anchor-clip">l'ancre</DocLink>
mémorise cette position). La durée des prochains clips se règle dans
la barre d'outils — ou au clavier : 1 à 7 (au pavé numérique, ou
Maj+chiffre) pour la valeur, de la ronde à la triple croche ; 8, 9
ou 0 pour la pointer.
<DocLink target="composer:composer-octave-indicator">L'octave de
saisie</DocLink> (PageUp / PageDown) fixe la hauteur de référence.
Les flèches déplacent les clips sélectionnés : ↑ ↓ la hauteur, ← →
la position (avec Maj : par octave et par temps).

## Éditer finement : le panneau Propriétés

<DocLink target="composer:composer-properties">Le panneau
Propriétés</DocLink> édite le clip sélectionné — son patch, sa
hauteur, sa durée. Il sert aussi à
<DocLink target="composer:composer-merge-button">fusionner</DocLink>
(Ctrl+M) plusieurs clips contigus de même patch et même piste, ou à
les <DocLink target="composer:composer-split2-button">diviser</DocLink>
en deux (Ctrl+D) ou en trois (Ctrl+Shift+D).

## Copier, coller, supprimer

Sélectionne un ou plusieurs clips (Ctrl ou Maj), puis
<DocLink target="composer:composer-copy-button">copie</DocLink>
(Ctrl+C),
<DocLink target="composer:composer-cut-button">coupe</DocLink>
(Ctrl+X) ou
<DocLink target="composer:composer-paste-button">colle</DocLink>
(Ctrl+V).
<DocLink target="composer:composer-delete-button">Supprimer</DocLink>
(Suppr) retire la sélection.

## Lecture et tempo

<DocLink target="composer:composer-transport">Le transport</DocLink>
lance et arrête la lecture ; un curseur balaie la timeline pendant
le jeu. <DocLink target="composer:composer-bpm">Le tempo</DocLink> se
règle en battements (noires) par minute.

## Exporter en WAV

Quand la composition est prête, un bouton d'export ouvre une fenêtre
où tu nommes le fichier ; l'app génère alors un WAV téléchargeable,
le format audio universel, lisible partout.

## Aller plus loin

Ctrl+K affiche tous les raccourcis du Composer. Il te manque un son ?
Crée-le dans le [Designer](doc:guide-designer) : il apparaîtra
aussitôt dans la [Bibliothèque](doc:guide-bibliotheque).
