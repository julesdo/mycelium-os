# Mycelium Fleet OS — Vision UX Unifiée
## "Mycelium Assist" : un seul endroit, humains + IA, pour tout le monde

> **Objectif de ce document** : Donner une image parfaitement claire de tout ce que fait Mycelium aujourd'hui, identifier les frictions d'expérience actuelles, et poser une vision concrète pour une interface unifiée qui met autant en avant l'humain que l'IA — accessible et personnalisée pour chaque type d'utilisateur, du DAF au salarié qui réserve son véhicule.

---

## 1. Cartographie complète de l'existant

### 1.1 Qui utilise Mycelium et depuis où ?

Mycelium Fleet OS repose sur **trois espaces distincts**, chacun avec ses utilisateurs et ses cas d'usage.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MYCELIUM FLEET OS                            │
│                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │   /admin/*       │  │   /app/*         │  │  /concierge/*    │  │
│  │                  │  │                  │  │                  │  │
│  │  DAF · CFO       │  │  Salarié         │  │  Équipe          │  │
│  │  Gestionnaire    │  │  Conducteur      │  │  Mycelium        │  │
│  │  RH              │  │  Utilisateur     │  │  (interne)       │  │
│  │                  │  │  flotte          │  │                  │  │
│  │  Rôle :          │  │  Rôle :          │  │  Rôle :          │  │
│  │  ORG_ADMIN       │  │  ORG_MEMBER      │  │  concierge /     │  │
│  │  ORG_MANAGER     │  │                  │  │  super_admin     │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

### 1.2 L'espace Admin — Ce que voient les gestionnaires

L'espace `/admin/` est la **tour de contrôle** de l'organisation. C'est là que le DAF, le responsable RH, ou le gestionnaire flotte pilote tout.

| Section | URL | Ce qu'on y fait |
|---------|-----|-----------------|
| **Dashboard** | `/admin/dashboard` | KPIs flotte en temps réel, graphiques d'activité, véhicules à traiter en urgence, feed d'événements |
| **Flotte** | `/admin/fleet` | CRUD complet des véhicules, import CSV, statuts, fiche véhicule détaillée |
| **Réservations** | `/admin/reservations` | Calendrier flotte (semaine/jour/mois), drag-to-create, vue toutes les réservations |
| **Maintenance** | `/admin/maintenance` | Planification entretiens, suivi garage, alertes NORMAL/URGENT/CRITIQUE, historique |
| **Conducteurs** | `/admin/drivers` | Profils conducteurs, permis (upload + expiry), restrictions, historique trajets |
| **Contraventions** | `/admin/violations` | Réception amendes, identification conducteur, traitement, KPIs |
| **Sinistres** | `/admin/incidents` | Suivi sinistres déclarés par les salariés, envoi assureur, imputation franchise |
| **Finance** | `/admin/finance` | Coûts véhicules, catégories, import relevés carburant, BiK UK (avantage en nature), fiscal TVS/AEN/TVA |
| **Durabilité** | `/admin/sustainability` | Tableau de bord CO₂ Scope 1-2-3, rapport ESRS E1 (CSRD) |
| **Conformité** | `/admin/compliance` | Surveillance BiK UK + CSRD nordiques + conformité auto (Agent Compliance IA) |
| **Notes de frais** | `/admin/expenses` | Vue agrégée de toutes les notes de frais salariés |
| **Paramètres** | `/admin/settings` | Organisation, localisation/devise, membres & invitations, intégrations comptables (Xero/QuickBooks/Pennylane), plans & billing Paddle |
| **Support** | `/admin/support` | Tickets support internes |

**Agents IA disponibles dans cet espace :**
- **Assistant Gestionnaire** — interroger la flotte en langage naturel ("Taux d'utilisation ce mois ?", "Coûts par catégorie ?")
- **Compliance Officer** — alertes conformité, BiK, CSRD
- **Optimiseur de flotte** — rapport hebdomadaire automatique envoyé par email (lundi 8h UTC)

---

### 1.3 L'espace Salarié — Ce que voit l'employé

L'espace `/app/` est conçu pour être **simple, rapide, rassurant**. Le salarié ne voit que ce qui le concerne.

| Section | URL | Ce qu'on y fait |
|---------|-----|-----------------|
| **Accueil** | `/app` | Carte héro de la réservation active/prochaine, mini-cards trajets suivants, stats personnelles, accès Concierge IA, **onglet Fleet Care** (si activé) |
| **Mes trajets** | `/app/reservations` | Liste des réservations passées et à venir |
| **Nouvelle réservation** | `/app/reservations/new` | Wizard 4 étapes : dates/site/véhicule/confirmation |
| **État des lieux** | `/app/reservations/[id]/inspect` | Wizard photos (6 angles + dommages + recap) avant/après trajet |
| **Mes sinistres** | `/app/incidents` | Déclarer un sinistre (wizard photos), suivre le dossier |
| **Notes de frais** | `/app/expenses` | Mes IK et frais professionnels |
| **Profil** | `/app/profile` | Photo, infos perso, permis de conduire |
| **Paramètres** | `/app/settings` | Compte, email, sécurité |

**L'onglet Fleet Care (visible pour les admins)** : affiché dans `/app` via un segment switcher, il montre le "health score" de la flotte, les activités du mois/mois prochain et un bouton "Parler au concierge" — c'est la fenêtre vers le service humain Mycelium.

---

### 1.4 L'espace Concierge — L'interne Mycelium

L'espace `/concierge/` est **réservé à l'équipe Mycelium** (les vrais humains qui accompagnent les clients). C'est leur poste de travail.

| Section | URL | Ce qu'on y fait |
|---------|-----|-----------------|
| **Santé clients** | `/concierge` | Grille de tous les clients avec health score, alertes critiques/urgentes, tâches ouvertes |
| **Fiche client** | `/concierge/[organizationId]` | Détail d'un client : flotte, réservations, maintenance, actions à mener |
| **Équipe Mycelium** | `/concierge/staff` | Gestion des membres de l'équipe concierge (ajout, rôles, suppression) |

---

### 1.5 Les 6 agents IA — Où ils vivent

| Agent | Type | Point d'accès client | Endpoint |
|-------|------|---------------------|----------|
| **Concierge** | Chat interactif | Copilot FAB (onglet Concierge) | `/api/concierge` |
| **Assistant Gestionnaire** | Chat interactif | Copilot FAB (onglet Manager) | `/api/manager` |
| **Compliance Officer** | Chat interactif | Copilot FAB (onglet Compliance) | `/api/compliance` |
| **Optimiseur de flotte** | Cron + email | Email automatique lundi 8h | Background cron |
| **Négociateur de coûts** | Proactif | (à venir) | — |
| **Coach conducteurs** | Proactif | (à venir) | — |

**Le Copilot actuel** : Un FAB (bouton flottant en bas à droite) + panneau 420px avec 3 onglets (Concierge / Manager / Compliance) + Cmd+K comme raccourci global. Chaque onglet a ses quick prompts. Il s'adapte au contexte : sur `/app/*` il propose le Concierge par défaut, sur `/admin/*` le Manager.

---

## 2. Les frictions UX actuelles — Pourquoi ça doit évoluer

### Problème #1 : L'humain est invisible

Les concierges Mycelium font un travail essentiel — ils suivent la santé des flottes, anticipent les problèmes, sont disponibles — mais côté client, on ne les voit jamais. Pas de visage, pas de nom, pas de statut de disponibilité. Le service humain est noyé derrière des boutons génériques.

### Problème #2 : Deux points d'entrée chat qui ne se parlent pas

- Le FAB Copilot (Cmd+K) → accède aux 3 agents IA
- Le bouton "Parler au concierge" dans l'onglet Fleet Care → dialogue avec l'humain

Un utilisateur doit savoir où aller selon qu'il veut parler à une IA ou à un humain. Ce n'est pas naturel.

### Problème #3 : La personnalisation est absente

Chaque utilisateur reçoit la même interface. Un DAF qui utilise Mycelium tous les jours a des questions récurrentes très différentes d'un salarié qui réserve une fois par semaine. Il n'y a aucun moyen de personnaliser ses raccourcis.

### Problème #4 : Les agents IA sont nommés de façon technique

"Concierge", "Manager", "Compliance" — ces labels sont clairs en interne mais pas nécessairement pour un utilisateur final. Un salarié ne sait pas qu'il doit aller dans l'onglet "Concierge" pour réserver, ni qu'il existe un onglet "Manager" pour les rapports.

### Problème #5 : L'expérience n'est pas centrée sur le rôle

Un DAF qui arrive sur Mycelium le matin doit aller manuellement dans le bon onglet, taper les bonnes questions. Le système ne s'adapte pas à qui il est et à ce qu'il fait habituellement.

---

## 3. La vision : "Mycelium Assist"

### Principe fondateur

> **Mycelium n'est pas un chatbot avec des humains en backup. C'est un service humain augmenté par l'IA.**

La distinction n'est pas "IA vs humain" — c'est **une conversation continue** qui peut être répondue par l'IA en 2 secondes, ou escaladée à un concierge humain identifié en quelques minutes, selon la complexité. L'utilisateur n'a pas à choisir.

### Un seul panneau. Tout dedans.

**Mycelium Assist** remplace le Copilot actuel et le bouton Fleet Care. C'est le **seul point d'entrée** pour toute assistance — qu'on veuille réserver un véhicule, comprendre un rapport de conformité, ou qu'un problème complexe nécessite un vrai humain.

```
┌─────────────────────────────────────────────────────┐
│  Mycelium Assist                              [✕]   │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │  👤 Sophie — Concierge Mycelium              │   │
│  │  🟢 En ligne · Répond en général en < 5 min  │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  ┌── Aujourd'hui ─────────────────────────────────┐ │
│  │  [IA] Bonjour Thomas ! Votre Renault Zoe est  │ │
│  │  disponible demain matin à partir de 8h sur   │ │
│  │  le site Paris-Nation. Voulez-vous que je la  │ │
│  │  réserve ?                                     │ │
│  └────────────────────────────────────────────────┘ │
│                                                     │
│  [Réserver un véhicule]  [Mes trajets]  [Aide]     │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │ Posez votre question...               [→]    │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

## 4. Les concierges humains — Donner un visage au service

### 4.1 Profil concierge (ce qu'on ajoute)

Chaque membre de l'équipe Mycelium (rôle `concierge` ou `super_admin`) doit avoir un profil enrichi visible par les clients :

| Champ | Description | Où stocké |
|-------|-------------|-----------|
| `avatarUrl` | Photo uploadée via Convex Storage | Table `myceliumStaff` |
| `displayName` | Prénom + initiale nom ("Sophie M.") | Table `myceliumStaff` |
| `specialty` | Étiquette métier : `fleet_ops` / `compliance` / `finance` / `generalist` | Table `myceliumStaff` |
| `availabilityStatus` | `online` / `busy` / `offline` | Table `myceliumStaff` (updatable) |
| `avgResponseTime` | "< 5 min" / "< 1h" / "sous 24h" | Calculé ou renseigné manuellement |
| `bio` | 1 ligne : "Spécialiste maintenance et conformité UK" | Table `myceliumStaff` |

### 4.2 Comment ça apparaît côté client

Dans le panneau Mycelium Assist, au-dessus de la zone de chat, une **carte concierge** apparaît si un concierge est disponible pour cette organisation :

```
┌─────────────────────────────────────────────────────┐
│  [Photo]  Sophie M.                    🟢 En ligne  │
│           Spécialiste maintenance & conformité UK   │
│           Répond généralement en < 5 min            │
└─────────────────────────────────────────────────────┘
```

Si aucun concierge n'est disponible :
```
┌─────────────────────────────────────────────────────┐
│  [Logo]   Équipe Mycelium             🕐 Hors ligne │
│           L'IA répond instantanément.               │
│           Un concierge vous répondra demain matin.  │
└─────────────────────────────────────────────────────┘
```

### 4.3 Upload de la photo — Parcours concierge

Dans `/concierge/staff`, chaque membre peut :
1. Cliquer sur son avatar (actuellement initiales seulement)
2. Uploader une photo (JPEG/PNG, max 2 Mo) via Convex Storage
3. Définir sa spécialité et son statut de disponibilité
4. Mettre à jour sa bio en une ligne

Ce n'est pas un détail — c'est ce qui transforme un service impersonnel en un service de qualité premium.

---

## 5. Expérience par rôle — Ce que chaque utilisateur voit et ressent

### 5.1 Le DAF / CFO

**Son quotidien avec Mycelium :**
- Il veut des chiffres rapidement ("Qu'est-ce qui m'a coûté le plus cher ce trimestre ?")
- Il surveille la conformité BiK UK et CSRD
- Il reçoit le rapport de l'Optimiseur chaque lundi matin par email
- Il escalade vers le concierge Mycelium pour des décisions complexes (renouvellement contrat, sinistre important)

**Ce qu'il voit dans Mycelium Assist :**
- Agent Manager comme agent par défaut
- Quick prompts : "Bilan Q2", "Utilisation flotte", "Conformité BiK", "Coûts maintenance"
- Si son concierge dédié est en ligne, sa photo et son nom sont visibles
- L'IA répond instantanément sur les données, l'humain prend la main sur les sujets stratégiques

**Ce qu'il peut personnaliser :**
- Épingler ses 4 questions favorites
- Choisir si le rapport hebdomadaire lui est envoyé le lundi ou vendredi
- Configurer des alertes seuil (coût > X€, taux d'utilisation < Y%)

---

### 5.2 Les Services Généraux / Gestionnaire flotte

**Son quotidien avec Mycelium :**
- Gestion quotidienne : maintenance, réservations conflictuelles, véhicules en panne
- Il est dans le logiciel plusieurs heures par jour
- Il a besoin d'accès rapide aux véhicules en alerte et aux conducteurs problématiques
- Il travaille en étroite collaboration avec le concierge Mycelium

**Ce qu'il voit dans Mycelium Assist :**
- Vue opérationnelle : alertes maintenance en retard, réservations conflictuelles, conducteurs avec permis expirant
- Quick prompts : "Véhicules urgents aujourd'hui", "Réservations sans véhicule", "Conducteurs alertes"
- Chat avec le concierge Mycelium pour escalader les cas complexes
- Le concierge peut lui envoyer des suggestions proactives directement dans le chat

**Ce qu'il peut personnaliser :**
- Configurer les sites qu'il gère (filtre par défaut)
- Choisir les types d'alertes qui s'affichent en quick prompts
- Activer/désactiver les notifications push pour chaque type d'événement

---

### 5.3 Le Salarié / Conducteur

**Son quotidien avec Mycelium :**
- Il réserve un véhicule 1 à 3 fois par semaine
- Il déclare les états des lieux avant/après
- Il rapporte les sinistres et frais
- Il ne veut pas apprendre un logiciel — il veut juste que ça marche

**Ce qu'il voit dans Mycelium Assist :**
- Interface ultra-simple, centrée sur la réservation
- Agent Concierge par défaut avec phrases naturelles
- Quick prompts : "Réserver demain matin", "Voir mon prochain trajet", "Signaler un problème"
- Si quelque chose va mal (sinistre, question sur une amende), un concierge humain avec son visage prend en charge

**Ce qu'il peut personnaliser :**
- Enregistrer ses trajets favoris (lieu de prise en charge habituel, horaires types)
- Activer les rappels 30min avant chaque réservation
- Choisir la langue de l'interface (FR/EN/SE/NO)

---

### 5.4 Le Concierge Mycelium (côté interne)

**Son quotidien :**
- Il surveille la santé de plusieurs clients en même temps
- Il reçoit les escalades des clients (via le chat Assist)
- Il envoie des rapports, analyses, recommandations
- Il met à jour son statut de disponibilité

**Son espace (`/concierge/`) :**
- Tableau de bord clients avec health scores et alertes
- Fiche client détaillée : toute la flotte, les alertes actives, les conversations en cours
- Gestion de son profil (photo, spécialité, disponibilité)
- Fil de conversations actives avec les clients

---

## 6. Architecture du panneau Mycelium Assist

### 6.1 Structure du panneau

Le panneau Assist est **un seul composant** qui remplace :
- Le `CopilotPanel.svelte` actuel (avec ses 3 onglets)
- Le bouton "Parler au concierge" de Fleet Care

```
AssistPanel
├── Header
│   ├── Title "Mycelium Assist"
│   ├── AgentSelector (pills : Concierge / Manager / Compliance)
│   └── CloseButton
├── ConciergeCard (si concierge dispo pour cette org)
│   ├── Avatar (photo uploadée ou initiales)
│   ├── Nom + Spécialité
│   └── StatusIndicator (🟢 En ligne / 🕐 Hors ligne)
├── MessageList
│   ├── AIMessage (avec icône Mycelium)
│   ├── HumanMessage (avec photo concierge)
│   └── UserMessage
├── QuickPrompts (personnalisables)
└── InputBar
    ├── Textarea
    ├── AttachButton (optionnel)
    └── SendButton
```

### 6.2 Logique de routing des messages

```
Utilisateur envoie un message
         │
         ▼
   Contexte actuel ?
   ┌─────────────────┬─────────────────┐
   │                 │                 │
   ▼                 ▼                 ▼
/app/* →         /admin/* →      /admin/* +
Agent            Agent            compliance
Concierge        Manager          → Agent
(réservation)    (données)          Compliance
                                    
         │                 │
         ▼                 ▼
    Réponse IA         Si question
    instantanée        hors scope IA
                            │
                            ▼
                    Message → Concierge humain
                    (notification dans /concierge/)
                    Indicateur "transfert en cours"
```

### 6.3 Les messages humains — comment ça se distingue

Visuellement, tout est dans l'avatar :

| Source | Avatar | Style bulle |
|--------|--------|-------------|
| IA Concierge | Icône Mycelium (sparkles) | Fond muted |
| IA Manager | Icône graphique/chart | Fond muted |
| Concierge humain | Photo uploadée | Fond légèrement différent + nom en haut |
| Utilisateur | Son initiale ou photo profil | Fond brand (jaune) |

Un tag discret "Répondu par Sophie · il y a 3 min" distingue les messages humains.

---

## 7. Personnalisation — Comment l'utilisateur configure son expérience

### 7.1 Quick prompts personnalisés

Chaque utilisateur peut remplacer les quick prompts par défaut par les siens. Accessible depuis un bouton "Personnaliser" (crayon) visible au survol du bloc quick prompts.

**Pour un salarié :** Il sauvegarde "Réserver Paris-Nation demain matin" comme premier prompt.

**Pour un DAF :** Il sauvegarde "Bilan coûts ce mois vs mois dernier" et "Alertes conformité actives".

Stockage : `localStorage` pour commencer (simple, zéro infra), puis optionnellement en base Convex pour synchronisation multi-device.

### 7.2 Agent par défaut

Dans `/app/settings`, une section "Préférences Assistant" permet de choisir :
- **Agent par défaut** : Concierge (par défaut pour les salariés) / Manager (par défaut pour les admins)
- **Raccourci clavier** : Cmd+K (défaut) ou désactivé
- **Position du FAB** : bas droit (défaut) ou bas gauche

### 7.3 Paramètres de disponibilité (côté concierge Mycelium)

Dans `/concierge/staff`, chaque concierge peut :
- Basculer son statut (En ligne / Occupé / Hors ligne) en 1 clic
- Planifier ses absences (week-end, congés) → le panneau client s'adapte ("disponible lundi matin")
- Définir son temps de réponse estimé

### 7.4 Configuration org-level (côté admin)

Dans `/admin/settings`, un ORG_ADMIN peut :
- Définir des quick prompts partagés pour toute l'org ("les 5 questions les plus posées chez nous")
- Activer/désactiver les agents IA disponibles pour ses salariés (ex : désactiver l'accès au Manager pour les ORG_MEMBER)
- Choisir si le Fleet Care est visible pour tous les admins ou seulement le ORG_ADMIN principal

---

## 8. Ce qui change techniquement

### 8.1 Modifications légères (évolution, pas refonte)

| Quoi | Fichier(s) | Effort |
|------|-----------|--------|
| Ajouter `avatarUrl`, `specialty`, `availabilityStatus`, `bio` au staff | `/src/lib/convex/concierge/staff.ts` + schema | S (½ jour) |
| Upload photo dans `/concierge/staff` | Page existante + Convex Storage | S (½ jour) |
| Afficher la ConciergeCard dans CopilotPanel | `copilot-panel.svelte` | S (1h) |
| Unifier le bouton Fleet Care "Parler au concierge" → ouvre le panel | `talk-to-concierge-button.svelte` | XS (30min) |
| Quick prompts éditables (localStorage) | `copilot-panel.svelte` + petit composant éditeur | M (1 jour) |
| Distinguer visuellement messages IA vs humain | `copilot-message.svelte` | S (2h) |

### 8.2 Ce qui reste identique

- L'architecture des agents IA (httpActions SSE) — aucun changement
- Le CopilotStore — une ligne à ajouter pour `humanConcierge`
- Les routes `/concierge/*` — structure inchangée, on enrichit les pages existantes
- Le copilot FAB — reste exactement pareil côté admin

### 8.3 Ce qu'on ne fait PAS maintenant

- Pas de messagerie temps réel bidirectionnel (Convex mutations suffisent, pas besoin de WebSockets supplémentaires)
- Pas d'application mobile native (PWA déjà suffisant, dans le scope défini)
- Pas d'IA dans l'espace /concierge/ interne (les concierges humains n'ont pas besoin d'IA pour faire leur travail)

---

## 9. Parcours types — Scénarios concrets

### Scénario 1 : Thomas (salarié) veut réserver un véhicule

1. Thomas ouvre Mycelium sur son téléphone (PWA)
2. Sur la page d'accueil, il voit sa prochaine réservation en hero card
3. Il tape Cmd+K ou clique le FAB → Mycelium Assist s'ouvre
4. Il voit Sophie (sa concierge Mycelium dédiée) en ligne avec sa photo
5. Il tape "Réserver une Zoe pour vendredi matin Paris-Nation"
6. L'IA répond en 2 secondes avec une proposition
7. Il confirme. C'est fait. Sophie est informée discrètement (notification dans /concierge/)

**Résultat :** 30 secondes, zéro friction, Thomas sent que quelqu'un veille sur lui.

---

### Scénario 2 : Claire (DAF) veut comprendre les coûts du mois

1. Claire arrive au bureau, ouvre son dashboard admin
2. Elle clique sur Mycelium Assist (ou Cmd+K)
3. Elle voit son concierge dédié Thomas M. — hors ligne ce matin
4. Elle tape "Coûts de ce mois vs mois dernier, par catégorie"
5. L'Agent Manager génère un tableau en streaming avec les chiffres
6. Elle voit une anomalie : carburant +40%. Elle demande "Pourquoi ?"
7. L'IA identifie 3 véhicules en cause et propose de les alerter
8. Elle demande à transférer à Thomas pour une analyse plus approfondie → message envoyé, Thomas sera notifié à son arrivée

**Résultat :** La donnée en 10 secondes, l'escalade humaine en 1 clic.

---

### Scénario 3 : Marc (gestionnaire flotte) gère une urgence

1. Marc reçoit une notification : "Alerte CRITIQUE — VW ID.4 AB-123-CD, maintenance overdue"
2. Il clique la notif → ouvre la page du véhicule
3. Il ouvre Mycelium Assist directement sur cette page (le contexte du véhicule est passé au chat)
4. Il demande "Quel garage peut prendre ce véhicule aujourd'hui à Lyon ?"
5. L'IA cherche dans les garages configurés et propose 2 options
6. Marc choisit, planifie la maintenance en 3 clics
7. Le conducteur concerné est notifié automatiquement

**Résultat :** L'urgence est traitée sans quitter le flux de travail.

---

### Scénario 4 : Sophie (concierge Mycelium) commence sa journée

1. Sophie arrive et ouvre `/concierge`
2. Elle voit 2 clients en "critique", 5 en "urgent"
3. Elle met son statut sur "En ligne" → tous les clients qui ont Mycelium Assist ouvert voient immédiatement son statut changer
4. Elle clique sur le client critique → voit sa fiche complète
5. Elle envoie un message proactif depuis la fiche client → il apparaît dans le Mycelium Assist de l'ORG_ADMIN de ce client avec sa photo et son nom
6. Elle planifie ses actions de la journée

**Résultat :** Sophie est visible, présente, identifiée — pas un support anonyme.

---

## 10. Hiérarchie de la valeur — Ce que le client retient

```
Niveau 1 — L'essentiel (tout le monde)
┌─────────────────────────────────────────────────────────┐
│  "Je sais qui s'occupe de moi et je peux le contacter"  │
│  → Photo + nom + disponibilité du concierge             │
└─────────────────────────────────────────────────────────┘

Niveau 2 — La fluidité (utilisateurs quotidiens)
┌─────────────────────────────────────────────────────────┐
│  "J'ai mes raccourcis, le chat répond en 2 secondes"    │
│  → Quick prompts perso + IA toujours disponible         │
└─────────────────────────────────────────────────────────┘

Niveau 3 — La confiance (décideurs)
┌─────────────────────────────────────────────────────────┐
│  "Je sais que si l'IA ne peut pas, un humain prend      │
│  le relais sans que j'aie à me battre"                  │
│  → Escalade transparente, 1 seul canal                  │
└─────────────────────────────────────────────────────────┘

Niveau 4 — La personnalisation (power users)
┌─────────────────────────────────────────────────────────┐
│  "Mycelium s'adapte à mon rôle, mes habitudes,          │
│  mon organisation"                                      │
│  → Perso par rôle + org-level config                    │
└─────────────────────────────────────────────────────────┘
```

---

## 11. Résumé des changements à implémenter

### Phase 1 — Donner un visage au service (2-3 jours)

- [ ] Ajouter `avatarUrl`, `specialty`, `availabilityStatus`, `bio` au schema staff concierge
- [ ] Upload photo dans `/concierge/staff` (Convex Storage, composant Avatar cliquable)
- [ ] ConciergeCard dans AssistPanel : affiche photo + nom + status + spécialité
- [ ] Unifier le bouton "Parler au concierge" (Fleet Care) → ouvre AssistPanel

### Phase 2 — Un seul panneau, clair pour tous (1-2 jours)

- [ ] Renommer les onglets : "Réservation" / "Analyse flotte" / "Conformité" (plus clair que "Concierge / Manager / Compliance")
- [ ] Distinguer visuellement messages IA vs messages humains (avatar différent, tag "Sophie · humain")
- [ ] Adapter le quick prompts affiché selon le rôle de l'utilisateur connecté

### Phase 3 — Personnalisation (1-2 jours)

- [ ] Quick prompts éditables en localStorage
- [ ] Section "Préférences Assistant" dans `/app/settings` et `/admin/settings`
- [ ] Statut disponibilité concierge updatable en 1 clic depuis `/concierge/`

### Phase 4 — Escalade humaine transparente (3-4 jours)

- [ ] Routing "transférer à un concierge" depuis le chat client
- [ ] Notification dans `/concierge/` quand un client demande un humain
- [ ] Fil de conversation partagé : ce que l'IA a dit + la reprise humaine

---

*Document créé le 2026-07-07 — Mycelium Fleet OS*
