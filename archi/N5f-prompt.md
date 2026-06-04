# Prompt dev — Itération N · Phase 5f : nouveaux timbres paramétriques + renommage

**Type** : `feat(iter-N/phase-5f)`. Ajoute 7 nouvelles **formes de base
paramétriques** (chacune avec un *paramètre de forme* en plus du N harmonique) +
renomme la modale « Presets » → « Timbres ». 3 sous-commits.

S'appuie sur le moteur N.5b (`waveforms.js`) et la modale N.5c (`PresetPicker`).

## Modèle (rappel)

Chaque forme a la dualité **idéale** (brute) / **band-limitée** (à N). Les
nouvelles formes ont en plus **1 ou 2 paramètres de forme** éditables (nb de
marches, rapport cyclique, etc.), à côté du N. Les 2 vignettes se redessinent en
live sur changement de param **ou** de N.

---

## Sous-commit 5f.1 — renommage « Presets » → « Timbres »

Remplacer le libellé de la modale (`STRINGS.timbrePresets.pickerTitle` et tout
libellé « Presets » visible : bouton d'ouverture, titres) par **« Timbres »**.
Pas de changement fonctionnel.

---

## Sous-commit 5f.2 — moteur paramétré (`waveforms.js`)

Généraliser `idealWaveform(type, params)` (params = objet de valeurs). Ajouter les
7 cas ci-dessous. `t = i / RES`, `t ∈ [0,1)`. Convention `points` du projet
(centré, non clampé — laisse dépasser ±1, le marqueur/normalisation gèrent).

| Forme | Param(s) (défaut) | Formule idéale |
|---|---|---|
| **escalier** | K marches (4), 2..16 | `s=min(K-1, floor(t*K))` ; `v=1-2*s/(K-1)` |
| **scie-etages** | K marches (4), 2..16 | **candidat** : `s=floor(t*K)`, `f=t*K-s`, `h=2/(K-1)` ; `v=(1-2*s/(K-1)) + (f-0.5)*h` (marche inclinée centrée sur le niveau, saut entre marches). **À ajuster à l'œil.** |
| **sinus-decr** | K cycles (4) 1..16 ; r ratio (0.5) 0..1 | `s=floor(t*K)`, `ph=(t*K-s)*2π` ; `v = r**s * sin(ph)` |
| **pulse** | duty (0.25), 0.05..0.95 | `v = t < duty ? 1 : -1` |
| **trapeze** | bord (0.1), 0..0.25 | triangle clampé : `tri=1-4*abs(((t+0.25)%1)-0.5)` ; `g=1/max(1e-3, 1-4*bord)` ; `v=clamp(g*tri, -1, 1)` (bord→0.25 = triangle ; bord→0 = carré). **Ajuster à l'œil.** |
| **demi-sinus** | (aucun) | `v = max(0, sin(2π t))` (demi-redressé ; DC ignoré par createPeriodicWave) |
| **impulsion** | largeur (0.05), 0.02..0.2 | doublet bipolaire : `v=+1` si `t<largeur` ; `v=-1` si `largeur≤t<2*largeur` ; sinon `0` |

Notes :
- `idealWaveform` sans params (ou pour sine/square/saw/triangle) garde le
  comportement actuel. **Rappel N.5e : `sawtooth = 1 - 2*t`** (phase +sin).
- `bandlimitedWaveform(type, N, params)` = `bandlimitWaveform(idealWaveform(type,
  params), N)` normalisé top=1 (inchangé, juste le passage de `params`).
- **`BASE_WAVEFORMS`** : chaque entrée décrit ses params de forme :
  `params: [{ key, label, min, max, default, step }]` (0, 1, ou 2). `anchorCount`
  par forme — pour escalier/scie-étages, **le faire suivre K** (ex.
  `min(SPLINE_ANCHOR_MAX, 2*K)`) ; sinon défaut ~8.

---

## Sous-commit 5f.3 — modale : paramètres de forme + section dédiée

- Nouvelle sous-section **« Formes paramétriques »** (après « Formes de base »,
  avant « Timbres »/« Inattendus ») : escalier, scie à étages, sinus décroissante,
  pulse, trapèze, demi-sinus, impulsion.
- Pour chaque forme paramétrique : **contrôle(s) du/des param(s) de forme**
  (number input ou slider, bornés/snappés selon `params`) **+ le champ N** déjà
  en place, **+ 2 vignettes** (idéale | band-limitée). La vignette **idéale** suit
  les params de forme ; la **band-limitée** suit params **et** N ; redraw **live**.
  (sinus décroissante a **2** contrôles de forme : K et r.)
- Clic sur une vignette = charge cette vue avec les params/N courants (via
  `LOAD_PRESET`, comportement N.5e : pas de confirmation, conserve `currentPatchId`,
  ancres DP à `anchorCount`).
- CSS : cartes un peu plus hautes pour loger les contrôles ; thème clair/sombre OK.

---

## Vérifications

- Escalier : K=2 ≈ carré ; K grand → escalier descendant. Marches visibles, ancres
  DP bien posées (suivent K).
- Scie à étages / trapèze : formes inventées → **on valide à l'œil**, j'ajuste les
  formules avec toi si besoin (escalier incliné lisible ; trapèze bord→0 = carré,
  bord→0.25 = triangle).
- Sinus décroissante : r=1 → sinus pur à K×f0 ; r→0 → burst ; live sur K et r.
- Pulse : duty≠0.5 → harmoniques paires apparaissent (vérifiable dans la zone
  Harmoniques) ; duty=0.5 = carré.
- Impulsion : doublet bipolaire, spectre quasi plat à faible largeur.
- Demi-sinus : hump positif + plat.
- Renommage « Timbres » partout.
- Chargement = comportement N.5e (pas de confirmation, reste sur le patch).
- `npm run build && npm run lint && npm run typecheck` verts ; thème OK.
- MAJ `CONTEXT.md` + backlog. Commits `feat(iter-N/phase-5f.{1,2,3}): …`, push.

## Hors scope

- N.4 (lissage), N.6 (durcissements).
