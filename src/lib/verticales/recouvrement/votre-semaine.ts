import { ajouterJours } from './calendrier';
import { jourDeParis } from './compagnon/journee';

/**
 * « VOTRE SEMAINE » (21/10/2026, le parcours de l'habitude,
 * `docs/superpowers/specs/2026-10-21-parcours-habitude-design.md`).
 *
 * La semaine écoulée, du lundi au dimanche à Paris : ce qui est rentré, les relances
 * parties, les clients qui ont payé, la date limite la plus proche, les huit dernières
 * semaines en barres, et la meilleure semaine depuis longtemps quand elle l'est. Le
 * module compose ; Convex lit (`convex/recouvrement/semaine.ts`).
 *
 * ⚠️ UNE SEMAINE VIDE NE FAIT RIEN : rien rentré, rien parti, aucune date limite à moins
 * de trente jours, et il n'y a ni carte, ni e-mail, ni écran à zéros.
 */

/** Une date limite plus lointaine ne suffit pas à faire une semaine. */
export const DATE_LIMITE_PROCHE_JOURS = 30;
/** « Meilleure semaine depuis… » ne se dit qu'au-delà de quatre semaines dépassées. */
export const SEMAINES_POUR_UN_RECORD = 4;

export interface VotreSemaine {
	readonly debut: string;
	readonly fin: string;
	readonly rentre: bigint;
	readonly relancesParties: number;
	readonly clientsQuiOntPaye: number;
	readonly dateLimiteDansJours: number | null;
	/** Les semaines depuis l'arrivée, huit au plus, de la plus ancienne à celle-ci. */
	readonly huitSemaines: bigint[];
	/** Le lundi de la dernière semaine qui la dépassait, ou `'arrivee'`. */
	readonly meilleureDepuis: string | null;
}

/** Le lundi de la semaine d'un jour (AAAA-MM-JJ). */
export function lundiDe(date: string): string {
	const jour = new Date(`${date}T12:00:00Z`).getUTCDay();
	return ajouterJours(date, -((jour + 6) % 7));
}

export function bornesDeLaSemaineEcoulee(maintenant: number): {
	readonly debut: string;
	readonly fin: string;
} {
	const debut = ajouterJours(lundiDe(jourDeParis(maintenant)), -7);
	return { debut, fin: ajouterJours(debut, 6) };
}

/**
 * LA MEILLEURE SEMAINE DEPUIS… La semaine dépasse les précédentes une à une, en
 * remontant ; au-delà de quatre, on nomme la dernière qui la dépassait, ou l'arrivée
 * quand rien ne l'a jamais dépassée.
 */
function meilleureDepuis(
	rentre: bigint,
	historique: readonly bigint[],
	datesDesSemaines: readonly string[],
	arriveeLe: string
): string | null {
	let depassees = 0;
	while (depassees < historique.length && rentre > historique[depassees]!) depassees += 1;
	if (depassees < SEMAINES_POUR_UN_RECORD) return null;
	if (depassees < historique.length) return datesDesSemaines[depassees] ?? null;
	const plusAncienne = datesDesSemaines[historique.length - 1];
	if (plusAncienne === undefined) return null;
	return plusAncienne <= lundiDe(arriveeLe) ? 'arrivee' : plusAncienne;
}

export function composerLaSemaine(d: {
	readonly debut: string;
	readonly fin: string;
	readonly paiements: readonly {
		readonly date: string;
		readonly montant: bigint;
		readonly debiteurId: string;
	}[];
	readonly relancesParties: number;
	readonly dateLimiteDansJours: number | null;
	/** Ce qui est rentré les semaines d'avant, de la plus récente à la plus ancienne. */
	readonly historique: readonly bigint[];
	/** Le lundi de chacune de ces semaines, dans le même ordre. */
	readonly datesDesSemaines: readonly string[];
	readonly arriveeLe: string;
}): VotreSemaine | null {
	const dansLaSemaine = d.paiements.filter((p) => p.date >= d.debut && p.date <= d.fin);
	const rentre = dansLaSemaine.reduce((total, p) => total + p.montant, 0n);
	const limiteProche =
		d.dateLimiteDansJours !== null && d.dateLimiteDansJours < DATE_LIMITE_PROCHE_JOURS;
	if (rentre === 0n && d.relancesParties === 0 && !limiteProche) return null;
	return {
		debut: d.debut,
		fin: d.fin,
		rentre,
		relancesParties: d.relancesParties,
		clientsQuiOntPaye: new Set(dansLaSemaine.map((p) => p.debiteurId)).size,
		dateLimiteDansJours: d.dateLimiteDansJours,
		huitSemaines: [...d.historique.slice(0, 7)].reverse().concat(rentre),
		meilleureDepuis: meilleureDepuis(rentre, d.historique, d.datesDesSemaines, d.arriveeLe)
	};
}
