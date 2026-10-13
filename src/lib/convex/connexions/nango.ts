import { v, ConvexError } from 'convex/values';
import { httpAction, internalAction, type ActionCtx } from '../_generated/server';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { authedAction } from '../functions';
import { configNango, type ConfigNango } from './nangoConfig';
import {
	FOURNISSEURS_LUS,
	NOM_DU_FOURNISSEUR,
	creerLecteur,
	preparerLaLecture,
	type AppelNango
} from '../../socle/connecteurs/nango/lecteurs';
import { signatureNangoValide } from '../../socle/connecteurs/nango/signature';
import type { FactureDepuisConnecteur } from '../../socle/connecteurs/facture-connecteur';
import { REGIMES_PRESCRIPTION } from '../../verticales/recouvrement/pays/france/prescription';
import { estSirenValide } from '../../verticales/recouvrement/pays/france/siren';

/**
 * LA CONNEXION NANGO : brancher un logiciel, le lire, le débrancher (13/10/2026).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LE CHEMIN D'UN BRANCHEMENT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *   1. L'écran demande une SESSION (`ouvrirSessionNango`) : un jeton de trente
 *      minutes, qui ne permet que de brancher CE logiciel, et qui porte
 *      l'étiquette de l'établissement (posée ici, côté serveur : le navigateur
 *      ne peut pas la changer).
 *   2. Le navigateur ouvre l'autorisation du logiciel (fenêtre OAuth), ou envoie
 *      la clé que le gérant a collée. Nango garde l'accès, chiffré.
 *   3. Deux chemins rattachent la connexion, et ils convergent : le retour du
 *      navigateur (`confirmerConnexionNango`) et le webhook signé de Nango.
 *      Chacun relit la connexion CHEZ NANGO et vérifie son étiquette avant de
 *      l'enregistrer : un identifiant de connexion seul ne prouve rien.
 *   4. La lecture part (`lire`), par le proxy, page par page, et écrit par le
 *      chemin d'import, qui dédoublonne déjà par référence.
 *
 * ⚠️ AUCUN IDENTIFIANT DU GÉRANT NE PASSE PAR ICI. Notre clé n'a pas la portée
 * `read_credentials` : les jetons restent chez Nango, qui les ajoute lui-même aux
 * requêtes du proxy et les rafraîchit.
 *
 * ⚠️ LECTURE SEULE. Vers le logiciel du gérant, seuls des GET partent ; vers
 * Nango, on n'écrit que ce qui concerne notre propre compte (une session, une
 * suppression de connexion). Aucun mouvement d'argent (ligne rouge n° 2).
 *
 * ⚠️ CHAQUE HANDLER ANNOTE SON TYPE DE RETOUR : ce module se planifie lui-même
 * (`internal.connexions.nango.*`), et sans annotation tout `api` retombe en `any`.
 */

/** Une passe de lecture dure au plus quatre minutes ; la suivante reprend à la page posée. */
const BUDGET_PASSE_MS = 4 * 60 * 1000;

/** Le verrou d'une passe : son budget, et une marge pour la dernière page. */
const VERROU_PASSE_MS = BUDGET_PASSE_MS + 2 * 60 * 1000;

/** Le plus long délai pour agir du registre : une facture soldée plus ancienne ne compte plus. */
const PLUS_LONG_DELAI_ANNEES = Math.max(
	...Object.values(REGIMES_PRESCRIPTION).map((regime) => regime.dureeAnnees)
);

/**
 * LE PREMIER JOUR QUI COMPTE : le 1er janvier de l'année qui précède le plus long
 * délai, par prudence (une facture émise juste avant peut échoir juste après).
 */
function horizonDeLecture(aujourdHui: string): string {
	return `${Number(aujourdHui.slice(0, 4)) - PLUS_LONG_DELAI_ANNEES - 1}-01-01`;
}

/** Ce que Nango a répondu, avec son statut, pour décider si l'accès est perdu. */
class ErreurNango extends Error {
	constructor(
		readonly statut: number,
		message: string
	) {
		super(message);
	}
}

/** Notre clé refusée : rien à réessayer de l'écran, c'est notre compte. */
class CleRefusee extends Error {}

