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
import { dateLisible, estBissextile, estDateReelle } from './calendrier';

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
	/** Positif : ce qui vient en déduction de la dette (voir `decompterFacture` pour l'ordre). */
	readonly montant: Montant;
	/**
	 * `CREDIT` : un crédit comptable dont la nature n'est pas établie. Il s'impute
	 * comme un avoir, sur le principal seul : c'est la lecture qui réclame le moins.
	 */
	readonly nature: 'PAIEMENT' | 'ACOMPTE' | 'AVOIR' | 'CREDIT';
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

/**
 * Ce qu'un règlement a éteint : d'abord les pénalités déjà courues, puis le
 * principal.
 *
 * ⚠️ SANS CETTE LIGNE, LE DÉCOMPTE NE SE REFAIT PLUS À LA MAIN. Un paiement
 * imputé sur les pénalités ne fait pas baisser le principal d'autant : la
 * somme des périodes dépasse alors les intérêts restant dus, et l'écart est
 * exactement ce que les règlements ont éteint. Le débiteur qui refait le calcul
 * doit le voir, règlement par règlement.
 */
export interface ImputationReglement {
	readonly date: string;
	readonly nature: Reglement['nature'];
	readonly montant: Montant;
	/** La part qui a éteint des pénalités déjà courues à sa date. */
	readonly surInterets: Montant;
	/** Le reste, qui a réduit le principal. */
	readonly surPrincipal: Montant;
}

export interface LigneDecompte {
	readonly reference: string;
	readonly principalRestantDu: Montant;
	/** Ce qui reste dû : la somme des périodes, moins ce que les règlements en ont éteint. */
	readonly interets: Montant;
	readonly indemniteForfaitaire: Montant;
	readonly total: Montant;
	readonly segments: readonly SegmentInterets[];
	/** Chaque règlement compté, dans l'ordre des dates, avec ce qu'il a éteint. */
	readonly imputations: readonly ImputationReglement[];
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

/**
 * L'instant UTC d'une date, ou une exception.
 *
 * ⚠️ LE GARDE-FOU `Number.isNaN(Date.parse(...))` NE MORD PAS. Sur le moteur de
 * bun, `Date.parse('2026-02-30T00:00:00Z')` ne rend pas `NaN` : il roule sur le
 * 2 mars. Une échéance saisie au 30 février produisait donc deux jours
 * d'intérêts en moins sur une somme réclamée, en silence. C'est le seul endroit
 * du produit où une date fausse se transforme en euros : elle doit lever.
 */
function instant(date: string): number {
	if (!estDateReelle(date)) {
		throw new Error(
			`Date attendue au format AAAA-MM-JJ et devant exister au calendrier, reçue : ${JSON.stringify(date)}`
		);
	}
	return Date.parse(`${date}T00:00:00Z`);
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

// La règle bissextile vit dans `calendrier.ts`, et une seule fois. L'écrire ici
// aussi en ferait deux vérités : celle qui borne les quantièmes et celle qui
// donne la base annuelle d'un calcul d'intérêts. Elles doivent être la même.
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
		// ⚠️ LE MESSAGE EST MONTRÉ AU GÉRANT, et il porte quand même la référence :
		// `decompter` lève depuis une boucle sur toutes les factures d'une créance,
		// où elle est le seul moyen de savoir laquelle a manqué.
		throw new Error(
			`Facture ${facture.reference} : aucun taux applicable le ${dateLisible(date)}. ` +
				`Ses intérêts ne peuvent donc pas être calculés, et ils ne sont pas comptés ` +
				`pour zéro : la créance les abandonnerait définitivement.`
		);
	}
	return retenu.taux;
}

function plusPetit(a: Montant, b: Montant): Montant {
	return (a as bigint) <= (b as bigint) ? a : b;
}

