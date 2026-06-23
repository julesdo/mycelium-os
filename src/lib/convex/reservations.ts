import { v, ConvexError } from 'convex/values';
import { internalMutation } from './_generated/server';
import { authedQuery, authedMutation } from './functions';
import { hasConflict, hasMaintenanceConflict } from './lib/reservations';
import { internal } from './_generated/api';

function formatDateShort(ts: number): string {
	return new Intl.DateTimeFormat('fr-FR', {
		day: 'numeric',
		month: 'short',
		timeZone: 'Europe/Paris'
	}).format(new Date(ts));
}

export const listReservations = authedQuery({
	args: {
		scope: v.union(v.literal('my'), v.literal('all')),
		status: v.optional(
			v.union(
				v.literal('PENDING'),
				v.literal('CONFIRMED'),
				v.literal('IN_PROGRESS'),
				v.literal('COMPLETED'),
				v.literal('CANCELLED')
			)
		),
		dateFrom: v.optional(v.number()),
		dateTo: v.optional(v.number())
	},
	handler: async (ctx, args) => {
		const profile = await ctx.db
			.query('userProfiles')
			.withIndex('by_userId', (q) => q.eq('userId', ctx.user._id))
			.unique();
		if (!profile || !profile.currentOrganizationId) throw new ConvexError('Aucune organisation active');
		const orgId = profile.currentOrganizationId;

		if (args.scope === 'all') {
			const membership = await ctx.db
				.query('organizationMembers')
				.withIndex('by_org_and_user', (q) =>
					q.eq('organizationId', orgId).eq('userId', ctx.user._id)
				)
				.unique();
			if (!membership || membership.role === 'ORG_MEMBER') {
				throw new ConvexError('Accès refusé : rôle ORG_ADMIN ou ORG_MANAGER requis');
			}
		}

		let reservations = await ctx.db
			.query('reservations')
			.withIndex('by_org', (q) => q.eq('organizationId', orgId))
			.collect();

		if (args.scope === 'my') {
			reservations = reservations.filter((r) => r.userId === ctx.user._id);
		}
		if (args.status !== undefined) {
			reservations = reservations.filter((r) => r.status === args.status);
		}
		if (args.dateFrom !== undefined) {
			reservations = reservations.filter((r) => r.endDate >= args.dateFrom!);
		}
		if (args.dateTo !== undefined) {
			reservations = reservations.filter((r) => r.startDate <= args.dateTo!);
		}

		return reservations;
	}
});

export const getReservation = authedQuery({
	args: { reservationId: v.id('reservations') },
	handler: async (ctx, { reservationId }) => {
		const profile = await ctx.db
			.query('userProfiles')
			.withIndex('by_userId', (q) => q.eq('userId', ctx.user._id))
			.unique();
		if (!profile || !profile.currentOrganizationId) throw new ConvexError('Aucune organisation active');

		const reservation = await ctx.db.get(reservationId);
		if (!reservation) throw new ConvexError('Réservation introuvable');
		if (reservation.organizationId !== profile.currentOrganizationId) {
			throw new ConvexError('Accès refusé');
		}

		return reservation;
	}
});

export const getReservationWithDetails = authedQuery({
	args: { reservationId: v.id('reservations') },
	handler: async (ctx, { reservationId }) => {
		const profile = await ctx.db
			.query('userProfiles')
			.withIndex('by_userId', (q) => q.eq('userId', ctx.user._id))
			.unique();
		if (!profile?.currentOrganizationId) throw new ConvexError('Aucune organisation active');
		const orgId = profile.currentOrganizationId;

		const reservation = await ctx.db.get(reservationId);
		if (!reservation || reservation.organizationId !== orgId) {
			throw new ConvexError('Réservation introuvable');
		}

		const membership = await ctx.db
			.query('organizationMembers')
			.withIndex('by_org_and_user', (q) =>
				q.eq('organizationId', orgId).eq('userId', ctx.user._id)
			)
			.unique();

		const isAdmin =
			membership?.role === 'ORG_ADMIN' || membership?.role === 'ORG_MANAGER';
		if (!isAdmin && reservation.userId !== ctx.user._id) {
			throw new ConvexError('Accès refusé');
		}

		const vehicle = await ctx.db.get(reservation.vehicleId);

		return {
			_id: reservation._id,
			vehicleId: reservation.vehicleId,
			userId: reservation.userId,
			startDate: reservation.startDate,
			endDate: reservation.endDate,
			purpose: reservation.purpose,
			status: reservation.status,
			notes: reservation.notes ?? null,
			createdAt: reservation.createdAt,
			updatedAt: reservation.updatedAt,
			brand: vehicle?.brand ?? '',
			model: vehicle?.model ?? '',
			registration: vehicle?.registration ?? '',
			location: vehicle?.location ?? null,
			category: vehicle?.category ?? ('PASSENGER' as const),
			energy: vehicle?.energy ?? ('THERMAL' as const)
		};
	}
});

