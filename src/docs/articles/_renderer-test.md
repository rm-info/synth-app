# Test du renderer Markdown

Ce fichier exerce **toutes les fonctionnalités** du sous-ensemble V1
supporté par le renderer maison. Il sert à valider à l'œil le rendu
typographique avant de livrer du contenu rédigé. À retirer (du dossier
et de l'index) en L.5 quand les vrais articles sont en place.

## Titres

Tu lis du H1 et du H2. Voici un H3 et un H4 :

### Sous-section H3

Avec un peu de texte d'accompagnement pour vérifier que l'espacement
avec le titre ci-dessus reste confortable.

#### Sous-sous-section H4

Le H4 sert aux notes secondaires : il est volontairement plus discret,
en petites capitales gris secondaire.

## Paragraphes

Voici un paragraphe court.

Et voici un paragraphe plus long, qui s'étire sur plusieurs lignes
pour vérifier le `line-height` et la largeur de colonne (capée à 72ch
pour rester lisible sans avoir à balayer toute la fenêtre des yeux).
La justification reste à gauche, sans tirets en bout de ligne — pas
de rivière typographique à corriger.

## Listes

Liste non ordonnée :

- Premier item, court.
- Deuxième item, avec un peu plus de texte pour voir si la deuxième
  ligne s'aligne proprement sur la première (indent visuel hérité du
  padding-left).
- Troisième item.

Imbrication simple :

- Catégorie A
  - sous-item A.1
  - sous-item A.2
- Catégorie B
- Catégorie C

Liste ordonnée :

1. Première étape.
2. Deuxième étape.
3. Troisième étape, avec un **mot en gras** et un *mot en italique*
   pour vérifier que les inlines fonctionnent dans les items.

## Emphase et inlines

Texte normal, *texte en italique*, **texte en gras**, et même
***italique gras combinés*** — qui en V1 sont parsés comme un gras
contenant un italique imbriqué (suffisant pour l'usage).

Un peu de `code inline` au milieu d'un paragraphe pour identifier un
identifiant technique comme `clipFrequency()` ou la clé localStorage
`synth-app-state`.

## Liens

Lien externe vers [la doc MDN sur Web Audio](https://developer.mozilla.org/fr/docs/Web/API/Web_Audio_API)
— il doit s'ouvrir dans un nouvel onglet (target=_blank automatique).

Lien interne sous forme de `<DocLink>` :
<DocLink target="composer:composer-paste-button">Coller (Composer)</DocLink>
— depuis L.3 il est actif : clic = bascule sur le Composer + halo
temporaire sur le bouton Coller.

## Navigation interne (L.3)

Quatre cas à vérifier à la main (les deux cas « cassés » ne doivent
**rien** faire, avec un `console.warn` visible en dev uniquement) :

- DocLink cross-onglet **valide** :
  <DocLink target="composer:composer-copy-button">Copier (Composer)</DocLink>
  — bascule sur le Composer, scroll + halo sur le bouton Copier.
- DocLink avec ancre **introuvable** :
  <DocLink target="composer:zzz-inexistant">ancre inexistante</DocLink>
  — bascule sur le Composer mais aucun halo (no-op gracieux + warn dev).
- Lien doc→doc **valide** : [À propos](doc:about) — ouvre l'article
  « À propos » sans quitter l'onglet Documentation.
- Lien doc→doc **cassé** : [article inexistant](doc:nope) — ne navigue
  pas (no-op + warn dev).

## Bloc de citation

> Une citation tient ici sur quelques lignes. Le style est en italique
> gris, avec une bordure gauche colorée à l'accent. Utile pour mettre
> en avant une définition, une remarque, ou une note d'attention.

## Bloc de code

Un bloc avec langage `js` :

```js
function hello(name) {
  return `Bonjour ${name}, bienvenue dans Synth App.`
}
```

Un bloc sans langage (texte brut) :

```
synth-app-state    // clé localStorage
synth-app-doc-session // clé sessionStorage de la lecture
```

## Image

Image en SVG inline (data URI) pour rester self-contained :

![Carré dégradé orange-violet](data:image/svg+xml;utf8,<svg%20xmlns='http://www.w3.org/2000/svg'%20width='64'%20height='64'><defs><linearGradient%20id='g'%20x1='0'%20y1='0'%20x2='1'%20y2='1'><stop%20offset='0'%20stop-color='%23ff8a3d'/><stop%20offset='1'%20stop-color='%237a5cff'/></linearGradient></defs><rect%20width='64'%20height='64'%20fill='url%28%23g%29'/></svg>)

Tu dois voir un petit carré 64×64 dégradé orange → violet ci-dessus.

## Formules (L.R)

Support math maison (pas de KaTeX). En contexte réel : la quinte juste a
un ratio de $3:2$, et le demi-ton du tempérament égal vaut $2^{1/12}$,
soit environ $1,0595$ — l'écart à la quinte pythagoricienne reste $\leq$
un comma. Les lettres dans les formules sont en italique ; *celles-ci*,
hors `$`, suivent l'emphase Markdown normale.

Constructs à vérifier à l'œil :

- Exposant : $2^{1/12}$ (le « 1/12 » doit être en exposant sur le 2).
- Indice : $a_{0}$ (le « 0 » en indice).
- Fraction empilée : $\frac{3}{2}$ (3 sur 2, barre horizontale).
- Imbrication : $\frac{a^{2}}{b}$ (exposant dans le numérateur, lettres
  $a$ et $b$ en italique).
- Délimiteurs extensibles : $(\frac{3}{2})^{12}$ — les parenthèses doivent
  s'agrandir à la hauteur de la fraction (pas des parenthèses minuscules à
  côté). Crochets : $[\frac{a}{b}]$. Parenthèses **sur une ligne** (pas de
  fraction) : $(n/12)$ reste en glyphes normaux, $2^{(n/12)}$ aussi.
- Symboles Unicode : $\pi$, $\approx$, $\times$, $\div$, $\pm$, $\geq$.
- Commande inconnue : $\foo$ — doit s'afficher littéralement « \foo »
  (fallback gracieux + `console.warn` visible en dev uniquement, aucun
  crash).

Formule en bloc (centrée, légèrement agrandie) :

$$f = a4 \times 2^{(n/12)}$$

La même en multi-ligne (ouverture/fermeture sur leurs propres lignes) :

$$
\frac{f}{a4} = 2^{(n/12)}
$$

## Combinaison finale

Pour finir, un paragraphe qui combine **gras**, *italique*, `code`,
[lien externe](https://github.com/rm-info/synth-app), et même un
<DocLink target="designer:designer-keyboard">DocLink vers le clavier
Designer</DocLink> au milieu de la phrase, pour vérifier que tous
les tokens cohabitent sans s'interférer.
