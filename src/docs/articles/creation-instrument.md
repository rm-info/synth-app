# Le module Instrument

Le module Instrument est ton banc d'essai : il te laisse **entendre le
patch à différentes hauteurs** pendant que tu le règles. Garde une chose en
tête — ses réglages pilotent la *preview* uniquement. Le système d'accordage,
l'octave, la note jouée ici ne sont **pas** copiés dans le patch enregistré ;
au Composer, c'est le clip qui portera la hauteur. Tu choisis donc librement
sur quoi écouter ton timbre, sans rien figer.

## Le système musical {#systeme-musical}

C'est le découpage de l'octave utilisé par le clavier de test. Le choix se
fait en deux temps : d'abord une **catégorie** (Moderne, Historique,
Théorique), puis un **système** précis dans cette catégorie — 12-TET,
pythagoricien, intonation juste, gamelan, maqâm, shrutis, x-EDO… Les
réglages fins propres à un système (comme le diapason de référence) se font
dans une fenêtre dédiée. Pour comprendre ce qu'est un tempérament et
pourquoi ils diffèrent, vois
[Qu'est-ce qu'un tempérament ?](doc:comprendre-temperament).

<Details title="Sous le capot">
Le système par défaut est le **12-TET** (tempérament égal à douze degrés),
calé sur **A4 = 440 Hz**. La fréquence d'une note y suit :

$$f = f_{A4} \cdot 2^{\frac{m - 69}{12}}$$

où *m* est le numéro MIDI de la note (69 = le *la* de référence). Chaque
demi-ton multiplie donc la fréquence par $2^{1/12}$. L'unité fine de
comparaison est le **cent** : un centième de demi-ton tempéré, soit
1200 cents par octave. Le registre des systèmes est extensible
(`tuningSystems`).
</Details>

*→ Voir dans l'app : <DocLink target="designer:designer-system-category">catégorie</DocLink>
· <DocLink target="designer:designer-system-selector">système</DocLink>*

## Les degrés X-EDO {#x-edo}

Le système **X-EDO** (de l'anglais *equal division of the octave*, division
égale de l'octave) te laisse choisir **en combien de parts égales** l'octave
est découpée, de **1 à 53**. C'est un terrain de jeu théorique : 5 degrés,
19, 31… autant de gammes au tempérament égal que les douze notes habituelles
n'épuisent pas.

Quand tu poses 12 ou 24 degrés, une **bannière** signale que le réglage
revient au 12-TET (ou au 24-TET équipartite) et te propose de basculer sur
le clavier dédié de ces systèmes — souvent plus pratique. Cette bannière est
contextuelle et n'a pas de badge propre.

<Details title="Sous le capot">
En X-EDO à *N* degrés, chaque degré *d* au-dessus de la référence vaut :

$$f = f_{ref} \cdot 2^{\frac{d}{N}}$$

Un degré mesure donc $\frac{1200}{N}$ cents. Pour N = 12, on retombe
exactement sur le demi-ton de 100 cents du 12-TET — d'où la bannière de
conversion.
</Details>

*→ <DocLink target="designer:designer-xedo-degrees">Voir dans l'app</DocLink>*

## Le clavier {#clavier}

Le clavier de test joue le son à la hauteur choisie, à la souris ou aux
touches de ton clavier physique. Sa disposition s'adapte au système :
clavier de piano pour le 12-TET, grilles à degrés égaux pour les x-EDO,
grilles de shrutis pour les systèmes indiens…

Un **cadenas de maintien**, près du clavier, laisse la note de test sonner
en continu sans rester appuyé (raccourci Espace) — pratique pour régler le
timbre à l'oreille tout en gardant les mains libres. À ne pas confondre avec
le **Soutien** de l'enveloppe : le cadenas tient *la note de test*, le
Soutien est un *niveau de volume* dans la forme du son. Deux choses sans
rapport.

*→ Voir dans l'app : <DocLink target="designer:designer-keyboard">clavier</DocLink>
· <DocLink target="designer:designer-sustain-pastille">maintien de la note</DocLink>*

## Les octaves {#octaves}

Sélectionne l'octave du clavier de test, de **0 à 10** — pour écouter ton
patch dans les graves caverneux comme dans les aigus les plus fins. (Encore
une fois : pur réglage d'écoute, sans effet sur le patch enregistré.)

*→ <DocLink target="designer:designer-octave-selector">Voir dans l'app</DocLink>*

## Les repères visuels {#reperes-visuels}

Une aide pédagogique : surligne sur le clavier les degrés d'une **gamme** ou
d'un **accord**, à partir d'une **tonique** que tu choisis. Tu vois d'un
coup d'œil où tombent les notes de la gamme dans le système courant — y
compris dans un tempérament exotique, où les repères se calculent en cents.

Le choix du **repère** (gamme/accord) et celui de la **tonique** sont deux
champs distincts ; la tonique n'apparaît qu'une fois un repère actif.

*→ Voir dans l'app : <DocLink target="designer:designer-visual-cues">repère</DocLink>
· <DocLink target="designer:designer-tonic-selector">tonique</DocLink>*

## Le mode Libre {#mode-libre}

Quand le système « libre » est choisi, oublie les notes : tu règles la
**fréquence directement**. Un curseur logarithmique balaie de **16 à
32768 Hz** (soit $2^{4}$ à $2^{15}$), doublé d'un champ de saisie en hertz
pour viser une valeur exacte. Le bouton **Test** (raccourci `s`) joue le son
à la fréquence courante. Idéal pour explorer une fréquence hors de toute
grille, ou caler un repère acoustique précis.

*→ <DocLink target="designer:designer-free-frequency">Voir dans l'app</DocLink>*
