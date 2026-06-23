# Mycelium Fleet OS — Document produit complet

> Version : juin 2026  
> Usage : interne, investisseurs, onboarding équipe

---

## 1. Qu'est-ce que Mycelium

Mycelium est un **Fleet Operating System** pour PME et ETI. Ce n'est pas un outil de car sharing entre salariés, ni un logiciel de fleet management classique basé sur la télématique hardware. C'est la plateforme qui unifie deux univers qui n'ont jamais été réconciliés dans un seul outil : l'expérience salarié et l'automatisation de gestion CFO/RH.

La plupart des entreprises de 50 à 500 salariés gèrent encore leur flotte avec des fichiers Excel, des échanges WhatsApp et des tableaux partagés mal synchronisés. Mycelium remplace tout ça par un système opérationnel unique où les salariés réservent un véhicule en langage naturel, et où le gestionnaire pilote sa flotte avec des insights automatiques produits par des agents IA spécialisés.

**Ce que Mycelium n'est pas** : pas de marque blanche pour leasers, pas de marketplace inter-entreprises, pas d'IoT ni de hardware, pas d'app mobile native, pas d'expansion vers d'autres types de véhicules.

---

## 2. Marché et positionnement

### Cible

- **Taille d'entreprise :** 50 à 500 salariés
- **Taille de flotte :** 15 à 150 véhicules d'entreprise
- **Profils décideurs :** CFO / DAF, DRH, gestionnaire de flotte
- **Profil utilisateur final :** tout salarié ayant accès à un véhicule de fonction ou de pool

### Géographie de lancement

Le lancement est **Global Day-1**, avec une priorité sur deux marchés :

1. **Royaume-Uni** — marché mature sur le fleet management, réglementation BiK bien établie (Benefit-in-Kind HMRC), forte pénétration Xero et QuickBooks
2. **Pays nordiques** (Suède, Norvège, Danemark) — pression CSRD forte, flotte très électrifiée, appétence pour les outils SaaS internationaux

La France est maintenue dans le produit (i18n complète, taux kilométriques URSSAF, TVS) mais n'est pas la priorité de distribution avant le mois 12.

### Différenciation principale

Aucun concurrent direct ne propose une architecture multi-agents IA spécialisés sur la verticale fleet. Les acteurs existants soit font du tracking GPS hardware (Geotab, Verizon Connect), soit font du booking de pool car basique (Mobeelity, Arval Mobility), soit font de la comptabilité d'entreprise généraliste avec un module fleet bolté (Sage, Pennylane). Mycelium est le seul à combiner les trois couches — opérationnel, RH, financier — dans une interface unifiée pilotée par l'IA.

---

## 3. Les 6 agents IA

L'architecture en agents spécialisés est le coeur de la proposition de valeur. Chaque agent a un rôle distinct, une audience précise et un périmètre strict.

### Agent 1 — Concierge (salarié)

Réservation conversationnelle en langage naturel. Le salarié ouvre le chat et dit "j'ai besoin d'une voiture jeudi prochain pour aller à Lyon, je rentre vendredi soir". Le Concierge interprète la demande, cherche les véhicules disponibles sur le site concerné, propose des options et confirme la réservation — sans que le salarié n'ait jamais ouvert un formulaire.

Implémenté via une `httpAction` SSE avec boucle agentique (10 itérations max), 4 outils internes (searchVehicles, createReservation, listReservations, cancelReservation), et un system prompt anti-hallucination qui refuse de proposer un véhicule non disponible.

### Agent 2 — Assistant Gestionnaire (CFO / DAF)

Interface en langage naturel pour interroger la flotte. Le DAF peut demander "quel est le coût moyen par véhicule ce trimestre ?" ou "quels véhicules ont le taux d'utilisation le plus faible depuis 60 jours ?". L'agent répond avec des données fraîches issues de Convex, formatées en markdown avec tableaux et chiffres clés.

6 outils read-only : utilisation flotte, ventilation des coûts, activité réservations, état maintenance, statut conformité, synthèse flotte. Aucune mutation — l'agent ne peut rien modifier, seulement analyser.

### Agent 3 — Optimiseur de flotte (background, hebdomadaire)

