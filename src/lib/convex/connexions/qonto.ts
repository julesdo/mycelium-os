import { v, ConvexError } from 'convex/values';
import { httpAction, internalAction, type ActionCtx } from '../_generated/server';
import { internal } from '../_generated/api';
import type { Doc, Id } from '../_generated/dataModel';
import { authedAction } from '../functions';
import { decryptToken, encryptToken, requireEncryptionKey } from '../lib/crypto';
import { DROITS_QONTO, configQonto, entetesQonto, type ConfigQonto } from './qontoConfig';
import {
	factureDepuisQonto,
	signatureQontoValide,
	type FactureDepuisQonto,
	type FactureQonto
} from '../../socle/connecteurs/qonto';

/**
 * LA CONNEXION QONTO : démarrer, revenir, s'abonner, se déconnecter.
 *
 * ⚠️ CHAQUE HANDLER ANNOTE SON TYPE DE RETOUR. Ce module se planifie lui-même
 * (`internal.connexions.qonto.*`) : sans annotation, l'inférence de tout `api`
 * retombe en `any`, et des dizaines d'erreurs surgissent dans des fichiers que
 * personne n'a touchés.
 */

const CLE_CHIFFREMENT = 'CONNEXIONS_CLE_CHIFFREMENT';
/** Dix minutes pour revenir de Qonto : au-delà, le `state` ne vaut plus rien. */
const DUREE_ETAT_MS = 10 * 60 * 1000;
/** On renouvelle le jeton d'accès cinq minutes avant qu'il n'expire. */
const MARGE_JETON_MS = 5 * 60 * 1000;

interface JetonsQonto {
	readonly access_token: string;
	readonly refresh_token: string;
	readonly expires_in: number;
}

function aleatoire(octets: number): string {
	return Array.from(crypto.getRandomValues(new Uint8Array(octets)), (o) =>
		o.toString(16).padStart(2, '0')
	).join('');
}

async function demanderJetons(
	config: ConfigQonto,
	corps: Record<string, string>
): Promise<JetonsQonto> {
	// Qonto veut `client_id` et `client_secret` DANS LE CORPS, pas en `Basic`.
	const reponse = await fetch(config.urlJeton, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...entetesQonto(config) },
		body: new URLSearchParams({
			client_id: config.clientId,
			client_secret: config.clientSecret,
			...corps
		})
	});
	if (!reponse.ok) throw new Error(`Qonto a refusé les jetons (${reponse.status})`);
	return (await reponse.json()) as JetonsQonto;
}

/**
 * UN JETON D'ACCÈS UTILISABLE : le stocké s'il vit encore, sinon un neuf.
 *
 * Le jeton de rafraîchissement est à usage unique : le neuf est enregistré
 * aussitôt, sinon la prochaine synchronisation présenterait un jeton déjà brûlé.
 */
export async function jetonValide(
	ctx: ActionCtx,
	config: ConfigQonto,
	connexion: Doc<'connexionsQonto'>
): Promise<string> {
	const cle = requireEncryptionKey(CLE_CHIFFREMENT);
	if (
		connexion.jetonAccesChiffre !== undefined &&
		connexion.jetonExpireLe !== undefined &&
		connexion.jetonExpireLe - MARGE_JETON_MS > Date.now()
	) {
		return decryptToken(connexion.jetonAccesChiffre, cle);
	}
	if (connexion.jetonRafraichissementChiffre === undefined) {
		throw new Error('Aucun jeton de rafraîchissement');
	}
	const jetons = await demanderJetons(config, {
		grant_type: 'refresh_token',
		refresh_token: await decryptToken(connexion.jetonRafraichissementChiffre, cle)
	});
	await ctx.runMutation(internal.connexions.qontoDonnees.enregistrerJetons, {
		connexionId: connexion._id,
		jetonAccesChiffre: await encryptToken(jetons.access_token, cle),
		jetonRafraichissementChiffre: await encryptToken(jetons.refresh_token, cle),
		jetonExpireLe: Date.now() + jetons.expires_in * 1000,
		garderStatut: true
	});
	return jetons.access_token;
}

