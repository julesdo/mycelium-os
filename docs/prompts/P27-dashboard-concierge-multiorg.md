---
priority: 27
feature: Dashboard Concierge multi-organisation
sprint: Concierge S2
version: V3 — Service Fleet Care (conciergerie)
effort: 8 jours
depends_on: P26 (concierge_tasks)
blocks: P29, P30
model_recommended: — (UI + queries, pas d'appel LLM dans ce prompt)
pricing_tier: outil interne équipe Mycelium — non exposé aux clients
---

# P27 — Dashboard Concierge multi-organisation

## 🎯 Mission

Un concierge humain gère en parallèle la flotte de 15 à 20 clients. Aujourd'hui, il n'existe aucune vue qui permette ça : il faudrait ouvrir un onglet `/admin/dashboard` par client, un par un. Ce prompt construit **`/concierge`**, un espace entièrement nouveau, réservé à l'équipe interne Mycelium, qui agrège la table `concierge_tasks` (P26) et l'état de tous les clients en une seule interface.

**Ce n'est pas une vue admin de plus.** C'est le poste de travail quotidien du concierge : ouvrir `/concierge` le matin, voir la file de tâches triée par priorité toutes organisations confondues, traiter dans l'ordre.

**Exemple de valeur :**

> Le concierge ouvre `/concierge` à 8h. Il voit en haut de la file : "🔴 CRITIQUE — Sinistre déclaré, Client Dupont Logistics, il y a 3h" et "🔴 CRITIQUE — Assurance expirée, Client Nordic Freight, expirée depuis 2 jours". Il traite ces deux tâches avant de descendre vers les priorités `NORMAL`. Il n'a ouvert qu'un seul onglet.

---

## 📍 État actuel du codebase

**Ce qui existe :**

- `concierge_tasks` (P26) avec `priorityScore`, `status`, `organizationId`
- Pattern d'accès platform-admin déjà en place : `adminQuery`/`adminMutation` dans `src/lib/convex/functions.ts`, qui vérifient `user.role === 'admin'` (Better Auth). C'est exactement le rôle qu'il faut réutiliser ici — l'équipe Mycelium interne a déjà ce rôle pour le panel `/admin/support`.
- Précédent direct de requête cross-org : `src/lib/convex/admin/mutations.ts` (`listUsers`), `optimizer.ts` (`listActiveOrgs` interne), `alerts.ts` (itère sur toutes les orgs en cron)
- `organizations` avec `name`, `logoUrl`, `paddlePlanTier`

**Ce qui manque :**

- Toute route `/concierge/*`
- Toute query cross-org exposée à un rôle humain (aujourd'hui, les seules requêtes cross-org tournent dans des crons `internalAction`, jamais consommées par une query publique)
- Score de santé composite par organisation

---

## 🔒 Contraintes absolues

1. **Réutiliser le rôle `admin` existant, ne pas inventer un nouveau système d'auth.** `user.role === 'admin'` (Better Auth) est déjà le rôle "staff interne Mycelium" utilisé par `/admin/support`. Toute nouvelle query cross-org de ce prompt doit passer par `adminQuery`/`adminMutation` (ou un wrapper dédié qui les enveloppe) — jamais par les queries `authedQuery` standard qui scopent sur l'org courante de l'utilisateur.
2. **Cross-org = explicite, jamais implicite.** Chaque fonction de ce module vit dans `src/lib/convex/concierge/*` (namespace dédié), pas mélangée avec les fonctions `admin/*` classiques org-scopées. Le nom du fichier doit rendre évident qu'on lit plusieurs organisations à la fois.
3. **Aucune donnée client sensible en clair sans nécessité.** La grille multi-org affiche des agrégats (nombre de tâches, score) — pas le détail des messages du Concierge IA d'un client sans clic explicite dedans.
4. **Read-only dans ce prompt.** Le dashboard peut faire évoluer le `status` d'une `concierge_tasks` (traiter/snoozer/assigner) mais ne modifie jamais les tables sources (`incidents`, `trafficViolations`...) directement — pour ça, le concierge navigue vers la vue admin du client concerné (lien direct).

---

## 📊 Schema changes requises

Aucune nouvelle table. Une fonction dérivée (pas stockée) pour le score de santé :

```typescript
// src/lib/convex/concierge/health.ts — calcul à la volée, pas persisté
// (évite un état à resynchroniser ; recalculé à chaque lecture du dashboard, coût négligeable à l'échelle de 100 clients)
```

---

## 📁 Fichiers à créer / modifier

```
src/lib/convex/concierge/queries.ts          → NOUVEAU : getAggregatedQueue, getClientHealthGrid, getClientDetail
src/lib/convex/concierge/mutations.ts        → NOUVEAU : updateTaskStatus, assignTask, snoozeTask
src/lib/convex/concierge/health.ts           → NOUVEAU : calculateHealthScore(organizationId)
src/lib/convex/functions.ts                  → vérifier/exporter un helper conciergeQuery si besoin (alias de adminQuery)

src/routes/[[lang]]/concierge/
  +layout.svelte                              → guard role='admin', sinon redirect
  +page.svelte                                → vue principale (queue + grid)
  [organizationId]/+page.svelte                → vue détaillée d'un client (lecture, liens vers /admin/* du client)

src/lib/components/concierge/
  concierge-queue-view.svelte                 → liste des tâches triées, filtres
  concierge-task-row.svelte                   → ligne de tâche (badge org, priorité, actions rapides)
  client-health-grid.svelte                    → grille de cartes par organisation
  client-health-card.svelte                    → carte individuelle (score, tier, tâches ouvertes)
  concierge-filters.svelte                     → filtres par client / type / statut
```

---

## 🔨 Implémentation — Étapes ordonnées

### Étape 1 — Queries cross-org (`concierge/queries.ts`)

```typescript
// src/lib/convex/concierge/queries.ts
import { adminQuery } from '../functions';
import { v } from 'convex/values';
import { calculateHealthScore } from './health';

export const getAggregatedQueue = adminQuery({
	args: {
		statusFilter: v.optional(v.array(v.string())),
		organizationId: v.optional(v.id('organizations'))
	},
	handler: async (ctx, args) => {
		// ctx.user déjà garanti role==='admin' par adminQuery — cross-org volontaire et explicite
		let tasksQuery = ctx.db.query('concierge_tasks').withIndex('by_status_and_priority');

		let tasks = await tasksQuery.collect();

		tasks = tasks.filter((t) => t.status !== 'DONE');
		if (args.statusFilter?.length) {
			tasks = tasks.filter((t) => args.statusFilter!.includes(t.status));
		}
		if (args.organizationId) {
			tasks = tasks.filter((t) => t.organizationId === args.organizationId);
		}

		// Tri décroissant par score (l'index trie par status puis priorityScore croissant, on inverse ici)
		tasks.sort((a, b) => b.priorityScore - a.priorityScore);

		// Enrichir avec le nom de l'organisation pour l'affichage
		const orgIds = [...new Set(tasks.map((t) => t.organizationId))];
		const orgs = await Promise.all(orgIds.map((id) => ctx.db.get(id)));
		const orgMap = new Map(orgs.filter(Boolean).map((o) => [o!._id, o!]));

		return tasks.map((t) => ({
			...t,
			organizationName: orgMap.get(t.organizationId)?.name ?? 'Organisation inconnue',
			organizationTier: orgMap.get(t.organizationId)?.paddlePlanTier ?? 'essential'
		}));
	}
});

export const getClientHealthGrid = adminQuery({
	args: {},
	handler: async (ctx) => {
		const orgs = await ctx.db.query('organizations').collect();
		return await Promise.all(
			orgs.map(async (org) => {
				const openTasks = await ctx.db
					.query('concierge_tasks')
					.withIndex('by_org_and_status', (q) => q.eq('organizationId', org._id))
					.filter((q) => q.neq(q.field('status'), 'DONE'))
					.collect();

				return {
					organizationId: org._id,
					name: org.name,
					logoUrl: org.logoUrl,
					tier: org.paddlePlanTier ?? 'essential',
					openTaskCount: openTasks.length,
					criticalCount: openTasks.filter((t) => t.priority === 'CRITICAL').length,
					healthScore: calculateHealthScore(openTasks)
				};
			})
		);
	}
});
```

### Étape 2 — Score de santé (`concierge/health.ts`)

```typescript
// src/lib/convex/concierge/health.ts
import type { Doc } from '../_generated/dataModel';

// Score composite 0-100 : 100 = rien à signaler, descend avec le volume et la gravité des tâches ouvertes
export function calculateHealthScore(openTasks: Doc<'concierge_tasks'>[]): number {
	if (openTasks.length === 0) return 100;

	const penalty = openTasks.reduce((sum, task) => {
		switch (task.priority) {
			case 'CRITICAL':
				return sum + 25;
			case 'URGENT':
				return sum + 12;
			case 'NORMAL':
				return sum + 4;
			default:
				return sum + 1;
		}
	}, 0);

	return Math.max(0, 100 - penalty);
}

export function healthScoreToColor(score: number): 'green' | 'yellow' | 'red' {
	if (score >= 80) return 'green';
	if (score >= 50) return 'yellow';
	return 'red';
}
```

### Étape 3 — Mutations d'action rapide (`concierge/mutations.ts`)

```typescript
// src/lib/convex/concierge/mutations.ts
import { adminMutation } from '../functions';
import { v } from 'convex/values';

export const updateTaskStatus = adminMutation({
	args: {
		taskId: v.id('concierge_tasks'),
		status: v.union(
			v.literal('OPEN'),
			v.literal('IN_PROGRESS'),
			v.literal('SNOOZED'),
			v.literal('DONE')
		),
		completionNotes: v.optional(v.string()),
		snoozedUntil: v.optional(v.number())
	},
	handler: async (ctx, args) => {
		await ctx.db.patch(args.taskId, {
			status: args.status,
			completionNotes: args.completionNotes,
			snoozedUntil: args.snoozedUntil,
			completedAt: args.status === 'DONE' ? Date.now() : undefined,
			updatedAt: Date.now()
		});
	}
});

export const assignTask = adminMutation({
	args: { taskId: v.id('concierge_tasks'), assignedTo: v.string() },
	handler: async (ctx, args) => {
		await ctx.db.patch(args.taskId, { assignedTo: args.assignedTo, updatedAt: Date.now() });
	}
});
```

### Étape 4 — Guard de route (`+layout.svelte`)

```svelte
<!-- src/routes/[[lang]]/concierge/+layout.svelte -->
<script lang="ts">
	import { authClient } from '$lib/auth-client';
	import { goto } from '$app/navigation';

	const session = authClient.useSession();

	$effect(() => {
		if (session.data && session.data.user.role !== 'admin') {
			goto('/app'); // pas de staff Mycelium → redirigé, jamais un message d'erreur qui révèle l'existence de la route
		}
	});
</script>

{#if session.data?.user.role === 'admin'}
	<slot />
{/if}
```

### Étape 5 — UI principale

Layout en deux zones : `ClientHealthGrid` en haut (vue d'ensemble, cliquable pour filtrer la queue sur un client), `ConciergeQueueView` en dessous (liste triée, actions inline "Traiter" / "Snoozer" / "Assigner"). Réutiliser les composants de badge/priorité déjà présents dans `compliance-alert-row.svelte` (P20) comme référence visuelle plutôt que d'en inventer un nouveau système.

---

## ✅ Critères d'acceptation

- [ ] `/concierge` inaccessible à tout utilisateur dont `role !== 'admin'` (testé avec un compte ORG_ADMIN classique — doit être redirigé)
- [ ] `getAggregatedQueue` retourne les tâches de **toutes** les organisations, triées par `priorityScore` décroissant
- [ ] `getClientHealthGrid` retourne une carte par organisation avec un score cohérent (0 tâche ouverte → 100, tâches critiques → score qui chute)
- [ ] Traiter une tâche depuis le dashboard met à jour `concierge_tasks.status` sans jamais modifier la table source (`incidents`, `trafficViolations`...)
- [ ] Clic sur une carte client filtre la queue sur cette organisation uniquement
- [ ] Aucune query cross-org de ce module n'est accessible via `authedQuery`/`orgQuery` — uniquement via `adminQuery`/`adminMutation`

---

## 🚫 NE PAS FAIRE

- Ne pas exposer `getAggregatedQueue` ou `getClientHealthGrid` à un rôle `ORG_ADMIN`/`ORG_MEMBER` — ce sont des queries strictement staff interne
- Ne pas dupliquer la logique de scoring (`calculatePriorityScore` vit dans P26, `calculateHealthScore` est un calcul différent et complémentaire — ne pas les confondre)
- Ne pas permettre de modifier les tables sources (`incidents.status`, etc.) depuis `/concierge` — cette vue est un poste d'orchestration, pas un panel d'administration de flotte (ça reste `/admin/*` pour ça, avec navigation croisée)
- Ne pas construire de système de permissions granulaire par concierge dans ce prompt (ex: concierge A ne voit que ses clients assignés) — v1 = tout le staff `role='admin'` voit tout, granularité fine hors scope pour l'instant
