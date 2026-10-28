import { describe, expect, it } from 'vitest';
import {
	INDICE_DE_DEPART,
	SEUIL_A_SURVEILLER,
	SEUIL_PRUDENCE
} from '../../lib/verticales/recouvrement/risque/regles';
import { ECHEANCIER, SANTE, tuile } from '../site/tout-demo';

/**
 * LES TUILES CHIFFRENT CE QUE LE PRODUIT CALCULE (28/10/2026).
 *
 * Le cadran de la santé suit l'analyse du risque, fait après fait : si un poids change dans
 * `risque/regles.ts`, la tuile change avec lui, et ce test dit de combien.
 */
describe('les tuiles de « Tout ce qui va avec »', () => {
	it('font partir l’indice de son départ et passer par chaque fait', () => {
		expect(SANTE.depart).toBe(INDICE_DE_DEPART);
		expect(SANTE.chemin.at(-1)).toBe(SANTE.indice);
		expect(SANTE.faits).toHaveLength(SANTE.chemin.length);
		expect(SANTE.indice).toBeGreaterThanOrEqual(SEUIL_PRUDENCE);
		expect(SANTE.indice).toBeLessThan(SEUIL_A_SURVEILLER);
		expect(SANTE.niveau).toBe('prudence');
	});

	it('suivent un paiement en trois fois qui s’additionne au total', () => {
		expect(ECHEANCIER.versements.reduce((s, v) => s + v.montant, 0)).toBe(ECHEANCIER.total);
		expect(ECHEANCIER.versements.map((v) => v.date)).toEqual(['1er oct.', '1er nov.', '1er déc.']);
		expect(ECHEANCIER.versements[1]?.dans).toBe(4);
	});

	it('disent la phrase du registre, et l’indice de départ qu’elle cite', () => {
		expect(tuile('sante').phrase).toContain(`part de ${INDICE_DE_DEPART}`);
	});
});
