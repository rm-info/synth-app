# BACKLOG.md — Synth App

> Suivi des idées, pistes et dettes techniques reportées.
> Tenu par l'archi. Source de vérité pour ce qui n'est pas encore planifié.
> Dernière mise à jour : 2026-04-25.

## État global de l'itération F (réf. CONTEXT.md pour le détail)

Itération F (multi-tempérament) **majoritairement livrée**. Le registre
`tuningSystems.js` héberge 14 systèmes (12-TET, Pythag-12, Just-major-c,
Mésotonique 1/4-comma, Werckmeister III, 24-TET équipartite, Maqâmât
Cairo 1932 mesuré, 5-TET, 31-EDO, Slendro, Pelog, shrutis Bhatkhande,
shrutis Sarngadeva, free). Quatre layouts clavier dédiés (piano-12,
grid-24, grid-5, grid-7, grid-22-bhatkhande, grid-22-sarngadeva,
grid-31). Visual cues passifs (catalogue universel en cents + halo
magenta `is-cued`) sur 8 systèmes. Persistance Designer cohérente
(F.4.4.3) et guards transverses navigateur (F.7.5).

**Reste à faire en F** : F.8 (X-EDO paramétrique) puis dette UI
dropdown catégorisée par tradition.

## Prochaines pistes probables (ordre indicatif)

1. **F.8 — X-EDO paramétrique** (planifié, design layout adaptatif en
   cours par l'archi).
2. **Dette UI dropdown catégorisée par tradition** (post-F.8, le
   dropdown atteindra 13-15 entrées et sa lisibilité plate
   commence à frotter).
3. **Itération G — Performance Designer** (clics résiduels post-E.9
   probablement liés à `PeriodicWave` non mémoïsée + cost
   d'infrastructure au démarrage à chaud — diagnostic à faire avant
   optimisation).
4. **Backlog général** ci-dessous, à piocher selon priorité ressentie.

---

## Itération F — Reste à faire et candidats futurs

### F.8 X-EDO paramétrique (planifié, design en cours)

Entrée registre `'x-edo'` paramétrée par un X variable choisi par
l'utilisateur entre 1 et 40 (40 = max maintenable sur QWERTY en
gardant toutes les notes accessibles au clavier). Une seule entrée
registre, layout adaptatif selon la valeur de X.

- **État** : `editor.xEdoX` (number, 1..40), `clip.xEdoX` (number,
  optionnel — valable seulement si `clip.tuningSystem === 'x-edo'`).
  Persistés alongside les autres champs `editor.test*`. Cohérent avec
  l'invariant F.4.4.3 (clamp défensif à l'hydratation pour indices
  hors borne).
- **Anchorage** : degré 0 oct 4 = a4Ref (cohérent 5-TET, 31-EDO,
  gamelan, shrutis).
- **Layout adaptatif** : design en cours par l'archi. Plages
  pressenties — X=1 trivial (1 cellule = octaves seules), X∈[2,7]
  ligne unique, X∈[8,14] deux rangs avec escalier 1/2, X∈[15,32]
  3-4 rangs en escalier façon grid-31 généralisé, X∈[33,40] 4 rangs
  pleins.
- **QWERTY** : parcours déterministe des touches selon X (Z-row 7,
  A-row 9, Q-row 10, digit row 10, ponctuations à risque pour
  atteindre 40).
- **Visual cues** : désactivés par défaut (le sens des patterns
  dépend de X, pas pédagogique sans calibration). Activable
  conditionnellement plus tard (X=12, 24, 31) si la demande émerge.
- **UI** : input numérique X dans la toolbar Composer (à côté de A4),
  visible quand `testTuningSystem === 'x-edo'`. Pattern à la
  BpmInput / A4Input (validation différée, ↑↓ ±1, Shift ±5).
- **Suppressions associées** : drop des entrées `'5-tet'` et `'31-edo'`
  du registre (acoustiquement redondantes une fois X-EDO en place).
  Pas de migration localStorage (stade dev, aucun utilisateur réel
  impacté). Composants Grid5Layout et Grid31Layout **conservés**
  (Slendro réutilise grid-5 ; Grid31Layout potentiellement réutilisable
  comme cas interne de X-EDO X=31).

