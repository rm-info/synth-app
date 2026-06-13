# Le module Instrument

*Version provisoire — rédaction en cours.*

Le module Instrument sert à tester le son à différentes hauteurs. Ses
réglages pilotent la **preview** uniquement : ils ne sont pas copiés
dans le patch enregistré (c'est le clip qui portera la hauteur).

## Le système musical {#systeme-musical}

Choisit le système d'accordage utilisé pour le clavier de test, en deux
temps : une catégorie (moderne, historique, théorique) puis un système
précis. Les réglages fins propres à un système se font dans une fenêtre
dédiée.

*→ Voir dans l'app : <DocLink target="designer:designer-system-category">catégorie</DocLink>
· <DocLink target="designer:designer-system-selector">système</DocLink>*

## Les degrés X-EDO {#x-edo}

Quand le système **X-EDO** est choisi, un champ de degrés apparaît : il
fixe en combien de parts égales l'octave est divisée, de 1 à 53.

Quand le nombre de degrés vaut 12 ou 24, une bannière signale que le
système **correspond à 12-TET** (ou au **24-TET équipartite**) et propose
de basculer sur le layout dédié. Cette bannière n'a pas de badge propre
(contrôle contextuel transitoire).

*→ <DocLink target="designer:designer-xedo-degrees">Voir dans l'app</DocLink>*

## Le clavier {#clavier}

Le clavier de test joue le son à la hauteur choisie. Sa disposition
s'adapte au système musical (clavier de piano, grilles à degrés égaux,
grilles de shrutis…).

*→ <DocLink target="designer:designer-keyboard">Voir dans l'app</DocLink>*

## Les octaves {#octaves}

Sélectionne l'octave du clavier de test, de 0 à 10.

*→ <DocLink target="designer:designer-octave-selector">Voir dans l'app</DocLink>*

## Les repères visuels {#reperes-visuels}

Surligne sur le clavier les degrés d'une gamme ou d'un accord, à partir
d'une tonique choisie — une aide pédagogique pour situer les notes. Le
choix du **repère** (gamme/accord) et celui de la **tonique** sont deux
champs distincts ; la tonique n'apparaît que lorsqu'un repère est actif.

*→ Voir dans l'app : <DocLink target="designer:designer-visual-cues">repère</DocLink>
· <DocLink target="designer:designer-tonic-selector">tonique</DocLink>*

## Le mode Libre {#mode-libre}

Quand le système « libre » est choisi, le clavier laisse place à un
réglage direct de la fréquence : un curseur logarithmique (de 16 à
32768 Hz) et un champ de saisie en Hz. Le bouton **Test** (raccourci
`s`) joue le son à la fréquence courante.

*→ <DocLink target="designer:designer-free-frequency">Voir dans l'app</DocLink>*
