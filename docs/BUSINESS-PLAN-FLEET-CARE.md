# MYCELIUM FLEET CARE

## Business Plan & Modèle Opérationnel — Année 0 à 3

> **Version 2.0 — Juillet 2026 | Confidentiel**
> **Référence :** ROADMAP-CONCIERGE.md, CLAUDE.md

---

## SOMMAIRE EXÉCUTIF

Mycelium Fleet Care est un **service de conciergerie automobile** opéré par des humains outillés par un logiciel. Le logiciel automatise 20% des tâches — surveillance, alertes, calculs, réservations. Les humains assurent les 80% restants — négociation, jugement, relation, intervention physique.

**La promesse :** Une entreprise confie sa flotte à Mycelium et n'a plus à y penser.

**Le modèle économique :** Abonnement mensuel basé sur le niveau de délégation souhaité (pas seulement sur la taille de la flotte) + actes facturés séparément pour les interventions terrain ponctuelles.

**La règle d'or :** Chaque client doit gagner au moins 2× ce qu'il nous paie. Mycelium doit générer au moins 65% de marge brute sur chaque tier.

**Premier prospect chaud :** Domofrance, bailleur social Bordeaux — 150 véhicules partagés, 1 000 conducteurs, sur Outlook aujourd'hui. Pain : les IK coûtent 2,5× plus cher que les véhicules partagés faute d'un outil de réservation fonctionnel.

**Le fondateur :** Jules Dore — conciergerie 100% à distance, sans permis. Les interventions physiques sont sous-traitées à des prestataires locaux, ville par ville, au rythme des signatures.

---

## PARTIE 1 — LE MODÈLE 80/20

### 1.1 Ce que fait le logiciel (20%)

Tâches répétitives, calculs, détection — exécutés sans variabilité et sans fatigue :

- Surveiller les échéances (CT, assurance, leasing, permis, BiK UK, CSRD)
- Détecter les anomalies (sous-utilisation, carburant, coûts hors norme)
- Recevoir et acheminer les demandes (réservations via Concierge IA, sinistres, contraventions)
- Générer les documents (rapports, exports comptables, état des lieux)
- Alerter, prioriser, briefer le concierge chaque matin

### 1.2 Ce que fait l'humain (80%)

Décisions, relation, jugement — ce que le logiciel ne remplacera pas :

| Situation              | Le logiciel                           | Le concierge                                      |
| ---------------------- | ------------------------------------- | ------------------------------------------------- |
| Contravention reçue    | Identifie le conducteur, alerte       | Décide si on conteste, rédige le recours          |
| Sinistre déclaré       | Collecte photos, structure le dossier | Appelle l'assureur, négocie, coordonne            |
| Contrat leasing à J-90 | Alerte avec les chiffres actuels      | Contacte le leaser, négocie, présente 2-3 options |
| Conducteur bloqué      | —                                     | Rappelle en moins de 5 minutes                    |
| Véhicule sous-utilisé  | Calcule et signale                    | Propose une action au client, suit l'exécution    |
| Rapport mensuel        | Agrège les données brutes             | Rédige en langage humain, valide avant envoi      |

**Règle absolue :** Aucune communication sortante vers un client, un assureur, un leaser ou un tiers n'est envoyée sans validation humaine. Jamais automatique.

### 1.3 Charge de travail réelle par tier

**AUTONOME — 5 à 20 véhicules :**

```
Surveillance dashboard (logiciel scanne)   : 20 min/semaine
Traitement alertes                         : 30 min/mois
Réponse aux demandes client                : 45 min/mois
─────────────────────────────────────────────────────
Total remote Jules                         : ~3h/mois
Interventions terrain                      : 0-1/mois (prestataire)
```

**GÉRÉ — 15 à 60 véhicules :**

```
Surveillance + point proactif mensuel      : 2h/mois
Traitement alertes + compliance            : 2h/mois
Appels clients et conducteurs              : 2h/mois
Rapport mensuel + coordination terrain    : 2h/mois
─────────────────────────────────────────────────────
Total remote Jules                         : ~8h/mois
Interventions terrain                      : 2-4/mois (prestataire)
```

**CONCIERGERIE — 30 à 150 véhicules :**

```
Surveillance quotidienne                   : 3h/mois
Traitement alertes + gestion proactive     : 4h/mois
Appels et coordination (clients, garages,
assureurs, leasers)                        : 6h/mois
Négociations actives + suivi contrats      : 4h/mois
Rapport + portail client                   : 3h/mois
─────────────────────────────────────────────────────
Total remote Jules                         : ~20h/mois
Interventions terrain incluses             : 2/mois (prestataire)
```

**GRAND COMPTE — 150+ véhicules :**

```
Concierge dédié (Jules ou salarié nommé)   : 25-35h/mois
Field agent local                          : 10-15h/mois
─────────────────────────────────────────────────────
Total équipe dédiée                        : ~40-50h/mois
```

---

## PARTIE 2 — MODÈLE OPÉRATIONNEL

### 2.1 Les deux rôles permanents

**CONCIERGE REMOTE — Jules, puis équipe**

