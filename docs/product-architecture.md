# Mycelium Fleet OS — Architecture Produit Complète

**Version :** 2.0
**Date :** Juin 2026
**Statut :** Document de référence fondateur
**À placer dans :** `/docs/product-architecture.md` du repo

---

## Principes directeurs absolus

Ces principes ne bougent pas, quelle que soit la version.

**Principe 1 — Jamais de hardware propriétaire.**
Mycelium ne fabrique rien, n'expédie rien, n'installe rien. Toute donnée véhicule provient d'APIs OEM (Smartcar, High Mobility) ou de saisies utilisateurs. Si une feature nécessite un capteur physique propriétaire, elle n'entre pas dans la roadmap.

**Principe 2 — Un seul cœur, plusieurs verticales.**
Le moteur Mycelium (multi-tenant, agents IA, réservations, gestion de flotte) est construit une fois. Les verticales sectorielles (BTP, transport, loueurs) sont des configurations et des modules additionnels sur ce même cœur, pas des produits séparés.

**Principe 3 — L'IA est invisible.**
Les agents IA ne sont jamais présentés comme des "fonctionnalités IA". Ils sont intégrés dans les workflows comme s'ils étaient des collègues. L'utilisateur ne pense pas "j'utilise l'IA", il pense "Mycelium gère ça tout seul".

**Principe 4 — Mobile-first pour les salariés, desktop pour les admins.**
L'app salarié (réservation, état des lieux, conduite) est conçue d'abord pour mobile. L'espace admin (flotte, finances, reporting) est conçu d'abord pour desktop.

**Principe 5 — Le scope est gelé par version.**
Une fois une version en dev, aucun module d'une version ultérieure n'est ajouté. Les idées vont dans le parking lot.

---

## Stack technique cible (toutes versions)

| Couche | Technologie | Rôle |
|---|---|---|
| Frontend web | SvelteKit 2.x + Svelte 5 (runes) | App web admin + salarié |
| Mobile | PWA en V1-V3, Capacitor en V4+ | App salarié |
| Backend | Convex (réactif temps réel) | Base de données + logique métier |
| Auth | Better Auth (local Convex install) | Authentification multi-tenant |
| UI | Tailwind CSS v4 + Mycelium UI | Design system |
| IA | Claude API (Anthropic) via Convex actions | Agents spécialisés |
| Emails | Resend | Transactionnels |
| SMS/Push | Brevo | Notifications conducteurs |
| Billing | Polar | Abonnements et paiements |
| Maps | Mapbox + Mapbox-Svelte | Cartographie et géolocalisation |
| Données véhicules | Smartcar API | Données OEM sans hardware |
| Analytics | PostHog | Usage et funnels |
| Déploiement | Cloudflare Workers | Edge computing |

---

## Types de véhicules supportés par version

### V1 — Véhicules terrestres motorisés standards
Voitures (berlines, SUV, citadines), utilitaires légers (< 3,5T), camionnettes.
Ce sont les véhicules de flotte pro typiques d'une PME 50-500 salariés.

### V2 — Extension mobilité douce et deux-roues
Scooters électriques, motos, vélos à assistance électrique, trottinettes électriques, gyroroues, skates électriques.
Permet d'adresser les politiques de mobilité durable et les Forfaits Mobilités Durables.

### V3 — Véhicules lourds terrestres
Camions (< 7,5T et > 7,5T), bus, cars, véhicules de transport de personnes.
Ouvre les verticales transport de marchandises, BTP, transport de personnes.

### V4 — Mobilité eau et air (optionnel selon marché)
Bateaux de service (entreprises côtières, ports), drones de livraison.
Note : maritime et aviation sont des marchés très différents avec leurs propres réglementations (MARPOL, EASA). À n'aborder que si une demande client forte se manifeste. Ces verticales ne sont pas dans la roadmap core.

### Jamais dans Mycelium
Avions commerciaux, trains (infrastructure nationale), tout véhicule dont la gestion implique une concession de service public.

---

## Les 6 agents IA du Fleet OS

Ces agents constituent la vraie différenciation concurrentielle de Mycelium. Aucun concurrent actuel (Geotab, Ubiwan, Webfleet, Mobeelity) n'a cette couche d'orchestration multi-agents.

