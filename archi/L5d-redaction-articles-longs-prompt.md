# Prompt L.5d rédaction — Articles longs vulgarisés (C.9, les 3 restants)

## Contexte

Glossaires (L.5a) et 12 fiches tempéraments (L.5b/c) livrés. On
rédige les **3 articles longs de vulgarisation** restants (le 4e,
*Pourquoi 12 notes ?*, existe déjà et sert de référence de ton).

C'est le **premier lot qui peut lier richement** : glossaires ET
fiches existent → ces articles sont des **carrefours** qui
renvoient vers les définitions (glossaire) et les cas concrets
(fiches), sans tout réexpliquer.

Section TOC cible : **"Comprendre"** (à créer). `why-12-notes` y
**migre** depuis la section "Articles" héritée de L.2 (qui
disparaît alors).

## Pré-lecture obligatoire

1. **`writer/CLAUDE.md`** — voix tutoiement, math, scheme `doc:`,
   nomenclature notes (solfège FR), pas d'ancre intra-page.
2. **`src/docs/articles/why-12-notes.md`** — la **référence de ton
   et de format** pour un article long. Reprends son registre.
3. **Les glossaires** (`glossaire-technique.md`, `glossaire-musical.md`)
   — cibles `doc:` pour les termes.
4. **Les 12 fiches** (`temperament-*.md`) — cibles `doc:` pour les
   cas concrets. (ids `temperament-12-tet`, `-pythagoricien`,
   `-meantone`, `-werckmeister`, `-juste-majeur`, `-24-tet`,
   `-cairo-1932`, `-slendro`, `-pelog`, `-shrutis-bhatkhande`,
   `-shrutis-sarngadeva`, `-x-edo`.)
5. **`CONTEXT.md`** + **`src/lib/tuningSystems.js`** pour tout fait
   chiffré.

## Les 3 articles — angles distincts (anti-redondance)

Ces articles **se recoupent dangereusement** avec *Pourquoi 12
notes ?* et entre eux. Le piège = tout réexpliquer à chaque fois.
**Chaque article a un angle propre ; pour le reste, il renvoie**
(`doc:`) plutôt que de répéter.

### 1. `comprendre-temperament.md` — "Qu'est-ce qu'un tempérament ?"

L'article **pivot** du cluster. Angle : le concept général.
Qu'est-ce que *tempérer* (répartir un écart inévitable), pourquoi
on a inventé **plusieurs** tempéraments (chaque époque/culture fait
un compromis différent), et comment les écouter dans l'app.
- S'appuie sur le comma (déjà expliqué dans *Pourquoi 12 notes ?* →
  `doc:why-12-notes`, ne le redémontre pas).
- **Renvoie aux fiches** comme exemples vivants : pythagoricien
  (quintes pures), méantone (tierces pures), Werckmeister (compromis
  baroque), 12-TET (égal). C'est l'article qui **donne envie de
  cliquer sur les fiches**.
- ~700-1000 mots.

### 2. `comprendre-forme-onde.md` — "Ce que tu entends quand tu dessines une forme d'onde"

Angle **acoustique/synthèse** (≠ tempérament — pas de redite avec
le cluster ci-dessus). Pourquoi la *forme* d'une onde change le
*timbre* : harmoniques, le fait qu'une courbe = une somme de
sinusoïdes (Fourier, vulgarisé), pourquoi une dent de scie sonne
"riche" et une sinusoïde "pure".
- Cible le geste du Designer : tu dessines → tu entends.
- **Renvoie au glossaire technique** (`doc:glossaire-technique` :
  harmonique, DFT, spectre, timbre, forme d'onde) plutôt que de
  redéfinir.
- DocLink UI possibles (`designer-waveform`, `designer-spectrogram`)
  — vérifie les ancres.
- ~600-900 mots.

### 3. `comprendre-piano-pas-juste.md` — "Pourquoi le piano n'est pas juste"

Angle **accroche grand public / quotidien** : l'instrument que
tout le monde connaît est délibérément "faux", et c'est un choix
malin. Article **court et percutant** (~500-700 mots), porte
d'entrée vers le concept de tempérament.
- Ne refais pas la démonstration du comma ni le catalogue des
  tempéraments : **renvoie** à `doc:comprendre-temperament` et
  `doc:why-12-notes`.
- Termine en invitant à entendre la différence (fiche
  `doc:temperament-juste-majeur` vs `doc:temperament-12-tet`, ou le
  sélecteur de système).

## Liens — c'est le cœur de ce lot

- `doc:` **abondants** vers glossaires et fiches (tout existe).
  Nomme l'entrée textuellement (pas d'ancre intra-page).
- `doc:` **entre les 3 articles** et vers `why-12-notes` (ids
  connus : `comprendre-temperament`, `comprendre-forme-onde`,
  `comprendre-piano-pas-juste`, `why-12-notes`).
- DocLink UI avec parcimonie, ancres vérifiées.

## Déclaration TOC (`src/docs/index.js`)

1. Crée la section **"Comprendre"**, placée **avant "Concepts"**
   (ordre cible : Le projet → [Prise en main, à venir] → **Comprendre**
   → Concepts → Tempéraments → Référence).
2. **Migre `why-12-notes`** : change sa `section` de "Articles" →
   "Comprendre". **Supprime la section "Articles"** (vide ensuite).
3. Ajoute les 3 nouveaux articles à "Comprendre". Ordre suggéré :
   *Pourquoi le piano n'est pas juste* (accroche) → *Pourquoi 12
   notes ?* → *Qu'est-ce qu'un tempérament ?* → *Ce que tu entends
   quand tu dessines une forme d'onde*. (À ton jugement.)

## Livraison

- 3 fichiers `.md` + migration/ajout dans `index.js`.
- **Un commit par article** (point de contrôle qualité), préfixe
  `docs(iter-L/phase-5d-redaction): …` + un commit pour la
  réorganisation TOC.
- Push.
- Compte-rendu : angles retenus (et comment tu as évité la redite),
  ids créés, faits hedgés, DocLink posés. **Signale si un article
  te paraît trop redondant** avec un autre malgré les renvois — on
  ajustera le découpage.

## Hors scope

- Guides (B.5) + Recettes (B.6) → L.5e. Limites (A.4) → L.5f.
- Rebranchement des `doc:` du **glossaire vers les fiches** : passe
  de clôture L.5 (mais ces articles longs, eux, lient déjà vers
  fiches/glossaire — c'est voulu).
- `_renderer-test.md` (retrait en clôture).
- Tout fichier hors `src/docs/`.

Bon vent.