Tout ce qui ne nécessite pas une présence physique avec un véhicule :

- Surveillance dashboard multi-clients chaque matin
- Traitement file de tâches (alertes, compliance, sinistres, contraventions)
- Appels clients, conducteurs, assureurs, leasers, garages
- Rédaction et validation de tous les documents sortants
- Coordination des prestataires terrain
- Relation commerciale et renouvellement

**Pas de permis requis. 100% à distance. Couvre toutes les villes.**

**FIELD AGENT — Prestataire ou salarié selon le volume**

Tout ce qui exige une présence physique :

- Inspection photographique des véhicules
- Remise de clés et briefing terrain conducteurs
- Convoyage entre sites ou vers les garages
- Présence lors d'expertises sinistres

**Permis B obligatoire. Local par ville. Formé par Jules.**

---

### 2.2 Les 3 scénarios terrain

#### SCÉNARIO A — Auto-entrepreneur à l'acte ⭐ AN 0-1

Profils : ex-chauffeur VTC, agent de location, retraité automobile, étudiant BTS transport.
Recrutement : Malt, LinkedIn, réseau garage local.

**Grille de rémunération :**

| Intervention                              | Durée             | Tarif versé    | Facturé client |
| ----------------------------------------- | ----------------- | -------------- | -------------- |
| Inspection complète (6 angles + dommages) | 1h30              | 90€            | 120€           |
| Remise de clés + briefing conducteur      | 45 min            | 50€            | 80€            |
| Relevé kilométrique simple                | 20 min            | 25€            | 40€            |
| Convoyage intra-ville                     | variable          | 1,50€/km + 20€ | 2€/km + 30€    |
| Présence expertise assureur               | 2-3h              | 120€           | 180€           |
| Astreinte urgence                         | par déclenchement | 40€ + 80€/h    | 60€ + 120€/h   |

**Marge terrain : ~25-35% sur chaque acte.**
**Règle de sécurité : minimum 2 prestataires par ville, backup documenté.**

#### SCÉNARIO B — Partenariat garage local (à partir de M6 si volume)

Accord avec un garage partenaire : ils fournissent un technicien mobile pour les interventions Mycelium.
Contre-partie : référencement prioritaire pour toutes les maintenances clients de la zone.
Coût : forfait 500-800€/mois pour 10h garanties + actes au-delà.
Déclencheur : volume > 10h/mois d'interventions régulières dans la ville.

#### SCÉNARIO C — Fleet Care Agent salarié (An 2+)

Seuil : 3 clients dans une ville générant ≥ 2 000€/mois de facturation terrain.
Profil : Bac+2, permis B, sens du service, autonomie.
Rémunération : 1 800-2 200€ brut/mois (mi-temps → plein temps selon volume).

---

## PARTIE 3 — FORMATION & QUALITÉ DE SERVICE

### 3.1 Le problème : 80% humain = 80% de surface d'erreur

Un protocole non suivi, une inspection bâclée, un appel client mal géré — tout ça se voit et érode la confiance. **La réponse : des checklists pour tout, une supervision par les données.**

Objectif : chaque client reçoit un service identifiable Mycelium, quelle que soit sa ville ou la taille de sa flotte.

### 3.2 Programme de formation (4 semaines)

**Module 1 — Produit (8h, Semaine 1)**
Dashboard concierge, file de tâches, agents IA, simulation sur org de test.
Livrable : quiz 20 questions, score minimum 80%. Bloquant.

**Module 2 — Processus (10h, Semaine 2)**
6 checklists opérationnelles, scripts d'appels, rédaction rapport mensuel, règle du jamais-automatique, escalades.
Livrable : jeu de rôle appel sinistre grave supervisé par Jules. 20 min.

**Module 3 — Terrain (8h, Semaine 3 — Field Agents uniquement)**
Protocole inspection, usage de l'app, remise de clés, convoyage.
Livrable : 1 inspection filmée analysée par Jules sous 24h. Go/No-Go.

**Module 4 — Certification (Semaine 4)**
3 premières missions réelles supervisées (Jules disponible par téléphone, revue J+24h).
Statut CERTIFIÉ ou À REVOIR. Aucune mission autonome sans certification. Aucune exception.

**Formation continue mensuelle**
Brief 30 min chaque 1er lundi : nouvelles features, cas complexes du mois, retours terrain. Library de cas anonymisés enrichie en continu.

### 3.3 Les 5 engagements qualité non négociables

| Engagement                 | Indicateur                           | Cible            |
| -------------------------- | ------------------------------------ | ---------------- |
| Urgences traitées vite     | Délai tâche CRITIQUE prise en charge | < 2h ouvrées     |
| Zéro échéance légale ratée | Alertes EXPIRED non traitées         | 0 par mois       |
| Rapport mensuel livré      | Envoyé avant le 5 du mois            | 100% des clients |
| Flotte en bonne santé      | Score santé flotte moyen             | > 80/100         |
| Satisfaction client        | NPS trimestriel                      | > 55             |

---

## PARTIE 4 — PRICING : LA LOGIQUE DU WIN-WIN

