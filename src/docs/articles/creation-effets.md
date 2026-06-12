# Le module Effets

*Version provisoire — rédaction en cours.*

Le module Effets ajoute au patch des modulations et des traitements :
vibrato, trémolo, panoramique, enveloppes, filtre, wah et distorsion.
Chacun est désactivé par défaut et s'édite un à la fois.

## Choisir un effet {#choisir-un-effet}

La barre de titre du module aligne un bouton par effet. Cliquer un
bouton met l'effet en édition (son panneau s'affiche) ; une pastille
signale, à part, les effets activés.

*→ <DocLink target="designer:designer-modulation">Voir dans l'app</DocLink>*

## Vibrato {#vibrato}

Oscillation périodique de la hauteur. Réglages : vitesse (0,1 à 20 Hz),
profondeur (0 à 200 cents), installation (0 à 2000 ms) et forme de
l'oscillation.

<Details title="Sous le capot">
LFO appliqué à `osc.detune` (cents). Formes : sinus, triangle, carré.
</Details>

*→ <DocLink target="designer:designer-effect-vibrato">Voir dans l'app</DocLink>*

## Trémolo {#tremolo}

Oscillation périodique du volume. Réglages : vitesse (0,1 à 20 Hz),
profondeur (0 à 1), installation (0 à 2000 ms) et forme.

<Details title="Sous le capot">
LFO appliqué au gain de la voix.
</Details>

*→ <DocLink target="designer:designer-effect-tremolo">Voir dans l'app</DocLink>*

## Auto-pan {#auto-pan}

Oscillation périodique de la position stéréo (gauche ↔ droite).
Réglages : vitesse, profondeur (0 à 1, excursion symétrique autour du
centre), installation et forme.

<Details title="Sous le capot">
LFO appliqué à `panner.pan`. Sur le graphe : D en haut, G en bas.
</Details>

*→ <DocLink target="designer:designer-effect-auto-pan">Voir dans l'app</DocLink>*

## Enveloppe de hauteur {#hauteur}

Glissement de hauteur au déclenchement de la note. Réglages : départ /
cible en cents signés (jusqu'à ±2400), durée (40 à 2000 ms), un mode
**Inverser** et la forme de la progression.

<Details title="Sous le capot">
Enveloppe (pas un LFO) appliquée à `osc.detune`. Formes de progression :
linéaire, easeOut, expo, easeIn.
</Details>

*→ <DocLink target="designer:designer-effect-pitch-env">Voir dans l'app</DocLink>*

## Filtre {#filtre}

Filtre statique appliqué à la voix. Réglages : type (passe-bas,
passe-haut, passe-bande, coupe-bande), fréquence de coupure (20 à
20000 Hz) et résonance (0,1 à 20). Une poignée 2D sur le graphe de
réponse règle coupure et résonance ensemble.

<Details title="Sous le capot">
BiquadFilter par voix, inséré après la distorsion. La résonance est
stockée en valeur linéaire ; la couche audio convertit (le Q d'un
biquad est en dB pour passe-bas/passe-haut, linéaire pour
passe-bande/coupe-bande).
</Details>

*→ <DocLink target="designer:designer-effect-filter">Voir dans l'app</DocLink>*

## Enveloppe de filtre {#env-filtre}

Glissement de la fréquence de coupure au déclenchement. Réglages :
départ / cible en cents signés (jusqu'à ±4800), durée (0 à 2000 ms),
**Inverser** et forme. Sans effet si le filtre est désactivé.

<Details title="Sous le capot">
Enveloppe appliquée à `biquad.detune` (cents).
</Details>

*→ <DocLink target="designer:designer-effect-filter-env">Voir dans l'app</DocLink>*

## Wah {#wah}

Oscillation périodique de la fréquence de coupure du filtre. Réglages :
vitesse, profondeur (0 à 3600 cents), installation et forme. Sans effet
si le filtre est désactivé.

<Details title="Sous le capot">
LFO appliqué à `biquad.detune` (cents).
</Details>

*→ <DocLink target="designer:designer-effect-wah">Voir dans l'app</DocLink>*

## Distorsion {#disto}

Déformation du signal. Réglages : courbe (douce, dure, repliement),
drive (1 à 50) et mix wet/dry (0 à 1). Une poignée 2D sur le graphe de
transfert règle drive et mix ensemble.

<Details title="Sous le capot">
WaveShaper (suréchantillonnage 4×) inséré avant le filtre ; courbes
normalisées ±1 → ±1 (douce = tanh, dure = écrêtage, repliement = sin).
</Details>

*→ <DocLink target="designer:designer-effect-distortion">Voir dans l'app</DocLink>*

## Enveloppe de drive {#env-drive}

Glissement du gain d'entrée de la distorsion au déclenchement.
Réglages : départ / cible en décalage de gain (jusqu'à ±1), durée
(0 à 2000 ms), **Inverser** et forme. Sans effet si la distorsion est
désactivée.

*→ <DocLink target="designer:designer-effect-drive-env">Voir dans l'app</DocLink>*
