---
priority: 26
feature: Table concierge_tasks — file de tâches unifiée + moteur de priorisation
sprint: Concierge S1 (fondation Fleet Care)
version: V3 — Service Fleet Care (conciergerie)
effort: 3 jours
depends_on: P20 (compliance), P16 (sinistres), P12 (contraventions), P09 (maintenance), P10 (optimizer)
blocks: P27, P28, P29, P30
model_recommended: — (logique déterministe, pas d'appel LLM dans ce prompt)
pricing_tier: infrastructure interne — non facturé directement, sous-tend tous les tiers Fleet Care
---

# P26 — Table `concierge_tasks` + moteur de priorisation

## 🎯 Mission

Aujourd'hui, les signaux qui nécessitent une action humaine (alertes compliance, sinistres ouverts, contraventions reçues, maintenances en retard, recommandations de l'Optimizer) vivent chacun dans leur propre table, avec leur propre notion de statut, et **par organisation**. Un concierge qui gère 15 clients n'a aucun moyen de voir "les 12 choses à faire aujourd'hui, dans l'ordre" sans ouvrir 15 dashboards admin différents.

Ce prompt crée la **fondation** du service de conciergerie : une table unique `concierge_tasks` qui agrège tous ces signaux avec une priorité calculée automatiquement, et un mécanisme pour que les modules existants y écrivent au lieu de rester silencieux dans leur coin.

**Ce prompt ne construit PAS le dashboard visuel** (c'est P27) ni l'agent qui génère un briefing (P30). Il construit uniquement la donnée et le moteur de scoring — la brique sur laquelle tout le reste du service Fleet Care repose.

**Exemple de valeur :**

> Aujourd'hui, un sinistre déclaré chez le Client A et une échéance BiK expirant chez le Client B sont deux réalités invisibles l'une à l'autre. Après ce prompt, les deux apparaissent comme deux lignes dans `concierge_tasks`, triées par `priorityScore`, prêtes à être consommées par n'importe quelle UI ou agent futur.

---

## 📍 État actuel du codebase

**Ce qui existe (sources de signaux) :**

- `complianceAlerts` (P20) — alertes CT/assurance/permis, horizon `30_DAYS`/`7_DAYS`/`EXPIRED`, déjà dédoublonnées
- `incidents` (P16) — statuts `DECLARED`→`SENT_TO_INSURER`→`EXPERTISE`→`REPAIR`→`CLOSED`/`CONTESTED`
- `trafficViolations` (P12) — statuts `RECEIVED`→`IDENTIFIED`→`NOTIFIED`→`PAID`/`CONTESTED`/`CLOSED`
- `maintenanceRecords` (P09) — statuts `SCHEDULED`/`IN_PROGRESS`/`COMPLETED`/`CANCELLED`
- `optimizerReports` (P10) — recommandations hebdomadaires avec `priority: 'high'|'medium'|'low'`
- `organizations.paddlePlanTier` — `essential`/`professional`/`business`/`enterprise` (pour pondérer par valeur client)

**Ce qui manque :**

- Aucune table n'agrège ces signaux entre eux
- Aucune notion de priorité comparable entre un sinistre et une échéance réglementaire
- Aucun mécanisme d'écriture croisée (les modules existants ne savent pas qu'un "concierge" existe)

---

## 🔒 Contraintes absolues

1. **Pas de duplication de source de vérité.** `concierge_tasks` ne remplace jamais `incidents`/`trafficViolations`/etc. — elle référence la source via `sourceType` + `sourceId` et affiche un résumé. La donnée détaillée reste dans sa table d'origine.
2. **Écriture idempotente.** Une même entité source (ex: un sinistre donné) ne doit jamais générer deux tâches ouvertes dupliquées. Vérifier l'existence d'une tâche `OPEN`/`IN_PROGRESS` pour le même `sourceType`+`sourceId` avant d'en créer une nouvelle.
3. **Scoring déterministe, pas de LLM.** Le calcul de `priorityScore` est une fonction pure TypeScript. Aucun appel Claude dans ce prompt — la priorisation doit être reproductible et auditable.
4. **Isolation multi-tenant préservée.** `concierge_tasks` a un `organizationId` obligatoire sur chaque ligne. La lecture cross-org (nécessaire pour le futur dashboard P27) est un problème d'**autorisation**, pas de modélisation — cette table reste scopée comme toutes les autres, seul le rôle qui la lit change.
5. **Ne jamais synchroniser le statut dans les deux sens automatiquement au-delà de la création.** Si un concierge marque une tâche `DONE` manuellement, ça ne doit pas re-fermer le sinistre source à sa place — l'humain reste responsable de la source si une action y est nécessaire.

