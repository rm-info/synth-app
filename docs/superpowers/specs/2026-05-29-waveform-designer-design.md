# Spec — Itération Waveform : 3 modes de timbre, éditeur d'harmoniques, layout adaptatif

> Date : 2026-05-29
> Statut : spec validée (session de conception archi) — en attente de découpage en prompts d'implémentation par phase
> Origine : session de brainstorming archi du 2026-05-29 sur le cœur création de son. Absorbe les items backlog « N configurable par patch » et la dette terminologique FR/EN.

## 1. Objectif et motivation

Donner à l'utilisateur le **contrôle du contenu harmonique** d'un patch,
pour produire des timbres *maîtrisés* — proches d'instruments (dans les
limites du modèle) ou volontairement inattendus mais **propres**.

**Constat de départ (validé en usage)** : le dessin à main levée produit un
spectre large-bande dans les aigus (chaque coin dur / tremblement de la main =
harmoniques hautes en pagaille). Au-delà d'un certain bruit harmonique,
l'oreille ne distingue plus les timbres entre eux — ils sont tous « riches et
sales ». Le remède est unique : reprendre le contrôle des harmoniques.

**Vérité acoustique cadrante** : l'oreille entend le **spectre d'amplitude des
harmoniques**. Elle est sourde au reste (phase, polarité, offset DC, et tout
détail plus fin que la plus haute harmonique audible). Cette vérité oriente
toute l'itération : on passe d'un raisonnement « forme » à un raisonnement
« spectre ».

**Contexte collaboration** : la partie traitement du signal (Fourier, DFT,
échantillonnage, Nyquist) est difficile à conceptualiser même pour le porteur
du produit. Une **passe de documentation** sur ce cœur fait partie intégrante
de l'itération (cf. §9).

## 2. Décisions fondatrices (verrouillées)

1. **Monde A uniquement** : série harmonique, un seul oscillateur périodique
   (`PeriodicWave`). Partiels = multiples entiers de la fondamentale. Le
   **Monde B** (inharmonique, multi-oscillateurs, cloches/métal) est **hors
   scope** — il demande une autre architecture audio (cf. §11).
2. **Trois façons coexistantes de fabriquer un timbre** : dessin libre,
   points/spline, éditeur d'harmoniques (barres). Plus une **passerelle de
   conversion** entre représentations (cf. §5).
3. **Slider de définition** : troncature harmonique, qui nettoie un dessin
   *sans quitter la 2D* (cf. §6).
4. **Plafond d'harmoniques porté de 128 à 256** (cf. §3).
5. **Patch typé** par mode de fabrication (cf. §4).
6. **Layout 3 colonnes (A)** avec proportions adaptatives ; auto-sizing en
   option (cf. §7).
7. **Francisation** des libellés via chaînes centralisées (cf. §8).
8. **Passe doc** sur le cœur de la synthèse (cf. §9).

**Principe directeur UX** : *on ne force jamais*. Tout ajout est additif et
désactivable ; le dessin libre existant reste roi de son mode, inchangé.

## 3. Pipeline audio et passage à 256 harmoniques

### 3.1 Pipeline actuel (rappel)

```
dessin (600 points équidistants, CANVAS_WIDTH)
  → rééchantillonnage 600 → 256 (interpolation linéaire, NUM_SAMPLES)
  → FFT 256 (radix-2)
  → on garde k=0..128 (HALF_HARMONICS = 129), on jette k=129..255
  → createPeriodicWave(real, imag)
```

Les coefficients `k=129..255` sont le **miroir conjugué redondant** d'un signal
réel (`X[N−k] = conj(X[k])`), pas des hautes fréquences distinctes — leur
suppression est le fix anti-aliasing de l'iter-J. Conséquence : un
rééchantillonnage à 256 ne peut porter que **128 harmoniques distinctes**
(Nyquist). Le « cap 128 » est donc une conséquence directe de
`NUM_SAMPLES = 256`, pas un choix arbitraire.

### 3.2 Changement : 128 → 256 harmoniques

```
NUM_SAMPLES    : 256 → 512
HALF_HARMONICS : 129 → 257   (on garde k=0..256)
```

Rééchantillonner 600 → **512** (au lieu de 256), FFT 512, garder k=0..256 →
**256 harmoniques**.

