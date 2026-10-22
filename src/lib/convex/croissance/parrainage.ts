import { v } from 'convex/values';
import { internalMutation } from '../_generated/server';
import type { MutationCtx } from '../_generated/server';
import type { Doc, Id } from '../_generated/dataModel';
import { internal } from '../_generated/api';
import { authedMutation, authedQuery } from '../functions';
import { organisationCouranteOuNull } from '../lib/auth';
import { formuleSouscrite, paiementOuvert } from '../billing';
import { montantDuRythme } from '../../config/tarifs';
import {
	codeDepuisOctets,
	codeValide,
	peutRecevoirUneRecompense
} from '../../croissance/parrainage';

/**
 * LA RECOMMANDATION, CÔTÉ CONVEX (21/10/2026, le parcours de l'habitude, moment 7). Le
 * module pur décide (`croissance/parrainage.ts`) ; ici : le lien personnel, l'attribution
 * à l'inscription, le déclenchement à la première vraie échéance payée, et la réserve
 * des mois offerts que `paddle.appliquerLesRecompenses` pose chez Paddle.
 *
 * ⚠️ LE CLOISONNEMENT TIENT : la page de qui recommande ne lit des établissements
 * recommandés que des COMPTES, jamais un nom, un statut nommé ni un montant.
 */

/** Une application chez Paddle tenue plus longtemps est tenue pour perdue. */
const BAIL_MS = 10 * 60 * 1000;

/**
 * L'ATTRIBUTION, à la création de l'établissement (`createOrganization`) : le code du
 * lien suivi, s'il existe et n'est pas celui d'un établissement dont la personne est
 * déjà membre. Posée une fois, jamais après.
 */
export async function attribuerLaRecommandation(
	ctx: MutationCtx,
	organizationId: Id<'organizations'>,
	userId: string,
	code: string | undefined
): Promise<void> {
	const propre = code?.trim().toUpperCase() ?? '';
	if (!codeValide(propre)) return;
	const org = await ctx.db.get(organizationId);
	if (org === null || org.parrainePar !== undefined) return;
	const parrain = await ctx.db
		.query('organizations')
		.withIndex('by_code_parrainage', (q) => q.eq('codeParrainage', propre))
		.unique();
	if (parrain === null || parrain._id === organizationId) return;
	const dejaMembre = await ctx.db
		.query('organizationMembers')
		.withIndex('by_org_and_user', (q) => q.eq('organizationId', parrain._id).eq('userId', userId))
		.unique();
	if (dejaMembre !== null) return;
	await ctx.db.patch(organizationId, { parrainePar: parrain._id });
}

/** Le lien personnel de l'établissement : créé à la première demande, puis toujours le même. */
export const monLienDeRecommandation = authedMutation({
	args: {},
	returns: v.union(v.string(), v.null()),
	handler: async (ctx): Promise<string | null> => {
		const organizationId = await organisationCouranteOuNull(ctx, ctx.user._id);
		if (organizationId === null) return null;
		const org = await ctx.db.get(organizationId);
		if (org === null) return null;
		if (org.codeParrainage !== undefined) return org.codeParrainage;
		for (let essai = 0; essai < 5; essai++) {
			const code = codeDepuisOctets(crypto.getRandomValues(new Uint8Array(10)));
			const pris = await ctx.db
				.query('organizations')
				.withIndex('by_code_parrainage', (q) => q.eq('codeParrainage', code))
				.first();
			if (pris !== null) continue;
			await ctx.db.patch(organizationId, { codeParrainage: code });
			return code;
		}
		return null;
	}
});

/** Ce que la page de la recommandation montre : le lien et des comptes, rien de plus. */
export const mesRecommandations = authedQuery({
	args: {},
	returns: v.union(
		v.null(),
		v.object({
			ouvert: v.boolean(),
			code: v.union(v.string(), v.null()),
			inscrits: v.number(),
			abonnes: v.number(),
			moisOfferts: v.number(),
			moisEnAttente: v.number()
		})
	),
	handler: async (ctx) => {
		const organizationId = await organisationCouranteOuNull(ctx, ctx.user._id);
		if (organizationId === null) return null;
		const org = await ctx.db.get(organizationId);
		if (org === null) return null;
		const recommandes = await ctx.db
			.query('organizations')
			.withIndex('by_parraine_par', (q) => q.eq('parrainePar', organizationId))
			.take(500);
		const recompenses = org.recompensesParrainage ?? [];
		return {
			ouvert: paiementOuvert(),
			code: org.codeParrainage ?? null,
			inscrits: recommandes.length,
			abonnes: recommandes.filter((o) => o.parrainageDeclencheLe !== undefined).length,
			moisOfferts: recompenses.filter((r) => r.appliqueeLe !== undefined).length,
			moisEnAttente: recompenses.filter((r) => r.appliqueeLe === undefined).length
		};
	}
});

async function organisationDeLAbonnement(
	ctx: MutationCtx,
	paddleSubscriptionId: string,
	paddleCustomerId: string
): Promise<Doc<'organizations'> | null> {
	return (
		(await ctx.db
			.query('organizations')
			.withIndex('by_paddle_subscription', (q) =>
				q.eq('paddleSubscriptionId', paddleSubscriptionId)
			)
			.unique()) ??
		(await ctx.db
			.query('organizations')
			.withIndex('by_paddle_customer', (q) => q.eq('paddleCustomerId', paddleCustomerId))
			.first())
	);
}

