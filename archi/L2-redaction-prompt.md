# Prompt L.2 rédaction — Articles initiaux Documentation

## Contexte

L.2 (4e onglet Documentation) en cours de livraison par le dev.
Le squelette technique (renderer Markdown maison, TOC, persistance
sessionStorage de la position de lecture) est livré ou en cours.

Le dev pose des **stubs placeholder** dans
`src/docs/articles/about.md` et `src/docs/articles/why-12-notes.md`
en attendant que tu rédiges les vrais contenus. Tu **remplaces
complètement le contenu de ces 2 fichiers** par les articles
rédigés selon les briefs ci-dessous.

## Pré-lecture obligatoire

1. **`CONTEXT.md`** (racine) — pour comprendre ce que fait l'app
   et avec quel lexique tu en parles. Vérifie au passage le numéro
   de version courante (pour l'article "À propos").
2. **`archi/BACKLOG.md`** section *Iteration L* — slogan "compatible
   3 publics, n'impose rien, propose tout" et carte des contenus.
3. **`writer/CLAUDE.md`** — ton rôle, conventions de ton, sources
   privilégiées, lexique de l'app, set Markdown supporté.
4. Les fichiers stubs existants dans `src/docs/articles/` pour
   voir où tu écris et te repérer dans la structure.

## Article 1 — `about.md` ("À propos")

**Public visé** : tous (curieux, prof, élève). Article "fiche" lu
en premier par un visiteur qui découvre la doc.

**Longueur cible** : 150-250 mots.

**Plan suggéré** (à adapter) :

- **Titre H1** : "À propos" (matche le titre dans `index.js`).
- **Paragraphe d'intro** (1-3 phrases) : ce que fait l'app —
  synthèse par dessin de forme d'onde, timeline multipiste,
  multi-tempérament, export WAV. Direct, factuel.
- **Section "Philosophie"** (H2) : reformule le slogan "compatible
  3 publics, n'impose rien, propose tout" en termes utilisateur.
  Mentionne le minimalisme technique assumé (pas de frameworks,
  tient dans un onglet, démarre instantanément). Pas une liste
  de specs — une posture.
- **Section "Version"** (H2 ou ligne courte) : numéro courant
  (lecture statique dans le fichier — actualisé manuellement à
  chaque release). Récupère le numéro depuis `CONTEXT.md` TL;DR
  ou `package.json`.
- **Section "Repo / contribuer"** (H2) : lien GitHub
  `https://github.com/rm-info/synth-app`. Mention courte si tu
  veux ("code ouvert", "contributions bienvenues" — ou pas,
  selon le ton).
- **Optionnel** : une phrase de Helmholtz ou autre auteur classé
  source fiable, en blockquote, comme exergue.

**Features Markdown à exercer** : H1, H2, paragraphes, **au moins
1 lien externe**, **au moins 1 emphase** (gras ou italique).
Optionnel : 1 liste courte, 1 blockquote.

**Sources** : pas de fait technique précis nécessaire pour cet
article. Reste factuel sur ce que fait l'app (cf. CONTEXT.md).

## Article 2 — `why-12-notes.md` ("Pourquoi 12 notes ?")

**Public visé** : "le curieux" du slogan — adulte qui sait ce
qu'est une note, sait qu'un piano a des touches blanches et
noires, mais n'a pas spécialement étudié l'histoire de la musique
ni la théorie. Pas un total néophyte.

**Longueur cible** : **600-1000 mots**. Article témoin de
vulgarisation. C'est le premier article rédigé qui exercera
pleinement le renderer Markdown — il doit être représentatif du
type de contenu visé par l'iter L.

**Plan suggéré** (à adapter, mais le couvre les points clés) :

1. **Intro** : la question paraît anodine, pourtant la réponse
   traverse 2500 ans d'histoire de la musique et un peu de
   mathématiques. Pourquoi pas 7 ? Pourquoi pas 24 ? Pourquoi
   exactement 12 ?
2. **Le cycle des quintes pythagoricien** (~VIe siècle av. J.-C.)
   : empilement de quintes pures (ratio `3:2`). Après 12 quintes
   empilées, on revient *presque* à la note de départ, 7 octaves
   plus haut. *Presque* — le résidu s'appelle le **comma
   pythagoricien**, environ 23 cents.
3. **Le problème pratique** : sur un instrument à hauteur fixe
   (clavier, harpe), on ne peut pas conserver toutes les quintes
   pures. Il faut choisir où placer le défaut. C'est l'origine
   de tous les tempéraments historiques.
4. **Pourquoi 12 et pas 7 ?** Les 7 notes diatoniques (do-ré-mi-
   fa-sol-la-si) couvrent une gamme. Les 5 chromatiques (les
   touches noires) viennent combler les écarts pour permettre la
   **transposition** (= jouer la même mélodie à une autre
   hauteur). 7 + 5 = 12.
5. **Pourquoi 12 et pas 24 ?** Compromis entre richesse
   d'intervalles et clarté perceptive. Évoquer que d'autres
   cultures explorent 17/22/24 notes pour des raisons musicales
   distinctes (renvoyer en filigrane vers les autres tempéraments
   de l'app — Cairo 1932, shrutis indiens, gamelan). Sans entrer
   dans le détail — ces tempéraments auront leurs propres fiches.
6. **Conclusion** : 12 est un **choix culturel** autant que
   mathématique. L'app permet d'explorer concrètement les
   alternatives en quelques clics. Optionnel : un
   `<DocLink target="composer:composer-tuning-system-selector">choisir un système musical</DocLink>`
   en clôture (lien inerte en L.2, deviendra cliquable en L.3).

**Points obligatoires à mentionner** (pour que l'article tienne
sa promesse) :

- Le **comma pythagoricien** (~23 cents)
- Le **ratio 3:2** de la quinte pure
- Pourquoi **7 notes** diatoniques (intuition courte, sans
  surcharger)
- Existence d'autres traditions (sans entrer dans le détail)
- La conclusion "choix culturel autant que mathématique"

**Features Markdown à exercer dans l'article** (pour valider
visuellement le renderer) :

- H1 + au moins 3 H2 (un par section principale)
- Plusieurs paragraphes par section
- Au moins **1 liste** (à puces ou ordonnée)
- Du **gras** ET de l'*italique* (au moins une occurrence de
  chaque, sans abus)