async function appelNango<T>(
	config: ConfigNango,
	methode: 'GET' | 'POST' | 'DELETE',
	chemin: string,
	options: { readonly parametres?: Record<string, string>; readonly corps?: unknown } = {}
): Promise<T> {
	const url = new URL(`${config.hote}${chemin}`);
	for (const [cle, valeur] of Object.entries(options.parametres ?? {}))
		url.searchParams.set(cle, valeur);
	const reponse = await fetch(url, {
		method: methode,
		headers: {
			Authorization: `Bearer ${config.cleSecrete}`,
			...(options.corps === undefined ? {} : { 'Content-Type': 'application/json' })
		},
		...(options.corps === undefined ? {} : { body: JSON.stringify(options.corps) })
	});
	if (reponse.status === 401 || reponse.status === 403) throw new CleRefusee();
	if (!reponse.ok)
		throw new ErreurNango(reponse.status, `Nango a répondu ${reponse.status} sur ${chemin}`);
	return (await reponse.json()) as T;
}

/**
 * LE PROXY : une lecture dans le logiciel du gérant, au nom de sa connexion.
 *
 * Nango ajoute l'authentification du logiciel ; nos en-têtes (`Accept`,
 * `xero-tenant-id`, `If-Modified-Since`) sont relayés tels quels. Trois essais
 * sur un 429 ou un 5xx, avec un recul exponentiel tenu par Nango.
 */
function proxyNango(config: ConfigNango, connectionId: string, integrationId: string): AppelNango {
	return async ({ chemin, parametres, entetes }) => {
		const url = new URL(`${config.hote}/proxy/${chemin.replace(/^\/+/, '')}`);
		for (const [cle, valeur] of Object.entries(parametres ?? {})) url.searchParams.set(cle, valeur);
		const reponse = await fetch(url, {
			method: 'GET',
			headers: {
				...entetes,
				Authorization: `Bearer ${config.cleSecrete}`,
				'Connection-Id': connectionId,
				'Provider-Config-Key': integrationId,
				Retries: '3'
			}
		});
		if (!reponse.ok) {
			throw new ErreurNango(
				reponse.status,
				`Le logiciel a répondu ${reponse.status} sur ${chemin}`
			);
		}
		return (await reponse.json()) as unknown;
	};
}

/**
 * L'ACCÈS EST-IL PERDU ? Un 401 du logiciel (jeton révoqué malgré le
 * rafraîchissement), un 424 de Nango (rafraîchissement épuisé) ou un 404 sur la
 * connexion (supprimée chez Nango) : il faut rebrancher. Le reste se retente.
 */
function accesPerdu(erreur: unknown): boolean {
	return erreur instanceof ErreurNango && [401, 404, 424].includes(erreur.statut);
}

/**
 * LES FACTURES TRADUITES, PAR LE CHEMIN D'IMPORT, qui dédoublonne déjà par
 * référence : la comptabilité et l'outil de facturation qui reprennent les mêmes
 * factures peuvent les rendre deux fois, elles n'entrent qu'une.
 *
 * ⚠️ LE SIREN N'ENTRE QUE S'IL PASSE SA CLÉ : un SIREN faux rattacherait la
 * facture au mauvais client, et ferait interroger le registre sur une autre
 * entreprise.
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
		// Champ par champ : le validateur de l'import refuse tout champ en trop.
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

/**
 * RATTACHER UNE CONNEXION À SON ÉTABLISSEMENT, après l'avoir relue chez Nango.
 *
 * ⚠️ L'ÉTIQUETTE EST LA PREUVE. Elle a été posée par notre serveur à la création
 * de la session, que le navigateur ne peut pas modifier. Une connexion dont
 * l'étiquette nomme un autre établissement est refusée, d'où qu'elle vienne.
 *
 * Ce dont la lecture a besoin (la société QuickBooks, l'organisation Xero ou
 * Zoho) se lit ici, une fois. S'il manque, la connexion s'enregistre quand même,
 * en échec, avec ce qu'il faut faire : un branchement réussi ne doit pas
 * disparaître sans un mot.
 */
