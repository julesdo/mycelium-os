import type { Evenement } from './surveillance';

/**
 * LE BRIEFING DU MATIN — la règle, séparée de la plomberie.
 *
 * Ce fichier décide ce que le produit a à dire, et surtout S'IL A QUELQUE CHOSE
 * À DIRE. Il ne sait ni lire une base, ni envoyer un courriel : c'est ce qui le
 * rend testable en trois secondes et opposable à la relecture.
 *
 * La plomberie vit dans `convex/recouvrement/battement.ts` et ne porte aucune
 * règle.
 */

/**
 * L'identité d'un événement, stable d'un jour à l'autre.
 *
 * ⚠️ ELLE NE PORTE PAS LE MONTANT, ET C'EST ESSENTIEL. Les intérêts courent
 * chaque nuit : un montant dans la clé ferait paraître chaque événement nouveau
 * chaque matin, et le briefing crierait tous les jours.
 */
export function cleEvenement(evenement: Pick<Evenement, 'type' | 'reference'>): string {
	return `${evenement.type}:${evenement.reference}`;
}

/** Les clés présentes aujourd'hui et absentes du dernier relevé. */
export function clesNouvelles(
	evenements: readonly Evenement[],
	connues: readonly string[]
): string[] {
	const deja = new Set(connues);
	return evenements.map(cleEvenement).filter((cle) => !deja.has(cle));
}
