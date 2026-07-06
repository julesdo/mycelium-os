import { v } from 'convex/values';
import { conciergeMutation } from '../functions';

// Mutations d'action rapide — modifient uniquement concierge_tasks, jamais les tables sources

export const updateTaskStatus = conciergeMutation({
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

export const assignTask = conciergeMutation({
	args: { taskId: v.id('concierge_tasks'), assignedTo: v.string() },
	handler: async (ctx, args) => {
		await ctx.db.patch(args.taskId, {
			assignedTo: args.assignedTo,
			updatedAt: Date.now()
		});
	}
});

export const snoozeTask = conciergeMutation({
	args: {
		taskId: v.id('concierge_tasks'),
		snoozedUntil: v.number()
	},
	handler: async (ctx, args) => {
		await ctx.db.patch(args.taskId, {
			status: 'SNOOZED',
			snoozedUntil: args.snoozedUntil,
			updatedAt: Date.now()
		});
	}
});
