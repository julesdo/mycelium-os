import { v, ConvexError } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { authedQuery, authedMutation } from './functions';
import { getUserOrg, requireOrgAdmin } from './lib/auth';

const photoAngleValidator = v.union(
	v.literal('FRONT'),
	v.literal('BACK'),
	v.literal('LEFT'),
	v.literal('RIGHT'),
	v.literal('INTERIOR'),
	v.literal('DASHBOARD')
);

const damageValidator = v.object({
	location: v.string(),
	description: v.string(),
	severity: v.union(v.literal('MINOR'), v.literal('MODERATE'), v.literal('MAJOR')),
	isNew: v.boolean()
});

export const generateInspectionUploadUrl = authedMutation({
	args: {},
	handler: async (ctx) => {
		await getUserOrg(ctx);
		return ctx.storage.generateUploadUrl();
	}
});

export const createInspection = authedMutation({
	args: {
		reservationId: v.id('reservations'),
		type: v.union(v.literal('DEPARTURE'), v.literal('RETURN')),
		kmAtInspection: v.optional(v.number()),
		fuelLevelPercent: v.optional(v.number()),
		photos: v.array(v.object({ angle: photoAngleValidator, storageId: v.string() })),
		damages: v.optional(v.array(damageValidator)),
		notes: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const { user, organizationId } = await getUserOrg(ctx);

		const reservation = await ctx.db.get(args.reservationId);
		if (!reservation || reservation.organizationId !== organizationId) {
			throw new ConvexError('Réservation introuvable');
		}

		const isDriver = reservation.userId === user._id;
		if (!isDriver) {
			await requireOrgAdmin(ctx, organizationId, user._id);
		}

		const now = Date.now();
		const inspectionId = await ctx.db.insert('vehicleInspections', {
			organizationId,
			vehicleId: reservation.vehicleId,
			reservationId: args.reservationId,
			type: args.type,
			inspectedBy: user._id,
			kmAtInspection: args.kmAtInspection,
			fuelLevelPercent: args.fuelLevelPercent,
			photos: args.photos,
			damages: args.damages,
			notes: args.notes,
			createdAt: now
		});

		if (args.type === 'RETURN' && args.damages?.some((d) => d.isNew)) {
			const admins = await ctx.db
				.query('organizationMembers')
				.withIndex('by_organization', (q) => q.eq('organizationId', organizationId))
				.filter((q) => q.eq(q.field('role'), 'ORG_ADMIN'))
				.collect();

			for (const admin of admins) {
				await ctx.db.insert('notifications', {
					organizationId,
					userId: admin.userId,
					type: 'CONFLICT_DETECTED',
					title: 'Nouveau dommage signalé',
					message: `Un dommage a été constaté lors du retour de la réservation.`,
					link: `/admin/reservations/${args.reservationId}`,
					isRead: false,
					createdAt: now
				});
			}
		}

		return inspectionId;
	}
});

export const getInspectionsForReservation = authedQuery({
	args: { reservationId: v.id('reservations') },
	handler: async (ctx, { reservationId }) => {
		const { organizationId } = await getUserOrg(ctx);

		const reservation = await ctx.db.get(reservationId);
		if (!reservation || reservation.organizationId !== organizationId) {
			throw new ConvexError('Réservation introuvable');
		}

		const inspections = await ctx.db
			.query('vehicleInspections')
			.withIndex('by_reservation', (q) => q.eq('reservationId', reservationId))
			.collect();

		return Promise.all(
			inspections.map(async (inspection) => ({
				...inspection,
				photosWithUrls: await Promise.all(
					inspection.photos.map(async (p) => ({
						...p,
						url: await ctx.storage.getUrl(p.storageId as Id<'_storage'>)
					}))
				)
			}))
		);
	}
});

export const getInspectionsForVehicle = authedQuery({
	args: { vehicleId: v.id('vehicles') },
	handler: async (ctx, { vehicleId }) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);

		const vehicle = await ctx.db.get(vehicleId);
		if (!vehicle || vehicle.organizationId !== organizationId) {
			throw new ConvexError('Véhicule introuvable');
		}

		const inspections = await ctx.db
			.query('vehicleInspections')
			.withIndex('by_vehicle', (q) => q.eq('vehicleId', vehicleId))
			.order('desc')
			.take(20);

		return Promise.all(
			inspections.map(async (inspection) => ({
				...inspection,
				photosWithUrls: await Promise.all(
					inspection.photos.map(async (p) => ({
						...p,
						url: await ctx.storage.getUrl(p.storageId as Id<'_storage'>)
					}))
				)
			}))
		);
	}
});
