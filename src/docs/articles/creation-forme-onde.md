# Le module Forme d'onde

C'est ici que tout commence. La forme d'onde, c'est le dessin d'**un seul
cycle** du son — la vibration que l'app rejoue en boucle, des centaines de
fois par seconde, pour faire une note tenue. Cette courbe n'est pas une
illustration : c'est la *vérité audio* que toute la chaîne lit ensuite. Si
tu veux le « pourquoi » derrière le geste (pourquoi une forme = un timbre,
pourquoi tout son se décompose en harmoniques), va voir
[Ce que tu entends quand tu dessines une forme d'onde](doc:comprendre-forme-onde).
Ici, on s'en tient au mode d'emploi.

## Dessiner la forme d'onde {#dessiner}

Tu traces la courbe à la souris ou au doigt, et l'app joue aussitôt ce que
tu dessines. La zone montre **une période** : la hauteur de la courbe à
chaque instant, c'est la pression de l'air à cet instant du cycle.

Le repère en pointillés marque le niveau **±1**, la référence d'amplitude.
Rien ne t'empêche de dessiner plus haut — tu n'es jamais bloqué — mais à
la lecture, le navigateur ramène le volume dans les clous. Vois le ±1 comme
une ligne de flottaison, pas comme un mur.

![Une période avec le repère ±1](/docs/forme-onde-reference.svg)

<Details title="Sous le capot">
La courbe est échantillonnée sur **600 points** régulièrement espacés sur
le cycle, chacun dans l'intervalle **[−1, +1]**. C'est ce tableau de 600
valeurs — et lui seul — que la synthèse lit pour produire le son. Le repère
±1 est le niveau de référence ; au-delà, l'amplitude est ramenée à la
lecture, mais la donnée tracée, elle, n'est jamais écrêtée.
</Details>

*→ <DocLink target="designer:designer-waveform">Voir dans l'app</DocLink>*

## Libre ou Ancres {#libre-ancres}

Deux façons d'éditer **le même cycle**. En **Libre**, tu dessines à main
levée : ton geste *est* la courbe. En **Ancres**, la courbe passe sous le
contrôle d'une poignée de points que tu fais glisser — plus précis, plus
géométrique.

Le point à comprendre — et c'est le cœur du module : passer de Libre à
Ancres **ne repart pas de zéro**. Les ancres viennent *épouser* ton tracé,
et les détails fins de ton dessin ne sont pas perdus — ils survivent dans
le **résidu**, une couche posée par-dessus la courbe des ancres. Quand tu
déplaces une ancre, le résidu se déforme *autour d'elle* au lieu d'être
effacé : ta personnalité de dessin reste, même après une édition par
points. Le mécanisme des deux couches (spline + résidu) est détaillé dans
[Ce que tu entends quand tu dessines une forme d'onde](doc:comprendre-forme-onde).

*→ <DocLink target="designer:designer-lens-toggle">Voir dans l'app</DocLink>*

## Doux ou Anguleux {#doux-anguleux}

En mode Ancres, ce choix décide comment relier les points. **Doux** trace
une courbe lisse qui passe par chaque ancre — un son arrondi, feutré.
**Anguleux** relie les points par des segments droits — les angles vifs
ajoutent des harmoniques aigus, donc un grain plus mordant.

<Details title="Sous le capot">
Doux = spline de Catmull-Rom *périodique* (la fin du cycle se raccorde au
début sans rupture). Anguleux = polyligne (interpolation linéaire entre
ancres). Ce contrôle n'agit qu'en mode Ancres.
</Details>

*→ <DocLink target="designer:designer-interp-toggle">Voir dans l'app</DocLink>*

## Nombre d'ancres {#nombre-ancres}

Combien de points jalonnent la courbe en mode Ancres, de **4 à 32**. Peu
d'ancres : un contrôle large, des formes simples. Beaucoup d'ancres : tu
sculptes le détail.

<Details title="Sous le capot">
Quand tu changes le nombre d'ancres, elles sont reposées sur le tracé
courant par une simplification de Douglas-Peucker à nombre fixe — l'app
garde les points les plus significatifs de la forme. Ce que la spline ne
peut pas capturer reste dans le résidu : changer le compte ne jette pas tes
détails, il rebat seulement le partage entre la couche d'ancres et le
résidu.
</Details>

*→ <DocLink target="designer:designer-anchor-count">Voir dans l'app</DocLink>*

## Normaliser {#normaliser}

Normaliser redessine ta courbe comme la **somme de ses harmoniques à phase
canonique** — chaque harmonique remis en sinus pur. À l'oreille, **rien ne
change** : la phase est inaudible. Seule la silhouette de la courbe peut
changer d'allure. Le bouton est grisé quand la forme est déjà dans cet
état.

> Pourquoi ce bouton existe : éditer une barre d'harmonique suppose une
> phase de référence. Normaliser d'abord, c'est choisir cette référence en
> connaissance de cause plutôt que de la subir. Le détail est dans
> [Ce que tu entends quand tu dessines une forme d'onde](doc:comprendre-forme-onde).

*→ <DocLink target="designer:designer-normalize-button">Voir dans l'app</DocLink>*

## Lissage {#lissage}

Deux outils pour adoucir un tracé, applicables autant de fois que tu veux
(et chaque application est annulable) :

- **Lisser** — un filtre passe-bas du tracé : il rabote les aspérités,
  efface les angles, calme les aigus.
- **Tendre vers la spline** — rapproche ton tracé de la courbe lisse de ses
  ancres, en réduisant peu à peu le résidu.

Ces outils sont expérimentaux : sers-t'en par petites touches, écoute, et
recommence si besoin.

*→ <DocLink target="designer:designer-smooth-buttons">Voir dans l'app</DocLink>*
