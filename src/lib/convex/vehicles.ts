import { v, ConvexError } from 'convex/values';
import { authedQuery, authedMutation } from './functions';
import { getUserOrg, requireOrgAdmin } from './lib/auth';
import { resolveEffectivePlan, FREE_VEHICLE_LIMIT } from './billing';

function isValidRegistration(reg: string): boolean {
	// 2–12 chars, uppercase letters/digits/hyphens/spaces (covers FR, EU, temp plates)
	return /^[A-Z0-9][A-Z0-9 -]{0,10}[A-Z0-9]$/i.test(reg.trim());
}

const energyValidator = v.union(v.literal('THERMAL'), v.literal('HYBRID'), v.literal('ELECTRIC'));
const categoryValidator = v.union(v.literal('PASSENGER'), v.literal('UTILITY'), v.literal('TRUCK'));
const statusValidator = v.union(
	v.literal('AVAILABLE'),
	v.literal('IN_USE'),
	v.literal('MAINTENANCE'),
	v.literal('RETIRED')
);

const vehicleInputFields = {
	registration: v.string(),
	vin: v.optional(v.string()),
	brand: v.string(),
	model: v.string(),
	year: v.number(),
	energy: energyValidator,
	category: categoryValidator,
	kilometers: v.optional(v.number()),
	purchaseDate: v.optional(v.string()),
	leaseEndDate: v.optional(v.string()),
	location: v.optional(v.string()),
	notes: v.optional(v.string()),
	ctExpiryDate: v.optional(v.string()),
	insuranceExpiryDate: v.optional(v.string()),
	registrationExpiryDate: v.optional(v.string()),
	insurerName: v.optional(v.string()),
	policyNumber: v.optional(v.string())
};

export const getFleetLocations = authedQuery({
	args: {},
	handler: async (ctx) => {
		const { organizationId } = await getUserOrg(ctx);
		const vehicles = await ctx.db
			.query('vehicles')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();
		const locations = [
			...new Set(vehicles.map((v) => v.location).filter((l): l is string => !!l))
		].sort();
		return locations;
	}
});

export const listVehicles = authedQuery({
	args: {
		status: v.optional(statusValidator),
		energy: v.optional(energyValidator)
	},
	handler: async (ctx, { status, energy }) => {
		const { organizationId } = await getUserOrg(ctx);

		let vehicles;
		if (status) {
			vehicles = await ctx.db
				.query('vehicles')
				.withIndex('by_org_and_status', (q) =>
					q.eq('organizationId', organizationId).eq('status', status)
				)
				.collect();
		} else {
			vehicles = await ctx.db
				.query('vehicles')
				.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
				.collect();
		}

		if (energy) {
			vehicles = vehicles.filter((v) => v.energy === energy);
		}

		return vehicles.sort((a, b) => a.registration.localeCompare(b.registration));
	}
});

export const getVehicle = authedQuery({
	args: { vehicleId: v.id('vehicles') },
	handler: async (ctx, { vehicleId }) => {
		const { organizationId } = await getUserOrg(ctx);
		const vehicle = await ctx.db.get(vehicleId);
		if (!vehicle) throw new ConvexError('Véhicule introuvable');
		if (vehicle.organizationId !== organizationId) throw new ConvexError('Accès refusé');
		return vehicle;
	}
});

export const createVehicle = authedMutation({
	args: {
		...vehicleInputFields,
		assignedDriverId: v.optional(v.string()),
		status: v.optional(statusValidator)
	},
	handler: async (ctx, { status, ...fields }) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);

		if (!isValidRegistration(fields.registration)) {
			throw new ConvexError(
				`Immatriculation "${fields.registration}" invalide (format attendu : ex. AB-123-CD)`
			);
		}

		const existing = await ctx.db
			.query('vehicles')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();

		const org = await ctx.db.get(organizationId);
		if (org) {
			const { tier } = resolveEffectivePlan(org);
			if (tier === 'free' && existing.length >= FREE_VEHICLE_LIMIT) {
				throw new ConvexError('VEHICLE_LIMIT_REACHED');
			}
		}

		if (existing.some((v) => v.registration === fields.registration)) {
			throw new ConvexError(
				`Immatriculation "${fields.registration}" déjà existante dans l'organisation`
			);
		}

		return ctx.db.insert('vehicles', {
			...fields,
			organizationId,
			status: status ?? 'AVAILABLE',
			createdAt: Date.now()
		});
	}
});

