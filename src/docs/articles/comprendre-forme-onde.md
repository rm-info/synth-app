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

## Trois angles sur la même courbe

Dans le Designer, trois zones montrent ton son en même temps : le tracé
que tu dessines, une rangée de barres (les harmoniques) et le
<DocLink target="designer:designer-spectrogram">spectrogramme</DocLink>.
On pourrait croire à trois outils distincts. C'est en réalité **une
seule et même courbe, regardée sous trois angles**.

Le tracé temporel, la liste des harmoniques et le spectre figé portent
*exactement la même information* : aucun n'en sait plus que les autres.
Passer du tracé à la liste d'harmoniques, c'est l'affaire de l'analyse
de Fourier (la *DFT*) ; revenir de la liste au tracé, c'est l'opération
inverse (l'*iDFT*). Le voyage est réversible dans les deux sens, sans
rien perdre en route.

Si l'app les affiche côte à côte, c'est qu'ils se complètent à l'œil :
le tracé parle au geste, le spectre parle au timbre. Tu ne bascules pas
d'un mode à l'autre — tu tournes autour du même objet. Voir *DFT*,
*iDFT* et *Spectre et spectrogramme* au
[glossaire technique](doc:glossaire-technique).

## L'ombre invisible : la phase

Voici une bizarrerie. Deux sons peuvent avoir *exactement* les mêmes
harmoniques — mêmes fréquences, mêmes intensités — et pourtant dessiner
des formes très différentes. Tout tient à un seul paramètre : la
**phase**, le décalage dans le temps de chaque harmonique.

Le plus étonnant, c'est que la phase est **invisible à l'oreille**.
Décale une sinusoïde dans le temps sans rien changer d'autre : tu
entends exactement le même son. À l'œil, pourtant, la courbe a changé
d'allure. La phase est une dimension que tu *vois* sans l'*entendre*.

Pense à photographier une horloge sous deux angles. Les aiguilles
marquent toujours la même heure (les mêmes harmoniques), mais l'image
peut sembler penchée selon la perspective (la phase). Pour comparer deux
horloges proprement, tu les rephotographies sous le même angle : tu n'as
rien perdu d'essentiel, tu as juste choisi une convention de regard.

C'est exactement ce que fait *normaliser* dans le Designer : on remplace
la phase d'origine par une phase de référence (un sinus pur pour chaque
harmonique). Le timbre ne bouge pas, seule la silhouette change. Et si
le Designer te demande de normaliser avant de toucher une barre, c'est
qu'éditer une harmonique ne manipule que les intensités — sans
normalisation, ce geste jetterait en silence la phase d'origine.
Maintenant tu sais pourquoi. Voir *Phase* et *Normalisation* au
[glossaire technique](doc:glossaire-technique).

## Le calque du dessin : le résidu

Quand tu dessines à main levée, ta courbe est pleine de petits
accidents — la signature de ton geste. Que devient-elle si tu veux
ensuite l'affiner par *ancres*, ces quelques points de contrôle que tu
fais glisser ?

Deux solutions naïves échouent. Si les ancres tentent de coller au
tracé exact, tu ne peux plus bouger une ancre sans tout déranger. Si
elles se contentent d'une courbe lisse approximative, tous tes détails
disparaissent. Le Designer prend une troisième voie : il sépare ta forme
en **deux calques**.

- La **spline** : la courbe lisse qui passe par tes ancres — le calque
  du dessous.
- Le **résidu** : tout ce que ton tracé avait en plus de cette spline —
  le calque du dessus.

Bouger une ancre ne touche que le calque du dessous. La spline se
déforme, le résidu reste posé par-dessus, et la somme des deux te rend
une forme qui a bougé *mais dont les détails ont survécu*. Le résidu
n'est pas du bruit à nettoyer : c'est la part de ton dessin qu'aucune
poignée d'ancres ne saurait deviner. Voir *Ancre* et *Résidu* au
[glossaire technique](doc:glossaire-technique) ; le
[guide Designer](doc:guide-designer) en donne le mode d'emploi pratique.

## À toi de dessiner

Le va-et-vient est immédiat : modifie
<DocLink target="designer:designer-waveform">la courbe</DocLink>, écoute
le timbre changer, regarde les harmoniques et le spectre suivre. Mais ce
n'est pas *une* boucle, c'est un **réseau** : forme et son, forme et
harmoniques, forme et résidu, forme et phase. Tu peux y entrer par
n'importe quelle prise — tracer un trait, tirer une barre, poser une
ancre, normaliser — et tout le reste se met à jour. La forme que tu vois
*est* le son que tu entends — et tu peux désormais la saisir par
n'importe quel bout.
