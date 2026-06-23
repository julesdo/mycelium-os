import { v, ConvexError } from 'convex/values';
import { authedQuery, authedMutation } from './functions';
import { getUserOrg, requireOrgAdmin } from './lib/auth';
import { components } from './_generated/api';
import { parseBetterAuthUsers } from './admin/types';
import {
	calculateTVS,
	getTVSBand,
	calculateAEN_Forfaitaire,
	calculateAEN_Reel,
	getTVARecoveryRate
} from './fiscalRates';

// ─── Vehicle assignments ──────────────────────────────────────────────────────

export const listAssignments = authedQuery({
	args: { activeOnly: v.optional(v.boolean()) },
	handler: async (ctx, { activeOnly }) => {
		const { organizationId } = await getUserOrg(ctx);
		const rows = await ctx.db
			.query('vehicleAssignments')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();
		if (activeOnly) return rows.filter((r) => !r.endDate);
		return rows;
	}
});

export const createAssignment = authedMutation({
	args: {
		vehicleId: v.id('vehicles'),
		userId: v.string(),
		startDate: v.string(),
		endDate: v.optional(v.string()),
		fuelPaidByCompany: v.boolean(),
		privateUseAllowed: v.boolean(),
		privateKmPerYear: v.optional(v.number()),
		aenMethod: v.union(v.literal('FORFAITAIRE'), v.literal('REEL')),
		notes: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);

		const vehicle = await ctx.db.get(args.vehicleId);
		if (!vehicle || vehicle.organizationId !== organizationId)
			throw new ConvexError('Véhicule introuvable');

		return ctx.db.insert('vehicleAssignments', {
			...args,
			organizationId,
			createdBy: user._id,
			createdAt: Date.now()
		});
	}
});

export const updateAssignment = authedMutation({
	args: {
		assignmentId: v.id('vehicleAssignments'),
		endDate: v.optional(v.string()),
		fuelPaidByCompany: v.optional(v.boolean()),
		privateKmPerYear: v.optional(v.number()),
		aenMethod: v.optional(v.union(v.literal('FORFAITAIRE'), v.literal('REEL'))),
		notes: v.optional(v.string())
	},
	handler: async (ctx, { assignmentId, ...patch }) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);

		const a = await ctx.db.get(assignmentId);
		if (!a || a.organizationId !== organizationId) throw new ConvexError('Attribution introuvable');

		const update: Record<string, unknown> = {};
		if (patch.endDate !== undefined) update.endDate = patch.endDate;
		if (patch.fuelPaidByCompany !== undefined) update.fuelPaidByCompany = patch.fuelPaidByCompany;
		if (patch.privateKmPerYear !== undefined) update.privateKmPerYear = patch.privateKmPerYear;
		if (patch.aenMethod !== undefined) update.aenMethod = patch.aenMethod;
		if (patch.notes !== undefined) update.notes = patch.notes;

		await ctx.db.patch(assignmentId, update as any);
	}
});

export const deleteAssignment = authedMutation({
	args: { assignmentId: v.id('vehicleAssignments') },
	handler: async (ctx, { assignmentId }) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);

		const a = await ctx.db.get(assignmentId);
		if (!a || a.organizationId !== organizationId) throw new ConvexError('Attribution introuvable');

		await ctx.db.delete(assignmentId);
	}
});

// ─── Fiscal summary ───────────────────────────────────────────────────────────

export type TVSLine = {
	vehicleId: string;
	label: string;
	registration: string;
	energy: string;
	co2Gkm: number | null;
	tvsAnnuel: number;
	bandRate: number | null;
	missingData: boolean;
};

export type AENLine = {
	assignmentId: string;
	userId: string;
	vehicleId: string;
	vehicleLabel: string;
	registration: string;
	method: 'FORFAITAIRE' | 'REEL';
	fuelPaidByCompany: boolean;
	ownership: 'company' | 'leased';
	baseAmount: number;
	aenAnnuel: number;
	privateKmPerYear: number | null;
	startDate: string;
	endDate: string | null;
};

export type TVALine = {
	category: string;
	totalAmount: number;
	totalVat: number;
	recoveryRate: number;
	recoverable: number;
};

