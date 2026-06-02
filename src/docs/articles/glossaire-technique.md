# Glossaire technique

Les termes de synthèse sonore et de traitement du signal que tu
croiseras dans le Designer et ailleurs dans l'app. Cherche un mot,
lis deux phrases. Pour le vocabulaire de théorie musicale (gammes,
tempéraments), va voir le [glossaire musical](doc:glossaire-musical).

## A4

Note de référence pour accorder un instrument : le *la* de la
quatrième octave. La convention moderne lui attribue une fréquence
de $440$ Hz, valeur par défaut dans l'app. Toutes les autres
hauteurs se calculent à partir d'elle, selon le système musical
choisi. Voir aussi *Fréquence*, *Hauteur*.

## ADSR

Profil d'évolution du volume d'un son dans le temps, de son attaque
à son extinction. Le sigle vient de l'anglais *Attack, Decay,
Sustain, Release*. L'enveloppe de l'app ajoute une phase de maintien
(*hold*) après l'attaque : attaque, maintien, déclin et extinction
se règlent en millisecondes, tandis que le sustain est un *niveau*
(de 0 à 1) tenu tant que la note dure. Tu l'édites avec
<DocLink target="designer:designer-adsr">les poignées d'enveloppe</DocLink>.

## Amplitude

L'ampleur des oscillations d'une onde sonore — autrement dit son
volume. Plus l'amplitude est grande, plus le son est fort. Dans un
patch, l'amplitude globale fixe le niveau général, et l'enveloppe
*ADSR* en module le volume au fil du temps. Voir aussi *Forme
d'onde*, *Son*.

## Ancre

Point de contrôle posé sur la *forme d'onde* pour la modeler en
douceur. En mode Ancres, le Designer en place de $4$ à $32$, reliées
par une courbe lisse (une *spline*) qui les épouse : déplacer une
ancre déforme la courbe autour d'elle, sans effacer les détails fins
du tracé d'origine (le *résidu*). Plus tu poses d'ancres, plus la
courbe colle au dessin de départ ; moins tu en as, plus chaque ancre
agit large et plus le résidu porte la personnalité du tracé. Tu les
manipules dans
<DocLink target="designer:designer-waveform">la zone de dessin</DocLink>.
Voir aussi *Forme d'onde*, *Résidu*.

## Cap (plafond d'harmoniques)

Le nombre maximal d'*harmoniques* prises en compte dans la synthèse
d'un patch, réglable de $1$ à $256$. Au-delà du cap, les harmoniques
sont coupées : un cap bas donne un son plus doux et lisse, un cap haut
un son plus riche et brillant. C'est aussi le cap qui fixe le nombre
de barres affichées dans la lentille
<DocLink target="designer:designer-harmonics">Harmoniques</DocLink>.
Voir aussi *Harmonique*, *Spectre et spectrogramme*.

## DFT

*Discrete Fourier Transform*, ou transformée de Fourier discrète :
le calcul qui décompose un son en les fréquences qui le composent.
C'est ce principe qui permet d'obtenir le *spectre* d'une forme
d'onde — la liste de ses harmoniques et de leur intensité, mais aussi
la *phase* de chacune. L'app s'en sert pour afficher le spectrogramme
du Designer. L'opération inverse, qui reconstruit une forme à partir
de cette liste, est l'*iDFT*. Voir aussi *Harmonique*, *iDFT*,
*Phase*, *Spectre et spectrogramme*.

## Forme d'onde

Le tracé d'une seule période du son — la courbe que tu dessines à la
souris dans
<DocLink target="designer:designer-waveform">la zone de dessin</DocLink>
du Designer. Sa forme détermine le *timbre* : une sinusoïde sonne
« pure », une dent de scie « riche » et nasillarde. C'est le cœur
d'un patch. Tu la modèles à main levée ou par *ancres*, ses détails
fins étant alors conservés dans le *résidu*. Voir aussi *Ancre*,
*Période*, *Résidu*, *Son*, *Timbre*.

## Fréquence

Le nombre de répétitions d'une onde par seconde, mesuré en *hertz*
(Hz). Elle détermine la *hauteur* perçue : plus la fréquence est
élevée, plus le son est aigu. Doubler la fréquence monte d'une
octave. Voir aussi *Hauteur*, *Période*, *Son*.

## Harmonique

