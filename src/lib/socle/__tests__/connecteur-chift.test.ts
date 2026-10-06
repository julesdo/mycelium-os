import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
	centimesChift,
	debutDePremiereLecture,
	factureDepuisChiftComptable,
	factureDepuisChiftFacturation,
	signatureChiftValide,
	sirenChift,
	type FactureComptableChift,
	type FactureFacturationChift
} from '../connecteurs/chift';

const AUJOURDHUI = '2026-10-06';

function comptable(modif: Partial<FactureComptableChift> = {}): FactureComptableChift {
	return {
		id: 'e-1',
		invoice_type: 'customer_invoice',
		invoice_number: 'VE-2026-014',
		currency: 'EUR',
		total: 1200,
		invoice_date: '2026-07-01',
		due_date: '2026-07-31',
		status: 'posted',
		payments: [],
		partner_id: 'p-1',
		partner: { id: 'p-1', name: 'Imprimerie Martin', company_number: '732 829 320 00074' },
		...modif
	};
}

function facturation(modif: Partial<FactureFacturationChift> = {}): FactureFacturationChift {
	return {
		id: 'f-1',
		invoice_type: 'customer_invoice',
		status: 'posted',
		invoice_number: 'FA-118',
		currency: 'EUR',
		total: 6000,
		invoice_date: '2026-06-02',
		due_date: '2026-07-02',
		partner_id: 'c-1',
		outstanding_amount: 6000,
		last_payment_date: null,
		...modif
	};
}

const CONTACT = { id: 'c-1', company_name: 'Charpentes Vidal', vat: 'FR44732829320' };

describe('centimesChift', () => {
	it('lit un nombre JSON au centime, sans arithmétique flottante', () => {
		expect(centimesChift(1234.5)).toBe(123450n);
		expect(centimesChift(0.1)).toBe(10n);
		expect(centimesChift(1200)).toBe(120000n);
	});

	it('refuse plutôt que d’arrondir', () => {
		// 0.1 + 0.2 vaut 0.30000000000000004 : arrondi, il inventerait une valeur.
		expect(centimesChift(0.1 + 0.2)).toBeNull();
		expect(centimesChift(12.345)).toBeNull();
		expect(centimesChift(1e21)).toBeNull();
		expect(centimesChift(Number.NaN)).toBeNull();
		expect(centimesChift(null)).toBeNull();
	});
});

describe('sirenChift', () => {
	it('lit un SIREN, un SIRET ou une TVA française', () => {
		expect(sirenChift('732829320')).toBe('732829320');
		expect(sirenChift('732 829 320 00074')).toBe('732829320');
		expect(sirenChift(null, 'FR 44 732829320')).toBe('732829320');
	});

	it('ne devine rien d’autre', () => {
		expect(sirenChift('BE0123456789')).toBeUndefined();
		expect(sirenChift(null, 'BE0123456789')).toBeUndefined();
		expect(sirenChift('12345')).toBeUndefined();
	});
});

describe('factureDepuisChiftComptable', () => {
	it('traduit une écriture de vente impayée', () => {
		expect(factureDepuisChiftComptable(comptable(), undefined, AUJOURDHUI)).toEqual({
			genre: 'FACTURE',
			facture: {
				reference: 'VE-2026-014',
				debiteur: 'Imprimerie Martin',
				debiteurSiren: '732829320',
				montantTTC: 120000n,
				dateEmission: '2026-07-01',
				dateEcheance: '2026-07-31',
				regleCumule: null
			}
		});
	});

	it('additionne les parts affectées, sans dépasser le montant', () => {
		const partielle = factureDepuisChiftComptable(
			comptable({
				payments: [
					{ amount: 300, dedicated_amount: 300, payment_date: '2026-08-01' },
					{ amount: 900, dedicated_amount: 200.5, payment_date: '2026-08-20' }
				]
			}),
			undefined,
			AUJOURDHUI
		);
		expect(partielle).toMatchObject({
			facture: { regleCumule: { montant: 50050n, date: '2026-08-20' } }
		});

		const excessive = factureDepuisChiftComptable(
			comptable({
				payments: [{ amount: 5000, dedicated_amount: 5000, payment_date: '2026-08-01' }]
			}),
			undefined,
			AUJOURDHUI
		);
		expect(excessive).toMatchObject({ facture: { regleCumule: { montant: 120000n } } });
	});

	it('n’enregistre rien quand aucune part n’est affectée', () => {
		const inconnue = factureDepuisChiftComptable(
			comptable({ payments: [{ amount: 1200, dedicated_amount: 0, payment_date: '2026-08-01' }] }),
			undefined,
			AUJOURDHUI
		);
		expect(inconnue).toMatchObject({ facture: { regleCumule: null } });
	});

	it('solde une facture « paid », au jour de son dernier paiement ou du constat', () => {
		expect(
			factureDepuisChiftComptable(comptable({ status: 'paid' }), undefined, AUJOURDHUI)
		).toMatchObject({ facture: { regleCumule: { montant: 120000n, date: AUJOURDHUI } } });
		expect(
			factureDepuisChiftComptable(
				comptable({
					status: 'paid',
					payments: [{ amount: 1200, dedicated_amount: 0, payment_date: '2026-08-03' }]
				}),
				undefined,
				AUJOURDHUI
			)
		).toMatchObject({ facture: { regleCumule: { montant: 120000n, date: '2026-08-03' } } });
	});

	it('laisse l’échéance vide quand elle recopie la date de facture', () => {
		const traduite = factureDepuisChiftComptable(
			comptable({ due_date: '2026-07-01' }),
			undefined,
			AUJOURDHUI
		);
		expect(traduite.genre === 'FACTURE' && 'dateEcheance' in traduite.facture).toBe(false);
	});

	it('cherche le client dans la liste quand Chift ne l’a pas joint', () => {
		expect(
			factureDepuisChiftComptable(
				comptable({ partner: null }),
				{ id: 'p-1', first_name: 'Léa', last_name: 'Roux', email: ' lea@roux.fr ' },
				AUJOURDHUI
			)
		).toMatchObject({ facture: { debiteur: 'Léa Roux', debiteurEmail: 'lea@roux.fr' } });
	});

	it('laisse de côté ce qui n’est pas une créance', () => {
		for (const modif of [
			{ status: 'draft' },
			{ status: 'cancelled' },
			{ invoice_type: 'customer_refund' },
			{ invoice_type: 'supplier_invoice' },
			{ total: 0 }
		]) {
			expect(factureDepuisChiftComptable(comptable(modif), undefined, AUJOURDHUI)).toEqual({
				genre: 'HORS_CHAMP'
			});
		}
	});

	it('nomme ce qu’il n’a pas pu lire, au lieu de le taire', () => {
		expect(
			factureDepuisChiftComptable(comptable({ currency: 'USD' }), undefined, AUJOURDHUI)
		).toEqual({ genre: 'ILLISIBLE', raison: 'facture en devise (USD)' });
		expect(
			factureDepuisChiftComptable(comptable({ invoice_number: ' ' }), undefined, AUJOURDHUI)
		).toEqual({ genre: 'ILLISIBLE', raison: 'facture sans numéro' });
		expect(
			factureDepuisChiftComptable(comptable({ partner: null }), undefined, AUJOURDHUI)
		).toEqual({ genre: 'ILLISIBLE', raison: 'facture sans client' });
		expect(
			factureDepuisChiftComptable(comptable({ total: 1200.005 }), undefined, AUJOURDHUI)
		).toEqual({ genre: 'ILLISIBLE', raison: 'montant illisible' });
	});
});

