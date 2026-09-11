import { describe, it, expect } from 'vitest';
import { depuisEuros } from '../../../socle/montants';
import { lettrer, PLAFOND_CANDIDATES } from '../lettrage';
import type { FactureCandidate } from '../lettrage';

/**
 * LE LETTRAGE DÉGRADÉ — retrouver quelles factures composent un virement.
 *
 * Un client paie 4 820 € en une fois, sans référence. Aucune facture ne porte ce
 * montant : c'est une somme. Tant que le rapprochement n'est pas fait, ces
 * factures restent « impayées » — et le produit les fait remonter, les compte
 * dans le montant identifié, et finira par proposer de relancer.
 *
 * ⚠️ RELANCER UN CLIENT QUI A DÉJÀ PAYÉ EST LA PIRE ERREUR POSSIBLE D'UN
 * LOGICIEL DE RECOUVREMENT. C'est pour ça que ce module refuse de trancher dès
 * qu'il y a deux réponses : il les montre toutes les deux et demande. Un
 * lettrage automatique sur une solution ambiguë a une chance sur deux d'être
 * faux, et l'erreur se paie chez le client du client.
 *
 * ⚠️ ET LE PROBLÈME EST EXPONENTIEL. C'est une somme de sous-ensembles : vingt
 * factures font un million de combinaisons. L'espace de recherche est BORNÉ, et
 * le dépassement se DIT au lieu de faire ramer le serveur.
 *
 * Ce module ne connaît pas la notion de débiteur : c'est l'appelant qui ne lui
 * passe que les factures du bon. Lui donner celles de tout l'établissement
 * produirait des rapprochements entre clients — absurdes, et invisibles.
 */

function facture(reference: string, euros: string): FactureCandidate {
	return { reference, resteDu: depuisEuros(euros) };
}

describe('quand la réponse est unique', () => {
	it('retrouve une facture seule', () => {
		const resultat = lettrer([facture('A', '1200,00')], depuisEuros('1200,00'));

		expect(resultat.issue).toBe('UNIQUE');
		if (resultat.issue !== 'UNIQUE') return;
		expect(resultat.combinaison.references).toEqual(['A']);
	});

	it('retrouve la somme de trois factures', () => {
		// Le cas du virement groupé : 1 200 + 2 400 + 1 220 = 4 820.
		const resultat = lettrer(
			[facture('A', '1200,00'), facture('B', '2400,00'), facture('C', '1220,00')],
			depuisEuros('4820,00')
		);

		expect(resultat.issue).toBe('UNIQUE');
		if (resultat.issue !== 'UNIQUE') return;
		expect([...resultat.combinaison.references].sort()).toEqual(['A', 'B', 'C']);
	});

	it('ignore les factures qui ne participent pas', () => {
		const resultat = lettrer(
			[facture('A', '1200,00'), facture('B', '2400,00'), facture('C', '9999,00')],
			depuisEuros('3600,00')
		);

		expect(resultat.issue).toBe('UNIQUE');
		if (resultat.issue !== 'UNIQUE') return;
		expect([...resultat.combinaison.references].sort()).toEqual(['A', 'B']);
	});

	it('rend un total égal au montant reçu, au centime', () => {
		const resultat = lettrer(
			[facture('A', '1234,56'), facture('B', '765,44')],
			depuisEuros('2000,00')
		);

		expect(resultat.issue).toBe('UNIQUE');
		if (resultat.issue !== 'UNIQUE') return;
		expect(resultat.combinaison.total).toBe(depuisEuros('2000,00'));
	});
});

describe('quand il y a plusieurs réponses — on ne tranche pas', () => {
	it('rend TOUTES les combinaisons plutôt que la première trouvée', () => {
		// ⚠️ LE TEST QUI PORTE LA RÈGLE. Deux factures de 1 000 € et un paiement de
		// 1 000 € : le produit ne peut pas savoir laquelle est soldée. Choisir
		// laisserait l'autre en impayé et la ferait relancer.
		const resultat = lettrer(
			[facture('A', '1000,00'), facture('B', '1000,00')],
			depuisEuros('1000,00')
		);

		expect(resultat.issue).toBe('AMBIGU');
		if (resultat.issue !== 'AMBIGU') return;
		expect(resultat.combinaisons).toHaveLength(2);
		expect(resultat.combinaisons.map((c) => c.references.join('+')).sort()).toEqual(['A', 'B']);
	});

	it('voit l’ambiguïté entre une facture seule et une somme', () => {
		// 3 000 = C, ou A + B. Deux lectures également plausibles.
		const resultat = lettrer(
			[facture('A', '1000,00'), facture('B', '2000,00'), facture('C', '3000,00')],
			depuisEuros('3000,00')
		);

		expect(resultat.issue).toBe('AMBIGU');
		if (resultat.issue !== 'AMBIGU') return;
		expect(resultat.combinaisons.map((c) => [...c.references].sort().join('+')).sort()).toEqual([
			'A+B',
			'C'
		]);
	});

	it('rend les combinaisons dans un ordre stable', () => {
		// Deux exécutions doivent proposer les mêmes choix dans le même ordre :
		// un écran qui réordonne ses options à chaque rendu se lit comme un bug.
		//                    ⚠️ PAS `JSON.stringify` : il ne sait pas sérialiser un
		// `bigint`, et tout ce module en manipule. On compare ce qui compte à
		// l'écran — l'ordre des combinaisons et celui des références dedans.
		const candidates = [facture('A', '1000,00'), facture('B', '2000,00'), facture('C', '3000,00')];
		const ordre = (montant: string, liste: FactureCandidate[]) => {
			const resultat = lettrer(liste, depuisEuros(montant));
			return resultat.issue === 'AMBIGU'
				? resultat.combinaisons.map((c) => c.references.join('+'))
				: [];
		};

		expect(ordre('3000,00', candidates)).toEqual(ordre('3000,00', [...candidates].reverse()));
		// Et ce n'est pas vide : sans ça, l'égalité ci-dessus serait vraie pour rien.
		expect(ordre('3000,00', candidates).length).toBe(2);
	});
});

