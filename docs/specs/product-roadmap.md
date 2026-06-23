# Mycelium Fleet OS — Roadmap produit complète

## Principe directeur
Chaque feature listée résout un pain point validé d'un CFO/RH/salarié de PME 50-500 personnes avec flotte 15-150 véhicules, **prioritairement au UK et dans les pays nordiques**.
Si une feature ne sert pas cette cible sur ces marchés, elle n'est pas dans cette roadmap.

**Pricing (post-pivot) :** Essential 490€/£420 (50 conducteurs) — Professional 890€/£750 (150) — Business 1 490€/£1 250 (300) — overage 5-8€/conducteur. Facturation via Paddle (MoR).

## Vue d'ensemble des versions

| Version | Période cible | Objectif principal |
|---|---|---|
| V1 — MVP Pool Sharing Light | M1-M2 | Premier client beta utilisable |
| V1.5 — Premiers payants UK | M3-M4 | 10 clients payants (Xero/QuickBooks), MRR £5k |
| V2 — Indispensable au CFO | M5-M8 | 50 clients UK+Nordiques, ARR £300k |
| V3 — Indispensable au RH | M9-M12 | 150 clients, ARR £750k |
| V4 — Indispensable à la direction | M13-M18 | 400 clients, ARR £2,5M |
| V5 — Référence marché PME global | M19-M24 | 800 clients, ARR £5M |

---

## 🎯 AXE TRANSVERSE PRIORITAIRE — Distribution Global Day-1 via écosystèmes internationaux

> **Pivot stratégique juin 2026 : abandon de la distribution franco-française comme priorité #1.**
> Lancement UK + pays nordiques. Distribution via Xero, QuickBooks, Odoo.
> Doctrine complète : **[/docs/specs/distribution-integrations-strategy.md](distribution-integrations-strategy.md)**.

**Décision stratégique (juin 2026) :** Mycelium lance Global Day-1. Le marché français est mis en pause au profit du UK et des pays nordiques — marchés à forte maturité SaaS, cycles de vente courts, CFO qui achètent en ligne sans appel commercial.

La distribution se fait via l'insertion dans les écosystèmes logiciels déjà utilisés par nos cibles (Xero, QuickBooks, Odoo) + Paddle comme Merchant of Record pour éliminer la friction fiscale internationale.

| Canal | Marché | Version | Prompt | Statut |
|---|---|---|---|---|
| **Xero App Marketplace** | UK + global | **V1.5 — prioritaire** | **P25** | À construire |
| **QuickBooks App Store** | UK + USA + global | **V1.5 — prioritaire** | **P25** | À construire |
| **Odoo community** | ETI mondiales | V2 | P24 | Maintenu + accéléré |
| **API publique + Webhooks** | — | V2 | P24 | Maintenu |
| **Paddle (MoR)** | Global | V1.5 | P_PADDLE | À construire |
| Pennylane | France | — | P23 | Livré — maintenu, non prioritaire |
| Sage / EBP | France | — | P24 | Backlog post-M12 |

> Ces intégrations **enrichissent** la gestion de flotte PME, elles n'ouvrent **pas** un produit marque blanche leaser ni une marketplace inter-entreprises. On reste Fleet OS.

---

## VERSION 1 — MVP POOL SHARING LIGHT (M1-M2)

### Objectif
Le client a un produit fonctionnel pour gérer sa flotte en pool partagé, remplaçant son Excel.

### Modules

**Module 1.1 — Authentification multi-tenant**
- Signup/login email + password
- Création d'organisation via SIREN (auto-complétion Pappers)
- Switch entre organisations (pour les comptables multi-clients plus tard)
- Page /admin/settings/organization
- Rôles ORG_ADMIN et ORG_MEMBER

**Module 1.2 — Gestion de la flotte**
- Import CSV de véhicules avec mapping flexible
- Ajout manuel d'un véhicule
- Page liste flotte avec filtres et recherche
- Page détail véhicule avec onglets
- Statuts : AVAILABLE / IN_USE / MAINTENANCE / RETIRED
- Champs : immatriculation, marque, modèle, année, énergie, catégorie, kilométrage, dates achat/leasing, site, notes

