import { describe, expect, it } from 'vitest';
import { FACTURE_DE_LA_LOI } from '../site/loi-demo';
import { RELEVE } from '../site/securite-demo';
import { VITRINE } from '../site/vitrine-demo';

/**
 * LE RELEVÉ DE LA SÉCURITÉ REÇOIT CE QUE LES CLIENTS DES AUTRES DÉMONSTRATIONS DOIVENT
 * (28/10/2026) : Durand sa facture de la loi, Vidal et Bâti-Sud ce que dit le téléphone.
 */
describe('le relevé de la sécurité', () => {
	it('reçoit les règlements des clients des démonstrations', () => {
		expect(RELEVE.virements.map(([, client, montant]) => [client, montant])).toEqual([
			[FACTURE_DE_LA_LOI.client, FACTURE_DE_LA_LOI.ttc],
			['Transports Vidal', VITRINE.clients.vidal],
			['Bâti-Sud', VITRINE.clients.bati]
		]);
		expect(RELEVE.rousseau).toBe(VITRINE.clients.rousseau);
	});
});
