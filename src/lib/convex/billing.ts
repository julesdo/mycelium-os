import { v, ConvexError } from 'convex/values';
import { internalQuery } from './_generated/server';
import { authedMutation, authedQuery } from './functions';
import type { Doc } from './_generated/dataModel';
import {
	DUREE_ESSAI_JOURS,
	formuleRecommandee,
	limitesDe,
	type Formule,
	type PlanTier,
	type Rythme
} from '../config/tarifs';
import { organisationCouranteOuNull, requireAdminDeLOrgCourante } from './lib/auth';
import { debiteursSuivis } from './suivis';

/**
 * L'ABONNEMENT, CÔTÉ SERVEUR : ce qui est ouvert à un établissement, et ce que
 * l'écran Compte › Abonnement en montre.
 *
 * La grille (formules, prix, limites) vit dans `src/lib/config/tarifs.ts`, lue
 * aussi par le site et par le catalogue Paddle. Refaite le 14/10/2026 :
 * Découverte (gratuite, rien ne part), Solo, Équipe et Pro
 * (`docs/superpowers/specs/2026-10-14-pricing-abonnements.md`).
 */

// Le palier effectif et ses limites vivent avec la grille (`config/tarifs.ts`),
// pour que l'écran et la salle les lisent sans importer le serveur.
export { limitesDe, type PlanTier };

/** Les étages d'avant le 14/10/2026, relus dans la grille d'aujourd'hui. */
function formuleSouscrite(org: Doc<'organizations'>): Formule | null {
	switch (org.paddlePlanTier) {
		case 'solo':
		case 'equipe':
		case 'pro':
			return org.paddlePlanTier;
		case 'suivi':
			return 'solo';
		case 'procedures':
			return 'equipe';
		default:
			return null;
	}
}

/**
 * LA FACTURATION EST-ELLE OUVERTE SUR CE DÉPLOIEMENT ?
 *
 * ⚠️ POSER LA CLÉ N'OUVRE PAS LA FACTURATION. La clé live se pose à la
 * migration, AVANT que Paddle ait vérifié le compte et approuvé le domaine :
 * si elle suffisait, des gérants seraient fermés pendant des jours sans aucun
 * moyen de payer. L'ouverture est un geste à part, `PADDLE_FACTURATION_OUVERTE=oui`,
 * posé quand le paiement fonctionne vraiment. Avant, tout reste ouvert et
 * l'écran le dit (`OuvertureEnCours`).
 */
export function paiementOuvert(): boolean {
	return Boolean(process.env.PADDLE_API_KEY) && process.env.PADDLE_FACTURATION_OUVERTE === 'oui';
}

/**
 * Ce qui est ouvert à un établissement, dans cet ordre :
 *
 *   1. aucune clé Paddle sur le déploiement → `dev` ;
 *   2. un plan posé à la main en développement → `dev` ;
 *   3. un abonnement Paddle actif ou à l'essai → sa formule ;
 *   4. la facturation pas encore ouverte → `dev` (rien ne se ferme) ;
 *   5. un accès offert qui court (`freeTrialEndsAt`, l'essai d'avant le
 *      14/10/2026 et le préavis donné à l'ouverture) → Équipe ;
 *   6. sinon → Découverte.
 *
 * Un abonnement impayé, en pause ou résilié retombe donc sur l'accès offert
 * s'il court, sur Découverte sinon : rien n'est effacé, les relances attendent.
 */
export function resolveEffectivePlan(org: Doc<'organizations'>): {
	tier: PlanTier;
	isDev: boolean;
	seatsAllowed: number;
} {
	const avec = (tier: PlanTier, isDev: boolean) => ({
		tier,
		isDev,
		seatsAllowed: limitesDe(tier).utilisateurs
	});

	if (!process.env.PADDLE_API_KEY) {
		// Simuler un palier, pour regarder les limites sans payer.
		const simule = org.simulatedTier as PlanTier | undefined;
		if (simule !== undefined && ['none', 'solo', 'equipe', 'pro'].includes(simule)) {
			return avec(simule, true);
		}
		return avec('dev', true);
	}

	if (org.devPlan) return avec('dev', false);

	if (org.paddleStatus === 'active' || org.paddleStatus === 'trialing') {
		return avec(formuleSouscrite(org) ?? 'equipe', false);
	}

	if (!paiementOuvert()) return avec('dev', true);

	if (org.freeTrialEndsAt && org.freeTrialEndsAt > Date.now()) return avec('equipe', false);

	return avec('none', false);
}