export const createReservation = authedMutation({
	args: {
		vehicleId: v.id('vehicles'),
		startDate: v.number(),
		endDate: v.number(),
		purpose: v.string(),
		notes: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const profile = await ctx.db
			.query('userProfiles')
			.withIndex('by_userId', (q) => q.eq('userId', ctx.user._id))
			.unique();
		if (!profile || !profile.currentOrganizationId) throw new ConvexError('Aucune organisation active');
		const orgId = profile.currentOrganizationId;

		const vehicle = await ctx.db.get(args.vehicleId);
		if (!vehicle || vehicle.organizationId !== orgId) {
			throw new ConvexError('Véhicule introuvable ou non autorisé');
		}

		// Vérification du permis conducteur
		const driverProfile = await ctx.db
			.query('driverProfiles')
			.withIndex('by_org_and_user', (q) =>
				q.eq('organizationId', orgId).eq('userId', ctx.user._id)
			)
			.unique();

		if (driverProfile?.isBlocked) {
			throw new ConvexError(
				driverProfile.blockReason ??
					'Votre permis de conduire est bloqué. Contactez votre gestionnaire.'
			);
		}

		if (driverProfile?.licenseExpiryDate) {
			const expiryDate = new Date(driverProfile.licenseExpiryDate);
			if (expiryDate < new Date()) {
				throw new ConvexError(
					`Votre permis de conduire a expiré le ${expiryDate.toLocaleDateString('fr-FR')}. Mettez-le à jour avant de réserver.`
				);
			}
		}

		if (vehicle.category === 'UTILITY' && driverProfile?.licenseCategories?.length) {
			const hasUtilityLicense = driverProfile.licenseCategories.some((c) =>
				['BE', 'C', 'CE'].includes(c)
			);
			if (!hasUtilityLicense) {
				throw new ConvexError(
					'Ce véhicule utilitaire requiert un permis BE, C ou CE. Votre permis B ne suffit pas.'
				);
			}
		}

		const restrictions = await ctx.db
			.query('driverRestrictions')
			.withIndex('by_org_and_user', (q) =>
				q.eq('organizationId', orgId).eq('userId', ctx.user._id)
			)
			.collect();

		for (const restriction of restrictions) {
			if (restriction.type === 'NO_UTILITY' && vehicle.category === 'UTILITY') {
				throw new ConvexError('Une restriction vous interdit de réserver des véhicules utilitaires.');
			}
			if (restriction.type === 'NO_TRUCK' && vehicle.category === 'TRUCK') {
				throw new ConvexError('Une restriction vous interdit de réserver des camions.');
			}
		}

		const candidates = await ctx.db
			.query('reservations')
			.withIndex('by_vehicle_and_dates', (q) =>
				q.eq('vehicleId', args.vehicleId).lt('startDate', args.endDate)
			)
			.collect();

		if (hasConflict(candidates, args.startDate, args.endDate)) {
			throw new ConvexError({
				code: 'VEHICLE_NOT_AVAILABLE',
				vehicleId: args.vehicleId,
				startDate: args.startDate,
				endDate: args.endDate
			});
		}

		const vehicleMaintenance = await ctx.db
			.query('maintenanceRecords')
			.withIndex('by_vehicle', (q) => q.eq('vehicleId', args.vehicleId))
			.collect();

		if (hasMaintenanceConflict(vehicleMaintenance, args.startDate, args.endDate)) {
			throw new ConvexError({
				code: 'MAINTENANCE_CONFLICT',
				vehicleId: args.vehicleId,
				startDate: args.startDate,
				endDate: args.endDate
			});
		}

		const now = Date.now();
		const reservationId = await ctx.db.insert('reservations', {
			organizationId: orgId,
			vehicleId: args.vehicleId,
			userId: ctx.user._id,
			startDate: args.startDate,
			endDate: args.endDate,
			purpose: args.purpose,
			notes: args.notes,
			status: 'CONFIRMED',
			createdAt: now,
			updatedAt: now
		});

		await ctx.scheduler.runAfter(0, internal.notifications.sendReservationConfirmation, {
			reservationId
		});
		await ctx.scheduler.runAfter(0, internal.notifications.createNotification, {
			organizationId: orgId,
			userId: ctx.user._id,
			type: 'RESERVATION_CONFIRMED',
			title: 'Réservation confirmée',
			message: `${vehicle.brand} ${vehicle.model} · ${formatDateShort(args.startDate)} → ${formatDateShort(args.endDate)}`,
			link: `/app/reservations/${reservationId}`
		});
		await ctx.scheduler.runAfter(0, internal.integrations.google.syncCalendarEvent, {
			reservationId,
			action: 'create'
		});
		await ctx.scheduler.runAfter(0, internal.integrations.microsoft.syncCalendarEvent, {
			reservationId,
			action: 'create'
		});

		return reservationId;
	}
});

