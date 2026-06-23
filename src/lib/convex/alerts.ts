import { internalMutation } from './_generated/server';
import { v, ConvexError } from 'convex/values';
import { internal } from './_generated/api';
import { authedMutation } from './functions';
import { getUserOrg } from './lib/auth';

const UNDERUTILIZED_DAYS = 30;
const LEASE_EXPIRING_DAYS = 60;

const FLEET_ALERT_TYPES = new Set(['UNDERUTILIZED_VEHICLE', 'LEASE_EXPIRING']);

export const runDailyAlerts = internalMutation({
	args: {},
	returns: v.null(),
	handler: async (ctx) => {
		const now = Date.now();
		const thirtyDaysAgo = now - UNDERUTILIZED_DAYS * 24 * 60 * 60 * 1000;
		const sixtyDaysFromNow = now + LEASE_EXPIRING_DAYS * 24 * 60 * 60 * 1000;

		const organizations = await ctx.db.query('organizations').collect();

		for (const org of organizations) {
			const orgId = org._id;

			const admins = await ctx.db
				.query('organizationMembers')
				.withIndex('by_organization', (q) => q.eq('organizationId', orgId))
				.filter((q) => q.eq(q.field('role'), 'ORG_ADMIN'))
				.collect();

			if (admins.length === 0) continue;

			const vehicles = await ctx.db
				.query('vehicles')
				.withIndex('by_org', (q) => q.eq('organizationId', orgId))
				.filter((q) => q.neq(q.field('status'), 'RETIRED'))
				.collect();

			// Fetch all unread fleet alerts for this org once (used for dedup)
			const existingAlerts = await ctx.db
				.query('notifications')
				.withIndex('by_org', (q) => q.eq('organizationId', orgId))
				.filter((q) => q.eq(q.field('isRead'), false))
				.collect();

			const existingFleetAlerts = existingAlerts.filter((a) => FLEET_ALERT_TYPES.has(a.type));

			for (const vehicle of vehicles) {
				const vehicleLabel = `${vehicle.brand} ${vehicle.model} · ${vehicle.registration}`;

				// --- Conditions évaluées une fois par véhicule ---

				// 1. Sous-utilisation : aucune réservation non-annulée depuis 30j
				const recentReservation = await ctx.db
					.query('reservations')
					.withIndex('by_vehicle_and_dates', (q) =>
						q.eq('vehicleId', vehicle._id).gte('startDate', thirtyDaysAgo)
					)
					.filter((q) => q.neq(q.field('status'), 'CANCELLED'))
					.first();
				const isUnderutilized = !recentReservation;

				// 2. Leasing expirant dans < 60j
				let leaseExpiringInDays = 0;
				if (vehicle.leaseEndDate) {
					const leaseEnd = new Date(vehicle.leaseEndDate).getTime();
					if (leaseEnd > now && leaseEnd <= sixtyDaysFromNow) {
						leaseExpiringInDays = Math.ceil((leaseEnd - now) / (24 * 60 * 60 * 1000));
					}
				}

				// --- Création des notifications par admin (avec dédoublonnage) ---
				for (const admin of admins) {
					const alreadyHasUnread = (type: string) =>
						existingFleetAlerts.some(
							(a) => a.type === type && a.vehicleId === vehicle._id && a.userId === admin.userId
						);

					if (isUnderutilized && !alreadyHasUnread('UNDERUTILIZED_VEHICLE')) {
						await ctx.scheduler.runAfter(0, internal.notifications.createNotification, {
							organizationId: orgId,
							userId: admin.userId,
							type: 'UNDERUTILIZED_VEHICLE',
							title: 'Véhicule sous-utilisé',
							message: `${vehicleLabel} n'a pas été réservé depuis plus de ${UNDERUTILIZED_DAYS} jours.`,
							link: `/admin/fleet`,
							vehicleId: vehicle._id
						});
					}

					if (leaseExpiringInDays > 0 && !alreadyHasUnread('LEASE_EXPIRING')) {
						await ctx.scheduler.runAfter(0, internal.notifications.createNotification, {
							organizationId: orgId,
							userId: admin.userId,
							type: 'LEASE_EXPIRING',
							title: 'Contrat de leasing expirant',
							message: `Le contrat de ${vehicleLabel} expire dans ${leaseExpiringInDays} jour${leaseExpiringInDays > 1 ? 's' : ''}.`,
							link: `/admin/fleet`,
							vehicleId: vehicle._id
						});
					}
				}
			}
		}

		return null;
	}
});

export const dismissAlert = authedMutation({
	args: { notificationId: v.id('notifications') },
	returns: v.null(),
	handler: async (ctx, { notificationId }) => {
		const { organizationId } = await getUserOrg(ctx);
		const notif = await ctx.db.get(notificationId);
		if (!notif || notif.organizationId !== organizationId || notif.userId !== ctx.user._id) {
			throw new ConvexError('Alerte introuvable ou accès refusé');
		}
		await ctx.db.patch(notificationId, { isRead: true });
		return null;
	}
});
