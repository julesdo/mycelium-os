import { FACTURE_DE_LA_LOI as F } from './loi-demo';
import { VITRINE } from './vitrine-demo';

/**
 * LE RELEVÉ DE COMPTE DE LA SÉCURITÉ (28/10/2026).
 *
 * Les trois virements qui arrivent sont ceux des clients du téléphone de l'en-tête : Durand règle
 * sa facture de la loi, Vidal et Bâti-Sud ce qu'ils doivent (`vitrine-demo.ts`). Le solde de
 * départ est une fiction de démonstration. Ce qui passe par Letikette reste à zéro : la ligne
 * rouge n° 2, aucun fonds ne passe par nous.
 */
export const RELEVE = {
	solde: 4_128_015,
	rousseau: VITRINE.clients.rousseau,
	virements: [
		['28 oct.', F.client, F.ttc],
		['28 oct.', 'Transports Vidal', VITRINE.clients.vidal],
		['29 oct.', 'Bâti-Sud', VITRINE.clients.bati]
	] as const satisfies readonly (readonly [string, string, number])[]
};
