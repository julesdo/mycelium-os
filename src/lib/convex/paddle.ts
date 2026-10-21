import { v, ConvexError } from 'convex/values';
import {
	httpAction,
	internalAction,
	internalMutation,
	internalQuery,
	query,
	type ActionCtx,
	type QueryCtx
} from './_generated/server';
import { internal } from './_generated/api';
import { authComponent } from './auth';
import { authedAction, authedQuery } from './functions';
import { organisationCouranteOuNull } from './lib/auth';
import type { Doc, Id } from './_generated/dataModel';
import { FORMULES, OFFRES, RYTHMES, type Formule, type Rythme } from '../config/tarifs';
import {
	corpsDeLaRemise,
	ETIQUETTE_FONDATEURS,
	offreDeBienvenue,
	placesFondateurs
} from '../paiement/offres';
import { jourDeParis } from '../admin/dates';
import { essaiDisponible, limitesDe, paiementOuvert } from './billing';
import {
	CLE_ORGANISATION,
	CLE_SCEAU,
	baseDeLApi,
	environnementDuJeton,
	environnementPaddle,
	etiquetteDuPrix,
	lireEvenement,
	montantsDeLaTransaction,
	nomDeLEnvironnement,
	sceauValide,
	sceller,
	signatureValide,
	statutInterne,
	type EnvironnementPaddle,
	type EvenementPaddle,
	type LienDOrganisation
} from '../paiement/paddle';

/**
 * PADDLE, CÔTÉ SERVEUR : la caisse que l'écran ouvre, les rappels qui
 * l'écrivent, et le portail où l'on change de carte ou résilie.
 *
 * Trois formules (Solo, Équipe, Pro), au mois ou à l'année, avec ou sans les
 * trente jours d'essai : douze prix, que le catalogue crée d'après la grille
 * (`paddleCatalogue.ts`) et range dans `prixPaddle`. La logique pure
 * (environnement, signature, sceau, lecture des événements) vit dans
 * `lib/paiement/paddle.ts`, testée sans harnais.
 *
 * Le pas à pas pour brancher un compte Paddle est dans `serveurs/paddle/LISEZMOI.md`.
 */

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

/** Une formule à un rythme : « equipe-annuel ». */
export type CleDePrix = `${Formule}-${Rythme}`;

export type CaisseServeur =
	| {
			readonly pret: true;
			readonly environnement: EnvironnementPaddle;
			readonly jeton: string;
			/** Les prix que cet établissement peut souscrire, avec l'essai s'il y a droit. */
			readonly prix: Readonly<Partial<Record<CleDePrix, string>>>;
			/** Les prix ci-dessus portent les trente jours d'essai. */
			readonly essai: boolean;
			/** Ce que le paiement emporte, scellé (voir `sceller`). */
			readonly donnees: Readonly<Record<string, string>>;
			/** Le client Paddle déjà connu, sinon l'adresse pour préremplir. */
			readonly client: { readonly id: string } | { readonly email: string };
			readonly pwCustomer: string | null;
			/** L'offre fondateurs, tant qu'il reste des places et que la date n'est pas passée. */
			readonly fondateurs: {
				readonly prixId: string;
				readonly restantes: number;
				readonly jusquAu: string;
			} | null;
			/** L'offre de bienvenue d'après un diagnostic : la remise se prépare au paiement. */
			readonly bienvenue: {
				readonly pourcent: number;
				readonly mois: number;
				readonly dernierJour: string;
			} | null;
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
 * ⚠️ LE PRIX VIENT D'ICI, PAS DU NAVIGATEUR : la table `prixPaddle`, et le
 * droit à l'essai calculé au serveur (`essaiDisponible`). Le jeton côté client
 * est public par nature ; la clé d'API et le secret ne sortent jamais.
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
		// Un abonnement vivant se GÈRE (changer, résilier), il ne se double pas :
		// deux abonnements sous le même sceau se disputeraient l'établissement.
		if (porteUnAutreAbonnementVivant(org, '')) {
			return {
				pret: false,
				manque: ['Cet établissement a déjà un abonnement : il se gère depuis Compte › Abonnement.']
			};
		}

		const profil = await ctx.db
			.query('userProfiles')
			.withIndex('by_userId', (q) => q.eq('userId', ctx.user._id))
			.unique();
		const essai = essaiDisponible(org, profil);

		const prix: Partial<Record<CleDePrix, string>> = {};
		for (const formule of FORMULES) {
			for (const rythme of RYTHMES) {
				const ligne = await ctx.db
					.query('prixPaddle')
					.withIndex('by_etiquette', (q) =>
						q.eq('etiquette', etiquetteDuPrix(formule, rythme, essai))
					)
					.first();
				if (ligne !== null) prix[`${formule}-${rythme}`] = ligne.prixId;
			}
		}
		if (Object.keys(prix).length === 0) {
			return {
				pret: false,
				manque: ['Aucun prix rangé : lancer « npx convex run paddleCatalogue:catalogue ».']
			};
		}

		const maintenant = Date.now();
		const parcours = await ctx.db
			.query('parcoursComptes')
			.withIndex('by_org', (q) => q.eq('organizationId', orgId))
			.first();
		const offre = offreDeBienvenue(parcours?.etapes ?? {}, maintenant);

		return {
			pret: true,
			environnement: reglages.environnement,
			jeton: reglages.jeton,
			prix,
			essai,
			fondateurs: await offreFondateurs(ctx, jourDeParis(maintenant)),
			bienvenue:
				offre === null
					? null
					: { pourcent: offre.pourcent, mois: offre.mois, dernierJour: offre.dernierJour },
			donnees: {
				[CLE_ORGANISATION]: orgId,
				[CLE_SCEAU]: await sceller(reglages.secret, orgId)
			},
			client: org.paddleCustomerId ? { id: org.paddleCustomerId } : { email: ctx.user.email },
			pwCustomer: org.paddleCustomerId ?? null
		};
	}
});

