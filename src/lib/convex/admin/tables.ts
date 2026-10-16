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
		v.literal('IMPORT')
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
		retireLe: v.optional(v.number())
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
			v.literal('PROSPECT_EFFACE')
		),
		cible: vCibleJournal,
		organizationId: v.optional(v.id('organizations')),
		le: v.number()
	})
		.index('by_org', ['organizationId'])
		.index('by_le', ['le'])
};
