import { v } from 'convex/values';
import { query } from '../_generated/server';
import { authComponent } from '../auth';
import { verdictDAcces } from '../../admin/acces';
import { equipeMutation } from './enveloppe';
import { vRoleEquipe } from './tables';

/**
 * OÙ EN EST LA PERSONNE CONNECTÉE, VUE DE L'ADMIN (16/10/2026).
 *
 * Sans enveloppe : c'est elle qui dit au navigateur quoi montrer (l'admin, la page
 * « Réservé à l'équipe de Letikette », ou celle qui mène à la double
 * authentification). Elle ne rend aucune donnée d'un compte.
 */
export const monAcces = query({
	args: {},
	returns: v.object({
		etat: v.union(
			v.literal('SESSION'),
			v.literal('HORS_EQUIPE'),
			v.literal('DOUBLE_AUTH_REQUISE'),
			v.literal('OK')
		),
		role: v.optional(vRoleEquipe),
		arrive: v.optional(v.boolean())
	}),
	handler: async (ctx) => {
		const utilisateur = ((await authComponent.safeGetAuthUser(ctx)) ?? null) as {
			email: string;
			emailVerified?: boolean;
			twoFactorEnabled?: boolean | null;
		} | null;
		if (utilisateur === null) return { etat: 'SESSION' as const };
		const email = utilisateur.email.trim().toLowerCase();
		const membre = await ctx.db
			.query('equipe')
			.withIndex('by_email', (q) => q.eq('email', email))
			.first();
		const verdict = verdictDAcces(
			{
				utilisateur: {
					email,
					emailVerified: utilisateur.emailVerified === true,
					twoFactorEnabled: utilisateur.twoFactorEnabled === true
				},
				membre:
					membre === null
						? null
						: {
								role: membre.role,
								...(membre.retireLe === undefined ? {} : { retireLe: membre.retireLe })
							}
			},
			'LECTURE'
		);
		if (verdict.ok) {
			return { etat: 'OK' as const, role: verdict.role, arrive: membre?.rejointLe !== undefined };
		}
		return {
			etat:
				verdict.raison === 'DOUBLE_AUTH'
					? ('DOUBLE_AUTH_REQUISE' as const)
					: ('HORS_EQUIPE' as const)
		};
	}
});

/** La première ouverture de l'admin par un membre invité : il a rejoint l'équipe. */
export const noterArrivee = equipeMutation('LECTURE')({
	args: {},
	returns: v.null(),
	handler: async (ctx): Promise<null> => {
		const membre = await ctx.db
			.query('equipe')
			.withIndex('by_email', (q) => q.eq('email', ctx.equipier.email))
			.first();
		if (membre !== null && membre.rejointLe === undefined) {
			await ctx.db.patch(membre._id, { rejointLe: Date.now() });
		}
		return null;
	}
});