/** Les abonnements qui occupent une place : tout ce qui n'est pas résilié. */
const STATUTS_QUI_OCCUPENT = new Set(['active', 'trialing', 'past_due', 'paused']);

/**
 * L'offre fondateurs pour la caisse : le prix rangé, les places restantes (comptées sur
 * les abonnements vivants au prix fondateurs), et rien quand elle est close.
 */
export async function offreFondateurs(
	ctx: QueryCtx,
	jour: string
): Promise<{ prixId: string; restantes: number; jusquAu: string } | null> {
	const ligne = await ctx.db
		.query('prixPaddle')
		.withIndex('by_etiquette', (q) => q.eq('etiquette', ETIQUETTE_FONDATEURS))
		.first();
	if (ligne === null) return null;
	const prises = (
		await ctx.db
			.query('organizations')
			.withIndex('by_paddle_prix', (q) => q.eq('paddlePrixId', ligne.prixId))
			.take(OFFRES.fondateurs.places + 10)
	).filter((o) => o.paddleStatus !== undefined && STATUTS_QUI_OCCUPENT.has(o.paddleStatus)).length;
	const { ouverte, restantes } = placesFondateurs(jour, prises);
	return ouverte ? { prixId: ligne.prixId, restantes, jusquAu: OFFRES.fondateurs.jusquAu } : null;
}

/**
 * CE QU'IL FAUT À LA PAGE `/paiement` POUR OUVRIR UN LIEN DE PAIEMENT DE PADDLE
 * (14/10/2026) : l'environnement et le jeton côté client.
 *
 * Paddle envoie lui-même des liens de paiement (une facture à régler, une carte
 * à remplacer) vers le « lien de paiement par défaut » du compte, avec
 * `?_ptxn=<transaction>`. Paddle.js, initialisé sur cette page, ouvre seul le
 * paiement de cette transaction. Pas de session : celui qui paie n'est pas
 * forcément connecté, et le jeton côté client est public par nature (il ne
 * permet que d'ouvrir un paiement chez Paddle).
 */
export const lienDePaiement = query({
	args: {},
	returns: v.union(
		v.null(),
		v.object({
			environnement: v.union(v.literal('sandbox'), v.literal('production')),
			jeton: v.string()
		})
	),
	handler: async (): Promise<{ environnement: EnvironnementPaddle; jeton: string } | null> => {
		const reglages = reglagesDeLaCaisse();
		return reglages.pret ? { environnement: reglages.environnement, jeton: reglages.jeton } : null;
	}
});

