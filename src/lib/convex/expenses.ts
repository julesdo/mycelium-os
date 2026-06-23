import { v, ConvexError } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { authedQuery, authedMutation } from './functions';
import { getUserOrg } from './lib/auth';
import {
	calculateMileageAmount,
	getDefaultRates,
	getRateForCategory,
	type VehicleCategory
} from './mileageRates';
import { components, internal } from './_generated/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function requireOrgAdminOrManager(
	ctx: Parameters<typeof getUserOrg>[0],
	organizationId: Id<'organizations'>,
	userId: string
) {
	const membership = await ctx.db
		.query('organizationMembers')
		.withIndex('by_org_and_user', (q) => q.eq('organizationId', organizationId).eq('userId', userId))
		.unique();

	if (!membership || (membership.role !== 'ORG_ADMIN' && membership.role !== 'ORG_MANAGER')) {
		throw new ConvexError('Accès refusé : rôle ORG_ADMIN ou ORG_MANAGER requis');
	}
}

// Resolve the effective mileage rate for a category within an org.
// Priority: org custom config → country defaults → FR fallback.
async function resolveRate(
	ctx: Parameters<typeof getUserOrg>[0],
	organizationId: Id<'organizations'>,
	category: VehicleCategory
): Promise<{ ratePerUnit: number; distanceUnit: 'km' | 'mile' }> {
	const org = await ctx.db.get(organizationId);
	const distanceUnit = org?.distanceUnit ?? 'km';

	const customConfig = await ctx.db
		.query('mileageRateConfigs')
		.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
		.unique();

	if (customConfig) {
		const entry = customConfig.rates.find((r) => r.category === category);
		if (entry) return { ratePerUnit: entry.ratePerUnit, distanceUnit };
	}

	const defaults = getDefaultRates(org?.country);
	const entry = getRateForCategory(defaults.rates, category);
	return { ratePerUnit: entry?.ratePerUnit ?? 0, distanceUnit };
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export const createExpense = authedMutation({
	args: {
		date: v.string(),
		purpose: v.string(),
		departureLocation: v.string(),
		arrivalLocation: v.string(),
		roundTrip: v.boolean(),
		distance: v.number(),
		vehicleCategory: v.union(
			v.literal('ELECTRIC'),
			v.literal('HYBRID'),
			v.literal('THERMAL'),
			v.literal('UTILITY')
		),
		vehicleDescription: v.optional(v.string()),
		notes: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const { user, organizationId } = await getUserOrg(ctx);
		const { ratePerUnit, distanceUnit } = await resolveRate(ctx, organizationId, args.vehicleCategory);

		const totalDistance = args.roundTrip ? args.distance * 2 : args.distance;
		const calculatedAmount = calculateMileageAmount(totalDistance, ratePerUnit);

		const now = Date.now();
		return ctx.db.insert('mileageExpenses', {
			organizationId,
			userId: user._id,
			date: args.date,
			purpose: args.purpose,
			departureLocation: args.departureLocation,
			arrivalLocation: args.arrivalLocation,
			roundTrip: args.roundTrip,
			distance: totalDistance,
			distanceUnit,
			vehicleCategory: args.vehicleCategory,
			ratePerUnit,
			vehicleDescription: args.vehicleDescription,
			calculatedAmount,
			status: 'SUBMITTED',
			notes: args.notes,
			createdAt: now,
			updatedAt: now
		});
	}
});

export const deleteExpense = authedMutation({
	args: { expenseId: v.id('mileageExpenses') },
	handler: async (ctx, { expenseId }) => {
		const { user, organizationId } = await getUserOrg(ctx);

		const expense = await ctx.db.get(expenseId);
		if (!expense || expense.organizationId !== organizationId) {
			throw new ConvexError('Note de frais introuvable');
		}
		if (expense.userId !== user._id) {
			throw new ConvexError('Vous ne pouvez supprimer que vos propres notes de frais');
		}
		if (expense.status !== 'SUBMITTED' && expense.status !== 'DRAFT') {
			throw new ConvexError('Seules les notes en attente peuvent être supprimées');
		}

		await ctx.db.delete(expenseId);
	}
});

export const approveExpense = authedMutation({
	args: { expenseId: v.id('mileageExpenses') },
	handler: async (ctx, { expenseId }) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdminOrManager(ctx, organizationId, user._id);

		const expense = await ctx.db.get(expenseId);
		if (!expense || expense.organizationId !== organizationId) {
			throw new ConvexError('Note de frais introuvable');
		}
		if (expense.status !== 'SUBMITTED') {
			throw new ConvexError('Seules les notes soumises peuvent être approuvées');
		}

		await ctx.db.patch(expenseId, {
			status: 'APPROVED',
			approvedBy: user._id,
			approvedAt: Date.now(),
			updatedAt: Date.now()
		});
		await ctx.scheduler.runAfter(
			0,
			internal.integrations.accounting.pushEntityToAccounting,
			{ entityType: 'EXPENSE', entityId: expenseId, organizationId }
		);
	}
});

