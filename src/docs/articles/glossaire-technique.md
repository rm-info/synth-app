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
d'onde*.

## DFT

*Discrete Fourier Transform*, ou transformée de Fourier discrète :
le calcul qui décompose un son en les fréquences qui le composent.
C'est ce principe qui permet d'obtenir le *spectre* d'une forme
d'onde — la liste de ses harmoniques et de leur intensité. L'app
s'en sert pour afficher le spectrogramme du Designer. Voir aussi
*Harmonique*, *Spectre et spectrogramme*.

## Forme d'onde

Le tracé d'une seule période du son — la courbe que tu dessines à la
souris dans
<DocLink target="designer:designer-waveform">la zone de dessin</DocLink>
du Designer. Sa forme détermine le *timbre* : une sinusoïde sonne
« pure », une dent de scie « riche » et nasillarde. C'est le cœur
d'un patch. Voir aussi *Période*, *Timbre*.

## Fréquence

Le nombre de répétitions d'une onde par seconde, mesuré en *hertz*
(Hz). Elle détermine la *hauteur* perçue : plus la fréquence est
élevée, plus le son est aigu. Doubler la fréquence monte d'une
octave. Voir aussi *Hauteur*, *Période*.

## Harmonique

Composante d'un son dont la fréquence est un multiple entier de la
fréquence fondamentale. Un son réel est presque toujours un
empilement d'harmoniques, et c'est leur dosage qui crée le *timbre*.
Une forme d'onde anguleuse (dent de scie, carré) en contient
beaucoup ; une sinusoïde n'en a qu'un seul. Voir aussi *Spectre et
spectrogramme*, *Timbre*.

## Hauteur

Le caractère plus ou moins aigu d'un son, tel que l'oreille le
perçoit. Elle découle de la *fréquence*, mais c'est une sensation :
c'est la « note » que tu entends. Dans l'app, le système musical
choisi décide quelles hauteurs sont disponibles et à quelles
fréquences elles correspondent — tu les joues sur
<DocLink target="designer:designer-keyboard">le clavier</DocLink>.
Voir aussi *A4*, *Fréquence*.

## Hertz (Hz)

L'unité de fréquence : un hertz vaut une oscillation par seconde.
L'oreille humaine perçoit en gros de 20 Hz (très grave) à 20 000 Hz
(très aigu). Le *la* de référence, A4, vibre à $440$ Hz. Voir aussi
*Fréquence*.

## Octave

Intervalle entre deux sons dont l'un a exactement le double de la
fréquence de l'autre (rapport $2:1$). Deux notes séparées d'une
octave portent le même nom et se ressemblent au point de presque
fusionner à l'oreille. C'est l'intervalle de référence que tous les
systèmes musicaux subdivisent — tu peux changer d'octave avec
<DocLink target="designer:designer-octave-selector">le sélecteur
d'octave</DocLink>. Voir aussi
[intervalle](doc:glossaire-musical).

## Période

La durée d'un cycle complet d'une onde qui se répète. C'est
l'inverse de la *fréquence* : une période courte correspond à une
fréquence élevée, donc à un son aigu. La *forme d'onde* dessinée
dans le Designer représente une seule période. Voir aussi
*Fréquence*, *Forme d'onde*.

## Spectre et spectrogramme

Le **spectre** d'un son est la liste des fréquences qui le composent
et de leur intensité — sa « recette » en harmoniques. Le
**spectrogramme** en est la représentation visuelle, affichée dans
le Designer pendant que le son joue : il rend visible ce que la
*forme d'onde* produit. Tu le vois ici :
<DocLink target="designer:designer-spectrogram">le spectrogramme</DocLink>.
Voir aussi *DFT*, *Harmonique*.

## Timbre

Ce qui distingue deux sons de même hauteur et même volume — pourquoi
un violon et une flûte jouant le même *la* ne se confondent pas. Le
timbre dépend surtout du nombre et du dosage des *harmoniques*, donc
de la *forme d'onde*. Voir aussi *Forme d'onde*, *Spectre et
spectrogramme*.
