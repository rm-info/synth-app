# Guide : le Designer

Le Designer est l'atelier où tu fabriques un son — un *patch*. Tu y
dessines une forme d'onde, tu sculptes son évolution dans le temps,
tu choisis l'accordage, puis tu testes le tout au clavier avant de
l'enregistrer. Pour un survol rapide, lance le Tour ; ce guide passe
chaque zone en revue.

## Dessiner la forme d'onde

Au cœur de l'onglet,
<DocLink target="designer:designer-waveform">la zone de dessin</DocLink> :
trace une courbe à la souris, ou pars d'un preset (sinus, carré, dent
de scie…). Cette forme détermine le *timbre* du son — pourquoi,
c'est l'objet de
[Ce que tu entends quand tu dessines une forme d'onde](doc:comprendre-forme-onde)
et du [glossaire technique](doc:glossaire-technique).

## L'enveloppe AHDSR

<DocLink target="designer:designer-adsr">L'enveloppe</DocLink> règle
le volume du son au fil du temps, en cinq phases : attaque, maintien
(*hold*), déclin, tenue (*sustain*) et extinction (*release*). C'est
elle qui distingue une cloche d'un coup d'archet. Le détail de chaque
phase est au [glossaire technique](doc:glossaire-technique).

## L'amplitude

Un réglage d'amplitude fixe le niveau général du patch — son volume
avant que l'enveloppe ne le module. Utile pour équilibrer plusieurs
sons entre eux.

## Choisir le système musical

<DocLink target="designer:designer-system-selector">Le sélecteur de
système</DocLink> décide comment l'octave est découpée : la gamme à
douze notes habituelle, ou l'un des tempéraments et systèmes du
monde. C'est la porte d'entrée vers tout l'univers décrit dans
[Qu'est-ce qu'un tempérament ?](doc:comprendre-temperament).

> **Notation des notes.** Le clavier et les étiquettes de l'app
> affichent les notes en notation anglo-saxonne (C, D, E, F, G, A,
> B) ; cette documentation, elle, parle en solfège. La
> correspondance : do = C, ré = D, mi = E, fa = F, sol = G, la = A,
> si = B.

## Tester au clavier

<DocLink target="designer:designer-keyboard">Le clavier de
test</DocLink> joue les notes du système courant, à la souris ou aux
touches de ton clavier physique.
<DocLink target="designer:designer-octave-selector">Change
d'octave</DocLink> avec PageUp / PageDown, et maintiens Espace pour
activer <DocLink target="designer:designer-sustain-pastille">la
pédale de sustain</DocLink> : les notes tenues ne s'éteignent qu'au
relâchement.

## Voir le son

Pendant que tu joues,
<DocLink target="designer:designer-spectrogram">le
spectrogramme</DocLink> affiche le contenu harmonique du son —
quelles fréquences sont présentes, et avec quelle intensité (voir
*Spectre et spectrogramme* au
[glossaire technique](doc:glossaire-technique)).

## Enregistrer

Quand le son te plaît, sauvegarde-le : Ctrl+S met à jour le patch
courant, tandis que
<DocLink target="designer:designer-save-as-button">Sauvegarder comme
nouveau</DocLink> (Ctrl+Alt+S) en crée une copie.
<DocLink target="designer:designer-new-button">Repartir de
zéro</DocLink> (Ctrl+Alt+N) vide l'éditeur. Ton patch rejoint alors
la [Bibliothèque](doc:guide-bibliotheque), prêt pour le
[Composer](doc:guide-composer).