export const rejectExpense = authedMutation({
	args: { expenseId: v.id('mileageExpenses'), reason: v.string() },
	handler: async (ctx, { expenseId, reason }) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdminOrManager(ctx, organizationId, user._id);

		const expense = await ctx.db.get(expenseId);
		if (!expense || expense.organizationId !== organizationId) {
			throw new ConvexError('Note de frais introuvable');
		}
		if (expense.status === 'APPROVED' || expense.status === 'PAID') {
			throw new ConvexError('Une note approuvée ou payée ne peut plus être rejetée');
		}

		await ctx.db.patch(expenseId, {
			status: 'REJECTED',
			rejectionReason: reason,
			updatedAt: Date.now()
		});
	}
});

export const markExpensePaid = authedMutation({
	args: { expenseId: v.id('mileageExpenses') },
	handler: async (ctx, { expenseId }) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdminOrManager(ctx, organizationId, user._id);

		const expense = await ctx.db.get(expenseId);
		if (!expense || expense.organizationId !== organizationId) {
			throw new ConvexError('Note de frais introuvable');
		}
		if (expense.status !== 'APPROVED') {
			throw new ConvexError('Seules les notes approuvées peuvent être marquées comme payées');
		}

		await ctx.db.patch(expenseId, {
			status: 'PAID',
			paidAt: Date.now(),
			updatedAt: Date.now()
		});
	}
});

export const updateMileageRateConfig = authedMutation({
	args: {
		rates: v.array(v.object({
			category: v.union(
				v.literal('ELECTRIC'),
				v.literal('HYBRID'),
				v.literal('THERMAL'),
				v.literal('UTILITY')
			),
			ratePerUnit: v.number(),
			label: v.optional(v.string())
		}))
	},
	handler: async (ctx, { rates }) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdminOrManager(ctx, organizationId, user._id);

		const existing = await ctx.db
			.query('mileageRateConfigs')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.unique();

		if (existing) {
			await ctx.db.patch(existing._id, { rates, updatedAt: Date.now() });
		} else {
			await ctx.db.insert('mileageRateConfigs', {
				organizationId,
				rates,
				updatedAt: Date.now()
			});
		}
	}
});

// ─── Queries ──────────────────────────────────────────────────────────────────

export const getMileageRateConfig = authedQuery({
	args: {},
	handler: async (ctx) => {
		const { organizationId } = await getUserOrg(ctx);

		const org = await ctx.db.get(organizationId);
		const customConfig = await ctx.db
			.query('mileageRateConfigs')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.unique();

		const defaults = getDefaultRates(org?.country);

		return {
			distanceUnit: org?.distanceUnit ?? defaults.unit,
			currency: org?.currency ?? defaults.currency,
			country: org?.country ?? 'FR',
			rates: customConfig?.rates ?? defaults.rates
		};
	}
});

export const listMyExpenses = authedQuery({
	args: {
		year: v.optional(v.number()),
		status: v.optional(v.string())
	},
	handler: async (ctx, { year, status }) => {
		const { user, organizationId } = await getUserOrg(ctx);

		const expenses = await ctx.db
			.query('mileageExpenses')
			.withIndex('by_org_and_user', (q) =>
				q.eq('organizationId', organizationId).eq('userId', user._id)
			)
			.order('desc')
			.collect();

		return expenses.filter((e) => {
			const matchYear = !year || new Date(e.date).getFullYear() === year;
			const matchStatus = !status || e.status === status;
			return matchYear && matchStatus;
		});
	}
});

