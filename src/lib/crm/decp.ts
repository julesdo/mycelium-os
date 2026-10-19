import { jourDeParis } from '../admin/dates';
import { PARAMETRES } from '../verticales/recouvrement/parametres';
import { ZONES, type CleZone, type EntrepriseTrouvee } from './annuaire';
import type { ProspectImporte } from './import';

/**
 * LES FOURNISSEURS PUBLICS, TROUVÉS DANS LES DONNÉES DE LA COMMANDE PUBLIQUE
 * (19/10/2026, audit stratégique, lot 5).
 *
 * L'API tabulaire de data.gouv.fr sert les « données essentielles de la commande
 * publique » consolidées (DECP) : gratuite, sans clé, à jour chaque matin, Licence
 * Ouverte. On y cherche les PME titulaires de marchés d'hôpitaux ou de collectivités
 * dans une zone ; l'équipe coche, rien n'entre avant « Ajouter ».
 *
 * Ce que ces données sont, et ne sont pas (relevé du 19/10/2026,
 * `docs/superpowers/recherches/2026-10-19-audit/recherche-decp.json`) :
 * - une ligne est UNE VERSION d'un marché pour UN titulaire : les cotitulaires et les
 *   avenants recopient le montant. On ne lit que l'attribution initiale
 *   (`modification_id = 0`), et on compte chaque `uid` une fois ;
 * - le montant est un PLAFOND attribué, forfaitaire ou maximum estimé, souvent
 *   pluriannuel : ni facturé, ni payé (`crm/estimation.ts` en fait un majorant) ;
 * - les valeurs ne sont pas normalisées (« SIRET », « Siret », « siret ») ;
 * - un entrepreneur qui n'a pas consenti à la diffusion apparaît sous la mention
 *   « [Données personnelles non-diffusibles] » : il est écarté ;
 * - le lien « page suivante » de l'API porte des accents non encodés : la pagination
 *   se reconstruit ici, jamais en suivant ce lien ;
 * - le département est celui de l'établissement titulaire, pas du siège : le siège se
 *   vérifie à l'annuaire au moment d'ajouter (`admin/decp.ts`).
 */

export const DECP_RESSOURCE =
	'https://tabular-api.data.gouv.fr/api/resources/22847056-61df-452d-837d-8b8ceadbfc52';

/** Deux cents lignes par page : le plafond mesuré de l'API. */
const PAR_PAGE = 200;

export const CATEGORIE_HOPITAL = 'Établissement hospitalier';
export const CATEGORIES_COLLECTIVITES = [
	'Commune',
	'Département',
	'Département outre-mer',
	'Région',
	'Groupement de communes',
	'Syndicat mixte'
] as const;

export type CleAcheteurs = 'HOPITAUX' | 'COLLECTIVITES';

export const ACHETEURS: Readonly<
	Record<
		CleAcheteurs,
		{ readonly libelle: string; readonly detail: string; readonly categories: readonly string[] }
	>
> = {
	HOPITAUX: {
		libelle: 'Fournisseurs d’hôpitaux',
		detail: 'Établissements publics de santé',
		categories: [CATEGORIE_HOPITAL]
	},
	COLLECTIVITES: {
		libelle: 'Fournisseurs de collectivités',
		detail: 'Communes, départements, régions, groupements',
		categories: CATEGORIES_COLLECTIVITES
	}
};
export const CLES_ACHETEURS = Object.keys(ACHETEURS) as CleAcheteurs[];

export type GenreAcheteur = 'HOPITAL' | 'COLLECTIVITE' | 'AUTRE';

/** Un hôpital, une collectivité, ou un autre acheteur public (État, établissement public). */
export function genreDAcheteur(categorie: string | undefined): GenreAcheteur {
	if (categorie === CATEGORIE_HOPITAL) return 'HOPITAL';
	if (
		categorie !== undefined &&
		(CATEGORIES_COLLECTIVITES as readonly string[]).includes(categorie)
	)
		return 'COLLECTIVITE';
	return 'AUTRE';
}

