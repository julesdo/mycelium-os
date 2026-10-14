import { v, ConvexError } from 'convex/values';
import { httpAction, internalMutation, internalQuery, query } from './_generated/server';
import { internal } from './_generated/api';
import { authComponent } from './auth';
import { authedAction, authedQuery } from './functions';
import { organisationCouranteOuNull } from './lib/auth';
import type { Doc, Id } from './_generated/dataModel';

// Les sièges par étage viennent de `billing.ts`, source unique : deux tables
// parallèles finissaient par diverger, et c'est le genre d'écart qu'on ne
// remarque qu'au moment où un client ne peut plus inviter son directeur.
import { PLAN_SEATS, PALIERS, paiementOuvert, palierDeTaille } from './billing';
import {
	CLE_ORGANISATION,
	CLE_SCEAU,
	baseDeLApi,
	environnementDuJeton,
	environnementPaddle,
	lireEvenement,
	nomDeLEnvironnement,
	sceauValide,
	sceller,
	signatureValide,
	statutInterne,
	variableDePrix,
	type EnvironnementPaddle,
	type LienDOrganisation,
	type OffrePaddle
} from '../paiement/paddle';

/**
 * PADDLE, CÔTÉ SERVEUR : la caisse que l'écran ouvre, les rappels qui
 * l'écrivent, et le portail où l'on change de carte ou résilie.
 *
 * Six prix : deux offres (le premier bilan, payé une fois ; l'abonnement
 * mensuel) par trois paliers de taille. Le palier se calcule ici, d'après le
 * volume déclaré par l'établissement (`palierDeTaille`), jamais dans le
 * navigateur. La logique pure (environnement, signature, sceau, lecture des
 * événements) vit dans `lib/paiement/paddle.ts`, testée sans harnais.
 *
 * Le pas à pas pour brancher un compte Paddle est dans `serveurs/paddle/LISEZMOI.md`.
 */

function identifiantPrix(offre: OffrePaddle, palier: (typeof PALIERS)[number]): string | undefined {
	return process.env[variableDePrix(offre, palier)] || undefined;
}

/** L'étage qu'ouvre un prix d'abonnement, d'après les six variables. */
function etageDuPrix(priceId: string): 'suivi' | 'procedures' | null {
	for (const palier of PALIERS) {
		if (priceId === identifiantPrix('abonnement', palier)) return 'procedures';
		if (priceId === identifiantPrix('bilan', palier)) return 'suivi';
	}
	return null;
}

function estUnPrixDeBilan(priceId: string): boolean {
	return PALIERS.some((palier) => priceId === identifiantPrix('bilan', palier));
}

// ── La caisse ───────────────────────────────────────────────────────────────

type ReglagesDeLaCaisse =
	| {
			readonly pret: true;
			readonly environnement: EnvironnementPaddle;
			readonly jeton: string;
			readonly secret: string;
	  }
	| { readonly pret: false; readonly manque: readonly string[] };

/**
 * Ce qu'il faut pour encaisser : la clé d'API, le jeton côté client, et le
 * secret des rappels (sans rappel, un paiement ne s'inscrirait nulle part).
 * Un jeton d'un autre environnement que la clé est nommé, jamais deviné : il
 * ouvrirait un paiement sur un compte dont les rappels n'arrivent pas ici.
 */
export function reglagesDeLaCaisse(): ReglagesDeLaCaisse {
	const manque: string[] = [];
	const jeton = process.env.PADDLE_CLIENT_TOKEN ?? '';
	const secret = process.env.PADDLE_WEBHOOK_SECRET ?? '';
	if (!process.env.PADDLE_API_KEY) manque.push('PADDLE_API_KEY');
	if (!jeton) manque.push('PADDLE_CLIENT_TOKEN');
	if (!secret) manque.push('PADDLE_WEBHOOK_SECRET');
	if (manque.length > 0) return { pret: false, manque };

	let environnement: EnvironnementPaddle;
	try {
		environnement = environnementPaddle(process.env);
	} catch (e) {
		return { pret: false, manque: [(e as Error).message] };
	}
	const duJeton = environnementDuJeton(jeton);
	if (duJeton !== environnement) {
		return {
			pret: false,
			manque: [
				duJeton === null
					? 'PADDLE_CLIENT_TOKEN ne commence ni par « test_ » ni par « live_ ».'
					: `PADDLE_CLIENT_TOKEN est un jeton ${nomDeLEnvironnement(duJeton)}, la clé d'API une clé ${nomDeLEnvironnement(environnement)}.`
			]
		};
	}
	return { pret: true, environnement, jeton, secret };
}

