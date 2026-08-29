import { v, ConvexError } from 'convex/values';
import { internalQuery } from './_generated/server';
import { authedMutation, authedQuery } from './functions';
import type { Doc } from './_generated/dataModel';
import {
	BORNES_PALIER,
	DUREE_ESSAI_JOURS,
	PALIERS,
	TARIFS,
	palierDeTaille,
	type PalierTaille
} from '../config/tarifs';

// ── Plan feature matrix — échelle de valeur EGalim ─────────────────────────────

/**
 * CE QUE CHAQUE ÉTAGE OUVRE.
 *
 * DEUX ÉTAGES PAYANTS, ET PAS TROIS. L'étage `operateur` a été retiré : il
 * ouvrait une fonctionnalité de `sourcing` qui n'a jamais été construite, et
 * `CLAUDE.md` acte qu'il n'a plus de porteur commercial depuis la suppression du
 * modèle opérateur. Il en allait de même pour `veilleReglementaire`, qui
 * n'existe nulle part dans le produit. Les laisser, c'était s'exposer à les voir
 * apparaître un jour sur une grille tarifaire, c'est-à-dire à vendre du vide.
 *
 * Les deux étages restants correspondent exactement aux deux offres du business
 * plan, document 03 :
 *
 *   `diagnostic`  le premier bilan. On dépose, on mesure, on obtient un bilan.
 *   `conformite`  l'abonnement. En plus : le fichier de télédéclaration et le
 *                 suivi mensuel, c'est-à-dire les e-mails qui ramènent le gérant
 *                 tous les mois au lieu d'une fois en mars.
 *
 * LA TAILLE DE LA CANTINE N'EST PAS UN ÉTAGE, c'est un AXE DE PRIX. Un
 * établissement de mille couverts reçoit exactement le même produit qu'un
 * établissement de deux cents ; il le paie plus cher parce que la valeur diffère,
 * pas la prestation. Voir `PALIER_TAILLE` plus bas.
 */
export const PLAN_FEATURES = {
	none: {
		depotFactures: false,
		diagnostic: false,
		declaration: false,
		suiviMensuel: false
	},
	diagnostic: {
		depotFactures: true,
		diagnostic: true,
		declaration: false,
		suiviMensuel: false
	},
	conformite: {
		depotFactures: true,
		diagnostic: true,
		declaration: true,
		suiviMensuel: true
	},
	dev: {
		depotFactures: true,
		diagnostic: true,
		declaration: true,
		suiviMensuel: true
	}
} as const;

export type PlanFeature = keyof (typeof PLAN_FEATURES)['conformite'];
export type PlanTier = 'none' | 'diagnostic' | 'conformite' | 'dev';

// Nombre d'utilisateurs autorisés par étage (une cantine = 1 à 3 personnes)
export const PLAN_SEATS: Record<PlanTier, number> = {
	none: 0,
	diagnostic: 2,
	conformite: 3,
	dev: 9999
};

/**
 * LA GRILLE TARIFAIRE A DÉMÉNAGÉ dans `src/lib/config/tarifs.ts`, et elle est
 * réexportée ici pour que rien de ce qui l'importait déjà n'ait à changer.
 *
 * Elle a trois lecteurs : ce module, qui choisit l'identifiant de prix Paddle ;
 * la salle d'exposition ; et la section de tarifs de la page d'accueil. Deux des
 * trois la recopiaient à la main. Un module pur, sans import Convex ni React, se
 * lit des deux côtés du réseau — c'est le même montage que
 * `src/lib/egalim/referentiel.ts`, et pour la même raison : ce qui engage
 * commercialement ne doit exister qu'à un seul endroit.
 */
export { PALIERS, palierDeTaille, TARIFS, BORNES_PALIER, DUREE_ESSAI_JOURS };
export type { PalierTaille };

// ── Core resolver ─────────────────────────────────────────────────────────────

// Returns the effective plan for an org, considering:
// 1. Dev bypass (PADDLE_API_KEY absent) → 'dev'
// 2. devPlan flag → 'dev'
// 3. Active Paddle subscription → paddlePlanTier
// 4. Nothing → 'free' (open core, permanent, limited features)
export function resolveEffectivePlan(org: Doc<'organizations'>): {
	tier: PlanTier;
	isDev: boolean;
	seatsAllowed: number;
} {
	const isDev = !process.env.PADDLE_API_KEY;

	// Dev bypass: no Paddle key configured at all
	if (isDev) {
		// Allow simulating a specific plan tier for feature-gating tests
		if (org.simulatedTier) {
			const tier = org.simulatedTier as PlanTier;
			return { tier, isDev: true, seatsAllowed: PLAN_SEATS[tier] ?? 50 };
		}
		return { tier: 'dev', isDev: true, seatsAllowed: 9999 };
	}

	// Explicit dev plan (only settable when PADDLE_API_KEY was absent at the time)
	if (org.devPlan) {
		return { tier: 'dev', isDev: false, seatsAllowed: 9999 };
	}

	// Active Paddle subscription
	if (org.paddleStatus === 'active' || org.paddleStatus === 'trialing') {
		const tier = (org.paddlePlanTier ?? 'conformite') as PlanTier;
		return {
			tier,
			isDev: false,
			seatsAllowed: org.seatsIncluded ?? PLAN_SEATS[tier] ?? PLAN_SEATS.diagnostic
		};
	}

	// L'ESSAI. Voir `DUREE_ESSAI_JOURS` pour la règle et ce qu'elle évite.
	if (org.freeTrialEndsAt && org.freeTrialEndsAt > Date.now()) {
		return { tier: 'conformite', isDev: false, seatsAllowed: PLAN_SEATS.conformite };
	}

	return { tier: 'none', isDev: false, seatsAllowed: PLAN_SEATS.none };
}

