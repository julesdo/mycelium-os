# Le pricing et l'abonnement : proposition du 14/10/2026

> Demande du fondateur, le 14/10/2026 : « réfléchir à comment structurer notre pricing, notre business
> model, en analysant la concurrence, en proposant aussi une version pour les micro-entreprises […]
> un vrai essai gratuit avec engagement à la fin, des plans payables en one shot avec réduction. Il
> faut que la customer expérience soit la plus optimale et simple possible. »
>
> **Statut : proposition, rien n'est construit.** Les montants, la durée d'essai et la carte demandée
> à l'essai sont des décisions commerciales du fondateur (section 9). Rien ne se code avant sa
> réponse.

---

## 1. Ce qu'on vend aujourd'hui, et pourquoi ça ne tient pas

La grille en vigueur (`src/lib/config/tarifs.ts`) vient d'EGalim, transposée sans être recalculée :

| Palier (factures émises par an) | Premier bilan, une fois | Abonnement, par mois |
| ------------------------------- | ----------------------- | -------------------- |
| S, moins de 250                 | 690 € HT                | 190 € HT             |
| M, de 250 à 800                 | 1 190 € HT              | 290 € HT             |
| L, plus de 800                  | 1 900 € HT              | 390 € HT             |

Quatre défauts :

1. **Le ticket d'entrée est hors marché.** 190 € par mois, c'est le prix d'un outil de PME (LeanPay,
   Upflow) pour un produit qui vise d'abord les TPE. Qonto inclut des relances dans son compte
   pro, Pennylane les ouvre à 24 € par mois, Relanzy à 29 €, Hoopiz et Rubypayeur à 49 €.
2. **Rien pour les micro-entreprises**, alors qu'elles sont 1,66 million à déclarer un chiffre
   d'affaires (Urssaf, fin 2025) et que l'impayé y pèse le plus lourd.
3. **Le palier se déclare** : le gérant doit savoir combien de factures il émet par an, et peut
   le corriger pour payer moins (« Le volume déclaré se corrige dans la section Votre
   établissement »). C'est une question de plus et un mensonge possible.
4. **Le « premier bilan » à 690 € double l'essai** : l'essai de trente jours lit déjà douze mois de
   factures et montre ce qui est dû. On fait payer, une fois, ce qu'on offre déjà.

Et l'essai actuel (trente jours, sans carte) se termine sur rien : aucun moyen de payer n'existait
avant le 14/10, et rien ne convertit à la fin.

## 2. La concurrence

Prix publics relevés le 14/10/2026. Beaucoup d'éditeurs ne publient rien (devis) ; les annuaires
se contredisent souvent, et les chiffres ci-dessous sont à reconfirmer chez l'éditeur avant toute
communication.

