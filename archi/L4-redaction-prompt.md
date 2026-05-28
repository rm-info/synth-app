# Prompt L.4 rédaction — Polish des bulles du Tour guidé

## Contexte

L.4 (Tour guidé) livrée par le dev. Les séquences d'étapes vivent
dans `src/lib/tours/{library,designer,composer,documentation}.js`.
Le dev a écrit un **premier jet** des textes (champs `title` +
`body` de chaque étape). Ta mission : une **passe rédactionnelle**
pour polir le ton, la cohérence et la concision — pas une
réécriture. Le 1er jet est déjà correct ; garde ce qui marche, ne
casse pas ce qui est bon.

Cette passe tourne **en parallèle** d'une phase dev (L.R, math
renderer) — vous ne touchez pas aux mêmes fichiers.

## Pré-lecture obligatoire

1. `writer/CLAUDE.md` — ton rôle. **Note l'exception récemment
   ajoutée** : tu peux éditer les champs `title`/`body` des tours
   dans `src/lib/tours/*.js`, avec garde-fous stricts (cf. ci-dessous).
2. `CONTEXT.md` — état de l'app, lexique (patch, clip, piste,
   système musical, Designer/Composer/Bibliothèque/Documentation).
3. `archi/BACKLOG.md` section *Iteration L* — slogan "compatible
   3 publics, n'impose rien, propose tout" + format des info-bulles
   ("titre 3-5 mots + 1-2 phrases courtes").
4. Les 4 fichiers de tour à polir.
5. Les articles déjà rédigés (`src/docs/articles/about.md`,
   `why-12-notes.md`) — pour **caler le ton** des bulles sur celui
   des articles (même registre, même public).

## Périmètre strict

Tu modifies **uniquement les valeurs des champs `title` et `body`**
des objets-étapes dans les 4 fichiers `src/lib/tours/*.js`.

**Tu ne touches JAMAIS** :
- aux champs `anchor`, `article`, `sidebar` (technique / structure) ;
- à la structure JS (objets, virgules, accolades, crochets, ordre
  des étapes) ;
- à l'échappement JS — les apostrophes sont échappées `\'` dans les
  strings JS ('l\'enveloppe', 'd\'onde'…). **Préserve-les**. Une
  apostrophe non échappée casse le build.

**Tu n'ajoutes ni ne retires d'étapes**, tu ne réordonnes pas. Si
une étape te paraît mal placée, manquante, ou ciblant le mauvais
élément → **signale-le à l'utilisateur** dans ta réponse, sans agir
(c'est une décision archi/dev).

## Consignes rédactionnelles

- **Polish, pas réécriture.** Beaucoup de bulles sont déjà bonnes.
  Interviens là où ça aide : concision, ton, cohérence inter-tours.
- **Titre** : 3-5 mots, nominal de préférence ("Le clavier de test",
  "Changer d'octave"). Pas de phrase complète.
- **Body** : 1-2 phrases **courtes**. Plusieurs 1ers jets sont un
  peu longs (ex. `designer-waveform`, `library-item-list`,
  `composer-timeline`) — resserre sans perdre l'essentiel. Une bulle
  de tour se lit en 3 secondes.
- **Cohérence de ton entre les 4 tours** : même registre,
  accessible mais pas infantilisant (cf. `writer/CLAUDE.md`). Un
  utilisateur qui enchaîne les tours (chaînage "Continuer vers…")
  doit sentir une voix unique.
- **Lexique de l'app** : réutilise les termes exacts (patch, clip,
  piste, système musical). Pas de synonyme flottant.
- **Étapes avec `article`** (`designer-system-selector` →
  `why-12-notes`, `doc-content` → `about`) : un bouton "En savoir
  plus" s'affichera. Le body peut légèrement *appeler* la lecture
  approfondie (sans lourdeur, ex. "…plusieurs traditions coexistent").
- **Cohérence des doublons** : l'étape `header-shortcuts-button`
  ("Tous les raccourcis") apparaît dans les tours Bibliothèque ET
  Documentation. C'est volontaire (même élément). Garde un texte
  identique ou quasi entre les deux.
- **Public** : le tour s'adresse à quelqu'un qui découvre
  l'interface. Décris ce que fait l'élément et *pourquoi on s'en
  sert*, pas comment le code marche.

## Livraison

- Édite les 4 fichiers `src/lib/tours/*.js` (champs `title`/`body`).
- Commits — un par tour, ou groupés si la passe est légère :
  - `docs(iter-L/phase-4-redaction): polish bulles tour Designer`
  - etc.
- Push.
- Remonte à l'utilisateur :
  - Ce que tu as resserré / retouché (synthèse, pas exhaustif).
  - Toute étape qui te semble mal placée / manquante / mal ciblée
    (sans agir — note pour arbitrage archi).
  - Suggestions éventuelles pour `writer/CLAUDE.md`.

## Hors scope

- Structure des tours (ancres, ordre, ajout/retrait d'étapes) —
  archi/dev.
- Le moteur `Tour.jsx`, le CSS, la progress bar — dev.
- Tout fichier hors `src/lib/tours/*.js` (sauf si tu identifies
  une coquille dans un article `.md` au passage — dans ce cas,
  signale plutôt que de corriger en débordant de la tâche).
- Les futurs enrichissements du Tour (étapes additionnelles) —
  viendront sur des prompts dédiés.

Bon vent.