async function rattacher(
	ctx: ActionCtx,
	config: ConfigNango,
	demande: {
		readonly organizationId: Id<'organizations'>;
		readonly connectionId: string;
		readonly integrationId: string;
		readonly creePar: string;
	}
): Promise<Id<'connexionsNango'>> {
	const distante = await appelNango<{
		provider?: string;
		connection_config?: Record<string, unknown>;
		tags?: Record<string, string>;
	}>(config, 'GET', `/connections/${encodeURIComponent(demande.connectionId)}`, {
		parametres: { provider_config_key: demande.integrationId }
	});
	if (distante.tags?.organization_id !== demande.organizationId) {
		throw new ConvexError('Cette connexion n’appartient pas à votre établissement.');
	}
	const fournisseur =
		distante.provider === undefined ? undefined : FOURNISSEURS_LUS[distante.provider];
	if (fournisseur === undefined) {
		throw new ConvexError('Ce logiciel n’est pas encore lu par Letikette.');
	}
	let configLecture: Record<string, string> | undefined;
	let erreur: string | undefined;
	try {
		configLecture = await preparerLaLecture(
			fournisseur,
			distante.connection_config ?? {},
			proxyNango(config, demande.connectionId, demande.integrationId)
		);
	} catch (e) {
		erreur =
			e instanceof Error && !(e instanceof ErreurNango)
				? e.message
				: `${NOM_DU_FOURNISSEUR[fournisseur]} n’a pas répondu. Débranchez-le et rebranchez-le.`;
	}
	const id: Id<'connexionsNango'> = await ctx.runMutation(
		internal.connexions.nangoDonnees.enregistrerConnexion,
		{
			organizationId: demande.organizationId,
			connectionId: demande.connectionId,
			integrationId: demande.integrationId,
			fournisseur: distante.provider!,
			nom: NOM_DU_FOURNISSEUR[fournisseur],
			...(configLecture === undefined ? {} : { configLecture }),
			...(erreur === undefined ? {} : { erreur }),
			creePar: demande.creePar
		}
	);
	if (erreur === undefined) await ctx.scheduler.runAfter(0, internal.connexions.nango.lire, { id });
	return id;
}

// ─────────────────────────────────────────────────────────────────────────
// CE QUE L'ÉCRAN APPELLE
// ─────────────────────────────────────────────────────────────────────────

const vLogicielConfigure = v.object({
	integrationId: v.string(),
	fournisseur: v.string(),
	nom: v.string()
});

/**
 * LES LOGICIELS QU'ON PEUT BRANCHER : ceux que le tableau de bord de Nango a
 * configurés ET que nous savons lire. Un logiciel configuré mais que nous ne
 * lisons pas n'est pas proposé : un bouton qui brancherait sans rien lire
 * mentirait.
 */
export const logicielsNango = authedAction({
	args: {},
	returns: v.array(vLogicielConfigure),
	handler: async (ctx): Promise<{ integrationId: string; fournisseur: string; nom: string }[]> => {
		const config = configNango();
		if (config === null) return [];
		await ctx.runQuery(internal.connexions.nangoDonnees.organisationDuMembre, {
			userId: ctx.user._id
		});
		try {
			const { data } = await appelNango<{
				data: readonly { unique_key: string; provider: string }[];
			}>(config, 'GET', '/integrations');
			return data.flatMap((integration) => {
				const fournisseur = FOURNISSEURS_LUS[integration.provider];
				return fournisseur === undefined
					? []
					: [
							{
								integrationId: integration.unique_key,
								fournisseur: integration.provider,
								nom: NOM_DU_FOURNISSEUR[fournisseur]
							}
						];
			});
		} catch {
			throw new ConvexError(
				'Les connexions ne répondent pas pour l’instant. Réessayez dans un instant.'
			);
		}
	}
});

/**
 * OUVRIR UNE SESSION DE CONNEXION pour UN logiciel. Réservé aux administrateurs :
 * brancher un logiciel fait entrer des factures pour tout l'établissement.
 *
 * ⚠️ L'ÉTIQUETTE NE PORTE QUE DES IDENTIFIANTS : l'établissement et le membre,
 * jamais un nom ni une adresse. Le tableau de bord de Nango n'a pas à connaître
 * nos gérants.
 */
export const ouvrirSessionNango = authedAction({
	args: { integrationId: v.string() },
	returns: v.object({ jeton: v.string(), hote: v.string() }),
	handler: async (ctx, { integrationId }): Promise<{ jeton: string; hote: string }> => {
		const config = configNango();
		if (config === null)
			throw new ConvexError('La connexion des logiciels n’est pas encore activée.');
		const organizationId: Id<'organizations'> = await ctx.runQuery(
			internal.connexions.nangoDonnees.organisationAdministree,
			{ userId: ctx.user._id }
		);
		try {
			const { data } = await appelNango<{ data: { token: string } }>(
				config,
				'POST',
				'/connect/sessions',
				{
					corps: {
						tags: { organization_id: organizationId, end_user_id: ctx.user._id },
						allowed_integrations: [integrationId]
					}
				}
			);
			return { jeton: data.token, hote: config.hote };
		} catch {
			throw new ConvexError('La connexion n’a pas pu s’ouvrir. Réessayez dans un instant.');
		}
	}
});

