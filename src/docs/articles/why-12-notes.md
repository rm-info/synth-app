# Pourquoi 12 notes ?

Sur un piano, on compte sept touches blanches et cinq touches
noires entre deux notes du même nom : douze hauteurs distinctes
qui se répètent ensuite à l'identique d'une octave à l'autre.
Pourquoi exactement **douze** ? Pourquoi pas sept, comme les
notes de la gamme ? Pourquoi pas vingt-quatre, pour disposer
de plus de nuances ? La réponse traverse 2500 ans d'histoire
de la musique et un peu de mathématiques — sans qu'aucune des
deux ne donne, à elle seule, le dernier mot.

## Empiler des quintes : l'idée pythagoricienne

Le raisonnement qui produit les douze notes a été formalisé,
pour la première fois à notre connaissance, par l'école
pythagoricienne (vers le VIe siècle av. J.-C.). Son point de
départ : deux cordes dont les longueurs sont dans le rapport
`3:2` sonnent particulièrement *consonantes* ensemble. Cet
intervalle s'appelle une **quinte pure**.

Si on part d'une note et qu'on monte d'une quinte pure, puis
d'une autre, puis d'une autre — on parcourt un chemin où chaque
pas multiplie la fréquence par `3/2`. Au bout de **douze** quintes
empilées (en redescendant régulièrement à l'octave pour rester
dans une plage audible), on retombe *presque* sur la note de
départ, sept octaves plus haut.

*Presque*. C'est le mot important.

> Le rapport `(3/2)^12` ne fait pas exactement `2^7`. Il subsiste
> un écart résiduel d'**environ 23 cents** — soit un peu moins
> d'un quart de demi-ton. On l'appelle le **comma pythagoricien**.

Ce comma est minuscule à l'œil, mais parfaitement audible à
l'oreille. Et il a hanté les facteurs d'instruments à hauteur
fixe pendant deux millénaires.

## Le problème pratique : où cacher le comma ?

Sur un violon ou avec la voix, le comma se gère en temps réel :
le musicien ajuste légèrement chaque note pour qu'elle sonne
juste dans son contexte. Sur un clavier, une harpe, un orgue, la
hauteur de chaque note est fixée mécaniquement. On ne peut pas
avoir à la fois douze quintes pures **et** des octaves justes.

Il faut donc choisir où placer le défaut. C'est l'origine de
tous les **tempéraments** historiques — *tempérer*, c'est
précisément choisir comment répartir ce résidu :

- répartir l'erreur sur quelques quintes seulement, en laissant
  les autres pures — c'est l'approche des tempéraments *inégaux*
  comme `Werckmeister III` (1691), souvent associé à Bach ;
- sacrifier une seule quinte (la fameuse **quinte du loup**)
  pour préserver d'autres intervalles parfaitement justes,
  comme les tierces majeures — c'est le choix du
  *mésotonique à 1/4 de comma*, courant à la Renaissance ;
- étaler l'erreur équitablement sur les douze quintes — c'est
  le **tempérament égal** moderne (12-TET, pour *twelve-tone
  equal temperament*), où chaque demi-ton vaut exactement
  `2^(1/12)`, au prix d'aucune quinte parfaitement pure.

Chacune de ces solutions a sa couleur, son époque, son
répertoire. L'app permet de les comparer directement, en
basculant de l'une à l'autre sans rejouer la moindre note.

## Pourquoi douze et pas sept ?

Les **sept notes diatoniques** — do, ré, mi, fa, sol, la, si —
forment la gamme dans laquelle on chante "joyeux anniversaire" :
un ensemble cohérent qui paraît "complet" à l'oreille
occidentale. Pourquoi alors ajouter cinq notes supplémentaires ?

Pour pouvoir **transposer**. Si une chanson est trop aiguë pour
une voix, on aimerait la rejouer "la même" mais plus bas. Avec
seulement sept notes, ce n'est possible qu'en réaccordant
l'instrument. Les cinq notes chromatiques — les touches noires
du clavier — comblent les écarts entre les diatoniques et
permettent de démarrer la même mélodie à n'importe quelle
hauteur. `7 + 5 = 12`.

## Pourquoi douze et pas vingt-quatre ?

Une fois admis qu'il faut plus de sept notes, pourquoi s'arrêter
à douze ? Pourquoi pas 17, 19, 24, 31 ?

C'est un compromis. Plus on subdivise, plus on dispose
d'intervalles fins — utiles pour reproduire les inflexions
vocales, les modes traditionnels, les couleurs micro-tonales.
Mais l'oreille peine à mémoriser des grilles trop denses, et
les instruments deviennent vite injouables : un clavier
classique à 24 touches par octave dépasse rapidement l'envergure
de la main humaine.

D'autres traditions ont fait des choix différents :

- la musique arabe enseignée depuis le Congrès du Caire de 1932
  s'écrit sur une grille de **24 hauteurs par octave** (des
  quarts de ton, avec des inflexions plus fines selon le maqâm) ;
- la musique classique indienne se réfère à un cadre théorique
  de **22 *shrutis*** par octave, aux intervalles inégaux par
  construction ;
- le **gamelan** javanais ignore complètement le découpage
  occidental : ses échelles *slendro* et *pelog* comptent
  respectivement 5 et 7 notes, accordées sur des rapports qui
  n'ont rien à voir avec les nôtres — et qui varient même d'un
  ensemble d'instruments à l'autre.

Aucun de ces systèmes n'est "plus juste" que les autres. Chacun
optimise un compromis différent entre richesse d'intervalles,
mémorisation, et faisabilité instrumentale.

## Un choix, pas une loi

Les douze notes du clavier ne sont **pas** une vérité
mathématique. C'est l'aboutissement d'un long compromis culturel
entre ce que la physique permet (le ratio `3:2` et son comma
récalcitrant), ce que l'oreille reconnaît, et ce que la main
peut jouer. D'autres choix existent — et continuent d'être
pratiqués, ailleurs ou ici.

L'app vous propose de les essayer.
<DocLink target="composer:composer-tuning-system-selector">Changer
de système musical</DocLink> et rejouer un même clip dans une
autre grille suffit à entendre, concrètement, ce que ce "choix
de douze" laisse de côté.

Pour aller plus loin :
[Cycle des quintes — Wikipédia](https://fr.wikipedia.org/wiki/Cycle_des_quintes).