/**
 * L'ESSAI, ET POURQUOI IL EXISTE AVANT MÊME QUE LE PAIEMENT SOIT OUVERT.
 *
 * Aujourd'hui, aucune clé Paddle n'est posée : `resolveEffectivePlan` renvoie
 * `dev` et tout est ouvert à tout le monde. Le jour où la clé arrive, la même
 * fonction bascule chaque établissement existant sur `none` — plus d'invitation,
 * plus de dépôt, plus rien — sans qu'aucun code ne change. Ce n'est pas une
 * hypothèse : c'est le comportement écrit au-dessus.
 *
 * L'essai est ce qui rend cette bascule survivable. Il est ouvert à la CRÉATION
 * de l'établissement, pas à la première tentative d'usage : un gérant qui
 * découvre qu'il doit payer AVANT d'avoir vu son premier taux ne reviendra pas,
 * et le produit n'a rien à montrer tant que rien n'a été déposé.
 *
 * TRENTE JOURS : la valeur et sa justification vivent avec la grille tarifaire,
 * dans `src/lib/config/tarifs.ts`, parce que la page d'accueil l'annonce.
 *
 * UNE FOIS PAR COMPTE, jamais par établissement : sans ça, il suffit de créer un
 * nouvel établissement pour recommencer l'essai. Le drapeau vit sur
 * `userProfiles.hasUsedFreeTrial`, qui existe au schéma depuis le début à cette
 * fin exacte.
 */
export function finDeLEssai(depuis: number = Date.now()): number {
	return depuis + DUREE_ESSAI_JOURS * 24 * 60 * 60 * 1000;
}

export function planHasFeature(tier: PlanTier, feature: PlanFeature): boolean {
	if (tier === 'dev') return true;
	if (tier === 'none') return PLAN_FEATURES.none[feature];
	return PLAN_FEATURES[tier]?.[feature] ?? false;
}

// ── Queries ───────────────────────────────────────────────────────────────────

export const getBillingStatus = authedQuery({
	args: {},
	handler: async (ctx) => {
		const profile = await ctx.db
			.query('userProfiles')
			.withIndex('by_userId', (q) => q.eq('userId', ctx.user._id))
			.unique();
		if (!profile?.currentOrganizationId) return null;

		const org = await ctx.db.get(profile.currentOrganizationId);
		if (!org) return null;

		const { tier, isDev, seatsAllowed } = resolveEffectivePlan(org);

		const memberCount = await ctx.db
			.query('organizationMembers')
			.withIndex('by_organization', (q) => q.eq('organizationId', org._id))
			.collect()
			.then((r) => r.length);

		return {
			tier,
			isDev,
			seatsUsed: memberCount,
			seatsAllowed,
			paddleStatus: org.paddleStatus ?? null,
			paddlePlanTier: org.paddlePlanTier ?? null,
			paddleCurrentPeriodEnd: org.paddleCurrentPeriodEnd ?? null
		};
	}
});

/**
 * Tout ce dont l'écran d'abonnement a besoin, en une lecture.
 *
 * LE PALIER EST CALCULÉ ICI, jamais côté client. Il décide du prix : le laisser
 * au navigateur, c'est laisser à l'utilisateur le soin de choisir son tarif.
 *
 * `paddleConfigure` dit à l'écran s'il peut proposer un paiement. Tant que le
 * compte marchand n'est pas ouvert — il attend les conditions générales — il
 * vaut `false`, et l'écran montre l'offre sans promettre un bouton qui ne
 * fonctionnerait pas.
 */
