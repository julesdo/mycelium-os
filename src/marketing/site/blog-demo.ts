import { allResumes, type ResumeDArticle } from 'content-collections';
import { jourDeParis } from '../../lib/admin/dates';
import { PARAMETRES } from '../../lib/verticales/recouvrement/parametres';
import { regimePrescription } from '../../lib/verticales/recouvrement/pays/france/prescription';
import type { CategorieBlog } from '../motifs-blog';
import { estPublie } from '../publication';

/**
 * LE BLOG DE L'ACCUEIL : LES QUATRE DERNIERS ARTICLES PARUS (28/10/2026).
 *
 * ⚠️ CE QUE VOIT UN VISITEUR, MÊME EN DÉVELOPPEMENT. Le blog montre ses articles d'avance en
 * local (`estPublie`) ; l'accueil, lui, ne montre que ceux qui sont sortis, à Paris, et annonce
 * le suivant. Rendu au serveur à chaque visite : un article daté de jeudi monte jeudi.
 *
 * Il lit `allResumes`, les en-têtes sans le corps (`content-collections.ts`) : le texte des
 * articles n'entre pas dans le paquet de l'accueil.
 *
 * ⚠️ L'ÉTIQUETTE NE PORTE AUCUN CHIFFRE TAPÉ. Sa valeur en grand se lit au registre, par la clé
 * que l'article nomme (`valeurDuRegistre`) : « 50 jours » pour `delaisPaiementPublics.SANTE`.
 * La maquette pendait « 70 jours » et « 13,4 jours », relevés d'un rapport : un chiffre écrit à
 * la main, que rien ne corrige.
 */
const NB = '\u00a0';
const MOIS_COURTS = [
	'janv.',
	'févr.',
	'mars',
	'avr.',
	'mai',
	'juin',
	'juil.',
	'août',
	'sept.',
	'oct.',
	'nov.',
	'déc.'
];
const MOIS = [
	'janvier',
	'février',
	'mars',
	'avril',
	'mai',
	'juin',
	'juillet',
	'août',
	'septembre',
	'octobre',
	'novembre',
	'décembre'
];
const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const parties = (iso: string) => iso.split('-').map(Number) as [number, number, number];
const premier = (j: number) => (j === 1 ? '1er' : String(j));
/** « 26 oct. » */
export const dateCourte = (iso: string) => {
	const [, m, j] = parties(iso);
	return `${premier(j)} ${MOIS_COURTS[m - 1] ?? ''}`;
};
/** « Jeudi 29 octobre » */
export const jourLong = (iso: string) => {
	const [a, m, j] = parties(iso);
	return `${JOURS[new Date(Date.UTC(a, m - 1, j)).getUTCDay()] ?? ''} ${premier(j)} ${MOIS[m - 1] ?? ''}`;
};

/** La catégorie dite avec son article, comme la maquette : « La trésorerie ». */
const RUBRIQUES: Readonly<Record<CategorieBlog, string>> = {
	'La loi': 'La loi',
	Procédures: 'Les procédures',
	Trésorerie: 'La trésorerie',
	Méthode: 'La méthode',
	Letikette: 'Letikette'
};

function enUnites(valeur: number | bigint, unite: string): string | null {
	if (unite === 'centimes' && typeof valeur === 'bigint' && valeur % 100n === 0n)
		return `${valeur / 100n}${NB}€`;
	if (typeof valeur !== 'number') return null;
	if (unite === 'jours') return `${valeur}${NB}jours`;
	if (unite === 'mois') return `${valeur}${NB}mois`;
	if (unite === 'annees') return `${valeur}${NB}an${valeur > 1 ? 's' : ''}`;
	return null;
}

/**
 * La valeur du registre qu'une étiquette nomme : `indemniteForfaitaire`, un délai par acheteur
 * (`delaisPaiementPublics.SANTE`), ou un délai pour agir (`prescription.TRANSPORT_MARCHANDISES`).
 * Une clé que le registre ne porte pas, ou pas en chiffre, lève : l'accueil ne pend pas une
 * étiquette vide.
 */
export function valeurDuRegistre(cle: string): string {
	const [nom, sous] = cle.split('.');
	let lue: string | null = null;
	if (nom === 'prescription' && sous) {
		lue = enUnites(
			regimePrescription(sous as Parameters<typeof regimePrescription>[0]).dureeAnnees,
			'annees'
		);
	} else if (nom && nom in PARAMETRES) {
		const p = PARAMETRES[nom as keyof typeof PARAMETRES] as { valeur: unknown; unite: string };
		const v = sous ? (p.valeur as Record<string, unknown> | null)?.[sous] : p.valeur;
		if (typeof v === 'number' || typeof v === 'bigint') lue = enUnites(v, p.unite);
	}
	if (lue === null)
		throw new Error(`L’étiquette nomme « ${cle} », que le registre ne chiffre pas.`);
	return lue;
}

export interface ArticleDuSite {
	readonly adresse: string;
	readonly rubrique: string;
	readonly date: string;
	readonly minutes: number;
	readonly titre: string;
	readonly description: string;
	readonly bref: readonly string[];
	readonly etiquette: readonly [string, string, string] | null;
}

function versLeSite(a: ResumeDArticle): ArticleDuSite {
	const e = a.etiquette;
	return {
		adresse: a.adresse,
		rubrique: RUBRIQUES[a.categorie],
		date: dateCourte(a.date),
		minutes: a.minutes,
		titre: a.titre,
		description: a.description,
		bref: a.enBref ?? [a.description],
		etiquette: e
			? [e.libelle, e.registre !== undefined ? valeurDuRegistre(e.registre) : (e.mot ?? ''), e.sous]
			: null
	};
}

/** Les quatre derniers articles sortis, du plus récent au plus ancien. */
export function articlesDuSite(maintenant: number): readonly ArticleDuSite[] {
	return allResumes
		.filter((a) => estPublie(a, maintenant, false))
		.sort((a, b) => b.date.localeCompare(a.date))
		.slice(0, 4)
		.map(versLeSite);
}

/** Le prochain article, s'il y en a un d'écrit : son jour et son titre. */
export function prochainArticle(
	maintenant: number
): { readonly jour: string; readonly titre: string } | null {
	const aujourdHui = jourDeParis(maintenant);
	const suivant = allResumes
		.filter((a) => !a.brouillon && a.date > aujourdHui)
		.sort((a, b) => a.date.localeCompare(b.date))[0];
	return suivant ? { jour: jourLong(suivant.date), titre: suivant.titre } : null;
}
