import { v } from 'convex/values';
import { internalQuery } from '../_generated/server';
import { vRoleEquipe } from './tables';

/**
 * CE QUE LIT LE BROUILLON DE PLUME : la conversation, ses messages dits (ni notes ni
 * événements), et rien d'autre. `null` pour un fil qui porte un e-mail non vérifié, ou
 * une conversation réservée que ce rôle ne voit pas.
 */
export const pourBrouillon = internalQuery({
	args: { conversationId: v.id('conversationsSupport'), role: vRoleEquipe },
	returns: v.union(
		v.null(),
		v.object({
			prenomDuGerant: v.string(),
			fil: v.array(
				v.object({
					auteur: v.union(v.literal('GERANT'), v.literal('PLUME'), v.literal('EQUIPE')),
					texte: v.string()
				})
			)
		})
	),
	handler: async (ctx, { conversationId, role }) => {
		const conversation = await ctx.db.get(conversationId);
		if (conversation === null || !conversation.verifiee) return null;
		if (conversation.reserveeAuFondateur === true && role !== 'FONDATEUR') return null;
		const messages = await ctx.db
			.query('messagesSupport')
			.withIndex('by_conversation', (q) => q.eq('conversationId', conversationId))
			.take(200);
		if (messages.some((m) => m.genre === 'NON_VERIFIE')) return null;
		const fil = [];
		for (const m of messages) {
			if (m.genre !== 'MESSAGE' || m.retireLe !== undefined) continue;
			if (m.auteur === 'GERANT' || m.auteur === 'PLUME' || m.auteur === 'EQUIPE') {
				fil.push({ auteur: m.auteur, texte: m.texte });
			}
		}
		return {
			prenomDuGerant: (conversation.auteurNom ?? '').split(' ')[0] ?? '',
			fil: fil.slice(-20)
		};
	}
});
