# Glossaire musical

Les termes de théorie musicale et de tempérament utiles pour
comprendre les systèmes que propose l'app. Cherche un mot, lis deux
phrases. Pour le vocabulaire du son et du signal (fréquence,
harmonique, ADSR), va voir le
[glossaire technique](doc:glossaire-technique).

## 12-TET

Division de l'octave en douze demi-tons strictement égaux, chacun
valant $2^{1/12}$ (soit $100$ cents). C'est l'accord du piano
moderne et le système par défaut de l'app. Aucune quinte n'y est
parfaitement pure, mais toutes les tonalités sonnent de la même
façon — ce qui rend la transposition libre. Le *pourquoi* de ces
douze notes est détaillé dans
[Pourquoi 12 notes ?](doc:why-12-notes), le système lui-même dans sa
[fiche dédiée](doc:temperament-12-tet). Voir aussi *EDO*,
*Tempérament*.

## Cents

L'unité de mesure des intervalles. Un demi-ton du tempérament égal
vaut $100$ cents, et l'octave entière $1200$ cents. L'échelle est
logarithmique : elle suit l'oreille, pour qui un même rapport de
fréquences donne toujours le même « écart » quelle que soit la
hauteur. C'est l'outil commode pour comparer deux systèmes — le
comma pythagoricien, par exemple, vaut $\approx 23$ cents.

## Comma

Un comma est un très petit intervalle résiduel, trace de
l'impossibilité d'accorder un instrument à hauteur fixe juste dans
tous les sens à la fois. Le **comma pythagoricien** ($\approx 23$
cents) sépare douze quintes pures empilées de sept octaves. Le
**comma syntonique** (rapport $\frac{81}{80}$, soit environ
21,5 cents) sépare la tierce majeure pure de celle qu'on obtient en
empilant quatre quintes pures. Ce sont eux que les tempéraments
cherchent à dissimuler ; le premier est expliqué en détail dans
[Pourquoi 12 notes ?](doc:why-12-notes). Voir aussi *Quinte*,
*Tempérament*.

## Degré et tonique

Dans une échelle, chaque note occupe un **degré** — une position
numérotée (premier degré, deuxième degré…). Le premier degré, la
**tonique**, sert de point de repère autour duquel l'oreille
organise les autres : c'est la note qui « sonne comme la maison ».
Plusieurs systèmes de l'app laissent choisir la tonique de
référence.

## EDO

De l'anglais *equal division of the octave*, division égale de
l'octave. Un système n-EDO découpe l'octave en $n$ intervalles
identiques, chacun valant $2^{1/n}$. Le 12-TET est donc le 12-EDO ;
l'app propose aussi un mode **X-EDO** où tu choisis librement $n$
(par exemple 22 ou 53 degrés). Plus $n$ est grand, plus les
intervalles sont fins. Le mode paramétrique est détaillé dans la
[fiche X-EDO](doc:temperament-x-edo) ; change de système avec
<DocLink target="designer:designer-system-selector">le sélecteur de
système</DocLink>.

## Gamelan (slendro et pelog)

Le gamelan est un ensemble instrumental d'Indonésie dont les
échelles ignorent le découpage occidental. L'app implémente deux
échelles javanaises de Surakarta : le **slendro** (cinq notes aux
intervalles presque égaux) et le **pelog** (sept notes aux
intervalles inégaux). Ces accords varient d'un ensemble à l'autre ;
les valeurs de l'app suivent les mesures de Surjodiningrat (1972).
Fiches : [Slendro](doc:temperament-slendro) et
[Pelog](doc:temperament-pelog).

## Intervalle

L'écart de hauteur entre deux notes — perçu par l'oreille comme un
*rapport* de fréquences, et non comme une différence. Le rapport
$2:1$ donne une octave, $\frac{3}{2}$ une quinte, $\frac{5}{4}$ une
tierce majeure. On mesure les intervalles en *cents* pour les
comparer d'un système à l'autre. Voir aussi *Quinte*, *Tierce*.

## Intonation juste

