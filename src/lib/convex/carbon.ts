import { v } from 'convex/values';
import { query, mutation } from './_generated/server';
import { getUserOrg, requireOrgAdmin } from './lib/auth';
import {
	getFuelFactor,
	getFuelPrice,
	getWttFactor,
	getSpendFactor,
	estimateUnitsFromCost,
	calculateCO2e,
	vehicleFuelType,
	EOL_FACTORS_TCO2E,
	type FuelType,
	type CountryCode
} from './carbonFactors';

// ─── Types ─────────────────────────────────────────────────────────────────────

type VehicleEntry = {
	vehicleId: string;
	registration: string;
	brand: string;
	model: string;
	energy: string;
	fuelType: string;
	litersConsumed?: number;
	kwh?: number;
	tco2e: number;
	wttTco2e: number;    // Well-to-tank Scope 3 Cat 3
	scope: 'SCOPE1' | 'SCOPE2';
};

type Scope3Entry = {
	category: string;
	description: string;
	amountSpent: number;
	tco2e: number;
	ghgCategory: number; // GHG Protocol category number
};

// ─── Legacy query (backward-compat with existing sustainability page) ──────────

export const calculateCarbonFootprint = query({
	args: { year: v.number() },
	handler: async (ctx, { year }) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);

		const org = await ctx.db.get(organizationId);
		const country = (org?.country ?? 'FR') as CountryCode;
		const currency = org?.currency ?? 'EUR';

		const yearStart = new Date(year, 0, 1).getTime();
		const yearEnd   = new Date(year, 11, 31, 23, 59, 59, 999).getTime();

		const vehicles = await ctx.db
			.query('vehicles')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();

		const allCosts = await ctx.db
			.query('costs')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();

		const fuelCosts = allCosts.filter(
			(c) => c.category === 'CARBURANT' && c.date >= yearStart && c.date <= yearEnd
		);

		const fuelImports = await ctx.db
			.query('fuelImports')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();

		const hasExactLiters = fuelImports.some(
			(fi) =>
				fi.status === 'COMPLETED' &&
				fi.periodStart >= `${year}-01-01` &&
				fi.periodEnd   <= `${year}-12-31`
		);

		const entries: VehicleEntry[] = [];

		for (const vehicle of vehicles) {
			const vehicleFuelCosts = fuelCosts.filter((c) => c.vehicleId === vehicle._id);
			const totalFuelCost = vehicleFuelCosts.reduce((s, c) => s + c.amount, 0);
			if (totalFuelCost === 0) continue;

			const fuelType: FuelType = vehicleFuelType(vehicle.energy ?? 'THERMAL');
			const scope: 'SCOPE1' | 'SCOPE2' = fuelType === 'ELECTRIC' ? 'SCOPE2' : 'SCOPE1';
			const units   = estimateUnitsFromCost(totalFuelCost, fuelType, country);
			const tco2e   = Math.round(calculateCO2e(units, fuelType, country) * 1000) / 1000;
			const wttTco2e = Math.round((units * getWttFactor(fuelType, country)) / 1000 * 1000) / 1000;

			entries.push({
				vehicleId:       vehicle._id,
				registration:    vehicle.registration,
				brand:           vehicle.brand,
				model:           vehicle.model,
				energy:          vehicle.energy ?? 'THERMAL',
				fuelType,
				litersConsumed:  fuelType !== 'ELECTRIC' ? Math.round(units) : undefined,
				kwh:             fuelType === 'ELECTRIC' ? Math.round(units) : undefined,
				tco2e,
				wttTco2e,
				scope
			});
		}

		entries.sort((a, b) => b.tco2e - a.tco2e);

		const scope1 = entries.filter((e) => e.scope === 'SCOPE1').reduce((s, e) => s + e.tco2e, 0);
		const scope2 = entries.filter((e) => e.scope === 'SCOPE2').reduce((s, e) => s + e.tco2e, 0);

		return {
			year,
			scope1TotalTCO2e: Math.round(scope1 * 100) / 100,
			scope2TotalTCO2e: Math.round(scope2 * 100) / 100,
			totalTCO2e:       Math.round((scope1 + scope2) * 100) / 100,
			perVehicle:       entries,
			dataSource: (hasExactLiters ? 'FUEL_IMPORT' : 'COST_ESTIMATE') as
				'FUEL_IMPORT' | 'COST_ESTIMATE',
			ademeYear: 2026,
			country
		};
	}
});

