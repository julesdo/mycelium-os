import { describe, it, expect } from 'vitest';
import { depuisEuros, versEuros, fraction, ZERO } from '../../../socle/montants';
import { reveler, interetsCourusEntre, bilanDesPertes } from '../revelation';
import type { FacturePourRevelation } from '../revelation';

/**
 * LA RÉVÉLATION — ce que le gérant ne savait pas avoir le droit de réclamer.
 *
 * C'est le moment le plus important de toute la relation, et il dure soixante
 * secondes : le client dépose son historique, et le produit répond avec un
 * montant qu'il ignorait. Pas une projection, pas une promesse — de l'argent
 * DÉJÀ DÛ, calculé sur ses propres factures.
 *
 * TROIS PROPRIÉTÉS SONT VÉRIFIÉES ICI, ET AUCUNE N'EST COSMÉTIQUE.
 *
 * 1. LE SUPPLÉMENT EST DISTINCT DU PRINCIPAL. Le principal, le gérant le
 *    connaît : c'est ce que dit sa comptabilité. Le supplément — intérêts de
 *    retard et indemnité forfaitaire — est ce que personne n'a jamais calculé.
 *    Les mélanger transformerait la révélation en simple relevé d'impayés,
 *    c'est-à-dire en quelque chose qu'il a déjà.
 *
 * 2. L'INDEMNITÉ SE COMPTE PAR FACTURE. `parametres.ts` l'écrit en toutes
 *    lettres : « 40 € PAR FACTURE, jamais par créance ». Comptée une fois sur
 *    dix factures, neuf indemnités sont abandonnées — et le défaut reste
 *    invisible tant qu'aucun dossier ne groupe plusieurs factures.
 *
 * 3. CE QU'ON NE SAIT PAS CHIFFRER S'AFFICHE. Un total silencieusement amputé
 *    est pire qu'un total incomplet annoncé : le premier se croit exact.
 */

/** 10 % l'an — le taux des fixtures, choisi pour que le calcul se refasse de tête. */
const DIX_POUR_CENT = fraction(10n, 100n);

function facture(surcharge: Partial<FacturePourRevelation> = {}): FacturePourRevelation {
	return {
		reference: 'F-001',
		montantExigible: depuisEuros('10000,00'),
		dateExigibilite: '2025-01-01',
		reglements: [],
		taux: [{ debut: '2025-01-01', taux: DIX_POUR_CENT }],
		statutPaiement: 'IMPAYEE',
		...surcharge
	};
}

describe('ce qui est dû, et ce qu’on ignorait pouvoir réclamer', () => {
	it('sépare le principal du supplément', () => {
		// 10 000 € à 10 % l'an sur 365 jours = 1 000,00 € d'intérêts,
		// plus 40,00 € d'indemnité forfaitaire = 1 040,00 € de supplément.
		const revelation = reveler([facture()], '2026-01-01', 'ACT_365');

		expect(versEuros(revelation.principal)).toBe('10 000,00');
		expect(versEuros(revelation.interets)).toBe('1 000,00');
		expect(versEuros(revelation.indemnites)).toBe('40,00');
		expect(versEuros(revelation.supplement)).toBe('1 040,00');
		expect(versEuros(revelation.total)).toBe('11 040,00');
	});

	it('compte l’indemnité PAR FACTURE, jamais une fois pour toutes', () => {
		// Trois factures du même débiteur : 120 €, pas 40. C'est l'erreur la plus
		// facile à commettre en agrégeant, et elle abandonne de l'argent dû.
		const trois = [
			facture({ reference: 'F-001' }),
			facture({ reference: 'F-002' }),
			facture({ reference: 'F-003' })
		];

		const revelation = reveler(trois, '2026-01-01', 'ACT_365');

		expect(versEuros(revelation.indemnites)).toBe('120,00');
		expect(revelation.nombreFactures).toBe(3);
	});

	it('décompose ligne par ligne, pour que le chiffre se refasse à la main', () => {
		// Un total qu'on ne peut pas décomposer est un chiffre qu'on demande de
		// croire. Le débiteur qui le conteste le refera ; le gérant doit pouvoir
		// le refaire avant lui.
		const revelation = reveler([facture()], '2026-01-01', 'ACT_365');

		expect(revelation.lignes).toHaveLength(1);
		const ligne = revelation.lignes[0]!;
		expect(ligne.reference).toBe('F-001');
		expect(versEuros(ligne.principalRestantDu)).toBe('10 000,00');
		expect(versEuros(ligne.interets)).toBe('1 000,00');
		expect(versEuros(ligne.indemniteForfaitaire)).toBe('40,00');
		expect(versEuros(ligne.supplement)).toBe('1 040,00');
	});

	it('le total est exactement la somme de ses parts', () => {
		const revelation = reveler(
			[
				facture({ reference: 'A' }),
				facture({ reference: 'B', montantExigible: depuisEuros('3333,33') })
			],
			'2026-01-01',
			'ACT_365'
		);

		expect(revelation.total).toBe(
			revelation.principal + revelation.interets + revelation.indemnites
		);
		expect(revelation.supplement).toBe(revelation.interets + revelation.indemnites);
	});
});

