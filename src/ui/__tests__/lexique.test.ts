import { describe, it, expect } from 'vitest';
import { illustrer, jetons } from '../lexique';

/**
 * Ce que ces tests protègent, ce n'est pas « la bonne image » — un lexique
 * approximatif est assumé — mais les trois mécanismes qui, s'ils cassent,
 * font afficher n'importe quoi avec aplomb :
 *
 *   1. le découpage en jetons entiers, sans sous-chaîne ;
 *   2. la priorité de l'entrée la plus longue ;
 *   3. le repli par famille, qui doit rester le DERNIER recours.
 */

describe('jetons', () => {
	it('met en majuscules, retire accents et ponctuation', () => {
		expect(jetons('Pommes de terre, à chair ferme')).toEqual([
			'POMMES',
			'DE',
			'TERRE',
			'A',
			'CHAIR',
			'FERME'
		]);
	});

	it('décompose la ligature œ, que NFD laisse intacte', () => {
		expect(jetons('Bœuf haché')).toEqual(['BOEUF', 'HACHE']);
	});

	it('conserve les chiffres, qui portent le conditionnement', () => {
		expect(jetons('LAIT DEMI-ECREME 6X1L')).toEqual(['LAIT', 'DEMI', 'ECREME', '6X1L']);
	});
});

describe('illustrer — jetons entiers, jamais de sous-chaîne', () => {
	it('ne voit pas RAIE dans FRAISE', () => {
		expect(illustrer('FRAISES GARIGUETTE')).toBe('🍓');
	});

	it('ne voit pas VIN dans VINAIGRE', () => {
		expect(illustrer('VINAIGRE BALSAMIQUE 1L')).toBe('🧴');
	});

	it('ne voit pas LAIT dans LAITUE', () => {
		expect(illustrer('LAITUE ICEBERG')).toBe('🥬');
	});

	it('ne voit pas POIS dans POISSON', () => {
		expect(illustrer('POISSON BLANC SURGELE')).toBe('🐟');
	});

	it('ne voit pas SAC dans SACHET', () => {
		expect(illustrer('THYM EN SACHET')).toBe('🌿');
	});
});

describe('illustrer — le pluriel et le féminin, et rien de plus', () => {
	it('accepte le S', () => {
		expect(illustrer('CAROTTES BOTTE')).toBe('🥕');
	});

	it('accepte le X', () => {
		expect(illustrer('CHOUX DE BRUXELLES')).toBe('🥬');
	});
});

describe('illustrer — la plus longue entrée gagne', () => {
	it('POMME DE TERRE bat POMME', () => {
		expect(illustrer('POMMES DE TERRE AGATA 25KG')).toBe('🥔');
		expect(illustrer('POMMES GOLDEN CAT 1')).toBe('🍎');
	});

	it('CHOU FLEUR bat CHOU', () => {
		expect(illustrer('CHOU FLEUR SURGELE')).toBe('🥦');
	});

	it('EAU DE JAVEL bat EAU', () => {
		expect(illustrer('EAU DE JAVEL 5L')).toBe('🧴');
		expect(illustrer('EAU MINERALE 6X1.5L')).toBe('💧');
	});

	it('PETIT POIS bat POIS', () => {
		expect(illustrer('PETITS POIS EXTRA FINS')).toBe('🫛');
	});

	it('un nom de poisson bat la mention « pêche durable » qui le suit', () => {
		// Le cas est réel : « CABILLAUD MSC PECHE DURABLE » contient PECHE, qui
		// est aussi un fruit. Le jeton le plus long tranche sans cas particulier.
		expect(illustrer('DOS DE CABILLAUD MSC PECHE DURABLE')).toBe('🐟');
		expect(illustrer('FILET PECHE DURABLE')).toBe('🐟');
		expect(illustrer('PECHES JAUNES AU SIROP')).toBe('🍑');
	});
});

describe('illustrer — les replis, dans l’ordre', () => {
	it('retombe sur la famille quand aucun mot n’est reconnu', () => {
		expect(illustrer('REF 88213 CAT A', 'LAITIERS')).toBe('🧀');
		expect(illustrer('REF 88213 CAT A', 'VIANDE')).toBe('🥩');
	});

	it('marque le non-alimentaire avant de regarder la famille', () => {
		expect(illustrer('PRESTATION DIVERSE', 'AUTRE', false)).toBe('📦');
	});

	it('retombe sur un couvert quand on ne sait rien du tout', () => {
		expect(illustrer('XZ-4471')).toBe('🍽️');
	});

	it('le lexique l’emporte toujours sur la famille, qui est plus grossière', () => {
		// Une ligne classée AUTRE mais dont le libellé dit « carottes » montre
		// des carottes : le libellé est la donnée la plus précise dont on dispose.
		expect(illustrer('CAROTTES RAPEES 5KG', 'AUTRE')).toBe('🥕');
	});
});

describe('illustrer — le non-alimentaire courant des factures de grossiste', () => {
	it.each([
		['SACS POUBELLE 100L', '🗑️'],
		['GANTS VINYLE T8', '🧤'],
		['LIQUIDE VAISSELLE 5L', '🧴'],
		['FRAIS DE PORT', '🚚'],
		['AVOIR SUR FACTURE 2024-118', '🧾'],
		['FILM ETIRABLE 45CM', '📦']
	])('%s', (libelle, attendu) => {
		expect(illustrer(libelle)).toBe(attendu);
	});
});