| Outil                     | Cible               | Prix                                                                         | Modèle                           |
| ------------------------- | ------------------- | ---------------------------------------------------------------------------- | -------------------------------- |
| Qonto                     | TPE (compte pro)    | relances incluses dans les formules, offres TPE dès 45 € HT/mois             | banque, la relance est un à-côté |
| Pennylane                 | TPE, PME            | 14 € (Basique), 24 € (Essentiel, relances automatiques), 99 €                | compta, la relance est un module |
| Kolecto                   | indépendants à PME  | gratuit (micro), 12 €, 39 €, 99 €                                            | facturation, alertes de retard   |
| Abby, Indy, Tiime, Freebe | micro-entrepreneurs | 0 à 15 €/mois, Abby 9/15/33 € (−20 % à l'année)                              | facturation, relances simples    |
| Relanzy                   | TPE                 | 29 €/mois                                                                    | relance seule                    |
| Hoopiz                    | PME                 | dès 49 €/mois (sources contradictoires)                                      | credit management                |
| Rubypayeur                | TPE, PME            | 0 € ou 49 €/mois **+ 8 à 10 % de ce qui est récupéré**, forfaits judiciaires | recouvrement au succès           |
| LeanPay                   | PME                 | 135 à 245 € HT/mois                                                          | credit management                |
| Upflow                    | PME, ETI            | sur devis, par chiffre d'affaires facturé, sièges illimités                  | credit management                |
| Chaser (Royaume-Uni)      | PME                 | 259 à 1 169 $/mois, pénalités de retard incluses ; essai 10 jours            | relance + pénalités              |
| Paidnice (Australie)      | PME                 | 19 à 69 $/mois, applique pénalités et intérêts                               | relance + pénalités              |

**Ce qu'on en tire :**

- **Trois étages de prix existent** : 0 à 15 € (micro), 29 à 49 € (TPE), 100 à 250 € (PME). Au-delà,
  c'est du devis.
- **Personne en France ne calcule et ne réclame les pénalités et l'indemnité de 40 € par facture.**
  Chaser et Paidnice le font dans des pays de common law, et en font leur argument. C'est notre
  différence, et elle se chiffre en euros pour le client.
- **Le recouvrement au succès prend 8 à 10 %.** Notre ligne rouge n° 2 (aucune commission sur ce
  qui rentre) devient un argument : « 0 % de commission, tout ce qui rentre est à vous ».
- Les outils de facturation donnent la relance « en plus » : on ne gagnera pas sur la relance
  seule, mais sur ce que la relance réclame (le montant juste, daté, avec ses pénalités), sur les
  lettres et sur le suivi jusqu'à l'avocat.

## 3. Les principes

1. **Un abonnement, jamais une commission** (ligne rouge n° 2).
2. **Mesurer est gratuit, agir est payant.** Lire les factures et dire ce qui est dû, pénalités et
   indemnités comprises, c'est le moment où le gérant comprend ce qu'il perd : on l'offre. Faire
   partir les relances, les lettres, et suivre jusqu'au conseil, c'est le travail : on le fait payer.
3. **On choisit sa formule, on ne la déclare pas.** Trois formules nommées par le type
   d'entreprise, plus le sur-mesure ; plus de palier calculé sur un volume déclaré.
4. **Ce qui coûte varie se borne** : les analyses de santé client (Pappers), les lectures de
   documents (Claude) et les utilisateurs ont un plafond par formule.
5. **Le prélèvement ne surprend jamais** : la date et le montant se disent avant, deux rappels
   avant la fin de l'essai, un rappel trente jours avant un renouvellement annuel, et la
   résiliation se fait en deux gestes.

## 4. La grille proposée

Montants hors taxes ; Paddle ajoute la TVA du pays du client (`tax_mode: external`).

|                                                                   | **Découverte**          | **Solo**                                                      | **Équipe**                | **Pro**                    | **Sur mesure**                    |
| ----------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------- | ------------------------- | -------------------------- | --------------------------------- |
| Pour                                                              | voir ce qu'on vous doit | indépendants, micro-entreprises qui facturent des entreprises | TPE, jusqu'à 10 personnes | PME                        | groupes, plusieurs établissements |
| Mensuel                                                           | 0 €                     | 12 €                                                          | 39 €                      | 119 €                      | devis                             |
| **Annuel, payé en une fois (2 mois offerts)**                     | 0 €                     | **120 €** (10 €/mois)                                         | **390 €** (32,50 €/mois)  | **1 190 €** (99,17 €/mois) | devis                             |
| Bilan : lecture, montant dû, pénalités, indemnités, dates limites | une fois                | ✓                                                             | ✓                         | ✓                          | ✓                                 |
| Relances automatiques, lettre officielle, décompte daté           | –                       | ✓                                                             | ✓                         | ✓                          | ✓                                 |
| Clients en retard suivis en même temps                            | –                       | 10                                                            | 50                        | illimité                   | illimité                          |
| Utilisateurs                                                      | 1                       | 1                                                             | 3                         | 10                         | sur mesure                        |
| Analyses de santé client par mois                                 | 1                       | 3                                                             | 20                        | 100                        | sur mesure                        |
| Plume, coffre-fort, défense                                       | lecture                 | ✓                                                             | ✓                         | ✓                          | ✓                                 |
| Connexion des logiciels (Pennylane, QuickBooks…)                  | –                       | Qonto                                                         | ✓                         | ✓                          | ✓                                 |
| Support                                                           | –                       | e-mail                                                        | e-mail                    | prioritaire                | dédié                             |

**Pourquoi ces chiffres :**

- **Solo à 12 €** se place au prix d'un outil de facturation pour indépendant (Abby, Indy, Freebe :
  9 à 15 €), avec ce qu'aucun d'eux ne fait : le montant juste, les pénalités, la lettre officielle.
  Pour un micro-entrepreneur qui déclare 1 690 € de chiffre d'affaires par mois en moyenne (Urssaf,
  T2 2025), 10 à 12 € reste un prix de logiciel, pas une charge.
