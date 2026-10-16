import { v, ConvexError } from 'convex/values';
import { internalMutation, type MutationCtx } from '../_generated/server';
import { components } from '../_generated/api';
import { resend } from '../emails/resend';
import { expediteurNomme } from '../emails/helpers';
import { invitationEquipeHtml, invitationEquipeTexte } from '../emails/modeles/equipe';
import { DESCRIPTIONS_DES_ROLES, toucheAuDernierFondateur } from '../../admin/acces';
import { equipeMutation, equipeQuery, noterAuJournal } from './enveloppe';
import { vRoleEquipe } from './tables';

/**
 * L'ÉQUIPE DE LETIKETTE (16/10/2026) — qui ouvre l'admin, avec quel rôle.
 *
 * Le premier fondateur s'amorce en ligne de commande ; ensuite, seul un fondateur
 * invite, change un rôle ou retire un membre, et chaque geste va au journal. Le
 * dernier fondateur actif ne peut ni partir ni changer de rôle.
 */

const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

function normaliser(email: string): string {
	const e = email.trim().toLowerCase();
	if (!EMAIL.test(e)) throw new ConvexError('Adresse e-mail invalide.');
	return e;
}

/**
 * LE PREMIER FONDATEUR : `npx convex run --prod admin/equipe:amorcer '{"email":"…"}'`.
 * Refusé dès qu'un fondateur actif existe : la suite passe par l'écran Équipe.
 */
export const amorcer = internalMutation({
	args: { email: v.string() },
	returns: v.string(),
	handler: async (ctx, { email }): Promise<string> => {
		const adresse = normaliser(email);
		const membres = await ctx.db.query('equipe').take(500);
		if (membres.some((m) => m.role === 'FONDATEUR' && m.retireLe === undefined)) {
			throw new ConvexError('Un fondateur existe déjà : invitez depuis l’écran Équipe.');
		}
		await ctx.db.insert('equipe', {
			email: adresse,
			role: 'FONDATEUR',
			invitePar: 'amorçage',
			inviteLe: Date.now()
		});
		return `${adresse} est fondateur. Activez la double authentification, puis ouvrez /admin.`;
	}
});

export const membres = equipeQuery('FONDATEUR')({
	args: {},
	returns: v.array(
		v.object({
			email: v.string(),
			nom: v.optional(v.string()),
			role: vRoleEquipe,
			invitePar: v.string(),
			inviteLe: v.number(),
			rejointLe: v.optional(v.number()),
			doubleAuth: v.boolean(),
			moi: v.boolean()
		})
	),
	handler: async (ctx) => {
		const lignes = (await ctx.db.query('equipe').take(500)).filter((m) => m.retireLe === undefined);
		const resultat = [];
		for (const m of lignes) {
			const utilisateur = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
				model: 'user',
				where: [{ field: 'email', operator: 'eq', value: m.email }]
			})) as { name?: string; twoFactorEnabled?: boolean | null } | null;
			resultat.push({
				email: m.email,
				...(utilisateur?.name ? { nom: utilisateur.name } : {}),
				role: m.role,
				invitePar: m.invitePar,
				inviteLe: m.inviteLe,
				...(m.rejointLe === undefined ? {} : { rejointLe: m.rejointLe }),
				doubleAuth: utilisateur?.twoFactorEnabled === true,
				moi: m.email === ctx.equipier.email
			});
		}
		return resultat;
	}
});

