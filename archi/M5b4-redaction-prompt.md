# Prompt M.5b.4 rédaction — Mise à jour de `limites-connues.md` (limites du Designer rattrapé)

## Contexte

Dernier chantier rédactionnel du rattrapage Iteration M. Les trois
chantiers précédents ont mis à jour la doc du Designer pour refléter
le modèle rattrapé :
- **M.5b.2** — glossaire technique enrichi (Ancre, Cap, iDFT,
  Normalisation, Phase, Résidu, Son).
- **M.5b.1** — guide-designer refondu (lentilles, ancres, dialog,
  marqueur ±1, barre du haut).
- **M.5b.3** — comprendre-forme-onde étendu (trois angles, phase,
  résidu).

Il reste **les limites assumées** : ce que la doc dit honnêtement
quand quelque chose ne marche pas exactement comme on pourrait le
souhaiter. L'article `limites-connues.md` actuel (43 lignes, 4
sections) date d'avant le rattrapage et ne mentionne aucune
particularité du modèle rattrapé.

M.5b.4 = enrichir cet article avec 4 limites/particularités remontées
en passe d'usage et au backlog archi, **sans surcharger ni
alarmer** — l'article doit rester court, factuel, rassurant.

## Pré-lecture obligatoire

1. **`writer/CLAUDE.md`** — ton, scheme `doc:`, DocLink.
2. **`src/docs/articles/limites-connues.md`** — état actuel. Garder
   le ton « honnête mais rassurant » : « rien de bloquant », « autant
   les connaître ». C'est exactement le registre à conserver.
3. **`src/docs/articles/glossaire-technique.md`** — cibles des
   renvois croisés (Ancre, Normalisation, Phase, Résidu sont à
   référencer).
4. **`archi/BACKLOG.md`** — section *Items backlog issus de la
   session* — c'est ta source de vérité technique pour les 5 items
   à intégrer. Chaque entrée du backlog donne déjà la cause technique
   et les workarounds éventuels.

## Objectif

Mettre à jour `src/docs/articles/limites-connues.md` en enrichissant
**les 4 sections existantes** (pas de nouvelle section H2) avec les
particularités du Designer rattrapé.

Pas de modification de `src/docs/index.js` (l'article existe déjà
dedans, id `limites-connues`).

## Limites à intégrer

Cinq items, à répartir dans les sections existantes selon affinité
thématique. Pour chaque item : le phénomène observable côté
utilisateur, sa cause synthétique (sans jargon), et le workaround
éventuel.

### 1. Régression de phase à l'édition d'une barre

**Sectionnement suggéré** : *Synthèse et qualité audio*.

**Phénomène observable** : quand tu modifies une barre d'harmonique
sur une forme non normalisée, le tracé peut « sauter » visuellement.
Le timbre audible bouge peu, mais la forme dessinée à gauche change
d'allure.

**Cause synthétique** : éditer une barre ne manipule que l'intensité
d'une harmonique ; pour reconstruire la forme, l'app doit décider
d'une phase pour chacune des autres — elle choisit alors une phase
de référence, et la forme d'origine est perdue.

**Workaround / atténuation** : le Designer t'avertit avec un dialog
(« Normaliser et continuer / Annuler ») avant chaque édition de
barre sur une forme non normalisée. Si tu cliques Normaliser
d'abord, tu sais à quoi t'attendre. Voir *Phase* et *Normalisation*
au glossaire.

**Ton** : ce n'est pas un bug, c'est une conséquence mathématique de
ce que signifie « modifier une harmonique seule ». L'article doit
le présenter comme tel.

### 2. Précision finie de l'analyse spectrale

**Sectionnement suggéré** : *Synthèse et qualité audio* (juste après
la régression de phase).

**Phénomène observable** : si tu cliques *Normaliser*, puis encore
*Normaliser*, le tracé peut bouger légèrement à chaque clic, surtout
sur des sons riches en harmoniques aiguës. Les barres de la zone
Harmoniques peuvent aussi se redessiner d'un poil après chaque
normalisation, plutôt que de rester strictement identiques.