// ─── Full CSRD / ESRS E1 report ───────────────────────────────────────────────

export const calculateCsrdReport = query({
	args: { year: v.number() },
	handler: async (ctx, { year }) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);

		const org = await ctx.db.get(organizationId);
		const country  = (org?.country  ?? 'FR') as CountryCode;
		const currency = org?.currency  ?? 'EUR';
		const orgName  = org?.name      ?? 'Organisation';

		const yearStart = new Date(year, 0, 1).getTime();
		const yearEnd   = new Date(year, 11, 31, 23, 59, 59, 999).getTime();

		// ── Scope 1 + 2 from fuel consumption ──────────────────────────────────
		const vehicles = await ctx.db
			.query('vehicles')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();

		const allCosts = await ctx.db
			.query('costs')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();

		const yearCosts = allCosts.filter(
			(c) => c.date >= yearStart && c.date <= yearEnd
		);

		const fuelCosts = yearCosts.filter((c) => c.category === 'CARBURANT');

		const scope1Vehicles: VehicleEntry[] = [];
		const scope2Vehicles: VehicleEntry[] = [];
		let totalFuelSpend = 0;
		let totalEnergyKwh = 0;
		let totalFuelLitres = 0;

		for (const vehicle of vehicles) {
			const vFuelCosts = fuelCosts.filter((c) => c.vehicleId === vehicle._id);
			const totalCost  = vFuelCosts.reduce((s, c) => s + c.amount, 0);
			if (totalCost === 0) continue;

			totalFuelSpend += totalCost;
			const fuelType: FuelType = vehicleFuelType(vehicle.energy ?? 'THERMAL');
			const units   = estimateUnitsFromCost(totalCost, fuelType, country);
			const tco2e   = Math.round(calculateCO2e(units, fuelType, country) * 1000) / 1000;
			const wttTco2e = Math.round((units * getWttFactor(fuelType, country)) / 1000 * 1000) / 1000;

			if (fuelType === 'ELECTRIC') {
				totalEnergyKwh += units;
				scope2Vehicles.push({ vehicleId: vehicle._id, registration: vehicle.registration, brand: vehicle.brand, model: vehicle.model, energy: vehicle.energy, fuelType, kwh: Math.round(units), tco2e, wttTco2e, scope: 'SCOPE2' });
			} else {
				totalFuelLitres += units;
				scope1Vehicles.push({ vehicleId: vehicle._id, registration: vehicle.registration, brand: vehicle.brand, model: vehicle.model, energy: vehicle.energy, fuelType, litersConsumed: Math.round(units), tco2e, wttTco2e, scope: 'SCOPE1' });
			}
		}

		const scope1Total = scope1Vehicles.reduce((s, e) => s + e.tco2e, 0);
		const scope2Total = scope2Vehicles.reduce((s, e) => s + e.tco2e, 0);

		// ── Scope 3 — spend-based categories ──────────────────────────────────
		// GHG Protocol Category 1: Purchased goods & services (maintenance, parts)
		// GHG Protocol Category 3: Fuel & energy (WTT upstream)
		// GHG Protocol Category 12: End-of-life treatment of sold/leased products

		const scope3Entries: Scope3Entry[] = [];

		// Cat 1: Purchased goods & services (maintenance, assurance, etc.)
		const s3Categories = ['ENTRETIEN', 'ASSURANCE', 'PARKING', 'TELEPEAGE', 'AUTRE', 'SINISTRE'];
		for (const cat of s3Categories) {
			const catCosts = yearCosts.filter((c) => c.category === cat);
			const total = catCosts.reduce((s, c) => s + c.amount, 0);
			if (total === 0) continue;
			const factor = getSpendFactor(cat, currency);
			const tco2e  = Math.round((total * factor) / 1000 * 1000) / 1000;
			scope3Entries.push({
				category:    cat,
				description: getCategoryLabel(cat),
				amountSpent: Math.round(total * 100) / 100,
				tco2e,
				ghgCategory: 1
			});
		}

		// Cat 4: Leasing upstream manufacturing
		const leasingCosts = yearCosts.filter((c) => c.category === 'LEASING');
		const leasingTotal = leasingCosts.reduce((s, c) => s + c.amount, 0);
		if (leasingTotal > 0) {
			const factor = getSpendFactor('LEASING', currency);
			scope3Entries.push({
				category:    'LEASING',
				description: 'Vehicle leasing — upstream manufacturing',
				amountSpent: Math.round(leasingTotal * 100) / 100,
				tco2e:       Math.round((leasingTotal * factor) / 1000 * 1000) / 1000,
				ghgCategory: 4
			});
		}

		// Cat 3: Well-to-tank (WTT) upstream fuel production
		const wttTotal = [...scope1Vehicles, ...scope2Vehicles].reduce((s, e) => s + e.wttTco2e, 0);
		if (wttTotal > 0) {
			scope3Entries.push({
				category:    'WTT',
				description: 'Well-to-tank — upstream fuel & energy production',
				amountSpent: 0,
				tco2e:       Math.round(wttTotal * 1000) / 1000,
				ghgCategory: 3
			});
		}

		// Cat 12: End-of-life (retired vehicles this year)
		const retiredVehicles = vehicles.filter(
			(v) => v.status === 'RETIRED'
		);
		let eolTotal = 0;
		for (const v of retiredVehicles) {
			eolTotal += EOL_FACTORS_TCO2E[v.energy] ?? EOL_FACTORS_TCO2E['THERMAL'];
		}
		if (eolTotal > 0) {
			scope3Entries.push({
				category:    'EOL',
				description: `End-of-life treatment (${retiredVehicles.length} vehicles)`,
				amountSpent: 0,
				tco2e:       Math.round(eolTotal * 1000) / 1000,
				ghgCategory: 12
			});
		}

		const scope3Total = scope3Entries.reduce((s, e) => s + e.tco2e, 0);
		const grandTotal  = scope1Total + scope2Total + scope3Total;

		// ── Fleet energy mix (ESRS E1-5) ──────────────────────────────────────
		const totalVehicles   = vehicles.length;
		const electricCount   = vehicles.filter((v) => v.energy === 'ELECTRIC').length;
		const hybridCount     = vehicles.filter((v) => v.energy === 'HYBRID').length;
		const thermalCount    = vehicles.filter((v) => v.energy === 'THERMAL').length;

		// Intensity metric: tCO2e per vehicle in fleet
		const intensityPerVehicle = totalVehicles > 0
			? Math.round((grandTotal / totalVehicles) * 1000) / 1000
			: 0;

		// ── Fuelимport check (data quality) ──────────────────────────────────
		const fuelImports = await ctx.db
			.query('fuelImports')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();
		const hasExactData = fuelImports.some(
			(fi) => fi.status === 'COMPLETED' &&
				fi.periodStart >= `${year}-01-01` && fi.periodEnd <= `${year}-12-31`
		);

		return {
			// Metadata
			orgName,
			year,
			reportingPeriod: `${year}-01-01 / ${year}-12-31`,
			country,
			currency,
			generatedAt: Date.now(),
			dataQuality: hasExactData ? 'MEASURED' : 'ESTIMATED' as 'MEASURED' | 'ESTIMATED',
			methodology: 'GHG Protocol Corporate Standard + ESRS E1',
			emissionFactorSources: country === 'GB'
				? 'DEFRA GHG Conversion Factors 2024'
				: country === 'SE' || country === 'NO' || country === 'DK'
					? 'ADEME Base Carbone + IEA Electricity 2023'
					: 'ADEME Base Carbone 2026',

			// ESRS E1-5: Energy consumption
			energy: {
				totalFuelLitres:   Math.round(totalFuelLitres),
				totalEnergyKwh:    Math.round(totalEnergyKwh),
				totalFuelSpend:    Math.round(totalFuelSpend * 100) / 100,
				renewableEnergyPct: electricCount > 0 ? Math.round((electricCount / totalVehicles) * 100) : 0
			},

			// ESRS E1-6: GHG emissions
			emissions: {
				scope1: {
					total: Math.round(scope1Total * 1000) / 1000,
					unit:  'tCO2e',
					vehicles: scope1Vehicles.sort((a, b) => b.tco2e - a.tco2e)
				},
				scope2: {
					total:         Math.round(scope2Total * 1000) / 1000,
					locationBased: Math.round(scope2Total * 1000) / 1000,
					marketBased:   null, // requires supplier-specific EACs
					unit:          'tCO2e',
					vehicles:      scope2Vehicles
				},
				scope3: {
					total:     Math.round(scope3Total * 1000) / 1000,
					unit:      'tCO2e',
					breakdown: scope3Entries.sort((a, b) => b.tco2e - a.tco2e)
				},
				total:               Math.round(grandTotal * 1000) / 1000,
				intensityPerVehicle,
				unit:                'tCO2e'
			},

			// Fleet composition
			fleet: {
				total:         totalVehicles,
				electric:      electricCount,
				hybrid:        hybridCount,
				thermal:       thermalCount,
				electricPct:   totalVehicles > 0 ? Math.round((electricCount / totalVehicles) * 100) : 0
			},

			// Year-over-year placeholder (requires prior report in DB)
			yoyChange: null as number | null
		};
	}
});

