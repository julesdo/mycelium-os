import { jourDeParis } from '../admin/dates';
import type { ProspectImporte } from './import';

/**
 * TROUVER DES ENTREPRISES À L'ANNUAIRE PUBLIC (17/10/2026).
 *
 * La liste du lundi (`docs/croissance/phase-manuelle.md`) se faisait à la main sur
 * annuaire-entreprises.data.gouv.fr, fiche par fiche. Elle se fait ici par l'API
 * Recherche d'entreprises de l'État : ouverte, gratuite, sans clé, sept requêtes
 * par seconde. On y cherche les PME de 3 à 49 salariés, en activité, d'un secteur
 * et d'une zone ; l'équipe coche celles qu'elle veut, rien n'entre avant.
 *
 * Ce que ce module ne fait pas, exprès :
 * - il ne garde AUCUNE date de naissance (l'API les publie ; elles ne servent à rien
 *   pour écrire à quelqu'un) ;
 * - il écarte une entreprise dont la diffusion est restreinte (`statut_diffusion`
 *   autre que « O ») : son titulaire a demandé à ne pas paraître ;
 * - il ne cherche aucune adresse e-mail : elle se lit sur le site de l'entreprise,
 *   et la source de chaque contact reste écrite sur la fiche (`trouveOu`).
 *
 * L'API retient une entreprise dès qu'UN de ses établissements est dans la zone : la
 * moitié des transporteurs « de Paris » y ont un dépôt et leur siège à Mions ou à
 * Rungis. On ne garde que le siège dans la zone (relevé du 18/10/2026), et on compte
 * ce qui est écarté.
 *
 * Le dirigeant retenu est une personne physique qui dirige (président, gérant,
 * directeur général) ; un commissaire aux comptes ne dirige rien, une société
 * présidente n'a pas de prénom.
 */

export const ANNUAIRE_API = 'https://recherche-entreprises.api.gouv.fr/search';

/** Les fiches publiques, pour vérifier à la main ce que l'API a rendu. */
export function ficheALAnnuaire(siren: string): string {
	return `https://annuaire-entreprises.data.gouv.fr/entreprise/${siren}`;
}

/** 3 à 5, 6 à 9, 10 à 19, 20 à 49 salariés : les tranches de l'Insee visées. */
const TRANCHES_VISEES = ['02', '03', '11', '12'] as const;
const PAR_PAGE = 25;
/** L'API ne sert pas au-delà de 10 000 résultats, soit 400 pages de 25. */
const PAGE_MAX = 400;

export type CleSecteur = 'TRANSPORT' | 'BATIMENT' | 'SERVICES' | 'CABINETS';

export interface Secteur {
	readonly libelle: string;
	/** Ce que la recherche couvre, en clair, sous le libellé. */
	readonly detail: string;
	readonly codes?: readonly string[];
	readonly section?: string;
	readonly cabinet: boolean;
}

/** Les cibles de la phase manuelle, dans leur ordre (`phase-manuelle.md`, § 1). */
export const SECTEURS: Readonly<Record<CleSecteur, Secteur>> = {
	TRANSPORT: {
		libelle: 'Transport routier',
		detail: 'Fret, location de camions',
		codes: ['49.41A', '49.41B', '49.41C'],
		cabinet: false
	},
	BATIMENT: {
		libelle: 'Bâtiment',
		detail: 'Construction, second œuvre',
		section: 'F',
		cabinet: false
	},
	SERVICES: {
		libelle: 'Services aux entreprises',
		detail: 'Conseil, agences, nettoyage, sécurité',
		codes: ['70.22Z', '73.11Z', '71.12B', '62.02A', '81.21Z', '80.10Z'],
		cabinet: false
	},
	CABINETS: {
		libelle: 'Cabinets comptables',
		detail: 'Experts-comptables',
		codes: ['69.20Z'],
		cabinet: true
	}
};
export const CLES_SECTEURS = Object.keys(SECTEURS) as CleSecteur[];

