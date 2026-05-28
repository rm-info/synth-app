# Prompt L.5e rédaction — Guides par onglet (B.5)

## Contexte

Glossaires, fiches et articles longs livrés. On passe au volet
**fonctionnel** : les 3 **guides par onglet** (Bibliothèque,
Designer, Composer). Nature différente des lots précédents — c'est
le **mode d'emploi** : comment utiliser l'app, pas de la théorie.
Peu ou pas de math, beaucoup de renvois vers l'UI (DocLink).

Section TOC cible : **"Prise en main"** (à créer, placée **avant
"Comprendre"** dans l'ordre des sections).

## Pré-lecture obligatoire

1. **`writer/CLAUDE.md`** — voix tutoiement, **convention de
   nomenclature** (c'est dans le Guide Designer qu'on explicite
   l'équivalence do=C, cf. ci-dessous), scheme `doc:`, vérif des
   ancres.
2. **`CONTEXT.md`** — fonctionnalités réelles de chaque onglet
   (modes Bibliothèque, outils Designer, timeline Composer). Décris
   ce qui **existe**, pas ce que tu imagines.
3. **`src/lib/shortcuts.js`** + **`src/lib/tours/{library,designer,
   composer}.js`** — les `data-anchor` valides (cibles DocLink) ET
   ce que chaque tour met en avant.
4. **Les glossaires et fiches** — cibles `doc:` quand un guide
   touche un terme technique ou un tempérament.

## Différencier guide et Tour (important)

Le Tour guidé (bouton Compass) visite déjà chaque onglet en
spotlights interactifs. **Le guide n'est pas la transcription du
tour** : c'est la version **manuel** — lisible, plus complète,
consultable à froid. Le tour est un survol rapide ; le guide
détaille les zones, les gestes, les raccourcis, les cas d'usage.
Ils se complètent (le guide peut d'ailleurs mentionner « pour une
visite rapide, lance le Tour »).

## Les 3 guides

Format : ~400-700 mots, structuré par **zones / tâches** de
l'onglet (H2). Ton "mode d'emploi" clair. ids : `guide-bibliotheque`,
`guide-designer`, `guide-composer`.

### `guide-bibliotheque.md` — "Guide : la Bibliothèque"

Gérer les patches : modes d'affichage (liste/détails/tuiles),
navigation vs arborescence, dossiers, sélection multiple,
copier/couper/coller, le presse-papier, supprimer (avec
l'avertissement si patch utilisé en Composer). Renvoie aux
raccourcis (Ctrl+K) pour la liste complète.

### `guide-designer.md` — "Guide : le Designer"

Créer un son : dessiner/choisir une forme d'onde, régler
l'enveloppe AHDSR, l'amplitude, **choisir le système musical**,
tester au clavier (souris + touches), le sustain, l'octave, le
spectrogramme, enregistrer le patch.

> **Inclure ici l'équivalence de nomenclature** (une fois pour
> toute la doc) : le clavier visuel et les labels affichent les
> notes en **notation anglo-saxonne** (C, D, E, F, G, A, B), tandis
> que cette documentation parle en **solfège** (do, ré, mi, fa,
> sol, la, si). Donne la correspondance clairement : do = C, ré =
> D, mi = E, fa = F, sol = G, la = A, si = B. Une phrase + la
> correspondance suffit.

### `guide-composer.md` — "Guide : le Composer"

Arranger une compo : la timeline et les pistes, déposer des clips,
le panneau Propriétés (hauteur, durée, patch), durées par défaut,
BPM, octave de saisie, copier/coller, fusionner/diviser, lecture/
transport, export. Renvoie aux raccourcis (Ctrl+K).

## Stratégie DocLink (point clé de ce lot)

Les guides **veulent pointer beaucoup d'éléments d'UI**. Règles :

- **N'utilise que des ancres `data-anchor` qui existent** (vérifie
  dans `shortcuts.js` / `tours/*.js`). Lien mort = no-op silencieux.
- Pour un élément **utile mais sans ancre** : **ne l'invente pas**,
  fais un renvoi **textuel** ("dans la barre d'outils, le bouton
  Lecture…") ET **signale-le dans ton compte-rendu** (liste des
  ancres manquantes utiles). On fera poser ces ancres par le dev en
  passe de clôture, puis on rebranchera.
- Lie vers le glossaire/les fiches quand un terme technique
  apparaît (ex. *AHDSR* → `doc:glossaire-technique`, *système
  musical* → `doc:comprendre-temperament` ou une fiche).

## Déclaration TOC (`src/docs/index.js`)

- Crée la section **"Prise en main"**, placée **avant "Comprendre"**
  (ordre cible : Le projet → **Prise en main** → Comprendre →
  Concepts → Tempéraments → Référence).
- Ordre intra-section : Bibliothèque → Designer → Composer (ordre
  des onglets), ou Designer d'abord si tu juges que c'est l'entrée
  naturelle. À ton choix.

## Livraison

- 3 fichiers `.md` + section "Prise en main" dans `index.js`.
- Un commit par guide (ou groupés), préfixe
  `docs(iter-L/phase-5e-redaction): …`.
- Push.
- Compte-rendu : **liste des ancres `data-anchor` manquantes mais
  utiles** (pour la passe de clôture dev), DocLink posés, renvois
  glossaire/fiches, et toute fonctionnalité de l'app que tu décris
  et dont tu n'es pas certain (à vérifier).

## Hors scope

- Recettes (B.6) → L.5f. Limites (A.4) → L.5g.
- **Ne pose aucune ancre toi-même** (c'est le dev) — tu signales
  les manquantes, c'est tout.
- Rebranchement glossaire→fiches, retrait `_renderer-test` →
  clôture.
- Tout fichier hors `src/docs/`.

Bon vent.
