# Le paiement, par Paddle

Paddle encaisse les abonnements de Letikette en vendeur de registre : il émet la facture, collecte
la TVA du pays du client et garde la carte. Nos serveurs ne voient jamais un moyen de paiement.

**Rien ne s'ouvre tant que deux choses ne sont pas réunies sur un déploiement Convex** : les
variables Paddle, et `PADDLE_FACTURATION_OUVERTE=oui`. Sans elles, tout le produit reste ouvert
et l'écran Compte › Abonnement dit qu'aucun paiement n'est encore encaissé.

Le code :

- `src/lib/paiement/paddle.ts` : la logique pure (environnement lu sur la clé, signature des
  rappels, sceau de l'établissement, lecture des événements, catalogue attendu), testée.
- `src/lib/convex/paddle.ts` : la caisse (`caisse`), les rappels (`/paddle-webhook`), le portail
  client (`getPortalUrl`).
- `src/lib/convex/paddleCatalogue.ts` : crée le catalogue d'après la grille.
- `src/lib/convex/billing.ts` : `paiementOuvert` et le plan effectif.
- `src/app/caisse-paddle.ts` et `src/screens/compte/facturation.tsx` : l'écran.

## Comment ça marche

La grille (`src/lib/config/tarifs.ts`) : **Découverte** gratuite (on voit ce qu'on vous doit,
rien ne part), puis **Solo**, **Équipe** et **Pro**, au mois ou à l'année (dix mois). Trente jours
d'essai, la carte enregistrée, 0 € le premier jour. Voir
`docs/superpowers/specs/2026-10-14-pricing-abonnements.md`.

1. Un administrateur touche « Choisir ma formule » (Compte › Abonnement, ou l'étape « Les
   relances » des premiers pas) : la page de choix montre la frise de l'essai, le rythme et les
   trois formules (`ChoixDeFormule`).
2. Le serveur rend les prix rangés dans `prixPaddle`, ceux **avec** essai si l'établissement et
   le compte n'en ont jamais eu (`essaiDisponible`), et l'identifiant de l'établissement
   **scellé** par un HMAC sous `PADDLE_WEBHOOK_SECRET`.
3. Paddle.js se charge à ce moment-là et ouvre le paiement en surimpression, chez Paddle.
4. Paddle rappelle `/paddle-webhook`. Le rappel vérifie la signature, puis le sceau, et inscrit
   la formule, le rythme, la fin de l'essai, le prochain prélèvement et une résiliation
   programmée. L'écran se met à jour seul ; la surimpression de Paddle se ferme et notre coche
   de réussite prend la suite.
5. « Carte et factures, chez Paddle » ouvre le portail client.

Le jeton côté client est public par nature : n'importe qui peut ouvrir un paiement avec nos prix.
Le sceau empêche qu'un tel paiement se pose sur un établissement qui n'est pas le sien.

## 1. Le bac à sable, sur le déploiement de dev

Le déploiement Convex de développement (`knowing-bee-911`) parle au bac à sable, la production
(`insightful-crow-128`) au compte live. Un déploiement, un environnement.

Dans [sandbox-vendors.paddle.com](https://sandbox-vendors.paddle.com) :

1. **Developer Tools › Authentication › API keys** : une clé avec la lecture et l'écriture des
   produits et des prix, la lecture des clients et des abonnements, et la création de sessions du
   portail client. Elle commence par `pdl_sdbx_`.
2. **Developer Tools › Authentication › Client-side tokens** : un jeton. Il commence par `test_`.
3. **Developer Tools › Notifications › New destination** :
   - adresse : `https://knowing-bee-911.convex.site/paddle-webhook` ;
   - événements : `subscription.created`, `subscription.activated`, `subscription.updated`,
     `subscription.past_due`, `subscription.paused`, `subscription.resumed`,
     `subscription.canceled`, `transaction.completed` ;
   - recopier la **clé secrète** de la destination (« Secret key », elle commence par
     `pdl_ntfset_`). ⚠️ Pas son identifiant, qui commence par `ntfset_` et fait 33 caractères :
     avec lui, chaque rappel est refusé (401). Elle se relit en ouvrant la destination.
4. **Checkout › Checkout settings › Default payment link** : `https://www.letikette.com/app/compte`.
   ⚠️ Le tableau de bord refuse localhost (« Enter a valid link »), même en bac à sable ; le bac à
   sable ne vérifie pas le domaine, et le paiement s'ouvre quand même depuis localhost. Ce lien ne
   sert qu'aux liens de paiement que Paddle envoie lui-même (`?_ptxn=…`).
5. Si Paddle refuse la catégorie fiscale « saas » à l'étape 7, l'activer sur le compte (ou la
   demander au support de Paddle).

Puis, dans un terminal, sans jamais coller ces valeurs ailleurs :

```bash
npx convex env set PADDLE_API_KEY pdl_sdbx_…
npx convex env set PADDLE_CLIENT_TOKEN test_…
npx convex env set PADDLE_WEBHOOK_SECRET pdl_ntfset_…
```

6. **Lire** ce que le compte contient déjà :

```bash
npx convex run paddleCatalogue:catalogue
```

7. **Créer** les trois produits et les douze prix d'après la grille (`src/lib/config/tarifs.ts`,
   hors taxes, en euros, l'essai de trente jours porté par six d'entre eux). Les identifiants
   se rangent seuls dans la table `prixPaddle` : aucune variable à poser.

```bash
npx convex run paddleCatalogue:catalogue '{"creer":true}'
```

8. **Ouvrir** la facturation sur le déploiement de dev :

```bash
npx convex env set PADDLE_FACTURATION_OUVERTE oui
```

9. **Essayer** : Compte › Abonnement, « Choisir ma formule », la carte de test de Paddle
   `4242 4242 4242 4242` (date future, CVC `100`). L'écran doit passer « Essai, 30 j » en
   quelques secondes, avec la date du premier prélèvement. Les rappels se relisent dans
   Developer Tools › Notifications › la destination › Logs.

   ⚠️ **Un compte qui a eu l'essai d'avant le 14/10/2026 ne revoit pas d'essai** : son
   `hasUsedFreeTrial` est vrai, la caisse lui propose les prix sans essai (prélevés tout de
   suite, en bac à sable). Pour voir le parcours d'essai, créer un nouveau compte.

## 2. Le compte live, sur la production

Mêmes étapes dans [vendors.paddle.com](https://vendors.paddle.com), avec `--prod` sur chaque
commande et l'adresse `https://insightful-crow-128.convex.site/paddle-webhook`. Les clés
commencent par `pdl_live_` et `live_`.

**Ne pas poser `PADDLE_FACTURATION_OUVERTE` en production avant** que Paddle ait vérifié le compte
et approuvé le domaine : tant qu'elle manque, les clés live peuvent être posées sans rien changer
pour personne. La poser, c'est faire entrer en vigueur la grille : Découverte pour qui n'a rien
choisi (rien ne part, personne ne s'invite), les limites de chaque formule pour les autres.

À faire dans le tableau de bord live, que l'API ne fait pas :

- **Checkout › Checkout configuration › Payment methods** : les moyens de paiement proposés.
- **Checkout › Checkout configuration › Default payment link** : `https://www.letikette.com/app/compte`.
  Un domaine approuvé, jamais localhost, sinon les paiements live échouent.
- **My account › Settings › Website approval** : soumettre `www.letikette.com`.
- **Business account › Payouts › Payout settings** : les coordonnées bancaires.

## 3. L'ouverture, dans cet ordre

1. Le compte live vérifié, le domaine approuvé, le catalogue créé en production, un paiement de
   test passé de bout en bout sur la production avec une vraie carte, puis remboursé.
2. **Prévenir les comptes qui existent** : l'écran leur a promis « nous revenons vers vous avant
   toute facturation », et l'article 16 des conditions annonce une modification trente jours
   avant. D'abord la lecture seule, qui dit combien d'établissements seront prévenus et jusqu'à
   quelle date :

   ```bash
   npx convex run --prod ouvertureFacturation:prevenir
   ```

   puis l'envoi. Chaque établissement sans abonnement reçoit **trente jours d'accès offert**
   (relu comme Équipe), une notification et un e-mail : la date, les formules, et que rien ne
   sera prélevé sans qu'il l'ait choisie. Tant que le rapport rend une `suite`, relancer avec
   `"curseur"`.

   ```bash
   npx convex run --prod ouvertureFacturation:prevenir '{"envoyer":true}'
   ```

3. **Ouvrir** : `npx convex env set PADDLE_FACTURATION_OUVERTE oui --prod`. Les comptes prévenus
   gardent tout pendant trente jours ; un nouveau compte commence sur Découverte et souscrit son
   essai à l'étape « Les relances » des premiers pas.

## Garde-fous

- `paddleCatalogue:catalogue` **n'ajoute que ce qui manque**. Il ne modifie, n'archive et ne
  supprime rien. Un prix étiqueté qui s'écarte de la grille est nommé dans le rapport : on crée
  alors un prix neuf dans le tableau de bord et on y pointe la variable, on ne touche jamais à
  l'ancien (des abonnements en dépendent).
- **Ne jamais recréer une destination de notification qui existe** : la recréer change son
  secret, et chaque rappel suivant serait refusé jusqu'à ce que `PADDLE_WEBHOOK_SECRET` suive.
- La production porte encore trois variables vides d'avant, que le code ne lit plus :
  `PADDLE_PRICE_BUSINESS`, `PADDLE_PRICE_ESSENTIAL`, `PADDLE_PRICE_PROFESSIONAL`.

## Ce que le code ne fait pas

- **Pas de liste d'adresses IP sur le rappel.** Paddle publie les siennes (`api.paddle.com/ips`),
  mais une `httpAction` Convex ne reçoit pas l'adresse d'origine de façon sûre. La signature HMAC,
  vérifiée sur le corps brut avec cinq secondes de tolérance, est la barrière.
- **Paddle Retain** reçoit `pwCustomer` (l'identifiant client Paddle, `ctm_…`) dès que
  l'établissement en a un ; rien d'autre n'est branché.
