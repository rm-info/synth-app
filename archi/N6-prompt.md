# Prompt dev — Itération N · Phase 6 : durcissements (TS reducer + refonte auto-sizing)

**Type** : `feat/fix(iter-N/phase-6.x)`. Dernière phase de l'itération N. Deux
sujets indépendants.

---

## Sous-commit 6.1 — `// @ts-check` sur `src/reducer.js` (approche « mesure puis plafonne »)

**Contexte** : `reducer.js` n'a pas de `// @ts-check` (checkJs:false global) → il
est **non type-checké**. Un oubli type `DEFAULT_EDITOR.points` (propriété retirée)
n'est pas attrapé. On opte ce fichier dans la vérification.

**Démarche** :
1. Ajouter **`// @ts-check`** en tête de `reducer.js` et typer la fonction
   reducer `(State, Action) => State` via les types de `src/types.ts` (JSDoc
   `@param {import('./types').State}` / `@param {import('./types').Action}` /
   `@returns`). Le `switch (action.type)` doit **narrower** l'union discriminée
   `Action` (chaque case voit son `payload` typé).
2. Lancer `npm run typecheck` et **rapporter le nombre d'erreurs** surgies.
3. **Corriger les vrais bugs** : accès à des propriétés inexistantes (TS2339),
   shapes de payload incohérents, retours mal formés. C'est la valeur du fix.
4. **Plafonnement** : si un **gros résidu de bruit** subsiste (annotations
   manquantes sans bug réel), ne pas s'enliser — annoter/`@ts-ignore` ciblé le
   résiduel **en le signalant**, et renvoyer la finition au backlog « Migration
   TypeScript progressive ». La clôture de N ne doit pas être prise en otage par
   un slog de typage.

**Note** : « strict » par fichier n'existe pas ; `@ts-check` vérifie au strict:false
global, ce qui suffit pour la classe de bug visée (accès propriété). Le `strict:true`
global = migration séparée (backlog).

**Vérif** : `DEFAULT_EDITOR.points` (ou équivalent) serait désormais une erreur ;
nombre d'erreurs avant/après rapporté ; `npm run typecheck` vert (ou résiduel
annoté + documenté).

---

## Sous-commit 6.2 — Refonte du groupe de dimensionnement (auto-sizing gardé)

On garde l'auto-sizing mais on l'intègre dans un **groupe radio cohérent** avec
les 4 presets de proportions (`COLUMN_PRESETS` dans `DesignerToolbar`).

### Style
- Remplacer le toggle checkbox AUTO (`designer-toolbar-auto-toggle`) par un
  **bouton de même style que les presets** (`designer-toolbar-preset-btn`, mêmes
  dimensions), contenant un **SVG qui écrit « AUTO »** (nouveau composant
  type `IconAuto`, même cadre que `IconColumnLayout` mais texte au lieu des
  séparations). SVG `<text>`, pas d'Unicode-icône (convention projet).
- **État actif** : appliquer la **coloration active des boutons radio live/dB/peak
  du Spectrogramme** (M.r.2.6.7 — réutiliser la même classe pour la cohérence) au
  bouton **actif** parmi les **5** (4 presets + AUTO).

### État actif = dérivé (pas de nouvel état persisté)
- `autoSizing === true` → **AUTO** actif.
- sinon, le preset dont les `widths` **égalent** `designerColumnWidths` (compare
  avec epsilon) → ce preset actif.
- sinon (drag manuel = proportions custom) → **aucun** actif.

### Comportement (radio + custom)
- **Clic sur un preset** : `setAutoSizing(false)` **puis** `onWidths(preset.widths)`
  → ce preset devient actif, AUTO se désactive.
- **Clic sur AUTO** : bascule `autoSizing`. À l'activation → redimensionne (effet
  existant) ; à la désactivation → rien ne bouge (les widths restent ; l'actif
  devient le preset correspondant s'il y en a un, sinon aucun).
- **Drag manuel d'un séparateur** (`DesignerColumns`) : `setAutoSizing(false)` au
  début du drag → AUTO (ou le preset) se désactive, proportions custom = aucun actif.

**Point d'implémentation clé** : `onWidths` est appelé **à la fois** par le
redimensionnement auto (effet) **et** par les actions manuelles. Ne PAS mettre le
`setAutoSizing(false)` dans `onWidths` (sinon l'auto se couperait lui-même) —
le mettre **aux call-sites manuels** (clic preset, début de drag). L'effet
auto-resize continue d'appeler `onWidths` seul.

### Vérif
- Clic preset → highlight sur ce preset, AUTO éteint, colonnes à ces proportions.
- Clic AUTO → highlight AUTO, redimensionne ; re-clic → s'éteint, rien ne bouge.
- Drag manuel → plus aucun highlight (custom), AUTO/preset éteint.
- Un seul bouton actif à la fois ; la coloration = celle de live/dB/peak.
- `designerColumnWidths` et `autoSizing` restent persistés (rien de nouveau).

---

## Global

- `npm run build && npm run lint && npm run typecheck` verts.
- MAJ `CONTEXT.md` + backlog. Commits `feat/fix(iter-N/phase-6.{1,2}): …`, push.
- **C'est la dernière phase de l'itération N** — après validation, on fera la note
  de clôture (résumé iter-N, MAJ CONTEXT, éventuel bump de version).
