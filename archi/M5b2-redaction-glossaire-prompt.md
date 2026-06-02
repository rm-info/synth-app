# Prompt M.5b.2 rédaction — Enrichissement du glossaire technique (Designer rattrapé)

## Contexte

Le rattrapage de l'Iteration M (phases M.r.1 → M.r.5.bis) est clos.
Le Designer a basculé du modèle siloté (trois modes verrouillés) vers
un **modèle unifié** : une seule « courbe canonique » audio, trois
**lentilles** pour la lire et l'éditer (Forme d'onde tracée libre ou
par ancres, Harmoniques, Spectrogramme). Voir `CONTEXT.md` sections
*Modèle de données* et *Décisions architecturales* pour le détail.

On entre maintenant en **M.5b — passe documentation**, découpée en 4
chantiers par dépendance. **Ce prompt = chantier M.5b.2 : enrichir le
glossaire technique** avec les concepts apportés ou explicités par le
rattrapage. Les autres chantiers (guide-designer, comprendre-forme-onde,
limites-connues) référenceront ces entrées : on les écrit d'abord pour
qu'elles soient cibles disponibles.

## Pré-lecture obligatoire

1. **`writer/CLAUDE.md`** — ton rôle, voix = tutoiement (à jour),
   discipline factuelle, syntaxe math du renderer (`$…$` / `$$…$$`,
   `^{}`, `_{}`, `\frac`, `\sum`, délimiteurs extensibles `( )` /
   `[ ]`, symboles `\pi` `\alpha`…).
2. **`src/docs/articles/glossaire-technique.md`** — état actuel
   (13 entrées : A4, ADSR, Amplitude, DFT, Forme d'onde, Fréquence,
   Harmonique, Hauteur, Hertz, Octave, Période, Spectre, Timbre).
   C'est le ton et la structure à suivre **exactement**.
3. **`src/docs/articles/comprendre-forme-onde.md`** — article
   pédagogique de référence pour le ton, la profondeur, la cadence
   de vulgarisation.
4. **`CONTEXT.md`** — sections *Modèle de données* (le shape de
   `Patch`), *Décisions architecturales* (les lentilles vivantes, la
   normalisation explicite, le résidu, le cap unifié). C'est la
   source de vérité technique.
5. **`archi/BACKLOG.md`** — pour ne pas promettre dans le glossaire
   ce qui est en backlog (round-trip DFT non idempotent, overshoot
   Catmull-Rom). On peut mentionner une limite, mais sans la
   présenter comme un comportement attendu.

## Objectif

Ajouter **7 entrées** au fichier `src/docs/articles/glossaire-technique.md`
existant, **insérées en ordre alphabétique strict** (le glossaire est
alphabétique — la position actuelle de Hauteur avant Hertz vient de
« Ha- » < « He- », confirmation que c'est strict).

Pas de modification du fichier `src/docs/index.js` (le glossaire
existe déjà dedans). Pas de nouvel article.

## Entrées à ajouter

Pour chaque entrée : titre H2, position d'insertion, scope sémantique
(2-4 phrases comme les entrées existantes), renvois croisés attendus.

### 1. Ancre

**Position** : entre `## Amplitude` et `## DFT` (alphabétique).

**Scope sémantique** : point de contrôle d'une *courbe spline*. Le
Designer en pose 4 à 32 sur la *forme d'onde* en mode Ancres ; en
déplacer une déforme la courbe localement, tout en préservant les
détails fins du tracé original (le *résidu*). Plus on a d'ancres,
plus la spline approche fidèlement le tracé ; moins on en a, plus
chaque ancre a un effet large et plus le résidu absorbe la
personnalité du dessin original.

**Renvois croisés** : *Forme d'onde* (existante), *Résidu* (nouvelle
entrée). DocLink vers `designer:designer-waveform`.

### 2. Cap (plafond d'harmoniques)

**Position** : entre `## Ancre` (nouvelle) et `## DFT` (alphabétique).

**Scope sémantique** : limite supérieure du nombre d'*harmoniques*
considérées dans la synthèse d'un patch, réglable de 1 à 256. Au-delà
du cap, les harmoniques sont tronquées à zéro — un cap bas produit un
son plus « doux » et lisse, un cap haut un son plus riche. Le cap
détermine aussi le nombre de barres affichées dans la lentille
*Harmoniques*.

**Titre H2 littéral** : `## Cap (plafond d'harmoniques)`.

**Renvois croisés** : *Harmonique* (existante), *Spectre et
spectrogramme* (existante).

### 3. iDFT

**Position** : entre `## Hertz (Hz)` et `## Octave` (alphabétique
strict : "iDFT" commence par i).