export const updateVehicle = authedMutation({
	args: {
		vehicleId: v.id('vehicles'),
		registration: v.optional(v.string()),
		vin: v.optional(v.string()),
		brand: v.optional(v.string()),
		model: v.optional(v.string()),
		year: v.optional(v.number()),
		energy: v.optional(energyValidator),
		category: v.optional(categoryValidator),
		kilometers: v.optional(v.number()),
		purchaseDate: v.optional(v.string()),
		leaseEndDate: v.optional(v.string()),
		assignedDriverId: v.optional(v.string()),
		status: v.optional(statusValidator),
		location: v.optional(v.string()),
		notes: v.optional(v.string()),
		ctExpiryDate: v.optional(v.string()),
		insuranceExpiryDate: v.optional(v.string()),
		registrationExpiryDate: v.optional(v.string()),
		insurerName: v.optional(v.string()),
		policyNumber: v.optional(v.string())
	},
	handler: async (ctx, { vehicleId, ...fields }) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);

		const vehicle = await ctx.db.get(vehicleId);
		if (!vehicle) throw new ConvexError('Vehicule introuvable');
		if (vehicle.organizationId !== organizationId) throw new ConvexError('Acces refuse');

		if (fields.registration && fields.registration !== vehicle.registration) {
			if (!isValidRegistration(fields.registration)) {
				throw new ConvexError(
					`Immatriculation "${fields.registration}" invalide (format attendu : ex. AB-123-CD)`
				);
			}
			const existing = await ctx.db
				.query('vehicles')
				.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
				.collect();

			if (existing.some((v) => v.registration === fields.registration)) {
				throw new ConvexError(
					`Immatriculation "${fields.registration}" déjà existante dans l'organisation`
				);
			}
		}

		await ctx.db.patch(vehicleId, fields);
	}
});

export const deleteVehicle = authedMutation({
	args: { vehicleId: v.id('vehicles') },
	handler: async (ctx, { vehicleId }) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);

		const vehicle = await ctx.db.get(vehicleId);
		if (!vehicle) throw new ConvexError('Vehicule introuvable');
		if (vehicle.organizationId !== organizationId) throw new ConvexError('Acces refuse');

		await ctx.db.patch(vehicleId, { status: 'RETIRED' });
	}
});

export const bulkCreateVehicles = authedMutation({
	args: {
		vehicles: v.array(
			v.object({
				...vehicleInputFields,
				assignedDriverId: v.optional(v.string())
			})
		)
	},
	handler: async (ctx, { vehicles }) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);

		const existing = await ctx.db
			.query('vehicles')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();

		const org = await ctx.db.get(organizationId);
		const { tier } = org ? resolveEffectivePlan(org) : { tier: 'free' as const };
		const freeSlots = tier === 'free' ? Math.max(0, FREE_VEHICLE_LIMIT - existing.length) : null;

		const existingRegistrations = new Set(existing.map((v) => v.registration));
		const seenInBatch = new Set<string>();
		const skippedRegistrations: string[] = [];
		let inserted = 0;

		for (const vehicle of vehicles) {
			if (
				!isValidRegistration(vehicle.registration) ||
				existingRegistrations.has(vehicle.registration) ||
				seenInBatch.has(vehicle.registration)
			) {
				skippedRegistrations.push(vehicle.registration);
				continue;
			}

			if (freeSlots !== null && inserted >= freeSlots) {
				skippedRegistrations.push(vehicle.registration);
				continue;
			}

			seenInBatch.add(vehicle.registration);
			await ctx.db.insert('vehicles', {
				...vehicle,
				organizationId,
				status: 'AVAILABLE',
				createdAt: Date.now()
			});
			inserted++;
		}

		return { inserted, skipped: skippedRegistrations.length, skippedRegistrations };
	}
});
