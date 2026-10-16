import { bornesDuJourDeParis, jourDeParis } from '../admin/dates';
import { estJourOuvrable } from '../verticales/recouvrement/delais';

/**
 * LES HORAIRES DE L'ÉQUIPE, ET LA RÉPONSE ATTENDUE (16/10/2026).
 *
 * Ce que le support dit au gérant se CALCULE : jamais « 24/7 », jamais une position dans une
 * file, jamais un délai tapé. L'équipe répond en semaine, de 9 h à 18 h, heure de Paris, hors
 * jours fériés (`estJourOuvrable`, qui lit le référentiel) ; la réponse est attendue après
 * `DELAI_VISE_HEURES_OUVREES` heures ouvrées, arrondie à l'heure pleine suivante. C'est une
 * attente annoncée, pas un engagement : le mot interdit ne s'écrit pas, et la médiane mesurée
 * remplace cette estimation dès qu'il y a de quoi la calculer (`MEDIANE_A_PARTIR_DE`).
 *
 * Les changements d'heure ont lieu dans la nuit du samedi au dimanche : un jour ouvrable n'en
 * connaît jamais, et minuit + 9 h y vaut toujours 9 h à Paris.
 */

export const HORAIRES_DU_SUPPORT = { de: 9, a: 18 } as const;

/** Ce que l'équipe se donne pour répondre, en heures ouvrées. */
export const DELAI_VISE_HEURES_OUVREES = 4;

/** Sous ce nombre de réponses en trente jours, une médiane ne mesure rien : on dit les horaires. */
export const MEDIANE_A_PARTIR_DE = 20;

const HEURE_MS = 60 * 60 * 1000;
const JOUR_MS = 24 * HEURE_MS;

/** La fenêtre d'ouverture du jour de Paris qui contient `instant`, ou `null` un jour fermé. */
function fenetreDuJour(instant: number): { debut: number; fin: number } | null {
	if (!estJourOuvrable(jourDeParis(instant))) return null;
	const { debut } = bornesDuJourDeParis(instant);
	return {
		debut: debut + HORAIRES_DU_SUPPORT.de * HEURE_MS,
		fin: debut + HORAIRES_DU_SUPPORT.a * HEURE_MS
	};
}

/** Les fenêtres d'ouverture à partir de `depuis`, jour après jour (au plus `jours`). */
function* fenetres(depuis: number, jours = 60): Generator<{ debut: number; fin: number }> {
	let curseur = bornesDuJourDeParis(depuis).debut;
	for (let i = 0; i < jours; i++) {
		// Midi : on est sûr d'être dans le bon jour de Paris.
		const fenetre = fenetreDuJour(curseur + 12 * HEURE_MS);
		if (fenetre !== null && fenetre.fin > depuis) {
			yield { debut: Math.max(fenetre.debut, depuis), fin: fenetre.fin };
		}
		curseur = bornesDuJourDeParis(curseur + 26 * HEURE_MS).debut;
	}
}

export function estOuvert(instant: number): boolean {
	const fenetre = fenetreDuJour(instant);
	return fenetre !== null && instant >= fenetre.debut && instant < fenetre.fin;
}

/**
 * L'instant où la réponse est attendue : `DELAI_VISE_HEURES_OUVREES` heures ouvrées après
 * `depuis` (ou après le retour de l'équipe, si elle est absente), arrondi à l'heure pleine.
 */
export function reponseAttendue(depuis: number, absentJusquAu?: number): number {
	const depart = absentJusquAu !== undefined && absentJusquAu > depuis ? absentJusquAu : depuis;
	let reste = DELAI_VISE_HEURES_OUVREES * HEURE_MS;
	for (const { debut, fin } of fenetres(depart)) {
		const duree = fin - debut;
		if (duree >= reste) {
			const instant = debut + reste;
			return Math.ceil(instant / HEURE_MS) * HEURE_MS;
		}
		reste -= duree;
	}
	return depart + JOUR_MS;
}

/** Les heures ouvrées écoulées entre deux instants (pour les délais mesurés). */
export function heuresOuvreesEntre(de: number, a: number): number {
	if (a <= de) return 0;
	let total = 0;
	for (const { debut, fin } of fenetres(de, Math.ceil((a - de) / JOUR_MS) + 2)) {
		if (debut >= a) break;
		total += Math.min(fin, a) - debut;
	}
	return total / HEURE_MS;
}

const JOUR_DE_LA_SEMAINE = new Intl.DateTimeFormat('fr-FR', {
	timeZone: 'Europe/Paris',
	weekday: 'long'
});
const JOUR_ET_MOIS = new Intl.DateTimeFormat('fr-FR', {
	timeZone: 'Europe/Paris',
	day: 'numeric',
	month: 'long'
});
const HEURE = new Intl.DateTimeFormat('fr-FR', {
	timeZone: 'Europe/Paris',
	hour: 'numeric',
	hourCycle: 'h23'
});

/** « aujourd'hui avant 17 h », « demain avant 10 h », « lundi avant 13 h », « le 21 octobre avant 13 h ». */
export function phraseDeReponseAttendue(instant: number, maintenant: number): string {
	// La partie « heure » seule : le format français rend « 10 h », que `Number` ne lit pas.
	const partieHeure = HEURE.formatToParts(new Date(instant)).find((p) => p.type === 'hour')?.value;
	const heure = `${Number(partieHeure)} h`;
	const ecart = Math.round(
		(Date.parse(`${jourDeParis(instant)}T12:00:00Z`) -
			Date.parse(`${jourDeParis(maintenant)}T12:00:00Z`)) /
			JOUR_MS
	);
	if (ecart <= 0) return `aujourd’hui avant ${heure}`;
	if (ecart === 1) return `demain avant ${heure}`;
	if (ecart <= 5) return `${JOUR_DE_LA_SEMAINE.format(new Date(instant))} avant ${heure}`;
	return `le ${JOUR_ET_MOIS.format(new Date(instant))} avant ${heure}`;
}

/** « L'équipe répond en semaine, de 9 h à 18 h. » — lu sur la constante, jamais tapé ailleurs. */
export function phraseDesHoraires(): string {
	return `L’équipe répond en semaine, de ${HORAIRES_DU_SUPPORT.de} h à ${HORAIRES_DU_SUPPORT.a} h.`;
}