export type CleZone = 'PARIS' | 'PETITE_COURONNE' | 'ILE_DE_FRANCE';

/** Paris d'abord : c'est là que l'équipe travaille et peut aller voir un client. */
export const ZONES: Readonly<
	Record<
		CleZone,
		{
			readonly libelle: string;
			/** Le nom qui tient dans un segment à 375 px. */
			readonly court: string;
			readonly departements: readonly string[];
		}
	>
> = {
	PARIS: { libelle: 'Paris', court: 'Paris', departements: ['75'] },
	PETITE_COURONNE: {
		libelle: 'Paris et petite couronne',
		court: 'Petite couronne',
		departements: ['75', '92', '93', '94']
	},
	ILE_DE_FRANCE: {
		libelle: 'Île-de-France',
		court: 'Île-de-France',
		departements: ['75', '77', '78', '91', '92', '93', '94', '95']
	}
};

/** « Paris (75), 92, 93 et 94 » : ce que la zone couvre, sous le choix. */
export function departementsEnClair(zone: CleZone): string {
	const [premier, ...autres] = ZONES[zone].departements;
	if (autres.length === 0) return `Paris (${premier})`;
	const fin = autres.pop();
	return `Paris (${premier}), ${autres.join(', ')}${autres.length === 0 ? '' : ' et '}${fin}`;
}
export const CLES_ZONES = Object.keys(ZONES) as CleZone[];

export function adresseDeRecherche({
	secteur,
	zone,
	page
}: {
	readonly secteur: CleSecteur;
	readonly zone: CleZone;
	readonly page: number;
}): string {
	const s = SECTEURS[secteur];
	const p = new URLSearchParams();
	if (s.codes !== undefined) p.set('activite_principale', s.codes.join(','));
	if (s.section !== undefined) p.set('section_activite_principale', s.section);
	p.set('departement', ZONES[zone].departements.join(','));
	p.set('tranche_effectif_salarie', TRANCHES_VISEES.join(','));
	p.set('etat_administratif', 'A');
	p.set('categorie_entreprise', 'PME');
	p.set('per_page', String(PAR_PAGE));
	p.set('page', String(Math.min(PAGE_MAX, Math.max(1, Math.trunc(page) || 1))));
	return `${ANNUAIRE_API}?${p.toString()}`;
}

/** Ce que l'écran montre d'une entreprise trouvée, et ce qui entre au CRM. */
export interface EntrepriseTrouvee {
	readonly siren: string;
	readonly entreprise: string;
	readonly activite?: string;
	readonly effectif?: string;
	readonly ville?: string;
	readonly dirigeant?: string;
	readonly fonction?: string;
}

export interface PageDeLAnnuaire {
	/** Ce que l'API compte : les entreprises qui ont un établissement dans la zone. */
	readonly total: number;
	readonly pages: number;
	readonly entreprises: EntrepriseTrouvee[];
	/** Sur cette page, celles dont le siège est hors de la zone. */
	readonly horsZone: number;
}

const EFFECTIFS: Readonly<Record<string, string>> = {
	'00': '0 salarié',
	'01': '1 ou 2 salariés',
	'02': '3 à 5 salariés',
	'03': '6 à 9 salariés',
	'11': '10 à 19 salariés',
	'12': '20 à 49 salariés',
	'21': '50 à 99 salariés',
	'22': '100 à 199 salariés',
	'31': '200 à 249 salariés',
	'32': '250 à 499 salariés'
};

