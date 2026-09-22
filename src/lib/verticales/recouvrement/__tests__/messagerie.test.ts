import { describe, expect, it } from 'vitest';
import {
	adresseMessagerie,
	tientDansLaMessagerie,
	PLAFOND_MAILTO
} from '../messagerie';

/**
 * CE QUI CASSE UNE RELANCE OUVERTE DANS UNE MESSAGERIE.
 *
 * Deux familles : l'encodage, qui abîme le texte sans rien dire, et la
 * longueur, qui fait échouer l'ouverture en silence.
 */

describe('adresseMessagerie', () => {
	it('encode les sauts de ligne en %0D%0A, et jamais en %0A seul', () => {
		const { url } = adresseMessagerie({
			destinataire: 'compta@exemple.fr',
			objet: 'Facture en attente',
			corps: 'Bonjour,\nVotre facture.\r\nCordialement.'
		});
		expect(url).toContain('%0D%0A');
		// Un « \n » resté seul serait rendu comme une espace par certains clients :
		// le brouillon arriverait en un seul paragraphe.
		expect(url.replace(/%0D%0A/g, '')).not.toContain('%0A');
		// Et un « \r\n » déjà présent ne doit pas devenir « \r\r\n ».
		expect(url).not.toContain('%0D%0D');
	});

	it('encode l’euro, le tiret cadratin et l’apostrophe typographique', () => {
		const { url } = adresseMessagerie({
			destinataire: 'compta@exemple.fr',
			objet: 'Compte arrêté',
			corps: '1 234,56 € — d’un commun accord'
		});
		expect(url).toContain('%E2%82%AC');
		expect(url).toContain('%E2%80%94');
		expect(url).toContain('%E2%80%99');
	});

	it('encode l’apostrophe droite, qu’encodeURIComponent laisse passer', () => {
		// Certains clients coupent le corps à la première apostrophe non encodée,
		// et une relance française en contient toujours une.
		const { url } = adresseMessagerie({
			destinataire: 'compta@exemple.fr',
			objet: 'Objet',
			corps: "l'echeance est depassee"
		});
		expect(url).toContain('%27');
		expect(url).not.toMatch(/body=[^&]*'/);
	});

	it('rend une adresse sans destinataire ET le signale', () => {
		const sans = adresseMessagerie({ destinataire: undefined, objet: 'O', corps: 'C' });
		expect(sans.sansDestinataire).toBe(true);
		expect(sans.url.startsWith('mailto:?')).toBe(true);

		// Une chaîne vide ou blanche vaut absence : un destinataire fait d'espaces
		// ouvrirait un brouillon dont le « À : » a l'air rempli.
		expect(adresseMessagerie({ destinataire: '   ', objet: 'O', corps: 'C' }).sansDestinataire).toBe(
			true
		);
		expect(
			adresseMessagerie({ destinataire: 'a@b.fr', objet: 'O', corps: 'C' }).sansDestinataire
		).toBe(false);
	});

	it('rend la longueur de l’URL, celle qui décide', () => {
		const { url, longueur } = adresseMessagerie({
			destinataire: 'compta@exemple.fr',
			objet: 'Facture en attente',
			corps: 'Bonjour,'
		});
		expect(longueur).toBe(url.length);
	});
});

describe('tientDansLaMessagerie', () => {
	it('laisse passer une relance courte', () => {
		const { longueur } = adresseMessagerie({
			destinataire: 'compta@exemple.fr',
			objet: 'Facture FA-2026-0042 en attente de règlement',
			corps: [
				'Bonjour,',
				'',
				'Sauf erreur de notre part, la facture FA-2026-0042 du 15 juillet 2026,',
				'd’un montant de 1 200,00 €, reste impayée à ce jour.',
				'',
				'Cordialement.'
			].join('\n')
		});
		expect(tientDansLaMessagerie(longueur)).toBe(true);
	});

	it('refuse une relance qui porte vingt factures', () => {
		// Les mesures sur les gabarits réels placent la rupture entre la 14e et la
		// 15e facture au niveau 1 : vingt lignes sont franchement au-delà.
		const lignes = Array.from(
			{ length: 20 },
			(_, i) => `  · FA-2026-${String(i).padStart(4, '0')} du 15 juillet 2026 — 1 234,56 €`
		);
		const { longueur } = adresseMessagerie({
			destinataire: 'comptabilite@ateliers-martin.fr',
			objet: 'Factures en attente de règlement',
			corps: ['Bonjour,', '', ...lignes, '', 'Cordialement.'].join('\n')
		});
		expect(longueur).toBeGreaterThan(PLAFOND_MAILTO);
		expect(tientDansLaMessagerie(longueur)).toBe(false);
	});

	it('place la frontière au plafond inclus', () => {
		expect(tientDansLaMessagerie(PLAFOND_MAILTO)).toBe(true);
		expect(tientDansLaMessagerie(PLAFOND_MAILTO + 1)).toBe(false);
	});

	it('garde une marge sous les deux seuils qui cassent en silence', () => {
		// 2 046 : Chrome affiche son invite et rien ne se passe.
		// 2 083 : Windows tronque l'URL sans le dire.
		expect(PLAFOND_MAILTO).toBeLessThan(2046);
	});
});