- **Équipe à 39 €** se place entre Relanzy (29 €) et Hoopiz ou Rubypayeur (49 €), sans commission.
- **Pro à 119 €** reste sous LeanPay (135 à 245 €) et loin d'Upflow, avec les connexions et dix
  utilisateurs.
- **Deux mois offerts à l'année** (−17 %), la remise la plus lisible relevée (HoneyBook « Yearly, 2
  months free », Fabric « Get 2 months free on a yearly plan »). Elle sert aussi notre marge :
  Paddle prend 5 % + 0,50 $ par paiement, soit environ 9 % sur un mois de Solo (12 €) et 5,4 % sur
  son année (120 €).
- **La limite qui compte est le nombre de clients en retard suivis en même temps**, pas le volume
  de factures : c'est elle qui suit la douleur du client, et elle se comprend sans calcul. Au-delà,
  le client suivant est **mesuré**, et ses relances attendent le passage à la formule du dessus :
  rien ne se perd, rien ne bloque la lecture.

**Ce qui disparaît :** les paliers S, M, L par factures déclarées, la question « combien de factures
émettez-vous par an ? » et le premier bilan payant à 690 €, qui devient **Découverte** : le bilan
offert, sans carte.

**L'argument de prix, sans promesse.** Chaque facture payée en retard ouvre droit à l'indemnité
forfaitaire de 40 € (D441-5) en plus des pénalités. Le site peut le dire (le montant lu dans le
registre par `<Indemnite />`, jamais tapé), et dire combien Letikette a calculé sur les factures du
client. Il ne dit jamais que l'abonnement « se rembourse » ni qu'une somme sera recouvrée : ce
serait une promesse de résultat, et le mot « garantie » reste interdit.

## 5. L'essai avec engagement

**Ce que le fondateur demande, et ce qu'on propose :**

- **On choisit sa formule et son rythme** (mensuel ou annuel) **au début de l'essai**, la carte est
  enregistrée chez Paddle, **0 € aujourd'hui**.
- **30 jours d'essai complet**. Pas 7 ni 14 : le plan de relance met 23 jours à aller du premier
  rappel à la lettre officielle (échéance + 3 j, + 10 j, + 10 j, `plan-relance.ts`). Un essai plus
  court se terminerait avant que le gérant ait vu un virement rentrer.
- **Deux rappels avant le premier prélèvement** : J−7 par Plume dans l'application (avec ce qui
  s'est passé : relances parties, sommes rentrées sur les dossiers suivis, pénalités calculées),
  J−2 par e-mail et notification.
- **Le premier prélèvement à J+30**, au montant affiché depuis le premier jour.
- **Annulable en deux gestes jusqu'à la veille**, depuis Compte › Abonnement.
- **Et la politique de remboursement s'ajoute** : un paiement se rembourse sur demande dans les
  quatorze jours (`/remboursement`). Le client peut donc changer d'avis jusqu'à 44 jours après son
  inscription.

**Pourquoi la carte au début.** Les relevés d'éditeurs convergent : un essai qui demande la carte
convertit à 18 à 35 % des essais en abonnés, contre 3 à 15 % sans carte, au prix de 3 à 5 fois
moins d'inscriptions (OpenView, Recurly, ChartMogul ; ce sont des relevés d'éditeurs, pas des
études contrôlées). Le modèle de ChartMogul cité donne 10,5 clients payants pour 1 000 visiteurs
avec carte, 3,6 sans. **Découverte compense la perte d'inscriptions** : qui ne veut pas donner sa
carte voit quand même ce qu'on lui doit, sans rien payer, et la porte de l'essai reste ouverte.

**Ce que Paddle fait déjà** : un prix peut porter `trial_period` (30 jours) et
`requires_payment_method: true` ; l'abonnement naît en `trialing` (statut déjà lu par
`resolveEffectivePlan`), Paddle prélève seul à la fin et gère les relances de paiement échoué.

