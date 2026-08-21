import { describe, it, expect } from 'vitest';
import {
	chercherDoublon,
	numeroComparable,
	numeroExploitable,
	type FactureConnue
} from '../doublons';

/**
 * Ce que ces tests protègent : la seule catégorie de défaut de ce produit qui
 * fait signer au gérant une déclaration inexacte sans que rien ne le montre.
 *
 * Ils couvrent donc les deux sens de l'erreur. Rater un doublon compte une
 * facture deux fois — le taux est faux et l'écran est muet. En inventer un
 * écarte une vraie facture — le taux repose sur moins d'achats, mais le gérant
 * le VOIT et peut rétablir. Les cas « ne doit PAS matcher » sont donc au moins
 * aussi importants que les autres.
 */

const facture = (o: Partial<FactureConnue> & { documentId: string }): FactureConnue => ({
	supplierId: 'f1',
	invoiceNumber: 'FA-2026-0318',
	invoiceDate: '2026-03-18',
	totalHT: 1712.4,
	...o
});

describe('numeroComparable', () => {
	it('ignore ponctuation et casse', () => {
		expect(numeroComparable('FA-2026-0318')).toBe('FA20260318');
		expect(numeroComparable('fa 2026 0318')).toBe('FA20260318');
		expect(numeroComparable('FA/2026/0318')).toBe('FA20260318');
	});
});

describe('numeroExploitable', () => {
	it('refuse ce qui n’identifie rien', () => {
		expect(numeroExploitable(null)).toBe(false);
		expect(numeroExploitable('1')).toBe(false);
		expect(numeroExploitable('001')).toBe(false);
		expect(numeroExploitable('FACTURE')).toBe(false);
		expect(numeroExploitable('N/C')).toBe(false);
	});

	it('accepte un vrai numéro', () => {
		expect(numeroExploitable('FA-2026-0318')).toBe(true);
		expect(numeroExploitable('2026001')).toBe(true);
	});
});

describe('chercherDoublon — ce qu’il DOIT attraper', () => {
	it('même fournisseur, même numéro écrit autrement', () => {
		const v = chercherDoublon(facture({ documentId: 'd2', invoiceNumber: 'fa 2026 0318' }), [
			facture({ documentId: 'd1' })
		]);
		expect(v).toEqual({ documentId: 'd1', motif: 'MEME_NUMERO' });
	});

	it('le numéro l’emporte même si la date et le total diffèrent', () => {
		// Le cas réel : la photo de la facture rend un total mal lu, le PDF le
		// rend juste. Le numéro, lui, est le même — et c'est bien la même facture.
		const v = chercherDoublon(
			facture({ documentId: 'd2', invoiceDate: '2026-03-19', totalHT: 1700 }),
			[facture({ documentId: 'd1' })]
		);
		expect(v?.motif).toBe('MEME_NUMERO');
	});

	it('sans numéro lisible, retombe sur fournisseur + date + total', () => {
		const v = chercherDoublon(facture({ documentId: 'd2', invoiceNumber: null }), [
			facture({ documentId: 'd1', invoiceNumber: null })
		]);
		expect(v).toEqual({ documentId: 'd1', motif: 'MEME_DATE_ET_MONTANT' });
	});

	it('tolère le centime d’arrondi sur le total', () => {
		const v = chercherDoublon(
			facture({ documentId: 'd2', invoiceNumber: null, totalHT: 1712.41 }),
			[facture({ documentId: 'd1', invoiceNumber: null, totalHT: 1712.4 })]
		);
		expect(v?.motif).toBe('MEME_DATE_ET_MONTANT');
	});
});

describe('chercherDoublon — ce qu’il ne doit SURTOUT pas attraper', () => {
	it('deux fournisseurs différents avec le même numéro', () => {
		// « 2026-001 » est le premier numéro de l'année chez tout le monde.
		const v = chercherDoublon(
			facture({ documentId: 'd2', supplierId: 'f2', invoiceNumber: '2026-001' }),
			[facture({ documentId: 'd1', supplierId: 'f1', invoiceNumber: '2026-001' })]
		);
		expect(v).toBeNull();
	});

	it('un numéro générique ne fait jamais foi', () => {
		const v = chercherDoublon(
			facture({ documentId: 'd2', invoiceNumber: '1', invoiceDate: '2026-04-02' }),
			[facture({ documentId: 'd1', invoiceNumber: '1', invoiceDate: '2026-03-18' })]
		);
		expect(v).toBeNull();
	});

	it('fournisseur inconnu des deux côtés : on ne conclut rien', () => {
		const v = chercherDoublon(
			facture({ documentId: 'd2', supplierId: null, invoiceNumber: null }),
			[facture({ documentId: 'd1', supplierId: null, invoiceNumber: null })]
		);
		expect(v).toBeNull();
	});

	it('même jour, même fournisseur, montants distincts', () => {
		const v = chercherDoublon(
			facture({ documentId: 'd2', invoiceNumber: null, totalHT: 980 }),
			[facture({ documentId: 'd1', invoiceNumber: null, totalHT: 1712.4 })]
		);
		expect(v).toBeNull();
	});

	it('ne se compare jamais à lui-même', () => {
		expect(chercherDoublon(facture({ documentId: 'd1' }), [facture({ documentId: 'd1' })])).toBeNull();
	});

	it('deux numéros différents du même fournisseur le même jour', () => {
		// Deux livraisons dans la journée : cas courant chez un grossiste. Le
		// numéro tranche AVANT que la date et le montant n'aient leur mot à dire.
		const v = chercherDoublon(
			facture({ documentId: 'd2', invoiceNumber: 'FA-2026-0319', totalHT: 1712.4 }),
			[facture({ documentId: 'd1', invoiceNumber: 'FA-2026-0318', totalHT: 1712.4 })]
		);
		// Quand les DEUX numéros sont lisibles et distincts, ils font foi : le
		// repli sur date + montant ne doit pas les rapprocher. C'est le faux
		// positif le plus probable du niveau 3, et le seul qu'on puisse écarter
		// sans rien perdre.
		expect(v).toBeNull();
	});
});
