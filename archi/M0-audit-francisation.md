# Audit francisation — Iteration M, préalable B

> Inventaire des libellés UI **user-facing en anglais** + termes gardés, en vue
> de la centralisation dans `src/lib/strings.js` (graine i18n) et de
> l'application des traductions claires.
>
> Constat global : **l'app est déjà ~99 % en français.** Les reliquats EN sont
> concentrés (transport Play/Stop, presets de formes d'onde, libellés ADSR,
> Mute/Solo, toggles Live/Peak, « root »). Plus le renommage d'onglets
> **mandaté par le prompt** : Designer→Création, Composer→Composition, qui
> ricoche dans une dizaine de phrases FR.

## Légende des catégories

- `traduire` — équivalent FR clair et non ambigu → traduit en phase 0b SC2.
- `garder-acronyme` — acronyme standard conservé (ADSR/AHDSR, BPM, Hz, A4, dB,
  kHz, DFT, FFT, TET, WAV, X-EDO).
- `garder-patch` — le mot « patch » (ancré culture synthé, décision archi).
- `à arbitrer` — **reste EN**, l'archi tranchera (petit follow-up). 1-2 options
  proposées.

---

## ✅ ARBITRÉ (décision archi, 2026-05-29) — appliqué

| Terme | Décision |
|---|---|
| Play / Stop | **Lire / Arrêter** (aligne le bouton sur son tooltip) |
| Export… | **Exporter…** (Import déjà « Importer ») |
| Spectro | **conservé** (abrév. FR de Spectrogramme) |
| Test | **Tester** (verbe, cohérent « banc de test ») |
| Solo | **conservé** (mot FR, paire avec Sourdine) |
| Peak | **Crête** (terme audio FR) |
| OK | **conservé** (standard UI FR) |
| Canvas vide | **Zone de dessin vide** |
| Live | **Direct** (paire avec Statique) |
| Hold (AHDSR) | **Tenue** (révisé 2026-05-30 — libère « Maintien » pour Sustain) |
| Sustain (AHDSR + pédale Espace) | **Maintien** (révisé 2026-05-30, ex-« Soutenir ») |

> Section ci-dessous conservée pour mémoire (états avant arbitrage).

## ⚠️ À ARBITRER — historique (résolu, cf. ci-dessus)