export type CaisseServeur =
	| {
			readonly pret: true;
			readonly environnement: EnvironnementPaddle;
			readonly jeton: string;
			/** `null` : ce prix n'est pas posé pour le palier de l'établissement. */
			readonly prix: { readonly bilan: string | null; readonly abonnement: string | null };
			/** Ce que le paiement emporte, scellé (voir `sceller`). */
			readonly donnees: Readonly<Record<string, string>>;
			/** Le client Paddle déjà connu, sinon l'adresse pour préremplir. */
			readonly client: { readonly id: string } | { readonly email: string };
			readonly pwCustomer: string | null;
	  }
	| { readonly pret: false; readonly manque: readonly string[] };

/**
 * Ce dont l'écran a besoin pour ouvrir le paiement Paddle, pour
 * l'administrateur de l'établissement courant.
 *
 * `null` tant que la facturation n'est pas ouverte sur ce déploiement
 * (`paiementOuvert`), ou pour qui n'administre pas : souscrire engage
 * l'établissement, comme tout ce qui touche à l'abonnement.
 *
 * ⚠️ LE PRIX VIENT D'ICI, PAS DU NAVIGATEUR. Il dépend du palier, que le
 * serveur calcule. Le jeton côté client est public par nature (Paddle le
 * destine au navigateur) ; la clé d'API et le secret ne sortent jamais.
 */
export const caisse = authedQuery({
	args: {},
	handler: async (ctx): Promise<CaisseServeur | null> => {
		if (!paiementOuvert()) return null;
		const orgId = await organisationCouranteOuNull(ctx, ctx.user._id);
		if (orgId === null) return null;
		const membre = await ctx.db
			.query('organizationMembers')
			.withIndex('by_org_and_user', (q) => q.eq('organizationId', orgId).eq('userId', ctx.user._id))
			.unique();
		if (membre?.role !== 'ORG_ADMIN') return null;
		const org = await ctx.db.get(orgId);
		if (!org) return null;

		const reglages = reglagesDeLaCaisse();
		if (!reglages.pret) return reglages;

		const palier = palierDeTaille(org.facturesParAn);
		return {
			pret: true,
			environnement: reglages.environnement,
			jeton: reglages.jeton,
			prix: {
				bilan: identifiantPrix('bilan', palier) ?? null,
				abonnement: identifiantPrix('abonnement', palier) ?? null
			},
			donnees: {
				[CLE_ORGANISATION]: orgId,
				[CLE_SCEAU]: await sceller(reglages.secret, orgId)
			},
			client: org.paddleCustomerId ? { id: org.paddleCustomerId } : { email: ctx.user.email },
			pwCustomer: org.paddleCustomerId ?? null
		};
	}
});

// ── Les rappels ─────────────────────────────────────────────────────────────

/**
 * Inscrit l'état d'un abonnement sur son établissement.
 *
 * Trois façons de le retrouver, dans cet ordre : l'abonnement déjà connu ;
 * l'établissement que le paiement a scellé (le rappel a vérifié le sceau) ;
 * le client Paddle déjà rattaché. Aucune ne crée d'établissement : on ne
 * souscrit que depuis un établissement qui existe.
 *
 * ⚠️ PADDLE NE GARANTIT PAS L'ORDRE DES RAPPELS. Un rappel plus ancien que le
 * dernier inscrit est ignoré (`paddleEvenementLe`) : sinon un `past_due` en
 * retard rouvrirait un abonnement payé depuis, ou l'inverse.
 */
export const upsertSubscription = internalMutation({
	args: {
		paddleSubscriptionId: v.string(),
		paddleCustomerId: v.string(),
		paddleStatus: v.string(),
		priceId: v.optional(v.string()),
		currentPeriodEnd: v.optional(v.number()),
		/** Déjà vérifié par son sceau. */
		organizationId: v.optional(v.string()),
		survenuLe: v.number()
	},
	handler: async (
		ctx,
		args
	): Promise<{ action: string; organizationId: Id<'organizations'> | null }> => {
		const org =
			(await ctx.db
				.query('organizations')
				.withIndex('by_paddle_subscription', (q) =>
					q.eq('paddleSubscriptionId', args.paddleSubscriptionId)
				)
				.unique()) ??
			(await orgDeLId(ctx, args.organizationId)) ??
			(await ctx.db
				.query('organizations')
				.withIndex('by_paddle_customer', (q) => q.eq('paddleCustomerId', args.paddleCustomerId))
				.first());

		if (!org) return { action: 'noop', organizationId: null };
		if (org.paddleEvenementLe !== undefined && args.survenuLe < org.paddleEvenementLe) {
			return { action: 'ancien', organizationId: org._id };
		}

		const etage = args.priceId ? etageDuPrix(args.priceId) : null;
		const plan = etage ?? org.paddlePlanTier;
		await ctx.db.patch(org._id, {
			paddleSubscriptionId: args.paddleSubscriptionId,
			paddleCustomerId: args.paddleCustomerId,
			paddlePlanTier: plan,
			paddleStatus: statutInterne(args.paddleStatus),
			paddleCurrentPeriodEnd: args.currentPeriodEnd,
			paddleEvenementLe: args.survenuLe,
			seatsIncluded: plan ? PLAN_SEATS[plan] : org.seatsIncluded
		});
		return { action: 'inscrit', organizationId: org._id };
	}
});

