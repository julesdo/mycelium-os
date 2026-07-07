# Réorganisation UX — Admin Client & Espace Concierge

> **Contexte :** L'espace `/admin` a été construit pour un produit de gestion de flotte classique. Depuis le pivot Fleet OS + conciergerie, deux usages radicalement différents cohabitent mal. L'espace `/concierge` est sous-développé (3 pages) pour ce qui devrait être notre cockpit opérationnel interne. Ce document propose une réorganisation qui sert les deux parties — clients ET équipes Mycelium.

---

## 1. Diagnostic — Ce qui ne va pas

### Côté Client (`/admin`) — 30 routes, sidebar surchargée

**Problèmes identifiés :**

1. **Trop d'entrées en sidebar** — 10 sections de premier niveau. Un DAF qui ouvre Mycelium pour la première fois est perdu. La règle UX : max 6–7 entrées principales.

2. **`/admin/support`** est dans l'espace client alors qu'il sert les super_admins. Un client ORG_ADMIN ne devrait jamais ouvrir un "ticket support" depuis un menu admin — ça passe par le Concierge IA (Copilot).

3. **Finance atomisée** en 5 sous-pages séparées (Finance · Fiscal · BIK · Costs · Fuel Import · Expenses · Sustainability) — toutes accessibles via la sidebar. En réalité, ce sont des onglets d'un seul espace Finance.

4. **Conformité dispersée** — Violations, Incidents, Compliance sont trois entrées distinctes qui partagent le même objectif : "est-ce que ma flotte est en règle ?"

5. **`/admin/fleet/[vehicleId]`** contient des données télémétrie SmartCar et des alertes qui intéressent plus le concierge que le client. Le client veut savoir si le véhicule est disponible, pas suivre le SoC en temps réel.

6. **Pas de séparation claire entre "piloter ma flotte" et "gérer mon organisation"** — settings (org, membres, intégrations) se retrouve dans la même sidebar que la gestion quotidienne.

---

### Côté Concierge (`/concierge`) — 3 pages, un outil embryonnaire

**Problèmes identifiés :**

1. **Aucun vrai hub de communication** — les messages Human Assist sont dans la fiche org, mélangés avec les KPIs. Pour suivre 20 clients en parallèle, c'est ingérable.

2. **Pas de vue "Fleet Observer"** — quand un client appelle pour signaler un problème sur une réservation, le concierge ne peut pas voir ce que le client voit. Il doit demander des screenshots.

3. **Pas de file de tickets unifiée** — Human Assist Requests, tickets support (`/admin/support`), et tâches concierge (`concierge_tasks`) sont trois endroits distincts.

4. **Pas de chronologie client** — pour comprendre l'historique d'un client (incidents, paiements, escalades, conversations), il faut naviguer entre la fiche org et d'autres outils.

5. **Pas de SLA/priorité** — aucune indication de délai de réponse attendu, pas de statut "en attente depuis X heures".

6. **L'escalade commercial est absente** — quand un concierge identifie un signal upsell, il n'a pas de chemin direct vers le commercial responsable (que nous avons maintenant avec le rôle `sales`).

---

## 2. Principes de Réorganisation

### Principe 1 — Séparer "piloter" de "gérer"
Le client dans `/admin` fait deux choses très différentes :
- **Opérations quotidiennes** : réserver, consulter, valider (fréquent, rapide)
- **Administration** : paramétrer, inviter, configurer intégrations (rare, ponctuel)

Ces deux modes méritent une hiérarchie visuelle distincte, pas le même niveau dans la sidebar.

### Principe 2 — Le concierge doit "voir" ce que le client voit
La feature la plus impactante pour la productivité concierge est le **Fleet Observer** : accès read-only à l'espace admin de n'importe quel client. Quand un client appelle, le concierge ouvre son admin en 2 clics et répond sans avoir à demander de screenshots.

### Principe 3 — Une seule inbox pour toutes les communications client
Toutes les demandes entrantes (Human Assist, tickets support, escalades automatiques) convergent dans une **Inbox unifiée** côté concierge, avec SLA, priorité et assignation.

