# Roadmap Mycelium Fleet Care — Du SaaS à la conciergerie automobile

> **Statut du document** : v1 — Juillet 2026
> **Audience** : équipe produit, dev, commercial, investisseurs
> **Référence** : CLAUDE.md, README.md, `/docs/specs/`, `/docs/prompts/`, codebase complet (analysé en profondeur pour ce document)

---

## Préambule — Ce qui change

Mycelium Fleet OS reste le moteur logiciel. Mais le produit vendu au client n'est plus "un logiciel de gestion de flotte". C'est un service : **quelqu'un s'occupe de votre flotte, du contrat de leasing à la revente, et vous n'avez plus à y penser.**

Le logiciel automatise ce qui peut l'être (alertes, calculs, rapports, réservations). L'humain — le concierge — fait ce que le logiciel ne peut pas faire : négocier avec un assureur, juger si une contravention doit être contestée, décider du bon moment pour revendre un véhicule, rassurer un client au téléphone.

**Ratio de valeur perçue : 20% logiciel, 80% service humain.** Ce document ne réduit pas l'investissement logiciel — il le réoriente. Chaque feature listée ci-dessous existe pour une seule raison : rendre un concierge humain capable de gérer 15 à 20 flottes clients simultanément au lieu de 2 ou 3.

---

## SECTION 1 — État des lieux

### 1.1 Maturité de l'existant face au service de conciergerie

| Module                                  | Fichier(s) clé(s)                                          | Maturité pour la conciergerie         | Notes                                                                                                                                                                      |
| --------------------------------------- | ---------------------------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gestion flotte (véhicules)              | `vehicles`, `/admin/fleet`                                 | **Prêt à 100%**                       | CRUD complet, import CSV, tout ce qu'un concierge doit consulter pour un véhicule est là                                                                                   |
| Réservations                            | `reservations`, `/app/reservations`, `/admin/reservations` | **Prêt à 100%**                       | Calendrier drag-to-create, conflits gérés, base solide pour Chapitre 3                                                                                                     |
| Concierge IA (chat salarié)             | `src/lib/convex/agents/concierge.ts`                       | **Prêt à 100%**                       | Sonnet 4.6, SSE, 4 tools, boucle 10 itérations — déjà le point d'entrée naturel du service                                                                                 |
| Agent Gestionnaire (chat DAF)           | `src/lib/convex/agents/manager.ts`                         | **Prêt à 100%**                       | 6 tools read-only, réservé ORG_ADMIN/MANAGER                                                                                                                               |
| Compliance Officer                      | `src/lib/convex/agents/compliance.ts`                      | **Prêt à 90%**                        | Scoring de risque déterministe déjà en place (docs expirés ×10, licences expirées ×8...). Manque : escalade automatique vers file concierge                                |
| Fleet Optimizer                         | `src/lib/convex/optimizer.ts`                              | **Prêt à 70%**                        | Cron hebdo, cache prompt ephemeral, JSON de recommandations. Manque : détection moment de revente (Chapitre 6)                                                             |
| Cost Negotiator                         | —                                                          | **À construire from scratch**         | Uniquement un feature flag dans `billing.ts` (`negotiator: true` tier Business). Zéro ligne de code                                                                        |
| Coach conducteurs                       | —                                                          | **À construire from scratch**         | Idem, feature flag seul (`coach: true`)                                                                                                                                    |
| Sinistres                               | `incidents.ts`, `/admin/incidents`, `/app/incidents`       | **Partiellement prêt (2-3 semaines)** | Workflow complet DECLARED→CLOSED, mais notification assureur = email manuel. Pas d'API assureur                                                                            |
| Réseau garages                          | `garages.ts`                                               | **Partiellement prêt (4-6 semaines)** | Table pré-remplie (Norauto/Speedy/Midas/indépendants), requêtable par ville/réseau. Zéro prise de RDV automatisée, zéro SLA                                                |
| Inspections véhicule                    | `inspections.ts`, `/app/reservations/[id]/inspect`         | **Prêt à 85%**                        | Photos par angle, dommages avec sévérité, départ/retour. Manque : géolocalisation horodatée, estimation coût remise en état                                                |
| Contraventions                          | `violations.ts`, `/admin/violations`                       | **Prêt à 90%**                        | Workflow complet + décision imputation. Manque : suivi contestation formalisé                                                                                              |
| Comptabilité (10 connecteurs)           | `src/lib/convex/integrations/*Connector.ts`                | **Prêt à 100%**                       | Xero/QB/FreeAgent/Fortnox/Visma/Tripletex (OAuth) + Pennylane/Sage/EBP/e-conomic (API key). Mature, chiffrement AES-256-GCM                                                |
| Compliance réglementaire (BiK/CSRD/TVS) | `bik.ts`, `carbon.ts`, `fiscal.ts`                         | **Prêt à 100%**                       | Calculs corrects, mais alertes réactives seulement (pas de séquence J-60/J-30/J-7 automatisée)                                                                             |
| Billing / Paddle                        | `billing.ts`, `paddle.ts`                                  | **Prêt à 100%**                       | Tiers déjà alignés sur la logique service (Essential=concierge, Professional=+compliance+compta, Business=+tous agents)                                                    |
| Dashboard multi-org concierge           | —                                                          | **À construire from scratch**         | Les crons (`alerts.ts`, `optimizer.ts`, `maintenance/detector.ts`) itèrent déjà sur toutes les orgs en interne, mais **aucune UI** n'expose une vue consolidée à un humain |
| File de tâches concierge                | —                                                          | **À construire from scratch**         | Aucune table `concierge_tasks`. Patterns réutilisables : `notifications`, `maintenanceRecords.status`, `incidents.status`                                                  |
| Acquisition véhicules (multi-leaser)    | —                                                          | **À construire from scratch**         | Aucune intégration leaser (Arval, Alphabet, Ayvens). Hors scope actuel du produit (voir `ideas-parking-lot.md`)                                                            |
| Revente                                 | —                                                          | **À construire from scratch**         | Aucune donnée de valorisation résiduelle, aucune intégration marketplace                                                                                                   |

### 1.2 Les 3 forces de l'existant pour la conciergerie

1. **Le modèle de données est déjà pensé "workflow", pas "CRUD".** Les tables `incidents`, `trafficViolations`, `maintenanceRecords`, `fuelAnomalies` ont toutes des statuts typés en union (pas de texte libre), des champs `assignedTo`/`resolvedBy`/`createdBy`, et un historique d'audit. C'est exactement le squelette dont a besoin une file de tâches concierge — pas besoin de réinventer un système de ticketing, il faut l'agréger.