/**
 * Le 1er janvier de l'année la plus ancienne dont les droits peuvent encore se réclamer,
 * d'après la lecture de la loi (`PARAMETRES.delaiPrescriptionQuadriennale`).
 */
export function anneeDeDepart(jour: string): string {
	const duree = Number(PARAMETRES.delaiPrescriptionQuadriennale.valeur);
	return `${Number(jour.slice(0, 4)) - duree}-01-01`;
}

const COLONNES = [
	'uid',
	'acheteur_id',
	'acheteur_nom',
	'acheteur_categorie',
	'titulaire_id',
	'titulaire_typeIdentifiant',
	'titulaire_nom',
	'titulaire_departement_code',
	'montant',
	'montant_rationalise',
	'dateNotification',
	'dureeMois'
].join(',');

/** Une page de la recherche par zone : les plus récents d'abord. */
export function adresseDecpDeLaZone({
	acheteurs,
	zone,
	jour,
	page
}: {
	readonly acheteurs: CleAcheteurs;
	readonly zone: CleZone;
	readonly jour: string;
	readonly page: number;
}): string {
	const p = new URLSearchParams();
	p.set('acheteur_categorie__in', ACHETEURS[acheteurs].categories.join(','));
	p.set('titulaire_categorie__exact', 'PME');
	p.set('titulaire_departement_code__in', ZONES[zone].departements.join(','));
	p.set('modification_id__exact', '0');
	p.set('dateNotification__greater', anneeDeDepart(jour));
	p.set('dateNotification__sort', 'desc');
	p.set('columns', COLONNES);
	p.set('page', String(Math.max(1, Math.trunc(page) || 1)));
	p.set('page_size', String(PAR_PAGE));
	return `${DECP_RESSOURCE}/data/?${p.toString()}`;
}

/** Tous les marchés d'un titulaire, en un export : ses SIRET vont du SIREN + 00000 au SIREN + 99999. */
export function adresseDecpDuTitulaire({
	siren,
	jour
}: {
	readonly siren: string;
	readonly jour: string;
}): string {
	const p = new URLSearchParams();
	p.set('titulaire_id__greater', `${siren}00000`);
	p.set('titulaire_id__less', `${siren}99999`);
	p.set('modification_id__exact', '0');
	p.set('dateNotification__greater', anneeDeDepart(jour));
	p.set('columns', COLONNES);
	return `${DECP_RESSOURCE}/data/json/?${p.toString()}`;
}

export interface LigneDecp {
	readonly uid: string;
	readonly acheteurId: string;
	readonly acheteurNom: string;
	readonly genre: GenreAcheteur;
	readonly titulaireSiret: string;
	readonly titulaireNom: string;
	readonly titulaireDepartement?: string;
	/** Le plafond attribué, en centimes. */
	readonly montantCentimes: bigint;
	readonly dateNotification: string;
	/** Absente ou nulle dans les données : `undefined`, et l'estimation le dit. */
	readonly dureeMois?: number;
}

export type LectureDeLigne =
	| { readonly ok: true; readonly ligne: LigneDecp }
	| { readonly ok: false; readonly raison: 'NON_DIFFUSIBLE' | 'SANS_SIRET' | 'ILLISIBLE' };

function texte(valeur: unknown): string | undefined {
	if (typeof valeur === 'number') return String(valeur);
	if (typeof valeur !== 'string') return undefined;
	const net = valeur.trim();
	return net === '' ? undefined : net;
}

/** Un jour qui existe au calendrier : `Date.parse` ferait glisser un 30 février au 2 mars. */
function jourValide(valeur: string | undefined): valeur is string {
	if (valeur === undefined || !/^\d{4}-\d{2}-\d{2}$/.test(valeur)) return false;
	const [a, m, j] = valeur.split('-').map(Number) as [number, number, number];
	const d = new Date(Date.UTC(a, m - 1, j));
	return d.getUTCFullYear() === a && d.getUTCMonth() === m - 1 && d.getUTCDate() === j;
}