### Principe 4 — Ne pas casser ce qui fonctionne pour le client
L'admin client ne change pas de fond. On simplifie la navigation (regroupement en onglets, déplacement de `/admin/support`), mais toutes les features restent accessibles. Pas de régression.

---

## 3. Nouvelle Architecture `/admin` (Client)

### 3.1 Sidebar Simplifiée — 6 sections vs 10

**AVANT :**
```
Dashboard
── Flotte
── Réservations
── Maintenance
── Conducteurs
── Finance
── Fiscal
── BIK
── Frais
── Durabilité
── Infractions
── Sinistres
── Conformité
── Support ← (ne devrait pas être là)
── Settings
```

**APRÈS :**
```
📊 Dashboard
🚗 Flotte          → onglets : Véhicules · Réservations · Maintenance · Conducteurs
💶 Finance         → onglets : Vue d'ensemble · Coûts détaillés · Frais IK · Import carburant
🛡️ Conformité      → onglets : Infractions · Sinistres · Compliance · BiK UK · Durabilité/CSRD
🔗 Intégrations    → onglets : Connecteurs (Xero/QB/Odoo) · API · Calendriers · SmartCar
⚙️ Paramètres      → onglets : Organisation · Équipe · Notifications
```

**Ce qui disparaît de la sidebar** (reste accessible en onglet) :
- Fiscal → tab dans Finance
- BIK → tab dans Conformité
- Fuel Import → action dans Finance > Coûts
- Sustainability/ESRS E1 → tab dans Conformité
- Support → supprimé, accès via le Copilot IA uniquement

### 3.2 Dashboard — Enrichissement léger
Ajouter une entrée "Besoin d'aide ?" avec le statut du concierge assigné (online/busy/offline) et un bouton qui ouvre directement le Copilot en mode Human Assist.

### 3.3 Fiche Véhicule — Simplification
Déplacer les données télémétrie avancées (SoC en temps réel, logs GPS, historique Smartcar) dans un onglet "Télémétrie" replié par défaut. La vue principale montre : statut · prochaine réservation · prochaine maintenance · assurance.

### 3.4 `/admin/support` — Suppression
Les clients contactent le support via le Copilot IA → escalade Human Assist → concierge. Il n'y a pas de raison d'avoir une page "support" dans l'espace admin client. À terme, `/admin/support` est déprecié et redirige vers le Copilot.

---

## 4. Nouvelle Architecture `/concierge` — Hub Zendesk

### 4.1 Navigation Concierge — De 3 à 6 sections

```
📥 Inbox           → Toutes les communications entrantes (Human Assist + tickets + escalades)
🏢 Clients         → Grille santé + liste (vue actuelle enrichie)
👁 Fleet Observer  → Vue read-only de l'admin d'un client spécifique
✅ File de tâches   → concierge_tasks agrégées (vue actuelle)
📊 Reporting       → Métriques équipe (SLA, volume, temps de réponse)
👥 Équipe          → (super_admin uniquement) gestion staff
```

---

### 4.2 Inbox Unifiée — Le cœur du nouveau concierge

Inspiré de Zendesk/Intercom, mais dans la DA Mycelium.

**Sources d'entrée dans l'inbox :**
| Source | Priorité auto | Description |
|--------|--------------|-------------|
| Human Assist (Copilot client) | Haute | Client demande un humain depuis le chat |
| Ticket support | Moyenne | Remonte depuis `/admin/support` (en cours de depreciation) |
| Alerte critique (concierge_task CRITICAL) | Haute | Tâche urgente générée automatiquement |
| Signal upsell | Basse | Détecté par l'agent, transmis au commercial |
| Message commercial (`salesConciergeThreads`) | Normale | Commercial pose une question sur un client |

