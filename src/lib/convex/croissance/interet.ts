import { v } from 'convex/values';
import { authedMutation } from '../functions';
import { getUserOrg } from '../lib/auth';

/**
 * LE GÉRANT A OUVERT LE CHOIX DE FORMULE (16/10/2026) : un signal d'intérêt pour
 * le score (`croissance/score.ts`). Appelé sans attendre à côté de
 * `suivre('paiement-ouvert')` ; une erreur ici n'empêche jamais le paiement.
 */
export const noterInteretFormule = authedMutation({
	args: {},
	returns: v.null(),
	handler: async (ctx): Promise<null> => {
		const { organizationId } = await getUserOrg(ctx);
		const parcours = await ctx.db
			.query('parcoursComptes')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.first();
		if (parcours !== null) await ctx.db.patch(parcours._id, { interetFormuleLe: Date.now() });
		return null;
	}
});
