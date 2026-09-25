import { describe, it, expect } from 'vitest';
import { depuisEuros, versEuros, fraction } from '../../../socle/montants';
import { decompterCreance } from '../decompte';
import type { FacturePourDecompte } from '../decompte';
import { controlerDecompte, exigerDecompteComplet } from '../controle';

/**
 * Le garde-fou le plus important du produit (§ 6 du brief).
 *
 * Le titre exécutoire ne porte que sur les sommes chiffrées dans l'acte. Ce qui
 * n'y figure pas est définitivement perdu — pas « à réclamer plus tard » :
 * perdu. Le produit doit donc REFUSER de produire un acte incomplet, et
 * afficher ce qui serait abandonné, en euros.
 *
 * C'est le seul endroit du produit où un refus vaut mieux qu'un résultat.
 */

const DIX_POUR_CENT = fraction(10n, 100n);

function facture(reference: string, montant: string): FacturePourDecompte {
	return {
		reference,
		montantExigible: depuisEuros(montant),
		dateExigibilite: '2025-01-01',
		reglements: [],
		taux: [{ debut: '2025-01-01', taux: DIX_POUR_CENT }]
	};
}

describe('contrôle de complétude', () => {
	it('laisse passer un décompte qui couvre toutes les factures du débiteur', () => {
		const factures = [facture('F-001', '10000,00'), facture('F-002', '5000,00')];
		const decompte = decompterCreance(factures, '2026-01-01', 'ACT_365','PENALITES_DABORD');

		const controle = controlerDecompte({
			decompte,
			facturesConnues: [
				{ reference: 'F-001', montantExigible: depuisEuros('10000,00') },
				{ reference: 'F-002', montantExigible: depuisEuros('5000,00') }
			]
		});

		expect(controle.complet).toBe(true);
		expect(controle.abandons).toEqual([]);
		expect(versEuros(controle.montantAbandonne)).toBe('0,00');
	});

	it('signale une facture du débiteur absente du décompte, avec son montant', () => {
		const decompte = decompterCreance([facture('F-001', '10000,00')], '2026-01-01', 'ACT_365','PENALITES_DABORD');

		const controle = controlerDecompte({
			decompte,
			facturesConnues: [
				{ reference: 'F-001', montantExigible: depuisEuros('10000,00') },
				{ reference: 'F-002', montantExigible: depuisEuros('5000,00') }
			]
		});

		expect(controle.complet).toBe(false);
		expect(controle.abandons).toHaveLength(1);
		expect(controle.abandons[0]!.nature).toBe('FACTURE_ECARTEE');
		expect(controle.abandons[0]!.reference).toBe('F-002');
		expect(versEuros(controle.montantAbandonne)).toBe('5 000,00');
	});

	it('chiffre le total de plusieurs factures écartées', () => {
		const decompte = decompterCreance([facture('F-001', '10000,00')], '2026-01-01', 'ACT_365','PENALITES_DABORD');

		const controle = controlerDecompte({
			decompte,
			facturesConnues: [
				{ reference: 'F-001', montantExigible: depuisEuros('10000,00') },
				{ reference: 'F-002', montantExigible: depuisEuros('5000,00') },
				{ reference: 'F-003', montantExigible: depuisEuros('1234,56') }
			]
		});

		expect(versEuros(controle.montantAbandonne)).toBe('6 234,56');
	});

	it('signale un paramètre juridique manquant, sans pouvoir le chiffrer', () => {
		const decompte = decompterCreance([facture('F-001', '10000,00')], '2026-01-01', 'ACT_365','PENALITES_DABORD');

		const controle = controlerDecompte({
			decompte,
			facturesConnues: [{ reference: 'F-001', montantExigible: depuisEuros('10000,00') }],
			parametresRequis: ['tarifCommissaireJusticeL126', 'mentionsObligatoiresInjonction']
		});

		expect(controle.complet).toBe(false);
		const manquants = controle.abandons.filter((a) => a.nature === 'PARAMETRE_MANQUANT');
		expect(manquants.map((a) => a.reference)).toEqual([
			'tarifCommissaireJusticeL126',
			'mentionsObligatoiresInjonction'
		]);
		// Un paramètre absent ne se chiffre pas : on ne sait pas ce qu'il coûte.
		expect(manquants.every((a) => a.montantEnJeu === null)).toBe(true);
	});

	it('ne signale pas un paramètre requis qui est bien validé', () => {
		const decompte = decompterCreance([facture('F-001', '10000,00')], '2026-01-01', 'ACT_365','PENALITES_DABORD');

		const controle = controlerDecompte({
			decompte,
			facturesConnues: [{ reference: 'F-001', montantExigible: depuisEuros('10000,00') }],
			parametresRequis: ['indemniteForfaitaire']
		});

		expect(controle.complet).toBe(true);
	});

	it('ne prend pas pour inexpliqués les intérêts qu’un paiement a éteints', () => {
		// Un paiement s'impute d'abord sur les intérêts courus : les périodes en
		// font plus que ce qui reste dû, et la différence est exactement ce que
		// le paiement a éteint. Le contrôle doit le savoir, sinon chaque dossier
		// avec un règlement partiel serait bloqué à tort.
		const decompte = decompterCreance(
			[
				{
					...facture('F-001', '10000,00'),
					reglements: [{ date: '2025-07-01', montant: depuisEuros('4000,00'), nature: 'PAIEMENT' }]
				}
			],
			'2026-01-01',
			'ACT_365',
		'PENALITES_DABORD'
		);

		const controle = controlerDecompte({
			decompte,
			facturesConnues: [{ reference: 'F-001', montantExigible: depuisEuros('10000,00') }]
		});

		expect(controle.abandons).toEqual([]);
	});

	it('signale des intérêts qu’aucune période ne justifie', () => {
		// Défense en profondeur : si les périodes détaillées disparaissent, le
		// montant d'intérêts n'est plus justifiable, et l'acte ne doit pas partir
		// — même si ce montant se trouve être juste.
		const decompte = decompterCreance([facture('F-001', '10000,00')], '2026-01-01', 'ACT_365','PENALITES_DABORD');
		const ampute = {
			...decompte,
			lignes: [{ ...decompte.lignes[0]!, segments: [] }]
		};

		const controle = controlerDecompte({
			decompte: ampute,
			facturesConnues: [{ reference: 'F-001', montantExigible: depuisEuros('10000,00') }]
		});

		expect(controle.complet).toBe(false);
		expect(controle.abandons.map((a) => a.nature)).toContain('INTERETS_INEXPLIQUES');
	});

	it('CHIFFRE l’écart, au lieu de laisser un blanc à la place du montant', () => {
		// ⚠️ CET ABANDON POSAIT `montantEnJeu: null`, alors que ses deux termes
		// sont calculés dans la même boucle. Un abandon sans montant se lit comme
		// une remarque de forme ; chiffré, il se lit comme ce qu'il est — de
		// l'argent qui ne figurera pas dans l'acte, donc perdu.
		const decompte = decompterCreance([facture('F-001', '10000,00')], '2026-01-01', 'ACT_365','PENALITES_DABORD');
		const ligne = decompte.lignes[0]!;

		// Sans aucune période, l'écart vaut la totalité des intérêts annoncés.
		const sansPeriode = controlerDecompte({
			decompte: { ...decompte, lignes: [{ ...ligne, segments: [] }] },
			facturesConnues: [{ reference: 'F-001', montantExigible: depuisEuros('10000,00') }]
		});
		const inexplique = sansPeriode.abandons.find((a) => a.nature === 'INTERETS_INEXPLIQUES')!;
		expect(inexplique.montantEnJeu).not.toBeNull();
		expect(versEuros(inexplique.montantEnJeu!)).toBe(versEuros(ligne.interets));
		// Et il entre dans le total abandonné, qui n'est plus amputé de cette ligne.
		expect(versEuros(sansPeriode.montantAbandonne)).toBe(versEuros(ligne.interets));

		// Dans l'autre sens — des intérêts annoncés PLUS BAS que ce que les
		// périodes justifient — c'est la part qu'on réclamerait en moins. La
		// valeur absolue est le montant en jeu dans les deux cas.
		const sousEvalues = controlerDecompte({
			decompte: {
				...decompte,
				lignes: [{ ...ligne, interets: depuisEuros('0,00') }]
			},
			facturesConnues: [{ reference: 'F-001', montantExigible: depuisEuros('10000,00') }]
		});
		const inverse = sousEvalues.abandons.find((a) => a.nature === 'INTERETS_INEXPLIQUES')!;
		expect(versEuros(inverse.montantEnJeu!)).toBe(versEuros(ligne.interets));
	});
});

describe('exigerDecompteComplet — le refus', () => {
	it('laisse produire l’acte quand tout est couvert', () => {
		const decompte = decompterCreance([facture('F-001', '10000,00')], '2026-01-01', 'ACT_365','PENALITES_DABORD');
		const controle = controlerDecompte({
			decompte,
			facturesConnues: [{ reference: 'F-001', montantExigible: depuisEuros('10000,00') }]
		});

		expect(() => exigerDecompteComplet(controle)).not.toThrow();
	});

	it('refuse, et nomme dans le message ce qui serait perdu', () => {
		const decompte = decompterCreance([facture('F-001', '10000,00')], '2026-01-01', 'ACT_365','PENALITES_DABORD');
		const controle = controlerDecompte({
			decompte,
			facturesConnues: [
				{ reference: 'F-001', montantExigible: depuisEuros('10000,00') },
				{ reference: 'F-002', montantExigible: depuisEuros('5000,00') }
			]
		});

		expect(() => exigerDecompteComplet(controle)).toThrowError(/F-002/);
		expect(() => exigerDecompteComplet(controle)).toThrowError(/5 000,00/);
		expect(() => exigerDecompteComplet(controle)).toThrowError(/définitivement/i);
	});
});
