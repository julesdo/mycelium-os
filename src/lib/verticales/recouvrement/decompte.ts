import {
	ZERO,
	additionner,
	depuisCentimes,
	fraction,
	multiplier,
	soustraire,
	type Fraction,
	type Montant
} from '../../socle/montants';
import { PARAMETRES, exiger } from './parametres';

/**
 * Le décompte d'une créance — le calcul dont une erreur coûte de l'argent réel.
 *
 * LA RÈGLE QUI COMMANDE TOUT : le titre exécutoire ne porte que sur les sommes
 * chiffrées dans l'acte, et ce qui n'est pas demandé est définitivement perdu.
 * Un décompte qui oublie un poste ne ressemble pas à un décompte cassé : il
 * ressemble à un décompte juste, en plus petit. C'est pourquoi ce module lève
 * plutôt que de retenir zéro, partout où une donnée manque.
 *
 * TROIS PROPRIÉTÉS SONT TENUES PAR CONSTRUCTION.
 *
 * 1. **Exactitude.** Tout passe par `socle/montants` : des entiers de centimes
 *    en `bigint`, et une seule division arrondie par segment.
 *
 * 2. **Reproductibilité.** Aucune lecture d'horloge. La date d'arrêté est un
 *    ARGUMENT, jamais `Date.now()`. Le même dossier rejoué dans six mois à la
 *    même date de référence rend le même total, au centime.
 *
 * 3. **Explicabilité.** Chaque ligne porte ses `segments` : sur quelle période,
 *    quel principal, quel taux, quelle base annuelle, combien de jours. Un
 *    débiteur qui refait le calcul doit retomber sur le même chiffre, et voir
 *    d'où il vient.
 *
 * CE QUE CE MODULE NE DÉCIDE PAS. Ni le taux applicable, ni la convention de
 * jours : les deux sont des règles de droit, elles arrivent en arguments. Le
 * module de procédure (phase 5) les lira dans `parametres.ts` et refusera de
 * produire un acte tant qu'elles ne sont pas validées. Le calcul, lui, reste
 * pur et testable.
 */

/**
 * La base annuelle de division des intérêts.
 *
 * ELLE N'EST PAS DEVINÉE, ET N'A PAS DE DÉFAUT. Les deux conventions donnent
 * des résultats différents dès qu'une année bissextile est traversée, et la
 * règle 0.1 du brief interdit de trancher une question de droit dans le code.
 * L'appelant choisit, explicitement, et devra justifier son choix.
 *
 * - `ACT_365` : base fixe de 365 jours, quelle que soit l'année.
 * - `ACT_ACT` : base réelle de l'année traversée — 365, ou 366 si elle est
 *   bissextile. Une année pleine y rend exactement le taux annoncé.
 */
export type ConventionJours = 'ACT_365' | 'ACT_ACT';

/** Ce qui éteint tout ou partie d'une dette, à une date. */
export interface Reglement {
	readonly date: string;
	/** Positif : ce qui vient en déduction du principal. */
	readonly montant: Montant;
	readonly nature: 'PAIEMENT' | 'ACOMPTE' | 'AVOIR';
}

/** Un taux annuel, en vigueur à compter de `debut` jusqu'au suivant. */
export interface PeriodeDeTaux {
	readonly debut: string;
	readonly taux: Fraction;
}

export interface FacturePourDecompte {
	readonly reference: string;
	/** Ce qui était dû à l'échéance, avant tout règlement. */
	readonly montantExigible: Montant;
	/**
	 * Le point de départ des intérêts.
	 *
	 * Ce n'est PAS toujours la date d'échéance : elle dépend des conditions
	 * contractuelles, et c'est au modèle de domaine de l'avoir déjà tranchée.
	 */
	readonly dateExigibilite: string;
	readonly reglements: readonly Reglement[];
	/** Au moins une période couvrant la date d'exigibilité. */
	readonly taux: readonly PeriodeDeTaux[];
}