/** Rend l'adresse Qonto à ouvrir dans le navigateur du gérant. */
export const demarrerConnexionQonto = authedAction({
	args: {},
	returns: v.string(),
	handler: async (ctx): Promise<string> => {
		const config = configQonto();
		if (config === null) throw new ConvexError('La connexion Qonto n’est pas encore activée.');

		const organizationId: Id<'organizations'> = await ctx.runQuery(
			internal.connexions.qontoDonnees.organisationAdministree,
			{ userId: ctx.user._id }
		);
		const etat = aleatoire(24);
		await ctx.runMutation(internal.connexions.qontoDonnees.preparerConnexion, {
			organizationId,
			etatOAuth: etat,
			etatExpireLe: Date.now() + DUREE_ETAT_MS
		});

		const url = new URL(config.urlAutorisation);
		url.searchParams.set('client_id', config.clientId);
		url.searchParams.set('redirect_uri', config.urlRetour);
		url.searchParams.set('response_type', 'code');
		url.searchParams.set('scope', DROITS_QONTO);
		url.searchParams.set('state', etat);
		return url.toString();
	}
});

/**
 * LE RETOUR DE QONTO. Le code s'échange ici, côté serveur : le secret de
 * l'application ne passe jamais par le navigateur. Puis on renvoie le gérant
 * sur l'accueil, où la carte dit elle-même où en est la connexion.
 */
export const retourQonto = httpAction(async (ctx, requete) => {
	const config = configQonto();
	const parametres = new URL(requete.url).searchParams;
	const accueil = `${config?.urlApplication ?? ''}/app`;
	const etat = parametres.get('state');
	if (config === null || etat === null) return Response.redirect(accueil, 302);

	const connexion = await ctx.runQuery(internal.connexions.qontoDonnees.connexionParEtat, {
		etatOAuth: etat
	});
	if (connexion === null || (connexion.etatExpireLe ?? 0) < Date.now()) {
		return Response.redirect(accueil, 302);
	}

	const code = parametres.get('code');
	if (code === null) {
		// Le gérant a refusé chez Qonto, ou Qonto a renvoyé une erreur.
		await ctx.runMutation(internal.connexions.qontoDonnees.marquerConnexion, {
			connexionId: connexion._id,
			statut: 'ECHEC',
			erreur: 'La connexion a été annulée chez Qonto.'
		});
		return Response.redirect(accueil, 302);
	}

	try {
		const jetons = await demanderJetons(config, {
			grant_type: 'authorization_code',
			code,
			redirect_uri: config.urlRetour
		});
		const cle = requireEncryptionKey(CLE_CHIFFREMENT);
		await ctx.runMutation(internal.connexions.qontoDonnees.enregistrerJetons, {
			connexionId: connexion._id,
			jetonAccesChiffre: await encryptToken(jetons.access_token, cle),
			jetonRafraichissementChiffre: await encryptToken(jetons.refresh_token, cle),
			jetonExpireLe: Date.now() + jetons.expires_in * 1000
		});
		await ctx.scheduler.runAfter(0, internal.connexions.qonto.abonner, {
			connexionId: connexion._id
		});
	} catch {
		await ctx.runMutation(internal.connexions.qontoDonnees.marquerConnexion, {
			connexionId: connexion._id,
			statut: 'ECHEC',
			erreur: 'Qonto n’a pas confirmé la connexion. Réessayez.'
		});
	}
	return Response.redirect(accueil, 302);
});

/**
 * S'ABONNER AUX WEBHOOKS : chaque facture créée ou payée chez Qonto remonte
 * alors d'elle-même. Un échec ici ne casse pas la connexion : la
 * synchronisation de secours, toutes les six heures, rattrape tout.
 */
export const abonner = internalAction({
	args: { connexionId: v.id('connexionsQonto') },
	returns: v.null(),
	handler: async (ctx, { connexionId }): Promise<null> => {
		const config = configQonto();
		const connexion = await ctx.runQuery(internal.connexions.qontoDonnees.lireConnexion, {
			connexionId
		});
		if (config === null || connexion === null) return null;

		try {
			const jeton = await jetonValide(ctx, config, connexion);
			const secret = aleatoire(32);
			const reponse = await fetch(`${config.urlApi}/webhook_subscriptions`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', ...entetesQonto(config, jeton) },
				body: JSON.stringify({
					callback_url: config.urlWebhook,
					types: ['v1/client-invoices', 'v1/consent-revocations'],
					secret,
					description: 'Letikette'
				})
			});
			if (reponse.ok) {
				const brut = (await reponse.json()) as {
					webhook_subscription?: { id?: string; organization_id?: string };
					id?: string;
					organization_id?: string;
				};
				const abonnement = brut.webhook_subscription ?? brut;
				if (abonnement.id !== undefined && abonnement.organization_id !== undefined) {
					await ctx.runMutation(internal.connexions.qontoDonnees.enregistrerAbonnement, {
						connexionId,
						abonnementWebhookId: abonnement.id,
						secretWebhookChiffre: await encryptToken(
							secret,
							requireEncryptionKey(CLE_CHIFFREMENT)
						),
						qontoOrganizationId: abonnement.organization_id
					});
				}
			}
		} catch {
			// Le rattrapage périodique couvre un abonnement manqué.
		}

		// La première lecture part tout de suite : le gérant revient de Qonto et
		// regarde l'accueil se remplir.
		await ctx.scheduler.runAfter(0, internal.connexions.qonto.synchroniser, { connexionId });
		return null;
	}
});