export const inviter = equipeMutation('FONDATEUR')({
	args: { email: v.string(), role: vRoleEquipe },
	returns: v.null(),
	handler: async (ctx, { email, role }): Promise<null> => {
		const adresse = normaliser(email);
		const deja = await ctx.db
			.query('equipe')
			.withIndex('by_email', (q) => q.eq('email', adresse))
			.first();
		if (deja !== null && deja.retireLe === undefined) {
			throw new ConvexError('Cette adresse fait déjà partie de l’équipe.');
		}
		if (deja !== null) {
			await ctx.db.patch(deja._id, {
				role,
				invitePar: ctx.equipier.email,
				inviteLe: Date.now(),
				retireLe: undefined,
				rejointLe: undefined
			});
		} else {
			await ctx.db.insert('equipe', {
				email: adresse,
				role,
				invitePar: ctx.equipier.email,
				inviteLe: Date.now()
			});
		}
		await noterAuJournal(ctx, ctx.equipier.email, {
			action: 'MEMBRE_INVITE',
			cible: { type: 'MEMBRE', libelle: `${adresse} (${DESCRIPTIONS_DES_ROLES[role].libelle})` }
		});

		const site = (process.env.SITE_URL ?? '').replace(/\/$/, '');
		if (process.env.RESEND_API_KEY && process.env.AUTH_EMAIL && site !== '') {
			const donnees = {
				invitePar: ctx.equipier.nom,
				roleLibelle: DESCRIPTIONS_DES_ROLES[role].libelle,
				roleDescription: DESCRIPTIONS_DES_ROLES[role].description,
				url: `${site}/connexion?suite=%2Fadmin`
			};
			await resend.sendEmail(ctx, {
				from: expediteurNomme(process.env.AUTH_EMAIL),
				to: adresse,
				subject: 'Rejoignez l’équipe de Letikette',
				html: invitationEquipeHtml(donnees),
				text: invitationEquipeTexte(donnees)
			});
		}
		return null;
	}
});

async function lignesActives(ctx: MutationCtx) {
	return (await ctx.db.query('equipe').take(500)).filter((m) => m.retireLe === undefined);
}

export const changerRole = equipeMutation('FONDATEUR')({
	args: { email: v.string(), role: vRoleEquipe },
	returns: v.null(),
	handler: async (ctx, { email, role }): Promise<null> => {
		const adresse = email.trim().toLowerCase();
		if (toucheAuDernierFondateur(await lignesActives(ctx), adresse, role)) {
			throw new ConvexError('L’équipe garde au moins un fondateur.');
		}
		const membre = await ctx.db
			.query('equipe')
			.withIndex('by_email', (q) => q.eq('email', adresse))
			.first();
		if (membre === null || membre.retireLe !== undefined) {
			throw new ConvexError('Ce membre ne fait plus partie de l’équipe.');
		}
		await ctx.db.patch(membre._id, { role });
		await noterAuJournal(ctx, ctx.equipier.email, {
			action: 'ROLE_CHANGE',
			cible: { type: 'MEMBRE', libelle: `${adresse} → ${DESCRIPTIONS_DES_ROLES[role].libelle}` }
		});
		return null;
	}
});

export const retirer = equipeMutation('FONDATEUR')({
	args: { email: v.string() },
	returns: v.null(),
	handler: async (ctx, { email }): Promise<null> => {
		const adresse = email.trim().toLowerCase();
		if (toucheAuDernierFondateur(await lignesActives(ctx), adresse, 'RETIRE')) {
			throw new ConvexError('L’équipe garde au moins un fondateur.');
		}
		const membre = await ctx.db
			.query('equipe')
			.withIndex('by_email', (q) => q.eq('email', adresse))
			.first();
		if (membre === null || membre.retireLe !== undefined) return null;
		await ctx.db.patch(membre._id, { retireLe: Date.now() });
		await noterAuJournal(ctx, ctx.equipier.email, {
			action: 'MEMBRE_RETIRE',
			cible: { type: 'MEMBRE', libelle: adresse }
		});
		return null;
	}
});

export const journal = equipeQuery('FONDATEUR')({
	args: { auteur: v.optional(v.string()) },
	returns: v.array(
		v.object({
			auteur: v.string(),
			action: v.string(),
			cible: v.object({ type: v.string(), id: v.optional(v.string()), libelle: v.string() }),
			le: v.number()
		})
	),
	handler: async (ctx, { auteur }) => {
		const lignes = await ctx.db.query('journalEquipe').withIndex('by_le').order('desc').take(300);
		return lignes
			.filter((l) => auteur === undefined || l.auteur === auteur)
			.slice(0, 200)
			.map((l) => ({ auteur: l.auteur, action: l.action, cible: l.cible, le: l.le }));
	}
});
