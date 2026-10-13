import type { TraductionConnecteur } from './commun';
import { factureDepuisPennylane, type ClientPennylane, type FacturePennylane } from './pennylane';
import { factureDepuisQuickBooks, type FactureQuickBooks } from './quickbooks';
import {
	factureDepuisSellsy,
	type FactureSellsy,
	type ParticulierSellsy,
	type SocieteSellsy
} from './sellsy';
import { factureDepuisStripe, type FactureStripe } from './stripe';
import { factureDepuisXero, type ContactXero, type FactureXero } from './xero';
import { factureDepuisZoho, type ContactZoho, type FactureZoho } from './zoho';

/**
 * LES LECTEURS — pour chaque logiciel, où lire, comment paginer, et comment
 * retrouver le client d'une facture (13/10/2026).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ TOUT PASSE PAR LE PROXY DE NANGO, ET RIEN NE S'ÉCRIT CHEZ LE GÉRANT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le réseau est INJECTÉ (`AppelNango`) : côté Convex, c'est une requête au proxy
 * de Nango, qui ajoute lui-même les identifiants du gérant et les rafraîchit.
 * Ici, aucune clé, aucun jeton, aucune adresse de Nango : ce module ne sait que
 * les chemins de chaque API, et il se teste avec des réponses enregistrées.
 *
 * Seules des lectures (GET) partent. Aucune écriture dans le logiciel du gérant,
 * aucun mouvement d'argent (ligne rouge n° 2).
 *
 * ⚠️ POURQUOI PAS LES SYNCHRONISATIONS TOUTES FAITES DE NANGO : elles copient les
 * factures dans le cache de Nango (chiffré, gardé trente jours) avant que nous
 * les lisions. Par le proxy, les factures des clients de nos clients ne sont
 * stockées QUE chez nous. Les requêtes ci-dessous reprennent celles de ces
 * synchronisations (dépôt `NangoHQ/integration-templates`), déjà éprouvées sur
 * les vraies API.
 */

/** Les logiciels que nous savons lire. */
export type Fournisseur =
	| 'pennylane'
	| 'quickbooks'
	| 'xero'
	| 'zoho-books'
	| 'zoho-invoice'
	| 'stripe'
	| 'sellsy';

/**
 * LE FOURNISSEUR NANGO (`provider`, celui de `providers.yaml`) → NOTRE LECTEUR.
 *
 * ⚠️ C'EST LE FOURNISSEUR QUI COMPTE, PAS L'IDENTIFIANT DE L'INTÉGRATION : celui-ci
 * se choisit dans le tableau de bord de Nango (« pennylane-prod »…), le
 * fournisseur, lui, est fixé par Nango.
 */
export const FOURNISSEURS_LUS: Readonly<Record<string, Fournisseur>> = {
	pennylane: 'pennylane',
	'pennylane-company-api': 'pennylane',
	quickbooks: 'quickbooks',
	xero: 'xero',
	'zoho-books': 'zoho-books',
	'zoho-invoice': 'zoho-invoice',
	'stripe-api-key': 'stripe',
	sellsy: 'sellsy'
};

/** Le nom que voit le gérant, quel que soit l'identifiant choisi dans le tableau de bord. */
export const NOM_DU_FOURNISSEUR: Readonly<Record<Fournisseur, string>> = {
	pennylane: 'Pennylane',
	quickbooks: 'QuickBooks',
	xero: 'Xero',
	'zoho-books': 'Zoho Books',
	'zoho-invoice': 'Zoho Invoice',
	stripe: 'Stripe',
	sellsy: 'Sellsy'
};

export interface RequeteNango {
	/** Le chemin dans l'API du logiciel, sans la base (que Nango connaît). */
	readonly chemin: string;
	readonly parametres?: Readonly<Record<string, string>>;
	readonly entetes?: Readonly<Record<string, string>>;
}

/** Une lecture par le proxy : rend le corps JSON, ou lève sur un statut d'erreur. */
export type AppelNango = (requete: RequeteNango) => Promise<unknown>;