2. **Quatre agents IA de production tournent déjà en Sonnet 4.6 avec SSE streaming et system prompts anti-hallucination.** Concierge, Manager, Optimizer et Compliance Officer ne sont pas des prototypes : ce sont des architectures éprouvées (boucle agentique, tool calling, cache de prompt sur l'Optimizer). Étendre leurs capacités coûte des jours, pas des mois.

3. **La couche compliance réglementaire (BiK UK, CSRD Nordiques, TVS/AEN France) est un différenciateur unique déjà construit.** Aucun concurrent fleet management pur n'a cette profondeur réglementaire multi-pays. C'est la meilleure porte d'entrée pour vendre le service de conciergerie : "vous avez déjà les chiffres, laissez-nous gérer les échéances."

### 1.3 Les 3 lacunes critiques pour livrer le Chapitre 3 dès maintenant

1. **Aucune vue humaine multi-client.** Le concierge devra ouvrir N onglets, un par organisation, pour surveiller ses clients. Les crons existants (`optimizer.ts`, `alerts.ts`) prouvent que Convex peut interroger toutes les orgs — mais rien n'expose ça à un humain. C'est le blocker n°1 : sans dashboard concierge, le service ne scale pas au-delà de 3-4 clients.

2. **Aucune file de tâches priorisée.** Les alertes existent (`notifications`, `complianceAlerts`) mais elles sont dispersées par organisation et par type. Il n'y a pas de vue "voici les 12 choses à faire aujourd'hui, dans l'ordre" qui unifie contraventions, échéances, sinistres et maintenance.

3. **Aucun canal d'escalade vers l'humain en dehors de l'app.** Tout est email ou notification in-app. Si un sinistre grave tombe un vendredi soir, rien ne réveille le concierge. Il manque un webhook sortant (WhatsApp/SMS/Slack) calibré par priorité.

---

## SECTION 2 — Architecture du service concierge

### 2.1 Les deux couches du service

```
┌─────────────────────────────────────────────────────────────┐
│  COUCHE HUMAINE — Mycelium Fleet Care                        │
│  Relation client · Négociation · Jugement · Intervention     │
│  physique · Expertise métier · Rassurance                    │
│                                                                │
│  ▲ Escalade (webhook, briefing matinal, alerte priorité)      │
│  │                                                             │
│  ▼ Délègue (règles, seuils, templates, automatisation)        │
│                                                                │
│  COUCHE LOGICIEL — Mycelium Fleet OS                          │
│  Données · Calculs · Alertes · Automatisation · Agents IA     │
│  Concierge / Manager / Optimizer / Compliance / (Negotiator)  │
│  / (Coach)                                                    │
└─────────────────────────────────────────────────────────────┘
```

**Couche logiciel fait :**

- Calculer (BiK, CSRD, TVS, coûts, utilisation)
- Détecter (anomalies carburant, sous-utilisation, échéances)
- Répondre aux questions factuelles (Concierge, Manager)
- Router et prioriser (file de tâches, scoring de risque)
- Exécuter les actions réversibles à faible enjeu (réserver un véhicule, envoyer un rappel)

**Couche humaine fait :**

- Négocier (leasing, assurance, contestations)
- Juger (contester une contravention ou pas, réparer ou revendre)
- Intervenir physiquement (inspection, convoyage, remise de clés)
- Rassurer (appel client, gestion de crise sinistre)
- Décider des exceptions (le logiciel signale, l'humain tranche)

**Points de transfert logiciel → humain (règle générale : le logiciel ne décide jamais d'une action irréversible ou > seuil € sans validation humaine) :**

| Signal logiciel                                           | Seuil de transfert  | Action humaine attendue                    |
| --------------------------------------------------------- | ------------------- | ------------------------------------------ |
| `complianceAlerts` horizon `EXPIRED`                      | Immédiat            | Appel client sous 24h                      |
| Sinistre `estimatedRepairCost` > 1 500€                   | Immédiat            | Négociation garage/assureur                |
| `optimizerReports` recommandation `lease_renewal`         | J-90 avant échéance | Audit contrat + négociation leaser         |
| `trafficViolations` statut `RECEIVED` avec montant > 135€ | Immédiat            | Décision contester ou payer                |
| Score de risque véhicule (revente, Ch.6) > seuil          | J-60                | Proposition de revente au client           |
| Toute demande client hors périmètre des tools agents      | Immédiat            | Réponse humaine via panel support existant |

### 2.2 Le dashboard Concierge (nouvelle vue à créer)

**Route** : `/concierge` (nouvel espace, distinct de `/admin` et `/app` — accessible uniquement aux comptes internes Mycelium avec rôle `CONCIERGE` ou `CONCIERGE_ADMIN`)

**Composants :**

1. **`ConciergeQueueView`** — file de tâches unifiée toutes orgs confondues
   - Tri par priorité (CRITIQUE > URGENT > NORMAL > INFO) puis par échéance
   - Chaque ligne : badge organisation (logo/nom), type de tâche, résumé en une phrase, échéance, bouton "Traiter"
   - Filtres : par client, par type (compliance/sinistre/maintenance/contravention/coût), par statut (à faire/en cours/fait)
   - Actions rapides inline : marquer traité, snoozer, assigner à un collègue concierge

2. **`ClientHealthGrid`** — grille de toutes les organisations gérées
   - Une carte par client : nom, tier (Essential/Pro/Business), score de santé (0-100, cf. 8.1), nombre de tâches ouvertes, dernière interaction
   - Code couleur : vert (rien à signaler) / jaune (attention dans les 7j) / rouge (action requise maintenant)
   - Clic → vue détaillée du client (reprend les dashboards admin existants mais en lecture, contexte concierge)

3. **`DailyBriefingPanel`** — résumé généré par l'Agent Concierge Dashboard (voir 4.4)
   - "Aujourd'hui : 3 clients nécessitent une action. 1 sinistre critique (Client X), 2 échéances BiK dans 5 jours."
   - Généré une fois par jour (cron 7h), consultable à tout moment

4. **`ClientTimelineDrawer`** — historique chronologique des actions concierge sur un client donné (audit, transparence, utile pour le reporting client du 2.3)

**Données affichées** — toutes proviennent de requêtes cross-org (voir 8.2), agrégées à partir des tables existantes : `complianceAlerts`, `incidents`, `trafficViolations`, `maintenanceRecords`, `optimizerReports`, plus la nouvelle table `concierge_tasks` (8.1) qui unifie tout ça avec une priorité calculée.

### 2.3 Le portail client "Fleet Care"

**Route** : nouvelle page `/app/fleet-care` (visible ORG_ADMIN, remplace ou complète le dashboard technique actuel pour les clients qui souscrivent au service complet)

Ce n'est pas un dashboard technique de plus. C'est une preuve de valeur émotionnelle :

- **Bandeau principal** : "Votre flotte est entre de bonnes mains" + score de santé flotte (grand chiffre, pas de jargon)
- **Section "Ce mois-ci pour vous"** : liste en langage naturel généré depuis `concierge_tasks` complétées — "Renouvellement du contrat d'assurance du Renault Trafic négocié (-340€/an)", "2 contraventions contestées", "Révision programmée pour 3 véhicules"
- **Section "Le mois prochain"** : anticipation — échéances connues, actions planifiées
- **Score de santé flotte** : un seul indicateur composite (conformité, coûts sous contrôle, maintenance à jour, sinistralité) — pas un tableau de 15 KPIs
- **Bouton "Parler à mon concierge"** : ouvre soit le chat Concierge IA existant (`ConciergeChat`), soit bascule vers un canal humain direct (WhatsApp/téléphone, cf. 8.3) selon la nature de la demande

---

## SECTION 3 — Roadmap par chapitre

### CHAPITRE 3 — VIE QUOTIDIENNE _(point d'entrée — M1-M3)_

**Prérequis** : aucun, s'appuie à 90% sur l'existant.

**Nouvelles features logiciel**

| Feature                                         | Description                                                                              | Tables                                             | UI                                                        | Agent                                   | Intégrations   | Effort | Prompt |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------- | --------------------------------------------------------- | --------------------------------------- | -------------- | ------ | ------ |
| Table `concierge_tasks`                         | File de tâches unifiée, priorité calculée automatiquement à partir des signaux existants | Nouvelle table `concierge_tasks` (voir 8.1)        | —                                                         | Compliance Officer étendu pour y écrire | —              | 3j     | P26    |
| Dashboard Concierge multi-org                   | Vue consolidée décrite en 2.2                                                            | Lecture cross-org sur tables existantes            | `/concierge`, `ConciergeQueueView`, `ClientHealthGrid`    | —                                       | —              | 8j     | P27    |
| Séquence d'alertes réglementaires J-60/J-30/J-7 | Escalade progressive au lieu d'un seul seuil                                             | Étend `complianceAlerts` (champ `escalationStage`) | Notification enrichie                                     | Compliance Officer (nouveaux tools)     | Email/WhatsApp | 3j     | P28    |
| Portail client Fleet Care                       | Décrit en 2.3                                                                            | Lecture de `concierge_tasks` filtrée + agrégats    | `/app/fleet-care`                                         | Concierge (résumé généré)               | —              | 5j     | P29    |
| Briefing matinal concierge                      | Email 7h au concierge humain résumant la file du jour                                    | —                                                  | Email HTML (réutilise pattern `sendOptimizerReportEmail`) | Nouveau : Agent Concierge Dashboard     | Resend         | 2j     | P30    |

**Nouvelles intégrations**
| Service | Cas d'usage | Marché | Effort |
|---|---|---|---|
| WhatsApp Business API | Notifier le concierge humain d'une urgence hors app | UK/Nordics/FR | 4j (voir 5.5) |

**Processus humain associé**

- [ ] Consulter le dashboard concierge chaque matin avant 8h
- [ ] Traiter la file par ordre de priorité (CRITIQUE d'abord)
- [ ] Pour chaque tâche traitée : noter l'action dans `ClientTimelineDrawer` (champ libre)
- [ ] Fin de semaine : vérifier qu'aucun client n'a de tâche `CRITIQUE` non traitée > 48h
- [ ] Fin de mois : générer le résumé "Ce mois-ci pour vous" par client (semi-automatisé, à valider avant envoi)

**Pricing du chapitre**
Inclus dans Essential (490€/mois, jusqu'à 30 véhicules). Couvre : traitement des alertes conformité, réponse aux questions conducteurs via Concierge IA, remontée des contraventions/documents à renouveler. Limite humaine incluse : 4h/mois de conciergerie active (au-delà, facturé 65€/h).

**Métriques de succès**

- Temps moyen de traitement d'une tâche `CRITIQUE` < 4h
- 0 échéance réglementaire manquée (BiK/CT/assurance) sur les clients pilotes
- Score de santé flotte moyen des clients > 80/100 après 60 jours

---

### CHAPITRE 4 — ENTRETIEN ET INCIDENTS _(M3-M5)_

**Prérequis** : Chapitre 3 livré (file de tâches et dashboard existent).

**Nouvelles features logiciel**

| Feature                                  | Description                                                                     | Tables                                                                                                         | UI                                                            | Agent                                                  | Intégrations                                                  | Effort | Prompt |
| ---------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------- | ------ | ------ |
| Réseau garages actif                     | Prise de RDV réelle (pas juste annuaire), confirmation, statut d'intervention   | Étend `garages` (+`apiEndpoint`, `bookingSupported`), nouvelle `garageBookings`                                | `/admin/maintenance` (bouton "Réserver via réseau")           | —                                                      | Halfords Autocentres API (UK), Mekonomen (Nordics) — voir 5.2 | 10j    | P31    |
| Véhicule de remplacement                 | Proposer un véhicule pool de la flotte client ou externe pendant immobilisation | Étend `maintenanceRecords`/`incidents` (+`replacementVehicleId`, +`replacementReservationId`)                  | Card "Véhicule de remplacement" sur page incident/maintenance | Concierge (tool `proposeReplacementVehicle`)           | —                                                             | 5j     | P32    |
| Sinistres bout-en-bout avec API assureur | Déclaration → transmission automatique (au lieu d'email manuel) → suivi statut  | Étend `incidents` (+`insurerApiRef`, +`insurerSyncStatus`)                                                     | Timeline enrichie sur `/admin/incidents/[id]`                 | Compliance Officer (nouveau tool `checkInsurerStatus`) | AXA/MAIF/Allianz FR — voir 5.1                                | 12j    | P33    |
| Agent Inspection                         | Guide l'inspecteur, analyse les photos, génère le rapport certifié              | Étend `vehicleInspections` (+`geolocation`, +`timestamp` par photo, +`estimatedRepairCost`, +`aiAnomalyFlags`) | Wizard `/app/reservations/[id]/inspect` enrichi               | Nouveau agent (voir 4.5)                               | Claude Vision (analyse photo)                                 | 8j     | P34    |

**Nouvelles intégrations**
Voir Section 5.1 (assureurs) et 5.2 (garages).

**Processus humain associé — gestion d'un sinistre**

- [ ] Réception déclaration (app salarié ou appel direct)
- [ ] Vérification photos + complétude dossier sous 2h
- [ ] Transmission assureur (auto si API dispo, sinon email dans l'heure)
- [ ] Coordination garage partenaire + véhicule de remplacement sous 24h
- [ ] Suivi hebdomadaire du statut jusqu'à clôture
- [ ] Vérification imputation franchise correcte avant clôture

**Pricing du chapitre**
Inclus dans Professional (890€/mois, jusqu'à 75 véhicules). Facturé à l'acte : inspection pré-restitution 490€/véhicule (hors abonnement), convoyage 150-350€.

**Métriques de succès**

- Délai moyen déclaration → transmission assureur < 4h
- Taux de véhicules de remplacement proposés sous 24h > 90%
- Rapport d'inspection généré en < 10 min post-photos

---

### CHAPITRE 5 — OPTIMISATION CONTINUE _(M4-M6, en parallèle du Ch.4)_

**Prérequis** : Optimizer existant (`optimizer.ts`) comme fondation.

**Nouvelles features logiciel**

| Feature                            | Description                                                                                                                       | Tables                                                                                                                                          | UI                                                          | Agent                                                                                    | Intégrations | Effort | Prompt |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------ | ------ | ------ |
| Cost Negotiator (agent complet)    | Génère les mails de négociation leasing/assurance prêts à envoyer, track les négociations, calcule le ROI réel post-renégociation | Nouvelle `negotiations` (organizationId, type, vehicleId/contractRef, status, initialCost, negotiatedCost, savingsRealized, emailDraft, sentAt) | `/admin/finance/negotiations` (liste + templates éditables) | **Nouveau code** pour l'agent Negotiator (feature flag existe déjà, zéro implémentation) | —            | 10j    | P35    |
| Alertes assurance J-90             | Le Negotiator surveille les dates de renouvellement assurance                                                                     | Étend `costs` (catégorie ASSURANCE) pour dériver date d'échéance, ou nouvelle table `insuranceContracts`                                        | Alerte dans `concierge_tasks`                               | Cost Negotiator                                                                          | —            | 4j     | P36    |
| Détection sous-utilisation avancée | L'Optimizer existe déjà (P10) — étendre le seuil et la granularité (par site, par période)                                        | —                                                                                                                                               | Déjà sur `/admin/dashboard`                                 | Fleet Optimizer (extension)                                                              | —            | 2j     | P37    |
| Audit contrat automatisé           | Comparateur TCO contrat actuel vs marché                                                                                          | Nouvelle `contractAudits`                                                                                                                       | `/admin/finance/audit` (rapport téléchargeable)             | Cost Negotiator (tool `auditContract`)                                                   | —            | 6j     | P38    |

**Processus humain associé — audit et renégociation**

- [ ] Recevoir le signal Negotiator ("ce contrat leasing coûte 12% au-dessus du marché")
- [ ] Vérifier les données avec le client (kilométrage réel, durée restante)
- [ ] Envoyer l'email de négociation généré (relu et personnalisé avant envoi — jamais automatique)
- [ ] Négocier directement avec le leaser/assureur (appel ou email, 2-3 allers-retours en moyenne)
- [ ] Documenter l'économie réalisée dans `negotiations.savingsRealized`
- [ ] Reporter l'économie au client dans le portail Fleet Care

**Pricing du chapitre**
Inclus dans Professional. Success fee optionnel : 20% des économies réalisées la première année (facturé à l'acte, en plus de l'abonnement).

**Métriques de succès**

- Économie moyenne identifiée par client > 8% du TCO annuel
- Taux de négociations abouties > 60%
- Success fee moyen facturé par client actif

---

### CHAPITRE 1 — ACQUISITION _(M6-M9)_

**Prérequis** : Chapitres 3-5 stabilisés, base client établie (le chapitre le plus complexe techniquement, à ne pas lancer en premier).

**Nouvelles features logiciel**

| Feature                   | Description                                                                | Tables                                                                                                                   | UI                                             | Agent                       | Intégrations                                                     | Effort | Prompt |
| ------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- | --------------------------- | ---------------------------------------------------------------- | ------ | ------ |
| Comparateur multi-leasers | Demande de devis standardisée envoyée à plusieurs leasers, comparaison TCO | Nouvelle `acquisitionRequests` (organizationId, specs véhicule, leasersContacted, quotes reçus en JSON, selectedQuoteId) | `/admin/fleet/new` étape "Comparer les offres" | Cost Negotiator (extension) | Arval Partner Connect, Alphabet Fleet Connect, Ayvens — voir 5.4 | 15j    | P39    |
| Coordination livraison    | Suivi du véhicule commandé jusqu'à intégration flotte                      | Nouvelle `deliveryTracking` liée à `acquisitionRequests`                                                                 | Timeline sur page véhicule                     | —                           | —                                                                | 4j     | P40    |

**⚠️ Note de scope** : CLAUDE.md exclut explicitement le "procurement automatisé (négociation multi-leasers)". Ce chapitre doit rester un **service humain outillé**, pas une automatisation complète — le logiciel structure la demande de devis, l'humain négocie et décide. Ne pas construire de marketplace ou de mise en concurrence automatique sans validation produit préalable.

**Processus humain associé**

- [ ] Qualifier le besoin avec le client (usage, budget, durée)
- [ ] Envoyer la demande de devis structurée aux leasers partenaires
- [ ] Comparer et présenter 2-3 options au client avec recommandation
- [ ] Négocier les conditions finales (durée, kilométrage, options)
- [ ] Coordonner la livraison et la première inspection (Chapitre 2)

**Pricing du chapitre**
Inclus dans Business (1 490€/mois, jusqu'à 150 véhicules).

**Métriques de succès**

- Délai qualification → livraison réduit de 30% vs process client historique
- Économie moyenne sur le prix catalogue négocié > 5%

---

### CHAPITRE 6 — REVENTE _(M6-M9, en parallèle du Ch.1)_

**Prérequis** : historique de coûts/utilisation suffisant par véhicule (déjà disponible via `costs`, `maintenanceRecords`).

**Nouvelles features logiciel**

| Feature                                               | Description                                                                 | Tables                                                                                                                                         | UI                                                     | Agent                                 | Intégrations                                                                      | Effort | Prompt |
| ----------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------- | --------------------------------------------------------------------------------- | ------ | ------ |
| Scoring valeur résiduelle + moment optimal de revente | Extension de l'Optimizer : score par véhicule, alerte "à revendre sous 60j" | Étend `optimizerReports` (+type `resale_opportunity`), nouvelle `resaleScores` (vehicleId, estimatedValue, optimalWindowStart/End, confidence) | Card sur page véhicule + alerte dans `concierge_tasks` | Fleet Optimizer (extension, voir 4.3) | Autobiz/Cartotop pour valorisation temps réel — voir 5.3                          | 8j     | P41    |
| Dossier de revente                                    | Préparation automatique du dossier (historique entretien, photos, carnet)   | Nouvelle `resaleListings`                                                                                                                      | `/admin/fleet/[vehicleId]/resell`                      | —                                     | BCA Expertise, La Centrale Pro, AutoScout24 (Nordics), Autotrader (UK) — voir 5.3 | 10j    | P42    |
| Suivi transaction + commission                        | Track de la vente jusqu'à encaissement                                      | Étend `resaleListings` (+`saleAmount`, +`commissionAmount`, +`buyerRef`)                                                                       | Statut sur page véhicule                               | —                                     | Stripe (encaissement commission) — voir 5.5                                       | 5j     | P43    |

**Processus humain associé**

- [ ] Recevoir l'alerte "véhicule X à revendre sous 60j"
- [ ] Valider la pertinence avec le client (besoin encore du véhicule ?)
- [ ] Constituer le dossier (carnet d'entretien, photos, historique sinistres)
- [ ] Mettre en relation avec mandataire ou plateforme adaptée au marché
- [ ] Négocier le prix final
- [ ] Encaisser et reverser au client, moins la commission

**Pricing du chapitre**
Inclus dans Business. Commission sur transaction : 3-5% du prix de cession.

**Métriques de succès**

- Écart entre valeur de revente réalisée et estimation Mycelium < 10%
- Délai moyen alerte → transaction conclue < 45 jours

---

### CHAPITRE 2 — MISE EN SERVICE _(transverse, à tisser dans Ch.1 et Ch.3)_

Ce chapitre n'a pas de fenêtre de lancement dédiée : il s'appuie sur l'existant (`vehicleInspections` type DEPARTURE, `driverProfiles`, import flotte) et se déclenche naturellement à chaque nouveau véhicule ou nouveau conducteur, que ce soit via le Chapitre 1 (acquisition) ou directement en clientèle existante. Aucun nouveau développement majeur : l'Agent Inspection (4.5, livré en Chapitre 4) sert aussi ici pour la première inspection.

**Checklist opérationnelle mise en service**

- [ ] Réception véhicule → première inspection photographique complète
- [ ] Attribution au conducteur (`vehicleAssignments`)
- [ ] Vérification permis + formations (`driverProfiles`)
- [ ] Documents véhicule uploadés (carte grise, attestation assurance)
- [ ] Notification conducteur avec guide de prise en main

---

## SECTION 4 — Les nouveaux agents IA pour la conciergerie

### 4.1 Extension du Compliance Officer

**Actuellement** (`src/lib/convex/agents/compliance.ts`) : 6 tools read-only, scoring de risque déterministe, surveillance BiK/CSRD/TVS/documents véhicule/licences/violations.

**À ajouter :**

- Tool `escalateToConciergeQueue(alertId, priority)` — écrit dans la nouvelle table `concierge_tasks` au lieu de simplement notifier l'org
- Séquence d'alertes progressive : le scoring actuel (`horizon: 30_DAYS/7_DAYS/EXPIRED`) passe à `60_DAYS/30_DAYS/7_DAYS/EXPIRED` avec message différent à chaque palier
- Tool `generateReminderDraft(entityType, entityId)` — génère un brouillon d'email/SMS de rappel client, validé par le concierge avant envoi (jamais automatique vers le client final)
- Tool `getViolationDisputeStatus` + champ `disputeStatus` sur `trafficViolations` (NONE/CONTESTED/WON/LOST) pour suivre les contestations
- Tool `listDocumentsToRenew(vehicleId)` — vue unifiée par véhicule de tous les documents à renouveler (au lieu de les chercher table par table)

### 4.2 Extension du Cost Negotiator

**Actuellement** : n'existe pas en code — feature flag seul (`negotiator: true` sur `billing.ts`, tier Business).

**À construire (voir Chapitre 5 pour le détail features) :**

- Tool `identifySavingsOpportunities` — reprend la logique de détection déjà présente dans l'Optimizer (`cost_anomaly`, `lease_renewal`) mais avec un focus négociation active plutôt que rapport passif
- Tool `draftNegotiationEmail(contractRef, targetSavingsPercent)` — génère un email de négociation avec comparatifs de marché (nécessite une base de référence tarifaire, à construire ou acheter — cf. section pricing benchmarks marché)
- Tool `trackNegotiation(negotiationId, status)` — met à jour `negotiations.status` (OPENED/IN_PROGRESS/WON/LOST/ABANDONED)
- Tool `calculateRealizedROI(negotiationId)` — compare coût avant/après sur 12 mois glissants pour facturer le success fee
- Tool `checkInsuranceRenewalWindow` — surveille les contrats assurance à échéance sous 90 jours (nouvelle donnée à collecter, cf. `insuranceContracts`)

### 4.3 Extension du Fleet Optimizer

**Actuellement** (`optimizer.ts`) : cron hebdo, cache prompt ephemeral, 5 recommandations max, types `underutilized_vehicle`/`cost_anomaly`/`maintenance_overdue`/`lease_renewal`/`fleet_right_sizing`/`fuel_efficiency`.

**À ajouter :**

- Nouveau type de recommandation `resale_opportunity` : croise âge véhicule, kilométrage, coûts d'entretien croissants et données de valorisation externe (Autobiz/Cartotop, cf. 5.3) pour scorer chaque véhicule
- Fonction `calculateOptimalResaleWindow(vehicleId)` — modèle simple basé sur la courbe de dépréciation standard + coûts de maintenance prévisionnels (pas de ML complexe nécessaire au départ, une heuristique suffit : maintenance prévisionnelle > X% de la valeur résiduelle = alerte)
- Alerte dédiée dans le rapport hebdo : "Ce véhicule devrait être revendu dans les 60 jours pour maximiser sa valeur" avec justification chiffrée

### 4.4 Nouveau — L'Agent Concierge Dashboard

**Rôle** : agent d'arrière-plan dédié au concierge humain (jamais exposé au client final). Il ne répond à aucune question — il produit un briefing et priorise.

**Architecture :**

- Cron quotidien 7h UTC (pattern identique à `runFleetOptimizerForAllOrgs`), fichier `src/lib/convex/agents/conciergeDashboard.ts`
- Étape 1 : collecte cross-org de tous les signaux ouverts (`concierge_tasks` statut ≠ DONE, `complianceAlerts` non résolues, `incidents` statut ≠ CLOSED, `trafficViolations` en attente)
- Étape 2 : scoring de priorité déterministe (pas besoin de LLM pour ça — reprendre la logique de scoring déjà en place dans `compliance.ts` lignes 457-461, l'étendre à tous les types de tâches)
- Étape 3 : appel Claude Sonnet 4.6 (cache ephemeral sur le prompt système) pour rédiger le briefing en langage naturel à partir des données scorées — un seul appel, pas de boucle agentique nécessaire
- Étape 4 : email HTML au concierge (réutilise le pattern `sendOptimizerReportEmail`)

**Tools (pour usage interactif depuis le dashboard, en plus du cron) :**

- `getAggregatedQueue(filters)` — la file cross-org filtrée
- `getClientHealthScore(organizationId)` — score composite d'un client
- `flagUrgentIntervention(taskId, reason)` — force une escalade immédiate (déclenche webhook WhatsApp, cf. 8.3)

**Priorisation :** `score = base_severity × urgency_multiplier × client_tier_weight`. Un sinistre critique chez un client Business pèse plus qu'une échéance BiK à J-45 chez un client Essential — mais jamais au point de faire disparaître une échéance légale du radar (plancher minimum de priorité pour tout ce qui touche à la conformité réglementaire).

### 4.5 Nouveau — L'Agent Inspection

**Rôle** : assiste l'inspecteur humain (concierge ou conducteur) pendant une inspection physique (prise en charge, restitution, pré-vente).

**Architecture :**

- Étend le flux existant `vehicleInspections` (déjà : photos par angle, dommages avec sévérité)
- Étape guidage : liste de contrôle interactive dans le wizard `/app/reservations/[id]/inspect` existant — "Photo suivante : angle avant-gauche", "Vérifiez : niveau carburant, kilométrage au compteur"
- Étape analyse photo : appel Claude (vision) sur chaque photo soumise pour détecter des anomalies visuelles évidentes (rayure, bosse, pneu usé) — sert de garde-fou, pas de vérité absolue, toujours validable par l'humain
- Étape géolocalisation + horodatage : capturé côté client (navigator.geolocation) et stocké avec chaque photo (nouveau champ `photos[].geolocation`, `photos[].capturedAt` sur `vehicleInspections`)
- Étape rapport : génération automatique d'un PDF certifié (photos horodatées/géolocalisées + liste des dommages + comparaison avec l'inspection précédente du même véhicule si disponible)
- Étape estimation : calcul grossier du coût de remise en état par type de dommage × sévérité (table de référence à constituer, `damageRepairEstimates` — barème simple, pas besoin d'API externe au démarrage)

**Tools :**

- `getInspectionChecklist(vehicleId, type)` — retourne la liste de contrôle adaptée au type de véhicule
- `analyzePhotoForAnomalies(storageId)` — appel vision, retourne liste d'anomalies détectées avec confiance
- `generateCertifiedReport(inspectionId)` — assemble le PDF
- `estimateRepairCost(damages[])` — calcul basé sur barème

---

## SECTION 5 — Nouvelles intégrations prioritaires

### 5.1 Gestion des sinistres (assureurs)

| Assureur        | Cas d'usage                                  | Marché      | Effort                                        |
| --------------- | -------------------------------------------- | ----------- | --------------------------------------------- |
| AXA (FR)        | Déclaration sinistre via API, suivi statut   | France      | 8j (API propriétaire, doc partenaire requise) |
| Generali (FR)   | Idem                                         | France      | 8j                                            |
| MAIF (FR)       | Idem                                         | France      | 6j (API plus ouverte historiquement)          |
| Allianz (FR/UK) | Idem, potentiel réutilisation pour marché UK | France + UK | 10j                                           |
| Groupama (FR)   | Idem                                         | France      | 8j                                            |

**Format d'échange standard** : construire une couche d'abstraction `InsurerConnector` (même pattern que `AccountingConnector` existant en `port.ts`) — un seul contrat d'interface (`declareIncident`, `getIncidentStatus`, `uploadDocument`), une implémentation par assureur. Réutiliser directement l'architecture provider-agnostic déjà validée sur la couche comptable.

### 5.2 Réseau garages partenaires

| Réseau                                  | Marché  | Cas d'usage                             | Effort                                                          |
| --------------------------------------- | ------- | --------------------------------------- | --------------------------------------------------------------- |
| Norauto Pro / Speedy Pro / Feu Vert Pro | France  | Prise de RDV, confirmation, facturation | 6j chacun (APIs partenaires à négocier commercialement d'abord) |
| Halfords Autocentres                    | UK      | Idem                                    | 8j                                                              |
| Mekonomen Group                         | Nordics | Idem                                    | 8j                                                              |

**Note** : ces intégrations dépendent d'accords commerciaux préalables avec les réseaux (accès API généralement réservé aux partenaires officiels). Le travail technique est secondaire au travail commercial ici — prévoir 4-8 semaines de négociation partenariat avant le développement.

### 5.3 Revente

| Service            | Cas d'usage                                              | Marché  | Effort                          |
| ------------------ | -------------------------------------------------------- | ------- | ------------------------------- |
| Autobiz / Cartotop | Valorisation temps réel pour le scoring de revente (4.3) | France  | 5j                              |
| BCA Expertise      | Mandataire pro pour transaction                          | France  | 6j (relation commerciale + API) |
| La Centrale Pro    | Diffusion annonce                                        | France  | 4j                              |
| AutoScout24 Pro    | Diffusion annonce                                        | Nordics | 5j                              |
| Autotrader         | Diffusion annonce                                        | UK      | 5j                              |

### 5.4 Acquisition véhicules

| Leaser                    | Cas d'usage                       | Marché        | Effort                                 |
| ------------------------- | --------------------------------- | ------------- | -------------------------------------- |
| Arval Partner Connect     | Demande de devis, comparateur TCO | FR/UK/Nordics | 10j                                    |
| Alphabet Fleet Connect    | Idem                              | FR/UK/Nordics | 10j                                    |
| Ayvens (ex-ALD/LeasePlan) | Idem                              | FR/UK/Nordics | 12j (fusion récente, API en évolution) |

**Format standardisé** : même logique que 5.1 — interface `LeaserConnector` unique, un connecteur par leaser, comparateur TCO consommant les réponses normalisées.

### 5.5 Communication enrichie

| Service               | Cas d'usage                                                                        | Effort                                                    |
| --------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------- |
| WhatsApp Business API | Notifications client + escalade concierge urgente (cf. 8.3)                        | 5j                                                        |
| Docusign / Yousign    | Signature électronique documents (contrats négociation, dossiers revente)          | 4j (Yousign prioritaire — acteur FR/EU, conformité eIDAS) |
| Stripe                | Encaissement commission revente (5.3), pas pour l'abonnement (Paddle reste le MoR) | 3j                                                        |

---

## SECTION 6 — Le modèle économique complet

### 6.1 Les tiers de service

**ESSENTIAL — 490€/mois (jusqu'à 30 véhicules)**
Inclus : Mycelium Fleet OS complet + Chapitre 3 (vie quotidienne)

- Concierge IA salarié illimité
- Dashboard admin, réservations, calendrier
- Compliance Officer (alertes BiK/CSRD/TVS, documents véhicule, licences)
- Traitement des contraventions et sinistres simples (déclaration + suivi, pas de négociation active)
- Limite humaine : **4h/mois de conciergerie active** incluses (au-delà : 65€/h)

**PROFESSIONAL — 890€/mois (jusqu'à 75 véhicules)**
Inclus : Essential + Chapitre 4 (entretien et incidents) + Chapitre 5 (optimisation)

- Réseau garages actif avec prise de RDV
- Véhicule de remplacement coordonné
- Sinistres bout-en-bout avec transmission assureur accélérée
- Cost Negotiator : identification + négociation active des contrats
- Sync comptable native (Xero/QuickBooks/Pennylane/etc.)
- Limite humaine : **10h/mois**

**BUSINESS — 1 490€/mois (jusqu'à 150 véhicules)**
Inclus : Professional + Chapitre 1 (acquisition) + Chapitre 6 (revente)

- Comparateur multi-leasers pour nouveaux véhicules
- Coordination livraison
- Scoring revente + mise en relation acheteurs
- Coach conducteurs (éco-conduite, sécurité)
- **Conciergerie illimitée**

**Enterprise** : sur devis, > 150 véhicules, SLA dédié, concierge nommé.

### 6.2 Services facturables à l'acte (tous tiers)

| Service                                   | Prix                    |
| ----------------------------------------- | ----------------------- |
| Audit de contrats leasing/assurance       | 1 500€                  |
| Inspection pré-restitution                | 490€/véhicule           |
| Convoyage véhicule                        | 150-350€ selon distance |
| Commission revente                        | 3-5% du prix de cession |
| Success fee optimisation contrats         | 20% des économies An1   |
| Heures de conciergerie au-delà du forfait | 65€/h                   |

### 6.3 Projections de revenus (conservateur)

Hypothèses : montée en charge progressive, mix de tiers réaliste pour une PME early-stage (peu de clients Business en An1), one-shot modéré (l'acte facturable dépend de la maturité du service humain, pas seulement du logiciel).

|          | Clients | Mix tiers                                    | MRR fin d'année                                     | One-shot annuel (audits/inspections/commissions)         | Total revenus annuels |
| -------- | ------- | -------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------- | --------------------- |
| **An 1** | 15      | 10 Essential / 4 Professional / 1 Business   | 4 900+3 560+1 490 = **9 950€/mois** (~119k€/an)     | ~15k€ (quelques audits + inspections)                    | **~134k€**            |
| **An 2** | 45      | 25 Essential / 15 Professional / 5 Business  | 12 250+13 350+7 450 = **33 050€/mois** (~397k€/an)  | ~60k€ (négociations + commissions revente qui démarrent) | **~457k€**            |
| **An 3** | 100     | 45 Essential / 40 Professional / 15 Business | 22 050+35 600+22 350 = **80 000€/mois** (~960k€/an) | ~180k€ (volume revente + success fees matures)           | **~1,14M€**           |

**Lecture** : le MRR logiciel seul justifie difficilement le coût du service humain avant l'An 2. Le modèle ne devient rentable à l'échelle qu'une fois le ratio concierge/clients optimisé (viser 1 concierge pour 15-20 clients Essential équivalents, moins pour Business). Le success fee et la commission de revente sont les leviers de marge, pas l'abonnement seul — c'est cohérent avec la thèse "80% de la valeur perçue est humaine, mais l'abonnement seul ne finance pas le service, les actes le font."

---

## SECTION 7 — Plan de lancement (90 premiers jours)

**Objectif final** : 3 clients payants Essential (490€/mois), Chapitre 3 livré et documenté, protocole de conciergerie écrit et reproductible, 1 470€ MRR.

| Semaine | Objectif principal                 | Dev à faire                                                 | Action commerciale                                                     | Livrable mesurable                                          |
| ------- | ---------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------- |
| S1      | Table de tâches + priorisation     | `concierge_tasks` (P26)                                     | Identifier 10 prospects dans le réseau existant (clients beta actuels) | Table déployée, 0 tâche (vide, prête)                       |
| S2      | Dashboard concierge v1             | `/concierge` skeleton + `ConciergeQueueView` (P27, partiel) | Premiers appels de découverte (5 prospects)                            | Dashboard affiche les tâches d'1 org de test                |
| S3      | Dashboard concierge v2 (multi-org) | `ClientHealthGrid` + agrégation cross-org (P27, fin)        | Pitch du service à 3 prospects qualifiés                               | Dashboard fonctionnel sur 2+ orgs réelles                   |
| S4      | Séquence alertes réglementaires    | Escalade J-60/J-30/J-7 (P28)                                | Négociation conditions avec 1er client pilote                          | 1 client signé en pilote gratuit 30j                        |
| S5      | Briefing matinal                   | Agent Concierge Dashboard cron (P30)                        | Onboarding manuel du client pilote (checklist 9.1)                     | Premier briefing matinal reçu par email                     |
| S6      | Portail client Fleet Care v1       | `/app/fleet-care` (P29, partiel)                            | Poursuivre prospection (objectif : 2 clients de plus en pipe)          | Client pilote voit son score de santé                       |
| S7      | Portail client Fleet Care v2       | Finaliser section "ce mois/mois prochain" (P29, fin)        | Retour d'expérience client pilote, ajustements                         | Premier "résumé mensuel" généré pour le pilote              |
| S8      | Rédaction du protocole concierge   | — (documentation, pas de dev)                               | Conversion client pilote en payant Essential                           | 1er client payant signé (490€/mois)                         |
| S9      | Webhook escalade urgente           | WhatsApp Business intégration basique (5.5)                 | Prospection ciblée nouveaux clients (2 en pipe)                        | Test réel d'une escalade urgente simulée                    |
| S10     | Polish dashboard + bugs terrain    | Corrections issues du run réel avec le pilote               | Closing 2e client                                                      | 2e client signé                                             |
| S11     | Consolidation processus            | Finaliser checklists 9.1-9.3 avec retours terrain           | Closing 3e client                                                      | 3e client signé                                             |
| S12     | Bilan 90 jours                     | Revue technique + retro                                     | Présentation résultats, préparation Sprint suivant (Chapitre 4)        | **3 clients Essential actifs, 1 470€ MRR, protocole écrit** |

---

## SECTION 8 — Architecture technique détaillée

### 8.1 La nouvelle table `concierge_tasks`

```typescript
// src/lib/convex/schema.ts — ajout
concierge_tasks: defineTable({
  organizationId: v.id("organizations"),
  sourceType: v.union(
    v.literal("COMPLIANCE_ALERT"),
    v.literal("INCIDENT"),
    v.literal("VIOLATION"),
    v.literal("MAINTENANCE"),
    v.literal("NEGOTIATION"),
    v.literal("RESALE_OPPORTUNITY"),
    v.literal("MANUAL"), // créée directement par un concierge humain
  ),
  sourceId: v.optional(v.string()), // id de l'entité source (incidents, trafficViolations, etc.)
  priority: v.union(
    v.literal("CRITICAL"),
    v.literal("URGENT"),
    v.literal("NORMAL"),
    v.literal("INFO"),
  ),
  priorityScore: v.number(), // calculé, permet le tri fin sans recalcul à l'affichage
  title: v.string(),
  description: v.string(),
  dueDate: v.optional(v.number()),
  status: v.union(
    v.literal("OPEN"),
    v.literal("IN_PROGRESS"),
    v.literal("SNOOZED"),
    v.literal("DONE"),
  ),
  snoozedUntil: v.optional(v.number()),
  assignedTo: v.optional(v.string()), // userId du concierge humain (compte interne Mycelium)
  completedAt: v.optional(v.number()),
  completionNotes: v.optional(v.string()),
  createdAt: v.number(),
})
  .index("by_org", ["organizationId"])
  .index("by_status_and_priority", ["status", "priorityScore"])
  .index("by_assigned", ["assignedTo", "status"])
  .index("by_org_and_status", ["organizationId", "status"]),
```

**Logique de priorisation automatique** (fonction pure, appelée à la création et recalculée quotidiennement par le cron de l'Agent Concierge Dashboard) :

```
priorityScore = severityBase(sourceType)
              × urgencyMultiplier(dueDate)     // >1 si échéance proche
              × tierWeight(organization.tier)  // Business > Professional > Essential
              × complianceFloor(sourceType)    // plancher minimum pour tout ce qui est réglementaire/légal
```

### 8.2 Le module multi-org dashboard

**Principe de sécurité** : les requêtes cross-org ne doivent **jamais** être exposées à un rôle `ORG_ADMIN`/`ORG_MEMBER` classique. Elles nécessitent un rôle distinct, `CONCIERGE` ou `CONCIERGE_ADMIN`, vérifié via Better Auth de la même manière que les rôles admin de plateforme existants (`adminAuditLogs`, `listUsers` dans `admin/queries.ts` — ce pattern global existe déjà et sert de précédent direct).

```typescript
// src/lib/convex/concierge/queries.ts
export const getAggregatedQueue = query({
	args: {
		filters: v.optional(
			v.object({
				/* ... */
			})
		)
	},
	handler: async (ctx, args) => {
		await requireConciergeRole(ctx); // nouveau guard, distinct de requireOrgAdmin
		// Query cross-org volontaire et explicite — jamais implicite
		const tasks = await ctx.db
			.query('concierge_tasks')
			.withIndex('by_status_and_priority')
			.filter((q) => q.neq(q.field('status'), 'DONE'))
			.collect();
		// Enrichir avec le nom de l'org pour affichage (pas de fuite de données autre-org
		// vers un client — ce guard réserve cette query aux comptes internes Mycelium)
		return enrichWithOrgNames(ctx, tasks);
	}
});
```

**Isolation maintenue** : toutes les autres queries de l'app (`admin/*`, `app/*`) restent strictement scopées par `organizationId` comme aujourd'hui. Seul le nouveau namespace `concierge/*` a le droit de faire des requêtes cross-org, et seulement derrière le guard `requireConciergeRole`. C'est la même logique que les crons existants (`optimizer.ts`, `alerts.ts`) qui itèrent déjà sur toutes les orgs en interne — on formalise juste un accès humain à ce qui n'existait qu'en cron.

### 8.3 Webhooks sortants pour le concierge

| Priorité | Canal                                                                  | Délai cible          |
| -------- | ---------------------------------------------------------------------- | -------------------- |
| CRITICAL | WhatsApp Business (message direct au concierge assigné) + SMS fallback | Immédiat             |
| URGENT   | Email + notification in-app dashboard concierge                        | < 1h                 |
| NORMAL   | Notification in-app uniquement                                         | Vu au prochain login |
| INFO     | Agrégé dans le briefing matinal (4.4) uniquement                       | Prochain jour ouvré  |

Implémentation : réutiliser le pattern `webhookEndpoints`/`webhookDeliveries` existant (déjà signé HMAC SHA-256, retries x5 backoff) — ajouter un `webhookEndpoint` interne pointant vers le service WhatsApp/SMS au lieu d'un endpoint partenaire externe.

### 8.4 API REST pour les partenaires

Réutilise directement l'infrastructure `/api/v1/` existante (`apiKeys` scopées `myc_live_*`, rate limiting 100 req/min). Nouveaux endpoints nécessaires :

```yaml
openapi: 3.1.0
paths:
  /api/v1/incidents/{id}/insurer-status:
    get:
      summary: Statut sinistre côté assureur (pour connecteurs InsurerConnector)
  /api/v1/garages/{id}/bookings:
    post:
      summary: Créer une demande de RDV garage
  /api/v1/garages/{id}/bookings/{bookingId}:
    patch:
      summary: Mise à jour statut intervention (par le garage partenaire)
  /api/v1/resale/listings/{id}/offers:
    post:
      summary: Soumettre une offre d'achat (mandataire/plateforme revente)
```

Authentification : clé API scopée par partenaire (`scopes: ["garage:bookings:write"]` etc.), même mécanisme que les clés client existantes mais avec des scopes dédiés partenaires, non exposés dans l'UI `/admin/settings/integrations`.

---

## SECTION 9 — Processus opérationnels (le manuel du concierge)

### 9.1 Onboarding d'un nouveau client (J1 à J30)

- [ ] **J1** — Appel de bienvenue (30 min) : présentation du concierge nommé, collecte des attentes
- [ ] **J1** — Import flotte (automatisé, CSV existant) — vérifié manuellement par le concierge
- [ ] **J2-J5** — Vérification des données véhicules (dates CT/assurance/leasing) — le Compliance Officer scanne automatiquement, le concierge valide les anomalies
- [ ] **J5** — Invitation des conducteurs (automatisé via `/admin/settings/members`)
- [ ] **J7** — Premier contact avec chaque conducteur (email automatisé + suivi humain si non-réponse à J10)
- [ ] **J10** — Configuration des intégrations comptables si souscrites (Xero/QB/Pennylane — assisté par le concierge la première fois)
- [ ] **J15** — Premier point de suivi avec le client (15 min, par téléphone ou visio)
- [ ] **J20** — Vérification que la file `concierge_tasks` du client est propre (pas de `CRITICAL` non traité)
- [ ] **J30** — Bilan du premier mois + envoi du premier résumé Fleet Care ("Ce mois-ci pour vous")
- [ ] **Automatisé vs manuel** : import, invitations, scan compliance = automatisé. Appels, validation des anomalies, résumé mensuel = manuel (assisté par génération IA, jamais envoyé sans relecture).

### 9.2 Gestion d'une contravention

- [ ] Réception (email scan ou upload manuel par le client) → `trafficViolations` statut `RECEIVED`
- [ ] Identification automatique du conducteur via planning (`reservations` au moment de l'infraction) → statut `IDENTIFIED`
- [ ] Concierge vérifie la pertinence d'une contestation (montant, circonstances, historique du conducteur)
- [ ] Si contestation : rédaction et envoi du recours (humain, pas de template auto-envoyé)
- [ ] Si pas de contestation : décision imputation (COMPANY/DRIVER), notification conducteur → statut `NOTIFIED`
- [ ] Suivi paiement → statut `PAID` ou suivi contestation → `CONTESTED` → `WON`/`LOST`
- [ ] Clôture avec note dans `ClientTimelineDrawer`

### 9.3 Gestion d'un sinistre

- [ ] Déclaration (conducteur via app ou concierge par téléphone) → `incidents` statut `DECLARED`
- [ ] Vérification complétude du dossier (photos, tiers, description) sous 2h
- [ ] Transmission à l'assureur (API si disponible, sinon email structuré) → `SENT_TO_INSURER`
- [ ] Coordination garage partenaire (5.2) + véhicule de remplacement (Ch.4) sous 24h
- [ ] Suivi hebdomadaire du statut (`EXPERTISE` → `REPAIR`)
- [ ] Vérification imputation franchise (déjà automatisée dans le code existant)
- [ ] Clôture (`CLOSED`) avec récapitulatif envoyé au client via portail Fleet Care

### 9.4 Audit et renégociation de contrats

- [ ] Réception du signal Negotiator ou demande client directe
- [ ] Collecte des données contractuelles (durée, kilométrage, conditions actuelles)
- [ ] Comparaison avec benchmarks marché (base interne à constituer au fil des négociations passées — c'est le moat, cf. 10.2)
- [ ] Présentation du rapport d'audit au client (format simple : "vous payez X, le marché est à Y, potentiel d'économie Z")
- [ ] Validation du mandat de négociation avec le client (accord écrit avant contact du leaser/assureur)
- [ ] Négociation directe (2-3 échanges en moyenne)
- [ ] Formalisation du nouveau contrat, mise à jour `costs` et `negotiations.savingsRealized`
- [ ] Facturation du success fee si applicable

### 9.5 Inspection pré-restitution

- [ ] Planification du RDV d'inspection (concierge ou conducteur, selon le contexte)
- [ ] Suivi du guide interactif (Agent Inspection, 4.5) : photos 6 angles minimum + zoom sur dommages
- [ ] Vérification kilométrage et niveau carburant
- [ ] Comparaison automatique avec l'inspection de départ (si disponible)
- [ ] Génération du rapport certifié (PDF horodaté/géolocalisé)
- [ ] Si dommage nouveau détecté : notification immédiate + estimation coût remise en état
- [ ] Si contestation du client sur un dommage : arbitrage humain avec les deux jeux de photos (départ vs retour)

### 9.6 Revente d'un véhicule

- [ ] Réception de l'alerte Optimizer "à revendre sous 60j" (Ch.6, 4.3)
- [ ] Validation avec le client (toujours besoin du véhicule ? contexte flotte inchangé ?)
- [ ] Constitution du dossier (carnet d'entretien complet, photos actuelles, historique sinistres/entretien depuis `costs`/`maintenanceRecords`)
- [ ] Choix du canal adapté (mandataire pro FR, plateforme UK/Nordics selon marché — 5.3)
- [ ] Mise en relation et négociation du prix final
- [ ] Suivi transaction jusqu'à encaissement (Stripe pour la commission)
- [ ] Reversement au client, moins commission, avec récapitulatif dans le portail Fleet Care

---

## SECTION 10 — Différenciation concurrentielle

### 10.1 Pourquoi Mycelium Fleet Care gagne

| Face à...                          | Leur limite                                                                                                                                                  | Notre avantage                                                                                                                                           |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Gestionnaire de flotte interne** | Coût fixe (35-50k€/an chargé), disponibilité limitée (1 personne, congés, turnover), compétences généralistes (pas d'expertise BiK/CSRD/négociation pointue) | Coût variable et scalable, disponibilité continue via l'équipe concierge mutualisée, expertise multi-domaine outillée par le logiciel                    |
| **Leaser proposant des services**  | Conflit d'intérêts structurel (intéressé à vendre plus de leasing, pas à optimiser vos coûts), volume minimum souvent requis, pas de vue multi-leaser        | Indépendance totale (aucun intérêt à ce que vous restiez chez un leaser plutôt qu'un autre), pas de seuil de volume, comparateur multi-leaser natif      |
| **SaaS de fleet management pur**   | Zéro dimension humaine — l'outil signale, personne n'agit à votre place                                                                                      | Le logiciel signale ET quelqu'un agit — c'est la promesse "vous n'avez plus à y penser"                                                                  |
| **Cabinet de conseil fleet**       | Coût élevé (mission ponctuelle, pas de continuité), pas de logiciel entre les missions, réactivité faible                                                    | Prix mensuel prévisible, continuité permanente via le logiciel entre deux interventions humaines, réactivité quasi temps réel via le dashboard concierge |

### 10.2 La donnée comme moat

Chaque client ajoute à trois bases de connaissance qui n'existent nulle part ailleurs sous cette forme agrégée :

1. **Benchmarks de coûts réels** — les vrais tarifs négociés (leasing, assurance, entretien) par catégorie de véhicule, par pays, par taille de flotte. Plus il y a de clients, plus le Cost Negotiator argumente avec des chiffres réels plutôt que des estimations.
2. **Valeur résiduelle réelle observée** — chaque transaction de revente enrichit le modèle de scoring du Chapitre 6 avec de la donnée réelle plutôt que des barèmes théoriques (Autobiz/Cartotop donnent une estimation de marché, mais nos propres transactions closes affinent la précision au fil du temps).
3. **Patterns de sinistralité** — quels types de véhicules, quels profils de conducteurs, quels usages génèrent le plus d'incidents/contraventions. Cette donnée devient un argument de négociation assurance à terme (« nos clients ont un profil de risque X% inférieur à la moyenne du marché »).

Cette accumulation est invisible au client — elle ne se voit pas dans l'interface. C'est un avantage qui s'épaissit silencieusement avec chaque mois d'activité, contrairement aux features logicielles qui sont copiables.

### 10.3 L'effet réseau

- **Revente inter-clients** : un véhicule qui ne convient plus au client A (surdimensionné, mauvaise énergie pour son usage) peut être exactement ce que cherche le client B en acquisition (Chapitre 1) — Mycelium peut faire matcher directement sans passer par un marché externe, marge plus élevée des deux côtés.
- **Benchmarks sectoriels** : un client peut savoir, de façon anonymisée, s'il paie plus ou moins cher que des flottes comparables (même secteur, taille similaire) — un argument de rétention fort une fois la base de clients suffisante (à ne pas activer avant volume significatif, cf. contrainte CLAUDE.md "pas de vision macro-prédictive avant 10 000 clients actifs").
- **Volume de négociation agrégé** : à terme, la masse de contrats leasing/assurance gérés collectivement donne un pouvoir de négociation que chaque client seul n'aurait pas — sans jamais dévoiler d'informations client individuelles aux leasers/assureurs (agrégation anonymisée uniquement).

---

## Annexe — Prochains prompts Claude Code à créer

Les prompts référencés dans ce document (P26 à P43) n'existent pas encore dans `/docs/prompts/`. Le dernier prompt livré est P24 (`connecteurs-comptables`), le prochain disponible est **P26** (P25 déjà utilisé pour Xero/QuickBooks natifs, cf. CLAUDE.md Sprint 2). À rédiger dans l'ordre de la roadmap ci-dessus, en commençant par le Chapitre 3 (P26-P30) qui est la priorité absolue des 90 premiers jours.
