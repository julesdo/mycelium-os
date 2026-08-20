# 05 — Produit & roadmap tech

*Révision du 20 août 2026 : le logiciel n'est plus l'outil du service, il **est** le service.
La règle d'or de l'ancien plan (« rester à 20 % logiciel, 80 % humain ») est renversée. Les
phases produit qui servaient les étages opérateur — prise de commande, mandat de facturation,
orchestration de tournées — sont supprimées.*

---

## Règle d'or, et son unique exception

**On ne construit que ce que le journal de friction du terrain désigne**, chronométré. Chaque
fonctionnalité doit répondre à deux questions : quelle tâche manuelle répétée elle supprime,
et ce qu'elle change pour le gérant qui paie l'abonnement. Sans réponse chiffrée aux deux, on
ne la construit pas.

**L'exception, assumée :** la **Moulinette Audit**, parce que c'est le produit facturé
lui-même. Sans elle, un diagnostic demande deux à trois jours de saisie manuelle et n'est
rentable à aucun prix acceptable. Avec elle, il est produit en quelques heures pour quelques
euros d'API.

Ce qui a changé le 20 août : il n'y a plus de « tout le reste » qui reste manuel. Il n'y a plus
de commandes, plus de catalogue, plus de tournées. **Le produit est le logiciel, en entier.**

---

## 1. Ce que le produit fait

```
Factures fournisseurs (export comptable, PDF, photos)
   ↓ extraction
Lignes normalisées (libellé, quantité, PU, montant HT, fournisseur, date)
   ↓ normalisation des libellés
~3 000 lignes deviennent ~300 à 500 libellés distincts
   ↓ classification
Chaque libellé qualifié : alimentaire ? bio ? durable ? quelle famille ?
   avec sa justification et son indice de confiance
   ↓ file de confirmation
Le gérant tranche ce qui engage sa responsabilité, et rien d'autre
   ↓ agrégation
Les trois taux en valeur HT sur l'année civile, par famille, par fournisseur
   ↓ restitution
Diagnostic figé · certificats · courriers de demande d'attestation · fichier « ma cantine »
```

**L'unité de travail est le libellé distinct, jamais la ligne ni la facture.** C'est ce qui
rend l'économie du produit tenable : une cantine de 300 couverts produit environ 3 000 lignes
par an, mais seulement 300 à 500 libellés différents. On ne paie et on ne fait confirmer que
ces derniers.

---

## 2. Les quatre difficultés réelles, et comment on les traite

**1. L'extraction.** Les factures arrivent en export comptable CSV (facile et déterministe),
en PDF texte, en PDF scanné, ou en photo. On demande **en priorité l'export comptable** : la
plupart des grossistes en fournissent un. L'OCR n'est qu'un recours.

**2. La classification.** Le cœur. `CAROTTE RONDELLE 4/4 BIO 2.5KG` doit devenir *alimentaire ·
fruits et légumes · bio ✅ · durable ✅*. Traitement par appels structurés à Claude, par lots,
avec le référentiel du barème en tête de prompt système sous `cache_control` et les données
après le point de cache.

Le référentiel est **du code, jamais des données** : versionné, passé en revue, et chaque
classification enregistre la version qui l'a produite.

**3. L'auditabilité.** Une classification non justifiable est inutilisable en cas de contrôle.
Chaque ligne conserve son libellé source, sa classification, **sa justification** et un indice
de confiance. Aucune classification sans phrase justificative.

**4. Ce qui remonte au gérant, et pourquoi c'est peu.** Partent en file de confirmation : les
libellés sous le seuil de confiance, les régularisations (remises, avoirs, ristournes), et
**systématiquement la viande et le poisson**, quel que soit le consensus atteint, parce que
c'est là que se joue le seuil de 60 %.

> **La charge est dégressive, et c'est le cœur de l'économie du produit.** Un libellé confirmé
> l'est définitivement pour cette cantine. Et la table `productLabels`, globale et anonyme,
> accumule le consensus entre clients : au-delà de trois confirmations concordantes, le libellé
> n'est plus posé à personne. Le deuxième exercice d'une cantine demande une fraction du travail
> du premier, et le centième client démarre sur un socle que les quatre-vingt-dix-neuf premiers
> ont construit.

`productLabels` ne contient qu'un libellé et son verdict : **jamais de montant, de quantité, de
fournisseur, d'organisation ni d'utilisateur.** Le compteur de confirmations est un entier nu.