Tourne chaque lundi à 8h UTC pour toutes les organisations actives. Collecte 90 jours de données (taux d'utilisation, coûts par catégorie, leasings expirant, maintenances en retard), envoie au modèle Claude Sonnet avec prompt cache, parse le JSON structuré retourné, sauvegarde un rapport et envoie un email HTML branded aux administrateurs.

Le rapport contient des recommandations actionnables : véhicules sous-utilisés à redéployer, coûts anormaux à investiguer, leasings à renégocier avant expiration.

### Agent 4 — Compliance Officer (background, continu)

Surveillance réglementaire automatique. Deux axes prioritaires au lancement :

- **BiK UK** : calcul automatique du Benefit-in-Kind selon les barèmes HMRC, alertes aux salariés et au RH, conseils de réduction (passage à l'électrique, partage de véhicule)
- **CSRD Nordiques** : calcul des émissions Scope 1, 2 et 3 selon les facteurs ADEME/IEA/DEFRA par pays, rapport ESRS E1 exportable en PDF

France : TVS (Taxe sur les Véhicules de Société), AEN (Avantage En Nature), TVA récupérable — traité mais non prioritaire.

### Agent 5 — Négociateur de coûts (proactif)

Identifie les opportunités d'économie et les présente au gestionnaire avec un chiffrage. Exemples : "3 véhicules thermiques en leasing expirent dans 90 jours, les remplacer par des électriques réduirait le BiK de 40% et ferait économiser £8 400/an". L'agent ne prend aucune décision — il produit des recommandations motivées et laisse le CFO agir.

### Agent 6 — Coach conducteurs (salariés + RH)

Suivi éco-conduite et sécurité. À partir des données de réservation, des relevés carburant et des sinistres déclarés, l'agent produit des scores individuels et collectifs, identifie les comportements à risque et suggère des formations ciblées.

---

## 4. Fonctionnalités par domaine

### Gestion de flotte

CRUD complet sur les véhicules, import CSV en 3 étapes, filtres avancés par statut/catégorie/site/énergie. Chaque véhicule porte ses informations techniques (immatriculation, marque, modèle, énergie, catégorie permis), contractuelles (numéro de leasing, kilométrage contractuel, date de fin) et opérationnelles (site d'affectation, statut, kilométrage actuel).

### Réservations

Wizard 4 étapes côté salarié (date/lieu, choix véhicule, récapitulatif, confirmation). Vue calendrier hebdomadaire/journalier/mensuel côté admin avec drag-to-create, drag-to-move, drag-to-resize. Détection automatique de conflits. Transition automatique des statuts (CONFIRMED → IN_PROGRESS → COMPLETED) via cron. Vue admin dédiée avec filtres et actions de masse.

### États des lieux

Wizard 3 étapes sur mobile (6 angles photo, dommages pré-existants, récapitulatif signable) déclenché en début et fin de réservation. Historique complet par véhicule. Stockage photos sur Convex Storage.

### Contraventions

Déclaration de contravention avec identification automatique du conducteur via le planning. Workflow de traitement (RECEIVED → ASSIGNED → PAID/CONTESTED). Imputation automatique de la franchise au conducteur si confirmé fautif. KPIs sur la page admin.

### Maintenance

Planification des entretiens avec sélection du garage, notifications email (garage + conducteur). Cron daily 5h UTC qui analyse les véhicules et génère des alertes de sévérité NORMAL/URGENT/CRITIQUE avec dédoublonnage 24h. Vues liste et calendrier, timeline par dossier, gestion des coûts associés.

### Notifications

Centre de notifications en temps réel (sheet latéral, badge réactif). 8 types de notifications avec icônes et couleurs distinctes. Emails transactionnels via Resend (confirmation réservation, annulation, rappel J-1). Rappels quotidiens à 17h UTC pour les réservations du lendemain.

### Suivi financier

KPIs globaux (coût total, coût par kilomètre, coût par véhicule). Ventilation par catégorie (carburant, leasing, assurance, maintenance, amendes, divers). Tableau de coûts par véhicule. Import CSV de coûts, upload de justificatifs (Convex Storage). Export CSV multidevise.

### Notes de frais kilométriques

Barèmes paramétrables par organisation (ELECTRIC/HYBRID/THERMAL/UTILITY) avec defaults par pays (FR/GB/SE/NO/DK). Calcul live dans le formulaire avec sélecteur de catégorie véhicule. Champs `distance` + `distanceUnit` (km/mi) + `vehicleCategory` + `ratePerUnit`. Export CSV international.

### Import relevés carburant

Parsers automatiques pour Total Cards, BP Plus et Shell Fleet. Détection du provider par signature de fichier. Matching d'immatriculations tolérant aux variations. 3 règles d'anomalies : plein le week-end, volume supérieur à 120L, doublon à ±30 min. Traitement asynchrone en background (internalAction). Historique des imports et cartes Accept/Reject par anomalie.

### Sinistres

Wizard de déclaration en 3 étapes avec photos (Convex Storage). 6 statuts (DECLARED → CLOSED/CONTESTED). Envoi automatique à l'assureur via email Resend. Imputation franchise automatique sur les coûts véhicule. Vue salarié (suivi de son sinistre) et vue admin (tableau de bord KPIs + gestion).

### Gestion conducteurs

Profils conducteurs avec informations permis (catégories, date d'expiration, upload scan). Cron daily 6h UTC pour alertes expiration (J-60, J-30, J-7, J-0). Restrictions individuelles (NO_UTILITY, NO_TRUCK). Validation du permis dans la création de réservation. Pages admin avec 5 onglets : Profil, Permis, Formations, Restrictions, Historique.

### Intégrations calendaires

Sync Google Calendar et Outlook (OAuth, actions Convex, UI de connexion). Les réservations apparaissent automatiquement dans le calendrier du salarié.

### Intégrations comptables

Architecture provider-agnostic avec interface `AccountingConnector`. Connecteurs disponibles : Pennylane (push coûts + IK → compta, sync paiements, mapping PCG), Sage, EBP, Odoo Community (module LGPL-3). Connecteurs Xero et QuickBooks en cours de développement (priorité sprint 2).

### API publique et webhooks

API REST v1 (`/api/v1/costs`, `/api/v1/vehicles`, `/api/v1/expenses`, `/api/v1/webhooks`). Clés API scopées avec hash SHA-256, préfixe `myc_live_`. Webhooks signés HMAC SHA-256, retries x5 avec backoff exponentiel. Rate limiting 100 req/min par clé via `@convex-dev/rate-limiter`. Onglet Développeurs dans les paramètres.

---

## 5. Expériences utilisateur

### Espace salarié (`/app/*`)

Accès à ses réservations passées et futures, création de réservation via wizard ou via le Concierge IA, états des lieux, sinistres, notes de frais. Le Copilote IA (FAB en bas à droite) donne accès au Concierge en un clic depuis n'importe quelle page.

### Espace admin (`/admin/*`)

Dashboard avec KPIs temps réel, graphique d'activité SVG, répartition par statut, feed d'activité récente. Modules Fleet, Réservations, Conducteurs, Maintenance, Finance, Sinistres, Contraventions accessibles depuis la sidebar. L'Assistant Gestionnaire IA est disponible via le Copilote sur toutes les pages admin.

### Copilote IA flottant

Un seul FAB positionné en bas à droite, déclenchable aussi via Cmd+K / Ctrl+K. Panneau latéral 420px (full-screen sur mobile) qui monte le bon agent selon le contexte : Concierge sur `/app/*`, Assistant Gestionnaire sur `/admin/*`. Indicateurs visuels des tool calls en cours, streaming SSE, rendu markdown, quick prompts contextuels.

---

## 6. Tarification

Facturation via **Paddle** (Merchant of Record international — gère TVA, taxes locales, conversion devises). Pas de Stripe.

| Plan | Prix mensuel | Conducteurs inclus | Agents inclus |
|---|---|---|---|
| **Essential** | 490 € / £420 | 50 | Concierge + gestion flotte de base |
| **Professional** | 890 € / £750 | 150 | + sync Xero/QuickBooks + Compliance Officer + BiK UK/CSRD lite |
| **Business** | 1 490 € / £1 250 | 300 | + Optimiseur + Négociateur + Coach + conseils IA BiK |
| **Enterprise** | Sur devis | >300 | Tout + SLA, support dédié |

**Overage :** 5 à 8 € / conducteur au-delà du quota inclus dans le plan.

---

## 7. Distribution

L'acquisition se fait via les **app stores des logiciels comptables** que les cibles utilisent déjà. Pas de sales outbound. Pas d'équipe commerciale terrain.

**Canal #1 — Xero App Marketplace** (priorité sprint 2, UK)  
**Canal #2 — QuickBooks App Store** (priorité sprint 2, UK + nordiques)  
**Canal #3 — Odoo Community** (module LGPL-3 open source, auto-installation)  
**Canal #4 — Pennylane** (France, maintenu mais non prioritaire)

Le principe : être présent là où le CFO est déjà connecté. L'intention d'achat se manifeste dans ces marketplaces quand l'entreprise cherche à compléter son stack de gestion.

---

## 8. Stack technique

| Couche | Technologie |
|---|---|
| Frontend | SvelteKit 2.x + Svelte 5 (runes) |
| Backend | Convex (réactif temps réel, serverless) |
| Auth | Better Auth (install Convex local) |
| UI | Tailwind CSS v4 + Mycelium UI (composants shadcn-style custom) |
| IA | Claude API (Anthropic) — Sonnet pour les agents analytiques, prompt cache `ephemeral` sur les gros contextes |
| Emails | Resend via `@convex-dev/resend` |
| Storage | Convex Storage (photos, justificatifs, scans permis) |
| Déploiement | Cloudflare Workers |
| Tests | Playwright (E2E) + Vitest (unit) |
| Package manager | Bun |

### Principes d'architecture

**Multi-tenant strict** : chaque organisation est isolée par `organizationId`. Aucune query ne peut retourner des données d'une autre organisation. Toutes les mutations valident l'appartenance organisationnelle avant d'écrire.

**Internationalisation native** : devise, unité de distance, fuseau horaire, locale — tous portés par l'objet `organization`, jamais hardcodés dans le code. Les defaults par pays sont calculés dynamiquement (ex: taux kilométriques HMRC en GBP pour une org UK, URSSAF en EUR pour une org FR).

**Réactivité temps réel** : Convex maintient des souscriptions live sur les queries. Le dashboard admin se met à jour en temps réel sans polling. Les notifications apparaissent instantanément.

**Agents IA sans hallucination** : les httpActions SSE qui exposent les agents sont protégées par des system prompts stricts qui interdisent de proposer des données non confirmées par les outils. Un agent ne peut jamais inventer un véhicule disponible ou un prix.

**PWA only** : pas d'app native. L'expérience mobile passe par le navigateur avec un manifest PWA. Capacitor n'est envisagé que si 3 clients l'exigent explicitement.

---

## 9. Roadmap

### Sprint 2 — Monétisation + distribution UK

- **P_PADDLE** : webhooks Paddle pour provisioning automatique des organisations à la réception d'un paiement (seats, modules, plan)
- **P25** : connecteurs Xero et QuickBooks (remplacent Pennylane comme canaux #1/#2)
- **P_BIK** : module BiK UK complet — barèmes HMRC dans `bik-rates.ts`, affichage dans les plans Essential/Professional, conseils IA Optimiseur sur le plan Business

### Sprint 3 — Nordiques

- **P19** : rapport carbone CSRD — Scope 1, 2, 3 avec facteurs d'émission ADEME/IEA/DEFRA par pays, export PDF ESRS E1
- **P22** : intégration Smartcar API — autorisation web-flow sans hardware, lecture odomètre, état batterie (SoC), localisation
- **P20** : Agent Compliance Officer complet (Agent 4)
- **P21** : gestion des membres et invitations dans `/admin/settings`
- **P18** : optimisation fiscale France (TVS, AEN, TVA — secondaire)

---

## 10. Ce que Mycelium ne fera jamais

Pour cadrer les conversations internes et investisseurs, voici ce qui est explicitement hors scope :

- Mode marque blanche pour les leasers (Arval, ALD, LeasePlan)
- Marketplace de partage de véhicules entre entreprises
- Procurement automatisé ou négociation multi-leasers
- Remarketing et revente de véhicules
- Extension à d'autres types de mobilité (trottinettes, camions, maritime)
- Cible particuliers ou auto-entrepreneurs
- IoT, capteurs, boîtiers OBD, hardware de quelque nature que ce soit
- Vision macro-prédictive ou benchmarks sectoriels avant 10 000 clients actifs

Ces idées vont dans `/docs/ideas-parking-lot.md`. Elles ne seront pas rouvertes avant le mois 12.

---

## 11. Principes de design produit

**L'IA doit être invisible.** Mycelium ne se présente pas comme "une plateforme IA". L'IA est l'infrastructure qui rend l'expérience fluide — le salarié réserve en parlant, l'alerte arrive avant le problème, le rapport est dans la boîte mail lundi matin. Jamais de badge "Powered by AI", jamais de disclaimer "l'IA peut se tromper" dans l'interface.

**Qualité premium sans ostentation.** L'interface cible Stripe et Linear : densité d'information, typographie claire, interactions prévisibles. Pas de glassmorphism agressif, pas d'animations superflues, pas d'écrans de chargement avec des messages "magiques". Les composants ont un reflet blanc (`inset`) qui les ancre dans l'espace — subtil, pas clinquant.

**Les données sont la promesse.** Chaque chiffre affiché doit être exact et traçable. Si une donnée est manquante, on l'affiche comme manquante — on ne l'invente pas. Les agents IA qui retournent des estimations doivent les marquer comme telles.

---

*Document maintenu dans `/docs/product-overview.md`. Dernière mise à jour : juin 2026.*