/**
 * LE RETOUR DU NAVIGATEUR après une autorisation réussie : on rattache, puis on lit.
 *
 * `remplace` : la connexion en panne que « Reconnecter » remplace. Une nouvelle
 * autorisation crée une nouvelle connexion chez Nango ; l'ancienne ligne part, et
 * l'accès qu'elle gardait encore chez Nango aussi. Sans cela, la carte en panne
 * resterait à côté de la nouvelle, et Nango garderait un accès que plus rien ne lit.
 */
export const confirmerConnexionNango = authedAction({
	args: {
		connectionId: v.string(),
		integrationId: v.string(),
		remplace: v.optional(v.id('connexionsNango'))
	},
	returns: v.id('connexionsNango'),
	handler: async (
		ctx,
		{ connectionId, integrationId, remplace }
	): Promise<Id<'connexionsNango'>> => {
		const config = configNango();
		if (config === null)
			throw new ConvexError('La connexion des logiciels n’est pas encore activée.');
		const organizationId: Id<'organizations'> = await ctx.runQuery(
			internal.connexions.nangoDonnees.organisationAdministree,
			{ userId: ctx.user._id }
		);
		let id: Id<'connexionsNango'>;
		try {
			id = await rattacher(ctx, config, {
				organizationId,
				connectionId,
				integrationId,
				creePar: ctx.user._id
			});
		} catch (e) {
			if (e instanceof ConvexError) throw e;
			throw new ConvexError('La connexion n’a pas pu être vérifiée. Réessayez dans un instant.');
		}
		if (remplace !== undefined && remplace !== id) {
			const ancienne = await ctx.runQuery(internal.connexions.nangoDonnees.connexion, {
				id: remplace
			});
			// Une ligne d'un autre établissement ne se touche pas, même nommée ici.
			if (ancienne !== null && ancienne.organizationId === organizationId) {
				await ctx.runMutation(internal.connexions.nangoDonnees.retirerConnexion, {
					id: remplace
				});
				if (ancienne.connectionId !== connectionId) {
					await ctx.scheduler.runAfter(0, internal.connexions.nango.oublierConnexion, {
						connectionId: ancienne.connectionId,
						integrationId: ancienne.integrationId
					});
				}
			}
		}
		return id;
	}
});

/** « Synchroniser » : n'importe quel membre peut demander une relecture. */
export const synchroniserNango = authedAction({
	args: { id: v.id('connexionsNango') },
	returns: v.null(),
	handler: async (ctx, { id }): Promise<null> => {
		const organizationId: Id<'organizations'> = await ctx.runQuery(
			internal.connexions.nangoDonnees.organisationDuMembre,
			{ userId: ctx.user._id }
		);
		const ligne = await ctx.runQuery(internal.connexions.nangoDonnees.connexion, { id });
		if (ligne === null || ligne.organizationId !== organizationId) {
			throw new ConvexError('Cette connexion n’existe pas dans votre établissement.');
		}
		await ctx.scheduler.runAfter(0, internal.connexions.nango.lire, { id });
		return null;
	}
});

/**
 * DÉBRANCHER : la connexion est supprimée chez Nango (l'accès qu'il gardait
 * disparaît), puis chez nous. Les factures entrées restent : elles sont au
 * gérant, pas au logiciel. Réservé aux administrateurs.
 */
export const debrancherNango = authedAction({
	args: { id: v.id('connexionsNango') },
	returns: v.null(),
	handler: async (ctx, { id }): Promise<null> => {
		const config = configNango();
		if (config === null)
			throw new ConvexError('La connexion des logiciels n’est pas encore activée.');
		const organizationId: Id<'organizations'> = await ctx.runQuery(
			internal.connexions.nangoDonnees.organisationAdministree,
			{ userId: ctx.user._id }
		);
		const ligne = await ctx.runQuery(internal.connexions.nangoDonnees.connexion, { id });
		if (ligne === null || ligne.organizationId !== organizationId) {
			throw new ConvexError('Cette connexion n’existe pas dans votre établissement.');
		}
		try {
			await appelNango(config, 'DELETE', `/connections/${encodeURIComponent(ligne.connectionId)}`, {
				parametres: { provider_config_key: ligne.integrationId }
			});
		} catch (e) {
			// Déjà absente chez Nango : il ne reste qu'à l'oublier chez nous.
			if (!(e instanceof ErreurNango && e.statut === 404)) {
				throw new ConvexError(`${ligne.nom} n’a pas pu être débranché. Réessayez dans un instant.`);
			}
		}
		await ctx.runMutation(internal.connexions.nangoDonnees.retirerConnexion, { id });
		return null;
	}
});