**Scope sémantique** : *Inverse Discrete Fourier Transform*, ou
transformée de Fourier inverse. Opération réciproque de la *DFT* :
si la DFT décompose un son en sa liste d'harmoniques, l'iDFT
reconstruit une forme d'onde à partir d'une telle liste. Le Designer
s'en sert quand tu modifies une barre de la lentille *Harmoniques* ou
que tu cliques sur Normaliser — il reconstruit le tracé depuis les
magnitudes courantes en attribuant à chaque harmonique une *phase*
canonique (sinus pur).

**Renvois croisés** : *DFT* (existante), *Normalisation* (nouvelle),
*Phase* (nouvelle).

### 4. Normalisation

**Position** : entre `## iDFT` (nouvelle) et `## Octave`
(alphabétique : « N » entre « I » et « O »).

**Scope sémantique** : opération qui *redéfinit* la forme d'onde à
partir des seules magnitudes des harmoniques (lues sur le tracé
actuel), en réimposant une *phase* canonique sinus à chacune. La
forme passe donc par l'*iDFT* de ses propres magnitudes — le timbre
audible reste très proche (la phase isolée est inaudible) mais la
courbe peut sauter visuellement. Le Designer la propose comme étape
explicite avant l'édition d'une barre : sans elle, modifier une seule
barre écraserait silencieusement la phase de toutes les autres.

**Renvois croisés** : *iDFT* (nouvelle), *Phase* (nouvelle),
*Harmonique* (existante). DocLink vers le bouton de la barre du haut
si une ancre `data-anchor` existe (à vérifier dans `src/lib/tours/` ou
le code — sinon mention textuelle).

### 5. Phase

**Position** : entre `## Octave` et `## Période` (alphabétique
strict : "Phase" < "Période" car « h » < « é »).

**Scope sémantique** : décalage temporel d'une onde sinusoïdale par
rapport à un instant de référence. Deux sinusoïdes de même fréquence
mais de phases différentes ont la même hauteur perçue — la phase
isolée est *inaudible* à l'oreille humaine. Mais quand plusieurs
harmoniques se superposent dans une forme d'onde, leurs phases
relatives déterminent comment elles s'additionnent : à magnitudes
identiques, deux signaux peuvent avoir des formes visuelles très
différentes selon la phase choisie pour chaque harmonique. C'est
pour cette raison que normaliser une forme (lui imposer une phase
canonique sur toutes les harmoniques) change le tracé sans changer
le timbre.

**Renvois croisés** : *Harmonique* (existante), *Normalisation*
(nouvelle), *Forme d'onde* (existante).

### 6. Résidu

**Position** : entre `## Période` et `## Son` (alphabétique :
« R » < « S »).

**Scope sémantique** : différence entre la *forme d'onde* éditée et
ce que produirait la spline passant par les seules *ancres*
courantes. Quand tu dessines à main levée, le résidu contient tous
les détails fins de ton tracé. En basculant en mode Ancres, ces
détails sont préservés : déplacer une ancre fait bouger la spline,
mais le résidu reste en place et continue de moduler la forme
résultante. C'est ce qui permet d'éditer une forme dessinée librement
par ancres sans perdre sa personnalité.

**Renvois croisés** : *Ancre* (nouvelle), *Forme d'onde* (existante).

### 7. Son

**Position** : entre `## Résidu` (nouvelle) et `## Spectre et
spectrogramme` (alphabétique : « So- » < « Sp- »).

**Scope sémantique** : variation de pression dans l'air (ou un autre
milieu) qui se propage en onde jusqu'à ton oreille. Sa *fréquence* —
la vitesse à laquelle la pression oscille — détermine la *hauteur*
perçue, son *amplitude* le volume, sa *forme d'onde* le *timbre*. La
plupart des sons musicaux ne sont pas des *sinusoïdes* pures mais des
empilements d'*harmoniques* — c'est ce que l'analyse de Fourier rend
visible, et c'est ce que tu sculptes dans le Designer.

**Renvois croisés** : *Fréquence* (existante), *Amplitude* (existante),
*Forme d'onde* (existante), *Timbre* (existante), *Harmonique*
(existante), *Hertz (Hz)* (existante).