export interface ContexteLecture {
	readonly appel: AppelNango;
	/** Ce qui identifie le compte du gérant chez le logiciel : `realmId`, `tenant_id`, `organization_id`. */
	readonly config: Readonly<Record<string, string>>;
	readonly aujourdHui: string;
	/** Une facture soldée émise avant ce jour ne compte plus (`horsDeLHorizon`). */
	readonly horizon: string;
	/**
	 * Le début (ISO) de la dernière lecture COMPLÈTE réussie. Les logiciels qui
	 * savent filtrer sur la date de modification (QuickBooks, Xero) ne relisent
	 * que ce qui a changé depuis ; les autres relisent tout, ce que l'import,
	 * idempotent, absorbe sans rien doubler.
	 */
	readonly depuis: string | undefined;
}

/** Une page lue et traduite, et la suite à demander (`null` : c'est fini). */
export interface PageTraduite {
	readonly traductions: readonly TraductionConnecteur[];
	readonly suite: string | null;
}

export interface Lecteur {
	/** `suite` : `null` pour la première page, sinon ce que la page précédente a rendu. */
	lirePage(suite: string | null): Promise<PageTraduite>;
}

/** Plafond de pages par liste de clients : au-delà, la lecture s'arrête en le disant. */
const PLAFOND_PAGES_CLIENTS = 200;

/** La réponse attendue n'est pas là : on lève en le nommant, plutôt que de lire du vide. */
class ReponseInattendue extends Error {}

function objet(valeur: unknown, ou: string): Record<string, unknown> {
	if (typeof valeur !== 'object' || valeur === null || Array.isArray(valeur)) {
		throw new ReponseInattendue(`Réponse inattendue de ${ou}`);
	}
	return valeur as Record<string, unknown>;
}

function liste<T>(corps: Record<string, unknown>, cle: string, ou: string): readonly T[] {
	const valeur = corps[cle];
	if (valeur === undefined || valeur === null) return [];
	if (!Array.isArray(valeur)) throw new ReponseInattendue(`Réponse inattendue de ${ou} (${cle})`);
	return valeur as T[];
}

function exiger(config: Readonly<Record<string, string>>, cle: string, logiciel: string): string {
	const valeur = config[cle];
	if (!valeur) {
		throw new Error(
			`La connexion ${logiciel} ne dit pas quel compte lire (${cle}). Débranchez-la et rebranchez-la.`
		);
	}
	return valeur;
}

/** Charge une liste paginée entière dans une table, au premier besoin, une fois par lecture. */
function memoire<T>(
	charger: () => Promise<ReadonlyMap<string, T>>
): () => Promise<ReadonlyMap<string, T>> {
	let promesse: Promise<ReadonlyMap<string, T>> | null = null;
	return () => {
		promesse ??= charger();
		return promesse;
	};
}

// ─────────────────────────────────────────────────────────────────────────
// PENNYLANE — pagination par curseur (`cursor`, `next_cursor`, `has_more`)
// ─────────────────────────────────────────────────────────────────────────

function lecteurPennylane(contexte: ContexteLecture): Lecteur {
	const base = '/api/external/v2';
	const clients = memoire(async () => {
		const table = new Map<string, ClientPennylane>();
		let curseur: string | null = null;
		for (let page = 0; page < PLAFOND_PAGES_CLIENTS; page++) {
			const corps = objet(
				await contexte.appel({
					chemin: `${base}/customers`,
					parametres: { limit: '100', ...(curseur === null ? {} : { cursor: curseur }) }
				}),
				'Pennylane'
			);
			for (const client of liste<ClientPennylane>(corps, 'items', 'Pennylane')) {
				table.set(String(client.id), client);
			}
			curseur =
				corps.has_more === true && typeof corps.next_cursor === 'string' ? corps.next_cursor : null;
			if (curseur === null) return table;
		}
		throw new Error(`Plus de ${PLAFOND_PAGES_CLIENTS * 100} clients dans Pennylane`);
	});

	return {
		async lirePage(suite) {
			const corps = objet(
				await contexte.appel({
					chemin: `${base}/customer_invoices`,
					parametres: { limit: '100', sort: 'id', ...(suite === null ? {} : { cursor: suite }) }
				}),
				'Pennylane'
			);
			const table = await clients();
			const traductions = liste<FacturePennylane>(corps, 'items', 'Pennylane').map((facture) =>
				factureDepuisPennylane(
					facture,
					facture.customer ? table.get(String(facture.customer.id)) : undefined,
					contexte
				)
			);
			const suivante =
				corps.has_more === true && typeof corps.next_cursor === 'string' ? corps.next_cursor : null;
			return { traductions, suite: suivante };
		}
	};
}