// ─────────────────────────────────────────────────────────────────────────
// LA LECTURE
// ─────────────────────────────────────────────────────────────────────────

/**
 * UNE PASSE DE LECTURE : des pages, tant que le budget le permet, puis la main
 * à la passe suivante. Chaque page est écrite AVANT que la suivante ne parte, et
 * la page à reprendre est posée en base : une coupure ne perd rien et ne double
 * rien (l'import est idempotent).
 */
export const lire = internalAction({
	args: { id: v.id('connexionsNango') },
	returns: v.null(),
	handler: async (ctx, { id }): Promise<null> => {
		const config = configNango();
		if (config === null) return null;
		const maintenant = Date.now();
		const passe = await ctx.runMutation(internal.connexions.nangoDonnees.debuterLecture, {
			id,
			maintenant,
			dureeDuVerrou: VERROU_PASSE_MS
		});
		if (passe === null) return null;

		const fournisseur = FOURNISSEURS_LUS[passe.fournisseur];
		if (fournisseur === undefined) {
			await ctx.runMutation(internal.connexions.nangoDonnees.noterEchec, {
				id,
				erreur: 'Ce logiciel n’est plus lu par Letikette.',
				revoquee: false
			});
			return null;
		}

		const aujourdHui = new Date(maintenant).toISOString().slice(0, 10);
		let suite = passe.suite;
		let lues = passe.facturesLues;
		let nonLues = passe.facturesNonLues;
		try {
			const lecteur = creerLecteur(fournisseur, {
				appel: proxyNango(config, passe.connectionId, passe.integrationId),
				config: passe.configLecture,
				aujourdHui,
				horizon: horizonDeLecture(aujourdHui),
				depuis: passe.depuis === null ? undefined : new Date(passe.depuis).toISOString()
			});
			do {
				const page = await lecteur.lirePage(suite);
				const factures: FactureDepuisConnecteur[] = [];
				const annulees: string[] = [];
				for (const traduction of page.traductions) {
					if (traduction.genre === 'FACTURE') factures.push(traduction.facture);
					else if (traduction.genre === 'ILLISIBLE') nonLues += 1;
					else if (traduction.genre === 'ANNULEE') annulees.push(traduction.reference);
				}
				await ecrireFactures(ctx, passe.organizationId, factures, aujourdHui);
				lues += factures.length;
				suite = page.suite;
				await ctx.runMutation(internal.connexions.nangoDonnees.noterPage, {
					id,
					suite,
					facturesLues: lues,
					facturesNonLues: nonLues,
					annulees
				});
			} while (suite !== null && Date.now() - maintenant < BUDGET_PASSE_MS);

			await ctx.runMutation(internal.connexions.nangoDonnees.relacherVerrou, { id });
			if (suite !== null) await ctx.scheduler.runAfter(0, internal.connexions.nango.lire, { id });
		} catch (e) {
			const revoquee = accesPerdu(e);
			await ctx.runMutation(internal.connexions.nangoDonnees.noterEchec, {
				id,
				revoquee,
				erreur: revoquee
					? `L’accès à ${passe.nom} n’est plus valable. Rebranchez-le pour reprendre la lecture.`
					: e instanceof Error && !(e instanceof ErreurNango) && !(e instanceof CleRefusee)
						? e.message
						: `La lecture de ${passe.nom} a échoué. Elle sera retentée.`
			});
		}
		return null;
	}
});

/** Le rattrapage : toutes les connexions, toutes les six heures. */
export const lireToutes = internalAction({
	args: {},
	returns: v.null(),
	handler: async (ctx): Promise<null> => {
		if (configNango() === null) return null;
		const connexions: Id<'connexionsNango'>[] = await ctx.runQuery(
			internal.connexions.nangoDonnees.connexionsALire,
			{}
		);
		for (const id of connexions) {
			await ctx.scheduler.runAfter(0, internal.connexions.nango.lire, { id });
		}
		return null;
	}
});

