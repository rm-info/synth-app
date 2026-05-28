# Consigne writer — Corrections articles fondateurs (about, why-12-notes)

Deux corrections ciblées sur des articles déjà livrés, identifiées
à la validation archi. Petite passe — tu ne touches qu'aux deux
passages indiqués, le reste des articles est validé.

## Correction 1 — DocLink mort (`why-12-notes.md`)

Le DocLink de clôture cible `composer:composer-tuning-system-selector`,
**une ancre qui n'existe pas** (au clic : bascule sur Composer puis
rien). La seule ancre de sélecteur de système est
`designer-system-selector` (onglet Designer).

Corrige **deux choses** :

1. **La cible** : `target="designer:designer-system-selector"`.
2. **Le texte autour** : il parle de "rejouer un même clip dans une
   autre grille" (geste Composer), mais on pointe maintenant le
   Designer. Réoriente vers le geste le plus simple pour un nouveau
   venu : choisir un système et jouer au clavier de test.

Passage actuel (≈ lignes 123-127) :

> L'app te propose de les essayer.
> `<DocLink target="composer:composer-tuning-system-selector">Changer`
> `de système musical</DocLink>` et rejouer un même clip dans une
> autre grille suffit à entendre, concrètement, ce que ce "choix
> de douze" laisse de côté.

Remplacement proposé (ajuste le ton si besoin, mais garde la cible
`designer:designer-system-selector`) :

> L'app te propose de les essayer.
> `<DocLink target="designer:designer-system-selector">Choisis un autre`
> `système musical</DocLink>` dans le Designer, joue au clavier, et
> tu entendras concrètement ce que ce "choix de douze" laisse de côté.

## Correction 2 — Passage accessibilité (`about.md`)

Le passage sur les personnes sourdes et aveugles est honnête mais
son ton peut se lire comme cavalier (la légèreté semble viser les
personnes exclues plutôt que les concepteurs). On garde la candeur,
on déplace l'autodérision vers "nous", et on finit en invitation.

Passage actuel (section "Philosophie", ≈ lignes 13-19) :

> L'app a la prétention d'être pensée pour tout type de public :
> prof qui illustre un concept en classe, élève qui découvre par
> l'oreille, amateur autodidacte, simple curieux. À deux
> exceptions près, par construction : les personnes sourdes et
> les personnes aveugles, pour qui un instrument qui se dessine
> à l'œil et s'écoute à l'oreille n'a plus tellement de sens.
> On en est bien désolé.

Remplacement (validé par l'archi) :

> L'app a la prétention d'être pensée pour tout type de public :
> prof qui illustre un concept, élève qui découvre par l'oreille,
> amateur autodidacte, simple curieux. Avec une limite qu'on assume
> faute d'avoir su la lever : un instrument qui se dessine à l'œil
> et s'écoute à l'oreille laisse forcément de côté qui ne voit pas
> ou n'entend pas. On n'a pas trouvé mieux — si tu as une idée, le
> repo est ouvert.

## Livraison

- Édite uniquement ces deux passages.
- Commit(s) : `docs(iter-L/phase-5-redaction): corrections articles (DocLink + accessibilité)`
  (ou deux commits séparés si tu préfères).
- Push.

## Hors scope

- Le reste des deux articles (validé).
- Les autres contenus L.5 (glossaires en cours, fiches/articles à
  venir).
