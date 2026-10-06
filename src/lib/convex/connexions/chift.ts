import { v, ConvexError } from 'convex/values';
import { httpAction, internalAction, type ActionCtx } from '../_generated/server';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { authedAction } from '../functions';
import {
	APIS_CHIFT,
	EVENEMENTS_CHIFT,
	PAYS_CHIFT,
	configChift,
	type ConfigChift
} from './chiftConfig';
import {
	debutDePremiereLecture,
	factureDepuisChiftComptable,
	factureDepuisChiftFacturation,
	signatureChiftValide,
	type ContactChift,
	type FactureComptableChift,
	type FactureFacturationChift,
	type PartenaireChift,
	type TraductionChift
} from '../../socle/connecteurs/chift';
import type { FactureDepuisConnecteur } from '../../socle/connecteurs/facture-connecteur';
import { REGIMES_PRESCRIPTION } from '../../verticales/recouvrement/pays/france/prescription';
import { estSirenValide } from '../../verticales/recouvrement/pays/france/siren';

/**
 * LA CONNEXION CHIFT : brancher un logiciel, le lire, le débrancher.
 *
 * Chift est une API unifiée. Au lieu d'écrire un connecteur par logiciel —
 * comme pour Qonto : OAuth, jetons chiffrés, webhook et traducteur, à refaire
 * pour chacun —, une seule intégration ouvre une quarantaine de logiciels
 * comptables et de facturation français. Le gérant touche « Connecter votre
 * logiciel », choisit le sien sur une page tenue par Chift, et ses factures
 * arrivent seules.
 *
 * ⚠️ CHAQUE HANDLER ANNOTE SON TYPE DE RETOUR. Ce module se planifie lui-même
 * (`internal.connexions.chift.*`) : sans annotation, l'inférence de tout `api`
 * retombe en `any`, et des dizaines d'erreurs surgissent dans des fichiers que
 * personne n'a touchés.
 *
 * ⚠️ LECTURE SEULE. Hors la création du consommateur, de son lien de connexion
 * et des webhooks — qui ne concernent que notre propre compte Chift —, aucun
 * appel n'écrit quoi que ce soit dans le logiciel du gérant (ligne rouge 2).
 */

/**
 * Les vérifications qui suivent un départ vers Chift, en minutes. Le retour du
 * gérant n'est pas un signal fiable (il peut fermer l'onglet), et le webhook
 * peut ne pas être déclaré : on regarde donc soi-même, de moins en moins souvent.
 */
const VERIFICATIONS_APRES_DEPART_MIN = [1, 3, 10, 30] as const;

/** Cent par page, le maximum de l'API. */
const TAILLE_PAGE = 100;

/**
 * ⚠️ UN PLAFOND, PAS UN OUBLI : deux cents pages, soit vingt mille factures par
 * logiciel et par lecture. Au-delà, la lecture s'arrête en le disant, plutôt que
 * de buter sur la limite de durée d'une action sans rien écrire.
 */
const PLAFOND_PAGES = 200;

/** Le plus long délai pour agir du registre : la première lecture ne remonte pas plus loin. */
const PLUS_LONG_DELAI_ANNEES = Math.max(
	...Object.values(REGIMES_PRESCRIPTION).map((regime) => regime.dureeAnnees)
);

/** Un refus de Chift sur notre clé : rien à réessayer de l'écran, c'est notre compte. */
class CleRefusee extends Error {}

interface ConnexionChiftDistante {
	readonly connectionid: string;
	readonly integration: string;
	readonly api: string;
	readonly status: string;
}

interface PageChift<T> {
	readonly items: readonly T[];
	readonly total: number;
	readonly page: number;
	readonly size: number;
}

