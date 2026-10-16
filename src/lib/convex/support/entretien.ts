import { v } from 'convex/values';
import { internal } from '../_generated/api';
import { internalMutation } from '../_generated/server';
import { ajouterEvenement, passerALEquipe } from './commun';

/**
 * L'ENTRETIEN DU SUPPORT, TOUTES LES QUINZE MINUTES (16/10/2026, spec § 7).
 *
 * Les bascules liées au temps ne dépendent d'aucun geste :
 *   · Plume qui réfléchit depuis plus de trois minutes a perdu son appel : la
 *     conversation passe à l'équipe (`PANNE`), le gérant n'attend pas pour rien ;
 *   · chez Plume, une conversation sans nouvelles 24 h après sa dernière RÉPONSE se
 *     termine — jamais après un passage, qui attend l'équipe ;
 *   · en attente du gérant, un rappel à trois jours, terminée à sept.
 */

const MINUTE = 60 * 1000;
const HEURE = 60 * MINUTE;
const JOUR = 24 * HEURE;

export const entretenir = internalMutation({
	args: {},
	returns: v.null(),
	handler: async (ctx): Promise<null> => {
		const maintenant = Date.now();

		const chezPlume = await ctx.db
			.query('conversationsSupport')
			.withIndex('by_etat_and_dernier', (q) =>
				q.eq('etat', 'PLUME').lt('dernierMessageLe', maintenant - 3 * MINUTE)
			)
			.take(200);
		for (const conversation of chezPlume) {
			if (
				conversation.plumeReflechitDepuis !== undefined &&
				maintenant - conversation.plumeReflechitDepuis > 3 * MINUTE
			) {
				await passerALEquipe(ctx, conversation, { raison: 'PANNE' });
			} else if (
				conversation.plumeReflechitDepuis === undefined &&
				conversation.dernierMessagePar === 'PLUME' &&
				maintenant - conversation.dernierMessageLe > JOUR
			) {
				await ctx.db.patch(conversation._id, {
					etat: 'TERMINEE',
					issue: 'SANS_NOUVELLES',
					termineeLe: maintenant
				});
				await ajouterEvenement(
					ctx,
					conversation,
					'TERMINEE',
					'Conversation terminée, sans nouvelles'
				);
			}
		}

		const enAttente = await ctx.db
			.query('conversationsSupport')
			.withIndex('by_etat_and_dernier', (q) =>
				q.eq('etat', 'EN_ATTENTE_CLIENT').lt('dernierMessageLe', maintenant - 3 * JOUR)
			)
			.take(200);
		for (const conversation of enAttente) {
			if (maintenant - conversation.dernierMessageLe > 7 * JOUR) {
				await ctx.db.patch(conversation._id, {
					etat: 'TERMINEE',
					issue: 'SANS_NOUVELLES',
					termineeLe: maintenant
				});
				await ajouterEvenement(
					ctx,
					conversation,
					'TERMINEE',
					'Conversation terminée, sans nouvelles'
				);
			} else if (conversation.rappelLe === undefined) {
				await ctx.db.patch(conversation._id, { rappelLe: maintenant });
				await ctx.scheduler.runAfter(0, internal.support.emails.rappelerLeGerant, {
					conversationId: conversation._id
				});
			}
		}
		return null;
	}
});

/**
 * UN COMPTE SUPPRIMÉ — ce qu'il a écrit au support reste à l'établissement, sans son
 * nom ni son identifiant (spec § 8). Une conversation sans établissement part entière.
 */
export const oublierAuteur = internalMutation({
	args: { userId: v.string() },
	returns: v.null(),
	handler: async (ctx, { userId }): Promise<null> => {
		const conversations = await ctx.db
			.query('conversationsSupport')
			.withIndex('by_auteur', (q) => q.eq('auteurUserId', userId))
			.take(200);
		for (const conversation of conversations) {
			if (conversation.organizationId === undefined) {
				const messages = await ctx.db
					.query('messagesSupport')
					.withIndex('by_conversation', (q) => q.eq('conversationId', conversation._id))
					.take(500);
				for (const message of messages) await ctx.db.delete(message._id);
				await ctx.db.delete(conversation._id);
			} else {
				await ctx.db.patch(conversation._id, {
					auteurUserId: undefined,
					auteurNom: 'Ancien membre'
				});
			}
		}
		const messages = await ctx.db
			.query('messagesSupport')
			.withIndex('by_auteur_user_and_le', (q) => q.eq('auteurUserId', userId))
			.take(1000);
		for (const message of messages) {
			await ctx.db.patch(message._id, { auteurUserId: undefined, auteurNom: 'Ancien membre' });
		}
		return null;
	}
});
