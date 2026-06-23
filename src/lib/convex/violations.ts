import { v, ConvexError } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { authedQuery, authedMutation } from './functions';
import { getUserOrg, requireOrgAdmin } from './lib/auth';
import { components } from './_generated/api';

export const generateViolationUploadUrl = authedMutation({
	args: {},
	handler: async (ctx) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);
		return ctx.storage.generateUploadUrl();
	}
});

export const createViolation = authedMutation({
	args: {
		vehicleId: v.id('vehicles'),
		violationDate: v.number(),
		amount: v.number(),
		description: v.string(),
		reference: v.optional(v.string()),
		documentStorageId: v.optional(v.string()),
		notes: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);

		const vehicle = await ctx.db.get(args.vehicleId);
		if (!vehicle || vehicle.organizationId !== organizationId) {
			throw new ConvexError('Véhicule introuvable');
		}

		const reservation = await ctx.db
			.query('reservations')
			.withIndex('by_vehicle', (q) => q.eq('vehicleId', args.vehicleId))
			.filter((q) =>
				q.and(
					q.lte(q.field('startDate'), args.violationDate),
					q.gte(q.field('endDate'), args.violationDate),
					q.neq(q.field('status'), 'CANCELLED')
				)
			)
			.first();

		const now = Date.now();
		const violationId = await ctx.db.insert('trafficViolations', {
			organizationId,
			vehicleId: args.vehicleId,
			driverUserId: reservation?.userId,
			reservationId: reservation?._id,
			violationDate: args.violationDate,
			amount: args.amount,
			description: args.description,
			reference: args.reference,
			documentStorageId: args.documentStorageId,
			notes: args.notes,
			status: reservation ? 'IDENTIFIED' : 'RECEIVED',
			paymentDecision: 'PENDING',
			createdBy: user._id,
			createdAt: now,
			updatedAt: now
		});

		return { violationId, identifiedDriver: reservation?.userId ?? null };
	}
});

export const processViolation = authedMutation({
	args: {
		violationId: v.id('trafficViolations'),
		paymentDecision: v.union(v.literal('COMPANY'), v.literal('DRIVER')),
		notes: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);

		const violation = await ctx.db.get(args.violationId);
		if (!violation || violation.organizationId !== organizationId) {
			throw new ConvexError('Contravention introuvable');
		}

		await ctx.db.patch(args.violationId, {
			paymentDecision: args.paymentDecision,
			status: 'NOTIFIED',
			notes: args.notes ?? violation.notes,
			updatedAt: Date.now()
		});

		if (args.paymentDecision === 'DRIVER' && violation.driverUserId) {
			const dateFr = new Intl.DateTimeFormat('fr-FR').format(new Date(violation.violationDate));
			await ctx.db.insert('notifications', {
				organizationId,
				userId: violation.driverUserId,
				type: 'VIOLATION_RECEIVED',
				title: `Contravention de ${violation.amount}€ à votre charge`,
				message: `Une contravention du ${dateFr} vous est imputée. Contactez votre gestionnaire.`,
				link: '/app/reservations',
				isRead: false,
				createdAt: Date.now()
			});
		}
	}
});

export const updateViolationStatus = authedMutation({
	args: {
		violationId: v.id('trafficViolations'),
		status: v.union(
			v.literal('PAID'),
			v.literal('CONTESTED'),
			v.literal('CLOSED')
		),
		notes: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);

		const violation = await ctx.db.get(args.violationId);
		if (!violation || violation.organizationId !== organizationId) {
			throw new ConvexError('Contravention introuvable');
		}

		await ctx.db.patch(args.violationId, {
			status: args.status,
			notes: args.notes ?? violation.notes,
			updatedAt: Date.now()
		});
	}
});