/** Un jeton de trente minutes, contre la clé du compte. Corps JSON, sans `grant_type`. */
async function jetonChift(config: ConfigChift): Promise<string> {
	const reponse = await fetch(`${config.urlApi}/token`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			clientId: config.clientId,
			clientSecret: config.clientSecret,
			accountId: config.accountId
		})
	});
	if (reponse.status === 401 || reponse.status === 403) throw new CleRefusee();
	if (!reponse.ok) throw new Error(`Chift a refusé le jeton (${reponse.status})`);
	const corps = (await reponse.json()) as { access_token?: string };
	if (!corps.access_token) throw new Error('Chift n’a pas rendu de jeton');
	return corps.access_token;
}

async function appelChift<T>(
	config: ConfigChift,
	jeton: string,
	chemin: string,
	options: {
		readonly methode?: 'GET' | 'POST' | 'DELETE';
		readonly parametres?: Record<string, string>;
		readonly corps?: unknown;
		readonly connexionDistante?: string;
	} = {}
): Promise<T> {
	const url = new URL(`${config.urlApi}${chemin}`);
	for (const [cle, valeur] of Object.entries(options.parametres ?? {})) {
		url.searchParams.set(cle, valeur);
	}
	const reponse = await fetch(url, {
		method: options.methode ?? 'GET',
		headers: {
			Authorization: `Bearer ${jeton}`,
			...(options.corps === undefined ? {} : { 'Content-Type': 'application/json' }),
			// Un consommateur qui a branché DEUX logiciels sur la même API rend la
			// requête ambiguë : on désigne la connexion voulue.
			...(options.connexionDistante === undefined
				? {}
				: { 'X-Chift-Connectionid': options.connexionDistante })
		},
		...(options.corps === undefined ? {} : { body: JSON.stringify(options.corps) })
	});
	if (reponse.status === 401) throw new CleRefusee();
	if (!reponse.ok) throw new Error(`Chift a répondu ${reponse.status} sur ${chemin}`);
	if (reponse.status === 204) return null as T;
	return (await reponse.json()) as T;
}

/** Toutes les pages d'une collection, dans la limite du plafond. */
async function toutesLesPages<T>(
	config: ConfigChift,
	jeton: string,
	chemin: string,
	parametres: Record<string, string>,
	connexionDistante: string,
	surPage: (elements: readonly T[]) => Promise<void>
): Promise<void> {
	for (let page = 1; page <= PLAFOND_PAGES; page++) {
		const corps = await appelChift<PageChift<T>>(config, jeton, chemin, {
			parametres: { ...parametres, page: String(page), size: String(TAILLE_PAGE) },
			connexionDistante
		});
		await surPage(corps.items);
		if (corps.items.length === 0 || page * TAILLE_PAGE >= corps.total) return;
	}
	throw new Error(`Plus de ${PLAFOND_PAGES * TAILLE_PAGE} éléments sur ${chemin}`);
}

/** `updated_after` en UTC sans millisecondes : la seule écriture que tous les logiciels acceptent. */
function horodatageChift(instant: Date): string {
	return `${instant.toISOString().slice(0, 19)}Z`;
}

/**
 * LES FACTURES TRADUITES, PAR LE CHEMIN D'IMPORT, qui dédoublonne déjà par
 * référence : un logiciel de facturation et la comptabilité qui reprend ses
 * factures peuvent rendre la même deux fois, elle n'entre qu'une.
 *
 * ⚠️ LE SIREN N'ENTRE QUE S'IL PASSE SA CLÉ. Le validateur de l'import l'attend
 * déjà vérifié : un SIREN faux rattacherait la facture au mauvais client, et
 * finirait par interroger le registre sur une entreprise qui n'est pas la sienne.
 */