**Justification** :
- Cohérence avec les 600 points du tracé : ceux-ci portent jusqu'à ~300
  harmoniques, dont le rééchantillonnage à 256 jette tout ce qui dépasse 128
  *avant même la DFT*. 512 en récupère la grande majorité.
- **Gain concret dans le grave** : le nombre d'harmoniques audibles ≈
  20000 / f0. Un G2 (~98 Hz) en a ~204 ; aujourd'hui on n'en livre que 128 →
  on écrête déjà la richesse des basses. Au-dessus de ~156 Hz, 128 suffisait
  déjà (le reste passe > 20 kHz) → aucun changement pour le médium/aigu.

**Coûts / risques** : FFT 512 au lieu de 256 (2× un calcul sub-milliseconde,
déjà mémoïsé par `WeakMap`) ; tableau de coefficients 129 → 257 floats
(négligeable) ; **les 600 points ne bougent pas**. Aucun risque d'aliasing
ajouté (l'oscillateur band-limite par pitch : les harmoniques > Nyquist ne sont
pas rendues au jeu). Seule conséquence : le son des patches **graves**
existants change légèrement (ils gagnent des harmoniques). Stade dev, aucun
utilisateur réel → **pas de migration**.

Le plafond 256 est partagé par : la synthèse, le spectrogramme statique, et N
de l'éditeur de barres / le slider de définition.

## 4. Modèle de données — Patch typé

Le `Patch` devient une **union discriminée** par un champ de mode de
fabrication du timbre, avec trois représentations :

- **`draw`** : `points` (600) + `definition` (M, troncature, cf. §6).
- **`spline`** : points d'ancrage + interpolation (`soft` Catmull-Rom /
  `hard` polyligne). Les points d'ancrage sont stockés (ré-éditables) ; la
  courbe 600 points en est dérivée.
- **`harmonic`** : vecteur d'**amplitudes** (longueur N ≤ 256) + `N`. Indices
  d'harmonique *relatifs* (indépendants de la hauteur). Phase non stockée
  (inaudible → reconstruction canonique).

Toutes les représentations convergent vers les **coefficients harmoniques**,
seule entrée réelle de `createPeriodicWave`. La forme d'onde temporelle visible
est, selon le mode, soit la donnée éditée (`draw`), soit une **reconstruction
par iDFT** (`harmonic`).

