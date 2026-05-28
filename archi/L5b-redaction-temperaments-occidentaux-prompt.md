# Prompt L.5b rédaction — Fiches tempéraments, lot 1 (occidentaux & historiques)

## Contexte

L.5a (glossaires) livré. On enchaîne sur les **fiches de
tempéraments** (A.2), découpées en 2 lots. **Ce prompt = lot 1 :
les 5 systèmes occidentaux & historiques européens.**

Format retenu (arbitré 2026-05-28) : **une fiche = un article
séparé**, rangé dans une nouvelle section TOC **"Tempéraments"**.
Ça permet des `doc:` directs vers un système précis (depuis le
glossaire, ou via "En savoir plus" du Tour) et colle au backlog
("fiches courtes").

## Pré-lecture obligatoire

1. **`writer/CLAUDE.md`** — à jour : voix **tutoiement**, syntaxe
   math (`$…$`, `\frac`, `^{}`, délimiteurs `( )` extensibles,
   symboles), scheme `doc:article-id`, pas d'ancre intra-page,
   enveloppe **AHDSR**.
2. **`src/lib/tuningSystems.js`** — le registre : pour chaque
   système, les **cents/ratios exacts, l'ancrage A4, les sources
   citées en commentaire**. **Source de vérité factuelle** — ne
   suppose pas, lis.
3. **`CONTEXT.md`** section *Historique* (itération F, phases 2 à 5)
   — le détail de chaque tempérament tel qu'implémenté (décisions,
   cents vérifiés, sources).
4. **`src/docs/articles/glossaire-musical.md`** — les entrées
   (comma, quinte, tierce, EDO, méantone, intonation juste,
   tempérament…) que tes fiches référenceront en `doc:`.
5. **`src/docs/articles/why-12-notes.md`** — pour le ton, et comme
   cible `doc:` (le 12-TET y renvoie pour le "pourquoi").

## Format d'une fiche

- **Un article par système**, court : **~120-200 mots**.
- **H1** = nom lisible du système (ex. "Pythagoricien (12 notes)",
  "Mésotonique 1/4 de comma").
- Structure souple (pas de gabarit rigide imposé), mais couvre :
  - **Origine / époque** : qui, quand, contexte historique.
  - **Particularité acoustique** : ce qui le caractérise à
    l'oreille — quels intervalles sont purs, lequel est sacrifié,
    quel compromis. C'est le cœur de la fiche.
  - **Dans l'app** : 1 phrase sur l'implémentation si pertinent
    (ancrage A4, clavier réutilisé, centré sur do…).
  - **Source** : citation sobre (auteur, date) — celle du registre.
- **Math** pour les intervalles : ratios `$\frac{3}{2}$`, cents
  `$\approx 2$ cents`, etc. Pas de formules approximatives.
- Concision : c'est une fiche de référence, pas un article de fond.
  Pour le développement long, renvoie à un article (`why-12-notes`
  pour le 12-TET ; les autres articles longs viendront en L.5d —
  pour eux, mention textuelle, pas de `doc:` vers un article non
  écrit).

## Les 5 fiches du lot 1

Angle indicatif (ajuste selon ce que tu lis dans le registre /
CONTEXT) :

1. **12-TET** (tempérament égal) — le système par défaut. Douze
   demi-tons égaux `$2^{1/12}$`, aucune quinte pure (chacune
   `$\approx 2$ cents` trop courte), transposition libre. Fiche
   **courte** : le *pourquoi* est dans `[Pourquoi 12 notes ?](doc:why-12-notes)`,
   ne le répète pas.
2. **Intonation juste majeure (do)** (`just-major-c`) — ratios
   entiers simples (tierce `$\frac{5}{4}$`, quinte `$\frac{3}{2}$`),
   consonance maximale mais transposition impossible (ne se referme
   pas). Renvoi glossaire *Intonation juste*, *Comma*.
3. **Pythagoricien (12 notes)** (`pythagorean-12`) — chaîne de
   quintes pures `$\frac{3}{2}$`, tierces majeures larges
   (dissonantes), **quinte du loup** entre F♯ et D♭. École
   pythagoricienne. Renvoi *Quinte*, *Comma*.
4. **Mésotonique 1/4 de comma** (`meantone-quarter-comma`) —
   Renaissance/début baroque. Quintes rétrécies d'1/4 de comma
   syntonique pour des tierces majeures pures `$\frac{5}{4}$`, au
   prix d'une quinte du loup marquée (G♯↔E♭). Renvoi *Méantone*,
   *Tierce*.
5. **Werckmeister III** (`werckmeister-iii`) — Andreas Werckmeister,
   1691. Bien-tempéré inégal (4 quintes tempérées, 8 pures) ; toutes
   les tonalités jouables avec des couleurs distinctes ; associé au
   *Wohltemperierte Klavier* de Bach. Renvoi *Tempérament*,
   *Comma*.

## Liens

- **`doc:` vers le glossaire musical** : encouragé pour les termes
  techniques (`[comma](doc:glossaire-musical)`, etc.). Rappel : pas
  d'ancre intra-page → le lien ouvre le glossaire en haut. Tu peux
  préciser textuellement l'entrée visée ("voir *Méantone* dans le
  glossaire musical").
- **`doc:why-12-notes`** : depuis la fiche 12-TET (et où pertinent).
- **Pas de `doc:` entre fiches** pour l'instant (les fiches du lot 2
  n'existent pas encore ; et les renvois inter-fiches du lot 1
  peuvent être textuels ou via `doc:temperament-…` **uniquement
  entre fiches que tu crées dans CE lot**, donc dont l'id est connu).
- **DocLink UI** : `designer-system-selector` si tu invites à
  essayer le système (vérifie l'ancre, comme d'habitude).

## Déclaration TOC (`src/docs/index.js`)

- Crée la section **"Tempéraments"**, placée **après "Concepts"**
  (ordre cible des sections : Le projet → Prise en main → Comprendre
  → Concepts → **Tempéraments** → Référence ; les sections Prise en
  main / Comprendre n'existent pas encore, elles s'inséreront aux
  lots suivants).
- Ids d'articles : schéma `temperament-<nom>` (ex.
  `temperament-12-tet`, `temperament-juste-majeur`,
  `temperament-pythagoricien`, `temperament-meantone`,
  `temperament-werckmeister`). Cohérence = important : ce sont les
  cibles `doc:` que le glossaire pointera en fin de L.5.
- Ordre intra-section : pédagogique (12-TET, juste, pythagoricien,
  méantone, werckmeister) ou comme tu juges.

## Livraison

- 5 fichiers `.md` + mise à jour `index.js` (section "Tempéraments").
- Commits : groupés ou par fiche, préfixe
  `docs(iter-L/phase-5b-redaction): …`.
- Push.
- Compte-rendu : faits que tu as dû laisser généraux faute de
  source précise, ids d'articles créés (pour le rebranchement
  glossaire→fiches en fin de L.5), DocLink posés.

## Hors scope

- Lot 2 (tempéraments du monde & expérimental : 24-TET, Cairo,
  gamelan, shrutis, X-EDO) — prompt L.5c à venir.
- Le mode `free` (libre) : **pas une fiche** (c'est un mode Hz
  arbitraire, pas un tempérament accordé).
- Rebranchement des `doc:` du glossaire **vers** ces fiches : passe
  de clôture L.5 (quand toutes les fiches existeront).
- Tout fichier hors `src/docs/`.

Bon vent.