**Module 1.3 — Dashboard admin basique**
- 4 KPIs : nombre véhicules, taux d'utilisation, en maintenance, alertes ouvertes
- Graphique d'utilisation 14 derniers jours
- Donut chart répartition par statut
- Liste véhicules nécessitant attention (entretien proche, leasing finissant)
- Feed d'activité récente temps réel

**Module 1.4 — Agent Concierge (chat IA)**
- Interface chat dans /app
- Réservation en langage naturel ("J'ai besoin d'un véhicule jeudi pour Lyon")
- 4 tools : searchAvailableVehicles, createReservation, listMyReservations, cancelReservation
- Streaming des réponses
- Persistence des conversations

**Module 1.5 — Réservations**
- Création via le chat OU formulaire classique
- Détection automatique des conflits
- Statuts : PENDING / CONFIRMED / IN_PROGRESS / COMPLETED / CANCELLED
- Vue salarié : "Mes réservations" (à venir, historique, annulées)
- Vue admin : tableau de toutes les réservations

**Module 1.6 — Calendrier flotte**
- Vue calendrier resource view (véhicules en lignes, temps en colonnes)
- Vues jour, semaine, mois
- Création/modification de réservation depuis le calendrier
- Drag & drop pour déplacer
- Color code par statut

**Module 1.7 — Notifications de base**
- Centre de notifications in-app avec badge
- Notifications temps réel via Convex
- Mails transactionnels : confirmation réservation, annulation, rappel J-1
- Templates emails sobres et brandés

**Module 1.8 — Intégration calendrier Google + Outlook**
- OAuth Google Calendar
- OAuth Microsoft 365
- Sync bidirectionnelle des réservations vers le calendrier perso du salarié

**Critères de sortie V1**
- 3 clients beta actifs qui utilisent au moins 2 fois par semaine
- Onboarding complet en moins de 30 minutes
- 0 bug critique en production
- Lighthouse score 80+ sur toutes les pages

---

## VERSION 1.5 — PREMIERS PAYANTS (M3-M4)

### Objectif
Passer de 3 beta à 10 clients payants à 290€/mois. L'ajout de fonctionnalités est dicté par les feedbacks beta, pas par cette roadmap théorique.

### Modules pressentis (à confirmer par les retours clients)

**Module 1.9 — Gestion des entretiens (lite)**
- Carnet d'entretien numérique par véhicule
- Alertes basées sur kilométrage + temps depuis dernier entretien
- Règles par défaut pour les 20 modèles les plus utilisés en flotte pro
- Planification manuelle d'un entretien
- Statuts : SCHEDULED / IN_PROGRESS / COMPLETED / CANCELLED

**Module 1.10 — Gestion des contraventions**
- Saisie manuelle d'une contravention reçue
- Identification du conducteur via planning du pool
- Décision de prise en charge (entreprise/salarié) avec workflow
- Notification au conducteur
- Archivage pour la compta

**Module 1.11 — État des lieux véhicule**
- Photos guidées à la prise de réservation (4 angles + intérieur + tableau de bord)
- Photos guidées à la restitution
- Comparaison visuelle avant/après
- Signalement de dommages avec description texte

**Module 1.12 — Profils utilisateurs étendus**
- Photo permis recto/verso
- Numéro de permis, catégories (B, BE, C...), date d'expiration
- Validation par ORG_ADMIN
- Blocage des réservations si permis expiré
- Alertes d'expiration du permis (30j, 7j, expiré)

**Module 1.13 — Filtres et exports basiques**
- Export CSV de la flotte
- Export CSV des réservations sur une période
- Filtres avancés multi-critères

