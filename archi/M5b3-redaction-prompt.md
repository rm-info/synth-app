# Prompt M.5b.3 rédaction — Extension de `comprendre-forme-onde.md` (les lentilles, la phase, le résidu)

## Contexte

Le rattrapage de l'Iteration M est clos. Le Designer a basculé du modèle
siloté à un modèle unifié à trois lentilles. Côté doc :
- **M.5b.2** a enrichi le glossaire technique (7 nouvelles entrées :
  Ancre, Cap, iDFT, Normalisation, Phase, Résidu, Son).
- **M.5b.1** a refondu le guide-designer.md (manuel pratique du
  Designer rattrapé).

L'article **`comprendre-forme-onde.md`** est un article de fond — il
explique le **pourquoi** de la synthèse additive et de la relation
forme ↔ timbre. Il est court (62 lignes, 5 sections), bien écrit, et
introduit déjà : période, timbre, harmoniques, Fourier, spectre.

Il s'arrête sur le constat « la forme que tu vois *est* le son que tu
entends ». Le rattrapage a apporté trois idées que cet article devrait
porter :
1. Les **trois lentilles** comme fait mathématique (pas comme choix
   UI) : une forme d'onde est *simultanément* un tracé temporel, une
   recette spectrale, et un spectre statique.
2. La **phase** comme dimension invisible à l'oreille mais visible à
   l'œil — d'où l'existence du concept de normalisation.
3. Le **résidu** comme mécanique de préservation des détails à
   l'édition par ancres — la « magie » qui fait que dessiner et
   éditer par points de contrôle peuvent coexister.

M.5b.3 = étendre l'article pour intégrer ces trois idées, sans alourdir
le fil narratif existant.

## Pré-lecture obligatoire

1. **`writer/CLAUDE.md`** — ton rôle, voix tutoiement, scheme `doc:`,
   DocLink, syntaxe Markdown et math.
2. **`src/docs/articles/comprendre-forme-onde.md`** — état actuel
   (62 lignes). C'est ton point de départ ; à conserver autant que
   possible.
3. **`src/docs/articles/glossaire-technique.md`** — après M.5b.2.
   Cible des renvois croisés pour chaque concept manipulé.
4. **`src/docs/articles/guide-designer.md`** — après M.5b.1. C'est le
   guide pratique ; ton article complète en expliquant le pourquoi,
   ne reformule pas le quoi.
5. **`CONTEXT.md`** — sections *Décisions architecturales* (modèle
   unifié, lentilles vivantes, résidu, normalisation explicite).
   Vérité technique pour ne pas dire de bêtises.

## Objectif

Étendre `src/docs/articles/comprendre-forme-onde.md` avec **3
nouvelles sections** et **réécrire légèrement la conclusion** pour
intégrer les nouveaux concepts.

**Pas de refonte des 4 premières sections** — elles fonctionnent bien
et restent la fondation. L'extension s'ajoute après « Le voir, pas
seulement l'entendre » (section 5 actuelle) et avant la conclusion.

Pas de modification de `src/docs/index.js` (l'article existe déjà
dedans, id `comprendre-forme-onde`).

## Structure proposée

L'article existant a 5 sections H2 ; on ajoute 3, et on retouche la
6ᵉ (conclusion). Voici la cible :

1. (existant) Un son, c'est une vibration qui se répète
2. (existant) La forme décide du timbre
3. (existant) Toute courbe est une somme de sinusoïdes
4. (existant) Le voir, pas seulement l'entendre
5. **(nouveau)** Trois angles sur la même courbe
6. **(nouveau)** L'ombre invisible : la phase
7. **(nouveau)** Le calque du dessin : le résidu
8. (réécrit) À toi de dessiner (conclusion étendue)

### Section 5 (nouvelle) — Trois angles sur la même courbe

**Concept** : les 3 zones du Designer ne sont pas un choix d'UI mais
un fait mathématique. Une même courbe a *simultanément* trois
représentations équivalentes :

