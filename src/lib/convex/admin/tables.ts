import { defineTable } from 'convex/server';
import { v } from 'convex/values';

/**
 * LES TABLES DE L'ADMIN (16/10/2026).
 *
 * `equipe` est hors des établissements : c'est l'équipe de Letikette, exemptée
 * nommément du cloisonnement. `journalEquipe` porte un `organizationId` quand
 * l'action touche un établissement, et part avec lui à la purge.
 */

export const vRoleEquipe = v.union(
	v.literal('FONDATEUR'),
	v.literal('SUPPORT'),
	v.literal('LECTURE')
);

export const vCibleJournal = v.object({
	type: v.union(
		v.literal('COMPTE'),
		v.literal('PROSPECT'),
		v.literal('MEMBRE'),
		v.literal('IMPORT'),
		v.literal('CONVERSATION')
	),
	id: v.optional(v.string()),
	libelle: v.string()
});

export const adminTables = {
	equipe: defineTable({
		/** En minuscules : c'est l'adresse vérifiée du compte qui ouvre l'accès. */
		email: v.string(),
		role: vRoleEquipe,
		invitePar: v.string(),
		inviteLe: v.number(),
		rejointLe: v.optional(v.number()),
		retireLe: v.optional(v.number()),
		/** Le prénom que voit le client dans le support (« Camille »), choisi par le membre. */
		prenomAffiche: v.optional(v.string()),
		/** Une vraie photo, posée par le membre lui-même : aucun visage n'est inventé. */
		photoStorageId: v.optional(v.id('_storage'))
	}).index('by_email', ['email']),

	journalEquipe: defineTable({
		/** L'adresse du membre de l'équipe qui a agi. */
		auteur: v.string(),
		action: v.union(
			v.literal('FICHE_OUVERTE'),
			v.literal('MEMBRE_INVITE'),
			v.literal('ROLE_CHANGE'),
			v.literal('MEMBRE_RETIRE'),
			v.literal('IMPORT'),
			v.literal('PROSPECT_EFFACE'),
			// Le support (16/10/2026) : chaque conversation ouverte, chaque contenu retiré,
			// chaque coupure des relances demandée au support.
			v.literal('CONVERSATION_OUVERTE'),
			v.literal('CONTENU_RETIRE'),
			v.literal('RELANCES_SUSPENDUES')
		),
		cible: vCibleJournal,
		organizationId: v.optional(v.id('organizations')),
		le: v.number()
	})
		.index('by_org', ['organizationId'])
		.index('by_le', ['le'])
};

export const vStatutProspect = v.union(
	v.literal('A_CONTACTER'),
	v.literal('CONTACTE'),
	v.literal('RELANCE'),
	v.literal('A_REPONDU'),
	v.literal('INTERESSE'),
	v.literal('INSCRIT'),
	v.literal('PERDU'),
	v.literal('STOP')
);

export const vCible = v.union(v.literal('PME'), v.literal('CABINET'), v.literal('AUTRE'));

export const vTypeEvenementCrm = v.union(
	v.literal('NOTE'),
	v.literal('APPEL'),
	v.literal('EMAIL'),
	v.literal('REPONSE'),
	v.literal('STATUT')
);

/**
 * LES TABLES DU CRM (16/10/2026).
 *
 * `prospects`, `oppositions` et `importsProspects` sont des données de Letikette,
 * exemptées nommément du cloisonnement. `evenementsCrm` et `tachesCrm` portent un
 * `organizationId` quand elles touchent un compte client, et partent avec lui.
 */
export const crmTables = {
	prospects: defineTable({
		entreprise: v.string(),
		siren: v.optional(v.string()),
		activite: v.optional(v.string()),
		effectif: v.optional(v.string()),
		ville: v.optional(v.string()),
		dirigeant: v.optional(v.string()),
		fonction: v.optional(v.string()),
		email: v.optional(v.string()),
		telephone: v.optional(v.string()),
		site: v.optional(v.string()),
		/** La source légale du contact : où il a été trouvé. */
		trouveOu: v.optional(v.string()),
		cible: vCible,
		statut: vStatutProspect,
		prochaineAction: v.optional(v.string()),
		prochaineActionLe: v.optional(v.number()),
		dernierContactLe: v.optional(v.number()),
		notes: v.optional(v.string()),
		/** L'adresse du membre de l'équipe qui s'en occupe. */
		responsable: v.optional(v.string()),
		/** Le compte client, quand le prospect s'est inscrit (rapprochement). */
		compteId: v.optional(v.id('organizations')),
		importId: v.optional(v.id('importsProspects')),
		creePar: v.string(),
		creeLe: v.number()
	})
		.index('by_statut', ['statut'])
		.index('by_email', ['email'])
		.index('by_siren', ['siren'])
		.index('by_compte', ['compteId'])
		.index('by_cree', ['creeLe']),

	oppositions: defineTable({
		/** L'empreinte SHA-256 de l'adresse normalisée : l'adresse elle-même n'est pas gardée. */
		empreinte: v.string(),
		le: v.number()
	}).index('by_empreinte', ['empreinte']),

	evenementsCrm: defineTable({
		organizationId: v.optional(v.id('organizations')),
		prospectId: v.optional(v.id('prospects')),
		type: vTypeEvenementCrm,
		texte: v.optional(v.string()),
		auteur: v.string(),
		le: v.number()
	})
		.index('by_org', ['organizationId'])
		.index('by_prospect', ['prospectId']),

	tachesCrm: defineTable({
		organizationId: v.optional(v.id('organizations')),
		prospectId: v.optional(v.id('prospects')),
		titre: v.string(),
		pour: v.number(),
		assigneA: v.optional(v.string()),
		faiteLe: v.optional(v.number()),
		origine: v.union(v.literal('MAIN'), v.literal('SCORE')),
		creePar: v.string(),
		creeLe: v.number()
	})
		.index('by_org', ['organizationId'])
		.index('by_prospect', ['prospectId'])
		.index('by_faite_et_pour', ['faiteLe', 'pour']),

	importsProspects: defineTable({
		fichier: v.string(),
		lignes: v.number(),
		importes: v.number(),
		ecartes: v.number(),
		oppositions: v.number(),
		par: v.string(),
		le: v.number()
	}).index('by_le', ['le'])
};