Composante d'un son dont la fréquence est un multiple entier de la
fréquence fondamentale. Un son réel est presque toujours un
empilement d'harmoniques, et c'est leur dosage qui crée le *timbre*.
Une forme d'onde anguleuse (dent de scie, carré) en contient
beaucoup ; une sinusoïde n'en a qu'un seul. Dans la synthèse, leur
nombre est plafonné par le *cap*, et chacune porte une *phase* qui
règle son alignement avec les autres. Voir aussi *Cap (plafond
d'harmoniques)*, *Phase*, *Spectre et spectrogramme*, *Timbre*.

## Hauteur

Le caractère plus ou moins aigu d'un son, tel que l'oreille le
perçoit. Elle découle de la *fréquence*, mais c'est une sensation :
c'est la « note » que tu entends. Dans l'app, le système musical
choisi décide quelles hauteurs sont disponibles et à quelles
fréquences elles correspondent — tu les joues sur
<DocLink target="designer:designer-keyboard">le clavier</DocLink>.
Voir aussi *A4*, *Fréquence*, *Son*.

## Hertz (Hz)

L'unité de fréquence : un hertz vaut une oscillation par seconde.
L'oreille humaine perçoit en gros de 20 Hz (très grave) à 20 000 Hz
(très aigu). Le *la* de référence, A4, vibre à $440$ Hz. Voir aussi
*Fréquence*.

## iDFT

*Inverse Discrete Fourier Transform*, ou transformée de Fourier
inverse : l'opération réciproque de la *DFT*. Là où la DFT décompose
un son en sa liste d'harmoniques, l'iDFT fait le chemin inverse — elle
reconstruit une *forme d'onde* à partir d'une telle liste. Le Designer
l'emploie quand tu modifies une barre de la lentille Harmoniques ou
que tu cliques sur Normaliser : il rebâtit le tracé depuis les
intensités courantes, en attribuant à chaque harmonique une *phase*
canonique (un sinus pur). Voir aussi *DFT*, *Normalisation*, *Phase*.

## Normalisation

Opération qui *redessine* la forme d'onde à partir des seules
intensités de ses harmoniques, en réimposant à chacune une *phase*
canonique (sinus pur) — c'est une normalisation de la *phase*, pas du
volume. La courbe passe donc par l'*iDFT* de ses propres harmoniques :
le timbre audible reste quasi identique (la phase isolée est
inaudible), mais le tracé peut sauter visuellement. Le Designer la
propose comme étape explicite avant l'édition d'une barre, car sans
elle, toucher une seule barre écraserait en silence la phase de toutes
les autres. Le bouton Σ, dans le bandeau de la zone Forme d'onde,
déclenche cette remise en phase. Voir aussi *iDFT*, *Phase*,
*Harmonique*.

## Octave

Intervalle entre deux sons dont l'un a exactement le double de la
fréquence de l'autre (rapport $2:1$). Deux notes séparées d'une
octave portent le même nom et se ressemblent au point de presque
fusionner à l'oreille. C'est l'intervalle de référence que tous les
systèmes musicaux subdivisent — tu peux changer d'octave avec
<DocLink target="designer:designer-octave-selector">le sélecteur
d'octave</DocLink>. Voir aussi
[intervalle](doc:glossaire-musical).

## Phase

Décalage temporel d'une onde sinusoïdale par rapport à un instant de
référence. Deux sinusoïdes de même fréquence mais de phases
différentes sonnent à la même hauteur : prise seule, la phase est
*inaudible*. Mais dès que plusieurs *harmoniques* se superposent dans
une forme d'onde, leurs phases relatives décident de la manière dont
elles s'additionnent — à intensités égales, deux sons peuvent dessiner
des courbes très différentes selon la phase de chaque harmonique.
C'est pour cette raison que *normaliser* une forme (imposer la même
phase de référence à toutes ses harmoniques) en change le tracé sans
en changer le timbre. Voir aussi *Harmonique*, *Normalisation*,
*Forme d'onde*.

## Période

La durée d'un cycle complet d'une onde qui se répète. C'est
l'inverse de la *fréquence* : une période courte correspond à une
fréquence élevée, donc à un son aigu. La *forme d'onde* dessinée
dans le Designer représente une seule période. Voir aussi
*Fréquence*, *Forme d'onde*.

## Résidu

L'écart entre la *forme d'onde* que tu as éditée et la courbe lisse
que produiraient les seules *ancres* courantes. Quand tu dessines à
main levée, le résidu retient tous les détails fins de ton geste. En
basculant en mode Ancres, ces détails ne disparaissent pas : déplacer
une ancre fait bouger la courbe lisse, mais le résidu reste en place
et continue de moduler la forme finale. Si la courbe des ancres est le
squelette, le résidu en est la chair — c'est lui qui te laisse éditer
par ancres un tracé dessiné librement sans lui ôter sa personnalité.
Voir aussi *Ancre*, *Forme d'onde*.

## Son

Une variation de pression dans l'air — ou un autre milieu — qui se
propage en onde jusqu'à ton oreille, où elle devient une sensation.
Trois propriétés le caractérisent : sa *fréquence* (la vitesse à
laquelle la pression oscille) fixe la *hauteur* perçue, son
*amplitude* le volume, et sa *forme d'onde* le *timbre*. La plupart
des sons musicaux ne sont pas des sinusoïdes pures mais des
empilements d'*harmoniques* — c'est cette recette-là que tu sculptes
dans le Designer. Voir aussi *Amplitude*, *Forme d'onde*, *Fréquence*,
*Harmonique*, *Hertz (Hz)*, *Timbre*.

## Spectre et spectrogramme

Le **spectre** d'un son est la liste des fréquences qui le composent
et de leur intensité (la magnitude de chaque harmonique) — sa
« recette ». Cette liste s'arrête au *cap*. Le
**spectrogramme** en est la représentation visuelle, affichée dans
le Designer pendant que le son joue : il rend visible ce que la
*forme d'onde* produit. Tu le vois ici :
<DocLink target="designer:designer-spectrogram">le spectrogramme</DocLink>.
Voir aussi *Cap (plafond d'harmoniques)*, *DFT*, *Harmonique*.

## Timbre

Ce qui distingue deux sons de même hauteur et même volume — pourquoi
un violon et une flûte jouant le même *la* ne se confondent pas. Le
timbre dépend surtout du nombre et du dosage des *harmoniques*, donc
de la *forme d'onde*. Voir aussi *Forme d'onde*, *Son*, *Spectre et
spectrogramme*.