describe('ce qui est écarté, et pourquoi', () => {
	it('écarte une facture soldée — la question est chez le juriste', () => {
		// `docs/blueprint/01-FRONTIERE-MVP.md` la pose : jusqu'où l'indemnité et
		// les intérêts restent réclamables sur une facture dont le principal a
		// déjà été payé. Tant qu'elle n'est pas tranchée, on retient le périmètre
		// le plus étroit — les impayés — parce que c'est le seul défendable.
		const revelation = reveler([facture({ statutPaiement: 'SOLDEE' })], '2026-01-01', 'ACT_365');

		expect(revelation.nombreFactures).toBe(0);
		expect(revelation.supplement).toBe(ZERO);
		expect(revelation.lignes).toEqual([]);
	});

	it('garde une facture partiellement payée', () => {
		// Elle reste due pour son solde, et son indemnité l'est aussi.
		const revelation = reveler(
			[facture({ statutPaiement: 'PARTIELLEMENT_PAYEE' })],
			'2026-01-01',
			'ACT_365'
		);

		expect(revelation.nombreFactures).toBe(1);
	});

	it('écarte une facture qui n’est pas encore échue', () => {
		// Aucun intérêt ne court avant l'exigibilité, et l'indemnité n'est due
		// qu'au premier jour de RETARD. L'inclure gonflerait la révélation de 40 €
		// par facture à échoir — un chiffre faux qui a l'air juste.
		const revelation = reveler(
			[facture({ dateExigibilite: '2026-06-01' })],
			'2026-01-01',
			'ACT_365'
		);

		expect(revelation.nombreFactures).toBe(0);
		expect(revelation.supplement).toBe(ZERO);
	});

	it('écarte une facture exigible le jour même de l’arrêté', () => {
		// Le retard commence le lendemain. Zéro jour d'intérêt, donc rien à
		// révéler ce jour-là.
		const revelation = reveler(
			[facture({ dateExigibilite: '2026-01-01' })],
			'2026-01-01',
			'ACT_365'
		);

		expect(revelation.nombreFactures).toBe(0);
	});
});

describe('ce qu’on ne sait pas chiffrer', () => {
	it('nomme la facture au lieu d’amputer le total en silence', () => {
		// Une date de départ qui n'existe pas au calendrier fait lever le calcul.
		// La laisser tomber sous silence produirait un total plus petit que la
		// réalité, et personne ne s'en apercevrait.
		const revelation = reveler(
			[facture({ reference: 'F-ABIMEE', dateExigibilite: '2026-02-30' })],
			'2026-06-01',
			'ACT_365'
		);

		expect(revelation.nonChiffrees).toHaveLength(1);
		expect(revelation.nonChiffrees[0]!.reference).toBe('F-ABIMEE');
		expect(revelation.nonChiffrees[0]!.raison).toMatch(/2026-02-30/);
	});

	it('continue de chiffrer les autres', () => {
		const revelation = reveler(
			[
				facture({ reference: 'F-SAINE' }),
				facture({ reference: 'F-ABIMEE', dateExigibilite: 'zzz' })
			],
			'2026-01-01',
			'ACT_365'
		);

		expect(revelation.nombreFactures).toBe(1);
		expect(versEuros(revelation.interets)).toBe('1 000,00');
		expect(revelation.nonChiffrees).toHaveLength(1);
	});

	it('n’invente rien sur un jeu vide', () => {
		// Règle d'écran n° 4 : le vide montre le chemin, jamais des cadrans à zéro.
		// C'est l'écran qui décide quoi montrer ; la règle, elle, rend zéro.
		const revelation = reveler([], '2026-01-01', 'ACT_365');

		expect(revelation.nombreFactures).toBe(0);
		expect(revelation.total).toBe(ZERO);
		expect(revelation.nonChiffrees).toEqual([]);
	});
});