export const etatAbonnement = authedQuery({
	args: {},
	handler: async (ctx) => {
		const profile = await ctx.db
			.query('userProfiles')
			.withIndex('by_userId', (q) => q.eq('userId', ctx.user._id))
			.unique();
		if (!profile?.currentOrganizationId) return null;

		const org = await ctx.db.get(profile.currentOrganizationId);
		if (!org) return null;

		const { tier, isDev, seatsAllowed } = resolveEffectivePlan(org);
		const palier = palierDeTaille(org.couvertsJour);

		return {
			tier,
			isDev,
			palier,
			bornesPalier: BORNES_PALIER[palier],
			couvertsJour: org.couvertsJour ?? null,
			tarifs: TARIFS[palier],
			seatsAllowed,
			paddleStatus: org.paddleStatus ?? null,
			paddleCurrentPeriodEnd: org.paddleCurrentPeriodEnd ?? null,
			paddleConfigure: Boolean(process.env.PADDLE_API_KEY),
			// L'essai n'est renvoyé que s'il court ENCORE. Un essai terminé
			// n'apprend rien au gérant et ferait afficher « il reste -12 jours ».
			essaiFiniLe:
				org.freeTrialEndsAt && org.freeTrialEndsAt > Date.now() ? org.freeTrialEndsAt : null
		};
	}
});

// Internal version for use by other Convex functions
export const _getOrgBillingStatus = internalQuery({
	args: { organizationId: v.id('organizations') },
	handler: async (ctx, { organizationId }) => {
		const org = await ctx.db.get(organizationId);
		if (!org) return null;
		const resolved = resolveEffectivePlan(org);

		const memberCount = await ctx.db
			.query('organizationMembers')
			.withIndex('by_organization', (q) => q.eq('organizationId', organizationId))
			.collect()
			.then((r) => r.length);

		return { ...resolved, seatsUsed: memberCount, org };
	}
});

// ── Mutations ─────────────────────────────────────────────────────────────────

// Set a simulated plan tier in dev mode (no PADDLE_API_KEY) for testing feature gating.
// Pass undefined/null to reset back to full 'dev' access.
export const setSimulatedTier = authedMutation({
	args: { tier: v.optional(v.string()) },
	handler: async (ctx, { tier }) => {
		if (process.env.PADDLE_API_KEY) {
			throw new ConvexError("setSimulatedTier n'est disponible qu'en mode dev (sans clé Paddle).");
		}
		const profile = await ctx.db
			.query('userProfiles')
			.withIndex('by_userId', (q) => q.eq('userId', ctx.user._id))
			.unique();
		if (!profile?.currentOrganizationId) throw new ConvexError('Aucune organisation active');

		await ctx.db.patch(profile.currentOrganizationId, {
			simulatedTier: tier ?? undefined
		});
		return { ok: true };
	}
});

// Activate dev plan (full access, no limits)
export const activateDevPlan = authedMutation({
	args: {},
	handler: async (ctx) => {
		const profile = await ctx.db
			.query('userProfiles')
			.withIndex('by_userId', (q) => q.eq('userId', ctx.user._id))
			.unique();
		if (!profile?.currentOrganizationId) throw new ConvexError('Aucune organisation active');

		await ctx.db.patch(profile.currentOrganizationId, {
			devPlan: true,
			seatsIncluded: 9999
		});

		return { ok: true };
	}
});

// ── Backend guard helper (use in other Convex mutations/queries) ──────────────

// Call this at the top of any gated mutation to enforce plan access.
// Usage: await assertFeatureAccess(ctx, orgId, 'declaration')
export async function assertFeatureAccess(
	ctx: { db: { get: (id: any) => Promise<any>; query: any } },
	organizationId: string,
	feature: PlanFeature
): Promise<void> {
	const org = await ctx.db.get(organizationId as any);
	if (!org) throw new ConvexError('Organisation introuvable');

	const { tier } = resolveEffectivePlan(org);
	if (!planHasFeature(tier, feature)) {
		throw new ConvexError(
			`Cette fonctionnalité nécessite un plan supérieur. Plan actuel : ${tier}. ` +
				`Mettez à niveau votre abonnement pour continuer.`
		);
	}
}

// Call this before inserting a new member to enforce seat quota.
export async function assertSeatAvailable(
	ctx: { db: { get: (id: any) => Promise<any>; query: any } },
	organizationId: string
): Promise<void> {
	const org = await ctx.db.get(organizationId as any);
	if (!org) throw new ConvexError('Organisation introuvable');

	const { tier, seatsAllowed } = resolveEffectivePlan(org);
	if (tier === 'none') {
		throw new ConvexError('Aucun abonnement actif. Souscrivez un plan pour continuer.');
	}

	const memberCount = await ctx.db
		.query('organizationMembers')
		.withIndex('by_organization', (q: any) => q.eq('organizationId', organizationId))
		.collect()
		.then((r: any[]) => r.length);

	if (memberCount >= seatsAllowed) {
		throw new ConvexError(
			`Quota d'utilisateurs atteint (${memberCount}/${seatsAllowed}). ` +
				`Mettez à niveau votre plan pour ajouter des membres supplémentaires.`
		);
	}
}