/** Le dernier jour d'un accès offert de trente jours, à compter de `depuis`. */
export function finDeLEssai(depuis: number = Date.now()): number {
	return depuis + DUREE_ESSAI_JOURS * 24 * 60 * 60 * 1000;
}

// ── Queries ───────────────────────────────────────────────────────────────────

export const getBillingStatus = authedQuery({
	args: {},
	handler: async (ctx) => {
		const orgId = await organisationCouranteOuNull(ctx, ctx.user._id);
		if (orgId === null) return null;

		const org = await ctx.db.get(orgId);
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
			paddlePlanTier: formuleSouscrite(org),
			paddleCurrentPeriodEnd: org.paddleCurrentPeriodEnd ?? null
		};
	}
});

/**
 * Tout ce dont l'écran d'abonnement a besoin, en une lecture.
 *
 * Ce qu'on peut souscrire et à quel prix vient de `paddle.caisse` ; ici, ce qui
 * EST : le palier, la formule souscrite, ses dates, l'accès offert, et ce que
 * le gérant se verra proposer d'abord (`recommandee`, d'après la forme
 * juridique au registre).
 */
export const etatAbonnement = authedQuery({
	args: {},
	handler: async (ctx) => {
		const orgId = await organisationCouranteOuNull(ctx, ctx.user._id);
		if (orgId === null) return null;

		const org = await ctx.db.get(orgId);
		if (!org) return null;

		const { tier, isDev } = resolveEffectivePlan(org);
		const maintenant = Date.now();
		const souscrite = org.paddleStatus === undefined ? null : formuleSouscrite(org);
		// Ce que Paddle prélève vraiment : le prix souscrit, jamais la grille du jour.
		const prixSouscrit =
			org.paddlePrixId === undefined
				? null
				: await ctx.db
						.query('prixPaddle')
						.withIndex('by_prix', (q) => q.eq('prixId', org.paddlePrixId!))
						.first();
		const [profil, creancier, membres, suivis] = await Promise.all([
			ctx.db
				.query('userProfiles')
				.withIndex('by_userId', (q) => q.eq('userId', ctx.user._id))
				.unique(),
			ctx.db
				.query('profilsCreancier')
				.withIndex('by_org', (q) => q.eq('organizationId', orgId))
				.first(),
			ctx.db
				.query('organizationMembers')
				.withIndex('by_organization', (q) => q.eq('organizationId', orgId))
				.collect(),
			debiteursSuivis(ctx, orgId)
		]);

		return {
			tier,
			isDev,
			paiementOuvert: paiementOuvert(),
			statut: org.paddleStatus ?? null,
			formule: souscrite,
			rythme: (org.paddleRythme ?? null) as Rythme | null,
			montantDuPrixSouscrit: prixSouscrit?.montant ?? null,
			essaiFinLe: org.paddleStatus === 'trialing' ? (org.paddleEssaiFinLe ?? null) : null,
			prochainPrelevementLe: org.paddleProchainPrelevementLe ?? null,
			resiliationLe: org.paddleResiliationLe ?? null,
			// L'accès offert n'est renvoyé que s'il court ENCORE : un accès terminé
			// ferait afficher « il reste -12 jours ».
			offertJusquAu:
				org.freeTrialEndsAt && org.freeTrialEndsAt > maintenant ? org.freeTrialEndsAt : null,
			// Le portail Paddle (carte, factures, résiliation) n'a de sens que pour
			// un établissement que Paddle connaît déjà.
			clientPaddle: Boolean(org.paddleCustomerId),
			essaiDisponible: essaiDisponible(org, profil),
			recommandee: formuleRecommandee(creancier?.formeJuridique),
			limites: limitesDe(tier),
			utilisateurs: membres.length,
			// Les clients en retard que le pilote suit : la limite qui compte.
			clientsSuivis: suivis.length
		};
	}
});

