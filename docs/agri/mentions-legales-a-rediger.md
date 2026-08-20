# CGU et politique de confidentialité : à rédiger

**Statut au 20 août 2026 : les textes hérités ont été supprimés, rien ne les
remplace encore. C'est délibéré.**

## Pourquoi ils ont été supprimés

`src/lib/content/terms.ts` et `privacy.ts` contenaient les conditions de Fleet.
Trois défauts, dont chacun suffit à les rendre inutilisables :

1. **En anglais**, pour un marché français et une loi française.
2. **Pour un autre produit** : dix-huit mentions de véhicules, de conducteurs, de
   flotte et d'un « Agent Concierge IA ».
3. **Pour une société qui n'existe pas** : elles se présentent comme celles d'une
   SASU immatriculée à Paris, alors que le plan prévoit une micro-entreprise en
   année 1 et une bascule en SASU en année 2.

Les garder aurait été pire que de n'avoir rien : un client qui accepte des
conditions décrivant une location de véhicules n'a rien accepté d'utile, et
l'incohérence se retourne contre nous au premier litige.

## Ce que les nouveaux textes doivent contenir

Ce n'est pas à écrire sans avocat. Le [prévisionnel](business-plan/06-previsionnel-financier.md)
budgète 250 € pour cette rédaction, section 4.

Les clauses non négociables, déjà arrêtées :

- **Obligation de moyens, jamais de résultat.** La formulation exacte est dans le
  doc 06, section 8.3, et elle est déjà dans le produit sous forme de code
  (`src/lib/convex/egalim/mentions.ts`), couverte par un test.
- **Limitation de responsabilité** plafonnée aux sommes versées sur les douze
  derniers mois.
- **Confidentialité des factures.** Ce sont les données commerciales les plus
  sensibles du client : prix négociés, volumes, fournisseurs. C'est aussi un
  argument de vente, pas seulement une contrainte.
- **La table de classification globale et anonyme.** `productLabels` ne contient
  qu'un libellé et son verdict, jamais de montant, de fournisseur, d'organisation
  ni d'utilisateur. Cette formulation doit figurer telle quelle : c'est ce qui rend
  l'effet de réseau du produit opposable sans exposer un client à un autre.

Détail et questions à poser : doc 06, sections 8.3 à 8.6.

## Conséquence pratique

Les routes `/cgu` et `/confidentialite` n'existent pas. Elles seront nécessaires
avant la première facture encaissée, parce que Paddle les exige. Ce n'est pas
bloquant pour développer, ça l'est pour vendre.