async function ecrireFactures(
	ctx: ActionCtx,
	organizationId: Id<'organizations'>,
	factures: readonly FactureDepuisConnecteur[],
	aujourdHui: string
): Promise<void> {
	if (factures.length === 0) return;
	await ctx.runMutation(internal.recouvrement.import.enregistrerImport, {
		organizationId,
		// Champ par champ, et pas par décomposition : le validateur de l'import
		// refuse tout champ en trop, et `regleCumule` n'en est pas un.
		factures: factures.map((facture) => ({
			reference: facture.reference,
			debiteur: facture.debiteur,
			...(facture.debiteurSiren !== undefined && estSirenValide(facture.debiteurSiren)
				? { debiteurSiren: facture.debiteurSiren }
				: {}),
			...(facture.debiteurEmail === undefined ? {} : { debiteurEmail: facture.debiteurEmail }),
			montantTTC: facture.montantTTC,
			dateEmission: facture.dateEmission,
			...(facture.dateEcheance === undefined ? {} : { dateEcheance: facture.dateEcheance })
		})),
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

/** Ce qu'une lecture a vu : les factures entrées, et les créances qu'elle n'a pas su lire. */
interface Compte {
	lues: number;
	nonLues: number;
}

function trier(traductions: readonly TraductionChift[], compte: Compte): FactureDepuisConnecteur[] {
	const factures: FactureDepuisConnecteur[] = [];
	for (const traduction of traductions) {
		if (traduction.genre === 'FACTURE') factures.push(traduction.facture);
		else if (traduction.genre === 'ILLISIBLE') compte.nonLues += 1;
	}
	compte.lues += factures.length;
	return factures;
}

/** LA COMPTABILITÉ : les écritures de vente, avec leurs paiements et leur client. */
async function lireComptabilite(
	ctx: ActionCtx,
	config: ConfigChift,
	jeton: string,
	contexte: {
		readonly consommateurId: string;
		readonly connexionDistante: string;
		readonly organizationId: Id<'organizations'>;
		readonly filtreDate: Record<string, string>;
		readonly aujourdHui: string;
	},
	compte: Compte,
	signalerAvancee: () => Promise<void>
): Promise<void> {
	const base = `/consumers/${contexte.consommateurId}/accounting`;
	// Les clients ne sont lus que si une facture arrive sans le sien : la plupart
	// des logiciels le joignent quand on le demande.
	let clients: Map<string, PartenaireChift> | null = null;
	const clientDe = async (facture: FactureComptableChift): Promise<PartenaireChift | undefined> => {
		if (facture.partner || !facture.partner_id) return undefined;
		if (clients === null) {
			const charges = new Map<string, PartenaireChift>();
			await toutesLesPages<PartenaireChift>(
				config,
				jeton,
				`${base}/clients`,
				{},
				contexte.connexionDistante,
				async (elements) => {
					for (const client of elements) if (client.id) charges.set(client.id, client);
				}
			);
			clients = charges;
		}
		return clients.get(facture.partner_id);
	};

	await toutesLesPages<FactureComptableChift>(
		config,
		jeton,
		`${base}/invoices/type/customer_invoice`,
		{ ...contexte.filtreDate, include_payments: 'true', include_partner_info: 'true' },
		contexte.connexionDistante,
		async (elements) => {
			const traductions: TraductionChift[] = [];
			for (const facture of elements) {
				traductions.push(
					factureDepuisChiftComptable(facture, await clientDe(facture), contexte.aujourdHui)
				);
			}
			await ecrireFactures(
				ctx,
				contexte.organizationId,
				trier(traductions, compte),
				contexte.aujourdHui
			);
			await signalerAvancee();
		}
	);
}

/** LA FACTURATION : les factures, leur reste à payer, et les contacts clients. */
async function lireFacturation(
	ctx: ActionCtx,
	config: ConfigChift,
	jeton: string,
	contexte: {
		readonly consommateurId: string;
		readonly connexionDistante: string;
		readonly organizationId: Id<'organizations'>;
		readonly filtreDate: Record<string, string>;
		readonly aujourdHui: string;
	},
	compte: Compte,
	signalerAvancee: () => Promise<void>
): Promise<void> {
	const base = `/consumers/${contexte.consommateurId}/invoicing`;
	// L'API de facturation ne joint pas le client à la facture : on charge les
	// contacts une fois, au premier besoin.
	let contacts: Map<string, ContactChift> | null = null;
	const contactDe = async (facture: FactureFacturationChift): Promise<ContactChift | undefined> => {
		if (!facture.partner_id) return undefined;
		if (contacts === null) {
			const charges = new Map<string, ContactChift>();
			await toutesLesPages<ContactChift>(
				config,
				jeton,
				`${base}/contacts`,
				{ contact_type: 'customer' },
				contexte.connexionDistante,
				async (elements) => {
					for (const contact of elements) charges.set(contact.id, contact);
				}
			);
			contacts = charges;
		}
		return contacts.get(facture.partner_id);
	};

	await toutesLesPages<FactureFacturationChift>(
		config,
		jeton,
		`${base}/invoices`,
		{ ...contexte.filtreDate, invoice_type: 'customer_invoice', include_invoice_lines: 'false' },
		contexte.connexionDistante,
		async (elements) => {
			const traductions: TraductionChift[] = [];
			for (const facture of elements) {
				traductions.push(
					factureDepuisChiftFacturation(facture, await contactDe(facture), contexte.aujourdHui)
				);
			}
			await ecrireFactures(
				ctx,
				contexte.organizationId,
				trier(traductions, compte),
				contexte.aujourdHui
			);
			await signalerAvancee();
		}
	);
}

/**
 * RENDRE L'ADRESSE OÙ LE GÉRANT CHOISIT SON LOGICIEL.
 *
 * Le consommateur est créé au premier geste, puis réutilisé : un établissement
 * n'en a qu'un, et chaque logiciel qu'il branche y ajoute une connexion. Le lien
 * expire en trente minutes : il se fabrique au moment du clic, jamais d'avance.
 */
export const demarrerConnexionChift = authedAction({
	args: {},
	returns: v.string(),
	handler: async (ctx): Promise<string> => {
		const config = configChift();
		if (config === null)
			throw new ConvexError('La connexion des logiciels n’est pas encore activée.');

		const { organizationId, nom } = await ctx.runQuery(
			internal.connexions.chiftDonnees.organisationAdministree,
			{ userId: ctx.user._id }
		);
		const existante = await ctx.runQuery(
			internal.connexions.chiftDonnees.connexionDeLOrganisation,
			{
				organizationId
			}
		);

		const jeton = await jetonChift(config);
		const consommateurId =
			existante?.consommateurId ??
			(
				await appelChift<{ consumerid: string }>(config, jeton, '/consumers', {
					methode: 'POST',
					corps: {
						name: nom,
						internal_reference: organizationId,
						redirect_url: `${config.urlApplication}/app`
					}
				})
			).consumerid;
		const connexionId: Id<'connexionsChift'> = await ctx.runMutation(
			internal.connexions.chiftDonnees.enregistrerConsommateur,
			{ organizationId, consommateurId }
		);

		const lien = await appelChift<{ url: string }>(
			config,
			jeton,
			`/consumers/${consommateurId}/connections`,
			{ methode: 'POST', corps: { apis: APIS_CHIFT, country: PAYS_CHIFT, redirect: true } }
		);

		for (const minutes of VERIFICATIONS_APRES_DEPART_MIN) {
			await ctx.scheduler.runAfter(minutes * 60_000, internal.connexions.chift.synchroniser, {
				connexionId
			});
		}
		return lien.url;
	}
});

/**
 * LIRE LES LOGICIELS BRANCHÉS. D'abord constater lesquels sont actifs ; s'il n'y
 * en a aucun, rendre la main sans rien lire. Sinon, lire chacun depuis le
 * curseur, et l'écrire par le chemin d'import.
 *
 * Le curseur est l'heure de DÉBUT de la lecture réussie : une facture modifiée
 * pendant la lecture sera relue la fois suivante, ce qui ne coûte rien, puisque
 * l'import est idempotent.
 */
export const synchroniser = internalAction({
	args: { connexionId: v.id('connexionsChift') },
	returns: v.null(),
	handler: async (ctx, { connexionId }): Promise<null> => {
		const config = configChift();
		if (config === null) return null;
		const connexion = await ctx.runMutation(internal.connexions.chiftDonnees.commencerSynchro, {
			connexionId
		});
		if (connexion === null) return null;

		const debut = new Date();
		const aujourdHui = debut.toISOString().slice(0, 10);
		try {
			const jeton = await jetonChift(config);
			const distantes = await appelChift<readonly ConnexionChiftDistante[]>(
				config,
				jeton,
				`/consumers/${connexion.consommateurId}/connections`
			);
			const actives = distantes.filter(
				(c) => c.status === 'active' && (APIS_CHIFT as readonly string[]).includes(c.api)
			);
			if (actives.length === 0) {
				await ctx.runMutation(internal.connexions.chiftDonnees.relacherSynchro, { connexionId });
				return null;
			}

			await ctx.runMutation(internal.connexions.chiftDonnees.ouvrirLecture, {
				connexionId,
				logiciels: [...new Set(actives.map((c) => c.integration))]
			});

			const filtreDate: Record<string, string> =
				connexion.curseur === undefined
					? { date_from: debutDePremiereLecture(aujourdHui, PLUS_LONG_DELAI_ANNEES) }
					: { updated_after: connexion.curseur };
			const compte: Compte = { lues: 0, nonLues: 0 };
			const dejaLues = connexion.curseur === undefined ? 0 : (connexion.facturesLues ?? 0);
			const signalerAvancee = async () => {
				await ctx.runMutation(internal.connexions.chiftDonnees.avancerSynchro, {
					connexionId,
					facturesLues: dejaLues + compte.lues
				});
			};

			for (const distante of actives) {
				const contexte = {
					consommateurId: connexion.consommateurId,
					connexionDistante: distante.connectionid,
					organizationId: connexion.organizationId,
					filtreDate,
					aujourdHui
				};
				if (distante.api === 'Accounting') {
					await lireComptabilite(ctx, config, jeton, contexte, compte, signalerAvancee);
				} else {
					await lireFacturation(ctx, config, jeton, contexte, compte, signalerAvancee);
				}
			}

			await ctx.runMutation(internal.connexions.chiftDonnees.terminerSynchro, {
				connexionId,
				curseur: horodatageChift(debut),
				facturesLues: dejaLues + compte.lues,
				facturesNonLues: compte.nonLues
			});
		} catch {
			await ctx.runMutation(internal.connexions.chiftDonnees.marquerConnexion, {
				connexionId,
				statut: 'ECHEC',
				erreur: 'La lecture de votre logiciel a échoué. Elle sera retentée.'
			});
		}
		return null;
	}
});

/** Le rattrapage : toutes les lignes, toutes les six heures. */
export const synchroniserToutes = internalAction({
	args: {},
	returns: v.null(),
	handler: async (ctx): Promise<null> => {
		if (configChift() === null) return null;
		const connexions: Id<'connexionsChift'>[] = await ctx.runQuery(
			internal.connexions.chiftDonnees.connexionsASynchroniser,
			{}
		);
		for (const connexionId of connexions) {
			await ctx.scheduler.runAfter(0, internal.connexions.chift.synchroniser, { connexionId });
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
			internal.connexions.chiftDonnees.organisationDuMembre,
			{ userId: ctx.user._id }
		);
		const connexion = await ctx.runQuery(
			internal.connexions.chiftDonnees.connexionDeLOrganisation,
			{
				organizationId
			}
		);
		if (connexion !== null) {
			await ctx.scheduler.runAfter(0, internal.connexions.chift.synchroniser, {
				connexionId: connexion._id
			});
		}
		return null;
	}
});

/**
 * DÉBRANCHER : le consommateur est supprimé chez Chift, avec les accès qu'il
 * gardait au logiciel du gérant, puis la ligne ici. Les factures déjà lues
 * restent : elles sont à lui, et l'import les a faites siennes.
 */
export const deconnecterChift = authedAction({
	args: {},
	returns: v.null(),
	handler: async (ctx): Promise<null> => {
		const { organizationId } = await ctx.runQuery(
			internal.connexions.chiftDonnees.organisationAdministree,
			{ userId: ctx.user._id }
		);
		const connexion = await ctx.runQuery(
			internal.connexions.chiftDonnees.connexionDeLOrganisation,
			{
				organizationId
			}
		);
		if (connexion === null) return null;
		await ctx.runAction(internal.connexions.chift.oublierConsommateur, {
			consommateurId: connexion.consommateurId
		});
		await ctx.runMutation(internal.connexions.chiftDonnees.supprimerConnexion, {
			connexionId: connexion._id
		});
		return null;
	}
});

/**
 * SUPPRIMER UN CONSOMMATEUR CHEZ CHIFT — au débranchement, et à la purge RGPD
 * d'un établissement : un accès resté chez Chift ouvrirait encore ses factures.
 */
export const oublierConsommateur = internalAction({
	args: { consommateurId: v.string() },
	returns: v.null(),
	handler: async (_ctx, { consommateurId }): Promise<null> => {
		const config = configChift();
		if (config === null) return null;
		const jeton = await jetonChift(config);
		await appelChift<null>(config, jeton, `/consumers/${consommateurId}`, { methode: 'DELETE' });
		return null;
	}
});

/**
 * DÉCLARER LES WEBHOOKS DU COMPTE — une fois, à l'ouverture du compte Chift :
 *
 *     npx convex run connexions/chift:declarerWebhooks
 *
 * Un webhook vaut pour tous les consommateurs du compte. Sans secret de
 * signature, on ne déclare rien : un webhook qu'on ne peut pas authentifier
 * serait ignoré de toute façon.
 */
export const declarerWebhooks = internalAction({
	args: {},
	returns: v.array(v.string()),
	handler: async (): Promise<string[]> => {
		const config = configChift();
		if (config === null || config.secretWebhook === undefined) {
			throw new Error('CHIFT_SECRET_WEBHOOK et la clé Chift doivent être posés d’abord.');
		}
		const jeton = await jetonChift(config);
		const declares: string[] = [];
		for (const evenement of EVENEMENTS_CHIFT) {
			await appelChift(config, jeton, '/webhooks', {
				methode: 'POST',
				corps: { event: evenement, url: config.urlWebhook, signingsecret: config.secretWebhook }
			});
			declares.push(evenement);
		}
		return declares;
	}
});

/**
 * LE WEBHOOK CHIFT. On vérifie la signature, on PLANIFIE une lecture, et on
 * rend la main aussitôt : c'est la lecture qui constate si le logiciel est
 * branché, modifié ou retiré. Rien n'est cru sur parole dans le corps.
 */
export const webhookChift = httpAction(async (ctx, requete) => {
	const config = configChift();
	const corps = await requete.text();
	if (config === null || config.secretWebhook === undefined)
		return new Response(null, { status: 200 });

	const signee = await signatureChiftValide(
		corps,
		requete.headers.get('X-Chift-Signature'),
		config.secretWebhook
	);
	if (!signee) return new Response(null, { status: 401 });

	let evenement: { event?: string; consumerid?: string; accountid?: string };
	try {
		evenement = JSON.parse(corps) as typeof evenement;
	} catch {
		return new Response(null, { status: 400 });
	}
	if (evenement.accountid !== config.accountId || evenement.consumerid === undefined) {
		return new Response(null, { status: 200 });
	}
	if (!(EVENEMENTS_CHIFT as readonly string[]).includes(evenement.event ?? '')) {
		return new Response(null, { status: 200 });
	}

	const connexion = await ctx.runQuery(internal.connexions.chiftDonnees.connexionParConsommateur, {
		consommateurId: evenement.consumerid
	});
	if (connexion !== null) {
		await ctx.scheduler.runAfter(0, internal.connexions.chift.synchroniser, {
			connexionId: connexion._id
		});
	}
	return new Response(null, { status: 200 });
});
