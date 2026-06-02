# Limites connues

Une app honnête dit aussi ce qu'elle ne fait pas. Voici les limites
assumées du périmètre actuel — rien de bloquant, mais autant les
connaître. Certaines pourront tomber dans de futures versions.

## Synthèse et qualité audio

La forme d'onde que tu dessines est échantillonnée sur 600 points,
puis synthétisée à partir de ses 256 premiers
[harmoniques](doc:glossaire-technique). C'est largement assez pour
des timbres riches, mais cela pose deux limites :

- les détails plus fins que cette résolution sont lissés ;
- dans l'extrême aigu, la synthèse peut produire quelques partiels
  parasites (un effet de repliement, ou *aliasing*), surtout sur des
  formes très anguleuses. Ce n'est audible que dans des cas
  particuliers.

Le modèle d'édition du Designer — une seule courbe vue sous trois
angles — a aussi ses particularités, toutes mathématiques :

**Le tracé qui « saute » à l'édition d'une barre.** Quand tu modifies
une barre d'harmonique sur une forme qui n'a pas encore été
normalisée, le tracé de gauche peut changer d'allure d'un coup, alors
que le timbre, lui, bouge à peine. C'est une conséquence directe de ce
que veut dire « modifier une harmonique seule » : ce geste ne touche
que l'intensité d'une harmonique, et pour redessiner la forme l'app
doit choisir une *phase* pour toutes les autres — elle adopte une
phase de référence, et la silhouette d'origine est perdue. Le Designer
t'en avertit avec un dialog (« Normaliser et continuer » / « Annuler »)
avant chaque édition de barre sur une forme non normalisée : si tu
normalises d'abord, tu sais à quoi t'attendre. Voir *Phase* et
*Normalisation* au [glossaire technique](doc:glossaire-technique).

**La normalisation n'est pas parfaitement réversible.** Clique
*Normaliser* deux fois de suite, et le tracé peut bouger d'un cheveu au
second clic ; les barres aussi peuvent se redessiner très légèrement,
surtout sur des sons riches en harmoniques aiguës. L'analyse spectrale
(la *DFT*) travaille sur un nombre fini de points : dans l'aigu, une
petite part de l'information « fuit » sur les fréquences voisines.
C'est le propre de toute analyse numérique — on regarde le son à
travers une fenêtre, et toute fenêtre a une bordure. L'aller-retour
reste excellent sur les harmoniques basses et moyennes, celles qui
portent les timbres utiles, et seulement approximatif tout en haut du
spectre.

**De petits rebonds en mode Ancres.** Sur une forme à chute verticale
(un signal carré, une impulsion brève), déplacer une *ancre* près de
la transition peut faire dépasser la courbe un peu au-dessus ou en
dessous du tracé attendu. La courbe lisse qui relie tes ancres n'est
pas tenue de rester pile entre elles : sur une marche raide, elle
rebondit légèrement — une propriété des splines lisses les plus
courantes. Deux parades : ajoute des ancres pour resserrer la grille
autour de la transition, ou bascule l'interpolation sur **Anguleux**,
qui relie les points en lignes droites, sans rebond. Voir *Ancre* au
[glossaire technique](doc:glossaire-technique).

## Performance

Tout tourne dans ton navigateur, sans serveur : la fluidité dépend
donc de ta machine. Le Composer reste fluide même en multipiste ; le
clavier live du Designer, lui, peut produire de discrets micro-clics
à l'attaque sur une machine modeste. Rien de grave, mais c'est plus
honnête de le signaler.

Sur une machine peu puissante, tu peux aussi percevoir un léger retard
entre la frappe et le son — d'autant plus marqué que le Designer
affiche beaucoup de courbes en arrière-plan (formes complexes, résidu
visible). Le Designer redessine tout en temps réel et recalcule
l'analyse spectrale à chaque modification ; quand la machine peine, le
démarrage du son se décale d'un cran. La latence reste modérée et le
son sort proprement : c'est une réalité du temps réel dans le
navigateur, pas un blocage.

## Périmètre audio

- **Son mono** : pas de stéréo ni de panoramique pour l'instant —
  tout est centré.
- **Synthèse uniquement** : l'app fabrique ses sons par le dessin.
  Elle ne lit pas de fichiers audio externes et n'a pas d'entrée
  MIDI.
- **Pistes** : jusqu'à seize pistes par composition.
- **Accords au clavier physique** : jouer trois touches en même temps
  dans certaines combinaisons (par exemple S+E+D) peut en bloquer une,
  comme si elle n'avait pas été pressée. Ce n'est pas l'app : beaucoup
  de claviers économiques scrutent leurs touches en grille et refusent
  certaines géométries de trois appuis simultanés — un effet matériel
  appelé *ghosting*. Un clavier mécanique « N-key rollover » lève la
  limite, et un futur branchement MIDI USB l'éviterait aussi. Les
  combinaisons avec la pédale (Espace tenu) ne sont pas concernées.

## Stockage

Tes patches et compositions vivent dans le stockage local de ton
navigateur, sur cette machine seulement. Il n'y a ni compte ni
cloud : effacer les données du site, ou changer de navigateur, te
fait perdre ton travail. Pense à exporter ce qui compte — tes
patches au format `.osa`, tes compositions en WAV.
