# Prompt L.5a rédaction — Glossaires (technique + musical)

## Contexte

Iteration L : mécanique livrée (onglet Documentation, renderer
Markdown + math, DocLink, Tour). On entre en **L.5 (rédaction des
contenus)**, découpée en lots ordonnés par dépendance. **Ce prompt =
lot 1 : les deux glossaires.**

Pourquoi les glossaires en premier : ce sont les **cibles des
références croisées** de tous les autres contenus (fiches
tempéraments, articles longs). On définit chaque terme **une fois**
ici ; ailleurs, on y renverra par un lien. Évite de gloser le même
terme dans dix articles.

## Pré-lecture obligatoire

1. **`writer/CLAUDE.md`** — ton rôle, **voix = tutoiement** (à
   jour), discipline factuelle, sources, et la **syntaxe math**
   (section "Format Markdown supporté") : `$…$`/`$$…$$`, `^{}`,
   `_{}`, `\frac`, délimiteurs extensibles `( )`/`[ ]`, symboles.
   Les glossaires en useront beaucoup (cents, ratios).
2. `CONTEXT.md` — état de l'app, lexique, liste des 14 systèmes de
   tempérament (pour caler les définitions musicales sur ce que
   l'app implémente réellement).
3. `archi/BACKLOG.md` section *Iteration L* → "Carte des contenus"
   (C.7 et C.8) + les sources fiables citées dans la section
   tempéraments.
4. `src/docs/articles/why-12-notes.md` — pour le **ton** (article
   de réf déjà validé) et pour voir la syntaxe math en situation.
5. `src/lib/shortcuts.js` + `src/lib/tours/*.js` — pour les valeurs
   `data-anchor` valides (cibles des DocLink vers l'UI). N'utilise
   que des ancres que tu as vérifiées y exister.

## Objectif

Deux articles Markdown dans `src/docs/articles/` :

- `glossaire-technique.md` (id `glossaire-technique`) — **C.7**
- `glossaire-musical.md` (id `glossaire-musical`) — **C.8**

Et leur déclaration dans `src/docs/index.js` (section TOC
**"Concepts"** — nouvelle section ; si tu juges un autre libellé
plus clair, propose-le).

## Format d'un glossaire

- **H1** = titre ("Glossaire technique" / "Glossaire musical").
- Courte intro (1-2 phrases) : à qui/à quoi sert ce glossaire.
- **Une entrée par terme** : `## Terme` (H2) puis 2-4 phrases.
- **Ordre alphabétique** des entrées (c'est une référence — on y
  cherche un terme). Les paires d'opposition (quinte pure vs
  tempérée, comma syntonique vs pythagoricien) peuvent être une
  entrée comparative unique, rangée à la lettre du terme générique.
- Concision : une entrée de glossaire se lit en 15 secondes. Si un
  concept mérite un développement long, **renvoie** à l'article
  dédié plutôt que de tout expliquer ici (ex. tempérament →
  article C.9 *à venir* : pour l'instant, renvoi textuel léger,
  pas de lien mort — cf. "Liens" ci-dessous).

## Termes à couvrir

### `glossaire-technique.md` (C.7 — synthèse, signal, Designer)

Obligatoires (cf. backlog) : **harmonique, DFT, période, ADSR**
(attaque / hold / decay / sustain / release), **A4, Hz, octave**.

Ajouts attendus (indispensables aux autres contenus) : **fréquence,
hauteur, forme d'onde, amplitude, timbre, spectre / spectrogramme**.

Tu peux ajouter un terme manifestement nécessaire — signale-le dans
ton compte-rendu.

### `glossaire-musical.md` (C.8 — théorie, tempéraments)

Obligatoires (cf. backlog) : **comma** (syntonique vs
pythagoricien), **quinte** (pure vs tempérée), **EDO**, **méantone,
shruti, maqâm, raga, gamelan** (slendro / pelog).

Ajouts attendus : **intervalle, cents, tierce, tempérament,
intonation juste, 12-TET, degré / tonique**.

Cale les définitions sur ce que l'app implémente (cf. les 14
systèmes du registre dans `CONTEXT.md`). Pour les traditions
(maqâm, gamelan, shrutis), reste au niveau des **sources citées par
le projet** (Cairo 1932, Surjodiningrat 1972, Bhatkhande,
Sarngadeva) — pas d'extrapolation. En cas de doute factuel, reste
général (cf. `writer/CLAUDE.md`).

## Liens

- **DocLink vers l'UI** (encouragé quand le terme a un référent
  visible) : ex. *ADSR* → `<DocLink target="designer:designer-adsr">les
  poignées d'enveloppe</DocLink>`, *spectrogramme* →
  `designer-spectrogram`, *forme d'onde* → `designer-waveform`,
  *système musical* → `designer-system-selector`. **Vérifie** que
  l'ancre existe (`shortcuts.js` / `tours/*.js`) avant de la cibler.
- **Liens doc→doc** : entre les deux glossaires
  (`[cents](doc:glossaire-musical)` etc.) et vers les articles
  **existants** (`doc:why-12-notes`, `doc:about`). **Autorisés.**
- **Pas de lien vers un article non encore écrit** (les articles
  longs C.9, fiches tempéraments A.2 viennent dans des lots
  ultérieurs). Pour ces renvois, utilise une **mention textuelle**
  ("développé plus en détail dans l'article sur les tempéraments")
  sans `doc:` — on transformera en lien quand l'article existera.
- **Renvois intra-glossaire** (terme → autre terme de la même
  page) : le renderer ne gère pas les ancres internes `#section`.
  Reste textuel ("voir aussi *Cents*") ou gras simple.

## Math

Utilise la syntaxe math pour les formules — pas de Markdown
approximatif :
- ratios : `$\frac{3}{2}$`, `$\frac{5}{4}$`, ou `$3:2$`
- cents : `$\approx 23$ cents`, `$1200$ cents = 1 octave`
- EDO : `$2^{1/12}$`, `$2^{n/12}$`
- exposants de ratios : `$(\frac{3}{2})^{12}$` (les parenthèses
  s'agrandissent)

## Déclaration TOC (`src/docs/index.js`)

Ajoute les deux entrées (import `?raw` + objet `{id, title,
section: 'Concepts', type: 'markdown', source}`). Range-les dans
une section **"Concepts"**. L'ordre intra-section : technique puis
musical (ou alpha — ton choix).

## Livraison

- `glossaire-technique.md`, `glossaire-musical.md`, mise à jour
  `index.js`.
- Commits : un par glossaire, ou groupés :
  - `docs(iter-L/phase-5a-redaction): glossaire technique`
  - `docs(iter-L/phase-5a-redaction): glossaire musical`
- Push.
- Compte-rendu : termes ajoutés au-delà de la liste, points
  d'incertitude factuelle laissés généraux, DocLink posés (et ceux
  que tu as renoncé à poser faute d'ancre), suggestions
  `writer/CLAUDE.md`.

## Hors scope

- Les autres lots L.5 (fiches tempéraments, articles longs, guides,
  recettes, limites) — prompts dédiés à venir.
- Toute modification de code applicatif hors `src/docs/` (et hors
  les champs `title`/`body` des tours, qui ne concernent pas ce
  lot).
- Le fichier `_renderer-test.md` (sera retiré en fin de L.5 par le
  dev).
- Création d'ancres `data-anchor` (c'est le dev) : tu ne fais que
  **consommer** les ancres existantes via DocLink.

Bon vent.