// ─────────────────────────────────────────────────────────────────────────
// QUICKBOOKS — une requête « SELECT », paginée par STARTPOSITION
// ─────────────────────────────────────────────────────────────────────────

const PAGE_QUICKBOOKS = 100;

/** Le jour précédent : QuickBooks compare `LastUpdatedTime` à une date, on relit large. */
function veille(iso: string): string {
	const jour = new Date(iso);
	jour.setUTCDate(jour.getUTCDate() - 1);
	return jour.toISOString().slice(0, 10);
}

function lecteurQuickBooks(contexte: ContexteLecture): Lecteur {
	const realmId = exiger(contexte.config, 'realmId', 'QuickBooks');
	const societe = `/v3/company/${encodeURIComponent(realmId)}`;
	const entetes = { Accept: 'application/json' };
	const devise = memoire(async () => {
		const corps = objet(
			await contexte.appel({ chemin: `${societe}/preferences`, entetes }),
			'QuickBooks'
		);
		const preferences = objet(corps.Preferences ?? {}, 'QuickBooks');
		const devises = objet(preferences.CurrencyPrefs ?? {}, 'QuickBooks');
		const maison = objet(devises.HomeCurrency ?? {}, 'QuickBooks');
		const valeur = typeof maison.value === 'string' ? maison.value : undefined;
		return new Map(valeur === undefined ? [] : [['devise', valeur]]);
	});

	return {
		async lirePage(suite) {
			const debut = suite === null ? 1 : Number(suite);
			const filtre =
				contexte.depuis === undefined
					? ''
					: ` WHERE MetaData.LastUpdatedTime >= '${veille(contexte.depuis)}'`;
			const corps = objet(
				await contexte.appel({
					chemin: `${societe}/query`,
					parametres: {
						query: `SELECT * FROM Invoice${filtre} STARTPOSITION ${debut} MAXRESULTS ${PAGE_QUICKBOOKS}`
					},
					entetes
				}),
				'QuickBooks'
			);
			const reponse = objet(corps.QueryResponse ?? {}, 'QuickBooks');
			const factures = liste<FactureQuickBooks>(reponse, 'Invoice', 'QuickBooks');
			const deviseDeLaSociete = (await devise()).get('devise');
			return {
				traductions: factures.map((facture) =>
					factureDepuisQuickBooks(facture, { ...contexte, deviseDeLaSociete })
				),
				suite: factures.length < PAGE_QUICKBOOKS ? null : String(debut + PAGE_QUICKBOOKS)
			};
		}
	};
}

// ─────────────────────────────────────────────────────────────────────────
// XERO — `page` et `pageSize`, l'organisation dans l'en-tête `xero-tenant-id`
// ─────────────────────────────────────────────────────────────────────────

const PAGE_XERO = 100;

