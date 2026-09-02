import { describe, it, expect } from 'vitest';
import { versEuros } from '../../../../socle/montants';
import { importerExportComptable, detecterFormat } from '../exportComptable';

/**
 * L'import d'un export comptable — le chemin d'entrée qui a du sens pour des
 * factures de VENTE.
 *
 * Le socle sait lire une facture d'ACHAT déposée en PDF, parce qu'elle arrive
 * de l'extérieur et qu'on n'a qu'elle. Les factures de vente d'un créancier,
 * elles, existent déjà chez lui sous forme structurée : les faire re-scanner
 * serait lui demander de dégrader sa propre donnée pour qu'on la reconstitue.
 *
 * LE FEC EST LE FORMAT QUI PORTE LE PLUS. Obligatoire, normalisé, il contient
 * dans un seul fichier les factures, les règlements ET l'identité du débiteur
 * par son compte auxiliaire — c'est-à-dire les trois quarts du modèle de
 * domaine, déjà rapprochés par la comptabilité.
 */

const ENTETE_FEC = [
	'JournalCode',
	'JournalLib',
	'EcritureNum',
	'EcritureDate',
	'CompteNum',
	'CompteLib',
	'CompAuxNum',
	'CompAuxLib',
	'PieceRef',
	'PieceDate',
	'EcritureLib',
	'Debit',
	'Credit',
	'EcritureLet',
	'DateLet',
	'ValidDate',
	'Montantdevise',
	'Idevise'
].join('\t');

function ligneFec(champs: Partial<Record<string, string>>): string {
	const defauts: Record<string, string> = {
		JournalCode: 'VE',
		JournalLib: 'Ventes',
		EcritureNum: 'VE0001',
		EcritureDate: '20260415',
		CompteNum: '411DURAND',
		CompteLib: 'Clients',
		CompAuxNum: '411DURAND',
		CompAuxLib: 'Fournitures Durand',
		PieceRef: 'FA-2026-0042',
		PieceDate: '20260415',
		EcritureLib: 'Facture FA-2026-0042',
		Debit: '12000,00',
		Credit: '0,00',
		EcritureLet: '',
		DateLet: '',
		ValidDate: '20260415',
		Montantdevise: '',
		Idevise: ''
	};
	const fusion = { ...defauts, ...champs };
	return ENTETE_FEC.split('\t')
		.map((colonne) => fusion[colonne] ?? '')
		.join('\t');
}

function fec(...lignes: string[]): string {
	return [ENTETE_FEC, ...lignes].join('\n');
}

describe('détection de format', () => {
	it('reconnaît un FEC à ses colonnes obligatoires', () => {
		expect(detecterFormat(fec(ligneFec({})))).toBe('FEC');
	});

	it('reconnaît un CSV générique de factures', () => {
		const csv = 'Reference;Client;Montant TTC;Date emission;Date echeance\nF-1;Durand;100,00;2026-01-01;2026-02-01';
		expect(detecterFormat(csv)).toBe('CSV_GENERIQUE');
	});

	it('refuse un fichier qui n’est ni l’un ni l’autre', () => {
		expect(detecterFormat('bonjour\nceci n’est pas un export')).toBeNull();
	});
});

