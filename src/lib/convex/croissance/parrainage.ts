import { v } from 'convex/values';
import { internalMutation, query } from '../_generated/server';
import type { MutationCtx, QueryCtx } from '../_generated/server';
import type { Doc, Id } from '../_generated/dataModel';
import { internal } from '../_generated/api';
import { authedMutation, authedQuery } from '../functions';
import { organisationCouranteOuNull } from '../lib/auth';
import { formuleSouscrite, paiementOuvert } from '../billing';
import { montantDuRythme, PARRAINAGE } from '../../config/tarifs';
import {
	codeDepuisOctets,
	codeValide,
	moisDeLAnnee,
	peutRecevoirUneRecompense
} from '../../croissance/parrainage';
import { notifier } from '../notifier';

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
/** La page en montre cinquante ; au-delà, les comptes suffisent. */
const INVITATIONS_MONTREES = 50;

/**
 * PRÉVIENT LES ADMINISTRATEURS D'UN ÉTABLISSEMENT : ce sont eux qui paient, et le mois
 * offert se déduit de leur prélèvement. Jamais le nom d'un autre établissement.
 */
async function prevenirLesAdministrateurs(
	ctx: MutationCtx,
	organizationId: Id<'organizations'>,
	titre: string,
	message: string
): Promise<void> {
	const membres = await ctx.db
		.query('organizationMembers')
		.withIndex('by_organization', (q) => q.eq('organizationId', organizationId))
		.take(50);
	for (const membre of membres) {
		if (membre.role !== 'ORG_ADMIN') continue;
		await notifier(ctx, {
			organizationId,
			userId: membre.userId,
			type: 'RECOMMANDATION',
			title: titre,
			message,
			link: '/app/recommander'
		});
	}
}

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
	await prevenirLesAdministrateurs(
		ctx,
		parrain._id,
		'Une entreprise s’est inscrite par votre lien',
		'Quand elle paiera sa première échéance, un mois vous sera offert à tous les deux.'
	);
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

const vInvitation = v.object({ inscriteLe: v.number(), abonneeLe: v.union(v.number(), v.null()) });

const vRecommandation = v.object({
	ouvert: v.boolean(),
	code: v.union(v.string(), v.null()),
	nomEtablissement: v.string(),
	inscrits: v.number(),
	abonnes: v.number(),
	moisOfferts: v.number(),
	moisEnAttente: v.number(),
	moisCetteAnnee: v.number(),
	moisParAn: v.number(),
	valeurDuMois: v.union(v.number(), v.null()),
	invitations: v.array(vInvitation),
	offertPar: v.union(v.string(), v.null()),
	aujourdHui: v.string()
});

export interface RecommandationLue {
	readonly ouvert: boolean;
	readonly code: string | null;
	readonly nomEtablissement: string;
	readonly inscrits: number;
	readonly abonnes: number;
	readonly moisOfferts: number;
	readonly moisEnAttente: number;
	/** Les mois gagnés à recommander sur l'année glissante, sur `moisParAn`. */
	readonly moisCetteAnnee: number;
	readonly moisParAn: number;
	/** Un mois de la formule souscrite, HT, en centimes ; `null` sans abonnement payant. */
	readonly valeurDuMois: number | null;
	/** Les plus récentes d'abord, sans aucun nom. */
	readonly invitations: { inscriteLe: number; abonneeLe: number | null }[];
	/** L'établissement qui vous a recommandé, tant que votre mois n'est pas gagné. */
	readonly offertPar: string | null;
	/** Le jour de la lecture : les dates des invitations se disent en distance. */
	readonly aujourdHui: string;
}

/**
 * CE QUE LA PAGE « RECOMMANDER » MONTRE (22/10/2026, refaite sur Revolut, Gusto, Wise et
 * Numo) : le lien, l'objectif de l'année, chaque invitation par sa date et son étape, et la
 * valeur d'un mois. Des établissements recommandés, des DATES — jamais un nom.
 */
export async function lireLaRecommandation(
	ctx: QueryCtx,
	organizationId: Id<'organizations'>,
	maintenant: number
): Promise<RecommandationLue> {
	const org = await ctx.db.get(organizationId);
	if (org === null) throw new Error('Établissement introuvable');
	const recommandes = await ctx.db
		.query('organizations')
		.withIndex('by_parraine_par', (q) => q.eq('parrainePar', organizationId))
		.take(500);
	const recompenses = org.recompensesParrainage ?? [];
	const formule = formuleSouscrite(org);
	const parrain =
		org.parrainePar === undefined || org.parrainageDeclencheLe !== undefined
			? null
			: await ctx.db.get(org.parrainePar);
	return {
		ouvert: paiementOuvert(),
		code: org.codeParrainage ?? null,
		nomEtablissement: org.name,
		inscrits: recommandes.length,
		abonnes: recommandes.filter((o) => o.parrainageDeclencheLe !== undefined).length,
		moisOfferts: recompenses.filter((r) => r.appliqueeLe !== undefined).length,
		moisEnAttente: recompenses.filter((r) => r.appliqueeLe === undefined).length,
		moisCetteAnnee: moisDeLAnnee(recompenses, maintenant),
		moisParAn: PARRAINAGE.recompensesParAn,
		valeurDuMois: formule === null ? null : montantDuRythme(formule, 'mensuel') * 100,
		invitations: recommandes
			.map((o) => ({ inscriteLe: o.createdAt, abonneeLe: o.parrainageDeclencheLe ?? null }))
			.sort((a, b) => b.inscriteLe - a.inscriteLe)
			.slice(0, INVITATIONS_MONTREES),
		offertPar: parrain?.name ?? null,
		aujourdHui: new Date(maintenant).toISOString().slice(0, 10)
	};
}

export const mesRecommandations = authedQuery({
	args: {},
	returns: v.union(v.null(), vRecommandation),
	handler: async (ctx): Promise<RecommandationLue | null> => {
		const organizationId = await organisationCouranteOuNull(ctx, ctx.user._id);
		if (organizationId === null) return null;
		return lireLaRecommandation(ctx, organizationId, Date.now());
	}
});

/**
 * LA PAGE PUBLIQUE DE L'INVITATION (`/invitation/<code>`) : le nom de qui offre, rien
 * d'autre. Celui qui partage son lien le sait (la page « Recommander » le dit), et le code
 * — cinquante bits — ne se devine pas. Rien tant que la facturation n'est pas ouverte : un
 * mois offert qui ne pourrait pas s'appliquer ne s'annonce pas.
 */
export const invitation = query({
	args: { code: v.string() },
	returns: v.union(v.null(), v.object({ offertPar: v.string() })),
	handler: async (ctx, { code }): Promise<{ offertPar: string } | null> => {
		if (!paiementOuvert()) return null;
		const propre = code.trim().toUpperCase();
		if (!codeValide(propre)) return null;
		const org = await ctx.db
			.query('organizations')
			.withIndex('by_code_parrainage', (q) => q.eq('codeParrainage', propre))
			.unique();
		return org === null ? null : { offertPar: org.name };
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
		await prevenirLesAdministrateurs(
			ctx,
			filleul._id,
			'Votre mois offert est en route',
			parrain === null
				? 'Votre première échéance est payée : un mois sera déduit de votre prochain prélèvement.'
				: `Votre première échéance est payée : le mois offert par ${parrain.name} sera déduit de votre prochain prélèvement.`
		);
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
		await prevenirLesAdministrateurs(
			ctx,
			parrain._id,
			'Un mois de Letikette vous est offert',
			'Un confrère que vous avez recommandé s’est abonné : un mois sera déduit de votre prochain prélèvement.'
		);
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