function lecteurXero(contexte: ContexteLecture): Lecteur {
	const entetes = {
		'xero-tenant-id': exiger(contexte.config, 'tenant_id', 'Xero'),
		Accept: 'application/json'
	};
	const contacts = memoire(async () => {
		const table = new Map<string, ContactXero>();
		for (let page = 1; page <= PLAFOND_PAGES_CLIENTS; page++) {
			const corps = objet(
				await contexte.appel({
					chemin: 'api.xro/2.0/Contacts',
					parametres: { page: String(page), pageSize: String(PAGE_XERO) },
					entetes
				}),
				'Xero'
			);
			const lus = liste<ContactXero>(corps, 'Contacts', 'Xero');
			for (const contact of lus) table.set(contact.ContactID, contact);
			if (lus.length < PAGE_XERO) return table;
		}
		throw new Error(`Plus de ${PLAFOND_PAGES_CLIENTS * PAGE_XERO} contacts dans Xero`);
	});

	return {
		async lirePage(suite) {
			const page = suite === null ? 1 : Number(suite);
			const corps = objet(
				await contexte.appel({
					chemin: 'api.xro/2.0/Invoices',
					parametres: { page: String(page), pageSize: String(PAGE_XERO) },
					entetes:
						contexte.depuis === undefined
							? entetes
							: // Xero attend un horodatage UTC sans millisecondes.
								{ ...entetes, 'If-Modified-Since': contexte.depuis.replace(/\.\d{3}Z$/, '') }
				}),
				'Xero'
			);
			const factures = liste<FactureXero>(corps, 'Invoices', 'Xero');
			const table = await contacts();
			return {
				traductions: factures.map((facture) =>
					factureDepuisXero(
						facture,
						facture.Contact?.ContactID ? table.get(facture.Contact.ContactID) : undefined,
						contexte
					)
				),
				suite: factures.length < PAGE_XERO ? null : String(page + 1)
			};
		}
	};
}

// ─────────────────────────────────────────────────────────────────────────
// ZOHO BOOKS / ZOHO INVOICE — `page`, `per_page`, et `page_context.has_more_page`
// ─────────────────────────────────────────────────────────────────────────

const PAGE_ZOHO = 200;

/** Zoho répond 200 avec `code` différent de 0 quand il refuse : c'est une erreur. */
function enveloppeZoho(corps: Record<string, unknown>, logiciel: string): void {
	if (corps.code !== undefined && corps.code !== 0) {
		throw new Error(
			`${logiciel} a refusé la lecture (code ${String(corps.code)}${typeof corps.message === 'string' ? ` : ${corps.message}` : ''})`
		);
	}
}

function pageSuivanteZoho(corps: Record<string, unknown>): boolean {
	const contexte = corps.page_context;
	return (
		typeof contexte === 'object' &&
		contexte !== null &&
		(contexte as { has_more_page?: unknown }).has_more_page === true
	);
}

function lecteurZoho(contexte: ContexteLecture, edition: 'books' | 'invoice'): Lecteur {
	const logiciel = edition === 'books' ? 'Zoho Books' : 'Zoho Invoice';
	const base = edition === 'books' ? '/books/v3' : '/invoice/v3';
	const organisation = exiger(contexte.config, 'organization_id', logiciel);
	const contacts = memoire(async () => {
		const table = new Map<string, ContactZoho>();
		for (let page = 1; page <= PLAFOND_PAGES_CLIENTS; page++) {
			const corps = objet(
				await contexte.appel({
					chemin: `${base}/contacts`,
					parametres: {
						organization_id: organisation,
						page: String(page),
						per_page: String(PAGE_ZOHO)
					}
				}),
				logiciel
			);
			enveloppeZoho(corps, logiciel);
			for (const contact of liste<ContactZoho>(corps, 'contacts', logiciel)) {
				table.set(String(contact.contact_id), contact);
			}
			if (!pageSuivanteZoho(corps)) return table;
		}
		throw new Error(`Plus de ${PLAFOND_PAGES_CLIENTS * PAGE_ZOHO} contacts dans ${logiciel}`);
	});

	return {
		async lirePage(suite) {
			const page = suite === null ? 1 : Number(suite);
			const corps = objet(
				await contexte.appel({
					chemin: `${base}/invoices`,
					parametres: {
						organization_id: organisation,
						page: String(page),
						per_page: String(PAGE_ZOHO),
						sort_column: 'created_time',
						sort_order: 'A'
					}
				}),
				logiciel
			);
			enveloppeZoho(corps, logiciel);
			const table = await contacts();
			return {
				traductions: liste<FactureZoho>(corps, 'invoices', logiciel).map((facture) =>
					factureDepuisZoho(
						facture,
						facture.customer_id === undefined || facture.customer_id === null
							? undefined
							: table.get(String(facture.customer_id)),
						contexte
					)
				),
				suite: pageSuivanteZoho(corps) ? String(page + 1) : null
			};
		}
	};
}

