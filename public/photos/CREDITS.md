# Les photographies de la page d'accueil

Trois images, toutes issues de **Pexels**, sous [licence Pexels](https://www.pexels.com/license/)
— usage commercial autorisé, attribution non exigée, modification autorisée.

| Fichier | Source | Sujet |
|---|---|---|
| `produits-frais.jpg` | [pexels.com/photo/3987405](https://www.pexels.com/photo/3987405/) | Fruits et légumes frais sur un plan de marbre |
| `cagette.jpg` | [pexels.com/photo/5425794](https://www.pexels.com/photo/5425794/) | Panier de légumes de saison sur une table en bois |
| `cuisine.jpg` | [pexels.com/photo/4253133](https://www.pexels.com/photo/4253133/) | Chef de cuisine au piano, cuisine professionnelle |

## Pourquoi elles sont hébergées ici, et pas appelées chez Pexels

Servir ces images depuis `images.pexels.com` aurait été plus simple et plus court à écrire. C'est
ce qu'on ne fait pas, pour une raison précise : chaque visiteur de la page publique aurait alors
transmis son adresse IP et son agent utilisateur à un tiers américain, à la seule fin d'afficher
une photographie de légumes.

Cela ferait de Pexels un **destinataire** au sens du règlement, donc une ligne de plus au tableau
de la section 6 de `docs/juridique/03-politique-de-confidentialite.md`, laquelle affirme
aujourd'hui que le service ne dépose aucun traceur et ne cède aucune donnée. Pour un produit dont
l'objet est la conformité, l'échange serait mauvais : quelques kilo-octets de dépôt contre une
contradiction entre la page et ses propres mentions.

Hébergées ici, elles ne coûtent aucune requête vers l'extérieur, elles ne peuvent pas disparaître,
et elles passent par le même cache que le reste du site.

## Si l'une doit être remplacée

Prendre la variante compressée plutôt que l'originale — elles pèsent 120 à 180 ko chacune, ce qui
est déjà le budget d'une page d'accueil :

```
curl -sL "https://images.pexels.com/photos/<id>/pexels-photo-<id>.jpeg?auto=compress&cs=tinysrgb&w=1200" -o public/photos/<nom>.jpg
```

Et **la regarder avant de la publier**. Une recherche « factures » sur une banque d'images rend
surtout des poignées de main et des tickets de caisse polonais ; les trois retenues ici l'ont été
après en avoir écarté une vingtaine.