/** Un premier bilan réglé : la date, et le client Paddle s'il n'était pas connu. */
export const enregistrerBilan = internalMutation({
	args: {
		organizationId: v.string(),
		paddleCustomerId: v.optional(v.string()),
		survenuLe: v.number()
	},
	handler: async (ctx, args): Promise<{ action: string }> => {
		const org = await orgDeLId(ctx, args.organizationId);
		if (!org) return { action: 'noop' };
		await ctx.db.patch(org._id, {
			bilanRegleLe: args.survenuLe,
			paddleCustomerId: org.paddleCustomerId ?? args.paddleCustomerId
		});
		return { action: 'bilan' };
	}
});

async function orgDeLId(
	ctx: {
		db: {
			normalizeId: (t: 'organizations', id: string) => Id<'organizations'> | null;
			get: (id: Id<'organizations'>) => Promise<Doc<'organizations'> | null>;
		};
	},
	organizationId: string | undefined
): Promise<Doc<'organizations'> | null> {
	if (!organizationId) return null;
	const id = ctx.db.normalizeId('organizations', organizationId);
	return id === null ? null : await ctx.db.get(id);
}

/**
 * Le rappel de Paddle, à `/paddle-webhook` (voir `http.ts`).
 *
 * La signature d'abord, sur le corps brut ; puis le sceau de l'établissement,
 * s'il y en a un ; puis l'écriture. Tout `subscription.*` passe par le même
 * chemin, puisque chacun porte le statut courant. Un `transaction.completed`
 * sur un abonnement l'inscrit aussi (il peut arriver avant `subscription.created`) ;
 * sur un prix de bilan, il note le bilan réglé.
 *
 * ⚠️ PAS DE LISTE D'ADRESSES IP ICI. Paddle publie les siennes
 * (`api.paddle.com/ips`), mais une `httpAction` Convex ne reçoit pas
 * l'adresse d'origine de façon sûre : un en-tête `X-Forwarded-For` se
 * falsifie. La signature HMAC est la barrière qui tient.
 */
export const webhookHandler = httpAction(async (ctx, req): Promise<Response> => {
	const secret = process.env.PADDLE_WEBHOOK_SECRET;
	if (!secret) {
		return new Response('Webhook secret not configured', { status: 500 });
	}

	const corps = await req.text();
	const valide = await signatureValide({
		corps,
		entete: req.headers.get('Paddle-Signature') ?? '',
		secret,
		maintenantS: Math.floor(Date.now() / 1000)
	});
	if (!valide) return new Response('Invalid signature', { status: 401 });

	let brut: unknown;
	try {
		brut = JSON.parse(corps);
	} catch {
		return new Response('Invalid JSON', { status: 400 });
	}

	const evenement = lireEvenement(brut);
	if (evenement.genre !== 'ignore') {
		const organizationId = await organisationScellee(secret, evenement.lien);

		if (evenement.genre === 'abonnement') {
			await ctx.runMutation(internal.paddle.upsertSubscription, {
				paddleSubscriptionId: evenement.abonnementId,
				paddleCustomerId: evenement.clientId,
				paddleStatus: evenement.statut,
				priceId: evenement.prixId ?? undefined,
				currentPeriodEnd: evenement.finDePeriode ?? undefined,
				organizationId,
				survenuLe: evenement.survenuLe
			});
		} else if (evenement.abonnementId !== null && evenement.clientId !== null) {
			// Un paiement réglé sur un abonnement : l'abonnement est actif à cet
			// instant. Un rappel d'abonnement plus récent l'emporte (voir
			// `paddleEvenementLe`).
			await ctx.runMutation(internal.paddle.upsertSubscription, {
				paddleSubscriptionId: evenement.abonnementId,
				paddleCustomerId: evenement.clientId,
				paddleStatus: 'active',
				priceId: evenement.prixIds[0],
				currentPeriodEnd: evenement.finDePeriode ?? undefined,
				organizationId,
				survenuLe: evenement.survenuLe
			});
		} else if (
			evenement.abonnementId === null &&
			organizationId !== undefined &&
			evenement.prixIds.some(estUnPrixDeBilan)
		) {
			await ctx.runMutation(internal.paddle.enregistrerBilan, {
				organizationId,
				paddleCustomerId: evenement.clientId ?? undefined,
				survenuLe: evenement.survenuLe
			});
		}
	}

	return new Response(JSON.stringify({ received: true }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' }
	});
});

