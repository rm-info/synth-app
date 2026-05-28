# Prompt L.5f rédaction — Limites connues (A.4)

## Contexte

Avant-dernier lot de contenu L.5 : un article de **référence
honnête** sur les limites techniques de l'app. Court. Section TOC
**"Référence"** (avec Raccourcis). Ton factuel, sans
auto-flagellation ni survente — on assume ce que l'app ne fait pas.

## Pré-lecture obligatoire

1. **`writer/CLAUDE.md`** — voix tutoiement, math, `doc:`.
2. **`CONTEXT.md`** + **`archi/BACKLOG.md`** — les limites réelles :
   sections "Qualité audio", "Performance audio", "Performance /
   stockage", "Bugs connus", "Reportés explicitement". **Source de
   vérité** — ne devine pas une limite, lis-la.
3. **`src/lib/markdown.js` / `pointsToHarmonics`** si tu veux
   vérifier un chiffre (résolution de forme d'onde, nb d'harmoniques).

## Objectif

`limites-connues.md` (id `limites-connues`), section "Référence".
~250-450 mots.

## Contenu (calé sur le réel, pas inventé)

Couvre les limites **réellement** documentées, par exemple :

- **Résolution de la forme d'onde** : nombre de points du tracé,
  nombre d'harmoniques de la synthèse (après le fix anti-aliasing
  J.1 — vérifie le chiffre exact, `HARMONIC_COUNT`).
- **Aliasing résiduel haute fréquence** : la synthèse peut produire
  des partiels parasites dans l'extrême aigu (cf. backlog "Qualité
  audio"). Dis-le sobrement.
- **Performance** : variable selon la machine/navigateur ; le
  Designer (clavier live) peut produire des micro-clics sur machine
  modeste (cf. backlog "Performance audio"). Pas de drame, mention
  honnête.
- **Audio mono** : pas de stéréo / panoramique pour l'instant (tout
  est centré).
- **Pas de MIDI**, pas d'import audio externe (l'app synthétise, on
  ne charge pas de samples).
- **Stockage** : tout vit en localStorage du navigateur (effacer
  les données du site = perdre ses patches ; pas de cloud).
- Tout autre plafond documenté que tu juges utile (nb de pistes max,
  etc.) — **uniquement si confirmé dans le code/CONTEXT**.

**Ne liste pas** les features simplement "pas encore faites" du
backlog comme des "limites" (effets, reverb…) — l'article décrit
les **limites du périmètre actuel assumé**, pas la roadmap. Si tu
veux mentionner que des enrichissements sont envisagés, une phrase
d'ouverture suffit.

## Liens

- `doc:` vers le glossaire technique si un terme apparaît
  (harmonique, aliasing… si défini), sinon glose brève.
- Pas de DocLink UI nécessaire ici (article de référence, pas de
  parcours).

## Déclaration TOC

Ajoute `limites-connues` à la section **"Référence"** (avec
"Raccourcis clavier"). Place-le après les raccourcis, ou comme tu
juges.

## Livraison

- `limites-connues.md` + `index.js`.
- Commit `docs(iter-L/phase-5f-redaction): limites connues`.
- Push.
- Compte-rendu : chiffres vérifiés (résolution, harmoniques),
  limites laissées générales faute de mesure précise.

## Hors scope

- Passe de clôture (rebranchement DocLink, retrait
  `_renderer-test.md`, bump version).
- Décrire la roadmap / les features futures comme des limites.
- Tout fichier hors `src/docs/`.

Bon vent.