export const getFiscalSummary = authedQuery({
	args: { year: v.number() },
	handler: async (ctx, { year }) => {
		const { organizationId } = await getUserOrg(ctx);

		const vehicles = await ctx.db
			.query('vehicles')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.filter((q) => q.neq(q.field('status'), 'RETIRED'))
			.collect();

		const vehicleMap = new Map(vehicles.map((v) => [v._id, v]));

		// Costs for the year
		const yearStart = new Date(year, 0, 1).getTime();
		const yearEnd = new Date(year, 11, 31, 23, 59, 59).getTime();

		const costs = await ctx.db
			.query('costs')
			.withIndex('by_org_date', (q) =>
				q.eq('organizationId', organizationId).gte('date', yearStart).lte('date', yearEnd)
			)
			.collect();

		// Assignments active during the year
		const yearStartStr = `${year}-01-01`;
		const yearEndStr = `${year}-12-31`;
		const allAssignments = await ctx.db
			.query('vehicleAssignments')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();
		const assignments = allAssignments.filter(
			(a) => a.startDate <= yearEndStr && (!a.endDate || a.endDate >= yearStartStr)
		);

		// ── TVS per vehicle ────────────────────────────────────────────────────
		const tvsLines: TVSLine[] = vehicles.map((v) => {
			const co2 = v.co2Gkm ?? null;
			if (co2 === null) {
				return {
					vehicleId: v._id,
					label: `${v.brand} ${v.model}`,
					registration: v.registration,
					energy: v.energy,
					co2Gkm: null,
					tvsAnnuel: 0,
					bandRate: null,
					missingData: true
				};
			}
			const tvs = calculateTVS(co2);
			const band = getTVSBand(co2);
			return {
				vehicleId: v._id,
				label: `${v.brand} ${v.model}`,
				registration: v.registration,
				energy: v.energy,
				co2Gkm: co2,
				tvsAnnuel: tvs,
				bandRate: band?.rate ?? null,
				missingData: false
			};
		});

		const totalTVS = tvsLines.reduce((s, l) => s + l.tvsAnnuel, 0);
		const vehiclesMissingCO2 = tvsLines.filter((l) => l.missingData).length;

		// ── AEN per assignment ─────────────────────────────────────────────────
		const aenLines: AENLine[] = assignments.map((a) => {
			const vehicle = vehicleMap.get(a.vehicleId);
			const vehicleCosts = costs.filter((c) => c.vehicleId === a.vehicleId);
			const annualCost = vehicleCosts.reduce((s, c) => s + c.amount, 0);

			// Determine ownership from purchasePrice presence
			const ownership: 'company' | 'leased' = vehicle?.purchasePrice ? 'company' : 'leased';
			const baseAmount = ownership === 'company' ? (vehicle?.purchasePrice ?? annualCost) : annualCost;

			let aenAnnuel = 0;
			if (a.aenMethod === 'REEL' && a.privateKmPerYear) {
				const totalKm = vehicle?.kilometers ?? 0;
				aenAnnuel = calculateAEN_Reel(annualCost, totalKm, a.privateKmPerYear);
			} else {
				aenAnnuel = calculateAEN_Forfaitaire(baseAmount, ownership, a.fuelPaidByCompany);
			}

			// Pro-rate if assignment didn't cover full year
			const aStart = new Date(Math.max(new Date(a.startDate).getTime(), yearStart));
			const aEnd = a.endDate
				? new Date(Math.min(new Date(a.endDate).getTime(), yearEnd))
				: new Date(yearEnd);
			const days = Math.max(0, (aEnd.getTime() - aStart.getTime()) / (1000 * 60 * 60 * 24));
			const fraction = Math.min(days / 365, 1);
			aenAnnuel = Math.round(aenAnnuel * fraction * 100) / 100;

			return {
				assignmentId: a._id,
				userId: a.userId,
				vehicleId: a.vehicleId,
				vehicleLabel: vehicle ? `${vehicle.brand} ${vehicle.model}` : '—',
				registration: vehicle?.registration ?? '—',
				method: a.aenMethod,
				fuelPaidByCompany: a.fuelPaidByCompany,
				ownership,
				baseAmount,
				aenAnnuel,
				privateKmPerYear: a.privateKmPerYear ?? null,
				startDate: a.startDate,
				endDate: a.endDate ?? null
			};
		});

		const totalAEN = Math.round(aenLines.reduce((s, l) => s + l.aenAnnuel, 0));

		// ── TVA récupérable ────────────────────────────────────────────────────
		const tvaByCategory = new Map<string, { total: number; vat: number; rate: number }>();

		for (const cost of costs) {
			const vehicle = cost.vehicleId ? vehicleMap.get(cost.vehicleId) : null;
			const energy = vehicle?.energy ?? 'THERMAL';
			const rate = getTVARecoveryRate(cost.category, energy);
			const vatAmount = cost.vatAmount ?? cost.amount * (1 - 1 / 1.2); // TVA 20% estimée
			const recoverable = vatAmount * rate;

			const existing = tvaByCategory.get(cost.category);
			if (existing) {
				existing.total += cost.amount;
				existing.vat += vatAmount;
			} else {
				tvaByCategory.set(cost.category, { total: cost.amount, vat: vatAmount, rate });
			}
			// Update recoverable via rate
			const entry = tvaByCategory.get(cost.category)!;
			entry.rate = rate; // last seen rate for this category (consistent per category)
			void recoverable; // used implicitly via entry.vat * entry.rate at output
		}

		const tvaLines: TVALine[] = Array.from(tvaByCategory.entries()).map(
			([category, { total, vat, rate }]) => ({
				category,
				totalAmount: Math.round(total),
				totalVat: Math.round(vat),
				recoveryRate: rate,
				recoverable: Math.round(vat * rate)
			})
		);

		const totalTVARecovery = tvaLines.reduce((s, l) => s + l.recoverable, 0);

		// ── Resolve user display names ─────────────────────────────────────────
		const userIds = [...new Set(aenLines.map((l) => l.userId))];
		let userNames = new Map<string, string>();
		if (userIds.length > 0) {
			const raw = (await ctx.runQuery(components.betterAuth.adapter.findMany, {
				model: 'user',
				where: [{ field: '_id', operator: 'in', value: userIds }],
				paginationOpts: { cursor: null, numItems: userIds.length + 10 }
			})) as { page: unknown[]; isDone: boolean; continueCursor: string | null };
			const parsed = parseBetterAuthUsers(raw.page);
			userNames = new Map(parsed.map((u) => [u._id, u.name ?? u.email]));
		}

		const aenLinesWithNames = aenLines.map((l) => ({
			...l,
			userName: userNames.get(l.userId) ?? l.userId
		}));

		return {
			year,
			totalTVS,
			totalAEN,
			totalTVARecovery,
			vehiclesMissingCO2,
			tvsLines,
			aenLines: aenLinesWithNames,
			tvaLines
		};
	}
});