### Agent 1 — Le Concierge
**Persona servi :** Salarié
**Rôle :** Réservation conversationnelle, gestion des réservations personnelles
**Accès :** Tous les salariés (ORG_MEMBER+)
**Version :** V1 (déjà construit, à robustifier)
**Tools :** searchAvailableVehicles, createReservation, listMyReservations, cancelReservation, modifyReservation
**Modèle :** Claude Sonnet 4.6

### Agent 2 — L'Assistant gestionnaire
**Persona servi :** DAF, RH, gestionnaire de flotte
**Rôle :** Interroger la flotte en langage naturel ("quels véhicules sont sous-utilisés ce mois ?"), obtenir des insights rapides
**Accès :** ORG_ADMIN et ORG_MANAGER
**Version :** V1.5
**Tools :** queryFleetStats, getVehicleHistory, getCostBreakdown, listMaintenanceAlerts, getDriverStats
**Modèle :** Claude Sonnet 4.6

### Agent 3 — L'Optimiseur de flotte
**Persona servi :** DAF, direction
**Rôle :** Tourne en arrière-plan chaque nuit, génère des recommandations de réduction de coûts et d'optimisation d'usage
**Accès :** ORG_ADMIN uniquement
**Version :** V2
**Output :** Notifications "Mycelium Insights" hebdomadaires avec recommandations actionnables
**Modèle :** Claude Sonnet 4.6

### Agent 4 — Le Compliance Officer
**Persona servi :** RH, gestionnaire de flotte
**Rôle :** Surveille les obligations réglementaires (permis, contrôles techniques, assurances, CSRD) et génère les alertes au bon moment
**Accès :** ORG_ADMIN et ORG_MANAGER
**Version :** V2
**Tools :** checkDriverLicenses, checkVehicleCompliance, generateCarbonReport, checkInsuranceDeadlines
**Modèle :** Claude Haiku 4.5 (règles déterministes, pas besoin de Sonnet)

### Agent 5 — Le Négociateur de coûts
**Persona servi :** DAF
**Rôle :** Analyse les contrats (leasing, assurance, carburant) et identifie les opportunités d'économie
**Accès :** ORG_ADMIN uniquement
**Version :** V3
**Output :** Alertes "Vous laissez X€ sur la table", avec devis comparatifs et mail de négociation pré-rédigé
**Modèle :** Claude Sonnet 4.6

### Agent 6 — Le Coach conducteurs
**Persona servi :** Salarié (feedback perso), RH (vision agrégée)
**Rôle :** Analyse le comportement de conduite, fournit des retours personnalisés et pilote la gamification
**Accès :** ORG_MEMBER (son propre score), ORG_MANAGER+ (scores de son équipe)
**Version :** V3
**Modèle :** Claude Haiku 4.5

---

## Roadmap par version

---

### VERSION 1 — Pool Sharing Light pour PME

**Période cible :** M1 à M3
**Objectif business :** 10 clients payants à 290€/mois
**Cible :** PME françaises 50-500 salariés, flotte 15-150 véhicules terrestres motorisés
**Pricing :** Starter 290€/mois (< 30 véhicules), Pro 590€/mois (30-100 véhicules)

**Ce qui est déjà construit (à robustifier) :**

Module Auth multi-tenant
- Signup/login email + password + Google OAuth + passkeys
- Création organisation via SIREN avec auto-complétion Pappers
- Gestion des rôles : ORG_ADMIN, ORG_MANAGER, ORG_MEMBER
- Isolation stricte des données par organizationId

Module Gestion de flotte
- Import CSV avec mapping flexible
- Ajout/édition/suppression véhicule
- Statuts : AVAILABLE, IN_USE, MAINTENANCE, RETIRED
- Page détail avec onglets
- Types supportés : voitures, utilitaires légers, camionnettes

Module Dashboard admin
- KPIs temps réel (flotte, utilisation, maintenance, alertes)
- Graphique d'utilisation 14 jours
- Donut statut flotte
- Feed d'activité temps réel

Module Concierge IA (Agent 1)
- Chat salarié pour réservation en langage naturel
- Tool use : recherche, création, annulation, listing
- Streaming des réponses
- Persistence des conversations

Module Réservations
- Création via Concierge OU formulaire classique
- Détection de conflits
- Statuts complets
- Vue salarié et vue admin

Module Calendrier admin
- Vue resource (véhicules en lignes)
- Vues jour/semaine/mois
- Drag & drop

