# Prompt M.5b.1 rédaction — Refonte du guide Designer (modèle rattrapé)

## Contexte

Le rattrapage de l'Iteration M (phases M.r.1 → M.r.5.bis) est clos. Le
Designer a basculé du modèle siloté (trois modes verrouillés —
dessin / harmoniques / spline) vers un **modèle unifié** : une courbe
canonique pivot, trois lentilles toujours synchronisées (Forme d'onde
en mode Libre ou Ancres, Harmoniques, Spectrogramme), normalisation
explicite par bouton Σ avec garde-fou dialog, marqueur ±1 et auto-fit Y,
3 courbes empilées pédagogiques (canonical bleue + normalisée grise +
spline parfaite orange).

Le **guide-designer.md** actuel (77 lignes, 7 sections) date d'avant le
rattrapage. Il décrit un Designer qui n'existe plus. C'est le chantier
**M.5b.1** : refondre ce guide pour qu'il reflète fidèlement
l'expérience utilisateur actuelle.

Le glossaire technique (M.5b.2) vient d'être enrichi avec 7 nouvelles
entrées (Ancre, Cap, iDFT, Normalisation, Phase, Résidu, Son). Tu
peux et dois t'appuyer dessus par renvois croisés — c'est sa raison
d'être : définir une fois, renvoyer partout.

## Pré-lecture obligatoire

1. **`writer/CLAUDE.md`** — ton rôle, voix = tutoiement, discipline
   factuelle, scheme `doc:` et DocLink, syntaxe Markdown et math.
2. **`src/docs/articles/guide-designer.md`** — état actuel (à
   remplacer). Note le ton et la cadence, c'est le registre à
   conserver.
3. **`src/docs/articles/glossaire-technique.md`** — **après** M.5b.2.
   Les 20 entrées sont tes cibles de renvois. Ne reglosse pas un terme
   ici, renvoie.
4. **`src/docs/articles/comprendre-forme-onde.md`** — article de fond.
   Le guide doit y renvoyer pour le « pourquoi », pas le reformuler.
5. **`CONTEXT.md`** — sections *État actuel* (DesignerToolbar,
   WaveformEditor headers, etc.) et *Décisions architecturales*
   (lentilles vivantes, normalisation explicite, résidu, marqueur ±1,
   3 courbes empilées). Vérité technique.
6. **Le Designer en vrai**, si possible — lance `npm run dev` et
   navigue. Le guide doit décrire ce que l'utilisateur voit, donc une
   vérification visuelle est précieuse pour les noms de boutons, la
   position des contrôles, le code couleur exact.

## Objectif

Refondre **entièrement** `src/docs/articles/guide-designer.md`. Pas
d'extension incrémentale — la structure actuelle est obsolète et
forcer la conservation perdrait plus qu'elle ne gagnerait.

Pas de modification de `src/docs/index.js` (l'article existe déjà
dedans, id `guide-designer`).

## Structure proposée (11 sections)

Tu peux ajuster les libellés ou regrouper certaines sous-parties, mais
le périmètre conceptuel doit être couvert. **Garde le ton aéré du
guide existant** — pas de mur de texte, pas de surcharge.

### 1. Intro (1 court paragraphe)

Le Designer = atelier où tu fabriques un *patch* (= un timbre + son
enveloppe). Mention que ce guide passe chaque zone en revue, tour de
table possible via le Tour. **2-3 phrases max**, comme l'actuel.

### 2. Trois lentilles sur une seule courbe

**Concept structurant à introduire**. Le Designer affiche en
permanence trois zones côte à côte : Forme d'onde (à gauche),
Harmoniques (au milieu), Spectrogramme (à droite). Ces zones ne sont
pas trois objets séparés mais **trois manières de regarder la même
courbe** — modifier l'une modifie les autres en temps réel.

C'est l'idée la plus importante à transmettre dès le début. Sans ça,
le lecteur reste sur le modèle mental « mode dessin / mode
harmoniques » et tout le reste devient confus.

Renvoyer vers *Son* et *Forme d'onde* du glossaire pour le rappel
théorique.

### 3. La lentille Forme d'onde

Diviser en deux sous-sections (les deux modes d'édition exclusifs
dans cette zone) :

**Mode Libre — tracer à la souris**. Tu dessines la courbe, l'app
joue ce que tu traces. Mention du marqueur pointillé ±1 (niveau de
référence audio — au-dessus, le navigateur normalisera). Mention
qu'on peut dessiner au-delà sans être bloqué.

