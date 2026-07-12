import { v } from 'convex/values';
import { salesQuery, salesMutation } from '../functions';
import { internalQuery, internalMutation } from '../_generated/server';

export const listMyProspects = salesQuery({
	args: { stage: v.optional(v.string()) },
	handler: async (ctx, { stage }) => {
		let prospects = await ctx.db
			.query('salesProspects')
			.withIndex('by_sales', (q) => q.eq('salesUserId', ctx.user._id))
			.order('desc')
			.collect();
		if (stage) {
			prospects = prospects.filter((p) => p.stage === stage);
		}
		return prospects;
	}
});

export const getProspect = salesQuery({
	args: { prospectId: v.id('salesProspects') },
	handler: async (ctx, { prospectId }) => {
		const prospect = await ctx.db.get(prospectId);
		if (!prospect) return null;
		if (prospect.salesUserId !== ctx.user._id && ctx.staffRole !== 'super_admin') {
			return null;
		}
		return prospect;
	}
});

export const createProspect = salesMutation({
	args: {
		companyName: v.string(),
		sector: v.string(),
		estimatedFleetSize: v.number(),
		country: v.string(),
		contactName: v.string(),
		contactEmail: v.optional(v.string()),
		contactPhone: v.optional(v.string()),
		notes: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		return await ctx.db.insert('salesProspects', {
			...args,
			salesUserId: ctx.user._id,
			stage: 'discovery',
			lastActivityAt: Date.now(),
			createdAt: Date.now()
		});
	}
});

export const updateProspect = salesMutation({
	args: {
		prospectId: v.id('salesProspects'),
		companyName: v.optional(v.string()),
		sector: v.optional(v.string()),
		estimatedFleetSize: v.optional(v.number()),
		country: v.optional(v.string()),
		contactName: v.optional(v.string()),
		contactEmail: v.optional(v.string()),
		contactPhone: v.optional(v.string()),
		notes: v.optional(v.string()),
		demoOrgId: v.optional(v.id('organizations'))
	},
	handler: async (ctx, { prospectId, ...updates }) => {
		const prospect = await ctx.db.get(prospectId);
		if (!prospect || (prospect.salesUserId !== ctx.user._id && ctx.staffRole !== 'super_admin')) {
			throw new Error('Prospect non trouvé');
		}
		await ctx.db.patch(prospectId, { ...updates, lastActivityAt: Date.now() });
	}
});

export const updateProspectStage = salesMutation({
	args: {
		prospectId: v.id('salesProspects'),
		stage: v.union(
			v.literal('discovery'),
			v.literal('demo'),
			v.literal('negotiation'),
			v.literal('won'),
			v.literal('lost')
		),
		lostReason: v.optional(v.string())
	},
	handler: async (ctx, { prospectId, stage, lostReason }) => {
		const prospect = await ctx.db.get(prospectId);
		if (!prospect || (prospect.salesUserId !== ctx.user._id && ctx.staffRole !== 'super_admin')) {
			throw new Error('Prospect non trouvé');
		}
		await ctx.db.patch(prospectId, { stage, lostReason, lastActivityAt: Date.now() });
	}
});

export const addProspectNote = salesMutation({
	args: { prospectId: v.id('salesProspects'), note: v.string() },
	handler: async (ctx, { prospectId, note }) => {
		const prospect = await ctx.db.get(prospectId);
		if (!prospect || (prospect.salesUserId !== ctx.user._id && ctx.staffRole !== 'super_admin')) {
			throw new Error('Prospect non trouvé');
		}
		const currentNotes = prospect.notes ?? '';
		const timestamp = new Date().toLocaleDateString('fr-FR', {
			day: '2-digit',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		});
		await ctx.db.patch(prospectId, {
			notes: `[${timestamp}] ${note}\n\n${currentNotes}`.trim(),
			lastActivityAt: Date.now()
		});
	}
});

export const deleteProspect = salesMutation({
	args: { prospectId: v.id('salesProspects') },
	handler: async (ctx, { prospectId }) => {
		const prospect = await ctx.db.get(prospectId);
		if (!prospect || (prospect.salesUserId !== ctx.user._id && ctx.staffRole !== 'super_admin')) {
			throw new Error('Prospect non trouvé');
		}
		await ctx.db.delete(prospectId);
	}
});

// ── Variantes internes pour l'Agent Commercial ───────────────────────────────

export const getProspectsForUser = internalQuery({
	args: { salesUserId: v.string() },
	handler: async (ctx, { salesUserId }) => {
		return await ctx.db
			.query('salesProspects')
			.withIndex('by_sales', (q) => q.eq('salesUserId', salesUserId))
			.order('desc')
			.collect();
	}
});

export const addProspectNoteInternal = internalMutation({
	args: {
		salesUserId: v.string(),
		prospectId: v.id('salesProspects'),
		note: v.string()
	},
	handler: async (ctx, { salesUserId, prospectId, note }) => {
		const prospect = await ctx.db.get(prospectId);
		if (!prospect || prospect.salesUserId !== salesUserId) throw new Error('Prospect non trouvé');
		const currentNotes = prospect.notes ?? '';
		const timestamp = new Date().toLocaleDateString('fr-FR', {
			day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
		});
		await ctx.db.patch(prospectId, {
			notes: `[${timestamp}] ${note}\n\n${currentNotes}`.trim(),
			lastActivityAt: Date.now()
		});
	}
});