/**
 * Le décompte d'une facture, période par période, règlement par règlement.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ UN RÈGLEMENT ÉTEINT D'ABORD LES PÉNALITÉS DÉJÀ COURUES, PUIS LE PRINCIPAL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * C'est la règle de `PARAMETRES.imputationPaiementPartiel`. Ce module l'a
 * longtemps ignorée : il déduisait chaque règlement du principal, et réclamait
 * donc MOINS que ce qui était dû — un débiteur qui réglait le principal en
 * retard semblait quitte de ses pénalités. La relecture juridique du 25/09 l'a
 * relevé.
 *
 * Un AVOIR n'est pas un paiement : il réduit le prix, donc le principal, à sa
 * date. C'est aussi la lecture qui réclame le moins, et le doute ne profite
 * jamais au produit.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LES 40 € NE SONT DUS QUE PAR UNE FACTURE PAYÉE EN RETARD
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `PARAMETRES.indemniteForfaitaire` le dit depuis le premier jour — « due dès
 * le premier jour de retard » — et le calcul l'ajoutait quand même à une
 * facture pas encore échue, ou réglée à temps. Il réclamait alors PLUS que ce
 * qui était dû, dans le sens qui se retourne contre le client. Une facture est
 * en retard quand il en reste quelque chose à payer une fois son échéance
 * passée ; soldée depuis, elle doit toujours les 40 €.
 */
export function decompterFacture(
	facture: FacturePourDecompte,
	arreteAu: string,
	convention: ConventionJours
): LigneDecompte {
	// Lu pour être cité : la règle vit au registre, pas ici.
	exiger(PARAMETRES.imputationPaiementPartiel);

	const reglements = facture.reglements
		.filter((reglement) => reglement.date <= arreteAu)
		.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

	let principal = facture.montantExigible;
	let interetsDus = ZERO;
	const imputations: ImputationReglement[] = [];

	function imputer(reglement: Reglement) {
		// Seul un PAIEMENT (ou un acompte) s'impute sur les pénalités. Un avoir réduit
		// le prix ; un crédit de nature inconnue est traité comme lui. Et jamais
		// au-delà de ce qui a couru : un trop-perçu antérieur ne rend pas négative la
		// part d'un règlement suivant.
		const surInterets =
			reglement.nature === 'AVOIR' || reglement.nature === 'CREDIT' || (interetsDus as bigint) <= 0n
				? ZERO
				: plusPetit(reglement.montant, interetsDus);
		const surPrincipal = soustraire(reglement.montant, surInterets);
		interetsDus = soustraire(interetsDus, surInterets);
		principal = soustraire(principal, surPrincipal);
		imputations.push({
			date: reglement.date,
			nature: reglement.nature,
			montant: reglement.montant,
			surInterets,
			surPrincipal
		});
	}

	// Jusqu'à l'exigibilité, rien ne court : tout règlement réduit le principal.
	let rang = 0;
	while (rang < reglements.length && reglements[rang]!.date <= facture.dateExigibilite) {
		imputer(reglements[rang++]!);
	}

	const echue = arreteAu > facture.dateExigibilite;
	const enRetard = echue && (principal as bigint) > 0n;

	const segments: SegmentInterets[] = [];

	// Un arrêté antérieur à l'exigibilité ne produit aucun segment, et donc
	// aucun intérêt — mais le principal reste dû.
	if (echue) {
		const jalons = bornes(facture, arreteAu, convention);
		for (let i = 0; i < jalons.length - 1; i++) {
			const debut = jalons[i]!;
			const fin = jalons[i + 1]!;

			// Les règlements de ce jour s'imputent AVANT la période qui s'ouvre :
			// sur ce qui a couru jusque-là, puis sur le principal.
			while (rang < reglements.length && reglements[rang]!.date <= debut) {
				imputer(reglements[rang++]!);
			}

			const jours = joursEntre(debut, fin);
			if (jours === 0) continue;

			const taux = tauxALaDate(facture, debut);
			const baseAnnuelle = convention === 'ACT_365' ? 365 : joursDansAnnee(annee(debut));

			// Une seule division par segment, sur une chaîne restée entière :
			// principal × numérateur × jours / (dénominateur × base).
			const interets = multiplier(
				principal,
				fraction(taux.numerateur * BigInt(jours), taux.denominateur * BigInt(baseAnnuelle))
			);

			segments.push({ debut, fin, jours, principal, taux, baseAnnuelle, interets });
			interetsDus = additionner(interetsDus, interets);
		}
	}

	// Les règlements du jour d'arrêté s'imputent sur ce qui a couru jusqu'à lui.
	while (rang < reglements.length) imputer(reglements[rang++]!);

	const indemniteForfaitaire = enRetard
		? depuisCentimes(exiger(PARAMETRES.indemniteForfaitaire))
		: ZERO;

	return {
		reference: facture.reference,
		principalRestantDu: principal,
		interets: interetsDus,
		indemniteForfaitaire,
		total: additionner(principal, interetsDus, indemniteForfaitaire),
		segments,
		imputations
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
