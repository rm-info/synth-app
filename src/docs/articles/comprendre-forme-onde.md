# Ce que tu entends quand tu dessines une forme d'onde

Dans le Designer, tu traces une courbe à la souris et, aussitôt, tu
entends un son. Quel est le lien entre ce gribouillage et ce timbre ?
Il est plus direct que tu ne crois — et le comprendre change la façon
de dessiner.

## Un son, c'est une vibration qui se répète

Une note tenue, c'est une variation de pression qui se répète des
centaines de fois par seconde. La courbe que tu dessines représente
**une seule répétition** — une *période* (voir *Période* et *Forme
d'onde* dans le [glossaire technique](doc:glossaire-technique)).
L'app la rejoue en boucle, très vite. La vitesse de répétition fixe
la *hauteur* : plus c'est rapide, plus c'est aigu. La *forme*, elle,
ne change pas la hauteur — elle décide d'autre chose.

## La forme décide du timbre

Joue un *la* à la flûte, puis au violon : même hauteur, et pourtant
tu ne les confonds jamais. Ce qui les sépare, c'est le **timbre**, et
le timbre dépend de la forme de l'onde. Une courbe douce et arrondie
sonne « pure », feutrée ; une courbe anguleuse sonne « riche »,
brillante, parfois nasillarde. Dessiner dans le Designer, c'est donc
littéralement sculpter une couleur sonore (voir *Timbre* dans le
[glossaire technique](doc:glossaire-technique)).

## Toute courbe est une somme de sinusoïdes

Voici l'idée la plus contre-intuitive — et la plus belle. N'importe
quelle forme d'onde répétitive peut se décomposer en une addition de
**sinusoïdes** pures, dont les fréquences sont des multiples entiers
d'une même fondamentale : ce sont les **harmoniques** (voir
*Harmonique* dans le [glossaire technique](doc:glossaire-technique)).
Les mathématiciens appellent cette décomposition l'*analyse de
Fourier* ; à l'oreille, c'est tout simplement la recette du son.

Une sinusoïde seule n'a qu'un harmonique : c'est le son le plus
« pur » qui soit, un sifflement sans aspérité. Ajoute des harmoniques
et la courbe se complexifie. Une dent de scie contient *tous* les
harmoniques à la fois, d'où son grain riche et mordant ; une onde
carrée n'a que les harmoniques impairs, d'où son timbre creux, un peu
boisé. Concrètement : chaque fois que tu ajoutes un angle vif à ton
dessin, tu ajoutes des harmoniques aigus.

## Le voir, pas seulement l'entendre

Tu n'as pas à deviner cette recette : l'app te la montre. Pendant que
le son joue,
<DocLink target="designer:designer-spectrogram">le spectrogramme</DocLink>
affiche le **spectre** — la liste des harmoniques présents et leur
intensité (voir *Spectre et spectrogramme* et *DFT* dans le
[glossaire technique](doc:glossaire-technique)). Une forme douce ?
quelques barres. Une forme hérissée ? une forêt de raies aiguës.

## À toi de dessiner

Le va-et-vient est immédiat : modifie
<DocLink target="designer:designer-waveform">la courbe</DocLink>,
écoute le timbre changer, regarde le spectre suivre. C'est cette
boucle qui fait du Designer un petit labo d'acoustique : la forme que
tu vois *est* le son que tu entends.
