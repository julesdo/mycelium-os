import { defineTable } from 'convex/server';
import { v } from 'convex/values';

/**
 * LES APPAREILS ABONNÉS AUX NOTIFICATIONS PUSH (21/10/2026, le parcours de l'habitude).
 *
 * Un appareil = un abonnement Web Push du navigateur : son adresse chez le service de
 * push (`endpoint`) et ses deux clés de chiffrement. Rangé sous l'établissement courant
 * à l'abonnement, pour que la purge RGPD l'emporte avec lui ; le push suit la personne
 * (`by_user`), quel que soit l'établissement qui la notifie.
 */
export const pushTables = {
	abonnementsPush: defineTable({
		organizationId: v.id('organizations'),
		userId: v.string(),
		endpoint: v.string(),
		p256dh: v.string(),
		auth: v.string(),
		/** « iPhone », « Chrome sur Windows » : ce que la personne reconnaîtra. */
		appareil: v.string(),
		creeLe: v.number()
	})
		.index('by_org', ['organizationId'])
		.index('by_user', ['userId'])
		.index('by_endpoint', ['endpoint'])
};
