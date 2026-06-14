# Le module Effets

Une fois ta forme d'onde et ton enveloppe en place, les effets ajoutent le
**mouvement** et le **caractère** : un vibrato qui fait chanter la note, un
filtre qui l'assombrit, une distorsion qui la fait grogner. Neuf effets sont
disponibles **par patch**.

Deux choses à savoir d'emblée. D'abord, ces effets sont **sans mémoire** :
pas de delay ni de réverbération, rien qui rejoue le passé. Chacun
transforme le son *de la note en cours*, instant par instant, en s'insérant
dans sa chaîne audio. Ensuite, ils se rangent en **quatre familles** qui
partagent leur logique de réglage :

- les **LFO** — une oscillation régulière qui module un paramètre : vibrato
  (hauteur), trémolo (volume), auto-pan (stéréo), wah (filtre) ;
- les **enveloppes de modulation** — un glissement unique au déclenchement :
  enveloppe de hauteur, de filtre, de drive ;
- le **filtre** — un sculpteur de fréquences ;
- la **distorsion** — une déformation volontaire du signal.

Chaque effet est désactivé par défaut et s'édite **un à la fois**. La
seconde moitié de cet article — *Les réglages, famille par famille* —
détaille chaque paramètre une seule fois pour toute sa famille ; les
sections d'effet ci-dessous y renvoient.

## Choisir un effet {#choisir-un-effet}

La barre de titre du module aligne un bouton par effet. Cliquer un bouton
met l'effet **en édition** : son panneau s'affiche, et toi tu règles. Une
**pastille**, à part, signale les effets *activés* — tu vois donc d'un coup
d'œil ce qui agit sur ton son, indépendamment de ce que tu es en train de
régler.

*→ <DocLink target="designer:designer-modulation">Voir dans l'app</DocLink>*

## Vibrato {#vibrato}

Une oscillation régulière de la **hauteur** — la note monte et descend
légèrement, comme la voix d'un chanteur ou le doigt d'un violoniste. C'est
un effet de la famille **LFO** : tu règles sa vitesse, sa profondeur (en
cents), son installation et la forme de l'oscillation.

<Details title="Sous le capot">
LFO appliqué à `osc.detune` (en cents). Formes disponibles : sinus,
triangle, carré.
</Details>

*→ <DocLink target="designer:designer-effect-vibrato">Voir dans l'app</DocLink>*

## Trémolo {#tremolo}

Une oscillation régulière du **volume** — le son pulse, fort-faible-fort,
comme un ampli vintage. Famille **LFO** : vitesse, profondeur (de 0 à 1),
installation, forme.

<Details title="Sous le capot">
LFO appliqué au gain de la voix.
</Details>

*→ <DocLink target="designer:designer-effect-tremolo">Voir dans l'app</DocLink>*

## Auto-pan {#auto-pan}

Une oscillation régulière de la **position stéréo** — le son va et vient de
gauche à droite. Famille **LFO** : la profondeur (de 0 à 1) fixe
l'excursion, symétrique autour du centre.

<Details title="Sous le capot">
LFO appliqué à `panner.pan`. Sur le graphe : droite en haut, gauche en bas.
</Details>

*→ <DocLink target="designer:designer-effect-auto-pan">Voir dans l'app</DocLink>*

## Enveloppe de hauteur {#hauteur}

Un **glissement de hauteur au déclenchement** de la note — un *pitch
bend* qui monte ou plonge vers la note cible. Contrairement au vibrato, ça
ne se répète pas : c'est un mouvement unique, à l'attaque. Famille
**enveloppe de modulation** : tu règles une cible en cents signés (jusqu'à
±2400, soit ±2 octaves), une durée, un mode *Inverser* et la forme de la
progression.

<Details title="Sous le capot">
Enveloppe (pas un LFO) appliquée à `osc.detune`. Progressions disponibles :
linéaire, easeOut, expo, easeIn.
</Details>

*→ <DocLink target="designer:designer-effect-pitch-env">Voir dans l'app</DocLink>*

## Filtre {#filtre}

Un **filtre statique** appliqué à la voix : il laisse passer certaines
fréquences et en atténue d'autres, ce qui éclaircit ou assombrit le timbre.
Tu choisis son type, sa fréquence de coupure et sa résonance — réglables
aussi d'un seul geste, via la poignée 2D du graphe de réponse.