**Prérequis** : ce typage se fait dans la **Phase 1 de la migration TypeScript**
(typer `Patch`/`Clip`/`Track`/`Action`). Hydratation : clamp défensif des
indices/longueurs hors borne (cohérent avec l'invariant F.4.4.3).

## 5. Les trois modes de timbre + passerelle

| Mode | Édition | Sortie | Sonorité |
|---|---|---|---|
| **Dessin libre** | tracé 2D à main levée (existant, inchangé hors cap 256) | 256 harmoniques aux amplitudes *non contrôlées individuellement* | riche, vite « sale » sans le slider de définition |
| **Points / spline** | poser/déplacer des ancres ; `soft` (Catmull-Rom) ou `hard` (polyligne) | courbe lisse → peu d'aigus | **propre par construction**, « fun » 2D |
| **Harmoniques (barres)** | N barres, amplitude par harmonique ; bouton **N** (défaut ~16-24, max 256) | uniquement les harmoniques posées, reste à zéro | **propre par construction**, précis, pédagogique |

Le mode `spline` réutilise le **précédent d'interaction de l'éditeur ADSR**
(poignées draggables avec courbe recalculée) — ce n'est pas une moonshot.

**Passerelle de conversion** (action utilisateur explicite) :
- `draw`/`spline` → `harmonic` : DFT + troncature à N. **C'est l'opération de
  nettoyage** (« envoie mon dessin sale vers l'éditeur d'harmoniques »).
  Potentiellement avec perte (harmoniques > N et phase abandonnées).
- `harmonic` → `draw` : iDFT → points ré-éditables.

## 6. Le slider de définition

Troncature harmonique M/256 appliquée à la forme `draw` : « dessine sale →
glisse → propre », en regardant le spectro réagir. Réutilise le DFT/iDFT
existant. Champ `definition` (mode `draw`), plage 1..256. C'est la version *qui
reste en 2D* du nettoyage (la passerelle §5, elle, convertit vers le mode
barres). Le mode `spline` n'en a pas besoin (propre par construction) ; le mode
`harmonic` non plus (N joue ce rôle).

## 7. Layout : les 3 vues et leurs proportions

Moitié principale du Designer = **3 colonnes** : **Forme d'onde** /
**Harmoniques** / **Spectrogramme**.

- **Forme d'onde** : domaine temporel (vert).
- **Harmoniques** : indices relatifs, éditable en mode barres (bleu).
- **Spectrogramme** : **read-only**, Hz absolus, moniteur (statique DFT +
  live FFT) (ambre).
- **La vue éditable suit le mode** ; les autres deviennent des vues dérivées
  read-only (🔒).

**Empilement vertical écarté** (options C/D du brainstorming) : la hauteur
disponible = la précision de réglage d'amplitude (verticale), trop précieuse
pour être divisée par deux.

### 7.1 Proportions — auto OFF (défaut)

- Proportions = **état persisté**.
- **Défaut piloté par le mode d'édition** : dessin/spline → Forme d'onde large ;
  barres → Harmoniques large.
- **Boutons preset** : ⅓⅓⅓ · ½¼¼ · ¼½¼ · ¼¼½ (snap en un clic).
- **Séparateurs glissables** : override manuel. Le drag écrase le preset (même
  état), sans logique de transition.

### 7.2 Proportions — auto ON (opt-in, OFF par défaut, ESSAI à confirmer/jeter)

Mode automatique complet, **3 états contextuels stables** (un seul ratio
60/20/20 décliné) :

- focus **Forme d'onde** → 60-20-20
- focus **Harmoniques** → 20-60-20
- **repos / focus Spectro / sortie vers le clavier** → 20-20-60

Le repos favorise le spectro car, hors édition, on joue/écoute → c'est le
**live FFT** qui paie ; forme d'onde et harmoniques ne bougent pas pendant le
jeu. Le repos *est* l'état focus-spectro (pas de 4ᵉ état ; le ⅓⅓⅓ reste dispo
en manuel).

**Règles d'interaction (point de départ, à affiner au trial M.2)** :
- **Séparateurs = cibles de hit indépendantes** : `mousedown` sur la poignée
  démarre le drag (`stopPropagation`), ne déclenche jamais l'auto-resize.
- **Le clic qui *change* le focus ne fait que focuser, il n'édite pas** : amener
  une zone à 60 % ne doit pas, sur le même geste, éditer son contenu (sinon le
  contenu reflue sous le curseur). L'édition se fait une fois la zone à 60 %.
  Coût payé seulement au *changement* de zone, jamais en édition continue.
- **Sortie des zones** (clic hors des 3 vues : clavier, toolbar, sidebar) →
  retour au **repos 20-20-60**. C'est l'assumé de l'auto : *pas de pinning*. Pour
  figer une disposition, on repasse en manuel (auto OFF).

**Critère keep/drop** : on garde si ça accélère sans distraire ; on jette si le
whiplash de reflow > le confort, ou si l'édition des barres avec spectro
rétréci gêne. **Décision avant clôture d'itération.** L'auto se branche sur le
même état de proportions que §7.1 → le retirer = supprimer le toggle +
l'écouteur de focus, sans détricotage.

## 8. Francisation (groundwork) + i18n

Normaliser les libellés EN → FR via **chaînes centralisées** (même esprit que
la table `SHORTCUTS`), pas des littéraux dispersés — ce qui *sème* l'i18n.

- **Traduire** quand un terme FR établi existe : Designer→Création,
  Composer→Composition, Undo/Redo→Annuler/Rétablir, Mute→Sourdine,
  waveform→Forme d'onde, etc.
- **Garder + gloser au glossaire** les acronymes standards enseignés :
  **ADSR, BPM, Hz, A4, DFT/FFT** (les franciser serait plus déroutant).
- **« patch »** : gardé tel quel (ancré dans la culture synthé) + glose au
  glossaire.
- **Audit dev** préalable des termes EN présents (façon audit L.0).
- **i18n complet (multilingue)** → backlog.

