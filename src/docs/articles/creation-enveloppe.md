# Le module Enveloppe

La forme d'onde décide *de quoi* le son est fait ; l'enveloppe décide
*comment il vit dans le temps* — comment son volume naît, se tient et
s'éteint. C'est elle qui sépare une cloche (attaque sèche, longue
extinction) d'un coup d'archet (montée douce, tenue stable). Même timbre,
deux enveloppes : deux instruments.

## L'enveloppe AHDSR {#enveloppe-ahdsr}

L'enveloppe se règle en **cinq temps**, dans l'ordre où le son les
traverse :

- **Attaque** — la montée, du silence au sommet, dès que la note se
  déclenche.
- **Maintien** (*hold*) — un court plateau *au sommet*, avant que le volume
  ne commence à redescendre.
- **Déclin** — la descente du sommet jusqu'au niveau de soutien.
- **Soutien** — le niveau tenu *tant que la note dure*.
- **Relâche** — l'extinction, du niveau de soutien jusqu'au silence, une
  fois la note relâchée.

![Les cinq segments de l'enveloppe AHDSR](/docs/enveloppe-ahdsr.svg)

Le graphe en donne la vue d'ensemble, éditable à la poignée ; les sections
suivantes détaillent chaque réglage (et la vue sliders les expose un par
un). Le « A » d'AHDSR est bien une enveloppe à *six* poignées au total avec
l'amplitude — pas un simple ADSR : la phase **Maintien** est la lettre en
plus, et c'est aussi le piège classique. Voir juste en dessous.

*→ <DocLink target="designer:designer-adsr">Voir dans l'app</DocLink>*

## L'amplitude {#amplitude}

Le volume global du patch, de **0 à 1**. C'est le niveau de référence du son
*avant* que l'enveloppe ne le module — utile pour équilibrer plusieurs
patches entre eux sans toucher à la forme de leur enveloppe.

*→ <DocLink target="designer:designer-amplitude">Voir dans l'app</DocLink>*

## Attaque {#attaque}

La durée de la montée, du silence au sommet, après le déclenchement de la
note, de **0 à 1000 ms**. Une attaque à 0 donne un démarrage net, percussif ;
une attaque longue, une entrée en fondu, comme un son qui « gonfle ».

*→ <DocLink target="designer:designer-adsr-attack">Voir dans l'app</DocLink>*

## Maintien {#maintien}

La durée du plateau tenu **au sommet**, entre l'attaque et le déclin, de
**0 à 1000 ms**. C'est le temps pendant lequel le son reste à son volume
maximal avant de commencer à redescendre.

> **Maintien ≠ Soutien.** Le Maintien est un palier *au pic*, traversé une
> fois, juste après l'attaque. Le Soutien est le niveau tenu *ensuite*, tant
> que tu gardes la note. L'un est une durée en haut de la courbe, l'autre un
> niveau au milieu — ne les confonds pas.

*→ <DocLink target="designer:designer-adsr-hold">Voir dans l'app</DocLink>*

## Déclin {#declin}

La durée de la descente, du sommet jusqu'au niveau de soutien, de **0 à
1000 ms**. C'est la phase qui donne à un son pincé (piano, guitare) sa
décroissance caractéristique juste après l'attaque.

*→ <DocLink target="designer:designer-adsr-decay">Voir dans l'app</DocLink>*

## Soutien {#soutien}

Le **niveau** tenu tant que la note dure, après l'attaque et le déclin, de
**0 à 1**. Attention : c'est un niveau de volume, **pas une durée**. À 1, le
son ne décline pas tant que tu tiens la note (orgue) ; à 0, il s'éteint dès
la fin du déclin, même note tenue (instrument percussif).

*→ <DocLink target="designer:designer-adsr-sustain">Voir dans l'app</DocLink>*

## Relâche {#relache}

La durée de l'extinction, du niveau de soutien jusqu'au silence, **après le
relâchement** de la note, de **0 à 1000 ms**. Une relâche courte coupe net ;
une relâche longue laisse le son traîner après que tu as lâché la touche.

<Details title="Sous le capot">
Un **plancher anti-clic** s'applique aux phases les plus rapides (attaque et
relâche) : une transition de volume trop brutale produirait un déclic audible.
Le moteur lisse donc imperceptiblement ces bords, même réglés à 0.
</Details>

*→ <DocLink target="designer:designer-adsr-release">Voir dans l'app</DocLink>*

## Les vues {#vues}

Bascule l'affichage entre la **vue graphe** (la courbe complète, éditable à
la poignée) et la **vue sliders** (les six réglages en curseurs). Le graphe
parle au geste et à l'œil, les sliders à la précision. Ce choix n'apparaît
qu'en affichage compact.

*→ <DocLink target="designer:designer-adsr-view-toggle">Voir dans l'app</DocLink>*