/**
 * Trente jours offerts, une fois. Ni l'établissement ni le compte qui souscrit
 * ne doivent les avoir déjà eus : sinon une résiliation suivie d'une nouvelle
 * souscription, ou un second établissement, rouvrirait l'essai. L'accès offert
 * d'avant le 14/10/2026 compte comme un essai (`hasUsedFreeTrial`).
 */
export function essaiDisponible(
	org: Doc<'organizations'>,
	profil: Doc<'userProfiles'> | null
): boolean {
	return org.essaiUtilise !== true && profil?.hasUsedFreeTrial !== true;
}

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

/**
 * Est-on dans un environnement sans facturation réelle ?
 *
 * ⚠️ DÉCLARÉ UNE FOIS, PARCE QUE L'AUTRE PORTE L'AVAIT OUBLIÉ. `setSimulatedTier`
 * portait ce garde à la main ; `activateDevPlan`, qui accorde le plan complet et
 * 9 999 sièges, n'en avait AUCUN : une simple mutation authentifiée suffisait à
 * s'offrir l'abonnement le plus cher du produit. Ce n'est pas une fuite de
 * données, c'est une fuite de revenu.
 *
 * La clé Paddle est le bon signal : elle n'existe que là où l'on facture pour de
 * vrai.
 */
export function estEnvironnementDeDeveloppement(): boolean {
	return !process.env.PADDLE_API_KEY;
}

/** Le refus commun aux deux portes, pour qu'il ne se réécrive pas à moitié. */
function exigerEnvironnementDeDeveloppement(nom: string): void {
	if (!estEnvironnementDeDeveloppement()) {
		throw new ConvexError(`${nom} n’est disponible qu’en développement, sans clé Paddle.`);
	}
}

export const setSimulatedTier = authedMutation({
	args: { tier: v.optional(v.string()) },
	handler: async (ctx, { tier }) => {
		exigerEnvironnementDeDeveloppement('setSimulatedTier');
		// Changer de palier, c'est changer de facture : réservé à l'administrateur,
		// comme tout ce qui touche à l'abonnement.
		const organizationId = await requireAdminDeLOrgCourante(ctx, ctx.user._id);

		await ctx.db.patch(organizationId, {
			simulatedTier: tier ?? undefined
		});
		return { ok: true };
	}
});

export const activateDevPlan = authedMutation({
	args: {},
	handler: async (ctx) => {
		exigerEnvironnementDeDeveloppement('activateDevPlan');
		const organizationId = await requireAdminDeLOrgCourante(ctx, ctx.user._id);

		await ctx.db.patch(organizationId, {
			devPlan: true,
			seatsIncluded: 9999
		});

		return { ok: true };
	}
});

// ── Backend guard helper (use in other Convex mutations/queries) ──────────────

// Call this before inserting a new member to enforce seat quota.
export async function assertSeatAvailable(
	ctx: { db: { get: (id: any) => Promise<any>; query: any } },
	organizationId: string
): Promise<void> {
	const org = await ctx.db.get(organizationId as any);
	if (!org) throw new ConvexError('Organisation introuvable');

	const { tier, seatsAllowed } = resolveEffectivePlan(org);

	const memberCount = await ctx.db
		.query('organizationMembers')
		.withIndex('by_organization', (q: any) => q.eq('organizationId', organizationId))
		.collect()
		.then((r: any[]) => r.length);

	if (memberCount >= seatsAllowed) {
		throw new ConvexError(
			tier === 'none'
				? 'Les invitations s’ouvrent avec une formule : Compte › Abonnement, trente jours d’essai.'
				: `Votre formule compte ${seatsAllowed} utilisateur${seatsAllowed > 1 ? 's' : ''}, et ${memberCount} y ont déjà accès. La formule du dessus en ouvre davantage : Compte › Abonnement.`
		);
	}
}
