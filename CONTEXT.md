# CONTEXT.md — Synth App

> Document maintenu automatiquement par Claude Code. Mis à jour à chaque fin de phase.
> Coller en début de session pour briefer un nouveau modèle/contexte.

## TL;DR

Synth App — synthétiseur web pédagogique. On **dessine une forme d'onde**
(librement, par ancres/spline, ou via ses **harmoniques**), on la **place sur
une timeline multipiste**, on **exporte en WAV**. Quatre onglets :
Bibliothèque · Designer · Composer · Documentation.

**Stack minimale (non négociable)** : React 19 + Vite + Web Audio API native,
persistance localStorage (clé `synth-app-state`). **TypeScript incrémental**
(allowJs, opt-in fichier par fichier, depuis le préalable de l'iter M). Pas de
lib audio, pas de state manager (un `useReducer` global dans `App.jsx`), pas de
framework UI (CSS manuscrit), pas de routing, pas de backend.

**Version courante : v1.11.0** (2026-06-09).

**Itérations livrées** (détail complet dans `CONTEXT-ARCHIVE.md`) :

| It. | Sujet | Clôture |
|-----|-------|---------|
| A | Refonte UX core (2 onglets, dual save, zoom %, édition clips, undo/redo) | 2026-04-15 |
| B | Édition avancée (multi-sélection, copier/coller, spectro statique) | 2026-04-17 |
| C | Multipiste (mute/solo/volume, scheduler look-ahead) | 2026-04-18 |
| D | Designer UX (`tuningSystem`, clavier piano, sélecteur d'octave) | 2026-04-19 |
| E | Patches vs Notes (la hauteur passe du patch au clip) | 2026-04-22 |
| F | Multi-tempérament (Tier 1+2+3 : microtonal, gamelan, maqâm, shrutis…) | 2026-04-25→ |
| G | Designer UX (layout, dropdowns groupés) | 2026-05-20 |
| H | Import/Export (`.osa` = magic `OSA2` + gzip(JSON) versionné) | 2026-05-21 |
| I | Spectrogramme avancé | 2026-05-24 |
| J | Anti-aliasing audio (DFT truncation) | 2026-05-24 |
| K | Bibliothèque multi-mode + 3 sous-apps + thème clair/sombre | 2026-05-26 |
| L | Documentation (onglet + Raccourcis Ctrl+K + Tour Ctrl+J) — v1.4.0 | 2026-05-28 |
| M | Waveform Designer : modèle canonique unifié + 3 lentilles + patch typé — v1.5.0 | 2026-06-03 |
| N | Stabilité & fluidité : édition d'ancres refondue (warp 2D), presets « Timbres » (vues idéale/band-limitée + formes paramétriques), lissage, durcissements — v1.6.0 | 2026-06-04 |
| O | Ergonomie & responsive Designer : steppers, OverflowToolbar généralisé, responsive Instrument/AHDSR, gestionnaire de modules (collapse/maximize/auto-collapse), titres ellipsis — v1.7.0 | 2026-06-06 |
| P | Effets & modulations : vibrato & trémolo (LFO par patch) — helper audio partagé sur les 4 chemins, 6ᵉ module Designer, .osa v3 ; + édition visuelle LFO & polish responsive (P.5/P.6) — v1.9.0 | 2026-06-07 |
| Q | Désencombrement Designer : retrait auto-sizing + bouton « Égaliser » deux rangées + fix taille boutons spectro — v1.9.1 | 2026-06-07 |
| R | Refonte petit écran Designer : switcher de modules (un module plein cadre), top header priority-plus + hamburger, gate orientation-aware 300/500 + densification < 700×500, correctifs mobile (R.3.rectif) ; R.4 (orientation) annulée — v1.10.0 | 2026-06-08 |
| S | Support tactile : Pointer Events app-wide (tracé · clavier polyphonique · poignées · Timeline), touch-action chirurgical, shell non-scrollable + PWA légère standalone ; durcissement audio (master headroom-bas + soft-clip filet, déclic MIN_RELEASE/ATTACK, buffer mobile, export normalisé) — v1.11.0 | 2026-06-09 |

**État courant** : **Iteration T « Effets sans mémoire » en cours** (sur la base
v1.11.0). **T.1** (socle UI pur, module « Effets » + switcher header) → **T.2** (auto-pan,
1ᵉʳ effet **stéréo**, `StereoPannerNode` conditionnel, **`.osa` `OSA_VERSION = 4`** =
seul bump de l'itération) → **T.3 livrée** (pitch envelope) : 1ʳᵉ modulation **non-LFO** —
`Patch`/`Editor` += **`pitchEnv {enabled, amount cents signé, time ms, invert, curve}`**,
**automation de la valeur de base d'`osc.detune`** (aucun nœud ; le vibrato, branche
entrante, s'y **somme** → coexistence par construction) sur les 4 chemins, 4ᵉ bouton
« Hauteur » + panneau (graphe d'enveloppe à 2 poignées). **T.3bis** : mode **Inverser**
(part de la note → s'en éloigne, y reste). **T.3ter** : **4 formes de progression**
(`curve` Linéaire/Décélérée/Exponentielle/Accélérée) via **`setValueCurveAtTime`** (64 pts
pour les formes non linéaires) — orthogonal à `invert`. → **T.4 livrée** (filtre statique) :
1ᵉʳ **`BiquadFilterNode` par voix** (`filter {enabled, type LP/HP/BP/notch, cutoff, q linéaire}`,
insertion **VCO→VCF→VCA** conditionnelle, **mapping Q** dB↔linéaire partagé audio/graphe via
`lib/filter.js`) + 1ᵉʳ **graphe de réponse en fréquence** à poignée 2D (`getFrequencyResponse`).
→ **T.5 livrée** (enveloppe de filtre + wah) : **clé archi = `biquad.detune` est en cents**, comme
l'oscillateur → l'env de filtre **réutilise le pitch env** et le wah **réutilise le vibrato**, appliqués
à `biquad.detune` (no-op si filtre off). `PitchEnv` **généralisé en `ParamEnv`** (type partagé) ;
`Patch`/`Editor` += **`filterEnv: ParamEnv`** (amount ±4800 cents, time 0..2000) + **`wah: Lfo`**
(depth cents 0..3600). Helper audio partagé **`scheduleParamEnv`** (osc.detune ET biquad.detune).
→ **T.6 livrée** (distorsion — dernière phase) : **`WaveShaperNode` 4x par voix**, inséré **AVANT
le filtre** (`osc → shaper → biquad → gain` ; logique soustractive — on enrichit le spectre, le
filtre le dompte). `Patch`/`Editor` += **`distortion {enabled, curve soft/hard/fold, drive 1..50,
mix 0..1}`** ; courbes de transfert normalisées ±1→±1 (`lib/distortion.js`, mémo + helper partagé
audio/graphe) ; **mix** = split wet/dry ; 8ᵉ bouton « Disto » + panneau (switch 3 courbes, graphe
de transfert à poignée Drive log). **Itération T complète (8 effets sans mémoire), en attente de
release.** **Pas de bump** (champs absents → défauts injectés, v4 inchangé). Dernière release :
**v1.11.0** (Iteration S). Détail S.1→S.audio.5 et arc audio dans `CONTEXT-ARCHIVE.md`.

> **Structure des fichiers de contexte.** Ce `CONTEXT.md` est le **brief
> vivant** : état présent, modèle de données, composants, architecture,
> décisions en vigueur, contraintes implicites, roadmap active. C'est le seul
> fichier à lire en début de session. `CONTEXT-ARCHIVE.md` est la **trace** :
> saga narrative, itérations terminées, historique chronologique, roadmaps des
> itérations closes — consulté uniquement à la demande. Tout renvoi à
> « l'Historique » ou à une itération close pointe vers `CONTEXT-ARCHIVE.md`.

## Objectif

Synthétiseur web pédagogique / créatif : dessiner des formes d'onde à la souris,
les assembler en compositions musicales sur une timeline, exporter en WAV.
**Contrainte forte** : Web Audio API natif uniquement, pas de lib audio externe.

## Stack

- React 19 + Vite 8 (SWC via `@vitejs/plugin-react`)
- ESLint 9
- TypeScript 6 incrémental (devDep) — `tsconfig.json` allowJs/noEmit/strict:false ;
  type-check via `npx tsc --noEmit`, transpile/strip par Vite (esbuild). Pas de
  state manager, pas de routing.
- Persistance : `localStorage` (clé `synth-app-state`)

## Arborescence

```
synth-app/
├── CONTEXT.md                # ce fichier
├── index.html
├── package.json
├── vite.config.js
├── eslint.config.js
├── tsconfig.json            # (iter-M) TypeScript incrémental : allowJs, checkJs:false, strict:false, noEmit (opt-in par `// @ts-check` : reducer.js depuis N.6.1)
└── src/
    ├── main.jsx              # entry point React
    ├── App.jsx               # orchestration, persistance, raccourcis clavier
    ├── App.css               # layout grid responsive Designer/Composer
    ├── index.css
    ├── types.ts             # (iter-M) types du modèle : Patch/Clip/Track/TuningSystem/AppState + union Action
    ├── audio.js              # FFT 512 pts, cap 256 harmoniques (pointsToHarmonics, pointsToPeriodicWave + définition, harmonicsToPoints iDFT M.2), encodage WAV, palette couleurs
    ├── reducer.js            # useReducer global + withUndo (historique par onglet) — JSDoc typé (Action/AppState)
    ├── assets/               # résiduel template Vite (non utilisé)
    ├── hooks/
    │   └── usePlayback.js    # moteur de lecture timeline (partagé Designer/Composer)
    ├── lib/
    │   ├── timelineLayout.js # layoutClips + computeBounds (partagés Timeline/Properties)
    │   ├── durations.js      # catalogue durées (bases + coefs, phase 6.1)
    │   ├── clipNote.js       # formatClipNote + NOTE_NAMES Unicode
    │   ├── tuningSystems.ts  # (iter-M, .ts) registre tempéraments + freq + keyboardMap par système
    │   ├── strings.js        # (iter-M, préalable B) graine i18n : libellés UI centralisés (FR)
    │   ├── visualCues.js     # catalogue gammes/accords en cents + cuedNoteIndices (F.4.4)
    │   ├── keyboardCandidates.js  # NOTE_GUARD_KEYS — touches du mode note (F.7.5)
    │   ├── osaFormat.js      # format binaire .osa (encode/decode/validate)
    │   ├── libraryTransfer.js # transformations état ↔ payload .osa
    │   ├── folderNames.js    # nextAvailableFolderName partagé (extraction H.1.4)
    │   ├── bibTransfer.js               # wouldCreateCycle + duplicateItemsToFolder (K.1.7)
    │   ├── shortcuts.js      # table déclarative + matchesShortcut / getAnchor (iter-L phase-1.1)
    │   ├── designerModules.js # (iter-O phase-5c/5d, iter-P) MODULE_META des 6 modules Designer { label, Icon Lucide } + DESIGNER_ROWS / rowSiblings (rangée haut 3 / bas 3) — source unique (headers, bande, auto-réduction)
    │   ├── filter.js         # (iter-T T.4) filtre statique : biquadQValue (piège d'unité Q — dB pour LP/HP, linéaire pour BP/notch) + configureBiquad, partagés par les 4 chemins audio ET le graphe de réponse (biquad de mesure)
    │   ├── distortion.js     # (iter-T T.6) distorsion par voix : distortionTransfer (soft tanh / hard clamp / fold sin, normalisées ±1→±1) + distortionCurveTable (mémo (curve,drive)) + configureShaper (oversample 4x) + connectDistortion (split wet/dry, insertion avant le filtre) ; partagé 4 chemins audio + graphe de transfert
    │   ├── modulation.js     # (iter-P/T) applyModulation : branche vibrato/trémolo/auto-pan/pitch-env/env-filtre/wah (osc.detune & biquad.detune cents sommés / gain.gain sommé / panner.pan stéréo / automation de base osc.detune & biquad.detune) sur un couple (osc, gain[, panner][, biquad]) existant ; helper partagé des 4 chemins. scheduleParamEnv(param, env, startTime) = automation d'enveloppe (4 formes) partagée osc.detune (pitch T.3) ET biquad.detune (filtre T.5) ; biquad absent → env-filtre + wah no-ops
    │   ├── getAnchoredPosition.js # résolution viewport rect d'un [data-anchor] (iter-L phase-1.5)
    │   ├── highlightElement.js # halo temporaire ancré (DocLink), retry RAF (iter-L phase-3.1)
    │   ├── markdown.js       # parser Markdown maison + AST, délègue le math à mathParse (iter-L phase-2.2 / R.1)
    │   ├── mathParse.js      # sous-parser math récursif ($…$, $$…$$ → mathAst), \sum à bornes (iter-L phase-R.1 / iter-M phase-5a.1)
    │   ├── spline.js         # (iter-M M.3) splineSoft Catmull-Rom périodique / splineHard polyligne → points ; fitAnchorsToCurve = pose des ancres par Douglas-Peucker à compte fixe (iter-N N.2) ; warpResidualForAnchorMove = warp horizontal du résidu au drag d'ancre, support local + wrap (iter-N N.3)
    │   ├── presets.js        # (iter-M M.4) bibliothèque code-only de timbres harmoniques (TIMBRE_PRESETS + anchorCount N.5c). N.5c : carré/scie/triangle retirés (→ BASE_WAVEFORMS) ; restent flûte/orgue/cuivre + inattendus
    │   ├── waveforms.js      # (iter-N N.5b/N.5c/N.5f) moteur de formes : idealWaveform(type, params) (brute, params de forme N.5f) + bandlimitWaveform/bandlimitedWaveform(type, N, params) (reconstruction DFT directe 600, phase naturelle, normalisée) + BASE_WAVEFORMS (4 formes de base) + PARAMETRIC_WAVEFORMS (7 formes paramétriques N.5f : escalier/scie-étages/sinus-décr/pulse/trapèze/demi-sinus/impulsion, chacune params:[{key,label,min,max,default,step}] + anchorCount nombre|fn(K)) + snapN (recadrage de N). Branché dans PresetPicker
    │   └── tours/            # déclarations du Tour guidé par onglet (iter-L phase-4)
    │       ├── index.js      # map tabId → étapes + TOUR_TABS (ordre chaînage)
    │       ├── library.js / designer.js / composer.js / documentation.js  # séquences d'étapes
    ├── styles/               # CSS transverses non colocatées
    │   └── highlight.css     # halo flash DocLink (iter-L phase-3.1)
    ├── docs/                 # contenu de l'onglet Documentation (iter-L phase-2)
    │   ├── index.js          # table DOC_TOC + sources .md importées via ?raw
    │   └── articles/         # fichiers Markdown bundled au build
    │       ├── about.md             # stub L.2.5 (rédaction confiée à writer/)
    │       ├── why-12-notes.md      # stub L.2.5 (rédaction confiée à writer/)
    │       └── _renderer-test.md    # validation visuelle des features V1 + math L.R (à retirer en L.5)
    └── components/
        ├── Tabs.jsx + .css                    # bascule Bibliothèque / Designer / Composer / Documentation ; variante compacte priority-plus + hamburger sous 924×668 (iter-R phase-2.2, prop isMobile)
        ├── PatchBank.jsx + .css               # banque de patches partagée
        ├── WaveformEditor.jsx + .css          # éditeur ondes / patch (Designer)
        ├── Spectrogram.jsx + .css             # spectrogramme statique (Designer)
        ├── DesignerColumns.jsx + .css         # layout 3 colonnes ajustables (Designer, M.2.2) ; prop collapsed → colonne repliée en bande (iter-O phase-5a) ; réutilisé pour la RANGÉE DU BAS (iter-P phase-6.2 : prop sepLabels) ; auto-sizing retiré (iter-Q : drag des séparateurs seul)
        ├── DesignerModule.jsx + .css          # wrapper réductible/maximisable des 6 modules Designer : bande verticale (icône+titre) ↔ contenu (toujours monté, display:none si replié — contrainte canvas) ; rend la ModuleChrome en coin absolu (iter-O phase-5a/5c)
        ├── ModuleChrome.jsx + .css            # chrome « contrôle de fenêtre » d'un module : Réduire (désactivé en maximisé) + Agrandir/Restaurer ; centralisée dans DesignerModule, coin haut-droit absolu (iter-O phase-5a→5c)
        ├── OverflowToolbar.jsx + .css         # barre d'outils générique « priority-plus » : items bar/tray, débordement → tiroir `⋯` (iter-O phase-2). Branché : les 5 headers de module + groupe droit DesignerToolbar (généralisé O.6.2) + contrôles module mobile (R.1.3) + top header compact (R.2). Props `triggerIcon` (défaut `⋯` ; header compact passe `Menu`) + `trayFooter` (node en bas du tiroir popover — header compact y met la version d'app)
        ├── SplineEditor.jsx + .css            # éditeur points/courbe mode spline (Designer, M.3)
        ├── ConvertToHarmonicDialog.jsx + .css # dialog passerelle draw/spline→harmonic (M.2.5)
        ├── ConvertToSplineDialog.jsx          # dialog passerelle draw/harmonic→spline (M.3.3)
        ├── PresetPicker.jsx + .css            # modal de chargement des presets de timbre (M.4)
        ├── MiniPlayer.jsx + .css              # transport simplifié (Designer)
        ├── PianoKeyboard.jsx + .css           # dispatcher clavier (piano-12 / grid-24 / grid-5 / grid-7 / grid-31 / grid-22-bhatkhande / grid-22-sarngadeva) + octaves + halo .is-cued (F.4.4)
        ├── DurationButtons.jsx + .css         # boutons durée 7 bases + 3 coefs (phase 6.1)
        ├── SidebarResizer.jsx + .css          # poignée drag bordure sidebar (phase 7.4)
        ├── BpmInput.jsx                       # input BPM validation différée
        ├── A4Input.jsx                        # input A4 validation différée (F.2.2)
        ├── FreqInput.jsx                      # input fréquence libre (phase 3.7)
        ├── NumberInput.jsx                    # input numérique générique paramétré par parse/format (F.3.11.2) ; mode stepper opt-in (iter-O phase-1 : showSteppers/step/shiftStep → chevrons ▴▾ Lucide, clic/Shift/appui-maintenu accéléré + clavier ↑↓)
        ├── Toast.jsx + .css                   # toast d'erreur (undo cross-onglet)
        ├── Toolbar.jsx + .css                 # toolbar (Composer)
        ├── Timeline.jsx + .css                # grille + clips + curseur (Composer)
        ├── PropertiesPanel.jsx + .css         # édition du clip sélectionné (Composer)
        ├── TooSmallGate.jsx + .css            # gate résolution (ex-ResolutionGate, renommé iter-R R.3) ; plancher orientation-aware 300/500 (G.1.4 + G.2.6 ; R.3.1)
        ├── Modal.jsx + .css                   # primitive modale partagé (H.1.8)
        ├── ExportModal.jsx                    # modale "Export as..." (H.1.9)
        ├── ImportModal.jsx                    # modale post-validation (H.1.13)
        ├── ShortLabelSelect.jsx + .css        # dropdown custom libellé court trigger / complet menu (G.2.3)
        ├── BibBreadcrumb.jsx + .css           # breadcrumb cliquable + éditable (K.1.2)
        ├── BibContextMenu.jsx                 # menu contextuel enrichi (K.1.10)
        ├── PatchThumbnail.jsx                 # mini-SVG waveform pour Tiles (K.1.4)
        ├── PopupResizer.jsx + .css            # poignée resize du popup (K.1.12)
        ├── PatchPicker.jsx + .css            # sidebar lightweight (K.2.6)
        ├── SavePatchDialog.jsx + .css        # modal popup save patch (K.2.7)
        ├── DeleteUsageWarningDialog.jsx + .css # modal warning patches utilisés (K.2.8)
        ├── ConfirmDialog.jsx + .css          # modal confirmation générique (K.2.f16)
        ├── RecentPatchesList.jsx + .css      # LRU 10 derniers patches Composer (K.2.f11)
        ├── ShortcutsOverlay.jsx + .css       # overlay raccourcis "lever le voile" Ctrl+K (iter-L phase-1.5)
        ├── DocumentationTab.jsx + .css       # layout TOC + zone contenu de l'onglet Documentation (iter-L phase-2.3)
        ├── MarkdownRenderer.jsx + .css       # rendu AST Markdown maison → JSX + DocLink/doc: actifs via MarkdownNavContext + rendu math sup/sub/frac/sum, displayMode (iter-L phase-2.2 / 3.2-3.3 / R.2 / iter-M phase-5a.2)
        ├── ShortcutsReference.jsx + .css     # article généré "Raccourcis clavier" depuis SHORTCUTS (iter-L phase-2.4)
        └── Tour.jsx + .css                   # moteur du Tour guidé : spotlight + bulle + progress bar (iter-L phase-4)
```

### Layout

L'`App` rend **les deux layouts en permanence** et toggle leur visibilité via
l'attribut `hidden` (override CSS pour battre `display:grid`). Raison : ne pas
démonter le `WaveformEditor`, sinon perte de l'état local + du dirty check.

**Responsive Designer desktop (seuils, iter-P P.6)** : trois paliers de largeur.
`isMobile` (`< 924` OU `h < 668`) → **switcher de modules** (iter-R R.1, remplace
l'accordéon) : rangée d'icônes dans la `DesignerToolbar` + **un seul module plein
cadre** (`designerMobileModule` persisté, défaut `'canvas'`) ; ordre du switcher
canvas/harmonics/spectro/adsr/modulation/**params (Instrument dernier)**, corps
montés en permanence. `ESSENTIALS_WIDTH`
(**1100**, = seuil d'auto-collapse forcé O.5d) → en desktop sous ce seuil :
(a) **auto-collapse « essentiel »** au franchissement (edge-triggered) — seuls
Forme d'onde + Instrument restent ouverts, le reste replié ; tout rouvert au
retour au-dessus de 1100 (sauf si un module est maximisé : choix manuel respecté) ;
(d) **panneau gauche forcé fermé** (rail + popover Bibliothèque, même chemin que
le mobile, non redimensionnable). Au-dessus de 1100 : comportement plein (modules
ouvrables librement, sidebar redimensionnable). Les **deux rangées** de modules
(haut Forme d'onde/Harmoniques/Spectro **et** bas Instrument/AHDSR/Modulation)
partagent le composant `DesignerColumns` → 2 séparateurs draggables chacune,
largeurs persistées (`designerColumnWidths` / `designerBottomRowWidths`).

## Modèle de données

```ts
type SoundFolder = {              // racine virtuelle si parentId === null
  id: string                      // "folder-N"
  name: string
  parentId: string | null
}

// Depuis itération E : un patch ne porte PLUS ni fréquence ni note —
// c'est le clip qui porte la hauteur. Un même patch peut être joué à
// n'importe quelle hauteur sans duplication.
//
// Depuis iter-M rattrapage (M.r.1, 2026-06-01) : modèle UNIFIÉ. Plus d'union
// discriminée — un seul `Patch` porte une courbe `canonical` (LA vérité audio)
// et trois lentilles qui la lisent/éditent (Forme d'onde / Harmoniques /
// Spectro). `cap` (ex-`definition` ET ex-`N`) borne les harmoniques. La
// lentille spline (anchors + interpolation + residual) permet une réédition
// préservant les détails fins du tracé : au drag d'ancre, le résidu est remappé
// (warp 2D à support local, iter-N N.3) pour suivre l'ancre au lieu de rester
// planté (cf. spec §4.1 + décision dédiée). Plus de conversion destructive.
type Patch = {
  id: string                      // "patch-N"
  name: string                    // "Patch N" par défaut
  color: string                   // hex, palette SOUND_COLORS (12 couleurs)
  preset: 'sine'|'square'|'sawtooth'|'triangle'|null  // null = dessin custom
  defaultTuningSystem: string     // système musical actif à l'enreg (iter G.2.4)
  folderId: string | null         // null = racine
  updatedAt: number
  amplitude: number               // 0..1
  canonical: number[]             // 600 échantillons [-1, 1] — LA vérité audio
                                  // (remplace `points`). Toute la chaîne audio la lit.
  cap: number                     // 1..256 — plafond d'harmoniques unique
                                  // (remplace `definition` du tracé ET `N` des barres)
  anchors: { x: number, y: number }[]  // 4..32 ancres spline, x ∈ [0,600), y ∈ [-1,1]
  interpolation: 'soft' | 'hard'  // soft = Catmull-Rom périodique, hard = polyligne
  residual: number[]              // 600 : canonical − spline(anchors) (peut sortir
                                  // de [-1,1]). Détails du tracé qui survivent au drag.
  attack: number                  // ms, 0-1000 (F.3.11)
  hold: number                    // ms, 0-1000 (F.3.12) — plateau au peak entre attack et decay
  decay: number                   // ms, 0-1000 (F.3.11)
  sustain: number                 // 0..1
  release: number                 // ms, 0-1000 (F.3.11)
  // itération P : modulations LFO par patch (vibrato = hauteur, trémolo = volume).
  vibrato: Lfo                    // { enabled, rate Hz, depth cents, onset ms, shape }
  tremolo: Lfo                    // { enabled, rate Hz, depth 0..1, onset ms, shape }
  // itération T (T.2) : auto-pan stéréo (LFO → panner.pan).
  autoPan: Lfo                    // depth 0..1 = excursion symétrique G↔D autour du centre
  // itération T (T.3) : pitch envelope (enveloppe → osc.detune ; PAS un Lfo).
  pitchEnv: ParamEnv             // { enabled, amount cents signé ±2400, time ms 40..2000, invert, curve }
  // itération T (T.4) : filtre statique (BiquadFilter par voix ; ni Lfo ni ParamEnv).
  filter: PatchFilter            // { enabled, type LP/HP/BP/notch, cutoff Hz 20..20000, q linéaire 0.1..20 }
  // itération T (T.5) : enveloppe de filtre + wah, tous deux sur biquad.detune (cents).
  filterEnv: ParamEnv            // { ... } amount ±4800 cents, time 0..2000 ms (no-op si filtre off)
  wah: Lfo                       // depth cents 0..3600 (LFO de cutoff ; no-op si filtre off)
  // itération T (T.6) : distorsion par voix (WaveShaper 4x, inséré avant le filtre).
  distortion: Distortion         // { enabled, curve soft/hard/fold, drive 1..50, mix 0..1 }
}
// type PatchFilter = { enabled:boolean, type:'lowpass'|'highpass'|'bandpass'|'notch',
//   cutoff:number /*Hz 20-20000*/, q:number /*résonance LINÉAIRE 0.1-20*/ }. DEFAULT_FILTER
//   { false, 'lowpass', 2000, 1 }. Piège d'unité Web Audio : le Q d'un biquad est en dB
//   pour LP/HP, linéaire pour BP/notch ; le modèle stocke un q linéaire unique, la couche
//   audio convertit (lib/filter.js biquadQValue/configureBiquad, partagé audio + graphe).
//   Insertion VCO→VCF→VCA (osc → biquad → gain) seulement si enabled, sinon chaîne
//   bit-identique. Édition mono-clé via SET_EDITOR_MODULATION ; poignée 2D du graphe via
//   SET_EDITOR_FILTER_POINT (cutoff+q atomique, un undo/geste).
// type Lfo = { enabled:boolean, rate:number /*0.1-20 Hz*/, depth:number
//   /*vibrato 0-200 cents ; trémolo/auto-pan 0-1 ; wah 0-3600 cents*/, onset:number /*0-2000 ms*/,
//   shape:'sine'|'triangle'|'square' }. Défauts désactivés mais musicaux
//   (DEFAULT_VIBRATO rate:5 depth:20 ; DEFAULT_TREMOLO rate:5 depth:0.3 ;
//   DEFAULT_AUTOPAN rate:1 depth:0.5 ; DEFAULT_WAH rate:2 depth:1200).
// type ParamEnv = { enabled:boolean, amount:number /*cents signés — pitch ±2400, filtre ±4800*/,
//   time:number /*ms 0-2000 (pitch plancher 40 ; filtre 0 = cran statique via garde durée nulle)*/,
//   invert:boolean /*T.3bis : false = part décalé → rejoint la nominale ; true = part
//   de la nominale → s'éloigne vers amount, où la valeur RESTE*/,
//   curve:'linear'|'easeOut'|'expo'|'easeIn' /*T.3ter : forme de la progression p(t)∈[0,1],
//   orthogonale à invert ; valeur posée = départ + (arrivée−départ)·p(t). Audio :
//   linear = linearRamp (chemin historique), formes non linéaires = setValueCurveAtTime
//   (64 pts) — PAS exponentialRamp (ne traverse pas zéro)*/ }. Type PARTAGÉ (T.5) :
//   pitchEnv (→ osc.detune) ET filterEnv (→ biquad.detune) en sont deux instances à
//   bornes propres. DEFAULT_PITCHENV { false, 1200, 150, false, 'linear' } ;
//   DEFAULT_FILTERENV { false, 2400, 200, false, 'linear' }. Helper audio partagé
//   scheduleParamEnv(param, env, startTime) — une seule implémentation des 4 formes.
// type Distortion = { enabled:boolean, curve:'soft'|'hard'|'fold', drive:number /*1-50*/,
//   mix:number /*0-1 wet/dry*/ }. DEFAULT_DISTORTION { false, 'soft', 5, 1 }. WaveShaper 4x
//   par voix inséré AVANT le filtre ; courbes normalisées ±1→±1 (soft tanh / hard clamp /
//   fold sin) ; lib/distortion.js (mémo + helper audio/graphe partagé).
// Editor : mêmes champs (dont vibrato/tremolo/autoPan/pitchEnv/filter/filterEnv/wah/distortion)
// + `currentLens: 'free'|'spline'` (volatile, non persisté) = lentille active (M.r.3.2 :
// 'bars' retiré, vestigial).
// Migration v1→v2 (M.r.1) : les anciens
// patches (draw/harmonic/spline) sont convertis à l'hydratation localStorage et
// à l'import .osa v1 (reducer.migrateLegacyPatch, idempotent). OSA_VERSION = 4
// (iter-T T.2 : += autoPan ; T.3→T.6 ajoutent pitchEnv/filter/filterEnv/wah/distortion DANS v4 ;
// iter-P avait += vibrato/tremolo) ; l'import accepte v1 (legacy), v2, v3 ET v4 —
// champs absents → défauts injectés à l'hydratation (règle « champ absent → défaut »).

type Track = {
  id: string                      // "track-N"
  name: string                    // "Piste 1" par défaut
  color: string                    // hex, palette TRACK_COLORS (8 couleurs muted)
  muted: boolean
  solo: boolean
  volume: number                  // 0..1
  height: number                  // px
}

type Clip = {                     // placement timeline + hauteur
  id: string                      // "clip-N"
  trackId: string
  patchId: string                 // ex-soundId, référence un Patch
  measure: number                 // 1-indexée, 1..numMeasures
  beat: number                    // en noires dans la mesure, 0..3.75 (snap 0.25 = 16ᵉ)
  duration: number                // en noires : 4=ronde, 2=blanche, 1.5=noire pointée,
                                  // 1=noire, 0.75=croche pointée, 0.5=croche, 0.25=double
  // Hauteur sonore (itération E) :
  tuningSystem: string            // clé du registre `TUNING_SYSTEMS` : '12-TET',
                                  // 'pythagorean-12', 'free' (F.2). Extensible.
  noteIndex: number | null        // 0..(notesPerOctave-1) du système courant,
                                  // null en Libre. 0..11 pour 12-TET aujourd'hui.
  octave: number | null           // 0-10 en 12-TET, null en Libre
  frequency: number | null        // null en systèmes-based (calculée), explicite en Libre
}

// State global (itération F) : champ `a4Ref` (Hz, défaut 440) — hauteur de
// référence utilisée par tous les systèmes-based pour calculer leurs
// fréquences. Persisté. Pas d'UI d'édition en F.1 (reportée en F.2 avec le
// premier tempérament non 12-TET).

// Fréquence effective d'un clip → `clipFrequency(clip, a4Ref)` (reducer.js) :
// délègue au registre `src/lib/tuningSystems.js`. Chaque entrée définit une
// fonction `freq(noteIndex, octave, a4Ref) → Hz` (ou null pour 'free' qui lit
// `clip.frequency`). Point d'extension unique : ajouter une entrée suffit,
// aucun autre code n'a besoin d'en savoir plus. Systèmes actuels (F.2) :
//   - '12-TET' : `a4Ref × 2^((midi-69)/12)`.
//   - 'pythagorean-12' : chaîne de quintes 3:2 centrée sur C, ancrée sur A4
//     (C4 = a4Ref × 16/27). 6 quintes montantes, 5 descendantes ; loup entre
//     F# (+6) et Db (-5). Ratios dérivés à l'init dans `PYTH_RATIOS_FROM_C`.
//   - 'free' : lit `clip.frequency` directement.

// Persistance (localStorage, clé "synth-app-state") :
// { patches, soundFolders, tracks, clips, bpm, numMeasures, a4Ref,
//   spectrogramVisible, durationMode, adsrView, activeTab,
//   patchCounter, clipCounter, folderCounter, trackCounter,
//   composerBankWidth, composerAsideWidth,
//   composerBankCollapsed, composerAsideCollapsed,
//   docSidebarWidth, docSidebarCollapsed (iter-L phase-2.1),
//   designerColumnWidths, designerBottomRowWidths (iter-P phase-6.2 :
//     proportions de la rangée du bas, 3 fractions, défaut tiers ; iter-Q :
//     champ autoSizing retiré, ignoré à l'hydratation),
//   designerCollapsed (iter-O phase-5a, iter-P : { canvas, harmonics, spectrogram,
//     params, adsr, modulation } booléens, état replié des 6 modules Designer),
//   maximized (iter-O phase-5b : id du module maximisé ou null),
//   autoCollapse (iter-O phase-5d : politique d'auto-réduction par rangée),
//   designerMobileModule (iter-R phase-1.1 : module plein cadre en petit écran,
//     ∈ les 6 ids, défaut 'canvas' ; remplace l'ex-volatile mobileExpandedZone),
//   designerEffectsSelected (iter-T phase-1.1 : effet édité dans le module Effets,
//     ∈ {'vibrato','tremolo','autoPan'(T.2),'pitchEnv'(T.3),'filter'(T.4),'filterEnv'(T.5),'wah'(T.5),'distortion'(T.6)}, défaut 'vibrato' ; validé à l'hydratation, hors undo),
//   editorTestTuningSystem, editorTestNoteIndex, editorTestOctave,
//   editorTestFrequency, editorVisualCuePattern, editorVisualCueTonic,
//   selectedTrackId (iter-L phase-1.4.b) }
//
// Persistance auxiliaire (sessionStorage, clé "synth-app-doc-session",
// iter-L phase-2.1) — position de lecture de l'onglet Documentation :
// { currentArticleId: string | null,  // article ouvert
//   scrollPositions: { [articleId]: number }  // scroll top par article
// }
// Scopé session navigateur : à chaque ouverture, on retombe sur
// l'article par défaut ('about'). Décorrélé du localStorage métier
// pour ne pas polluer le retour du jour suivant.
//
// NON persisté (volatile) : selectedClipIds, currentPatchId, zoomH,
// defaultClipDuration, lastAnchorClipId, composerFlash,
// shortcutsOverlayOpen (iter-L phase-1.6, runtime uniquement),
// tour (iter-L phase-4, runtime uniquement — un tour ne survit pas à un refresh),
// editor.points / amplitude / ADSR / preset (vides au reload, l'éditeur
// de patch n'est pas restauré ; seuls les champs `test*` et `visualCue*`
// d'exploration Designer le sont — F.4.4.3), clipboard, measureClipboard,
// piles undo/redo, settlingTops (Timeline local).
//
// Champs iter-L phase 1 :
//   selectedTrackId: string | null  // piste sélectionnée Composer.
//     Mise à jour au dernier clic utilisateur (clip / header / zone vide
//     d'une piste). Persistée. Validation contre tracks à l'hydratation
//     (reset null si piste introuvable). Reset à null sur DELETE_TRACK
//     de la piste active.
//   shortcutsOverlayOpen: boolean   // overlay raccourcis (Ctrl+K).
//     Non persisté (toujours fermé au boot).
//
// Champs iter-L phase 2 (onglet Documentation) :
//   doc.currentArticleId: string | null  // article ouvert dans la TOC.
//     Hydraté depuis sessionStorage ; défaut 'about' (DEFAULT_DOC_ARTICLE_ID)
//     au boot. null = page d'accueil TOC (liste). Persisté en sessionStorage.
//   doc.scrollPositions: { [articleId]: number }  // scroll top par article.
//     Mis à jour avec un débounce 200 ms côté DocumentationTab.
//     Persisté en sessionStorage. Restauré au switch d'article.
//   docSidebarCollapsed: boolean  // état réduit de la sidebar TOC.
//     Persisté en localStorage (préférence UX longue durée).
//   docSidebarWidth: number  // largeur en px de la sidebar TOC.
//     Min DOC_SIDEBAR_MIN_WIDTH (180), défaut DOC_SIDEBAR_DEFAULT_WIDTH
//     (240). Persisté en localStorage.
//   activeTab étendu à 'documentation' (4ᵉ valeur possible).
//
// Champ iter-L phase 4 (Tour guidé) :
//   tour: { active, tabId, stepIndex, snapshot }  // visite guidée.
//     Volatile (jamais persisté, hors undo). snapshot = { activeTab,
//     designerSidebarCollapsed, docSidebarCollapsed, composerBankCollapsed,
//     composerAsideCollapsed } capturé une seule fois au 1er START_TOUR,
//     restauré à END_TOUR (tour « stateless du point de vue utilisateur »).
//     stepIndex indexe les étapes brutes du tour ; le moteur Tour.jsx mappe
//     vers la séquence effective (ancres résolvables) pour la navigation.
//
// État `editor` (Designer, non persisté en bloc) — extrait pertinent :
//   testTuningSystem, testNoteIndex, testOctave, testFrequency  // preview
//   amplitude, attack, hold, decay, sustain, release, points    // patch
//   visualCuePattern: string  // F.4.4, défaut 'none'
//   visualCueTonic:   number  // F.4.4, défaut 0, snap à 0 si > notesPerOctave
//                              du nouveau système à la bascule
// Détection d'ancien format (savedSounds/soundCounter/noteCounter/
// placementCounter) → reset complet, pas de migration (deal assumé E.1).
```

⚠️ Vocabulaire : les **notes musicales** (C, D, E…) restent appelées "notes".
Seuls les **placements timeline** s'appellent "clips".

**Track par défaut** (créé en migration si absent) :
`{ id:"track-default", name:"Piste 1", color:TRACK_COLORS[0], muted:false, solo:false, volume:1, height:80 }`
**MAX_TRACKS** = 16. `trackCounter` persisté pour IDs uniques (`track-N`).

**Constantes** : `BEATS_PER_MEASURE=4`, BPM 60-240 (défaut 120),
`numMeasures` 16 par défaut (modifiable, prochainement).
**Formule temps** : `seconds = beats * 60 / bpm` (1 noire à 120 bpm = 0.5s).

## Composants

### `App.jsx` — racine
- Un seul `useReducer(withUndo(reducer))` détient tout l'état : `patches`,
  `soundFolders`, `tracks`, `clips`, `bpm`, `numMeasures`, `editor`,
  compteurs (`patchCounter`, `clipCounter`, `folderCounter`, `trackCounter`),
  `selectedClipIds`, `zoomH`, `clipboard`, `measureClipboard`, etc.
- `editorRef` (imperative handle) pour le dirty check de `WaveformEditor`.
- Persistance auto via `useEffect` (données métier uniquement, pas l'UI state).
- Appelle `usePlayback({ clips, patches, tracks, bpm, totalDurationSec })` ;
  useEffect synchro `updateTrackGains(tracks)` quand mute/solo/volume changent
  pendant la lecture.
- Handlers CRUD pistes : `handleCreateTrack`, `handleRenameTrack`,
  `handleDeleteTrack` (confirm si clips), `handleUpdateTrack`, `handleReorderTracks`.
- Handlers clipboard cross-piste : `handlePaste(absoluteBeat, targetTrackId)` calcule
  un delta de piste si targetTrackId fourni (clic droit ou Ctrl+V).
- `handleAddClip(patchId, measure, beat, duration, trackId)` : la hauteur du
  nouveau clip est lue depuis l'éditeur (`editorTestNoteFields(editor)`) —
  règle par défaut E.1, remplacée par les raccourcis clavier en E.4.

### `WaveformEditor.jsx`
- Canvas 600×300 dessinable à la souris (interpolation linéaire)
- Presets Sine / Square / Sawtooth / Triangle / Clear (tracking `activePreset`)
- Depuis itération E : le clavier, l'octave et le slider fréquence pilotent
  **uniquement la preview** (champs `testTuningSystem`, `testNoteIndex`,
  `testOctave`, `testFrequency` de `state.editor`). Ils ne sont pas copiés
  dans le patch sauvegardé — c'est le clip qui portera la hauteur au drop.
  Sélecteur "Système musical" (G.1.3) éclaté en deux dropdowns —
  Catégorie (Moderne / Historique / Théorique) + Système filtré.
  Bascule entre deux UIs selon le système choisi :
  - Système-based (12-TET, pythag, juste, etc.) : clavier piano /
    grid 24 / grid-x-edo / grid-22 + 11 boutons d'octave + affichage
    "Note : X Hz — N4".
  - Libre : slider log 2^4-2^15 Hz + FreqInput éditable + bouton
    **Test** (canal mono via `playFreeNote()` lisant `testFrequency`
    direct, raccourci `s`).
- Children-API (iter-M phase-2, étendue r.2, iter-P, iter-R) : `renderCanvasArea`,
  `renderHarmonicsArea`, `renderParamsArea` (≡ zone "Instrument" depuis
  G.1.1), `renderAdsrArea`, `renderModulationArea` (iter-P, 6ᵉ module),
  `renderActions` ({collapsed}) + valeurs/handlers
  pour la barre du haut : `patchLabel`, `openPresetPicker`,
  `requestResetWaveform`, `normalizeWaveform` (le picker de presets et les
  ConfirmDialog restent montés dans `WaveformEditor` ; la barre ne fait que
  piloter leur ouverture). **iter-R phase-1.3a** : expose aussi
  `moduleHeaderItems` = { canvas, harmonics, params, adsr } — les **items de header
  de chaque module comme donnée** (mêmes tableaux `{id, bar, tray}` que les headers
  in-body desktop, construits par des `build*HeaderItems()` réutilisés ; en mobile
  les headers in-body rendent `[]`). App les reloge dans la toolbar mobile pour le
  module actif (Spectro exposé à part via `buildSpectrogramHeaderItems`, Modulation
  sans contrôle). App.jsx compose la moitié haute = `DesignerToolbar`
  (barre du haut) + 3 colonnes via `DesignerColumns` (Forme d'onde /
  Harmoniques / Spectrogramme), et garde la moitié basse à **3 cellules**
  (Instrument / AHDSR / Modulation, iter-P). Le panneau Actions est placé par
  App.jsx dans la sidebar gauche.
- **Module « Effets » (iter-P, graphe éditable P.5 ; switcher header iter-T T.1)** :
  `renderModulationArea` (id interne toujours `'modulation'`, clés persistées
  inchangées). **iter-T T.1** : le module est renommé **« Effets »** (label
  `MODULE_META.modulation` + titre in-body + sepLabel rangée bas) et passe d'un
  corps à 2 sous-blocs côte à côte à un **corps un effet à la fois**, pleine
  largeur **et pleine hauteur** : le corps `flex:1` sous le header, le **graphe LFO
  s'étire** (`.we-lfo-canvas-wrap` flex:1 + min-height) pour remplir l'espace entre
  l'en-tête du sous-bloc et la rangée des 3 inputs (surface d'édition maximisée ;
  un `ResizeObserver` sur le canvas visible le repeint au resize même effet off ;
  ancien rabotage de hauteur R.3.rectif.5 devenu inutile). Le sous-bloc non
  sélectionné reste **monté mais masqué**
  (`.we-lfo-block.is-hidden { display:none }`, contrainte canvas) ; on ne le
  démonte pas, on le **repeint au switch** (la boucle rAF re-tourne,
  `effectsSelected` dans ses deps → canvas remesuré). Sélection via la **barre de
  titre** : une rangée de **boutons toggle** (un par effet : Vibrato, Trémolo,
  Auto-pan dès T.2, **Hauteur** dès T.3), items d'un `OverflowToolbar` (débordent dans le tiroir `⋯` à l'étroit), construits
  par `buildEffectsHeaderItems()` (**même builder** partagé desktop in-body /
  relogement toolbar mobile). Deux notions visuelles **indépendantes** par bouton :
  **en cours d'édition** (exclusif, highlight `is-active` + `aria-pressed`) et
  **activé** (`editor.<effet>.enabled` → **pastille accent**, indicateur pur). Clic
  = **mise en édition seule** (l'on/off reste l'interrupteur dans le panneau).
  Badge agrégé sur le trigger `⋯` (prop opt-in `triggerBadge` de `OverflowToolbar`)
  si un effet activé déborde dans le tiroir. État UI **`designerEffectsSelected`**
  ∈ {vibrato, tremolo, autoPan, pitchEnv} (défaut vibrato), persisté, validé à l'hydratation, **hors
  undo** ; action `SET_DESIGNER_EFFECTS_SELECTED` (non-undoable). **Pitch envelope
  (T.3/T.3bis/T.3ter)** : sous-bloc à part (`renderPitchEnvBlock`) — un **toggle « Inverser »**
  (T.3bis, `FlipVertical2`) + un **switch segmenté 4 formes** (T.3ter, idiome LFO :
  `PITCH_CURVE_META`, glyphes SVG `IconCurve*` de trajectoire, libellés `STRINGS.pitchCurves`),
  groupés à droite du head (`.we-lfo-head-controls`), + **2 `NumberInput`** (départ|cible
  cents signé / durée ms) + un **graphe d'enveloppe** dédié (`drawPitchEnvGraph` : médiane
  = hauteur nominale, axe Y **signé**, axe x **racine carrée**, 2 poignées vertical/horizontal,
  **aucune animation** — branche statique de la boucle rAF ; **T.3ter** : la rampe est
  échantillonnée via `pitchProgression(curve, t)` — **même fonction que l'audio**, donc
  le tracé reflète exactement la forme choisie). En mode **inversé** le graphe
  est en **miroir** (part de la médiane → s'éloigne vers `amount` → plateau) et la poignée
  verticale se place **à droite sur le plateau** (fixe horizontalement, miroir du départ à
  gauche en normal) ; tooltips/label Cible/Durée. Réutilise les classes
  `.we-lfo-*` et la machinerie d'undo partagée. **Filtre (T.4)** : 5ᵉ sous-bloc
  (`renderFilterBlock`) — interrupteur + **switch segmenté 4 types** (`IconFilter*`,
  tooltips `STRINGS.filterTypes`) + 2 `NumberInput` (Fréquence à **steppers
  multiplicatifs** `stepFactor`, Résonance additive) + un **graphe de réponse en
  fréquence** dédié (`drawFilterGraph` : X log 20 Hz–20 kHz repères 100/1k/10k, Y dB
  −30..+30, 0 dB accentué, `getFrequencyResponse` sur un biquad de mesure jamais
  connecté, **même mapping Q** que l'audio ; **sans animation** — branche statique de
  la boucle rAF) à **poignée 2D unique** au cutoff (horizontal log → cutoff, vertical
  log → q) ; `draftFilter` + commit atomique `SET_EDITOR_FILTER_POINT`, géométrie gelée
  au pointerdown (`filterDragGeomRef`), désactivé → courbe grise atténuée. **Env. filtre +
  Wah (T.5)** : 6ᵉ/7ᵉ boutons header. **Env. filtre** = clone du panneau Hauteur
  (`renderParamEnvBlock(effect)` généralisé par bornes `PARAM_ENV_BOUNDS` ; `paramEnvGeometry`/
  `drawParamEnvGraph`/handlers `paramEnv*` paramétrés ; médiane = cutoff réglé, courbe =
  décalage cents). **Wah** = clone LFO (`renderLfoBlock('wah')`, profondeur en cents,
  `wahCanvasRef` + point de phase animé). Les deux affichent une **ligne discrète**
  « filtre désactivé — cet effet est muet » + bouton inline **« Activer le filtre »**
  (`renderFilterTargetHint`, undoable) quand `!filter.enabled` ; contrôles restent éditables.
  **Distorsion (T.6)** : 8ᵉ bouton « Disto » + `renderDistortionBlock` (interrupteur + switch
  segmenté 3 courbes `IconDistort*`/`STRINGS.distortionCurves` + steppers Drive 1..50 / Mix 0..1).
  **Graphe de la courbe de transfert** (`drawDistortionGraph` : entrée x∈[−1,1] → sortie y∈[−1,1],
  `distortionTransfer` partagé avec l'audio, **diagonale identité pointillée**, **curseur Drive**
  vertical à mapping log ; statique, branche rAF) — drag vertical → drive (draftMod mono-clé).
  Les sous-blocs **LFO** (vibrato/trémolo/auto-pan/wah) rendent : interrupteur on/off, switch de
  forme (icônes SVG IconSine/IconTriangleWave/IconSquareWave), 3 `NumberInput` à
  steppers (vitesse Hz / profondeur cents|0..1 / installation ms) + un **graphe
  LFO éditable à poignées** par sous-bloc (P.5). **Auto-pan (T.2)** : sous-bloc
  identique (profondeur 0..1) + **étiquettes G/D** sur le graphe (médiane = centre
  stéréo ; **D en haut / G en bas**, cohérent avec le signe de `pan` — 1ᵉʳ graphe
  dont l'axe Y est une position, pas une amplitude). Le graphe est **temporel** (axe
  x = temps depuis l'attaque, axe y = valeur de modulation, médiane au centre) :
  oscillation `shape` à la fréquence `rate`, amplitude montant de 0 à `depth` sur
  `onset` puis stable (display **normalisé** à la demi-hauteur). **3 poignées**
  (cercles isotropes + curseur grab/grabbing + tooltips de rôle via `LfoTooltip`
  réutilisant `.adsr-tooltip`) calquées sur l'AHDSR : Profondeur (drag vertical →
  `depth`), Installation (drag horizontal → `onset`), Vitesse (drag horizontal du
  marqueur de période → `rate`) ; la forme reste le switch segmenté. Le graphe
  **coexiste** avec les 3 steppers (les deux pilotent `SET_EDITOR_MODULATION`).
  Discipline d'undo **identique à l'AHDSR** : draft local `draftMod` pendant le
  drag, **un seul** dispatch au relâchement (pas de spam de la pile). Géométrie x
  **gelée** au mousedown (`modDragGeomRef`) le temps du geste, sinon la fenêtre se
  redimensionnerait sous la poignée. **Animation = point de phase** (remplace le
  scroll) : un seul point mobile parcourt la courbe figée à la vitesse `rate`.
  **Une seule** boucle `rAF` pour le module ; **iter-T T.1** : elle ne dessine/anime
  plus que le **graphe de l'effet visible** (`effectsSelected`) — l'autre canvas est
  en `display:none` (clientWidth=0, le peindre produirait un canvas au format par
  défaut), laissé intact et repeint au prochain switch. Gatée strictement par
  `modulationVisible` (prop App.jsx couvrant collapse/maximize/onglet/mobile) ET par
  l'effet **visible** `enabled` (effet off = médiane grise, poignées inertes) ET
  **figée pendant un drag** — arrêt propre au repli/maximize/démontage (audit perf N.1). Édition via
  `editorActions.setModulation(effect, key, value)` → action paramétrée unique
  `SET_EDITOR_MODULATION` (clampée, undoable).
- **Quadrant Instrument responsive (iter-O phase-3, desktop only)** : reçoit
  `isMobile` (prop, source unique App.jsx) et lit `windowHeight`. Dégradation à
  **2 étages** qui libère des lignes pour le clavier quand l'espace se resserre
  (seuils `width OU height`, tous au-dessus du plancher accordéon 668) — **étage
  1** `instrumentCollapsed` (w<950 ∥ h<780) : les contrôles système quittent le
  corps pour une **icône `[⚙]`** dans le header (ouvre la modale inchangée) ;
  **étage 2** `octaveInHeader` (w<924 ∥ h<710, ⟹ étage 1) : les 11 boutons
  d'octave deviennent un **stepper `▴▾`** (`NumberInput` O.1) dans le header, la
  `we-octave-row` du corps disparaît. `data-anchor="designer-octave-selector"`
  suit le contrôle (row OU stepper, rendu unique). **Mobile (accordéon)
  inchangé** : bouton système full-width + modale, 11 boutons d'octave.
- **Modèle unifié + lentilles (M rattrapage r.1 → r.3)** : la vérité audio est
  `editor.canonical` ; `editor.currentLens` ('free' | 'spline', M.r.3.2 :
  'bars' retiré) pilote l'affichage. Plus de mode silotant : les 3 zones
  regardent la même canonical.
  - **Lentilles vivantes (M.r.3)** : synchronisation **ascendante** câblée — les
    5 actions qui modifient la canonical par une voie non-spline re-fittent les
    ancres avant de recalculer le résidu (helper `refitAnchorsAndResidual`,
    count préservé). La lentille Spline reflète donc toujours le tracé courant
    (plus d'ancres figées à `y=0` après tracé libre / preset). Cf. « Décisions
    architecturales » pour la liste exacte des actions concernées / exemptées.
  - **Normalisation explicite (M.r.4)** : un flag d'état
    `editor.canonicalNormalized: boolean` répond à « la canonical est-elle à
    phase canonique sinus pur ? ». Posé par chaque action qui écrit canonical
    (true : NORMALIZE, édition de barre, LOAD_PRESET, `APPLY_EDITOR_PRESET('sine')`,
    Reset×2 ; false : tracé libre, drag d'ancre, interpolation, `SET_EDITOR_CAP`,
    hydratation d'un patch, presets carré/dent de scie/triangle ; inchangé :
    actions qui ne touchent pas canonical). Volatile (non persisté dans le patch
    ni `.osa`). **Pas** une détection numérique : le round-trip
    `harmonicsToPoints(canonicalToBars(x))` n'est pas idempotent (resample
    600↔512 linéaire → leakage). Le flag pilote trois chemins UX :
    - bouton **Normaliser désactivé** (`disabled`, tooltip « Déjà normalisé »)
      quand le flag est true ;
    - **courbe normalisée en background** (`normalizedBg`,
      `harmonicsToPoints(canonicalToBars(canonical, cap), cap)`) dessinée en gris
      discret (`canvas-text-primary`, alpha 0.5, 1px) **sous** la canonical, dans
      le canvas Libre (`drawCanvas`) ET le mode Ancres (`SplineEditor`), tant que
      le flag est false ; + légende overlay `NormalizeLegend` (« actuelle » /
      « si normalisée ») ;
    - **dialog edit-bars** (`pendingBarEdit` → `ConfirmDialog`) : `handleHarmonicMouseDown`
      intercepte le mousedown sur une barre quand le flag est false (n'initie
      aucun draft) ; « Normaliser et continuer » enchaîne `normalize()` +
      `setHarmonicAmplitude(index, value)` du mousedown originel (2 dispatchs =
      2 crans d'undo, assumé) ; « Annuler » ne dispatch rien.
  - **Forme d'onde** (`renderCanvasArea`) : deux modes d'édition exclusifs
    pilotés par le **toggle Libre↔Ancres** du header (bascule `currentLens`
    free↔spline). Libre = tracé main levée ; Ancres = `SplineEditor` (poignées).
    Header partagé entre les deux (`renderWaveformHeaderControls`). **r.2.6.2** :
    l'ancien switch 2-boutons est devenu un **toggle unique** porteur de l'icône
    `Spline` (`is-active`/`aria-pressed` = mode interpolé ; tooltips « Mode Dessin
    libre/interpolé » sans le mot « lentille », r.2.6.4), qui sert aussi de label
    visuel devant le contrôle Nombre d'ancres. Le toggle **Doux/Anguleux** (icônes
    **SVG custom** `IconDoux`/`IconAnguleux`, style Lucide, **joint en switch
    segmenté** r.2.6.4) + le **stepper** « N / 32 » (saisie libre + chevrons `▴▾`,
    iter-O phase-1 : l'ancien slider range est retiré ; input aligné sur la hauteur
    des boutons, r.2.6.4) + le bouton **Normaliser** (icône `Sigma`, déplacé
    depuis la barre du haut en r.2.6.8 → `NORMALIZE_EDITOR_CANONICAL` ; **M.r.4 :
    `disabled` quand `editor.canonicalNormalized`**, tooltip « Déjà normalisé »)
    + (**iter-N N.4**) les deux boutons de **lissage** expérimentaux : `Waves` →
    `SMOOTH_EDITOR_CANONICAL` (passe-bas) et `ChartSpline` → `TEND_TOWARD_SPLINE`
    (tend vers la spline) — y sont **toujours rendus** (positions stables) ; les
    contrôles d'ancres sont `disabled` en mode Libre (M.r.2.5.2) ; saisie directe
    du nombre d'ancres via `<NumberInput>` (M.r.2.5.3). **iter-O phase-2.2** : ces
    6 contrôles (lens · ancres · interp · normalize · smooth-lp · smooth-sp) sont
    désormais les items d'un **`OverflowToolbar`** (priority-plus) ; au lieu d'un
    fragment, `renderWaveformHeaderControls` construit un tableau d'items
    `bar`/`tray` (ordre visuel préservé) — quand la colonne se rétrécit, les
    derniers passent dans le tiroir `⋯`. Le node unique marche aux deux endroits
    (header Libre `.we-canvas-area` et `headerControls` de `SplineEditor`).
    - **Convention d'amplitude (M.r.5.1)** : l'axe Y du canvas s'**auto-fit** à
      `[-peak, +peak]` (peak = `max(max(|canonical|), max(|normalizedBg|), 1)`,
      minimum 1 pour garder le marqueur visible) au lieu de `[-1, +1]` fixe — la
      canonical qui dépasse ±1 (cumul `Σ|amplitudes_k|`) est affichée en entier.
      `valueToY(v) = midY − (v/peak)·(H/2)` encapsule l'échelle ; le zoom Y suit
      une **transition douce** (`peakDisplayedRef` lerpé `+= (target−cur)·0.15`
      par frame dans une boucle rAF, ~150 ms). **Marqueur ±1** = niveau audio
      référence, deux pointillés d'accent atténués + étiquettes `+1`/`-1`
      **dessinées sur le canvas** (suivent l'auto-fit ; labels DOM retirés, seul le
      `0` médian subsiste). **Grille de repères (M.r.5.bis, passe d'usage)** :
      `drawAmplitudeGrid` ajoute les niveaux par pas de 0.5 jusqu'au pic affiché —
      `+0.5`, `+1.5`, `+2`, `+2.5`, `+3`… (et négatifs), donc `+2`/`+3`
      n'apparaissent que quand l'auto-fit dilate l'échelle ; ±1 reste le marqueur
      accent. Le tracé libre n'est **pas clampé** à ±1 (`getCanvasPoint` borne à
      ±peak) — le navigateur normalise la `PeriodicWave` à la lecture.
    - **Auto-fit Y commun aux deux lentilles (M.r.5.bis.1)** : `SplineEditor`
      (lentille Ancres) calcule son propre `peakTarget`/`peakDisplayedRef` (même
      logique + lerp rAF) et mappe `[-peak, +peak]` partout (courbe, normalizedBg,
      grille ±0.5, poignées, `eventToData`, `hitTest`). Marqueur ±1 extrait en
      primitive partagée `drawAmplitudeMarker` (`lib/canvas.js`) → rendu identique.
      `peakDisplayedRef` **lazy-init à la cible** dans les deux composants : au
      switch Libre↔Ancres l'échelle est déjà bonne, **aucun saut animé**. Depuis la
      passe d'usage (alignement non-clamp, voir Décisions), un drag d'ancre au-delà
      de ±1 dilate aussi l'auto-fit (les ancres et `splinePlusResidual` ne sont
      plus bornés à ±1 en édition live).
    - **Spline parfaite — 3ᵉ courbe (M.r.5.bis.2)** : `splineToPoints(anchors,
      interpolation)` (squelette des ancres SANS résidu) dessinée en **orange**
      (`--canvas-spline-perfect`) entre le gris normalisé et la canonical bleue,
      dans **les deux lentilles**, en permanence tant que l'écart à la courbe
      affichée (= résidu) dépasse **0.01** (sinon cachée, se confondrait). Permet
      de voir simultanément la spline éditée et le tracé résultant (spline +
      résidu). `peakTarget` l'inclut quand affichée pour ne pas l'écrêter.
      `NormalizeLegend` étendue à 3 entrées conditionnelles (bleu « actuelle »
      toujours ; gris « normalisée » si `!canonicalNormalized` ; orange « spline
      des ancres » si visible) ; montée seulement si ≥ 1 entrée conditionnelle
      active. **Passe d'usage** : pendant un **drag d'ancre**, le tracé bleu
      (canonical) est prévisualisé comme `spline(draft) + résidu` (clampé ±1, =
      sortie reducer au commit) au lieu de la spline pure — les trois courbes
      restent donc visibles avec leur rôle (bleu = résultat, orange = spline
      éditée, gris = normalisée) et rien ne saute au relâchement.
    - **Marge tampon aux bords (M.r.5.bis, passe d'usage)** : `DRAW_MARGIN` (12px
      horizontal) et `DRAW_MARGIN_TOP`/`DRAW_MARGIN_BOTTOM` (26/24px verticaux,
      asymétriques, pour les canvas Forme d'onde — médiane tracée à `valueToY(0)`),
      partagés via `lib/canvas`, confinent le tracé / les poignées / les barres à
      l'intérieur (rendu ET mapping d'entrée insettés), tandis que l'élément
      capteur garde sa taille pleine → la souris a une bande tampon avant de
      quitter l'élément et de **perdre le geste** au bord (même esprit que le lasso
      de la bibliothèque). La marge verticale plus large réserve une **gouttière
      haut/bas** où loger la **légende** (haut) et le **hint d'usage** (bas, lentille
      Ancres) HORS du tracé (ils ne le chevauchent plus) — gouttières asymétriques
      (26/24px) pour dégager les marqueurs ±1, médiane tracée à `valueToY(0)`.
      Appliqué au canvas Libre (`strokeWave`/
      `getCanvasPoint`), au canvas Ancres (`SplineEditor`) et à la zone Harmoniques
      (padding 12px + `harmonic*FromEvent` insettés ; pas de gouttière, pas
      d'overlay). Les lignes de repère (0, ±0.5, marqueur ±1) restent pleine largeur.
  - **Harmoniques** (`renderHarmonicsArea`) : barres **toujours
    éditables** (drag vertical = amplitude [0..1], 1 barre/geste verrouillée à
    l'index au mousedown, commit unique → 1 undo), indépendantes de
    `currentLens` (le type ne porte plus 'bars' depuis M.r.3.2). Header : **indicateur non
    interactif** (icône `AlignEndHorizontal`, r.2.6.2) + **contrôle unique du
    cap** = **stepper** « N / 256 » (saisie libre + chevrons `▴▾`, iter-O phase-1 :
    l'ancien slider range 1..256 est retiré ; l'appui maintenu récupère le scrub
    live des harmoniques).
    - **Cosmétique (M.r.5.2)** : **code couleur des barres** — bleu (accent) quand
      `editor.canonicalNormalized` est true (édition directe possible), gris
      (classe `is-unnormalized`) sinon (un clic ouvre le dialog edit-bars
      M.r.4.3). **Repères horizontaux** 0/0.5/1 en overlay pointillé sous les
      barres ; **axe Y** étiqueté 0/0.5/1 à gauche, **axe X** étiqueté `kf` sous
      les barres (toutes les harmoniques si cap < 8, puissances de 2 sinon). Plot
      en grille CSS (`.we-harmonics-plot`) ; repères, étiquettes Y et X alignés
      sur la zone des barres. Pur DOM/CSS.
    - **Clic droit = mise à zéro (M.r.5.bis.3)** : clic droit sur une barre éteint
      l'harmonique (`setHarmonicAmplitude(index, 0)`), sans initier de draft/drag.
      `onContextMenu` bloque le menu natif. La garde de phase edit-bars s'applique
      comme au clic gauche : si `!canonicalNormalized`, le dialog (`value:0`)
      précède l'opération — pas de raccourci silencieux contournant la convention.
  - `draftAmplitudes` (geste continu) → reconstruction iDFT live (forme d'onde
    + audio). `cap` (1..256) borne les harmoniques à la synthèse
    (`pointsToPeriodicWave`), pas au modèle.
- **Plus de passerelle « Convertir vers… » (supprimée en M.r.2.4)** : la
  bascule entre les deux modes d'édition de la Forme d'onde passe par le switch
  Libre/Ancres ; aucun chemin utilisateur explicite vers 'bars' (l'édition de
  barres est directe dans la zone Harmoniques).
- Éditeur AHDSR **visuel** 380×120 : 4 poignées draggables — P1
  (attack+amplitude en 2D), P1h (hold seul en 1D depuis F.3.13.1),
  P2 (decay+sustain en 2D), P4 (release seul en 1D). Courbe cyan +
  remplissage, 6 sliders éditables en colonne à droite (Amp →
  Attack → Hold → Decay → Sustain → Release, F.3.12.2). Graph
  fidèle : `p1.y = adsrLevelToY(amplitude)` (peak), `p2.y =
  adsrLevelToY(amp×sustain)` (sustain absolu = ratio du peak). À
  amp=0.5 et sustain=1, P2 atteint visuellement P1/P1h. P1h est
  rendu et testé en priorité sur P1 (z-order — P1h dessiné après,
  hit-testé avant) à hold=0 : grab attrape P1h, drag horizontal tire
  le hold à partir de 0. Pour accéder à P1 dans cette configuration,
  passer par les sliders Attack/Amp ou augmenter d'abord le hold via
  le slider dédié. Plateau sustain restauré en tirets symboliques
  entre P2 et P3 (P3 géométrique non-draggable, fin du plateau) — ne
  représente pas une durée audio, c'est un repère visuel de la phase.
  Constantes : `ADSR_W = 4 × ADSR_SEGMENT_PX + ADSR_SUSTAIN_PX = 380`,
  `ADSR_MAX_MS = 1000` ms, `ADSR_SEGMENT_PX = 80`,
  `ADSR_SUSTAIN_PX = 60`, `ADSR_HANDLE_RADIUS = 5`. Les 6 valeurs
  sont éditables au clavier via `NumberInput` (clic, parse permissif,
  Enter/blur commit, Esc annule).
  **Mode compact (iter-O phase-4)** : la zone est observée (`ResizeObserver` sur
  `.we-adsr-area`) ; sous `ADSR_COMPACT_WIDTH`/`HEIGHT` un **switch segmenté
  Graphe/Sliders** (icônes `Activity`/`SlidersHorizontal`) apparaît dans le
  header et n'affiche **qu'une vue à la fois** (`adsrView` persisté, défaut
  `graph`). Vue Sliders seule = **grille 2 colonnes** (Amp/Attack/Hold |
  Decay/Sustain/Release). Le canvas n'est **jamais démonté** (masqué en CSS,
  `display:none`) ; redraw forcé au retour en vue Graphe. Mesure sur la zone (pas
  `windowWidth`) → marche en desktop, accordéon mobile et futur collapse O.5.
  Polish handles (F.3.13.2-3) : cercles isotropes (dessinés en coords
  physiques après reset transform, pas d'ellipses), curseur dynamique
  (default → grab au survol d'un handle → grabbing pendant drag),
  tooltips au survol indiquant le rôle de chaque handle (P1, P1h, P2,
  P4) — composant `AdsrTooltip` positionné absolument dans le
  container, bascule sous le handle si proche du bord haut.
- Hydratation auto depuis `currentPatch` (prop) via `useEffect` qui compare l'id
  contre `hydratedFromIdRef`. Hydrate uniquement les champs du patch (points,
  ADSR, amplitude, preset) ; les champs `test*` (contexte de test de
  l'utilisateur) ne sont PAS écrasés.
- **Dirty check** exposé via `useImperativeHandle` (`isDirty()`). Compare
  uniquement les champs du patch (pas les `test*`) vs `referenceRef`.
- Deux boutons sauvegarder :
  - "Mettre à jour" (visible si `currentPatch`) : `onUpdatePatch(id, payload)`,
    flash "Patch mis à jour".
  - "Enregistrer comme nouveau" / "Sauvegarder le patch" : `onSavePatch(payload)`,
    bascule la référence et le `hydratedFromIdRef` vers le nouvel id, déclenche
    `onPatchCreated(id)` pour que App set `currentPatchId`.
- L'identité du patch ("Patch N" en création / "Édition : NOM" chargé) est
  affichée dans la barre du haut (`DesignerToolbar`) — plus dans le header de
  la zone Forme d'onde (M.r.2.1).

### `DesignerToolbar.jsx` (iter-M phase-r.2)
- Barre du haut unique du Designer, au-dessus des 3 colonnes. Style aligné sur
  les headers de colonne. Rendue par App.jsx en desktop (au-dessus de
  `DesignerColumns`) **et** en mobile (au-dessus de l'accordéon).
- Gauche : identité du patch (`patchLabel`) + boutons **Presets** (ouvre
  `PresetPicker`, déplacé depuis le header Harmoniques) et **Reset** (timbre seul,
  ConfirmDialog → `RESET_EDITOR_WAVEFORM`). **r.2.6.2** : rendus en **icônes
  Lucide** (Presets → `FolderOpenDot`, Reset → `Eraser`) via la classe partagée
  `.icon-btn` — `title` complet + `aria-label` conservés. **r.2.6.8** : le bouton
  **Normaliser** (`Sigma`) a quitté la barre du haut pour le **header de la zone
  Forme d'onde** (cf. `renderWaveformHeaderControls`), où il est visible dans les
  deux modes d'édition.
- Droite (desktop seulement, si `onEqualizeWidths` fourni) : séparateur visuel +
  **bouton « Égaliser »** (iter-Q, icône `Table` de Lucide pivotée 90° → grille
  3×2 = les deux rangées de trois colonnes) + séparateur + toggle
  **Auto-réduction** (`FoldHorizontal`). Le bouton Égaliser est une **action
  momentanée** (pas un toggle) : clic → `onEqualizeWidths` (App :
  `designerColumnWidths` ET `designerBottomRowWidths` remis à ⅓⅓⅓). **Actif
  dérivé** (aucun état persisté en plus) : vrai quand les **deux** rangées sont
  déjà à ⅓⅓⅓ (`widthsEqual` sur `columnWidths` + `bottomRowWidths`, epsilon
  1e-3) ; coloration accent reprise de `.spectrogram-toggle.is-active`
  (M.r.2.6.7) via `.designer-toolbar-preset-btn.is-active`. Les proportions
  custom restent accessibles via le **drag des séparateurs** (haut + bas). En
  mobile, ces contrôles ne sont pas rendus. **iter-Q** : les 4 presets de
  proportions + le bouton AUTO (auto-sizing) ont été retirés ; `IconColumnLayout`
  / `IconAuto` supprimés d'`icons.jsx`.
- Présentational : tous les handlers viennent d'App.jsx (égalisation/auto-réduction)
  et de `WaveformEditor` via l'API children (Presets/Reset/Normaliser/patchLabel).
- Le groupe droit (2 items : Égaliser + Auto-réduction) est rendu via
  `OverflowToolbar` (priority-plus, libellés « Disposition des modules »). Le
  séparateur de tête passe en prop `prefix` (chrome fixe). `is-active`/`aria-pressed`
  (état dérivé) conservés. Gauche inchangée.

### `OverflowToolbar.jsx` (iter-O phase-2.1)
- Barre d'outils **générique réutilisable** « priority-plus » : affiche un max
  d'items en ligne (forme `bar`), pousse le reste dans un **tiroir popover `⋯`**
  (forme `tray`, ligne libellée). Repli **droite→gauche** (index 0 = plus
  prioritaire). Props : `items:[{id,bar,tray,badge?}]`, `prefix?` (chrome fixe en
  tête), `className?`, `ariaLabel?`, `menuLabel?`, `triggerIcon?`, `trayFooter?`,
  `closeOnSelect?`, **`triggerBadge?`** (iter-T T.1, défaut `false` : le bouton `⋯`
  porte une **pastille d'accent** dès qu'au moins un item **débordé** porte
  `badge:true` — opt-in pur, inerte pour les usages qui ne le passent pas ; sert au
  module Effets à signaler qu'un effet activé est masqué dans le tiroir). Retourne
  `null` si `items` vide.
- **Mesure** : *ghost row* hors flux (`position:absolute; visibility:hidden;
  pointer-events:none`) rendant toutes les formes `bar` (+ clone inerte du `⋯`)
  → largeurs naturelles même à largeur variable. **`ResizeObserver`** sur root +
  ghost (resize fenêtre + drag séparateurs + presets ; pas de `window.resize`) ;
  la mesure initiale est portée par le 1er callback RO (pas de `setState`
  synchrone dans l'effet).
- **Anti-boucle** : le root remplit l'espace alloué par le flex parent
  (`flex:1 1 0; min-width:0`) et aligne son contenu à droite → largeur observée =
  espace dispo, **indépendante du contenu** ; `setState` seulement si le set
  visible change (le changement ferme le tiroir, sans voler le focus).
- **Popover** : `Esc` / clic-dehors ferment, focus à l'ouverture + retour au `⋯`
  à la fermeture (aligné sur `BibContextMenu`). L'**état des contrôles vit dans le
  parent** ; l'OverflowToolbar ne fait que **relocaliser** où le node est rendu,
  au resize seulement (geste délibéré, pas de surprise en plein geste).
- Branché en O.2 : header **Forme d'onde** (6 contrôles, même node aux deux
  endroits Libre/Ancres) et **groupe droit DesignerToolbar**. **O.6.2 : généralisé
  aux 5 headers de module** — Harmoniques (1 item cap), Instrument (octave + ⚙,
  conditionnels), AHDSR (switch Graphe/Sliders compact), Spectrogramme (live/dB/peak).
  L'icône + le titre restent HORS de l'OverflowToolbar (`we-header-left`) ; seuls
  les contrôles débordent au tiroir. `getAnchoredPosition` ignore les candidats
  `visibility:hidden` (clones des *ghost rows*) pour que les `data-anchor` passés
  en OverflowToolbar (ex. `designer-octave-selector`) résolvent sur l'élément vu.

### `DesignerColumns.jsx` (iter-M phase-2.2, allégé r.2.1)
- Moitié haute du Designer en 3 colonnes ajustables (Forme d'onde /
  Harmoniques / Spectrogramme). Props : `widths` (3 fractions sommant à 1,
  persistées), `onWidths`, `columns` (3 nodes), `collapsed`, `sepLabels`.
  Réutilisé tel quel pour la **rangée du bas** (iter-P P.6.2 : Instrument /
  AHDSR / Modulation, `designerBottomRowWidths`).
- **iter-Q** : l'auto-sizing (redimensionnement auto au focus) a été **retiré**
  (impraticable). Les props `autoSizing` / `onManualResize` / `focusGuardRef`,
  les constantes `FOCUS_WIDTHS`/`REST_WIDTHS`, le `useEffect` de tracking focus
  et le `focusColRef` ont disparu. Ce composant ne gère **plus que** les
  séparateurs glissables ; l'égalisation passe par le bouton « Égaliser » de la
  `DesignerToolbar` (les deux rangées à la fois).
- Séparateurs glissables (`flex-grow` = fractions) : `mousedown` capture l'event
  (`stopPropagation`, recalcul absolu depuis `startWidths`/`startX`, plancher
  12 % par colonne). Le `stopPropagation` isole le drag du clic-colonne. Le drag
  commit directement les largeurs (`onWidths`).
- État `designerColumnWidths` (reducer, non-undoable, persisté). Défaut piloté
  par la lentille (½¼¼ en free/spline) tant qu'aucune valeur n'est persistée. Le
  spectro est une **colonne permanente** (toggle « Spectro » retiré ;
  `spectrogramVisible` vestigial, clé localStorage conservée).

### `DesignerModule.jsx` + `ModuleChrome.jsx` (iter-O phase-5a→5c)
- **`DesignerModule`** : wrapper uniforme des 5 modules Designer (canvas /
  harmonics / spectrogram / params / adsr). Bascule **bande ↔ contenu** sans
  fixer sa largeur (rôle du conteneur de rangée : `DesignerColumns` ou
  `.designer-cell`). **Contrainte imposée** : le contenu (qui peut héberger un
  `<canvas>`) est **toujours monté**, passé en `display:none` quand replié —
  jamais démonté, sinon canvas vide au retour (le `ResizeObserver` du canvas
  redessine au retour à dimensions non nulles). La bande (`<button>`) est un
  **frère** affiché à la place du contenu ; **O.5c** : layout vertical = **icône
  d'identité** (`MODULE_META[id].Icon`) en tête + **titre en rotation**
  (`writing-mode: vertical-rl`) dessous, clippé (`overflow:hidden`) s'il ne rentre
  pas. Clic = réouverture. `data-module={id}`. `props` : `onToggleCollapse` (bande
  + chrome) / `onToggleMaximize` / `maximized`.
- **`ModuleChrome`** : chrome **« contrôle de fenêtre »** (style distinct des
  `.icon-btn` d'action — pastille discrète). **O.5c** : **centralisée dans
  `DesignerModule`** (rendue une seule fois, retirée des 5 headers), en **position
  absolue au coin haut-droit** du wrapper (`.designer-module` `position:relative` +
  `container-type:inline-size` ; chrome dans le contenu → masquée gratuitement
  quand replié). Les headers réservent un `padding-right` (scopé
  `.designer-module …`, desktop). Boutons **nus** (sans pastille) aux **icônes
  contrôles-fenêtre façon Windows** (SVG custom `IconWin*` dans `icons.jsx`, style
  Lucide) : **Réduire** = trait horizontal (**désactivé en maximisé** — « Restaurer
  d'abord ») + **Agrandir/Restaurer** = rectangle ↔ deux rectangles décalés
  (toggle). **Desktop only** (la chrome n'existe que dans le wrapping desktop ;
  l'accordéon mobile a son propre repli).
- **Identité visuelle (O.5c)** : table `src/lib/designerModules.js` `MODULE_META`
  = `{ label, Icon Lucide }` par module (`AudioWaveform`/`BarChart3`/`Grid2x2`/
  `Piano`/`AudioLines`), **source unique** réutilisée par les headers (icône
  `.we-area-icon` devant `h3` dans `we-header-left`, 6 sites) et la bande. Le
  **masquage auto du titre quand le module rétrécit** (spec 5c.2) a été **retiré**
  (5c.f5) : la container query posait `container-type:inline-size` qui bloquait le
  shrink flex (5c.f3), et son remplacement par un `ResizeObserver` JS perturbait la
  livraison des RO canvas (Forme d'onde non rafraîchie) et du mode compact AHDSR
  (5c.f4). Le titre reste donc affiché. À ré-aborder autrement si souhaité.
- **Collapse** (O.5a) : `designerCollapsed` (5 booléens) persisté, non-undoable.
  `TOGGLE_DESIGNER_MODULE_COLLAPSED` (payload `{ id, autoCollapse }`, Réduire +
  réouverture). `DesignerColumns` reçoit `collapsed` (3 booléens) → colonne repliée
  en `flex:0 0 var(--module-band-width)` (28px), exclue du flexGrow **normalisé par
  la somme des ouvertes** (5a.3 — sinon Σ flex-grow < 1 laisse un trou ; ratios
  préservés) + séparateur adjacent rendu inerte mais conservé comme léger gap ;
  `.designer-cell.is-collapsed` fait pareil pour les 2 modules du bas.
- **Auto-réduction** (O.5d) : `autoCollapse` (booléen persisté, non-undoable) +
  toggle indépendant dans la `DesignerToolbar` (`FoldHorizontal`, séparé du groupe
  proportions). Quand actif, **rouvrir** un module replié replie ses **siblings de
  rangée ouverts** (`rowSiblings` via `DESIGNER_ROWS`) → ~1 ouvert/rangée (accordéon
  par rangée, haut/bas indépendants) ; **en fermeture, aucune politique**. Flag
  **effectif** = `autoCollapse || winWidth < AUTO_COLLAPSE_DEFAULT_WIDTH` (1100,
  calibrable) — **forcé** sous le seuil (toggle alors `is-active` + `disabled`),
  sinon les modules d'une rangée se replient tous faute de place. Calculé au rendu
  (pas de closure sur winWidth dans le handler — TDZ). (iter-Q : l'auto-sizing
  ayant été retiré, l'auto-réduction est désormais le seul automatisme de
  disposition.)
- **Maximize** (O.5b) : `maximized` (id ou null, un seul à la fois) persisté,
  non-undoable. Action `SET_DESIGNER_MAXIMIZED` (setter pur, toggle côté handler
  `handleToggleModuleMaximized`). **Prioritaire sur collapse**, restaure l'état au
  retour. `DesignerModule` maximisé → classe `is-maximized` (contenu montré, bande
  masquée). `.designer-main.is-maximized` + `:has(.is-maximized)` (App.css) :
  le module remplit la zone sous la `DesignerToolbar` (conservée), tout le reste
  (rangée opposée, voisins, séparateurs, contrôles de proportions) caché en CSS,
  **jamais démonté** (canvas redessinés au retour). **Desktop only.**

### `ConvertToHarmonicDialog.jsx` — SUPPRIMÉ (M.r.1.4)
- Dialog de la passerelle draw→harmonic. **Supprimé** avec les conversions
  destructives : les lentilles partagent désormais la même `canonical`, le
  toggle bascule via `setCurrentLens` (plus de dialog).

### `SplineEditor.jsx` (iter-M phase-3)
- Éditeur du mode spline (points/courbe), rendu dans la colonne Forme d'onde.
  Canvas : courbe (`points`/draft) + poignées d'ancres draggables (pattern
  visuel ADSR : pastilles cerclées d'accent, pleine si sélectionnée/survolée).
- Interactions : drag poignée → `MOVE_SPLINE_ANCHOR` (X clampé entre voisins,
  Y borné ±peak, **draft local** committé au mouseup → 1 cran undo ; courbe live =
  `spline(draft) + résidu warpé` via `warpResidualForAnchorMove`, identique au
  commit reducer — le détail ride sur l'ancre, N.3/N.3.1) ; clic hors poignée →
  `ADD_SPLINE_ANCHOR` (l'ancre se **pose sur le tracé** : `y = canonical[x]`, la
  hauteur du clic est ignorée, zéro déformation — N.3.2) ; poignée + Suppr/Backspace
  **ou** clic droit → menu contextuel « Supprimer » → `REMOVE_SPLINE_ANCHOR` (tracé
  inchangé). Curseur grab/grabbing/crosshair. Réutilise `.we-canvas-area` /
  `.canvas-container` / `.label` (WaveformEditor.css, globaux).
- **r.2.4** : prop `convertButtons` + toggle Doux/Anguleux interne supprimés,
  remplacés par une prop `headerControls` (le switch Libre/Ancres + Doux/Anguleux
  + nombre d'ancres sont remontés dans `WaveformEditor.renderWaveformHeaderControls`
  et rendus dans le header partagé). `onSetInterpolation` retiré des props.
- Refs miroir mis à jour en `useEffect` (jamais pendant le render —
  react-hooks/refs), double-rAF ResizeObserver (contournement Firefox).

### `ConvertToSplineDialog.jsx` — SUPPRIMÉ (M.r.1.4)
- Dialog draw/harmonic → spline. **Supprimé** avec les conversions destructives
  (cf. ConvertToHarmonicDialog ci-dessus).

### `PresetPicker.jsx` (iter-M phase-4, refondu iter-N N.5c, étendu N.5f)
- Modale **point d'entrée unique** des sons pré-fabriqués, ouverte par le bouton
  « **Timbres** » (renommé en N.5f) de la **barre du haut** (`DesignerToolbar`).
  Backdrop + carte centrée (600px). Escape / clic backdrop ferment. Quatre sections :
  - **Formes de base** (`BASE_WAVEFORMS`) : sinus = 1 vignette (N figé à 1) ;
    carré/scie/triangle = **2 vignettes** (idéale statique + band-limitée qui se
    redessine en live au changement de N) + champ N (`NumberInput`, saisie libre
    snappée via `snapN` selon `snap` : odd/all). Clic vignette = charge cette vue.
  - **Formes paramétriques** (`PARAMETRIC_WAVEFORMS`, N.5f) : escalier, scie à
    étages, sinus décroissante, pulse, trapèze, demi-sinus, impulsion. Par forme :
    contrôle(s) du/des **param(s) de forme** (`NumberInput` bornés ; entiers arrondis
    au commit) + champ N + **2 vignettes** ; l'idéale suit les params, la band-limitée
    suit params **et** N (redraw live, `useMemo` sur `ns` + `shapeParams`). Clic =
    charge avec params/N courants (`preset: null`, `canonicalNormalized: false`,
    `anchorCount` résolu — suit K pour escalier/scie).
  - **Timbres conçus** (flûte/orgue/cuivre) et **Inattendus** : grilles de
    vignettes, clic = charge.
- Vignettes via `PatchThumbnail` ; la modale **résout elle-même la canonical**
  (moteur `lib/waveforms.js` + `harmonicsToPoints`) et passe à `onPick` un payload
  prêt `{ canonical, cap, anchorCount, canonicalNormalized, preset }`.
- Le dispatch `LOAD_PRESET` vit côté `WaveformEditor` (`handlePickPreset`). **N.5e.1**
  : le chargement se comporte comme **Effacer** (`RESET_EDITOR_WAVEFORM`) — **pas
  de confirmation** (undo = filet), pas de garde-fou dirty (`pendingPresetPayload` /
  `ConfirmDialog` preset retirés). `onPick` → `loadPreset(payload)` direct.
- `LOAD_PRESET` (reducer, undoable atomique) pose la canonical résolue + cap +
  fitte les ancres par DP au `anchorCount` du preset + recalcule le résidu ;
  amplitude/ADSR/test* préservés. **N.5e.1 : conserve `currentPatchId`** (chargement
  en place qui remplace le timbre du patch courant et le marque dirty, comme
  `RESET_EDITOR_WAVEFORM` — au lieu de détacher façon Ctrl+Alt+N).

### `Timeline.jsx` (Composer)
- Layout multipiste : colonne d'en-têtes de piste (sticky left, 120px) +
  grille scrollable (overflow-x/y) + zone d'extension (+1/+4/+16 mesures).
- En-tête de piste (2 lignes) : pastille couleur + nom (double-clic renomme) +
  × supprime | boutons M/S + slider volume. Drag en-tête = réordonnancement.
  Ghost flottant + indicateur d'insertion pendant le drag.
- Couloirs de piste : fond alternant, bordure gauche colorée, lane assignment
  greedy par piste, surbrillance au survol pendant drop/paste.
- Drop de patches : `findTrackAtY` identifie la piste cible depuis la coordonnée Y.
- Drag de clips cross-piste : `trackDelta` via `mouseStartTrackIndex`,
  `effectiveLane = 0` pendant le preview, commit `trackId` au drop.
- Clips : position absolue, snap 16ᵉ, drag/resize/duplication, multi-sélection
  (rectangle, Ctrl+clic, Shift+drag). Clic droit clip = retirer.
- Grille : lignes absolues, subdivision adaptative (noire/croche/double/triple),
  Ctrl+molette zoom centré souris. Numéros de mesure sticky top.
- Menu contextuel : clic droit zone vide = "Coller ici" (avec surbrillance
  pistes cibles), clic droit mesure = CRUD mesure. Échap ferme le menu.
- Curseur de lecture + visualiseur oscilloscope persistant.

### `PatchBank.jsx` (partagé Designer & Composer)
- Liste verticale de chips (responsive : bandeau horizontal en <900px).
- Drag → payload `text/plain` = patchId (drop sur Timeline).
- **Designer** : clic charge le patch dans l'éditeur ; double-clic = renommer
  inline ; pas de bouton ✎. × supprime.
- **Composer** : clic = no-op ; double-clic = renommer inline ; ✎ = éditer
  dans Designer (dirty check + bascule onglet) ; × supprime.
- **Dossiers** : clic = toggle ; double-clic = renommer inline ; × supprime.
- Chip avec `currentPatchId` reçoit la classe `is-current` (highlight bordure,
  Designer only). Plus d'affichage de fréquence : un patch n'a plus de hauteur.

### `usePlayback` (hook, `src/hooks/usePlayback.js`)
- Une instance dans App. Singleton de fait pour le moteur audio timeline.
- Retourne `{ isPlaying, cursorPos, currentTime, isExporting, analyserRef,
  play, stop, exportWav, updateTrackGains }`.
- AudioContext créé paresseusement. Cleanup à l'unmount d'App. **`latencyHint`
  numérique** `0.02` s (S.audio.3, calé en .4 — `usePlayback.js` ET `WaveformEditor.jsx`) :
  élargit le tampon de sortie pour absorber les **underruns mobiles** (coupures/
  craquements quand le thread audio est sous pression sur smartphone) — le plus
  petit tampon qui garde le live propre. Latence desktop assumée ; passage
  conditionnel mobile = backlog si elle gêne.
- **Scheduler look-ahead** : `setInterval` 25ms programme les clips dans
  une fenêtre de 100ms d'avance. Refs (`clipsRef`, `tracksRef`,
  `patchesRef`, `bpmRef`) pour lire le state frais à chaque tick.
  La fréquence effective est calculée par `clipFrequency(clip)` (pas lue
  sur le patch). Signature de changement inclut tuningSystem/note/octave/
  frequency → un clip dont la hauteur change pendant la lecture est
  invalidé et reprogrammé comme les autres modifications.
  `scheduledClipIds` (Set) évite le double-scheduling. `activeNodesRef`
  stocke les oscillators actifs. **iter-P** : la signature inclut aussi
  vibrato/trémolo du patch (sérialisés) ; chaque record d'`activeNodesRef`
  porte un `mod` (nœuds LFO) stoppé/déconnecté avec l'`osc`.
- **GainNode par piste** (`trackGainNodesRef`) : chaque piste a son propre
  gain, tous convergent vers `analyserGain` → `AnalyserNode` + `destination`.
- `updateTrackGains(tracks)` : met à jour les gains en temps réel pendant
  la lecture (appelé par un useEffect dans App quand `tracks` change).
- **Export WAV** : scheduling one-shot via `scheduleAllClips` (pas de
  look-ahead dans l'OfflineAudioContext).

### `audio.js`
- `pointsToPeriodicWave(points, ctx, definition)` — FFT 512 points, troncature
  optionnelle des harmoniques k > `definition` (iter-M phase-1 ; absente = spectre
  complet). `pointsToHarmonics(points)` mémoïsé par `points` (cap 256 harmoniques).
- `harmonicsToPoints(amplitudes, N)` (iter-M phase-2) — iDFT
  `Σ aₖ·sin(2πkx/600)`, k=1..N, sur 600 points. Reconstruction de la courbe
  d'un patch harmonique ; stockée dans `points` → l'audio reste mono-chemin
  (round-trip iDFT→DFT propre à 512 échantillons, k≤256 sur un bin exact).

### `lib/presets.js` (iter-M phase-4, élagué iter-N N.5c)
- Bibliothèque **code-only, read-only** de timbres conçus, indépendante du
  PatchBank utilisateur. `TIMBRE_PRESETS` (9 entrées) + `PRESET_CATEGORIES`.
- Chaque entrée `{ id, category, name, description, anchorCount, patch }` où
  `patch` est un HarmonicPatch minimal `{ mode:'harmonic', N, amplitudes }`.
  3 évocateurs d'instruments (flûte/orgue/cuivre) + 6 inattendus-propres.
  **N.5c** : carré/scie/triangle (amplitudes = band-limité N=16) retirés d'ici —
  ils vivent dans `BASE_WAVEFORMS` (`lib/waveforms.js`, 2 vues). `anchorCount` =
  nb d'ancres DP au chargement. Libellés via `STRINGS.timbrePresets`.

### `lib/spline.js` (iter-M phase-3)
- `splineSoft(anchors)` (Catmull-Rom périodique, Hermite cubique y(x) — voisins
  wrappés ±600 pour x monotone, continuité C¹ à la frontière x=600↔0) /
  `splineHard(anchors)` (polyligne périodique) / `splineToPoints(anchors, interp)`
  (dispatcher). Sortie `Float32Array(600)` clampée [-1,1]. Reconstruction de la
  courbe d'un patch spline ; stockée dans `points` (même rôle que harmonicsToPoints).
- `fitAnchorsToCurve(canonical, count)` (iter-N N.2) — pose des ancres par
  Douglas-Peucker à compte fixe (cf. décision dédiée).
- `warpResidualForAnchorMove(refResidual, refAnchors, index, xN, interpolation)`
  (iter-N N.3/N.3.1) — warp horizontal du résidu au drag d'ancre (déformation 2D à
  support local, cf. décision dédiée). Pré-image PL en `hard`, smoothstep C¹ en
  `soft` (anti-angle parasite) avec garde anti-repli. Pur, modulo RESOLUTION (wrap
  des ancres de bord), garde anti-NaN.
- `HARMONIC_COUNT = 256` — plafond d'harmoniques (= défaut/max du slider Définition)
- `SOUND_COLORS` — palette de 12 couleurs
- `audioBufferToWav(buffer)` — encode PCM 16 bits stéréo (mono dupliqué L+R)
- `downloadWav(ab, filename)` — blob + `<a download>` programmatique

## Architecture audio

- **Master bus (S.audio, niveau bas + soft-clip filet)** : helper partagé
  `createMasterBus(ctx)` (`audio.js`) = `GainNode` headroom **bas**
  (`MASTER_HEADROOM` 0.1, S.audio.5) → `WaveShaper` soft-clip **sans mémoire**
  (`makeSoftClipCurve`, knee 0.9, `oversample 4x`). Inséré **entre le point de
  sommation** (`analyserGain` / pistes) **et `destination`** sur les **3 chaînes**
  (preview Designer, lecture Composer, export WAV). **Modèle de niveau (S.audio.5)** :
  on garde le **niveau numérique bas** pour que la sommation polyphonique reste
  propre **par défaut** (~12 notes tenues, sine ET carré, sans saturation) ; la
  **loudness se récupère au dernier étage analogique** = le **volume de l'appareil**
  (qui ne clippe pas). Le soft-clip devient un **filet lointain** qui ne mord quasi
  jamais en usage normal — il a remplacé l'ancien `DynamicsCompressor` (S.audio.4)
  dont la mémoire attaque/release suivait les battements d'accord = pompage (« crr
  crr crr ») ; un WaveShaper plafonne instantanément, zéro pompage, transparent sous
  le genou. L'**analyser reste EN AMONT** du bus → le spectrogramme montre la vraie
  somme synthétisée, pas le signal écrêté. Master **fixe** (pas d'UI, pas de
  compression par piste — hors scope ; un master fader UI = backlog éventuel).
- **Live (look-ahead)** : scheduler à fenêtre glissante (25ms tick,
  100ms look-ahead). Chaque clip → `OscillatorNode` (PeriodicWave) →
  `GainNode` (AHDSR) → `trackGainNode` → `analyserGain` →
  `AnalyserNode` (tap) **+ master bus → `destination`**. Un `GainNode` par piste ;
  gain = `track.volume` si audible, 0 si muté/solo-exclu.
  Changements de clips détectés par comparaison de signatures ;
  clips modifiés invalidés et reprogrammés. Depuis F.3.12.1, la
  signature inclut l'enveloppe du patch référencé → modifier
  attack/hold/decay/sustain/release/amplitude pendant la lecture
  re-schedule les clips à venir. **iter-P** : la signature inclut aussi
  vibrato + trémolo → éditer une modulation re-schedule de même. **iter-T (T.2/T.3)** :
  += auto-pan + pitch envelope.
- **Modulations par patch (iter-P LFO ; auto-pan T.2 ; pitch env T.3)** : helper partagé `lib/modulation.js`
  (`applyModulation`) branché sur les **4 chemins de synthèse** (lecture timeline
  `scheduleOneClip`, export WAV `scheduleAllClips`, preview clavier, preview note
  libre). Vibrato → `osc.detune` (cents, indépendant de la note, n'écrase pas
  `osc.frequency`). Trémolo → `gain.gain` (sommé à l'automation AHDSR, jamais
  multiplié). **Auto-pan (T.2) → `panner.pan`** d'un `StereoPannerNode` : 1ᵉʳ effet
  stéréo. **Répartition des rôles** — l'**appelant** possède la chaîne principale et
  insère le panner (`osc → gain → panner → suite`), `applyModulation` ne fait
  qu'**ajouter la branche LFO** (param `panner` optionnel — absent = pas d'auto-pan,
  appels existants valides). Insertion **conditionnelle** : panner créé **seulement
  si `enabled && depth>0`** → effet off ⇒ chaîne **mono bit-identique** à avant
  (zéro nœud, zéro coût, zéro régression). `depth` ∈ 0..1 = excursion symétrique
  (pan ∈ [-depth, +depth]). Cleanup : le panner est poussé dans le tableau `mod`
  (déconnecté partout où l'osc l'est ; `stopModNodes` tolère l'absence de `.stop()`).
  **Pitch envelope (T.3, 1ʳᵉ modulation non-LFO) → automation de la VALEUR DE BASE
  d'`osc.detune`** : **aucun nœud**, donc rien à cleanup. **Normal** :
  `setValueAtTime(amount, start)` → `linearRampToValueAtTime(0, start+time)` (part décalé,
  rejoint la nominale). **Inversé (T.3bis, `invert:true`)** : miroir `setValueAtTime(0,
  start)` → `linearRampToValueAtTime(amount, start+time)` — part de la nominale, s'éloigne
  vers `amount` **et y reste** (l'`AudioParam` tient sa dernière valeur de rampe) : la
  note tenue reste décalée de `amount`, la nominale n'est que le départ (**comportement
  assumé** — sirènes/bends). **Coexistence vibrato par construction** : le vibrato est une
  branche *entrante* sur `osc.detune` → Web Audio somme « base automatisée + entrées » ;
  l'enveloppe pose la trajectoire, le vibrato ondule autour, sans coordination. Guard
  `amount≠0 && time>0` (sinon aucune automation). **Forme de progression (T.3ter,
  `curve`)** : `pitchProgression(curve, t)` donne `p(t)∈[0,1]` (linear=`t`,
  easeOut=`1−(1−t)²`, expo=`(1−e^−5ᵗ)/(1−e^−5)`, easeIn=`t²`) ; la valeur posée =
  `from + (to−from)·p(t)`, donc **orthogonale à `invert`** (qui n'échange que `from`/`to`).
  `linear` garde le chemin historique (`setValueAtTime` + `linearRampToValueAtTime`) ;
  les formes non linéaires passent par **un seul** `setValueCurveAtTime(Float32Array(64),
  start, time/1000)` — **PAS `exponentialRampToValueAtTime`** (ne peut ni atteindre ni
  traverser zéro, or la cible est 0 cent et `amount` est signé). `setValueCurveAtTime`
  verrouille `osc.detune` sur sa fenêtre — sans conséquence, le pitch env est la **seule**
  automation de base (le vibrato est une branche entrante sommée). Même fonction
  `pitchProgression` partagée avec le graphe (`drawPitchEnvGraph`) → tracé == audio.
  Pas de traitement au release (note < time → la rampe continue, assumé).
  `onset` = fondu d'installation depuis le début de la note. Le
  trémolo reste **constant pendant le sustain** et ne s'éteint **qu'au release**
  (P.5) : sur les chemins programmés (timeline/export), `applyModulation` reçoit
  `releaseStart` et pose `setValueAtTime(target, releaseStart)` (plateau implicite)
  puis `linearRampToValueAtTime(0, stopTime)` (extinction sur la seule durée du
  release) ; sur les previews (sans `stopTime`), l'appelant rampe le `depthGain`
  au release réel (`releaseModNodes`). Évite le souffle dans la traîne **et** la
  décroissance erronée sur toute la note. Le vibrato **et l'auto-pan**, eux,
  gardent un `depth` constant jusqu'au bout (auto-pan : `StereoPannerNode` est
  equal-power, pas d'énergie ajoutée → pas de plateau/release spécial à la
  trémolo). Cleanup symétrique : chaque nœud LFO **et le panner** sont
  stoppés/déconnectés partout où l'`osc` l'est.
- **Export WAV (normalisé en crête, S.audio.5)** : `OfflineAudioContext(2,
  sampleRate * totalDurationSec, 44100)`, même routage per-track GainNode **+ même
  master bus** (pistes → `bus.input` → `bus.output` → `offlineCtx.destination`),
  mono up-mixé en stéréo, encodage RIFF/PCM16. Un **fichier** n'a pas d'étage
  « volume appareil » : rendu au niveau bas du master = WAV faible. On **normalise**
  donc le buffer rendu avant l'encodage — `normalizePeak(buffer)` (`audio.js`,
  cible `EXPORT_PEAK_TARGET` 0.891 ≈ -1 dBFS, marge anti inter-sample peak) monte
  linéairement la crête vers la cible. Ordre **crucial** : rendu (bas niveau,
  propre) → `normalizePeak` (montée float) → `audioBufferToWav` ; la quantification
  PCM16 se fait **une seule fois, au niveau cible** (pas de plancher de bruit
  relevé). Au niveau bas le soft-clip ne mord pas → le buffer est **linéaire** et la
  normalisation est un **pur facteur d'échelle, sans distorsion** (≠ soft-clip).
  Conséquence assumée : **live ≠ export sur le NIVEAU** (le live délègue la loudness
  au volume appareil, l'export la bake), volontairement.
- **AHDSR par note** : rampes linéaires
  attack→peak→hold(plateau)→decay→sustain→release→0 avec
  `clipDuration = max(noteDurationSec, attack + hold + decay + release)`.
  Le plateau hold est rendu par deux `linearRampToValueAtTime` au même
  niveau (peak), formulation idiomatique sans discontinuité
  (pas de `setValueAtTime` au milieu).
- **Planchers anti-clic attaque/release** : `MIN_ATTACK = 0.003` et
  `MIN_RELEASE = 0.005` (`audio.js`), appliqués via `Math.max` partout où
  l'attaque/le release deviennent une rampe (`performRelease`/`releaseFreeNote`
  Designer, `scheduleOneClip`/export `usePlayback`). Sans plancher, un release
  utilisateur à 0 fait chuter le gain instantanément → clic (énorme sur carré
  band-limité). Le plancher release garantit aussi `releaseStart < stopTime`
  (rampes de fin non coïncidentes) sur la timeline/export (S.audio.2). Le **stop
  brutal** (`stopAllInstrumentNotes` : changement de patch / démontage) applique
  un **fade `RETRIGGER_FADE`** avant `osc.stop` (même esprit que le retrigger),
  disconnect différé au `onended`.

## Décisions architecturales

Choix non évidents pris pour de bonnes raisons. À ne pas remettre en question
à la légère — relire ici avant de refactorer.

- **Master = headroom bas + soft-clip filet ; loudness déléguée à la sortie ;
  export normalisé (iter-S S.audio)** : un **seul** garde-fou au master —
  `createMasterBus(ctx)` (`audio.js`, `MASTER_HEADROOM` **bas** 0.1 + `WaveShaper`
  soft-clip **sans mémoire** knee 0.9) — inséré entre le point de sommation et
  `destination` sur les **3** chaînes (preview, lecture, export offline). **Modèle
  de niveau (S.audio.5)** : le clipping est un **problème numérique** (la sommation
  polyphonique), la loudness se récupère au **dernier étage analogique** = volume
  de l'appareil (qui ne clippe pas). On garde donc le niveau numérique **bas** (tout
  reste propre par défaut jusqu'à ~12 notes tenues) et la loudness live vient du
  volume appareil. Le soft-clip n'est plus qu'un **filet lointain** — il a remplacé
  l'ancien `DynamicsCompressor` (S.audio.4) qui pompait sur les accords battants
  (sa mémoire attaque/release suivait le battement). **Live ≠ export sur le NIVEAU,
  volontairement** : un fichier n'a pas d'étage volume appareil → l'export est
  **normalisé en crête** (`normalizePeak`, `EXPORT_PEAK_TARGET` 0.891 ≈ -1 dBFS,
  pur facteur d'échelle float avant quantification PCM16 = aucune distorsion). Le
  reste de la chaîne (graphe, AHDSR, modulations) reste identique live/export.
  L'**analyser est branché EN AMONT** du bus → le spectrogramme reste honnête (vraie
  somme synthétisée). Écartés (hors scope) : compression/limiteur **par piste**,
  gain master réglable en UI (master **fixe** ; fader UI = backlog éventuel), et
  **normalisation par nombre de voix** (pompage). Headroom calé à l'oreille
  (0.1–0.13), pas gravé.
- **Entrée unifiée Pointer Events + `touch-action:none` chirurgical (iter-S S.2)** :
  les surfaces de manipulation directe utilisent **Pointer Events** (chemin unique
  souris + tactile + stylet) — pas de cohabitation `onMouse*`/`onPointer*` (sinon
  double dispatch). Chaque **drag** prend `setPointerCapture` au down (le geste
  survit hors cadre — remplace la mitigation `DRAW_MARGIN` au bord) ; **`leave`
  n'est plus** une fin de geste (la capture le supprime pendant le drag — il ne
  sert qu'au survol) ; **`pointercancel`** est obligatoire (interruption système →
  pas de draft/voix collé). Le **clic droit** reste en `onContextMenu`/`button===2`
  (mise à zéro de barre, menu spline — pas d'équivalent tactile, assumé), d'où la
  garde `e.button !== 0` (le tactile envoie `button === 0`). `touch-action:none`
  est posé **uniquement** sur les surfaces migrées (jamais sur un conteneur
  scrollable). **Clavier polyphonique** par `Map<pointerId,idx>` + **ref-count par
  idx** : `onKeyPress` à la 1re voix sur un idx, `onKeyRelease` à la dernière —
  le **moteur audio est déjà polyphonique**, la polyphonie est purement une
  affaire de couche d'entrée. Périmètre S.2 = surfaces **primaires** (canvas Libre,
  ancres, harmoniques, clavier, Test) ; AHDSR/LFO/sliders/resizers/Timeline = S.3.
  **S.3 (couverture complète)** : même pattern étendu aux poignées AHDSR/LFO
  (element-local + capture + garde mono-pointeur) et aux drags à **listeners
  window/document** (resizers, séparateurs `DesignerColumns`, Timeline →
  `onPointerDown` initiateur + `pointermove`/`pointerup`/**`pointercancel`**, pas
  de capture). **Timeline** : `touch-action:none` sur les **clips** + poignées de
  resize (manipulation directe) et **`pan-x pan-y`** sur le **conteneur
  scrollable** (scroll tactile des deux axes préservé — le prompt disait `pan-x`,
  élargi car le wrapper scrolle aussi en vertical jusqu'à 16 pistes). Le **lasso**
  (drag sur zone vide) reste **souris-seule** — conflit direct avec le scroll
  tactile, désambiguïsation reportée (backlog). Les **`<input type=range>`** ne
  sont **jamais** mis en `touch-action:none` (casserait le drag natif du thumb) ;
  on leur ajoute juste un commit `pointerup` là où il manquait (volume de piste).
- **Shell non-scrollable + PWA standalone sans dépendance (iter-S S.1)** : le
  scroll **de page** est verrouillé au niveau `html`/`body`/`#root`
  (`overflow:hidden`, `height:100%`, `overscroll-behavior:none`) — **jamais** sur
  les conteneurs internes (panneau module mobile, Documentation, Bibliothèque,
  tiroirs, modales), qui gardent leur `overflow-y:auto`. But : tuer le
  pull-to-refresh + la bascule de la barre d'URL mobile (qui faisait varier `dvh`
  et reflowait les canvas). La PWA est **légère** : manifest standalone + métas,
  **sans service worker à cache** (offline réel écarté) et **sans aucune
  dépendance npm**. Contrainte dure : la rasterisation d'icônes passe par un
  **outil système** ou rien — jamais sharp/resvg/… en douce. Tant qu'aucun
  rasteriseur n'est dispo, le manifest reste **SVG-only** (PNG iOS/maskable en
  dette BACKLOG, icône iOS générique assumée).
- **Modulations par patch via helper partagé sur les 4 chemins (iter-P ; auto-pan
  T.2 ; pitch env T.3)** : le vibrato, le trémolo, l'auto-pan (LFO) **et l'enveloppe
  de hauteur** (non-LFO) sont **par patch** (pas par clip — pas de champ de modulation
  sur `Clip`). Un **helper unique**
  `lib/modulation.js` (`applyModulation`) est câblé sur les **4 chemins de synthèse**
  (lecture timeline, export WAV, preview clavier, preview note libre) —
  `scheduleOneClip` et `scheduleAllClips` étant du code dupliqué, le helper partagé
  est la seule défense contre la divergence one/all (régression classique documentée).
  Le helper **n'alloue jamais** osc/gain/panner et ne les connecte pas à `dest` :
  il ne fait qu'**ajouter des branches** ; l'appelant possède la chaîne principale
  (y compris le `StereoPannerNode` de l'auto-pan, qu'il **insère** conditionnellement)
  et stoppe/déconnecte les nœuds LFO + le panner symétriquement à l'`osc` (cleanup
  programmé via `stopTime` pour timeline/export, manuel au release pour les previews
  qui sustainent indéfiniment).
- **Detune (cents) pour le vibrato / addition sur `gain.gain` pour le trémolo
  (iter-P)** : le vibrato module `osc.detune` (en **cents**) et **non**
  `osc.frequency` — indépendant de la note (même intervalle de vibrato à toute
  hauteur) et n'écrase pas la fréquence déjà programmée par l'appelant. Le trémolo
  connecte son `depthGain` à `gain.gain` : Web Audio **somme** ce signal à
  l'automation AHDSR déjà programmée — on n'essaie **ni** de multiplier **ni** de
  reprogrammer l'enveloppe. Cible de profondeur trémolo = `baseAmplitude × depth`.
- **LFO éditable au domaine temporel, 3 poignées calquées sur l'AHDSR,
  coexistence avec les steppers (iter-P P.5)** : le réglage visuel du LFO se fait
  sur un **graphe temporel** (x = temps depuis l'attaque, y = valeur de
  modulation), pas sur une vue fréquentielle ni un défilement. Les **3 poignées**
  (Profondeur / Installation / Vitesse) **réutilisent** les primitives de l'AHDSR
  (cercles isotropes en coords physiques, curseur dynamique, tooltip
  `.adsr-tooltip`) — cohérence visuelle, moins de code neuf ; la **forme** reste un
  switch (on ne tire pas une forme). Le graphe **coexiste** avec les 3 steppers
  (comme l'AHDSR a son canvas **et** ses sliders), les deux pilotant le même état
  via `SET_EDITOR_MODULATION`. **Undo** : draft local + commit unique au
  relâchement (politique AHDSR copiée, pas réinventée — `SET_EDITOR_MODULATION`
  étant undoable par dispatch, un drag non drafté exploserait la pile).
  **Animation = point de phase** (un seul point mobile) au lieu du scroll, qui se
  battrait avec des poignées fixes ; **fenêtre x adaptative** (onset + ~2,5
  cycles) **gelée pendant un drag** (`modDragGeomRef`) pour que la poignée suive
  le curseur sans rétroaction d'échelle.
- **Filtre statique = biquad par voix, chaîne VCO→VCF→VCA, mapping Q dB/linéaire
  partagé audio/graphe (iter-T T.4)** : le filtre est un `BiquadFilterNode` **inséré
  dans la chaîne de voix** (compatible archi jetable, comme le panner), **avant** le
  gain d'enveloppe (`osc → biquad → gain`) — convention synthé : filtrer la source
  brute, pas le signal enveloppé (sinon le filtre lisse les transitoires d'attaque).
  Inséré **seulement si `enabled`** → chaîne bit-identique sinon. **Piège d'unité Web
  Audio assumé en un seul point** (`lib/filter.js`) : le `Q` d'un biquad est en **dB**
  pour lowpass/highpass mais **linéaire** pour bandpass/notch ; le modèle stocke un `q`
  **linéaire unique** (0.1–20), `biquadQValue`/`configureBiquad` convertit, et le **graphe
  de réponse appelle exactement la même fonction** sur un **biquad de mesure** (jamais
  connecté) → « ce qu'on voit = ce qu'on entend », pic de résonance LP/HP compris. Le
  graphe est **fréquentiel** (X log 20 Hz–20 kHz, Y dB), 1ᵉʳ du module Effets, **sans
  animation** (rien ne boucle) ; sa **poignée 2D** (cutoff log horizontal, q log vertical)
  commit en **un cran d'undo** via une action dédiée `SET_EDITOR_FILTER_POINT` (frère du
  `MOVE_SPLINE_ANCHOR`), les contrôles discrets restant en `SET_EDITOR_MODULATION`.
- **Steppers multiplicatifs opt-in du `NumberInput` (iter-T T.4)** : sur une plage
  **géométrique** (cutoff 20–20 000 Hz) un pas additif fixe est inutilisable. Prop opt-in
  `stepFactor`/`shiftFactor` → le chevron **×/÷** le facteur au lieu d'additionner `step`
  (pas musicaux : 2^(1/12) = demi-ton, Shift = octave). Extension **rétro-compatible**
  (mêmes usages additifs inchangés), même esprit que `triggerBadge`/`showSteppers`.
- **Slider = grandeur continue / stepper = décompte discret (iter-O O.1)** :
  convention d'entrée. Un nombre qu'on **compte** (nombre d'ancres, plafond
  d'harmoniques) se règle au **stepper `▴▾`** (`NumberInput` opt-in) — la valeur
  exacte compte, un cran = `±1`. Une grandeur **continue** perçue à l'oreille ou à
  l'œil (amplitude, ADSR) reste un **slider**. On ne « slide » pas un compte ni ne
  « steppe » une enveloppe.
- **`OverflowToolbar` (priority-plus, iter-O O.2/O.6) = relocalisation, pas
  duplication** : barre générique qui mesure par *ghost row* + `ResizeObserver` et
  pousse le débordement dans un tiroir `bar`/`tray`, repli droite→gauche.
  L'**anti-boucle** est structurel : le root remplit l'espace du flex parent
  (`flex:1 1 0; min-width:0`, contenu aligné à droite) → la largeur observée = espace
  dispo, indépendante du contenu. L'**état des contrôles vit dans le parent** ;
  l'OverflowToolbar **relocalise** seulement *où* le node est rendu (au resize, jamais
  en plein geste) — pas de double-rendu, pas de state dupliqué. Icône + titre du
  module restent hors de la barre.
- **Gestionnaire de modules Designer (iter-O O.5) — collapse/maximize par CSS,
  canvas jamais démonté** : replier/maximiser un module est **purement CSS**
  (`display:none` + flexGrow / `:has()`), le contenu reste **monté** — démonter
  viderait les canvas (état perdu, RO orphelins). Corollaire vérifié à la dure : les
  `ResizeObserver` (canvas, zone AHDSR) sont posés via **callback ref**, car la
  render-prop du `WaveformEditor` remonte les nodes sans démonter le composant (un RO
  posé en `useEffect` devient orphelin → canvas figé 300×150 / décision compact
  erratique). **Auto-réduction par rangée** (à l'ouverture) **coexiste avec l'AUTO**
  du dimensionnement (au focus) : deux politiques orthogonales. Chrome de fenêtre
  détachée en coin (hors OverflowToolbar) ; identité par `MODULE_META` (source unique
  icône + label).
- **Auto-collapse « essentiel » edge-triggered + tout-rouvrir au retour (iter-P
  P.6.1)** : sous `ESSENTIALS_WIDTH` (1100, = seuil d'auto-collapse forcé), le
  desktop ne garde ouverts que Forme d'onde + Instrument et replie le reste — mais
  **uniquement au franchissement de seuil** (un `ref` mémorise la bande précédente),
  jamais à chaque render, sinon l'effet combattrait les toggles manuels en petit
  écran. Politique « **on rouvre tout au retour grand écran** » (pas de
  snapshot/restore fin de l'agencement : décision validée — simplicité > fidélité
  de l'état antérieur), et **garde `maximized`** : si un module est déjà maximisé à
  l'entrée, on ne touche à rien (choix manuel persisté respecté). Action en bloc
  `SET_DESIGNER_COLLAPSED_BULK` (non-undoable). Le **panneau gauche** est forcé
  fermé au même seuil (1100) — plus d'état bâtard « ouvrable mais non
  redimensionnable » entre 924 et 1100 (P.6.3).
- **Rangée du bas = même `DesignerColumns` que le haut (iter-P P.6.2)** : les deux
  rangées de modules partagent le composant (DRY → 2 séparateurs draggables
  identiques, gestion `collapsed`/bande réutilisée). La rangée du bas porte ses
  propres `sepLabels` + `designerBottomRowWidths` (largeurs persistées). **iter-Q** :
  l'auto-sizing au focus ayant été retiré, les deux rangées sont désormais
  strictement identiques (drag des séparateurs + bouton « Égaliser »).
- **Détection « compact » mesurée sur la zone, pas sur `windowWidth` (iter-O O.4)** :
  l'AHDSR décide de basculer en mode compact via un `ResizeObserver` sur sa propre
  zone, pas via la largeur fenêtre — robuste à travers desktop, accordéon mobile et
  collapse de module (un module replié rétrécit la zone sans changer la fenêtre).
- **Responsive Instrument = desktop only (iter-O O.3)** : la dégradation à 2 étages
  (système → `[⚙]`, octaves → stepper) ne s'applique **qu'au desktop**. Sous 924×668,
  le **switcher de modules** (iter-R R.1) est la stratégie (cf. décision dédiée) ;
  l'épuration responsive sous ce plancher est traitée par l'itération R.
- **Designer petit écran = un module plein cadre + switcher d'icônes (iter-R R.1,
  remplace l'accordéon)** : sous 924×668, plus de barres repliées empilées qui
  mangeaient la hauteur ; une **rangée d'icônes** dans la `DesignerToolbar`
  (`.designer-module-switcher`, mobile only — **pas** d'OverflowToolbar, c'est la
  navigation primaire) sélectionne **le** module affiché plein cadre. **Toujours
  exactement un module actif** (`designerMobileModule` persisté, défaut `'canvas'` ;
  clic sur l'actif = no-op) — fini l'état nullable « tout replié » de l'ex-volatile
  `mobileExpandedZone`. Les **6 corps restent montés en permanence**, visibilité par
  CSS (`display:none` ↔ `display:flex`) — **même contrainte canvas que le
  gestionnaire desktop** : démonter viderait les canvas (Forme d'onde / Harmoniques /
  Spectro + mini-courbe Modulation) et laisserait des RO orphelins. Le redraw au
  changement de module est porté par le **passage `display:none` → `flex`** (les RO
  détectent le retour à des dimensions non-nulles) — pas de redraw explicite. Le
  switcher vit dans la `DesignerToolbar` (groupe flex simple ; la réorientation
  row/column était envisagée pour R.4 — **annulée**, cf. décision dédiée plus bas).
  **R.1.3** : les headers in-body étant masqués en petit écran, les **contrôles de
  header du module actif** sont **relogés dans la toolbar** (2ᵉ `OverflowToolbar`
  après le switcher). Principe **anti-double-rendu** : les items sont exposés comme
  **donnée** (`build*HeaderItems()` → children-API `moduleHeaderItems` +
  `buildSpectrogramHeaderItems` partagé), rendus à **un seul endroit** — en mobile
  l'in-body rend `[]` (un `OverflowToolbar` dans un header `display:none` mesurerait
  0 et dédoublerait `data-anchor`/refs), la toolbar rend l'actif.
- **Top header en priority-plus sous 924×668 (iter-R R.2)** : le `Tabs` (onglets +
  thème/raccourcis/visite) bascule en `OverflowToolbar` (hamburger `Menu`) en petit
  écran — même pattern que les modules. **Ordre de priorité positionnel** :
  Création/Composition gardés le plus longtemps, auxiliaires (visite → raccourcis →
  thème) puis Documentation/Bibliothèque débordant en premier. **Aucun item
  épinglé** (à l'extrême tout file au hamburger). Conséquence assumée : l'ordre
  visuel compact (Création d'abord) diffère du desktop (Bibliothèque d'abord) — prix
  du priority-plus positionnel. **Desktop ≥ 924×668 strictement inchangé** (chemin de
  rendu séparé, gardé par `isMobile`). Le top header **reste en haut**,
  point. L'ancre Tour `header-tabs-zone` est préservée sur le conteneur
  compact (`visibility:hidden` pendant la visite, rect conservé). Limite connue : la
  *ghost row* de l'OT duplique les `data-anchor` des boutons aux → l'overlay Ctrl+K
  dégrade son ancrage en compact (non bloquant).
- **Gate de résolution = plancher orientation-aware 300/500, tactile fin assumé
  (iter-R R.3)** : `TooSmallGate` bloque seulement si `min(w,h) < 300` OU
  `max(w,h) < 500` (constantes `MIN_USABLE_SHORT`/`MIN_USABLE_LONG`) — 300×500 et
  500×300 passent. Le seuil ne porte plus que sur l'**affichage/atteignabilité**
  (densifié sous 700×500 par une passe CSS bornée stricte). L'**UX tactile fine**
  sous ~700 px (dessin au doigt, poignées AHDSR/LFO, sliders) est une **limitation
  connue assumée**, PAS un blocage : le cas d'usage visé est la souris (fenêtre
  desktop rétrécie). Le travail pointer-events / surfaces tactiles est backlog.
  (Remplace l'ancien plancher fixe 700×500 « anti-UX-tactile-cassée ».)
- **R.4 (orientation adaptative des toolbars) annulée (iter-R)** : la réorientation
  row/column des toolbars selon le ratio (récupérer de la hauteur en paysage) a été
  **tentée puis abandonnée** (trop de casse pour un résultat médiocre). La refonte
  conceptuelle des « écrans minuscules » est **repoussée au backlog**. R.3.rectif a
  stabilisé l'existant R.3 à la place.
- **Modale Presets = point d'entrée unique + modèle 2-vues (iter-N N.5c)** : tous
  les sons pré-fabriqués passent par la modale `PresetPicker` (plus de barre de
  presets géométriques en mode Libre). Les 4 formes de base (`BASE_WAVEFORMS`,
  `lib/waveforms.js`) exposent **deux vues du même son** : *idéale* (forme brute
  plate/droite, `cap=256`, see≠audio assumé = référence platonicienne) et
  *band-limitée* (reconstruction phase naturelle à N harmoniques via le moteur
  N.5b, `cap=N`, see=audio honnête) — même son à N égal (l'audio est renormalisé
  à la lecture), seul le dessin diffère. Le sinus n'a qu'une vue (N figé à 1). Les
  timbres conçus (`TIMBRE_PRESETS`) ont une vue, pas de N éditable. Chargement
  **unifié** par `LOAD_PRESET` : la modale (qui a le moteur) résout la canonical et
  passe un payload prêt ; le reducer pose canonical + cap + ancres DP à
  `anchorCount` + flags. `APPLY_EDITOR_PRESET` supprimé.
- **Courbe canonique unique + lentilles (M rattrapage, 2026-06-01)** : le timbre
  est UNE courbe `canonical` (600 pts, vérité audio) regardée/éditée par trois
  lentilles toujours synchronisées (Forme d'onde / Harmoniques / Spectro), pas
  trois représentations silotées. **Plus de `mode` discriminé ni de conversion
  destructive.** `cap` unifié remplace `definition` (tracé) et `N` (barres). Le
  résidu (`canonical − spline(anchors)`) préserve les détails fins du tracé au
  drag d'ancre. **Hygiène canvas systématique** (`src/lib/canvas.js` →
  `withSavedCtx`) : aucune propriété de contexte ne fuit entre deux rendus. Cf.
  `docs/superpowers/specs/2026-06-01-waveform-rattrapage-design.md`.
- **UI Designer « d'une seule voix » (M rattrapage r.2, 2026-06-01)** : une
  **barre du haut unique** (`DesignerToolbar`) regroupe identité du patch +
  Presets/Reset/Normaliser + proportions des colonnes. Le **cap a un contrôle
  unique** (slider+readout dans le header Harmoniques) — fini le double contrôle
  hérité de M.r.1 (slider « Définition » sidebar + NumberInput « Harmoniques »).
  Les deux modes d'édition de la zone Forme d'onde se choisissent via un
  **switch Libre/Ancres** (free↔spline) ; **plus aucun bouton « Convertir
  vers… »** (reliques du modèle siloté). `WaveformLens` ne porte plus que
  `'free' | 'spline'` (M.r.3.2 : `'bars'` retiré, vestigial depuis r.2.4) — les
  barres d'harmoniques sont éditées directement (toujours éditables,
  indépendantes de la lentille).
- **Lentilles vivantes — re-fit auto des ancres (M.r.3, 2026-06-01)** : les **5
  actions** qui modifient `canonical` par une voie autre que le drag d'ancre
  (`SET_EDITOR_CANONICAL`, `SET_EDITOR_HARMONIC_AMPLITUDE`,
  `NORMALIZE_EDITOR_CANONICAL`, `LOAD_PRESET`, `APPLY_EDITOR_PRESET`) **re-fittent
  automatiquement les ancres** sur la nouvelle canonical (en préservant leur
  nombre) puis recalculent le résidu, via le helper unique
  `refitAnchorsAndResidual(canonical, currentAnchors, interpolation)`. La lentille
  Spline est donc *toujours* représentative du tracé courant ; un drag d'ancre
  subséquent produit une déformation cohérente (amplitude du delta proportionnelle
  à la finesse de la spline, modulée par le résidu). `APPLY_EDITOR_PRESET` (presets
  rapides Sinus/Carré/…) est le 5ᵉ call-site : non listé dans le prompt initial,
  ajouté par décision archi car il exhibait la même bizarrerie. Spec §4.1.
- **Édition d'ancres — « représentation vs forme » (principe directeur, iter-N
  N.2.1 → N.3.2)** : deux familles d'actions sur la lentille Ancres, traitées
  différemment. **Changer la représentation** (basculer Doux/Anguleux
  `SET_SPLINE_INTERPOLATION`, ajouter/retirer une ancre `ADD`/`REMOVE_SPLINE_ANCHOR`)
  → **canonical strictement inchangée**, on recalcule juste le résidu
  (`computeResidual(canonical, spline(ancres, mode))`), `canonicalNormalized`
  **préservé**. **Changer la forme** (dragger une ancre `MOVE_SPLINE_ANCHOR`) →
  canonical change (warp, ci-dessous), `canonicalNormalized: false`. Rationale :
  redécrire le même tracé avec d'autres points de contrôle ne doit jamais le
  déformer ; seul un geste de déplacement le déforme.
- **Drag d'ancre = déformation 2D à support local — « le détail ride sur la
  tendance » (iter-N N.3 + N.3.1, 2026-06-03)** : `MOVE_SPLINE_ANCHOR` ne recompose
  plus `canonical = spline(nouvelles_ancres) + résidu GELÉ`. Ce modèle laissait le
  détail dessiné (p. ex. la *netteté* d'une pointe, qui vit dans le résidu car une
  ancre Catmull-Rom seule ne sait pas faire une pointe) **planté à sa position
  d'origine** tandis qu'une nouvelle bosse lisse apparaissait à l'ancre → **double
  pointe**. Désormais le résidu est **remappé** par un **warp horizontal** du
  support `(ancre_gauche, ancre_droite)` : déplacer l'ancre de `x0` (début du drag)
  à `xN` emporte le détail en x avec elle (support **local** : hors `(Lx, Rx)`,
  résidu inchangé). La composante **verticale** est portée par la tendance
  `spline(ancres, mode)` (le résidu, valeurs inchangées, s'ajoute par-dessus la
  nouvelle spline). **Pré-image du warp branchée sur le mode (N.3.1)** : en
  **Anguleux**, pré-image **linéaire par morceaux** (les ruptures de pente se
  fondent dans la tendance déjà anguleuse) ; en **Doux**, **bump smoothstep C¹**
  centré sur l'ancre (`φ⁻¹(X) = X + (x0−xN)·W(X)`, `W=3t²−2t³`, `W'=0` en
  `Lx`/`xN`/`Rx`) → raccord C¹ avec l'identité hors support, **plus d'angle
  parasite** (ni sur l'ancre, ni sur la voisine) qui était glaring en doux sur les
  formes nettes. On ne lisse PAS les vrais angles du dessin (portés par la tendance,
  intacts) — seulement les angles parasites du warp. **Garde anti-repli** : pente
  `1 + (x0−xN)·W'` (avec `|W'|max = 1.5/h`) maintenue `> 0` en clampant `|x0−xN|` à
  `(2/3)·h` du côté comprimé. Helper pur `warpResidualForAnchorMove(…, interpolation)`
  (`lib/spline.js`) ; **wrap périodique** pour les ancres de bord (support déroulé
  traversant x=0, lecture/écriture modulo 600). Le reducer stocke le résidu remappé
  (invariant `canonical − spline = résidu` préservé). **Réf figée** :
  `state.editor.{anchors,residual}` SONT l'état du début de drag — `SplineEditor`
  isole le geste dans un draft local et ne dispatche qu'au `mouseup` (1 commit =
  1 undo = 1 warp par le déplacement total `x0→xN`, jamais frame à frame, sinon
  ré-échantillonnages cumulés et courbe dégradée). **Pas de re-fit DP** au commit
  (positions d'ancres voulues conservées). Remplace l'ancien N.3 (PCHIP/overshoot
  Catmull-Rom), rendu secondaire : avec ce modèle, le détail suit la tendance.
- **ADD/REMOVE d'ancre = snap sur le tracé, zéro déformation (iter-N N.3.2)** :
  application du principe « représentation » ci-dessus. `ADD_SPLINE_ANCHOR` snappe
  l'`x` du clic à un entier et pose `y = canonical[x]` (la **hauteur du clic est
  ignorée** — décision archi option A) → l'ancre se pose **exactement sur le
  tracé** ; au point d'ajout le résidu vaut 0 (l'`x` entier rend
  `spline(next)[x] = y` exact). `REMOVE_SPLINE_ANCHOR` retire simplement le point de
  contrôle. Dans les deux cas, `canonical` inchangée, résidu recalculé, `canonicalNormalized`
  préservé. Pour déplacer une ancre fraîchement posée, on la dragge (warp N.3/N.3.1).
- **Normalisation explicite + détection par flag d'état (M.r.4, 2026-06-02)** :
  les barres d'harmoniques ne portent que des **magnitudes**, pas de phase. La
  convention de reconstruction iDFT est la **phase canonique sinus pur** pour
  toutes les harmoniques (la phase est inaudible, cf. spec §4) — d'où le « saut »
  visuel de la canonical au premier drag de barre depuis une phase quelconque
  (régression de phase). M.r.4 l'explicite (dialog edit-bars + courbe grise
  d'aperçu + bouton désactivé), piloté par un flag `editor.canonicalNormalized`.
  - **Détection « normalisée » par flag d'état, PAS par comparaison numérique**
    (amendement 2026-06-02 suite à mesure du dev). La v1 du prompt prévoyait
    `isCanonicalNormalized(canonical, cap, eps)` comparant la canonical à son
    round-trip `harmonicsToPoints(canonicalToBars(x))`. Mesure : ce round-trip
    **n'est pas idempotent** à haut `cap` sur signaux riches en hautes harmoniques
    (resample 600→512 par **interp linéaire** = leakage ~15 %/passe ; un créneau
    à `cap=256` demande **4 normalisations** pour converger). Les classes
    « vraiment normalisé » et « tracé libre quasi-en-phase » se chevauchent sur la
    métrique → **aucun seuil ne sépare**. Le flag est déterministe, idempotent
    (1 click → grisé), et sémantiquement plus honnête : « normalisé » est une
    propriété de l'**histoire de l'éditeur**, pas du tableau `canonical`. Effets
    par action câblés dans le reducer (cf. Contraintes implicites).
  - **Commentaire corrigé** dans `audio.js` (`harmonicsToPoints`, ~l.176) : il
    affirmait à tort que le round-trip « redonne exactement les mêmes magnitudes ».
    Corrigé : admet le leakage 600→512, pointe le backlog « Mismatch de grille
    FFT 600 ↔ 512 ». La détection numérique aurait été le 1ᵉʳ symptôme bloquant de
    ce bug ; le flag d'état la contourne (le bug FFT reste backlog, hors scope).
- **Convention d'amplitude Forme d'onde — auto-fit Y, pas de clamp (M.r.5.1,
  2026-06-02)** : le canvas Forme d'onde affiche `[-peak, +peak]` au lieu de
  `[-1, +1]` fixe ; le **pic minimum affiché reste 1** pour que le marqueur ±1
  (niveau audio référence) demeure visible même au silence ou sur de petites
  amplitudes (sinon écrasé au bord). Le **tracé libre n'est pas clampé à ±1** :
  l'utilisateur peut dessiner au-delà du niveau audio référence (le marqueur ±1
  sert de repère), `SET_EDITOR_CANONICAL` ne clampe pas, le navigateur normalise
  la `PeriodicWave` à la lecture. Cohérent avec « la canonical = vérité audio
  éditée ». Transition douce du zoom (lerp rAF coeff 0.15) car le rendu canvas
  est au pixel — pas de transition CSS possible. Spec §7.
  **Extension M.r.5.bis (passe d'usage) — le mode Ancres aussi, persistance
  comprise** : r.5.1 n'avait dé-clampé que le tracé libre ; le chemin spline
  restait borné à ±1 par héritage du canvas fixe pré-r.5.1 (incohérence, et le
  premier drag d'ancre re-clampait un tracé libre qui dépassait). **Cinq** clamps
  sont levés : `splinePlusResidual` (canonical = spline + résidu, non bornée),
  `MOVE`/`ADD_SPLINE_ANCHOR` (y d'ancre, garde anti-NaN), `SplineEditor.eventToData`
  (borné à ±peak), **`sampleSpline`** (la courbe spline elle-même ne clampe plus —
  sinon l'orange/aperçu flatlinaient à ±1), et les **bornes de persistance**. Le
  dépassement ±1 est désormais **réel et persisté** (pas seulement live) : décision
  archi de **ne pas re-clamper à ±1** au save/reload, car l'audio est normalisé à
  la lecture (`createPeriodicWave({ disableNormalization: false })`) — clamper
  changerait le timbre. À la place, une **borne défensive [-10, 10]** (résidu
  [-12, 12]) protège contre un fichier corrompu : `validatePayload` (`.osa` v2,
  sans bump de version), `sanitizeAnchors`, et `clampToCanonicalRange`
  (ex-`clampToUnit`) à l'hydratation. Le pic théorique étant Σ amplitudes_k (≈ 4-5
  pour des patches normaux), 10 absorbe les extrêmes (résidu accumulé, harmoniques
  saturées). Export WAV inchangé (passe par l'oscillateur normalisé). Le marqueur
  ±1 reste un **repère pédagogique** (niveau audio référence), pas une borne.
- **Étiquetage de l'axe X de la zone Harmoniques (M.r.5.2, 2026-06-02)** :
  étiquettes `kf` aux **puissances de 2** (`{1,2,4,…,256}` filtré à `≤ cap`) si
  `cap ≥ 8`, **toutes** les harmoniques (1..cap) si `cap < 8` (pas saturé à ce
  niveau). La première (`1f`) est donc toujours présente. Pas d'algorithme de
  placement fin : positionnement au centre de la barre via `left:%`, overflow
  occasionnel sur cap dégénéré assumé. Étiquetage Y en 0/0.5/1 (amplitude vraie,
  plus mathématique que des pourcentages). Spec §5.3.
- **Spline parfaite affichée en permanence (M.r.5.bis.2, 2026-06-02)** : la 3ᵉ
  courbe orange (`splineToPoints(anchors)`, sans résidu) est dessinée en continu
  dans les deux lentilles, **cachée uniquement quand le résidu est négligeable**
  (écart à la courbe affichée ≤ 0.01). Avant : elle n'apparaissait que pendant un
  drag d'ancre — apparition/disparition contextuelle perçue comme perturbante. Le
  critère de visibilité est **dérivé de l'écart aux courbes effectivement
  affichées** (et non de `editor.residual`) : il reste juste pendant un tracé
  libre (résidu committé périmé). **Passe d'usage** : pendant un drag d'ancre, la
  courbe affichée (bleu) est désormais la prévisualisation `spline(draft) +
  résidu` (et non la spline pure), de sorte que l'orange (spline) reste visible et
  distincte du bleu — les trois courbes coexistent pendant le geste. Seuil 0.01
  pragmatique (baisser à 0.005 si elle disparaît trop tôt, monter à 0.02 si elle
  reste visible alors qu'elle se confond). Couleur via `--canvas-spline-perfect`
  (orange, déclinée clair/sombre).
- **Clic droit sur barre = mise à zéro, garde de phase conservée (M.r.5.bis.3,
  2026-06-02)** : le clic droit éteint l'harmonique mais **passe par la même garde
  edit-bars** que le clic gauche — si la canonical n'est pas normalisée, le dialog
  `edit-bars-requires-normalize` précède l'opération (au lieu d'un raccourci
  silencieux qui contournerait la convention de phase canonique). Aucun draft/drag
  initié au bouton droit (sinon un draft resterait coincé en attente d'un mouseup
  gauche). Menu contextuel natif bloqué (`onContextMenu`).
- **Marge tampon aux bords des zones d'édition (M.r.5.bis, passe d'usage,
  2026-06-02)** : `DRAW_MARGIN = 12px` (horizontal + zone Harmoniques) et
  `DRAW_MARGIN_TOP`/`DRAW_MARGIN_BOTTOM` (26/24px verticaux, asymétriques pour
  dégager les marqueurs ±1 des overlays légende/hint), exportés par
  `lib/canvas` (source unique → les deux canvas restent à la même échelle). Le
  tracé / les poignées / les barres sont confinés à l'intérieur (rendu ET mapping
  d'entrée insettés), pendant que l'élément capteur garde sa taille pleine →
  bande tampon avant de quitter l'élément et de perdre le geste (même solution
  que le lasso de la bibliothèque, qui suit la souris au niveau window). Les marges
  verticales plus larges (26/24 vs 12) réservent une **gouttière haut/bas** où
  loger la légende et le hint d'usage **hors du tracé** ; asymétriques (la légende
  du haut, plus haute, a besoin de plus de jeu) → l'amplitude 0 n'est plus à H/2,
  la ligne médiane est tracée à `valueToY(0)`. Les lignes de repère restent pleine
  largeur.
- **Silence comme état neutre (M.r.2.5, 2026-06-01)** : `DEFAULT_EDITOR.canonical`
  et `RESET_EDITOR_WAVEFORM` repartent du **silence** (canonical à zéro). M.r.2.2
  avait tenté une sin fondamentale (« un nouveau patch sonne »), annulée à la
  passe d'usage : ne pas imposer un timbre arbitraire à l'utilisateur — il part
  d'une toile vierge et façonne son son.
- **Reset Designer = effacer le timbre, pas l'éditeur (M.r.2.6.1/.3, 2026-06-01)** :
  le bouton Reset (`RESET_EDITOR_WAVEFORM`) efface le timbre (canonical → silence)
  et aplatit les ancres, **mais préserve le plafond d'harmoniques `cap` ET le
  nombre d'ancres** — deux réglages posés par l'utilisateur, conservés à
  l'identique (r.2.6.3 : `defaultSplineAnchors(count)` régénère N ancres plates où
  N = compte courant). Ctrl+Alt+N (`RESET_EDITOR`) reste l'outil de remise à zéro
  complète (cap + ancres inclus). On a déjà un chemin pour tout réinitialiser ;
  Reset doit avoir une portée plus restreinte.
- **Convention iconographique du projet (M.r.2.6.2, 2026-06-01)** : **Lucide en
  priorité** pour toute icône d'UI. Si rien dans Lucide ne convient
  sémantiquement, **SVG inline dans le style Lucide** (stroke ~2 px, pas de fill,
  `currentColor`, viewBox 24×24, line cap/join arrondis) — regroupés dans
  `src/components/icons.jsx`. **Plus jamais de caractère Unicode comme icône** ni
  comme séparateur graphique (emoji, ↺, ∼, ⌫, Σ, etc.), nulle part. Classe
  partagée `.icon-btn` (taille/padding/états). S'applique à **toutes les phases
  futures**, pas seulement M.r.2.6.
- **L'éditeur de patch n'est plus détaché** : son state (points, ADSR,
  preset, etc.) vit dans `state.editor` du reducer global, pas en local
  dans `WaveformEditor`. Raison : l'undo/redo doit couvrir l'éditeur.
  Conséquence : les gestes continus (dessin canvas, drag poignées ADSR,
  sliders) **doivent** utiliser un draft local et ne dispatcher qu'au
  mouseup/touchend/blur, sinon chaque pixel pollue la pile d'historique.
- **Patches vs clips (itération E)** : un Patch ne porte que la forme
  (points + ADSR + amplitude + preset). La hauteur (tuningSystem +
  noteIndex/octave ou frequency) est portée par le Clip. Raison : on
  veut pouvoir jouer le même timbre à différentes hauteurs sans
  dupliquer le patch. Le calcul de la fréquence effective passe par
  `clipFrequency(clip, a4Ref)` qui délègue au registre des tempéraments
  (voir entrée suivante).
- **Registre des tempéraments (itération F.1)** : `src/lib/tuningSystems.js`
  est le **point d'extension unique** pour les systèmes d'accordage.
  Chaque entrée expose `{ id, label, notesPerOctave, noteNames, freq }`
  où `freq(noteIndex, octave, a4Ref)` donne la fréquence (ou `null` pour
  un système "libre" qui lit `clip.frequency` directement). Règle :
  tout calcul de fréquence depuis une note doit passer par le registre
  (moteur de lecture, preview Designer, affichage Properties,
  spectrogramme). Raison : en E.1 la formule 12-TET était dupliquée
  dans plusieurs fichiers, source de divergence potentielle. En F,
  ajouter 24-TET ou Pythagoricien = ajouter une entrée au registre,
  zéro `if/else` à modifier ailleurs. `formatClipNote` et `NOTE_NAMES`
  dérivent aussi du registre (pas de copie locale).
- **Persistance unifiée de l'état d'exploration Designer (F.4.4.3)** :
  tous les champs `editor.test*` (testTuningSystem, testNoteIndex,
  testOctave, testFrequency) ET `editor.visualCue*` (visualCuePattern,
  visualCueTonic) sont persistés ensemble dans localStorage. L'éditeur
  de patch lui-même (points, ADSR, amplitude, preset) reste volatile —
  séparation entre **état d'exploration** (préférences de session,
  persistées) et **brouillon de patch** (intermédiaire, jeté au reload).
  Validation/clamp défensifs au load (`loadPersistedState`) : un système
  inconnu du registre → fallback `'12-TET'`, indices hors borne → clamp
  à `[0, notesPerOctave-1]`, pattern visual cue inconnu → `'none'`,
  champ absent → fallback `DEFAULT_EDITOR` via `??`. Avant 4.4.3 :
  testTuningSystem volatil retournait silencieusement à `'12-TET'` au
  reload pendant que `visualCueTonic` survivait avec son ancienne
  valeur — produit des indices hors borne potentiellement crashants.
- **Tempéraments à accordage variable : référence documentée
  explicite (F.6)** : pour les systèmes dont l'accordage varie
  ethnographiquement (gamelan javanais, et plus tard maqâmât en
  pratique vivante, shrutis indiens, etc.), on s'engage sur **un**
  accordage mesuré et publié, cité en commentaire dans
  `tuningSystems.js`. Principe : pas d'invention, pas de moyenne
  inventée, pas d'extrapolation. Pour Slendro et Pelog : Surjodiningrat,
  Sudarjana & Susanto, "Tone Measurements of Outstanding Javanese
  Gamelans in Jogjakarta and Surakarta" (1972). Si un autre accordage
  est demandé (Yogyakarta, Sumarsam, Tenzer), c'est une **entrée
  séparée** du registre — pas un override paramétrable.
  Conséquence : le label de l'entrée mentionne explicitement la
  région/source ("Slendro (gamelan javanais, Surakarta)"). Cohérent
  avec la posture humble du BACKLOG ("ne pas inventer pour les
  traditions sous-documentées") et avec le 24-TET Le Caire 1932 qui
  cite déjà aly-abbara.com. Le mécanisme d'import custom de cents
  par l'utilisateur (backlog) couvrira les cas où aucune référence
  pré-existante ne convient.
- **Convention de nommage des tempéraments : TET réservé aux
  équipartites (F.7.6)** : le sigle "TET" (Tempérament Égal /
  Tone Equal Temperament) est réservé aux systèmes mathématiquement
  équipartis (12-TET, 24-TET équipartite, 5-TET, 31-EDO — qui utilise
  la variante EDO mais relève du même principe). Les systèmes
  mesurés ou irréguliers (Maqâmât Cairo 1932 mesurés, Slendro et
  Pelog Surakarta, shrutis indiens) ne portent pas ce sigle dans
  leur libellé. Raison : un libellé "24-TET (Le Caire 1932)"
  laissait croire à une équipartition mathématique alors que les
  mesures dévient sciemment (tierces neutres des maqâmat). Cette
  convention vaut pour les ajouts futurs : si un nouveau système
  est dérivé de mesures ou d'une accordage non-uniforme, son
  libellé doit l'indiquer (e.g. "Maqâmât …", "Gamelan …", "shrutis
  …") plutôt que d'emprunter "TET". Les ids existants sont conservés
  malgré cette convention (`'24-tet-cairo-1932'` reste, le coût d'un
  rename global dépasse le bénéfice — ils restent des identifiants
  internes invisibles à l'utilisateur).
- **Source unique des raccourcis clavier (iter-L phase-1.1)** :
  `src/lib/shortcuts.js` est le **point d'extension unique** pour les
  raccourcis clavier. Chaque entrée de `SHORTCUTS` expose
  `{ id, contexts, label, description, keys: { primary, alternative,
  display }, anchor, condition?, composite? }`. Les handlers
  (App.jsx, WaveformEditor.jsx, PatchBank.jsx) consomment via
  `matchesShortcut(e, id)` plutôt que de comparer e.key/e.code
  inline. Raison : avant L.1, les conditions étaient dupliquées entre
  handlers, l'overlay devait re-déduire la liste, et l'ajout/changement
  d'un raccourci nécessitait de toucher plusieurs fichiers. Avec la
  table : un seul endroit pour ajouter un raccourci, l'overlay le rend
  automatiquement, la future page A.1 (Doc / Raccourcis) le génère.
  Exceptions composites (touches notes Designer / placement contigu
  Composer) : entrées marquées `composite: true`, le matching reste
  côté handler (mapping system-dependent via `getKeyboardMap`). Le
  `NOTE_GUARD_KEYS` (cf. décision F.7.5) reste séparé — c'est un
  guard transverse, pas une action utilisateur.
- **Convention `data-anchor` sur les éléments d'UI (iter-L phase-1.3)** :
  chaque élément d'UI référencé par un raccourci, un futur DocLink
  (L.3) ou une étape de Tour (L.4) porte un attribut
  `data-anchor="<id>"`. La valeur correspond au champ `anchor` dans
  `SHORTCUTS` (ou à des ancres dédiées DocLink/Tour). L'utilitaire
  `src/lib/getAnchoredPosition.js` résout l'id en rect viewport ;
  si plusieurs éléments matchent (cas des boutons dupliqués open/
  collapsed Designer ou des boutons Undo/Redo par onglet), prend le
  premier visible. Les ancres dynamiques (anchor halo Composer,
  boutons Undo/Redo selon `activeTab`) sont gérées via `anchor`
  exprimé comme fonction `(state) => string` dans la table. Les
  touches du clavier visuel portent en plus un `data-anchor-key=
  "<noteIndex>"` pour permettre aux overlays composite (étiquettes
  par touche QWERTY) de se positionner sur la cellule correspondante
  via `getAnchoredKeyPositions`.
- **Navigation interne de la doc (iter-L phase-3)** : deux mécanismes
  distincts, volontairement séparés. (1) `<DocLink target="onglet:ancre">`
  = saut vers un élément d'UI réel → bascule d'onglet + halo via
  `src/lib/highlightElement.js`, **2e consommateur de
  `getAnchoredPosition`** après l'overlay raccourcis (la sémantique
  "premier visible / rect dégénéré = absent" donne gratuitement le no-op
  gracieux pour un panneau replié ou une ancre dépendant d'une sélection).
  Le highlight sonde le DOM par `requestAnimationFrame` borné (`maxWaitMs`)
  car l'onglet cible se monte *après* le `setActiveTab` — pas de state
  reducer dédié. (2) Lien Markdown `[label](doc:article-id)` = navigation
  doc→doc, **lien standard intercepté** au rendu (scheme `doc:`), reste
  dans l'onglet. Les handlers (`onDocLink`, `onDocNav`) sont propagés aux
  feuilles interactives par un **`MarkdownNavContext`** plutôt qu'en
  prop-drilling : `renderBlock`/`renderInline` sont des fonctions
  module-level récursives, pas des composants, et ne peuvent pas consommer
  de contexte ; seules les feuilles (`DocLinkAnchor`, `DocNavLink`) le
  font. Défaut null = rendu inerte → le renderer reste réutilisable hors
  onglet Documentation. Validation des cibles en runtime (warn dev), pas
  au build (un linter d'articles pourra venir si le volume L.5 le justifie).
- **Tour guidé = 3e consommateur de `getAnchoredPosition` (iter-L phase-4)** :
  `src/components/Tour.jsx` réutilise la même résolution d'ancre que
  l'overlay raccourcis et `highlightElement`, et le même RAF borné pour le
  montage différé (bascule d'onglet + ouverture de sidebar repliée). Choix
  structurants : (a) **app gelée** par un blocker plein écran qui avale
  clic/molette/clavier — pas un simple voile : le box-shadow du spotlight ne
  capture aucun événement, donc le gel est une couche transparente distincte.
  Ça rend le snapshot/restore tractable (l'utilisateur ne peut rien muter
  pendant le tour). (b) **Snapshot unique sur toute la chaîne** capturé au 1er
  `START_TOUR` (onglet + 4 sidebars repliables), restauré à `END_TOUR` ; le
  chaînage entre onglets (`TOUR_CHAIN`) ne re-snapshot pas — c'est la
  définition de « stateless du point de vue utilisateur ». Garde dédiée :
  pendant `tour.active`, l'effet de persistance localStorage est court-circuité
  (un refresh en plein tour ne doit pas figer une sidebar dépliée par le tour).
  (c) **Tours déclaratifs par onglet** (`src/lib/tours/*.js`) : une étape =
  `{ anchor, title, body, article?, sidebar? }`. La *séquence effective*
  (étapes dont l'ancre est résolvable, ou révélable via `sidebar`) est calculée
  côté `Tour.jsx` ; les ancres absentes (clip témoin inexistant, presse-papier
  vide, bouton conditionnel) sont skippées gracieusement — pas de création de
  contenu témoin (scope médian). Aucun ordre canonique entre tours.
  **Contrainte d'écriture des étapes** : une étape portant `sidebar` est tenue
  pour disponible *a priori* (la sidebar la révélera), donc son ancre **doit
  être inconditionnellement présente** une fois la sidebar ouverte — sinon la
  bulle reste vide sans skip (cas vécu : `designer-save-button` n'existe
  qu'avec un patch chargé ; on cible `designer-save-as-button`, toujours là).
  (d) **Panneau de fin = position virtuelle** après la dernière étape (état
  `atEnd` explicite, jamais dérivé de `stepIndex` — sinon revenir sur la
  dernière étape le re-déclencherait). Là, le spotlight s'éteint (voile plein
  écran) et la bulle se centre dans le viewport. Navigation clavier ← / → en
  plus des boutons, lue via une ref synchronisée hors render.
- **Posture mode note : possession totale du clavier
  alphanumérique (F.7.5)** : hors form-field et hors raccourcis OS
  (Ctrl/Alt/Meta), le mode note "possède" l'ensemble fixe
  `NOTE_GUARD_KEYS` (alphanumériques + ponctuations à risque
  navigateur — Slash, Quote, Backquote, etc.) défini dans
  `src/lib/keyboardCandidates.js`. Les listeners notes Designer et
  Composer appellent `preventDefault()` sur ces touches *avant* tout
  lookup `keyboardMap` ou check Shift, indépendamment du système
  courant. Raison : sinon un utilisateur qui tâtonne avec un système
  ne mappant pas une touche donnée se fait happer par le navigateur
  (Firefox QuickFind sur ' = Digit4 AZERTY en 12-TET, par exemple).
  La constante est statique et inclut volontairement des codes hors
  registre (les ponctuations) ; ne pas la dériver dynamiquement
  depuis `TUNING_SYSTEMS`. Si un nouveau système mappe une touche
  absente d'ici, l'ajouter explicitement. Cohérent avec la décision
  F.3 (registre = seul point d'extension) : le registre dicte
  *quelles touches déclenchent une note dans un système donné*, mais
  la posture mode note est *transverse à l'app* — d'où le fichier
  séparé.
- **Catalogue partagé pour systèmes équivalents acoustiquement
  (F.7)** : quand deux systèmes du registre se distinguent par leur
  *grammaire culturelle* (grouping, layout, labels, mapping QWERTY)
  mais reposent sur les **mêmes cents**, on factorise la table de
  cents et la fonction `freq` dans une seule constante / un seul
  helper réutilisé par les deux entrées. Posé pour Bhatkhande et
  Sarngadeva (`SHRUTI_CANONICAL_CENTS` + `shrutiFreq` partagés ;
  deux entrées registre `'shrutis-bhatkhande'` et
  `'shrutis-sarngadeva'`, deux layouts `grid-22-*` et deux paires
  `*_NAMES` / `*_KEY_MAP` distinctes). Raison : les sons sont
  strictement les mêmes (un noteIndex donné produit la même
  fréquence dans les deux systèmes — la bascule entre les deux
  préserve la hauteur tout en changeant les labels), c'est la
  *lecture musicologique* qui diffère. Conséquence : aucun risque
  de divergence numérique entre les deux systèmes, et un éventuel
  3e framework sur le même substrat (ex. Bharata reconstructed
  selon Sambamoorthy) ne demande qu'un nouveau triplet
  `noms + keymap + layout` + une nouvelle entrée registre. Cohérent
  avec la décision F.6 (référence documentée explicite par accordage)
  et avec le pattern d'extension F.3 (le registre reste le point
  d'extension unique — on n'étend pas son schéma, on ajoute des
  entrées qui se partagent du code).
- **Catalogue de visual cues universel en cents (itération F.4.4)** :
  `src/lib/visualCues.js` définit chaque pattern (triade, gamme,
  septième…) comme une liste d'intervalles **en cents depuis la
  tonique**, indépendamment de tout système. Le snap vers les degrés
  du système courant est fait dynamiquement par `cuedNoteIndices()`
  via `frequencyToNearestIn`. Choix vs alternative (catalogues
  per-système, ex. mapping `[0, 4, 7]` pour 12-TET, `[0, 8, 14]`
  pour 24-TET) : 1) le catalogue universel est *intentionnellement
  unique* — la "triade majeure" est un objet musical pur (5/4 et 3/2),
  les écarts de chaque système par rapport à la pureté sont
  précisément ce qu'on veut donner à voir pédagogiquement ; 2) ajouter
  un système ou un pattern reste une opération O(1) — pas de
  multiplication NxM des entrées de catalogue. Effet de bord
  intéressant : la "gamme par tons" 12-TET (200¢) ne se ferme pas
  régulièrement en 31-EDO (séquence non périodique [0,5,10,16,21,26]
  au lieu de [0,5,10,15,20,25,31]), ce qui est la signature de la
  non-divisibilité de 1200 par 200 dans une grille de pas 38.71¢.
- **A4 de référence configurable (itération F.1)** : champ d'état
  `a4Ref` (Hz, défaut 440), persisté, global — pas un champ d'éditeur.
  Passé explicitement à `clipFrequency` et aux fonctions `freq` du
  registre (paramètre, pas import global → testable et découplé).
  Dans `usePlayback`, propagé via `a4RefRef` (comme `bpmRef`) lu au
  tick du scheduler : un changement pendant la lecture prend effet
  pour les clips schedulés après le changement (lag ≤ look-ahead =
  100 ms). Raison : un éventuel "A=432 Hz" est un réglage global,
  pas par-clip ; passer en argument le rend testable unitairement
  sans stub de state.
- **Éditeur = champs `test*` pour la preview** : le clavier piano /
  octave / slider fréquence du Designer pilotent uniquement la preview
  audio. Au drop d'un patch sur la timeline, `handleAddClip` lit
  `editorTestNoteFields(editor)` pour fixer la hauteur du nouveau clip
  (règle par défaut E.1). Les raccourcis clavier pour override au drop
  viendront en E.4.
- **Piles undo/redo en RAM pure** : pas de persistance localStorage.
  Motifs : taille (snapshots complets × 50 × 2 onglets), complexité
  (migration de format à chaque évolution du reducer), coût faible
  pour l'utilisateur (historique qui s'efface au reload est un comportement
  standard).
- **Snapshots undo complets (pas de diff)** : chaque entrée d'historique
  est un clone superficiel des champs trackés. Le partage de références
  via l'immutabilité du reducer rend ça bon marché en mémoire (un clip
  non modifié est la même référence dans tous les snapshots).
- **Moteur audio look-ahead** : `usePlayback` utilise un scheduler à
  fenêtre glissante (setInterval 25ms, look-ahead 100ms) qui programme
  les clips par petits blocs à l'avance. Les modifications de clips
  pendant la lecture sont prises en compte : le scheduler compare
  les signatures des clips à chaque tick et invalide/reprogramme les
  clips modifiés, supprimés ou ajoutés. L'export WAV conserve le
  scheduling one-shot (optimal pour OfflineAudioContext).
- **Lane assignment greedy, calculé au rendu** : la polyphonie (clips
  qui se chevauchent → lanes empilées) est calculée à chaque render de
  `Timeline` à partir des clips triés par position. Pas stocké dans le
  state. Raison : le calcul est O(n) et le layout se redébrouille après
  chaque drag/resize/drop sans invalidation manuelle.
- **Piles undo/redo isolées par onglet** (Option A parmi les alternatives
  discutées) : une pile pour Designer, une pile pour Composer. Raison :
  un Ctrl+Z doit annuler ce que l'utilisateur vient de faire *dans
  l'onglet où il est* ; partager une pile globale rendrait l'undo
  imprévisible (on annulerait une action invisible faite dans l'autre
  onglet). Conséquence : cross-onglet à gérer explicitement — un undo
  Designer qui supprimerait un son référencé par des clips du Composer
  est bloqué avec un Toast explicite, et symétriquement un undo
  Composer qui restaurerait des clips dont le son a été supprimé est
  aussi bloqué. Pas d'états incohérents possibles.
- **Pile undo classée par nature de l'action, pas par onglet
  source** (F.3.9) : `editor.testTuningSystem` est exposé dans deux
  endroits — sélecteur Designer ET sélecteur dans la toolbar
  Composer. Quel que soit le point de déclenchement, l'action
  `SET_EDITOR_TEST_TUNING_SYSTEM` reste dans `DESIGNER_UNDOABLE`
  (l'éditeur est sa juridiction sémantique). Un Ctrl+Z depuis le
  Composer ne défait pas un changement de tempérament fait depuis
  le Composer — il faut basculer vers le Designer. À surveiller
  comme accroc UX éventuel ; alternative déjà étudiée (déplacer
  l'action dans `COMPOSER_UNDOABLE` quand déclenchée depuis le
  Composer) écartée pour ne pas faire dépendre la classification
  de l'origine du dispatch (couplage UI ↔ reducer).
- **Suppression patches/dossiers : blocage avec assistance, pas de
  cascade**. Si des clips référencent le patch, on bloque la suppression,
  on affiche un toast, on auto-sélectionne les clips concernés et on
  bascule vers Composer. Raison : la cascade (supprimer patches + clips
  en une seule action) nécessitait un dual-stack undo complexe avec des
  edge cases insolubles (actions intercalées entre les deux piles). Le
  blocage est simple, robuste, et l'utilisateur garde le contrôle total.
- **Check undo symétrique bidirectionnel** : UNDO_DESIGNER vérifie que
  les clips actuels ne deviennent pas orphelins (via `patchId`) ;
  UNDO_COMPOSER vérifie que les patches référencés existent. Dans les
  deux cas : blocage + toast + auto-sélection des éléments concernés
  + bascule vers l'onglet approprié.
- **Deux clipboards séparés** : un pour les clips (Ctrl+C/X/V,
  positionné à la souris) et un pour les mesures (menu contextuel
  en-tête de mesure). Les deux sont volatils (RAM, non persistés).
  Raison : les deux opérations de collage ont des sémantiques
  différentes (clips = positionnement libre, mesures = insertion
  structurelle avec décalage).
- **Lanes = mécanisme d'affichage** : le lane assignment est greedy,
  recalculé à chaque rendu, jamais stocké dans le clip. Conséquence :
  la fusion (Ctrl+M) ignore les lanes et ne considère que l'adjacence
  temporelle, le patchId, la hauteur (tuningSystem/note/octave/frequency)
  et le trackId (même piste obligatoire).
- **Lane assignment par piste** : depuis C.1, le layout greedy est
  calculé indépendamment pour chaque piste (clips filtrés par trackId).
  Chaque piste a son propre `laneCount` et sa propre hauteur de
  corridor (`max(1, laneCount) × trackHeight`). Les bornes de resize
  (`computeBounds`) sont aussi filtrées par piste.
- **`tracks` dans COMPOSER_FIELDS** : inclus pour que CREATE/DELETE/
  RENAME_TRACK soient undoable. Conséquence : un undo d'action
  Composer peut aussi revert un changement de hauteur de piste
  (SET_TRACK_HEIGHT). Compromis accepté — la hauteur est un détail
  d'UI, pas une donnée métier.
- **Invariant `lastAnchorClipId ↔ selectedClipIds`** (E.7.1) : quand
  la sélection est non vide, l'anchor doit être égal au dernier clip
  sélectionné. Toutes les actions métier respectent déjà cette règle ;
  le helper `syncAnchorWithSelection(state)`, appliqué en sortie de
  `withUndo` sur chaque action (idempotent : retour direct si déjà
  aligné), garantit l'invariant dans les chemins UNDO/REDO qui ne
  mettent pas l'anchor à jour (anchor est non undoable). Corrige la
  classe de bugs où la sélection restaurée par un undo divergeait
  de l'anchor.
- **Settling frame pour animation drop drag** (E.7.6) : le retrait
  de la classe `is-dragging` (et donc le passage de `transition: none`
  à `transition: top 0.35s`) conjugué au changement de `top` dans
  le même frame ne déclenche pas la transition (race condition CSS
  Transitions). Solution : état local `settlingTops` dans Timeline
  qui capture `el.style.top` au mouseup, l'impose comme override
  inline pour le frame post-commit, et le libère via
  `requestAnimationFrame` au frame suivant. Permet à la transition
  de s'appliquer sur un changement de top détecté après activation
  de la transition-property.
- **Jamais de discontinuité dans le signal audio** (E.9) : un
  changement brutal de gain (saut 0→amp) ou une coupure d'oscillator
  en pleine phase (osc.stop() sans rampe) produit un clic audible.
  Règle : toute transition d'amplitude passe par une rampe ≥ quelques
  ms. Matérialisée par deux constantes :
    - `MIN_ATTACK = 0.003` (`audio.js`) : plancher appliqué via
      `Math.max(user_attack, MIN_ATTACK)` au démarrage de chaque
      voix. Concerne `WaveformEditor.playInstrumentNote` et les
      `scheduleXxxClip` de `usePlayback`. Sous le seuil perceptif
      d'attaque (~10 ms) → l'utilisateur ne "ressent" pas la
      contrainte.
    - `RETRIGGER_FADE = 0.008` (`WaveformEditor.jsx`) : durée du
      micro-fade-out appliqué à la voix précédente quand une note
      est retriggerée. La nouvelle voix démarre immédiatement, les
      deux se superposent 8 ms — imperceptible mais pas de clic.
  Pattern récurrent pour tout fade programmatique : capture
  `gain.value` AVANT `cancelScheduledValues`, sinon l'annulation
  fait retomber le param sur le dernier `setValueAtTime` antérieur
  et la valeur lue est fausse (voir aussi E.8 pour le release ADSR).
- **Format `.osa` = magic `OSA2` + gzip(JSON) versionné avec injection
  4 octets garbage à offset 10 du flux gzip** — zéro dépendance npm
  (CompressionStream natif). L'injection mid-stream casse les
  archiveurs permissifs (7-zip et al.) qui scannent la signature gzip
  à n'importe quel offset : ils détectent le `1F 8B` à offset 4 du
  fichier, tentent la décompression, et échouent immédiatement sur la
  corruption du premier bloc DEFLATE. C'est de la **dissuasion casual
  uniquement** — un lecteur de code source trouve l'offset en 2 minutes.
  Tout changement incompatible du schéma → bump version (`migrateVNtoVN+1`
  explicite à l'import) ou bump magic (`OSA3`) si on change le wire
  format. Pas de tolérance silencieuse.
- **IDs régénérés à l'import (jamais d'overlap)** — garantit que
  les clips de la timeline ne peuvent jamais être affectés par un
  import. Les `folderId` / `parentId` internes au payload sont
  remappés via une table `oldId → newId`. **Règle non négociable.**
- **Validation strict-strict des fichiers `.osa`** — un seul champ
  malformé = rejet complet. Pas de tolérance partielle. Raison :
  un fichier partiellement importé est une banque dans un état
  indéterminé, source de bugs subtils plus tard.
- **Pas de compression du localStorage** (décision *contre*) — on
  compresse au transport (`.osa`), pas au stockage actif. Le path
  chaud localStorage doit rester synchrone et bon marché. Si la
  pression sur le quota devient réelle, IndexedDB (async-natif,
  gros quota) ou quantification des points, pas gzip-in-localStorage.
- **Modale comme primitive partagé** (`Modal.jsx`) — pattern
  manuscrit léger (backdrop, Escape, focus trap basique), réutilisé
  par les modales import / export. Pas de framework UI. Si une 4ème
  modale émerge, vérifier la cohérence d'UX (backdrop close-on-outside,
  animation, padding) plutôt que diverger.

- **Spectrogram : double mode statique/live, toggle explicite** — le
  statique reste la vue par défaut (DFT canonique d'un cycle du dessin),
  le live consomme l'AnalyserNode du WaveformEditor pendant les notes
  test. Un bouton "Live" dans le header bascule explicitement entre les
  deux modes. **Évolution** : l'iter I phase 1 avait initialement choisi
  l'auto-switch (mode bascule automatiquement quand une voix joue,
  grace period 1s post-release pour éviter le flicker en jeu rapide).
  À l'usage, le retour utilisateur a montré que l'auto-switch est
  surprenant et complique la lecture comparative — le toggle explicite
  (option A du brainstorming initial) est plus prévisible. Refactor
  appliqué dans `4a22400` : compteur `activeVoicesCountRef` conservé
  comme primitive mais ne pilote plus le mode.

- **AnalyserNode Designer-only (scope α)** — le Spectrogram Designer
  ne reflète que les notes test du clavier piano, pas la lecture
  Composer (qui a son propre AnalyserNode dans usePlayback). Cohérent
  avec le placement du Spectrogram (Designer uniquement). Si on veut
  un Spectrogram Composer un jour, c'est une feature séparée.

- **Refs partagés entre WaveformEditor et Spectrogram** (`analyserRef`,
  `activeVoicesCountRef`) gérés par App — pattern de coordination
  cross-composant pour éviter re-renders à 60fps. Précédent :
  `editorRef` (imperative handle) existant déjà entre App et
  WaveformEditor.

- **Compteur `activeVoicesCountRef` côté WaveformEditor** — primitive
  utile au-delà du spectrogramme (indicateur visuel "ça joue", limiteur
  de polyphonie, etc.). Décrémentation via `osc.onended` (event natif
  Web Audio) qui fire quand l'oscillator s'arrête effectivement
  (release naturel OU osc.stop() forcé via retrigger / stopAll). Plus
  précis qu'un `setTimeout` planifié au start (qui sous-évaluait la
  durée des notes en sustain long). Guard anti-dérive `Math.max(0, …)`.
  `stopAllInstrumentNotes` reset explicitement à 0 (cleanup forcé).

- **Snapshots undo Designer : exclure les `editor.test*` fields** — les
  champs preview du clavier (testNoteIndex, testOctave, testTuningSystem,
  testFrequency) sont mutables hors undo : leur intent est "quelle touche
  je teste en ce moment", pas "à quoi je veux revenir avec Ctrl+Z".
  Implémentation (commit `68a58f1`) : `pickFields` filtre ces champs au
  snapshot, `restoreSnapshot` deep-merge editor au restore pour préserver
  les test* fields courants. Symétrique : ce qui n'est pas snapshotté
  n'est jamais restauré. Pattern applicable à tout futur "preview/transient"
  state qu'on voudrait exclure de la pile undo.

- **Cache "déjà dessiné" basé sur le succès effectif du draw** — la
  rAF loop du Spectrogram ne marque sa cache `lastPoints/lastFrequency/
  lastDbScale` qu'**après** que `drawStatic` ait réussi (canvas sizé,
  dimensions valides). Si le draw échoue (e.g. canvas pas encore
  dimensionné au mount initial), la cache reste invalide et le prochain
  tick réessaiera. Évite le bug de "cache marquée mais draw raté" qui
  laissait le Spectrogramme vide au chargement.

- **FFT truncation à N/2+1 = 257 coefficients** (iter-M phase-1, bump
  128→256) — pour un signal réel d'entrée, les k=257..511 de la FFT sont les
  conjugués miroirs de k=1..255 (information redondante). Mais
  `createPeriodicWave` les traite comme des harmoniques indépendants à des
  fréquences `k×f`, produisant des "parasites" audibles. On tronque à
  k=0..256 avant `createPeriodicWave`. `NUM_SAMPLES = 512`,
  `HALF_HARMONICS = 257`, `HARMONIC_COUNT = 256`. Le bump récupère la
  richesse que les 600 points portaient et qu'on jetait au rééchantillonnage :
  les **basses** (G2 ≈ 98 Hz → ~204 harmoniques audibles, dont 128 seulement
  livrées avant) gagnent leur plein potentiel ; au-dessus de ~156 Hz aucun
  changement (les harmoniques manquantes passaient > 20 kHz). Le slider
  **Définition** (1..256, per-patch) tronque en aval à M/256 pour nettoyer un
  dessin sans quitter la 2D — troncature dans `pointsToPeriodicWave`, pas dans
  le cache spectral.

- **FFT Cooley-Tukey radix-2 in-place** — remplace la DFT naïve O(N²)
  par un algorithme O(N log N) (~30 lignes JS pur, zéro dépendance).
  Speedup ~30× pour N=256. Pas critique en performance mais aligné
  avec sobriété énergétique. Self-test en dev mode garantit la
  correctness numérique. Convention `exp(-iθ)` préservée — équivalence
  numérique avec la DFT naïve précédente (sons inchangés sur les
  patches existants).

- **Cache memoization de `pointsToHarmonics` via WeakMap** — keyed par
  référence du buffer `points`. Cache hit naturel quand le dessin n'a
  pas changé (le reducer crée des nouveaux arrays sur modif → référence
  différente → cache miss → recalcul). WeakMap garantit pas de fuite
  mémoire (entrée GC'd quand le patch est supprimé). Le cache est
  partagé entre playback audio et Spectrogram statique → une seule
  transformation par changement de dessin.

- **Limites Web Audio à haute fréquence — acceptées** — après iter-J,
  la vérification manuelle a révélé plusieurs comportements observables
  à hautes fréquences (≥ B6/2 kHz) : (1) le live FFT affiche moins
  d'harmoniques que le statique car l'anti-aliasing interne de
  `createPeriodicWave` applique un rolloff progressif près de Nyquist
  (24 kHz à 48 kHz sample rate) au lieu d'un cut net, (2) les amplitudes
  des harmoniques individuelles sont non-monotones (scalloping FFT de
  l'AnalyserNode + interpolation wavetable + aliasing résiduel près de
  Nyquist), (3) certains peaks à très hautes fréquences (~G#9, 13 kHz+)
  décroissent visuellement à -80 dB même si l'audio reste stable
  (artefact interne createPeriodicWave). Ces phénomènes sont des
  **conséquences attendues du modèle PeriodicWave + AnalyserNode** et
  ne sont pas un bug du code applicatif. Les corriger demanderait un
  refactor majeur vers `AudioWorkletNode` (synthèse custom sample-par-
  sample en thread audio dédié, avec anti-aliasing custom). Backlog.

- **Bibliothèque multi-mode (5 combinaisons valides)** — Tree × List/Details
  + Nav × List/Details/Tiles. Tiles caché en mode Tree (incohérent
  visuellement). État `bibHierarchyMode` et `bibDisplayMode` persistés
  partagés entre instances Designer et Composer (un seul jeu de
  préférences globales). Default `'nav'` + `'list'` au load.

- **Sélection comme concept UX distinct de `currentPatchId`** —
  `bibSelectedIds` est la sélection visuelle multi-items dans la
  bibliothèque ; `currentPatchId` reste le patch chargé dans le
  Designer. Simple clic sélectionne, double-clic ouvre/charge.
  Cohérent avec les file explorers modernes.

- **Anti-cycle paste/drag via `wouldCreateCycle`** — toute opération
  qui prend un folder pour cible doit refuser le folder lui-même ou
  tout descendant. Helper centralisé dans `src/lib/bibTransfer.js`,
  appelé par `PASTE_BIB_CLIPBOARD` et `MOVE_BIB_ITEMS`. Notification
  utilisateur en cas de refus (`SET_NOTIFICATION` dispatch).

- **Clipboard transient, PASTE/MOVE undoable** — `bibClipboard`,
  `bibSelectedIds`, `bibSelectionAnchor` non persistés, non undoable
  (UI state). `PASTE_BIB_CLIPBOARD` et `MOVE_BIB_ITEMS` dans
  `DESIGNER_UNDOABLE` (mutent patches/folders).

- **Lasso selection via `data-bib-item-id`** — chaque DOM node d'item
  (chip, folder row, tile) porte des attributs `data-bib-item-id` et
  `data-bib-item-type`. Le hit-test du lasso itère `querySelectorAll`
  + `getBoundingClientRect()`. Robuste aux indentations variables
  (tree mode) et aux changements de display mode.

- **Composants extraits pour la croissance de PatchBank** — quatre
  nouveaux composants (`BibBreadcrumb`, `BibContextMenu`,
  `PatchThumbnail`, `PopupResizer`) extraits pour maintenir
  `PatchBank.jsx` à une taille gérable (~700 lignes après refonte).
  Convention : un sous-élément qui dépasse ~80 lignes mérite son
  fichier.

- **3 sous-applications autonomes** (Bibliothèque, Designer, Composer)
  avec piles undo séparées (`history.library`, `history.designer`,
  `history.composer`). Chaque onglet a son cycle de vie, son raccourci
  Ctrl+Z. Co-dépendances : delete patch utilisé bloqué avec modal +
  lien Composer ; suppression du currentPatch vide le Designer.

- **Routing Ctrl+Z par activeTab** (`UNDO_LIBRARY` si `activeTab ===
  'library'`, etc.). Trivial et prédictible. Remplace le focus tracking
  introduit en phase 1 Task 11. Le keydown PatchBank ne traite plus
  Ctrl+Z (délégué à App.jsx).

- **`SAVE_PATCH` non-undoable** — action explicite via `SavePatchDialog`
  popup (location + nom validés par l'utilisateur). Suppression manuelle
  assumée. Évite le cross-cut entre piles Designer et Library.

- **Clipboard cut→copy après premier paste** — `bibClipboard.mode`
  bascule de `'cut'` à `'copy'` au premier paste. Items préservés pour
  multi-paste. Ghost `is-cut` disparaît naturellement.

- **`DELETE_BIB_ITEMS` batch atomique undoable** — multi-delete = 1
  action = 1 entrée undo. Détecte les patches utilisés en Composer,
  supprime les libres, retourne `pendingDeleteWarning` pour modal récap.

- **`skipUndo` flag dans `action.meta`** — extension générique pour
  bypasser le snapshot undo sur certaines actions contextuelles
  (ex : `CREATE_FOLDER` depuis le popup Save). Pattern réutilisable.

- **Sidebar Designer/Composer = `PatchPicker` lightweight** — composant
  ~155 lignes (Tree+List forcé, click=load Designer / drag-out Composer,
  aucune manipulation directe). Menu contextuel unique : "Ouvrir dans
  Bibliothèque" (dispatch `OPEN_IN_LIBRARY`). Réduit la complexité
  runtime des sidebars et clarifie le paradigme.

- **Onglet Bibliothèque en premier dans l'ordre visuel du header** —
  Bibliothèque, Designer, Composer. Cohérent avec flow logique
  ressources → édition → composition. `activeTab` default reste
  `'designer'` au premier load.

- **Right-click sur item non sélectionné met à jour la sélection** à cet
  item avant d'ouvrir le menu. Invariant garanti : "menu = sélection
  courante". Simplifie `handleCopy/Cut/Delete` (plus de fallback
  `contextMenu.id` ajouté en phase 1).

- **Table TOC Documentation = source unique (`src/docs/index.js`)**
  (iter-L phase-2.3). Tout article qui apparaît dans la sidebar de
  l'onglet Documentation est déclaré là, ordre du tableau = ordre
  d'affichage, groupage par champ `section`. Le format est extensible
  via `type` : `'markdown'` (source brute importée via le suffix `?raw`
  de Vite) ou `'generated'` (composant React dédié, dispatché par id
  dans `DocumentationTab`). Le pattern `type` permet d'ajouter un
  nouveau type d'article (auto-généré depuis un autre registre, ou
  page interactive) sans changer le contrat des entrées existantes —
  cohérent avec le pattern d'extension F.3 (registre tempéraments) et
  L.1 (table SHORTCUTS) : on étend en ajoutant des entrées, pas en
  modifiant le schéma. Ajouter un article rédigé = ajouter un `.md`
  + une entrée. Ajouter un article généré = créer le composant +
  ajouter un cas dans le dispatch + une entrée.

- **Renderer Markdown maison = convention "pas de lib externe"**
  (iter-L phase-2.2). `src/lib/markdown.js` est un parser ~200 lignes
  en JS pur (deux passes : blocs ligne-par-ligne, inline scan/flush)
  qui couvre le sous-ensemble V1 nécessaire à la documentation interne
  (H1-H4, paragraphes, listes ord/non-ord avec 1 niveau d'imbrication,
  blockquote, code block fenced, gras/italique, code inline, liens,
  images, `<DocLink>`). Pas de dépendance npm cohérent avec la
  posture stack minimale du projet, et la grammaire est volontairement
  petite — pas de tableaux, footnotes, strikethrough, HTML brut (sauf
  DocLink intercepté). Limites connues : pas d'escape `\*`, les
  parenthèses non-encodées dans une URL d'image cassent le regex
  (workaround : URL-encoder en `%28`/`%29`). Si une fonctionnalité
  manque pour un futur article, étendre le parser plutôt que d'ajouter
  remark/markdown-it.

- **Math renderer maison, LaTeX-like, pas de KaTeX** (iter-L phase-R).
  Le besoin réel (musique/tempéraments) est petit et le restera : ratios
  (`3:2`), cents, exposants (`2^{1/12}`), fractions (`\frac{3}{2}`),
  indices, ~12 symboles grecs/opérateurs. ~100 lignes (sous-parser
  `src/lib/mathParse.js` + rendu dans MarkdownRenderer + CSS) plutôt
  qu'une dépendance KaTeX (~280 ko) — cohérent avec « no npm dep ».
  Délimiteurs `$…$` (inline) / `$$…$$` (block centré). Trois choix
  structurants : (1) **syntaxe LaTeX-like** (pas de DSL visuel maison)
  pour la **réversibilité** — si le besoin explose un jour, passer à
  KaTeX ne touche pas aux articles. (2) **Accolades obligatoires**
  (`^{x}`, pas `^x`) pour désambiguïser la fin de l'exposant sans
  parser de précédence. (3) **mathAst construit au parse** (pas de
  `content` brut différé au rendu) : le renderer reste un dispatch pur,
  et le mémo par `source` de MarkdownRenderer couvre le parse math
  gratuitement. Italique auto sur lettres latines isolées **à
  l'intérieur des délimiteurs uniquement** (convention LaTeX des
  variables ; n'affecte jamais le texte hors `$`). Périmètre
  volontairement borné — **hors scope** : matrices, intégrales, sommes,
  racines, vecteurs, environnements `\begin{…}`. La ligne maison ne
  tient que si elle reste petite : étendre ponctuellement au besoin,
  ne jamais anticiper. Commande inconnue / construct mal formé → rendu
  littéral + `console.warn` en dev, jamais de crash. Pas d'escape `\$`
  en V1 (cohérent avec l'absence d'escape `\*`) : un `$` non apparié
  reste littéral.
  **Révision 2026-05-28 (phase R.4)** : ajout des **délimiteurs
  extensibles** `( )` et `[ ]`, sur décision archi — la forme correcte
  de `(3/2)^12` au tableau exige des parenthèses qui grandissent avec la
  fraction. Implémenté sans `\left\right` ni mesure JS : appariement des
  délimiteurs au parse (`matchDelim`, respecte parenthèses + accolades),
  et au rendu, si le contenu contient une fraction, les bords sont
  **dessinés en CSS** (bordure + `border-radius` vertical en %) dans un
  `inline-flex; align-items: stretch` qui les étire à la hauteur du
  contenu. Contenu sur une ligne (`(n/12)`) → glyphes littéraux normaux
  (pas de régression). Reste hors scope : matrices, intégrales, racines —
  la ligne maison ne tient que petite.

- **Persistance Documentation : double sink localStorage +
  sessionStorage** (iter-L phase-2.1). Les *préférences UX* de la
  sidebar TOC (`docSidebarCollapsed`, `docSidebarWidth`) vivent en
  localStorage avec les autres prefs sidebar — l'utilisateur veut
  retrouver son réglage au jour suivant. La *position de lecture*
  (`doc.currentArticleId`, `doc.scrollPositions`) vit en
  sessionStorage sous une clé dédiée `synth-app-doc-session` — elle
  est restaurée pendant qu'on bascule entre onglets dans la même
  session, mais elle est jetée à l'ouverture d'une nouvelle session
  pour ne pas surprendre l'utilisateur ("pourquoi suis-je au milieu
  de cet article ?"). Hydratation au boot via `loadDocSession()`
  défensive (types filtrés silencieusement) ; aucune migration en
  cas de format inattendu.

## Contraintes implicites

Conventions tacites. Les enfreindre sans raison crée des bugs subtils.

- **TypeScript incrémental** (depuis Iteration M, préalable A) : `allowJs`,
  `checkJs:false`, `strict:false`, `noEmit` ; migration fichier par fichier
  via `// @ts-check` en tête (pas de big-bang). Les types du modèle vivent dans
  `src/types.ts` (source de vérité du modèle, plus seulement « TS-like » dans ce
  doc). Fichiers opt-in à ce jour : `src/reducer.js` (iter-N N.6.1, reducer typé
  `(State, Action) => State` ; le `switch (action.type)` narrowe l'union
  discriminée `Action`). Note : `@ts-check` vérifie au `strict:false` global —
  suffit pour la classe « accès propriété inexistante » (TS2339). Ne pas activer
  `strict:true` global ni ajouter de lib de types lourde sans validation archi.
- **Modèle unifié (M rattrapage)** : `cap` (1..256) remplace `definition` (tracé)
  ET `N` (barres) ; `editor.currentLens` (`'free'|'spline'`, M.r.3.2) est
  **volatile** (non persisté en localStorage, non écrit dans `.osa`) ; le résidu
  (`residual`) vit sur l'editor ET le patch. `.osa` : `OSA_VERSION = 4` (iter-T :
  += autoPan ; iter-P avait += vibrato/tremolo), l'import accepte v1 (legacy, migré
  à l'hydratation), v2, v3 et v4. Migration idempotente `reducer.migrateLegacyPatch`
  — une implémentation, deux call-sites (localStorage + import .osa).
- **`.osa` v4 = seul bump de l'itération T (décision T.2)** : l'auto-pan (T.2)
  porte le passage v3→v4. Les phases suivantes **T.3→T.6** (pitch envelope, filtre,
  env+wah, distorsion) ajouteront leurs champs **DANS v4** — pas de v5/v6/… par
  effet — en s'appuyant sur la règle générale « champ absent → défaut injecté à
  l'hydratation » (`sanitize*` dans `patchMeta`/`migrateLegacyPatch`). Un patch
  v4 exporté tôt dans l'itération, sans les champs des effets ultérieurs, reste
  donc rechargeable : chaque champ manquant retombe sur son défaut. **T.3 l'illustre** :
  `pitchEnv` ajouté en v4 **sans bump** (`isPitchEnvValidOrAbsent` dans le bloc v4,
  absent → `DEFAULT_PITCHENV`).
- **Reset vs Normaliser vs Nouveau patch (M.r.2, portée resserrée r.2.6.1)** :
  trois actions distinctes. `RESET_EDITOR_WAVEFORM` (bouton Reset) réinitialise
  **le timbre seul** (canonical = silence, ancres aplaties, interpolation =
  défaut, résidu nul, preset null) mais **préserve le `cap`** (plafond
  d'harmoniques) **et le nombre d'ancres** — resserrement r.2.6.1/.3 vs l'ancienne
  remise du cap à 256 et du compte à 8. Ne touche pas non plus ADSR / amplitude /
  test* / visualCue* / currentLens / currentPatchId. Distinct de `RESET_EDITOR`
  (Ctrl+Alt+N « Nouveau patch »), qui reste l'outil de **remise à zéro complète**
  de l'éditeur (cap + ancres inclus). `NORMALIZE_EDITOR_CANONICAL` (bouton Normaliser)
  exécute l'iDFT à phase canonique. **M.r.4** : `disabled` quand
  `editor.canonicalNormalized` (plus de no-op à 1 cran undo possible).
- **Re-fit auto des ancres = uniquement les voies non-spline (M.r.3)** : seules
  les 5 actions qui *écrivent* canonical par une autre voie (cf. Décisions
  architecturales) appellent `refitAnchorsAndResidual`. Les actions suivantes
  **n'invoquent PAS** le re-fit, chacune pour une raison documentée dans le
  reducer : `MOVE_SPLINE_ANCHOR` / `ADD_SPLINE_ANCHOR` / `REMOVE_SPLINE_ANCHOR`
  (édition *explicite* des ancres ; un re-fit DP annulerait le geste voulu). Pour
  le **drag**, le résidu est *remappé* par warp 2D pour suivre l'ancre (canonical
  change) ; pour **ADD/REMOVE et `SET_SPLINE_INTERPOLATION`** (N.2.1/N.3.2),
  canonical **inchangée** et résidu *recalculé* contre la nouvelle représentation
  (`computeResidual(canonical, spline(next, mode))`), cf. principe « représentation
  vs forme » ;
  `SET_EDITOR_ANCHOR_COUNT` (re-fit explicite déjà câblé, c'est sa raison d'être) ;
  `RESET_EDITOR_WAVEFORM` (aplatit explicitement les ancres au count courant) ;
  `SET_EDITOR_CAP` (ne touche pas la canonical — la troncature vit dans la chaîne
  audio, `pointsToPeriodicWave`).
- **Flag `editor.canonicalNormalized` (M.r.4)** : propriété de l'histoire de
  l'éditeur (≠ détection numérique — le round-trip FFT n'est pas idempotent, cf.
  Décisions). `DEFAULT_EDITOR.canonicalNormalized = true` (canonical = 0 =
  iDFT(0)). Chaque action qui *écrit* canonical le repositionne explicitement —
  un oubli n'est PAS attrapé par typecheck/lint. Tableau exhaustif :
  - **→ `true`** : `NORMALIZE_EDITOR_CANONICAL`, `SET_EDITOR_HARMONIC_AMPLITUDE`
    (iDFT phase canonique par construction), `LOAD_PRESET`,
    `APPLY_EDITOR_PRESET('sine')` (sin pur), `RESET_EDITOR_WAVEFORM` (silence),
    `RESET_EDITOR` (hérite de `DEFAULT_EDITOR`).
  - **→ `false`** : `SET_EDITOR_CANONICAL` (tracé libre, phase arbitraire),
    `MOVE_SPLINE_ANCHOR` (warp → `splinePlusResidual` ≠ iDFT canonique ; **seul**
    le drag écrit `false` — `ADD`/`REMOVE`/`SET_SPLINE_INTERPOLATION` préservent
    le flag depuis N.2.1/N.3.2, cf. « inchangé »), `SET_EDITOR_CAP` (change
    l'interprétation des barres — conservative), `HYDRATE_EDITOR_FROM_PATCH` (flag
    non persisté → phase inconnue au rechargement ; la branche patch null hérite
    `true` = silence),
    `APPLY_EDITOR_PRESET('square'|'sawtooth'|'triangle')` (formes stepped, phase
    non-canonique au sens DFT — la refonte presets en séries de Fourier, backlog,
    basculera les 4 à `true`).
  - **inchangé** : `SET_SPLINE_INTERPOLATION` (N.2.1), `ADD`/`REMOVE_SPLINE_ANCHOR`
    (N.3.2) — ces trois changent la *représentation*, pas la canonical (cf.
    principe « représentation vs forme ») ; `SET_EDITOR_ANCHOR_COUNT` (re-fit
    ancres + résidu mais NE touche pas canonical), `SET_EDITOR_CURRENT_LENS`,
    `SET_EDITOR_AMPLITUDE`, `SET_EDITOR_ADSR`, etc. (le spread `...state.editor`
    préserve la valeur).
- **`DEFAULT_EDITOR.canonical` = silence (canonical à zéro)**. La passe d'usage
  M.r.2.5 a annulé la sin fondamentale de M.r.2.2 (décision utilisateur : ne pas
  imposer un timbre arbitraire) — `DEFAULT_EDITOR.canonical` et
  `RESET_EDITOR_WAVEFORM` repartent du silence. `RESET_EDITOR` en hérite.
- **Pas de chemin utilisateur vers la lentille 'bars' (M.r.2.4)** : les barres
  d'harmoniques s'éditent directement (zone Harmoniques toujours éditable), le
  switch Forme d'onde ne bascule qu'entre 'free' et 'spline'. `cap` a un contrôle
  unique (header Harmoniques) ; les alias `editorActions.setN`/`setDefinition`
  sont supprimés (seul `setCap`).
- **IDs via compteurs persistés** (`soundCounter`, `clipCounter`,
  `folderCounter`, `trackCounter`) : jamais les recalculer depuis `.length`.
  Après des suppressions, deux créations successives auraient le même
  ID → collisions silencieuses.
- **Snapshots historique : mouseup pour gestes continus, dispatch direct
  pour contrôles discrets**. Un dropdown / un toggle / un clic preset
  dispatche directement (1 action = 1 snapshot). Un drag / un dessin /
  un slider utilise un draft local puis un dispatch unique au relâchement.
- **Non persisté dans localStorage** : `zoomH`, `zoomV` (par track),
  `selectedClipIds`, l'éditeur (drafts + state complet), l'historique
  undo/redo, `currentSoundId`, `composerFlash`. Au reload on retombe
  sur un état "propre" côté UI, seules les données métier survivent.
- **Lanes = affichage, pas de champ Clip** : le lane assignment est un
  calcul greedy au rendu (O(n) à chaque render de Timeline), jamais
  stocké dans le type Clip. Ne pas ajouter de champ `lane` au modèle.

## État actuel

🚧 **En cours — Iteration T « Effets sans mémoire »** (cadrée 2026-06-10). Tour
complet des effets qui s'intègrent au cycle de vie audio actuel (chaîne jetable par
note, zéro queue) avant le chantier des effets à mémoire. Phases : **T.1** refonte
module « Effets » + switcher header (UI pure) → **T.2** auto-pan (`StereoPannerNode`,
bump `.osa` v4) → **T.3** pitch envelope → **T.4** filtre statique (`BiquadFilterNode`
par voix) → **T.5** enveloppe de filtre + wah → **T.6** distorsion (`WaveShaperNode`
par voix). Cadrage complet dans `archi/BACKLOG.md` (« Effets et modulations »).
- ✅ **T.1 (socle UI pur)** — le 6ᵉ module **Modulation → « Effets »** (label seul,
  id `'modulation'` inchangé, aucune migration). Corps **un effet à la fois** pleine
  largeur (l'autre sous-bloc monté/masqué, repeint au switch ; rAF sur le seul graphe
  visible). Barre de titre = **boutons toggle** par effet (`OverflowToolbar`,
  `buildEffectsHeaderItems` partagé desktop/mobile) : **highlight** = en édition,
  **pastille accent** = activé (indicateur pur), clic = édition seule ; **badge
  agrégé** sur le tiroir `⋯` (nouvelle prop opt-in `triggerBadge` d'`OverflowToolbar`).
  Nouvel état UI **`designerEffectsSelected`** (persisté, hors undo) +
  `SET_DESIGNER_EFFECTS_SELECTED`. **Aucun changement audio / modèle / `.osa`.**
- ✅ **T.2 (auto-pan, `.osa` v4)** — 1ᵉʳ effet **stéréo**. `Patch`/`Editor` += **`autoPan:
  Lfo`** (`DEFAULT_AUTOPAN` rate:1 depth:0.5 ; depth 0..1 = excursion symétrique G↔D).
  Audio : `applyModulation` += params `panner`/`autoPan` → branche LFO sur `panner.pan` ;
  l'**appelant** insère un `StereoPannerNode` **seulement si `enabled && depth>0`**
  (sinon chaîne mono bit-identique) sur les **4 chemins** ; cleanup via le tableau `mod`,
  signature scheduler += autoPan. UI : 3ᵉ bouton **« Auto-pan »** + panneau identique
  (graphe LFO à **étiquettes G/D**, D haut / G bas = signe de `pan`). **`.osa`
  `OSA_VERSION = 4`** (accepte v1→v4, `autoPan` absent → défaut injecté) — **seul bump
  de l'itération T** (T.3→T.6 ajouteront leurs champs dans v4). `sanitizeAutoPan`,
  `AUTOPAN_DEPTH_MAX`, `autoPanCanvasRef`.
- ✅ **T.3 (pitch envelope)** — 1ʳᵉ modulation **non-LFO**. `Patch`/`Editor` += **`pitchEnv`**
  (type frère : `{enabled, amount cents signé ±2400, time ms 40..2000}` ; `DEFAULT_PITCHENV`
  false/1200/150). Audio : `applyModulation` += `pitchEnv` → **automation de la valeur de
  base d'`osc.detune`** (`setValueAtTime(amount)` → `linearRampToValueAtTime(0, time)`),
  **aucun nœud**, guard `amount≠0 && time>0` (sinon chaîne identique) ; **coexistence
  vibrato par construction** (somme base automatisée + branche entrante) ; 4 chemins +
  signature scheduler. UI : 4ᵉ bouton **« Hauteur »** + panneau « Enveloppe de hauteur »
  (2 inputs départ/durée, **pas de switch de forme**, graphe d'enveloppe à 2 poignées
  Départ/Arrivée, **sans animation**). **Pas de bump `.osa`** (v4 inchangé,
  `isPitchEnvValidOrAbsent`, absent → défaut). `sanitizePitchEnv`, `PITCHENV_AMOUNT_MAX/
  TIME_MIN/MAX`, `drawPitchEnvGraph` (axe x **racine carrée**, plancher 40 ms),
  `pitchEnvCanvasRef`.
- ✅ **T.3bis / T.3.4 (pitch envelope — mode Inverser)** — `pitchEnv += invert:boolean`
  (défaut false). Audio : miroir de l'automation (`0 → amount` au lieu de `amount → 0`),
  la note **reste** décalée de `amount` (l'`AudioParam` tient sa dernière valeur —
  sirène/bend, **assumé**). UI : toggle **« Inverser »** (`FlipVertical2`) dans le head ;
  **graphe miroir** (part de la médiane → s'éloigne vers `amount` → plateau) ; poignée
  verticale **à droite sur le plateau** en inversé ; tooltips/label **Cible/Durée**. Signature scheduler
  += invert. Pas de bump (`invert` absent → false).
- ✅ **T.3ter / T.3.5 (pitch envelope — 4 formes de progression)** — `pitchEnv +=
  curve:'linear'|'easeOut'|'expo'|'easeIn'` (défaut `'linear'`). Progression normalisée
  `p(t)∈[0,1]` **orthogonale à `invert`** : valeur = `départ + (arrivée−départ)·p(t)`.
  Audio (`modulation.js`) : `pitchProgression(curve, t)` partagée ; `linear` = chemin
  historique (linearRamp), formes non linéaires = **un seul** `setValueCurveAtTime` (64 pts)
  — **PAS `exponentialRampToValueAtTime`** (ne traverse pas zéro). 4 chemins, signature
  scheduler += curve. UI : **switch segmenté 4 positions** (idiome LFO, `PITCH_CURVE_META`,
  glyphes SVG `IconCurve*`, libellés `STRINGS.pitchCurves` Linéaire/Décélérée/Exponentielle/
  Accélérée) groupé à droite du head avec Inverser ; le graphe applique la **vraie** `p(t)`
  (même fonction que l'audio). Pas de bump (`curve` absent → `'linear'`). `PITCHENV_CURVES`.
- ✅ **T.4 (filtre statique)** — 1ᵉʳ `BiquadFilterNode` dans la chaîne de voix + 1ᵉʳ
  **graphe fréquentiel** du module Effets. `Patch`/`Editor` += **`filter` `{enabled,
  type:'lowpass'|'highpass'|'bandpass'|'notch', cutoff Hz 20..20000, q linéaire 0.1..20}`**
  (`DEFAULT_FILTER` false/lowpass/2000/1). Audio (`lib/filter.js`) : insertion
  conditionnelle **VCO→VCF→VCA** — `osc → biquad → gain` **seulement si `enabled`**
  (sinon chaîne bit-identique), 4 chemins, cleanup via le tableau `mod` (comme le panner),
  signature scheduler += filtre. **Piège d'unité `Q`** : `biquadQValue` convertit le `q`
  linéaire du modèle → **dB** pour LP/HP (`20·log10(q)`), **linéaire** pour BP/notch ;
  `configureBiquad` partagé par l'audio ET le graphe. UI : 5ᵉ bouton **« Filtre »** +
  panneau (interrupteur + switch segmenté 4 types `IconFilter*`/`STRINGS.filterTypes` + 2
  `NumberInput` Fréquence à **steppers multiplicatifs** / Résonance). **Graphe de réponse
  en fréquence** (`drawFilterGraph` : X log 20 Hz–20 kHz repères 100/1k/10k, Y dB −30..+30,
  0 dB accentué, ~128 pts via `getFrequencyResponse` sur un **biquad de mesure** jamais
  connecté, **même mapping Q** → colle au son) à **poignée 2D unique** au cutoff (horizontal
  log → cutoff, vertical log → q ; **draft + commit atomique `SET_EDITOR_FILTER_POINT`**,
  un undo/geste ; **aucune animation**, branche statique de la boucle rAF). `NumberInput`
  += prop opt-in `stepFactor`/`shiftFactor` (chevron ×/÷, 2^(1/12) demi-ton, Shift octave).
  Pas de bump `.osa` (v4 inchangé, `isFilterValidOrAbsent`, absent → défaut). `sanitizeFilter`,
  `FILTER_CUTOFF/Q/TYPES`, `filterCanvasRef`.
- ✅ **T.5 (enveloppe de filtre + wah)** — le filtre statique gagne ses 2 modulations
  classiques. **Clé archi** : `BiquadFilterNode` a un **`detune` en cents**, comme l'osc →
  l'env de filtre **réutilise le pitch env** et le wah **réutilise le vibrato**, appliqués à
  `biquad.detune` (composent par construction comme pitch env + vibrato sur osc.detune). Modèle :
  `PitchEnv` **généralisé en `ParamEnv`** (type partagé, simple renommage) ; `Patch`/`Editor` +=
  **`filterEnv: ParamEnv`** (amount ±4800 cents, time 0..2000) + **`wah: Lfo`** (depth cents 0..3600).
  `DEFAULT_FILTERENV` false/2400/200, `DEFAULT_WAH` false/2/1200. Audio : extraction de
  **`scheduleParamEnv(param, env, startTime)`** (helper partagé osc.detune + biquad.detune, 1 seule
  implémentation des 4 formes) ; `applyModulation` += `biquad`/`filterEnv`/`wah` ; wah = branche LFO
  sur `biquad.detune` ; **no-op si pas de biquad** (filtre off) ; 4 chemins + signature scheduler.
  Cutoff effectif clampé [0, Nyquist] par la spec → sweeps extrêmes sûrs. UI : 2 boutons header
  **« Env. filtre »**/**« Wah »** (7 boutons, OverflowToolbar absorbe), panneaux clones (graphe
  d'enveloppe/LFO généralisés par bornes `PARAM_ENV_BOUNDS` ; `renderParamEnvBlock(effect)`) +
  **hint « filtre désactivé — cet effet est muet »** + bouton inline « Activer le filtre »
  (undoable). Pas de bump `.osa` (v4 inchangé, `isParamEnvValidOrAbsent(v, amountMax)`, absent →
  défaut). Au passage : **fix `UPDATE_PATCH` persiste enfin `filter`** (oubli T.4). `sanitizeFilterEnv`/
  `sanitizeWah`, `FILTERENV_*`/`WAH_DEPTH_MAX`, `filterEnvCanvasRef`/`wahCanvasRef`.
- ✅ **T.6 (distorsion — dernière phase, v4 inchangé)** : **`WaveShaperNode` 4x par voix**,
  waveshaping par voix (pas d'intermodulation entre notes — la variante « somme par patch »
  appartient au futur chantier des nœuds persistants). `Patch`/`Editor` += **`distortion {enabled,
  curve 'soft'|'hard'|'fold', drive 1..50, mix 0..1}`** (`DEFAULT_DISTORTION` false/soft/5/1).
  Audio (`lib/distortion.js`) : `distortionTransfer` (soft `tanh(kx)/tanh(k)` / hard `clamp(kx)` /
  fold `sin(kx·π/2)`, **normalisées ±1→±1**) + `distortionCurveTable` (mémo dernière (curve,drive),
  table 2048 pts) + `configureShaper` (**oversample 4x** anti-alias) + `connectDistortion`
  (helper de câblage : split wet/dry `osc → shaper → wetGain` + `osc → dryGain`, sommés). **Position
  AVANT le filtre** : `osc → shaper → biquad → gain → [panner]` (logique soustractive — on enrichit
  le spectre, le filtre/l'env de filtre/le wah le sculptent). Insertion conditionnelle (`enabled &&
  mix>0`, sinon bit-identique), 4 chemins (filtre découplé `biquad→gain`) + signature scheduler
  (`sigOfDistortion`), cleanup via `mod`. UI : 8ᵉ bouton **« Disto »** + panneau (switch 3 courbes
  `IconDistort*` + steppers Drive/Mix) + **graphe de la courbe de transfert** (`drawDistortionGraph` :
  x∈[−1,1]→y∈[−1,1], diagonale identité pointillée, **curseur Drive** vertical log, statique) —
  drag vertical → drive (draftMod mono-clé). Pas de bump (`isDistortionValidOrAbsent`, absent →
  défaut). `sanitizeDistortion`, `DISTORTION_DRIVE_MIN/MAX`/`DISTORTION_CURVES`, `distortionCanvasRef`.
  **Itération T complète (8 effets sans mémoire), en attente de clôture/release.**

✅ **Terminé**
- **Iteration S — « Support tactile au doigt (web pur) » (close, v1.11.0)**. L'app
  se **dessine et se joue au doigt** ; un **durcissement audio** a émergé en cours de
  route. Détail par-phase S.1→S.audio.5 + arc audio dans `CONTEXT-ARCHIVE.md`.
  Symboles nouveaux : `createMasterBus`, `normalizePeak`, `MASTER_HEADROOM`,
  `MIN_RELEASE`, `EXPORT_PEAK_TARGET`, `public/manifest.webmanifest`.
  - **Entrée Pointer Events unique** (souris+tactile+stylet, **pas de détection
    mobile**) sur **toutes** les surfaces de manipulation directe : canvas Forme
    d'onde Libre, `SplineEditor` (ancres), barres Harmoniques, poignées AHDSR/LFO,
    bouton Test, resizers (`SidebarResizer`/`PopupResizer`), séparateurs
    `DesignerColumns`, **Timeline** (clips drag/resize/scrub). `setPointerCapture`
    au down (le geste survit à la sortie de l'élément) + `onPointerCancel` partout.
    `touch-action:none` **ciblé** sur les surfaces migrées, **pas** sur les
    conteneurs scrollables ; **Timeline** en `pan-x pan-y` (scroll préservé).
  - **Clavier polyphonique** (`usePointerKeyHandler` : `Map<pointerId,idx>` +
    ref-count) sur les 5 layouts — plusieurs doigts = accord ; moteur audio déjà
    polyphonique, migration couche d'entrée pure. **Garde mono-pointeur** « premier
    pointeur gagne » sur les surfaces **mono-valeur** (canvas/barres/ancres : deux
    doigts ne tracent plus deux fois). **Lasso = souris-seule** (conflit scroll/
    sélection sur zone vide, assumé) ; reorder de piste idem.
  - **Shell non-scrollable** : `html/body{overflow:hidden;overscroll-behavior:none}`,
    `#root` hauteur fixe, `100dvh` stable → fin du pull-to-refresh / bascule barre
    d'URL / reflow canvas ; verrou sur le **scroll de page seul** (modales, listes,
    Documentation gardent leur `overflow-y`). Safe-area `viewport-fit=cover` +
    `env(safe-area-inset-top)`. **PWA légère** standalone : `manifest.webmanifest`
    SVG-only + métas iOS/theme-color. **Dette** : icônes PNG apple-touch/maskable
    (pas de rasteriseur, zéro dépendance — décision archi, backlog) ; service worker
    non posé (surface minimale).
  - **Audio (arc S.audio.2→5)** : `MASTER_HEADROOM` **bas** (~0.1) → la polyphonie
    dense (~12 notes) reste **propre par défaut**, la **loudness se récupère au
    volume appareil** en live ; **soft-clip `WaveShaper`** memory-less en **filet**
    (knee 0.9, `oversample 4x`) — remplace l'ex-`DynamicsCompressor` qui **pompait**
    sur les accords battants ; **analyser en amont** du bus → spectrogramme honnête.
    Déclic : planchers `MIN_RELEASE`/`MIN_ATTACK` (+ fade au stop). Anti-underrun
    mobile : `latencyHint` numérique (buffer élargi). **Export `normalizePeak`**
    (~ -1 dBFS, `EXPORT_PEAK_TARGET`) avant l'encodage WAV → fichier fort & propre
    sans distorsion. `createMasterBus` **partagé** preview/lecture/export ; master
    **fixe** (pas d'UI). **Live ≠ export sur le NIVEAU, volontairement.**
- **Iteration R — « Refonte petit écran du Designer » (close, v1.10.0)**. État
  présent du Designer **sous le plancher accordéon** après l'itération (détail
  par-phase R.1→R.3.rectif dans `CONTEXT-ARCHIVE.md`). Composants impactés :
  `TooSmallGate`, `Tabs` (variante compacte) ; champ persisté nouveau
  **`designerMobileModule`** ; nouvelle prop **`closeOnSelect`** sur `OverflowToolbar`.
  - **Plancher de résolution** = `TooSmallGate`, **orientation-aware 300/500**
    (`min(w,h) ≥ 300` ET `max(w,h) ≥ 500` → 300×500 portrait ET 500×300 paysage
    passent). Sous ~700, l'**UX tactile fine** (dessin au doigt, poignées) reste une
    **limitation assumée** — à la souris (fenêtre desktop rétrécie) c'est le cas
    d'usage visé ; le confort tactile est renvoyé à l'**itération S**.
  - **Designer < 924×668** = **switcher de modules** : un seul module **plein cadre**
    (`designerMobileModule` persisté, ∈ les 6 ids, défaut `'canvas'` ; les 6 corps
    restent **montés en permanence** — contrainte canvas/RO, masqués en `display:none`).
    Les **contrôles de header du module actif** sont **relogés** dans la
    `DesignerToolbar` (2ᵉ `OverflowToolbar`, trop-plein → `…`). Toolbar **wrappable**
    (`flex-wrap`) : patch / Presets / Effacer / switcher **jamais masqués** (passent à
    la ligne), nom du patch en ellipsis.
  - **Top header < 924×668** = **priority-plus + hamburger** (`Menu`) : titre
    tronquable à gauche, onglets + auxiliaires dans un `OverflowToolbar`, trop-plein
    dans le tiroir ; version d'app **inline → tiroir** (jamais perdue) ; barre
    **amincie** (~28px) ; **`closeOnSelect`** = le tiroir se ferme à la sélection.
  - **Densification CSS < 700×500** (paddings/textes resserrés, modales capées au
    viewport) ; **marge gauche du layout mobile = 0** ; module **Instrument mobile
    aligné sur l'intermédiaire desktop** (système `[⚙]` + octave stepper `▴▾` dans le
    header, corps sans bouton full-width ni rangée d'octaves) ; **« Égaliser » masqué**
    en intermédiaire 924–1100 (inutile sous auto-réduction forcée) ; fix débordement
    du module **Modulation** à hauteur de viewport rare (graphes LFO rabotés).
  - **Desktop ≥ 924×668 strictement inchangé.**
- **Iteration P — « Effets & modulations : vibrato & trémolo (LFO par patch) »
  (close, v1.8.0)**. Première itération de la section « Effets et modulations ».
  Détail par phase P.1→P.4 dans `CONTEXT-ARCHIVE.md`.
  - **P.1 — Fondation typée** : type `Lfo` symétrique vibrato/trémolo
    (enabled/rate/depth/onset/shape), `Patch`/`Editor` += vibrato/tremolo,
    constantes + défauts + bornes (clampées partout), action paramétrée unique
    `SET_EDITOR_MODULATION` (undoable), hydratation/payload/dirty check/reset,
    migration localStorage + `.osa` `OSA_VERSION 3` (accepte v1/v2/v3).
  - **P.2 — Helper audio + 4 chemins** : `lib/modulation.js` (`applyModulation`)
    branché sur lecture timeline, export WAV, preview clavier, preview note libre
    (helper partagé = pas de divergence one/all) ; vibrato → `osc.detune` (cents),
    trémolo → `gain.gain` (sommé) ; onset + extinction propre au release ; cleanup
    symétrique des nœuds LFO partout où l'`osc` est stoppé.
  - **P.3 — 6ᵉ module Designer « Modulation »** : rangée du bas à 3 cellules,
    persistance `designerCollapsed.modulation` ; 2 sous-blocs (interrupteur,
    switch de forme en icônes, 3 steppers) + mini-courbe LFO animée gatée (1 rAF
    par module, pause au repli/maximize, audit perf N.1).
  - **P.4 — Re-schedule live + clôture** : `sigOf` étendu (vibrato/trémolo) →
    édition live audible pendant la lecture ; bump v1.8.0.
- **Iteration O — « Ergonomie & responsive du Designer » (close, v1.7.0)**. État
  présent du Designer après l'itération (détail par phase O.1→O.6 dans
  `CONTEXT-ARCHIVE.md`). Tout est scopé Designer, calibré jusqu'au plancher
  accordéon (924×668) ; sous ce seuil, l'accordéon mobile n'a pas été retravaillé
  (différé, cf. backlog). Composants nouveaux : `OverflowToolbar`, `DesignerModule`,
  `ModuleChrome`, `lib/designerModules.js`. Champs persistés nouveaux : `adsrView`,
  `designerCollapsed`, `maximized`, `autoCollapse`.
  - **Steppers `▴▾` (O.1)** : les deux **sliders range** du Designer (nombre
    d'ancres `4..32`, plafond d'harmoniques `1..256`) sont remplacés par des
    **steppers** = saisie libre du `NumberInput` + colonne de **chevrons `▴▾`**
    (Lucide). Clic = `±1`, `Shift+clic` = `±10`, **appui maintenu** = cran immédiat
    puis auto-répétition accélérée (récupère le « scrub live » de l'ancien slider
    du cap), clavier `↑↓`/`Shift+↑↓` au focus. Extension **opt-in** de `NumberInput`
    (`showSteppers`/`step`/`shiftStep`, terrain prêt pour ADSR/ampli/fréquence, non
    activé). Livre l'item backlog **« flèches ↑↓ dans NumberInput »**.
  - **`OverflowToolbar` priority-plus (O.2, généralisé O.6.2)** : composant
    générique réutilisable qui affiche un maximum de contrôles en ligne et pousse
    le débordement dans un **tiroir `⋯`** (popover de lignes libellées). Mesure par
    *ghost row* + `ResizeObserver` (root + ghost), anti-boucle (root rempli par le
    flex parent → largeur observée indépendante du contenu), repli droite→gauche,
    focus/Esc/clic-dehors alignés sur `BibContextMenu`, état des contrôles dans le
    parent (on ne fait que relocaliser le rendu, au resize). Branché sur **les 5
    headers de module** (Forme d'onde, Harmoniques, Instrument, AHDSR, Spectro) +
    le **groupe droit de la `DesignerToolbar`** (séparateur en `prefix`). L'icône
    + le titre du module restent **hors** de l'OverflowToolbar (`we-header-left`).
  - **Quadrant Instrument responsive (O.3, desktop only)** : dégradation à
    **2 étages** (seuils `width OU height`, au-dessus du plancher accordéon) qui
    libère des lignes pour le clavier. Étage 1 (`instrumentCollapsed`) : contrôles
    système → icône `[⚙]` dans le header (modale inchangée). Étage 2
    (`octaveInHeader`, ⟹ étage 1) : les 11 boutons d'octave → **stepper `▴▾`** dans
    le header. `data-anchor="designer-octave-selector"` suit le contrôle. **Mobile
    (accordéon < 924×668) strictement inchangé**.
  - **AHDSR compact (O.4)** : la zone est observée (`ResizeObserver` sur
    `.we-adsr-area`, mesure de la **zone** — pas `windowWidth` — donc
    layout-agnostique : desktop, accordéon, collapse). Sous `ADSR_COMPACT_*`, un
    **switch segmenté Graphe/Sliders** dans le header n'affiche **qu'une vue à la
    fois** ; la vue Sliders seule passe en **grille 2 colonnes**. `adsrView:
    'graph'|'sliders'` persisté (défaut `graph`, non-undoable). Canvas **jamais
    démonté** (`display:none` + redraw forcé au retour Graphe).
  - **Gestionnaire de modules (O.5a→d)** : les 5 modules Designer sont enveloppés
    dans `DesignerModule` + `ModuleChrome`. **Collapse** en bande verticale (icône
    en tête + titre en rotation, `designerCollapsed`, libère l'espace via flexGrow
    normalisé). **Maximize** plein-cadre Designer (`maximized`, autres modules
    masqués en CSS via `:has()`). **Chrome détachée** en coin haut-droit (boutons
    nus Réduire/Agrandir-Restaurer, icônes contrôles-fenêtre SVG) — hors
    OverflowToolbar. **Identité** par module (`MODULE_META` : icône Lucide + label,
    source unique). **Auto-réduction par rangée** (`autoCollapse` + toggle dans la
    DesignerToolbar, forcée en écran étroit) — **coexiste avec l'AUTO** du
    dimensionnement (auto-collapse = à l'ouverture ; AUTO = au focus). Canvas
    **jamais démonté** (collapse/maximize = CSS pur ; sinon canvas vide). Les
    `ResizeObserver` des canvas / de la zone AHDSR sont posés via **callback ref**
    (anti-orphelin : la render-prop remonte les nodes sans démonter `WaveformEditor`).
  - **Titres en ellipsis progressive (O.6.1)** : quand un header se resserre, le
    titre se tronque (« … »), l'icône d'identité reste ; repli ultime = **icône
    seule**.
- **Iteration N — « Stabilité & fluidité » (close, v1.6.0)**. État présent du
  Designer après l'itération (détail par phase N.1→N.6 dans `CONTEXT-ARCHIVE.md`) :
  - **Édition d'ancres refondue — principe « représentation vs forme »** : les
    actions de *représentation* (re-fit du nombre d'ancres, ADD/REMOVE, bascule
    Doux/Anguleux) laissent la canonical **strictement inchangée** — le résidu
    est recalculé contre la nouvelle spline, une ancre ajoutée snappe sur le
    tracé (`y=canonical[x]`, hauteur du clic ignorée). Seul le drag d'ancre
    change la *forme*, via un **warp 2D horizontal du résidu à support local**
    (le détail dessiné « ride » sur la tendance portée par la spline ; pré-image
    smoothstep C¹ en Doux / PL en Anguleux, garde anti-repli). `fitAnchorsToCurve`
    pose les ancres par **Douglas-Peucker à compte fixe** (sur les transitions,
    plus à l'équiréparti). Réf figée au début du drag, 1 commit = 1 undo.
  - **Presets « Timbres »** : la modale `PresetPicker` est le **point d'entrée
    unique** des sons pré-fabriqués (la barre des 4 presets géométriques du mode
    Libre est retirée). 4 sections — Formes de base (2 vues **idéale /
    band-limitée** + N éditable), Formes **paramétriques** (escalier, scie à
    étages, sinus décroissante, pulse, trapèze, demi-sinus, impulsion : params de
    forme + N + 2 vignettes, redraw live), Timbres conçus, Inattendus. Moteur pur
    `lib/waveforms.js` (`idealWaveform`/`bandlimitWaveform`, DFT directe sur 600,
    phase naturelle, normalisée). Chargement unifié `LOAD_PRESET`, **en place**
    (conserve `currentPatchId`, marque dirty), **sans confirmation** (undo = filet).
  - **Lissage du tracé** : deux boutons undoables/répétables dans le header Forme
    d'onde, gardés tous deux (fonctions distinctes et complémentaires) — passe-bas
    Gaussien périodique (`Waves` → `SMOOTH_EDITOR_CANONICAL`) et lerp vers la
    spline des ancres (`ChartSpline` → `TEND_TOWARD_SPLINE`, répété → résidu→0).
  - **Durcissements** : `// @ts-check` opt-in sur `src/reducer.js` (checkJs:false
    global) — 4 erreurs réelles corrigées sans `@ts-ignore` ; auto-sizing intégré
    au **groupe radio de dimensionnement** (5ᵉ bouton AUTO + 4 presets de
    proportions, actif dérivé, coloration = toggles radio du Spectrogramme).
  - **Perf** : régression de latence de drag (depuis M.r.5) corrigée à la cause —
    seuil `HARMONIC_EPSILON = 1e-4` anti-leakage sur l'iDFT harmonique (7,6× à
    cap=256, transparent) + quick wins sans regret (cache `themeColor` /
    `PeriodicWave`, arrondi du payload localStorage à 1e-4 → −63 %). Les refactors
    React Groupe B/C restent **gelés** jusqu'au verdict du profilage prod.
- Iteration M — phase M.3 (mode points/spline, 2026-05-30). 3ᵉ mode de
  fabrication de timbre, propre par construction. 3 sous-commits :
  - **3.1** `SplinePatch` (`mode:'spline'`, `anchors` 4..32, `interpolation`
    'soft'|'hard', **pas de `definition`**) ajouté à l'union ; `src/lib/spline.js`
    (`splineSoft` Catmull-Rom périodique via Hermite y(x) à voisins wrappés ±600,
    continuité C¹ à x=600↔0 ; `splineHard` polyligne périodique ; sortie
    `Float32Array(600)` clampée) ; reducer : `MOVE`/`ADD`/`REMOVE_SPLINE_ANCHOR`
    + `SET_SPLINE_INTERPOLATION` (undoable, draft commit côté éditeur),
    `sanitizeAnchors`, hydratation forward-compat localStorage. `points` =
    reconstruction (ombre), chaîne audio inchangée.
  - **3.2** `SplineEditor.jsx` (canvas courbe + poignées draggables façon ADSR,
    clic = ajout, Suppr/clic droit = retrait, toggle Doux/Anguleux) ; dispatch
    dans `WaveformEditor.renderCanvasArea` ; couplage Harmoniques read-only
    montrant la DFT **pleine** (pas de `definition` en spline) + 🔒.
  - **3.3** Passerelle étendue : `ConvertToSplineDialog` (N ancres défaut 8 +
    interpolation, réutilisé draw→spline et harmonic→spline), spline→draw
    (`ConfirmDialog`, `CONVERT_EDITOR_TO_DRAW` rendu mode-agnostique sur
    `editor.points`), spline→harmonic (`ConvertToHarmonicDialog`, DFT). 2 boutons
    par mode actif, conversions atomiques, snap proportions (spline = ½¼¼).
    osaFormat + libraryTransfer round-trip `.osa` du mode spline.
  - **Hors scope** : presets de formes spline → M.4 ; auto-fit depuis un tracé →
    backlog ; B-spline/Bézier → non retenu (Catmull-Rom + polyligne).
- Iteration M — phase M.2-AS (auto-sizing, livré en essai 2026-05-30 ;
  gardé en iter-N N.6.2 sous forme de bouton AUTO d'un groupe radio ;
  **finalement RETIRÉ en iter-Q** — impraticable, cf. `CONTEXT-ARCHIVE.md`
  « Itération terminée : Q »). Opt-in, OFF
  par défaut, posé **par-dessus** l'état de proportions de M.2 (il l'écrit ;
  aucun nouvel état canonique). 3 sous-commits :
  - **AS.1** Champ `autoSizing: boolean` (initial `false`, persisté localStorage,
    action `SET_AUTO_SIZING` non undoable) + toggle « Dimension auto » dans la
    barre des presets. OFF → comportement M.2 strictement inchangé.
  - **AS.2** Focus contextuel : listener `mousedown` (capture) attaché
    uniquement quand ON. 3 états stables — focus Forme d'onde `[0.6,0.2,0.2]`,
    Harmoniques `[0.2,0.6,0.2]`, Spectro/repos `[0.2,0.2,0.6]` (le repos *est*
    le focus-spectro, pas de 4ᵉ état). Focus **volatile** (ref, non persisté) :
    activation/ouverture/sortie = repos. Clic hors widget → repos ; clics sur
    la barre presets/toggle neutres (préserve le « figer en basculant OFF »).
  - **AS.3** Anti-conflit (quand ON) : (1) séparateur = cible indépendante, son
    drag écrit comme en manuel, le prochain changement de focus l'écrase (pas
    de pinning en auto) ; (2) le clic qui *change* le focus ne fait que focuser
    — guard (ref partagé `DesignerColumns`→`WaveformEditor`) levé le temps du
    geste, canvas/barres s'abstiennent, l'édition reprend au geste suivant ;
    (3) sortie → repos. **N.6.2** : en plus, un drag manuel de séparateur coupe
    désormais l'auto-sizing (`onManualResize` → `setAutoSizing(false)`) au lieu
    d'attendre le prochain focus. **iter-Q : retrait effectif** — bouton AUTO,
    `useEffect` de focus, champ persisté et 4 presets supprimés (les proportions
    se font au drag des séparateurs + bouton « Égaliser » deux rangées).
- Iteration M — phase M.2 (layout 3-vues + Patch typé + éditeur Harmoniques +
  passerelle, 2026-05-30). 5 sous-commits :
  - **2.1** Patch typé : union discriminée `Patch = DrawPatch | HarmonicPatch`
    par `mode`. `audio.harmonicsToPoints` (iDFT) reconstruit `points` pour un
    patch harmonique → toute la chaîne audio (playback/export/miniatures) reste
    mono-chemin sur `points`, zéro modif. Hydratation rétro-compat (mode absent
    → 'draw'), SAVE/UPDATE/HYDRATE/RESET mode-aware, round-trip `.osa`.
  - **2.2** Layout 3 colonnes (`DesignerColumns`) Forme d'onde / Harmoniques /
    Spectro : presets + séparateurs glissables, `designerColumnWidths` persisté
    (défaut par mode). Spectro = colonne permanente (toggle « Spectro » retiré,
    `spectrogramVisible` vestigial).
  - **2.3** Éditeur Harmoniques : N barres bleues éditables (drag vertical,
    1 barre/geste, bouton N 16..256) ; en mode dessin, read-only = magnitudes
    DFT tronquées à `definition` (🔒).
  - **2.4** Vue éditable suit le mode (l'autre → read-only 🔒) ; Forme d'onde
    read-only en harmonic (reconstruction iDFT) ; slider Définition masqué.
  - **2.5** Passerelle : « Convertir en Harmoniques » (dialog choix N, DFT +
    troncature) / « Convertir en Dessin » (iDFT) — conversions atomiques
    undoables. **Follow-up** : la conversion snappe `designerColumnWidths` au
    défaut du mode cible (la vue éditable récupère sa largeur de référence).
  - **Hors scope traité ailleurs** : toggle auto-sizing → M.2-AS (séparée) ;
    mode spline → M.3 ; presets → M.4 ; doc/renderer `\sum` → M.5.
- Iteration M — phase M.1 (bump cap 256 + slider Définition, 2026-05-30).
  SC1 : `NUM_SAMPLES` 256→512, cap harmoniques 128→256 (rééchantillonnage
  600→512, même troncature miroir-conjugué). Les basses récupèrent jusqu'à
  ~128 harmoniques audibles ; au-dessus de ~156 Hz, aucun changement. Stade
  dev → pas de migration localStorage. SC2 : champ `Patch.definition`
  (1..256, défaut 256) + slider « Définition » dans la colonne de paramètres
  du Designer (readout « N / 256 »), troncature M/256 appliquée en aval dans
  `pointsToPeriodicWave` (preview live, lecture Composer, export WAV) ; le
  spectro statique reflète le couperet. `editor.definition` +
  `SET_EDITOR_DEFINITION` (undoable designer), mirroré au save, hydraté depuis
  le patch ; rétro-compat localStorage + imports `.osa` → 256 injecté.
  Reste mono-mode (le typage `draw`/`spline`/`harmonic` vient en M.2).
- Iteration M — préalable B (francisation des libellés, 2026-05-29). Graine
  i18n via `src/lib/strings.js` (clés sémantiques → FR, sans lib i18n). SC1 :
  audit (`archi/M0-audit-francisation.md`) + centralisation (refactor neutre,
  composants consommant les clés). SC2 : traductions claires — onglets
  Designer→Création / Composer→Composition (+ toutes leurs références),
  Forme d'onde, presets, étapes AHDSR (Attaque/Tenue/Déclin/Maintien/
  Relâchement), Mute→Sourdine, root→Racine. Cas « à arbitrer » tranchés par
  l'archi (2026-05-29, révision AHDSR le 2026-05-30) : Play/Stop→Lire/Arrêter,
  Export…→Exporter…, Test→Tester, Peak→Crête, Live→Direct, Canvas vide→Zone de
  dessin vide, Hold→Tenue, Sustain (+ pédale Espace)→Maintien ; conservés :
  Spectro, Solo, OK.
- Iteration M — préalable A (migration TypeScript, phases 0+1, 2026-05-29).
  Adoption TS **incrémentale** posée avant la perf et avant M.2 (Patch typé) :
  devDep `typescript` + `tsconfig.json` (allowJs/noEmit/strict:false) ;
  `src/types.ts` (modèle actuel typé — Patch/Clip/Track/TuningSystem/AppState +
  union discriminée `Action`) ; `tuningSystems.js → .ts` (registre central) ;
  câblage JSDoc des types sur le reducer. Zéro changement runtime (bundle vite
  byte-identique, lint vert, `tsc --noEmit` clean).
- Iteration L phase 5 (corpus utilisateur) + clôture — **release v1.4.0,
  Itération L close** : documentation complète rédigée par l'agent writer.
  Corpus : 2 glossaires (technique, musical), 4 articles de vulgarisation
  (« Comprendre » : forme d'onde, piano pas juste, 12 notes, tempérament),
  12 fiches tempéraments (une par système du registre), 3 guides de prise en
  main (Designer, Bibliothèque, Composer), article « Limites connues »
  (périmètre V1 assumé). TOC à 6 sections (Le projet / Prise en main /
  Comprendre / Concepts / Tempéraments / Référence). Clôture : rebranchement
  des DocLink, retrait de `_renderer-test.md`, ancres `data-anchor` posées
  (export / + Piste / amplitude / nouveau dossier), bump 1.3.0 → 1.4.0
  (`package.json` + `about.md`). Zéro npm ajouté sur toute l'itération.
- Iteration L phase R (extension renderer Markdown — math maison) :
  support des formules dont la doc a besoin, sans KaTeX (~100 lignes).
  Délimiteurs `$…$` (inline) et `$$…$$` (block centré, mono- ou
  multi-ligne). Constructs : exposants `^{x}`, indices `_{x}` (accolades
  obligatoires), fractions `\frac{a}{b}` (barre CSS empilée), italique
  auto sur lettres latines isolées **dans les délimiteurs uniquement**,
  ~12 symboles Unicode (`\pi \alpha \beta \gamma \cdot \times \div
  \approx \neq \leq \geq \pm`). Récursif (contenu des accolades re-parsé
  en math). Sous-parser dédié `src/lib/mathParse.js` (mathAst construit
  au parse), rendu sup/sub/frac dans MarkdownRenderer. Commande inconnue
  → rendu littéral + warn dev, pas de crash. `_renderer-test.md` enrichi
  d'une section Formules. Zéro npm ajouté. Posé entre L.4 et L.5 car les
  contenus L.5 (tempéraments, glossaires) génèrent beaucoup de ratios,
  cents et exposants. **Phase R.4** : délimiteurs extensibles `( )` `[ ]`
  qui grandissent avec la fraction (bords dessinés en CSS, flex stretch,
  sans mesure JS) ; `why-12-notes.md` migré vers la syntaxe math (1er
  consommateur réel).
- Iteration L phase 4 (Tour guidé) — **V1 de l'Itération L atteinte** :
  visite guidée par diaporama d'info-bulles ancrées. Bouton **Compass**
  (header) + **Ctrl/Cmd+J** démarrent le tour de l'onglet actif. Mode
  spotlight : blocker plein écran (gel clic/molette/clavier hors ESC),
  voile box-shadow sur l'ancre courante, bulle ancrée, progress bar
  cliquable à la place des onglets, navigation ← / → (ou Précédent/Suivant),
  croix + ESC pour quitter. Tours
  déclaratifs par onglet (`src/lib/tours/*.js`, 1er jet des textes — passe
  writer en attente). 3e consommateur de `getAnchoredPosition` ; RAF borné
  pour le montage différé + ouverture de sidebar repliée ; étape sans ancre
  skippée. State `tour` volatile (snapshot onglet + sidebars capturé une
  fois, restauré à la sortie ; chaînage entre onglets sans re-snapshot).
  « En savoir plus » par étape → article de doc. Zéro npm ajouté.
- Iteration L phases 2-3 (onglet Documentation navigable) : 4e onglet
  Documentation (renderer Markdown maison `src/lib/markdown.js`, TOC
  collapsible/resizable, restauration de scroll par article, page
  Raccourcis auto-générée depuis `SHORTCUTS`). Navigation interne active
  (L.3) : les `<DocLink target="onglet:ancre">` basculent sur l'onglet
  cible + halo temporaire sur l'élément d'UI (via `highlightElement`,
  2e consommateur de `getAnchoredPosition`) ; les liens `[label](doc:id)`
  changent l'article courant sans quitter la doc. Handlers propagés via
  `MarkdownNavContext` ; cibles inconnues = no-op gracieux + warn dev.
- Iteration L phase 1 (fondation Documentation) : infrastructure pour
  l'onglet Documentation utilisateur sans modification du comportement
  métier. Table déclarative `src/lib/shortcuts.js` (source unique des
  raccourcis), convention `data-anchor` posée sur les éléments d'UI,
  composant `ShortcutsOverlay` opérationnel via bouton header Keyboard
  ou Ctrl+K. Promotions UI permanentes : pastille `Sustain` cliquable
  (verrouillable) dans le Designer, bouton `Coller` dans la toolbar
  Composer (sémantique ancre/piste sélectionnée/fallback piste 0),
  chip `📋 N éléments` dans la toolbar Bibliothèque (× pour vider),
  halo subtil sur le clip ancre Composer, outline subtil sur le header
  de la piste sélectionnée Composer (nouveau concept `selectedTrackId`
  persisté). Tooltips CP1/CP2 corrigés (Octave Composer, Rétablir
  Bibliothèque).
- Bibliothèque dédiée + 3 sous-apps autonomes (itér K phase 2) : onglet
  Bibliothèque dédié avec full PatchBank + toolbar d'actions icônes,
  sidebars en PatchPicker simplifié, popup SavePatchDialog avec folder
  picker, modal DeleteUsageWarningDialog, piles undo séparées routées
  par activeTab, clipboard multi-paste, batch delete atomique.
- Bibliothèque multi-mode style file explorer (itér K phase 1) :
  5 combinaisons Tree/Nav × List/Details/Tiles, breadcrumb, multi-
  sélection (Ctrl/Shift/lasso), clipboard Copier/Couper/Coller avec
  anti-cycle, raccourcis clavier, popup redimensionnable, état partagé
  Designer + Composer.
- Spectrogramme Designer avancé (itér I phase 1) : mode statique (DFT)
  + mode Live FFT (AnalyserNode temps réel), basculés via **toggle
  explicite "Live"** dans le header. Toggle dB / linéaire applicable
  aux deux modes. Peak hold optionnel pour le Live. Graduations Y
  (majors + minors) sur les deux modes pour lecture précise des
  amplitudes.
- Import / Export bibliothèque format `.osa` (itér H phase 1) : 3 voies
  d'export (Actions Download bibliothèque complète / menu contextuel
  folder / menu contextuel patch), import unique avec choix de placement
  (sous-ensemble wrapper / racine), IDs régénérés systématiquement,
  déduplication des noms de dossiers, IMPORT_LIBRARY undoable Designer.
- Dessin waveform + presets
- Éditeur ADSR visuel draggable
- Preview polyphonique via clavier piano interactif + raccourcis QWERTY
  (event.code) + Espace = sustain (E.3)
- Banque de patches : drag, rename, delete, dossiers arborescents
- Drop timeline avec snap triple croche (0.125 beat), polyphonie
  multi-lanes, multi-pistes
- Hauteur par clip (12-TET ou Libre) via `clipFrequency(clip)` (E.1)
- Durée par clip : 7 bases (carrée à triple croche) × 4 coefs (pur,
  ×1.25, pointé, double-pointé) via `DurationButtons` (E.6.1)
- BPM ajustable + recalcul durée totale
- Curseur animé + affichage temps
- Zoom horizontal + vertical (hauteur de piste modifiable)
- Visualiseur oscilloscope temps réel
- Sidebars Composer resizables et collapsibles (E.7.4-7.5)
- Sidebar Designer resizable et collapsible avec popover Bibliothèque
  flottant en mode réduit (G.1.2) — mode réduit organisé en 3 groupes
  (haut Bibliothèque / spacer / Actions + Play en bas, G.2.1)
- Panneau **Actions** dans la sidebar Designer en barre d'icônes
  inline groupées (patch / historique Undo/Redo / Import-Export
  placeholders) — G.1.1 + G.2.2. Icônes Lucide-react partout (G.2.1).
- Sélecteur de système musical à deux étages dans le Designer :
  Catégorie (Moderne / Historique / Théorique) + Système filtré.
  Composant **ShortLabelSelect** (libellé court trigger / complet menu)
  appliqué uniformément à Catégorie / Système / Repère / Tonique sur
  une même ligne flex-wrap (G.1.3 + G.2.3).
- Système Libre testable (bouton Test + raccourci `s`, dette technique
  fermée en G.1.3)
- Patches portent un **defaultTuningSystem** capturé au save —
  propagation cohérente au drop : key-held → editor, drop simple →
  patch default, placement contigu → clip référent (G.2.4)
- Zone clavier : OctaveSelector au-dessus avec libellé "Octaves",
  clavier en `flex:1` qui s'étire verticalement selon espace, ligne
  Note ancrée tout en bas (G.2.5)
- `TooSmallGate` (ex-`ResolutionGate`, renommé R.3) réactif au resize :
  placeholder pleine page (overlay, app reste montée) si **côté court < 300 OU
  côté long < 500** (plancher orientation-aware R.3.1, ex-924×668), modale soft
  dismissible &lt; 1740×900 (G.1.4 + G.2.6 + R.3.1)
- Export WAV PCM 16-bit stéréo
- Persistance localStorage (pas de migration vers nouveau format en E.1 :
  reset si ancien format détecté)

✅ **Itération A terminée**.

✅ **Itération B terminée** (2026-04-17)
- Spectrogramme statique synchronisé (DFT, échelle log)
- Multi-sélection (rectangle, Ctrl+clic, Shift+drag additionnel)
- Drag/resize/duplication multi avec bornes groupées
- Copier/couper/coller clips (Ctrl+C/X/V, clic droit, positionnement souris)
- Fusion (Ctrl+M) et split (Ctrl+D ÷2, Ctrl+Shift+D ÷3)
- Ctrl+drag scroll horizontal, Alt+drag zoom rectangle
- Répertoires de sons arborescents (CRUD, drag interne, indentation)
- Suppression sons/dossiers avec blocage si clips référencent + assistance
- Check undo symétrique cross-onglet (Designer ↔ Composer)
- Menu contextuel mesures : supprimer/insérer/couper/copier/coller
  avec split automatique des clips à cheval
- Properties panel multi-sélection (son/durée mixtes, actions groupées)

✅ **Itération C terminée** (2026-04-18)
- UI multi-tracks : en-têtes + couloirs, CRUD pistes, drop/drag cross-piste,
  réordonnancement par drag, refactor banque double-clic=renommer (phase 1)
- Mute/Solo/Volume par piste : UI M/S/slider, logique solo DAW, GainNode
  per-track, gains temps réel, atténuation visuelle clips (phase 2)
- Moteur audio look-ahead : scheduler fenêtre glissante, réactivité temps
  réel aux modifications de clips pendant lecture (phase 3)
- Adaptation multipiste : fusion check trackId, coller cross-piste (clic droit
  + Ctrl+V), PropertiesPanel affiche piste, Échap ferme menu contextuel (phase 4)

✅ **Itération D terminée** (2026-04-19) — Refonte Designer
- Phase 1 — Refonte sélecteur de notes : dropdown "Système"
  (12-TET / Libre), clavier piano 12 notes, sélecteur d'octave 0-10,
  extension mode libre 2^4-2^15 Hz. Les trois boutons Test
  (impact/court/tenu) introduits ici ont été remplacés par la preview
  polyphonique au clavier en E.3 puis retirés en F.3.5.
  Modèle : `mode: 'note' | 'free'` → `tuningSystem: '12-TET' | 'free'`
  (migration transparente via `normalizeSound`).

✅ **Itération E terminée** (2026-04-22) — Patches vs Notes (refonte conceptuelle majeure)
- ✅ **Phase 1** (2026-04-19) — Patches remplacent Sounds, notes portées par
  les clips. Commit unique.
  - Modèle : `SavedSound` → `Patch` (id `patch-N`) sans fréquence ni note ;
    champs supprimés : `frequency`, `mode`, `tuningSystem`, `noteIndex`,
    `octave`.
  - `Clip` enrichi : `soundId` → `patchId`, + `tuningSystem`, `noteIndex`,
    `octave`, `frequency` (null côté non applicable). Helper partagé
    `clipFrequency(clip)` dans reducer.js.
  - Éditeur : nouveaux champs `testTuningSystem`, `testNoteIndex`,
    `testOctave`, `testFrequency` — uniquement pour piloter la preview,
    pas copiés dans le patch sauvegardé. Hydratation d'un patch préserve
    ces champs (contexte de test utilisateur).
  - Drop de patch sur timeline : la hauteur du nouveau clip est celle du
    clavier de test courant (règle par défaut, raccourcis clavier prévus
    en E.4). `handleAddClip` utilise `editorTestNoteFields(editor)`.
  - Actions reducer renommées : `SAVE_SOUND` → `SAVE_PATCH`,
    `UPDATE_SOUND` → `UPDATE_PATCH`, `DELETE_SOUND` → `DELETE_PATCH`,
    `RENAME_SOUND` → `RENAME_PATCH`, `MOVE_SOUND_TO_FOLDER` →
    `MOVE_PATCH_TO_FOLDER`, `UPDATE_CLIPS_SOUND` → `UPDATE_CLIPS_PATCH`,
    `SET_CURRENT_SOUND_ID` → `SET_CURRENT_PATCH_ID`,
    `HYDRATE_EDITOR_FROM_SOUND` → `HYDRATE_EDITOR_FROM_PATCH`,
    `SET_EDITOR_NOTE/OCTAVE/TUNING_SYSTEM/FREQUENCY` →
    `SET_EDITOR_TEST_NOTE/OCTAVE/TUNING_SYSTEM/FREQUENCY`.
  - State renommé : `savedSounds` → `patches`, `soundCounter` →
    `patchCounter`, `currentSoundId` → `currentPatchId`.
  - Split/merge/paste/cut/insert/delete measure propagent désormais les
    champs de hauteur du clip source vers les nouveaux clips créés
    (helper `buildSplitPart` dans App, `cloneClipNote` dans reducer).
  - `canMergeClips` ajoute la vérification que tous les clips aient la
    même hauteur (en plus du même `patchId` et `trackId`).
  - Plus de détection de doublons au save : un patch est toujours créé
    avec un id unique (un même timbre peut exister plusieurs fois sous
    des noms différents, c'est permis).
  - **Pas de migration** : si `loadPersistedState` détecte un ancien format
    (clés `savedSounds`, `soundCounter`, `noteCounter`, `placementCounter`),
    on log un warning et on repart d'un état initial vide. Deal assumé.
  - Renommage fichier : `SoundBank.jsx/.css` → `PatchBank.jsx/.css` ;
    props renommées (`savedSounds` → `patches`, `onLoadSound` →
    `onLoadPatch`, etc.). Affichage de la fréquence retiré des chips
    (un patch n'en a plus).
  - `usePlayback` : signature `{ clips, patches, tracks, bpm, ... }`,
    résolution fréquence via `clipFrequency(clip)` à l'attaque de
    chaque clip (live + export WAV). Signature de changement inclut
    les champs de hauteur pour invalider les clips reprogrammés.
- ✅ **Phase 2** (2026-04-19) — Affichage note dans clips + édition
  Properties + flèches clavier. 3 sous-commits :
  - **2.1** Label adaptatif : `src/lib/clipNote.js` exporte
    `formatClipNote(clip)` (12-TET → "A4", free → "440.0 Hz") et
    `NOTE_NAMES` avec ♯ Unicode. Dans Timeline, la `.placed-name` est
    scindée en `.placed-note` (gras) + `.placed-patch-name` (opacité
    0.7). Container queries : patch name masqué sous 120px, tout
    masqué sous 30px.
  - **2.2** `PianoKeyboard`/`OctaveSelector` extraits dans
    `src/components/PianoKeyboard.{jsx,css}`, prop `compact` pour la
    variante Properties (56px de haut, pas de labels). Action
    `UPDATE_CLIPS_PITCH` (payload `[{id, tuningSystem?, noteIndex?,
    octave?, frequency?}]`, undoable pile Composer). Handler
    `handleUpdateClipsPitch`. PropertiesPanel mono : nouveau champ
    "Note" entre Patch et Position (mini-clavier + octave en 12-TET,
    FreqInput en Libre). PropertiesPanel multi : éditable si toutes
    les hauteurs identiques, sinon "Notes mixtes" lecture seule.
  - **2.3** Listener keydown global (App, activeTab=composer). ↑↓ :
    ±1 demi-ton via arithmétique midi (passage d'octave auto).
    Shift+↑↓ : ±1 octave entière. ←→ : ±0.25 beat. Shift+←→ : ±1 beat.
    Bornes intersectées : midi ∈ [12, 143] (C0..B10), position ∈
    [0, totalBeats]. Groupe bloqué si le membre le plus contraint
    ne peut pas bouger. Clips free ignorés pour ↑↓ (édition libre
    via input Hz). Exclusions : input/textarea/select/contenteditable,
    `.timeline-context-menu` ouvert, body cursor en drag.
- ✅ **Phase 3** (2026-04-19) — Designer = instrument de test
  polyphonique. 5 sous-commits :
  - **3.1** PianoKeyboard accepte `onKeyPress(idx)` / `onKeyRelease(idx)`
    + prop `activeNotes` (Set). mousedown → onSelectNote + onKeyPress ;
    un listener window mouseup déclenche onKeyRelease (option B : la
    note tient tant que la souris n'est pas relâchée, même hors de la
    touche). WaveformEditor maintient `activeNotesMapRef` (Map<idx,
    {osc, gain, octave}>) et `instrumentParamsRef` (valeurs ADSR /
    amplitude / testOctave fraîches pour les handlers). Cleanup à
    l'unmount et au changement de patch. Classe `.is-playing` jaune
    vif pour les touches actives (distincte du cyan is-active).
  - **3.2** Mapping `event.code` → noteIndex : KeyS/D/F/G/H/J/K pour
    les blanches (C D E F G A B), KeyE/R/Y/U/I pour les noires. Utilise
    event.code (position physique) donc fonctionne identiquement QWERTY /
    AZERTY / DVORAK. event.repeat ignoré. `instrumentBridgeRef` stable
    sert de pont entre le listener (attaché une fois par activeTab) et
    les fonctions play/release recréées à chaque render. Sortie du
    Designer = stopAllInstrumentNotes.
  - **3.3** PageUp/PageDown décalent testOctave (±1, bornes [0, 10]).
    Keydown unique, skip form fields et combos Ctrl/Alt/Cmd
    (navigation d'onglet navigateur). e.repeat autorisé : maintenir la
    touche traverse les octaves. Initialement Shift/Ctrl "seuls" via
    flags shiftAloneRef/ctrlAloneRef invalidés par toute autre touche
    ou mousedown, remplacé car l'ordre de relâchement dans des combos
    créait des octaves intempestives.
  - **3.4** Pédale de sustain : Espace maintenue = sustainActiveRef.
    Le release est extrait dans `performRelease` et
    `releaseInstrumentNote` le diffère vers `sustainedNotesRef` quand
    sustain est actif. Au relâchement de Espace, performRelease est
    appelé sur toutes les notes sustainées. `playInstrumentNote`
    gère le retrigger : si la note est déjà active (sustainée ou non),
    la voix existante est coupée net avant d'en démarrer une nouvelle.
    preventDefault sur Space (empêche scroll). Badge SUSTAIN orange
    à côté du label "Note".
  - **3.5** Suppression des 3 boutons Test impact/court/tenu et toute
    la logique associée (startAudio, stopAudio, handleTestClick,
    playingMode, oscRef/gainRef, COURT_HOLD_SEC, useEffect live
    frequency/amplitude, CSS .test-btn-mode/.test-buttons). Le test
    d'un patch passe exclusivement par le clavier interactif.
- ✅ **Phase 4** (2026-04-19) — Drop intelligent + placement contigu.
  2 sous-commits :
  - **4.1** `KEY_CODE_TO_NOTE_INDEX` déplacé dans
    `src/lib/keyboardMap.js` partagé. App maintient `pressedNoteKeyRef`
    (synchrone) + `pressedNoteKey` state. Listener Composer : keydown
    enregistre la touche (skip sur Ctrl/Cmd combos + repeat), keyup
    clear. `handleAddClip` priorise pressedNoteKey : si set, clip créé
    en 12-TET à cette note + testOctave, sinon fallback
    `editorTestNoteFields`. Badge ♪ XN orange dans la toolbar Composer
    pendant qu'une touche est maintenue. Raccourcis d'octave (PageUp/
    PageDown) logés dans un useEffect dédié de App (actif les deux
    onglets).
  - **4.2** State `lastAnchorClipId` (non undoable, non persisté)
    ajouté au reducer. Mis à jour par ADD_CLIP, DUPLICATE_CLIPS,
    SPLIT_CLIPS, MERGE_CLIPS, PASTE_CLIPS, SELECT_CLIPS (dernier du
    payload). Nettoyé à REMOVE_CLIP / DELETE_SELECTED_CLIPS /
    CLEAR_TIMELINE si l'anchor disparaît. Le keyup Composer, si aucun
    drag en cours (dragstart/dragend window listeners + body cursor
    check), dispatch ADD_CLIP après l'anchor : même patch, même piste,
    même durée par défaut, note = touche pressée, octave = testOctave.
    ADD_CLIP accepte `extraMeasures` pour étendre automatiquement la
    composition. `handleAddClip` consomme pressedNoteKey au drop pour
    que le keyup suivant ne double pas le placement.
- ✅ **Phase 5** (2026-04-19) — Fixes placement contigu (voir Roadmap).
- ✅ **Phase 6** (2026-04-20) — UX enrichie : durées en boutons toggle
  (7 bases + 3 coefs, snap 0.125), indicateur octave dans la toolbar,
  animation CSS des corridors (voir Roadmap).
- ✅ **Phase 7** (2026-04-20) — Ajustements UI : invariant
  `lastAnchorClipId ↔ selectedClipIds`, fractions réf noire
  (1=noire, 1/2=croche), pas flèche Composer 0.125, sidebars
  resizables + collapsibles, settling frame drag cross-piste
  (voir Roadmap).
- ✅ **Phase 8** (2026-04-22) — Fix release ADSR Designer sur appui
  bref : `gain.value` lu avant `cancelScheduledValues` + marge 20ms
  sur `osc.stop()` (voir Roadmap).
- ✅ **Phase 9** (2026-04-22) — Micro-fades anti-clic. `MIN_ATTACK`
  (3 ms) en plancher d'attack côté Designer + Composer (clic au
  démarrage), `RETRIGGER_FADE` (8 ms) en fade-out de la voix
  précédente lors d'un retrigger (clic de voice-stealing sur note
  déjà active ou sustainée) (voir Roadmap).

🚧 **Itération F — Tier 1 + Tier 2 (gamelan + shrutis indiens) + Tier 3 livrés** — Multi-tempérament
- ✅ **Phase 1** (2026-04-22) — Infrastructure multi-tempérament.
  Création de `src/lib/tuningSystems.js` : registre `TUNING_SYSTEMS`
  (clé = id de système) avec `{ id, label, notesPerOctave, noteNames,
  freq }`. `clipFrequency(clip, a4Ref)` délègue au registre —
  `sys.freq(noteIndex, octave, a4Ref)` pour les systèmes note/octave,
  `clip.frequency` pour `free`. `frequencyToNearestNote` et les noms
  de notes 12-TET migrés dans le registre. `formatClipNote` lit
  `noteNames` depuis le registre (plus de copie locale).
  `WaveformEditor` (preview polyphonique) passe par le même registre
  que `usePlayback` — plus de copie locale de `noteToFrequency`.
  `PropertiesPanel` et `App.jsx` (spectrogramme) routent leurs
  calculs MIDI via le registre. Nouveau champ d'état `a4Ref` (défaut
  440 Hz, persisté, propagé via ref dans le scheduler live, via prop
  directe pour l'export WAV). Aucune UI d'édition exposée — A4 reste
  à 440 Hz pour l'utilisateur final. Comportement strictement
  identique à E.9.
- ✅ **Phase 2** (2026-04-22) — Premier tempérament alternatif +
  UI A4. 2 sous-commits :
  - **2.1** Tempérament Pythagoricien 12 centré sur C. Ratios dérivés
    à l'init par parcours de la chaîne (6 montantes, 5 descendantes,
    loup F#↔Db ~678 cents). Mêmes noms de notes que 12-TET → clavier
    et UI existants réutilisés. Ordre registre : 12-TET,
    pythagorean-12, free. Sélecteurs dynamisés (Designer +
    PropertiesPanel — ajout du sélecteur dans Properties, absent
    auparavant : multi avec check `allSameTuningSystem` →
    "Systèmes mixtes" en lecture seule sinon). Logique de bascule
    portée par le reducer (`UPDATE_CLIPS_PITCH` étendu) pour
    verrouiller l'invariant "clip cohérent" au modèle : vers 'free'
    calcule la fréquence courante, entre systèmes de même grille
    garde note/octave, sinon snap via 12-TET. Fix latent dans
    `SET_EDITOR_TEST_TUNING_SYSTEM` du Designer (hardcode '12-TET'
    en branche non-free) corrigé au passage.
  - **2.2** Input A4 dans la toolbar Composer. Nouveau composant
    `A4Input` (même pattern que `BpmInput` — validation différée,
    Échap restaure, ±1 flèches / ±5 Shift). Fourchette 380-480 Hz
    entiers. Action `SET_A4_REF` undoable, `a4Ref` ajouté à
    `COMPOSER_FIELDS`. `A4Input` candidat à extraction en
    `ValidatedIntegerInput` partagé si un 3e input similaire
    apparaît (pas extrait par choix de scope en F.2).
- ✅ **Phase 3** (2026-04-23 → 2026-04-24) — Multi-tempérament 24
  notes + refonte UI ADSR. ~13 sous-commits (détail dans Historique
  et Roadmap). Registre enrichi : chaque entrée porte ses champs
  `layout` et `keyboardMap` — `src/lib/keyboardMap.js` supprimé,
  les consommateurs lisent `getTuningSystem(id).keyboardMap`. Deux
  nouveaux tempéraments **24-TET égal** et **24-TET Le Caire 1932**
  (table en dur, source aly-abbara.com, ancrée 'Oshairan = A4 = 440).
  `PianoKeyboard` devient un dispatcher (`LAYOUT_COMPONENTS` :
  `piano-12` → `PianoLayout12`, `grid-24` → `Grid24Layout`). Nouveau
  `Grid24Layout` en CSS Grid 4×30 sub-cols (escalier 1/4 d'unité par
  rangée), palette HSL par degré — 7 hues naturelles, lightness
  différencié par kind ♮/♯/↑/↓ ; `is-active` et `is-playing` en
  outlines pour préserver la couleur de position. Mapping QWERTY 24
  positions géométriquement alignées (SDFGHJK naturelles, ERTYUIO
  demi-dièses, 24680 dièses pleins, XCBNM demi-bémols). Refonte
  raccourcis durées : NumPad sans Shift + Shift+Digit (Digit nus
  libérés pour les notes 24-TET). Snap inter-systèmes généralisé :
  `frequencyToNearestNote` (12-TET only) → `frequencyToNearestIn(hz,
  sysId, a4Ref)` qui itère sur la grille du système cible × 11
  octaves et minimise |cents|. Sélecteur de tempérament ajouté dans
  la toolbar Composer (à côté de A4). **ADSR → AHDSR** : nouveau
  champ `hold` (0-1000 ms, défaut 0) — plateau au peak entre attack
  et decay, pédagogiquement précieux pour distinguer hold forcé vs
  sustain tant que la touche est tenue. UI Enveloppe refondue :
  Amplitude rapatriée dans la zone ADSR (6 sliders Amp/A/H/D/S/R
  empilés), valeurs éditables au clavier via composant générique
  `NumberInput`, tooltips au survol (`AdsrTooltip`), handles
  isotropes, curseur dynamique, P3 retiré (sustain = niveau
  sémantique, pas plateau temporel). Action combinée
  `SET_EDITOR_ADSR_AND_AMP` pour unifier le drag P1 diagonal en un
  seul snapshot undo. P1h géré en z-order (au-dessus de P1 en ordre
  de dessin + hit-test), pas en Y-offset : silhouette fidèle.
- ✅ **Phase 4.1** (2026-04-25) — Juste intonation majeure centrée
  sur C. Ajout de l'entrée `'just-major-c'` au registre (3e
  position, entre `pythagorean-12` et `24-tet-equal`). Table d'Ellis
  5-limit en dur (`JUST_MAJOR_RATIOS_FROM_C`) ; ancrage `C4 = a4Ref
  × 3/5` pour préserver l'invariant A4 = a4Ref exact (A/C = 5/3 dans
  la table). Accidentels en enharmoniques bémols fonctionnels
  (D♯=6/5, G♯=8/5, A♯=9/5, C♯=16/15, F♯=45/32) — écart vs dièses
  non enharmoniques que le tempérament égal efface, point
  pédagogique assumé. Aucun nouveau layout ni mapping : réutilise
  `piano-12` et `TWELVE_KEY_MAP`. Sélecteurs et reducer consomment
  la nouvelle entrée sans modification — le pattern d'extension
  posé en F.3 tient.
- ✅ **Phase 4.2** (2026-04-25) — 5-TET pentatonique égale + layout
  `grid-5`. Premier tempérament avec `notesPerOctave ∉ {12, 24}` :
  5 divisions égales de l'octave, nomenclature I..V (pas d'emprunt
  chromatique), tonique I ancrée à `a4Ref` à l'octave 4 —
  généralisation sémantique de `a4Ref` comme "fréquence du degré 0
  à oct 4". `FIVE_KEY_MAP` réutilise les positions SDFGH (sous-
  ensemble strict du `TWELVE_KEY_MAP`) pour préserver la mémoire
  motrice. Nouveau `Grid5Layout` dans `PianoKeyboard.jsx` : 5
  rectangles en ligne (CSS Grid 1×5), palette 5 hues à 72° de pas
  avec lightness uniforme (pas de hiérarchie d'altération en 5-TET),
  patterns `is-active` (inset cyan) et `is-playing` (outline jaune
  + glow) hérités de grid-24. Entrée insérée en 6e position
  (avant `free`) pour ne pas disrupter les positions déjà adoptées.
- ✅ **Phase 4.3** (2026-04-25) — 31-EDO explorateur micro-tonal +
  layout `grid-31`. Nouvelle entrée `'31-edo'` au registre (7e
  position, avant `free`). 31 divisions égales (step 1200/31 ≈
  38.71¢) ; tonique deg 0 ancrée à `a4Ref` à oct 4 (cohérence avec
  5-TET). Interprétation abstraite : degrés numérotés 1..31
  (`THIRTYONE_EDO_NOTE_NAMES`), pas d'emprunt à la nomenclature
  méantone (C♯/D♭, double-dièses) — cohérent avec la position
  pédagogique de 5-TET. Suffixe "." dans les noms (`"1."` à `"31."`)
  comme séparateur visuel pour `formatClipNote` (`"23." + "4"` →
  `"23.4"`), masqué sur les touches du clavier. `THIRTYONE_KEY_MAP`
  31 positions sur les 4 rangées physiques du clavier QWERTY en
  serpentin-colonne (KeyZ KeyS KeyE Digit4 KeyX KeyD KeyR Digit5 …
  KeyP) — 8 colonnes × 4 rangées moins la case haut-droite manquante
  (degré 31 = octave non représenté). Nouveau `Grid31Layout` dans
  `PianoKeyboard.jsx` : CSS Grid 4×35 sub-cols, escalier 1/4
  d'unité par rangée (extension du pattern grid-24 à 8 colonnes au
  lieu de 7). Axe horizontal monotone : `start_subCol(k+1) =
  start_subCol(k) + 1` que ce soit une montée intra-colonne ou un
  saut de colonne. Palette `GRID31_HUE_PER_COL` (8 hues par
  colonne, étendant le pattern `HUE_PER_NATURAL` de grid-24 à 8
  entrées) + 4 lightness par rangée (75/60/45/30%, alignée sur la
  grammaire ↓→♮→↑→♯ de grid-24) ; voir 4.3.1 pour la correction
  par rapport à la palette initiale 4-hues-par-rangée.
  Hauteur 160px / 80px compact alignée sur grid-24 (autre layout
  4-rangées) plutôt que sur grid-5 (1 rangée). Patterns `is-active`
  (inset cyan) et `is-playing` (outline jaune + glow) hérités du
  pattern grid-24. `LAYOUT_COMPONENTS` enrichi de `'grid-31'`.
  Vérifs numériques (a4Ref=440) : deg 0 oct 4 = 440 Hz exact, deg 0
  oct 5 = 880 Hz exact (octave juste), deg 10 vs 5/4 = +0.78¢
  (tierce méantone quasi-pure, signature 31-EDO), deg 18 vs 3/2 =
  −5.18¢ (quinte méantone). Snap 12-TET C4 → 31-EDO deg 8 oct 3
  (écart 9.68¢ < step/2 = 19.35¢). **Tier 1 multi-tempérament clos**
  (4.1 juste-majeure, 4.2 5-TET, 4.3 31-EDO).
- ✅ **Phase 4.4** (2026-04-25) — Repères visuels (gammes & accords)
  sur le clavier, saveur A passive. Nouveau fichier
  `src/lib/visualCues.js` : `VISUAL_CUE_PATTERNS` (8 entrées : `none`
  + 3 accords + 4 gammes — triade majeure/mineure, septième de
  dominante, gamme majeure/mineure naturelle, pentatonique majeure,
  gamme par tons), définis comme listes d'intervalles **en cents
  depuis la tonique** (ratios purs 5-limit / 7-limit pour dom7).
  Helper `cuedNoteIndices(patternId, tonicDeg, sysId, a4Ref)` snappe
  vers les degrés du système courant via `frequencyToNearestIn` —
  même définition produit [0,4,7] en 12-TET et [0,10,18] en 31-EDO,
  ce qui est précisément l'intérêt pédagogique. Systèmes supportés
  via `VISUAL_CUE_SUPPORTED_SYSTEMS` : 12-TET, Pythag-12, juste-
  majeure, 24-TET égal, Le Caire 1932, 31-EDO. Pas 5-TET (errs > 90¢
  sur la triade majeure) ni Libre (pas de degrés). État éditeur :
  `editor.visualCuePattern` (défaut `'none'`) + `editor.visualCueTonic`
  (défaut 0), pile undo Designer, persistés à plat dans localStorage
  (clés `editorVisualCuePattern` + `editorVisualCueTonic`, ré-injectés
  dans `editor` au `buildInitialState`). `SET_EDITOR_TEST_TUNING_SYSTEM`
  enrichi : si `visualCueTonic` dépasse `notesPerOctave` du nouveau
  système, snap à 0 (le pattern reste). UI WaveformEditor : barre
  "Repère + Tonique" au-dessus du clavier, visible uniquement quand
  le système supporte les cues. PianoKeyboard : nouvelle prop
  `cuedNotes` propagée à chaque layout (les 4 layouts ajoutent
  `is-cued` à la className des cellules concernées). CSS `.is-cued` :
  halo magenta `box-shadow: 0 0 0 2px #e832e2` en externe, préserve
  le fill HSL ; combinaisons avec `is-active` (inset cyan) et
  `is-playing` (outline jaune + glow) gérées via box-shadow
  comma-separated. Saveur B (sélection compositionnelle active par
  clic-multi) reste en BACKLOG. Vérifs : 12-TET tonic 7 (G) triade
  maj → [2,7,11] ; 31-EDO tonic 0 pentat. maj → [0,5,10,18,23] ;
  31-EDO tonic 0 whole-tone → [0,5,10,16,21,26] (séquence non
  régulière car 200¢ ne divise pas 31-EDO).
- ✅ **Phase 5** (2026-04-25) — Tier 3 historiques européens.
  Deux tempéraments 12 notes ajoutés au registre :
  **`'meantone-quarter-comma'`** (Mésotonique 1/4 de comma centré
  sur C, chaîne E♭→G♯, tierces majeures 5/4 pures à 386.314¢ exact,
  loup G♯↔E♭ ; cents Helmholtz/Ellis) et **`'werckmeister-iii'`**
  (Andreas Werckmeister 1691, 4 quintes tempérées chacune par 1/4
  de comma pythagoricien sur C-G/G-D/D-A/B-F♯ + 8 quintes pures ;
  tempérament Bach pour le Wohltemperierte Klavier ; cents Barbour
  1951). Tables de cents inline (les fonctions ratio existantes
  pythagorean/just ne motivent pas un helper unifié — abstractions
  natives différentes). Ancrage A4 = a4Ref via
  `c4 = a4Ref × 2^(-CENTS[9]/1200)` (pattern symétrique aux autres
  systèmes 12-notes basés sur C). Insérés en 4e/5e position du
  registre (entre `just-major-c` et `24-tet-equal`) — regroupement
  des systèmes 12-notes. Aucun nouveau layout, aucun nouveau
  mapping — réutilisation de `piano-12` et `TWELVE_KEY_MAP`. Visual
  cues activés (`VISUAL_CUE_SUPPORTED_SYSTEMS` étendu). Registre
  à 10 entrées. Vérifs (a4Ref=440) : Mésotonique C4=263.181,
  E4=328.977 (= C4×5/4 exact), G4=393.548, A4=440.000 ; Werckmeister
  III C4=263.404, E4=329.998, G4=393.768, A4=440.000.
  Triptyque pédagogique complété : Pythagoricien (quintes pures,
  tierces fausses) → Mésotonique 1/4-comma (tierces pures, wolf
  marqué) → Werckmeister III (compromis bien-tempéré, toutes
  tonalités utilisables) → 12-TET (uniforme). Tier 2 (gamelan,
  22-TET, 53-EDO) reste en backlog.
- ✅ **Phase 6** (2026-04-25) — Tier 2 gamelan. Deux tempéraments
  javanais d'après Surjodiningrat, Sudarjana & Susanto, "Tone
  Measurements of Outstanding Javanese Gamelans in Jogjakarta
  and Surakarta" (1972) — étude empirique de référence, citée
  en commentaire du registre. **`'slendro'`** (5 notes, accordage
  Surakarta moyen, cents [0, 241, 481, 719, 958] ; réutilise
  layout `grid-5` et `FIVE_KEY_MAP` — strict alignement avec
  5-TET côté UI, audio différent par les ~3¢ de déviation par
  rapport à 5-EDO) et **`'pelog'`** (7 notes, cents [0, 119, 258,
  539, 678, 794, 1058] ; nouveau layout `grid-7` calqué sur
  grid-5 avec 7 hues à 360°/7 ≈ 51° de pas, mapping QWERTY home
  row SDFGHJK = `PELOG_KEY_MAP`, sous-ensemble strict de
  `TWELVE_KEY_MAP`). Cellules équidistantes alors que les pitchs
  Pelog ne le sont pas — convention partagée avec piano-12 et
  tous les autres layouts. Nomenclature romaine I..V / I..VII —
  pas d'import des noms javanais natifs (barang/gulu/dada/lima/
  nem ou ji/ro/lu/pat/mo/nem/pi), décision de scope assumée
  pour limiter la friction terminologique en classe. Tonique
  deg 0 = `a4Ref` (cohérence 5-TET / 31-EDO ; pas d'A en
  gamelan). Visual cues **désactivés** : `slendro`/`pelog` absents
  de `VISUAL_CUE_SUPPORTED_SYSTEMS`, la barre se masque
  automatiquement via la logique F.4.4 existante. Pelog Bem /
  Pelog Barang non modélisés comme entrées séparées — le clavier
  expose les 7 notes, l'utilisateur choisit son sous-ensemble
  joué. Insérés en 10e/11e position du registre (entre `31-edo`
  et `free`). `LAYOUT_COMPONENTS` enrichi de `'grid-7'` →
  `Grid7Layout` (nouveau composant dans `PianoKeyboard.jsx`,
  parallèle à `Grid5Layout`). Vérifs (a4Ref=440) : Slendro I oct 4
  = 440.000, V = 765.200, I oct 5 = 880.000 (octave juste).
  Pelog I = 440.000, II = 471.308 (~119¢ — intervalle "petit"
  caractéristique), IV = 600.711 (~539¢ — 4e degré loin du
  tonique), VII = 810.701, I oct 5 = 880.000. Registre à 12
  entrées. Reste en backlog : 22-EDO et 53-EDO du Tier 2 ; refonte
  UI dropdown catégorisé (12 entrées commencent à frotter).
- ✅ **Phase 7** (2026-04-26) — Tier 2 shrutis indiens (deux
  frameworks). Path B : on ship deux entrées registre dédiées
  (`'shrutis-bhatkhande'` et `'shrutis-sarngadeva'`) plutôt qu'un
  unique "22 shrutis" générique, parce que la grammaire culturelle
  est précisément ce que les frameworks encodent. 2 sous-commits :
  - **7.1** Catalogue partagé + Bhatkhande. `SHRUTI_CANONICAL_CENTS`
    (22 valeurs entières dérivées du 5-limit just intonation,
    sources Te Nijenhuis 1974 / Rowell 1992 / Bhatkhande 1909-1932)
    et helper `shrutiFreq(noteIndex, octave, a4Ref)` ancré sa = a4Ref
    à oct 4 (cohérence 5-TET / 31-EDO / gamelan). Bhatkhande
    (V.N. Bhatkhande, *Hindustani Sangeet Paddhati*, 1909-1932) :
    distribution **1-4-4-4-1-4-4** — sa (I) et pa (V) sont des
    piliers à 1 cellule chacun, re/ga/ma/dha/ni reçoivent chacune
    4 sub-shrutis. Nomenclature romaine `I, IIa..IId, IIIa..IIId,
    IVa..IVd, V, VIa..VId, VIIa..VIId` (22 noms terminés par lettre
    → pas besoin de séparateur "." pour `formatClipNote`). Mapping
    QWERTY `BHATKHANDE_KEY_MAP` 22 positions : Z-row = 7 svaras à
    leur position la plus grave (ZXCVBNM = sa, IIa, IIIa, IVa, pa,
    VIa, VIIa), 3 rangées au-dessus pour les sub-shrutis ascendantes
    des 5 clusters non-piliers (gaps physiques au-dessus de sa et pa
    — reflet de la grammaire visuelle). Nouveau layout
    `grid-22-bhatkhande` dans `PianoKeyboard.jsx` : 7 colonnes svaras
    sur grille 4 rangées × 32 sub-cols, escalier 1 sub-col par rangée
    (extension du pattern grid-31 à 7 colonnes), gaps visuels
    au-dessus des colonnes sa (col 1) et pa (col 5). Palette
    `HUE_PER_SHRUTI_SVARA = [0, 51, 103, 154, 206, 257, 309]`
    (réutilise les 7 hues de grid-7 — cohérence visuelle cross-system
    pelog/shrutis) × 4 lightness par rangée (75/60/45/30%, alignée
    sur grid-31 ↓→♮→↑→♯). CSS `.grid22-key` posé en 7.1 mutualisé
    avec 7.2.
  - **7.2** Sarngadeva. Sarngadeva (*Sangita Ratnakara*, XIIIe s.) :
    distribution **4-3-2-4-4-3-2** (Bharata classique préservé) — sa,
    ma, pa habitent 4 sub-shrutis chacun (zones étendues), ri et dha
    3, ga et ni 2. Mêmes 22 cents canoniques que Bhatkhande (`shrutiFreq`
    partagé) — différence purement organisationnelle. Nomenclature
    `Ia..Id, IIa..IIc, IIIa..IIIb, IVa..IVd, Va..Vd, VIa..VIc,
    VIIa..VIIb` (la sub-shruti la plus grave porte le nom de la svara :
    Ia = sa, IIa = ri, IIIa = ga, IVa = ma, Va = pa, VIa = dha,
    VIIa = ni). Mapping QWERTY `SARNGADEVA_KEY_MAP` 22 positions :
    Z-row = 7 svaras nommées (mêmes ZXCVBNM que Bhatkhande pour
    préserver la mémoire motrice cross-framework), colonnes hautes
    pour sa/ma/pa (jusqu'au digit row), basses pour ga/ni (s'arrêtent
    à la rangée A). Nouveau composant `Grid22SarngadevaLayout` qui
    réutilise strictement les classes CSS `.piano-keyboard-grid22` et
    `.grid22-key` posées en 7.1 — la grille géométrique est identique
    (32 sub-cols, 4 rangées, mêmes hues svara), seules les cellules
    peuplées diffèrent. Grammaire visuelle "piliers larges" (sa/ma/pa
    montent jusqu'au digit row) contraste avec "piliers étroits" de
    Bhatkhande — c'est l'écart pédagogique central qu'on veut donner
    à voir. `LAYOUT_COMPONENTS` enrichi de `'grid-22-bhatkhande'` et
    `'grid-22-sarngadeva'`. Visual cues désactivés sur les deux
    (patterns 5-limit harmoniques ne s'appliquent pas au contexte
    modal-mélodique indien). Insérés en 12e/13e position du registre
    (entre `pelog` et `free`). Vérifs (a4Ref=440) : sa oct 4 = 440.000
    Hz exact (Bhatkhande I = noteIndex 0 ; Sarngadeva Ia = noteIndex
    0), re shuddha = 495.026 (Bhatkhande IId = noteIndex 4 ;
    Sarngadeva IIa = noteIndex 4 ; ~9/8 à +0.09¢ d'écart vs ratio
    pur — conséquence du choix d'arrondir SHRUTI_CANONICAL_CENTS à
    l'entier, conforme à la pratique slendro/pelog), pa = 660.017
    (3/2 à +0.06¢), ni shuddha (Bhatkhande VIId = Sarngadeva indice
    21) = 835.421, sa oct 5 = 880.000 (octave juste). Bascule
    Bhatkhande ↔ Sarngadeva : noteIndex préservé → fréquence
    préservée, seuls les labels changent (ex. "IId.4" → "IIa.4"
    pour la même 495 Hz). Registre à 14 entrées. Reste en backlog :
    22-EDO Erlich (distinct des shrutis indiens — reste un candidat
    xenharmonique séparé), 53-EDO, refonte UI dropdown (14 entrées
    rend la dette urgente), Bharata reconstructed (Sambamoorthy)
    comme 3e framework potentiel si demande explicite, modes
    indiens (ragas/pathets) comme sous-ensembles surlignés —
    feature pédagogique future.
- ✅ **Phase 8** (2026-04-27) — X-EDO paramétrique livrée.
  Sous-phases 8.1 (infrastructure backend), 8.2 (composant
  GridXEdoLayout + captation Shift) et 8.3 (UI XEdoInput +
  bannière de bascule 12/24) toutes livrées. Slendro / Pelog /
  X-EDO sont entièrement jouables (clavier physique + souris),
  X-EDO 44..53 via Shift en mode SHIFT_ANCHOR. Détail dans
  Roadmap & Backlog. Registre à 13 entrées
  (-5-tet -31-edo +x-edo). **Itération F (multi-tempérament)
  clôturée** — reste en backlog le redesign optgroup catégorisé
  du dropdown (B.dropdown-tuning, dette UI marquée comme
  prochaine candidate).

## Règles de travail

- Pas de lib audio externe, Web Audio natif uniquement
- Formule BPM utilisée : `seconds = beats * 60 / bpm` (pas `× 4`, pour cohérence
  musicale standard : noire = 1 unité)
- Git : remote `origin` = `git@github.com:rm-info/synth-app.git`, branche `main`
- CONTEXT.md mis à jour à chaque fin de phase par Claude Code

## Roadmap & Backlog

> Détail des roadmaps des itérations livrées (A→M) → `CONTEXT-ARCHIVE.md`.
> Ci-dessous : l'itération en cours, puis le backlog général (non planifié).

### Iteration T « Effets sans mémoire » (cadrée 2026-06-10, en cours)

Tour complet des effets/modulations qui s'intègrent au **cycle de vie audio actuel**
(chaîne jetable par note, zéro queue) avant le gros chantier des effets à mémoire
(delay-based). Tout **par patch**, persisté dans `Patch` + `.osa` **v4** (bump unique
en T.2, défauts injectés pour les champs absents). Distorsion **par voix**
(waveshaping, compatible archi jetable). Grille 3×2 conservée. Cadrage complet :
`archi/BACKLOG.md` (« Effets et modulations »).

- ✅ **T.1 — refonte module « Effets » + switcher header (UI pure)** : module
  Modulation renommé « Effets » (label seul) ; corps un effet à la fois (l'autre
  monté/masqué, repeint au switch, rAF sur le seul graphe visible) ; rangée de
  boutons toggle en barre de titre via `OverflowToolbar` (highlight = en édition,
  pastille accent = activé, clic = édition seule, badge agrégé tiroir via
  `triggerBadge`) ; relogement mobile via `buildEffectsHeaderItems` ; état UI
  `designerEffectsSelected` persisté hors undo. **Aucun changement audio/modèle/`.osa`.**
- ✅ **T.2 — auto-pan (LFO → `StereoPannerNode.pan`, `.osa` v4)** : 1ᵉʳ effet stéréo.
  `Patch`/`Editor` += `autoPan: Lfo` (depth 0..1 = excursion symétrique) ; panner inséré
  par l'appelant **uniquement si `enabled && depth>0`** (chaîne mono inchangée sinon) sur
  les 4 chemins, `applyModulation` ne fait qu'ajouter la branche LFO ; 3ᵉ bouton + panneau
  (graphe à étiquettes G/D). **`OSA_VERSION = 4`** (bump unique de l'itération, accepte v1→v4).
- ✅ **T.3 — pitch envelope (enveloppe → `osc.detune`, v4 inchangé)** : 1ʳᵉ modulation
  non-LFO. `Patch`/`Editor` += `pitchEnv {enabled, amount cents signé, time ms, invert}` ;
  automation de la valeur de base d'`osc.detune` (aucun nœud ; somme avec le vibrato par
  construction) sur les 4 chemins ; 4ᵉ bouton « Hauteur » + panneau enveloppe à 2 poignées
  (sans animation). Pas de bump (`pitchEnv` absent → défaut injecté). **T.3bis** : mode
  **« Inverser »** (part de la note, s'éloigne vers `amount` et y reste) — toggle + graphe
  miroir. **T.3ter** : **4 formes de progression** (`curve`, `setValueCurveAtTime`).
- ✅ **T.4 — filtre statique (`BiquadFilterNode` par voix, v4 inchangé)** : 1ᵉʳ filtre +
  1ᵉʳ graphe fréquentiel. `Patch`/`Editor` += `filter {enabled, type LP/HP/BP/notch, cutoff,
  q linéaire}` ; insertion **VCO→VCF→VCA** conditionnelle (4 chemins), **mapping Q** dB↔linéaire
  partagé audio/graphe (`lib/filter.js`) ; 5ᵉ bouton « Filtre » + panneau (switch 4 types,
  steppers Fréquence **multiplicatifs**) + **graphe de réponse** (`getFrequencyResponse`,
  biquad de mesure) à poignée 2D (commit atomique `SET_EDITOR_FILTER_POINT`). `NumberInput`
  += `stepFactor`. Pas de bump (`filter` absent → défaut). **Keytracking du cutoff → backlog.**
- ✅ **T.5 — enveloppe de filtre + wah (→ `biquad.detune`, v4 inchangé)** : `biquad.detune`
  est en cents comme l'osc → l'env de filtre **réutilise le pitch env** et le wah **réutilise
  le vibrato**, sur `biquad.detune` (no-op si filtre off). `PitchEnv` généralisé en **`ParamEnv`**
  (type partagé) ; `Patch`/`Editor` += `filterEnv: ParamEnv` (amount ±4800) + `wah: Lfo` (depth
  cents 0..3600). Helper audio partagé **`scheduleParamEnv`** (4 formes, osc + biquad). 2 boutons
  header « Env. filtre »/« Wah » (panneaux clones, graphe généralisé par bornes) + **hint « filtre
  désactivé » + bouton « Activer le filtre »**. Au passage : fix `UPDATE_PATCH` persiste `filter`.
- ✅ **T.6 — distorsion (`WaveShaperNode` 4x par voix, v4 inchangé)** : `distortion {enabled,
  curve soft/hard/fold, drive 1..50, mix wet/dry}` ; courbes de transfert normalisées ±1→±1
  (`lib/distortion.js`, mémo + helper audio/graphe) ; inséré **AVANT le filtre** (logique
  soustractive) ; split wet/dry ; 8ᵉ bouton « Disto » + panneau (switch 3 courbes + graphe de
  transfert à poignée Drive log). **Hors scope** : disto « sur la somme » par patch (→ effets à
  mémoire), drive modulable (noté backlog « inattendus »). **Itération T complète (8 effets).**

**Itération T feature-complete** (T.1→T.6) — en attente de clôture/release (version + déplacement
de la roadmap vers l'archive, à la main de l'archi).

Gros chantier **suivant** : effets **à mémoire** (delay/écho, reverb, chorus) via bus
d'effet persistant par patch et/ou par piste — hors itération T (cf. `archi/BACKLOG.md`).

**Dettes & limitations ouvertes par S** :
- **Icônes PWA PNG** (apple-touch 180 / maskable 512) — manifest SVG-only en
  attendant un rasteriseur **système** (zéro dépendance npm, décision archi).
- **Lasso tactile** (sélection au doigt sur zone vide Timeline) + **reorder de piste
  au doigt** — souris-seuls, désambiguïsation scroll/sélection reportée.
- **`MASTER_HEADROOM` (~0.1) et `latencyHint` (0.02 s) à affiner** à l'oreille / sur
  appareils ; **`latencyHint` conditionnel mobile** si la latence desktop gêne.
- **Confort du tracé fin au doigt** (volet B : précision sur petites surfaces) —
  backlog.

Avant S : R « Refonte petit écran du Designer » (v1.10.0), Q « Désencombrement »
(v1.9.1), P « Effets & modulations » (v1.9.0). Suite de la section « Effets et
modulations » du backlog (pitch envelope, filtre + enveloppe de filtre, distorsion,
effets temporels par piste, mixage/pan…) **non cadrée** ; « Monde B » inharmonique
+ morph toujours pressenti (cf. `archi/BACKLOG.md`). La **refonte orientation
(ex-R.4)** reste au backlog.

**Reste lié à P (différé, future itération)** :
- **Surfaçage en Composer / PropertiesPanel** d'un indicateur read-only « ce patch
  a un vibrato / trémolo » (hors scope P, à backloguer si le besoin émerge).
- **Override de modulation par clip** et **synchro tempo du LFO** (rate en
  divisions de temps) : explicitement hors scope P, la modulation reste par patch
  et en Hz.

**Reste lié à O (différé, future itération)** :
- *(traité par R)* Le Designer sous 924×668 (ex-accordéon) a été refondu en
  **switcher de modules** + densification (iter-R). Reste le **confort tactile**
  sous ~700 px (Pointer Events / surfaces) → **itération S** ; et la **refonte
  orientation (ex-R.4)** au backlog.
- Switch Graphe/Sliders AHDSR exposé **aussi en résolution normale** (replier une
  vue par choix).
- Seuils de calibration en variables (`INSTRUMENT_*`, `ADSR_COMPACT_*`,
  `AUTO_COLLAPSE_DEFAULT_WIDTH`, container-query) pour réglage ultérieur.

### Backlog général (à caser quand pertinent)

- **(iter-T, T.4) Keytracking du cutoff** : faire suivre la fréquence de coupure du
  filtre à la hauteur de la note jouée (classique synthé — le timbre reste constant
  d'une octave à l'autre). Aujourd'hui le cutoff est **statique** (posé à la création
  de la voix, indépendant de la note) : le filtre traverse la même fréquence quelle que
  soit la hauteur, donc un sweep de pitch change le timbre — comportement assumé et
  pédagogiquement intéressant. Le keytracking ajouterait un facteur (0–100 %) appliqué à
  `cutoff` en fonction de `clipFrequency`. Non cadré, noté à la livraison de T.4.
- **(iter-T, T.3bis « inattendus ») Pitch « fall » au release** : chute de hauteur
  déclenchée en **fin de note** (type cuivres), ancrée sur `releaseStart` plutôt que
  sur l'attaque. Autre mécanique que le pitch env (qui agit à l'attaque) — variante
  à explorer hors itération T.
- **(iter-T, T.3ter) Courbure continue draggable du pitch envelope** : remplacer le
  switch 4 formes par une courbure continue éditable sur le graphe, les 4 formes
  devenant des presets de courbure. Le modèle (`p(t)` paramétrée) n'aurait pas à
  casser. Noté à la livraison de T.3ter.
- **(iter-M) Sweep horizontal multi-barres** dans l'éditeur Harmoniques :
  peindre plusieurs barres en un drag (actuellement 1 barre/geste). Nice-to-have
  noté dans le prompt M.2 (nécessiterait une action « set amplitudes en bloc »
  pour rester atomique côté undo).
- **(iter-M) Color-coding des 3 vues** (Forme d'onde vert / Harmoniques bleu /
  Spectro ambre, cf. spec §7) : aujourd'hui l'accent cyan est partagé (barres
  éditables en accent, dérivées grisées). Polish visuel différé.
- **(iter-M) Nettoyage `spectrogramVisible`** : vestigial depuis M.2 (spectro =
  colonne permanente). Clé localStorage conservée (consigne « ne pas toucher aux
  clés ») ; retrait complet (état + action + reducer) à faire si jamais.
- **(iter-M) Mismatch de grille FFT 600 ↔ 512** : `pointsToHarmonics` resample
  la canonical (600 pts) vers 512 par **interpolation linéaire** avant la FFT, ce
  qui réinjecte du leakage spectral (~15 %/passe sur un créneau à `cap=256`,
  mesuré en M.r.4). Conséquence : le round-trip
  `harmonicsToPoints → pointsToHarmonics` n'est **pas** idempotent à haut `cap` —
  d'où l'abandon de la détection numérique de normalisation au profit d'un flag
  d'état (M.r.4). Correctif propre : resample band-limité (sinc/poly-phase) ou
  travailler nativement sur une grille puissance-de-2. Hors scope tant que l'audio
  reste acceptable ; deviendra prioritaire si un futur besoin exige un round-trip
  exact (ex. édition de barres sans « saut » résiduel).

- **Adaptation UI résolutions intermédiaires [924×668..1740×900]**
  (G.1.4 ouvre la voie) : layout repensé pour viewports plus
  étroits — dropdowns compactés, clavier scrollable horizontal,
  sidebars repliables au seuil viewport, étirement intelligent
  des zones Designer/Composer. Les mêmes mécanismes (resize,
  collapse, popovers) pourront aussi enrichir les résolutions
  supérieures (mode "expanded canvas" en plein écran, etc.).
  Cohérence avec les constantes `MIN_USABLE_*` / `RECOMMENDED_*`
  de `TooSmallGate.jsx`.
- Catégorisation optgroup ou cat+système split pour les dropdowns
  Composer (Toolbar + PropertiesPanel) — alignement sur G.1.3
  côté Designer. Hérité de l'ancien backlog F "B.dropdown-tuning".

- Spectrogramme — zoom X axis (frequency range) — gardé en backlog
  depuis iter I phase 1, l'échelle log actuelle étale déjà
  suffisamment.
- Spectrogramme Composer (visualiser la lecture timeline via le
  AnalyserNode existant dans usePlayback) — gardé en backlog depuis
  iter I phase 1.
- Bouton "Vider la banque" (avec undo)
- Améliorations contrastes (passe 2)
- Section stats (nb mesures, nb clips, durée totale)
- Migration timeline DOM → Canvas (perf à grand nombre de clips)
- Annulation drag par Échap (selon ressenti)
- Optimisation stockage localStorage (résolution points, quantification,
  ou IndexedDB)
- Fréquence libre : flèches haut/bas dans FreqInput pour incréments fins
- Flèches haut/bas dans NumberInput — **mécanisme livré (iter-O phase-1**,
  `showSteppers`/`step`/`shiftStep` : chevrons `▴▾` + clavier `↑↓`). Activé sur
  ancres/cap ; **reste à activer** sur les sliders ADSR (Amp, A, D, S, R) et la
  fréquence libre si souhaité (terrain prêt, hors scope phase-1).
- N configurable par patch (de 2^0 à 2^9) — pédagogique : l'utilisateur
  pourrait voir/entendre l'effet du nombre d'harmoniques sur le timbre.
  Demande UI dédiée (slider + persistance + decision preset). Reporté
  comme projet séparé depuis l'iter J.
- Synthèse audio pro-grade via `AudioWorkletNode` — l'iter-J a éliminé
  les parasites à basse fréquence via DFT truncation, mais Web Audio
  `createPeriodicWave` montre toujours des limites à hautes fréquences :
  rolloff Nyquist progressif au lieu de cut net, scalloping FFT,
  amplitudes non-monotones à cause de l'aliasing résiduel et de
  l'interpolation wavetable, peaks décroissants à ≥ 13 kHz. Pour
  audio pro-grade ce serait un refactor majeur : synthèse custom
  sample-par-sample dans un AudioWorklet, avec anti-aliasing
  oversampled. Reste en backlog — l'usage actuel est acceptable
  pédagogiquement avec ces limites documentées (cf. décision archi
  "Limites Web Audio à haute fréquence — acceptées").
- D10 (18794 Hz, sous Nyquist) qui n'affiche rien en live malgré
  un signal audio actif — observation post iter-J, à creuser
  séparément si le sujet revient.
- Refonte système notes/durées : boutons au lieu de dropdowns pour
  note/octave, durées manquantes dans le sélecteur (blanche pointée,
  ronde pointée, double-pointées)
- Pause/reprise de lecture + curseur de lecture déplaçable par clic
  sur la timeline
- Bug intermittent : Ctrl+D déclenche parfois le bookmark navigateur
  malgré preventDefault (mode opératoire à reproduire)
- DynamicsCompressorNode sur master bus (protection clipping quand
  plusieurs pistes jouent simultanément, identifié en C.2)
- Loop : marqueurs de boucle, activation, affichage (rendu possible
  par le scheduler look-ahead de C.3)