---

## 📊 Schema changes requises

### Nouvelle table `concierge_tasks`

```typescript
// src/lib/convex/schema.ts — ajouter après complianceAlerts

concierge_tasks: defineTable({
  organizationId: v.id('organizations'),
  sourceType: v.union(
    v.literal('COMPLIANCE_ALERT'),
    v.literal('INCIDENT'),
    v.literal('VIOLATION'),
    v.literal('MAINTENANCE'),
    v.literal('OPTIMIZER_RECOMMENDATION'),
    v.literal('MANUAL') // créée directement par un concierge humain, sans source automatique
  ),
  sourceId: v.optional(v.string()), // _id de l'entité source (string générique, table variable selon sourceType)
  priority: v.union(
    v.literal('CRITICAL'),
    v.literal('URGENT'),
    v.literal('NORMAL'),
    v.literal('INFO')
  ),
  priorityScore: v.number(), // valeur calculée, permet le tri sans recalcul à l'affichage
  title: v.string(),
  description: v.string(),
  dueDate: v.optional(v.number()),
  status: v.union(
    v.literal('OPEN'),
    v.literal('IN_PROGRESS'),
    v.literal('SNOOZED'),
    v.literal('DONE')
  ),
  snoozedUntil: v.optional(v.number()),
  assignedTo: v.optional(v.string()), // Better Auth string ID d'un membre de l'équipe concierge Mycelium (role='admin')
  completedAt: v.optional(v.number()),
  completionNotes: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number()
})
  .index('by_org', ['organizationId'])
  .index('by_status_and_priority', ['status', 'priorityScore'])
  .index('by_assigned', ['assignedTo', 'status'])
  .index('by_org_and_status', ['organizationId', 'status'])
  .index('by_source', ['sourceType', 'sourceId']), // pour l'idempotence
```

---

## 📁 Fichiers à créer / modifier

```
src/lib/convex/schema.ts                     → ajouter concierge_tasks
src/lib/convex/concierge/tasks.ts            → NOUVEAU : mutations/queries + moteur de scoring
src/lib/convex/concierge/priority.ts         → NOUVEAU : fonction pure calculatePriorityScore()

src/lib/convex/compliance.ts                 → MODIFIER : appeler upsertTaskFromSource après création d'une complianceAlert
src/lib/convex/incidents.ts                  → MODIFIER : appeler upsertTaskFromSource sur declareIncident + changement de statut critique
src/lib/convex/violations.ts                 → MODIFIER : appeler upsertTaskFromSource sur createViolation
src/lib/convex/maintenance/detector.ts       → MODIFIER : appeler upsertTaskFromSource sur maintenance en retard
src/lib/convex/optimizer.ts                  → MODIFIER : appeler upsertTaskFromSource pour les recommandations 'high' priority
```

---

## 🔨 Implémentation — Étapes ordonnées

### Étape 1 — Moteur de priorisation pur (`concierge/priority.ts`)

