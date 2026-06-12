# Le module Spectrogramme

*Version provisoire — rédaction en cours.*

Le module Spectrogramme affiche le contenu fréquentiel du son, soit à
partir de la forme dessinée, soit en analyse temps réel pendant la
lecture.

## Lire le spectrogramme {#lire-le-spectrogramme}

L'axe horizontal porte les fréquences (échelle logarithmique), l'axe
vertical l'amplitude. Chaque trait marque l'énergie présente à une
fréquence donnée.

*→ <DocLink target="designer:designer-spectrogram">Voir dans l'app</DocLink>*

## Direct ou Statique {#direct-statique}

Bascule le mode d'analyse. **Statique** (par défaut) calcule le spectre
d'un cycle de la forme dessinée. **Direct** analyse le son réellement
joué, en temps réel.

*→ <DocLink target="designer:designer-spectro-mode">Voir dans l'app</DocLink>*

## Échelle dB {#echelle-db}

Bascule l'axe d'amplitude entre une échelle linéaire et une échelle en
décibels (de −80 à 0 dB), qui fait mieux ressortir les composantes
faibles.

*→ <DocLink target="designer:designer-spectro-db">Voir dans l'app</DocLink>*

## Peak hold {#peak-hold}

En mode Direct, maintient les crêtes atteintes par chaque fréquence
sous forme de traits persistants qui redescendent ensuite lentement
(décroissance en ~1 s).

*→ <DocLink target="designer:designer-spectro-peakhold">Voir dans l'app</DocLink>*
