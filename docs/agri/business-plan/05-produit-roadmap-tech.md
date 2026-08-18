# 05 — Produit & roadmap tech

*Révision du 15 août 2026 : la « killer feature » vague devient une spécification précise, la
Moulinette Audit, et elle passe en tête de planning parce qu'elle n'est pas un outil interne :
c'est le produit qu'on facture.*

---

## Règle d'or, et son unique exception

**On ne construit que ce que le journal de friction du terrain désigne.** Le logiciel suit la traction, il ne la précède jamais. Objectif : rester à 20 % logiciel, 80 % humain.

**L'exception, assumée :** la **Moulinette Audit** se construit *avant* le premier client, en août 2026. Non pas par confort d'ingénieur, mais parce que **c'est l'objet même de la prestation vendue à l'étage 0**. Sans elle, un diagnostic demande deux à trois jours de saisie manuelle et n'est pas rentable à 690 €. Avec elle, il demande quatre heures. Ce n'est pas de l'outillage : c'est la marge.

Tout le reste (commandes, catalogue, facturation, tournées) reste **manuel** — tableur, mail, téléphone — tant que le volume ne l'exige pas.

---

## 1. La Moulinette Audit (le seul code de l'année 1)

### Ce qu'elle fait

```
Factures fournisseurs (PDF, export comptable, photos)
   ↓ extraction
Lignes normalisées (libellé, quantité, PU, montant HT, fournisseur, date)
   ↓ classification
Chaque ligne qualifiée : alimentaire ? durable ? bio ? quelle catégorie ? quelle famille ?
   ↓ agrégation
Ratios en valeur : durable, bio, viande/poisson · par famille · par fournisseur · par mois
   ↓ restitution
Rapport client + fichier de saisie « ma cantine » + plan de comblement chiffré
```

### Les quatre difficultés réelles, et comment on les traite

**1. L'extraction.** Les factures arrivent en PDF texte (facile), en PDF scanné (OCR), ou en photo (OCR dégradé). Le pragmatisme : on demande **en priorité l'export comptable ou le fichier fournisseur** (la plupart des grossistes fournissent un CSV ou un portail client), et l'OCR n'est qu'un recours. **Une demande bien formulée au client économise 80 % du travail d'extraction.** C'est une question de script commercial autant que de technique.

**2. La classification.** C'est le cœur. Un libellé comme `CAROTTE RONDELLE 4/4 BIO 2.5KG` doit devenir : *alimentaire · légume · transformé · bio ✅ · durable ✅*. Un libellé comme `PDT AGATA CAL 40/60 SAC 25KG` doit devenir : *alimentaire · légume · brut · non qualifiant*. Traitement par **Claude API en appels structurés par lots**, avec le référentiel des labels et des règles en système prompt mis en cache (le référentiel est stable, le cache le rend quasi gratuit sur les appels suivants).

**3. L'auditabilité.** Une classification non justifiable est inutilisable en cas de contrôle. Donc **chaque ligne conserve** : le libellé source, la catégorie retenue, **la justification**, et un **indice de confiance**. Les lignes sous le seuil de confiance partent dans une file de **revue humaine** présentée en tableau. En pratique, 5 à 12 % des lignes nécessitent un arbitrage humain : c'est ce qui reste des « 80 % humain », et c'est aussi ce qui garantit la qualité du livrable.

**4. Le doute de bonne foi.** Une ligne « bio » sans certificat fournisseur au dossier n'est pas défendable en contrôle. La Moulinette les isole dans une catégorie **« qualifiant à justifier »**, et génère le **courrier de demande d'attestation** au fournisseur. C'est le point 6 du livrable diagnostic, celui qui rapporte souvent 3 à 8 points de ratio gratuits au client et qui rembourse la prestation à lui seul.

### Ce qu'on réutilise directement du code Mycelium

| Brique existante | Usage dans la Moulinette |
|---|---|
| Multi-tenant `organizationId` | 1 cantine = 1 org, 1 producteur = 1 org |
| Convex Storage + `generate*UploadUrl` | Dépôt des factures et des pièces justificatives |
| Actions Convex appelant Claude (concierge, optimiseur) | Le moteur de classification par lots, avec `cache_control` |
| `carbon.ts` + facteurs d'émission | Le bilan carbone des repas, en bonus du rapport |
| Module compliance (P20) | Le suivi de seuils et les alertes de dérive (étage 2) |
| Emails transactionnels Resend | Envoi du rapport, alertes mensuelles, relances |
| Paddle | Facturation des abonnements Conformité et Opérateur |

### Coût d'exploitation

Une cantine de 300 couverts, c'est ~3 000 lignes de facture par an. Traitées par lots avec un référentiel mis en cache : **de l'ordre de 0,50 à 2 € d'API par diagnostic**, pour une prestation facturée 690 à 1 900 €. Le coût marginal est négligeable, ce qui autorise aussi le **simulateur gratuit en ligne** (doc 04, canal 2) sans risque budgétaire.

