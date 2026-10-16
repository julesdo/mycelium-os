'use node';

import { v } from 'convex/values';
import { internalAction } from '../_generated/server';
import { internal } from '../_generated/api';
import { extraireAvecClaude, type UsageExtraction } from '../../socle/documents/extracteur';
import { estimerCout } from '../../socle/modele/cout';
import { DELAI_DE_PLUME_MS } from '../../support/conversation';
import { filtrerReponseSupport } from '../../support/filtres';
import {
	construireMessageSupport,
	construirePromptSupport,
	reponseSupportSchema,
	type ReponseSupport
} from '../../support/prompt-support';

/**
 * PLUME SUPPORT RÉPOND (16/10/2026, spec § 4).
 *
 * Il lit la base d'aide (dans le prompt, figé et mis en cache) et le contexte du
 * compte (des scalaires, jamais un dossier), répond en phrases sourcées, puis ses
 * phrases passent les filtres. Toute panne — clé absente, appel tombé, quarante-cinq
 * secondes dépassées, toutes les phrases retirées — fait passer la conversation à
 * l'équipe : le gérant n'attend jamais une réponse qui ne viendra pas.
 *
 * ⚠️ AUCUNE EXCEPTION NE REMONTE : une erreur d'action disparaît dans les journaux du
 * serveur, et le gérant regarderait trois points pour toujours.
 */
export const repondre = internalAction({
	args: {
		conversationId: v.id('conversationsSupport'),
		messageId: v.id('messagesSupport'),
		reformuler: v.boolean()
	},
	returns: v.null(),
	handler: async (ctx, { conversationId, messageId, reformuler }): Promise<null> => {
		const lu = await ctx.runQuery(internal.support.lecture.pourPlume, {
			conversationId,
			messageId
		});
		if (lu === null) return null;

		let resultat: { doc: ReponseSupport; usage: UsageExtraction } | null;
		try {
			resultat = await Promise.race([
				extraireAvecClaude({
					contenu: {
						type: 'texte',
						texte: construireMessageSupport({ ...lu, reformuler })
					},
					schema: reponseSupportSchema,
					prompt: construirePromptSupport()
				}),
				new Promise<null>((resoudre) => setTimeout(() => resoudre(null), DELAI_DE_PLUME_MS))
			]);
		} catch {
			resultat = null;
		}
		if (resultat === null) {
			await ctx.runMutation(internal.support.lecture.consignerPanne, { conversationId, messageId });
			return null;
		}

		const { doc, usage } = resultat;
		const { gardees } = filtrerReponseSupport(doc.phrases);
		await ctx.runMutation(internal.support.lecture.consignerReponse, {
			conversationId,
			messageId,
			phrases: gardees.map((p) => ({
				texte: p.texte,
				source: {
					genre: p.source.genre,
					...(p.source.cle === undefined ? {} : { cle: p.source.cle })
				}
			})),
			ecrans: doc.ecrans,
			sujet: doc.sujet,
			nePeutPasRepondre: doc.nePeutPasRepondre,
			questionDeDossier: doc.questionDeDossier,
			usage: { ...usage, coutEstime: estimerCout(usage) }
		});
		return null;
	}
});
