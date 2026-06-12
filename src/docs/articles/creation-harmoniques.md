# Le module Harmoniques

*Version provisoire — rédaction en cours.*

Le module Harmoniques montre et édite le son par son spectre : la
hauteur de chaque barre est l'amplitude d'une harmonique.

## Les barres d'harmoniques {#barres-harmoniques}

Chaque barre correspond à un multiple de la fréquence fondamentale
(1f, 2f, 3f…). On règle sa hauteur pour doser le poids de cette
harmonique dans le son ; la forme d'onde se met à jour en conséquence.

<Details title="Sous le capot">
Les barres sont les magnitudes de la transformée de Fourier (DFT,
512 points) de la forme d'onde, tronquées au plafond d'harmoniques.
</Details>

*→ <DocLink target="designer:designer-harmonics">Voir dans l'app</DocLink>*

## Plafond d'harmoniques {#plafond-harmoniques}

Fixe le nombre maximal d'harmoniques prises en compte, de 1 à 256.
Au-delà du plafond, les harmoniques sont coupées (le son est plus doux,
moins riche en aigus).

*→ <DocLink target="designer:designer-cap-stepper">Voir dans l'app</DocLink>*
