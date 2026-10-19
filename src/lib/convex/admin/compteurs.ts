import { v } from 'convex/values';
import { SEUIL_APPELER } from '../../croissance/score';
import { statutClos } from '../../crm/statuts';
import { parcoursDe, type Parcours } from '../../crm/parcours';
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
		interesses: v.number(),
		// Les parcours (19/10/2026) : les prospects encore ouverts de chacun.
		parcoursFournisseurPublic: v.number(),
		parcoursTransporteur: v.number(),
		parcoursExpertComptable: v.number(),
		parcoursPmeLogiciel: v.number(),
		parcoursPilote: v.number(),
		// Collectés il y a plus d'un mois, jamais informés : la même règle que la vue.
		aInformer: v.number(),
		// Le support (16/10/2026) : à vous, chez l'équipe, en attente du client, chez Plume.
		supportAVous: v.number(),
		supportOuvertes: v.number(),
		supportEnAttente: v.number(),
		supportPlume: v.number()
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
		// Une conversation réservée au fondateur ne se compte que pour lui.
		const conversations = async (etat: 'A_NOUS' | 'EN_ATTENTE_CLIENT' | 'PLUME') =>
			(
				await ctx.db
					.query('conversationsSupport')
					.withIndex('by_etat_and_dernier', (q) => q.eq('etat', etat))
					.take(500)
			).filter((c) => c.reserveeAuFondateur !== true || ctx.equipier.role === 'FONDATEUR');
		const chezLEquipe = await conversations('A_NOUS');
		const ouverts = prospects.filter((p) => !statutClos(p.statut));
		const duParcours = (parcours: Parcours) =>
			ouverts.filter((p) => parcoursDe(p) === parcours).length;
		const UN_MOIS = 30 * 24 * 60 * 60 * 1000;

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
				.length,
			parcoursFournisseurPublic: duParcours('FOURNISSEUR_PUBLIC'),
			parcoursTransporteur: duParcours('TRANSPORTEUR'),
			parcoursExpertComptable: duParcours('EXPERT_COMPTABLE'),
			parcoursPmeLogiciel: duParcours('PME_LOGICIEL'),
			parcoursPilote: duParcours('PILOTE'),
			aInformer: ouverts.filter(
				(p) => p.email !== undefined && p.emailBase === undefined && maintenant - p.creeLe > UN_MOIS
			).length,
			supportAVous: chezLEquipe.filter(
				(c) => c.assigneA === undefined || c.assigneA === ctx.equipier.email
			).length,
			supportOuvertes: chezLEquipe.length,
			supportEnAttente: (await conversations('EN_ATTENTE_CLIENT')).length,
			supportPlume: (await conversations('PLUME')).length
		};
	}
});