// ─── List org members (for assignment form) ───────────────────────────────────

export const listOrgMembersForAssignment = authedQuery({
	args: {},
	handler: async (ctx) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);

		const members = await ctx.db
			.query('organizationMembers')
			.withIndex('by_organization', (q) => q.eq('organizationId', organizationId))
			.collect();

		const userIds = members.map((m) => m.userId);
		if (userIds.length === 0) return [];

		const raw = (await ctx.runQuery(components.betterAuth.adapter.findMany, {
			model: 'user',
			where: [{ field: '_id', operator: 'in', value: userIds }],
			paginationOpts: { cursor: null, numItems: userIds.length + 10 }
		})) as { page: unknown[]; isDone: boolean; continueCursor: string | null };
		const parsed = parseBetterAuthUsers(raw.page);
		const nameMap = new Map(parsed.map((u) => [u._id, { name: u.name ?? u.email, email: u.email }]));

		return members.map((m) => ({
			userId: m.userId,
			role: m.role,
			name: nameMap.get(m.userId)?.name ?? m.userId,
			email: nameMap.get(m.userId)?.email ?? ''
		}));
	}
});

// ─── Patch vehicle fiscal data ─────────────────────────────────────────────────

export const updateVehicleFiscalData = authedMutation({
	args: {
		vehicleId: v.id('vehicles'),
		co2Gkm: v.optional(v.number()),
		purchasePrice: v.optional(v.number())
	},
	handler: async (ctx, { vehicleId, co2Gkm, purchasePrice }) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);

		const v = await ctx.db.get(vehicleId);
		if (!v || v.organizationId !== organizationId) throw new ConvexError('Véhicule introuvable');

		const patch: Record<string, unknown> = {};
		if (co2Gkm !== undefined) patch.co2Gkm = co2Gkm;
		if (purchasePrice !== undefined) patch.purchasePrice = purchasePrice;
		await ctx.db.patch(vehicleId, patch as any);
	}
});
