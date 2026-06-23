# Mycelium Fleet OS — Prompts d'implémentation

Dossier de référence pour guider les sessions d'implémentation avec Claude.
Chaque prompt est autonome, numéroté par priorité MVP, et conçu pour minimiser les hallucinations.

## Comment utiliser ces prompts

1. Ouvre le prompt correspondant à la feature à implémenter
2. Copie le contenu **en entier** comme premier message de la session
3. Le prompt contient tout le contexte nécessaire — pas besoin de ré-expliquer le projet
4. Lis la section `🚫 NE PAS FAIRE` avant de valider chaque réponse

---

## 🎯 Axe stratégique prioritaire — Distribution DNVB via intégrations comptables

> **Nouvelle priorité (juin 2026).** Mycelium est une DNVB B2B : **le produit est le canal de distribution**. Les intégrations comptables ne sont pas une feature, c'est un **canal d'acquisition** — on se place là où le DAF passe déjà 2h/semaine. Doctrine complète, carte des canaux, plan 90 jours et template mail partnerships : **[/docs/specs/distribution-integrations-strategy.md](../specs/distribution-integrations-strategy.md)**.
>
> | # | Prompt | Rôle | Priorité |
> |---|--------|------|----------|
> | **P23** | Intégration **Pennylane** + couche d'abstraction `AccountingConnector` | Connecteur de référence, canal #1 (~250k PME) | **🔥 Top — démarrer en premier** |
> | **P24** | Connecteurs **Sage / EBP / Odoo** + API publique & Webhooks | Multiplie les canaux (réutilise P23) | Haute |
>
> Ces prompts **passent devant** le reste du backlog V1.5/V2 hors features déjà livrées.

## Table des priorités

### V1 — MVP Pool Sharing Light ✅ LIVRÉ

| # | Prompt | Sprint | Version | Effort | Statut |
|---|--------|--------|---------|--------|--------|
| P01 | Gestion flotte (CRUD + CSV import) | S2 | V1 | 3j | ✅ Fait |
| P02 | Réservations (logique + conflits) | S3 | V1 | 3j | ✅ Fait |
| P03 | Agent Concierge IA | S4 | V1 | 4j | ✅ Fait |
| P04 | Dashboard admin (KPIs réels) | S3 | V1 | 2j | ✅ Fait |
| P05 | Calendrier flotte resource view | S5 | V1 | 3j | ✅ Fait |
| P06 | Notifications in-app + emails | S6 | V1 | 2j | ✅ Fait |

### V1.5 — Premiers payants

