import { describe, expect, it } from 'vitest';
import { verdictAvantEnvoi } from '../../../../socle/coffre/fichiers';
import { modeDeLecture } from '../mode';

/** Le mode d'un fichier, d'après son nom seul : ce que le coffre voit avant les octets. */
function modeDu(nom: string) {
	const verdict = verdictAvantEnvoi(nom, 100);
	if (!verdict.accepte) throw new Error(verdict.raison);
	return modeDeLecture(verdict.nature, verdict.mime);
}

describe('par où se lit une facture déposée', () => {
	it('lit une facture électronique XML comme une facture, jamais comme un export', () => {
		expect(modeDu('FA-2026-0042.xml')).toBe('FACTURE_DEPOSEE');
	});

	it('lit un FEC ou un CSV comme un export comptable', () => {
		expect(modeDu('FEC-2026.txt')).toBe('EXPORT_COMPTABLE');
		expect(modeDu('ventes.csv')).toBe('EXPORT_COMPTABLE');
		expect(modeDu('ventes.tsv')).toBe('EXPORT_COMPTABLE');
	});

	it('lit un PDF ou une photo comme une facture document', () => {
		expect(modeDu('facture.pdf')).toBe('FACTURE_DEPOSEE');
		expect(modeDu('photo.jpg')).toBe('FACTURE_DEPOSEE');
		expect(modeDu('scan.png')).toBe('FACTURE_DEPOSEE');
	});
});
