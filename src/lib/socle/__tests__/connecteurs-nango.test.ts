import { describe, expect, it } from 'vitest';
import {
	centimesDecimaux,
	jourLu,
	sirenLu,
	type TraductionConnecteur
} from '../connecteurs/nango/commun';
import { factureDepuisPennylane, type FacturePennylane } from '../connecteurs/nango/pennylane';
import { factureDepuisQuickBooks } from '../connecteurs/nango/quickbooks';
import { factureDepuisXero, jourXero } from '../connecteurs/nango/xero';
import { factureDepuisZoho } from '../connecteurs/nango/zoho';
import { factureDepuisStripe } from '../connecteurs/nango/stripe';
import { factureDepuisSellsy } from '../connecteurs/nango/sellsy';
import { signatureNangoValide } from '../connecteurs/nango/signature';
import {
	creerLecteur,
	preparerLaLecture,
	type AppelNango,
	type RequeteNango
} from '../connecteurs/nango/lecteurs';

const CONTEXTE = { aujourdHui: '2026-10-13', horizon: '2020-01-01' };

function facture(traduction: TraductionConnecteur) {
	if (traduction.genre !== 'FACTURE')
		throw new Error(`attendu une facture, reçu ${traduction.genre}`);
	return traduction.facture;
}

describe('les règles communes', () => {
	it('lit un montant décimal sans flottant, et refuse ce qui inventerait un centime', () => {
		expect(centimesDecimaux('230.32')).toBe(23_032n);
		expect(centimesDecimaux(230.32)).toBe(23_032n);
		expect(centimesDecimaux('1200')).toBe(120_000n);
		expect(centimesDecimaux('1.234')).toBeNull();
		expect(centimesDecimaux(Number.NaN)).toBeNull();
		expect(centimesDecimaux('')).toBeNull();
	});

	it('refuse un jour qui n’existe pas au calendrier', () => {
		expect(jourLu('2026-02-28T10:00:00Z')).toBe('2026-02-28');
		expect(jourLu('2026-02-30')).toBeUndefined();
		expect(jourLu('13/10/2026')).toBeUndefined();
	});

	it('ne lit un SIREN que dans un SIREN, un SIRET ou une TVA française', () => {
		expect(sirenLu('732 829 320 00074')).toBe('732829320');
		expect(sirenLu(null, 'FR 12 732829320')).toBe('732829320');
		expect(sirenLu('B12345678', 'DE123456789')).toBeUndefined();
	});
});

describe('Pennylane', () => {
	const client = {
		id: 7,
		name: 'Imprimerie Martin',
		customer_type: 'company',
		reg_no: '732829320',
		emails: ['compta@imprimerie-martin.fr']
	};
	function pennylane(modif: Partial<FacturePennylane> = {}): FacturePennylane {
		return {
			id: 1,
			invoice_number: 'F-2026-014',
			status: 'partially_paid',
			draft: false,
			paid: false,
			currency: 'EUR',
			amount: '1200.00',
			remaining_amount_with_tax: '450.00',
			date: '2026-07-01',
			deadline: '2026-07-31',
			customer: { id: 7 },
			...modif
		};
	}

	it('traduit une facture partiellement payée, avec son client', () => {
		expect(facture(factureDepuisPennylane(pennylane(), client, CONTEXTE))).toEqual({
			reference: 'F-2026-014',
			debiteur: 'Imprimerie Martin',
			debiteurSiren: '732829320',
			debiteurEmail: 'compta@imprimerie-martin.fr',
			montantTTC: 120_000n,
			dateEmission: '2026-07-01',
			dateEcheance: '2026-07-31',
			regleCumule: { montant: 75_000n, date: '2026-10-13' }
		});
	});

	it('laisse les brouillons, les devis et les avoirs ; signale une annulation', () => {
		expect(factureDepuisPennylane(pennylane({ draft: true }), client, CONTEXTE).genre).toBe(
			'HORS_CHAMP'
		);
		expect(
			factureDepuisPennylane(pennylane({ status: 'credit_note' }), client, CONTEXTE).genre
		).toBe('HORS_CHAMP');
		expect(
			factureDepuisPennylane(pennylane({ status: 'estimate_pending' }), client, CONTEXTE).genre
		).toBe('HORS_CHAMP');
		expect(factureDepuisPennylane(pennylane({ status: 'cancelled' }), client, CONTEXTE)).toEqual({
			genre: 'ANNULEE',
			reference: 'F-2026-014'
		});
	});

	it('compte comme illisible une facture en devise ou sans client', () => {
		expect(factureDepuisPennylane(pennylane({ currency: 'USD' }), client, CONTEXTE)).toEqual({
			genre: 'ILLISIBLE',
			raison: 'facture en devise (USD)'
		});
		expect(factureDepuisPennylane(pennylane(), undefined, CONTEXTE)).toEqual({
			genre: 'ILLISIBLE',
			raison: 'facture sans client'
		});
	});

	it('solde une facture payée, et oublie une facture soldée trop ancienne', () => {
		const payee = pennylane({ paid: true, status: 'paid', remaining_amount_with_tax: '0.0' });
		expect(facture(factureDepuisPennylane(payee, client, CONTEXTE)).regleCumule).toEqual({
			montant: 120_000n,
			date: '2026-10-13'
		});
		expect(factureDepuisPennylane({ ...payee, date: '2019-03-01' }, client, CONTEXTE).genre).toBe(
			'HORS_CHAMP'
		);
		// IMPAYÉE et ancienne : elle entre, c'est celle dont la date limite approche.
		expect(factureDepuisPennylane(pennylane({ date: '2019-03-01' }), client, CONTEXTE).genre).toBe(
			'FACTURE'
		);
	});
});

