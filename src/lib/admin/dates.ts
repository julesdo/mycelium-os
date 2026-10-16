/**
 * LES DATES DE L'ADMIN, À PARIS (16/10/2026).
 *
 * Une tâche due « aujourd'hui » l'est à Paris, pas à Greenwich : due hier à 23 h,
 * elle est en retard d'un jour dès minuit, heure de Paris. Le retard se dit en
 * jours, à l'encre (« en retard de 2 j ») — jamais aux couleurs de seuil.
 *
 * ⚠️ SANS HORLOGE : l'instant présent est un argument, comme partout dans le produit.
 */

const JOUR_MS = 24 * 60 * 60 * 1000;

const PARTIES = new Intl.DateTimeFormat('en-CA', {
	timeZone: 'Europe/Paris',
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
	hour: '2-digit',
	minute: '2-digit',
	hourCycle: 'h23'
});

const JOUR_EN_LETTRES = new Intl.DateTimeFormat('fr-FR', {
	timeZone: 'Europe/Paris',
	weekday: 'long',
	day: 'numeric',
	month: 'long'
});

const JOUR_EN_LETTRES_AVEC_ANNEE = new Intl.DateTimeFormat('fr-FR', {
	timeZone: 'Europe/Paris',
	day: 'numeric',
	month: 'long',
	year: 'numeric'
});

const DATE_COURTE = new Intl.DateTimeFormat('fr-FR', {
	timeZone: 'Europe/Paris',
	day: 'numeric',
	month: 'short',
	year: 'numeric'
});

function parties(instant: number) {
	const p = Object.fromEntries(
		PARTIES.formatToParts(new Date(instant)).map((x) => [x.type, x.value])
	) as Record<string, string>;
	return {
		annee: Number(p.year),
		mois: Number(p.month),
		jour: Number(p.day),
		heure: Number(p.hour),
		minute: Number(p.minute)
	};
}

/** Le jour (`AAAA-MM-JJ`) qu'il est à Paris à cet instant. */
export function jourDeParis(instant: number): string {
	const { annee, mois, jour } = parties(instant);
	return `${annee}-${String(mois).padStart(2, '0')}-${String(jour).padStart(2, '0')}`;
}

/** L'écart en jours entre deux jours `AAAA-MM-JJ`, comptés à midi UTC. */
function ecartEnJours(de: string, a: string): number {
	return Math.round((Date.parse(`${a}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / JOUR_MS);
}

/**
 * Minuit à Paris, le jour de cet instant, et minuit le lendemain. L'écart entre
 * l'heure de Paris et l'heure UTC se lit à l'instant même ; les changements d'heure
 * ont lieu la nuit, jamais à minuit.
 */
export function bornesDuJourDeParis(instant: number): { debut: number; fin: number } {
	const debut = minuitDeParis(instant);
	// Vingt-six heures plus tard : on est le lendemain, quel que soit le changement d'heure.
	return { debut, fin: minuitDeParis(debut + 26 * 60 * 60 * 1000) };
}

function minuitDeParis(instant: number): number {
	const p = parties(instant);
	const murDeParis = Date.UTC(p.annee, p.mois - 1, p.jour, p.heure, p.minute);
	const decalage = murDeParis - Math.floor(instant / 60_000) * 60_000;
	return Date.UTC(p.annee, p.mois - 1, p.jour) - decalage;
}

/** Quand une tâche est due, dit en distance : « en retard de 2 j », « aujourd'hui », « dans 3 j ». */
export function echeanceDeTache(
	pour: number,
	maintenant: number
): { texte: string; enRetard: boolean } {
	const ecart = ecartEnJours(jourDeParis(maintenant), jourDeParis(pour));
	if (ecart < 0) return { texte: `en retard de ${-ecart} j`, enRetard: true };
	if (ecart === 0) return { texte: 'aujourd’hui', enRetard: false };
	if (ecart === 1) return { texte: 'demain', enRetard: false };
	if (ecart <= 90) return { texte: `dans ${ecart} j`, enRetard: false };
	return { texte: dateCourteDeParis(pour), enRetard: false };
}

/** « Aujourd'hui », « Hier », puis « Lundi 12 octobre » (l'année si ce n'est pas la même). */
export function libelleDuJour(instant: number, maintenant: number): string {
	const ecart = ecartEnJours(jourDeParis(instant), jourDeParis(maintenant));
	if (ecart === 0) return 'Aujourd’hui';
	if (ecart === 1) return 'Hier';
	const texte =
		parties(instant).annee === parties(maintenant).annee
			? JOUR_EN_LETTRES.format(new Date(instant))
			: JOUR_EN_LETTRES_AVEC_ANNEE.format(new Date(instant));
	return texte.charAt(0).toUpperCase() + texte.slice(1);
}

/** L'heure à Paris, « 09:30 ». */
export function heureDeParis(instant: number): string {
	const { heure, minute } = parties(instant);
	return `${String(heure).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/** « 16 oct. 2026 », à Paris. */
export function dateCourteDeParis(instant: number): string {
	return DATE_COURTE.format(new Date(instant));
}

/** Des éléments datés, groupés par jour de Paris, dans l'ordre où ils arrivent. */
export function grouperParJour<T extends { readonly le: number }>(
	elements: readonly T[],
	maintenant: number
): { cle: string; jour: string; elements: T[] }[] {
	const groupes: { cle: string; jour: string; elements: T[] }[] = [];
	for (const element of elements) {
		const cle = jourDeParis(element.le);
		const dernier = groupes[groupes.length - 1];
		if (dernier !== undefined && dernier.cle === cle) dernier.elements.push(element);
		else groupes.push({ cle, jour: libelleDuJour(element.le, maintenant), elements: [element] });
	}
	return groupes;
}
