# Test du renderer Markdown

Ce fichier exerce **toutes les fonctionnalités** du sous-ensemble V1
supporté par le renderer maison, **plus** les nouveautés de l'itération U
(ids de titre `{#id}`, liens profonds `doc:article#fragment`, accordéon
`<Details>`, illustration SVG). Il sert à valider à l'œil le rendu avant
de livrer du contenu rédigé. À retirer (du dossier et de l'index) en fin
d'**itération U**, comme l'édition précédente l'avait été en L.5.

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

Et voici un paragraphe plus long, qui s'étire sur plusieurs lignes pour
vérifier le `line-height` et la largeur de colonne (capée à 72ch pour
rester lisible sans avoir à balayer toute la fenêtre des yeux). La
justification reste à gauche, sans tirets en bout de ligne.

## Listes

Liste non ordonnée :

- Premier item, court.
- Deuxième item, avec un peu plus de texte pour voir si la deuxième ligne
  s'aligne proprement sur la première.
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
3. Troisième étape, avec un **mot en gras** et un *mot en italique* pour
   vérifier que les inlines fonctionnent dans les items.

## Emphase et inlines

Texte normal, *texte en italique*, **texte en gras**, et même ***italique
gras combinés*** — parsés comme un gras contenant un italique imbriqué.

Un peu de `code inline` au milieu d'un paragraphe pour identifier un
identifiant technique comme `clipFrequency()` ou la clé `synth-app-state`.

## Liens externes et DocLink

Lien externe vers [la doc MDN sur Web Audio](https://developer.mozilla.org/fr/docs/Web/API/Web_Audio_API)
— il doit s'ouvrir dans un nouvel onglet (`target=_blank` automatique).

DocLink cross-onglet **valide** :
<DocLink target="composer:composer-copy-button">Copier (Composer)</DocLink>
— bascule sur le Composer + halo temporaire sur le bouton Copier.

DocLink avec ancre **introuvable** :
<DocLink target="composer:zzz-inexistant">ancre inexistante</DocLink>
— bascule sur le Composer mais aucun halo (no-op gracieux + warn dev).

## Liens profonds doc: (itération U) {#liens-profonds}

Quatre cas à vérifier à la main :

- Lien doc→doc **sans fragment** (cross-article) :
  [Guide : le Designer](doc:guide-designer) — ouvre l'article sans quitter
  l'onglet, restauration de scroll session habituelle.
- Lien **vers son propre contenu** (fragment, même article) :
  [aller à la cible interne ↓](doc:_renderer-test#cible-interne) — scroll
  fluide vers le titre ciblé plus bas + flash de surbrillance.
- Lien **vers ce titre-ci** depuis le bas de l'article (cf. section
  « Combinaison finale ») — remonte ici avec flash.
- Fragment **inexistant** :
  [fragment manquant](doc:_renderer-test#nope-pas-de-titre) — ouverture en
  haut d'article, zéro erreur console.

> Note : un lien profond cross-article **avec** fragment ne sera
> pleinement exerçable qu'en U.3, quand les articles squelettes porteront
> leurs propres `{#id}`. Le chemin scroll + flash est validé ici par le
> lien « vers son propre contenu » (même code, sans la bascule d'article).

## Accordéon (itération U)

Un `<Details>` replié par défaut. Ouvre-le : son contenu est du markdown
complet — formule en bloc, liste, lien.

<Details title="Sous le capot : harmoniques d'un son périodique">
Un son périodique se décompose en **partiels** dont les fréquences sont
des multiples entiers de la fondamentale :

$$f_k = k \times f_0$$

avec :

- $k$ = rang de l'harmonique (1 = fondamentale)
- $f_0$ = fréquence fondamentale, en $Hz$

Pour aller plus loin : [Guide : le Designer](doc:guide-designer).
</Details>

Le paragraphe qui suit l'accordéon doit rester collé au rythme normal,
sans saut de scroll quand on replie le bloc.

## Bloc de citation

> Une citation tient ici sur quelques lignes. Le style est en italique
> gris, avec une bordure gauche colorée à l'accent.

## Bloc de code

Un bloc avec langage `js` :

```js
function hello(name) {
  return `Bonjour ${name}, bienvenue dans Synth App.`
}
```

Un bloc sans langage (texte brut) :

```
synth-app-state        // clé localStorage
synth-app-doc-session  // clé sessionStorage de la lecture
```

## Illustration SVG (itération U)

Convention : les SVG vivent dans `public/docs/` et sont référencés en URL
absolue `/docs/nom.svg` (fond transparent, tons médians lisibles sur les
deux thèmes). Schéma de démonstration :

![Sinusoïde annotée : une période et son amplitude](/docs/sinusoide-annotee.svg)

L'image doit être centrée, bornée à la largeur de la colonne, lisible en
thème clair comme en thème sombre.

## Formules

Support math maison (pas de KaTeX). La quinte juste a un ratio de $3:2$,
et le demi-ton du tempérament égal vaut $2^{1/12}$, soit environ $1,0595$.

Constructs à vérifier :

- Exposant : $2^{1/12}$. Indice : $a_{0}$.
- Fraction empilée : $\frac{3}{2}$.
- Imbrication : $\frac{a^{2}}{b}$.
- Délimiteurs extensibles : $(\frac{3}{2})^{12}$. Crochets : $[\frac{a}{b}]$.
- Symboles : $\pi$, $\approx$, $\times$, $\pm$, $\geq$.

Formule en bloc (centrée) :

$$f = a4 \times 2^{(n/12)}$$

## Cible interne {#cible-interne}

**Tu es arrivé ici via un lien profond** (`doc:_renderer-test#cible-interne`).
Ce titre porte un id explicite `{#cible-interne}` ; le suffixe ne doit pas
apparaître dans le texte affiché, et le heading doit s'être positionné en
haut de la zone de contenu avec un flash.

## Combinaison finale

Pour finir, un paragraphe qui combine **gras**, *italique*, `code`,
[lien externe](https://github.com/rm-info/synth-app), un
<DocLink target="composer:composer-paste-button">DocLink vers Coller
(Composer)</DocLink>, et un retour [vers les liens profonds ↑](doc:_renderer-test#liens-profonds)
— pour vérifier que tous les tokens cohabitent sans s'interférer.