describe('QuickBooks', () => {
	const base = {
		Id: '130',
		DocNumber: '1037',
		TxnDate: '2026-08-02',
		DueDate: '2026-09-01',
		TotalAmt: 362.07,
		Balance: 362.07,
		CustomerRef: { value: '58', name: 'Sonnenschein Family Store' },
		BillEmail: { Address: 'familiystore@intuit.com' }
	};

	it('prend la devise de la société quand la facture ne la dit pas', () => {
		const lue = facture(factureDepuisQuickBooks(base, { ...CONTEXTE, deviseDeLaSociete: 'EUR' }));
		expect(lue.montantTTC).toBe(36_207n);
		expect(lue.regleCumule).toBeNull();
		expect(lue.debiteurEmail).toBe('familiystore@intuit.com');
		expect(factureDepuisQuickBooks(base, { ...CONTEXTE, deviseDeLaSociete: undefined })).toEqual({
			genre: 'ILLISIBLE',
			raison: 'facture en devise (inconnue)'
		});
	});

	it('signale une facture annulée (montant tombé à zéro)', () => {
		expect(
			factureDepuisQuickBooks(
				{ ...base, TotalAmt: 0, Balance: 0 },
				{ ...CONTEXTE, deviseDeLaSociete: 'EUR' }
			)
		).toEqual({ genre: 'ANNULEE', reference: '1037' });
	});
});

describe('Xero', () => {
	it('lit les deux écritures de date', () => {
		expect(jourXero('2026-10-13T00:00:00', '/Date(1)/')).toBe('2026-10-13');
		expect(jourXero(undefined, '/Date(1760313600000+0000)/')).toBe('2025-10-13');
	});

	it('ne lit que les factures émises, et signale une annulation', () => {
		const base = {
			InvoiceID: 'a1',
			InvoiceNumber: 'INV-0042',
			Type: 'ACCREC',
			Status: 'AUTHORISED',
			Contact: { ContactID: 'c1', Name: 'Atelier Durand' },
			DateString: '2026-09-01T00:00:00',
			DueDateString: '2026-10-01T00:00:00',
			Total: 1000,
			AmountDue: 400,
			CurrencyCode: 'EUR'
		};
		const contact = {
			ContactID: 'c1',
			CompanyNumber: '73282932000074',
			EmailAddress: 'a@durand.fr'
		};
		const lue = facture(factureDepuisXero(base, contact, CONTEXTE));
		expect(lue.regleCumule).toEqual({ montant: 60_000n, date: '2026-10-13' });
		expect(lue.debiteurSiren).toBe('732829320');
		expect(factureDepuisXero({ ...base, Type: 'ACCPAY' }, contact, CONTEXTE).genre).toBe(
			'HORS_CHAMP'
		);
		expect(factureDepuisXero({ ...base, Status: 'VOIDED' }, contact, CONTEXTE)).toEqual({
			genre: 'ANNULEE',
			reference: 'INV-0042'
		});
	});
});

