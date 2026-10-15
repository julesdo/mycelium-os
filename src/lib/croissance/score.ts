import type { DatesDesEtapes, Etape } from './etapes';

/**
 * LE SCORE D'UN ÉTABLISSEMENT, DE 0 À 100 (16/10/2026).
 *
 * Il dit au fondateur qui appeler d'abord. Il part de zéro et chaque règle nommée
 * ajoute ou retire ; il n'est montré qu'au fondateur, dans le point du lundi.
 */

export interface EntreeScore {
	readonly etapes: DatesDesEtapes;
	readonly derniereActivite: number;
	readonly maintenant: number;
	/** Le nombre de factures connues. */
	readonly factures: number;
	/** La dernière ouverture du choix de formule, s'il y en a eu une. */
	readonly interetFormuleLe: number | null;
	readonly membres: number;
}

const JOUR = 24 * 60 * 60 * 1000;

/** À partir de ce score, le fondateur appelle (une tâche quand Twenty arrivera). */
export const SEUIL_APPELER = 60;

const POIDS_DES_ETAPES: ReadonlyArray<readonly [Etape, number, string]> = [
	['ENTREPRISE', 5, 'Entreprise renseignée'],
	['FACTURES_DEPOSEES', 15, 'Factures déposées'],
	['MONTANT_REVELE', 20, 'Factures échues trouvées'],
	['RELANCES_ACTIVEES', 20, 'Relances activées'],
	['ESSAI', 10, 'Essai commencé'],
	['ABONNE', 10, 'Abonné'],
	['MONTEE_EN_GAMME', 5, 'Montée en gamme']
];

export function calculerScore(e: EntreeScore): { score: number; raisons: string[] } {
	let points = 0;
	const raisons: string[] = [];
	const ajouter = (n: number, raison: string) => {
		points += n;
		raisons.push(raison);
	};

	for (const [etape, poids, raison] of POIDS_DES_ETAPES) {
		if (e.etapes[etape] !== undefined) ajouter(poids, raison);
	}
	const absence = e.maintenant - e.derniereActivite;
	if (absence <= 3 * JOUR) ajouter(10, 'Venu ces trois derniers jours');
	else if (absence <= 7 * JOUR) ajouter(5, 'Venu cette semaine');
	else if (absence > 21 * JOUR) ajouter(-15, 'Absent depuis trois semaines');
	if (e.factures > 100) ajouter(10, 'Plus de 100 factures');
	else if (e.factures > 20) ajouter(5, 'Plus de 20 factures');
	if (e.interetFormuleLe !== null && e.maintenant - e.interetFormuleLe <= 14 * JOUR) {
		ajouter(10, 'A regardé les formules');
	}
	if (e.membres >= 2) ajouter(5, 'Équipe invitée');
	if (e.etapes.A_RISQUE !== undefined) ajouter(-10, 'À risque');

	return { score: Math.max(0, Math.min(100, points)), raisons };
}