### 4.1 Le principe fondateur

**Le client ne paie pas pour un logiciel. Il paie pour ne plus y penser.**

Le niveau de prix doit refléter le niveau de délégation qu'il choisit — pas uniquement la taille de sa flotte. Une PME de 15 véhicules qui veut zéro charge mentale peut choisir CONCIERGERIE. Une ETI de 80 véhicules qui a déjà quelqu'un en interne peut choisir GÉRÉ.

**Règle de validation de chaque tier :**

1. Le client gagne au minimum 2× ce qu'il nous paie en valeur créée.
2. Mycelium dégage au minimum 65% de marge brute après coûts directs.

---

### 4.2 Les 4 tiers

---

#### ① AUTONOME — 890€/mois

**"Vous pilotez. On surveille et on est là si besoin."**

|                 |                                                                                                                                                                               |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cible**       | PME 5-20 véhicules. Vous avez quelqu'un en interne (RH, office manager) qui gère la flotte à temps partiel, mais vous voulez un outil moderne et un filet de sécurité humain. |
| **Véhicules**   | 5 à 20                                                                                                                                                                        |
| **Conducteurs** | jusqu'à 80                                                                                                                                                                    |
| **Prix**        | **890€ HT/mois**                                                                                                                                                              |

**Ce qui est inclus :**

- Accès complet logiciel Mycelium Fleet OS (réservations, calendrier, compliance, finance, sinistres, conducteurs)
- Concierge IA pour les salariés (réservation en langage naturel, 24/7)
- Alertes compliance automatiques (CT, assurance, permis, BiK si UK, CSRD si Nordiques)
- Support humain réactif : on répond quand vous appelez (max 3h/mois incluses)
- Rapport mensuel automatisé (généré par le logiciel, envoyé le 5 du mois)
- Onboarding initial : import flotte + session de prise en main 1h

**Ce qui n'est pas inclus :**