**Mode Ancres — éditer par points de contrôle**. Toggle Σ-spline (à
nommer correctement, l'icône est `Spline` Lucide) dans le header de
la zone. Le slider « Nombre d'ancres » règle entre 4 et 32 ancres ;
chaque ancre est un point que tu peux glisser. Doux/Anguleux choisit
la méthode d'interpolation (courbe Catmull-Rom vs polyligne).

**Et là — le concept-clé du modèle unifié** : quand tu bascules de
Libre à Ancres, les ancres se posent automatiquement sur ton tracé
(elles le suivent, pas à `y=0`). Et **les détails fins de ton dessin
ne disparaissent pas** : c'est le *résidu*. Bouger une ancre déforme
la courbe localement, le résidu reste en place et continue de moduler
la forme — ton dessin n'est jamais écrasé.

Renvoyer vers *Ancre*, *Résidu* du glossaire (entrées toutes
fraîches).

### 4. La lentille Harmoniques

Les barres affichent l'intensité de chaque harmonique du tracé
courant. Tu peux les modifier au clic-glisser : la forme se reconstitue
en conséquence.

**Le code couleur** : barres en bleu = tu peux les éditer directement,
en gris = le tracé n'est pas encore *normalisé*, l'édition d'une barre
imposerait une phase canonique à toutes les autres et ferait sauter la
courbe visuellement. Le Designer propose alors un dialog (« Normaliser
et continuer » / « Annuler ») pour rendre ce choix explicite.

**Le bouton Σ** dans le header de la zone Forme d'onde déclenche la
*normalisation* sans condition (tu peux le cliquer en amont si tu veux
préparer ton tracé). Il est grisé quand la canonical est déjà
normalisée.

**Clic droit sur une barre** = mise à zéro instantanée (raccourci
pratique). Même garde-fou : si non normalisé, dialog d'abord.

Renvoyer vers *Normalisation*, *Phase*, *Harmonique* du glossaire.

### 5. La lentille Spectrogramme

Reprend l'esprit de la section actuelle "Voir le son" mais en
expliquant que c'est une **lentille** parmi trois, en lecture seule —
elle ne s'édite pas, elle observe. Mode statique vs live. Mention
qu'elle affiche en Hz absolus (donc dépend de la fréquence de la note
testée).

Renvoyer vers *Spectre et spectrogramme*, *DFT* du glossaire.

### 6. Lire les courbes empilées

Section pédagogique courte. La zone Forme d'onde superpose
**jusqu'à trois courbes** :

- **Bleue** : la courbe actuelle, ce que tu entends.
- **Grise** (visible quand non normalisée) : ce que la forme
  deviendrait si tu cliquais Σ. Aperçu silencieux du « après ».
