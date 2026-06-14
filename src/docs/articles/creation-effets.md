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

# Les réglages, famille par famille

Les effets partagent leurs réglages par famille : un même paramètre (la
vitesse d'un LFO, la cible d'une enveloppe…) se documente une seule fois
ici, et tous les effets de la famille y renvoient. Les liens « Voir dans
l'app » ci-dessous pointent vers un effet représentatif de la famille.

## Vitesse (LFO) {#lfo-vitesse}

La vitesse d'oscillation, en hertz (Hz), de 0,1 à 20. Plus elle est
élevée, plus l'oscillation est rapide. Famille LFO : vibrato, trémolo,
auto-pan, wah.

*→ <DocLink target="designer:designer-fx-vibrato-rate">Voir dans l'app</DocLink>*

## Profondeur (LFO) {#lfo-profondeur}

L'amplitude de l'oscillation. L'unité dépend de l'effet : en **cents**
pour le vibrato (0 à 200) et le wah (0 à 3600), en **proportion** de 0 à 1
pour le trémolo et l'auto-pan.

*→ <DocLink target="designer:designer-fx-vibrato-depth">Voir dans l'app</DocLink>*

## Installation (LFO) {#lfo-installation}

Le temps que met l'oscillation pour s'installer (montée de 0 à la
profondeur réglée) après le déclenchement de la note, en millisecondes,
de 0 à 2000.

*→ <DocLink target="designer:designer-fx-vibrato-onset">Voir dans l'app</DocLink>*

## Forme (LFO) {#lfo-forme}

La forme de l'oscillation : sinus, triangle ou carré.

*→ <DocLink target="designer:designer-fx-vibrato-shape">Voir dans l'app</DocLink>*

## Graphe (LFO) {#lfo-graphe}

Le graphe trace l'oscillation dans le temps. Ses poignées règlent
directement la vitesse, la profondeur et l'installation ; un point mobile
indique la phase courante.

*→ <DocLink target="designer:designer-fx-vibrato-graph">Voir dans l'app</DocLink>*

## Cible (enveloppe) {#env-cible}

La valeur visée par l'enveloppe. En **cents** pour l'enveloppe de hauteur
(jusqu'à ±2400) et de filtre (jusqu'à ±4800), en **décalage de gain**
(±1) pour l'enveloppe de drive.

*→ <DocLink target="designer:designer-fx-pitch-env-amount">Voir dans l'app</DocLink>*

## Durée (enveloppe) {#env-duree}

Le temps du glissement vers la valeur nominale, en millisecondes (jusqu'à
2000 ; plancher 40 ms pour la hauteur).

*→ <DocLink target="designer:designer-fx-pitch-env-time">Voir dans l'app</DocLink>*

## Inverser (enveloppe) {#env-inverser}

Inverse le sens : au lieu de partir décalé puis rejoindre la valeur
nominale, l'enveloppe part de la nominale et s'éloigne vers la cible, où
elle reste.

*→ <DocLink target="designer:designer-fx-pitch-env-invert">Voir dans l'app</DocLink>*

## Forme (enveloppe) {#env-forme}

La forme de la progression entre départ et arrivée : linéaire, easeOut,
expo ou easeIn.

*→ <DocLink target="designer:designer-fx-pitch-env-curve">Voir dans l'app</DocLink>*

## Graphe (enveloppe) {#env-graphe}

Le graphe trace l'enveloppe (médiane = valeur nominale, axe vertical
signé). Deux poignées règlent la cible et la durée.

*→ <DocLink target="designer:designer-fx-pitch-env-graph">Voir dans l'app</DocLink>*

## Fréquence (filtre) {#filtre-frequence}

La fréquence de coupure du filtre, en hertz, de 20 à 20000.

*→ <DocLink target="designer:designer-fx-filter-cutoff">Voir dans l'app</DocLink>*

## Résonance (filtre) {#filtre-resonance}

L'accentuation autour de la fréquence de coupure (valeur linéaire, de 0,1
à 20).

*→ <DocLink target="designer:designer-fx-filter-q">Voir dans l'app</DocLink>*

## Type (filtre) {#filtre-type}

Le type de filtre : passe-bas, passe-haut, passe-bande ou coupe-bande.

*→ <DocLink target="designer:designer-fx-filter-type">Voir dans l'app</DocLink>*

## Graphe de réponse (filtre) {#filtre-graphe}

Le graphe trace la réponse en fréquence (axe X logarithmique de 20 Hz à
20 kHz, axe Y en dB). Une poignée 2D règle ensemble la coupure
(horizontal) et la résonance (vertical).

*→ <DocLink target="designer:designer-fx-filter-graph">Voir dans l'app</DocLink>*

## Drive (distorsion) {#disto-drive}

La quantité de saturation appliquée avant la courbe, de 1 à 50.

*→ <DocLink target="designer:designer-fx-distortion-drive">Voir dans l'app</DocLink>*

## Mix (distorsion) {#disto-mix}

Le dosage entre le signal traité et le signal d'origine (wet/dry), de 0
à 1.

*→ <DocLink target="designer:designer-fx-distortion-mix">Voir dans l'app</DocLink>*

## Courbe (distorsion) {#disto-courbe}

La forme de la déformation : douce (tanh), dure (écrêtage) ou repliement
(sin).

*→ <DocLink target="designer:designer-fx-distortion-curve">Voir dans l'app</DocLink>*

## Graphe de transfert (distorsion) {#disto-graphe}

Le graphe trace la courbe entrée → sortie. Une poignée 2D, au point
caractéristique de la courbe, règle le drive (horizontal) et le mix
(vertical).

*→ <DocLink target="designer:designer-fx-distortion-graph">Voir dans l'app</DocLink>*