| Terme | Où | Options proposées | Note |
|---|---|---|---|
| `Play` / `Stop` (transport) | Toolbar.jsx:66 (aria) + :69 (label) ; App.jsx:2137 (aria) ; MiniPlayer.jsx:30 (aria) | Lire / Arrêter — ou conserver Play/Stop (jargon audio) | Incohérence à noter : les `title` voisins sont **déjà FR** (« Lire la composition » / « Arrêter la lecture »), seuls les `aria-label`/labels sont EN |
| `Sustain` | WaveformEditor.jsx:1869 (pastille), 2067 (slider) ; libellés ADSR | Sustain (conservé) / Tenue / Maintien | « Sustain » très ancré en synthé ; Attack/Decay/Release ont un FR clair, pas Sustain |
| `Spectro` | WaveformEditor.jsx:1602 (toggle) | Spectro (abrév.) / Spectrogramme | Abréviation, lisible en FR |
| `Test` | WaveformEditor.jsx:1804 (bouton mode libre) | Test / Tester | |
| `Solo` | Timeline.jsx:1221 (title) | Solo (conservé) / Isoler | Souvent conservé en MAO |
| `Live` / `Peak` | Spectrogram.jsx:449 / 461 (boutons + titles) | Live→Direct / En direct ; Peak→Pics / Crête | |
| `OK` | ConfirmDialog.jsx:8 ; DeleteUsageWarningDialog.jsx:52 | OK (conservé, conventionnel FR) | |
| `Export…` (état en cours) | Toolbar.jsx:269 | Export… / Exportation… | L'état repos « Exporter WAV » est déjà FR |
| `Canvas vide` | WaveformEditor.jsx:1092, 1123 (flash) | Tracé vide / Toile vide | Seul « Canvas » est EN |
| `root` (fil d'Ariane Bibliothèque) | BibBreadcrumb.jsx:92 | Racine | **Couplé** : `parsePath` (ligne 27) n'accepte que `'root'` ; traduire l'affichage exige d'étendre le parser (sinon l'édition de chemin casse) → traité avec garde additive, cf. SC2 |
| `On_Synth_App` | Tabs.jsx:27 ; TooSmallGate.jsx | Conserver (nom de marque) | Marque produit, pas un libellé à traduire |

---

## ✅ À TRADUIRE (traductions claires — phase 0b SC2)

### Onglets (mandaté par le prompt §spec)

| fichier:ligne | EN | FR | catégorie |
|---|---|---|---|
| Tabs.jsx:13 | `Designer` (label onglet) | **Création** | traduire |
| Tabs.jsx:14 | `Composer` (label onglet) | **Composition** | traduire |

Références en prose à ces onglets (à aligner pour cohérence, accord d'article) :

| fichier:ligne | EN (extrait) | FR |
|---|---|---|
| PatchBank.jsx:728 | `…clip(s) du Composer` | …clip(s) de la Composition |
| PatchBank.jsx:1326 | `…dans l'onglet Designer.` | …dans l'onglet Création. |
| PatchBank.jsx:1331, 1421 | `…utilisés dans le Composer…` | …utilisés dans la Composition… |
| PatchPicker.jsx:192 | `Éditer dans Designer` | Éditer dans Création |
| DeleteUsageWarningDialog.jsx:35 | `…dans le Composer :` | …dans la Composition : |
| DeleteUsageWarningDialog.jsx:51 | `Voir dans le Composer` | Voir dans la Composition |
| Timeline.jsx:1665 | `…éditer dans Designer…` | …éditer dans Création… |
| Toolbar.jsx:89 | `…sélecteur du Designer.` | …sélecteur de la Création. |
| App.jsx:2223 | `…panneau latéral du Designer` (aria) | …panneau latéral de la Création |
| ShortcutsReference.jsx:16,18-20,77 | sections `Designer`/`Composer` | Création / Composition |

### Forme d'onde / éditeur (Designer)

| fichier:ligne | EN | FR | catégorie |
|---|---|---|---|
| App.jsx:2241 | `Waveform` (titre zone accordéon) | Forme d'onde | traduire |
| WaveformEditor.jsx:1586 | `Waveform` (titre h3) | Forme d'onde | traduire |
| WaveformEditor.jsx:1608 | `Sine` (preset) | Sinusoïde | traduire |
| WaveformEditor.jsx:1609 | `Square` (preset) | Carrée | traduire |
| WaveformEditor.jsx:1610 | `Sawtooth` (preset) | Dent de scie | traduire |
| WaveformEditor.jsx:1611 | `Triangle` (preset) | Triangle | traduire (identique) |
| WaveformEditor.jsx:1612 | `Clear` (bouton) | Effacer | traduire |
| WaveformEditor.jsx:2152 | `Attack` (slider + aria « …en millisecondes ») | Attaque | traduire |
| WaveformEditor.jsx:2153 | `Hold` (slider + aria) | Tenue (révisé) | traduire |
| WaveformEditor.jsx:2154 | `Decay` (slider + aria) | Déclin | traduire |
| WaveformEditor.jsx:2156 | `Release` (slider + aria) | Relâchement | traduire |
| WaveformEditor.jsx:108-109 | tooltips poignées `Attack + Amplitude` / `Hold` / `Decay + Sustain` / `Release` | Attaque + Amplitude / Tenue / Déclin + Maintien / Relâchement | traduire |

### Composition (timeline)

| fichier:ligne | EN | FR | catégorie |
|---|---|---|---|
| Timeline.jsx:1215 | `Mute` (title, état non-muet) | Mettre en sourdine | traduire (Mute→Sourdine, mandaté) |
| Timeline.jsx:1215 | `Unmute` (title, état muet) | Réactiver le son | traduire |

### Bibliothèque

| fichier:ligne | EN | FR | catégorie |
|---|---|---|---|
| SavePatchDialog.jsx:172, 190 | `root` (fil d'Ariane + item dropdown — affichage pur, `folderId=null`) | Racine | traduire |

---

## 🔒 À GARDER (dans le module pour graine i18n complète, sans changement d'affichage)

| Terme | Exemples d'emplacements | catégorie |
|---|---|---|
| `ADSR` / `AHDSR` | WaveformEditor (titre « Enveloppe AHDSR ») | garder-acronyme |
| `BPM` | Toolbar | garder-acronyme |
| `A4` | Toolbar | garder-acronyme |
| `Hz`, `kHz`, `dB` | Toolbar, PropertiesPanel, Spectrogram | garder-acronyme |
| `DFT`, `FFT`, `TET`, `X-EDO`, `WAV` | divers | garder-acronyme |
| `patch` / `patches` | PatchBank, PropertiesPanel, dialogs, ImportModal | garder-patch |

---

## Couverture & méthode

Audit par 6 passes parallèles sur : App.jsx · WaveformEditor.jsx ·
PatchBank/PatchPicker/RecentPatchesList/SavePatchDialog · Timeline/Toolbar/
PropertiesPanel · (Tabs + 14 inputs/petits chromes) · (PianoKeyboard/Spectrogram/
GridXEdoLayout + 9 dialogs/overlays).

Fichiers **sans** reliquat EN user-facing : PianoKeyboard, GridXEdoLayout,
A4Input, BpmInput, XEdoInput, FreqInput, NumberInput, ShortLabelSelect,
DurationButtons, BibContextMenu, Toast, ExportModal, ImportModal (hors « patch »),
Modal, ShortcutsOverlay, RecentPatchesList, resizers, TooSmallGate, Tour
(nav déjà FR : Précédent/Suivant/Quitter/Visite terminée), DocumentationTab.

Hors scope (non audités pour traduction) : corpus doc, textes du tour, glossaires
(domaine writer, déjà FR).