- **Orange** (visible quand le résidu n'est pas négligeable) : la
  spline pure des ancres, sans le résidu. Le « squelette »
  géométrique pur du mode Ancres.

La légende dans le header de la zone explicite ce qui est affiché à
chaque instant — les courbes qui se confondent avec la canonical
sont cachées.

Renvoyer vers *Ancre*, *Résidu*, *Normalisation* (tous du glossaire).

### 7. Le plafond d'harmoniques (cap)

Slider du header de la zone Harmoniques. Limite supérieure de la
richesse spectrale (1 à 256). Un cap bas = son plus doux ; un cap
haut = son plus riche. Mention que c'est exactement le nombre de
barres affichées à droite.

Renvoyer vers *Cap (plafond d'harmoniques)* du glossaire.

### 8. L'enveloppe AHDSR

Conserver la section actuelle (déjà bonne). Vérifier juste que les
renvois pointent toujours juste.

### 9. L'amplitude

Conserver la section actuelle.

### 10. Choisir le système musical

Conserver la section actuelle.

### 11. Tester au clavier

Conserver la section actuelle, vérifier la mention de la pédale Espace
et des raccourcis QWERTY. Ajouter éventuellement une demi-phrase sur
la limite du ghosting clavier (« certains accords de 3+ touches ne
passent pas sur claviers économiques — limite physique du matériel »)
— ou mieux, laisser ça à `limites-connues.md` qui le couvrira en
M.5b.4.

### 12. La barre du haut

Nouvelle section pour décrire le bandeau global au-dessus des 3
colonnes. Quatre outils, dans l'ordre visuel :

- **Bibliothèque de presets** (icône dossier ouvert avec point) :
  ouvre la modale de presets de timbre — sinus, carré, dent de scie,
  triangle et la collection M.4.
- **Reset** (icône gomme) : remet la canonical à zéro et les ancres
  à plat, sans toucher au reste de l'éditeur (AHDSR, amplitude,
  cap, système musical, octave). Pour repartir d'un timbre vierge
  tout en gardant tes réglages d'enveloppe.
- **Σ Normaliser** : décrit en section 4.
- **Proportions des 3 colonnes** : quatre presets graphiques
  (égales / Forme d'onde large / Harmoniques large / Spectro large)
  + toggle « Auto » qui ajuste selon la zone active.

### 13. Enregistrer

Conserver la section actuelle, vérifier que les références au flux
Save/Save-as restent correctes.

## Renvois croisés à câbler (récapitulatif)

**Vers le glossaire technique (M.5b.2)** — c'est là le gros du travail :

| Concept | Entrée glossaire | Section guide où le mentionner |
|---|---|---|
| Forme d'onde / Son / Période | existantes | Sections 1, 2, 3, 5 |
| Ancre | nouvelle | Section 3, 6 |
| Résidu | nouvelle | Section 3, 6 |
| Cap | nouvelle | Section 4, 7 |
| Normalisation | nouvelle | Section 4, 6 |
| Phase | nouvelle | Section 4, 6 |
| iDFT | nouvelle | Section 4 (en sous-main, peut-être pas nécessaire) |
| Harmonique / Spectre / DFT | existantes | Sections 4, 5 |
| ADSR / Amplitude | existantes | Sections 8, 9 |

**Vers `comprendre-forme-onde.md`** : sections 1, 2, 6 (« pour
comprendre pourquoi une forme donne un timbre »).

**Vers `comprendre-temperament.md`** : section 10 (système musical).

**Vers `glossaire-musical.md`** : ponctuellement.

**Pas de renvoi à `limites-connues.md`** depuis ce guide — c'est M.5b.4
qui s'en chargera dans l'autre sens.

## DocLink — ancres `data-anchor` existantes

Liste vérifiée des ancres UI disponibles pour DocLink :

```
designer-adsr               designer-keyboard           designer-save-button
designer-amplitude          designer-new-button         designer-save-as-button
designer-harmonics          designer-octave-selector    designer-sustain-pastille
designer-presets-button     designer-reset-button       designer-system-selector
designer-waveform           designer-test-free-button   global-undo-button-designer
                                                        global-redo-button-designer
```

**Manquantes mais à utiliser textuellement** (pas d'ancre formelle,
décris les contrôles par leur libellé / position visuelle) :
- Le toggle Spline du header Forme d'onde
- Le slider Nombre d'ancres
- Le toggle Doux/Anguleux
- Le slider Harmoniques (cap)
- Le bouton Normaliser (Σ)
- Le sélecteur de proportions de colonnes
- Le toggle Auto-sizing

**Compte-rendu à signaler** : liste des ancres manquantes que tu as
dû contourner. Ce sera la base pour une demande dev en clôture M.5b
(comme L.5-cloture).

## Concepts subtils — garde-fous wording

Trois pièges classiques à éviter :

1. **« Modes » au lieu de « lentilles »**. Le mot « mode » suggère
   qu'on choisit l'un OU l'autre. Le rattrapage M.r.* a explicitement
   tué ce modèle. Les trois lentilles sont *toutes actives en
   permanence*. Préfère « lentille », « zone », ou
   « représentation ». Tu peux dire « mode Libre / mode Ancres » pour
   les deux options d'édition de la zone Forme d'onde (qui sont
   exclusives entre elles), mais pas pour les 3 zones globales.

2. **« Normaliser le volume »**. La normalisation Σ concerne la
   *phase*, pas l'amplitude. Le marqueur ±1 et l'auto-fit Y
   concernent l'amplitude — c'est un autre sujet, à distinguer
   clairement. La normalisation par Σ ne touche pas au volume audible.

3. **Le résidu comme « bruit parasite »**. Le mot « résidu » porte
   une connotation négative qui peut tromper. Insister : c'est ce qui
   *préserve ta personnalité de dessin* quand tu passes en édition
   par ancres. Pas un bug, une fonctionnalité.

## Hors scope M.5b.1

- **Extension de comprendre-forme-onde** : M.5b.3.
- **Mise à jour limites-connues** : M.5b.4.
- **Refonte du glossaire** : M.5b.2 (déjà fait).
- **Détails mathématiques** : restent dans le glossaire et
  comprendre-forme-onde — le guide reste pratique.

## Format et style — rappels

- Tutoiement systématique, voix vivante.
- Pas de mur de texte : alterner paragraphes courts et listes quand
  pertinent.
- DocLink pour tout élément UI dont tu as vérifié l'ancre. Mention
  textuelle (sans surlignage) pour le reste.
- Renvois `[texte](doc:autre-article)` pour les autres articles,
  `*Terme*` italique pour les renvois internes au glossaire.
- Math LaTeX inline seulement si utile (pour ce guide, probablement
  très peu nécessaire — la théorie est ailleurs).
- Longueur cible : ~150-250 lignes. Si tu débordes, c'est qu'on
  marche sur les autres chantiers — remonte avant d'écrire.

## Compte-rendu attendu

À la livraison, signale :
- La structure finale retenue (sections, ordre, libellés) si tu as
  dévié de la proposition.
- Liste des ancres `data-anchor` manquantes que tu as contournées
  par mention textuelle (base de la future demande dev).
- Tout choix éditorial significatif (par exemple : choix d'une
  métaphore récurrente, niveau de profondeur sur les concepts
  subtils).
- Tout passage que tu trouves bancal et qui mériterait une seconde
  passe ou une discussion archi.

## Workflow

- Commit unique : `docs(M.5b.1): refonte guide-designer pour le
  modèle rattrapé (lentilles + ancres + normalisation + barre du
  haut)`.
- Pas de modification de fichier autre que
  `src/docs/articles/guide-designer.md`.
- Si tu identifies un manque qui sortirait du périmètre (par
  exemple : « il faudrait aussi un nouvel article sur les lentilles
  vivantes »), remonte plutôt que de l'ajouter.