**Cause synthétique** : l'analyse spectrale (la *DFT*) travaille sur
un nombre fini de points. Pour les hautes fréquences, une petite part
de l'information « fuit » sur les bins voisins. Le rond-trip
« lecture des barres → reconstruction de la forme » n'est donc pas
parfaitement réversible — il l'est très bien sur les basses
harmoniques, moins sur les très aiguës.

**Workaround** : aucun pour le moment. Les patches utiles en pratique
(basses et moyennes harmoniques dominantes) ne sont pas affectés de
façon perceptible.

**Ton** : limitation mathématique élégante, à présenter comme
« phénomène attendu » plutôt que défaut. Mention possible de la
métaphore « on regarde le son à travers un fenêtre, et toute fenêtre
a une bordure ».

### 3. Dépassements visuels sur transitions raides en mode Ancres

**Sectionnement suggéré** : *Synthèse et qualité audio* (suite
naturelle, ou en sous-bullet du même bloc).

**Phénomène observable** : sur une forme qui contient une chute
verticale (signal carré, pulse rapide), déplacer une ancre près de
cette transition peut faire dépasser la courbe légèrement au-dessus
ou en dessous du tracé attendu.

**Cause synthétique** : la courbe lisse qui relie tes ancres
(une *spline*) n'est pas garantie de rester dans les bornes des
points qu'elle relie. Sur une transition raide, elle peut faire un
petit rebond — c'est une propriété mathématique des splines lisses
les plus courantes.

**Workaround utilisateur** : (a) augmenter le nombre d'ancres pour
densifier la grille autour de la transition, ou (b) basculer le mode
d'interpolation sur **Anguleux** (polyligne stricte sans rebond).
Voir *Ancre* au glossaire.

### 4. Léger retard à l'appui d'une touche, sur machine modeste

