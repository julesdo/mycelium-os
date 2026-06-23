import { v, ConvexError } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { authedQuery, authedMutation } from './functions';
import { getUserOrg, requireOrgAdmin } from './lib/auth';
import { internal } from './_generated/api';

const categoryValidator = v.union(
	v.literal('LEASING'),
	v.literal('CARBURANT'),
	v.literal('ENTRETIEN'),
	v.literal('ASSURANCE'),
	v.literal('TAXES'),
	v.literal('SINISTRE'),
	v.literal('PARKING'),
	v.literal('TELEPEAGE'),
	v.literal('AUTRE')
);

const sourceValidator = v.union(v.literal('MANUAL'), v.literal('IMPORT'), v.literal('API'));

// ─── Queries ──────────────────────────────────────────────────────────────────

export const listCosts = authedQuery({
	args: {
		vehicleId: v.optional(v.id('vehicles')),
		category: v.optional(categoryValidator),
		source: v.optional(sourceValidator),
		fromDate: v.optional(v.number()),
		toDate: v.optional(v.number()),
		limit: v.optional(v.number())
	},
	handler: async (ctx, { vehicleId, category, source, fromDate, toDate, limit }) => {
		const { organizationId } = await getUserOrg(ctx);

		let costs = await ctx.db
			.query('costs')
			.withIndex('by_org_date', (q) => q.eq('organizationId', organizationId))
			.order('desc')
			.collect();

		if (vehicleId) costs = costs.filter((c) => c.vehicleId === vehicleId);
		if (category) costs = costs.filter((c) => c.category === category);
		if (source) costs = costs.filter((c) => c.source === source);
		if (fromDate != null) costs = costs.filter((c) => c.date >= fromDate);
		if (toDate != null) costs = costs.filter((c) => c.date <= toDate);

		return limit ? costs.slice(0, limit) : costs;
	}
});

export const getCostsByVehicle = authedQuery({
	args: {
		fromDate: v.optional(v.number()),
		toDate: v.optional(v.number())
	},
	handler: async (ctx, { fromDate, toDate }) => {
		const { organizationId } = await getUserOrg(ctx);

		let costs = await ctx.db
			.query('costs')
			.withIndex('by_org_date', (q) => q.eq('organizationId', organizationId))
			.collect();

		if (fromDate != null) costs = costs.filter((c) => c.date >= fromDate);
		if (toDate != null) costs = costs.filter((c) => c.date <= toDate);

		const byVehicle = new Map<string, { total: number; byCategory: Record<string, number> }>();

		for (const cost of costs) {
			const key = cost.vehicleId ?? '__global__';
			if (!byVehicle.has(key)) byVehicle.set(key, { total: 0, byCategory: {} });
			const entry = byVehicle.get(key)!;
			entry.total += cost.amount;
			entry.byCategory[cost.category] = (entry.byCategory[cost.category] ?? 0) + cost.amount;
		}

		return Array.from(byVehicle.entries()).map(([vehicleId, data]) => ({
			vehicleId: vehicleId === '__global__' ? null : vehicleId,
			...data
		}));
	}
});

export const getCostsByCategory = authedQuery({
	args: {
		fromDate: v.optional(v.number()),
		toDate: v.optional(v.number()),
		vehicleId: v.optional(v.id('vehicles'))
	},
	handler: async (ctx, { fromDate, toDate, vehicleId }) => {
		const { organizationId } = await getUserOrg(ctx);

		let costs = await ctx.db
			.query('costs')
			.withIndex('by_org_date', (q) => q.eq('organizationId', organizationId))
			.collect();

		if (fromDate != null) costs = costs.filter((c) => c.date >= fromDate);
		if (toDate != null) costs = costs.filter((c) => c.date <= toDate);
		if (vehicleId) costs = costs.filter((c) => c.vehicleId === vehicleId);

		const byCategory = new Map<string, { total: number; count: number }>();

		for (const cost of costs) {
			if (!byCategory.has(cost.category)) byCategory.set(cost.category, { total: 0, count: 0 });
			const entry = byCategory.get(cost.category)!;
			entry.total += cost.amount;
			entry.count += 1;
		}

		return Array.from(byCategory.entries()).map(([category, data]) => ({
			category,
			total: data.total,
			count: data.count,
			average: data.total / data.count
		}));
	}
});

export const getCostsTotalForPeriod = authedQuery({
	args: {
		fromDate: v.number(),
		toDate: v.number(),
		vehicleId: v.optional(v.id('vehicles'))
	},
	handler: async (ctx, { fromDate, toDate, vehicleId }) => {
		const { organizationId } = await getUserOrg(ctx);

		let costs = await ctx.db
			.query('costs')
			.withIndex('by_org_date', (q) =>
				q.eq('organizationId', organizationId).gte('date', fromDate).lte('date', toDate)
			)
			.collect();

		if (vehicleId) costs = costs.filter((c) => c.vehicleId === vehicleId);

		return costs.reduce((sum, c) => sum + c.amount, 0);
	}
});

