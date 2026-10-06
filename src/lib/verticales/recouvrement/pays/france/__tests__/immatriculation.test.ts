import { describe, expect, it } from 'vitest';
import { centimesDuCapital, immatriculationDesAnnonces } from '../immatriculation';

// La forme exacte de `listepersonnes` au BODACC, relevée le 06/10/2026 sur
// l'annonce de création de BORROMIS PARTNERS (SIREN 130 699 242).
function annonce(date: string, personne: object): { dateparution: string; listepersonnes: string } {
	return { dateparution: date, listepersonnes: JSON.stringify({ personne }) };
}

const SIREN = '130699242';

function societe(capital: string | null, greffe = 'Antibes', numero = '130 699 242'): object {
	return {
		typePersonne: 'pm',
		numeroImmatriculation: {
			numeroIdentification: numero,
			codeRCS: 'RCS',
			nomGreffeImmat: greffe
		},
		denomination: 'BORROMIS PARTNERS',
		formeJuridique: 'Société par Actions Simplifiée',
		...(capital === null ? {} : { capital: { montantCapital: capital, devise: 'EUR' } })
	};
}

describe('immatriculationDesAnnonces', () => {
	it('prend le capital de l’annonce la plus récente qui en porte un, et son greffe', () => {
		const lue = immatriculationDesAnnonces(
			[
				annonce('2024-03-12', societe('1200.00')),
				// Une modification plus récente, sans capital : elle ne l'efface pas.
				annonce('2026-08-02', societe(null)),
				annonce('2025-11-18', societe('5000.00'))
			],
			SIREN
		);
		expect(lue).toEqual({
			capitalCentimes: 500000n,
			capitalPublieLe: '2025-11-18',
			registre: 'RCS',
			villeGreffe: 'Antibes',
			greffePublieLe: '2026-08-02'
		});
	});

	it('ignore une personne qui porte un autre SIREN', () => {
		expect(
			immatriculationDesAnnonces(
				[annonce('2026-10-06', societe('1200.00', 'Nice', '824 012 173'))],
				SIREN
			)
		).toBeNull();
	});

	it('écarte une annonce illisible, ou un capital dans une autre devise', () => {
		const enDollars = {
			...societe(null),
			capital: { montantCapital: '1000.00', devise: 'USD' }
		};
		const lue = immatriculationDesAnnonces(
			[
				{ dateparution: '2026-10-06', listepersonnes: '{pas du json' },
				annonce('2026-09-01', enDollars)
			],
			SIREN
		);
		expect(lue?.capitalCentimes).toBeNull();
		expect(lue?.villeGreffe).toBe('Antibes');
	});

	it('lit une annonce qui nomme plusieurs personnes', () => {
		const lue = immatriculationDesAnnonces(
			[
				{
					dateparution: '2026-10-06',
					listepersonnes: JSON.stringify({
						personne: [societe('100.00', 'Nice', '824 012 173'), societe('1200.00')]
					})
				}
			],
			SIREN
		);
		expect(lue?.capitalCentimes).toBe(120000n);
		expect(lue?.villeGreffe).toBe('Antibes');
	});
});

describe('centimesDuCapital', () => {
	it('coupe au point, sans flottant', () => {
		expect(centimesDuCapital('1200.00')).toBe(120000n);
		expect(centimesDuCapital('92199.6')).toBe(9219960n);
		expect(centimesDuCapital('100')).toBe(10000n);
	});

	it('refuse ce qui n’a pas la forme du registre', () => {
		expect(centimesDuCapital('1,200')).toBeNull();
		expect(centimesDuCapital('1 200.00')).toBeNull();
		expect(centimesDuCapital('-5.00')).toBeNull();
	});
});
