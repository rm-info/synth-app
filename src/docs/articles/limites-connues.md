# Limites connues

Une app honnête dit aussi ce qu'elle ne fait pas. Voici les limites
assumées du périmètre actuel — rien de bloquant, mais autant les
connaître. Certaines pourront tomber dans de futures versions.

## Synthèse et qualité audio

La forme d'onde que tu dessines est échantillonnée sur 600 points,
puis synthétisée à partir de ses 256 premiers
[harmoniques](doc:glossaire-technique). C'est largement assez pour
des timbres riches, mais cela pose deux limites :

- les détails plus fins que cette résolution sont lissés ;
- dans l'extrême aigu, la synthèse peut produire quelques partiels
  parasites (un effet de repliement, ou *aliasing*), surtout sur des
  formes très anguleuses. Ce n'est audible que dans des cas
  particuliers.

## Performance

Tout tourne dans ton navigateur, sans serveur : la fluidité dépend
donc de ta machine. Le Composer reste fluide même en multipiste ; le
clavier live du Designer, lui, peut produire de discrets micro-clics
à l'attaque sur une machine modeste. Rien de grave, mais c'est plus
honnête de le signaler.

## Périmètre audio

- **Son mono** : pas de stéréo ni de panoramique pour l'instant —
  tout est centré.
- **Synthèse uniquement** : l'app fabrique ses sons par le dessin.
  Elle ne lit pas de fichiers audio externes et n'a pas d'entrée
  MIDI.
- **Pistes** : jusqu'à seize pistes par composition.

## Stockage

Tes patches et compositions vivent dans le stockage local de ton
navigateur, sur cette machine seulement. Il n'y a ni compte ni
cloud : effacer les données du site, ou changer de navigateur, te
fait perdre ton travail. Pense à exporter ce qui compte — tes
patches au format `.osa`, tes compositions en WAV.