/**
 * UNE ÉCHÉANCE PAYÉE (le rappel `transaction.completed` de Paddle). La première d'un
 * établissement recommandé, d'un montant non nul — l'essai prélève 0 € —, offre un mois
 * aux deux. Une seule fois : Paddle rejoue ses rappels.
 */
export const noterUneEcheancePayee = internalMutation({
	args: { paddleSubscriptionId: v.string(), paddleCustomerId: v.string(), ttc: v.number() },
	returns: v.null(),
	handler: async (ctx, { paddleSubscriptionId, paddleCustomerId, ttc }): Promise<null> => {
		if (ttc <= 0) return null;
		const filleul = await organisationDeLAbonnement(ctx, paddleSubscriptionId, paddleCustomerId);
		if (filleul === null || filleul.parrainePar === undefined) return null;
		if (filleul.parrainageDeclencheLe !== undefined) return null;
		const maintenant = Date.now();
		await ctx.db.patch(filleul._id, {
			parrainageDeclencheLe: maintenant,
			recompensesParrainage: [
				...(filleul.recompensesParrainage ?? []),
				{ raison: 'FILLEUL', gagneeLe: maintenant }
			],
			recompenseEnAttente: true
		});
		await ctx.scheduler.runAfter(0, internal.paddle.appliquerLesRecompenses, {
			organizationId: filleul._id
		});
		const parrain = await ctx.db.get(filleul.parrainePar);
		const memeClient =
			parrain?.paddleCustomerId !== undefined && parrain.paddleCustomerId === paddleCustomerId;
		if (
			parrain === null ||
			memeClient ||
			!peutRecevoirUneRecompense(parrain.recompensesParrainage ?? [], maintenant)
		) {
			return null;
		}
		await ctx.db.patch(parrain._id, {
			recompensesParrainage: [
				...(parrain.recompensesParrainage ?? []),
				{ raison: 'PARRAIN', gagneeLe: maintenant }
			],
			recompenseEnAttente: true
		});
		await ctx.scheduler.runAfter(0, internal.paddle.appliquerLesRecompenses, {
			organizationId: parrain._id
		});
		return null;
	}
});

/**
 * RÉSERVE LE PROCHAIN MOIS À APPLIQUER : un abonnement vivant chez Paddle, un mois en
 * attente, aucune application en cours. Rend ce qu'il faut à Paddle, ou `null`.
 */
export const _reserverUneRecompense = internalMutation({
	args: { organizationId: v.id('organizations') },
	returns: v.union(
		v.null(),
		v.object({ rang: v.number(), montant: v.number(), abonnementId: v.string() })
	),
	handler: async (ctx, { organizationId }) => {
		const org = await ctx.db.get(organizationId);
		if (org === null || org.paddleSubscriptionId === undefined) return null;
		if (org.paddleStatus !== 'active' && org.paddleStatus !== 'trialing') return null;
		const maintenant = Date.now();
		if (org.recompenseEnCoursLe !== undefined && maintenant - org.recompenseEnCoursLe < BAIL_MS) {
			return null;
		}
		const rang = (org.recompensesParrainage ?? []).findIndex((r) => r.appliqueeLe === undefined);
		const formule = formuleSouscrite(org);
		if (rang === -1 || formule === null) return null;
		await ctx.db.patch(organizationId, { recompenseEnCoursLe: maintenant });
		return {
			rang,
			// Un mois offert : le prix mensuel HT de la formule, pris sur la grille.
			montant: montantDuRythme(formule, 'mensuel') * 100,
			abonnementId: org.paddleSubscriptionId
		};
	}
});

/** Le mois est posé chez Paddle : noté, et l'attente levée s'il n'en reste plus. */
export const _noterLaRecompense = internalMutation({
	args: {
		organizationId: v.id('organizations'),
		rang: v.number(),
		montant: v.number(),
		remiseId: v.string()
	},
	returns: v.null(),
	handler: async (ctx, { organizationId, rang, montant, remiseId }): Promise<null> => {
		const org = await ctx.db.get(organizationId);
		if (org === null) return null;
		const recompenses = (org.recompensesParrainage ?? []).map((r, i) =>
			i === rang ? { ...r, montant, remiseId, appliqueeLe: Date.now() } : r
		);
		await ctx.db.patch(organizationId, {
			recompensesParrainage: recompenses,
			recompenseEnAttente: recompenses.some((r) => r.appliqueeLe === undefined),
			recompenseEnCoursLe: undefined
		});
		return null;
	}
});

/** L'application n'a pas eu lieu (une remise court encore, Paddle a refusé) : elle reviendra. */
export const _libererLaRecompense = internalMutation({
	args: { organizationId: v.id('organizations') },
	returns: v.null(),
	handler: async (ctx, { organizationId }): Promise<null> => {
		const org = await ctx.db.get(organizationId);
		if (org !== null) await ctx.db.patch(organizationId, { recompenseEnCoursLe: undefined });
		return null;
	}
});

/** Chaque jour : les mois qui attendent (une remise de bienvenue finie, un abonnement venu). */
export const reprendreLesRecompenses = internalMutation({
	args: {},
	returns: v.null(),
	handler: async (ctx): Promise<null> => {
		const enAttente = await ctx.db
			.query('organizations')
			.withIndex('by_recompense_en_attente', (q) => q.eq('recompenseEnAttente', true))
			.take(200);
		for (const org of enAttente) {
			await ctx.scheduler.runAfter(0, internal.paddle.appliquerLesRecompenses, {
				organizationId: org._id
			});
		}
		return null;
	}
});