**Module 1.14 — 🔥 Intégration comptable Pennylane (canal d'acquisition DNVB) — PRIORITAIRE → P23**
- Couche d'abstraction `AccountingConnector` provider-agnostic (réutilisable Sage/EBP/Odoo en V2)
- Connecteur Pennylane : OAuth, push automatique des coûts flotte (leasing, carburant, entretien, assurance, IK) avec catégorie comptable + axe analytique + TVA → **zéro double saisie pour le DAF**
- Export du rapport mensuel flotte vers la structure Pennylane
- Sync entrante du statut de paiement des factures (lecture seule)
- Page `/admin/settings/integrations` : connexion, mapping catégorie→compte (défauts PCG), journal de sync
- Objectif business : listing app store Pennylane + 5 premiers clients via ce canal
- ⚠️ Feature de palier **Pro (590€/mois)** — argument de vente, pas inclus en Starter

**Critères de sortie V1.5**
- 10 clients payants signés
- Connecteur Pennylane en prod + contact Partnerships Pennylane établi
- NPS >50
- Churn <5%
- 80% des conversations Concierge aboutissent à une action sans intervention humaine

---

## VERSION 2 — INDISPENSABLE AU DAF (M5-M8)

### Objectif
Le DAF ne peut plus revenir en arrière. Mycelium devient son tableau de bord financier flotte.

### Modules

**Module 2.1 — Tracking des coûts complet**
- Catégorisation : LEASING / CARBURANT / ENTRETIEN / ASSURANCE / TAXES / SINISTRE / PARKING / TELEPEAGE / AUTRE
- Saisie manuelle d'un coût avec upload de facture
- Import CSV des coûts en bulk
- Affectation au véhicule ET/OU à l'organisation
- Champ TVA pour suivi récupération

**Module 2.2 — Dashboard financier**
- KPIs : coût total flotte, coût/véhicule moyen, coût/km, évolution vs période précédente
- Décomposition par catégorie (donut + table)
- Décomposition par véhicule (table sortable)
- Décomposition par département/site
- Filtres période (mois, trimestre, année, custom)

**Module 2.3 — Import relevés carburant**
- Parser pour Total Cards (le plus utilisé)
- Parser pour BP Plus
- Parser pour Shell Fleet
- Mode générique avec mapping manuel
- Auto-matching véhicule par immatriculation
- Détection d'anomalies (volume aberrant, prix anormal, doublons, lieu inhabituel)

**Module 2.4 — Exports comptabilité + sync native multi-providers → P24**
- Connecteurs natifs (sync auto, pas que export) : **Sage** (PME établies), **EBP** (artisans/BTP), **Odoo community** (canal scalable, module sur leur store) — tous réutilisent la couche `AccountingConnector` de P23
- **API publique REST + Webhooks signés** : tout logiciel s'intègre sans connecteur maison ; clés scopées multi-tenant
- Fallback export Excel multi-onglets (synthèse, détail véhicule, détail catégorie) + formats Cegid / QuickBooks
- Export PDF rapport mensuel automatique
- Email automatique du rapport au DAF chaque début de mois
- Canal indirect (V2+) : connecteurs cabinets comptables (Tiime, MyUnisoft) pour la prescription

**Module 2.5 — Gestion des sinistres**
- Déclaration en 4 minutes via app mobile (PWA)
- Photos guidées avec IA pour identifier les dommages
- Constat amiable assisté
- Workflow d'envoi à l'assureur (mail formaté pour le MVP, API plus tard)
- Suivi du statut (déclaré, expertise, réparation, clos)
- Coût de la franchise affecté au véhicule

**Module 2.6 — Optimisation fiscale basique**
- Calcul automatique de l'avantage en nature par salarié et par véhicule
- Calcul TVS (Taxe sur Véhicules de Sociétés) avec barème 2026
- Identification de la récupération TVA optimale
- Tableau récapitulatif pour la liasse fiscale annuelle
- Alerte si dépassement plafond de déductibilité (18 300€ / 30 000€ selon CO2)

**Module 2.7 — Rapports automatisés**
- Rapport mensuel envoyé automatiquement aux ORG_ADMIN
- Rapport trimestriel détaillé
- Rapport annuel format compta
- Custom : possibilité de programmer ses propres rapports

**Module 2.8 — Politiques de flotte configurables**
- Plafonds d'usage personnel par profil
- Politique carburant (marques autorisées, plafonds)
- Politique entretien (réseau garages préférés, validations requises)
- Workflows d'approbation pour les actions dépassant les plafonds

**Critères de sortie V2**
- 50 clients payants
- ARR 250k€
- Module financier utilisé par 80% des clients
- 3 témoignages clients exploitables

---

## VERSION 3 — INDISPENSABLE AU RH (M9-M12)

### Objectif
Le RH adopte Mycelium pour gérer toute la vie des salariés-conducteurs.

### Modules

**Module 3.1 — Gestion avancée des conducteurs**
- Vue conducteur complète : profil, permis, formations, restrictions, historique
- Gestion des formations obligatoires (FIMO, FCO, ADR, CACES)
- Alertes expiration formations
- Upload des certificats
- Génération automatique du rapport conducteur annuel

**Module 3.2 — Restrictions et autorisations**
- Restrictions par conducteur : pas de longue distance, pas d'utilitaire, plafond km/mois
- Workflow d'autorisation manager pour les exceptions
- Historique des modifications

**Module 3.3 — Comportement de conduite**
- App mobile capte via capteurs smartphone : freinages, accélérations, vitesse vs limites
- Score d'éco-conduite par conducteur
- Classement interne anonymisable
- Gamification optionnelle (badges, primes)
- Dashboard sécurité pour le RH

**Module 3.4 — Indemnités kilométriques**
- Pour les salariés qui utilisent leur véhicule perso pour le travail
- Capture des trajets via géoloc (avec consentement RGPD)
- Détection automatique trajets pro/perso (ML simple)
- Calcul automatique IK avec barème fiscal en vigueur
- Génération du justificatif URSSAF
- Intégration avec la paie

**Module 3.5 — Crédit mobilité**
- Alternative au véhicule de fonction
- Le salarié reçoit un budget mensuel (ex: 400€)
- Il peut utiliser : transport en commun, vélo, location ponctuelle Mycelium, Uber Pro
- Tracking automatique de la consommation
- Justificatifs centralisés

**Module 3.6 — Onboarding/Offboarding salariés**
- Workflow d'arrivée : création compte, capture permis, attribution véhicule (si applicable)
- Workflow de départ : récupération véhicule, état des lieux, désactivation compte
- Génération automatique des documents (PV de remise/restitution)

**Module 3.7 — Politique RH flotte**
- Définition des droits d'accès flotte par profil (commercial, technicien, manager, direction)
- Plafonds différenciés
- Avantages selon ancienneté
- Tableau de bord des droits par salarié

**Module 3.8 — Permis interne Mycelium**
- Si un salarié n'a pas le permis B mais a un permis spécifique (B96, BE), l'app le détecte et propose les véhicules compatibles
- Restriction automatique selon les catégories

**Critères de sortie V3**
- 150 clients payants
- ARR 750k€
- Module RH utilisé par 60% des clients
- 5 témoignages exploitables avec ROI chiffré

---

## VERSION 4 — INDISPENSABLE À LA DIRECTION (M13-M18)

### Objectif
La direction générale voit Mycelium comme un outil stratégique de transformation et de compliance.

### Modules

**Module 4.1 — Rapport carbone et CSRD**
- Calcul des émissions Scope 1 véhicules (combustion directe)
- Calcul des émissions Scope 2 (électricité pour EV)
- Calcul des émissions Scope 3 (production carburant, +20%)
- Facteurs d'émission ADEME Base Carbone à jour
- Rapport CSRD/ESRS E1 conforme
- Génération PDF officiel + Excel détaillé
- Recommandations IA de remplacement EV avec ROI carbone et financier

**Module 4.2 — Plan de transition électrique**
- Analyse de chaque véhicule thermique : remplacement EV pertinent ou non
- Critères : trajets type, kilométrage, autonomie EV équivalente, infrastructure de recharge
- Plan année par année de bascule
- Simulation budgétaire et fiscale
- Suivi de l'avancement vs objectif LOM (50% véhicules à faibles émissions d'ici 2030)

