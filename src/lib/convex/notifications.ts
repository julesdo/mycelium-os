import { internalMutation, internalQuery, query, mutation } from './_generated/server';
import { v } from 'convex/values';
import { components, internal } from './_generated/api';
import type { GenericMutationCtx } from 'convex/server';
import type { DataModel } from './_generated/dataModel';
import { resend, assertResendApiKey } from './emails/resend';
import {
	renderReservationConfirmationEmail,
	renderReservationCancellationEmail,
	renderReservationReminderEmail
} from './emails/templates';
import { requireEnv } from './env';
import { shouldSkipTestEmail } from './emails/helpers';
import { authedQuery, authedMutation } from './functions';

// ─── Notification type shared validator ───────────────────────────────────────
const notificationTypeValidator = v.union(
	v.literal('RESERVATION_CONFIRMED'),
	v.literal('RESERVATION_CANCELLED'),
	v.literal('RESERVATION_REMINDER'),
	v.literal('CONFLICT_DETECTED'),
	v.literal('VEHICLE_RETURNED'),
	v.literal('MAINTENANCE_DUE'),
	v.literal('UNDERUTILIZED_VEHICLE'),
	v.literal('LEASE_EXPIRING'),
	v.literal('LICENSE_EXPIRING'),
	v.literal('LICENSE_EXPIRED'),
	v.literal('VIOLATION_RECEIVED'),
	v.literal('INSPECTION_REQUIRED')
);

// ─── In-app notifications — public API ────────────────────────────────────────

export const listMyNotifications = authedQuery({
	args: {},
	handler: async (ctx) => {
		return ctx.db
			.query('notifications')
			.withIndex('by_user_and_created', (q) => q.eq('userId', ctx.user._id))
			.order('desc')
			.take(50);
	}
});

export const getUnreadCount = authedQuery({
	args: {},
	handler: async (ctx) => {
		const unread = await ctx.db
			.query('notifications')
			.withIndex('by_user_unread', (q) => q.eq('userId', ctx.user._id).eq('isRead', false))
			.collect();
		return unread.length;
	}
});

export const markAsRead = authedMutation({
	args: { notificationId: v.id('notifications') },
	returns: v.null(),
	handler: async (ctx, { notificationId }) => {
		const notif = await ctx.db.get(notificationId);
		if (!notif || notif.userId !== ctx.user._id) return null;
		await ctx.db.patch(notificationId, { isRead: true });
		return null;
	}
});

export const markAllAsRead = authedMutation({
	args: {},
	returns: v.null(),
	handler: async (ctx) => {
		const unread = await ctx.db
			.query('notifications')
			.withIndex('by_user_unread', (q) => q.eq('userId', ctx.user._id).eq('isRead', false))
			.collect();
		await Promise.all(unread.map((n) => ctx.db.patch(n._id, { isRead: true })));
		return null;
	}
});

// ─── In-app notifications — internal ──────────────────────────────────────────

export const getRecentByType = internalQuery({
	args: {
		userId: v.string(),
		type: notificationTypeValidator,
		since: v.number()
	},
	handler: async (ctx, { userId, type, since }) => {
		const notifs = await ctx.db
			.query('notifications')
			.withIndex('by_user_and_created', (q) => q.eq('userId', userId))
			.order('desc')
			.collect();
		return notifs.filter((n) => n.type === type && n.createdAt >= since);
	}
});