- Un **tracé temporel** : ce que tu dessines à la souris (forme
  d'onde).
- Une **liste d'harmoniques** : la recette (Fourier).
- Un **spectre figé** : l'image statique du spectrogramme.

La math dit que ces trois vues portent **exactement la même
information** — passer de l'une à l'autre est réversible (la DFT et
son inverse, l'iDFT). L'app les affiche côte à côte parce qu'elles se
complètent visuellement : la temporelle est intuitive au geste, la
spectrale au timbre. Tu ne passes pas d'un *mode* à l'autre, tu
regardes la même chose **sous trois angles**.

Renvoyer vers *DFT*, *iDFT*, *Spectre et spectrogramme* du glossaire.

### Section 6 (nouvelle) — L'ombre invisible : la phase

**Concept** : Deux sons peuvent avoir exactement les mêmes
harmoniques (mêmes fréquences, mêmes amplitudes) et pourtant des
formes très différentes — parce que leurs **phases** diffèrent. La
phase est un décalage temporel de chaque harmonique. Elle est
**invisible à l'oreille** (on ne distingue pas deux sinusoïdes de
même fréquence/amplitude mais de phases différentes) MAIS très
visible à l'œil (la forme change).

C'est pour ça que dans le Designer, *normaliser* change le tracé
sans changer le son : on jette la phase d'origine et on réimpose une
phase de référence (sinus pur pour toutes les harmoniques). Le
timbre est identique, la silhouette est différente.

**Pourquoi c'est utile** : sans normaliser, modifier la barre d'une
harmonique reviendrait à jeter en silence la phase d'origine (puisque
on n'a que les amplitudes des barres pour reconstruire). Le Designer
te le dit explicitement (« le tracé doit être normalisé d'abord ») —
maintenant tu sais pourquoi.

Renvoyer vers *Phase*, *Normalisation* du glossaire.

**Métaphore possible** (à utiliser si elle aide) : c'est comme
photographier une horloge sous deux angles différents. Les aiguilles
indiquent toujours la même heure (= les mêmes harmoniques), mais
l'image peut sembler « tordue » selon la perspective (= la phase).
Si tu veux comparer deux horloges, tu les rephotographies sous le
même angle (= tu normalises). Tu n'as rien perdu d'essentiel — juste
choisi une convention de regard.

### Section 7 (nouvelle) — Le calque du dessin : le résidu

**Concept** : Quand tu dessines une forme à main levée, elle contient
plein de détails fins (les petits accidents de ton geste). Si tu
bascules en édition par ancres, deux choses pourraient arriver :
- (a) Les ancres essaient de coller à ton tracé exact → tu ne peux
  pas vraiment bouger une ancre sans tout casser (pas la vraie
  édition par ancres).
- (b) Les ancres dessinent une courbe lisse approximative → tu perds
  tous les détails de ton tracé (mauvais).

Le Designer choisit une troisième voie. Il sépare ta forme en deux
couches :
- La **spline** : la courbe lisse qui passe par tes ancres.
- Le **résidu** : tout ce que ton tracé original avait en plus de
  cette spline.

C'est exactement comme deux calques en dessin : la spline est le
calque du dessous, le résidu est le calque du dessus. Bouger une ancre
ne touche **que le calque du dessous** — la spline change, le résidu
reste posé par-dessus, et la somme des deux te redonne une forme qui
a bougé mais dont les détails ont survécu.

C'est ce qui fait que tu peux dessiner librement puis affiner par
ancres, sans perdre la personnalité de ton geste.

Renvoyer vers *Ancre*, *Résidu* du glossaire, et au
[guide Designer](doc:guide-designer) pour le mode d'emploi pratique
(section « Mode Ancres »).

### Section 8 (existante, à réécrire) — À toi de dessiner

La conclusion actuelle se concentre sur la boucle forme ↔ son.
Étendre pour intégrer les nouvelles boucles :

- Forme ↔ son (déjà là)
- Forme ↔ harmoniques (visible en simultané)
- Forme ↔ résidu (édition par ancres)
- Forme ↔ phase (normalisation comme choix de représentation)

L'idée à porter : ce n'est pas une seule boucle de feedback, c'est un
**réseau** de feedbacks. Tu vois, tu entends, tu modifies — et tu
peux entrer dans la boucle par n'importe quelle prise.

**Garder court** — la conclusion ne doit pas dépasser ~10 lignes.
C'est une fermeture, pas une nouvelle exposition.

## Concepts subtils — garde-fous wording

Trois pièges classiques à éviter, comme dans les autres chantiers :

1. **« Modes » au lieu de « lentilles » / « angles »**. Le mot mode
   suggère un choix exclusif. Les 3 vues sont *simultanées*.
   « Angles », « lentilles », « représentations », « facettes » sont
   tous des bons mots.

2. **« La phase, c'est compliqué »**. Le piège du jargon. La phase
   est *un décalage temporel*, c'est tout. Si tu la présentes comme
   un mystère mathématique, le lecteur décroche. La métaphore de
   l'horloge (ou autre que tu trouverais mieux) doit la rendre
   évidente.

3. **« Le résidu, c'est du bruit »**. Le mot « résidu » connote
   parasite. Insiste : c'est **la signature de ton geste**, ce qui
   distingue ton dessin de la spline générique. C'est de la valeur,
   pas du déchet.

## Renvois croisés à câbler

**Vers le glossaire technique** (les 7 entrées M.5b.2 sont tes amies) :

| Concept | Entrée glossaire | Section où le mentionner |
|---|---|---|
| DFT, iDFT | existante + nouvelle | Section 5 |
| Phase, Normalisation | nouvelles | Section 6 |
| Ancre, Résidu | nouvelles | Section 7 |
| Spectre et spectrogramme | existante | Section 5 |
| Forme d'onde, Période, Harmonique, Timbre | existantes | Sections existantes (déjà renvoyées) |

**Vers `guide-designer.md`** : section 7 (résidu) pour pointer le mode
d'emploi pratique (« Mode Ancres » dans le guide).

**Pas de renvoi vers `limites-connues.md`** depuis cet article — c'est
un article de fond, pas un récap des limitations.

## DocLink — ancres `data-anchor` disponibles

L'article actuel utilise déjà :
- `designer:designer-spectrogram`
- `designer:designer-waveform`

Tu peux ajouter, si pertinent :
- `designer:designer-harmonics` (si tu veux pointer la zone Harmoniques
  pour l'idée de "vue spectrale")

Ne pas créer de nouvel DocLink vers des ancres inexistantes. Les
contrôles M.r.* (toggle Spline, slider cap, bouton Σ, etc.) n'ont pas
encore d'ancres `data-anchor` — mention textuelle seulement.

## Hors scope M.5b.3

- **Refonte du guide-designer** : M.5b.1 (déjà fait).
- **Glossaire** : M.5b.2 (déjà fait).
- **Mise à jour limites-connues** : M.5b.4.
- **Création d'un nouvel article** : volontairement écarté. Si une
  section devient trop longue (par exemple « L'ombre invisible : la
  phase » qui pourrait facilement mériter son propre article), **ne
  scinde pas** sans validation archi. Coupe ou condense pour rester
  dans l'article existant.
- **Détails techniques sur Catmull-Rom, l'iDFT à phase canonique,
  etc.** : restent dans le glossaire. Cet article reste sur le
  pourquoi, pas le comment précis.

## Format et style — rappels

- Tutoiement systématique, voix narrative — c'est le ton du fond.
- Métaphores autorisées et encouragées si elles éclairent. Garde-en
  une ou deux fortes plutôt que beaucoup de faibles.
- Math LaTeX inline parcimonieuse — l'article est narratif, pas
  technique.
- Longueur cible totale de l'article étendu : **~130-180 lignes**
  (vs 62 actuellement). Si tu débordes, c'est probablement que tu
  expliques deux fois.

## Compte-rendu attendu

À la livraison, signale :
- Liste exhaustive des sections ajoutées/réécrites.
- Tout choix éditorial significatif (métaphore retenue, ordre des
  concepts, niveau de profondeur sur la phase).
- Tout passage que tu trouves bancal et qui mériterait une discussion
  archi.

## Workflow

- Commit unique : `docs(M.5b.3): extension comprendre-forme-onde
  (3 lentilles + phase + résidu)`.
- Pas de modification de fichier autre que
  `src/docs/articles/comprendre-forme-onde.md`.
- Si tu identifies un manque qui sortirait du périmètre (par
  exemple : « il faudrait un article séparé sur les ancres »),
  remonte plutôt que de l'ajouter.
