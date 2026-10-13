import { jourDeParis } from '../lib/verticales/recouvrement/compagnon/journee';

/**
 * LES HEURES DE PLUME, DITES COMME ON LES DIT — « 14 h 30 », « demain à 9 h »,
 * « hier, 18 h 40 ». Heure de Paris, toujours : c'est celle des envois.
 *
 * Partagées par sa barre (\`app/compagnon.tsx\`) et sa page (\`routes/app/pilote.index.tsx\`) :
 * une capsule qui dirait « 14 h 30 » et une page qui dirait « 14:30 » pour la même
 * relance feraient douter de l'une des deux.
 *
 * ⚠️ RIEN DE CE QUI SE CALCULE NE LES LIT : elles ne font que dire une heure déjà
 * décidée par le serveur.
 */

const HEURE_DE_PARIS = new Intl.DateTimeFormat('fr-FR', {
	timeZone: 'Europe/Paris',
	hour: 'numeric',
	minute: '2-digit'
});
const JOUR_DE_PARIS = new Intl.DateTimeFormat('fr-FR', {
	timeZone: 'Europe/Paris',
	weekday: 'long'
});
const JOUR_ET_MOIS_DE_PARIS = new Intl.DateTimeFormat('fr-FR', {
	timeZone: 'Europe/Paris',
	day: 'numeric',
	month: 'long'
});
const JOUR_ET_MOIS_COURT_DE_PARIS = new Intl.DateTimeFormat('fr-FR', {
	timeZone: 'Europe/Paris',
	day: 'numeric',
	month: 'short'
});

const JOUR_MS = 86_400_000;

/** « 9 h », « 14 h 30 » : l'heure de Paris, comme on la dit. */
export function heureEnMots(instant: number): string {
	const [heures, minutes] = HEURE_DE_PARIS.format(new Date(instant)).split(':');
	return minutes === undefined || minutes === '00' ? `${heures} h` : `${heures} h ${minutes}`;
}

/** « aujourd'hui à 14 h 30 », « demain à 9 h », « lundi à 9 h » : quand part la suite. */
export function quandEnMots(instant: number): string {
	const heure = heureEnMots(instant);
	const jour = jourDeParis(instant);
	const maintenant = Date.now();
	if (jour === jourDeParis(maintenant)) return `aujourd’hui à ${heure}`;
	if (jour === jourDeParis(maintenant + JOUR_MS)) return `demain à ${heure}`;
	return `${JOUR_DE_PARIS.format(new Date(instant))} à ${heure}`;
}

/**
 * « hier, 18 h 40 », « lundi », « le 9 octobre » : depuis quand Plume fait son point.
 * `null` le jour même : il parle alors de « votre passage de 14 h 02 ».
 */
export function jourDuRetour(instant: number): string | null {
	const jour = jourDeParis(instant);
	const maintenant = Date.now();
	if (jour === jourDeParis(maintenant)) return null;
	if (jour === jourDeParis(maintenant - JOUR_MS)) return `hier, ${heureEnMots(instant)}`;
	if (maintenant - instant < 6 * JOUR_MS) return JOUR_DE_PARIS.format(new Date(instant));
	return `le ${JOUR_ET_MOIS_DE_PARIS.format(new Date(instant))}`;
}

/** « 14 h 02 » le jour même, « hier » la veille, « 12 oct. » avant : une tuile courte. */
export function heureOuJour(instant: number): string {
	const jour = jourDeParis(instant);
	const maintenant = Date.now();
	if (jour === jourDeParis(maintenant)) return heureEnMots(instant);
	if (jour === jourDeParis(maintenant - JOUR_MS)) return 'Hier';
	return JOUR_ET_MOIS_COURT_DE_PARIS.format(new Date(instant));
}