**Nuance importante** : entrée fondamentale, à écrire avec soin. Le
risque est de la rendre triviale (« un son, c'est ce que tu entends »)
ou inversement trop physique (Pascal, ondes longitudinales,
conduction). Trouver le juste milieu : phénomène physique mesurable
**et** sensation perceptive, avec les trois propriétés qui structurent
le reste du glossaire (fréquence → hauteur, amplitude → volume, forme
→ timbre).

## Concepts subtils à manier avec soin

Trois entrées portent des nuances qu'il faut bien doser pour ne pas
créer de fausses pistes chez le lecteur :

- **Phase** : la nuance critique est « inaudible isolément,
  déterminante en superposition ». Si tu présentes seulement
  « décalage temporel », le lecteur ne comprend pas pourquoi la
  normalisation change quoi que ce soit. Si tu insistes trop sur la
  perception, tu rates le rôle central qu'elle joue dans la forme
  visuelle.
- **Normalisation** : éviter le piège « ça normalise le volume » (qui
  est un autre sens en audio). Préciser que c'est une normalisation
  *de la phase*, pas de l'amplitude. Et expliquer **pourquoi** le
  Designer le propose comme garde-fou avant l'édition d'une barre —
  c'est la motivation utilisateur.
- **Résidu** : éviter le jargon « bruit résiduel » (qui suggère
  parasite). Présenter comme la *personnalité préservée* du tracé.
  Métaphore possible : « si la spline est le squelette, le résidu
  est la chair ».

## Renvois croisés à câbler (récapitulatif)

| Depuis | Vers |
|---|---|
| Ancre | Forme d'onde (existante), Résidu (nouvelle) |
| Cap (plafond d'harmoniques) | Harmonique (existante), Spectre et spectrogramme (existante) |
| iDFT | DFT (existante), Normalisation (nouvelle), Phase (nouvelle) |
| Normalisation | iDFT (nouvelle), Phase (nouvelle), Harmonique (existante) |
| Phase | Harmonique (existante), Normalisation (nouvelle), Forme d'onde (existante) |
| Résidu | Ancre (nouvelle), Forme d'onde (existante) |
| Son | Fréquence, Amplitude, Forme d'onde, Timbre, Harmonique, Hertz (toutes existantes) |

**Renvois inverses à ajouter dans les entrées existantes** : oui, c'est
bidirectionnel quand pertinent. Modifier les entrées suivantes :

- **DFT** (existante) → ajouter renvoi vers *iDFT* (« sa
  réciproque ») et vers *Phase* (« en plus des magnitudes, une DFT
  rend les phases »).
- **Forme d'onde** (existante) → ajouter renvoi vers *Ancre* et
  *Résidu* (les deux composantes du modèle d'édition). Ajouter aussi
  un renvoi vers *Son* (la forme d'onde décrit la *manière* dont le
  son varie en pression).
- **Harmonique** (existante) → ajouter renvoi vers *Cap* (« plafonné
  par le cap dans la synthèse ») et *Phase* (« chaque harmonique a
  une phase qui détermine son alignement »).
- **Spectre et spectrogramme** (existante) → ajouter renvoi vers
  *Cap* (« la liste s'arrête au cap »).
- **Fréquence** / **Amplitude** / **Hauteur** / **Timbre** (existantes)
  → vérifier qu'elles renvoient toutes vers *Son* comme phénomène
  englobant. Ces 4 entrées décrivent des propriétés du son ; sans
  pointeur vers Son, le lecteur n'a pas la maille de référence.
  Modification minimale (un demi-ajout de « Voir aussi »).

Garder ces modifs **minimales** : juste un « Voir aussi » étendu ou
une demi-phrase. Ne pas refondre les entrées existantes.

## Format des entrées (rappel)

- `## Titre` (H2, exactement comme les existantes).
- 2-4 phrases en tutoiement.
- Renvois croisés via *italique* pour les entrées du même glossaire
  (`*Phase*`), via `[lien](doc:autre-article)` pour les autres
  articles, via DocLink pour les éléments UI dont tu as vérifié
  l'existence de l'ancre.
- Math LaTeX inline : `$x = \sum a_k \sin(2\pi k t)$` etc. — utiliser
  quand ça clarifie sans surcharger.
- Pas de jargon non glossé — si tu introduis un mot dont tu n'as pas
  d'entrée, soit tu l'enlèves, soit tu en fais une entrée.

## Hors scope

- **Refonte du guide-designer** : M.5b.1.
- **Extension comprendre-forme-onde** : M.5b.3.
- **Mise à jour limites-connues** : M.5b.4.
- **Magnitude vs amplitude (convention FFT bilatérale)** : volontairement
  PAS d'entrée séparée. Ce détail technique pollue plus qu'il n'éclaire
  pour le lecteur cible. Si tu sens un besoin de le dire quelque part,
  glisse une note d'une demi-phrase dans *Spectre et spectrogramme*
  (« les pics affichés sont des magnitudes ») mais ne crée pas
  d'entrée dédiée.

## Compte-rendu attendu

À la livraison, signale :
- Liste exhaustive des entrées ajoutées (6 + modifs aux 4
  existantes).
- Toute décision de wording que tu as prise par défaut (ex. choix
  d'une métaphore, niveau de profondeur sur Phase, etc.).
- Toute ancre `data-anchor` que tu aurais vérifiée et utilisée en
  DocLink.
- Tout terme que tu aurais voulu introduire mais que tu as écarté
  faute de pertinence (et pourquoi).

## Workflow

- Commit unique : `docs(M.5b.2): enrichissement glossaire-technique
  (6 entrées + renvois croisés mis à jour)`.
- Pas de modification de fichier autre que
  `src/docs/articles/glossaire-technique.md`.
- Si tu identifies un manque qui sortirait du périmètre (par
  exemple : « il faudrait aussi une entrée Magnitude »), remonte
  plutôt que de l'ajouter sans validation.