### Dette UI : dropdown catégorisé par tradition

Le dropdown des tempéraments a 14 entrées actuellement (15 avec X-EDO
ajouté en F.8). Au-delà de 12-13, la liste plate devient peu lisible.
Solution simple : `optgroup` HTML par catégorie sémantique. Coût
implé faible, bénéfice immédiat.

Catégories pressenties :
- **Égaux occidentaux** : 12-TET
- **Justes** : just-major-c
- **Historiques européens** : pythagorean-12, meantone-quarter-comma,
  werckmeister-iii
- **Maqâmât** : 24-tet-equal (théorique Cairo 1932), 24-tet-cairo-1932
  (mesuré)
- **Gamelan** : slendro, pelog
- **Indiens** : shrutis-bhatkhande, shrutis-sarngadeva
- **Expérimental paramétrique** : x-edo
- **Libre** : free

Bénéfice double : (1) lisibilité dropdown ; (2) **affordance
d'enseignement** — le prof voit la structure du domaine d'un coup
d'œil. C'est plus qu'un gain UI, c'est de la pédagogie embarquée.

### Tempéraments candidats futurs (priorité moyenne)

À réintégrer si la demande émerge :

- **53-EDO** (Holder XVIIe siècle, Mercator). Approxime quasi-parfaitement
  la juste intonation et le pythagoricien. Layout très large (53
  cellules) — design non-trivial, dépasse la capacité QWERTY 40 keys.
  À reconsidérer post-F.8 si X-EDO ne couvre pas le besoin (X-EDO max
  est 40).
- **22-EDO Erlich** (xenharmonique théorique XXe). Aucune tradition
  culturelle (le mythe "shrutis indiens = 22-EDO" debunké en
  conversation). Couvert par X-EDO X=22 ; entrée distincte seulement
  si quelqu'un réclame le label spécifique.
- **Bharata reconstructed shrutis** : 3e framework indien historique.
  Reconstruction académique divergente selon les auteurs (Sambamoorthy,
  Daniélou, Lewis Rowell) — shippable seulement avec citation explicite
  du reconstructeur. Bénéfice pédagogique marginal vs Bhatkhande +
  Sarngadeva déjà présents.
- **17-EDO** : a une histoire arabe théorique (Safi al-Din al-Urmawi,
  XIIIe). Pas joué historiquement mais étudié dans les manuscrits.
  Couvert par X-EDO X=17.
- **19-EDO** : tempérament intermédiaire entre méantone 1/4-comma et
  12-TET. Salinas XVIe siècle, Yasser XXe. Couvert par X-EDO X=19.
- **Slendro / Pelog autres accordages** : Yogyakarta (vs Surakarta
  actuel), variations Sumarsam ou Tenzer. Chaque ensemble gamelan
  ayant sa micro-variante, ajouter une entrée registre par accordage
  spécifique si demande. La référence actuelle (Surakarta,
  Surjodiningrat 1972) couvre l'usage générique.

### Modes expérimentaux (à designer ultérieurement)

- **Série harmonique custom** : l'utilisateur entre des ratios libres
  pour un système de N notes. Distinct de `'free'` (mode Hz arbitraire)
  — proche conceptuellement de X-EDO mais avec ratios non-équipartis.
- **Fibonacci tuning** : positions à intervalles fibonacciens.
- **Nombres premiers tuning** : positions à intervalles basés sur les
  nombres premiers.
- **Alien tuning** : générateur aléatoire avec seed reproductible.
  Pour exploration créative pure.

Ces modes sont des spécialisations de "système avec table de cents
arbitraire" — architecturalement faisable mais demande une UI
d'édition de la table. Idéal pour une session pédagogique
"construis ton propre système".

### Gestion humble des systèmes sous-documentés

Traditions pour lesquelles la littérature accessible est fragmentaire
(Aztèque / Maya, aborigène australien, pré-colonial africain, etc.).

- **Ne pas inventer** (principe codifié en F.6 et F.7) : on commit à
  une référence documentée explicite avec source citable, sinon on
  n'ajoute pas. Précédents : Cairo 1932 (aly-abbara.com), Surakarta
  (Surjodiningrat 1972), shrutis (Bhatkhande 1909-1932 et Sangita
  Ratnakara via Te Nijenhuis 1974 / Rowell 1992).