Module Notifications
- Centre in-app temps réel
- Emails transactionnels via Resend
- Rappels J-1 par cron

Module Google Calendar
- OAuth bidirectionnel
- Sync automatique des réservations

**Ce qui reste à construire en V1 :**

Module Notes de frais (IK)
- Capture des trajets professionnels
- Calcul automatique des IK selon le barème fiscal en vigueur
- Génération du justificatif URSSAF
- Pour les salariés utilisant leur véhicule perso

Module Finance basique
- Saisie manuelle des coûts (leasing, carburant, entretien, assurance)
- KPIs financiers : coût total, coût/véhicule, évolution
- Export CSV simple
- Pas d'import automatique en V1

Module Comportement et éco-conduite (lite)
- Score basé sur les données Smartcar si disponibles (freinage, accélération)
- Score manuel basé sur la déclaration conducteur si pas de Smartcar
- Pas de gamification en V1, juste les données brutes

Module Admin/permis basique
- Saisie et suivi des permis conducteurs
- Catégories (B, BE, C, etc.) et date d'expiration
- Alerte si expiration < 60 jours
- Validation manuelle par ORG_ADMIN

**Décision Smartcar en V1 :**
Smartcar est intégré mais optionnel. Si le véhicule est compatible (Renault, Stellantis, VW récents), les données viennent de Smartcar. Sinon, saisie manuelle. Pas de blocage si le véhicule n'est pas compatible.

**Copilote IA flottant (migration depuis chat plein écran)**
Selon la spec `/docs/specs/reservation-experience-redesign.md` :
- FAB flottant accessible partout
- Panneau latéral 420px
- Agent Concierge par défaut côté salarié
- Agent orchestrateur pour router automatiquement
- Raccourci Cmd+K

---

### VERSION 1.5 — Premiers payants consolidés

**Période cible :** M3 à M5
**Objectif business :** 30 clients payants, ARR 150k€
**Scope :** Validé par les retours des 10 premiers clients V1

**Modules conditionnels (construits si 3+ clients le demandent) :**

Module Entretiens et prévention automatisés
- Règles d'entretien par modèle de véhicule (les 20 plus courants en flotte FR)
- Alertes prédictives basées sur km + temps depuis dernier entretien
- Planification manuelle avec sélection garage partenaire
- Statuts : SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED
- Mails au garage et au conducteur

Module États des lieux photos
- Photos guidées à la prise (4 angles + intérieur + tableau de bord)
- Photos guidées à la restitution
- Comparaison avant/après
- Signalement de dommages

Module Gestion contraventions
- Saisie manuelle du PV
- Identification du conducteur via planning
- Workflow de prise en charge (entreprise/salarié)
- Archivage compta

**Agent 2 — Assistant gestionnaire (déploiement)**
- Interface conversationnelle côté admin
- Interrogation de la flotte en langage naturel
- Disponible dans le copilote flottant côté admin

---

### VERSION 2 — Indispensable au DAF

**Période cible :** M5 à M8
**Objectif business :** 80 clients payants, ARR 500k€
**Pricing ajouté :** Business 990€/mois (ajout des agents Optimiseur + Compliance)

Module Finance avancé
- Import relevés carburant (Total Cards, BP Plus, Shell Fleet)
- Détection d'anomalies carburant (volume, fréquence, lieu)
- Décomposition par catégorie, par véhicule, par département
- Exports Excel multi-onglets (format Pennylane, Cegid, Sage)
- Rapport mensuel automatique envoyé au DAF

Module Optimisation fiscale
- Calcul automatique avantage en nature
- Calcul TVS (Taxe sur Véhicules de Sociétés) avec barème en vigueur
- Récupération TVA optimisée
- Plafonds de déductibilité
- Tableau récapitulatif liasse fiscale

Module Rapport carbone basique
- Calcul émissions Scope 1 (combustion directe)
- Facteurs ADEME Base Carbone à jour
- Rapport PDF annuel prêt à l'auditeur

Module Gestion sinistres
- Déclaration mobile en moins de 5 minutes
- Photos guidées par IA
- Constat amiable assisté
- Workflow assureur (mail formaté + suivi)

Module Données véhicules via Smartcar (déploiement complet)
- Connexion automatique pour véhicules compatibles
- Kilométrage temps réel
- Niveau de carburant / batterie
- Alertes moteur (DTC codes)
- Verrouillage/déverrouillage pour modèles compatibles Smartcar