// ─────────────────────────────────────────────────────────────────────────
// STRIPE — `limit`, `starting_after` (l'identifiant du dernier lu), `has_more`
// ─────────────────────────────────────────────────────────────────────────

function lecteurStripe(contexte: ContexteLecture): Lecteur {
	return {
		async lirePage(suite) {
			const corps = objet(
				await contexte.appel({
					chemin: '/v1/invoices',
					parametres: { limit: '100', ...(suite === null ? {} : { starting_after: suite }) }
				}),
				'Stripe'
			);
			const factures = liste<FactureStripe>(corps, 'data', 'Stripe');
			const derniere = factures[factures.length - 1];
			return {
				traductions: factures.map((facture) => factureDepuisStripe(facture, contexte)),
				suite: corps.has_more === true && derniere !== undefined ? derniere.id : null
			};
		}
	};
}

// ─────────────────────────────────────────────────────────────────────────
// SELLSY — `limit` (100 au plus) et `offset` numérique, `pagination.total`
// ─────────────────────────────────────────────────────────────────────────

const PAGE_SELLSY = 100;

function totalSellsy(corps: Record<string, unknown>): number {
	const pagination = corps.pagination;
	const total =
		typeof pagination === 'object' && pagination !== null
			? (pagination as { total?: unknown }).total
			: undefined;
	return typeof total === 'number' ? total : 0;
}

function tableSellsy<T extends { readonly id: number }>(
	contexte: ContexteLecture,
	chemin: string
): () => Promise<ReadonlyMap<string, T>> {
	return memoire(async () => {
		const table = new Map<string, T>();
		for (let page = 0; page < PLAFOND_PAGES_CLIENTS; page++) {
			const corps = objet(
				await contexte.appel({
					chemin,
					parametres: { limit: String(PAGE_SELLSY), offset: String(page * PAGE_SELLSY) }
				}),
				'Sellsy'
			);
			const lus = liste<T>(corps, 'data', 'Sellsy');
			for (const element of lus) table.set(String(element.id), element);
			if (lus.length < PAGE_SELLSY || (page + 1) * PAGE_SELLSY >= totalSellsy(corps)) return table;
		}
		throw new Error(
			`Plus de ${PLAFOND_PAGES_CLIENTS * PAGE_SELLSY} fiches dans Sellsy (${chemin})`
		);
	});
}

function lecteurSellsy(contexte: ContexteLecture): Lecteur {
	const societes = tableSellsy<SocieteSellsy>(contexte, '/v2/companies');
	const particuliers = tableSellsy<ParticulierSellsy>(contexte, '/v2/individuals');
	return {
		async lirePage(suite) {
			const decalage = suite === null ? 0 : Number(suite);
			const corps = objet(
				await contexte.appel({
					chemin: '/v2/invoices',
					parametres: {
						limit: String(PAGE_SELLSY),
						offset: String(decalage),
						order: 'id',
						direction: 'asc'
					}
				}),
				'Sellsy'
			);
			const factures = liste<FactureSellsy>(corps, 'data', 'Sellsy');
			const traductions: TraductionConnecteur[] = [];
			for (const facture of factures) {
				const lien = (facture.related ?? []).find(
					(objetLie) => objetLie.type === 'company' || objetLie.type === 'individual'
				);
				let client: Parameters<typeof factureDepuisSellsy>[1];
				if (lien?.type === 'company') {
					const societe = (await societes()).get(String(lien.id));
					client = societe === undefined ? undefined : { genre: 'SOCIETE', societe };
				} else if (lien?.type === 'individual') {
					const particulier = (await particuliers()).get(String(lien.id));
					client = particulier === undefined ? undefined : { genre: 'PARTICULIER', particulier };
				}
				traductions.push(factureDepuisSellsy(facture, client, contexte));
			}
			const suivant = decalage + factures.length;
			return {
				traductions,
				suite:
					factures.length < PAGE_SELLSY || suivant >= totalSellsy(corps) ? null : String(suivant)
			};
		}
	};
}