export const updateReservation = authedMutation({
	args: {
		reservationId: v.id('reservations'),
		vehicleId: v.optional(v.id('vehicles')),
		startDate: v.optional(v.number()),
		endDate: v.optional(v.number()),
		purpose: v.optional(v.string()),
		notes: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const profile = await ctx.db
			.query('userProfiles')
			.withIndex('by_userId', (q) => q.eq('userId', ctx.user._id))
			.unique();
		if (!profile || !profile.currentOrganizationId) throw new ConvexError('Aucune organisation active');
		const orgId = profile.currentOrganizationId;

		const reservation = await ctx.db.get(args.reservationId);
		if (!reservation || reservation.organizationId !== orgId) {
			throw new ConvexError('Réservation introuvable ou non autorisée');
		}

		if (reservation.userId !== ctx.user._id) {
			const membership = await ctx.db
				.query('organizationMembers')
				.withIndex('by_org_and_user', (q) =>
					q.eq('organizationId', orgId).eq('userId', ctx.user._id)
				)
				.unique();
			if (!membership || membership.role === 'ORG_MEMBER') {
				throw new ConvexError('Accès refusé : vous ne pouvez modifier que vos propres réservations');
			}
		}

		const effectiveVehicleId = args.vehicleId ?? reservation.vehicleId;
		const newStartDate = args.startDate ?? reservation.startDate;
		const newEndDate = args.endDate ?? reservation.endDate;

		if (args.startDate !== undefined || args.endDate !== undefined || args.vehicleId !== undefined) {
			if (args.vehicleId !== undefined) {
				const vehicle = await ctx.db.get(args.vehicleId);
				if (!vehicle || vehicle.organizationId !== orgId) {
					throw new ConvexError('Véhicule introuvable ou non autorisé');
				}
			}

			const candidates = await ctx.db
				.query('reservations')
				.withIndex('by_vehicle_and_dates', (q) =>
					q.eq('vehicleId', effectiveVehicleId).lt('startDate', newEndDate)
				)
				.collect();

			const excludeId = effectiveVehicleId === reservation.vehicleId ? args.reservationId : undefined;
			if (hasConflict(candidates, newStartDate, newEndDate, excludeId)) {
				throw new ConvexError({
					code: 'VEHICLE_NOT_AVAILABLE',
					vehicleId: effectiveVehicleId,
					startDate: newStartDate,
					endDate: newEndDate
				});
			}

			const vehicleMaintenance = await ctx.db
				.query('maintenanceRecords')
				.withIndex('by_vehicle', (q) => q.eq('vehicleId', effectiveVehicleId))
				.collect();

			if (hasMaintenanceConflict(vehicleMaintenance, newStartDate, newEndDate)) {
				throw new ConvexError({
					code: 'MAINTENANCE_CONFLICT',
					vehicleId: effectiveVehicleId,
					startDate: newStartDate,
					endDate: newEndDate
				});
			}
		}

		const patch: Record<string, unknown> = { updatedAt: Date.now() };
		if (args.vehicleId !== undefined) patch.vehicleId = args.vehicleId;
		if (args.startDate !== undefined) patch.startDate = args.startDate;
		if (args.endDate !== undefined) patch.endDate = args.endDate;
		if (args.purpose !== undefined) patch.purpose = args.purpose;
		if (args.notes !== undefined) patch.notes = args.notes;

		await ctx.db.patch(args.reservationId, patch);
	}
});