- Appels proactifs de notre côté (c'est vous qui nous contactez)
- Négociation active de vos contrats
- Interventions terrain (facturées à l'acte)

**Valeur créée pour le client :**

```
Situation actuelle type :
  Admin/RH qui gère la flotte : 3h/semaine × 48 semaines × 40€/h
  = 5 760€/an de productivité perdue
  + logiciel Excel/Outlook : dysfonctionnel mais "gratuit"
  + amendes compliance non anticipées : ~1 500€/an en moyenne
  Total coût réel actuel                   : ~7 260€/an

Avec Mycelium AUTONOME :
  Abonnement                               : 10 680€/an
  Économies :
  - Productivité récupérée (admin libéré)  : + 5 760€
  - Compliance zéro raté                   : + 1 500€
  - Meilleure utilisation véhicules (IK↓) : + 4 000€
  Total valeur créée                       : + 11 260€/an

BÉNÉFICE NET CLIENT                        : + 580€/an
→ Mycelium se paie (presque) tout seul
→ Et l'admin récupère 3h/semaine pour autre chose
```

---

#### ② GÉRÉ — 2 490€/mois

**"On gère votre flotte à votre place. Vous validez, on exécute."**

|                 |                                                                                                                                                                                   |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cible**       | PME/ETI 15-60 véhicules. Vous n'avez pas de gestionnaire de flotte dédié et vous ne voulez pas en recruter un. Vous voulez déléguer l'opérationnel tout en restant décisionnaire. |
| **Véhicules**   | 15 à 60                                                                                                                                                                           |
| **Conducteurs** | jusqu'à 250                                                                                                                                                                       |
| **Prix**        | **2 490€ HT/mois**                                                                                                                                                                |

**Ce qui est inclus :**

- Tout AUTONOME, plus :
- Point mensuel proactif (c'est nous qui vous appelons, pas l'inverse)
- Gestion active des contraventions (identification conducteur, décision contestation, suivi)
- Gestion des échéances compliance (CT, assurance, permis) avec coordination côté Mycelium
- Rapport mensuel rédigé en langage humain (pas juste des données)
- 8h/mois de concierge remote incluses
- Tarif préférentiel sur les interventions terrain (-15% vs prix catalogue)

**Ce qui n'est pas inclus :**

- Négociation active de vos contrats leasing/assurance
- Interventions terrain (facturées à l'acte au tarif préférentiel)
- Concierge nommé dédié (pool partagé)

**Valeur créée pour le client :**

```
Situation actuelle type :
  Gestionnaire de flotte partagé (40% d'un poste) : 45 000€ × 40%
  = 18 000€/an chargé
  + logiciel fleet basique                         : 3 000€/an
  + IK non optimisées (30 véhicules sous-utilisés): 12 000€/an
  Total coût réel actuel                           : ~33 000€/an

Avec Mycelium GÉRÉ :
  Abonnement                                       : 29 880€/an
  Économies :
  - Poste gestionnaire partagé évité               : + 18 000€
  - Logiciel évité                                 : + 3 000€
  - Meilleure utilisation = IK réduites            : + 12 000€
  - Négociations ad hoc terrain                    : + 5 000€
  Total valeur créée                               : + 38 000€/an

BÉNÉFICE NET CLIENT                                : + 8 120€/an
→ Mycelium est moins cher qu'un demi-poste
→ Et le service est meilleur (proactif, outillé, sans congés)
```

---

#### ③ CONCIERGERIE — 5 990€/mois

**"Votre flotte est entre de bonnes mains. Vous ne vous en occupez plus."**

|                 |                                                                                                                                                                                                                            |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cible**       | ETI 30-150 véhicules. Vous avez (ou devriez avoir) un gestionnaire de flotte à temps plein. Vous voulez mieux : un service proactif, outillé par l'IA, qui négocie et optimise en continu — sans les contraintes d'un CDI. |
| **Véhicules**   | 30 à 150                                                                                                                                                                                                                   |
| **Conducteurs** | jusqu'à 800                                                                                                                                                                                                                |
| **Prix**        | **5 990€ HT/mois**                                                                                                                                                                                                         |

**Ce qui est inclus :**

- Tout GÉRÉ, plus :
- **Concierge nommé dédié** : une personne qui connaît votre flotte par cœur
- Négociation active de vos contrats (leasing, assurance) — nous vous présentons les options, vous décidez
- 2 interventions terrain incluses par mois (inspection, remise de clés, convoyage)
- Gestion sinistres de A à Z (déclaration → transmission assureur → coordination garage → clôture)
- Portail Fleet Care client : tableau de bord "Ce mois-ci pour vous" en langage naturel
- SLA garanti : réponse < 2h ouvrées, 6j/7
- Rapport mensuel personnalisé avec recommandations d'optimisation

**Ce qui n'est pas inclus :**

- Interventions terrain au-delà de 2/mois (facturées à l'acte au tarif préférentiel)

**Valeur créée pour le client :**

```
Situation actuelle type :
  Gestionnaire de flotte CDI temps plein   : 55 000€/an chargé
  + logiciel fleet                         : 8 000€/an
  + IK mal optimisées (80 véhicules)       : 30 000€/an
  + contrats jamais renégociés (marge 8%)  : 15 000€/an
  + sinistres mal gérés (délais, litiges)  : 8 000€/an
  Total coût réel actuel                   : ~116 000€/an

Avec Mycelium CONCIERGERIE :
  Abonnement                               : 71 880€/an
  Économies :
  - CDI gestionnaire évité                 : + 55 000€
  - Logiciel évité                         : + 8 000€
  - IK réduites (meilleure utilisation)    : + 30 000€
  - Renégociations contrats                : + 15 000€
  - Sinistres mieux gérés                  : + 8 000€
  Total valeur créée                       : + 116 000€/an

BÉNÉFICE NET CLIENT                        : + 44 120€/an
→ Moins cher qu'un CDI, meilleur service
→ La différence finance autre chose
```

---

#### ④ GRAND COMPTE — Sur devis, à partir de 10 000€/mois

**"Votre flotte, notre équipe dédiée. SLA sur-mesure."**

|                 |                                                                                                                                                                                |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Cible**       | 150+ véhicules, grands groupes, collectivités, structures multi-sites. Besoins spécifiques : intégrations custom, présence terrain régulière, reporting avancé, SLA exigeants. |
| **Véhicules**   | 150+                                                                                                                                                                           |
| **Conducteurs** | Illimité                                                                                                                                                                       |
| **Prix**        | **≥ 10 000€ HT/mois** (négocié selon périmètre)                                                                                                                                |

**Ce qui est inclus (sur-mesure) :**

- Tout CONCIERGERIE, plus :
- Concierge senior nommé + backup identifié (jamais une seule personne de votre côté)
- Forfait terrain négocié (nombre d'interventions incluses selon usage)
- Intégrations custom (ERP, SI RH, SSO)
- SLA sur-mesure (ex : réponse < 1h, astreinte weekend)
- Réunion de pilotage trimestrielle avec présentation des résultats chiffrés
- Possibilité de présence physique Mycelium sur site (lancement, formations conducteurs)

**Valeur créée — exemple Domofrance (150 véhicules, 1 000 conducteurs) :**

```
Situation actuelle :
  2 gestionnaires flotte ou équivalent     : 140 000€/an
  + logiciel réservation 1 000 users       : 30 000€/an
  + IK non optimisées (2,5× trop cher)     : 86 400€/an
  + compliance non automatisée (risques)   : 15 000€/an
  Total coût réel actuel                   : ~271 400€/an

Avec Mycelium GRAND COMPTE :
  Abonnement                               : 120 000€/an
  Économies :
  - Gestionnaires évités                   : + 140 000€
  - Logiciel réservation évité             : + 30 000€
  - IK réduites (meilleure utilisation)    : + 86 400€
  - Compliance automatisée                 : + 15 000€
  Total valeur créée                       : + 271 400€/an

BÉNÉFICE NET DOMOFRANCE                    : + 151 400€/an
→ Mycelium rapporte plus qu'il ne coûte
→ ROI de 2,26× sur la première année
```

---

### 4.3 Actes facturables séparément — tous tiers

| Prestation                                                  | Prix client HT                   |
| ----------------------------------------------------------- | -------------------------------- |
| Onboarding initial (import flotte + setup + session J1)     | 800€ one-shot                    |
| Inspection physique véhicule                                | 120€/véhicule                    |
| Remise de clés + briefing conducteur terrain                | 80€                              |
| Convoyage véhicule                                          | 2€/km (min 80€)                  |
| Formation conducteurs groupe (session 1h, max 20 personnes) | 350€/session                     |
| Audit contrats leasing/assurance                            | 1 800€                           |
| Success fee optimisation contrats                           | 20% des économies réalisées An 1 |
| Commission revente véhicule                                 | 3,5% du prix de cession          |
| Heure concierge supplémentaire (au-delà du forfait)         | 95€/h                            |

---

### 4.4 Unit economics — la preuve par les chiffres

| Tier         | Prix client | Coûts directs                    | Marge brute | Marge % |
| ------------ | ----------- | -------------------------------- | ----------- | ------- |
| AUTONOME     | 890€        | 120€ (infra + 0-1 terrain)       | 770€        | **87%** |
| GÉRÉ         | 2 490€      | 380€ (infra + 2-3 terrains)      | 2 110€      | **85%** |
| CONCIERGERIE | 5 990€      | 830€ (infra + 2 terrains inclus) | 5 160€      | **86%** |
| GRAND COMPTE | 10 000€+    | 1 800€ (infra + terrain forfait) | 8 200€+     | **82%** |

**Le temps de Jules** est la "ressource rare" — mais même en valorisant son heure à 150€ :

- AUTONOME : 3h × 150€ = 450€ → net 320€/client/mois
- GÉRÉ : 8h × 150€ = 1 200€ → net 910€/client/mois
- CONCIERGERIE : 20h × 150€ = 3 000€ → net 2 160€/client/mois
- GRAND COMPTE : 30h × 150€ = 4 500€ → net 3 700€+/client/mois

**Seuil de viabilité solo Jules :** 5 clients GÉRÉ = 4 550€ net/mois après coûts. Ou 1 CONCIERGERIE + 3 AUTONOME = 4 830€ net/mois. **Rentable dès le 1er client Enterprise/Grand Compte.**

---

## PARTIE 5 — PROJECTIONS FINANCIÈRES ANNÉE 0 À 3

### 5.1 Hypothèses

- Domofrance en pilot GÉRÉ 30 véhicules (4 500€) en M2, upgrade Grand Compte en M5
- 1 nouveau client AUTONOME ou GÉRÉ par mois à partir de M3 (Paris + réseau)
- 1 CONCIERGERIE tous les 2 mois à partir de M7 (références Domofrance)
- Taux de churn annuel : 5% — service humain nommé = fidélité forte
- Premier concierge remote recruté quand Jules dépasse 160h/mois de charge (environ M14)
- First Field Agent salarié Bordeaux dès Domofrance Grand Compte signé (M5-M6)
- Success fees et commissions revente : conservativement nuls en An 0-1, significatifs An 2+

---

### 5.2 Année 0 — Juillet à Décembre 2026

| Mois        | Événement                                             | MRR fin de mois | One-shots       | Total mois  |
| ----------- | ----------------------------------------------------- | --------------- | --------------- | ----------- |
| **M1** Juil | Setup, démo Domofrance, annonce prestataire terrain   | 0€              | 0€              | **0€**      |
| **M2** Août | Pilot Domofrance signé — 30 véhicules (GÉRÉ extended) | 4 500€          | 800€ onboarding | **5 300€**  |
| **M3** Sep  | + 1 GÉRÉ Paris                                        | 6 990€          | 800€            | **7 790€**  |
| **M4** Oct  | + 1 AUTONOME Paris                                    | 7 880€          | 800€            | **8 680€**  |
| **M5** Nov  | Domofrance → GRAND COMPTE 150 véhicules (10 000€)     | 13 380€         | 0€              | **13 380€** |
| **M6** Déc  | + 1 GÉRÉ (Paris ou Lyon)                              | 15 870€         | 800€            | **16 670€** |

**Total revenus An 0 : 51 820€**

**Coûts An 0 :**

| Poste                                                 | Total       |
| ----------------------------------------------------- | ----------- |
| Prestataire terrain Bordeaux — Scénario A             | 5 500€      |
| Infrastructure logiciel (Convex, Claude API, Resend…) | 1 500€      |
| Field Agent salarié Bordeaux mi-temps (M5-M6, 2 mois) | 2 400€      |
| Kick-off Bordeaux (TGV + logement 1 nuit)             | 350€        |
| Outils (CRM léger, outils comms)                      | 400€        |
| **Total coûts An 0**                                  | **10 150€** |

**Résultat net An 0 : 41 670€ ✅**

---

### 5.3 Année 1 — 2027

**Portefeuille cible fin An 1 : 16 clients**

| Mix clients  | Nombre | MRR unit | MRR total       |
| ------------ | ------ | -------- | --------------- |
| GRAND COMPTE | 2      | 10 000€  | 20 000€         |
| CONCIERGERIE | 3      | 5 990€   | 17 970€         |
| GÉRÉ         | 7      | 2 490€   | 17 430€         |
| AUTONOME     | 4      | 890€     | 3 560€          |
| **TOTAL**    | **16** |          | **58 960€ MRR** |

| Trimestre | MRR moyen | Revenus récurrents | One-shots & actes | Total trimestre |
| --------- | --------- | ------------------ | ----------------- | --------------- |
| Q1        | 19 000€   | 57 000€            | 6 000€            | **63 000€**     |
| Q2        | 30 000€   | 90 000€            | 9 000€            | **99 000€**     |
| Q3        | 44 000€   | 132 000€           | 12 000€           | **144 000€**    |
| Q4        | 56 000€   | 168 000€           | 15 000€           | **183 000€**    |

**Total revenus An 1 : ~489 000€**

**Coûts An 1 :**

| Poste                                                 | Total           |
| ----------------------------------------------------- | --------------- |
| Field Agent salarié Bordeaux (CDI plein temps, Q1-Q4) | 28 800€         |
| Prestataires AE Paris + nouvelles villes              | 22 000€         |
| Infrastructure logiciel (600€/mois)                   | 7 200€          |
| 1 concierge remote salarié (embauche M14 = T4)        | 9 000€ (3 mois) |
| Marketing (contenu, App Stores Xero/QB)               | 12 000€         |
| Outils & CRM                                          | 3 600€          |
| Déplacements (3-4 kick-offs)                          | 1 200€          |
| **Total coûts An 1**                                  | **83 800€**     |

**Résultat net An 1 : ~405 200€ ✅**

---

### 5.4 Année 2 — 2028

**Portefeuille cible fin An 2 : 30 clients**

| Mix clients  | Nombre | MRR unit    | MRR total        |
| ------------ | ------ | ----------- | ---------------- |
| GRAND COMPTE | 4      | 11 000€ avg | 44 000€          |
| CONCIERGERIE | 8      | 5 990€      | 47 920€          |
| GÉRÉ         | 12     | 2 490€      | 29 880€          |
| AUTONOME     | 6      | 890€        | 5 340€           |
| **TOTAL**    | **30** |             | **127 140€ MRR** |

| Trimestre | MRR moyen | Revenus récurrents | One-shots & success fees | Total trimestre |
| --------- | --------- | ------------------ | ------------------------ | --------------- |
| Q1        | 68 000€   | 204 000€           | 20 000€                  | **224 000€**    |
| Q2        | 85 000€   | 255 000€           | 28 000€                  | **283 000€**    |
| Q3        | 105 000€  | 315 000€           | 35 000€                  | **350 000€**    |
| Q4        | 122 000€  | 366 000€           | 40 000€                  | **406 000€**    |

**Total revenus An 2 : ~1 263 000€**

**Coûts An 2 :**

| Poste                                      | Total        |
| ------------------------------------------ | ------------ |
| Jules + 2 concierges remote salariés       | 126 000€     |
| 3 Field Agents CDI (Bordeaux, Paris, Lyon) | 78 000€      |
| 2 Field Agents AE (nouvelles villes)       | 24 000€      |
| Infrastructure logiciel (1 500€/mois)      | 18 000€      |
| 1 Account Manager (embauche Q2)            | 31 500€      |
| Marketing (inbound + App Stores)           | 35 000€      |
| Outils & divers                            | 8 000€       |
| **Total coûts An 2**                       | **320 500€** |

**Résultat net An 2 : ~942 500€ ✅**

---

### 5.5 Année 3 — 2029

**Portefeuille cible fin An 3 : 50 clients (dont 3 UK)**

| Mix clients  | Nombre | MRR unit    | MRR total        |
| ------------ | ------ | ----------- | ---------------- |
| GRAND COMPTE | 6      | 12 000€ avg | 72 000€          |
| CONCIERGERIE | 14     | 5 990€      | 83 860€          |
| GÉRÉ         | 20     | 2 490€      | 49 800€          |
| AUTONOME     | 10     | 890€        | 8 900€           |
| **TOTAL**    | **50** |             | **214 560€ MRR** |

**Total revenus An 3 : ~2 100 000€**

**Coûts An 3 :**

| Poste                                   | Total        |
| --------------------------------------- | ------------ |
| Jules + 4 concierges remote             | 210 000€     |
| 6 Field Agents CDI (4 villes FR + 2 UK) | 156 000€     |
| 3 Field Agents AE                       | 36 000€      |
| 2 Account Managers                      | 84 000€      |
| Infrastructure logiciel (3 500€/mois)   | 42 000€      |
| Marketing & partnerships                | 60 000€      |
| Légal & compliance (UK)                 | 15 000€      |
| Divers                                  | 10 000€      |
| **Total coûts An 3**                    | **613 000€** |

**Résultat net An 3 : ~1 487 000€ ✅**

---

### 5.6 Tableau de synthèse

|                    | An 0 (6 mois) | An 1         | An 2         | An 3           |
| ------------------ | ------------- | ------------ | ------------ | -------------- |
| Clients actifs     | 6             | 16           | 30           | 50             |
| MRR fin de période | 15 870€       | 58 960€      | 127 140€     | 214 560€       |
| Revenus totaux     | 51 820€       | 489 000€     | 1 263 000€   | 2 100 000€     |
| Coûts totaux       | 10 150€       | 83 800€      | 320 500€     | 613 000€       |
| **Résultat net**   | **41 670€**   | **405 200€** | **942 500€** | **1 487 000€** |
| **Marge nette**    | **80%**       | **83%**      | **75%**      | **71%**        |

**Headcount :**

|                   | An 0            | An 1               | An 2      | An 3      |
| ----------------- | --------------- | ------------------ | --------- | --------- |
| Concierges remote | Jules seul      | Jules seul → +1 T4 | Jules + 2 | Jules + 4 |
| Field Agents CDI  | 1 (Bordeaux M5) | 1                  | 3         | 6         |
| Field Agents AE   | 1-2             | 2-3                | 2         | 3         |
| Account Managers  | —               | —                  | 1         | 2         |
| **ETP total**     | **1,5**         | **3**              | **8**     | **15**    |

---

## PARTIE 6 — DOMOFRANCE : LE PLAN DE CLOSING

### 6.1 L'opportunité en 3 chiffres

- **150 véhicules** partagés mal utilisés
- **1 000 conducteurs** qui prennent leur voiture perso faute d'outil
- **2,5×** — le surcoût IK vs véhicule partagé. C'est la douleur, c'est l'argument.

### 6.2 Le ROI précis pour Domofrance

```
HYPOTHÈSE CONSERVATRICE
────────────────────────
300 salariés font des déplacements pro réguliers
Moyenne : 4 000 km/an professionnel chacun
Aujourd'hui : 60% prennent leur voiture perso → IK à 0,40€/km
  180 salariés × 4 000 km × 0,40€ = 288 000€/an en IK

Avec Mycelium : 50% de ces trajets basculent vers les véhicules partagés
  Économie IK    : 90 × 4 000 × 0,40€  = 144 000€
  Coût réel km   : 90 × 4 000 × 0,16€  =  57 600€
  ──────────────────────────────────────────────────
  Économie nette IK                     =  86 400€/an

AUTRES ÉCONOMIES
────────────────────────
  Gestionnaire(s) flotte évités         =  90 000€/an
  Logiciel réservation 1 000 users évité=  30 000€/an
  Compliance automatisée (risques évités)=  15 000€/an
  ──────────────────────────────────────────────────
  TOTAL VALEUR CRÉÉE                    = 221 400€/an

PRIX MYCELIUM GRAND COMPTE
────────────────────────
  10 000€/mois                          = 120 000€/an

ROI DOMOFRANCE
────────────────────────
  Valeur créée   221 400€
  Coût Mycelium  120 000€
  ──────────────────────────────────────────────────
  BÉNÉFICE NET   + 101 400€/an
  ROI            ×1,84 dès l'An 1
```

**L'argument en 1 phrase :** "Vous investissez 120 000€ avec nous. On vous en rapporte 221 000€. Vous gagnez 101 000€ par an."

### 6.3 Plan de closing en 5 étapes

| Étape                    | Action                                                                                                                  | Timing           | Livrable                                |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------- | ---------------- | --------------------------------------- |
| **Démo test**            | 10 conducteurs, 5 véhicules, 2 semaines accès gratuit — ils vivent l'expérience                                         | Juillet 2026     | Lien accès + call onboarding 30 min     |
| **Présentation ROI**     | Réunion RSG + DAF si accessible. 1 slide : situation actuelle vs Mycelium, chiffres 6.2 adaptés à leurs données réelles | Fin juillet 2026 | Slide deck ROI + contrat pilot à signer |
| **Pilot payant**         | GÉRÉ étendu — 4 500€/mois, 30 véhicules, 200 conducteurs, 3 mois. Gré à gré : 13 500€ < seuil MAPA 40 000€              | Août 2026        | Contrat pilot signé                     |
| **Bilan pilot**          | Réunion résultats : réservations réalisées, IK évitées estimées, satisfaction conducteurs (NPS)                         | Novembre 2026    | Rapport impact + offre Grand Compte     |
| **Contrat Grand Compte** | 150 véhicules, 1 000 conducteurs, 10 000€/mois, 12 mois                                                                 | Novembre 2026    | Contrat annuel signé                    |

### 6.4 Checklist démo (avant le premier rendez-vous)

- [ ] Org "Domofrance Demo" créée (logo, couleurs)
- [ ] 5 véhicules importés (Renault ZOE, Kangoo E, Berlingo, Duster, Clio)
- [ ] 10 conducteurs invités (emails fournis par le RSG)
- [ ] Scénario démo : conducteur réserve en < 3 minutes via Concierge IA
- [ ] Dashboard admin : stats d'utilisation fictives mais réalistes
- [ ] Alerte compliance simulée visible (CT à J-12, permis à renouveler)
- [ ] Slide ROI personnalisé avec les chiffres de 6.2

---

## PARTIE 7 — DÉPLOIEMENT GÉOGRAPHIQUE

### 7.1 Règle d'or

**On n'ouvre pas une ville sans un client signé dedans.** Zéro coût fixe préventif. Jules prospecte partout à distance — l'ouverture physique (prestataire terrain) se fait uniquement après la première signature.

### 7.2 Séquence d'ouverture

1. Prospect qualifié identifié à distance
2. Signature premier contrat → déclencheur
3. Recrutement prestataire terrain local (2-3 semaines, simultané à l'onboarding)
4. Formation prestataire (Modules 1 + 3 + 4)
5. 3e client dans la ville → évaluation Scénario B ou C (garage partenaire / Field Agent salarié)

### 7.3 Calendrier

| Phase       | Villes                 | Période                      | Trigger                              |
| ----------- | ---------------------- | ---------------------------- | ------------------------------------ |
| **Phase 0** | Bordeaux               | M1-M3 (Juil-Sep 2026)        | Domofrance                           |
| **Phase 1** | Paris                  | M2 en parallèle              | Jules y est basé                     |
| **Phase 2** | Lyon, Nantes, Toulouse | M9-M15 (Avr-Oct 2027)        | 2 prospects qualifiés par ville      |
| **Phase 3** | Marseille, Lille       | M18-M24 (Jan-Juil 2028)      | Volume Phase 2 stable                |
| **Phase 4** | Londres                | M24-M30 (Juil 2028-Jan 2029) | 1 partenaire UK identifié            |
| **Phase 5** | Stockholm, Copenhague  | M30-M36 (Jan-Juil 2029)      | London stable, BiK/CSRD comme levier |

### 7.4 Critères d'ouverture d'une ville

| Critère                           | Seuil                                            | Source           |
| --------------------------------- | ------------------------------------------------ | ---------------- |
| 1er client signé                  | Obligatoire                                      | Contrat          |
| Prestataire terrain identifié     | Obligatoire avant J1                             | Recrutement      |
| Prospects supplémentaires en pipe | ≥ 1 qualifié                                     | CRM              |
| Potentiel marché                  | ≥ 100 cibles (50-500 salariés, flotte > 10 veh.) | LinkedIn + INSEE |

---

## PARTIE 8 — RISQUES & MITIGATION

| Risque                                              | Proba                             | Impact      | Mitigation                                                                                                        |
| --------------------------------------------------- | --------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------- |
| Domofrance retarde ou ne signe pas                  | Moyen                             | Fort An 0   | Paris actif en parallèle dès M2. 4 GÉRÉ = même MRR que 1 Grand Compte. Jamais 100% du pipeline sur 1 prospect.    |
| Prestataire terrain défaillant                      | Moyen                             | Moyen       | 2 prestataires minimum par ville, backup documenté. Scénario B (garage partenaire) comme fallback rapide.         |
| Jules = point de défaillance unique                 | Moyen                             | Fort        | Documentation totale des processus. Seuil de recrutement concierge fixé à 160h/mois (environ M14).                |
| Qualité non homogène entre villes                   | Moyen                             | Fort        | Certification obligatoire (pas de dérogation). Score de performance mensuel automatique. Library de cas partagée. |
| Clients qui négocient le prix à la baisse           | Moyen                             | Moyen       | Ancrage fort sur la valeur créée (le ROI justifie le prix). Pas de remise > 15% sans upgrade de tier.             |
| Marchés publics (Domofrance + autres collectivités) | Faible (pilot gré à gré possible) | Fort        | Rester < 40 000€ HT sur le pilot (3 mois × 4 500€ = 13 500€). Le contrat annuel suit après bilan chiffré.         |
| Concurrent qui copie le modèle                      | Faible An 0-1                     | Moyen An 2+ | Moat : benchmarks de coûts réels accumulés, réseau terrain, relation client humaine nommée. 18-24 mois d'avance.  |

---

## ANNEXE — ACTIONS IMMÉDIATES

**Cette semaine :**

- [ ] Créer l'org demo Domofrance dans l'app
- [ ] Préparer le slide deck ROI (1 slide, les chiffres de 6.2)
- [ ] Reprendre contact RSG Domofrance pour fixer la date de démo
- [ ] Poster l'annonce prestataire terrain Bordeaux (Malt + LinkedIn)

**Avant la signature Domofrance :**

- [ ] Rédiger le contrat pilot (2 pages, 4 500€/mois, 3 mois, résiliable 30j)
- [ ] Former le prestataire terrain sélectionné (Modules 1 + 3 + 4)
- [ ] Rédiger la checklist onboarding J1-J30 basée sur ROADMAP-CONCIERGE.md §9.1

**Dès 15 000€ MRR stable :**

- [ ] Recruter 1er concierge remote (fiche de poste à préparer en An 1 Q1)

---

_Document vivant v2.0 — mise à jour à chaque nouveau client signé, ouverture de ville, ajustement pricing._
_Référence : ROADMAP-CONCIERGE.md (architecture technique), CLAUDE.md (contraintes produit)_
