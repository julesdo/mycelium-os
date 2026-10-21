import type { MutationCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { internal } from './_generated/api';
import { heureDEnvoi, type TypeDeNotification } from '../notifications/categories';

/**
 * UNE NOTIFICATION, UN SEUL POINT D'ENTRÉE (21/10/2026, le parcours de l'habitude).
 *
 * Toute notification du produit naît ici : elle se range dans la boîte de réception
 * (`/app/notifications`) et, quand les clés VAPID sont posées, son push se programme à
 * l'heure que dit sa catégorie (`notifications/categories.ts` : un paiement à 23 h 30 se
 * lit au réveil). Le push lui-même relit les réglages de la personne avant de partir
 * (`push/abonnements._pourEnvoi`) : une catégorie coupée se tait.
 *
 * ⚠️ PLUS AUCUNE INSERTION DIRECTE DANS `notifications`. Une règle tenue à cinq
 * endroits se perd au sixième : la catégorie, l'heure et le push vivent ici seulement.
 */
export async function notifier(
	ctx: MutationCtx,
	n: {
		readonly organizationId: Id<'organizations'>;
		readonly userId: string;
		readonly type: TypeDeNotification;
		readonly title: string;
		readonly message: string;
		readonly link?: string;
	}
): Promise<Id<'notifications'>> {
	const maintenant = Date.now();
	const notificationId = await ctx.db.insert('notifications', {
		organizationId: n.organizationId,
		userId: n.userId,
		type: n.type,
		title: n.title,
		message: n.message,
		...(n.link === undefined ? {} : { link: n.link }),
		isRead: false,
		createdAt: maintenant
	});
	// Dormant sans clés : la boîte de réception suffit.
	if (process.env.VAPID_PUBLIC_KEY) {
		await ctx.scheduler.runAt(heureDEnvoi(n.type, maintenant), internal.push.envoi.envoyer, {
			notificationId
		});
	}
	return notificationId;
}