describe('quand il n’y a pas de réponse', () => {
	it('le dit, au lieu de rapprocher approximativement', () => {
		// ⚠️ AUCUNE TOLÉRANCE. Un paiement de 4 820,01 € ne solde pas une somme de
		// 4 820,00 € : la différence d'un centime cache peut-être un escompte, un
		// frais bancaire, ou une facture qu'on ne connaît pas. Trancher à la place
		// du gérant attribuerait un paiement à tort.
		const resultat = lettrer(
			[facture('A', '1200,00'), facture('B', '2400,00')],
			depuisEuros('3600,01')
		);

		expect(resultat.issue).toBe('AUCUNE');
	});

	it('refuse un montant nul — l’ensemble vide n’est pas une réponse', () => {
		expect(lettrer([facture('A', '1200,00')], depuisEuros('0,00')).issue).toBe('AUCUNE');
	});

	it('refuse un montant négatif', () => {
		expect(lettrer([facture('A', '1200,00')], depuisEuros('-500,00')).issue).toBe('AUCUNE');
	});

	it('rend AUCUNE sur une liste vide', () => {
		expect(lettrer([], depuisEuros('1000,00')).issue).toBe('AUCUNE');
	});
});

describe('l’espace de recherche est borné, et le dépassement se dit', () => {
	it('refuse de chercher au-delà du plafond de candidates', () => {
		// ⚠️ VINGT FACTURES FONT UN MILLION DE COMBINAISONS. Sans borne, un
		// établissement qui a trois cents factures ouvertes chez un débiteur ferait
		// tourner le serveur jusqu'à l'expiration — et le gérant verrait un écran
		// qui charge sans fin, sans savoir pourquoi.
		const trop = Array.from({ length: PLAFOND_CANDIDATES + 1 }, (_, rang) =>
			facture(`F-${rang}`, '100,00')
		);

		const resultat = lettrer(trop, depuisEuros('100,00'));
		expect(resultat.issue).toBe('TROP_DE_CANDIDATES');
		if (resultat.issue !== 'TROP_DE_CANDIDATES') return;
		expect(resultat.candidates).toBe(PLAFOND_CANDIDATES + 1);
	});

	it('accepte exactement le plafond', () => {
		const pile = Array.from({ length: PLAFOND_CANDIDATES }, (_, rang) =>
			facture(`F-${rang}`, `${rang + 1}00,00`)
		);
		expect(lettrer(pile, depuisEuros('100,00')).issue).not.toBe('TROP_DE_CANDIDATES');
	});

	it('borne aussi le NOMBRE de combinaisons rendues', () => {
		// Huit factures à 100 € et un paiement de 300 € donnent 56 combinaisons.
		// En proposer 56 à un gérant n'est pas lui demander de trancher, c'est lui
		// demander d'abandonner.
		const huit = Array.from({ length: 8 }, (_, rang) => facture(`F-${rang}`, '100,00'));
		const resultat = lettrer(huit, depuisEuros('300,00'));

		expect(resultat.issue).toBe('AMBIGU');
		if (resultat.issue !== 'AMBIGU') return;
		expect(resultat.combinaisons.length).toBeLessThanOrEqual(10);
		// Et le fait qu'il y en ait plus se DIT, sinon le gérant croirait choisir
		// dans une liste complète.
		expect(resultat.tronque).toBe(true);
	});

	it('ne se dit pas tronqué quand tout tient', () => {
		const resultat = lettrer(
			[facture('A', '1000,00'), facture('B', '1000,00')],
			depuisEuros('1000,00')
		);
		expect(resultat.issue).toBe('AMBIGU');
		if (resultat.issue !== 'AMBIGU') return;
		expect(resultat.tronque).toBe(false);
	});
});

describe('ce qu’on ne met pas dans la recherche', () => {
	it('écarte une facture au reste dû nul', () => {
		// Une facture soldée ne participe à aucun rapprochement, et l'inclure
		// doublerait chaque combinaison sans rien changer au total.
		const resultat = lettrer(
			[facture('A', '1000,00'), facture('SOLDEE', '0,00')],
			depuisEuros('1000,00')
		);

		expect(resultat.issue).toBe('UNIQUE');
		if (resultat.issue !== 'UNIQUE') return;
		expect(resultat.combinaison.references).toEqual(['A']);
	});

	it('écarte une facture plus grosse que le paiement', () => {
		const resultat = lettrer(
			[facture('A', '1000,00'), facture('ENORME', '99999,00')],
			depuisEuros('1000,00')
		);

		expect(resultat.issue).toBe('UNIQUE');
	});
});
