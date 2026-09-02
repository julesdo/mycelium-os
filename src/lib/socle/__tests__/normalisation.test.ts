import { describe, it, expect } from 'vitest';
import { normaliserLibelle, normaliserFournisseur } from '../normalisation';

describe('normaliserLibelle', () => {
	it('met en majuscules et écrase les espaces multiples', () => {
		expect(normaliserLibelle('  carotte   rondelle  ')).toBe('CAROTTE RONDELLE');
	});

	it('retire les accents pour que les variantes se rejoignent', () => {
		expect(normaliserLibelle('Pâtes complètes')).toBe(normaliserLibelle('Pates completes'));
	});

	it('conserve les mentions de conditionnement — elles portent du sens', () => {
		expect(normaliserLibelle('CAROTTE RONDELLE 4/4 BIO 2.5KG')).toContain('4/4');
		expect(normaliserLibelle('CAROTTE RONDELLE 4/4 BIO 2.5KG')).toContain('2.5KG');
	});

	it('rapproche deux écritures du même produit', () => {
		expect(normaliserLibelle('CAROTTE  RONDELLE 4/4 BIO')).toBe(
			normaliserLibelle('carotte rondelle 4/4 bio')
		);
	});

	it('écrase les espaces insécables comme les espaces ordinaires', () => {
		expect(normaliserLibelle('FILET DE BOEUF')).toBe('FILET DE BOEUF');
	});
});

describe('normaliserLibelle — ligatures et apostrophes', () => {
	// BŒUF est écrit des deux façons selon le fournisseur, et tombe dans la
	// famille qui porte le seuil des 60 % : la fusion n'est pas cosmétique.
	it('décompose la ligature œ', () => {
		expect(normaliserLibelle('Bœuf haché 15%')).toBe(normaliserLibelle('Boeuf hache 15%'));
	});

	it('décompose la ligature æ', () => {
		expect(normaliserLibelle('Ex æquo')).toBe(normaliserLibelle('Ex aequo'));
	});

	it('unifie les deux apostrophes', () => {
		expect(normaliserLibelle('POMME D’API')).toBe(normaliserLibelle("POMME D'API"));
	});
});

describe('normaliserLibelle — substitutions d’OCR', () => {
	it('rapproche une variante océrisée de sa forme propre', () => {
		expect(normaliserLibelle('CAR0TTES SABLES VRAC')).toBe(
			normaliserLibelle('CAROTTES SABLES VRAC')
		);
	});

	it.each([
		['P0MME GALA', 'POMME GALA'],
		['CAB!LLAUD', 'CABILLAUD'],
		['FR!GO L!VRAISON', 'FRIGO LIVRAISON'],
		['L3S HALLES', 'LES HALLES'],
		['8RETONNES', 'BRETONNES']
	])('%s se normalise comme %s', (ocr, propre) => {
		expect(normaliserLibelle(ocr)).toBe(normaliserLibelle(propre));
	});

	it('ne casse PAS un chiffre légitime dans un conditionnement', () => {
		// 2.5KG, 4/4 et H.V.E 3 portent des chiffres qui sont de vrais chiffres.
		expect(normaliserLibelle('P0MME GALA H.V.E 3')).toContain('3');
		expect(normaliserLibelle('CAROTTE 4/4 2.5KG')).toContain('2.5KG');
		expect(normaliserLibelle('CAROTTE 4/4 2.5KG')).toContain('4/4');
	});

	it('ne casse pas un code produit numérique', () => {
		expect(normaliserLibelle('REF 88213')).toContain('88213');
	});

	it('ne casse pas un conditionnement multiplicatif', () => {
		// Le 1 de « 4X1KG » est bordé de lettres et serait pris pour un I par
		// une substitution aveugle : c'est un vrai chiffre.
		expect(normaliserLibelle('YAOURT NATURE 4X1KG')).toContain('4X1KG');
		expect(normaliserLibelle('EAU DE SOURCE 6X1L')).toContain('6X1L');
		expect(normaliserLibelle('CONSERVE 12X500G')).toContain('12X500G');
	});

	it('ne fusionne pas deux conditionnements différents', () => {
		expect(normaliserLibelle('CAROTTE 2.5KG')).not.toBe(normaliserLibelle('CAROTTE 25KG'));
		expect(normaliserLibelle('THON 4/4')).not.toBe(normaliserLibelle('THON 1/2'));
	});

	it('est idempotente — normaliser deux fois ne change rien', () => {
		for (const libelle of ['CAR0TTES 4/4', '8RETONNES 2.5KG', 'CAB!LLAUD MSC', 'Bœuf 4X1KG']) {
			const une = normaliserLibelle(libelle);
			expect(normaliserLibelle(une)).toBe(une);
		}
	});
});

describe('normaliserFournisseur', () => {
	it('retire les formes juridiques', () => {
		expect(normaliserFournisseur('TRANSGOURMET SAS')).toBe('TRANSGOURMET');
		expect(normaliserFournisseur('Pomona S.A.')).toBe('POMONA');
	});

	it('retire aussi les formes juridiques agricoles', () => {
		expect(normaliserFournisseur('GAEC DES QUATRE VENTS')).toBe('DES QUATRE VENTS');
		expect(normaliserFournisseur('EARL Du Verger')).toBe('DU VERGER');
	});

	it('applique aussi les substitutions d’OCR', () => {
		expect(normaliserFournisseur('S.A.R.L. L3S C0MPT0IRS')).toBe(
			normaliserFournisseur('SARL LES COMPTOIRS')
		);
	});

	it('ne vide jamais un nom réduit à sa seule forme juridique', () => {
		expect(normaliserFournisseur('SARL')).toBe('SARL');
	});
});