/** Les libellés de la nomenclature d'activités (NAF rév. 2) pour les codes cherchés. */
const ACTIVITES: Readonly<Record<string, string>> = {
	'49.41A': 'Transports routiers de fret interurbains',
	'49.41B': 'Transports routiers de fret de proximité',
	'49.41C': 'Location de camions avec chauffeur',
	'70.22Z': 'Conseil pour les affaires et autres conseils de gestion',
	'73.11Z': 'Activités des agences de publicité',
	'71.12B': 'Ingénierie, études techniques',
	'62.02A': 'Conseil en systèmes et logiciels informatiques',
	'81.21Z': 'Nettoyage courant des bâtiments',
	'80.10Z': 'Activités de sécurité privée',
	'69.20Z': 'Activités comptables'
};
/** La section F se cherche entière : ses codes se nomment par leur division. */
const DIVISIONS: Readonly<Record<string, string>> = {
	'41': 'Construction de bâtiments',
	'42': 'Génie civil',
	'43': 'Travaux de construction spécialisés'
};

function activiteDe(code: string | undefined): string | undefined {
	if (code === undefined || code === '') return undefined;
	const libelle = ACTIVITES[code] ?? DIVISIONS[code.slice(0, 2)];
	// Un code inconnu se montre tel quel : le taire ferait croire qu'il n'y en a pas.
	return libelle === undefined ? code : `${libelle} (${code})`;
}

const PARTICULES = new Set(['de', 'du', 'des']);

