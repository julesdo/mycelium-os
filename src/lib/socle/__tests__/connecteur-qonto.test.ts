import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
	complementDeReglement,
	factureDepuisQonto,
	signatureQontoValide,
	sirenDepuisClientQonto,
	type FactureQonto
} from '../connecteurs/qonto';

const AUJOURDHUI = '2026-09-21';

function facture(modif: Partial<FactureQonto> = {}): FactureQonto {
	return {
		id: 'f-1',
		number: 'F-2026-001',
		status: 'unpaid',
		issue_date: '2026-07-01',
		due_date: '2026-07-31',
		paid_at: null,
		total_amount_cents: 120000,
		total_amount: { value: '1200.00', currency: 'EUR' },
		amount_paid: { value: '0.00', currency: 'EUR' },
		client: { name: 'Imprimerie Martin', vat_number: 'FR44732829320' },
		...modif
	};
}

describe('factureDepuisQonto', () => {
	it('traduit une facture impayée, au centime et sans flottant', () => {
		expect(factureDepuisQonto(facture(), AUJOURDHUI)).toEqual({
			reference: 'F-2026-001',
			debiteur: 'Imprimerie Martin',
			debiteurSiren: '732829320',
			montantTTC: 120000n,
			dateEmission: '2026-07-01',
			dateEcheance: '2026-07-31',
			regleCumule: null
		});
	});

	it('rend le cumul réglé et le jour du paiement', () => {
		const payee = factureDepuisQonto(
			facture({
				status: 'paid',
				paid_at: '2026-08-12T09:30:00Z',
				amount_paid: { value: '1200.00', currency: 'EUR' }
			}),
			AUJOURDHUI
		);
		expect(payee?.regleCumule).toEqual({ montant: 120000n, date: '2026-08-12' });
	});

	it('solde une facture « payée » dont le montant réglé manque', () => {
		const payee = factureDepuisQonto(facture({ status: 'paid', amount_paid: null }), AUJOURDHUI);
		expect(payee?.regleCumule).toEqual({ montant: 120000n, date: AUJOURDHUI });
	});

	it('lit un règlement partiel écrit en décimal', () => {
		const partielle = factureDepuisQonto(
			facture({ amount_paid: { value: '300.10', currency: 'EUR' } }),
			AUJOURDHUI
		);
		expect(partielle?.regleCumule).toEqual({ montant: 30010n, date: AUJOURDHUI });
	});

	it('écarte un brouillon, une facture annulée et une facture en devise', () => {
		expect(factureDepuisQonto(facture({ status: 'draft' }), AUJOURDHUI)).toBeNull();
		expect(factureDepuisQonto(facture({ status: 'canceled' }), AUJOURDHUI)).toBeNull();
		expect(
			factureDepuisQonto(
				facture({ total_amount: { value: '1200.00', currency: 'USD' } }),
				AUJOURDHUI
			)
		).toBeNull();
	});

	it('écarte une facture sans numéro ou sans client nommé', () => {
		expect(factureDepuisQonto(facture({ number: null }), AUJOURDHUI)).toBeNull();
		expect(factureDepuisQonto(facture({ client: {} }), AUJOURDHUI)).toBeNull();
	});

	it('nomme un client particulier par son prénom et son nom', () => {
		const traduite = factureDepuisQonto(
			facture({ client: { first_name: 'Léa', last_name: 'Durand' } }),
			AUJOURDHUI
		);
		expect(traduite?.debiteur).toBe('Léa Durand');
		expect(traduite?.debiteurSiren).toBeUndefined();
	});
});

describe('sirenDepuisClientQonto', () => {
	it('prend les neuf premiers chiffres d’un SIRET', () => {
		expect(sirenDepuisClientQonto({ tax_identification_number: '732 829 320 00074' })).toBe(
			'732829320'
		);
	});

	it('extrait le SIREN d’un numéro de TVA français', () => {
		expect(sirenDepuisClientQonto({ vat_number: 'FR44732829320' })).toBe('732829320');
	});

	it('ne devine rien sans identifiant exploitable', () => {
		expect(sirenDepuisClientQonto({ vat_number: 'DE123456789' })).toBeUndefined();
		expect(sirenDepuisClientQonto({})).toBeUndefined();
	});
});

describe('complementDeReglement', () => {
	it('n’ajoute que ce qui manque au cumul', () => {
		expect(complementDeReglement(50000n, 30000n)).toBe(20000n);
	});

	it('n’ajoute rien quand tout est déjà enregistré, ou plus', () => {
		expect(complementDeReglement(30000n, 30000n)).toBe(0n);
		expect(complementDeReglement(20000n, 30000n)).toBe(0n);
	});
});

describe('signatureQontoValide', () => {
	const secret = 'secret-de-test-assez-long-pour-qonto-00000';
	const corps = '{"id":"f-1","status":"paid"}';
	const t = 1_790_000_000;
	const signe = (texte: string) => createHmac('sha256', secret).update(`${t}.${texte}`).digest('hex');

	it('accepte une signature exacte et fraîche', async () => {
		expect(await signatureQontoValide(corps, `t=${t},v1=${signe(corps)}`, secret, t + 10)).toBe(
			true
		);
	});

	it('refuse un corps modifié', async () => {
		expect(
			await signatureQontoValide(`${corps} `, `t=${t},v1=${signe(corps)}`, secret, t + 10)
		).toBe(false);
	});

	it('refuse une signature trop ancienne, ou absente', async () => {
		expect(await signatureQontoValide(corps, `t=${t},v1=${signe(corps)}`, secret, t + 600)).toBe(
			false
		);
		expect(await signatureQontoValide(corps, null, secret, t)).toBe(false);
	});
});
