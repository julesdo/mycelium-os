import { defineTable } from 'convex/server';
import { v } from 'convex/values';

/**
 * LES TABLES DU MOTEUR DE CROISSANCE (16/10/2026).
 *
 * Ce que Letikette sait de ses propres clients — d'où ils viennent, où ils en
 * sont — et jamais rien de leurs débiteurs. Cloisonnées et purgées comme le
 * reste : un établissement effacé ne laisse pas sa trace ici.
 */

export const vSourceVisite = v.object({
	canal: v.union(
		v.literal('direct'),
		v.literal('recherche'),
		v.literal('assistant'),
		v.literal('social'),
		v.literal('campagne'),
		v.literal('site')
	),
	pageEntree: v.string(),
	referent: v.optional(v.string()),
	utmSource: v.optional(v.string()),
	utmMedium: v.optional(v.string()),
	utmCampaign: v.optional(v.string())
});

const date = v.optional(v.number());
export const vEtapes = v.object({
	INSCRIT: date,
	ENTREPRISE: date,
	FACTURES_DEPOSEES: date,
	MONTANT_REVELE: date,
	RELANCES_ACTIVEES: date,
	ESSAI: date,
	ABONNE: date,
	MONTEE_EN_GAMME: date,
	A_RISQUE: date,
	RESILIE: date,
	RECONQUIS: date
});

export const vCleConseil = v.union(
	v.literal('bienvenue'),
	v.literal('il-manque-vos-factures'),
	v.literal('ce-qui-vous-est-du'),
	v.literal('ce-qui-partirait')
);

export const croissanceTables = {
	parcoursComptes: defineTable({
		organizationId: v.id('organizations'),
		source: v.optional(vSourceVisite),
		etapes: vEtapes,
		formuleVue: v.optional(v.union(v.literal('solo'), v.literal('equipe'), v.literal('pro'))),
		rythmeVu: v.optional(v.union(v.literal('mensuel'), v.literal('annuel'))),
		score: v.optional(v.number()),
		raisonsDuScore: v.optional(v.array(v.string())),
		/** La dernière ouverture du choix de formule. */
		interetFormuleLe: v.optional(v.number()),
		/** Quand regarder de nouveau s'il y a un conseil à envoyer ; absent : rien en vue. */
		prochainConseilLe: v.optional(v.number()),
		releveLe: v.optional(v.number()),
		/** Le prospect du CRM rapproché de ce compte à son inscription (`admin/`). */
		prospectId: v.optional(v.id('prospects')),
		/** La tâche « Appeler » créée au franchissement du score de 60, une fois. */
		tacheScoreLe: v.optional(v.number())
	})
		.index('by_org', ['organizationId'])
		.index('by_prochain_conseil', ['prochainConseilLe']),

	envoisCroissance: defineTable({
		organizationId: v.id('organizations'),
		userId: v.string(),
		cle: vCleConseil,
		le: v.number()
	}).index('by_org', ['organizationId'])
};