/** Retirer la connexion : l'abonnement chez Qonto d'abord, puis la ligne. */
export const deconnecterQonto = authedAction({
	args: {},
	returns: v.null(),
	handler: async (ctx): Promise<null> => {
		const organizationId: Id<'organizations'> = await ctx.runQuery(
			internal.connexions.qontoDonnees.organisationAdministree,
			{ userId: ctx.user._id }
		);
		const connexion = await ctx.runQuery(
			internal.connexions.qontoDonnees.connexionDeLOrganisation,
			{ organizationId }
		);
		if (connexion === null) return null;

		const config = configQonto();
		if (config !== null && connexion.abonnementWebhookId !== undefined) {
			try {
				const jeton = await jetonValide(ctx, config, connexion);
				await fetch(`${config.urlApi}/webhook_subscriptions/${connexion.abonnementWebhookId}`, {
					method: 'DELETE',
					headers: entetesQonto(config, jeton)
				});
			} catch {
				// Un abonnement resté chez Qonto n'ouvre rien : sa connexion n'existe plus ici.
			}
		}
		await ctx.runMutation(internal.connexions.qontoDonnees.supprimerConnexion, {
			connexionId: connexion._id
		});
		return null;
	}
});

/** Un accès retiré depuis Qonto : se reconnecter, pas réessayer. */
class AccesRetire extends Error {}

/**
 * LIRE LES FACTURES QONTO MODIFIÉES DEPUIS LA DERNIÈRE FOIS, et les écrire par
 * le chemin d'import, qui dédoublonne déjà par référence.
 *
 * Le curseur est l'heure de DÉBUT de la synchronisation réussie : une facture
 * modifiée pendant la lecture sera relue la fois suivante, ce qui ne coûte
 * rien, puisque l'import est idempotent.
 */
export const synchroniser = internalAction({
	args: { connexionId: v.id('connexionsQonto') },
	returns: v.null(),
	handler: async (ctx, { connexionId }): Promise<null> => {
		const config = configQonto();
		if (config === null) return null;
		const connexion = await ctx.runMutation(internal.connexions.qontoDonnees.commencerSynchro, {
			connexionId
		});
		if (connexion === null) return null;

		const debut = new Date().toISOString();
		const aujourdHui = debut.slice(0, 10);
		try {
			const jeton = await jetonValide(ctx, config, connexion);
			let page: number | null = 1;
			let importees = 0;

			while (page !== null) {
				const url = new URL(`${config.urlApi}/client_invoices`);
				url.searchParams.set('page', String(page));
				url.searchParams.set('per_page', '100');
				if (connexion.curseur !== undefined) {
					url.searchParams.set('filter[updated_at_from]', connexion.curseur);
				}
				const reponse = await fetch(url, { headers: entetesQonto(config, jeton) });
				if (reponse.status === 401 || reponse.status === 403) throw new AccesRetire();
				if (!reponse.ok) throw new Error(`Qonto a répondu ${reponse.status}`);

				const corps = (await reponse.json()) as {
					client_invoices?: FactureQonto[];
					meta?: { next_page?: number | null };
				};
				const factures = (corps.client_invoices ?? [])
					.map((facture) => factureDepuisQonto(facture, aujourdHui))
					.filter((facture): facture is FactureDepuisQonto => facture !== null);

				if (factures.length > 0) {
					await ctx.runMutation(internal.recouvrement.import.enregistrerImport, {
						organizationId: connexion.organizationId,
						factures: factures.map(({ regleCumule: _regle, ...facture }) => facture),
						reglements: [],
						reglementsCumules: factures.flatMap((facture) =>
							facture.regleCumule === null
								? []
								: [
										{
											reference: facture.reference,
											date: facture.regleCumule.date,
											montantCumule: facture.regleCumule.montant
										}
									]
						),
						aujourdHui
					});
				}
				importees += factures.length;
				await ctx.runMutation(internal.connexions.qontoDonnees.avancerSynchro, {
					connexionId,
					facturesLues: (connexion.facturesLues ?? 0) + importees
				});
				page = corps.meta?.next_page ?? null;
			}

			await ctx.runMutation(internal.connexions.qontoDonnees.terminerSynchro, {
				connexionId,
				curseur: debut
			});
		} catch (erreur) {
			await ctx.runMutation(internal.connexions.qontoDonnees.marquerConnexion, {
				connexionId,
				statut: erreur instanceof AccesRetire ? 'REVOQUEE' : 'ECHEC',
				erreur:
					erreur instanceof AccesRetire
						? 'L’accès a été retiré depuis Qonto.'
						: 'La lecture des factures Qonto a échoué. Elle sera retentée.'
			});
		}
		return null;
	}
});

