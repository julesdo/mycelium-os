import { describe, expect, it } from 'vitest';
import { compositionDeLaSemaine } from '../semaine';
import type { VotreSemaine } from '../../lib/verticales/recouvrement/votre-semaine';

/**
 * « VOTRE SEMAINE » N'AFFICHE AUCUN CADRAN À ZÉRO (relecture du 21/10/2026, règle d'écran
 * n° 4) : une semaine sans paiement pose en grand ce qui s'est passé, et le relevé ne
 * porte que ce qui n'est pas nul. Elle ne promet pas non plus ce que Plume ne fera pas.
 */
const SANS_PAIEMENT: VotreSemaine = {
	debut: '2026-10-12',
	fin: '2026-10-18',
	rentre: 0n,
	relancesParties: 6,
	clientsQuiOntPaye: 0,
	dateLimiteDansJours: null,
	huitSemaines: [80_000n, 0n],
	meilleureDepuis: null
};

describe('la composition de « Votre semaine »', () => {
	it('pose les relances en grand quand rien n’est rentré, sans ligne à zéro', () => {
		const c = compositionDeLaSemaine(SANS_PAIEMENT, 0);
		expect(c.heros).toEqual({ genre: 'NOMBRE', nombre: 6, surTitre: 'Relances parties' });
		expect(c.lignes).toEqual([]);
		expect(c.cetteSemaine).not.toContain('en pose dès');
	});

	it('pose le montant quand de l’argent est rentré, et le relevé de ce qui n’est pas nul', () => {
		const c = compositionDeLaSemaine(
			{ ...SANS_PAIEMENT, rentre: 412_000n, clientsQuiOntPaye: 3, dateLimiteDansJours: 12 },
			4
		);
		expect(c.heros).toEqual({ genre: 'MONTANT', centimes: 412_000n });
		expect(c.lignes.map((l) => l.titre)).toEqual([
			'Relances parties',
			'Clients qui ont payé',
			'Date limite la plus proche'
		]);
	});
});