**Module 4.3 — Gestion mixte thermique/électrique**
- Attribution intelligente des véhicules selon le trajet (EV pour intra-urbain, thermique pour longue distance)
- Réservation des bornes de recharge sur le trajet (intégration Chargemap, A Better Route Planner)
- Optimisation des sessions de recharge selon les tarifs électricité (Tempo, heures creuses)
- Suivi de la consommation kWh par véhicule et par session
- Calcul du TCO comparé thermique vs électrique

**Module 4.4 — Refacturation domicile**
- Le salarié recharge à domicile son véhicule de fonction électrique
- Mesure exacte via une borne homologuée MID
- Calcul du montant à refacturer au tarif réel de son fournisseur
- Génération automatique de la note de frais
- Intégration avec la paie

**Module 4.5 — Cybersécurité véhicules**
- Audit des connexions des véhicules connectés
- Détection des anomalies (connexion à serveurs inconnus, sessions OBD non autorisées)
- Formation conducteurs aux risques (phishing app, faux QR codes)
- Conformité UN R155/R156

**Module 4.6 — Analytics prédictive**
- Forecast des besoins flotte à 6 mois
- Prédiction des sous-utilisations chroniques avec recommandation de revente
- Prédiction des pannes (via données entretien + kilométrage)
- Prédiction des coûts à 12 mois
- Comparaison vs benchmarks sectoriels

