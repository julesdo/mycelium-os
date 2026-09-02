/**
 * Le calcul des échéances de procédure.
 *
 * POURQUOI PAS `date-fns`, QUI EST DÉJÀ UNE DÉPENDANCE. Parce qu'un délai
 * procédural n'est pas une arithmétique de calendrier ordinaire, et que la
 * règle qui compte ici — « de quantième à quantième, à défaut le dernier jour
 * du mois » — doit être LISIBLE dans le code qui la porte, pas déléguée à une
 * bibliothèque dont le comportement aux bords se découvre en lisant sa
 * documentation.
 *
 * L'ÉCHÉANCE QUE CE MODULE PROTÈGE EST LA PLUS DANGEREUSE DU PRODUIT : trois
 * mois pour signifier une ordonnance d'injonction de payer, sous peine de
 * caducité. Un jour d'écart et l'ordonnance est perdue.
 */

const DATE_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

function decomposer(date: string): { annee: number; mois: number; jour: number } {
	const trouve = DATE_ISO.exec(date);
	if (trouve === null) {
		throw new Error(`Date attendue au format AAAA-MM-JJ, reçue : ${JSON.stringify(date)}`);
	}
	return {
		annee: Number(trouve[1]),
		mois: Number(trouve[2]),
		jour: Number(trouve[3])
	};
}

function deuxChiffres(valeur: number): string {
	return valeur.toString().padStart(2, '0');
}

function estBissextile(annee: number): boolean {
	return (annee % 4 === 0 && annee % 100 !== 0) || annee % 400 === 0;
}

/** Le dernier jour d'un mois donné. `mois` va de 1 à 12. */
export function dernierJourDuMois(annee: number, mois: number): number {
	const longueurs = [31, estBissextile(annee) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
	return longueurs[mois - 1]!;
}

/**
 * Ajoute des mois **de quantième à quantième**.
 *
 * Quand le quantième n'existe pas dans le mois d'arrivée — le 31 janvier plus
 * un mois — le délai expire le dernier jour de ce mois. C'est la règle
 * française, et c'est aussi la seule qui ne raccourcisse jamais un délai par
 * accident : reporter au 1er mars le ferait déborder, retenir le 28 février le
 * ferait expirer plus tôt qu'un délai parti du 28 janvier.
 */
export function ajouterMois(date: string, mois: number): string {
	const { annee, mois: moisDepart, jour } = decomposer(date);

	// On raisonne en mois absolus pour ne jamais avoir à gérer le passage
	// d'année à la main.
	const moisAbsolus = annee * 12 + (moisDepart - 1) + mois;
	const anneeCible = Math.floor(moisAbsolus / 12);
	const moisCible = (moisAbsolus % 12) + 1;

	const jourCible = Math.min(jour, dernierJourDuMois(anneeCible, moisCible));

	return `${anneeCible.toString().padStart(4, '0')}-${deuxChiffres(moisCible)}-${deuxChiffres(jourCible)}`;
}

/** Ajoute des jours calendaires. */
export function ajouterJours(date: string, jours: number): string {
	decomposer(date); // valide le format avant tout calcul
	const instant = Date.parse(`${date}T00:00:00Z`) + jours * 86_400_000;
	return new Date(instant).toISOString().slice(0, 10);
}