- Mécanisme **import custom** (ratios / cents définis par l'utilisateur,
  cf. Modes expérimentaux ci-dessus) utilisable comme contournement
  pour les traditions non-représentables aujourd'hui faute de source.

### Features transverses sur les tempéraments

- **Noms culturels en hover/tooltip** : afficher les noms natifs au
  survol — sa/re/ga/ma/pa/dha/ni (indiens), barang/gulu/dada/lima/nem
  (Slendro), ji/ro/lu/pat/mo/nem/pi (Pelog), Yakah/Ushayran/Iraq/Sika
  (maqâmat). Couche optionnelle complétant les labels romains/arabes
  de base. Demande un nouveau pattern tooltip cross-layout (similaire
  à AdsrTooltip de F.3.13.2 mais pour les cellules clavier).
- **Visual cues gamelan-spécifiques** : Pathet Nem / Sanga / Manyura
  pour Slendro, Pathet Lima / Nem pour Pelog ; ou Pelog Bem / Pelog
  Barang comme sous-ensembles 5 notes des 7 Pelog. Catalogue dédié
  par système, sélectable en parallèle des cues classiques.
- **Visual cues indien-spécifiques** : ragas (Bhairav, Yaman, Kafi,
  Bhairavi, Khamaj…) avec sous-ensembles de shrutis surlignés.
  Catalogue dédié, parallèle aux cues classiques.
- **Visual cues "compositionnel actif" (Saveur B)** : sélection
  multi-clic par l'utilisateur sur le clavier pour bookmarker
  visuellement un accord ou gamme custom. Reporté de F.4.4 — à
  rouvrir si l'usage utilisateur le justifie (saveur A — bibliothèque
  pédagogique passive — semble couvrir la majorité des cas).
- **Catalogue visual cues éditable user-defined** : permettre à
  l'utilisateur d'ajouter ses propres patterns au catalogue. UI
  d'édition (cents ou intervalles), persistance custom dans
  localStorage.
- **Multiples patterns simultanés** : afficher 2-3 patterns ensemble
  avec des halos de couleurs distinctes (triade majeure + septième
  dominante + gamme) pour démonstrations harmoniques riches.
  Aujourd'hui un seul pattern à la fois.
- **Repères en Composer et PropertiesPanel** : les visual cues
  n'apparaissent que dans le clavier Designer. Étendre aux
  PropertiesPanel (mono et multi) et au Composer pour cohérence
  cross-vue.

### Anchorage configurable

Aujourd'hui chaque système ancre la fréquence selon une convention
implicite (A pour 12-TET et compagnie, deg 0 pour 5-TET / 31-EDO /
gamelan / shrutis / X-EDO). Pour les systèmes sans A, l'utilisateur
ne peut pas choisir un autre degré comme tonique de référence sans
calculer manuellement un a4Ref adapté.

Petit ajout possible : champ **"anchor degree"** configurable par
système (par défaut = convention actuelle). Surcharge utilisateur
pour les systèmes sans A. Friction marginale aujourd'hui, à ajouter
si quelqu'un en exprime le besoin réel en classe.

### Questions de design F encore ouvertes

- **Affichage A4 dans la toolbar** : actuellement libellé "A4 = X Hz"
  même quand le système courant n'a pas d'A (5-TET, 31-EDO, gamelan,
  shrutis, X-EDO à venir). Pas trompeur en pratique (l'utilisateur
  comprend "hauteur de référence"), mais pourrait gagner un libellé
  conditionnel ("Hauteur de référence" pour les systèmes sans A,
  "A4" pour les autres). Lié à l'item "Anchorage configurable"
  ci-dessus.

---

## Backlog général (hors itération F)

### Qualité audio

- **Anti-aliasing / harmoniques parasites** sur basses fréquences
  (identifié via spectrogramme sur triangle C1). Piste : oversampling
  + filtre passe-bas, ou synthèse limitée en bande (BLIT / PolyBLEP).
- **DynamicsCompressorNode sur master bus** (protection clipping
  quand plusieurs pistes jouent simultanément, identifié en C.2).

### Performance audio (itération G potentielle)

