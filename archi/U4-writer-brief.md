# Brief writer U.4 — Peuplement de la documentation de la Création

## Pour qui, pourquoi

Itération U : on a posé un **mode Info** (Ctrl+I) qui badge chaque
contrôle de l'onglet Création et renvoie vers un **paragraphe dédié** de
l'onglet Documentation. La mécanique est livrée et validée. **Il reste à
écrire la prose.** C'est ton terrain.

Le dev a posé **7 articles squelettes** (section TOC « La Création en
détail ») : pour chaque contrôle, un titre `{#id}`, une à trois phrases
factuelles brutes, parfois un accordéon `<Details>` à demi rempli, et un
lien de retour `DocLink`. Ton travail : transformer ces stubs en
**explications accessibles** (la *raison d'être* avant le *comment*),
étoffer les accordéons « sous le capot » (maths exactes, détails DSP),
ajouter des **schémas SVG** là où ça éclaire, et retirer la ligne
« *Version provisoire* » au fur et à mesure.

Articles (fichiers `src/docs/articles/`) :
`creation-atelier` · `creation-forme-onde` · `creation-harmoniques` ·
`creation-spectrogramme` · `creation-instrument` · `creation-enveloppe` ·
`creation-effets`.

## Contraintes dures (architecture — ne pas casser)

1. **Ne change JAMAIS un id de heading `{#id}`.** Le registre du mode
   Info (`docTargets.js`) pointe vers ces ids ; en changer un = badge
   mort. Tu peux **reformuler le texte du titre**, jamais le `{#…}`.
   N'ajoute pas d'`{#id}` à un titre qui n'en a pas sans raison, et
   n'en mets pas dans un `<Details>`.
2. **Garde les liens de retour `DocLink`** en fin de section (la boucle
   app → doc → app). Tu peux les reformuler, pas les supprimer ni
   changer leur `target`.
3. **Renderer Markdown V1** — syntaxes disponibles : titres `#`..`####`,
   listes (un seul niveau d'imbrication), `**gras**`, `*italique*`,
   `` `code` ``, blocs ``` ``` ```, citations `>`, liens `[txt](url)`,
   liens internes `[txt](doc:article#id)`, images `![alt](src)`, math
   `$inline$` et `$$bloc$$`, accordéon `<Details title="…">…</Details>`.
   **Indisponible** : tableaux, HTML brut (hors `<Details>`/`<DocLink>`),
   barré, notes de bas de page. N'écris pas de tableau Markdown : il ne
   sera pas rendu.
4. **Évite l'imbrication asymétrique gras/italique** (`**foo *bar***`) —
   le parser V1 la gère mal ; préfère une incise ou reformule.
5. **Accordéon `<Details>`** : pas d'imbrication (un Details dans un
   Details ne marche pas), pas de heading ciblable dedans. Tout le
   Markdown V1 marche à l'intérieur (c'est là que vivent les formules).
6. **SVG** : fichiers dans `public/docs/`, référencés en URL absolue
   `![schéma](/docs/nom.svg)`. **Fond transparent + couleurs lisibles
   sur les deux thèmes** (un `<img>` n'hérite pas de `currentColor` :
   choisis des tons médians ou les gris de la palette, jamais du noir
   pur sur fond sombre). Teste en clair ET en sombre.
7. **Math « comme au tableau »** : fractions empilées, délimiteurs
   extensibles — pas la convention typographique en ligne. (Tu connais
   le critère.)
8. Ne touche pas à `_renderer-test.md` (banc de validation, retiré en
   fin d'itération).

## Conventions de style (rappels)

- **Tutoiement** dans les articles (et les bulles) ; garde le « on »
  impersonnel / auctorial quand c'est le bon registre, ne convertis pas
  tout au « tu » mécaniquement.
- **Nombres** : lettres dans le récit narratif (« douze notes »),
  chiffres en contexte technique (ratios, cents, Hz, EDO : « 2400 cents »,
  « 12-TET »).
- **Discipline factuelle** : borne les superlatifs historiques, glose
  même les unités « évidentes » (un cent = un centième de demi-ton
  tempéré), relativise les absolus perceptifs.
- **Public** : « tout type de public » — du curieux non technicien au
  bidouilleur. La couche accessible doit tenir seule ; l'accordent
  « sous le capot » sert ceux qui veulent regarder dessous.
- **Notions cœur du DSP** (Fourier / DFT / échantillonnage,
  harmoniques, résonance, enveloppe vs LFO) : vulgarise **avec soin**,
  appuie-toi sur des exemples concrets et des schémas ; réserve les
  maths exactes à l'accordéon. Ce sont les notions où un lecteur
  décroche le plus vite.

## Anatomie d'une section

```markdown
## Titre lisible {#id-NE-PAS-TOUCHER}

[Raison d'être, accessible : à quoi ça sert, ce que ça change à
l'oreille, quand s'en servir. Le « pourquoi » avant le « comment ».]

<Details title="Sous le capot">
[Le « comment » technique : formule exacte, unité, bornes, ce que fait
la chaîne audio. Math en $$…$$. Optionnel mais précieux.]
</Details>

![schéma éclairant](/docs/xxx.svg)   <!-- si utile -->

*→ <DocLink target="designer:ANCRE">Voir dans l'app</DocLink>*
```

## Faits techniques exacts par module

Source de vérité : `CONTEXT.md` (modèle de données) et le code. Ci-dessous
les chiffres à ne pas inventer, et **les pièges** où un texte se trompe.

### Forme d'onde
- La courbe canonique = **600 échantillons** dans **[−1, +1]** ; c'est
  *elle* que l'audio lit. Le repère pointillé marque **±1** (niveau de
  référence) ; au-delà, le navigateur ramène le volume à la lecture —
  mais rien ne bloque le tracé.
- **Libre** = main levée ; **Ancres** = poignées spline, **4 à 32**
  ancres. **Doux** = Catmull-Rom périodique (courbe lisse) ; **Anguleux**
  = polyligne (segments droits).
- **Piège à expliquer** : passer de Libre à Ancres **ne repart pas de
  zéro** — les ancres épousent le tracé, et les détails fins survivent
  dans le *résidu* ; déplacer une ancre **warpe** le résidu autour
  d'elle (support local) au lieu de l'effacer.
- **Normaliser** = redessiner la courbe comme la somme de ses
  harmoniques à phase canonique (sinus). Désactivé quand c'est déjà le
  cas. **Lissage** : deux boutons (passe-bas ; tendre vers la spline),
  expérimentaux, répétables.

### Harmoniques
- Barres = magnitudes de la **DFT (512 points)** de la forme d'onde,
  tronquées au plafond. Une barre n = poids de l'harmonique à **n·f**.
- **Plafond** : **1 à 256** (`CAP_MAX = 256`). Au-delà, harmoniques
  coupées → son plus doux. Lien naturel vers l'anti-aliasing.

### Spectrogramme
- **Direct** = analyse FFT temps réel du son joué ; **Statique** =
  spectre figé de la forme d'onde. **dB** = échelle logarithmique
  d'amplitude. **Peak hold** = maintien des crêtes (mode Direct).

### Instrument
- **Système musical** = **catégorie** (Moderne / Historique / Théorique)
  + **système** filtré (12-TET, pythagoricien, juste, gamelan, maqâm,
  shrutis, x-EDO…). Registre extensible (`tuningSystems`).
- **12-TET** : `f = a4 × 2^((midi − 69) / 12)`, **A4 = 440 Hz** par
  défaut. Glose « cent » et « tempérament » (renvoie aux articles
  *Comprendre* existants plutôt que de tout redire — `doc:` interne).
- **X-EDO** : nombre de degrés **1 à 128** (`X_EDO`… vérifie la borne
  exacte ; egal-division-de-l'octave). Bannière de conversion quand
  12 ou 24 (= 12-TET / 24-TET équipartite) — documente-la ici, elle n'a
  pas de badge propre.
- **Clavier** : joue la *preview* (hauteur de test), n'affecte pas le
  patch enregistré (la hauteur est portée par le clip au Composer).
  **Octaves 0 à 10**. **Repères visuels** = halo de gammes/accords (en
  cents) avec **tonique** réglable. **Pastille de maintien** (cadenas,
  près du clavier) = tenir la note de test (Espace) — **rien à voir**
  avec le Soutien de l'enveloppe.
- **Mode Libre** : slider **logarithmique 16 → 32768 Hz**
  (`FREE_FREQ_MIN/MAX`, = 2⁴ → 2¹⁵), fréquence éditable, bouton **Test**
  (touche `s`).

### Enveloppe
- **AHDSR** : Attaque, **Maintien (Hold)** = plateau au sommet, Déclin,
  Soutien, Relâche. Durées **0 à 1000 ms** ; **Soutien 0 à 1** (niveau,
  pas une durée). **Amplitude 0 à 1** (volume du patch).
- **Piège** : le **Maintien** est le palier *au pic* entre Attaque et
  Déclin — distinct du **Soutien** (niveau tenu tant que la note dure).
  Plancher anti-clic sur attaque/relâche (déclic évité).
- **Vues** : graphe (courbe à poignées) ↔ sliders (six réglages).

### Effets — vue d'ensemble
Neuf effets **par patch**, **sans mémoire** (pas de delay/réverb) :
ils s'insèrent dans la chaîne d'une note. Le bouton d'effet porte une
**pastille** quand l'effet est activé ; un seul panneau s'édite à la
fois. Familles : **LFO** (vibrato, trémolo, auto-pan, wah), **enveloppe**
(hauteur, env. filtre, env. drive), **filtre**, **distorsion**.

### Effets — réglages partagés (sections de concept) — BORNES EXACTES
Ces sections sont **mutualisées** entre effets d'une même famille ;
chacune doit **noter l'unité qui varie selon l'effet**.

**LFO** (`renderLfoBlock`) :
- **Vitesse** : `rate` **0,1 à 20 Hz**.
- **Profondeur** : `depth` — **unité variable** : vibrato **0–200
  cents**, wah **0–3600 cents**, trémolo & auto-pan **0–1**. (À dire
  explicitement dans `#lfo-profondeur`.)
- **Installation** : `onset` **0 à 2000 ms** (montée progressive de la
  modulation après l'attaque).
- **Forme** : sinus / triangle / carré.
- **Graphe** : surface d'édition à poignées (Profondeur = vertical,
  Installation = horizontal, Vitesse = marqueur de période) ; point de
  phase animé.

**Enveloppe de modulation** (`renderParamEnvBlock`) :
- **Cible** (`amount`, signé) : pitch **±2400 cents** (±2 oct.), env.
  filtre **±4800 cents** (±4 oct.), env. drive **±1** (décalage de gain).
- **Durée** (`time`) : pitch **40–2000 ms**, filtre & drive **0–2000 ms**
  (0 = cran statique).
- **Inverser** : `false` = part décalé → rejoint la valeur nominale ;
  `true` = part du nominal → s'éloigne vers la cible, où la valeur
  **reste**. (Sémantique exacte — ne l'inverse pas dans le texte.)
- **Forme** : `linear` / `easeOut` / `expo` / `easeIn` (progression
  p(t)∈[0,1], orthogonale à Inverser). Côté audio, `linear` = rampe
  linéaire, les autres = `setValueCurveAtTime` (pas `exponentialRamp`,
  qui ne traverse pas zéro).
- **Graphe** : médiane = valeur nominale, axe signé.

**Filtre** (`renderFilterBlock`) :
- **Type** : passe-bas / passe-haut / passe-bande / coupe-bande.
- **Fréquence** (cutoff) : **20 à 20000 Hz**.
- **Résonance** (q) : **0,1 à 20** (linéaire ; ≈ neutre à 1).
- **Piège Web Audio à NE PAS travestir** : le Q d'un biquad est en **dB**
  pour passe-bas/passe-haut, **linéaire** pour passe-bande/coupe-bande ;
  le modèle stocke un q **linéaire** unique et la couche audio convertit.
  (À garder pour l'accordéon, c'est exactement le genre de détail
  « sous le capot ».)
- **Graphe de réponse** : X log 20 Hz–20 kHz, Y en dB, poignée 2D
  (horizontal → cutoff, vertical → résonance).

**Distorsion** (`renderDistortionBlock`) :
- **Courbe** : `soft` (tanh) / `hard` (clamp) / `fold` (repli sinus),
  normalisées ±1→±1. **WaveShaper suréchantillonné ×4**, inséré **avant**
  le filtre.
- **Drive** : **1 à 50**. **Mix** : **0 à 1** (dosage wet/dry).
- **Graphe de transfert** : entrée x∈[−1,1] → sortie y∈[−1,1], diagonale
  identité en pointillés, poignée 2D au point caractéristique.

## Couture de `guide-designer.md`

`guide-designer.md` (≈190 lignes, déjà rédigé) reste le **survol
narratif** de l'onglet. Maintenant qu'il existe un article détaillé par
module, **transforme-le en porte d'entrée** : garde l'intro conceptuelle
forte (les « trois lentilles sur une seule courbe » est précieux),
**raccourcis les passages module-par-module en teasers** qui pointent
vers les articles `creation-*` (liens `doc:creation-forme-onde`, etc.).
Objectif : zéro redite lourde entre le guide et les articles ; le guide
oriente, les articles détaillent. À toi d'arbitrer ce qui reste dans le
survol et ce qui migre. (Les `{#id}` ajoutés à ses titres en U.2 sont
sans consommateur — tu peux les laisser ou les retirer, peu importe.)

## Opportunités SVG (candidats — tu décides)

Là où un schéma vaut un paragraphe : une **période d'onde avec le repère
±1** ; l'**enveloppe AHDSR** annotée (les cinq segments) ; une
**oscillation LFO** (vitesse / profondeur / installation) ; la **courbe
de réponse d'un filtre** par type ; la **courbe de transfert** d'une
distorsion (soft/hard/fold) ; les **barres d'harmoniques** d'une forme
simple. Sobres, annotés, deux thèmes.

## Critères de « fini »

- Chaque section : couche accessible autonome + accordéon technique
  quand il y a matière + DocLink de retour intact.
- Ligne « *Version provisoire* » retirée de chaque article achevé.
- Rendu vérifié **en clair et en sombre**, dev **et** build.
- Aucun `{#id}` ni `target` de DocLink modifié ; aucun tableau Markdown ;
  pas d'imbrication `<Details>`.
- `guide-designer` recousu en porte d'entrée, sans redite lourde.

Quand tu butes sur un fait technique non couvert ici, demande — je sors
le chiffre exact du code plutôt que tu ne devines.
