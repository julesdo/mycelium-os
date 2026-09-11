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
 *
 * ⚠️ UNE DATE QUI PASSE LE FORMAT N'EST PAS UNE DATE. `^\d{4}-\d{2}-\d{2}$`
 * accepte `2026-13-45` et `2026-02-30`. Ce module s'en est longtemps contenté,
 * et les trois conséquences étaient toutes muettes ou obscures : le mois 13
 * était reporté sur l'année suivante par l'arithmétique en mois absolus, le
 * quantième impossible était raboté sur la borne du mois, et l'addition de
 * jours partait en `RangeError` — ou, sur le moteur de bun, roulait
 * silencieusement sur le mois suivant. Sur une prescription, un décalage muet
 * est pire qu'une exception : une exception se voit.
 */

const DATE_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * La règle grégorienne complète, et la SEULE du produit.
 *
 * Elle borne les quantièmes ici, et donne la base annuelle d’un calcul
 * d’intérêts dans `decompte.ts`. Deux copies en feraient deux vérités, dont
 * une seule serait corrigée le jour où l’une des deux se révèle fausse.
 */
export function estBissextile(annee: number): boolean {
	return (annee % 4 === 0 && annee % 100 !== 0) || annee % 400 === 0;
}

/** Le dernier jour d'un mois donné. `mois` va de 1 à 12. */
export function dernierJourDuMois(annee: number, mois: number): number {
	const longueurs = [31, estBissextile(annee) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
	return longueurs[mois - 1]!;
}

/**
 * Cette chaîne désigne-t-elle un jour qui a réellement existé ?
 *
 * Le format ET l'existence, dans cet ordre. C'est le prédicat que tout point
 * d'entrée du produit doit appliquer avant de laisser une date atteindre un
 * calcul : l'import comptable, le dépôt de factures, et ce module lui-même.
 * Il ne lève pas — l'appelant qui traite un lot décide s'il refuse la ligne ou
 * le fichier entier.
 */
export function estDateReelle(date: string): boolean {
	const trouve = DATE_ISO.exec(date);
	if (trouve === null) return false;

	const annee = Number(trouve[1]);
	const mois = Number(trouve[2]);
	const jour = Number(trouve[3]);

	// L'an 0 n'est pas une date, c'est une saisie vide qui a pris la forme d'une
	// date. L'accepter en ferait un point de départ de prescription plausible.
	if (annee < 1) return false;
	if (mois < 1 || mois > 12) return false;
	if (jour < 1 || jour > dernierJourDuMois(annee, mois)) return false;
	return true;
}

function decomposer(date: string): { annee: number; mois: number; jour: number } {
	if (!estDateReelle(date)) {
		throw new Error(
			`Date attendue au format AAAA-MM-JJ et devant exister au calendrier, reçue : ${JSON.stringify(date)}`
		);
	}
	const trouve = DATE_ISO.exec(date)!;
	return {
		annee: Number(trouve[1]),
		mois: Number(trouve[2]),
		jour: Number(trouve[3])
	};
}

function deuxChiffres(valeur: number): string {
	return valeur.toString().padStart(2, '0');
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

/**
 * L'écart en jours de `debut` à `fin`, SIGNÉ.
 *
 * ⚠️ IL NE FAUT PAS LE CONFONDRE AVEC `joursEntre` DE `decompte.ts`, qui
 * PLAFONNE À ZÉRO un écart négatif. Ce plafonnement y est juste et documenté :
 * un arrêté antérieur à l'exigibilité ne produit pas d'intérêts en sens
 * inverse, il n'en produit aucun.
 *
 * Mais il est faux partout où le signe porte une information. Mesurer
 * l'habitude de paiement d'un client en est le cas type : une facture réglée
 * AVANT son échéance a un délai négatif, et l'écraser à zéro ferait passer un
 * bon payeur pour un payeur à l'heure — donc masquerait sa rupture le jour où
 * il commence à payer en retard.
 *
 * Les deux vivent séparément parce qu'ils répondent à deux questions, pas
 * parce que personne n'a remarqué la duplication. L'arithmétique, elle, est
 * ici : `joursEntre` n'a que le plafond en plus.
 */
export function ecartJours(debut: string, fin: string): number {
	if (!estDateReelle(debut) || !estDateReelle(fin)) {
		throw new Error(
			`Deux dates existantes au format AAAA-MM-JJ sont attendues, reçues : ${JSON.stringify(debut)} et ${JSON.stringify(fin)}`
		);
	}
	return Math.round(
		(Date.parse(`${fin}T00:00:00Z`) - Date.parse(`${debut}T00:00:00Z`)) / 86_400_000
	);
}

/** Ajoute des jours calendaires. */
export function ajouterJours(date: string, jours: number): string {
	decomposer(date); // valide le format ET l'existence avant tout calcul
	const instant = Date.parse(`${date}T00:00:00Z`) + jours * 86_400_000;
	return new Date(instant).toISOString().slice(0, 10);
}
