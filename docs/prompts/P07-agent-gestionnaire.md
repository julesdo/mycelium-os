---
priority: 7
feature: Agent Gestionnaire DAF — Interface IA conversationnelle pour l'admin
sprint: S6 (V1.5)
version: V1.5 — Premiers payants
effort: 4 jours
depends_on: P01, P02, P04 (données en base), Claude API (P03 a établi le pattern)
blocks: P10 (Optimiseur partage les outils)
model_recommended: claude-sonnet-4-6 (requêtes analytiques complexes)
pricing_tier: Pro (590€/mois) et au-dessus
---

# P07 — Agent Gestionnaire DAF

## 🎯 Mission
Le DAF/RH/gestionnaire interagit en langage naturel avec sa flotte : "Quels véhicules sont sous-utilisés ce mois ?" — "Combien on a dépensé en carburant en Q3 ?" — "Qui a le plus de réservations cette semaine ?". C'est le pendant du Concierge côté admin. C'est ce qui différencie Mycelium d'un tableau de bord classique.

**Expérience cible** : le DAF tape une question en français → l'agent requête les données Convex → répond avec des chiffres réels en moins de 5 secondes.

---

## 📍 État actuel du codebase

**Ce qui existe :**
- Pattern Concierge (P03) : Convex action + Claude API + tool use
- Tables `vehicles`, `reservations`, `costs`, `maintenanceRecords` complètes
- Queries analytics dans `dashboard.ts`

**Ce qui manque :**
- Convex action `sendManagerMessage` avec ses propres outils
- Interface chat dans `/admin` (section dédiée ou modal flottant)
- Outils analytics : utilisation, coûts, réservations, maintenance

---

## 🔒 Contraintes absolues

1. **Guard ORG_ADMIN / ORG_MANAGER** : cet agent n'est accessible qu'aux rôles admin. Un ORG_MEMBER ne doit jamais avoir accès.
2. **Outils read-only** : l'agent Gestionnaire ne CRÉE et ne MODIFIE rien — il ne lit que. Aucune mutation autorisée depuis cet agent.
3. **Données réelles uniquement** : l'agent ne peut retourner que des chiffres issus de vraies queries Convex. Jamais d'estimation ou d'approximation inventée.
4. **Modèle** : `claude-sonnet-4-6` (requêtes analytiques nécessitent plus de raisonnement)
5. **Séparation stricte** : le Concierge (salarié) et le Gestionnaire (admin) ont des system prompts et des outils COMPLÈTEMENT différents. Ne pas mélanger.

---

## 📊 Les 6 outils de l'Agent Gestionnaire

### Outil 1 — `getFleetUtilizationStats`

```typescript
{
  name: 'getFleetUtilizationStats',
  description: 'Retourne les statistiques d\'utilisation de la flotte sur une période. Utiliser pour répondre aux questions sur les véhicules sous-utilisés, le taux d\'utilisation, les véhicules les plus utilisés.',
  input_schema: {
    type: 'object',
    properties: {
      period: {
        type: 'string',
        enum: ['this_week', 'this_month', 'last_month', 'this_quarter', 'this_year', 'last_90_days'],
        description: 'La période d\'analyse'
      },
      sortBy: {
        type: 'string',
        enum: ['most_used', 'least_used'],
        description: 'Ordre de tri des résultats'
      }
    },
    required: ['period']
  }
}
```

Implémentation Convex :
```typescript
// Calculer le taux d'utilisation = jours-réservations / (nombre véhicules × jours de la période)
// Retourner par véhicule : label, registration, reservationCount, totalDays, utilizationRate%
```

### Outil 2 — `getCostBreakdown`

```typescript
{
  name: 'getCostBreakdown',
  description: 'Analyse les coûts de la flotte par catégorie et/ou par véhicule. Utiliser pour les questions budget, dépenses, ROI.',
  input_schema: {
    type: 'object',
    properties: {
      period: { type: 'string', enum: ['this_month', 'last_month', 'this_quarter', 'this_year'] },
      groupBy: { type: 'string', enum: ['category', 'vehicle', 'both'] }
    },
    required: ['period', 'groupBy']
  }
}
```

### Outil 3 — `getReservationActivity`

```typescript
{
  name: 'getReservationActivity',
  description: 'Statistiques des réservations : qui réserve le plus, quels véhicules, quelles périodes de pointe.',
  input_schema: {
    type: 'object',
    properties: {
      period: { type: 'string', enum: ['this_week', 'this_month', 'last_month', 'this_quarter'] },
      groupBy: { type: 'string', enum: ['user', 'vehicle', 'day_of_week', 'status'] }
    },
    required: ['period', 'groupBy']
  }
}
```

### Outil 4 — `getMaintenanceOverview`

```typescript
{
  name: 'getMaintenanceOverview',
  description: 'Vue d\'ensemble des entretiens planifiés, en cours et historique des coûts maintenance.',
  input_schema: {
    type: 'object',
    properties: {
      includeUpcoming: { type: 'boolean', description: 'Inclure les entretiens à venir (30 prochains jours)' },
      includeOverdue: { type: 'boolean', description: 'Inclure les entretiens en retard' }
    }
  }
}
```

### Outil 5 — `getComplianceStatus`