export function creerLecteur(fournisseur: Fournisseur, contexte: ContexteLecture): Lecteur {
	switch (fournisseur) {
		case 'pennylane':
			return lecteurPennylane(contexte);
		case 'quickbooks':
			return lecteurQuickBooks(contexte);
		case 'xero':
			return lecteurXero(contexte);
		case 'zoho-books':
			return lecteurZoho(contexte, 'books');
		case 'zoho-invoice':
			return lecteurZoho(contexte, 'invoice');
		case 'stripe':
			return lecteurStripe(contexte);
		case 'sellsy':
			return lecteurSellsy(contexte);
	}
}

/**
 * CE QUE LA LECTURE A BESOIN DE SAVOIR DU COMPTE, une fois, à la connexion.
 *
 * QuickBooks et Xero le reçoivent de Nango dans la configuration de la
 * connexion (`realmId` au retour de l'autorisation, `tenant_id` posé par Nango
 * après la connexion). Zoho, lui, ne le dit pas : on lit ses organisations et on
 * retient celle qu'il marque par défaut. Plusieurs organisations sans défaut :
 * on ne choisit pas à la place du gérant, on lève en le disant.
 */
export async function preparerLaLecture(
	fournisseur: Fournisseur,
	configDeLaConnexion: Readonly<Record<string, unknown>>,
	appel: AppelNango
): Promise<Record<string, string>> {
	const texte = (cle: string) => {
		const valeur = configDeLaConnexion[cle];
		return typeof valeur === 'string' && valeur !== ''
			? valeur
			: typeof valeur === 'number'
				? String(valeur)
				: undefined;
	};
	switch (fournisseur) {
		case 'quickbooks': {
			const realmId = texte('realmId');
			if (realmId === undefined) {
				throw new Error('QuickBooks n’a pas dit quelle société lire. Rebranchez QuickBooks.');
			}
			return { realmId };
		}
		case 'xero': {
			const tenant = texte('tenant_id');
			if (tenant === undefined) {
				throw new Error(
					'Xero n’a pas dit quelle organisation lire (plusieurs organisations, ou aucune). Rebranchez Xero en n’en choisissant qu’une.'
				);
			}
			return { tenant_id: tenant };
		}
		case 'zoho-books':
		case 'zoho-invoice': {
			const logiciel = fournisseur === 'zoho-books' ? 'Zoho Books' : 'Zoho Invoice';
			const corps = objet(
				await appel({
					chemin:
						fournisseur === 'zoho-books' ? '/books/v3/organizations' : '/invoice/v3/organizations'
				}),
				logiciel
			);
			enveloppeZoho(corps, logiciel);
			const organisations = liste<{ organization_id?: string | number; is_default_org?: boolean }>(
				corps,
				'organizations',
				logiciel
			);
			const retenue =
				organisations.length === 1
					? organisations[0]
					: organisations.find((organisation) => organisation.is_default_org === true);
			if (retenue?.organization_id === undefined) {
				throw new Error(
					`${logiciel} porte plusieurs organisations et aucune n’est marquée par défaut : choisissez-en une par défaut dans ${logiciel}, puis rebranchez-le.`
				);
			}
			return { organization_id: String(retenue.organization_id) };
		}
		case 'pennylane':
		case 'stripe':
		case 'sellsy':
			return {};
	}
}
