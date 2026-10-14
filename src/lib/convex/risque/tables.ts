import { defineTable } from 'convex/server';
import { v } from 'convex/values';
import { vCorpsDAnalyse, vNiveau } from './validateurs';

/**
 * LES TABLES DE L'ANALYSE DU RISQUE (13/10/2026).
 *
 * ⚠️ RIEN N'EST MUTUALISÉ. Deux établissements qui analysent la même entreprise
 * paient chacun leur analyse et gardent chacun la leur : la donnée publique
 * atterrit là où elle sert, comme le radar du journal officiel, et la purge RGPD
 * d'un établissement efface tout ce qu'il a demandé.
 */
export const risqueTables = {
	/**
	 * UNE ANALYSE PAR ENTREPRISE ET PAR ÉTABLISSEMENT, refaite en place : la
	 * dernière, plus l'historique de son indice (pour « ce qui a changé » et la
	 * courbe). Un client (`debiteurId`) ou une entreprise qu'on s'apprête à servir.
	 */
	analysesRisque: defineTable({
		organizationId: v.id('organizations'),
		siren: v.string(),
		debiteurId: v.optional(v.id('debiteurs')),
		analyseLe: v.number(),
		demandePar: v.string(),
		indicePrecedent: v.optional(v.number()),
		niveauPrecedent: v.optional(vNiveau),
		/** Les indices successifs, les plus anciens d'abord : vingt-quatre au plus. */
		historique: v.array(v.object({ le: v.number(), indice: v.number() })),
		...vCorpsDAnalyse
	})
		.index('by_org', ['organizationId'])
		.index('by_org_and_siren', ['organizationId', 'siren'])
		.index('by_org_and_debiteur', ['organizationId', 'debiteurId'])
		/**
		 * ⚠️ LE SECOND INDEX DU PRODUIT QUI TRAVERSE LES ORGANISATIONS, après
		 * `debiteurs.by_siren`, et pour la même raison mesurée : la relecture
		 * mensuelle cherche, en une passe, les analyses de plus d'un mois de tous
		 * les établissements. IL N'EST NOMMÉ QUE PAR `relecture.ts`, qui n'expose
		 * aucune fonction authentifiée.
		 */
		.index('by_date', ['analyseLe']),

	/**
	 * LES ANALYSES LANCÉES PAR MOIS, pour tenir le budget de crédits Pappers d'un
	 * établissement (`LIMITES.analysesParMois`, selon la formule).
	 */
	consommationRisque: defineTable({
		organizationId: v.id('organizations'),
		/** `AAAA-MM`. */
		mois: v.string(),
		analyses: v.number()
	})
		.index('by_org', ['organizationId'])
		.index('by_org_and_mois', ['organizationId', 'mois'])
};
