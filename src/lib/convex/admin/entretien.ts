import { v } from 'convex/values';
import { internalMutation } from '../_generated/server';
import { etapeInitiale, parcoursDe } from '../../crm/parcours';

/**
 * L'EFFACEMENT LÉGAL DES PROSPECTS (16/10/2026) : chaque nuit, un prospect sans
 * contact depuis trois ans part, avec ses notes et ses tâches. La liste
 * d'opposition, elle, reste : elle ne contient que des empreintes.
 *
 * ⚠️ TROIS ANS DEPUIS LA COLLECTE OU LE DERNIER CONTACT VENU DU PROSPECT (référentiel
 * de la CNIL sur la gestion commerciale, 19/10/2026). Un e-mail que nous envoyons ne
 * repousse rien : avant, chaque envoi repoussait l'effacement (`dernierContactLe`).
 *
 * ⚠️ JAMAIS UN « STOP ». Il ne garde plus aucune coordonnée, et c'est lui qui empêche
 * un prospect sans e-mail (donc sans empreinte d'opposition) de revenir par un import
 * ou par l'annuaire : effacé, rien ne retiendrait plus son SIREN. Jamais un inscrit
 * ni un gagné non plus : ce sont des clients.
 */

const TROIS_ANS = 3 * 365 * 24 * 60 * 60 * 1000;

export const effacerLesAnciens = internalMutation({
	args: {},
	returns: v.number(),
	handler: async (ctx): Promise<number> => {
		const limite = Date.now() - TROIS_ANS;
		const anciens = (await ctx.db.query('prospects').withIndex('by_cree').take(500)).filter(
			(p) =>
				p.statut !== 'INSCRIT' &&
				p.statut !== 'GAGNE' &&
				p.statut !== 'STOP' &&
				(p.dernierContactDuProspectLe ?? p.creeLe) < limite
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

/**
 * LA REPRISE DES PROSPECTS D'AVANT LE 19/10/2026 : un parcours, sa première étape et un
 * jeton de désinscription à ceux qui n'en ont pas. À lancer une fois, par lots :
 * `npx convex run --prod admin/entretien:reprendreLesParcours` jusqu'à ce qu'il rende 0.
 */
export const reprendreLesParcours = internalMutation({
	args: {},
	returns: v.number(),
	handler: async (ctx): Promise<number> => {
		let repris = 0;
		for (const p of await ctx.db.query('prospects').withIndex('by_cree').take(4000)) {
			if (p.parcours !== undefined && p.jetonDesinscription !== undefined) continue;
			const parcours = parcoursDe(p);
			await ctx.db.patch(p._id, {
				parcours,
				...(p.etapeParcours === undefined ? { etapeParcours: etapeInitiale(parcours) } : {}),
				...(p.jetonDesinscription === undefined ? { jetonDesinscription: crypto.randomUUID() } : {})
			});
			repris += 1;
			if (repris >= 300) break;
		}
		return repris;
	}
});