/**
 * SUPPRIMER UNE CONNEXION CHEZ NANGO — à la purge RGPD d'un établissement : la
 * ligne d'ici ne porte aucun jeton, mais Nango garde l'accès au logiciel du
 * gérant tant qu'on ne la supprime pas. Déjà absente : rien à faire.
 */
export const oublierConnexion = internalAction({
	args: { connectionId: v.string(), integrationId: v.string() },
	returns: v.null(),
	handler: async (_ctx, { connectionId, integrationId }): Promise<null> => {
		const config = configNango();
		if (config === null) return null;
		try {
			await appelNango(config, 'DELETE', `/connections/${encodeURIComponent(connectionId)}`, {
				parametres: { provider_config_key: integrationId }
			});
		} catch (e) {
			if (!(e instanceof ErreurNango && e.statut === 404)) throw e;
		}
		return null;
	}
});

/** Le chemin du webhook : la même vérification que celui du navigateur. */
export const rattacherDepuisWebhook = internalAction({
	args: {
		connectionId: v.string(),
		integrationId: v.string(),
		organisation: v.string(),
		creePar: v.string()
	},
	returns: v.null(),
	handler: async (ctx, args): Promise<null> => {
		const config = configNango();
		if (config === null) return null;
		const organizationId: Id<'organizations'> | null = await ctx.runQuery(
			internal.connexions.nangoDonnees.organisationEtiquetee,
			{ identifiant: args.organisation }
		);
		if (organizationId === null) return null;
		await rattacher(ctx, config, {
			organizationId,
			connectionId: args.connectionId,
			integrationId: args.integrationId,
			creePar: args.creePar
		});
		return null;
	}
});

/**
 * LE WEBHOOK DE NANGO (`/nango/webhook`).
 *
 * ⚠️ SIGNÉ OU REFUSÉ. Sans clé de signature posée, rien n'est traité : la lecture
 * périodique et le retour du navigateur suffisent. Avec elle, une signature
 * fausse rend 401.
 *
 * ⚠️ RÉPONDRE VITE : Nango coupe à vingt secondes et ne réessaie que deux fois.
 * Tout travail est planifié, jamais fait ici.
 */
export const webhookNango = httpAction(async (ctx, requete) => {
	const config = configNango();
	const corps = await requete.text();
	if (config === null || config.cleDeSignature === undefined)
		return new Response(null, { status: 200 });

	const signee = await signatureNangoValide(
		corps,
		requete.headers.get('X-Nango-Hmac-Sha256'),
		config.cleDeSignature
	);
	if (!signee) return new Response(null, { status: 401 });

	let evenement: {
		type?: string;
		operation?: string;
		success?: boolean;
		connectionId?: string;
		providerConfigKey?: string;
		tags?: Record<string, string>;
	};
	try {
		evenement = JSON.parse(corps) as typeof evenement;
	} catch {
		return new Response(null, { status: 400 });
	}
	// Nango ajoute des types régulièrement : on ignore ce qu'on ne traite pas.
	if (evenement.type !== 'auth' || typeof evenement.connectionId !== 'string') {
		return new Response(null, { status: 200 });
	}

	if (
		(evenement.operation === 'creation' || evenement.operation === 'override') &&
		evenement.success === true &&
		typeof evenement.providerConfigKey === 'string' &&
		typeof evenement.tags?.organization_id === 'string'
	) {
		await ctx.scheduler.runAfter(0, internal.connexions.nango.rattacherDepuisWebhook, {
			connectionId: evenement.connectionId,
			integrationId: evenement.providerConfigKey,
			organisation: evenement.tags.organization_id,
			creePar: evenement.tags.end_user_id ?? 'nango'
		});
	} else if (evenement.operation === 'refresh') {
		await ctx.runMutation(internal.connexions.nangoDonnees.noterAcces, {
			connectionId: evenement.connectionId,
			etat: evenement.success === true ? 'RENOUVELE' : 'EN_PANNE'
		});
	} else if (evenement.operation === 'deletion') {
		await ctx.runMutation(internal.connexions.nangoDonnees.noterAcces, {
			connectionId: evenement.connectionId,
			etat: 'RETIRE'
		});
	}
	return new Response(null, { status: 200 });
});