Observations 2026-04-21 / 2026-04-22 : qualité variable selon machine.
- **Composer** (scheduler look-ahead) : globalement fluide sur toutes
  les machines testées, y compris multipiste. Quelques craquements
  épars historiques sur machine faible (Xubuntu) jugés mineurs.
- **Designer** (clavier live polyphonique) : plus dégradé sur
  Xubuntu. E.8 + E.9 n'ont pas réduit les clics perçus dans le
  Designer, ce qui confirme qu'ils ont une cause distincte des
  discontinuités de signal ciblées par ces phases.
- **Hypothèses Designer** (post E.9) :
  - **Cost d'infrastructure au démarrage à chaud** : le Composer
    schedule à `now + lookAhead` (100ms d'avance), ce qui laisse au
    navigateur le temps de router le graph audio et compiler la
    `PeriodicWave`. Le Designer start à `now` — ces coûts se paient
    pendant l'attaque et produisent un hoquet perçu comme un clic.
  - **`PeriodicWave` non mémoïsée par patch** : si
    `pointsToPeriodicWave(points, ctx)` est rappelée à chaque
    `playInstrumentNote`, la DFT 256 harmoniques bloque le main
    thread quelques ms à chaque key press. À mémoïser
    (clé = patch.id + version des points) pour n'appeler qu'une
    fois par patch.
  - **`AnalyserNode` + oscilloscope** qui tape en
    `requestAnimationFrame` pendant les attaques, ajoute de la
    pression CPU.
- **Diagnostic à faire en G** avant optimisation : Chrome/FF
  DevTools Performance sur Xubuntu, identifier la source dominante
  (GC, PeriodicWave, re-renders, dérive setInterval).
- Optimisations candidates (priorité à réévaluer après diagnostic) :
  - **Mémoïsation `PeriodicWave`** par patch → probable gain Designer.
  - **Pool d'oscillators** (réutilisation) → réduit GC pressure.
  - **Pré-warm du graph audio** au passage en Designer ou à la
    sélection d'un patch → absorbe le cost d'infrastructure avant
    la première note.
  - **React.memo** + découplage curseur Timeline.
  - **DFT dans Web Worker** (si la mémoïsation ne suffit pas).
  - **Migration Timeline DOM → Canvas**.
- Si insuffisant : AudioWorklet + synthèse bandlimited (BLIT/PolyBLEP)
  — résout aussi l'anti-aliasing.
- PWA / Service Worker : pas un gain audio direct, mais permet
  l'installation offline pour contourner les variations navigateur.

### Tenue des notes (Designer) — clics résiduels après E.9

Historique :
- E.8 a fixé le clic de coupure nette sur appui bref (rampe release
  qui partait de 0).
- E.9 a ajouté MIN_ATTACK (fade-in minimum) + RETRIGGER_FADE
  (micro-fade-out voice-stealing).
- **Reste non résolu** : le clic à la naissance d'une voix dans le
  Designer (appui bref ou non) et le clic de retrigger sustain,
  inchangés après E.9 sur Xubuntu.

Interprétation archi : ces clics ne sont probablement pas des
discontinuités de signal (puisque les fixes qui les ciblent n'ont
pas d'effet) mais des **pauses CPU ponctuelles** à l'attaque.
Voir "Performance audio" ci-dessus pour les pistes. À traiter en G
avec un diagnostic profiling.

### Lecture / transport

- **Pause/reprise** de lecture (actuellement stop = retour à 0).
- **Curseur déplaçable** par clic sur la timeline.
- **Loop** : marqueurs de début/fin, activation, affichage — faisable
  maintenant que le scheduler look-ahead est en place (C.3).

### Spectrogramme avancé

- Toggle dB / linéaire.
- Zoom (X et/ou Y).
- FFT temps réel pendant la lecture (AnalyserNode déjà exposé).
- Affichage post-ADSR (spectre effectif de la voix jouée, pas juste
  la forme d'onde).

### UX / thème

- Toggle thème clair / sombre.
- Améliorations contrastes (passe 2).
- Section stats (nb mesures, nb clips, durée totale).

### Aide à l'utilisation (session dédiée)

**Découvrabilité des raccourcis** : beaucoup de raccourcis clavier
sont en place mais ne sont pas visibles pour un nouveau venu (↑↓
demi-ton, Shift+↑↓ octave, ←→ beat, Ctrl+C/X/V, Ctrl+D split,
Ctrl+M merge, touches note mappées QWERTY par système, NumPad/Shift+
Digit pour les durées, Espace sustain, Shift/Ctrl seul pour octave,
clic droit menus, etc.). Pistes possibles à trancher en session :
- Panneau d'aide toggleable (icône `?` + overlay listant tous les
  raccourcis contextuels selon l'onglet).
- Tour guidé au premier démarrage (skippable).
- Affichage des raccourcis en légende dans chaque menu contextuel /
  bouton (texte secondaire).
- Cheat sheet imprimable (utile pour usage classe — le prof peut
  distribuer).

### Matériel pédagogique (session dédiée)

Transformer l'app en véritable outil pédagogique (sans casser son
usage actuel de création libre). Pistes :
- **Tooltips explicatifs** sur les éléments techniques :
  qu'est-ce qu'un harmonique, un ADSR, un tempérament, un comma,
  une période de blanche, etc. Activables ou permanents selon le
  mode.
- **Glossaire intégré** pour les termes spécialisés (forme d'onde,
  DFT, quinte pure, comma syntonique vs pythagoricien, EDO,
  méantone, shruti, maqâm, raga, etc.).
- **Démonstrations pré-chargées** : petites compos types illustrant
  un concept (une gamme majeure, une quinte pure vs tempérée, les
  formes d'onde de base, la triade pure en 31-EDO vs 12-TET, le
  comma enharmonique en méantone, etc.).
- **Exercices guidés** : "reproduis ce son", "trouve la tierce
  majeure", "compose une cadence V-I"… à discuter avec le prof
  utilisateur pour cadrer le curriculum.
- **Tooltips dédiés aux tempéraments** : courte description
  contextuelle de chaque système au survol du label dropdown
  (origine historique, particularité acoustique).

### Système de modes (à discuter)

Question ouverte : comment concilier un outil de création libre
(utilisateur avancé) et un outil pédagogique (élève découvrant) ?

Options à discuter :
- **Un seul mode, tooltips toujours disponibles** (toggle global
  "aides visibles") — simple, peu intrusif.
- **Deux modes distincts** : "Découverte" (tooltips, curriculum,
  UI simplifiée ?) vs "Création" (tout débloqué, pas de
  hand-holding). Risque : UI divergent, maintenance doublée.
- **Progression** : l'app débloque des features au fur et à
  mesure que l'utilisateur les utilise (Duolingo-style). Trop
  ambitieux pour l'état actuel du projet.

Décision à prendre avec feedback du prof utilisateur (cf. context
pédagogique) avant de coder. Le bon choix dépend de l'usage réel
en classe.

### Performance / stockage

- **Migration timeline DOM → Canvas** (perf à grand nombre de clips).
  Seuil à mesurer avant de décider.
- **Optimisation stockage localStorage** : résolution points (600 →
  200 ?), quantification, ou migration IndexedDB.

### Interactions diverses

- Bouton **"Vider la banque"** (avec undo).
- Flèches haut/bas dans `FreqInput` pour incréments fins.
- **Annulation drag par Échap** (selon ressenti utilisateur).
- **Édition précise amplitude + ADSR** dans le Designer. Aujourd'hui
  ces paramètres sont pilotés par sliders (amplitude) et poignées
  draggables (ADSR visuel). Ajouter des inputs texte précis à côté,
  même pattern que `FreqInput` en mode Libre : saisie au clavier,
  validation différée, fourchette claire (0-1 pour amplitude/sustain,
  0-1000 ms pour attack/hold/decay/release). Utile quand on veut
  reproduire un son spécifique ou comparer deux patches au cent de
  près.
- **Flèches haut/bas dans NumberInput** (sliders ADSR : Amp, A, H, D,
  S, R) pour incréments fins, sur le modèle de A4Input/BpmInput.

### Effets et modulations (enrichissement sonore)

Aujourd'hui un patch = forme d'onde + amplitude + AHDSR. Tout le reste
(modulations, effets) est absent. Grosse marge de richesse sonore à
gagner, tout en restant 100% Web Audio natif (nodes existants
suffisent pour 80% du catalogue).

**Modulations temporelles** (probablement *par patch*) :
- **Vibrato** : LFO sur la fréquence de l'oscillator. Params : rate
  (Hz), depth (cents), délai avant activation.
- **Trémolo** : LFO sur le GainNode. Params : rate, depth, forme du
  LFO.
- **Pitch envelope** : enveloppe dédiée sur la fréquence (attack →
  settle), utile pour les attaques percussives (drums tonaux, bass
  synth).

**Effets spectraux** (probablement *par patch*) :
- **Filtre** : `BiquadFilterNode` (lowpass / highpass / bandpass /
  notch). Params : cutoff, résonance (Q), type.
- **Enveloppe de filtre** : ADSR dédié sur cutoff (au-delà de l'ADSR
  d'amplitude). L'effet "waouw" classique des synthés soustractifs.
- **Distorsion / saturation** : `WaveShaperNode` + courbe de clipping
  (soft / hard / fold). Params : drive, mix.

**Effets temporels** (probablement *par piste* ou *global*) :
- **Delay / écho** : `DelayNode` + feedback loop. Params : time (ms
  ou synchro tempo), feedback, mix wet/dry.
- **Reverb** : `ConvolverNode` + impulse response. IR synthétique
  générée (simple room / hall) ou lib d'IRs fournies.
- **Chorus** : delays courts modulés par LFO.
- **Flanger** : delay très court modulé, fort feedback.

**Effets de mixage** (par piste) :
- **Pan stéréo** : `StereoPannerNode`. Aujourd'hui tout est centré.
- **Compresseur par piste** : en complément du master bus déjà
  backloggé.

**Questions de design à trancher** :
- Niveau d'application (patch / piste / global) : sûrement un mix
  des trois. Modulations et filtres → patch ; delay/reverb → piste ;
  master → global.
- UI : rack d'effets vertical dans le Designer (pour les modulations) ?
  Rack par piste dans le Composer (pour delay/reverb/pan) ?
- Persistance : extension du modèle `Patch` (modulations, filtre) et
  ajout d'un champ `trackEffects` sur `Track`.
- **Impact perf** : chaque effet = des nodes Web Audio en plus. À
  corréler avec l'itération G perf (Designer souffre déjà).
- Ordre d'implémentation probable : vibrato/trémolo (simples, gros
  impact perçu) → filtre + env. filtre (changement radical de
  palette) → delay/reverb (bonheur de mixage) → chorus/distorsion/
  autres.

### Notation / solfège

- **Mode "expert" durées** : les combinaisons ×1.25 et les pointés /
  double-pointés sur durées très courtes sont actuellement grisées.
  Un toggle pourrait lever la contrainte pour les utilisateurs
  avancés.
- **Refonte système notes/durées** : boutons au lieu de dropdowns
  pour note/octave, durées manquantes dans le sélecteur (blanche
  pointée, ronde pointée, double-pointées).

---

## Bugs connus non résolus

- **Ctrl+D déclenche parfois le bookmark navigateur** malgré
  `preventDefault` (reproduction intermittente, mode opératoire à
  documenter quand observé). NOTE_GUARD_KEYS de F.7.5 ne couvre pas
  KeyD car le shortcut est Ctrl+D et on laisse passer Ctrl/Meta —
  c'est un cas spécifique qui demanderait une exception ciblée.

(Note : l'ancienne entrée "Firefox raccourcis pendant drag (en cours
de fix en phase 7.1)" référençait le QuickFind sur ' / Digit4 et ses
variantes, fix initialement en F.3.6 et généralisé transversalement
en F.7.5 via la guard NOTE_GUARD_KEYS partagée. Plus de bug actif sur
ce point.)

---

## Reportés explicitement (décision prise)

- **Piano roll** (lanes = hauteurs de note au lieu de polyphonie).
  Mentionné pendant la réflexion E.3. Reporté car refonte UI majeure ;
  pourrait justifier sa propre itération. À reconsidérer si le besoin
  remonte côté utilisateur.
- **"Piste active" et "patch actif"** comme notions explicites de
  l'UI. Écarté pour E (confusion avec la sélection existante).
  Pourrait revenir si le besoin se fait sentir — typiquement pour
  piloter le placement contigu au clavier sur une piste précise sans
  sélection préalable.