**Module 4.7 — Politique RSE flotte**
- Définition des objectifs RSE flotte (réduction CO2, % EV, etc.)
- Tracking en temps réel vs objectifs
- Rapport automatique pour le conseil d'administration
- Communication interne RSE

**Critères de sortie V4**
- 400 clients payants
- ARR 2,5M€
- 3 ETI grands comptes (>500 véhicules)
- Mycelium cité dans les rapports de référence (Argus, Decisio)

---

## VERSION 5 — RÉFÉRENCE DU MARCHÉ PME (M19-M24)

### Objectif
Mycelium est l'outil par défaut pour toute PME française avec flotte. Le réflexe.

### Modules

**Module 5.1 — Marketplace de revente entre clients Mycelium**
- Un client Mycelium qui vend un véhicule en fin de cycle le propose d'abord à la communauté Mycelium
- Inspection standardisée
- Historique complet partagé
- Commission 2-3% pour Mycelium

**Module 5.2 — Procurement assisté (lite)**
- Quand un client renouvelle un véhicule, Mycelium propose 3 devis de leasers en parallèle
- Pas d'intégration API leasers (V2 plus tard), mais email automatisé personnalisé
- Comparateur de TCO
- Suggestion du choix optimal

**Module 5.3 — Réseau de garages partenaires Mycelium**
- Tarifs négociés pour les clients Mycelium chez Norauto Pro, Speedy Pro, Feu Vert Pro
- Prise de rendez-vous automatisée
- Validation automatique des factures vs devis
- Suivi qualité par garage

