import { v, ConvexError } from 'convex/values';
import { authedQuery, authedMutation } from './functions';
import { getUserOrg, requireOrgAdmin } from './lib/auth';
import {
	calculateBik,
	projectEvSavings,
	fuelTypeFromEnergy,
	currentTaxYear,
	type BikTaxYear
} from './bikRates';

// ─── Fleet BiK report ─────────────────────────────────────────────────────────

export const getFleetBikReport = authedQuery({
	args: { taxYear: v.optional(v.string()) },
	handler: async (ctx, { taxYear }) => {
		const { organizationId } = await getUserOrg(ctx);
		const year = (taxYear as BikTaxYear | undefined) ?? currentTaxYear();

		const vehicles = await ctx.db
			.query('vehicles')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.filter((q) => q.neq(q.field('status'), 'RETIRED'))
			.collect();

		let totalBikValue = 0;
		let totalEmployerNic = 0;
		let totalEmployeeBasicTax = 0;
		let electricCount = 0;
		let missingP11dCount = 0;

		const vehicleRows = vehicles.map((v) => {
			if (!v.p11dValue || !v.co2Gkm) {
				missingP11dCount++;
				return {
					_id: v._id,
					registration: v.registration,
					brand: v.brand,
					model: v.model,
					energy: v.energy,
					co2Gkm: v.co2Gkm ?? null,
					p11dValue: v.p11dValue ?? null,
					electricRangeMiles: v.electricRangeMiles ?? null,
					bikRate: null,
					bikValue: null,
					employeeBasicTax: null,
					employeeHigherTax: null,
					employerNic: null,
					evSavingNic: null,
					missingData: true
				};
			}

			const fuelType = fuelTypeFromEnergy(v.energy);
			const bik = calculateBik(v.p11dValue, {
				co2Gkm: v.co2Gkm,
				fuelType,
				electricRangeMiles: v.electricRangeMiles,
				taxYear: year
			});

			totalBikValue += bik.bikValue;
			totalEmployerNic += bik.employerNic;
			totalEmployeeBasicTax += bik.employeeBasicTax;
			if (v.energy === 'ELECTRIC') electricCount++;

			// EV conversion saving — only for non-EV vehicles
			let evSavingNic: number | null = null;
			if (v.energy !== 'ELECTRIC') {
				const projection = projectEvSavings(
					v.p11dValue,
					{ co2Gkm: v.co2Gkm, fuelType, electricRangeMiles: v.electricRangeMiles },
					year
				);
				evSavingNic = projection.employerNicSaving;
			}

			return {
				_id: v._id,
				registration: v.registration,
				brand: v.brand,
				model: v.model,
				energy: v.energy,
				co2Gkm: v.co2Gkm,
				p11dValue: v.p11dValue,
				electricRangeMiles: v.electricRangeMiles ?? null,
				bikRate: bik.bikRate,
				bikValue: bik.bikValue,
				employeeBasicTax: bik.employeeBasicTax,
				employeeHigherTax: bik.employeeHigherTax,
				employerNic: bik.employerNic,
				evSavingNic,
				missingData: false
			};
		});

		// Sort: highest BiK value first, missing data last
		vehicleRows.sort((a, b) => {
			if (a.missingData && !b.missingData) return 1;
			if (!a.missingData && b.missingData) return -1;
			return (b.bikValue ?? 0) - (a.bikValue ?? 0);
		});

		const totalVehicles = vehicles.length;
		const electricPct = totalVehicles > 0 ? Math.round((electricCount / totalVehicles) * 100) : 0;

		// Top 3 EV conversion opportunities (by NIC saving)
		const evOpportunities = vehicleRows
			.filter((r) => !r.missingData && (r.evSavingNic ?? 0) > 0)
			.sort((a, b) => (b.evSavingNic ?? 0) - (a.evSavingNic ?? 0))
			.slice(0, 3)
			.map((r) => ({
				registration: r.registration,
				model: `${r.brand} ${r.model}`,
				currentBikRate: r.bikRate!,
				evBikRate: year === '2024-25' ? 2 : year === '2025-26' ? 3 : year === '2026-27' ? 4 : 5,
				nicSavingPerYear: r.evSavingNic!
			}));

		return {
			taxYear: year,
			summary: {
				totalVehicles,
				vehiclesWithP11d: totalVehicles - missingP11dCount,
				missingP11dCount,
				electricCount,
				electricPct,
				totalBikValue: Math.round(totalBikValue * 100) / 100,
				totalEmployerNic: Math.round(totalEmployerNic * 100) / 100,
				totalEmployeeBasicTax: Math.round(totalEmployeeBasicTax * 100) / 100,
				potentialNicSaving: Math.round(
					vehicleRows.reduce((sum, r) => sum + (r.evSavingNic ?? 0), 0) * 100
				) / 100
			},
			vehicles: vehicleRows,
			evOpportunities
		};
	}
});

// ─── P11D + electric range update ────────────────────────────────────────────

export const setVehicleP11d = authedMutation({
	args: {
		vehicleId: v.id('vehicles'),
		p11dValue: v.optional(v.number()),
		electricRangeMiles: v.optional(v.number())
	},
	handler: async (ctx, { vehicleId, p11dValue, electricRangeMiles }) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);

		const vehicle = await ctx.db.get(vehicleId);
		if (!vehicle || vehicle.organizationId !== organizationId) {
			throw new ConvexError('Véhicule introuvable');
		}

		if (p11dValue !== undefined && p11dValue < 0) {
			throw new ConvexError('P11D value must be positive');
		}

		await ctx.db.patch(vehicleId, {
			...(p11dValue !== undefined ? { p11dValue } : {}),
			...(electricRangeMiles !== undefined ? { electricRangeMiles } : {})
		});
	}
});

// ─── Bulk P11D import ─────────────────────────────────────────────────────────

export const bulkSetP11d = authedMutation({
	args: {
		entries: v.array(v.object({
			vehicleId: v.id('vehicles'),
			p11dValue: v.number(),
			electricRangeMiles: v.optional(v.number())
		}))
	},
	handler: async (ctx, { entries }) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);

		let updated = 0;
		for (const entry of entries) {
			const vehicle = await ctx.db.get(entry.vehicleId);
			if (!vehicle || vehicle.organizationId !== organizationId) continue;
			await ctx.db.patch(entry.vehicleId, {
				p11dValue: entry.p11dValue,
				...(entry.electricRangeMiles !== undefined ? { electricRangeMiles: entry.electricRangeMiles } : {})
			});
			updated++;
		}
		return { updated };
	}
});