### Effort

**3 à 5 jours de développement** pour la V0 (extraction CSV/PDF texte, classification, agrégation, export du rapport). L'OCR et le portail client viennent après, seulement s'ils sont demandés.

---

## 2. Ce qui se réutilise de Mycelium (estimation honnête)

| Couche | Réutilisable | Commentaire |
|---|---|---|
| Auth, multi-tenant, rôles, invitations | **~90 %** | Directement |
| Stockage de fichiers, uploads | **~90 %** | Directement |
| Emails, notifications | **~85 %** | Directement |
| Facturation Paddle, plans, quotas | **~80 %** | Le modèle d'abonnement par palier existe déjà |
| Patterns d'agents IA (actions Claude, streaming, cache) | **~70 %** | Le squelette, pas le métier |
| Carbone (`carbon.ts`, facteurs) | **~60 %** | Facteurs à changer (alimentaire, pas véhicules) |
| Compliance, suivi de seuils | **~40 %** | Le pattern, pas les règles |
| Tracking financier, KPI, dashboards | **~40 %** | Structure réutilisable |
| Intégrations comptables (Xero, QuickBooks, Pennylane) | **~30 %** | Utile à l'étage 4, pas avant |
| Moteur de réservations et calendrier | **0 % avant l'étage 5** | Deviendra le moteur de tournées, mais pas cette année |
| Véhicules, maintenance, conducteurs, sinistres, carburant, fiscalité auto, Smartcar, BiK | **0 %** | **Parké proprement** |

> **Correction de l'estimation précédente.** Le plan de juillet annonçait « ~1/3 du code, ~1/2 de la
> plomberie ». Pour ce qui est réellement utile à l'année 1 (étages 0 à 2), c'est plutôt
> **~45 % de la plomberie transverse et ~10 à 15 % du code métier.** Le gros morceau qu'on
> croyait recycler tout de suite — le moteur de réservations et de calendrier — ne sert qu'à
> l'étage 5, c'est-à-dire peut-être jamais. C'est moins flatteur, et c'est plus utile à savoir.

L'avantage réel n'est pas le volume de code recyclé : c'est de **partir d'une stack qui tourne, déployée, avec l'auth, le multi-tenant, le stockage, les emails et la facturation déjà résolus.** Cela vaut deux à trois mois de travail, et ça compte.

---

## 3. Roadmap produit, alignée sur les étages commerciaux

| Phase | Quand | Ce qu'on construit | Ce que ça débloque |
|---|---|---|---|
| **V0** | **Août 2026** (3–5 j) | **Moulinette Audit** : extraction, classification, ratios, rapport | **Étage 0** — vendre des diagnostics rentables |
| **V0.5** | Octobre 2026 (2 j) | **Simulateur public gratuit** (même moteur, version dégradée) | Acquisition · doc 04, canal 2 |
| **V1** | Déc. 2026 – janv. 2027 (5 j) | **Portail client** : historique des ratios, dépôt de factures, alertes de dérive, export déclaration | **Étages 1 et 2** — l'abonnement Conformité devient tenable en volume |
| **V2** | Printemps 2027, *si le journal de friction le désigne* | **Prise de commande** : catalogue producteur, commande hebdo, récap au producteur | **Étage 4** — lève le plafond des 8–10 clients Opérateur |
| **V3** | Année 2 | **Mandat de facturation** : facture consolidée émise au nom et pour le compte des producteurs | **Étage 4** — la facture unique, sans jamais acheter la marchandise |
| **V4** | Année 2–3, **sous condition de densité** | **Orchestration de tournées** — c'est ici que le moteur de réservations et de calendrier est enfin recyclé (une tournée = un créneau + une répartition) | **Étage 5** |
| **V5** | Année 3 | **Agents IA** : composition de menus conformes sous contrainte budget/saison/seuils · recommandation de sourcing · prévision de volumes pour sécuriser les engagements producteurs | Marge et défendabilité |
| **V6** | Année 3+ | Extension aux obligations sœurs : anti-gaspillage, bilan carbone des repas, CSRD des groupes | Nouveau marché sur la même base client |

---

## 4. Stack

SvelteKit 2 + Svelte 5 · Convex · Better Auth · Tailwind v4 · Claude API · Cloudflare Workers · Paddle · Resend. **Aucun nouveau socle à acheter.** Coût d'infra marginal en année 1 (~60 €/mois tout compris, API incluse).

---

## 5. Principe anti-dérive

Chaque fonctionnalité doit répondre à deux questions :

1. *« Quelle tâche manuelle répétée, **chronométrée dans le journal de friction**, est-ce que ça supprime ? »*
2. *« Quel étage commercial est-ce que ça débloque, et est-ce que cet étage est déjà vendu ? »*

Sans réponse chiffrée aux deux, **on ne la construit pas**. Le journal de friction n'est pas un accessoire : c'est le seul cahier des charges légitime. Une ligne par tâche, avec le temps réel passé, tenue chaque semaine.