## 6. Le parcours, écran par écran

Relevé sur Mobbin le 14/10/2026. Chaque écran suit nos règles : un seul bouton plein, toute modale
en page pleine (`FeuillePleinEcran`), les mots du gérant.

### 6.1 Le site public, section Tarifs

- Une bascule **Annuel · 2 mois offerts / Mensuel**, sur Annuel par défaut, le prix annuel ramené
  au mois et le total dessous (HoneyBook, Speak, Alma).
- Trois cartes, Solo, **Équipe (recommandée)**, Pro, puis une bande Sur mesure. Les lignes des
  cartes s'alignent par sous-grille (règle du site). Un bouton par carte : « Essayer 30 jours ».
- Sous les cartes, trois levées de risque cochées : « 0 € aujourd'hui, 30 jours d'essai »,
  « Rappel 2 jours avant le premier prélèvement », « 0 % de commission sur ce qui rentre ».
- Au-dessus : « Pas prêt ? Votre bilan est offert, sans carte » → Découverte.
- La FAQ ajoute : quand suis-je prélevé, comment résilier, que devient l'essai si je n'ai rien
  fait, puis-je changer de formule.

Références : [HoneyBook](https://mobbin.com/sites/sections/e72ef239-29c4-45c5-b9b1-cd92db0a4173),
[Aside](https://mobbin.com/sites/sections/de9e1a65-59c9-41f0-8c73-01df009482e1),
[Mora](https://mobbin.com/sites/sections/bce669f3-5e92-4835-816b-7f9828f3d27c).

### 6.2 Dans les premiers pas : la formule se choisit au moment d'agir

`/bienvenue` garde ses six étapes. **L'étape « Les relances » devient le moment du choix** : le
gérant vient de voir, à l'étape des factures, le montant qu'on lui doit. Plume : « Je peux relancer
vos 7 clients en retard dès demain 9 h. »

Une page pleine, sur les codes de Duolingo, Brilliant et Confluence :

1. **La frise de l'essai** : « Aujourd'hui · tout est ouvert, 0 € », « 11 novembre · on vous
   prévient », « 13 novembre · premier prélèvement de 390 €, annulable jusqu'à la veille ».
2. **La formule recommandée d'après le registre** (l'effectif publié de l'entreprise : Solo sans
   salarié, Équipe jusqu'à dix, Pro au-delà), modifiable d'un toucher. Elle est recommandée, pas
   imposée : « Recommandé pour 4 salariés ».
3. **Deux rangées pour le rythme** : Annuel (pastille « 2 mois offerts », 32,50 €/mois, 390 € par
   an) et Mensuel (39 €/mois), comme Everyday Rewards et Cleo.
4. **Le seul bouton plein** : « Commencer l'essai, 0 € aujourd'hui », qui ouvre le paiement Paddle
   en surimpression (carte enregistrée, rien de prélevé).
5. Dessous, en petit : la date et le montant du premier prélèvement, « Annulable à tout moment
   depuis Compte › Abonnement » (Coinbase, Givingli).
6. **« Plus tard »** en texte : on reste sur Découverte, les relances ne partent pas, et Plume le
   redira au bon moment, une fois.

Puis la coche de réussite : « Essai jusqu'au 13 novembre. Les relances partent demain à 9 h. »

Références : [Duolingo](https://mobbin.com/screens/8420b89e-d081-4c7e-81f0-83f3272cbacb),
[Brilliant](https://mobbin.com/screens/47c242d9-d1f7-4363-8c69-e3ce38c85b81),
[Confluence](https://mobbin.com/screens/114e7ba6-e553-42f1-a977-bc5854cbf00c),
[Everyday Rewards](https://mobbin.com/screens/ce1bd7b8-93f3-4554-9aeb-d9f652fa2b20),
[Cleo](https://mobbin.com/screens/80ca4a5b-fde2-4d12-acca-da23510e8584),
[Coinbase](https://mobbin.com/screens/59161914-0dca-495d-828f-50a047c5d191),
[Stardust](https://mobbin.com/flows/0357497c-9a57-4179-81c9-fde02ec11f13).

### 6.3 Pendant l'essai

- La rangée Compte › Abonnement dit « Essai, 23 j », et son panneau une barre de progression et la
  date du premier prélèvement (Workable, Later). **Aucun bandeau permanent** ailleurs : on ne
  harcèle pas.
- **À J−7, Plume fait le point** dans sa bulle : relances parties, sommes rentrées sur les
  dossiers suivis, pénalités calculées, et la date du prélèvement. Les mots disent « rentré sur les
  dossiers suivis », jamais « grâce à Letikette ».
- **À J−2**, un e-mail et une notification : la date, le montant, le lien pour changer de formule
  ou résilier.

Références : [Workable](https://mobbin.com/screens/7d6bb921-04df-45bf-8d60-771831ed6a36),
[Later](https://mobbin.com/screens/62747cf0-4bec-43ed-9502-cad5bc066c70),
[Sketch](https://mobbin.com/screens/14b9ae96-b2cf-4e44-a337-32aaa05d351e).

### 6.4 Gérer sa formule

Une page « Votre formule », sur Oportun et Natural AI :

- la formule et son rythme ; **le prochain prélèvement** (date et montant) ;
- **ce que la formule a fait depuis le début** : relances parties, sommes rentrées sur les
  dossiers suivis (le « Total saved » de Natural AI, sans s'en attribuer le mérite) ;
- « Passer à l'annuel, 2 mois offerts », visible tant qu'on est au mois ;
- « Changer de formule », avec le prorata calculé par Paddle avant de confirmer ;
- la carte et les factures, au portail de Paddle (déjà branché) ;
- « Résilier », en dernière rangée.

**Résilier en deux gestes** : une raison, facultative, en quatre choix (« trop cher », « je n'ai
plus d'impayés », « il me manque quelque chose », « autre ») ; puis la confirmation, qui dit ce qui
se passe : les relances s'arrêtent le 13 novembre, les données restent, l'export est ouvert trente
jours. Si la raison est « trop cher », une seule rangée propose la formule du dessous. **Pas de
compte à rebours, pas d'offre « dernière chance »** (Pillow et Kajabi le font ; c'est exactement le
« cheap » que le fondateur refuse).

Références : [Oportun](https://mobbin.com/flows/11cd0be4-270e-43ac-a0a2-e4c78b414cea),
[Natural AI](https://mobbin.com/flows/19ba6362-2f7b-443b-aeb8-59fefcf55979).

### 6.5 Quand une limite est atteinte

Au onzième client en retard sur Solo, Plume : « Vous suivez 10 clients en retard, le maximum de
Solo. Martin SARL est mesuré ; ses relances attendent. » Un geste : « Passer à Équipe »
(prorata). Rien n'est retiré, rien n'est caché.

### 6.6 Le renouvellement annuel

Un e-mail trente jours avant, avec la date, le montant et le lien pour résilier ou passer au mois.

## 7. Ce que ça change dans le produit (les lots, après décision)

Chaque lot nomme le geste manuel qu'il supprime et ce qu'il change pour le dirigeant (principe
anti-dérive).

| Lot                          | Contenu                                                                                                                                                                                                      | Geste supprimé / ce qui change                                         |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| 1. La grille                 | `TARIFS` → formules (Solo, Équipe, Pro) × rythme, leurs limites ; le catalogue Paddle (6 prix, essai de 30 jours avec carte) ; le rappel lit le prix → la formule ; `paddlePlanTier` gagne ses trois valeurs | plus de volume à déclarer ; le prix affiché est celui prélevé          |
| 2. Le choix au moment d'agir | la page de choix dans `/bienvenue` (étape Relances) et dans Compte ; Paddle.js avec essai ; la coche de réussite                                                                                             | souscrire en un écran, sans quitter le parcours                        |
| 3. Pendant l'essai           | J−7 (Plume), J−2 (e-mail, notification), le récapitulatif de ce qui s'est passé                                                                                                                              | aucun prélèvement surprise, donc moins de remboursements et de litiges |
| 4. Gérer, résilier           | la page « Votre formule », changer de formule et de rythme (API Paddle, prorata), résilier en deux gestes                                                                                                    | plus besoin d'écrire pour changer ou partir                            |
| 5. Les limites et Découverte | clients suivis, utilisateurs, analyses ; Découverte (bilan offert, rien ne part)                                                                                                                             | le gratuit montre la valeur sans coûter                                |
| 6. Le site et les textes     | section Tarifs, FAQ, CG 7.1 (essai, prélèvement), `/remboursement`, captures                                                                                                                                 | le visiteur sait combien et quand avant de s'inscrire                  |
| 7. L'ouverture               | les comptes existants prévenus (art. 16 des CG et la promesse « nous revenons vers vous avant toute facturation »), trente jours pour choisir, puis `PADDLE_FACTURATION_OUVERTE=oui`                         | personne n'est fermé par surprise                                      |

Ce qui existe déjà et resservira : la caisse et le sceau (`paddle.caisse`), le rappel, le portail
client, l'état « paiement échoué », `paiementOuvert`, le catalogue additif.

## 8. Ce qu'on mesurera

- inscriptions → bilan vu (Découverte) ; bilan vu → essai démarré ; essai → premier prélèvement ;
- part annuelle des souscriptions (cible : la moitié) ;
- remboursements demandés dans les 14 jours, et résiliations pendant l'essai, avec leur raison ;
- clients en retard suivis par compte, pour revoir les limites au bout de trois mois.

## 9. Les décisions du fondateur

1. **Les prix** : Solo 12 €, Équipe 39 €, Pro 119 € par mois ; l'annuel à dix mois (120, 390,
   1 190 €). D'autres montants ne changent rien à la mécanique.
2. **La carte au début de l'essai**, et l'essai de **30 jours**.
3. **Découverte gratuite** à la place du premier bilan à 690 €.
4. **La limite par clients en retard suivis** (10, 50, illimité) plutôt que par volume de factures.
5. **Le remboursement** reste à 14 jours, ou passe aux 30 jours que Paddle recommande.
6. **Les comptes existants** : trente jours de préavis par e-mail avant l'ouverture.

## Sources

- Concurrence : [Upflow, tarifs](https://upflow.io/pricing) ; [Kolecto, tarifs 2026](https://www.infos-pa.com/plateformes/kolecto/tarifs) ;
  [Pennylane, independant.io](https://independant.io/avis/pennylane/) ; [Qonto, Codeur.com](https://www.codeur.com/comparatif/logiciel-facturation-conseil/qonto-conseil) ;
  [Relanzy](https://www.relanzy.com/logiciel-relance-pme) ; [comparatif Swim](https://www.swim.legal/blog/meilleur-logiciel-de-recouvrement-creances-2026-comparatif) ;
  [Rubypayeur, présentation 2026](https://rubypayeur.com/blog/wp-content/uploads/2026/03/Presentation-Rubypayeur.pdf) ;
  [Chaser, tarifs](https://www.chaserhq.com/chaser-detailed-pricing-breakdown) ; [Paidnice, GetApp](https://www.getapp.com/debt-collection-software/a/paidnice) ;
  [Abby vs Freebe](https://abby.fr/blog/abby-freebe/) ; [Selectra, auto-entrepreneurs](https://selectra.info/finance/guides/banque-pro/logiciel-facturation/auto-entrepreneur).
- Marché : [Altares, retards de paiement T2 2026](https://www.lejournaldesentreprises.com/article/altares-chiffre-123-jours-le-retard-de-paiement-moyen-en-france-au-deuxieme-trimestre-2026-2147726) ;
  [Bpifrance Création, auto-entrepreneurs fin 2025](https://bpifrance-creation.fr/entrepreneur/actualites/augmentation-auto-entrepreneurs-actifs-a-fin-2025) ;
  [chiffre d'affaires des auto-entrepreneurs](https://optigestplus.org/2026/05/10/auto-entrepreneur-en-france-le-bilan-2025-en-chiffres-statistiques-ca-secteurs/).
- Essais : [Flint, conversions B2B](https://www.flint.com/blog/b2b-saas-free-trial-conversion-rate-statistics) ;
  [Chargebee, essais avec carte](https://www.chargebee.com/blog/credit-card-trials-credit-card-trials-go/) ;
  [Causo, benchmarks 2026](https://hub.causo.ai/guides/trial-to-paid-conversion-benchmarks-seed-saas-2026).
- Paddle : [créer un prix (`trial_period`, `requires_payment_method`, `tax_mode`)](https://developer.paddle.com/api-reference/prices/create-price).