**Module 5.4 — Assistance conducteur 24/7**
- En cas de panne, sinistre, perte de clés
- Chat IA en première ligne
- Escalade à une équipe humaine (sous-traitée à un acteur d'assistance type Mondial Assistance)
- Coût mutualisé sur l'abonnement

**Module 5.5 — Conformité réglementaire complète**
- Suivi automatique de toutes les obligations réglementaires (carte grise, contrôle technique, assurance, IMMA, etc.)
- Alertes 30 jours avant chaque échéance
- Workflow de renouvellement guidé
- Archivage légal

**Module 5.6 — API publique Mycelium**
- API REST pour permettre aux clients d'intégrer Mycelium dans leurs propres outils
- Webhooks pour événements (réservation créée, sinistre déclaré, etc.)
- SDK JavaScript et Python
- Documentation développeur complète

**Module 5.7 — Multi-sites avancé**
- Pour les PME avec plusieurs sites/agences
- Gestion fine des permissions par site
- Reporting consolidé ET par site
- Mobilité inter-sites (un salarié de Paris emprunte un véhicule à Lyon)

**Module 5.8 — Personnalisation enterprise**
- Logo et couleurs personnalisables
- Sous-domaine custom (fleet.client.com)
- Champs personnalisés sur les véhicules et conducteurs
- Workflows custom

**Critères de sortie V5**
- 800 clients payants
- ARR 5M€
- 10 ETI (>500 salariés)
- Mycelium est le 3e acteur cité par les DAF de PME interrogés par les études sectorielles

---

## CE QUI N'EST PAS DANS LA ROADMAP (intentionnellement)

Ces idées sont volontairement exclues. Si elles reviennent dans tes discussions, elles vont dans /docs/ideas-parking-lot.md, pas dans le produit.

**Hors scope définitif :**
- Mode marque blanche pour leasers (Arval, ALD, etc.) — c'est un autre produit, un autre marché, une autre boîte
- Marketplace de partage de véhicules entre entreprises distinctes — effet network trop complexe pour solo
- Procurement automatisé avec API leasers — partenariats trop longs à négocier
- Expansion vers maritime, aérien, ferroviaire — autres métiers
- Expansion vers particuliers — autre cible, autre cycle de vente
- App mobile native iOS/Android — PWA suffit jusqu'à preuve contraire client
- IoT, capteurs, hardware — refus catégorique
- Cryptos, blockchain, NFT — refus catégorique

**Hors scope pour 24 mois minimum :**
- Expansion européenne (Belgique, Luxembourg, Suisse francophones acceptables après M18 si demandé)
- Concurrence frontale avec Geotab/Ubiwan sur les flottes de transport routier
- Modules dédiés aux secteurs spécifiques (BTP, santé, énergie) — on reste généraliste PME

---

## MÉTHODE DE PRIORISATION

À chaque cycle de planning (toutes les 4-6 semaines), tu te poses ces questions dans cet ordre :

1. **Qu'est-ce qui m'empêche de signer mon prochain client ?** Si une feature manquante bloque 2+ deals, elle remonte en priorité.

2. **Qu'est-ce qui fait churner mes clients actuels ?** Si un manque crée du churn, c'est urgent.

3. **Qu'est-ce qui me permet d'augmenter le ticket moyen ?** Modules qui permettent de passer de 290€ à 490€ puis 890€/mois.

4. **Qu'est-ce qui crée de la défensibilité ?** Modules qui une fois adoptés rendent le client captif.

5. **Qu'est-ce qui me différencie de la concurrence ?** Modules que personne d'autre n'a (souvent autour de l'IA).

Une feature qui répond à 0 de ces questions n'est pas prioritaire, même si tu l'aimes intellectuellement.

---

## RÈGLES DE VIE DE CETTE ROADMAP

**Règle 1 — Cette roadmap est révisée tous les 60 jours, pas tous les jours.**
Tu ne modifies pas la roadmap à chaque feedback client. Tu accumules les feedbacks. Tu révises tous les 2 mois.

**Règle 2 — Chaque feature livrée doit être utilisée par 30%+ des clients dans les 60 jours.**
Si une feature livrée n'est pas adoptée par 30% des clients en 2 mois, c'est qu'elle n'avait pas sa place ici. Tu apprends et tu corriges la roadmap.

**Règle 3 — Pas de feature sans 3 demandes clients indépendantes.**
Une demande d'un seul client = note dans le parking lot. 3 demandes indépendantes = candidate pour la prochaine version.

**Règle 4 — Le scope MVP est sacré.**
Les modules V1 ne bougent pas pendant les 8 semaines de dev. Toute idée hors scope va dans le parking lot.

**Règle 5 — Si tu hésites entre deux features, choisis celle qui se vend mieux.**
Pas celle qui te plaît techniquement. Pas celle qui est plus "innovante". Celle pour laquelle un prospect a dit "je signe si vous avez ça".