---

## 3. Ce qui reste humain, dit honnêtement

Trois choses, et elles ne sont pas de la production :

- **La vente.** Un rendez-vous, une démonstration, un closing.
- **La confirmation par le gérant.** Ce n'est pas notre temps, c'est le sien, et c'est
  volontaire : c'est sa signature qui vaut, pas la nôtre.
- **La revue du référentiel.** Le barème doit être revérifié **avant** toute production de
  rapport client, et à chaque évolution réglementaire. C'est du travail d'éditeur, pas de
  prestataire.

Il n'y a plus de coordination, plus d'arbitrage de saison, plus de point trimestriel sur
place. **Si un client a besoin qu'on décroche le téléphone pour se servir du produit, c'est
un défaut du produit**, et il entre au journal de friction.

---

## 4. Coût d'exploitation

Une cantine de 300 couverts, c'est ~3 000 lignes par an, soit ~300 à 500 libellés distincts.
Traités par lots avec le référentiel mis en cache : **de l'ordre de 0,50 à 2 € d'API par
diagnostic**, pour une prestation facturée 690 à 1 900 €.

Le coût marginal est négligeable, et **il décroît avec la base installée** grâce au consensus.
C'est aussi ce qui autorise un simulateur public gratuit sans risque budgétaire.

Un plafond de coût par lot est implémenté et coupe l'exécution avant dérapage, y compris sur
les appels facturés qui échouent.

---

## 5. Roadmap produit

| Phase | Quand | Ce qu'on construit | Ce que ça débloque |
|---|---|---|---|
| **Phase 0** | Août 2026 ✅ | Tri du socle hérité : 66 tables ramenées à 15, suppression de l'espace opérateur | Un schéma qui décrit ce produit-ci |
| **Phase 1** | Août 2026 ✅ | **Moulinette Audit** : extraction CSV/PDF, normalisation des libellés, classification, barème, agrégation, plafond de coût | Vendre des diagnostics rentables |
| **Phase 2** | Août 2026 ✅ | **La boucle centrale** : dépôt, file de confirmation, consensus, tableau de bord par année civile | L'abonnement devient tenable |
| **Phase 3** | Sept. 2026 | **Refonte du frontend en React 19 + Cladd**, en cinq chantiers | Une interface utilisable par un gérant sur tablette. Voir la [spec](../../superpowers/specs/2026-08-20-migration-react-socle-systeme-visuel-design.md) |
| **Phase 4** | Automne 2026 | **Restitution** : diagnostic figé, certificats, courriers de demande d'attestation, fichier « ma cantine » | Le livrable vendu, produit sans intervention |
| **Phase 5** | Déc. 2026 – mars 2027 | **La campagne** : rappels d'échéance, assistant de télédéclaration, alertes de dérive | La fenêtre de janvier à mars, le pic annuel |
| **Phase 6** | *si le journal de friction le désigne* | **Ingestion directe** : connecteurs grossistes et export comptable automatique | Supprime le dépôt manuel, la friction n°1 attendue |
| **Phase 7** | Année 2–3 | Extension aux obligations sœurs : anti-gaspillage, bilan carbone des repas, CSRD des groupes | Nouveau marché sur la même base client |

**Ce qui a été supprimé de la roadmap le 20 août :** prise de commande et catalogue producteur,
mandat de facturation, orchestration de tournées. Ces trois phases servaient les étages
opérateur, qui n'existent plus.

---

## 6. Stack

React 19 · TanStack Start · Convex · Better Auth · Tailwind v4 · Cladd · Claude API ·
Cloudflare Workers · Paddle · Resend.

Le backend Convex, qui porte l'intégralité du moteur de mesure, **ne change pas** avec la
refonte du frontend : il est agnostique au framework par construction.

Coût d'infrastructure marginal : de l'ordre de 60 €/mois tout compris, API incluse.

---

## 7. Principe anti-dérive

Chaque fonctionnalité doit répondre à deux questions :

1. *« Quelle tâche manuelle répétée, **chronométrée dans le journal de friction**, est-ce que
   ça supprime ? »*
2. *« Qu'est-ce que ça change pour le gérant qui paie l'abonnement ? »*

Sans réponse chiffrée aux deux, **on ne la construit pas**. La deuxième question a changé le
20 août : elle demandait auparavant quel étage commercial la fonctionnalité débloquait. Il n'y
a plus d'étage. Il y a un abonné, et ce qu'il obtient de plus.