**Vue Inbox :**
```
┌─ Inbox ─────────────────────────────────────────────┐
│  [Toutes (12)] [Non assignées (4)] [Les miennes (8)] │
│  ─────────────────────────────────────────────────── │
│  🔴 URGENT · Delipap SAS · Human Assist             │
│  Marie Bernard : "Mon chauffeur est bloqué..."       │
│  Il y a 8 min · Non assigné                 [Prendre]│
│  ─────────────────────────────────────────────────── │
│  🟡 Bouygues Immo · Tâche automatique                │
│  Véhicule AA-342-BB maintenance critique dépassée    │
│  Il y a 22 min · Assigné à Sophie          [Voir]    │
│  ─────────────────────────────────────────────────── │
│  🟢 TotalEnergies · Message commercial               │
│  Thomas (Sales) : "Besoin d'un brief avant..."       │
│  Il y a 1h · Sophie                        [Voir]    │
└─────────────────────────────────────────────────────┘
```

**Vue d'un ticket/thread :**
Panneau 3 colonnes (desktop) / scroll vertical (mobile) :
- **Colonne gauche** : fil de conversation chronologique
- **Colonne centre** : zone de réponse (rich text, pièces jointes, templates de réponse)
- **Colonne droite** : Contexte client (org, plan, concierge assigné, dernières alertes, lien Fleet Observer)

**Statuts d'un ticket :**
```
NOUVEAU → EN COURS → EN ATTENTE CLIENT → RÉSOLU → FERMÉ
```

**SLA par priorité :**
| Priorité | Première réponse | Résolution |
|----------|-----------------|-----------|
| 🔴 Urgente | 15 min | 2h |
| 🟡 Haute | 1h | 8h |
| 🟢 Normale | 4h | 24h |
| ⚪ Basse | 24h | 72h |

Compteur SLA visible sur chaque ticket (vert/orange/rouge selon avancement).

---

### 4.3 Fleet Observer — La feature différenciante

**Concept :** Quand un concierge est dans la fiche d'un client, un bouton "Voir leur admin" ouvre une **vue read-only identique à `/admin`** du client, dans un panneau latéral ou un onglet.

**Pourquoi c'est critique :**
Un client appelle pour dire "ma réservation du 15 janvier n'apparaît plus". Aujourd'hui, le concierge est aveugle — il doit demander des screenshots. Avec Fleet Observer, il ouvre en 2 clics la liste des réservations du client, voit exactement ce que le client voit, et résout en direct.

**Ce que le concierge peut faire en Fleet Observer :**
- ✅ Voir toutes les pages admin du client (read-only)
- ✅ Voir les données en temps réel (SmartCar, positions, alertes)
- ❌ Ne peut pas modifier (sauf actions explicitement autorisées : créer une tâche, programmer une maintenance)
- ❌ Ne peut pas accéder aux données financières sensibles sans flag `finance_access` (respect RGPD)

**Implementation :** Le Fleet Observer utilise les queries admin existantes mais avec un `organizationId` injecté par le contexte concierge. Toutes les mutations sont désactivées (le composant reçoit un prop `readonly={true}`).

---

### 4.4 Client 360 — Fiche Client Enrichie

La page `/concierge/[organizationId]` devient un hub à 5 onglets :

**① Vue d'ensemble**
- Score de santé (calculé)
- KPIs flotte (disponibilité, utilisation, km ce mois)
- Dernières 5 alertes
- Plan actuel + renouvellement
- Concierge(s) assigné(s) + commercial responsable
- Bouton "Ouvrir Fleet Observer"

**② Inbox client**
- Tous les tickets/threads liés à cette org
- Historique complet depuis l'onboarding
- Possibilité de créer un ticket proactif ("J'ai remarqué X, je vous contacte")

**③ Fleet Observer**
- Vue directement intégrée dans l'onglet (iframe-like mais Svelte component)
- Navigation : Dashboard · Flotte · Réservations · Maintenance

**④ Timeline**
- Chronologie de tous les événements liés au client
- Conversions, incidents, maintenances, changements de plan, alertes, messages
- Permet de comprendre l'histoire du client en 30 secondes

**⑤ Signaux**
- Opportunités upsell identifiées (utilisation, features demandées)
- Risques de churn (faible utilisation, tickets non résolus, plan presque expiré)
- Lien direct "Alerter le commercial" → crée un signal dans `/sales`

---

### 4.5 File de Tâches — Enrichissement