/** Le rattrapage : toutes les connexions vivantes, toutes les six heures. */
export const synchroniserToutes = internalAction({
	args: {},
	returns: v.null(),
	handler: async (ctx): Promise<null> => {
		const connexions: Id<'connexionsQonto'>[] = await ctx.runQuery(
			internal.connexions.qontoDonnees.connexionsASynchroniser,
			{}
		);
		for (const connexionId of connexions) {
			await ctx.scheduler.runAfter(0, internal.connexions.qonto.synchroniser, { connexionId });
		}
		return null;
	}
});

/** Le bouton « Synchroniser » : n'importe quel membre peut le toucher. */
export const synchroniserMaintenant = authedAction({
	args: {},
	returns: v.null(),
	handler: async (ctx): Promise<null> => {
		const organizationId: Id<'organizations'> = await ctx.runQuery(
			internal.connexions.qontoDonnees.organisationDuMembre,
			{ userId: ctx.user._id }
		);
		const connexion = await ctx.runQuery(
			internal.connexions.qontoDonnees.connexionDeLOrganisation,
			{ organizationId }
		);
		if (connexion !== null) {
			await ctx.scheduler.runAfter(0, internal.connexions.qonto.synchroniser, {
				connexionId: connexion._id
			});
		}
		return null;
	}
});

/**
 * LE WEBHOOK QONTO. Il doit répondre en moins d'une seconde : on vérifie la
 * signature, on PLANIFIE la synchronisation, et on rend la main aussitôt.
 */
export const webhookQonto = httpAction(async (ctx, requete) => {
	const corps = await requete.text();
	let evenement: {
		event_type?: string;
		type?: string;
		organization_id?: string;
		data?: { organization_id?: string };
	};
	try {
		evenement = JSON.parse(corps) as typeof evenement;
	} catch {
		return new Response(null, { status: 400 });
	}

	const qontoOrganizationId = evenement.organization_id ?? evenement.data?.organization_id;
	if (qontoOrganizationId === undefined) return new Response(null, { status: 200 });

	const connexion = await ctx.runQuery(
		internal.connexions.qontoDonnees.connexionParOrganisationQonto,
		{ qontoOrganizationId }
	);
	if (connexion === null || connexion.secretWebhookChiffre === undefined) {
		return new Response(null, { status: 200 });
	}

	const secret = await decryptToken(
		connexion.secretWebhookChiffre,
		requireEncryptionKey(CLE_CHIFFREMENT)
	);
	const signee = await signatureQontoValide(
		corps,
		requete.headers.get('X-Qonto-Signature'),
		secret,
		Math.floor(Date.now() / 1000)
	);
	if (!signee) return new Response(null, { status: 401 });

	const type = evenement.event_type ?? evenement.type ?? '';
	if (type.includes('consent')) {
		await ctx.runMutation(internal.connexions.qontoDonnees.marquerConnexion, {
			connexionId: connexion._id,
			statut: 'REVOQUEE',
			erreur: 'L’accès a été retiré depuis Qonto.'
		});
	} else {
		await ctx.scheduler.runAfter(0, internal.connexions.qonto.synchroniser, {
			connexionId: connexion._id
		});
	}
	return new Response(null, { status: 200 });
});