/** Une période homogène : même principal, même taux, même base. */
export interface SegmentInterets {
	readonly debut: string;
	readonly fin: string;
	readonly jours: number;
	readonly principal: Montant;
	readonly taux: Fraction;
	readonly baseAnnuelle: number;
	readonly interets: Montant;
}

export interface LigneDecompte {
	readonly reference: string;
	readonly principalRestantDu: Montant;
	readonly interets: Montant;
	readonly indemniteForfaitaire: Montant;
	readonly total: Montant;
	readonly segments: readonly SegmentInterets[];
}

export interface DecompteCreance {
	readonly lignes: readonly LigneDecompte[];
	readonly principalRestantDu: Montant;
	readonly interets: Montant;
	readonly indemniteForfaitaire: Montant;
	readonly total: Montant;
	readonly arreteAu: string;
	readonly convention: ConventionJours;
}

const JOUR_MS = 86_400_000;
const DATE_ISO = /^\d{4}-\d{2}-\d{2}$/;

function instant(date: string): number {
	if (!DATE_ISO.test(date)) {
		throw new Error(`Date attendue au format AAAA-MM-JJ, reçue : ${JSON.stringify(date)}`);
	}
	const valeur = Date.parse(`${date}T00:00:00Z`);
	if (Number.isNaN(valeur)) {
		throw new Error(`Date impossible : ${date}`);
	}
	return valeur;
}

/**
 * Le nombre de jours de `debut` (inclus) à `fin` (exclu).
 *
 * Jamais négatif : un arrêté antérieur à l'exigibilité ne produit pas
 * d'intérêts en sens inverse, il n'en produit aucun.
 */
export function joursEntre(debut: string, fin: string): number {
	const ecart = Math.round((instant(fin) - instant(debut)) / JOUR_MS);
	return ecart > 0 ? ecart : 0;
}

function estBissextile(annee: number): boolean {
	return (annee % 4 === 0 && annee % 100 !== 0) || annee % 400 === 0;
}

function joursDansAnnee(annee: number): number {
	return estBissextile(annee) ? 366 : 365;
}

function annee(date: string): number {
	return Number.parseInt(date.slice(0, 4), 10);
}

/**
 * Les dates où quelque chose change : l'exigibilité, chaque règlement, chaque
 * changement de taux, et — en base réelle — chaque 1er janvier, puisque la
 * base annuelle change avec l'année.
 *
 * Les dates ISO se comparent lexicalement, ce qui évite de repasser par des
 * objets `Date` pour trier.
 */
function bornes(
	facture: FacturePourDecompte,
	arreteAu: string,
	convention: ConventionJours
): string[] {
	const debut = facture.dateExigibilite;
	const ruptures = new Set<string>([debut]);

	const dansLaPeriode = (date: string) => date > debut && date < arreteAu;

	for (const reglement of facture.reglements) {
		if (dansLaPeriode(reglement.date)) ruptures.add(reglement.date);
	}
	for (const periode of facture.taux) {
		if (dansLaPeriode(periode.debut)) ruptures.add(periode.debut);
	}
	if (convention === 'ACT_ACT') {
		for (let a = annee(debut) + 1; a <= annee(arreteAu); a++) {
			const nouvelAn = `${a}-01-01`;
			if (dansLaPeriode(nouvelAn)) ruptures.add(nouvelAn);
		}
	}

	ruptures.add(arreteAu);
	return [...ruptures].sort();
}

/** Le taux en vigueur à une date : la période la plus récente qui l'a précédée. */
function tauxALaDate(facture: FacturePourDecompte, date: string): Fraction {
	let retenu: PeriodeDeTaux | null = null;
	for (const periode of facture.taux) {
		if (periode.debut <= date && (retenu === null || periode.debut > retenu.debut)) {
			retenu = periode;
		}
	}
	if (retenu === null) {
		throw new Error(
			`Facture ${facture.reference} : aucun taux applicable au ${date}. ` +
				`Le calcul des intérêts est impossible — il doit échouer plutôt que de retenir ` +
				`zéro, faute de quoi la créance abandonnerait définitivement ses intérêts.`
		);
	}
	return retenu.taux;
}

