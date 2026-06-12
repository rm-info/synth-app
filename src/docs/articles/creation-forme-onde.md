# Le module Forme d'onde

*Version provisoire — rédaction en cours.*

Le module Forme d'onde édite directement la forme d'un cycle du son —
la vérité audio que toute la chaîne lit ensuite.

## Dessiner la forme d'onde {#dessiner}

La zone de tracé représente un cycle de la forme d'onde. On la dessine à
la souris ou au doigt ; le tracé est échantillonné sur 600 points entre
−1 et +1.

*→ <DocLink target="designer:designer-waveform">Voir dans l'app</DocLink>*

## Libre ou Ancres {#libre-ancres}

Bascule entre deux façons d'éditer le même cycle : le tracé **Libre**
(à main levée) et le mode **Ancres** (une poignée de points reliés par
une courbe). Les deux modifient la même forme d'onde sous-jacente.

*→ <DocLink target="designer:designer-lens-toggle">Voir dans l'app</DocLink>*

## Doux ou Anguleux {#doux-anguleux}

En mode Ancres, choisit l'interpolation entre les points : **Doux**
(courbe lissée) ou **Anguleux** (segments droits).

<Details title="Sous le capot">
Doux = spline Catmull-Rom périodique ; Anguleux = polyligne. Contrôle
actif uniquement en mode Ancres.
</Details>

*→ <DocLink target="designer:designer-interp-toggle">Voir dans l'app</DocLink>*

## Nombre d'ancres {#nombre-ancres}

Règle combien de points jalonnent la courbe en mode Ancres, de 4 à 32.

<Details title="Sous le capot">
Au changement de compte, les ancres sont reposées sur le tracé courant
par simplification de Douglas-Peucker à nombre fixe ; les détails fins
du tracé survivent dans le résidu.
</Details>

*→ <DocLink target="designer:designer-anchor-count">Voir dans l'app</DocLink>*

## Normaliser {#normaliser}

Redessine le tracé comme la somme des harmoniques courantes, à phase
canonique (chaque harmonique en sinus pur). Le bouton est désactivé
quand la forme est déjà normalisée.

*→ <DocLink target="designer:designer-normalize-button">Voir dans l'app</DocLink>*

## Lissage {#lissage}

Deux outils de lissage répétables : **Lisser** (filtre passe-bas du
tracé) et **Tendre vers la spline** (rapproche le tracé de sa courbe
d'ancres). Chaque application est annulable.

*→ <DocLink target="designer:designer-smooth-buttons">Voir dans l'app</DocLink>*
