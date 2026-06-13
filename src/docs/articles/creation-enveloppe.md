# Le module Enveloppe

*Version provisoire — rédaction en cours.*

Le module Enveloppe décrit comment le volume du son évolue dans le
temps, de l'attaque à l'extinction.

## L'enveloppe AHDSR {#enveloppe-ahdsr}

L'enveloppe se règle en cinq temps : **Attaque** (montée), **Maintien**
(plateau au sommet), **Déclin** (descente), **Soutien** (niveau tenu) et
**Relâche** (extinction). Le graphe en donne la vue d'ensemble, à poignées ;
les sections suivantes détaillent chaque segment (réglable au curseur en
vue sliders).

*→ <DocLink target="designer:designer-adsr">Voir dans l'app</DocLink>*

## L'amplitude {#amplitude}

Règle le volume global du patch, de 0 à 1.

*→ <DocLink target="designer:designer-amplitude">Voir dans l'app</DocLink>*

## Attaque {#attaque}

Durée de la montée du volume, de 0 (silence) au sommet, après le
déclenchement de la note. De 0 à 1000 ms.

*→ <DocLink target="designer:designer-adsr-attack">Voir dans l'app</DocLink>*

## Maintien {#maintien}

Durée du plateau tenu au sommet, entre l'attaque et le déclin. De 0 à
1000 ms.

*→ <DocLink target="designer:designer-adsr-hold">Voir dans l'app</DocLink>*

## Déclin {#declin}

Durée de la descente du sommet jusqu'au niveau de soutien. De 0 à
1000 ms.

*→ <DocLink target="designer:designer-adsr-decay">Voir dans l'app</DocLink>*

## Soutien {#soutien}

Niveau tenu tant que la note dure, après l'attaque et le déclin. De 0 à 1.
(Un niveau, pas une durée.)

*→ <DocLink target="designer:designer-adsr-sustain">Voir dans l'app</DocLink>*

## Relâche {#relache}

Durée de l'extinction, du niveau de soutien jusqu'au silence, après le
relâchement de la note. De 0 à 1000 ms.

*→ <DocLink target="designer:designer-adsr-release">Voir dans l'app</DocLink>*

## Les vues {#vues}

Bascule l'affichage de l'enveloppe entre la **vue graphe** (courbe à
poignées) et la **vue sliders** (les six réglages en curseurs). Le
choix n'apparaît qu'en affichage compact.

*→ <DocLink target="designer:designer-adsr-view-toggle">Voir dans l'app</DocLink>*