Timing : groundwork **en tête d'itération**, pour que les nouveaux libellés
naissent déjà cohérents (Forme d'onde / Harmoniques / Définition…).

## 9. Documentation (livrable writer)

Passe doc sur le **cœur de la synthèse**, rédigée par l'agent writer :
- **Vulgarisation** : un son = somme de sons purs (idée de Fourier) ; ce qu'on
  entend quand on dessine.
- **Technique précise** : la **DFT en équation**, échantillonnage, Nyquist,
  pourquoi 256, le pipeline dessin → spectre.
- **Exercices ancrés sur la nouvelle UI** : ex. « dessine sur un G2 et regarde
  le spectro », comparaison G2 vs G6 (harmoniques audibles ≈ 20000/f0).
- Enrichir le **glossaire technique** : harmonique, série de Fourier, DFT/FFT,
  échantillonnage, Nyquist, période.

**Prérequis renderer** : la DFT s'écrit `X_k = Σ_{n=0}^{N−1} x_n · e^(−i2πkn/N)`
— une **somme à bornes empilées**, que le renderer math de L.R a *exclue* de son
scope. Il faut donc une **petite extension renderer** (`\sum` à bornes en
display), fidèle au critère « formules comme au tableau ».

## 10. Découpage en phases

Cette itération = **Iteration M (Waveform)** dans la numérotation du projet
(A…L livrées). Phases M.1 → M.5b.

**Préalable** : TS **Phase 0 + 1** (setup `tsconfig` + typage du modèle) +
**francisation groundwork**. Cf. la décision archi « migration TS incrémentale,
avant l'itération G perf ».

| Phase | Contenu | Poids |
|---|---|---|
| **M.1** | Bump cap **128→256** (resample 600→512) + **slider de définition** (troncature M/256) sur le dessin libre. | Léger |
| **M.2** | **Layout A** (3 colonnes ; état de proportions : défaut-par-mode + presets + drag ; **toggle auto-sizing** OFF, en essai) + **patch typé** (draw/harmonic) + **éditeur de barres Harmoniques** + N + **passerelle** de conversion. | Lourd |
| **M.3** | **Mode points/spline** (soft Catmull-Rom / hard polyligne), via le précédent ADSR-poignées. | Moyen |
| **M.4** | **Presets** (évocateurs d'instruments + inattendus-propres), vecteurs de coefficients et/ou formes. | Léger |
| **M.5a** | Extension renderer math : `\sum` à bornes empilées. | Léger |
| **M.5b** | Passe doc « le cœur de la synthèse » (writer), ancrée sur la nouvelle UI. | Moyen |

M.1 est volontairement détaché et premier (dé-risquage : valide l'UX « 2D fun +
propre » au coût le plus bas avant la refonte structurelle M.2). La doc (M.5b)
vient en dernier pour pouvoir pointer la vraie UI.

## 11. Hors scope

- **Inharmonique / Monde B** (partiels à ratios non entiers, multi-oscillateurs).
- **Morph A↔B** (interpolation entre deux formes, spectre évolutif).
- **Toggles miroir H/V** (inaudibles : préservent les amplitudes harmoniques).
- **> 600 points** de tracé (déjà rééchantillonnés à 512 en aval — sans effet
  audible).

## 12. Backlog issu de la session

- **i18n / multilingue complet**.
- **Auto-sizing au focus** : confirmer ou jeter avant clôture (cf. §7.2).
- **Itération « timbres riches / évolutifs »** (future) : Monde B inharmonique
  + morph A↔B (les deux chemins vers cloches/métal et spectres évolutifs).

## 13. Risques et points de vigilance

- **Perf Designer** : chaque vue/redraw et le reflow au resize ajoutent de la
  pression CPU sur un Designer déjà fragile (clics à l'attaque). À corréler avec
  la future itération G perf. L'auto-sizing (reflows fréquents) est le poste le
  plus à surveiller — d'où le trial.
- **Changement de son des patches graves** avec le cap 256 (stade dev → OK).
- **Dépendance d'ordre** : la migration TS (modèle typé) doit précéder M.2/M.3.
- **Ré-éditabilité du spline** : stocker les points d'ancrage, pas seulement la
  courbe dérivée.
- **Hit area des séparateurs** : assez large pour être visée sans rater (sinon
  conflit avec le clic-de-focus en mode auto).
