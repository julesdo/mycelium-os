import { describe, it, expect } from 'vitest';
import { cleEvenement, clesNouvelles } from '../briefing';
import { depuisCentimes } from '../../../socle/montants';
import type { Evenement } from '../surveillance';

/**
 * L'IDENTITÉ D'UN ÉVÉNEMENT, ET POURQUOI ELLE NE PEUT PAS ÊTRE LE MONTANT.
 *
 * Le montant d'un événement CHANGE tous les jours : les intérêts courent. Si la
 * clé le portait, chaque événement paraîtrait nouveau chaque matin, et le
 * briefing crierait tous les jours — exactement ce qu'on veut éviter.
 *
 * Le type et la référence, eux, sont stables tant que la situation l'est.
 */
function evenement(partiel: Partial<Evenement> = {}): Evenement {
	return {
		type: 'FACTURE_ECHUE',
		reference: 'FA-2026-0001',
		montant: depuisCentimes(100_000n),
		urgence: 'NORMALE',
		explication: 'La facture est échue.',
		action: 'Rattacher cette facture à une créance.',
		...partiel
	};
}

describe('cleEvenement', () => {
	it('identifie par le type et la référence', () => {
		expect(cleEvenement(evenement())).toBe('FACTURE_ECHUE:FA-2026-0001');
	});

	it('ne change pas quand le montant change', () => {
		// Les intérêts courent chaque nuit. Si la clé bougeait avec eux, le
		// briefing annoncerait un « nouveau point » tous les matins.
		const hier = evenement({ montant: depuisCentimes(100_000n) });
		const aujourdHui = evenement({ montant: depuisCentimes(100_042n) });
		expect(cleEvenement(aujourdHui)).toBe(cleEvenement(hier));
	});

	it('distingue deux types sur la même référence', () => {
		const echue = evenement({ type: 'FACTURE_ECHUE', reference: 'FA-1' });
		const prescrite = evenement({ type: 'PRESCRIPTION_PROCHE', reference: 'FA-1' });
		expect(cleEvenement(echue)).not.toBe(cleEvenement(prescrite));
	});
});

describe('clesNouvelles', () => {
	it('rend les événements absents du relevé précédent', () => {
		const evenements = [
			evenement({ reference: 'FA-1' }),
			evenement({ reference: 'FA-2' }),
			evenement({ reference: 'FA-3' })
		];
		const connues = ['FACTURE_ECHUE:FA-1', 'FACTURE_ECHUE:FA-3'];
		expect(clesNouvelles(evenements, connues)).toEqual(['FACTURE_ECHUE:FA-2']);
	});

	it('rend tout quand rien n’est connu', () => {
		const evenements = [evenement({ reference: 'FA-1' })];
		expect(clesNouvelles(evenements, [])).toEqual(['FACTURE_ECHUE:FA-1']);
	});

	it('rend une liste vide quand rien n’a bougé', () => {
		const evenements = [evenement({ reference: 'FA-1' })];
		expect(clesNouvelles(evenements, ['FACTURE_ECHUE:FA-1'])).toEqual([]);
	});
});