```typescript
// src/lib/convex/concierge/priority.ts

type SourceType =
	| 'COMPLIANCE_ALERT'
	| 'INCIDENT'
	| 'VIOLATION'
	| 'MAINTENANCE'
	| 'OPTIMIZER_RECOMMENDATION'
	| 'MANUAL';

type PlanTier = 'free' | 'essential' | 'professional' | 'business' | 'enterprise';

// Poids de base par type de source — reflète la gravité intrinsèque du type d'événement
const SEVERITY_BASE: Record<SourceType, number> = {
	COMPLIANCE_ALERT: 50, // réglementaire = jamais négligeable
	INCIDENT: 60, // sinistre = impact sécurité/financier direct
	VIOLATION: 30,
	MAINTENANCE: 25,
	OPTIMIZER_RECOMMENDATION: 15, // informationnel par défaut
	MANUAL: 40
};

// Poids par tier client — un client Business paie pour une conciergerie illimitée, priorité légèrement supérieure
const TIER_WEIGHT: Record<PlanTier, number> = {
	free: 0.8,
	essential: 1.0,
	professional: 1.15,
	business: 1.3,
	enterprise: 1.3
};

export function calculatePriorityScore(params: {
	sourceType: SourceType;
	dueDate?: number; // timestamp ms
	planTier: PlanTier;
	isRegulatory: boolean; // true pour compliance + certaines violations légales
	now?: number;
}): number {
	const now = params.now ?? Date.now();
	const base = SEVERITY_BASE[params.sourceType];
	const tierWeight = TIER_WEIGHT[params.planTier] ?? 1.0;

	let urgencyMultiplier = 1.0;
	if (params.dueDate !== undefined) {
		const daysLeft = (params.dueDate - now) / (1000 * 60 * 60 * 24);
		if (daysLeft < 0)
			urgencyMultiplier = 3.0; // déjà en retard/expiré
		else if (daysLeft <= 2) urgencyMultiplier = 2.2;
		else if (daysLeft <= 7) urgencyMultiplier = 1.6;
		else if (daysLeft <= 30) urgencyMultiplier = 1.2;
		else urgencyMultiplier = 1.0;
	}

	let score = base * urgencyMultiplier * tierWeight;

	// Plancher réglementaire : jamais sous le seuil "URGENT" quel que soit le tier/urgence apparente
	if (params.isRegulatory) {
		score = Math.max(score, 70);
	}

	return Math.round(score);
}

export function scoreToPriorityLabel(score: number): 'CRITICAL' | 'URGENT' | 'NORMAL' | 'INFO' {
	if (score >= 120) return 'CRITICAL';
	if (score >= 70) return 'URGENT';
	if (score >= 30) return 'NORMAL';
	return 'INFO';
}
```

### Étape 2 — Mutations/queries (`concierge/tasks.ts`)

```typescript
// src/lib/convex/concierge/tasks.ts
import { internalMutation, internalQuery } from '../_generated/server';
import { v } from 'convex/values';
import { calculatePriorityScore, scoreToPriorityLabel } from './priority';
import { internal } from '../_generated/api';

// Point d'entrée unique utilisé par tous les modules sources (compliance, incidents, violations...)
export const upsertTaskFromSource = internalMutation({
	args: {
		organizationId: v.id('organizations'),
		sourceType: v.union(
			v.literal('COMPLIANCE_ALERT'),
			v.literal('INCIDENT'),
			v.literal('VIOLATION'),
			v.literal('MAINTENANCE'),
			v.literal('OPTIMIZER_RECOMMENDATION'),
			v.literal('MANUAL')
		),
		sourceId: v.string(),
		title: v.string(),
		description: v.string(),
		dueDate: v.optional(v.number()),
		isRegulatory: v.boolean()
	},
	handler: async (ctx, args) => {
		// Idempotence : une tâche ouverte/en cours pour cette source existe déjà → mise à jour, pas de doublon
		const existing = await ctx.db
			.query('concierge_tasks')
			.withIndex('by_source', (q) =>
				q.eq('sourceType', args.sourceType).eq('sourceId', args.sourceId)
			)
			.filter((q) => q.neq(q.field('status'), 'DONE'))
			.first();

		const org = await ctx.db.get(args.organizationId);
		if (!org) return;

		const planTier = (org.paddlePlanTier ?? 'essential') as
			| 'free'
			| 'essential'
			| 'professional'
			| 'business'
			| 'enterprise';

		const priorityScore = calculatePriorityScore({
			sourceType: args.sourceType,
			dueDate: args.dueDate,
			planTier,
			isRegulatory: args.isRegulatory
		});
		const priority = scoreToPriorityLabel(priorityScore);

		if (existing) {
			await ctx.db.patch(existing._id, {
				title: args.title,
				description: args.description,
				dueDate: args.dueDate,
				priority,
				priorityScore,
				updatedAt: Date.now()
			});
			return existing._id;
		}

		return await ctx.db.insert('concierge_tasks', {
			organizationId: args.organizationId,
			sourceType: args.sourceType,
			sourceId: args.sourceId,
			priority,
			priorityScore,
			title: args.title,
			description: args.description,
			dueDate: args.dueDate,
			status: 'OPEN',
			createdAt: Date.now(),
			updatedAt: Date.now()
		});
	}
});

// Marque une tâche source comme résolue (appelé quand la source elle-même se clôture,
// ex: incident.status passe à CLOSED) — ne PAS appeler automatiquement l'inverse
export const resolveTaskFromSource = internalMutation({
	args: {
		sourceType: v.string(),
		sourceId: v.string()
	},
	handler: async (ctx, args) => {
		const task = await ctx.db
			.query('concierge_tasks')
			.withIndex('by_source', (q) =>
				q.eq('sourceType', args.sourceType as any).eq('sourceId', args.sourceId)
			)
			.filter((q) => q.neq(q.field('status'), 'DONE'))
			.first();
		if (!task) return;
		await ctx.db.patch(task._id, {
			status: 'DONE',
			completedAt: Date.now(),
			updatedAt: Date.now()
		});
	}
});

export const listOpenTasksForOrg = internalQuery({
	args: { organizationId: v.id('organizations') },
	handler: async (ctx, { organizationId }) => {
		return await ctx.db
			.query('concierge_tasks')
			.withIndex('by_org_and_status', (q) => q.eq('organizationId', organizationId))
			.filter((q) => q.neq(q.field('status'), 'DONE'))
			.collect();
	}
});
```

