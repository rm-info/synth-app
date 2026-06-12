# Guide : le Designer

Le Designer est l'atelier où tu fabriques un *patch* — un timbre et son
enveloppe. Tu y façonnes une *forme d'onde*, tu sculptes son évolution
dans le temps, tu choisis l'accordage, puis tu testes au clavier avant
d'enregistrer. Ce guide passe chaque zone en revue ; pour un survol
guidé, lance le Tour.

## Trois lentilles sur une seule courbe

Au cœur du Designer, trois zones côte à côte :
<DocLink target="designer:designer-waveform">Forme d'onde</DocLink> à
gauche, <DocLink target="designer:designer-harmonics">Harmoniques</DocLink>
au milieu, <DocLink target="designer:designer-spectrogram">Spectrogramme</DocLink>
à droite.

Ce ne sont pas trois objets séparés. Ce sont **trois manières de
regarder la même courbe** — la même que celle qui produit le son. Tire
une barre dans Harmoniques et la forme se redessine à gauche ; modifie
le tracé à gauche et les barres bougent. On parle de *lentilles* :
elles regardent toutes le même *son*, chacune sous un angle. Pour le
rappel théorique, vois *Son* et *Forme d'onde* au
[glossaire technique](doc:glossaire-technique), et
[Ce que tu entends quand tu dessines une forme d'onde](doc:comprendre-forme-onde)
pour le « pourquoi ».

## La lentille Forme d'onde {#lentille-forme-onde}

La zone de gauche montre une *période* de l'onde. Tu l'édites de deux
façons exclusives, choisies par le sélecteur **Libre / Ancres** dans
son en-tête.

### Mode Libre — tracer à la souris

Tu dessines la courbe à main levée, et l'app joue aussitôt ce que tu
traces. Un marqueur en pointillés signale le niveau de référence
audio, à **±1** : au-delà, le navigateur ramènera le volume dans les
clous à la lecture. Rien ne t'empêche de dessiner plus haut — tu n'es
jamais bloqué, l'affichage s'adapte simplement à l'amplitude de ton
tracé.

### Mode Ancres — éditer par points de contrôle

Bascule le sélecteur sur **Ancres** (icône *Spline*) : la courbe passe
sous le contrôle d'une poignée de points que tu peux glisser. Un slider
**Nombre d'ancres** en règle la quantité, de 4 à 32. Un second toggle,
**Doux / Anguleux**, choisit l'interpolation entre les ancres : *Doux*
trace une courbe lisse (Catmull-Rom), *Anguleux* une polyligne droite.

Voici le cœur du modèle. Quand tu passes de Libre à Ancres, **les
ancres se posent automatiquement sur ton tracé** — elles l'épousent,
elles ne repartent pas de zéro. Et **les détails fins de ton dessin ne
sont pas perdus** : ils sont conservés dans le *résidu*. Déplacer une
ancre déforme la courbe autour d'elle, mais le résidu reste en place et
continue de moduler la forme. Ton dessin garde sa personnalité même
après que tu l'édites par ancres. Vois *Ancre* et *Résidu* au
[glossaire technique](doc:glossaire-technique).

## La lentille Harmoniques {#lentille-harmoniques}

La zone du milieu affiche, en barres, l'intensité de chaque
*harmonique* de la forme courante. Tu peux les modifier au
clic-glisser : la courbe se reconstitue en conséquence. Un **clic
droit** sur une barre la remet à zéro instantanément.

Les barres ont un **code couleur** :

- **Bleu** — tu peux éditer directement. La forme est *normalisée*.
- **Gris** — la forme n'est pas encore normalisée. Éditer une barre
  imposerait une *phase* canonique à toutes les autres et ferait sauter
  la courbe d'un coup. Pour éviter cette surprise, le Designer ouvre un
  dialog (« Normaliser et continuer » / « Annuler ») et te laisse
  décider.

Le bouton **Σ**, dans l'en-tête de la zone Forme d'onde, déclenche la
*normalisation* à tout moment — pratique pour préparer ton tracé avant
d'attaquer les barres. Il est grisé quand la forme est déjà normalisée.

Attention au mot : normaliser ici touche la *phase*, **pas le volume**.
Le timbre reste le même à l'oreille (la phase isolée est inaudible) ;
c'est seulement le tracé qui peut changer d'allure. Vois *Normalisation*,
*Phase* et *Harmonique* au
[glossaire technique](doc:glossaire-technique).

## La lentille Spectrogramme {#lentille-spectrogramme}

La zone de droite est une lentille en **lecture seule** : elle observe,
elle ne s'édite pas. Elle déploie le *spectre* du son sur un axe de
fréquences en Hz absolus — sa position dépend donc de la note testée au
clavier.

Deux modes, basculés par un toggle :

- **Statique** (défaut) — le spectre d'un cycle de la forme dessinée,
  calculé même sans jouer.
- **Direct** — l'analyse en temps réel du son pendant que tu joues, qui
  intègre l'enveloppe et la note tenue.

Vois *Spectre et spectrogramme* et *DFT* au
[glossaire technique](doc:glossaire-technique).

## Lire les courbes empilées

La zone Forme d'onde peut superposer **jusqu'à trois courbes**. Une
légende, dans son en-tête, dit lesquelles sont affichées :

- **Actuelle** (bleu) — la courbe d'aujourd'hui, ce que tu entends.
- **Normalisée** (gris) — visible quand la forme n'est pas normalisée :
  un aperçu silencieux de ce qu'elle deviendrait si tu cliquais Σ.
- **Spline des ancres** (orange) — visible quand le *résidu* n'est pas
  négligeable : la spline pure des ancres, sans le résidu. Le squelette
  géométrique du mode Ancres ; le résidu, lui, en est la chair.

Une courbe qui se confond avec l'actuelle est masquée — la légende ne
montre que ce qui apporte une information. Vois *Ancre*, *Résidu* et
*Normalisation* au [glossaire technique](doc:glossaire-technique).

## Le plafond d'harmoniques

Un slider dans l'en-tête de la zone Harmoniques fixe le **plafond
d'harmoniques** (le *cap*), de 1 à 256. C'est la limite de richesse
spectrale du patch : un plafond bas donne un son plus doux et lisse, un
plafond haut un son plus riche et brillant. C'est aussi, exactement, le
nombre de barres affichées au milieu. Vois
*Cap (plafond d'harmoniques)* au
[glossaire technique](doc:glossaire-technique).

## L'enveloppe AHDSR {#enveloppe-ahdsr}

<DocLink target="designer:designer-adsr">L'enveloppe</DocLink> règle le
volume du son au fil du temps, en cinq phases : attaque, maintien
(*hold*), déclin, tenue (*sustain*) et extinction (*release*). C'est
elle qui distingue une cloche d'un coup d'archet. Le détail de chaque
phase est au [glossaire technique](doc:glossaire-technique).

## L'amplitude {#amplitude}

Le <DocLink target="designer:designer-amplitude">réglage
d'amplitude</DocLink> fixe le niveau général du patch — son volume avant
que l'enveloppe ne le module. Utile pour équilibrer plusieurs sons entre
eux.

## Choisir le système musical {#choisir-systeme-musical}

<DocLink target="designer:designer-system-selector">Le sélecteur de
système</DocLink> décide comment l'octave est découpée : la gamme à
douze notes habituelle, ou l'un des tempéraments et systèmes du monde.
C'est la porte d'entrée vers tout l'univers décrit dans
[Qu'est-ce qu'un tempérament ?](doc:comprendre-temperament).

> **Notation des notes.** Le clavier et les étiquettes de l'app
> affichent les notes en notation anglo-saxonne (C, D, E, F, G, A, B) ;
> cette documentation, elle, parle en solfège. La correspondance :
> do = C, ré = D, mi = E, fa = F, sol = G, la = A, si = B.

## Tester au clavier {#tester-au-clavier}

<DocLink target="designer:designer-keyboard">Le clavier de test</DocLink>
joue les notes du système courant, à la souris ou aux touches de ton
clavier physique. <DocLink target="designer:designer-octave-selector">Change
d'octave</DocLink> avec PageUp / PageDown, et maintiens Espace pour
activer <DocLink target="designer:designer-sustain-pastille">la pédale de
sustain</DocLink> : les notes tenues ne s'éteignent qu'au relâchement.

## La barre du haut {#barre-du-haut}

Au-dessus des trois zones, un bandeau réunit les outils qui agissent sur
l'ensemble du patch :

- **Bibliothèque de presets** (icône dossier) : ouvre la collection de
  timbres de départ — sinusoïde, carrée, dent de scie, triangle et les
  recettes prêtes à l'emploi.
- <DocLink target="designer:designer-reset-button">**Reset**</DocLink>
  (icône gomme) : remet la forme à zéro et les ancres à plat, **sans
  toucher** au reste de l'éditeur (enveloppe, amplitude, plafond
  d'harmoniques, système, octave). Pour repartir d'un timbre vierge en
  gardant tes réglages.
- **Σ Normaliser** : voir la lentille Harmoniques, plus haut.
- **Proportions des colonnes** (à droite, sur grand écran) : quatre
  dispositions au choix — trois colonnes égales, Forme d'onde large,
  Harmoniques large, Spectrogramme large — plus un toggle **Dimension
  auto** qui élargit la zone que tu es en train d'éditer.

## Enregistrer {#enregistrer}

Quand le son te plaît, sauvegarde-le : Ctrl+S met à jour le patch
courant, tandis que <DocLink target="designer:designer-save-as-button">Sauvegarder
comme nouveau</DocLink> (Ctrl+Alt+S) en crée une copie.
<DocLink target="designer:designer-new-button">Repartir de zéro</DocLink>
(Ctrl+Alt+N) vide l'éditeur. Ton patch rejoint alors la
[Bibliothèque](doc:guide-bibliotheque), prêt pour le
[Composer](doc:guide-composer).
