import { depuisCentimes } from '../../socle/montants';
import { ajouterJours } from './calendrier';
import { composerRelance } from './relance';

/**
 * LA RELANCE D'EXEMPLE : celle que montre « Logo et couleurs », et celle que le
 * gérant s'envoie pour la voir dans sa propre boîte (23/10/2026).
 *
 * ⚠️ LE VRAI TEXTE, POUR UN CLIENT FICTIF. Le premier rappel du plan, composé par
 * le même moteur que ceux qui partent (`relance.ts`), au nom du gérant ; le client
 * et ses deux factures sont inventés, et l'écran le dit. Aucun vrai client ne
 * passe dans un aperçu ni dans un exemple.
 */

/** Le client de l'exemple. */
export const CLIENT_D_EXEMPLE = 'Atelier Martin';

export function relanceDExemple(
	creancier: string,
	aujourdHui: string
): { readonly objet: string; readonly corps: string } {
	const relance = composerRelance(1, {
		creancier,
		debiteur: CLIENT_D_EXEMPLE,
		factures: [
			{
				reference: 'FA-2026-0142',
				montantTTC: depuisCentimes(184_200n),
				dateEcheance: ajouterJours(aujourdHui, -21)
			},
			{
				reference: 'FA-2026-0157',
				montantTTC: depuisCentimes(62_040n),
				dateEcheance: ajouterJours(aujourdHui, -9)
			}
		],
		principalRestantDu: depuisCentimes(246_240n),
		santeDebiteur: 'SAINE',
		aujourdHui
	});
	if (!relance.disponible) throw new Error(`La relance d’exemple ne se compose pas : ${relance.constat}`);
	return { objet: relance.objet, corps: relance.corps };
}
