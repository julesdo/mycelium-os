'use node';

import webpush from 'web-push';
import { v } from 'convex/values';
import { internalAction } from '../_generated/server';
import { internal } from '../_generated/api';
import { estTransactionnel } from '../../notifications/categories';
import { getLegalEmailAddress } from '../../config/legal';

/**
 * L'ENVOI D'UN PUSH (21/10/2026, le parcours de l'habitude). Web Push standard, clés
 * VAPID : la charge est chiffrée pour l'appareil, le service de push (Apple, Google,
 * Mozilla) ne la lit pas. Un appareil refusé (404, 410) est retiré ; une autre erreur
 * passe : la notification reste dans la boîte de réception.
 */
export const envoyer = internalAction({
	args: { notificationId: v.id('notifications') },
	returns: v.null(),
	handler: async (ctx, { notificationId }): Promise<null> => {
		const publique = process.env.VAPID_PUBLIC_KEY;
		const privee = process.env.VAPID_PRIVATE_KEY;
		if (!publique || !privee) return null;
		const envoi = await ctx.runQuery(internal.push.abonnements._pourEnvoi, { notificationId });
		if (envoi === null) return null;
		webpush.setVapidDetails(`mailto:${getLegalEmailAddress()}`, publique, privee);
		const charge = JSON.stringify({
			titre: envoi.titre,
			texte: envoi.texte,
			lien: envoi.lien,
			tag: envoi.type
		});
		for (const a of envoi.abonnements) {
			try {
				await webpush.sendNotification(
					{ endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } },
					charge,
					{ TTL: 86_400, urgency: estTransactionnel(envoi.type) ? 'high' : 'normal' }
				);
			} catch (erreur) {
				const code = (erreur as { statusCode?: number }).statusCode;
				if (code === 404 || code === 410) {
					await ctx.runMutation(internal.push.abonnements._retirer, { endpoint: a.endpoint });
				}
			}
		}
		return null;
	}
});