/** Ce qui reste dû à une date : l'exigible, moins tout ce qui a été réglé jusque-là. */
function principalAu(facture: FacturePourDecompte, date: string): Montant {
	let restant = facture.montantExigible;
	for (const reglement of facture.reglements) {
		if (reglement.date <= date) restant = soustraire(restant, reglement.montant);
	}
	return restant;
}

export function decompterFacture(
	facture: FacturePourDecompte,
	arreteAu: string,
	convention: ConventionJours
): LigneDecompte {
	const jalons = bornes(facture, arreteAu, convention);
	const segments: SegmentInterets[] = [];

	// Un arrêté antérieur à l'exigibilité ne produit aucun segment, et donc
	// aucun intérêt — mais le principal reste dû.
	if (arreteAu > facture.dateExigibilite) {
		for (let i = 0; i < jalons.length - 1; i++) {
			const debut = jalons[i]!;
			const fin = jalons[i + 1]!;
			const jours = joursEntre(debut, fin);
			if (jours === 0) continue;

			const principal = principalAu(facture, debut);
			const taux = tauxALaDate(facture, debut);
			const baseAnnuelle =
				convention === 'ACT_365' ? 365 : joursDansAnnee(annee(debut));

			// Une seule division par segment, sur une chaîne restée entière :
			// principal × numérateur × jours / (dénominateur × base).
			const interets = multiplier(
				principal,
				fraction(taux.numerateur * BigInt(jours), taux.denominateur * BigInt(baseAnnuelle))
			);

			segments.push({ debut, fin, jours, principal, taux, baseAnnuelle, interets });
		}
	}

	const interets = additionner(...segments.map((s) => s.interets));
	const principalRestantDu = principalAu(facture, arreteAu);
	const indemniteForfaitaire = depuisCentimes(exiger(PARAMETRES.indemniteForfaitaire));

	return {
		reference: facture.reference,
		principalRestantDu,
		interets,
		indemniteForfaitaire,
		total: additionner(principalRestantDu, interets, indemniteForfaitaire),
		segments
	};
}

/**
 * Le décompte d'une créance entière — plusieurs factures d'un même débiteur.
 *
 * L'INDEMNITÉ FORFAITAIRE SE COMPTE PAR FACTURE, jamais par créance. C'est
 * l'erreur la plus facile à commettre en agrégeant, et elle se paie dans les
 * deux sens : comptée une fois sur dix factures, neuf indemnités sont
 * abandonnées ; comptée par créance sur une facture unique, rien ne change et
 * le bug reste invisible jusqu'au premier dossier groupé.
 */
export function decompterCreance(
	factures: readonly FacturePourDecompte[],
	arreteAu: string,
	convention: ConventionJours
): DecompteCreance {
	const lignes = factures.map((facture) => decompterFacture(facture, arreteAu, convention));

	const principalRestantDu = additionner(...lignes.map((l) => l.principalRestantDu));
	const interets = additionner(...lignes.map((l) => l.interets));
	const indemniteForfaitaire = additionner(...lignes.map((l) => l.indemniteForfaitaire));

	return {
		lignes,
		principalRestantDu,
		interets,
		indemniteForfaitaire,
		total: additionner(principalRestantDu, interets, indemniteForfaitaire),
		arreteAu,
		convention
	};
}

/** Un décompte vide reste un décompte : zéro, pas `null`. */
export const DECOMPTE_NUL: DecompteCreance = {
	lignes: [],
	principalRestantDu: ZERO,
	interets: ZERO,
	indemniteForfaitaire: ZERO,
	total: ZERO,
	arreteAu: '',
	convention: 'ACT_365'
};
