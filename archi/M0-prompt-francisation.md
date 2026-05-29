# Prompt — Iteration M, préalable B : francisation des libellés (chaînes centralisées)

> Spec de référence : `docs/superpowers/specs/2026-05-29-waveform-designer-design.md` (§8).
> À faire **avant M.2** (qui introduira de nouveaux libellés : Forme d'onde /
> Harmoniques / Spectro / modes…) pour qu'ils naissent cohérents.

## Contexte

L'app est en français mais des termes anglais traînent par-ci par-là. On
normalise **en français**, via des **chaînes centralisées** (un seul module),
ce qui *sème* l'i18n futur sans l'implémenter. Ce prompt ne touche **ni** le
comportement, **ni** l'audio, **ni** les clés persistées — uniquement
l'affichage.

## Spec — découpage en sous-commits

### Sous-commit 1 — Audit + infra de centralisation

- **Audit** : recenser tous les libellés UI **user-facing en anglais** (onglets,
  header, toolbars, menus contextuels, dialogs/popups, boutons, `title=`
  tooltips, `placeholder`, `aria-label`). Produire un inventaire dans
  `archi/M0-audit-francisation.md` : `fichier:ligne` · texte EN actuel · FR
  proposé · catégorie (`traduire` / `garder-acronyme` / `garder-patch` /
  **`à arbitrer`**).
- **Infra** : centraliser les chaînes user-facing dans **un module unique**
  (ex. `src/lib/strings.js`), clés sémantiques → texte FR. Pattern simple
  (objet/map), **pas de lib i18n**, pas de sur-architecture — mais structuré
  pour qu'un jour `fr` / `en` cohabitent. **Inclure aussi les termes gardés**
  (ADSR, patch…) dans le module, pour que la graine i18n soit complète.
- Les composants consomment les **clés**, plus les littéraux.
- Tag : `refactor(iter-M/phase-0b): centralisation des libellés UI`.

### Sous-commit 2 — Application des traductions claires

- **Traduire** (liste connue, non exhaustive — complète depuis l'audit) :
  Designer→**Création**, Composer→**Composition**, Undo→**Annuler**,
  Redo→**Rétablir**, Mute→**Sourdine**, waveform→**Forme d'onde**, et tous les
  libellés EN dont l'équivalent FR est établi et non ambigu.
- **Garder tel quel** (+ glose au glossaire de doc, *pas* dans l'UI) : les
  acronymes standards **ADSR, BPM, Hz, A4, DFT, FFT**, et **« patch »** (ancré
  dans la culture synthé — décision archi).
- **NE PAS deviner les cas ambigus** : tout terme dont la traduction FR n'est
  pas évidente, ou qui risque de gêner les habitués, reste **en l'état (EN)**,
  catégorisé `à arbitrer` dans l'audit, avec 1-2 options proposées. L'archi
  tranchera ensuite (petit follow-up). Exemples probables à flaguer plutôt qu'à
  trancher : `Solo` (souvent gardé tel quel), `Sustain`, `Preset`, les modes de
  vue Bibliothèque (`List`/`Details`/`Tiles`), `Sidebar`, etc.
- Tag : `feat(iter-M/phase-0b): libellés FR (traductions claires)`.

## Comportement attendu

- Libellés FR cohérents partout où la traduction est claire ; les cas `à
  arbitrer` restent EN en attendant l'archi (ne PAS bloquer dessus).
- **Zéro changement fonctionnel / audio.**

## Hors scope — ⚠️ important

- **NE PAS toucher** aux **clés localStorage**, identifiants techniques, valeurs
  persistées, `data-anchor`, `type` d'actions du reducer, ids de patches/clips.
  On ne renomme **que l'affichage**, jamais les clés (sinon on casse la
  persistance et les ancres).
- **NE PAS renommer** les noms de **fichiers/composants** dans le code
  (`Designer.jsx`, `Composer.jsx`…) — seulement les **libellés affichés**. Le
  renommage de code est du churn hors scope.
- **i18n complet / multilingue** : hors scope (juste FR + l'infra de
  centralisation). Pas de lib i18n externe.
- **Contenus longs** (articles de doc, textes du tour guidé, glossaires) : hors
  scope — déjà FR et domaine du writer. On ne touche que le *chrome* UI.

## Règles techniques

- Couvrir : onglets, header (boutons d'aide, version), toolbars Designer /
  Composer / Bibliothèque, menus contextuels, dialogs (Save/Delete/Import…),
  tooltips `title=`, `aria-label`, `placeholder`.
- Vérifier après coup : `npm run build` OK, `npm run typecheck` OK (si le script
  a été ajouté), pas de régression visuelle. Ne pas toucher au serveur dev.