### Étape 3 — Brancher les sources existantes

Dans **chaque** module source, après l'écriture de l'entité (pas avant — on a besoin de son `_id`), appeler `upsertTaskFromSource` via `ctx.scheduler.runAfter(0, ...)` (jamais en bloquant la mutation utilisateur) :

```typescript
// Exemple dans src/lib/convex/incidents.ts, à la fin de declareIncident
await ctx.scheduler.runAfter(0, internal.concierge.tasks.upsertTaskFromSource, {
	organizationId: args.organizationId,
	sourceType: 'INCIDENT',
	sourceId: incidentId,
	title: `Sinistre déclaré — ${vehicleLabel}`,
	description: args.description.slice(0, 200),
	dueDate: undefined, // pas d'échéance dure, l'urgence vient de isRegulatory=false + severityBase
	isRegulatory: false
});
```

```typescript
// Exemple dans src/lib/convex/compliance.ts, dans maybeCreateAlert (après ctx.runMutation createAlert)
await ctx.scheduler.runAfter(0, internal.concierge.tasks.upsertTaskFromSource, {
	organizationId: params.organizationId,
	sourceType: 'COMPLIANCE_ALERT',
	sourceId: alertId,
	title: `${params.alertType} — ${params.entityLabel}`,
	description: `Échéance : ${params.expiryDate}`,
	dueDate: new Date(params.expiryDate).getTime(),
	isRegulatory: true
});
```

Appliquer le même principe (adapter titre/description/dueDate/isRegulatory) dans `violations.ts` (`createViolation`), `maintenance/detector.ts` (retard détecté), et `optimizer.ts` (recommandations `priority: 'high'` uniquement — ne pas créer une tâche pour chaque recommandation `low`).

Quand la source se clôture (`incidents.updateIncidentStatus` vers `CLOSED`, `trafficViolations` vers `PAID`/`CLOSED`, `maintenanceRecords` vers `COMPLETED`), appeler `resolveTaskFromSource` de la même façon.

---

## ✅ Critères d'acceptation

- [ ] `concierge_tasks` créée avec tous les index, migration Convex passe sans erreur
- [ ] Déclarer un sinistre crée automatiquement une tâche `OPEN` avec priorité cohérente
- [ ] Créer une `complianceAlert` crée une tâche avec `priorityScore >= 70` (plancher réglementaire respecté)
- [ ] Clore un sinistre (`status: CLOSED`) marque la tâche correspondante `DONE` automatiquement
- [ ] Aucune tâche dupliquée si la même source déclenche `upsertTaskFromSource` deux fois de suite (idempotence vérifiée par test)
- [ ] `calculatePriorityScore` est une fonction pure testée unitairement (au moins 5 cas : réglementaire expiré, sinistre récent, recommandation info, tier business vs essential, échéance à 30j)
- [ ] Aucune tâche n'est créée de façon bloquante dans la mutation appelante (toujours via `ctx.scheduler.runAfter(0, ...)`)

---

## 🚫 NE PAS FAIRE

- Ne pas dupliquer les champs métier détaillés (photos, montants, historique) dans `concierge_tasks` — cette table est un **index de priorisation**, pas une copie des données sources
- Ne pas appeler Claude/un LLM pour calculer la priorité — logique déterministe uniquement dans ce prompt
- Ne pas créer de tâche pour les recommandations Optimizer `priority: 'low'` — bruit inutile pour un concierge qui gère 15+ clients
- Ne pas construire le dashboard visuel ici — ce prompt s'arrête à la donnée et aux hooks d'écriture (le dashboard est P27)
- Ne pas fermer automatiquement une source depuis un changement de statut sur `concierge_tasks` — le flux d'autorité va toujours source → tâche, jamais l'inverse