export const getMyExpenseStats = authedQuery({
	args: { year: v.optional(v.number()) },
	handler: async (ctx, { year }) => {
		const { user, organizationId } = await getUserOrg(ctx);
		const targetYear = year ?? new Date().getFullYear();

		const expenses = await ctx.db
			.query('mileageExpenses')
			.withIndex('by_org_and_user', (q) =>
				q.eq('organizationId', organizationId).eq('userId', user._id)
			)
			.collect();

		const yearExpenses = expenses.filter(
			(e) => new Date(e.date).getFullYear() === targetYear && e.status !== 'REJECTED'
		);

		return {
			totalDistance: yearExpenses.reduce((s, e) => s + (e.distance ?? 0), 0),
			totalAmount: yearExpenses.reduce((s, e) => s + e.calculatedAmount, 0),
			pendingAmount: yearExpenses
				.filter((e) => e.status === 'SUBMITTED')
				.reduce((s, e) => s + e.calculatedAmount, 0),
			approvedAmount: yearExpenses
				.filter((e) => e.status === 'APPROVED' || e.status === 'PAID')
				.reduce((s, e) => s + e.calculatedAmount, 0),
			count: yearExpenses.length
		};
	}
});

type BAUser = { id?: string; name?: string; email?: string };
type AdapterResult = { page: unknown[]; isDone: boolean; continueCursor: string | null };

export const listOrgExpenses = authedQuery({
	args: {
		status: v.optional(v.string()),
		year: v.optional(v.number())
	},
	handler: async (ctx, { status, year }) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdminOrManager(ctx, organizationId, user._id);

		const expenses = await ctx.db
			.query('mileageExpenses')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.order('desc')
			.collect();

		const filtered = expenses.filter((e) => {
			const matchYear = !year || new Date(e.date).getFullYear() === year;
			const matchStatus = !status || e.status === status;
			return matchYear && matchStatus;
		});

		const userIds = [...new Set(filtered.map((e) => e.userId))];
		const userMap = new Map<string, { name: string | null; email: string | null }>();

		for (const uid of userIds) {
			const result = (await ctx.runQuery(components.betterAuth.adapter.findMany, {
				model: 'user',
				where: [{ field: 'id', operator: 'eq' as const, value: uid }],
				paginationOpts: { cursor: null, numItems: 1 }
			})) as AdapterResult;
			const u = (result.page as BAUser[])[0] ?? null;
			userMap.set(uid, { name: u?.name ?? null, email: u?.email ?? null });
		}

		return filtered.map((e) => ({
			...e,
			user: userMap.get(e.userId) ?? { name: null, email: null }
		}));
	}
});

export const getOrgExpenseStats = authedQuery({
	args: { year: v.optional(v.number()) },
	handler: async (ctx, { year }) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdminOrManager(ctx, organizationId, user._id);

		const targetYear = year ?? new Date().getFullYear();
		const expenses = await ctx.db
			.query('mileageExpenses')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();

		const yearExpenses = expenses.filter(
			(e) => new Date(e.date).getFullYear() === targetYear
		);

		return {
			total: yearExpenses.length,
			pending: yearExpenses.filter((e) => e.status === 'SUBMITTED').length,
			approved: yearExpenses.filter((e) => e.status === 'APPROVED').length,
			paid: yearExpenses.filter((e) => e.status === 'PAID').length,
			rejected: yearExpenses.filter((e) => e.status === 'REJECTED').length,
			totalAmount: yearExpenses
				.filter((e) => e.status !== 'REJECTED')
				.reduce((s, e) => s + e.calculatedAmount, 0),
			pendingAmount: yearExpenses
				.filter((e) => e.status === 'SUBMITTED')
				.reduce((s, e) => s + e.calculatedAmount, 0)
		};
	}
});