describe('import d’un FEC', () => {
	it('extrait une facture d’un débit sur compte client', () => {
		const resultat = importerExportComptable(fec(ligneFec({})));

		expect(resultat.format).toBe('FEC');
		expect(resultat.factures).toHaveLength(1);

		const facture = resultat.factures[0]!;
		expect(facture.reference).toBe('FA-2026-0042');
		expect(facture.debiteur).toBe('Fournitures Durand');
		expect(facture.debiteurCompte).toBe('411DURAND');
		expect(versEuros(facture.montantTTC)).toBe('12 000,00');
		expect(facture.dateEmission).toBe('2026-04-15');
	});

	it('extrait un règlement d’un crédit sur compte client', () => {
		const resultat = importerExportComptable(
			fec(
				ligneFec({}),
				ligneFec({
					JournalCode: 'BQ',
					EcritureNum: 'BQ0007',
					EcritureDate: '20260610',
					PieceDate: '20260610',
					EcritureLib: 'Règlement FA-2026-0042',
					Debit: '0,00',
					Credit: '4000,00'
				})
			)
		);

		expect(resultat.reglements).toHaveLength(1);
		expect(resultat.reglements[0]!.reference).toBe('FA-2026-0042');
		expect(versEuros(resultat.reglements[0]!.montant)).toBe('4 000,00');
		expect(resultat.reglements[0]!.date).toBe('2026-06-10');
	});

	it('ignore les contreparties de produit et de TVA, sans les perdre', () => {
		// Une écriture de vente équilibrée porte trois lignes ; une seule est la
		// créance. Compter les trois tripleraient le montant réclamé.
		const resultat = importerExportComptable(
			fec(
				ligneFec({}),
				ligneFec({ CompteNum: '706000', CompteLib: 'Prestations', CompAuxNum: '', CompAuxLib: '', Debit: '0,00', Credit: '10000,00' }),
				ligneFec({ CompteNum: '445710', CompteLib: 'TVA collectée', CompAuxNum: '', CompAuxLib: '', Debit: '0,00', Credit: '2000,00' })
			)
		);

		expect(resultat.factures).toHaveLength(1);
		expect(resultat.reglements).toHaveLength(0);
		expect(resultat.horsPerimetre).toBe(2);
	});

	it('convertit les dates AAAAMMJJ du FEC', () => {
		const resultat = importerExportComptable(fec(ligneFec({ PieceDate: '20251231' })));
		expect(resultat.factures[0]!.dateEmission).toBe('2025-12-31');
	});

	it('additionne plusieurs débits portant la même référence', () => {
		// Une facture peut s'étaler sur deux lignes d'écriture.
		const resultat = importerExportComptable(
			fec(ligneFec({ Debit: '8000,00' }), ligneFec({ Debit: '4000,00' }))
		);
		expect(resultat.factures).toHaveLength(1);
		expect(versEuros(resultat.factures[0]!.montantTTC)).toBe('12 000,00');
	});

	it('sépare deux débiteurs distincts', () => {
		const resultat = importerExportComptable(
			fec(
				ligneFec({}),
				ligneFec({
					CompteNum: '411MARTIN',
					CompAuxNum: '411MARTIN',
					CompAuxLib: 'Ateliers Martin',
					PieceRef: 'FA-2026-0043',
					Debit: '500,00'
				})
			)
		);
		expect(resultat.factures.map((f) => f.debiteur)).toEqual([
			'Fournitures Durand',
			'Ateliers Martin'
		]);
	});

	it('garde en ligne ignorée un montant illisible, avec sa raison', () => {
		const resultat = importerExportComptable(fec(ligneFec({ Debit: 'douze mille' })));
		expect(resultat.factures).toHaveLength(0);
		expect(resultat.ignorees).toHaveLength(1);
		expect(resultat.ignorees[0]!.raison).toMatch(/montant/i);
		expect(resultat.ignorees[0]!.texte).toMatch(/douze mille/);
	});

	it('garde en ligne ignorée une écriture sans référence de pièce', () => {
		const resultat = importerExportComptable(fec(ligneFec({ PieceRef: '' })));
		expect(resultat.factures).toHaveLength(0);
		expect(resultat.ignorees[0]!.raison).toMatch(/référence/i);
	});
});

describe('import d’un CSV générique', () => {
	const csv = [
		'Reference;Client;Montant TTC;Date emission;Date echeance',
		'F-2026-01;Fournitures Durand;12 000,00;2026-04-15;2026-05-15',
		'F-2026-02;Ateliers Martin;1.234,56;2026-04-20;2026-05-20'
	].join('\n');

	it('lit les factures et leurs deux dates', () => {
		const resultat = importerExportComptable(csv);

		expect(resultat.format).toBe('CSV_GENERIQUE');
		expect(resultat.factures).toHaveLength(2);
		expect(resultat.factures[0]!.reference).toBe('F-2026-01');
		expect(resultat.factures[0]!.dateEcheance).toBe('2026-05-15');
		expect(versEuros(resultat.factures[1]!.montantTTC)).toBe('1 234,56');
	});

	it('n’invente pas de règlement là où le format n’en porte pas', () => {
		expect(importerExportComptable(csv).reglements).toEqual([]);
	});
});

describe('refus', () => {
	it('refuse un fichier de format inconnu plutôt que d’en tirer du vide', () => {
		expect(() => importerExportComptable('rien de tabulaire ici')).toThrowError(/format/i);
	});
});
