import { describe, it, expect } from 'vitest';
import { depuisEuros, versEuros, fraction, ZERO } from '../../../socle/montants';
import { diagnostiquer, reveler, separerParPeriode } from '../revelation';
import type { FacturePourRevelation } from '../revelation';

/**
 * LE DIAGNOSTIC EXPRESS (audit du 19/10/2026) : sur une période, ce que la loi ajoute
 * aux factures encore dues ET à celles qui ont été payées en retard, ce qui reste hors
 * de la période, et ce qu'on ne sait pas chiffrer.
 *
 * ⚠️ LES PAYÉES EN RETARD RESTENT HORS DE « CE QU'ON VOUS DOIT ». Leur principal est
 * rentré : les ranger avec les impayées ferait grossir un chiffre d'argent déjà encaissé.
 */

const DIX_POUR_CENT = fraction(10n, 100n);
const ARRETE = '2026-10-01';

function facture(surcharge: Partial<FacturePourRevelation> = {}): FacturePourRevelation {
	return {
		reference: 'F-001',
		montantExigible: depuisEuros('10000,00'),
		dateExigibilite: '2026-07-01',
		reglements: [],
		taux: [{ debut: '2025-01-01', taux: DIX_POUR_CENT }],
		statutPaiement: 'IMPAYEE',
		...surcharge
	};
}

const payeeLe = (date: string) => ({
	statutPaiement: 'SOLDEE' as const,
	reglements: [{ date, montant: depuisEuros('10000,00'), nature: 'PAIEMENT' as const }]
});

describe('le diagnostic', () => {
	it('sépare les impayées des payées en retard, et chiffre celles-ci jusqu’au paiement', () => {
		const d = diagnostiquer(
			[facture({ reference: 'F-1' }), facture({ reference: 'F-2', ...payeeLe('2026-08-01') })],
			null,
			ARRETE,
			'ACT_365'
		);
		expect(d.impayees.nombreFactures).toBe(1);
		expect(d.payeesEnRetard.lignes).toHaveLength(1);
		const ligne = d.payeesEnRetard.lignes[0]!;
		// 10 000 € à 10 % l'an pendant 31 jours (du 1er juillet au 1er août) = 84,93 €,
		// plus l'indemnité de 40 € : la facture était due à l'échéance, puis réglée après.
		expect(ligne.reference).toBe('F-2');
		expect(ligne.payeeLe).toBe('2026-08-01');
		expect(ligne.joursDeRetard).toBe(31);
		expect(versEuros(ligne.interets)).toBe('84,93');
		expect(versEuros(ligne.indemniteForfaitaire)).toBe('40,00');
		expect(versEuros(d.payeesEnRetard.supplement)).toBe('124,93');
		expect(d.supplementTotal).toBe(d.impayees.supplement + d.payeesEnRetard.supplement);
	});

	it('ne compte pas une facture payée à temps', () => {
		const d = diagnostiquer([facture(payeeLe('2026-06-25'))], null, ARRETE, 'ACT_365');
		expect(d.payeesEnRetard.lignes).toEqual([]);
		expect(d.payeesEnRetard.supplement).toBe(ZERO);
		expect(d.nonChiffrees).toEqual([]);
	});

	it('ne chiffre pas une facture dont la date de paiement n’est pas sûre, et le dit', () => {
		const d = diagnostiquer(
			[facture({ ...payeeLe('2026-09-30'), datesDeReglementSures: false })],
			null,
			ARRETE,
			'ACT_365'
		);
		expect(d.payeesEnRetard.lignes).toEqual([]);
		expect(d.nonChiffrees).toHaveLength(1);
		expect(d.nonChiffrees[0]!.raison).toMatch(/date de paiement/i);
	});

	it('compte à part ce qui est plus ancien que la période', () => {
		const d = diagnostiquer(
			[
				facture({ reference: 'ANCIENNE', dateExigibilite: '2026-03-01' }),
				facture({
					reference: 'PAYEE-AVANT',
					dateExigibilite: '2026-02-01',
					...payeeLe('2026-03-01')
				}),
				facture({
					reference: 'A-TEMPS-AVANT',
					dateExigibilite: '2026-02-01',
					...payeeLe('2026-01-15')
				}),
				// Due avant la période, payée dedans : elle est du diagnostic.
				facture({
					reference: 'PAYEE-DEDANS',
					dateExigibilite: '2026-06-01',
					...payeeLe('2026-07-15')
				}),
				facture({ reference: 'RECENTE' })
			],
			'2026-07-01',
			ARRETE,
			'ACT_365'
		);
		expect(d.horsPeriode.nombre).toBe(2);
		expect(versEuros(d.horsPeriode.principal)).toBe('10 000,00');
		expect(d.impayees.lignes.map((l) => l.reference)).toEqual(['RECENTE']);
		expect(d.payeesEnRetard.lignes.map((l) => l.reference)).toEqual(['PAYEE-DEDANS']);
	});

	it('compte les échéances supposées, et le dit sur la ligne', () => {
		const d = diagnostiquer(
			[
				facture({ reference: 'SANS-ECHEANCE', echeanceSupposee: true }),
				facture({ reference: 'PAYEE', echeanceSupposee: true, ...payeeLe('2026-08-01') })
			],
			null,
			ARRETE,
			'ACT_365'
		);
		expect(d.echeancesSupposees).toBe(2);
		expect(d.payeesEnRetard.lignes[0]!.echeanceSupposee).toBe(true);
	});
});

describe('la période', () => {
	it('garde tout quand il n’y a pas de plancher', () => {
		const { dansLaPeriode, horsPeriode } = separerParPeriode(
			[facture({ dateExigibilite: '2020-01-01' })],
			null
		);
		expect(dansLaPeriode).toHaveLength(1);
		expect(horsPeriode).toEqual({ nombre: 0, principal: ZERO });
	});

	it('ne compte hors période ni une facture à échoir, ni une payée à temps', () => {
		const { horsPeriode } = separerParPeriode(
			[facture({ dateExigibilite: '2026-02-01', ...payeeLe('2026-01-10') })],
			'2026-07-01'
		);
		expect(horsPeriode.nombre).toBe(0);
	});
});

describe('une date de règlement qu’on ne connaît pas', () => {
	it('écarte de « ce qui est dû » une facture partiellement payée, en le disant', () => {
		// Une date de lecture au lieu de la date du paiement ferait courir les pénalités
		// sur un principal déjà réduit : le chiffre serait trop haut.
		const r = reveler(
			[
				facture({
					statutPaiement: 'PARTIELLEMENT_PAYEE',
					reglements: [{ date: '2026-09-01', montant: depuisEuros('2000,00'), nature: 'PAIEMENT' }],
					datesDeReglementSures: false
				})
			],
			ARRETE,
			'ACT_365'
		);
		expect(r.nombreFactures).toBe(0);
		expect(r.nonChiffrees).toHaveLength(1);
	});
});
