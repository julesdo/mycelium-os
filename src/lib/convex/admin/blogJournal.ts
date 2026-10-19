import { v } from 'convex/values';
import { internalMutation } from '../_generated/server';
import { noterAuJournal } from './enveloppe';

/** Une publication du blog, au journal que lit le fondateur (`blogPublication.publier`). */
export const noterPublication = internalMutation({
	args: { auteur: v.string(), adresse: v.string(), titre: v.string() },
	returns: v.null(),
	handler: async (ctx, { auteur, adresse, titre }) => {
		await noterAuJournal(ctx, auteur, {
			action: 'ARTICLE_PUBLIE',
			cible: { type: 'ARTICLE', id: adresse, libelle: titre }
		});
		return null;
	}
});
