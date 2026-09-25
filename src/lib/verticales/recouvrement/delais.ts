import { ajouterJours, ajouterMois, estDateReelle } from './calendrier';
import { PARAMETRES, exiger } from './parametres';

/**
 * LE CALCUL DES DÉLAIS — code de procédure civile, articles 641 et 642.
 *
 * ⚠️ CE MODULE NE DIT PAS QUEL DÉLAI S'APPLIQUE. Il sait seulement où finit un
 * délai donné : la durée vient du référentiel, et c'est l'appelant qui dit si
 * le report au premier jour ouvrable s'applique. Il s'applique aux délais de
 * procédure (`PARAMETRES.reportDelaiJourNonOuvrable`) ; pour la prescription,
 * son application n'a pas été relevée, et l'appelant ne le demande pas.
 *
 * ⚠️ LES FÊTES LÉGALES VIENNENT DU REGISTRE. Seul le dimanche de Pâques se
 * calcule ici : c'est de l'astronomie calendaire, pas du droit.
 */

export type UniteDelai = 'jours' | 'mois' | 'annees';

export interface Duree {
	readonly valeur: number;
	readonly unite: UniteDelai;
}

export interface FinDeDelai {
	/** Le dernier jour utile. */
	readonly fin: string;
	/** Le jour où le délai aurait fini sans report, quand il a été reporté. */
	readonly reporteeDe: string | null;
}

function deuxChiffres(nombre: number): string {
	return nombre.toString().padStart(2, '0');
}

/** Le dimanche de Pâques du calendrier grégorien (algorithme anonyme, dit de Meeus). */
export function paques(annee: number): string {
	const a = annee % 19;
	const b = Math.floor(annee / 100);
	const c = annee % 100;
	const d = Math.floor(b / 4);
	const e = b % 4;
	const f = Math.floor((b + 8) / 25);
	const g = Math.floor((b - f + 1) / 3);
	const h = (19 * a + b - d - g + 15) % 30;
	const i = Math.floor(c / 4);
	const k = c % 4;
	const l = (32 + 2 * e + 2 * i - h - k) % 7;
	const m = Math.floor((a + 11 * h + 22 * l) / 451);
	const mois = Math.floor((h + l - 7 * m + 114) / 31);
	const jour = ((h + l - 7 * m + 114) % 31) + 1;
	return `${annee}-${deuxChiffres(mois)}-${deuxChiffres(jour)}`;
}

/** Les onze fêtes légales d'une année, en dates ISO. */
export function joursFeries(annee: number): readonly string[] {
	const dimancheDePaques = paques(annee);
	return exiger(PARAMETRES.joursFeriesLegaux).map((regle) => {
		const mobile = /^PAQUES\+(\d+)$/.exec(regle);
		if (mobile !== null) return ajouterJours(dimancheDePaques, Number(mobile[1]));
		if (!/^\d{2}-\d{2}$/.test(regle)) {
			throw new Error(`Règle de jour férié illisible au référentiel : « ${regle} ».`);
		}
		return `${annee}-${regle}`;
	});
}

/** Ni samedi, ni dimanche, ni fête légale. */
export function estJourOuvrable(date: string): boolean {
	if (!estDateReelle(date)) {
		throw new Error(`Date attendue au format AAAA-MM-JJ et existante, reçue : ${JSON.stringify(date)}`);
	}
	const jourDeLaSemaine = new Date(`${date}T00:00:00Z`).getUTCDay();
	if (jourDeLaSemaine === 0 || jourDeLaSemaine === 6) return false;
	return !joursFeries(Number.parseInt(date.slice(0, 4), 10)).includes(date);
}

/**
 * Le dernier jour d'un délai.
 *
 * En jours, le jour du départ ne compte pas : un délai de 15 jours ouvert le 2
 * finit le 17. En mois ou en années, le délai finit le même quantième, ou le
 * dernier jour du mois quand ce quantième n'existe pas (641, al. 2).
 */
export function finDeDelai(
	depart: string,
	duree: Duree,
	options: { readonly reporterJourNonOuvrable: boolean }
): FinDeDelai {
	if (!Number.isInteger(duree.valeur) || duree.valeur < 0) {
		throw new Error(`Durée de délai invalide : ${duree.valeur} ${duree.unite}.`);
	}

	let fin: string;
	if (duree.unite === 'jours') {
		fin = ajouterJours(depart, duree.valeur);
	} else {
		exiger(PARAMETRES.computationDelaisMois);
		fin = ajouterMois(depart, duree.unite === 'mois' ? duree.valeur : duree.valeur * 12);
	}

	if (!options.reporterJourNonOuvrable) return { fin, reporteeDe: null };

	exiger(PARAMETRES.reportDelaiJourNonOuvrable);
	let reportee = fin;
	while (!estJourOuvrable(reportee)) reportee = ajouterJours(reportee, 1);
	return { fin: reportee, reporteeDe: reportee === fin ? null : fin };
}