export const cancelReservation = authedMutation({
	args: { reservationId: v.id('reservations') },
	handler: async (ctx, { reservationId }) => {
		const profile = await ctx.db
			.query('userProfiles')
			.withIndex('by_userId', (q) => q.eq('userId', ctx.user._id))
			.unique();
		if (!profile || !profile.currentOrganizationId) throw new ConvexError('Aucune organisation active');
		const orgId = profile.currentOrganizationId;

		const reservation = await ctx.db.get(reservationId);
		if (!reservation || reservation.organizationId !== orgId) {
			throw new ConvexError('Réservation introuvable ou non autorisée');
		}

		if (reservation.userId !== ctx.user._id) {
			const membership = await ctx.db
				.query('organizationMembers')
				.withIndex('by_org_and_user', (q) =>
					q.eq('organizationId', orgId).eq('userId', ctx.user._id)
				)
				.unique();
			if (!membership || membership.role === 'ORG_MEMBER') {
				throw new ConvexError('Accès refusé : vous ne pouvez annuler que vos propres réservations');
			}
		}

		if (reservation.status !== 'PENDING' && reservation.status !== 'CONFIRMED') {
			throw new ConvexError('INVALID_STATUS_TRANSITION');
		}

		await ctx.db.patch(reservationId, { status: 'CANCELLED', updatedAt: Date.now() });

		await ctx.scheduler.runAfter(0, internal.notifications.sendReservationCancellation, {
			reservationId
		});

		const vehicle = await ctx.db.get(reservation.vehicleId);
		await ctx.scheduler.runAfter(0, internal.notifications.createNotification, {
			organizationId: orgId,
			userId: reservation.userId,
			type: 'RESERVATION_CANCELLED',
			title: 'Réservation annulée',
			message: `${vehicle?.brand ?? ''} ${vehicle?.model ?? ''} · ${formatDateShort(reservation.startDate)}`.trim(),
			link: undefined
		});
		await ctx.scheduler.runAfter(0, internal.integrations.google.syncCalendarEvent, {
			reservationId,
			action: 'delete'
		});
		await ctx.scheduler.runAfter(0, internal.integrations.microsoft.syncCalendarEvent, {
			reservationId,
			action: 'delete'
		});
	}
});