**Agent 3 — Optimiseur de flotte (déploiement)**
**Agent 4 — Compliance Officer (déploiement)**

---

### VERSION 3 — Indispensable au RH

**Période cible :** M8 à M12
**Objectif business :** 200 clients payants, ARR 1,5M€

Module Gestion conducteurs avancée
- Profil complet : permis, formations, restrictions, historique
- Formations obligatoires (FIMO, FCO, ADR, CACES) avec alertes expiration
- Restrictions par conducteur (pas de longue distance, plafond km/mois)
- Workflow d'autorisation manager pour exceptions

Module Comportement et éco-conduite avancé
- Score éco-conduite détaillé (via Smartcar + capteurs smartphone)
- Gamification : classement, badges, primes
- Dashboard agrégé RH
- Coach conducteurs (Agent 6)

Module Crédit mobilité
- Alternative au véhicule de fonction
- Budget mensuel par salarié
- Tracking des usages (transports en commun, vélo, location)
- Génération justificatifs Forfait Mobilités Durables (FMD)
- Intégration Brevo pour notifications SMS

Module CSRD complet
- Émissions Scope 1 + Scope 2 (EV) + Scope 3 (amont carburant)
- Rapport CSRD/ESRS E1 conforme
- Recommandations de transition électrique avec ROI
- Format certifiable pour audit externe

Module Gestion flotte électrique
- Attribution intelligente véhicule selon autonomie vs trajet
- Optimisation sessions de recharge (tarifs heures creuses, Tempo)
- Réservation bornes de recharge sur trajet (Chargemap API)
- Suivi TCO comparatif thermique vs EV
- Refacturation recharge domicile (norme MID)

**Agent 5 — Négociateur de coûts (déploiement)**

---

### VERSION 4 — App mobile native + déverrouillage

**Période cible :** M12 à M18
**Objectif business :** 400 clients payants, ARR 3M€

Module App mobile native (Capacitor)
- iOS App Store + Google Play Store
- Notifications push (Firebase Cloud Messaging)
- Authentification biométrique (Face ID, Touch ID)
- Caméra native pour états des lieux
- Géolocalisation native

Module Déverrouillage/verrouillage véhicule
- Via Smartcar API pour véhicules compatibles
- Via NFC (tag sur le véhicule) pour les autres
- Identification conducteur biométrique avant déverrouillage
- Note : couverture partielle du parc (Smartcar couvre ~40% des véhicules récents en 2026)

Module Vie en conduite
- Navigation intégrée avec optimisation de trajet
- Détection automatique début/fin de trajet
- Recommandations en temps réel (arrêt recharge, pause légale, etc.)
- Assistance vocale mains-libres

Module Analytics prédictive
- Forecast des besoins flotte à 6 mois
- Prédiction des sous-utilisations chroniques
- Prédiction des pannes (données Smartcar + historique entretien)
- Prédiction des coûts à 12 mois
- Benchmarks sectoriels

---

### VERSION 5 — Intégrations et écosystème

**Période cible :** M18 à M24
**Objectif business :** 800 clients payants, ARR 6M€

Module Intégrations ERP
- Odoo (natif, webhooks + API REST)
- SAP (connecteur standard)
- Salesforce (module Fleet Object)
- Google Workspace (Calendar, Drive, Gmail)
- Notion + Airtable (sync données flotte)

Module Intégrations leasers (lecture seule)
- Arval (BNP Paribas) via Partner Connect API
- Alphabet (BMW) via Fleet Connect
- Autres leasers via format standardisé FLEETDATA
- Sync quotidienne des contrats et données véhicules

Module API publique Mycelium
- API REST documentée (OpenAPI 3.1)
- Webhooks pour événements clés
- SDK JavaScript + Python
- Portail développeurs

Module Intégrations customs
- Zapier
- Make (ex-Integromat)
- n8n (self-hosted possible)
- Webhooks configurables

Module Multi-sites avancé
- Hiérarchie géographique (siège, agences, filiales)
- Reporting consolidé + par site
- Mobilité inter-sites
- Permissions granulaires par site

---

### VERSION 6 — Verticales sectorielles

**Période cible :** M24 à M36
**Objectif business :** 1 500 clients payants, ARR 12M€

