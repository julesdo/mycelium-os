import { v } from 'convex/values';
import { internalMutation, type MutationCtx } from '../_generated/server';
import { components } from '../_generated/api';
import { resend } from '../emails/resend';
import { expediteurNomme } from '../emails/helpers';
import {
	alerteDuSupportHtml,
	alerteDuSupportTexte,
	rappelDuSupportHtml,
	rappelDuSupportTexte,
	reponseDuSupportHtml,
	reponseDuSupportTexte
} from '../emails/modeles/support';
import { laReceptionEstOuverte } from './commun';

/**
 * LES E-MAILS DU SUPPORT (16/10/2026, spec § 5.1).
 *
 * ⚠️ RIEN NE PART SANS L'ENVOI CONFIGURÉ, ET RIEN NE PART DANS LES TESTS : sans clé,
 * sans adresse d'envoi ou sans site, la fonction se tait. Le fil, lui, porte tout.
 */

export function envoiPossible(): { expediteur: string; site: string } | null {
	const site = (process.env.SITE_URL ?? '').replace(/\/$/, '');
	if (
		process.env.AUTH_E2E_TEST_SECRET !== undefined ||
		!process.env.RESEND_API_KEY ||
		!process.env.AUTH_EMAIL ||
		site === ''
	) {
		return null;
	}
	return { expediteur: expediteurNomme(process.env.AUTH_EMAIL), site };
}

/** L'adresse VÉRIFIÉE d'un compte, ou `null` : une réponse ne part jamais vers une adresse non prouvée. */
async function adresseVerifiee(ctx: MutationCtx, userId: string): Promise<string | null> {
	const utilisateur = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
		model: 'user',
		where: [{ field: '_id', operator: 'eq', value: userId }]
	})) as { email?: string; emailVerified?: boolean } | null;
	return utilisateur?.email !== undefined && utilisateur.emailVerified === true
		? utilisateur.email
		: null;
}

/**
 * LA RÉPONSE DE L'ÉQUIPE, PAR E-MAIL — dix minutes après, et seulement si elle n'a pas
 * été lue dans le fil (`marquerLue` annule ce départ).
 */
export const envoyerLaReponse = internalMutation({
	args: { messageId: v.id('messagesSupport') },
	returns: v.null(),
	handler: async (ctx, { messageId }): Promise<null> => {
		const message = await ctx.db.get(messageId);
		if (message === null || message.auteur !== 'EQUIPE' || message.retireLe !== undefined) return null;
		await ctx.db.patch(messageId, { emailProgramme: undefined });
		const conversation = await ctx.db.get(message.conversationId);
		if (conversation === null || conversation.auteurUserId === undefined) return null;
		if ((conversation.luParAuteurLe ?? 0) >= message.le) return null;
		const envoi = envoiPossible();
		if (envoi === null) return null;
		const adresse = await adresseVerifiee(ctx, conversation.auteurUserId);
		if (adresse === null) return null;

		const repondreParEmail = laReceptionEstOuverte();
		const donnees = {
			prenom: message.auteurNom ?? 'L’équipe',
			titre: conversation.titre,
			texte: message.texte,
			url: `${envoi.site}/app/aide/${conversation._id}`,
			repondreParEmail
		};
		await resend.sendEmail(ctx, {
			from: envoi.expediteur,
			to: adresse,
			subject: `Re : ${conversation.titre}`,
			html: reponseDuSupportHtml(donnees),
			text: reponseDuSupportTexte(donnees),
			...(repondreParEmail
				? { replyTo: [`fil-${conversation.jeton}@${process.env.SUPPORT_RECEPTION_DOMAINE}`] }
				: {})
		});
		return null;
	}
});

/** Le gérant attendu depuis trois jours : un rappel, une fois. */
export const rappelerLeGerant = internalMutation({
	args: { conversationId: v.id('conversationsSupport') },
	returns: v.null(),
	handler: async (ctx, { conversationId }): Promise<null> => {
		const conversation = await ctx.db.get(conversationId);
		if (conversation === null || conversation.etat !== 'EN_ATTENTE_CLIENT') return null;
		if (conversation.auteurUserId === undefined) return null;
		const envoi = envoiPossible();
		if (envoi === null) return null;
		const adresse = await adresseVerifiee(ctx, conversation.auteurUserId);
		if (adresse === null) return null;
		const donnees = { titre: conversation.titre, url: `${envoi.site}/app/aide/${conversation._id}` };
		await resend.sendEmail(ctx, {
			from: envoi.expediteur,
			to: adresse,
			subject: 'L’équipe attend votre réponse',
			html: rappelDuSupportHtml(donnees),
			text: rappelDuSupportTexte(donnees)
		});
		return null;
	}
});

/**
 * UNE CONVERSATION VIENT DE PASSER À L'ÉQUIPE — un lien, jamais le contenu. Réservée
 * au fondateur (données personnelles, compte compromis), elle ne va qu'à lui.
 */
export const alerterLEquipe = internalMutation({
	args: { conversationId: v.id('conversationsSupport') },
	returns: v.null(),
	handler: async (ctx, { conversationId }): Promise<null> => {
		const conversation = await ctx.db.get(conversationId);
		if (conversation === null || conversation.etat !== 'A_NOUS') return null;
		const envoi = envoiPossible();
		if (envoi === null) return null;
		const reservee = conversation.reserveeAuFondateur === true;
		const membres = (await ctx.db.query('equipe').take(200)).filter(
			(m) =>
				m.retireLe === undefined &&
				m.rejointLe !== undefined &&
				(reservee ? m.role === 'FONDATEUR' : m.role === 'FONDATEUR' || m.role === 'SUPPORT')
		);
		const donnees = { url: `${envoi.site}/admin/support/${conversation._id}`, reservee };
		for (const membre of membres) {
			await resend.sendEmail(ctx, {
				from: envoi.expediteur,
				to: membre.email,
				subject: 'Une conversation vous attend',
				html: alerteDuSupportHtml(donnees),
				text: alerteDuSupportTexte(donnees)
			});
		}
		return null;
	}
});
