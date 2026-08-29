# Les photographies de la page d'accueil

Deux images, issues de **Pexels**, sous [licence Pexels](https://www.pexels.com/license/)
— usage commercial autorisé, attribution non exigée, modification autorisée.

| Fichier | Source | Sujet |
|---|---|---|
| `cuisine.jpg` | [pexels.com/photo/4253133](https://www.pexels.com/photo/4253133/) | Chef de cuisine au piano, cuisine professionnelle |
| `service.jpg` | [pexels.com/photo/5638732](https://www.pexels.com/photo/5638732/) | Bacs gastronormes en ligne de self |

Les **dessins au trait** du fond du héros ne sont pas ici : ils ont leur propre
fiche, `public/CREDITS.md`, parce que leur licence exige une attribution.

## Ce qui a été écarté, et pourquoi

Le héros a porté une photographie, puis n'en porte plus aucune. Un cuisinier
émincant des poireaux (`cuisine-preparation.jpg`, pexels 29062078) occupait cinq
colonnes à droite de l'accroche. Elle disait « alimentaire » et pas « logiciel »,
et surtout elle prenait la place du produit — qui se retrouvait renvoyé sous la
ligne de flottaison. Le premier écran montre désormais l'application dans une
tablette ; le fond est un lavis semé de dessins au trait. Le fichier est
supprimé : 189 ko servis pour rien est un défaut, pas une réserve.

Le héros portait un à-plat de raisins, mangue et asperges sur du marbre
(`pexels-photo-3987405`). Techniquement irréprochable, et faux : c'est le
vocabulaire d'un blog de cuisine saine, pas d'une cantine de trois cents
couverts. Une image de restauration collective montre du **volume** et de
l'**inox**, pas une nature morte.

La section « Ce que la loi demande » portait un panier de légumes
(`pexels-photo-5425794`). Retiré sans remplacement : il ne démontrait rien, et la
règle de la page est qu'un cadre n'entoure que ce qui est MONTRÉ — une capture
d'écran ou une preuve. Une section qui assène trois seuils légaux n'a rien à
gagner à les faire précéder d'une image d'ambiance.

Une vingtaine d'autres candidates ont été regardées et écartées : poignées de
main en costume, bureaux ouverts, tickets de caisse polonais, piles de livres.
Une recherche « factures » sur une banque d'images rend surtout cela.

## Pourquoi elles sont hébergées ici, et pas appelées chez Pexels

Servir ces images depuis `images.pexels.com` aurait été plus court à écrire.
C'est ce qu'on ne fait pas, pour une raison précise : chaque visiteur de la page
publique aurait alors transmis son adresse IP et son agent utilisateur à un tiers
américain, à la seule fin d'afficher une photographie.

Cela ferait de Pexels un **destinataire** au sens du règlement, donc une ligne de
plus au tableau de la section 6 de
`docs/juridique/03-politique-de-confidentialite.md`, laquelle affirme aujourd'hui
que le service ne dépose aucun traceur et ne cède aucune donnée. Pour un produit
dont l'objet est la conformité, l'échange serait mauvais : quelques kilo-octets
de dépôt contre une contradiction entre la page et ses propres mentions.

Hébergées ici, elles ne coûtent aucune requête vers l'extérieur, elles ne peuvent
pas disparaître, et elles passent par le même cache que le reste du site.

## Si l'une doit être remplacée

Prendre la variante compressée plutôt que l'originale — elles pèsent 120 à 190 ko
chacune, ce qui est déjà le budget d'une page d'accueil :

```
curl -sL "https://images.pexels.com/photos/<id>/pexels-photo-<id>.jpeg?auto=compress&cs=tinysrgb&w=1200" -o public/photos/<nom>.jpg
```

Et **la regarder avant de la publier**.

## L'image de partage n'est pas une photographie

`public/partage.png` est dessinée, pas photographiée, et elle se régénère par
`bun scripts/generer-og.ts`. Voir l'en-tête de ce script pour ce qu'elle doit
porter et les trois pièges de rendu qui ont coûté trois essais.