function enCentimes(valeur: unknown): bigint | null {
	const n = typeof valeur === 'string' ? Number(valeur.replace(',', '.')) : valeur;
	if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) return null;
	return BigInt(Math.round(n * 100));
}

/** Une ligne de l'API, lue sans rien croire. */
export function lireLigneDecp(brute: unknown): LectureDeLigne {
	if (typeof brute !== 'object' || brute === null) return { ok: false, raison: 'ILLISIBLE' };
	const l = brute as Record<string, unknown>;
	const nom = texte(l.titulaire_nom);
	if (nom !== undefined && /non[- ]diffusible/i.test(nom))
		return { ok: false, raison: 'NON_DIFFUSIBLE' };
	const siret = texte(l.titulaire_id);
	if (
		texte(l.titulaire_typeIdentifiant)?.toLowerCase() !== 'siret' ||
		!/^\d{14}$/.test(siret ?? '')
	)
		return { ok: false, raison: 'SANS_SIRET' };
	const uid = texte(l.uid);
	const acheteurId = texte(l.acheteur_id);
	const date = texte(l.dateNotification);
	const montant = enCentimes(l.montant_rationalise ?? l.montant);
	if (uid === undefined || acheteurId === undefined || nom === undefined || montant === null)
		return { ok: false, raison: 'ILLISIBLE' };
	if (!jourValide(date)) return { ok: false, raison: 'ILLISIBLE' };
	const duree =
		typeof l.dureeMois === 'number' && l.dureeMois >= 1 ? Math.round(l.dureeMois) : undefined;
	const departement = texte(l.titulaire_departement_code);
	const categorie = texte(l.acheteur_categorie);
	return {
		ok: true,
		ligne: {
			uid,
			acheteurId,
			acheteurNom: texte(l.acheteur_nom) ?? acheteurId,
			genre: genreDAcheteur(categorie),
			titulaireSiret: siret as string,
			titulaireNom: nom,
			...(departement === undefined ? {} : { titulaireDepartement: departement }),
			montantCentimes: montant,
			dateNotification: date,
			...(duree === undefined ? {} : { dureeMois: duree })
		}
	};
}

function lireLignes(brutes: readonly unknown[]): { lignes: LigneDecp[]; nonDiffusibles: number } {
	let nonDiffusibles = 0;
	const lignes = brutes.flatMap((b) => {
		const lue = lireLigneDecp(b);
		if (lue.ok) return [lue.ligne];
		if (lue.raison === 'NON_DIFFUSIBLE') nonDiffusibles += 1;
		return [];
	});
	return { lignes, nonDiffusibles };
}

export interface PageDecp {
	readonly total: number;
	readonly pages: number;
	readonly lignes: LigneDecp[];
	readonly nonDiffusibles: number;
}

/** Une page de `/data/` ; une réponse qui n'a pas sa forme lève, en le disant. */
export function lirePageDecp(json: unknown): PageDecp {
	const r = json as { readonly data?: unknown; readonly meta?: { readonly total?: unknown } };
	if (
		typeof r !== 'object' ||
		r === null ||
		!Array.isArray(r.data) ||
		typeof r.meta?.total !== 'number'
	)
		throw new Error('Les données de la commande publique ont rendu une réponse inattendue.');
	const total = r.meta.total;
	return { total, pages: Math.max(1, Math.ceil(total / PAR_PAGE)), ...lireLignes(r.data) };
}

/** Un export de `/data/json/`, qui est un tableau. */
export function lireExportDecp(json: unknown): { lignes: LigneDecp[]; nonDiffusibles: number } {
	if (!Array.isArray(json))
		throw new Error('Les données de la commande publique ont rendu une réponse inattendue.');
	return lireLignes(json);
}

