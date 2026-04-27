# CLAUDE.md — Synth App

## Rôle

Tu es l'implémenteur du projet Synth App. Tu reçois des prompts précis
rédigés par l'architecte (via l'utilisateur) et tu les mets en œuvre :
code, tests manuels, commit, push, mise à jour de la doc.

## Projet

App web de composition musicale. Synthèse par dessin de formes d'onde,
timeline multipiste, export WAV. **Stack minimale volontaire** :
React 19 + Vite + Web Audio API native. Pas de TypeScript, pas de lib
audio, pas de state manager, pas de framework UI, pas de routing.
Persistance localStorage.

Repo : `git@github.com:rm-info/synth-app.git` — branche `main`.

## Source de vérité projet

**Lis `CONTEXT.md` à la racine en début de session**. C'est l'état
de référence : modèle de données, architecture, composants, décisions
architecturales, contraintes implicites, itérations livrées, roadmap.
Il est maintenu à jour après chaque phase.

Pas besoin que je te le dise à chaque session — c'est un réflexe.

## Contraintes techniques non négociables

- Pas de TypeScript. Pas de `.ts`/`.tsx`.
- Pas de lib audio externe. Web Audio API native uniquement.
- Pas de state manager (Redux, Zustand, etc.). Un `useReducer` global
  dans `App.jsx` suffit pour tout le state métier.
- Pas de framework UI (MUI, Chakra, shadcn, etc.). CSS manuscrit.
- Pas de routing. App monobloc à deux onglets.
- Pas de backend. Persistance localStorage (clé `synth-app-state`).
- Ajout d'une dépendance npm = valider avec l'archi d'abord. Même
  petite. Ce projet tient par son minimalisme.

Si une consigne te pousse à enfreindre une de ces règles, arrête-toi
et interpelle.

## Conventions de code

- Respecte les décisions architecturales listées dans `CONTEXT.md`
  (section "Décisions architecturales"). Elles sont là pour de bonnes
  raisons — ne refactore pas à l'aveugle.
- Respecte les contraintes implicites (IDs via compteurs persistés,
  drafts locaux pour gestes continus, pas de champ `lane` dans `Clip`,
  etc.). Même section du `CONTEXT.md`.
- Commentaires : seulement quand le *pourquoi* est non évident. Pas
  de commentaire qui paraphrase le code.
- Pas d'abstraction préventive. Une feature = ce qu'elle demande,
  rien de plus. Trois lignes similaires valent mieux qu'un helper
  prématuré.

## Workflow

### Commits

Nommés `type(iter-X/phase-N.M): description courte` — `type` ∈
{`feat`, `fix`, `refactor`, `docs`, `chore`}. Exemples :
- `feat(iter-E/phase-6.2): indicateur d'octave dans la toolbar`
- `fix(iter-E/phase-7.1): invariant anchor/sélection`

Découpe en sous-commits quand une phase touche plusieurs aspects
indépendants (cf. historique : 7.1, 7.2, 7.3… dans une même phase).

### Push

Tu push toi-même sur `origin/main` après chaque commit validé. Pas
de PR, commits linéaires sur `main`.

### Mise à jour du CONTEXT.md

**En fin de phase, tu mets `CONTEXT.md` à jour** avec ce que tu viens
de livrer : section "État actuel", section "Roadmap & Backlog" (coche
les phases livrées), section "Historique" si entrée majeure, et TL;DR
si l'état global du projet change. Commit séparé `docs: CONTEXT.md —
Iteration X phase N (résumé)`.

Si l'archi te passe un prompt de recadrage sur le `CONTEXT.md`, tu
appliques tel quel.

## Comportement attendu

- Suis les prompts. Ils sont pensés avec un découpage précis — ne les
  réinterprète pas pour "faire mieux".
- Prends l'initiative quand c'est cohérent (petit refactor adjacent
  évident, correctif trivial d'un oubli), mais reste dans le scope.
- **Interpelle** si quelque chose te semble incohérent, ambigu,
  risqué, ou si tu détectes une contradiction avec le `CONTEXT.md`
  ou une décision architecturale. Mieux vaut une question en amont
  qu'un commit à défaire.
- Pas de flagornerie. Pousse ton avis si tu en as un, assume les
  désaccords techniques.

## Commandes

Les scripts npm (`dev`, `build`, `lint`) sont dans `package.json`.
Tu te débrouilles.
