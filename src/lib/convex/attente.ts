import { v } from 'convex/values';
import { HOUR, RateLimiter } from '@convex-dev/rate-limiter';
import { internalMutation, mutation } from './_generated/server';
import { components, internal } from './_generated/api';
import {
	CONFIRMATION_VALABLE_MS,
	estEchue,
	LISTE_SANS_JUGE,
	lireInscription
} from '../crm/attente';
import { empreinteDEmail } from '../crm/empreinte';
import { resend, assertResendApiKey } from './emails/resend';
import { expediteurNomme, shouldSkipTestEmail } from './emails/helpers';
import { requireEnv } from './env';
import { SITE_CANONIQUE } from '../config/legal';
import {
	confirmationAttenteHtml,
	confirmationAttenteTexte,
	OBJET_CONFIRMATION_ATTENTE
} from './emails/modeles/attente';

/**
 * LA LISTE D'ATTENTE DE LA PROCÉDURE SANS JUGE (19/10/2026, audit stratégique, décision 16).
 *
 * Trois mutations publiques, et la page `/attente/<jeton>` : s'inscrire (un e-mail part),
 * confirmer (le bouton de la page, jamais le lien seul), quitter la liste.
 *
 * ⚠️ LA MÊME RÉPONSE QUOI QU'IL ARRIVE : adresse déjà inscrite, déjà confirmée, sur la
 * liste d'opposition, robot ou jeton inconnu. Rien ne permet de savoir, de l'extérieur,
 * si une adresse figure dans nos fichiers.
 * ⚠️ UNE ADRESSE QUI A DIT « STOP » NE REÇOIT RIEN, pas même la confirmation : n'importe
 * qui peut taper l'adresse d'un autre dans le formulaire, et l'opposition est une promesse
 * de ne plus écrire.
 */
const limiteur = new RateLimiter(components.rateLimiter, {
	attenteParAdresse: { kind: 'fixed window', rate: 2, period: HOUR },
	attenteDuSite: { kind: 'fixed window', rate: 60, period: HOUR }
});

const RAISON_TROP = 'Trop d’inscriptions en ce moment : réessayez dans une heure.';

export const sInscrire = mutation({
	args: {
		email: v.string(),
		entreprise: v.optional(v.string()),
		piege: v.optional(v.string())
	},
	returns: v.union(
		v.object({ ok: v.literal(true) }),
		v.object({ ok: v.literal(false), erreur: v.string() })
	),
	handler: async (ctx, args): Promise<{ ok: true } | { ok: false; erreur: string }> => {
		const lue = lireInscription(args);
		if (!lue.ok) return lue.robot === true ? { ok: true } : { ok: false, erreur: lue.erreur };
		const { email, entreprise } = lue.inscription;
		if (!(await limiteur.limit(ctx, 'attenteDuSite')).ok) return { ok: false, erreur: RAISON_TROP };
		if (!(await limiteur.limit(ctx, 'attenteParAdresse', { key: email })).ok) return { ok: true };

		const empreinte = await empreinteDEmail(email);
		const opposee = await ctx.db
			.query('oppositions')
			.withIndex('by_empreinte', (q) => q.eq('empreinte', empreinte))
			.first();
		if (opposee !== null) return { ok: true };

		const existante = await ctx.db
			.query('inscriptionsAttente')
			.withIndex('by_liste_email', (q) => q.eq('liste', LISTE_SANS_JUGE).eq('email', email))
			.first();
		if (existante?.confirmeeLe !== undefined) return { ok: true };

		const inscriptionId =
			existante?._id ??
			(await ctx.db.insert('inscriptionsAttente', {
				liste: LISTE_SANS_JUGE,
				email,
				...(entreprise === undefined ? {} : { entreprise }),
				jeton: crypto.randomUUID(),
				creeLe: Date.now()
			}));
		await ctx.scheduler.runAfter(0, internal.attente.envoyerLaConfirmation, { inscriptionId });
		return { ok: true };
	}
});

/** Le bouton de la page : un lien ouvert par l'antivirus d'une messagerie ne confirme rien. */
export const confirmer = mutation({
	args: { jeton: v.string() },
	returns: v.null(),
	handler: async (ctx, { jeton }): Promise<null> => {
		const propre = jeton.trim().slice(0, 100);
		if (propre === '') return null;
		const i = await ctx.db
			.query('inscriptionsAttente')
			.withIndex('by_jeton', (q) => q.eq('jeton', propre))
			.unique();
		if (i === null || i.confirmeeLe !== undefined || estEchue(i, Date.now())) return null;
		await ctx.db.patch(i._id, { confirmeeLe: Date.now() });
		return null;
	}
});

/** Quitter la liste efface l'inscription, confirmée ou non. */
export const quitter = mutation({
	args: { jeton: v.string() },
	returns: v.null(),
	handler: async (ctx, { jeton }): Promise<null> => {
		const propre = jeton.trim().slice(0, 100);
		if (propre === '') return null;
		const i = await ctx.db
			.query('inscriptionsAttente')
			.withIndex('by_jeton', (q) => q.eq('jeton', propre))
			.unique();
		if (i !== null) await ctx.db.delete(i._id);
		return null;
	}
});

export const envoyerLaConfirmation = internalMutation({
	args: { inscriptionId: v.id('inscriptionsAttente') },
	returns: v.null(),
	handler: async (ctx, { inscriptionId }): Promise<null> => {
		const i = await ctx.db.get(inscriptionId);
		if (i === null || i.confirmeeLe !== undefined) return null;
		if (shouldSkipTestEmail('envoyerLaConfirmation', i.email)) return null;
		assertResendApiKey();
		const site = (process.env.SITE_URL ?? SITE_CANONIQUE).replace(/\/$/, '');
		const donnees = {
			url: `${site}/attente/${i.jeton}`,
			jours: Math.round(CONFIRMATION_VALABLE_MS / (24 * 60 * 60 * 1000))
		};
		await resend.sendEmail(ctx, {
			from: expediteurNomme(requireEnv('AUTH_EMAIL', { feature: 'liste d’attente' })),
			to: i.email,
			subject: OBJET_CONFIRMATION_ATTENTE,
			html: confirmationAttenteHtml(donnees),
			text: confirmationAttenteTexte(donnees),
			headers: [
				{ name: 'X-Email-Category', value: 'liste-attente' },
				{ name: 'X-Email-Template', value: 'confirmation-attente' }
			]
		});
		return null;
	}
});

/** Chaque nuit : les inscriptions non confirmées passé leur lien, les confirmées trop anciennes. */
export const effacerLesEchues = internalMutation({
	args: {},
	returns: v.number(),
	handler: async (ctx): Promise<number> => {
		const maintenant = Date.now();
		const echues = (
			await ctx.db.query('inscriptionsAttente').withIndex('by_cree').take(500)
		).filter((i) => estEchue(i, maintenant));
		for (const i of echues) await ctx.db.delete(i._id);
		return echues.length;
	}
});
