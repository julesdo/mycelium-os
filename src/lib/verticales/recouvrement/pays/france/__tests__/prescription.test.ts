import { describe, it, expect } from 'vitest';
import {
	REGIMES_PRESCRIPTION,
	regimePrescription,
	dateDePrescription,
	joursAvantPrescription,
	estPrescrite,
	secteurLePlusCourt
} from '../prescription';

/**
 * La prescription, secteur par secteur.
 *
 * L'article L110-4 du code de commerce pose cinq ans entre commerçants, MAIS
 * réserve expressément les « prescriptions spéciales plus courtes » — et en
 * énumère lui-même trois à un an. D'autres textes en ajoutent : le transport de
 * marchandises (L133-6, un an), la fourniture à un consommateur (L218-2 du code
 * de la consommation, deux ans).
 *
 * LE SENS DE L'ERREUR N'EST PAS SYMÉTRIQUE, et c'est ce que ces tests
 * protègent. Annoncer cinq ans à quelqu'un qui en a un lui fait perdre sa
 * créance en silence. Annoncer un an à quelqu'un qui en a cinq lui fait agir
 * trop tôt, ce qui ne coûte rien.
 */

describe('régimes connus', () => {
	it('pose cinq ans comme régime général entre commerçants', () => {
		const regime = regimePrescription('GENERAL');
		expect(regime.dureeAnnees).toBe(5);
		expect(regime.source).toMatch(/L110-4/);
	});

	it('retient un an pour le transport de marchandises', () => {
		const regime = regimePrescription('TRANSPORT_MARCHANDISES');
		expect(regime.dureeAnnees).toBe(1);
		expect(regime.source).toMatch(/L133-6/);
	});

	it('retient deux ans pour une fourniture à un consommateur', () => {
		const regime = regimePrescription('CONSOMMATEUR');
		expect(regime.dureeAnnees).toBe(2);
		expect(regime.source).toMatch(/L218-2/);
	});

	it('retient un an pour les trois cas que L110-4 énumère lui-même', () => {
		for (const secteur of ['NOURRITURE_MARINS', 'FOURNITURE_NAVIRE', 'OUVRAGE_ACCEPTE'] as const) {
			expect(regimePrescription(secteur).dureeAnnees, secteur).toBe(1);
		}
	});

	it('cite une source et un point de départ pour chaque régime', () => {
		for (const [secteur, regime] of Object.entries(REGIMES_PRESCRIPTION)) {
			expect(regime.source.length, secteur).toBeGreaterThan(0);
			expect(regime.pointDeDepart.length, secteur).toBeGreaterThan(0);
		}
	});
});

describe('secteur indéterminé — on penche du côté qui ne coûte rien', () => {
	it('retient le délai le plus court connu plutôt que le régime général', () => {
		// Présumer cinq ans ferait perdre une créance de transport en silence.
		// Présumer un an fait agir trop tôt, ce qui ne coûte rien.
		expect(regimePrescription('INDETERMINE').dureeAnnees).toBe(secteurLePlusCourt());
		expect(regimePrescription('INDETERMINE').dureeAnnees).toBe(1);
	});

	it('le dit explicitement, au lieu de le faire en silence', () => {
		const regime = regimePrescription('INDETERMINE');
		expect(regime.hypothese).toBe(true);
		expect(regime.note).toMatch(/plus court|conservat/i);
	});

	it('ne marque pas les régimes établis comme des hypothèses', () => {
		expect(regimePrescription('GENERAL').hypothese).toBe(false);
	});
});

describe('date de prescription', () => {
	it('ajoute cinq ans au point de départ, de quantième à quantième', () => {
		expect(dateDePrescription('2021-03-15', 'GENERAL')).toBe('2026-03-15');
	});

	it('ajoute un an pour le transport', () => {
		expect(dateDePrescription('2026-03-15', 'TRANSPORT_MARCHANDISES')).toBe('2027-03-15');
	});

	it('retombe sur le dernier jour du mois quand le quantième n’existe pas', () => {
		// 29 février 2024 + 5 ans : le 29 février 2029 n'existe pas.
		expect(dateDePrescription('2024-02-29', 'GENERAL')).toBe('2029-02-28');
	});
});

describe('compte à rebours', () => {
	it('compte les jours restants', () => {
		expect(joursAvantPrescription('2021-09-03', 'GENERAL', '2026-09-03')).toBe(0);
		expect(joursAvantPrescription('2021-09-13', 'GENERAL', '2026-09-03')).toBe(10);
	});

	it('ne compte jamais de jours négatifs', () => {
		expect(joursAvantPrescription('2019-01-01', 'GENERAL', '2026-09-03')).toBe(0);
	});

	it('dit qu’une créance est prescrite le jour où le délai est atteint', () => {
		expect(estPrescrite('2021-09-03', 'GENERAL', '2026-09-02')).toBe(false);
		expect(estPrescrite('2021-09-03', 'GENERAL', '2026-09-03')).toBe(true);
		expect(estPrescrite('2021-09-03', 'GENERAL', '2026-09-04')).toBe(true);
	});

	it('prescrit bien plus vite une créance de transport', () => {
		// La même facture, au 3 septembre 2026 : vivante en général, éteinte en
		// transport.
		expect(estPrescrite('2025-01-01', 'GENERAL', '2026-09-03')).toBe(false);
		expect(estPrescrite('2025-01-01', 'TRANSPORT_MARCHANDISES', '2026-09-03')).toBe(true);
	});
});
