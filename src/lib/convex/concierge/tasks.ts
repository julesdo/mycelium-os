import { v } from 'convex/values';
import { internalMutation, internalQuery } from '../_generated/server';
import { internal } from '../_generated/api';
import { calculatePriorityScore, scoreToPriorityLabel } from './priority';

const sourceTypeValidator = v.union(
	v.literal('COMPLIANCE_ALERT'),
	v.literal('INCIDENT'),
	v.literal('VIOLATION'),
	v.literal('MAINTENANCE'),
	v.literal('OPTIMIZER_RECOMMENDATION'),
	v.literal('MANUAL')
);

// Point d'entrée unique pour tous les modules sources — crée ou met à jour une tâche existante
export const upsertTaskFromSource = internalMutation({
	args: {
		organizationId: v.id('organizations'),
		sourceType: sourceTypeValidator,
		sourceId: v.string(),
		title: v.string(),
		description: v.string(),
		dueDate: v.optional(v.number()),
		isRegulatory: v.boolean()
	},
	handler: async (ctx, args) => {
		// Idempotence : tâche déjà ouverte/en cours pour cette source → mise à jour
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

		let taskId: string;

		if (existing) {
			await ctx.db.patch(existing._id, {
				title: args.title,
				description: args.description,
				dueDate: args.dueDate,
				priority,
				priorityScore,
				updatedAt: Date.now()
			});
			taskId = existing._id as string;
		} else {
			const newId = await ctx.db.insert('concierge_tasks', {
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
			taskId = newId as string;
		}

		// Bridge M1: tâches CRITICAL/URGENT → ticket concierge pour traitement humain
		if (priority === 'CRITICAL' || priority === 'URGENT') {
			await ctx.scheduler.runAfter(0, internal.concierge.tickets.upsertTicketFromSource, {
				organizationId: args.organizationId,
				sourceType: 'CONCIERGE_TASK',
				sourceId: taskId,
				title: args.title,
				summary: args.description,
				priority: priority === 'CRITICAL' ? 'URGENT' : 'HIGH'
			});
		}

		return taskId;
	}
});

// Appelé quand la source elle-même se clôture — sens unique : source → tâche, jamais l'inverse
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