export const listMyReservationsWithDetails = authedQuery({
	args: {
		tab: v.union(v.literal('upcoming'), v.literal('history'), v.literal('cancelled'))
	},
	handler: async (ctx, { tab }) => {
		const profile = await ctx.db
			.query('userProfiles')
			.withIndex('by_userId', (q) => q.eq('userId', ctx.user._id))
			.unique();
		if (!profile?.currentOrganizationId) throw new ConvexError('Aucune organisation active');
		const orgId = profile.currentOrganizationId;

		let reservations = await ctx.db
			.query('reservations')
			.withIndex('by_user', (q) => q.eq('userId', ctx.user._id))
			.collect();

		reservations = reservations.filter((r) => r.organizationId === orgId);

		if (tab === 'upcoming') {
			reservations = reservations.filter(
				(r) =>
					r.status === 'PENDING' || r.status === 'CONFIRMED' || r.status === 'IN_PROGRESS'
			);
			reservations.sort((a, b) => a.startDate - b.startDate);
		} else if (tab === 'history') {
			reservations = reservations.filter((r) => r.status === 'COMPLETED');
			reservations.sort((a, b) => b.startDate - a.startDate);
		} else {
			reservations = reservations.filter((r) => r.status === 'CANCELLED');
			reservations.sort((a, b) => b.startDate - a.startDate);
		}

		return Promise.all(
			reservations.map(async (r) => {
				const vehicle = await ctx.db.get(r.vehicleId);
				return {
					_id: r._id,
					vehicleId: r.vehicleId,
					startDate: r.startDate,
					endDate: r.endDate,
					purpose: r.purpose,
					status: r.status,
					notes: r.notes,
					createdAt: r.createdAt,
					updatedAt: r.updatedAt,
					brand: vehicle?.brand ?? 'Inconnu',
					model: vehicle?.model ?? '',
					registration: vehicle?.registration ?? '',
					energy: vehicle?.energy ?? ('THERMAL' as const),
					category: vehicle?.category ?? ('PASSENGER' as const),
					location: vehicle?.location ?? null
				};
			})
		);
	}
});

export const listReservationsForCalendar = authedQuery({
	args: {
		dateFrom: v.optional(v.number()),
		dateTo: v.optional(v.number())
	},
	handler: async (ctx, args) => {
		const profile = await ctx.db
			.query('userProfiles')
			.withIndex('by_userId', (q) => q.eq('userId', ctx.user._id))
			.unique();
		if (!profile || !profile.currentOrganizationId) throw new ConvexError('Aucune organisation active');
		const orgId = profile.currentOrganizationId;

		const membership = await ctx.db
			.query('organizationMembers')
			.withIndex('by_org_and_user', (q) =>
				q.eq('organizationId', orgId).eq('userId', ctx.user._id)
			)
			.unique();
		if (!membership || membership.role === 'ORG_MEMBER') {
			throw new ConvexError('Accès refusé : rôle ORG_ADMIN ou ORG_MANAGER requis');
		}

		let reservations = await ctx.db
			.query('reservations')
			.withIndex('by_org', (q) => q.eq('organizationId', orgId))
			.collect();

		if (args.dateFrom !== undefined) {
			reservations = reservations.filter((r) => r.endDate >= args.dateFrom!);
		}
		if (args.dateTo !== undefined) {
			reservations = reservations.filter((r) => r.startDate <= args.dateTo!);
		}

		return Promise.all(
			reservations.map(async (r) => {
				const vehicle = await ctx.db.get(r.vehicleId);
				return {
					_id: r._id,
					organizationId: r.organizationId,
					vehicleId: r.vehicleId,
					userId: r.userId,
					startDate: r.startDate,
					endDate: r.endDate,
					purpose: r.purpose,
					status: r.status,
					notes: r.notes,
					createdAt: r.createdAt,
					updatedAt: r.updatedAt,
					brand: vehicle?.brand ?? '',
					model: vehicle?.model ?? '',
					registration: vehicle?.registration ?? '',
					vehicleStatus: vehicle?.status ?? ('AVAILABLE' as const),
					location: vehicle?.location ?? null,
					category: vehicle?.category ?? ('PASSENGER' as const),
					energy: vehicle?.energy ?? ('THERMAL' as const)
				};
			})
		);
	}
});

