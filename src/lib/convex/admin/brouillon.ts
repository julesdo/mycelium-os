'use node';

import { v } from 'convex/values';
import { internal } from '../_generated/api';
import { extraireAvecClaude } from '../../socle/documents/extracteur';
import { relireLeMessageDeLEquipe } from '../../support/filtres';
import {
	brouillonSchema,
	construireMessageBrouillon,
	construirePromptBrouillon
} from '../../support/prompt-brouillon';
import { equipeAction } from './action';

/**
 * « BROUILLON DE PLUME » — une réponse proposée à l'équipe, qu'un membre relit avant de
 * l'envoyer sous son prénom. `null` quand il n'y en a pas : fil non vérifié, appel tombé,
 * ou brouillon qui ne passerait pas les lignes rouges.
 */
export const preparer = equipeAction('SUPPORT')({
	args: { conversationId: v.id('conversationsSupport') },
	returns: v.union(v.string(), v.null()),
	handler: async (ctx, { conversationId }): Promise<string | null> => {
		const lu = await ctx.runQuery(internal.admin.brouillonLecture.pourBrouillon, {
			conversationId,
			role: ctx.equipier.role
		});
		if (lu === null || lu.fil.length === 0) return null;
		try {
			const { doc } = await extraireAvecClaude({
				contenu: { type: 'texte', texte: construireMessageBrouillon(lu) },
				schema: brouillonSchema,
				prompt: construirePromptBrouillon()
			});
			return relireLeMessageDeLEquipe(doc.texte).refus === null ? doc.texte.trim() : null;
		} catch {
			return null;
		}
	}
});
