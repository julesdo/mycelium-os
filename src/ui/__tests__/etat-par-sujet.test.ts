import { describe, it, expect } from 'vitest';
import { lirePourLeSujet, type PosePourUnSujet } from '../etat-par-sujet';

/**
 * CE QU'UN VOLET A POSÉ POUR UN SUJET NE SE LIT QUE SOUS CE SUJET.
 *
 * ⚠️ LE DÉFAUT QUE CES CAS FERMENT ÉTAIT EN PRODUCTION. La route des débiteurs
 * gardait la sélection de factures, les candidats du registre et le montant
 * d'un virement dans des états que rien ne vidait quand le débiteur ouvert
 * changeait. Après un retour du navigateur, « Constituer une créance » pouvait
 * viser une facture de A sous la fiche de B.
 *
 * Les quatre premiers cas sont les quatre situations d'un volet : rien de posé,
 * le même sujet, un autre sujet, aucun sujet. Le dernier ferme une écriture de
 * la fonction qui passerait les quatre autres.
 */

const SELECTION_VIDE: ReadonlySet<string> = new Set();

const SELECTION_DE_A: PosePourUnSujet<ReadonlySet<string>> = {
	sujet: 'debiteur-a',
	valeur: new Set(['facture-de-a'])
};

describe('lirePourLeSujet', () => {
	it('rend l’état de repos quand rien n’a été posé', () => {
		expect(lirePourLeSujet(null, 'debiteur-a', SELECTION_VIDE)).toBe(SELECTION_VIDE);
	});

	it('rend la valeur posée sous le sujet pour lequel elle a été posée', () => {
		expect(lirePourLeSujet(SELECTION_DE_A, 'debiteur-a', SELECTION_VIDE)).toBe(
			SELECTION_DE_A.valeur
		);
	});

	it('rend l’état de repos sous un autre sujet', () => {
		// Le défaut lui-même : ce qu'on a coché sous A ne se montre pas sous B.
		expect(lirePourLeSujet(SELECTION_DE_A, 'debiteur-b', SELECTION_VIDE)).toBe(SELECTION_VIDE);
	});

	it('rend l’état de repos quand aucun sujet n’est choisi', () => {
		// Le volet refermé : la pose de A reste en mémoire, et ne se lit nulle part.
		expect(lirePourLeSujet(SELECTION_DE_A, null, SELECTION_VIDE)).toBe(SELECTION_VIDE);
	});

	it('rend une valeur posée vide telle quelle, sans retomber sur le repos', () => {
		// Une écriture par `??` ou `||` rendrait ici l'état de repos : ce qu'on vient
		// d'effacer pour ce sujet réapparaîtrait dès que le repos n'est pas vide.
		expect(
			lirePourLeSujet<string | null>(
				{ sujet: 'debiteur-a', valeur: null },
				'debiteur-a',
				'Numéro refusé.'
			)
		).toBeNull();
		expect(
			lirePourLeSujet<string>({ sujet: 'debiteur-a', valeur: '' }, 'debiteur-a', '2026-09-14')
		).toBe('');
	});
});
