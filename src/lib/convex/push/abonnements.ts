import { v } from 'convex/values';
import { internalMutation, internalQuery, query } from '../_generated/server';
import { authedMutation, authedQuery } from '../functions';
import { organisationCouranteOuNull } from '../lib/auth';
import {
	CATEGORIES_PUSH,
	categorieDuType,
	type CategoriePush,
	type TypeDeNotification
} from '../../notifications/categories';

/**
 * LES APPAREILS ET LES RÉGLAGES DU PUSH (21/10/2026, le parcours de l'habitude).
 *
 * La personne abonne un appareil depuis son profil ou sous la célébration de sa première
 * relance ; elle coupe une catégorie d'un interrupteur. Rien ne s'abonne sans son geste :
 * le navigateur demande la permission, jamais au lancement.
 */

const vCategorie = v.union(...CATEGORIES_PUSH.map((c) => v.literal(c)));

/** La clé publique VAPID : publique par nature, `null` quand le push dort. */
export const clePublique = query({
	args: {},
	returns: v.union(v.string(), v.null()),
	handler: async (): Promise<string | null> => process.env.VAPID_PUBLIC_KEY ?? null
});

/** Abonne (ou réabonne) l'appareil de la personne connectée. */
export const abonner = authedMutation({
	args: { endpoint: v.string(), p256dh: v.string(), auth: v.string(), appareil: v.string() },
	returns: v.null(),
	handler: async (ctx, args): Promise<null> => {
		const organizationId = await organisationCouranteOuNull(ctx, ctx.user._id);
		if (organizationId === null) return null;
		const existants = await ctx.db
			.query('abonnementsPush')
			.withIndex('by_endpoint', (q) => q.eq('endpoint', args.endpoint))
			.take(5);
		for (const e of existants) await ctx.db.delete(e._id);
		await ctx.db.insert('abonnementsPush', {
			organizationId,
			userId: ctx.user._id,
			endpoint: args.endpoint,
			p256dh: args.p256dh,
			auth: args.auth,
			appareil: args.appareil.slice(0, 80),
			creeLe: Date.now()
		});
		return null;
	}
});

/** Désabonne cet appareil (la personne a coupé le push sur lui). */
export const desabonner = authedMutation({
	args: { endpoint: v.string() },
	returns: v.null(),
	handler: async (ctx, { endpoint }): Promise<null> => {
		const existants = await ctx.db
			.query('abonnementsPush')
			.withIndex('by_endpoint', (q) => q.eq('endpoint', endpoint))
			.take(5);
		for (const e of existants) if (e.userId === ctx.user._id) await ctx.db.delete(e._id);
		return null;
	}
});

/** Les réglages de la personne : les catégories coupées, et combien d'appareils l'écoutent. */
export const mesReglages = authedQuery({
	args: {},
	returns: v.union(
		v.null(),
		v.object({
			disponible: v.boolean(),
			categoriesCoupees: v.array(vCategorie),
			appareils: v.array(v.object({ endpoint: v.string(), appareil: v.string() }))
		})
	),
	handler: async (ctx) => {
		const organizationId = await organisationCouranteOuNull(ctx, ctx.user._id);
		if (organizationId === null) return null;
		const membre = await ctx.db
			.query('organizationMembers')
			.withIndex('by_org_and_user', (q) =>
				q.eq('organizationId', organizationId).eq('userId', ctx.user._id)
			)
			.unique();
		const appareils = await ctx.db
			.query('abonnementsPush')
			.withIndex('by_user', (q) => q.eq('userId', ctx.user._id))
			.take(20);
		return {
			disponible: Boolean(process.env.VAPID_PUBLIC_KEY),
			categoriesCoupees: lesCoupees(membre?.categoriesCoupees),
			appareils: appareils.map((a) => ({ endpoint: a.endpoint, appareil: a.appareil }))
		};
	}
});

/** Coupe ou rouvre une catégorie, pour la personne connectée dans cet établissement. */
export const regler = authedMutation({
	args: { categorie: vCategorie, active: v.boolean() },
	returns: v.null(),
	handler: async (ctx, { categorie, active }): Promise<null> => {
		const organizationId = await organisationCouranteOuNull(ctx, ctx.user._id);
		if (organizationId === null) return null;
		const membre = await ctx.db
			.query('organizationMembers')
			.withIndex('by_org_and_user', (q) =>
				q.eq('organizationId', organizationId).eq('userId', ctx.user._id)
			)
			.unique();
		if (membre === null) return null;
		const coupees = new Set(lesCoupees(membre.categoriesCoupees));
		if (active) coupees.delete(categorie);
		else coupees.add(categorie);
		await ctx.db.patch(membre._id, { categoriesCoupees: [...coupees] });
		return null;
	}
});

function lesCoupees(valeurs: readonly string[] | undefined): CategoriePush[] {
	return (valeurs ?? []).filter((c): c is CategoriePush =>
		(CATEGORIES_PUSH as readonly string[]).includes(c)
	);
}

/**
 * Ce qu'un push emporte, relu au moment de partir : la notification, et les appareils de
 * sa destinataire. `null` quand la catégorie est coupée ou qu'aucun appareil n'écoute.
 */
export const _pourEnvoi = internalQuery({
	args: { notificationId: v.id('notifications') },
	handler: async (
		ctx,
		{ notificationId }
	): Promise<{
		type: TypeDeNotification;
		titre: string;
		texte: string;
		lien: string;
		abonnements: { endpoint: string; p256dh: string; auth: string }[];
	} | null> => {
		const notification = await ctx.db.get(notificationId);
		if (notification === null || notification.isRead) return null;
		const membre = await ctx.db
			.query('organizationMembers')
			.withIndex('by_org_and_user', (q) =>
				q.eq('organizationId', notification.organizationId).eq('userId', notification.userId)
			)
			.unique();
		if (membre === null) return null;
		if (lesCoupees(membre.categoriesCoupees).includes(categorieDuType(notification.type))) {
			return null;
		}
		const abonnements = await ctx.db
			.query('abonnementsPush')
			.withIndex('by_user', (q) => q.eq('userId', notification.userId))
			.take(20);
		if (abonnements.length === 0) return null;
		return {
			type: notification.type,
			titre: notification.title,
			texte: notification.message,
			lien: notification.link ?? '/app/notifications',
			abonnements: abonnements.map((a) => ({
				endpoint: a.endpoint,
				p256dh: a.p256dh,
				auth: a.auth
			}))
		};
	}
});

/** Un appareil que son service de push refuse (404, 410) : il ne recevra plus rien. */
export const _retirer = internalMutation({
	args: { endpoint: v.string() },
	returns: v.null(),
	handler: async (ctx, { endpoint }): Promise<null> => {
		const existants = await ctx.db
			.query('abonnementsPush')
			.withIndex('by_endpoint', (q) => q.eq('endpoint', endpoint))
			.take(5);
		for (const e of existants) await ctx.db.delete(e._id);
		return null;
	}
});