<Details title="Sous le capot">
Un `BiquadFilter` par voix, inséré **après** la distorsion dans la chaîne.
</Details>

*→ <DocLink target="designer:designer-effect-filter">Voir dans l'app</DocLink>*

## Enveloppe de filtre {#env-filtre}

Un **glissement de la fréquence de coupure au déclenchement** — le filtre
s'ouvre ou se referme tout seul à l'attaque, le mouvement « wah » d'un son
de synthé classique, en une fois. Famille **enveloppe de modulation** :
cible en cents signés (jusqu'à ±4800, soit ±4 octaves), durée, *Inverser*,
forme. Sans effet si le filtre est désactivé.

<Details title="Sous le capot">
Enveloppe appliquée à `biquad.detune` (en cents).
</Details>

*→ <DocLink target="designer:designer-effect-filter-env">Voir dans l'app</DocLink>*

## Wah {#wah}

Une oscillation **régulière** de la fréquence de coupure du filtre — le
« wah-wah » qui revient en boucle, là où l'enveloppe de filtre ne le fait
qu'une fois. Famille **LFO** : profondeur en cents (de 0 à 3600). Sans effet
si le filtre est désactivé.

<Details title="Sous le capot">
LFO appliqué à `biquad.detune` (en cents).
</Details>

*→ <DocLink target="designer:designer-effect-wah">Voir dans l'app</DocLink>*

## Distorsion {#disto}

Une **déformation volontaire** du signal qui ajoute des harmoniques et du
grain — du léger réchauffement à la saturation franche. Tu choisis la courbe
de déformation, le drive (intensité) et le mix wet/dry, là encore réglables
ensemble via la poignée 2D du graphe de transfert.

<Details title="Sous le capot">
`WaveShaper` (suréchantillonnage ×4) inséré **avant** le filtre ; courbes
normalisées ±1 → ±1 (douce = tanh, dure = écrêtage, repliement = sinus). Le
suréchantillonnage limite le repliement de spectre que la déformation
engendre.
</Details>

*→ <DocLink target="designer:designer-effect-distortion">Voir dans l'app</DocLink>*

## Enveloppe de drive {#env-drive}

Un **glissement du gain d'entrée de la distorsion au déclenchement** — la
saturation enfle ou retombe à l'attaque, en une fois. Famille **enveloppe de
modulation** : cible en décalage de gain (jusqu'à ±1), durée, *Inverser*,
forme. Sans effet si la distorsion est désactivée.

*→ <DocLink target="designer:designer-effect-drive-env">Voir dans l'app</DocLink>*

# Les réglages, famille par famille

Les effets d'une même famille partagent leurs réglages : un même paramètre
(la vitesse d'un LFO, la cible d'une enveloppe…) se documente **une seule
fois** ici. L'unité d'un réglage peut varier d'un effet à l'autre — c'est
signalé à chaque fois. Les liens « Voir dans l'app » ci-dessous pointent
vers un effet représentatif de la famille.

## Vitesse (LFO) {#lfo-vitesse}

La vitesse de l'oscillation, en hertz (Hz, soit cycles par seconde), de
**0,1 à 20**. Lente, elle donne une ondulation paresseuse ; rapide, un
frémissement nerveux. Famille LFO : vibrato, trémolo, auto-pan, wah.

*→ <DocLink target="designer:designer-fx-vibrato-rate">Voir dans l'app</DocLink>*

## Profondeur (LFO) {#lfo-profondeur}

L'amplitude de l'oscillation : *de combien* le paramètre modulé s'écarte de
sa valeur de repos. **Son unité dépend de l'effet** :

- **Vibrato** : en cents (centièmes de demi-ton), de **0 à 200**.
- **Wah** : en cents, de **0 à 3600**.
- **Trémolo** et **auto-pan** : en proportion, de **0 à 1**.

À 0, l'oscillation existe mais ne déplace rien — l'effet est silencieux.

*→ <DocLink target="designer:designer-fx-vibrato-depth">Voir dans l'app</DocLink>*

## Installation (LFO) {#lfo-installation}

Le temps que met l'oscillation pour **s'installer** — sa montée de 0 jusqu'à
la profondeur réglée — après le déclenchement de la note, en millisecondes,
de **0 à 2000**. À 0, l'effet est là dès la première milliseconde ; allongé,
il entre en douceur, comme un vibrato qui s'épanouit sur une note tenue.

*→ <DocLink target="designer:designer-fx-vibrato-onset">Voir dans l'app</DocLink>*

## Forme (LFO) {#lfo-forme}

La forme de l'oscillation : **sinus** (ondulation douce), **triangle**
(montée-descente régulière, plus marquée), **carré** (saut brusque entre
deux valeurs, effet « trille » ou hachoir selon l'effet).

*→ <DocLink target="designer:designer-fx-vibrato-shape">Voir dans l'app</DocLink>*

## Graphe (LFO) {#lfo-graphe}

Le graphe trace l'oscillation dans le temps. Ses poignées règlent
directement les trois réglages clés — la **profondeur** (verticale), l'
**installation** (sa montée progressive) et la **vitesse** (l'espacement des
cycles) — et un point mobile suit la phase courante.

![Oscillation d'un LFO : vitesse, profondeur, installation](/docs/lfo-oscillation.svg)

*→ <DocLink target="designer:designer-fx-vibrato-graph">Voir dans l'app</DocLink>*

## Cible (enveloppe) {#env-cible}

La valeur **visée** par l'enveloppe au bout de son glissement. Comme la
profondeur d'un LFO, son unité dépend de l'effet :

- **Enveloppe de hauteur** : en cents, jusqu'à **±2400** (±2 octaves).
- **Enveloppe de filtre** : en cents, jusqu'à **±4800** (±4 octaves).
- **Enveloppe de drive** : en décalage de gain, **±1**.

La valeur est **signée** : un signe décide du sens du glissement (vers le
haut ou vers le bas).

*→ <DocLink target="designer:designer-fx-pitch-env-amount">Voir dans l'app</DocLink>*

## Durée (enveloppe) {#env-duree}

Le temps du glissement, en millisecondes, jusqu'à **2000**. Pour la
**hauteur**, le minimum est **40 ms** (un glissando trop court claquerait) ;
pour le **filtre** et le **drive**, la durée descend à **0**, ce qui fige
l'effet sur sa valeur cible — un décalage statique plutôt qu'un mouvement.

*→ <DocLink target="designer:designer-fx-pitch-env-time">Voir dans l'app</DocLink>*

## Inverser (enveloppe) {#env-inverser}

Ce réglage retourne le **sens** du glissement.

- Désactivé (défaut) : l'enveloppe **part décalé** (à la cible) et **rejoint
  la valeur nominale** — un son qui « se pose ».
- Activé : l'enveloppe **part de la valeur nominale** et **s'éloigne vers la
  cible, où elle reste** — un son qui « dérive » et s'y maintient.

C'est le même chemin parcouru dans l'autre sens : à toi de choisir si le
mouvement amène *vers* la note ou l'en *écarte*.

*→ <DocLink target="designer:designer-fx-pitch-env-invert">Voir dans l'app</DocLink>*

## Forme (enveloppe) {#env-forme}

La forme de la **progression** entre le départ et l'arrivée : **linéaire**
(vitesse constante), **easeOut** (rapide puis ralentit), **expo**
(accélération marquée), **easeIn** (lent puis accélère). C'est le *galbe* du
glissement, indépendant de son sens (réglé par *Inverser*).

<Details title="Sous le capot">
La progression p(t) court de 0 à 1, orthogonale à *Inverser*. Côté audio,
`linear` produit une rampe linéaire ; les autres formes passent par
`setValueCurveAtTime` (et non `exponentialRamp`, qui ne peut pas traverser
zéro — indispensable pour une cible signée).
</Details>

*→ <DocLink target="designer:designer-fx-pitch-env-curve">Voir dans l'app</DocLink>*

## Graphe (enveloppe) {#env-graphe}

Le graphe trace l'enveloppe sur un **axe signé** : la médiane horizontale
est la valeur nominale, au-dessus et en dessous les deux sens du décalage.
Deux poignées règlent la cible (verticale) et la durée (horizontale).

*→ <DocLink target="designer:designer-fx-pitch-env-graph">Voir dans l'app</DocLink>*

## Fréquence (filtre) {#filtre-frequence}

La **fréquence de coupure** du filtre, en hertz, de **20 à 20000** — soit,
en gros, du grave le plus bas perçu à l'extrême aigu. C'est le pivot autour
duquel le filtre agit : abaisse-la pour assombrir le son, remonte-la pour
l'éclaircir.

*→ <DocLink target="designer:designer-fx-filter-cutoff">Voir dans l'app</DocLink>*

## Résonance (filtre) {#filtre-resonance}

L'**accentuation** autour de la fréquence de coupure, en valeur linéaire de
**0,1 à 20** (≈ neutre à 1). Plus elle est haute, plus un pic se forme à la
coupure : le son « siffle » ou « chante » à cette fréquence, signature des
sons de synthé résonants.

<Details title="Sous le capot">
Web Audio cache ici un piège : le facteur Q d'un `BiquadFilter` est exprimé
en **dB** pour les passe-bas et passe-haut, mais en **valeur linéaire** pour
les passe-bande et coupe-bande. Pour offrir un réglage cohérent quel que
soit le type, le modèle stocke un q **linéaire unique**, et la couche audio
le convertit selon le type choisi.
</Details>

*→ <DocLink target="designer:designer-fx-filter-q">Voir dans l'app</DocLink>*

## Type (filtre) {#filtre-type}

Le type décide *quelles* fréquences passent :

- **Passe-bas** — laisse les graves, atténue les aigus (assombrit).
- **Passe-haut** — laisse les aigus, atténue les graves (éclaircit, dégraisse).
- **Passe-bande** — ne laisse qu'une bande autour de la coupure (son nasal,
  téléphonique).
- **Coupe-bande** — atténue une bande autour de la coupure (creuse un trou).

![Les réponses des quatre types de filtre](/docs/filtre-reponses.svg)

*→ <DocLink target="designer:designer-fx-filter-type">Voir dans l'app</DocLink>*

## Graphe de réponse (filtre) {#filtre-graphe}

Le graphe trace la **réponse en fréquence** : ce que le filtre laisse passer
à chaque fréquence. L'axe horizontal est logarithmique (de 20 Hz à 20 kHz),
le vertical en décibels. Une poignée 2D règle d'un geste la coupure
(horizontal) et la résonance (vertical) — tu sculptes la courbe en la
touchant directement.

*→ <DocLink target="designer:designer-fx-filter-graph">Voir dans l'app</DocLink>*

## Drive (distorsion) {#disto-drive}

La quantité de **saturation** poussée dans la courbe de déformation, de
**1 à 50**. À 1, le signal traverse presque intact ; en montant, il est
poussé de plus en plus fort contre la courbe, jusqu'à la saturation franche.

*→ <DocLink target="designer:designer-fx-distortion-drive">Voir dans l'app</DocLink>*

## Mix (distorsion) {#disto-mix}

Le **dosage** entre le signal traité et le signal d'origine (wet/dry), de
**0 à 1**. À 0, la distorsion est inaudible ; à 1, tu n'entends que le signal
déformé. Entre les deux, tu mêles les deux — un *parallel distortion* qui
garde la clarté de l'original sous le grain.

*→ <DocLink target="designer:designer-fx-distortion-mix">Voir dans l'app</DocLink>*

## Courbe (distorsion) {#disto-courbe}

La forme de la déformation, c'est-à-dire *comment* chaque niveau d'entrée est
remappé en sortie :

- **Douce** (tanh) — compresse les crêtes en douceur, un grain chaud.
- **Dure** (écrêtage) — coupe net au-delà d'un seuil, un grain agressif.
- **Repliement** (sinus) — replie le signal sur lui-même, des harmoniques
  riches et imprévisibles.

![Les trois courbes de transfert : douce, dure, repliement](/docs/distorsion-transfert.svg)

*→ <DocLink target="designer:designer-fx-distortion-curve">Voir dans l'app</DocLink>*

## Graphe de transfert (distorsion) {#disto-graphe}

Le graphe trace la **fonction de transfert** : pour chaque niveau d'entrée
(axe horizontal, de −1 à +1), le niveau de sortie correspondant (axe
vertical). La diagonale en pointillés est l'identité — « sortie = entrée »,
aucune déformation ; plus la courbe s'en écarte, plus elle déforme. Une
poignée 2D, posée au point caractéristique de la courbe, règle le drive
(horizontal) et le mix (vertical).

*→ <DocLink target="designer:designer-fx-distortion-graph">Voir dans l'app</DocLink>*
