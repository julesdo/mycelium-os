import { describe, expect, it } from 'vitest';
import { destinationDeNotification } from '../notifications';

/**
 * LES LIENS DES NOTIFICATIONS — une notification garde le lien de sa nuit, et la
 * boîte de réception doit les relire tous. Une graphie qu'on cesse de lire ne
 * lève rien : la carte s'affiche, et ne mène plus nulle part, en silence.
 */
const SAIT = {
	estUneCreance: (id: string) => id === 'cre_1',
	estUnClient: (id: string) => id === 'deb_1'
};

describe('destinationDeNotification', () => {
	it('relit les graphies écrites depuis le 8 octobre 2026', () => {
		expect(destinationDeNotification('/app/dossier/cre_1', SAIT)).toEqual({
			vers: '/app/dossier/$id',
			parametres: { id: 'cre_1' }
		});
		expect(destinationDeNotification('/app/clients/deb_1', SAIT)).toEqual({
			vers: '/app/clients/$id',
			parametres: { id: 'deb_1' }
		});
	});

	it('relit les deux graphies d’avant la bascule vers leurs pages d’aujourd’hui', () => {
		expect(destinationDeNotification('/app/creance/cre_1', SAIT)?.vers).toBe('/app/dossier/$id');
		expect(destinationDeNotification('/app/debiteurs?d=deb_1', SAIT)?.vers).toBe(
			'/app/clients/$id'
		);
	});

	it('résout `?ligne=` par ce qui existe, et ne devine jamais', () => {
		expect(destinationDeNotification('/app?ligne=cre_1', SAIT)?.vers).toBe('/app/dossier/$id');
		expect(destinationDeNotification('/app?ligne=deb_1', SAIT)?.vers).toBe('/app/clients/$id');
		// Ni un dossier ni un client connu : ouvrir au hasard mènerait chez un autre.
		expect(destinationDeNotification('/app?ligne=inconnu', SAIT)).toBeUndefined();
		expect(destinationDeNotification('/ailleurs', SAIT)).toBeUndefined();
	});

	it('accepte le tiret des identifiants de la salle d’exposition', () => {
		// `\w` ne contient pas le tiret : la salle rendait jadis une carte sans lien.
		expect(destinationDeNotification('/app/dossier/demo-creance-durand', SAIT)?.vers).toBe(
			'/app/dossier/$id'
		);
	});
});