/** Range les identifiants que le catalogue vient de lire ou de créer. */
export const rangerLesPrix = internalMutation({
	args: {
		prix: v.array(
			v.object({
				etiquette: v.string(),
				prixId: v.string(),
				formule: v.union(v.literal('solo'), v.literal('equipe'), v.literal('pro')),
				rythme: v.union(v.literal('mensuel'), v.literal('annuel')),
				essai: v.boolean(),
				montant: v.string(),
				fondateurs: v.optional(v.boolean())
			})
		)
	},
	handler: async (ctx, { prix }): Promise<number> => {
		let ranges = 0;
		for (const p of prix) {
			const existant = await ctx.db
				.query('prixPaddle')
				.withIndex('by_etiquette', (q) => q.eq('etiquette', p.etiquette))
				.first();
			if (existant?.prixId === p.prixId) continue;
			if (existant !== null) await ctx.db.delete(existant._id);
			await ctx.db.insert('prixPaddle', { ...p, enregistreLe: Date.now() });
			ranges += 1;
		}
		return ranges;
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
 * ⚠️ PADDLE N'ASSURE PAS L'ORDRE DES RAPPELS. Un rappel plus ancien que le
 * dernier inscrit est ignoré (`paddleEvenementLe`) : sinon un `past_due` en
 * retard rouvrirait un abonnement payé depuis, ou l'inverse.
 *
 * ⚠️ UN ESSAI NE SE DONNE QU'UNE FOIS. Le premier rappel d'un abonnement à
 * l'essai marque l'établissement ET les comptes qui l'administrent
 * (`essaiUtilise`, `hasUsedFreeTrial`) : ni une nouvelle souscription ni un
 * second établissement ne rouvriront trente jours offerts.
 */
export const upsertSubscription = internalMutation({
	args: {
		paddleSubscriptionId: v.string(),
		paddleCustomerId: v.string(),
		paddleStatus: v.string(),
		priceId: v.optional(v.string()),
		currentPeriodEnd: v.optional(v.number()),
		prochainPrelevementLe: v.optional(v.number()),
		essaiFinLe: v.optional(v.number()),
		resiliationLe: v.optional(v.number()),
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
		if (porteUnAutreAbonnementVivant(org, args.paddleSubscriptionId)) {
			return { action: 'autre-abonnement', organizationId: org._id };
		}
		if (org.paddleEvenementLe !== undefined && args.survenuLe < org.paddleEvenementLe) {
			return { action: 'ancien', organizationId: org._id };
		}

		const prix =
			args.priceId === undefined
				? null
				: await ctx.db
						.query('prixPaddle')
						.withIndex('by_prix', (q) => q.eq('prixId', args.priceId!))
						.first();
		const formule = prix?.formule ?? null;
		const statut = statutInterne(args.paddleStatus);
		const premierEssai = statut === 'trialing' && org.essaiUtilise !== true;

		await ctx.db.patch(org._id, {
			paddleSubscriptionId: args.paddleSubscriptionId,
			paddleCustomerId: args.paddleCustomerId,
			...(formule === null
				? {}
				: { paddlePlanTier: formule, paddleRythme: prix!.rythme, paddlePrixId: prix!.prixId }),
			paddleStatus: statut,
			paddleCurrentPeriodEnd: args.currentPeriodEnd,
			paddleProchainPrelevementLe: args.prochainPrelevementLe,
			paddleEssaiFinLe: statut === 'trialing' ? args.essaiFinLe : undefined,
			paddleResiliationLe: args.resiliationLe,
			paddleEvenementLe: args.survenuLe,
			...(formule === null ? {} : { seatsIncluded: limitesDe(formule).utilisateurs }),
			...(premierEssai ? { essaiUtilise: true } : {})
		});

		if (premierEssai) {
			const admins = await ctx.db
				.query('organizationMembers')
				.withIndex('by_organization', (q) => q.eq('organizationId', org._id))
				.collect();
			for (const membre of admins.filter((m) => m.role === 'ORG_ADMIN')) {
				const profil = await ctx.db
					.query('userProfiles')
					.withIndex('by_userId', (q) => q.eq('userId', membre.userId))
					.unique();
				if (profil !== null && profil.hasUsedFreeTrial !== true) {
					await ctx.db.patch(profil._id, { hasUsedFreeTrial: true });
				}
			}
		}
		// L'essai, l'abonnement, la résiliation : datés au jour vrai, et l'offre de bienvenue
		// se tait le jour même de l'achat (audit du 19/10/2026, lot 7).
		await ctx.scheduler.runAfter(0, internal.croissance.releve.releverLesEtapes, {
			organizationId: org._id
		});
		// Le prochain prélèvement, HT et TTC tels que Paddle les calcule (21/10/2026).
		await ctx.scheduler.runAfter(0, internal.paddle.releverLeProchainPrelevement, {
			organizationId: org._id,
			abonnementId: args.paddleSubscriptionId
		});
		return { action: 'inscrit', organizationId: org._id };
	}
});

/**
 * LE PROCHAIN PRÉLÈVEMENT, HT ET TTC (21/10/2026). Le fondateur : « partout dans
 * l'app tu affiches les montants HT et TTC ». Les rappels de Paddle ne portent pas les
 * taxes : on relit l'abonnement chez Paddle avec sa prochaine transaction, calculée pour
 * CE client (son pays, son numéro de TVA, sa remise), et on la range sur l'établissement.
 * L'écran Abonnement, l'e-mail J-2 et le point de Plume l'écrivent. Paddle muet : rien ne
 * change, l'écran dit le hors taxes et « TVA en plus ».
 */
export const releverLeProchainPrelevement = internalAction({
	args: { organizationId: v.id('organizations'), abonnementId: v.string() },
	returns: v.null(),
	handler: async (ctx, { organizationId, abonnementId }): Promise<null> => {
		if (!process.env.PADDLE_API_KEY) return null;
		let montants: { ht: number; ttc: number } | null;
		try {
			const data = await appelerPaddle(
				'GET',
				`/subscriptions/${abonnementId}?include=next_transaction`
			);
			montants = montantsDeLaTransaction(data.next_transaction);
		} catch {
			return null;
		}
		await ctx.runMutation(internal.paddle._noterLeProchainPrelevement, {
			organizationId,
			abonnementId,
			...(montants === null ? {} : { ht: montants.ht, ttc: montants.ttc })
		});
		return null;
	}
});

export const _noterLeProchainPrelevement = internalMutation({
	args: {
		organizationId: v.id('organizations'),
		abonnementId: v.string(),
		ht: v.optional(v.number()),
		ttc: v.optional(v.number())
	},
	returns: v.null(),
	handler: async (ctx, { organizationId, abonnementId, ht, ttc }): Promise<null> => {
		const org = await ctx.db.get(organizationId);
		// Un autre abonnement a pris la place entre-temps : on n'écrit rien sur lui.
		if (org === null || org.paddleSubscriptionId !== abonnementId) return null;
		await ctx.db.patch(org._id, { paddleProchainHT: ht, paddleProchainTTC: ttc });
		return null;
	}
});

/**
 * Les abonnements qui vivent déjà, relus une fois : ceux d'avant le 21/10/2026 n'ont
 * pas encore leur prochain prélèvement TTC. `npx convex run --prod paddle:releverLesProchainsPrelevements`.
 */
export const releverLesProchainsPrelevements = internalMutation({
	args: {},
	returns: v.object({ relus: v.number() }),
	handler: async (ctx): Promise<{ relus: number }> => {
		let relus = 0;
		for (const org of await ctx.db.query('organizations').take(2000)) {
			if (org.paddleSubscriptionId === undefined) continue;
			if (org.paddleStatus === undefined || !STATUTS_QUI_OCCUPENT.has(org.paddleStatus)) continue;
			await ctx.scheduler.runAfter(0, internal.paddle.releverLeProchainPrelevement, {
				organizationId: org._id,
				abonnementId: org.paddleSubscriptionId
			});
			relus++;
		}
		return { relus };
	}
});

/**
 * UN PAIEMENT CONFIRMÉ (`transaction.completed`) RATTACHE, IL NE RÉÉCRIT PAS
 * (14/10/2026).
 *
 * ⚠️ LE DÉFAUT QU'ELLE CORRIGE, vu au premier paiement du bac à sable : le
 * paiement arrive juste APRÈS `subscription.created` et `subscription.activated`,
 * et passait par `upsertSubscription` avec ce qu'il connaît seulement. Ses champs
 * vides effaçaient la date du prochain prélèvement ; et son statut, forcé à
 * `active`, aurait fait sortir de l'essai un établissement qui y entrait (le
 * paiement à 0 € du premier jour), date de fin d'essai et rappels J-7, J-2 avec.
 *
 * Il ne sert donc qu'à une chose : rattacher l'abonnement à l'établissement
 * quand aucun rappel d'abonnement ne l'a encore fait (un rappel perdu, ou
 * arrivé dans le désordre). Dès que l'établissement porte CET abonnement, il ne
 * touche plus à rien : l'abonnement dit son état complet, le paiement non. Il
 * n'avance pas non plus `paddleEvenementLe`, qui ne range que les rappels
 * d'abonnement entre eux.
 */
export const rattacherLePaiement = internalMutation({
	args: {
		paddleSubscriptionId: v.string(),
		paddleCustomerId: v.string(),
		priceId: v.optional(v.string()),
		currentPeriodEnd: v.optional(v.number()),
		/** Déjà vérifié par son sceau. */
		organizationId: v.optional(v.string())
	},
	returns: v.object({ action: v.string() }),
	handler: async (ctx, args): Promise<{ action: string }> => {
		const dejaLa = await ctx.db
			.query('organizations')
			.withIndex('by_paddle_subscription', (q) =>
				q.eq('paddleSubscriptionId', args.paddleSubscriptionId)
			)
			.unique();
		if (dejaLa !== null) return { action: 'deja-inscrit' };

		const org =
			(await orgDeLId(ctx, args.organizationId)) ??
			(await ctx.db
				.query('organizations')
				.withIndex('by_paddle_customer', (q) => q.eq('paddleCustomerId', args.paddleCustomerId))
				.first());
		if (!org) return { action: 'noop' };
		if (porteUnAutreAbonnementVivant(org, args.paddleSubscriptionId)) {
			return { action: 'autre-abonnement' };
		}

		const prix =
			args.priceId === undefined
				? null
				: await ctx.db
						.query('prixPaddle')
						.withIndex('by_prix', (q) => q.eq('prixId', args.priceId!))
						.first();
		await ctx.db.patch(org._id, {
			paddleSubscriptionId: args.paddleSubscriptionId,
			paddleCustomerId: args.paddleCustomerId,
			// Un paiement confirmé sans rappel d'abonnement : actif, en attendant
			// que l'abonnement dise son état exact (essai compris).
			paddleStatus: 'active',
			...(prix === null
				? {}
				: {
						paddlePlanTier: prix.formule,
						paddleRythme: prix.rythme,
						paddlePrixId: prix.prixId,
						seatsIncluded: limitesDe(prix.formule).utilisateurs
					}),
			...(args.currentPeriodEnd === undefined
				? {}
				: { paddleCurrentPeriodEnd: args.currentPeriodEnd })
		});
		await ctx.scheduler.runAfter(0, internal.croissance.releve.releverLesEtapes, {
			organizationId: org._id
		});
		return { action: 'rattache' };
	}
});

/**
 * UN ÉTABLISSEMENT, UN ABONNEMENT VIVANT (14/10/2026).
 *
 * ⚠️ LE DÉFAUT, vu dans le bac à sable : un premier paiement dont Paddle n'a
 * jamais envoyé les rappels, puis un second. Deux abonnements portaient le sceau
 * du même établissement. Le premier, annulé depuis le portail de Paddle, a
 * envoyé son rappel ; trouvé par son sceau, il a REMPLACÉ l'abonnement que
 * l'application suivait, et « Reprendre » a ensuite agi sur le mauvais.
 *
 * Tant que l'établissement suit un abonnement vivant (actif, en essai, en pause
 * ou en impayé), les rappels d'un AUTRE abonnement ne le touchent pas. Un nouvel
 * abonnement ne prend la place que d'un abonnement terminé, ou d'aucun.
 */
function porteUnAutreAbonnementVivant(
	org: Doc<'organizations'>,
	paddleSubscriptionId: string
): boolean {
	if (org.paddleSubscriptionId === undefined || org.paddleSubscriptionId === paddleSubscriptionId) {
		return false;
	}
	return (
		org.paddleStatus === 'active' ||
		org.paddleStatus === 'trialing' ||
		org.paddleStatus === 'paused' ||
		org.paddleStatus === 'past_due'
	);
}

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
 * chemin, puisque chacun porte l'état courant. Un `transaction.completed` sur un
 * abonnement l'inscrit aussi, actif : il peut arriver avant
 * `subscription.created`, et un rappel d'abonnement plus récent l'emporte.
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
	if (evenement.genre === 'abonnement') {
		await ctx.runMutation(internal.paddle.upsertSubscription, {
			...inscriptionDe(evenement),
			organizationId: await organisationScellee(secret, evenement.lien)
		});
	} else if (
		evenement.genre === 'paiement' &&
		evenement.abonnementId !== null &&
		evenement.clientId !== null
	) {
		// Rattacher seulement : un paiement ne connaît ni le prochain prélèvement ni
		// la fin de l'essai, et ne doit pas effacer ce que l'abonnement a dit.
		await ctx.runMutation(internal.paddle.rattacherLePaiement, {
			paddleSubscriptionId: evenement.abonnementId,
			paddleCustomerId: evenement.clientId,
			priceId: evenement.prixIds[0],
			currentPeriodEnd: evenement.finDePeriode ?? undefined,
			organizationId: await organisationScellee(secret, evenement.lien)
		});
	}

	return new Response(JSON.stringify({ received: true }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' }
	});
});

/** Ce qu'un événement d'abonnement inscrit, le même pour le rappel et pour nos actions. */
function inscriptionDe(evenement: Extract<EvenementPaddle, { genre: 'abonnement' }>) {
	return {
		paddleSubscriptionId: evenement.abonnementId,
		paddleCustomerId: evenement.clientId,
		paddleStatus: evenement.statut,
		priceId: evenement.prixId ?? undefined,
		currentPeriodEnd: evenement.finDePeriode ?? undefined,
		prochainPrelevementLe: evenement.prochainPrelevementLe ?? undefined,
		essaiFinLe: evenement.essaiFinLe ?? undefined,
		resiliationLe: evenement.resiliationLe ?? undefined,
		survenuLe: evenement.survenuLe
	};
}

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

// ── Changer, résilier, reprendre ────────────────────────────────────────────

/*
  GÉRER SA FORMULE SANS QUITTER LE PRODUIT (14/10/2026), sur Oportun et Natural AI :
  passer à l'année, changer de formule en voyant AVANT ce que cela coûte
  aujourd'hui, résilier en deux gestes, reprendre d'un geste. Chaque action
  appelle l'API de Paddle et inscrit aussitôt l'abonnement qu'elle rend : l'écran
  n'attend pas le rappel, qui confirmera la même chose.
*/

const vFormule = v.union(v.literal('solo'), v.literal('equipe'), v.literal('pro'));
const vRythme = v.union(v.literal('mensuel'), v.literal('annuel'));

export const _prixDe = internalQuery({
	args: { etiquette: v.string() },
	handler: async (ctx, { etiquette }): Promise<string | null> =>
		(
			await ctx.db
				.query('prixPaddle')
				.withIndex('by_etiquette', (q) => q.eq('etiquette', etiquette))
				.first()
		)?.prixId ?? null
});

export const _noterLaRaison = internalMutation({
	args: { organizationId: v.id('organizations'), raison: v.optional(v.string()) },
	handler: async (ctx, { organizationId, raison }): Promise<null> => {
		await ctx.db.patch(organizationId, { raisonResiliation: raison });
		return null;
	}
});

type CtxAction = ActionCtx & { readonly user: { readonly _id: string } };

async function abonnementAGerer(ctx: CtxAction) {
	const courant = await ctx.runQuery(internal.paddle._abonnementCourant, { userId: ctx.user._id });
	if (courant === null || courant.abonnementId === null) {
		throw new ConvexError('Aucun abonnement à gérer sur cet établissement.');
	}
	return { ...courant, abonnementId: courant.abonnementId };
}

/** Un appel à l'API de Paddle ; l'erreur de Paddle est dite telle quelle. */
async function appelerPaddle(
	methode: 'GET' | 'POST' | 'PATCH',
	chemin: string,
	corps?: Record<string, unknown>
): Promise<Record<string, unknown>> {
	const cle = process.env.PADDLE_API_KEY;
	if (!cle) throw new ConvexError('Le paiement n’est pas configuré sur ce déploiement.');
	const reponse = await fetch(`${baseDeLApi(environnementPaddle(process.env))}${chemin}`, {
		method: methode,
		headers: { Authorization: `Bearer ${cle}`, 'Content-Type': 'application/json' },
		...(corps === undefined ? {} : { body: JSON.stringify(corps) })
	});
	const json = (await reponse.json().catch(() => null)) as {
		data?: Record<string, unknown>;
		error?: { detail?: string };
	} | null;
	if (!reponse.ok) {
		throw new ConvexError(
			`Paddle n’a pas accepté le changement : ${json?.error?.detail ?? `erreur ${reponse.status}`}.`
		);
	}
	return json?.data ?? {};
}

/** Inscrit l'abonnement que Paddle vient de rendre, comme le ferait son rappel. */
async function inscrireLaReponse(
	ctx: CtxAction,
	data: Record<string, unknown>,
	organizationId: Id<'organizations'>
): Promise<void> {
	const evenement = lireEvenement({
		event_type: 'subscription.updated',
		occurred_at: typeof data.updated_at === 'string' ? data.updated_at : new Date().toISOString(),
		data
	});
	if (evenement.genre !== 'abonnement') return;
	await ctx.runMutation(internal.paddle.upsertSubscription, {
		...inscriptionDe(evenement),
		organizationId
	});
}

/** Pendant l'essai, rien n'est facturé ; ensuite, la différence au prorata, tout de suite. */
function corpsDuChangement(prixId: string, statut: string | null): Record<string, unknown> {
	return {
		items: [{ price_id: prixId, quantity: 1 }],
		proration_billing_mode: statut === 'trialing' ? 'do_not_bill' : 'prorated_immediately'
	};
}

async function prixCible(
	ctx: CtxAction,
	formule: Formule,
	rythme: Rythme,
	courant: { statut: string | null; prixAvecEssai: boolean }
): Promise<string> {
	// À l'essai, la nouvelle formule garde l'essai ; payée, elle n'en a plus.
	const essai = courant.statut === 'trialing' && courant.prixAvecEssai;
	const prixId = await ctx.runQuery(internal.paddle._prixDe, {
		etiquette: etiquetteDuPrix(formule, rythme, essai)
	});
	if (prixId === null)
		throw new ConvexError('Cette formule ne peut pas être souscrite pour le moment.');
	return prixId;
}

function sousTotal(transaction: unknown): number | null {
	if (typeof transaction !== 'object' || transaction === null) return null;
	const details = (transaction as { details?: { totals?: { subtotal?: unknown } } }).details;
	const valeur = details?.totals?.subtotal;
	return typeof valeur === 'string' && /^-?\d+$/.test(valeur) ? Number(valeur) : null;
}

/**
 * Ce que coûterait le changement, AVANT de le faire : ce qui serait prélevé
 * aujourd'hui (au prorata, hors taxes), le prochain prélèvement et sa date.
 */
export const apercuDuChangement = authedAction({
	args: { formule: vFormule, rythme: vRythme },
	handler: async (
		ctx,
		{ formule, rythme }
	): Promise<{
		aujourdhui: number;
		aujourdhuiTTC: number | null;
		ensuite: number | null;
		ensuiteTTC: number | null;
		prochainLe: number | null;
	}> => {
		const courant = await abonnementAGerer(ctx);
		const prixId = await prixCible(ctx, formule, rythme, courant);
		const data = await appelerPaddle(
			'PATCH',
			`/subscriptions/${courant.abonnementId}/preview`,
			corpsDuChangement(prixId, courant.statut)
		);
		const prochain =
			typeof data.next_billed_at === 'string' ? Date.parse(data.next_billed_at) : NaN;
		// HT et TTC tels que Paddle les calcule pour ce client (21/10/2026).
		const maintenant = montantsDeLaTransaction(data.immediate_transaction);
		const suite = montantsDeLaTransaction(data.next_transaction);
		return {
			aujourdhui: maintenant?.ht ?? sousTotal(data.immediate_transaction) ?? 0,
			aujourdhuiTTC: maintenant?.ttc ?? null,
			ensuite: suite?.ht ?? sousTotal(data.next_transaction),
			ensuiteTTC: suite?.ttc ?? null,
			prochainLe: Number.isNaN(prochain) ? null : prochain
		};
	}
});

export const changerDeFormule = authedAction({
	args: {
		formule: vFormule,
		rythme: vRythme,
		/** Le gérant a lu que le prix fondateurs ne revient pas (audit, lot 8). */
		quitterLePrixFondateurs: v.optional(v.boolean())
	},
	handler: async (ctx, { formule, rythme, quitterLePrixFondateurs }): Promise<null> => {
		const courant = await abonnementAGerer(ctx);
		if (courant.prixFondateurs && quitterLePrixFondateurs !== true) {
			throw new ConvexError(
				'Vous êtes au prix fondateurs, bloqué à vie : changer de formule le quitte, sans retour. Confirmez depuis la page du changement.'
			);
		}
		const prixId = await prixCible(ctx, formule, rythme, courant);
		const data = await appelerPaddle(
			'PATCH',
			`/subscriptions/${courant.abonnementId}`,
			corpsDuChangement(prixId, courant.statut)
		);
		await inscrireLaReponse(ctx, data, courant.organizationId);
		return null;
	}
});

/**
 * LA REMISE DE BIENVENUE (19/10/2026, audit, lot 8) : créée chez Paddle au moment de
 * payer une formule au mois, pour cet établissement seul, à usage unique, jusqu'à la fin
 * de l'offre. Une remise déjà créée qui vaut encore est reprise, jamais doublée. Rend
 * son identifiant, que la caisse passe à Paddle ; `null` quand l'offre ne vaut plus.
 */
export const remiseDeBienvenue = authedAction({
	args: {},
	handler: async (ctx): Promise<string | null> => {
		const contexte = await ctx.runQuery(internal.paddle._contexteDeLaRemise, {
			userId: ctx.user._id
		});
		if (contexte === null) throw new ConvexError('Seul un administrateur choisit la formule.');
		const offre = offreDeBienvenue(contexte.etapes, Date.now());
		if (offre === null) return null;
		if (contexte.remiseId !== null && contexte.remiseExpireLe === offre.expireLe) {
			return contexte.remiseId;
		}
		if (contexte.prixMensuels.length === 0) return null;
		const data = await appelerPaddle(
			'POST',
			'/discounts',
			corpsDeLaRemise({
				organisationId: contexte.organizationId,
				nomEtablissement: contexte.nom,
				prixIds: contexte.prixMensuels,
				expireLe: offre.expireLe
			})
		);
		const id = typeof data.id === 'string' ? data.id : null;
		if (id === null) throw new ConvexError('Paddle n’a pas rendu la remise.');
		await ctx.runMutation(internal.paddle._noterLaRemise, {
			organizationId: contexte.organizationId,
			remiseId: id,
			expireLe: offre.expireLe
		});
		return id;
	}
});

export const _contexteDeLaRemise = internalQuery({
	args: { userId: v.string() },
	handler: async (
		ctx,
		{ userId }
	): Promise<{
		organizationId: Id<'organizations'>;
		nom: string;
		etapes: Doc<'parcoursComptes'>['etapes'];
		remiseId: string | null;
		remiseExpireLe: number | null;
		prixMensuels: string[];
	} | null> => {
		const orgId = await organisationCouranteOuNull(ctx, userId);
		if (orgId === null) return null;
		const membre = await ctx.db
			.query('organizationMembers')
			.withIndex('by_org_and_user', (q) => q.eq('organizationId', orgId).eq('userId', userId))
			.unique();
		if (membre?.role !== 'ORG_ADMIN') return null;
		const org = await ctx.db.get(orgId);
		if (org === null) return null;
		const parcours = await ctx.db
			.query('parcoursComptes')
			.withIndex('by_org', (q) => q.eq('organizationId', orgId))
			.first();
		// Les prix au mois, avec et sans essai : la remise porte sur les premiers mois.
		const prixMensuels: string[] = [];
		for (const formule of FORMULES) {
			for (const essai of [true, false]) {
				const ligne = await ctx.db
					.query('prixPaddle')
					.withIndex('by_etiquette', (q) =>
						q.eq('etiquette', etiquetteDuPrix(formule, 'mensuel', essai))
					)
					.first();
				if (ligne !== null) prixMensuels.push(ligne.prixId);
			}
		}
		return {
			organizationId: org._id,
			nom: org.name,
			etapes: parcours?.etapes ?? {},
			remiseId: org.remiseBienvenueId ?? null,
			remiseExpireLe: org.remiseBienvenueExpireLe ?? null,
			prixMensuels
		};
	}
});

export const _noterLaRemise = internalMutation({
	args: { organizationId: v.id('organizations'), remiseId: v.string(), expireLe: v.number() },
	returns: v.null(),
	handler: async (ctx, { organizationId, remiseId, expireLe }): Promise<null> => {
		await ctx.db.patch(organizationId, {
			remiseBienvenueId: remiseId,
			remiseBienvenueExpireLe: expireLe
		});
		return null;
	}
});

/**
 * Résilier : rien n'est plus prélevé, l'accès court jusqu'à la fin de la
 * période payée (ou de l'essai). La raison est facultative et ne retient rien.
 */
export const resilier = authedAction({
	args: { raison: v.optional(v.string()) },
	handler: async (ctx, { raison }): Promise<null> => {
		const courant = await abonnementAGerer(ctx);
		const data = await appelerPaddle('POST', `/subscriptions/${courant.abonnementId}/cancel`, {
			effective_from: 'next_billing_period'
		});
		await inscrireLaReponse(ctx, data, courant.organizationId);
		await ctx.runMutation(internal.paddle._noterLaRaison, {
			organizationId: courant.organizationId,
			...(raison === undefined ? {} : { raison })
		});
		return null;
	}
});

/** Reprendre un abonnement résilié avant qu'il ne s'arrête. */
export const reprendre = authedAction({
	args: {},
	handler: async (ctx): Promise<null> => {
		const courant = await abonnementAGerer(ctx);
		const data = await appelerPaddle('PATCH', `/subscriptions/${courant.abonnementId}`, {
			scheduled_change: null
		});
		await inscrireLaReponse(ctx, data, courant.organizationId);
		return null;
	}
});

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
 * Le client et l'abonnement Paddle de l'établissement COURANT, pour son
 * administrateur.
 *
 * ⚠️ UNE ANCIENNE VERSION PRENAIT LA PREMIÈRE APPARTENANCE DU COMPTE, pas
 * l'établissement courant : quelqu'un qui en administre deux ouvrait le
 * portail de l'autre.
 */
export const _abonnementCourant = internalQuery({
	args: { userId: v.string() },
	handler: async (
		ctx,
		{ userId }
	): Promise<{
		clientId: string | null;
		abonnementId: string | null;
		statut: string | null;
		/** Le prix souscrit porte les trente jours d'essai. */
		prixAvecEssai: boolean;
		/** Le prix souscrit est le prix fondateurs. */
		prixFondateurs: boolean;
		organizationId: Id<'organizations'>;
	} | null> => {
		const orgId = await organisationCouranteOuNull(ctx, userId);
		if (orgId === null) return null;
		const membre = await ctx.db
			.query('organizationMembers')
			.withIndex('by_org_and_user', (q) => q.eq('organizationId', orgId).eq('userId', userId))
			.unique();
		if (membre?.role !== 'ORG_ADMIN') return null;
		const org = await ctx.db.get(orgId);
		if (org === null) return null;
		const prix =
			org.paddlePrixId === undefined
				? null
				: await ctx.db
						.query('prixPaddle')
						.withIndex('by_prix', (q) => q.eq('prixId', org.paddlePrixId!))
						.first();
		return {
			clientId: org.paddleCustomerId ?? null,
			abonnementId: org.paddleSubscriptionId ?? null,
			statut: org.paddleStatus ?? null,
			prixAvecEssai: prix?.essai === true,
			prixFondateurs: prix?.fondateurs === true,
			organizationId: org._id
		};
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
		const courant = await ctx.runQuery(internal.paddle._abonnementCourant, {
			userId: ctx.user._id
		});
		if (!courant?.clientId) return null;

		const apiKey = process.env.PADDLE_API_KEY;
		if (!apiKey) throw new ConvexError('Le paiement n’est pas configuré sur ce déploiement.');

		const res = await fetch(
			`${baseDeLApi(environnementPaddle(process.env))}/customers/${courant.clientId}/portal-sessions`,
			{
				method: 'POST',
				headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
				body: JSON.stringify(
					courant.abonnementId === null ? {} : { subscription_ids: [courant.abonnementId] }
				)
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
