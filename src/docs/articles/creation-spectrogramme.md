# Le module Spectrogramme

Le spectrogramme est la troisième vue de ton son — une **lentille en
lecture seule** : elle observe, elle ne s'édite pas. Là où le module
Harmoniques range les composantes par numéro (1f, 2f, 3f…), le
spectrogramme les place sur un axe de **fréquences réelles, en hertz**. Sa
position dépend donc de la note testée au clavier : la même forme jouée plus
aigu glisse vers la droite.

## Lire le spectrogramme {#lire-le-spectrogramme}

L'axe horizontal porte les fréquences (échelle logarithmique : les octaves
y occupent des largeurs égales), l'axe vertical l'amplitude. Chaque pic
marque l'énergie présente à une fréquence donnée. Un son pur ? quelques
pics nets. Un son riche et hérissé ? une forêt de raies qui monte vers les
aigus.

<Details title="Sous le capot">
L'échelle horizontale est logarithmique parce que l'oreille perçoit les
hauteurs en rapports, pas en écarts : doubler la fréquence monte toujours
d'une octave, que l'on parte de 100 ou de 1000 Hz. Une échelle log donne
donc à chaque octave la même largeur à l'écran.
</Details>

*→ <DocLink target="designer:designer-spectrogram">Voir dans l'app</DocLink>*

## Direct ou Statique {#direct-statique}

Deux sources d'analyse. **Statique** (par défaut) calcule le spectre d'un
cycle de la forme dessinée — il s'affiche même sans jouer une note.
**Direct** analyse le son *réellement produit*, en temps réel : il intègre
donc l'enveloppe, les effets et la note tenue, et bouge pendant que le son
évolue. Statique montre l'ingrédient ; Direct montre le plat servi.

*→ <DocLink target="designer:designer-spectro-mode">Voir dans l'app</DocLink>*

## Échelle dB {#echelle-db}

Bascule l'axe vertical entre une échelle **linéaire** et une échelle en
**décibels** (de −80 à 0 dB). L'échelle linéaire écrase les composantes
faibles tout en bas ; l'échelle en dB les fait remonter et ressortir — utile
pour voir les harmoniques discrètes qui colorent un timbre.

<Details title="Sous le capot">
Le décibel est une mesure *logarithmique* de l'amplitude : chaque tranche
de 20 dB correspond à un facteur 10 sur l'amplitude. C'est, là encore, plus
proche de la perception — l'oreille couvre une énorme plage de niveaux et y
réagit en rapports, pas en différences.
</Details>

*→ <DocLink target="designer:designer-spectro-db">Voir dans l'app</DocLink>*

## Peak hold {#peak-hold}

En mode Direct seulement. Le peak hold **maintient les crêtes** atteintes
par chaque fréquence sous forme de traits persistants, qui redescendent
ensuite lentement (décroissance en ~1 s). Pratique pour saisir l'instant
fugace d'une attaque ou repérer le pic d'un effet de modulation, là où
l'affichage instantané passerait trop vite.

*→ <DocLink target="designer:designer-spectro-peakhold">Voir dans l'app</DocLink>*
