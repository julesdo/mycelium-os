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
	| 'FACTURES_RECUES'
	| 'DIAGNOSTIC_PRET'
	| 'LIGNES_A_ARBITRER'
	| 'RATIO_EN_DERIVE'
	| 'DECLARATION_A_FAIRE'
	| 'ATTESTATION_MANQUANTE'
	| 'HUMAN_ASSIST_REPLY';

export function buildNotificationContent(
	type: NotificationType,
	data: Record<string, string | number>
): { title: string; message: string } {
	switch (type) {
		case 'FACTURES_RECUES':
			return {
				title: 'Factures reçues',
				message: `${data.count} document(s) déposé(s), traitement en cours.`
			};
		case 'DIAGNOSTIC_PRET':
			return {
				title: 'Votre diagnostic EGalim est prêt',
				message: `Ratio durable mesuré : ${data.ratioDurable} %.`
			};
		case 'LIGNES_A_ARBITRER':
			return {
				title: 'Lignes à arbitrer',
				message: `${data.count} libellé(s) attendent un arbitrage humain.`
			};
		case 'RATIO_EN_DERIVE':
			return {
				title: 'Ratio en dérive',
				message: `Le ratio ${data.seuil} est passé sous le seuil légal ce mois-ci.`
			};
		case 'DECLARATION_A_FAIRE':
			return {
				title: 'Télédéclaration à faire',
				message: `La campagne « ma cantine » ferme le 31 mars. Votre dossier est prêt.`
			};
		case 'ATTESTATION_MANQUANTE':
			return {
				title: 'Attestation manquante',
				message: `${data.count} ligne(s) qualifiante(s) sans justificatif fournisseur.`
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
