# Prompt L.5c rédaction — Fiches tempéraments, lot 2 (monde & expérimental)

## Contexte

L.5b (5 fiches occidentales/historiques) livré et validé. **Ce
prompt = lot 2 : les 7 systèmes du monde & expérimental.** Même
format que le lot 1 (une fiche = un article séparé, section TOC
"Tempéraments", ids `temperament-<nom>`).

## Pré-lecture obligatoire

1. **`writer/CLAUDE.md`** — à jour. **Note la convention de
   nomenclature** : pour ces systèmes non occidentaux, **pas de
   do/ré ni C/D** → degrés numérotés (I, II…) ou noms natifs **tels
   que le registre les présente**, sans en inventer.
2. **`src/lib/tuningSystems.js`** — registre : cents exacts,
   ancrages, **sources citées en commentaire** (Caire 1932 /
   aly-abbara.com, Surjodiningrat 1972, Bhatkhande, Sarngadeva).
   Source de vérité factuelle.
3. **`CONTEXT.md`** *Historique* (itération F, phases 3, 4.2, 4.3,
   6, et F.8 pour X-EDO) — le détail d'implémentation de chaque
   système.
4. **`src/docs/articles/glossaire-musical.md`** — entrées Maqâm,
   Gamelan, Shruti, Raga, EDO, Intervalle, Cents (cibles `doc:`).
5. **Les 5 fiches du lot 1** (`temperament-*.md`) — pour caler le
   format et le ton.

## Discipline factuelle renforcée (POINT CRITIQUE)

Ces fiches touchent à des **traditions musicales vivantes**
(musique arabe, gamelan javanais, musique classique indienne).
Reproduis la prudence que tu as appliquée dans le glossaire :

- **Dis ce que l'app implémente vraiment** : des **grilles de
  hauteurs** (relevés / théorisations de fréquences), **pas** les
  systèmes mélodiques complets. L'app ne joue pas un maqâm, un raga
  ou un pathet — elle fournit l'échelle de hauteurs sur laquelle
  ces musiques reposent. Dis-le explicitement (comme l'entrée
  *Raga* du glossaire : "l'app n'implémente pas les ragas, mais le
  substrat de shrutis").
- **Cite la source** de chaque relevé (celle du registre). Une
  tradition a souvent plusieurs accordages — précise lequel l'app
  retient et d'après qui.
- **N'exotise pas, ne réduis pas.** Ton factuel et respectueux.
  Pas de "musique étrange/dépaysante", pas de pittoresque.
- **En cas de doute, hedge** ("d'après", "selon la mesure de",
  "environ") — comme dans le lot 1.

## Format d'une fiche

Identique au lot 1 : H1 = nom lisible, **~120-200 mots**, couvre
origine/contexte + particularité acoustique + "dans l'app"
(ancrage, layout, nb de degrés) + source. Math pour cents/ratios.

## Les 7 fiches du lot 2

Angle indicatif (ajuste selon le registre / CONTEXT) :

1. **24-TET (quarts de ton)** (`24-tet-equal`) — division égale en
   24, cadre **théorique** de la musique arabe (référence du
   Congrès du Caire 1932). Intervalles "neutres" entre majeur et
   mineur. Préciser : grille théorique régulière, distincte du
   relevé mesuré (ci-dessous).
2. **Maqâmât — Le Caire 1932 (mesuré)** (`24-tet-cairo-1932`) —
   relevé de hauteurs **mesurées** (source aly-abbara.com), ancrage
   'Oshairan = A4. Préciser que la pratique vivante ajoute des
   inflexions plus fines que la grille.
3. **Slendro** (`slendro`) — gamelan javanais, **5 notes** aux
   intervalles presque égaux (mais pas tout à fait — d'où une
   couleur distincte du 5-EDO). Accordage Surakarta moyen
   (Surjodiningrat 1972). Degrés I-V, pas de noms occidentaux.
   Varie d'un ensemble à l'autre.
4. **Pelog** (`pelog`) — gamelan javanais, **7 notes** aux
   intervalles **inégaux**. Même source. Les musiciens en jouent
   souvent des sous-ensembles de 5 ; l'app expose les 7.
5. **Shrutis — Bhatkhande** (`shrutis-bhatkhande`) — **22 hauteurs**
   par octave, répartition d'après la modernisation de Bhatkhande
   (début XXe). Substrat micro-tonal de la musique indienne (pas
   les ragas eux-mêmes).
6. **Shrutis — Sarngadeva** (`shrutis-sarngadeva`) — autres 22
   hauteurs, d'après Sarngadeva (*Sangita Ratnakara*, XIIIe siècle,
   via Te Nijenhuis / Rowell). Contraste avec Bhatkhande = deux
   reconstructions différentes du même cadre théorique.
7. **X-EDO (paramétrique)** (`x-edo`) — **expérimental**, sans
   tradition : tu choisis toi-même le nombre $n$ de divisions
   égales de l'octave (chaque pas vaut $2^{1/n}$). Permet
   d'explorer 17, 19, 22, 31, 53… Outil de curiosité plus que
   système historique.

## Liens

- **`doc:` vers le glossaire musical** (Maqâm, Gamelan, Shruti,
  Raga, EDO…), en nommant textuellement l'entrée (pas d'ancre
  intra-page).
- **Liens inter-fiches** : autorisés vers les fiches du lot 1
  (ids connus, ex. comparer X-EDO au 12-TET via
  `doc:temperament-12-tet`) ET entre fiches du lot 2 (ex. les deux
  shrutis se renvoient l'une à l'autre ; Slendro ↔ Pelog).
- **DocLink UI** `designer-system-selector` avec parcimonie
  (vérifie l'ancre).

## Déclaration TOC (`src/docs/index.js`)

Ajoute les 7 entrées à la section **"Tempéraments"** existante
(après les 5 du lot 1). Ordre intra-section : à ton jugement
(géographique, ou par familles : maqâmât → gamelan → shrutis →
X-EDO).

## Livraison

- 7 fichiers `.md` + mise à jour `index.js`.
- Commits préfixe `docs(iter-L/phase-5c-redaction): …`, groupés ou
  par famille.
- Push.
- Compte-rendu : sources retenues par système, faits laissés
  généraux, ids créés (pour le rebranchement glossaire→fiches en
  clôture L.5).

## Hors scope

- Le mode `free` (libre) : pas une fiche.
- Rebranchement des `doc:` du glossaire **vers** les fiches : passe
  de clôture L.5.
- Tout fichier hors `src/docs/`.

Bon vent.
