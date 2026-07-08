# Mycelium Fleet OS — Prompts d'implémentation

Dossier de référence pour guider les sessions d'implémentation avec Claude.
Chaque prompt est autonome, numéroté par priorité MVP, et conçu pour minimiser les hallucinations.

## Comment utiliser ces prompts

1. Ouvre le prompt correspondant à la feature à implémenter
2. Copie le contenu **en entier** comme premier message de la session
3. Le prompt contient tout le contexte nécessaire — pas besoin de ré-expliquer le projet
4. Lis la section `🚫 NE PAS FAIRE` avant de valider chaque réponse

---

## 🎯 Axe stratégique prioritaire — Service de conciergerie Mycelium Fleet Care

> **Nouvelle priorité (juillet 2026).** Mycelium devient un service de conciergerie automobile pour PME : le logiciel automatise, un concierge humain agit. Roadmap complète (6 chapitres du cycle de vie véhicule, dashboard concierge multi-org, nouveaux agents IA, modèle économique) : **[/docs/ROADMAP-CONCIERGE.md](../ROADMAP-CONCIERGE.md)**.
>
> | #       | Prompt                                                             | Rôle                                                                           | Priorité   |
> | ------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------ | ---------- |
> | **P26** | Table `concierge_tasks` + moteur de priorisation                   | Fondation de toute la conciergerie — démarrer en premier                       | **🔥 Top** |
> | **P27** | Dashboard Concierge multi-organisation (`/concierge`)              | Poste de travail quotidien du concierge humain                                 | **🔥 Top** |
> | **P28** | Compliance Officer — séquence J-60/J-30/J-7 + brouillons de rappel | Étend l'agent existant (P20), anticipe les échéances                           | Haute      |
> | **P29** | Portail client Fleet Care (`/app/fleet-care`)                      | Preuve de valeur perçue côté client — "votre flotte est entre de bonnes mains" | Haute      |
> | **P30** | Agent Concierge Dashboard — briefing matinal                       | Clôture le Chapitre 3 (vie quotidienne) du service                             | Haute      |
>
> Ces prompts couvrent le **Chapitre 3 — Vie quotidienne** de la roadmap conciergerie (point d'entrée du service, M1-M3). Ils **passent devant** le reste du backlog V2 hors features déjà livrées.

## 🎯 Axe stratégique commercial — Démos, Sales & Réorganisation UX

> **Vision commerciale complète (juillet 2026).** Trois chantiers liés : simplification UX admin/concierge, comptes démo commerciaux avec simulation temps réel, et espace Sales mobile-first avec gamification + Agent Commercial IA. Spec complète : **[/docs/specs/vision-commerciale-complete.md](../specs/vision-commerciale-complete.md)**.
>
> | #       | Prompt                                                                        | Rôle                                                                        | Sprint        |
> | ------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------- |
> | **P31** | Sidebar admin simplifiée (10 → 6 sections avec onglets)                       | UX client — quick win, zéro régression                                      | Commercial S1 |
> | **P32** | Inbox concierge unifiée (tickets + Human Assist + SLA)                        | Zendesk interne — cœur du nouveau concierge                                 | Commercial S1 |
> | **P33** | Fleet Observer + Client 360 (5 onglets `/concierge/[orgId]`)                  | Concierge voit ce que le client voit — différenciateur clé                  | Commercial S2 |
> | **P34** | Comptes démo — fondation (schema + wizard + générateur 7 templates)            | Arme de conversion #1 du commercial                                         | Commercial S2 |
> | **P35** | Démo simulation & conversion (engine temps réel + modale bloquante + dashboard) | Flotte vivante + modale d'urgence = conversion                              | Commercial S3 |
> | **P36** | Espace `/sales` fondations (rôle + layout mobile + pipeline + chat concierge) | Outil commercial dédié, mobile-first                                        | Commercial S2 |
> | **P37** | Sales gamification + Agent Commercial IA (Agent 7) + signaux upsell           | Clôture la boucle commerciale — comportements vertueux + IA prédictive      | Commercial S3 |

## 🎯 Axe stratégique précédent — Distribution DNVB via intégrations comptables

> Mycelium est une DNVB B2B : **le produit est le canal de distribution**. Les intégrations comptables ne sont pas une feature, c'est un **canal d'acquisition** — on se place là où le DAF passe déjà 2h/semaine. Doctrine complète, carte des canaux, plan 90 jours et template mail partnerships : **[/docs/specs/distribution-integrations-strategy.md](../specs/distribution-integrations-strategy.md)**.
>
> | #       | Prompt                                                                 | Rôle                                          | Priorité |
> | ------- | ---------------------------------------------------------------------- | --------------------------------------------- | -------- |
> | **P23** | Intégration **Pennylane** + couche d'abstraction `AccountingConnector` | Connecteur de référence, canal #1 (~250k PME) | ✅ Fait  |
> | **P24** | Connecteurs **Sage / EBP / Odoo** + API publique & Webhooks            | Multiplie les canaux (réutilise P23)          | ✅ Fait  |

## Table des priorités

### V1 — MVP Pool Sharing Light ✅ LIVRÉ

| #   | Prompt                             | Sprint | Version | Effort | Statut  |
| --- | ---------------------------------- | ------ | ------- | ------ | ------- |
| P01 | Gestion flotte (CRUD + CSV import) | S2     | V1      | 3j     | ✅ Fait |
| P02 | Réservations (logique + conflits)  | S3     | V1      | 3j     | ✅ Fait |
| P03 | Agent Concierge IA                 | S4     | V1      | 4j     | ✅ Fait |
| P04 | Dashboard admin (KPIs réels)       | S3     | V1      | 2j     | ✅ Fait |
| P05 | Calendrier flotte resource view    | S5     | V1      | 3j     | ✅ Fait |
| P06 | Notifications in-app + emails      | S6     | V1      | 2j     | ✅ Fait |

### V1.5 — Premiers payants

| #       | Prompt                                                       | Sprint  | Version  | Effort | Bloque   |
| ------- | ------------------------------------------------------------ | ------- | -------- | ------ | -------- |
| P07     | Agent Gestionnaire DAF                                       | S6      | V1.5     | 4j     | ✅ Fait  |
| P09     | Maintenance & alertes conformité                             | S7      | V1.5     | 3j     | ✅ Fait  |
| P11     | Gestion conducteurs & conformité permis                      | S9      | V1.5     | 3j     | P12, P20 |
| P12     | États des lieux & contraventions                             | S9      | V1.5     | 3j     | P16      |
| P13     | Copilote IA flottant (FAB + panneau)                         | S10     | V1.5     | 2j     | —        |
| P14     | Google Calendar & Outlook sync                               | S10     | V1       | 3j     | —        |
| P15     | Notes de frais IK                                            | S11     | V1       | 3j     | —        |
| **P23** | **🔥 Intégration Pennylane + couche compta (canal DNVB #1)** | **S12** | **V1.5** | **5j** | **P24**  |
| P21     | Admin settings : membres & invitations                       | S11     | V1.5     | 2j     | —        |

### V2 — Indispensable au DAF

| #       | Prompt                                                     | Sprint  | Version | Effort | Bloque   |
| ------- | ---------------------------------------------------------- | ------- | ------- | ------ | -------- |
| P08     | Tracking financier + dashboard coûts                       | S7      | V2      | 4j     | ✅ Fait  |
| P10     | Agent Optimiseur flotte (background)                       | S8      | V2      | 4j     | ✅ Fait  |
| P16     | Gestion des sinistres                                      | S12     | V2      | 3j     | P18      |
| P17     | Finance avancée : import carburant                         | S12     | V2      | 4j     | P18, P19 |
| P18     | Optimisation fiscale (TVS, AEN, TVA)                       | S13     | V2      | 4j     | —        |
| P19     | Rapport carbone & CSRD basique                             | S13     | V2      | 3j     | —        |
| P20     | Agent Compliance Officer (Agent 4)                         | S14     | V2      | 3j     | —        |
| P22     | Smartcar API — Données véhicules OEM                       | S14     | V2      | 3j     | —        |
| **P24** | **Connecteurs Sage/EBP/Odoo + API publique (canaux DNVB)** | **S13** | **V2**  | **6j** | —        |

### V3 — Service Fleet Care (conciergerie) — Chapitre 3 en cours

| #       | Prompt                                                  | Sprint           | Version | Effort | Bloque                 |
| ------- | ------------------------------------------------------- | ---------------- | ------- | ------ | ---------------------- |
| **P26** | **🔥 Table `concierge_tasks` + moteur de priorisation** | **Concierge S1** | **V3**  | **3j** | **P27, P28, P29, P30** |
| **P27** | **🔥 Dashboard Concierge multi-organisation**           | **Concierge S2** | **V3**  | **8j** | **P29, P30**           |
| P28     | Compliance Officer — séquence J-60/J-30/J-7 + rappels   | Concierge S2     | V3      | 3j     | —                      |
| P29     | Portail client Fleet Care                               | Concierge S3     | V3      | 5j     | —                      |
| P30     | Agent Concierge Dashboard — briefing matinal            | Concierge S3     | V3      | 2j     | —                      |

### V4 — Commercial OS (démos, sales, UX)

| #       | Prompt                                                               | Sprint        | Version | Effort  | Bloque       |
| ------- | -------------------------------------------------------------------- | ------------- | ------- | ------- | ------------ |
| **P31** | **Sidebar admin simplifiée (10 → 6 sections avec onglets)**          | Commercial S1 | V4      | 3j      | P33          |
| **P32** | **Inbox concierge unifiée (tickets + SLA + thread 3 colonnes)**      | Commercial S1 | V4      | 4j      | P33          |
| P33     | Fleet Observer + Client 360 (5 onglets `/concierge/[orgId]`)         | Commercial S2 | V4      | 4–5j    | —            |
| **P34** | **Comptes démo — fondation (schema + wizard + générateur 7 templates)** | Commercial S2 | V4   | 4j      | P35          |
| P35     | Démo simulation & conversion (engine + modale bloquante + dashboard) | Commercial S3 | V4      | 4j      | —            |
| **P36** | **Espace `/sales` fondations (rôle + layout mobile + pipeline)**     | Commercial S2 | V4      | 4j      | P37          |
| P37     | Sales gamification + Agent Commercial IA (Agent 7) + signaux upsell  | Commercial S3 | V4      | 4–5j    | —            |

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