- Du code inline (ex. `` `3:2` ``, `` `comma pythagoricien` ``,
  noms de tempéraments)
- Au moins **1 lien externe** (Wikipedia "Cycle des quintes",
  Helmholtz, ou la source qu'il te plaît parmi celles autorisées
  dans `writer/CLAUDE.md`)
- Au moins **1 blockquote** (citation, ou encart "À noter")
- **Pas obligatoire** : code block (article peu technique),
  image (pas nécessaire pour le sujet — réservée à des articles
  qui en bénéficient vraiment)

**Sources à mobiliser** :

- **Helmholtz**, *On the Sensations of Tone* (1863) pour
  l'acoustique du comma et le ratio pythagoricien
- **Wikipedia** "Cycle des quintes" ou "Comma pythagoricien" en
  point d'entrée — vérifie les chiffres critiques (valeur du
  comma, ratio de la quinte) auprès d'une source secondaire si
  doute

**À éviter** :

- Dates précises non sourcées ("en 530 av. J.-C." sans source
  → préférer "vers le VIe siècle av. J.-C.")
- Valeurs en cents au-delà du 1 décimal sans source ("23.46
  cents" → préférer "environ 23 cents" ou "~23 cents")
- Attribuer à Pythagore lui-même un système qu'il a peut-être
  inspiré sans avoir formalisé — préférer "attribué à l'école
  pythagoricienne"
- Le jargon non glossé : si tu écris "EDO" ou "tempérament" pour
  la première fois, glose en parenthèse ou en blockquote à
  cette occurrence
- Comparaisons subjectives non sourcées ("c'est le système le
  plus naturel" — non, c'est un choix culturel, c'est même le
  cœur du propos)

## Livraison

1. Remplace complètement le contenu des stubs
   `src/docs/articles/about.md` et
   `src/docs/articles/why-12-notes.md`.
2. **Tu n'as pas besoin de toucher** à `src/docs/index.js`
   (les entrées TOC sont déjà déclarées par le dev en L.2.4).
3. Commit chaque article séparément :
   - `docs(iter-L/phase-2-redaction): article "À propos"`
   - `docs(iter-L/phase-2-redaction): article "Pourquoi 12 notes ?"`
4. Push après chaque commit.
5. Remonte à l'utilisateur :
   - Choix éditoriaux notables (angle, plan, longueur finale)
   - Points d'incertitude factuelle restants (si tu as dû laisser
     vague un point qui mériterait précision)
   - Suggestions pour `writer/CLAUDE.md` si l'expérience révèle
     des manques (sources à ajouter, conventions à préciser, etc.)

## Hors scope

- **Squelette de l'onglet** (TOC, renderer, layout, navigation)
  — c'est du code, donc le dev.
- **`_renderer-test.md`** — fichier de validation visuelle livré
  par le dev en L.2.5, ne pas le toucher.
- **Autres articles** du backlog (A.2 tempéraments, A.4 limites,
  B.5 guides, B.6 recettes, C.7/C.8 glossaires, autres articles
  C.9, D.11 démos, D.12 exercices) — ils viendront sur des
  prompts L.5 séparés.
- **Modification de `index.js`** — déjà déclaré par le dev.
- **Tout fichier hors `src/docs/articles/`** — strictement
  hors scope.

Bon vent.