export const searchAvailableVehicles = authedQuery({
	args: {
		startDate: v.number(),
		endDate: v.number(),
		location: v.optional(v.string()),
		category: v.optional(
			v.union(v.literal('PASSENGER'), v.literal('UTILITY'), v.literal('TRUCK'))
		),
		energy: v.optional(
			v.union(v.literal('THERMAL'), v.literal('HYBRID'), v.literal('ELECTRIC'))
		)
	},
	handler: async (ctx, args) => {
		const profile = await ctx.db
			.query('userProfiles')
			.withIndex('by_userId', (q) => q.eq('userId', ctx.user._id))
			.unique();
		if (!profile || !profile.currentOrganizationId) throw new ConvexError('Aucune organisation active');
		const orgId = profile.currentOrganizationId;

		let vehicles = await ctx.db
			.query('vehicles')
			.withIndex('by_org_and_status', (q) =>
				q.eq('organizationId', orgId).eq('status', 'AVAILABLE')
			)
			.collect();

		if (args.location) {
			vehicles = vehicles.filter((vehicle) => vehicle.location === args.location);
		}
		if (args.category) {
			vehicles = vehicles.filter((vehicle) => vehicle.category === args.category);
		}
		if (args.energy) {
			vehicles = vehicles.filter((vehicle) => vehicle.energy === args.energy);
		}

		// Collect all active reservations in the org that overlap [startDate, endDate]
		const activeReservations = await ctx.db
			.query('reservations')
			.withIndex('by_org', (q) => q.eq('organizationId', orgId))
			.collect();

		const blockedVehicleIds = new Set(
			activeReservations
				.filter(
					(r) =>
						r.status !== 'CANCELLED' &&
						r.status !== 'COMPLETED' &&
						r.startDate < args.endDate &&
						r.endDate > args.startDate
				)
				.map((r) => r.vehicleId)
		);

		const allMaintenance = await ctx.db
			.query('maintenanceRecords')
			.withIndex('by_org', (q) => q.eq('organizationId', orgId))
			.collect();

		const maintenanceBlockedIds = new Set(
			allMaintenance
				.filter((m) => hasMaintenanceConflict([m], args.startDate, args.endDate))
				.map((m) => m.vehicleId)
		);

		return vehicles.filter(
			(vehicle) => !blockedVehicleIds.has(vehicle._id) && !maintenanceBlockedIds.has(vehicle._id)
		);
	}
});

export const getRecentForSearch = authedQuery({
	args: {},
	handler: async (ctx) => {
		const profile = await ctx.db
			.query('userProfiles')
			.withIndex('by_userId', (q) => q.eq('userId', ctx.user._id))
			.unique();
		if (!profile || !profile.currentOrganizationId) return [];
		const orgId = profile.currentOrganizationId;

		const membership = await ctx.db
			.query('organizationMembers')
			.withIndex('by_org_and_user', (q) =>
				q.eq('organizationId', orgId).eq('userId', ctx.user._id)
			)
			.unique();

		let reservations;
		if (membership && (membership.role === 'ORG_ADMIN' || membership.role === 'ORG_MANAGER')) {
			reservations = await ctx.db
				.query('reservations')
				.withIndex('by_org', (q) => q.eq('organizationId', orgId))
				.order('desc')
				.take(20);
		} else {
			reservations = await ctx.db
				.query('reservations')
				.withIndex('by_user', (q) => q.eq('userId', ctx.user._id))
				.order('desc')
				.take(15);
		}

		return Promise.all(
			reservations.map(async (r) => {
				const vehicle = await ctx.db.get(r.vehicleId);
				return {
					_id: r._id,
					purpose: r.purpose,
					startDate: r.startDate,
					status: r.status,
					brand: vehicle?.brand ?? '',
					model: vehicle?.model ?? '',
					registration: vehicle?.registration ?? ''
				};
			})
		);
	}
});

// Appelé par le cron toutes les heures — passe CONFIRMED→IN_PROGRESS et IN_PROGRESS→COMPLETED
export const transitionReservationStatuses = internalMutation({
	args: {},
	returns: v.null(),
	handler: async (ctx) => {
		const now = Date.now();

		const active = await ctx.db
			.query('reservations')
			.collect()
			.then((all) =>
				all.filter(
					(r) => r.status === 'CONFIRMED' || r.status === 'PENDING' || r.status === 'IN_PROGRESS'
				)
			);

		for (const r of active) {
			if (
				(r.status === 'CONFIRMED' || r.status === 'PENDING') &&
				r.startDate <= now &&
				r.endDate > now
			) {
				await ctx.db.patch(r._id, { status: 'IN_PROGRESS', updatedAt: now });
			} else if (r.status === 'IN_PROGRESS' && r.endDate <= now) {
				await ctx.db.patch(r._id, { status: 'COMPLETED', updatedAt: now });
			}
		}

		return null;
	}
});