/** L'établissement que le paiement désigne, si et seulement si son sceau tient. */
async function organisationScellee(
	secret: string,
	lien: LienDOrganisation | null
): Promise<string | undefined> {
	if (lien === null) return undefined;
	return (await sceauValide(secret, lien.organisationId, lien.sceau))
		? lien.organisationId
		: undefined;
}

// ── Le portail ──────────────────────────────────────────────────────────────

/** Public query: current authenticated user's org subscription status */
export const getMySubscription = query({
	args: {},
	handler: async (ctx) => {
		const user = await authComponent.getAuthUser(ctx);
		if (!user) return null;

		const orgId = await organisationCouranteOuNull(ctx, user._id);
		if (orgId === null) return null;
		const org = await ctx.db.get(orgId);
		if (!org) return null;

		return {
			paddlePlanTier: org.paddlePlanTier ?? null,
			paddleStatus: org.paddleStatus ?? null,
			paddleCurrentPeriodEnd: org.paddleCurrentPeriodEnd ?? null,
			seatsIncluded: org.seatsIncluded ?? null,
			organizationId: org._id,
			paddleCustomerId: org.paddleCustomerId ?? null
		};
	}
});

/**
 * Le client Paddle de l'établissement COURANT, pour son administrateur.
 *
 * ⚠️ L'ANCIENNE VERSION PRENAIT LA PREMIÈRE APPARTENANCE DU COMPTE, pas
 * l'établissement courant : quelqu'un qui en administre deux ouvrait le
 * portail de l'autre.
 */
export const _clientPaddleCourant = internalQuery({
	args: { userId: v.string() },
	handler: async (ctx, { userId }): Promise<string | null> => {
		const orgId = await organisationCouranteOuNull(ctx, userId);
		if (orgId === null) return null;
		const membre = await ctx.db
			.query('organizationMembers')
			.withIndex('by_org_and_user', (q) => q.eq('organizationId', orgId).eq('userId', userId))
			.unique();
		if (membre?.role !== 'ORG_ADMIN') return null;
		const org = await ctx.db.get(orgId);
		return org?.paddleCustomerId ?? null;
	}
});

/**
 * L'adresse du portail client de Paddle, où l'on change de carte, télécharge
 * ses factures ou résilie. Une session neuve à chaque toucher : l'adresse
 * expire.
 */
export const getPortalUrl = authedAction({
	args: {},
	handler: async (ctx): Promise<string | null> => {
		const clientId = await ctx.runQuery(internal.paddle._clientPaddleCourant, {
			userId: ctx.user._id
		});
		if (!clientId) return null;

		const apiKey = process.env.PADDLE_API_KEY;
		if (!apiKey) throw new ConvexError('Le paiement n’est pas configuré sur ce déploiement.');

		const res = await fetch(
			`${baseDeLApi(environnementPaddle(process.env))}/customers/${clientId}/portal-sessions`,
			{
				method: 'POST',
				headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
				body: JSON.stringify({})
			}
		);
		if (!res.ok) {
			throw new ConvexError(`Paddle n’a pas ouvert le portail (erreur ${res.status}).`);
		}

		const data = (await res.json()) as {
			data?: { urls?: { general?: { overview?: string } } };
		};
		return data.data?.urls?.general?.overview ?? null;
	}
});

// Read subscription status for billing page
export const getSubscriptionStatus = internalQuery({
	args: { organizationId: v.id('organizations') },
	handler: async (ctx, { organizationId }) => {
		const org = await ctx.db.get(organizationId);
		if (!org) return null;
		return {
			paddleSubscriptionId: org.paddleSubscriptionId ?? null,
			paddleCustomerId: org.paddleCustomerId ?? null,
			paddlePlanTier: org.paddlePlanTier ?? null,
			paddleStatus: org.paddleStatus ?? null,
			paddleCurrentPeriodEnd: org.paddleCurrentPeriodEnd ?? null,
			seatsIncluded: org.seatsIncluded ?? null
		};
	}
});