/**
 * LE COMPTEUR VIVANT — « il a monté cette nuit ».
 *
 * ⚠️ LE NOM DIT CE QUE LE CHIFFRE MESURE, ET C'EST DÉLIBÉRÉ. Le plan l'appelait
 * `monteeEntre` ; il s'appelle `interetsCourusEntre`, parce qu'une « montée »
 * pourrait se lire comme la variation du TOTAL — laquelle inclut le principal
 * d'une facture qui vient d'échoir, et ferait bondir le compteur de plusieurs
 * milliers d'euros en donnant l'impression que ce sont des intérêts.
 *
 * CE QU'IL MESURE : ce qui s'est accumulé sur de l'argent DÉJÀ réclamable.
 * Une facture qui échoit dans l'intervalle est un ÉVÉNEMENT — elle remonte dans
 * le flux comme FACTURE_ECHUE — pas une accumulation nocturne.
 *
 * ET SURTOUT : L'INDEMNITÉ FORFAITAIRE N'EN EST JAMAIS. 40 € sont dus UNE FOIS,
 * pas 40 € par nuit. Un compteur qui grimpe de 40 € toutes les vingt-quatre
 * heures s'effondre au premier contrôle, et emporte avec lui la crédibilité de
 * tous les autres chiffres du produit.
 */
describe('le compteur vivant', () => {
	it('monte d’un jour sur l’autre sur une facture déjà échue', () => {
		const montee = interetsCourusEntre([facture()], '2026-01-01', '2026-01-02', 'ACT_365');
		expect(montee > ZERO).toBe(true);
	});

	it('ne compte que les intérêts, jamais l’indemnité', () => {
		// C'EST LA DIFFÉRENCE DE DEUX ARRÊTÉS, PAS L'INTÉRÊT D'UN JOUR ARRONDI —
		// et les deux ne donnent pas le même centime.
		//
		//   au 01/01/2026, 365 jours : 1 000 000 × 3 650 / 36 500 = 100 000 c pile
		//   au 02/01/2026, 366 jours : 1 000 000 × 3 660 / 36 500 = 100 273,97 c,
		//                              arrondi au demi-centime supérieur → 100 274
		//   différence                                              = 274 c = 2,74 €
		//
		// L'intérêt journalier « à la main » vaut 2,7397 €, qu'on serait tenté
		// d'écrire 2,73 en tronquant. Le produit n'arrondit qu'UNE fois par
		// segment, et jamais par jour : c'est ce qui permet au débiteur de refaire
		// le calcul et de retomber sur le même centime.
		//
		// Si l'indemnité entrait dans le calcul, le chiffre dépasserait 40 €.
		const montee = interetsCourusEntre([facture()], '2026-01-01', '2026-01-02', 'ACT_365');
		expect(versEuros(montee)).toBe('2,74');
	});

	it('ne compte pas le principal d’une facture qui vient d’échoir', () => {
		// Elle n'était pas encore réclamable hier : ni son principal, ni ses 40 €
		// ne sont « montés cette nuit ». C'est un événement, pas une accumulation.
		const montee = interetsCourusEntre(
			[facture({ dateExigibilite: '2026-01-01' })],
			'2026-01-01',
			'2026-01-02',
			'ACT_365'
		);
		expect(montee).toBe(ZERO);
	});

	it('ne monte pas sur une facture soldée', () => {
		const montee = interetsCourusEntre(
			[facture({ statutPaiement: 'SOLDEE' })],
			'2026-01-01',
			'2026-01-02',
			'ACT_365'
		);
		expect(montee).toBe(ZERO);
	});

	it('ne monte pas entre deux dates identiques', () => {
		const montee = interetsCourusEntre([facture()], '2026-01-01', '2026-01-01', 'ACT_365');
		expect(montee).toBe(ZERO);
	});

	it('ne descend jamais — une facture qu’on ne sait pas chiffrer vaut zéro', () => {
		const montee = interetsCourusEntre(
			[facture({ dateExigibilite: 'zzz' })],
			'2026-01-01',
			'2026-01-02',
			'ACT_365'
		);
		expect(montee).toBe(ZERO);
	});
});