| # | Prompt | Sprint | Version | Effort | Bloque |
|---|--------|--------|---------|--------|--------|
| P07 | Agent Gestionnaire DAF | S6 | V1.5 | 4j | ✅ Fait |
| P09 | Maintenance & alertes conformité | S7 | V1.5 | 3j | ✅ Fait |
| P11 | Gestion conducteurs & conformité permis | S9 | V1.5 | 3j | P12, P20 |
| P12 | États des lieux & contraventions | S9 | V1.5 | 3j | P16 |
| P13 | Copilote IA flottant (FAB + panneau) | S10 | V1.5 | 2j | — |
| P14 | Google Calendar & Outlook sync | S10 | V1 | 3j | — |
| P15 | Notes de frais IK | S11 | V1 | 3j | — |
| **P23** | **🔥 Intégration Pennylane + couche compta (canal DNVB #1)** | **S12** | **V1.5** | **5j** | **P24** |
| P21 | Admin settings : membres & invitations | S11 | V1.5 | 2j | — |

### V2 — Indispensable au DAF

| # | Prompt | Sprint | Version | Effort | Bloque |
|---|--------|--------|---------|--------|--------|
| P08 | Tracking financier + dashboard coûts | S7 | V2 | 4j | ✅ Fait |
| P10 | Agent Optimiseur flotte (background) | S8 | V2 | 4j | ✅ Fait |
| P16 | Gestion des sinistres | S12 | V2 | 3j | P18 |
| P17 | Finance avancée : import carburant | S12 | V2 | 4j | P18, P19 |
| P18 | Optimisation fiscale (TVS, AEN, TVA) | S13 | V2 | 4j | — |
| P19 | Rapport carbone & CSRD basique | S13 | V2 | 3j | — |
| P20 | Agent Compliance Officer (Agent 4) | S14 | V2 | 3j | — |
| P22 | Smartcar API — Données véhicules OEM | S14 | V2 | 3j | — |
| **P24** | **Connecteurs Sage/EBP/Odoo + API publique (canaux DNVB)** | **S13** | **V2** | **6j** | — |

---

## Cheat sheet stack — À mémoriser dans chaque session

### Stack technique exacte
- **Frontend** : SvelteKit 2.x + Svelte 5 (runes obligatoires)
- **Backend** : Convex (réactif, pas de REST)
- **Auth** : Better Auth via composant Convex (`authComponent`)
- **UI** : Tailwind CSS v4 + composants dans `src/lib/components/ui/`
- **Package manager** : `bun` (jamais `npm`)
- **IA** : Claude API (Anthropic) via Convex actions

### Svelte 5 — Runes uniquement (JAMAIS l'ancienne syntaxe)
```svelte
<!-- CORRECT -->
let count = $state(0);
let doubled = $derived(count * 2);
$effect(() => { console.log(count); });

<!-- INTERDIT — ancienne syntaxe -->
let count = 0;
$: doubled = count * 2;
```

### Pattern Convex universel
```typescript
// Toutes les fonctions authed utilisent ces helpers
import { authedQuery, authedMutation } from './functions';
import { getUserOrg, requireOrgAdmin } from './lib/auth';

export const maQuery = authedQuery({
  args: { ... },
  handler: async (ctx, args) => {
    const { organizationId } = await getUserOrg(ctx); // toujours en premier
    // ctx.user._id = Better Auth string ID
  }
});
```

### Multi-tenancy — RÈGLE ABSOLUE
**Chaque query/mutation doit commencer par `getUserOrg(ctx)`** pour isoler les données par organisation.
Ne jamais retourner de données sans filtrer par `organizationId`.

### Imports SvelteKit ← Convex
```typescript
// Dans les fichiers .svelte ou +page.ts
import { useQuery, useMutation } from 'convex-svelte';
import { api } from '$lib/convex/_generated/api';

// Usage dans le composant
const vehicles = useQuery(api.vehicles.listVehicles, {});
const createVehicle = useMutation(api.vehicles.createVehicle);
```

### Guard ORG_ADMIN (pattern UI)
```svelte
<script lang="ts">
  import { useQuery } from 'convex-svelte';
  import { api } from '$lib/convex/_generated/api';
  import { goto } from '$app/navigation';

  const membership = useQuery(api.organizations.getMyOrgMembership, {});
  
  $effect(() => {
    if (membership.data && membership.data.role !== 'ORG_ADMIN') {
      goto('/app');
    }
  });
</script>
```

---

## Schéma Convex — Tables clés (extrait)

```typescript
// organizations — table principale entreprise
{ name, siren?, sector?, size?, plan: 'flat'|'per_seat', createdAt }

// organizationMembers — liaison user ↔ org
{ organizationId, userId (string BA), role: 'ORG_ADMIN'|'ORG_MANAGER'|'ORG_MEMBER', joinedAt }

// userProfiles — currentOrganizationId du user
{ userId (string BA), currentOrganizationId? }

// vehicles — flotte
{ organizationId, registration, brand, model, year,
  energy: 'THERMAL'|'HYBRID'|'ELECTRIC',
  category: 'PASSENGER'|'UTILITY'|'TRUCK',
  status: 'AVAILABLE'|'IN_USE'|'MAINTENANCE'|'RETIRED',
  kilometers?, purchaseDate?, leaseEndDate?, location?, notes?, createdAt }

// reservations — réservations pool
{ organizationId, vehicleId, userId (string BA),
  startDate (timestamp), endDate (timestamp), purpose,
  status: 'PENDING'|'CONFIRMED'|'IN_PROGRESS'|'COMPLETED'|'CANCELLED',
  notes?, createdAt, updatedAt }

// notifications — in-app temps réel
{ organizationId, userId, type (enum), title, message, link?, isRead, createdAt }

// conversations — historique chat Concierge
{ organizationId, userId, messages: [{role, content, timestamp, toolCalls?}], createdAt, updatedAt }

// costs — coûts flotte
{ organizationId, vehicleId?, category (enum 9 types), amount, vatAmount?, date, description,
  source: 'MANUAL'|'IMPORT'|'API', createdBy, createdAt }
```

---

## Structure des routes

```
/app                          → Accueil salarié (chat Concierge)
/app/reservations             → Mes réservations
/app/reservations/new         → Nouvelle réservation (formulaire)
/app/reservations/[id]        → Détail réservation

/admin/dashboard              → Dashboard flotte (DAF)
/admin/fleet                  → Liste véhicules
/admin/fleet/new              → Ajouter véhicule
/admin/fleet/[vehicleId]      → Détail véhicule
/admin/reservations           → Toutes les réservations + calendrier
/admin/reservations/[id]      → Détail réservation admin
/admin/finance                → Dashboard financier
/admin/finance/costs          → Liste et saisie des coûts
/admin/maintenance            → Gestion entretiens
/admin/maintenance/[id]       → Détail entretien
/admin/settings/organization  → Paramètres org (FAIT)
/admin/settings/members       → Gestion membres
/admin/settings/notifications → Préférences notifs

/onboarding/organization      → Créer son organisation
```