La vue actuelle (`concierge_tasks` agrégées) est bonne mais manque de :
- **Groupement par urgence** (CRITICAL en rouge en haut, avec SLA)
- **Vue par concierge** (qui fait quoi)
- **Vue par client** (toutes les tâches d'un seul client)
- **Création manuelle** d'une tâche depuis la fiche client
- **Historique DONE** avec temps de résolution moyen

---

### 4.6 Reporting Concierge (nouveau)

Page `/concierge/reporting` — accessible super_admin uniquement :

| Métrique | Description |
|----------|-------------|
| Volume de tickets | Par semaine/mois, par concierge, par type |
| Temps de première réponse | Moyen, par priorité, vs SLA |
| Taux de résolution dans les délais | % tickets résolus dans SLA |
| Satisfaction client | Post-ticket (optionnel, 1 emoji : 😊😐😞) |
| Top clients par volume | Ceux qui génèrent le plus de tickets |
| Taux d'escalade | % conversations IA → Human Assist |

---

## 5. Ce Qui NE Bouge PAS

Pour éviter toute régression et ne pas perturber les clients existants :

| Page | Raison de rester dans /admin |
|------|------------------------------|
| `/admin/fleet` et sous-pages | Usage quotidien client |
| `/admin/reservations` | Usage quotidien client |
| `/admin/maintenance` | Gestionnaire flotte = client |
| `/admin/drivers` | RH = client |
| `/admin/finance/*` | DAF = client |
| `/admin/violations`, `/admin/incidents` | Gestionnaire = client |
| `/admin/compliance` | DAF/RH = client |
| `/admin/settings/*` | ORG_ADMIN = client |

---

## 6. Ce Qui Migre ou Est Créé

| Quoi | De | Vers | Priorité |
|------|----|----|----------|
| `/admin/support` | admin sidebar | deprecié (→ Copilot) | Sprint A |
| Hub de communication (Inbox) | inexistant | `/concierge/inbox` | Sprint A |
| Fleet Observer | inexistant | `/concierge/[orgId]` onglet Fleet | Sprint B |
| Timeline client | inexistant | `/concierge/[orgId]` onglet Timeline | Sprint B |
| Signaux upsell/churn | inexistant | `/concierge/[orgId]` onglet Signaux | Sprint B |
| Reporting concierge | inexistant | `/concierge/reporting` | Sprint C |
| Sidebar admin simplifiée (onglets) | 10 sections | 6 sections | Sprint A |

---

## 7. Parcours Utilisateurs Repensés

### Parcours 1 — Client signale un problème (AVANT)
```
Client clique "Support" dans la sidebar admin
→ Remplit un formulaire de ticket
→ Ticket tombe dans /admin/support (vu par super_admin Mycelium)
→ Concierge cherche manuellement dans /admin/support
→ Répond par email
→ Aucun suivi visible pour le client
```
**Durée estimée : 10–15 min côté concierge**

### Parcours 1 — Client signale un problème (APRÈS)
```
Client ouvre le Copilot IA → clique "Parler à un humain"
→ Ticket créé automatiquement dans /concierge/inbox (priorité auto)
→ Concierge voit la notification en temps réel, prend le ticket
→ Ouvre Fleet Observer pour voir exactement ce que le client voit
→ Répond dans le thread (visible pour le client dans son Copilot)
→ Résout, ferme, satisfaction emoji envoyée
```
**Durée estimée : 3–5 min côté concierge**

---

### Parcours 2 — Concierge détecte une opportunité upsell (AVANT)
```
Concierge voit dans la grille santé que Delipap a beaucoup de tâches
→ Navigue vers la fiche Delipap
→ Essaie de comprendre l'usage sans voir l'admin client
→ Envoie un email au commercial (hors outil)
→ Commercial ne sait pas de quoi il s'agit
```
**Résultat : signal perdu, opportunité manquée**

### Parcours 2 — Concierge détecte une opportunité upsell (APRÈS)
```
Concierge voit dans l'onglet Signaux de la fiche Delipap :
"Utilisation 48/50 sièges + 3 demandes de features Pro ce mois"
→ Clique "Alerter le commercial responsable"
→ Signal créé dans /sales pour Thomas (commercial)
→ Thomas reçoit une notification push
→ Thomas utilise l'Agent IA pour préparer son appel
→ Upsell réalisé en 48h
```
**Résultat : pipeline commercial alimenté automatiquement**

---

### Parcours 3 — Nouveau concierge (AVANT)
```
Prend ses fonctions, accède à /concierge
Voit une grille de 40 organisations avec des scores de santé
Ne sait pas quoi faire en premier
Clique sur une org au hasard
Voit des KPIs mais ne peut pas voir les problèmes concrets
```

### Parcours 3 — Nouveau concierge (APRÈS)
```
Prend ses fonctions, accède à /concierge
Inbox affiche 3 tickets non assignés → prend celui marqué URGENT
Voit le contexte : client, historique, Fleet Observer
Résout en 8 min
L'IA lui suggère de vérifier l'onglet Timeline pour comprendre l'historique
```

---

## 8. Roadmap d'Implémentation

### Sprint A — Quick wins admin + Inbox (4–5 jours)
- [ ] Sidebar admin : restructuration en 6 sections avec onglets
- [ ] Suppression `/admin/support` de la sidebar (garder la route, rediriger vers Copilot)
- [ ] Table `conciergeTickets` + API (unifie Human Assist + support tickets)
- [ ] Page `/concierge/inbox` avec filtres (toutes / non assignées / les miennes)
- [ ] Vue thread ticket (3 colonnes desktop, scroll mobile)
- [ ] Statuts SLA + compteur temps

### Sprint B — Client 360 + Fleet Observer (4–5 jours)
- [ ] Refonte `/concierge/[orgId]` en 5 onglets
- [ ] Fleet Observer — composant read-only des pages admin
- [ ] Timeline client — événements chronologiques
- [ ] Onglet Signaux (upsell + churn) + lien "Alerter le commercial"
- [ ] Intégration `salesConciergeThreads` dans l'onglet Inbox client

### Sprint C — File de tâches enrichie + Reporting (3 jours)
- [ ] Groupement tâches par urgence + vue par concierge
- [ ] Création manuelle de tâches depuis Client 360
- [ ] Page `/concierge/reporting` (super_admin)
- [ ] Satisfaction post-ticket (emoji simple)

---

## 9. Décision Finale — Matrice de Priorité

| Feature | Impact client | Impact concierge | Complexité | Priorité |
|---------|-------------|-----------------|-----------|----------|
| Inbox unifiée | ⭐⭐⭐ | ⭐⭐⭐ | Moyenne | 🔴 Sprint A |
| Sidebar admin simplifiée | ⭐⭐⭐ | - | Faible | 🔴 Sprint A |
| Fleet Observer | ⭐⭐ | ⭐⭐⭐ | Haute | 🟡 Sprint B |
| Timeline client | ⭐ | ⭐⭐⭐ | Moyenne | 🟡 Sprint B |
| Onglet Signaux | ⭐⭐ | ⭐⭐⭐ | Faible | 🟡 Sprint B |
| Reporting concierge | - | ⭐⭐ | Faible | 🟢 Sprint C |
| Satisfaction post-ticket | ⭐⭐ | ⭐⭐ | Très faible | 🟢 Sprint C |

---

## 10. Principe Directeur Final

> **L'admin client doit devenir plus simple.** Pas moins puissant — mais la puissance est dans les onglets, pas dans la sidebar. Un client qui ouvre Mycelium doit avoir 5 choix évidents, pas 12.

> **L'espace concierge doit devenir notre Zendesk interne.** La différence avec Zendesk : le concierge voit en temps réel ce que le client voit (Fleet Observer), et chaque ticket est enrichi automatiquement du contexte flotte. C'est notre avantage compétitif — la réponse concierge est 10x plus rapide parce qu'elle est contextuelle dès l'ouverture.

> **La boucle commerciale ferme.** Signal client → inbox concierge → onglet signaux → alerte commercial → `/sales`. Ce flux n'existait pas. Il doit devenir automatique.
