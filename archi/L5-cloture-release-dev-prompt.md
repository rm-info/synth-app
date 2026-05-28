# Prompt dev — Release 1.4.0 (clôture Iteration L)

## Contexte

Iteration L (Documentation) terminée : mécanique (onglet Doc,
renderer + math, DocLink, Tour, overlay) + contenu (glossaires,
12 fiches, articles longs, guides, limites) livrés. Cette passe
**acte la release 1.4.0**.

**Précondition** : la clôture rédactionnelle du writer
(rebranchement des liens + retrait de `_renderer-test.md`) doit
être **poussée** avant. Vérifie que `_renderer-test.md` a disparu
de `src/docs/` et de `index.js` ; si non, attends / signale.

## Tâches

1. **Bump version** : `package.json` `version` `1.3.0` → `1.4.0`.
   (C'est `__APP_VERSION__` injecté par Vite, affiché dans le
   header.)
2. **Sync `about.md`** : `src/docs/articles/about.md` contient
   "Version courante : **1.3.0**" → passer à **1.4.0**. (Sync de
   chaîne uniquement, fait ici pour que la release soit atomique
   et cohérente avec `package.json` — pas d'édition éditoriale.)
3. **CONTEXT.md — narration finale Iteration L** :
   - **TL;DR** : Iteration L (Documentation) **clôturée**, version
     **1.4.0**. Résumer : 4e onglet Documentation, renderer Markdown
     maison + math, overlay raccourcis (Ctrl+K), Tour guidé
     (Ctrl+J), corpus (glossaires, 12 fiches tempéraments, articles
     vulgarisés, guides, limites).
   - **État actuel** : refléter la doc complète.
   - **Roadmap & Backlog** : cocher L.5 + clôture ; Iteration L
     terminée.
   - **Historique** : entrée de clôture (rebranchement liens,
     retrait test, release 1.4.0).
4. **Commit de release** : `feat(v1.4.0): documentation utilisateur
   (Iteration L)` avec un corps résumant l'itération (sur le modèle
   du commit `feat(v1.3.0)`).

## Vérifications

- `npm run build` OK, `npm run lint` OK (les 4 warnings
  exhaustive-deps préexistants sont hors périmètre).
- Le header affiche `v1.4.0`. L'article À propos affiche 1.4.0.
- Lance l'app : l'onglet Documentation s'ouvre, la TOC liste les
  sections (Le projet / Prise en main / Comprendre / Concepts /
  Tempéraments / Référence), un article rend bien (math, DocLink),
  un DocLink bascule + surligne, le Tour démarre (Ctrl+J),
  l'overlay s'ouvre (Ctrl+K).

## Hors scope

- Contenu doc (writer). Tu ne touches `about.md` que pour le
  numéro de version.
- Nouvelles features. C'est une release de clôture, pas de dev
  fonctionnel.

## Livraison

- Push sur `origin/main`.
- Compte-rendu : version effective, build/lint, et confirmation du
  smoke test (onglet Doc, DocLink, Tour, overlay fonctionnels).

Bon vent — c'est la livraison de l'itération.
