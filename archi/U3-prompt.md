# Prompt U.3 — Couverture complète : articles par module, ancres manquantes, registre complet

## Contexte

Itération U « Documentation utilisateur de la Création », phase 3.
U.1 (socle renderer) et U.2 (mode Info, registre amorcé sur 16 entrées
→ `guide-designer`) sont livrées. U.3 déploie la **couverture
complète** de l'onglet Création :

1. **7 articles squelettes** par module dans une nouvelle section TOC
   « La Création en détail » — structure et faits posés par le dev, la
   prose viendra du writer en U.4 ;
2. les **`data-anchor` manquants** sur les contrôles logiques non
   encore ancrés (~18) ;
3. le **registre `DOC_TARGETS` complet**, avec **remap** des 16 entrées
   U.2 vers les nouveaux articles (`guide-designer` redevient un pur
   survol narratif — sa couture vers les articles détaillés sera faite
   par le writer en U.4, **n'y touche pas**, ses `{#id}` posés en U.2
   restent sans consommateur, c'est voulu).

Granularité inchangée : **contrôle logique** (un graphe et ses
poignées = une cible ; un switch segmenté = une cible). Les poignées,
boutons individuels d'un même groupe, tooltips et états de drag se
documentent **dans la prose** de la section, pas par des badges
séparés.

**Aucun changement de modèle de données métier, d'audio, ni du
parser markdown.**

## Spec fonctionnelle

### 1. Articles squelettes — section TOC « La Création en détail »

Nouvelle section TOC, placée après « Prise en main ». 7 articles
(fichiers `src/docs/articles/`, entrées `DOC_TOC`) :

| Fichier | Titre TOC |
|---|---|
| `creation-atelier.md` | L'atelier : barre d'outils, actions, écoute |
| `creation-forme-onde.md` | Le module Forme d'onde |
| `creation-harmoniques.md` | Le module Harmoniques |
| `creation-spectrogramme.md` | Le module Spectrogramme |
| `creation-instrument.md` | Le module Instrument |
| `creation-enveloppe.md` | Le module Enveloppe |
| `creation-effets.md` | Le module Effets |

**Format d'une section squelette** (un contrôle logique = un heading) :

```markdown
## Libellé du contrôle {#id-stable}

Une à trois phrases factuelles, neutres, exactes — ce que fait le
contrôle, ses bornes, son unité. Pas de prose pédagogique (writer U.4).

<Details title="Sous le capot">
Optionnel : faits techniques bruts utiles au writer (formule, mapping
Web Audio, contrainte). Omettre le bloc s'il n'y a rien de solide.
</Details>

*→ <DocLink target="designer:ancre-du-controle">Voir dans l'app</DocLink>*
```

- Chaque article ouvre sur un `# Titre` + **une ligne italique
  provisoire** « *Version provisoire — rédaction en cours.* » (retirée
  en U.4).
- Les faits doivent être **vérifiés dans le code** (bornes, unités,
  défauts — `CONTEXT.md` et les sources font foi). Un squelette faux
  est pire qu'un squelette vide.
- Pas d'accordéon vide, pas de section sans contrôle réel.

### 2. Ancres à poser (nouveaux `data-anchor`)

Précédent à suivre pour les items d'OverflowToolbar :
`designer-presets-button` (l'ancre vit sur l'item dans ses deux rendus
bar/tray ; `getAnchoredPosition` résout l'instance visible). Item dans
le tiroir `⋯` fermé → pas de badge, c'est le comportement voulu.

| Nouvelle ancre | Contrôle | Où |
|---|---|---|
| `designer-patch-name` | nom du patch en cours | DesignerToolbar |
| `designer-equalize-button` | Égaliser les rangées | DesignerToolbar (desktop) |
| `designer-module-switcher` | switcher de modules | DesignerToolbar (mobile) |
| `designer-miniplayer` | transport d'écoute | MiniPlayer |
| `designer-lens-toggle` | toggle Libre↔Ancres | header Forme d'onde |
| `designer-interp-toggle` | switch Doux/Anguleux | header Forme d'onde |
| `designer-anchor-count` | stepper Nombre d'ancres | header Forme d'onde |
| `designer-normalize-button` | Normaliser | header Forme d'onde |
| `designer-smooth-buttons` | les 2 boutons de lissage (groupe) | header Forme d'onde |
| `designer-cap-stepper` | stepper plafond d'harmoniques | header Harmoniques |
| `designer-spectro-mode` | switch Direct/Statique | header Spectrogramme |
| `designer-spectro-db` | échelle dB | header Spectrogramme |
| `designer-spectro-peakhold` | Peak hold | header Spectrogramme |
| `designer-visual-cues` | repères visuels gammes/accords | Instrument |
| `designer-free-frequency` | slider + input fréquence (mode Libre) | Instrument |
| `designer-adsr-view-toggle` | toggle graphe↔sliders (compact) | header Enveloppe |
| `designer-effect-<clé>` | racine du sous-bloc de chaque effet (9 : `vibrato`, `tremolo`, `auto-pan`, `pitch-env`, `filter`, `filter-env`, `wah`, `distortion`, `drive-env`) | corps Effets |

Ajuste un nom si le code le contredit, mais reste sur ce schéma. Les
ancres des sous-blocs Effets : un seul est visible à la fois
(`effectsSelected`) → un seul badge, automatique.

### 3. Registre `DOC_TARGETS` complet

Mapping cible (✓ = ancre existante ; les entrées U.2 vers
`guide-designer#…` sont **remplacées** par celles-ci) :

**`creation-atelier`** : `designer-patch-name` → `#nom-du-patch` ·
✓`designer-presets-button` → `#timbres-presets` ·
✓`designer-reset-button` → `#reinitialiser` ·
`designer-equalize-button` → `#egaliser-rangees` ·
`designer-module-switcher` → `#switcher-modules` ·
✓`global-undo-button-designer` et ✓`global-redo-button-designer` →
`#annuler-retablir` (deux entrées, même fragment) ·
✓`designer-new-button` → `#nouveau-patch` ·
✓`designer-save-button` → `#enregistrer` ·
✓`designer-save-as-button` → `#enregistrer-sous` ·
`designer-miniplayer` → `#ecouter`.
Prévois aussi une section **sans badge** `#gerer-les-modules`
(réduire/agrandir/maximiser — les chromes sont 6 instances, pas de
cible unique : section atteignable par liens seulement).

**`creation-forme-onde`** : ✓`designer-waveform` → `#dessiner` ·
`designer-lens-toggle` → `#libre-ancres` · `designer-interp-toggle` →
`#doux-anguleux` · `designer-anchor-count` → `#nombre-ancres` ·
`designer-normalize-button` → `#normaliser` · `designer-smooth-buttons`
→ `#lissage`.

**`creation-harmoniques`** : ✓`designer-harmonics` →
`#barres-harmoniques` · `designer-cap-stepper` →
`#plafond-harmoniques`.

**`creation-spectrogramme`** : ✓`designer-spectrogram` →
`#lire-le-spectrogramme` · `designer-spectro-mode` → `#direct-statique`
· `designer-spectro-db` → `#echelle-db` · `designer-spectro-peakhold` →
`#peak-hold`.

**`creation-instrument`** : ✓`designer-system-selector` →
`#systeme-musical` · ✓`designer-keyboard` → `#clavier` ·
✓`designer-octave-selector` → `#octaves` · `designer-visual-cues` →
`#reperes-visuels` · `designer-free-frequency` et
✓`designer-test-free-button` → `#mode-libre` (deux entrées, même
fragment).

**`creation-enveloppe`** : ✓`designer-adsr` → `#enveloppe-ahdsr` ·
✓`designer-amplitude` → `#amplitude` · ✓`designer-sustain-pastille` →
`#sustain` · `designer-adsr-view-toggle` → `#vues`.

**`creation-effets`** : ✓`designer-modulation` → `#choisir-un-effet`
(le switcher du header) · les 9 `designer-effect-<clé>` → `#vibrato`,
`#tremolo`, `#auto-pan`, `#hauteur`, `#filtre`, `#env-filtre`, `#wah`,
`#disto`, `#env-drive`.

**Bibliothèque (bonus à coût marginal)** : les ancres `library-*`
existantes (~13) gagnent des entrées `contexts: ['library',
'designer']` (le PatchBank est partagé sidebar Création / onglet
Bibliothèque) pointant vers **`guide-bibliotheque`** : ajoute des
`{#id}` à ses headings existants (suffixe invisible, **prose
intouchée** — précédent U.2) et mappe au mieux ; pas de section
pertinente → entrée **sans fragment**. Ne crée pas de nouvel article ni
de nouvelle section dans guide-bibliotheque.

**Règle modales** : les contrôles vivant dans une modale (réglages
système, PresetPicker…) n'ont **jamais** de badge (le mode Info est
gaté modale-ouverte) — ils se documentent dans la prose de la section
parente (`#systeme-musical`, `#timbres-presets`).

## Découpage en sous-commits

1. `feat(iter-U/phase-3.1): articles squelettes « La Création en
   détail » (7 articles + section TOC)` — fichiers + DOC_TOC, liens
   DocLink de retour vers les ancres (y compris celles posées en 3.2 —
   si tu préfères, inverse 3.1/3.2).
2. `feat(iter-U/phase-3.2): data-anchor manquants sur la Création
   (~18)` — table ci-dessus, pattern OverflowToolbar respecté.
3. `feat(iter-U/phase-3.3): DOC_TARGETS complet + remap vers les
   articles par module + entrées Bibliothèque` — remap des 16 entrées
   U.2, nouvelles entrées, `{#id}` dans guide-bibliotheque.
4. `docs: CONTEXT.md — Iteration U phase 3 (couverture mode Info)`
   (+ historique `CONTEXT-ARCHIVE.md`).

## Comportement attendu

- Ctrl+I sur la Création, desktop large, tout déplié : ~30 badges, un
  par contrôle logique visible, aucun chevauchement au repos
  (pastilles icône-seule), chacun mène à **sa** section (scroll +
  flash sur le bon heading, jamais le haut d'article sauf entrées sans
  fragment).
- Module Effets : un badge sur le switcher d'effets + un badge sur le
  panneau visible ; changer d'effet sélectionné puis rouvrir Ctrl+I →
  le badge du panneau suit et mène à la bonne section.
- Modules repliés / items dans le tiroir `⋯` / mobile (switcher) :
  seuls les contrôles réellement visibles ont leur badge.
- Mode Libre vs système-based (Instrument) : les badges suivent les
  contrôles affichés (`#mode-libre` vs `#clavier`/`#octaves`).
- Chaque section squelette a son lien de retour qui ramène sur la
  Création avec halo sur le bon contrôle (boucle complète).
- Onglet Bibliothèque : Ctrl+I montre les badges `library-*` → sections
  de guide-bibliotheque (plus de message « bientôt » sur cet onglet).
- Les 16 cibles U.2 ne pointent plus vers `guide-designer` ; son
  contenu est strictement inchangé (diff vide hors rien du tout).
- `npx tsc --noEmit` et lint propres ; aucun warn DEV de fragment
  introuvable en cliquant chaque badge (auto-contrôle : chaque `doc:`
  du registre doit résoudre).

## Hors scope (U.3)

- **Toute prose pédagogique** : vulgarisation, « pourquoi », analogies,
  contenu des accordéons au-delà des faits bruts — writer (U.4), brief
  séparé.
- Adaptation de `guide-designer.md` (couture porte d'entrée → U.4) et
  de tout article existant (hors `{#id}` dans guide-bibliotheque).
- Illustrations SVG des articles (writer/U.4 ; le pipeline est prêt).
- Badges par touche du clavier ou par poignée de graphe (composites
  per-key : non).
- Couverture Composition / Documentation (itération ou phase
  ultérieure).
- Tour guidé (gros morceau suivant).

## Validation manuelle suggérée

Desktop > 1100 tout déplié (compter les badges, cliquer chacun une
fois) ; 924–1100 (auto-collapse : badges réduits en conséquence) ;
mobile < 924 module par module ; module Effets sur les 9 panneaux ;
Instrument en Libre et en système-based ; onglet Bibliothèque ;
les deux thèmes ; `_renderer-test.md` toujours sain.
