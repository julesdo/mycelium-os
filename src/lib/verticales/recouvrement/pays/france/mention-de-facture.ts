import { PARAMETRES } from '../../parametres';
import { majorationEnChiffres } from './taux';

/**
 * LA MENTION DE RETARD QU'UNE FACTURE FRANÇAISE IMPRIME (28/10/2026).
 *
 * Le site dessine une facture de démonstration, et une facture porte, au mot près, les conditions
 * de retard : le taux des pénalités et le montant de l'indemnité forfaitaire pour frais de
 * recouvrement. C'est le vocabulaire du document lui-même, pas celui de l'interface ; il vit donc
 * ici, dans `pays/`, à côté des sources de droit, et se compose des valeurs du registre : la
 * majoration de L441-10 II et l'indemnité de D441-5.
 *
 * En deux morceaux : la page surligne l'un puis l'autre, quand elle les explique.
 */
export function mentionDeRetard(): { readonly penalites: string; readonly frais: string } {
	const indemnite = PARAMETRES.indemniteForfaitaire.valeur;
	if (typeof indemnite !== 'bigint' || indemnite % 100n !== 0n)
		throw new Error('Le registre ne donne pas l’indemnité forfaitaire en euros ronds.');
	return {
		penalites: `pénalités au taux de la BCE majoré de ${majorationEnChiffres()}`,
		frais: `indemnité forfaitaire pour frais de recouvrement de ${String(indemnite / 100n)} €`
	};
}
