import { v } from 'convex/values';
import { internalMutation } from '../_generated/server';
import { calculerLaMesure } from '../../support/mesure';
import type { Id } from '../_generated/dataModel';

/**
 * LA MESURE DU SUPPORT, MATÉRIALISÉE CHAQUE HEURE (16/10/2026). Soixante jours de
 * conversations (trente, et les trente d'avant), calculés par `support/mesure.ts`, posés
 * dans un seul document que lisent l'écran de la mesure et le délai annoncé aux gérants.
 */
export const materialiser = internalMutation({
	args: {},
	returns: v.null(),
	handler: async (ctx): Promise<null> => {
		const maintenant = Date.now();
		const conversations = await ctx.db
			.query('conversationsSupport')
			.withIndex('by_creee', (q) => q.gte('creeeLe', maintenant - 60 * 24 * 60 * 60 * 1000))
			.take(5000);
		const mesure = calculerLaMesure(
			conversations.map((c) => ({
				id: c._id,
				titre: '',
				creeeLe: c.creeeLe,
				etat: c.etat,
				...(c.passeeLe === undefined ? {} : { passeeLe: c.passeeLe }),
				...(c.raisonDePassage === undefined ? {} : { raisonDePassage: c.raisonDePassage }),
				...(c.sujet === undefined ? {} : { sujet: c.sujet }),
				...(c.issue === undefined ? {} : { issue: c.issue }),
				...(c.premiereReponseOuvreeMin === undefined
					? {}
					: { premiereReponseOuvreeMin: c.premiereReponseOuvreeMin }),
				...(c.resolutionOuvreeMin === undefined ? {} : { resolutionOuvreeMin: c.resolutionOuvreeMin }),
				...(c.avis === undefined ? {} : { avis: { utile: c.avis.utile } }),
				ouiPlume: c.ouiPlume ?? 0,
				nonPlume: c.nonPlume ?? 0
			})),
			maintenant
		);
		const document = {
			calculeeLe: mesure.calculeeLe,
			entonnoir: mesure.entonnoir,
			precedent: mesure.precedent,
			medianes: mesure.medianes,
			tauxDeOuiPlume: mesure.tauxDeOuiPlume,
			satisfaction: mesure.satisfaction,
			parSujet: [...mesure.parSujet],
			// Aucun texte : des identifiants, que l'écran relit en direct.
			lacunes: mesure.lacunes.map((l) => ({
				id: l.id as Id<'conversationsSupport'>,
				...(l.sujet === undefined ? {} : { sujet: l.sujet }),
				raison: l.raison
			}))
		};
		const existant = await ctx.db.query('mesuresSupport').first();
		if (existant === null) await ctx.db.insert('mesuresSupport', document);
		else await ctx.db.replace(existant._id, document);
		return null;
	}
});
