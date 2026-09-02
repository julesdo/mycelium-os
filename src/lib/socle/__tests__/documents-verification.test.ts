import { describe, it, expect } from 'vitest';
import { verifierExtraction } from '../documents/verification';
import type { DocumentExtrait } from '../documents/schema';

const doc = (
	lignes: Array<{ amountHT: number; vatRate: number | null }>,
	totaux: DocumentExtrait['totaux']
): DocumentExtrait => ({
	supplierName: null,
	invoiceNumber: null,
	invoiceDate: null,
	lignes: lignes.map((l, i) => ({
		rawLabel: `P${i}`,
		quantity: null,
		unit: null,
		unitPrice: null,
		amountHT: l.amountHT,
		vatRate: l.vatRate
	})),
	totaux,
	illisible: false,
	raisonIllisible: null
});

describe('verifierExtraction', () => {
	it('valide une extraction dont la somme retombe sur le total HT', () => {
		const r = verifierExtraction(
			doc(
				[
					{ amountHT: 100, vatRate: 5.5 },
					{ amountHT: 22, vatRate: 20 }
				],
				{
					totalHT: 122,
					basesParTaux: [
						{ taux: 5.5, baseHT: 100 },
						{ taux: 20, baseHT: 22 }
					]
				}
			)
		);
		expect(r.ok).toBe(true);
		expect(r.ecarts).toHaveLength(0);
	});

	it('détecte une ligne manquante par l’écart au total HT', () => {
		const r = verifierExtraction(
			doc([{ amountHT: 100, vatRate: 5.5 }], { totalHT: 122, basesParTaux: [] })
		);
		expect(r.ok).toBe(false);
		expect(r.ecarts[0]!.nature).toBe('TOTAL_HT');
		expect(r.ecarts[0]!.ecart).toBeCloseTo(22, 2);
	});

	it('détecte une ligne mal ventilée alors que le total tombe juste', () => {
		const r = verifierExtraction(
			doc(
				[
					{ amountHT: 100, vatRate: 20 },
					{ amountHT: 22, vatRate: 20 }
				],
				{
					totalHT: 122,
					basesParTaux: [
						{ taux: 5.5, baseHT: 100 },
						{ taux: 20, baseHT: 22 }
					]
				}
			)
		);
		expect(r.ok).toBe(false);
		expect(r.ecarts.some((e) => e.nature === 'BASE_TVA')).toBe(true);
	});

	it('tolère un centime d’arrondi', () => {
		const r = verifierExtraction(
			doc([{ amountHT: 100.005, vatRate: 5.5 }], { totalHT: 100, basesParTaux: [] })
		);
		expect(r.ok).toBe(true);
	});

	it('ne peut pas vérifier un document sans totaux, et le dit', () => {
		const r = verifierExtraction(
			doc([{ amountHT: 100, vatRate: null }], { totalHT: null, basesParTaux: [] })
		);
		expect(r.ok).toBe(false);
		expect(r.ecarts[0]!.nature).toBe('NON_VERIFIABLE');
	});

	it('rejette un document déclaré illisible', () => {
		const d = doc([], { totalHT: null, basesParTaux: [] });
		const r = verifierExtraction({ ...d, illisible: true, raisonIllisible: 'photo floue' });
		expect(r.ok).toBe(false);
	});

	it('produit un message d’écart exploitable pour une relance', () => {
		const r = verifierExtraction(
			doc([{ amountHT: 268, vatRate: 5.5 }], { totalHT: 290, basesParTaux: [] })
		);
		expect(r.messageRelance).toContain('268');
		expect(r.messageRelance).toContain('290');
	});
});

describe('verifierExtraction — contre la fixture océrisée', () => {
	it('valide la vérité terrain de grossiste-ocr-01', () => {
		// 6 lignes alimentaires à 5,5 % = 290,00 ; 2 lignes à 20 % = 22,00 ; total 312,00
		const r = verifierExtraction(
			doc(
				[
					{ amountHT: 13.75, vatRate: 5.5 },
					{ amountHT: 150.0, vatRate: 5.5 },
					{ amountHT: 22.5, vatRate: 5.5 },
					{ amountHT: -2.25, vatRate: 5.5 },
					{ amountHT: 44.0, vatRate: 5.5 },
					{ amountHT: 62.0, vatRate: 5.5 },
					{ amountHT: 7.0, vatRate: 20 },
					{ amountHT: 15.0, vatRate: 20 }
				],
				{
					totalHT: 312.0,
					basesParTaux: [
						{ taux: 5.5, baseHT: 290.0 },
						{ taux: 20, baseHT: 22.0 }
					]
				}
			)
		);
		expect(r.ok).toBe(true);
	});
});
