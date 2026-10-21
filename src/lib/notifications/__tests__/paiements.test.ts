import { describe, expect, it } from 'vitest';
import { regrouperLesPaiements } from '../paiements';

/** Les espaces insécables du format français, rendues lisibles pour comparer. */
const lisible = (s: string) => s.replace(/[  ]/g, ' ');

describe('les paiements reçus d’un import', () => {
	it('ne dit rien quand rien n’est rentré', () => {
		expect(regrouperLesPaiements([])).toBeNull();
	});

	it('nomme le client quand un seul a payé', () => {
		const n = regrouperLesPaiements([{ client: 'Garage Martin', montant: 124_000n }]);
		expect(n?.titre).toBe('Garage Martin vous a payé');
		expect(lisible(n?.message ?? '')).toBe('1 240 € rapprochés sur ses factures.');
	});

	it('fait une seule notification pour plusieurs paiements, comptés par client', () => {
		const n = regrouperLesPaiements([
			{ client: 'Garage Martin', montant: 124_000n },
			{ client: 'Garage Martin', montant: 50_000n },
			{ client: 'Transports Vidal', montant: 238_000n }
		]);
		expect(n?.titre).toBe('2 clients vous ont payé');
		expect(lisible(n?.message ?? '')).toBe('4 120 € au total.');
	});
});
