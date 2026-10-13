import { describe, expect, it } from 'vitest';
import { santeDuPortefeuille, type ClientDuPortefeuille } from '../portefeuille';

/**
 * LA SANTÉ DU PORTEFEUILLE : pondérée par l'argent dehors, et des missions qui
 * mesurent ce que le logiciel voit vraiment.
 */

const MAINTENANT = Date.UTC(2026, 9, 13);

const client = (
	surcharge: Partial<ClientDuPortefeuille> & { id: string }
): ClientDuPortefeuille => ({
	nom: `Client ${surcharge.id}`,
	siren: '443061841',
	encours: 0n,
	plafond: null,
	analyse: null,
	...surcharge
});

const analyse = (indice: number, niveau: 'RIEN_A_SIGNALER' | 'PROCEDURE' | 'PRUDENCE') => ({
	indice,
	niveau,
	analyseLe: MAINTENANT,
	indicePrecedent: null,
	niveauPrecedent: null,
	faitPrincipal: null
});

describe('la santé du portefeuille', () => {
	it('pondère l’indice par ce qu’on vous doit', () => {
		const sante = santeDuPortefeuille(
			[
				client({ id: 'a', encours: 100_000_00n, analyse: analyse(10, 'PROCEDURE') }),
				client({ id: 'b', encours: 10_000_00n, analyse: analyse(90, 'RIEN_A_SIGNALER') }),
				client({ id: 'c', encours: 10_000_00n, analyse: analyse(90, 'RIEN_A_SIGNALER') })
			],
			MAINTENANT
		);
		// (10×100 000 + 90×20 000) / 120 000 = 23,3 : le gros client en procédure pèse.
		expect(sante.indice).toBe(23);
		expect(sante.niveau).toBe('RISQUE_ELEVE');
		expect(sante.aRegarder.map((r) => r.client.id)).toEqual(['a']);
	});

	it('mesure la couverture par trois missions, et dit à qui chacune manque', () => {
		const sante = santeDuPortefeuille(
			[
				client({
					id: 'gros',
					encours: 50_000_00n,
					analyse: analyse(80, 'RIEN_A_SIGNALER'),
					plafond: 60_000_00n
				}),
				client({ id: 'moyen', encours: 20_000_00n }),
				client({ id: 'anonyme', encours: 5_000_00n, siren: null }),
				// Ne doit rien : hors des missions.
				client({ id: 'quitte', encours: 0n, siren: null })
			],
			MAINTENANT
		);
		const [siren, analyses, plafonds] = sante.missions;
		expect(siren).toMatchObject({ faits: 2, total: 3, prochain: { id: 'anonyme' } });
		expect(analyses).toMatchObject({ faits: 1, total: 2, prochain: { id: 'moyen' } });
		expect(plafonds).toMatchObject({ faits: 1, total: 3, prochain: { id: 'moyen' } });
		// (2/3 + 1/2 + 1/3) / 3 = 50 %.
		expect(sante.couverture).toBe(50);
	});

	it('fait remonter un encours au-dessus du plafond, même sans analyse', () => {
		const sante = santeDuPortefeuille(
			[client({ id: 'a', encours: 12_000_00n, plafond: 10_000_00n })],
			MAINTENANT
		);
		expect(sante.aRegarder[0]).toMatchObject({ raison: 'Au-dessus de votre plafond' });
		expect(sante.indice).toBeNull();
	});

	it('signale une baisse franche, pas une variation', () => {
		const sante = santeDuPortefeuille(
			[
				client({
					id: 'chute',
					encours: 1n,
					analyse: {
						...analyse(48, 'PRUDENCE'),
						indicePrecedent: 66,
						niveauPrecedent: 'A_SURVEILLER' as never
					}
				}),
				client({
					id: 'stable',
					encours: 1n,
					analyse: {
						...analyse(78, 'RIEN_A_SIGNALER'),
						indicePrecedent: 81,
						niveauPrecedent: 'RIEN_A_SIGNALER'
					}
				})
			],
			MAINTENANT
		);
		expect(sante.changements.map((c) => [c.client.id, c.raison])).toEqual([['chute', '66 → 48']]);
	});
});
