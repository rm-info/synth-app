# Le module Harmoniques

Le module Harmoniques montre ton son sous un autre angle : non plus comme
une courbe dans le temps, mais comme une **recette**. Toute forme d'onde
répétitive est la somme de vibrations simples — des sinusoïdes dont les
fréquences sont des multiples entiers d'une même fondamentale. Ce sont les
*harmoniques*, et chaque barre du module en dose une. C'est exactement la
même information que la forme d'onde, regardée autrement (le « pourquoi » :
[Ce que tu entends quand tu dessines une forme d'onde](doc:comprendre-forme-onde)).

## Les barres d'harmoniques {#barres-harmoniques}

Chaque barre correspond à un multiple de la fréquence fondamentale : la
1re à 1f, la 2e à 2f, la 3e à 3f, et ainsi de suite. Sa hauteur, c'est le
**poids** de cette harmonique dans le son. Tire une barre vers le haut et
tu renforces cette composante ; la forme d'onde, à gauche, se redessine
aussitôt en conséquence.

À l'oreille : les premières barres portent le corps du son, les barres
hautes en font la brillance et le grain. Une dent de scie, par exemple, a
toutes ses harmoniques présentes, avec un poids qui décroît en marches —
d'où son timbre riche et mordant.

![Barres d'harmoniques d'une dent de scie](/docs/harmoniques-barres.svg)

<Details title="Sous le capot">
Les barres sont les **magnitudes de la transformée de Fourier discrète
(DFT) sur 512 points** de la forme d'onde, tronquées au plafond
d'harmoniques. La DFT décompose le cycle en sa somme de sinusoïdes ;
l'opération inverse (iDFT) reconstruit la courbe à partir des barres — c'est
ce va-et-vient réversible qui synchronise les deux vues. La barre *n* mesure
le poids de la composante à la fréquence **n·f**, où *f* est la
fondamentale.
</Details>

*→ <DocLink target="designer:designer-harmonics">Voir dans l'app</DocLink>*

## Plafond d'harmoniques {#plafond-harmoniques}

Le plafond fixe le **nombre maximal d'harmoniques** prises en compte, de
**1 à 256**. C'est, exactement, le nombre de barres affichées. Au-delà du
plafond, les harmoniques sont coupées : moins d'aigus, un son plus doux et
plus lisse. Un plafond bas arrondit le timbre ; un plafond haut le rend
riche et brillant.

<Details title="Sous le capot">
Plafonner les harmoniques aiguës, ce n'est pas qu'une affaire de goût :
c'est aussi un garde-fou contre le **repliement de spectre**
(*aliasing*). Une harmonique dont la fréquence dépasse la moitié de la
fréquence d'échantillonnage se replie en une fausse fréquence parasite ;
limiter la richesse spectrale du patch réduit ce risque sur les notes
aiguës. La borne haute est `CAP_MAX = 256`.
</Details>

*→ <DocLink target="designer:designer-cap-stepper">Voir dans l'app</DocLink>*
