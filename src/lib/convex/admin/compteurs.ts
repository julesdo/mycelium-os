import { v } from 'convex/values';
import { SEUIL_APPELER } from '../../croissance/score';
import { statutClos } from '../../crm/statuts';
import { bornesDuJourDeParis } from '../../admin/dates';
import { equipeQuery } from './enveloppe';

/**
 * LES COMPTES DE LA BARRE LATÉRALE DU CRM (16/10/2026, sur Attio et Lightfield) :
 * combien de fiches derrière chaque entrée, et les tâches dues aujourd'hui.
 * Les mêmes règles que les vues qu'ils annoncent (`comptes.liste`,
 * `prospects.liste`) : un compte qui ne dit pas la même chose que la liste ment.
 */
export const compteurs = equipeQuery('LECTURE')({
	args: {},
	returns: v.object({
		tachesDues: v.number(),
		comptes: v.number(),
		aAppeler: v.number(),
		enEssai: v.number(),
		prospects: v.number(),
		sansAction: v.number(),
		aRelancer: v.number(),
		interesses: v.number()
	}),
	handler: async (ctx) => {
		const maintenant = Date.now();
		const { fin } = bornesDuJourDeParis(maintenant);

		const ouvertes = await ctx.db
			.query('tachesCrm')
			.withIndex('by_faite_et_pour', (q) => q.eq('faiteLe', undefined).lt('pour', fin))
			.take(500);

		const organisations = await ctx.db.query('organizations').take(2000);
		const parcours = await ctx.db.query('parcoursComptes').take(2000);
		const prospects = await ctx.db.query('prospects').take(3000);

		return {
			tachesDues: ouvertes.length,
			comptes: organisations.length,
			aAppeler: parcours.filter((p) => (p.score ?? 0) >= SEUIL_APPELER).length,
			enEssai: organisations.filter((o) => o.paddleStatus === 'trialing').length,
			prospects: prospects.length,
			sansAction: prospects.filter(
				(p) => !statutClos(p.statut) && p.prochaineActionLe === undefined
			).length,
			aRelancer: prospects.filter(
				(p) =>
					!statutClos(p.statut) &&
					p.prochaineActionLe !== undefined &&
					p.prochaineActionLe <= maintenant
			).length,
			interesses: prospects.filter((p) => p.statut === 'INTERESSE' || p.statut === 'A_REPONDU')
				.length
		};
	}
});
