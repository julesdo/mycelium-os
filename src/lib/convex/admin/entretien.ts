import { v } from 'convex/values';
import { internalMutation } from '../_generated/server';

/**
 * L'EFFACEMENT LÉGAL DES PROSPECTS (16/10/2026) : chaque nuit, un prospect sans
 * contact depuis trois ans (hors « Inscrit ») part, avec ses notes et ses tâches.
 * La liste d'opposition, elle, reste : elle ne contient que des empreintes.
 */

const TROIS_ANS = 3 * 365 * 24 * 60 * 60 * 1000;

export const effacerLesAnciens = internalMutation({
	args: {},
	returns: v.number(),
	handler: async (ctx): Promise<number> => {
		const limite = Date.now() - TROIS_ANS;
		const anciens = (await ctx.db.query('prospects').withIndex('by_cree').take(500)).filter(
			(p) => p.statut !== 'INSCRIT' && (p.dernierContactLe ?? p.creeLe) < limite
		);
		for (const p of anciens) {
			for (const e of await ctx.db
				.query('evenementsCrm')
				.withIndex('by_prospect', (q) => q.eq('prospectId', p._id))
				.take(500)) {
				await ctx.db.delete(e._id);
			}
			for (const t of await ctx.db
				.query('tachesCrm')
				.withIndex('by_prospect', (q) => q.eq('prospectId', p._id))
				.take(500)) {
				await ctx.db.delete(t._id);
			}
			await ctx.db.delete(p._id);
		}
		return anciens.length;
	}
});