Les verticales sectorielles sont des "configurations Mycelium" dédiées, pas des produits séparés.

**Verticale Loueurs de véhicules**
Configuration pour les agences de location (comme Sixt, Europcar indépendants)
- Gestion du parc locatif
- Tarification dynamique
- Contrats de location
- Caution et franchises
- Intégration carte de crédit pour caution

**Verticale BTP**
Configuration pour les entreprises de bâtiment et travaux publics
- Véhicules lourds (camions, engins de chantier via partenaires)
- Affectation par chantier
- Suivi des coûts par chantier
- Conformité documents conducteurs (CACES, ADR)

**Verticale Transport de personnes**
Configuration pour les transporteurs (cars, bus, navettes entreprises)
- Gestion des lignes et circuits
- Affectation conducteurs par circuit
- Suivi temps réel des véhicules
- Conformité réglementaire transport (FIMO, FCO)

**Verticale Taxi - VTC**
Configuration pour les flottes de VTC et taxis
- Gestion des licences VTC / cartes professionnelles
- Intégration plateformes (Uber, Bolt, via APIs)
- Suivi du chiffre d'affaires par conducteur
- Documents obligatoires (carte pro, assurance VTC)

**Verticale Transport de marchandises (dernier kilomètre)**
Configuration pour les livreurs et messagerie urbaine
- Optimisation des tournées
- Scanning des colis
- Preuve de livraison (photo, signature)
- Intégration plateformes livraison (DHL, Chronopost via API)

---

### VERSION 7 — Marketplace et réseau

**Période cible :** M36+
**Objectif business :** Leadership marché européen PME

**Marketplace de revente entre clients Mycelium**
- Véhicule en fin de cycle proposé en priorité à la communauté Mycelium
- Historique complet certifié
- Commission 2-3% pour Mycelium

**Procurement assisté**
- Mise en compétition automatique des leasers sur renouvellement
- Comparateur TCO
- Négociation Agent 5

**Réseau de garages partenaires**
- Tarifs négociés pour clients Mycelium
- Norauto Pro, Speedy Pro, Feu Vert Pro
- Prise de rendez-vous automatisée
- Validation automatique factures

**Assistance conducteur 24/7**
- Chat IA en première ligne
- Escalade humaine sous-traitée (Mondial Assistance)

---

## Tableau récapitulatif complet

| Module | Version | Persona | Priorité | Dépendances |
|---|---|---|---|---|
| Auth multi-tenant | V1 | Tous | P0 | Néant |
| Gestion de flotte basique | V1 | Admin | P0 | Auth |
| Dashboard admin | V1 | Admin | P0 | Flotte |
| Concierge IA (Agent 1) | V1 | Salarié | P0 | Auth, Réservations |
| Réservations | V1 | Tous | P0 | Flotte, Auth |
| Calendrier admin | V1 | Admin | P0 | Réservations |
| Notifications + emails | V1 | Tous | P0 | Auth |
| Google Calendar sync | V1 | Salarié | P1 | Auth, Réservations |
| Notes de frais IK | V1 | Salarié | P1 | Auth |
| Finance basique | V1 | Admin | P1 | Flotte |
| Admin/permis basique | V1 | Admin | P1 | Auth, Conducteurs |
| Copilote flottant | V1 | Tous | P1 | Concierge |
| Éco-conduite basique | V1 | Salarié | P2 | Smartcar optionnel |
| Entretiens automatisés | V1.5 | Admin | P1 | Flotte |
| États des lieux photos | V1.5 | Salarié | P1 | Réservations |
| Contraventions | V1.5 | Admin | P2 | Conducteurs |
| Assistant gestionnaire (Agent 2) | V1.5 | Admin | P1 | Flotte, Finance |
| Finance avancé + import carburant | V2 | Admin | P0 | Finance basique |
| Optimisation fiscale | V2 | Admin | P1 | Finance |
| Rapport carbone basique | V2 | Admin | P1 | Finance |
| Gestion sinistres | V2 | Tous | P1 | Réservations |
| Smartcar complet | V2 | Tous | P1 | Flotte |
| Optimiseur de flotte (Agent 3) | V2 | Admin | P1 | Finance avancé |
| Compliance Officer (Agent 4) | V2 | Admin | P1 | Permis, Entretiens |
| Gestion conducteurs avancée | V3 | RH | P0 | Permis basique |
| Éco-conduite avancé + gamification | V3 | Salarié, RH | P1 | Smartcar |
| Crédit mobilité + FMD | V3 | RH | P1 | Conducteurs |
| CSRD complet | V3 | Direction | P1 | Finance avancé |
| Gestion flotte électrique | V3 | Admin | P1 | Smartcar |
| Négociateur de coûts (Agent 5) | V3 | DAF | P1 | Finance avancé |
| App mobile native | V4 | Salarié | P0 | PWA |
| Déverrouillage/verrouillage | V4 | Salarié | P1 | Smartcar, NFC |
| Vie en conduite | V4 | Salarié | P1 | App native |
| Analytics prédictive | V4 | Direction | P1 | Finance, Flotte |
| Intégrations ERP (Odoo, SAP...) | V5 | Admin | P1 | API publique |
| Intégrations leasers (Arval, etc.) | V5 | Admin | P1 | Flotte |
| API publique + webhooks | V5 | Dev | P0 | Tous modules |
| Intégrations customs (Zapier, n8n) | V5 | Admin | P2 | API publique |
| Multi-sites avancé | V5 | Admin | P1 | Flotte, Auth |
| Verticale Loueurs | V6 | Métier | P1 | V5 complet |
| Verticale BTP | V6 | Métier | P1 | V5 complet |
| Verticale Transport personnes | V6 | Métier | P1 | V5 complet |
| Verticale Taxi / VTC | V6 | Métier | P1 | V5 complet |
| Verticale Last mile | V6 | Métier | P1 | V5 complet |
| Marketplace revente | V7 | Tous | P1 | Réseau clients |
| Procurement assisté | V7 | DAF | P1 | Leasers V5 |
| Réseau garages partenaires | V7 | Tous | P1 | Réseau partenaires |