// ─── Save / list reports (unchanged) ─────────────────────────────────────────

export const saveReport = mutation({
	args: {
		year:              v.number(),
		scope1TotalTCO2e:  v.number(),
		scope2TotalTCO2e:  v.number(),
		totalTCO2e:        v.number(),
		perVehicle:        v.array(v.object({
			vehicleId:      v.id('vehicles'),
			registration:   v.string(),
			brand:          v.string(),
			model:          v.string(),
			energy:         v.string(),
			fuelType:       v.string(),
			litersConsumed: v.optional(v.number()),
			kwh:            v.optional(v.number()),
			tco2e:          v.number(),
			scope:          v.union(v.literal('SCOPE1'), v.literal('SCOPE2'))
		})),
		dataSource: v.union(v.literal('FUEL_IMPORT'), v.literal('COST_ESTIMATE'), v.literal('MANUAL'))
	},
	handler: async (ctx, args) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);

		const existing = await ctx.db
			.query('carbonReports')
			.withIndex('by_org_and_year', (q) =>
				q.eq('organizationId', organizationId).eq('year', args.year)
			)
			.first();

		if (existing) {
			await ctx.db.patch(existing._id, { ...args, generatedBy: user._id, generatedAt: Date.now() });
			return existing._id;
		}

		return ctx.db.insert('carbonReports', {
			organizationId,
			...args,
			generatedBy: user._id,
			generatedAt: Date.now()
		});
	}
});

export const listReports = query({
	args: {},
	handler: async (ctx) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);
		return ctx.db
			.query('carbonReports')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.order('desc')
			.collect();
	}
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCategoryLabel(cat: string): string {
	const labels: Record<string, string> = {
		ENTRETIEN:  'Vehicle maintenance & repair',
		ASSURANCE:  'Insurance',
		PARKING:    'Parking & tolls',
		TELEPEAGE:  'Tolls',
		AUTRE:      'Other fleet expenses',
		SINISTRE:   'Accident repairs',
		LEASING:    'Vehicle leasing (upstream)'
	};
	return labels[cat] ?? cat;
}
