# Handoff — M rattrapage (état au 2026-06-01)

> Fichier opérationnel pour reprendre le travail après un clear de contexte.
> À supprimer une fois la reprise effectuée et le travail relancé.

## TL;DR pour reprise

L'archi (toi) sortait d'une longue session de brainstorming + livraisons
d'iteration M (waveform). On a vécu une **passe d'usage utilisateur** qui a
révélé que le modèle livré (M.1 → M.4) est artificiellement siloté.
Décision : **pivot vers un rattrapage** avant la rédaction de la doc M.5b.

**La spec rattrapage est écrite et commitée :**
`docs/superpowers/specs/2026-06-01-waveform-rattrapage-design.md`.

Elle couvre tout. À la reprise : lire la spec puis attaquer le découpage en
prompts dev.

## État de l'itération M

### Livré et validé

| Phase | Statut | Notes |
|---|---|---|
| M.0 (préalables TS + francisation) | ✅ | TS Phase 0+1 + chaînes centralisées + script typecheck |
| M.1 | ✅ | Bump cap 128→256 + slider Définition |
| M.2 + follow-up snap-on-convert | ✅ | Layout 3 colonnes + patch typé + barres + passerelle + auto-sizing toggle (option) |
| M.2-AS | ✅ | Toggle auto-sizing (essai), **kept** suite passe d'usage |
| M.3 | ✅ | Mode spline (Catmull-Rom doux / polyligne anguleux, périodique) |
| M.4.0 + M.4 | ✅ | `HARMONIC_N_MIN` 16→4 + 12 presets + UI chargement |
| M.5a | ✅ | Extension renderer `\sum` à bornes empilées |

### À faire

- **M.r.1 → M.r.5** : rattrapage, voir spec §9.
- **M.5b** : passe doc writer, **après** le rattrapage (sur modèle stable).

## Triage des bugs / observations utilisateur (session pivot)

Trois items remontés, tous absorbés ou résolus dans la spec rattrapage :

1. **Conversion draw→harmonique change visuellement la forme**
   (phase abandonnée) → résolu par la **courbe normalisée en background +
   bouton Normaliser** (spec §4.2, §4.3, §5.1). Pas besoin de fix séparé.
2. **Bouton Preset cassé dans Harmoniques** (modale s'ouvre mais ne charge
   pas) → absorbé par le **dropdown unifié dans la barre du haut**
   (spec §5.1). Le chemin de code disparaît.
3. **Affichage waveform dégueulasse après conversion spline→autre** →
   absorbé par la disparition des conversions + la **règle d'hygiène
   canvas** (spec §8). À faire respecter dans les phases M.r.*.
4. **Signal qui dépasse ±1 en additif** → arbitré (option 1) :
   **auto-fit Y + marqueur pointillé ±1**. Spec §7.

## Décisions de design clés actées dans la spec

- **Une seule courbe canonique** 600 points, trois lentilles vivantes
  (Forme d'onde / Harmoniques / Spectro), **plus de mode discriminé**.
- **Pas de conversion entre lentilles** sauf un cas : éditer une barre
  exige normalisation préalable (dialog).
- **Préservation du résidu** au drag d'ancre (les détails fins du tracé
  survivent à l'édition spline).
- **`cap` unifié** (1..256) remplace `definition` + `N`. UI unique dans le
  header de la zone Harmoniques. **Hors AHDSR** (qui est un autre concept,
  l'enveloppe d'amplitude).
- **Courbe normalisée en arrière-plan** dans Forme d'onde (gris discret),
  pédagogique.
- **UI réorganisée** : barre du haut avec nom + presets dropdown + Reset +
  Normaliser + séparateur + proportions/auto-sizing. Headers de zones
  avec contrôles spécifiques inline (switches).
- **Migration localStorage et `.osa`** : conversion automatique des trois
  anciens types vers le nouveau modèle (spec §3.3).

## Workflow opérationnel — rappels

- **Multi-agents** : archi (toi) ↔ dev (lokal) ↔ writer (lokal). Communication
  par l'utilisateur qui relaye. Tu rédiges des prompts-fichiers dans
  `archi/`, tu maintiens `archi/BACKLOG.md` et `CONTEXT.md` à jour. Tu ne
  touches PAS au dev server (mémoire `feedback-dev-server-hands-off`).
- **Cadence** : tu écris un prompt → l'utilisateur le transmet au dev → dev
  livre + reporte → tu valides + écris le suivant. Boucle.
- **Commits** : `type(iter-M/phase-N.M): description`. L'utilisateur push
  explicitement (pas d'auto-push, demande-lui à chaque fois).
- **Mémoire** : la note `user-audio-core-conceptual-support.md` est posée —
  l'utilisateur bute sur le DSP, vulgariser + exemples concrets + maths
  exactes en parallèle.
- **Spec rattrapage** : `docs/superpowers/specs/2026-06-01-waveform-rattrapage-design.md`.
  C'est ta source de vérité pour les phases M.r.*.

## Prochain prompt à rédiger

**`archi/Mr1-prompt.md` — M.r.1 : nouveau modèle Patch (canonical + cap +
anchors + residual) + migration + hygiène canvas posée.**

Phase la plus structurante du rattrapage. Cf. spec §3 (modèle), §3.3
(migration), §6 (cap unifié), §8 (hygiène canvas). À découper en
sous-commits clairs :

1. Définition du nouveau `Patch` dans `src/types.ts`, dropping de l'union
   discriminée.
2. Refactor reducer : nouvelles actions (`SET_EDITOR_CAP` remplace
   `SET_EDITOR_DEFINITION` + `SET_EDITOR_N`), suppression des
   `CONVERT_EDITOR_TO_*`.
3. Migration hydratation localStorage + `.osa`.
4. Suppression du champ `mode` discriminé, du verrouillage 🔒 (mais sans
   ré-câbler encore la coexistence des lentilles — M.r.3).
5. Règle d'hygiène canvas posée (utilitaires `withSavedCtx` ou
   équivalent dans `src/lib/canvas.js` si besoin, à utiliser dans les
   composants existants).

Hors scope M.r.1 : la réorganisation UI (M.r.2), les lentilles vivantes
(M.r.3), la courbe normalisée (M.r.4), la convention d'amplitude (M.r.5).

## Conseil de reprise

Au prochain run, l'utilisateur dira probablement « on reprend M
rattrapage ». Tu lis ce fichier + la spec, tu vérifies l'état git
(`git log --oneline -5` et le dernier commit doit être l'écriture de la
spec et de ce handoff), puis tu attaques `Mr1-prompt.md`.