export const getFinancialKPIs = authedQuery({
	args: {
		fromDate: v.number(),
		toDate: v.number(),
		prevFromDate: v.number(),
		prevToDate: v.number()
	},
	handler: async (ctx, { fromDate, toDate, prevFromDate, prevToDate }) => {
		const { organizationId } = await getUserOrg(ctx);

		const allCosts = await ctx.db
			.query('costs')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();

		const current = allCosts.filter((c) => c.date >= fromDate && c.date <= toDate);
		const previous = allCosts.filter((c) => c.date >= prevFromDate && c.date <= prevToDate);

		const totalCurrent = current.reduce((s, c) => s + c.amount, 0);
		const totalPrevious = previous.reduce((s, c) => s + c.amount, 0);

		const vehicleIds = new Set(current.map((c) => c.vehicleId).filter(Boolean));
		const vehicleCount = vehicleIds.size || 1;

		const byCategory: Record<string, number> = {};
		for (const cost of current) {
			byCategory[cost.category] = (byCategory[cost.category] ?? 0) + cost.amount;
		}

		const evolutionPct =
			totalPrevious === 0
				? null
				: Math.round(((totalCurrent - totalPrevious) / totalPrevious) * 100 * 10) / 10;

		return {
			totalCurrent,
			totalPrevious,
			evolutionPct,
			avgCostPerVehicle: Math.round((totalCurrent / vehicleCount) * 100) / 100,
			byCategory,
			costCount: current.length
		};
	}
});

// ─── Mutations ────────────────────────────────────────────────────────────────

export const createCost = authedMutation({
	args: {
		vehicleId: v.optional(v.id('vehicles')),
		category: categoryValidator,
		amount: v.number(),
		vatAmount: v.optional(v.number()),
		date: v.number(),
		description: v.string(),
		invoiceUrl: v.optional(v.string()),
		invoiceStorageId: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);

		if (args.amount <= 0) throw new ConvexError('Le montant doit être positif');

		if (args.vehicleId) {
			const vehicle = await ctx.db.get(args.vehicleId);
			if (!vehicle || vehicle.organizationId !== organizationId)
				throw new ConvexError('Véhicule introuvable');
		}

		const costId = await ctx.db.insert('costs', {
			...args,
			organizationId,
			source: 'MANUAL',
			createdBy: user._id,
			createdAt: Date.now()
		});
		await ctx.scheduler.runAfter(
			0,
			internal.integrations.accounting.pushEntityToAccounting,
			{ entityType: 'COST', entityId: costId, organizationId }
		);
		return costId;
	}
});

export const updateCost = authedMutation({
	args: {
		costId: v.id('costs'),
		vehicleId: v.optional(v.id('vehicles')),
		category: v.optional(categoryValidator),
		amount: v.optional(v.number()),
		vatAmount: v.optional(v.number()),
		date: v.optional(v.number()),
		description: v.optional(v.string()),
		invoiceUrl: v.optional(v.string()),
		invoiceStorageId: v.optional(v.string())
	},
	handler: async (ctx, { costId, ...fields }) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);

		const cost = await ctx.db.get(costId);
		if (!cost) throw new ConvexError('Coût introuvable');
		if (cost.organizationId !== organizationId) throw new ConvexError('Accès refusé');

		if (fields.amount != null && fields.amount <= 0)
			throw new ConvexError('Le montant doit être positif');

		if (fields.vehicleId) {
			const vehicle = await ctx.db.get(fields.vehicleId);
			if (!vehicle || vehicle.organizationId !== organizationId)
				throw new ConvexError('Véhicule introuvable');
		}

		await ctx.db.patch(costId, fields);
		await ctx.scheduler.runAfter(
			0,
			internal.integrations.accounting.pushEntityToAccounting,
			{ entityType: 'COST', entityId: costId, organizationId }
		);
	}
});

export const deleteCost = authedMutation({
	args: { costId: v.id('costs') },
	handler: async (ctx, { costId }) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);

		const cost = await ctx.db.get(costId);
		if (!cost) throw new ConvexError('Coût introuvable');
		if (cost.organizationId !== organizationId) throw new ConvexError('Accès refusé');

		await ctx.db.delete(costId);
	}
});

export const bulkImportCosts = authedMutation({
	args: {
		costs: v.array(
			v.object({
				vehicleId: v.optional(v.id('vehicles')),
				category: categoryValidator,
				amount: v.number(),
				vatAmount: v.optional(v.number()),
				date: v.number(),
				description: v.string(),
				invoiceUrl: v.optional(v.string())
			})
		)
	},
	handler: async (ctx, { costs }) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);

		const orgVehicleIds = new Set(
			(
				await ctx.db
					.query('vehicles')
					.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
					.collect()
			).map((v) => v._id)
		);

		let inserted = 0;
		const errors: { index: number; reason: string }[] = [];

		for (let i = 0; i < costs.length; i++) {
			const item = costs[i];

			if (item.amount <= 0) {
				errors.push({ index: i, reason: 'Montant invalide' });
				continue;
			}

			if (item.vehicleId && !orgVehicleIds.has(item.vehicleId)) {
				errors.push({ index: i, reason: 'Véhicule hors organisation' });
				continue;
			}

			const costId = await ctx.db.insert('costs', {
				...item,
				organizationId,
				source: 'IMPORT',
				createdBy: user._id,
				createdAt: Date.now()
			});
			await ctx.scheduler.runAfter(
				0,
				internal.integrations.accounting.pushEntityToAccounting,
				{ entityType: 'COST', entityId: costId, organizationId }
			);
			inserted++;
		}

		return { inserted, errors };
	}
});

export const bulkDeleteCosts = authedMutation({
	args: { costIds: v.array(v.id('costs')) },
	handler: async (ctx, { costIds }) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);

		for (const costId of costIds) {
			const cost = await ctx.db.get(costId);
			if (!cost || cost.organizationId !== organizationId) continue;
			await ctx.db.delete(costId);
		}
		return { deleted: costIds.length };
	}
});

export const generateInvoiceUploadUrl = authedMutation({
	args: {},
	handler: async (ctx) => {
		await getUserOrg(ctx);
		return ctx.storage.generateUploadUrl();
	}
});

export const getInvoiceUrl = authedQuery({
	args: { storageId: v.string() },
	handler: async (ctx, { storageId }) => {
		await getUserOrg(ctx);
		return ctx.storage.getUrl(storageId as Id<'_storage'>);
	}
});
