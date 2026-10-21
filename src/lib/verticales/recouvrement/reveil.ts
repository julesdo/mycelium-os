import { enEuros } from '../../notifications/paiements';
import { DATE_LIMITE_PROCHE_JOURS, delaiLisible } from './votre-semaine';

/**
 * LE RÉVEIL UTILE (21/10/2026, le parcours de l'habitude, moment 8,
 * `docs/superpowers/specs/2026-10-21-parcours-habitude-design.md`).
 *
 * Quatorze jours sans visite ET quelque chose de vrai depuis — un client qui a payé, une
 * relance partie, une date limite à moins de trente jours — font UN e-mail ; puis le
 * point du retour, à la visite. Rien de vrai : le silence. Le module décide et dit ;
 * Convex lit la dernière visite et les faits (`convex/recouvrement/reveil.ts`).
 *
 * ⚠️ JAMAIS UN REPROCHE (« vous n'êtes pas venu »), jamais un compte à rebours, jamais un
 * compteur à zéro : « Pendant votre absence », puis ce qui s'est passé.
 */

export const ABSENCE_POUR_UN_REVEIL_JOURS = 14;
const JOUR_MS = 24 * 60 * 60 * 1000;

export interface FaitsDuReveil {
	readonly paiements: number;
	readonly clientsQuiOntPaye: number;
	readonly rentre: bigint;
	readonly relancesParties: number;
	readonly dateLimiteDansJours: number | null;
}

export function absenceAssezLongue(derniereVisite: number, maintenant: number): boolean {
	return maintenant - derniereVisite >= ABSENCE_POUR_UN_REVEIL_JOURS * JOUR_MS;
}

function dateLimiteProche(f: FaitsDuReveil): boolean {
	return f.dateLimiteDansJours !== null && f.dateLimiteDansJours < DATE_LIMITE_PROCHE_JOURS;
}

export function quelqueChoseDeVrai(f: FaitsDuReveil): boolean {
	return f.paiements > 0 || f.relancesParties > 0 || dateLimiteProche(f);
}

/** La phrase et les rangées de l'e-mail : ce qui s'est passé, rien qui ne soit nul. */
export function composerLeReveil(f: FaitsDuReveil): {
	readonly phrase: string;
	readonly rangees: readonly { readonly libelle: string; readonly valeur: string }[];
} {
	const morceaux: string[] = [];
	if (f.clientsQuiOntPaye > 0) {
		morceaux.push(
			f.clientsQuiOntPaye > 1 ? `${f.clientsQuiOntPaye} clients ont payé` : 'un client a payé'
		);
	} else if (f.relancesParties > 0) {
		morceaux.push(
			f.relancesParties > 1
				? `${f.relancesParties} relances sont parties`
				: 'une relance est partie'
		);
	}
	if (dateLimiteProche(f)) morceaux.push('une date limite approche');
	const rangees = [
		...(f.rentre > 0n ? [{ libelle: 'Rentré', valeur: enEuros(f.rentre) }] : []),
		...(f.clientsQuiOntPaye > 0
			? [{ libelle: 'Clients qui ont payé', valeur: String(f.clientsQuiOntPaye) }]
			: []),
		...(f.relancesParties > 0
			? [{ libelle: 'Relances parties', valeur: String(f.relancesParties) }]
			: []),
		...(dateLimiteProche(f)
			? [{ libelle: 'Date limite la plus proche', valeur: delaiLisible(f.dateLimiteDansJours!) }]
			: [])
	];
	return { phrase: `Pendant votre absence : ${morceaux.join(', ')}.`, rangees };
}