/** « JEAN-PIERRE » → « Jean-Pierre » ; « DE LA FONTAINE » → « de La Fontaine ». */
function casse(mot: string, premier: boolean): string {
	const bas = mot.toLowerCase();
	if (!premier && PARTICULES.has(bas)) return bas;
	return bas.replace(/(^|[-'’])(\p{L})/gu, (_, sep: string, l: string) => sep + l.toUpperCase());
}

function nomPropre(texte: string, premierMotEnTete: boolean): string {
	return texte
		.trim()
		.split(/\s+/)
		.map((m, i) => casse(m, premierMotEnTete && i === 0))
		.join(' ');
}

function villeDe(commune: unknown): string | undefined {
	if (typeof commune !== 'string' || commune.trim() === '') return undefined;
	return nomPropre(commune, true);
}

interface DirigeantBrut {
	readonly nom?: unknown;
	readonly prenoms?: unknown;
	readonly qualite?: unknown;
	readonly type_dirigeant?: unknown;
}

const QUI_DIRIGE = /pr[ée]sident|g[ée]rant|directeur g[ée]n[ée]ral|directrice g[ée]n[ée]rale/i;
const QUI_CONTROLE = /commissaire aux comptes/i;

function dirigeantDe(
	dirigeants: unknown
): { readonly dirigeant: string; readonly fonction?: string } | undefined {
	if (!Array.isArray(dirigeants)) return undefined;
	const personnes = (dirigeants as DirigeantBrut[]).filter(
		(d) =>
			d.type_dirigeant === 'personne physique' &&
			typeof d.nom === 'string' &&
			d.nom.trim() !== '' &&
			!(typeof d.qualite === 'string' && QUI_CONTROLE.test(d.qualite))
	);
	const retenu =
		personnes.find((d) => typeof d.qualite === 'string' && QUI_DIRIGE.test(d.qualite)) ??
		personnes[0];
	if (retenu === undefined) return undefined;
	const prenom =
		typeof retenu.prenoms === 'string' ? (retenu.prenoms.trim().split(/\s+/)[0] ?? '') : '';
	const nom = nomPropre(String(retenu.nom), false);
	const dirigeant = (prenom === '' ? nom : `${nomPropre(prenom, true)} ${nom}`).slice(0, 120);
	const fonction =
		typeof retenu.qualite === 'string' && retenu.qualite.trim() !== ''
			? retenu.qualite.trim().slice(0, 80)
			: undefined;
	return fonction === undefined ? { dirigeant } : { dirigeant, fonction };
}

/** « COMEANDWORK (COMEANDWORK) » → « COMEANDWORK » ; un vrai sigle reste. */
function sansSigleRedit(nom: string): string {
	const [, avant, entre] = /^(.+?)\s*\((.+)\)$/.exec(nom) ?? [];
	if (avant === undefined || entre === undefined) return nom;
	return avant.trim().toUpperCase() === entre.trim().toUpperCase() ? avant.trim() : nom;
}

interface EntrepriseBrute {
	readonly siren?: unknown;
	readonly nom_complet?: unknown;
	readonly activite_principale?: unknown;
	readonly tranche_effectif_salarie?: unknown;
	readonly statut_diffusion?: unknown;
	readonly nature_juridique?: unknown;
	readonly siege?: { readonly libelle_commune?: unknown; readonly departement?: unknown } | null;
	readonly dirigeants?: unknown;
}

function lireEntreprise(brute: EntrepriseBrute): EntrepriseTrouvee | null {
	if (brute.statut_diffusion !== 'O') return null;
	// Catégories juridiques de l'Insee : 7 = droit public, 8 = organismes mutualistes
	// et sociaux, 9 = associations et fondations. Aucun n'achète ce logiciel.
	if (typeof brute.nature_juridique === 'string' && /^[789]/.test(brute.nature_juridique)) {
		return null;
	}
	if (typeof brute.siren !== 'string' || !/^\d{9}$/.test(brute.siren)) return null;
	if (typeof brute.nom_complet !== 'string' || brute.nom_complet.trim() === '') return null;
	const activite = activiteDe(
		typeof brute.activite_principale === 'string' ? brute.activite_principale : undefined
	);
	const effectif =
		typeof brute.tranche_effectif_salarie === 'string'
			? EFFECTIFS[brute.tranche_effectif_salarie]
			: undefined;
	const ville = villeDe(brute.siege?.libelle_commune);
	const qui = dirigeantDe(brute.dirigeants);
	return {
		siren: brute.siren,
		entreprise: sansSigleRedit(brute.nom_complet.trim()).slice(0, 200),
		...(activite === undefined ? {} : { activite }),
		...(effectif === undefined ? {} : { effectif }),
		...(ville === undefined ? {} : { ville }),
		...(qui ?? {})
	};
}

/**
 * Lit une réponse de l'API ; une réponse qui n'a pas sa forme lève, en le disant.
 * Avec des départements, ne garde que les entreprises dont le siège y est.
 */
export function lireReponseDeLAnnuaire(
	json: unknown,
	departements?: readonly string[]
): PageDeLAnnuaire {
	const r = json as {
		readonly total_results?: unknown;
		readonly total_pages?: unknown;
		readonly results?: unknown;
	};
	if (
		typeof r !== 'object' ||
		r === null ||
		typeof r.total_results !== 'number' ||
		typeof r.total_pages !== 'number' ||
		!Array.isArray(r.results)
	) {
		throw new Error('L’annuaire a rendu une réponse inattendue.');
	}
	const zone = departements === undefined ? null : new Set(departements);
	let horsZone = 0;
	const entreprises = (r.results as EntrepriseBrute[]).flatMap((e) => {
		if (zone !== null && !zone.has(String(e.siege?.departement ?? ''))) {
			horsZone += 1;
			return [];
		}
		const lue = lireEntreprise(e);
		return lue === null ? [] : [lue];
	});
	return {
		total: r.total_results,
		pages: Math.min(r.total_pages, PAGE_MAX),
		entreprises,
		horsZone
	};
}

/** « 17/10/2026 », le jour qu'il est à Paris. */
function dateDuJour(instant: number): string {
	const [annee, mois, jour] = jourDeParis(instant).split('-');
	return `${jour}/${mois}/${annee}`;
}

/** Une entreprise cochée devient un prospect « à contacter », avec sa source et sa date. */
export function versProspect(
	trouvee: EntrepriseTrouvee,
	secteur: CleSecteur,
	maintenant: number
): ProspectImporte {
	return {
		...trouvee,
		cible: SECTEURS[secteur].cabinet ? 'CABINET' : 'PME',
		statut: 'A_CONTACTER',
		trouveOu: `Annuaire des entreprises (data.gouv.fr), le ${dateDuJour(maintenant)}`
	};
}
