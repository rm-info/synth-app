# Le module Enveloppe

*Version provisoire — rédaction en cours.*

Le module Enveloppe décrit comment le volume du son évolue dans le
temps, de l'attaque à l'extinction.

## L'enveloppe AHDSR {#enveloppe-ahdsr}

L'enveloppe se règle en cinq temps : **Attack** (montée), **Hold**
(plateau au sommet), **Decay** (descente), **Sustain** (niveau tenu) et
**Release** (extinction). Les quatre durées vont de 0 à 1000 ms.

*→ <DocLink target="designer:designer-adsr">Voir dans l'app</DocLink>*

## L'amplitude {#amplitude}

Règle le volume global du patch, de 0 à 1.

*→ <DocLink target="designer:designer-amplitude">Voir dans l'app</DocLink>*

## Le maintien (sustain) {#sustain}

Le niveau de sustain, de 0 à 1, est la valeur tenue tant que la note
dure, après l'attaque et le decay. Sur le graphe, une pastille permet
de l'ajuster directement.

*→ <DocLink target="designer:designer-sustain-pastille">Voir dans l'app</DocLink>*

## Les vues {#vues}

Bascule l'affichage de l'enveloppe entre la **vue graphe** (courbe à
poignées) et la **vue sliders** (les six réglages en curseurs). Le
choix n'apparaît qu'en affichage compact.

*→ <DocLink target="designer:designer-adsr-view-toggle">Voir dans l'app</DocLink>*