---

## Ce qui n'est PAS dans la roadmap Mycelium

Ces éléments sont dans `/docs/ideas-parking-lot.md`. Ils ne reviendront dans la roadmap que si une demande massive et explicite de clients existants le justifie.

**Véhicules exclus :**
- Avions commerciaux (réglementation EASA, marché B2B entièrement différent)
- Trains (infrastructure nationale, SNCF Réseau, impossible sans partenariat institutionnel)
- Fret maritime au long cours (réglementation OMI/MARPOL, marché B2B très différent)

**Features exclues :**
- Hardware propriétaire (capteurs, boîtiers OBD Mycelium branded)
- Assurance véhicule en propre (nécessite agrément ACPR)
- Financement leasing en propre (nécessite agrément ACPR/AMF)
- Marketplace de covoiturage grand public (BlaBlaCar existe)
- Gestion d'infrastructures de recharge (Driveco, Izivia ont 10 ans d'avance)

**Marchés exclus avant V6 :**
- Expansion hors Europe francophone avant M24
- Cible particuliers ou auto-entrepreneurs (autre cycle de vente)
- Cible très grandes entreprises >5 000 salariés (autre cycle de vente, autre product)

---

## Pricing par version

| Tier | Version | Prix/mois | Véhicules | Agents IA inclus | Cible |
|---|---|---|---|---|---|
| Starter | V1 | 290€ | Jusqu'à 30 | Concierge | PME < 100 salariés |
| Pro | V1 | 590€ | 30 à 100 | Concierge + Assistant | PME 100-300 salariés |
| Business | V2 | 990€ | 100 à 250 | + Optimiseur + Compliance | ETI 300-500 salariés |
| Scale | V3 | 1 490€ | 250 à 500 | + Négociateur + Coach | ETI > 500 salariés |
| Enterprise | V4+ | Sur devis | 500+ | Tous agents + Custom | Grandes entreprises |

---

## Règle absolue de gouvernance de la roadmap

**Une feature n'entre en développement que si :**
1. Elle est dans la version en cours (pas une version future)
2. Au moins 3 clients existants l'ont demandée explicitement
3. Elle ne nécessite pas de hardware propriétaire
4. Elle ne nécessite pas un agrément réglementaire que Mycelium ne possède pas

**Si une idée ne remplit pas ces 4 critères :** elle va dans `/docs/ideas-parking-lot.md` avec une note sur le contexte et la date. On ne l'oublie pas, mais on n'en parle plus jusqu'à ce que les critères soient remplis.