export const createNotification = internalMutation({
	args: {
		organizationId: v.id('organizations'),
		userId: v.string(),
		type: notificationTypeValidator,
		title: v.string(),
		message: v.string(),
		link: v.optional(v.string()),
		vehicleId: v.optional(v.id('vehicles'))
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		await ctx.db.insert('notifications', {
			organizationId: args.organizationId,
			userId: args.userId,
			type: args.type,
			title: args.title,
			message: args.message,
			link: args.link,
			vehicleId: args.vehicleId,
			isRead: false,
			createdAt: Date.now()
		});

		// Fan-out to Slack/Teams for admin-relevant alert types
		const COMMS_ALERT_TYPES = new Set([
			'MAINTENANCE_DUE',
			'LEASE_EXPIRING',
			'LICENSE_EXPIRING',
			'LICENSE_EXPIRED',
			'VIOLATION_RECEIVED',
			'CONFLICT_DETECTED'
		]);
		if (COMMS_ALERT_TYPES.has(args.type)) {
			await ctx.scheduler.runAfter(0, internal.comms.sendCommsNotification, {
				organizationId: args.organizationId,
				type: args.type,
				title: args.title,
				message: args.message,
				link: args.link
			});
		}

		return null;
	}
});

function formatDateFr(timestamp: number): string {
	return new Intl.DateTimeFormat('fr-FR', {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		timeZone: 'Europe/Paris'
	}).format(new Date(timestamp));
}

function formatDateShort(timestamp: number): string {
	return new Intl.DateTimeFormat('fr-FR', {
		day: 'numeric',
		month: 'short',
		hour: '2-digit',
		minute: '2-digit',
		timeZone: 'Europe/Paris'
	}).format(new Date(timestamp));
}

type BetterAuthUser = { email: string; name?: string } | null;

async function getUserInfo(
	ctx: GenericMutationCtx<DataModel>,
	userId: string
): Promise<{ email: string; name: string } | null> {
	const user = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
		model: 'user',
		where: [{ field: '_id', operator: 'eq', value: userId }]
	})) as BetterAuthUser;
	if (!user) return null;
	return { email: user.email, name: user.name ?? 'Utilisateur' };
}

export const sendReservationConfirmation = internalMutation({
	args: { reservationId: v.id('reservations') },
	returns: v.null(),
	handler: async (ctx, { reservationId }) => {
		const reservation = await ctx.db.get(reservationId);
		if (!reservation) return null;

		const vehicle = await ctx.db.get(reservation.vehicleId);
		if (!vehicle) return null;

		const user = await getUserInfo(ctx, reservation.userId);
		if (!user) return null;

		if (shouldSkipTestEmail('sendReservationConfirmation', user.email)) return null;
		assertResendApiKey();

		const siteUrl = requireEnv('SITE_URL', { feature: 'email deep links' });
		const vehicleLabel = `${vehicle.brand} ${vehicle.model} · ${vehicle.registration}`;

		const { html, text } = renderReservationConfirmationEmail({
			userName: user.name,
			vehicleLabel,
			startDate: formatDateFr(reservation.startDate),
			endDate: formatDateFr(reservation.endDate),
			location: vehicle.location ?? '',
			purpose: reservation.purpose,
			reservationUrl: `${siteUrl}/app/reservations/${reservationId}`
		});

		await resend.sendEmail(ctx, {
			from: requireEnv('AUTH_EMAIL', { feature: 'email delivery' }),
			to: user.email,
			subject: `Réservation confirmée — ${vehicleLabel}`,
			html,
			text,
			headers: [
				{ name: 'X-Email-Category', value: 'reservation' },
				{ name: 'X-Email-Template', value: 'reservation-confirmation' }
			]
		});

		return null;
	}
});