describe('factureDepuisChiftFacturation', () => {
	it('traduit une facture et son reste à payer', () => {
		expect(
			factureDepuisChiftFacturation(
				facturation({ outstanding_amount: 2500, last_payment_date: '2026-07-15' }),
				CONTACT,
				AUJOURDHUI
			)
		).toEqual({
			genre: 'FACTURE',
			facture: {
				reference: 'FA-118',
				debiteur: 'Charpentes Vidal',
				debiteurSiren: '732829320',
				montantTTC: 600000n,
				dateEmission: '2026-06-02',
				dateEcheance: '2026-07-02',
				regleCumule: { montant: 350000n, date: '2026-07-15' }
			}
		});
	});

	it('n’enregistre aucun règlement sans reste à payer renseigné, sauf « paid »', () => {
		expect(
			factureDepuisChiftFacturation(facturation({ outstanding_amount: null }), CONTACT, AUJOURDHUI)
		).toMatchObject({ facture: { regleCumule: null } });
		expect(
			factureDepuisChiftFacturation(
				facturation({ status: 'paid', outstanding_amount: null }),
				CONTACT,
				AUJOURDHUI
			)
		).toMatchObject({ facture: { regleCumule: { montant: 600000n, date: AUJOURDHUI } } });
	});

	it('borne le réglé entre zéro et le montant', () => {
		expect(
			factureDepuisChiftFacturation(facturation({ outstanding_amount: 9000 }), CONTACT, AUJOURDHUI)
		).toMatchObject({ facture: { regleCumule: null } });
		expect(
			factureDepuisChiftFacturation(facturation({ outstanding_amount: -50 }), CONTACT, AUJOURDHUI)
		).toMatchObject({ facture: { regleCumule: { montant: 600000n } } });
	});

	it('ne lit pas une facture dont le client est inconnu', () => {
		expect(factureDepuisChiftFacturation(facturation(), undefined, AUJOURDHUI)).toEqual({
			genre: 'ILLISIBLE',
			raison: 'facture sans client'
		});
	});
});

describe('debutDePremiereLecture', () => {
	it('remonte au 1er janvier de l’année qui précède la borne', () => {
		expect(debutDePremiereLecture('2026-10-06', 5)).toBe('2020-01-01');
	});
});

describe('signatureChiftValide', () => {
	const secret = 'secret-de-test';
	const corps = JSON.stringify({
		accountid: 'a',
		event: 'account.connection.created',
		consumerid: 'c'
	});
	const signe = (texte: string) => createHmac('sha256', secret).update(texte, 'utf8').digest('hex');

	it('accepte la signature du corps reçu', async () => {
		expect(await signatureChiftValide(corps, signe(corps), secret)).toBe(true);
	});

	it('accepte la signature de la forme compacte quand le corps est mis en forme', async () => {
		const espace = JSON.stringify(JSON.parse(corps), null, 2);
		expect(await signatureChiftValide(espace, signe(corps), secret)).toBe(true);
	});

	it('refuse une signature fausse, absente, ou un secret vide', async () => {
		expect(await signatureChiftValide(corps, signe(corps + ' '), secret)).toBe(false);
		expect(await signatureChiftValide(corps, null, secret)).toBe(false);
		expect(await signatureChiftValide(corps, signe(corps), '')).toBe(false);
		expect(await signatureChiftValide('pas du json', signe('pas du json'), secret)).toBe(false);
	});
});
