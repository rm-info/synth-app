# Prompt — Iteration M, Phase M.5a : extension renderer math — `\sum` à bornes empilées

> Spec de référence : `docs/superpowers/specs/2026-05-29-waveform-designer-design.md` (§9).
> **Phase courte et focalisée.** Prérequis pour M.5b : le writer doit pouvoir
> poser la DFT (`X_k = Σ_{n=0}^{N-1} x_n · e^{-i 2π k n / N}`) avec ses bornes
> **empilées sous/dessus le Σ en mode display** — c'est la condition pour
> rester fidèle au critère « formules comme au tableau » qu'on tient depuis
> l'iter-L.

## Contexte

L'iter-L (phase L.R) a posé l'infrastructure math du renderer maison :
délimiteurs `$…$` inline / `$$…$$` block, exposants `^{x}`, indices `_{x}`,
fractions `\frac{a}{b}`, ~12 symboles Unicode (`\pi`, `\alpha`, etc.),
italique auto sur lettres latines isolées, délimiteurs extensibles `( )` `[ ]`.

L.R avait **exclu** `\sum` (ainsi que `\prod`, `\int`, matrices, vecteurs) de
son périmètre. M.5a réintègre **uniquement `\sum`**, parce que la DFT est la
seule formule du corpus M.5b qui en ait besoin. Le reste reste hors scope.

## Découpage en sous-commits

### Sous-commit 5a.1 — Parser

- `src/lib/mathParse.js` : reconnaître `\sum` comme un **opérateur à bornes**.
- Quand `\sum` est suivi de `_{…}` et/ou `^{…}` (dans **n'importe quel
  ordre**), attacher ces groupes comme bornes basse / haute.
- Construire un nœud AST `{ type: 'sum', lower, upper }` où `lower` et
  `upper` sont des sous-AST récursifs (réutilise la machinerie de `_{}` /
  `^{}` existante pour le contenu des accolades) — ou `null` si absent.
- `\sum` **seul** (sans bornes attachées) → rendu Σ littéral, c'est OK.
- Comportement gracieux préservé : `\sum` mal formé (ex. `\sum_` sans accolade
  derrière) → rendu littéral + warn dev, **pas de crash** (cohérent avec le
  reste du renderer).
- Tag : `feat(iter-M/phase-5a.1): parser \\sum avec bornes`.

### Sous-commit 5a.2 — Renderer + CSS

Le mode (inline `$…$` vs block `$$…$$`) doit voyager jusqu'au renderer math.
Si ce contexte `displayMode: boolean` n'est pas déjà propagé dans
`markdown.js`, l'ajouter (c'est *la* info dont le renderer math a besoin pour
choisir son layout).

- **Inline** : Σ avec ses bornes en **sub/sup à droite**, compact (mêmes
  primitives que `^{}` / `_{}` existants sur un atome ordinaire).
- **Display (block)** : **grille CSS** — borne haute centrée *au-dessus* du
  Σ, borne basse centrée *en-dessous*, Σ au centre. Une seule classe dédiée
  (`.math-sum-display` ou nom équivalent) suffit. Le Σ peut être légèrement
  plus grand en display (cosmétique mais fidèle au « comme au tableau »).
- Tag : `feat(iter-M/phase-5a.2): rendu \\sum (sub/sup inline, empilé display) + CSS`.

## Comportement attendu

| Source | Mode | Rendu |
|---|---|---|
| `$\sum_{n=0}^{N-1} x_n$` | inline | Σ avec `n=0` en sub, `N-1` en sup à droite |
| `$$X_k = \sum_{n=0}^{N-1} x_n \cdot e^{-i 2\pi k n / N}$$` | block | Σ avec `n=0` en-dessous, `N-1` au-dessus, équation centrée |
| `$\sum$` | inline | Σ seul |
| `$\sum_{i \in S}$` | inline | Σ avec borne basse seule |
| `$\sum_x` (mal formé : `_` sans accolade) | inline | rendu littéral + warn |

## Hors scope

- `\prod`, `\int`, matrices, `\begin{…}` — restent hors scope. Si M.5b en
  réclame plus tard, ce sera une phase distincte.
- Personnalisation typographique avancée (couleurs, alignement custom des
  bornes).
- Animation.

## Règles techniques

- L'AST `sum` est un nœud compact ; éviter de le surcharger.
- La propagation `displayMode` du parser markdown jusqu'au renderer math :
  c'est *la* primitive qu'on pose ici et qui pourrait servir à un futur
  `\frac` taillé différemment en display si on voulait. Pour M.5a, ne l'utiliser
  que pour `\sum` — pas de refonte des autres rendus.
- Vérification de rendu : la voie la plus simple est de tester localement en
  ajoutant temporairement un cas DFT à un article existant qui *parle* déjà de
  la DFT (vraisemblablement « Limites connues » ou un « Comprendre »). Si
  aucun ne s'y prête sans dénaturer son contenu, **sauter cette étape** —
  M.5b s'en chargera de toute façon.
- Build / typecheck / lint OK.
- CONTEXT.md : Composants (mention de l'extension `\sum`), Historique, Roadmap
  M.5a cochée.
