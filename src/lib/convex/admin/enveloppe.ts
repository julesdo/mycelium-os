import { customCtx, customMutation, customQuery } from 'convex-helpers/server/customFunctions';
import { ConvexError, type Infer } from 'convex/values';
import { mutation, query, type MutationCtx, type QueryCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';
import { authComponent } from '../auth';
import { verdictDAcces, type RoleEquipe } from '../../admin/acces';
import type { vCibleJournal } from './tables';

/**
 * L'ENVELOPPE DES FONCTIONS DE L'ADMIN (16/10/2026).
 *
 * Toute fonction publique de `convex/admin/` passe par `equipeQuery(role)` ou
 * `equipeMutation(role)`. À chaque appel : la session, l'adresse vérifiée,
 * l'appartenance à l'équipe (non retiré), la double authentification, le rôle —
 * le verdict de `src/lib/admin/acces.ts`. Le refus nomme ce qui manque.
 */

export interface Equipier {
	readonly email: string;
	readonly role: RoleEquipe;
	readonly userId: string;
	readonly nom: string;
}

type UtilisateurAuth = {
	_id: string;
	email: string;
	name?: string;
	emailVerified?: boolean;
	twoFactorEnabled?: boolean | null;
};

export async function lireLEquipier(
	ctx: QueryCtx | MutationCtx,
	roleMin: RoleEquipe
): Promise<Equipier> {
	const utilisateur = ((await authComponent.safeGetAuthUser(ctx)) ??
		null) as UtilisateurAuth | null;
	const email = utilisateur?.email.trim().toLowerCase() ?? '';
	const membre =
		utilisateur === null
			? null
			: await ctx.db
					.query('equipe')
					.withIndex('by_email', (q) => q.eq('email', email))
					.first();
	const verdict = verdictDAcces(
		{
			utilisateur:
				utilisateur === null
					? null
					: {
							email,
							...(utilisateur.emailVerified === undefined
								? {}
								: { emailVerified: utilisateur.emailVerified }),
							...(utilisateur.twoFactorEnabled === undefined
								? {}
								: { twoFactorEnabled: utilisateur.twoFactorEnabled })
						},
			membre:
				membre === null
					? null
					: {
							role: membre.role,
							...(membre.retireLe === undefined ? {} : { retireLe: membre.retireLe })
						}
		},
		roleMin
	);
	if (!verdict.ok || utilisateur === null) {
		throw new ConvexError(verdict.ok ? 'Connectez-vous.' : verdict.message);
	}
	return { email, role: verdict.role, userId: utilisateur._id, nom: utilisateur.name ?? email };
}

export function equipeQuery(roleMin: RoleEquipe) {
	return customQuery(
		query,
		customCtx(async (ctx) => ({ equipier: await lireLEquipier(ctx, roleMin) }))
	);
}

export function equipeMutation(roleMin: RoleEquipe) {
	return customMutation(
		mutation,
		customCtx(async (ctx) => ({ equipier: await lireLEquipier(ctx, roleMin) }))
	);
}

/** Inscrit un geste de l'équipe au journal que lit le fondateur. */
export async function noterAuJournal(
	ctx: MutationCtx,
	auteur: string,
	entree: {
		readonly action:
			| 'FICHE_OUVERTE'
			| 'MEMBRE_INVITE'
			| 'ROLE_CHANGE'
			| 'MEMBRE_RETIRE'
			| 'IMPORT'
			| 'PROSPECT_EFFACE'
			| 'CONVERSATION_OUVERTE'
			| 'CONTENU_RETIRE'
			| 'RELANCES_SUSPENDUES'
			| 'ARTICLE_PUBLIE';
		readonly cible: Infer<typeof vCibleJournal>;
		readonly organizationId?: Id<'organizations'>;
	}
): Promise<void> {
	await ctx.db.insert('journalEquipe', { auteur, ...entree, le: Date.now() });
}