/**
 * LE COMPTEUR DE ZÉRO PERTE — et pourquoi il doit pouvoir afficher un échec.
 *
 * « Avant Letikette : 34 000 € éteints en silence. Depuis : 0 € prescrit,
 * 214 jours. » C'est le compteur qu'on ne veut pas casser, et il n'a de valeur
 * que parce qu'il PEUT se casser : un badge qui ne peut afficher que zéro ne
 * dit rien.
 *
 * ⚠️ LE SECOND CHIFFRE EST L'AVEU D'UN ÉCHEC DU PRODUIT. Une créance prescrite
 * pendant qu'on la surveillait, c'est exactement ce que ce produit existe pour
 * empêcher. Il s'affiche quand même — le cacher ferait du premier chiffre une
 * publicité au lieu d'une mesure.
 *
 * ⚠️ ET LE DOUTE NE PROFITE JAMAIS AU PRODUIT. Une facture sans date de
 * prescription n'est pas « sauvée » : elle n'est PAS SURVEILLÉE, et elle compte
 * comme telle. La ranger du bon côté serait se donner raison sur une donnée
 * qu'on n'a pas.
 */
describe('le bilan des pertes', () => {
	function impayee(reference: string, datePrescription?: string): FacturePourRevelation {
		return facture({ reference, datePrescription });
	}

	it('compte ce qui s’est éteint AVANT l’arrivée du client', () => {
		const bilan = bilanDesPertes([impayee('F-VIEILLE', '2025-06-01')], '2026-01-01', '2026-09-09');

		expect(bilan.nombreEteintesAvant).toBe(1);
		expect(versEuros(bilan.eteintesAvant)).toBe('10 000,00');
		expect(bilan.nombreEteintesDepuis).toBe(0);
	});

	it('compte séparément ce qui s’est éteint SOUS surveillance', () => {
		// C'est le chiffre qui doit rester à zéro, et qui doit pouvoir ne pas l'être.
		const bilan = bilanDesPertes([impayee('F-PERDUE', '2026-04-01')], '2026-01-01', '2026-09-09');

		expect(bilan.nombreEteintesAvant).toBe(0);
		expect(bilan.nombreEteintesDepuis).toBe(1);
		expect(versEuros(bilan.eteintesDepuis)).toBe('10 000,00');
	});

	it('ne compte pas une facture dont la prescription n’est pas encore atteinte', () => {
		const bilan = bilanDesPertes([impayee('F-VIVANTE', '2031-01-01')], '2026-01-01', '2026-09-09');

		expect(bilan.nombreEteintesAvant).toBe(0);
		expect(bilan.nombreEteintesDepuis).toBe(0);
	});

	it('range une facture sans date de prescription en angle mort, pas du bon côté', () => {
		const bilan = bilanDesPertes([impayee('F-SANS-DATE')], '2026-01-01', '2026-09-09');

		expect(bilan.nombreEteintesAvant).toBe(0);
		expect(bilan.nombreEteintesDepuis).toBe(0);
		expect(bilan.nonSurveillees).toEqual(['F-SANS-DATE']);
	});

	it('range aussi une date de prescription inexploitable en angle mort', () => {
		const bilan = bilanDesPertes([impayee('F-ABIMEE', '2026-02-30')], '2026-01-01', '2026-09-09');

		expect(bilan.nonSurveillees).toEqual(['F-ABIMEE']);
	});

	it('ignore une facture soldée — elle n’est pas une perte, elle est payée', () => {
		const bilan = bilanDesPertes(
			[facture({ reference: 'F-PAYEE', datePrescription: '2025-06-01', statutPaiement: 'SOLDEE' })],
			'2026-01-01',
			'2026-09-09'
		);

		expect(bilan.nombreEteintesAvant).toBe(0);
		expect(bilan.nonSurveillees).toEqual([]);
	});

	it('compte les jours depuis l’arrivée, pas depuis la première facture', () => {
		// L'affirmation porte sur NOTRE période de surveillance. La dater depuis la
		// plus vieille facture s'attribuerait des mois qu'on n'a pas travaillés.
		const bilan = bilanDesPertes([], '2026-01-01', '2026-09-09');
		expect(bilan.joursSousSurveillance).toBe(251);
	});
});