describe('Zoho', () => {
	it('lit le reste à payer et la date du dernier paiement', () => {
		const lue = facture(
			factureDepuisZoho(
				{
					invoice_id: '982000000567114',
					invoice_number: 'INV-00003',
					status: 'partially_paid',
					customer_id: 9,
					customer_name: 'Bowman and Co',
					date: '2026-06-03',
					due_date: '2026-06-18',
					currency_code: 'EUR',
					total: 40.6,
					balance: 10.6,
					last_payment_date: '2026-06-20'
				},
				{
					contact_id: 9,
					company_name: 'Bowman & Co SAS',
					email: 'compta@bowman.fr',
					vat_reg_no: 'FR12732829320'
				},
				CONTEXTE
			)
		);
		expect(lue.debiteur).toBe('Bowman & Co SAS');
		expect(lue.regleCumule).toEqual({ montant: 3_000n, date: '2026-06-20' });
		expect(lue.debiteurSiren).toBe('732829320');
	});
});

describe('Stripe', () => {
	it('lit des montants déjà en centimes et des dates Unix', () => {
		const lue = facture(
			factureDepuisStripe(
				{
					id: 'in_1',
					number: 'A1B2-0003',
					status: 'open',
					currency: 'eur',
					total: 120_000,
					amount_remaining: 120_000,
					effective_at: 1_760_313_600,
					due_date: 1_762_905_600,
					customer_name: 'Studio Lumière',
					customer_tax_ids: [{ type: 'eu_vat', value: 'FR12732829320' }]
				},
				CONTEXTE
			)
		);
		expect(lue.montantTTC).toBe(120_000n);
		expect(lue.dateEmission).toBe('2025-10-13');
		expect(lue.debiteurSiren).toBe('732829320');
		expect(lue.regleCumule).toBeNull();
	});

	it('laisse un brouillon et signale une annulation', () => {
		expect(factureDepuisStripe({ id: 'in_2', status: 'draft' }, CONTEXTE).genre).toBe('HORS_CHAMP');
		expect(factureDepuisStripe({ id: 'in_3', number: 'X-1', status: 'void' }, CONTEXTE)).toEqual({
			genre: 'ANNULEE',
			reference: 'X-1'
		});
	});
});

describe('Sellsy', () => {
	const base = {
		id: 3875,
		number: 'INV-2026-01-02-002',
		status: 'late',
		date: '2026-01-02',
		due_date: '2026-02-01',
		currency: 'EUR',
		amounts: { total_incl_tax: '2400.00', total_remaining_due_incl_tax: '2400.00' },
		related: [{ id: 12, type: 'company' }]
	};

	it('lit une société avec son SIREN, et un particulier par son nom', () => {
		const societe = {
			genre: 'SOCIETE' as const,
			societe: { id: 12, name: 'Menuiserie Roux', legal_france: { siret: '73282932000074' } }
		};
		expect(facture(factureDepuisSellsy(base, societe, CONTEXTE)).debiteurSiren).toBe('732829320');
		const particulier = {
			genre: 'PARTICULIER' as const,
			particulier: { id: 4, first_name: 'Camille', last_name: 'Roux' }
		};
		expect(facture(factureDepuisSellsy(base, particulier, CONTEXTE)).debiteur).toBe('Camille Roux');
	});

	it('signale une annulation', () => {
		expect(factureDepuisSellsy({ ...base, status: 'cancelled' }, undefined, CONTEXTE)).toEqual({
			genre: 'ANNULEE',
			reference: 'INV-2026-01-02-002'
		});
	});
});

/** Un proxy simulé : chaque chemin rend la réponse suivante de sa file. */
function proxySimule(reponses: Record<string, readonly unknown[]>): {
	appel: AppelNango;
	requetes: RequeteNango[];
} {
	const files = new Map(Object.entries(reponses).map(([chemin, liste]) => [chemin, [...liste]]));
	const requetes: RequeteNango[] = [];
	return {
		requetes,
		appel: async (requete) => {
			requetes.push(requete);
			const suivante = files.get(requete.chemin)?.shift();
			if (suivante === undefined) throw new Error(`aucune réponse pour ${requete.chemin}`);
			return suivante;
		}
	};
}

