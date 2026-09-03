import { internalMutation, internalQuery } from './_generated/server';
import { v } from 'convex/values';
import { authedQuery, authedMutation } from './functions';

// ─── Notification type shared validator ───────────────────────────────────────
const notificationTypeValidator = v.union(
	v.literal('IMPORT_TERMINE'),
	v.literal('CREANCE_MURE'),
	v.literal('ECHEANCE_PROCHE'),
	v.literal('PRESCRIPTION_PROCHE'),
	v.literal('DEBITEUR_DEGRADE'),
	v.literal('HUMAN_ASSIST_REPLY')
);

export type NotificationType =
	| 'IMPORT_TERMINE'
	| 'CREANCE_MURE'
	| 'ECHEANCE_PROCHE'
	| 'PRESCRIPTION_PROCHE'
	| 'DEBITEUR_DEGRADE'
	| 'HUMAN_ASSIST_REPLY';

export function buildNotificationContent(
	type: NotificationType,
	data: Record<string, string | number>
): { title: string; message: string } {
	switch (type) {
		case 'IMPORT_TERMINE':
			return {
				title: 'Import terminé',
				message: `${data.count} facture(s) enregistrée(s).`
			};
		case 'CREANCE_MURE':
			return {
				title: 'Une créance est mûre',
				message: `${data.debiteur} — ${data.montant} restant dû.`
			};
		case 'ECHEANCE_PROCHE':
			return {
				title: 'Échéance de procédure',
				message: `${data.libelle} : il reste ${data.jours} jour(s).`
			};
		case 'PRESCRIPTION_PROCHE':
			return {
				title: 'Prescription proche',
				message: `${data.reference} sera prescrite le ${data.date}. Passée cette date, la créance est éteinte.`
			};
		case 'DEBITEUR_DEGRADE':
			return {
				title: 'Un débiteur se dégrade',
				message: `La situation de ${data.debiteur} a changé. Revoir l'encours avant d'engager des frais.`
			};
		case 'HUMAN_ASSIST_REPLY':
			return {
				title: 'Nouvelle réponse',
				message: `Vous avez reçu une réponse de votre interlocuteur Letikette.`
			};
	}
}

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
		link: v.optional(v.string())
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
			isRead: false,
			createdAt: Date.now()
		});

		return null;
	}
});
