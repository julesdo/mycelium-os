import { v } from 'convex/values';
import { internalMutation, internalQuery } from '../_generated/server';
import type { Doc, Id } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';
import { ECRANS_D_AIDE } from '../../support/articles';
import { lireContexteDuCompte, vContexteDuCompte } from './contexte';
import { ajouterMessage, compterUneReponse, passerALEquipe } from './commun';
import { vSourcePhrase, vSujet, vUsageSupport } from './tables';

/**
 * CE QUE PLUME SUPPORT LIT ET ÉCRIT (16/10/2026) — les fonctions internes de son action.
 *
 * ⚠️ LA RÉPONSE NE S'ÉCRIT QUE SI ELLE RÉPOND ENCORE À QUELQUE CHOSE. Entre l'appel et
 * le retour du modèle, le gérant a pu demander l'équipe, ou écrire autre chose : la
 * réponse est alors jetée (son coût compté), plutôt que de parler par-dessus l'équipe
 * ou de répondre à une question d'avant.
 */

async function toujoursPourPlume(
	ctx: QueryCtx | MutationCtx,
	conversationId: Id<'conversationsSupport'>,
	messageId: Id<'messagesSupport'>
): Promise<Doc<'conversationsSupport'> | null> {
	const conversation = await ctx.db.get(conversationId);
	if (conversation === null || conversation.etat !== 'PLUME') return null;
	const dernier = (
		await ctx.db
			.query('messagesSupport')
			.withIndex('by_conversation', (q) => q.eq('conversationId', conversationId))
			.order('desc')
			.take(12)
	).find((m) => m.auteur === 'GERANT' && m.genre === 'MESSAGE');
	return dernier?._id === messageId ? conversation : null;
}

export const pourPlume = internalQuery({
	args: { conversationId: v.id('conversationsSupport'), messageId: v.id('messagesSupport') },
	returns: v.union(
		v.null(),
		v.object({
			contexte: vContexteDuCompte,
			historique: v.array(
				v.object({ auteur: v.union(v.literal('GERANT'), v.literal('PLUME')), texte: v.string() })
			),
			question: v.string()
		})
	),
	handler: async (ctx, { conversationId, messageId }) => {
		const conversation = await toujoursPourPlume(ctx, conversationId, messageId);
		if (
			conversation === null ||
			conversation.organizationId === undefined ||
			conversation.auteurUserId === undefined
		) {
			return null;
		}
		const question = await ctx.db.get(messageId);
		if (question === null) return null;
		const precedents = (
			await ctx.db
				.query('messagesSupport')
				.withIndex('by_conversation', (q) =>
					q.eq('conversationId', conversationId).lt('le', question.le)
				)
				.order('desc')
				.take(10)
		)
			.filter(
				(m): m is Doc<'messagesSupport'> & { auteur: 'GERANT' | 'PLUME' } =>
					m.genre === 'MESSAGE' &&
					(m.auteur === 'GERANT' || m.auteur === 'PLUME') &&
					m.retireLe === undefined
			)
			.reverse();
		return {
			contexte: await lireContexteDuCompte(
				ctx,
				conversation.organizationId,
				conversation.auteurUserId
			),
			historique: precedents.map((m) => ({ auteur: m.auteur, texte: m.texte })),
			question: question.texte
		};
	}
});

export const consignerReponse = internalMutation({
	args: {
		conversationId: v.id('conversationsSupport'),
		messageId: v.id('messagesSupport'),
		phrases: v.array(v.object({ texte: v.string(), source: vSourcePhrase })),
		ecrans: v.array(v.string()),
		sujet: vSujet,
		nePeutPasRepondre: v.boolean(),
		questionDeDossier: v.boolean(),
		usage: vUsageSupport
	},
	returns: v.null(),
	handler: async (ctx, args): Promise<null> => {
		const brute = await ctx.db.get(args.conversationId);
		if (brute?.organizationId !== undefined) {
			await compterUneReponse(ctx, brute.organizationId, Date.now());
		}
		const conversation = await toujoursPourPlume(ctx, args.conversationId, args.messageId);
		if (conversation === null) return null;

		await ctx.db.patch(conversation._id, {
			plumeReflechitDepuis: undefined,
			...(conversation.sujet === undefined ? { sujet: args.sujet } : {})
		});
		// Toutes ses phrases retirées par les filtres, et il croyait savoir : une panne.
		if (args.phrases.length === 0 && !args.nePeutPasRepondre) {
			await passerALEquipe(ctx, conversation, { raison: 'PANNE' });
			return null;
		}
		if (args.phrases.length > 0) {
			await ajouterMessage(ctx, conversation, {
				auteur: 'PLUME',
				canal: 'APP',
				genre: 'MESSAGE',
				texte: args.phrases.map((p) => p.texte).join(' '),
				phrases: args.phrases,
				ecrans: args.ecrans.filter((cle) => cle in ECRANS_D_AIDE).slice(0, 2),
				...(args.questionDeDossier ? { questionDeDossier: true } : {}),
				usage: args.usage
			});
		}
		if (args.nePeutPasRepondre) {
			await passerALEquipe(ctx, conversation, { raison: 'LACUNE' });
		}
		return null;
	}
});

/** L'appel n'a pas abouti, ou trop tard : la conversation passe à l'équipe (`PANNE`). */
export const consignerPanne = internalMutation({
	args: { conversationId: v.id('conversationsSupport'), messageId: v.id('messagesSupport') },
	returns: v.null(),
	handler: async (ctx, { conversationId, messageId }): Promise<null> => {
		const conversation = await toujoursPourPlume(ctx, conversationId, messageId);
		if (conversation === null) return null;
		await passerALEquipe(ctx, conversation, { raison: 'PANNE' });
		return null;
	}
});