export const listViolations = authedQuery({
	args: {
		status: v.optional(
			v.union(
				v.literal('RECEIVED'),
				v.literal('IDENTIFIED'),
				v.literal('NOTIFIED'),
				v.literal('PAID'),
				v.literal('CONTESTED'),
				v.literal('CLOSED')
			)
		),
		vehicleId: v.optional(v.id('vehicles'))
	},
	handler: async (ctx, args) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);

		let violations;
		if (args.status) {
			violations = await ctx.db
				.query('trafficViolations')
				.withIndex('by_org_and_status', (q) =>
					q.eq('organizationId', organizationId).eq('status', args.status!)
				)
				.order('desc')
				.collect();
		} else {
			violations = await ctx.db
				.query('trafficViolations')
				.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
				.order('desc')
				.collect();
		}

		if (args.vehicleId) {
			violations = violations.filter((v) => v.vehicleId === args.vehicleId);
		}

		const vehicleIds = [...new Set(violations.map((v) => v.vehicleId))];
		const vehicleMap = new Map<string, { brand: string; model: string; registration: string }>();
		for (const vid of vehicleIds) {
			const vehicle = await ctx.db.get(vid);
			if (vehicle) {
				vehicleMap.set(vid, {
					brand: vehicle.brand,
					model: vehicle.model,
					registration: vehicle.registration
				});
			}
		}

		const driverUserIds = [...new Set(violations.map((v) => v.driverUserId).filter(Boolean))] as string[];
		const driverMap = new Map<string, { name: string | null; email: string }>();
		if (driverUserIds.length > 0) {
			const usersRaw = (await ctx.runQuery(components.betterAuth.adapter.findMany, {
				model: 'user',
				where: [{ field: '_id', operator: 'in', value: driverUserIds }],
				paginationOpts: { cursor: null, numItems: driverUserIds.length + 10 }
			})) as { page: Array<{ _id: string; name?: string; email: string }> };
			for (const u of usersRaw.page) {
				driverMap.set(u._id, { name: u.name ?? null, email: u.email });
			}
		}

		return Promise.all(
			violations.map(async (violation) => ({
				...violation,
				vehicle: vehicleMap.get(violation.vehicleId) ?? null,
				driver: violation.driverUserId ? (driverMap.get(violation.driverUserId) ?? null) : null,
				documentUrl: violation.documentStorageId
					? await ctx.storage.getUrl(violation.documentStorageId as Id<'_storage'>)
					: null
			}))
		);
	}
});

export const listMyViolations = authedQuery({
	args: {},
	handler: async (ctx) => {
		const { user, organizationId } = await getUserOrg(ctx);

		const violations = await ctx.db
			.query('trafficViolations')
			.withIndex('by_driver', (q) => q.eq('driverUserId', user._id))
			.order('desc')
			.collect();

		const myViolations = violations.filter((v) => v.organizationId === organizationId);

		const vehicleIds = [...new Set(myViolations.map((v) => v.vehicleId))];
		const vehicleMap = new Map<string, { brand: string; model: string; registration: string }>();
		for (const vid of vehicleIds) {
			const vehicle = await ctx.db.get(vid);
			if (vehicle) {
				vehicleMap.set(vid, {
					brand: vehicle.brand,
					model: vehicle.model,
					registration: vehicle.registration
				});
			}
		}

		return myViolations.map((violation) => ({
			...violation,
			vehicle: vehicleMap.get(violation.vehicleId) ?? null
		}));
	}
});

export const getViolation = authedQuery({
	args: { violationId: v.id('trafficViolations') },
	handler: async (ctx, { violationId }) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);

		const violation = await ctx.db.get(violationId);
		if (!violation || violation.organizationId !== organizationId) {
			throw new ConvexError('Contravention introuvable');
		}

		const vehicle = await ctx.db.get(violation.vehicleId);
		let driver = null;
		if (violation.driverUserId) {
			const usersRaw = (await ctx.runQuery(components.betterAuth.adapter.findMany, {
				model: 'user',
				where: [{ field: '_id', operator: 'in', value: [violation.driverUserId] }],
				paginationOpts: { cursor: null, numItems: 2 }
			})) as { page: Array<{ _id: string; name?: string; email: string }> };
			driver = usersRaw.page[0] ?? null;
		}

		return {
			...violation,
			vehicle: vehicle
				? { brand: vehicle.brand, model: vehicle.model, registration: vehicle.registration }
				: null,
			driver: driver ? { name: driver.name ?? null, email: driver.email } : null,
			documentUrl: violation.documentStorageId
				? await ctx.storage.getUrl(violation.documentStorageId as Id<'_storage'>)
				: null
		};
	}
});