describe('les lecteurs', () => {
	const base = { ...CONTEXTE, depuis: undefined, config: {} };

	it('Pennylane : suit le curseur, et charge les clients une seule fois', async () => {
		const { appel, requetes } = proxySimule({
			'/api/external/v2/customers': [
				{
					items: [{ id: 7, name: 'Imprimerie Martin', reg_no: '732829320' }],
					has_more: false,
					next_cursor: null
				}
			],
			'/api/external/v2/customer_invoices': [
				{
					items: [
						{
							id: 1,
							invoice_number: 'F-1',
							status: 'late',
							currency: 'EUR',
							amount: '100.00',
							remaining_amount_with_tax: '100.00',
							date: '2026-09-01',
							customer: { id: 7 }
						}
					],
					has_more: true,
					next_cursor: 'c2'
				},
				{
					items: [
						{
							id: 2,
							invoice_number: 'F-2',
							status: 'draft',
							draft: true,
							currency: 'EUR',
							amount: '50.00',
							date: '2026-09-02',
							customer: { id: 7 }
						}
					],
					has_more: false,
					next_cursor: null
				}
			]
		});
		const lecteur = creerLecteur('pennylane', { ...base, appel });
		const premiere = await lecteur.lirePage(null);
		expect(premiere.suite).toBe('c2');
		expect(facture(premiere.traductions[0]!).debiteurSiren).toBe('732829320');
		const seconde = await lecteur.lirePage(premiere.suite);
		expect(seconde.suite).toBeNull();
		expect(seconde.traductions[0]!.genre).toBe('HORS_CHAMP');
		expect(requetes.filter((r) => r.chemin.endsWith('/customers'))).toHaveLength(1);
		expect(requetes[2]!.parametres).toMatchObject({ cursor: 'c2' });
	});

	it('QuickBooks : pagine par STARTPOSITION et ne relit que ce qui a bougé depuis la veille', async () => {
		const pleine = Array.from({ length: 100 }, (_, i) => ({
			Id: String(i),
			DocNumber: `D${i}`,
			TxnDate: '2026-09-01',
			TotalAmt: 10,
			Balance: 10,
			CustomerRef: { value: '1', name: 'Client' }
		}));
		const { appel, requetes } = proxySimule({
			'/v3/company/9341/preferences': [
				{ Preferences: { CurrencyPrefs: { HomeCurrency: { value: 'EUR' } } } }
			],
			'/v3/company/9341/query': [{ QueryResponse: { Invoice: pleine } }, { QueryResponse: {} }]
		});
		const lecteur = creerLecteur('quickbooks', {
			...base,
			appel,
			config: { realmId: '9341' },
			depuis: '2026-10-12T08:00:00.000Z'
		});
		const premiere = await lecteur.lirePage(null);
		expect(premiere.suite).toBe('101');
		expect(premiere.traductions.every((t) => t.genre === 'FACTURE')).toBe(true);
		const seconde = await lecteur.lirePage(premiere.suite);
		expect(seconde.suite).toBeNull();
		const requete = requetes.find((r) => r.chemin.endsWith('/query'))!;
		expect(requete.parametres?.query).toBe(
			"SELECT * FROM Invoice WHERE MetaData.LastUpdatedTime >= '2026-10-11' STARTPOSITION 1 MAXRESULTS 100"
		);
		expect(requete.entetes).toMatchObject({ Accept: 'application/json' });
	});

	it('QuickBooks : refuse de lire sans savoir quelle société', () => {
		expect(() => creerLecteur('quickbooks', { ...base, appel: proxySimule({}).appel })).toThrow(
			/realmId/
		);
	});

	it('Stripe : reprend après le dernier identifiant lu', async () => {
		const { appel, requetes } = proxySimule({
			'/v1/invoices': [
				{
					data: [
						{ id: 'in_a', status: 'draft' },
						{ id: 'in_b', status: 'draft' }
					],
					has_more: true
				},
				{ data: [], has_more: false }
			]
		});
		const lecteur = creerLecteur('stripe', { ...base, appel });
		expect((await lecteur.lirePage(null)).suite).toBe('in_b');
		expect((await lecteur.lirePage('in_b')).suite).toBeNull();
		expect(requetes[1]!.parametres).toMatchObject({ starting_after: 'in_b' });
	});

	it('Zoho : s’arrête sur has_more_page, et lève sur un refus enveloppé', async () => {
		const { appel } = proxySimule({
			'/books/v3/contacts': [{ code: 0, contacts: [], page_context: { has_more_page: false } }],
			'/books/v3/invoices': [
				{ code: 0, invoices: [], page_context: { has_more_page: true } },
				{ code: 57, message: 'You are not authorized' }
			]
		});
		const lecteur = creerLecteur('zoho-books', {
			...base,
			appel,
			config: { organization_id: '10234695' }
		});
		expect((await lecteur.lirePage(null)).suite).toBe('2');
		await expect(lecteur.lirePage('2')).rejects.toThrow(/code 57/);
	});

	it('Sellsy : avance par décalage jusqu’au total', async () => {
		const { appel } = proxySimule({
			'/v2/companies': [{ data: [{ id: 12, name: 'Menuiserie Roux' }], pagination: { total: 1 } }],
			'/v2/individuals': [{ data: [], pagination: { total: 0 } }],
			'/v2/invoices': [
				{
					data: [
						{
							id: 1,
							number: 'S-1',
							status: 'due',
							date: '2026-09-01',
							currency: 'EUR',
							amounts: { total_incl_tax: '10.00', total_remaining_due_incl_tax: '10.00' },
							related: [{ id: 12, type: 'company' }]
						}
					],
					pagination: { total: 1 }
				}
			]
		});
		const page = await creerLecteur('sellsy', { ...base, appel }).lirePage(null);
		expect(page.suite).toBeNull();
		expect(facture(page.traductions[0]!).debiteur).toBe('Menuiserie Roux');
	});

	it('Zoho : retient l’organisation par défaut, et refuse de choisir entre plusieurs', async () => {
		const unique = proxySimule({
			'/books/v3/organizations': [
				{
					code: 0,
					organizations: [
						{ organization_id: '1', is_default_org: false },
						{ organization_id: '2', is_default_org: true }
					]
				}
			]
		});
		expect(await preparerLaLecture('zoho-books', {}, unique.appel)).toEqual({
			organization_id: '2'
		});
		const ambigu = proxySimule({
			'/books/v3/organizations': [
				{ code: 0, organizations: [{ organization_id: '1' }, { organization_id: '2' }] }
			]
		});
		await expect(preparerLaLecture('zoho-books', {}, ambigu.appel)).rejects.toThrow(/par défaut/);
	});

	it('Xero : exige l’organisation posée par Nango', async () => {
		await expect(preparerLaLecture('xero', {}, proxySimule({}).appel)).rejects.toThrow(
			/organisation/
		);
		expect(await preparerLaLecture('xero', { tenant_id: 't-1' }, proxySimule({}).appel)).toEqual({
			tenant_id: 't-1'
		});
	});
});

describe('la signature des webhooks', () => {
	const cle = 'cle-de-signature-de-test';
	const corps = '{"type":"auth","operation":"creation","success":true,"connectionId":"c-1"}';

	it('accepte le HMAC-SHA256 hexadécimal du corps brut, et refuse tout le reste', async () => {
		const { createHmac } = await import('node:crypto');
		const bonne = createHmac('sha256', cle).update(corps).digest('hex');
		expect(await signatureNangoValide(corps, bonne, cle)).toBe(true);
		expect(await signatureNangoValide(corps, bonne.toUpperCase(), cle)).toBe(true);
		// Le même JSON resérialisé n'est plus le corps signé.
		expect(await signatureNangoValide(JSON.stringify(JSON.parse(corps), null, 1), bonne, cle)).toBe(
			false
		);
		expect(await signatureNangoValide(corps, bonne, 'une-autre-cle')).toBe(false);
		expect(await signatureNangoValide(corps, null, cle)).toBe(false);
		expect(await signatureNangoValide(corps, 'pas-hexa', cle)).toBe(false);
		expect(await signatureNangoValide(corps, bonne, '')).toBe(false);
	});
});
