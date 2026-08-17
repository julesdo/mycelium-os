import { internalMutation, internalQuery } from './_generated/server';
import { v } from 'convex/values';
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
	v.literal('INSPECTION_REQUIRED'),
	v.literal('HUMAN_ASSIST_REPLY')
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

		return null;
	}
});

