# Guide : le Designer

Le Designer est l'atelier où tu fabriques un *patch* — un timbre et son
enveloppe. Tu y façonnes une *forme d'onde*, tu sculptes son évolution dans
le temps, tu ajoutes des effets, tu choisis l'accordage, puis tu testes au
clavier avant d'enregistrer.

Ce guide est une **porte d'entrée** : il donne la carte des lieux et l'idée
maîtresse. Chaque module a ensuite son article détaillé dans la section
*La Création en détail* — suis les liens au fil du texte pour aller au fond
d'un sujet. Pour un survol interactif, lance aussi le Tour.

## Trois lentilles sur une seule courbe

Au cœur du Designer, trois zones côte à côte :
<DocLink target="designer:designer-waveform">Forme d'onde</DocLink> à
gauche, <DocLink target="designer:designer-harmonics">Harmoniques</DocLink>
au milieu, <DocLink target="designer:designer-spectrogram">Spectrogramme</DocLink>
à droite.

Ce ne sont pas trois objets séparés. Ce sont **trois manières de regarder la
même courbe** — celle, exactement, qui produit le son. Tire une barre dans
Harmoniques et la forme se redessine à gauche ; modifie le tracé à gauche et
les barres bougent. On parle de *lentilles* : elles regardent toutes le même
*son*, chacune sous un angle, et le passage de l'une à l'autre ne perd
aucune information.

- Le module **[Forme d'onde](doc:creation-forme-onde)** — tu dessines un
  cycle à la main ou par points de contrôle (le mode Ancres et son astuce de
  *résidu* y sont expliqués).
- Le module **[Harmoniques](doc:creation-harmoniques)** — tu dessines le
  même son par sa recette de sinusoïdes, barre par barre, et tu en fixes le
  plafond de richesse.
- Le module **[Spectrogramme](doc:creation-spectrogramme)** — une vue en
  lecture seule du contenu fréquentiel, figé ou en temps réel.

Pour le « pourquoi » derrière ces trois vues — pourquoi une forme fait un
timbre, pourquoi tout son se décompose en harmoniques, ce qu'est la phase —
le détour vaut le coup :
[Ce que tu entends quand tu dessines une forme d'onde](doc:comprendre-forme-onde).

## Le son dans le temps : l'enveloppe

Une fois le timbre dessiné, l'<DocLink target="designer:designer-adsr">enveloppe</DocLink>
règle comment son volume vit dans le temps — l'attaque, le maintien, le
déclin, le soutien, l'extinction. C'est elle qui distingue une cloche d'un
coup d'archet, à timbre égal. Les cinq phases (et le piège classique entre
*Maintien* et *Soutien*) sont détaillées dans le
[module Enveloppe](doc:creation-enveloppe).

## Donner du mouvement : les effets

Neuf effets, par patch, ajoutent vibrato, trémolo, panoramique, filtre, wah,
distorsion et enveloppes de modulation. Ils transforment le son de la note
en cours, sans mémoire (ni delay ni réverb). Le
[module Effets](doc:creation-effets) passe chacun en revue, et détaille leurs
réglages famille par famille.

## Choisir l'accordage et tester {#choisir-systeme-musical}

<DocLink target="designer:designer-system-selector">Le sélecteur de
système</DocLink> décide comment l'octave est découpée : la gamme à douze
notes habituelle, ou l'un des tempéraments et systèmes du monde. C'est la
porte d'entrée vers tout l'univers décrit dans
[Qu'est-ce qu'un tempérament ?](doc:comprendre-temperament). Le clavier de
test, les octaves, les repères de gamme et le mode Libre sont décrits dans le
[module Instrument](doc:creation-instrument) — rappelle-toi que ces réglages
ne servent qu'à l'écoute et ne sont pas copiés dans le patch enregistré.

> **Notation des notes.** Le clavier et les étiquettes de l'app affichent les
> notes en notation anglo-saxonne (C, D, E, F, G, A, B) ; cette
> documentation, elle, parle en solfège. La correspondance : do = C, ré = D,
> mi = E, fa = F, sol = G, la = A, si = B.

## La barre d'outils

Au-dessus des modules, un bandeau réunit ce qui agit sur l'ensemble du
patch : son nom, les timbres de départ, la réinitialisation, l'écoute, la
disposition des colonnes et l'historique annuler/rétablir. Le détail de
chaque commande est dans
[L'atelier : barre d'outils, actions, écoute](doc:creation-atelier).

## Enregistrer {#enregistrer}

Quand le son te plaît, sauvegarde-le : Ctrl+S met à jour le patch courant,
tandis que <DocLink target="designer:designer-save-as-button">Sauvegarder
comme nouveau</DocLink> (Ctrl+Alt+S) en crée une copie.
<DocLink target="designer:designer-new-button">Repartir de zéro</DocLink>
(Ctrl+Alt+N) vide l'éditeur. Ton patch rejoint alors la
[Bibliothèque](doc:guide-bibliotheque), prêt pour le
[Composer](doc:guide-composer).
