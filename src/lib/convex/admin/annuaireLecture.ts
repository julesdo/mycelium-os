import { v } from 'convex/values';
import { internalQuery } from '../_generated/server';

/**
 * Les SIREN déjà au CRM, parmi ceux d'un appel à l'annuaire (75 au plus) : l'écran
 * les montre « déjà dans vos prospects » au lieu de les proposer une seconde fois.
 * Séparé de `annuaire.ts` pour que l'action n'appelle pas son propre module.
 */
export const sirensConnus = internalQuery({
	args: { sirens: v.array(v.string()) },
	returns: v.array(v.string()),
	handler: async (ctx, { sirens }) => {
		const connus: string[] = [];
		for (const siren of sirens.slice(0, 75)) {
			const deja = await ctx.db
				.query('prospects')
				.withIndex('by_siren', (q) => q.eq('siren', siren))
				.first();
			if (deja !== null) connus.push(siren);
		}
		return connus;
	}
});
