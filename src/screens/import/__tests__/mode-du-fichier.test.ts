import { describe, expect, it } from 'vitest';
import { modeDuFichier } from '../depots';

/**
 * PAR OÙ UN FICHIER DÉPOSÉ PART, ET LE PIÈGE D'ORDRE QUI S'Y CACHE.
 *
 * ⚠️ CE TEST EXISTE POUR UNE RÉGRESSION PRÉCISE. Un `text/xml` tombait dans la
 * branche `type.startsWith('text/')` et partait au parseur d'export comptable,
 * qui répondait « Format d'export non reconnu. Attendu : un FEC… » à une facture
 * électronique parfaitement lisible. Le défaut n'était pas dans la condition,
 * il était dans son ORDRE — et un test qui ne vérifierait que le cas
 * `application/xml` ne l'aurait jamais attrapé.
 */
describe('modeDuFichier', () => {
	it('envoie les trois formes de XML vers la lecture de facture', () => {
		// `text/xml` est le cas qui régressait : il doit passer AVANT `text/`.
		expect(modeDuFichier({ type: 'text/xml', name: 'facture.xml' })).toBe('FACTURE_DEPOSEE');
		expect(modeDuFichier({ type: 'application/xml', name: 'facture.xml' })).toBe('FACTURE_DEPOSEE');
		// Type MIME absent : fréquent sur un fichier glissé depuis un dossier.
		expect(modeDuFichier({ type: '', name: 'FA-2026-0042.xml' })).toBe('FACTURE_DEPOSEE');
	});

	it('laisse le FEC et le CSV à l’export comptable', () => {
		expect(modeDuFichier({ type: 'text/csv', name: 'ventes.csv' })).toBe('EXPORT_COMPTABLE');
		expect(modeDuFichier({ type: 'text/plain', name: 'FEC-2026.txt' })).toBe('EXPORT_COMPTABLE');
		// Un FEC glissé depuis un dossier arrive souvent sans type MIME.
		expect(modeDuFichier({ type: '', name: 'FEC-2026-exercice.txt' })).toBe('EXPORT_COMPTABLE');
	});

	it('envoie le PDF et les images à la lecture de facture', () => {
		expect(modeDuFichier({ type: 'application/pdf', name: 'f.pdf' })).toBe('FACTURE_DEPOSEE');
		expect(modeDuFichier({ type: 'image/jpeg', name: 'photo.jpg' })).toBe('FACTURE_DEPOSEE');
		expect(modeDuFichier({ type: '', name: 'scan.HEIC' })).toBe('FACTURE_DEPOSEE');
	});

	it('fait retomber l’inconnu sur le chemin qui ne coûte rien', () => {
		// Le doute va à l'export : il échoue franchement, avec un message lisible,
		// au lieu d'envoyer au modèle un fichier facturé que personne n'a demandé
		// de relire.
		expect(modeDuFichier({ type: 'application/zip', name: 'archive.zip' })).toBe(
			'EXPORT_COMPTABLE'
		);
	});
});