```typescript
{
  name: 'getComplianceStatus',
  description: 'Statut de conformité : permis expirés, contrôles techniques, vignettes, assurances expirant bientôt.',
  input_schema: {
    type: 'object',
    properties: {
      daysAhead: {
        type: 'number',
        description: 'Nombre de jours à anticiper pour les alertes (défaut: 30)',
        default: 30
      }
    }
  }
}
```

### Outil 6 — `getFleetSummary`

```typescript
{
  name: 'getFleetSummary',
  description: 'Résumé rapide de l\'état actuel de la flotte. Utiliser pour les questions générales "comment va ma flotte ?"',
  input_schema: {
    type: 'object',
    properties: {}
  }
}
```

---

## 📁 Fichiers à créer / modifier

```
src/lib/convex/manager-agent.ts            → nouvelle action + outils analytics
src/routes/[[lang]]/admin/+layout.svelte   → ajouter bouton d'accès agent (floating button ou nav)
src/lib/components/manager-agent/
  manager-chat.svelte                      → interface chat admin
  manager-message.svelte
  analytics-result.svelte                  → affichage enrichi des données (tables, chiffres)
```

---

## 🔨 System prompt Agent Gestionnaire

```typescript
function buildManagerSystemPrompt(context: {
  orgName: string;
  fleetSize: number;
  currentDate: string;
}): string {
  return `Tu es l'Assistant Gestionnaire de ${context.orgName}, un analyste IA spécialisé dans la gestion de flotte d'entreprise.

## Ton rôle
Tu aides le gestionnaire de flotte à analyser les données, identifier les inefficacités et prendre des décisions éclairées.

## Contexte
- Entreprise : ${context.orgName}
- Taille de la flotte : ${context.fleetSize} véhicules
- Date : ${context.currentDate}

## Règles ABSOLUES
1. Tu ne crées, modifies ou supprimes RIEN. Tu es en lecture seule.
2. Tout chiffre que tu cites DOIT venir d'un tool call. Jamais d'estimation inventée.
3. Si la question est hors périmètre flotte, réponds : "Cette question dépasse mon périmètre d'analyse flotte. Je peux vous aider sur l'utilisation, les coûts, les réservations et la conformité."

## Ton style de réponse
- Commence par les chiffres clés, pas par une introduction
- Utilise des listes à puces pour les données comparatives
- Ajoute une recommandation actionnable quand c'est pertinent
- Sois précis : "73,4%" pas "environ 70%"
- Toujours en français

## Exemples de réponses attendues
Question : "Quels véhicules sont sous-utilisés ?"
Réponse : "Sur les 30 derniers jours, 3 véhicules ont un taux d'utilisation inférieur à 20% :
• Peugeot 308 (ZZ-456-AB) : 8% — 2 réservations, 3 jours utilisés
• Citroën Berlingo (AA-789-CD) : 12% — 3 réservations, 4 jours utilisés
• Renault Kangoo (BB-012-EF) : 18% — 4 réservations, 5 jours utilisés
Recommandation : envisager la mise en retrait temporaire du Peugeot 308 si la tendance se confirme sur 90 jours."`;
}
```

---

## 🔨 Accès à l'agent depuis l'interface admin

Option recommandée pour le MVP : bouton flottant en bas à droite du layout admin.

```svelte
<!-- Dans /admin/+layout.svelte -->
<button
  class="fixed bottom-6 right-6 w-14 h-14 bg-[--brand] rounded-full shadow-lg flex items-center justify-center"
  onclick={() => managerChatOpen = true}
  title="Assistant gestionnaire"
>
  🤖
</button>

{#if managerChatOpen}
  <ManagerChat onclose={() => managerChatOpen = false} />
{/if}
```

---

## ✅ Critères d'acceptation

- [ ] Accessible uniquement aux ORG_ADMIN et ORG_MANAGER (guard strict)
- [ ] Questions analytiques répondues avec des données réelles
- [ ] L'agent ne peut pas créer/modifier de données (read-only strict)
- [ ] Réponse en moins de 8 secondes (Sonnet peut être plus lent)
- [ ] Questions hors scope poliment refusées
- [ ] Conversation persistée (même session)
- [ ] Format des réponses lisible : listes, chiffres mis en évidence

---

## 🚫 NE PAS FAIRE

- Ne pas donner accès à cet agent aux ORG_MEMBER — fuite de données sensibles
- Ne pas utiliser Claude Haiku pour cet agent (raisonnement analytique insuffisant)
- Ne pas mélanger les outils du Concierge (createReservation, etc.) avec cet agent
- Ne pas retourner les données brutes JSON — toujours les formater avant de répondre
- Ne pas citer des chiffres sans avoir appelé un outil Convex
- Ne pas indexer les conversations de cet agent dans la même table que le Concierge (utiliser une table `managerConversations` ou un champ discriminant)

---

## 💡 Questions de démo pour tester l'agent

```
"Quels sont les véhicules sous-utilisés ce mois ?"
"Combien on a dépensé en carburant en Q2 ?"
"Qui a le plus de réservations cette semaine ?"
"Montre-moi les entretiens à planifier dans les 30 prochains jours"
"Quel est le taux d'utilisation global de ma flotte ?"
"Y a-t-il des véhicules en retard de contrôle technique ?"
```