export const sendReservationCancellation = internalMutation({
	args: { reservationId: v.id('reservations') },
	returns: v.null(),
	handler: async (ctx, { reservationId }) => {
		const reservation = await ctx.db.get(reservationId);
		if (!reservation) return null;

		const vehicle = await ctx.db.get(reservation.vehicleId);
		if (!vehicle) return null;

		const user = await getUserInfo(ctx, reservation.userId);
		if (!user) return null;

		if (shouldSkipTestEmail('sendReservationCancellation', user.email)) return null;
		assertResendApiKey();

		const vehicleLabel = `${vehicle.brand} ${vehicle.model} · ${vehicle.registration}`;

		const { html, text } = renderReservationCancellationEmail({
			userName: user.name,
			vehicleLabel,
			startDate: formatDateFr(reservation.startDate),
			endDate: formatDateFr(reservation.endDate),
			purpose: reservation.purpose
		});

		await resend.sendEmail(ctx, {
			from: requireEnv('AUTH_EMAIL', { feature: 'email delivery' }),
			to: user.email,
			subject: `Réservation annulée — ${vehicleLabel}`,
			html,
			text,
			headers: [
				{ name: 'X-Email-Category', value: 'reservation' },
				{ name: 'X-Email-Template', value: 'reservation-cancellation' }
			]
		});

		return null;
	}
});

export const sendReservationReminder = internalMutation({
	args: { reservationId: v.id('reservations') },
	returns: v.null(),
	handler: async (ctx, { reservationId }) => {
		const reservation = await ctx.db.get(reservationId);
		if (!reservation) return null;

		const vehicle = await ctx.db.get(reservation.vehicleId);
		if (!vehicle) return null;

		const user = await getUserInfo(ctx, reservation.userId);
		if (!user) return null;

		if (shouldSkipTestEmail('sendReservationReminder', user.email)) return null;
		assertResendApiKey();

		const siteUrl = requireEnv('SITE_URL', { feature: 'email deep links' });
		const vehicleLabel = `${vehicle.brand} ${vehicle.model} · ${vehicle.registration}`;

		const { html, text } = renderReservationReminderEmail({
			userName: user.name,
			vehicleLabel,
			startDate: formatDateFr(reservation.startDate),
			endDate: formatDateFr(reservation.endDate),
			location: vehicle.location ?? '',
			purpose: reservation.purpose,
			reservationUrl: `${siteUrl}/app/reservations/${reservationId}`
		});

		await resend.sendEmail(ctx, {
			from: requireEnv('AUTH_EMAIL', { feature: 'email delivery' }),
			to: user.email,
			subject: `Rappel — votre véhicule est demain : ${vehicleLabel}`,
			html,
			text,
			headers: [
				{ name: 'X-Email-Category', value: 'reservation' },
				{ name: 'X-Email-Template', value: 'reservation-reminder' }
			]
		});

		return null;
	}
});

// Called daily by cron at 17:00 UTC (18h or 19h Paris selon saison).
// Queries all reservations starting tomorrow and sends J-1 reminders.
// Full table scan is acceptable at MVP scale; add a date index in V2.
export const sendDailyReminders = internalMutation({
	args: {},
	returns: v.null(),
	handler: async (ctx) => {
		const now = new Date();
		now.setUTCHours(0, 0, 0, 0);
		const tomorrowStart = now.getTime() + 24 * 60 * 60 * 1000;
		const tomorrowEnd = tomorrowStart + 24 * 60 * 60 * 1000;

		const reservations = await ctx.db.query('reservations').collect();
		const tomorrowReservations = reservations.filter(
			(r) =>
				r.startDate >= tomorrowStart &&
				r.startDate < tomorrowEnd &&
				(r.status === 'PENDING' || r.status === 'CONFIRMED')
		);

		for (const r of tomorrowReservations) {
			await ctx.scheduler.runAfter(0, internal.notifications.sendReservationReminder, {
				reservationId: r._id
			});

			const vehicle = await ctx.db.get(r.vehicleId);
			const vehicleLabel = vehicle ? `${vehicle.brand} ${vehicle.model}` : 'Véhicule';
			await ctx.scheduler.runAfter(0, internal.notifications.createNotification, {
				organizationId: r.organizationId,
				userId: r.userId,
				type: 'RESERVATION_REMINDER',
				title: 'Rappel : réservation demain',
				message: `${vehicleLabel} · ${formatDateShort(r.startDate)}`,
				link: `/app/reservations/${r._id}`
			});
		}

		return null;
	}
});