/** Chaque marché une fois : les avenants et les cotitulaires le recopient. */
export function dedoublonner(lignes: readonly LigneDecp[]): LigneDecp[] {
	const vus = new Set<string>();
	return lignes.filter((l) => {
		if (vus.has(l.uid)) return false;
		vus.add(l.uid);
		return true;
	});
}

export interface TitulaireDecp {
	readonly siren: string;
	readonly siret: string;
	readonly nom: string;
	readonly departement?: string;
	readonly marches: number;
	readonly nombreDAcheteurs: number;
	/** Les trois acheteurs aux plafonds les plus hauts. */
	readonly acheteurs: readonly string[];
	/** La somme des plafonds attribués : un ordre de grandeur, jamais un chiffre d'affaires. */
	readonly plafondCentimes: bigint;
	readonly dernierMarche: string;
}

/** Les titulaires des lignes, par SIREN, les plafonds cumulés les plus hauts d'abord. */
export function regrouperParTitulaire(lignes: readonly LigneDecp[]): TitulaireDecp[] {
	const parSiren = new Map<string, LigneDecp[]>();
	for (const l of dedoublonner(lignes)) {
		const siren = l.titulaireSiret.slice(0, 9);
		parSiren.set(siren, [...(parSiren.get(siren) ?? []), l]);
	}
	return [...parSiren.entries()]
		.map(([siren, ls]) => {
			const parAcheteur = new Map<string, bigint>();
			for (const l of ls)
				parAcheteur.set(l.acheteurNom, (parAcheteur.get(l.acheteurNom) ?? 0n) + l.montantCentimes);
			const recente = ls.reduce((a, b) => (b.dateNotification > a.dateNotification ? b : a));
			return {
				siren,
				siret: recente.titulaireSiret,
				nom: recente.titulaireNom,
				...(recente.titulaireDepartement === undefined
					? {}
					: { departement: recente.titulaireDepartement }),
				marches: ls.length,
				nombreDAcheteurs: parAcheteur.size,
				acheteurs: [...parAcheteur.entries()]
					.sort((a, b) => (b[1] > a[1] ? 1 : b[1] < a[1] ? -1 : 0))
					.slice(0, 3)
					.map(([nom]) => nom),
				plafondCentimes: ls.reduce((s, l) => s + l.montantCentimes, 0n),
				dernierMarche: recente.dateNotification
			};
		})
		.sort((a, b) =>
			b.plafondCentimes > a.plafondCentimes ? 1 : b.plafondCentimes < a.plafondCentimes ? -1 : 0
		);
}

/** « 19/10/2026 », le jour qu'il est à Paris. */
function dateDuJour(instant: number): string {
	const [annee, mois, jour] = jourDeParis(instant).split('-');
	return `${jour}/${mois}/${annee}`;
}

/**
 * Un titulaire coché devient un prospect « à contacter », avec la vraie source (CNIL :
 * le premier message la nomme). `annuaire` complète ce que la DECP ne dit pas (dirigeant,
 * effectif, ville), lu à l'annuaire au moment d'ajouter.
 */
export function versProspectDecp(
	titulaire: TitulaireDecp,
	annuaire: EntrepriseTrouvee | null,
	maintenant: number
): ProspectImporte {
	return {
		entreprise: annuaire?.entreprise ?? titulaire.nom,
		siren: titulaire.siren,
		...(annuaire?.activite === undefined ? {} : { activite: annuaire.activite }),
		...(annuaire?.effectif === undefined ? {} : { effectif: annuaire.effectif }),
		...(annuaire?.ville === undefined ? {} : { ville: annuaire.ville }),
		...(annuaire?.dirigeant === undefined ? {} : { dirigeant: annuaire.dirigeant }),
		...(annuaire?.fonction === undefined ? {} : { fonction: annuaire.fonction }),
		cible: 'PME',
		statut: 'A_CONTACTER',
		trouveOu: `Données de la commande publique (data.gouv.fr), le ${dateDuJour(maintenant)}`
	};
}
