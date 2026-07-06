---
priority: 29
feature: Portail client Fleet Care — "votre flotte est entre de bonnes mains"
sprint: Concierge S3
version: V3 — Service Fleet Care (conciergerie)
effort: 5 jours
depends_on: P26 (concierge_tasks), P27 (dashboard concierge — pour cohérence de données, pas de dépendance technique bloquante)
blocks: —
model_recommended: — (agrégation de données, pas d'appel LLM obligatoire ; option Haiku pour reformuler en langage naturel, voir Étape 3)
pricing_tier: Essential+ (le portail remplace/complète le dashboard technique existant sur tous les tiers dès qu'un client souscrit au service Fleet Care)
---

# P29 — Portail client Fleet Care

## 🎯 Mission

Le dashboard admin actuel (`/admin/dashboard`) est un outil de pilotage technique : KPIs, graphiques, listes. C'est utile pour un DAF qui veut piloter sa flotte lui-même. Mais la promesse du service de conciergerie est différente : **"vous n'avez plus à piloter, quelqu'un le fait pour vous."** Le client a besoin d'une preuve émotionnelle de valeur, pas d'un tableau de bord de plus.

Ce prompt crée `/app/fleet-care`, une page pensée pour un DAF ou un dirigeant qui n'a ni le temps ni l'envie de lire un dashboard technique. Elle répond à trois questions : _Est-ce que ma flotte va bien ? Qu'est-ce qui a été fait pour moi ? Comment je parle à quelqu'un si besoin ?_

**Exemple de valeur :**

> Le client ouvre `/app/fleet-care` un lundi matin. Il voit un score de 92/100, la mention "3 actions réalisées pour vous ce mois-ci" avec le détail en une ligne chacune, et "2 échéances à venir le mois prochain, déjà prises en charge". Il ferme l'onglet rassuré. Il n'a pas eu besoin de comprendre ce qu'est un BiK ou une échéance CT.

---

## 📍 État actuel du codebase

**Ce qui existe :**

- `concierge_tasks` (P26) avec `status: DONE`/`OPEN`, `dueDate`, `completedAt`, `completionNotes`
- Dashboard admin existant (`/admin/dashboard`) — à ne PAS modifier, cette nouvelle page est additive
- `ConciergeChat` / `CopilotPanel` (P13) — chat IA existant déjà branché sur `/api/concierge`, réutilisable tel quel pour le bouton "Parler à mon concierge"
- `organizations` avec `name`, `paddlePlanTier`

**Ce qui manque :**

- Toute route `/app/fleet-care`
- Une fonction de score de santé **côté client** (différente de `calculateHealthScore` de P27 qui est pensée pour le tri interne concierge — ici on veut un score simple et positif à afficher, pas un outil de priorisation)
- Une agrégation "ce mois-ci / mois prochain" en langage naturel à partir de `concierge_tasks`

---

## 🔒 Contraintes absolues

1. **Zéro jargon technique.** Pas de "BiK", pas de "CSRD", pas de "complianceAlert". Traduire systématiquement en langage métier ("avantage en nature", "empreinte carbone", "document à renouveler").
2. **Un seul score, pas quinze KPIs.** Résister à la tentation d'ajouter des graphiques. Le portail Fleet Care est volontairement plus simple que `/admin/dashboard`, pas un remplaçant technique.
3. **Ton rassurant, jamais alarmiste.** Même une tâche `CRITICAL` en interne doit se traduire, côté client, en "en cours de traitement par votre concierge" plutôt qu'en alerte rouge anxiogène — sauf si une action du client est réellement requise (ex: signature d'un document), auquel cas c'est clair mais sans jargon.
4. **Accessible uniquement à `ORG_ADMIN`** (même garde que le reste de `/admin`, mais cette page vit sous `/app` par choix produit — c'est un espace de réassurance, pas un outil de gestion technique). Vérifier le rôle comme sur les autres pages `ORG_ADMIN`-only existantes.
5. **Ne modifie aucune donnée.** Cette page est 100% lecture + un bouton d'action (ouvrir le chat). Aucune mutation de `concierge_tasks` ou autre depuis cette page.

---

## 📊 Schema changes requises

Aucune nouvelle table. Fonctions dérivées uniquement.

---

## 📁 Fichiers à créer / modifier

```
src/lib/convex/concierge/clientPortal.ts     → NOUVEAU : getFleetCareSummary (authedQuery, scopé org courante)

src/routes/[[lang]]/app/fleet-care/
  +page.svelte                                → page principale

src/lib/components/fleet-care/
  health-score-banner.svelte                  → "Votre flotte est entre de bonnes mains" + score
  this-month-section.svelte                    → liste des tâches DONE du mois en langage naturel
  next-month-section.svelte                    → liste des tâches OPEN à échéance proche
  talk-to-concierge-button.svelte              → ouvre ConciergeChat/CopilotPanel existant
```

---

## 🔨 Implémentation — Étapes ordonnées

### Étape 1 — Query côté client (`clientPortal.ts`)

```typescript
// src/lib/convex/concierge/clientPortal.ts
import { authedQuery } from '../functions';
import { getUserOrg, requireOrgAdmin } from '../lib/auth';

export const getFleetCareSummary = authedQuery({
	args: {},
	handler: async (ctx) => {
		const { organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId);

		const now = Date.now();
		const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
		const startOfNextMonth = new Date(
			new Date().getFullYear(),
			new Date().getMonth() + 1,
			1
		).getTime();
		const endOfNextMonth = new Date(
			new Date().getFullYear(),
			new Date().getMonth() + 2,
			1
		).getTime();

		const allTasks = await ctx.db
			.query('concierge_tasks')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();

		const completedThisMonth = allTasks.filter(
			(t) => t.status === 'DONE' && t.completedAt && t.completedAt >= startOfMonth
		);

		const upcomingNextMonth = allTasks.filter(
			(t) =>
				t.status !== 'DONE' &&
				t.dueDate &&
				t.dueDate >= startOfNextMonth &&
				t.dueDate < endOfNextMonth
		);

		const openTasks = allTasks.filter((t) => t.status !== 'DONE');

		return {
			healthScore: calculateClientFacingScore(openTasks),
			completedThisMonth: completedThisMonth.map(toClientFacingItem),
			upcomingNextMonth: upcomingNextMonth.map(toClientFacingItem),
			openCriticalCount: openTasks.filter((t) => t.priority === 'CRITICAL').length
		};
	}
});

// Score volontairement plus indulgent que le score interne concierge (P27) :
// l'objectif ici est de rassurer, pas de prioriser un travail humain.
function calculateClientFacingScore(openTasks: Array<{ priority: string }>): number {
	if (openTasks.length === 0) return 100;
	const penalty = openTasks.reduce((sum, t) => {
		if (t.priority === 'CRITICAL') return sum + 15;
		if (t.priority === 'URGENT') return sum + 6;
		return sum + 1;
	}, 0);
	return Math.max(60, 100 - penalty); // plancher à 60 : jamais afficher un score anxiogène au client
}

function toClientFacingItem(task: { title: string; description: string; dueDate?: number }) {
	return {
		title: task.title,
		summary: task.description
	};
}
```

### Étape 2 — Page principale

```svelte
<!-- src/routes/[[lang]]/app/fleet-care/+page.svelte -->
<script lang="ts">
	import { useQuery } from 'convex-svelte';
	import { api } from '$lib/convex/_generated/api';
	import HealthScoreBanner from '$lib/components/fleet-care/health-score-banner.svelte';
	import ThisMonthSection from '$lib/components/fleet-care/this-month-section.svelte';
	import NextMonthSection from '$lib/components/fleet-care/next-month-section.svelte';
	import TalkToConciergeButton from '$lib/components/fleet-care/talk-to-concierge-button.svelte';

	const summary = useQuery(api.concierge.clientPortal.getFleetCareSummary, {});
</script>

{#if summary.data}
	<HealthScoreBanner score={summary.data.healthScore} />
	<ThisMonthSection items={summary.data.completedThisMonth} />
	<NextMonthSection items={summary.data.upcomingNextMonth} />
	<TalkToConciergeButton />
{/if}
```

### Étape 3 (optionnelle) — Reformulation en langage naturel via Haiku

Si les titres/descriptions bruts de `concierge_tasks` restent trop techniques après relecture manuelle des premiers clients pilotes, envisager un appel Claude Haiku ponctuel (pas en temps réel — un batch mensuel) qui reformule `completedThisMonth`/`upcomingNextMonth` en une phrase orientée bénéfice client. **Ne pas construire cette étape par défaut** — d'abord vérifier avec les clients pilotes (Section 7 du `/docs/ROADMAP-CONCIERGE.md`) si les titres actuels suffisent déjà.

---

## ✅ Critères d'acceptation

- [ ] `/app/fleet-care` accessible uniquement à `ORG_ADMIN`, redirection sinon
- [ ] Le score affiché ne descend jamais sous 60 (plancher anti-anxiété respecté)
- [ ] Aucun terme technique brut (BiK, CSRD, TVS, complianceAlert...) visible dans l'UI — tout est reformulé
- [ ] La section "Ce mois-ci" n'affiche que des tâches réellement `DONE` avec `completedAt` dans le mois courant
- [ ] Le bouton "Parler à mon concierge" ouvre le chat existant sans dupliquer son code (réutilisation directe de `ConciergeChat`/`CopilotPanel`)
- [ ] Aucune mutation n'est appelée depuis cette page

---

## 🚫 NE PAS FAIRE

- Ne pas copier le dashboard `/admin/dashboard` en le renommant — c'est une page différente dans son intention (réassurance vs pilotage)
- Ne pas afficher de graphique, de tableau de KPIs multiples, ou de jargon compliance — un score, deux listes, un bouton
- Ne pas construire de nouvelle table de "résumé mensuel" persistée dans ce prompt — le calcul à la volée depuis `concierge_tasks` suffit à l'échelle attendue (quelques dizaines de tâches par client par mois)
- Ne pas rendre cette page visible aux `ORG_MEMBER` — c'est un outil de réassurance pour le décideur (DAF/dirigeant), pas pour tous les salariés