Un accord où les intervalles suivent des rapports de nombres entiers
simples — quinte $\frac{3}{2}$, tierce majeure $\frac{5}{4}$ —
réputés les plus consonants. Ces intervalles purs sont d'une
stabilité remarquable, mais ils ne se referment pas sur eux-mêmes :
une intonation juste interdit de transposer librement dans toutes
les tonalités. L'app en propose une version majeure centrée sur do,
détaillée dans sa [fiche](doc:temperament-juste-majeur). Voir aussi
*Comma*, *Tempérament*.

## Maqâm

Cadre mélodique de la musique arabe, fondé sur des échelles qui
incluent des intervalles « neutres », à mi-chemin du majeur et du
mineur occidentaux. Le Congrès du Caire de 1932 a tenté d'en fixer
une référence théorique. L'app propose deux grilles de hauteurs
liées à ce cadre : une division théorique en 24 quarts de ton égaux
([fiche 24-TET](doc:temperament-24-tet)), et un relevé de hauteurs
mesurées ([Maqâmât du Caire 1932](doc:temperament-cairo-1932),
d'après aly-abbara.com).

## Méantone

Famille de tempéraments qui rétrécit légèrement chaque quinte pour
gagner des tierces majeures pures ou presque. Le plus courant, le
**mésotonique 1/4 de comma** (Renaissance et début du baroque),
retranche à chaque quinte un quart du comma syntonique — au prix
d'une quinte très fausse, la fameuse « quinte du loup ». L'app en
propose une version centrée sur do, décrite dans la
[fiche Mésotonique](doc:temperament-meantone). Voir aussi *Comma*,
*Quinte*.

## Quinte

La **quinte** est l'intervalle entre deux notes dont les fréquences
sont idéalement dans le rapport $\frac{3}{2}$ — l'un des plus
consonants après l'octave. Une **quinte pure** respecte exactement
ce rapport ; une **quinte tempérée** s'en écarte un peu pour que
l'instrument puisse jouer dans toutes les tonalités. Le 12-TET
tempère ses douze quintes de façon égale (chacune environ 2 cents
trop courte) ; le [pythagoricien](doc:temperament-pythagoricien),
lui, les garde pures et concentre tout l'écart sur une seule. Voir
aussi *Comma*, [Pourquoi 12 notes ?](doc:why-12-notes).

## Raga

Dans la musique classique indienne, un raga est un cadre mélodique —
un choix de notes, de tournures et d'ornements caractéristiques —
bien plus riche qu'une simple gamme. Les ragas se déploient sur un
substrat de micro-intervalles, les *shrutis*. L'app n'implémente pas
les ragas eux-mêmes, mais les deux grilles de 22 shrutis sur
lesquelles ils reposent. Voir *Shruti*.

## Shruti

Le plus petit intervalle distingué par la théorie musicale indienne.
L'octave y est traditionnellement décrite comme un assemblage de
**22 shrutis** d'amplitudes inégales. L'app propose deux
répartitions de ces 22 hauteurs : l'une d'après la modernisation de
Bhatkhande ([fiche](doc:temperament-shrutis-bhatkhande)), l'autre
d'après Sarngadeva (traité *Sangita Ratnakara*, XIIIe siècle ;
[fiche](doc:temperament-shrutis-sarngadeva)). Voir aussi *Raga*.

## Tempérament

La manière de répartir les petits écarts inévitables — les *commas*
— sur un instrument à hauteur fixe, faute de pouvoir rendre tous les
intervalles purs à la fois. *Tempérer*, c'est choisir où placer le
défaut : sur quelques notes (tempéraments inégaux comme
[Werckmeister III](doc:temperament-werckmeister)) ou réparti
également sur toutes (le tempérament égal). Chaque choix donne une
« couleur » différente aux tonalités, que tu peux comparer via
<DocLink target="designer:designer-system-selector">le sélecteur de
système</DocLink>. Le compromis est développé dans
[Pourquoi 12 notes ?](doc:why-12-notes).

## Tierce

Intervalle de trois degrés dans une gamme diatonique (do-mi, par
exemple). La **tierce majeure** pure correspond au rapport
$\frac{5}{4}$ ; elle est l'un des piliers de la consonance, et la
quête de tierces justes a guidé des tempéraments entiers comme le
[méantone](doc:temperament-meantone). Voir aussi *Intonation juste*,
*Méantone*.