**Sectionnement suggéré** : *Performance* — élargir la section
existante (qui mentionne déjà les micro-clics à l'attaque).

**Phénomène observable** : sur une machine peu puissante, tu peux
percevoir un léger retard entre la frappe et le son sortant lors du
test au clavier dans le Designer. C'est plus marqué quand le Designer
affiche beaucoup de courbes en arrière-plan (formes complexes,
résidu visible, etc.).

**Cause synthétique** : le Designer redessine les courbes en temps
réel à chaque image, et certains calculs (l'analyse spectrale,
notamment) tournent à chaque modification. Sur une machine qui rame,
ça décale le moment où l'audio démarre.

**Workaround** : aucun pour le moment (sujet d'optimisation côté
app). La latence reste modérée et le son sort proprement, ce n'est
pas un blocage.

**Ton** : présenter comme « une réalité du temps réel dans le
navigateur ». Pas alarmer.

### 5. Limite matérielle du clavier QWERTY (ghosting)

**Sectionnement suggéré** : *Périmètre audio* — élargir avec un
sous-point qui distingue limite app vs limite matérielle.

**Phénomène observable** : sur certains claviers, jouer trois touches
simultanées dans certaines combinaisons (par exemple S+E+D) bloque
l'une des trois — comme si la dernière n'avait pas été appuyée. Les
combinaisons avec Espace tenu (pédale) ne sont pas affectées.

**Cause synthétique** : ce n'est pas l'app, c'est ton clavier. Les
claviers économiques scannent les touches en grille, et certaines
géométries de trois touches simultanées créent une ambiguïté que le
firmware refuse de transmettre.

**Workaround** : un clavier mécanique « N-key rollover » ou
« 6KRO » lève la limite. Idem pour un futur clavier MIDI USB (sujet
qui peut être mentionné en clin d'œil).

**Ton** : c'est une **limite du matériel**, pas de l'app. À écrire
sans culpabilité.

## Structure cible (4 sections, ordre inchangé)

| Section actuelle | Enrichissements à y intégrer |
|---|---|
| Synthèse et qualité audio | Items 1, 2, 3 (régression de phase, précision finie, dépassements splines) |
| Performance | Item 4 (latence à l'appui sur machine modeste) |
| Périmètre audio | Item 5 (ghosting clavier — limite matérielle) |
| Stockage | (inchangé ou seulement retouches mineures) |

Tu peux choisir l'enchaînement et le découpage en sous-points (puces,
paragraphes) — mais **garde le ton aéré** et **n'introduit pas de
nouvelle section H2** sans validation.

## Renvois croisés à câbler

| Concept | Entrée glossaire | Item |
|---|---|---|
| Phase | nouvelle (M.5b.2) | Item 1 |
| Normalisation | nouvelle (M.5b.2) | Item 1 |
| DFT | existante | Item 2 |
| Ancre | nouvelle (M.5b.2) | Item 3 |
| Résidu | nouvelle (M.5b.2) | Item 3 (optionnel) |
| Harmonique | existante | Items 1, 2 |

**Pas de renvoi vers `guide-designer.md`** depuis cet article (cible
de doc différente : on parle des choses qui ne marchent pas, le guide
parle de ce qu'on peut faire).

**Renvoi possible vers `comprendre-forme-onde.md`** sur l'item 1 ou 2
si tu sens que l'utilisateur a besoin de comprendre la phase ou la
DFT pour saisir la limite — mais ne pas surcharger.

## Concepts subtils — garde-fous wording

- **Ne dis pas « bug »** ni « défaut ». Préfère « limite »,
  « particularité », « phénomène attendu », « conséquence
  mathématique de… ».
- **Ne dis pas « anomalie de phase »** — la régression de phase
  n'est pas une anomalie, c'est une conséquence directe de ce que
  signifie « modifier une harmonique seule ».
- **Ne dis pas que la précision finie est un « problème »** — c'est
  une caractéristique de toute analyse spectrale numérique. La
  formulation positive : « l'analyse n'est pas infiniment précise,
  mais elle est largement assez précise pour ce que tu fais ».
- **Distingue clairement** ce qui est limite app vs limite matériel
  (item 5). C'est important pour l'utilisateur qui pourrait sinon
  croire qu'on lui doit un fix.

## Hors scope M.5b.4

- **Refonte du guide-designer** : M.5b.1 (fait).
- **Glossaire** : M.5b.2 (fait).
- **Extension de comprendre-forme-onde** : M.5b.3 (fait).
- **Création d'un nouvel article** : volontairement écarté.
- **Mentions de fonctionnalités futures** (sauf clin d'œil MIDI sur
  l'item 5) : pas le rôle de cet article. C'est `about.md` qui en
  parle quand pertinent.

## Format et style — rappels

- Tutoiement systématique.
- Ton honnête et rassurant. L'article doit donner l'impression que
  l'app est solide *et* franche.
- Format : paragraphe court ou bullet selon ce qui se lit le mieux.
  Reprendre la convention de l'article existant.
- Math LaTeX inline parcimonieuse — l'article s'adresse au lecteur,
  pas au mathématicien.
- Longueur cible totale de l'article étendu : **~80-110 lignes** (vs
  43 actuellement). Si tu débordes, c'est probablement que tu
  expliques trop — le renvoi au glossaire/article est ton ami.

## Compte-rendu attendu

À la livraison, signale :
- Liste exhaustive des items intégrés et dans quelle section.
- Tout choix éditorial significatif (métaphores, regroupement de
  bullets, ordre).
- Tout passage où tu as senti que le ton risquait de basculer vers
  « alarmant » ou « négatif » et comment tu l'as ramené.

## Workflow

- Commit unique : `docs(M.5b.4): mise à jour limites-connues (5
  limites du Designer rattrapé)`.
- Pas de modification de fichier autre que
  `src/docs/articles/limites-connues.md`.
