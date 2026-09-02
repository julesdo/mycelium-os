import { describe, it, expect } from 'vitest';
import { depuisEuros, versEuros, fraction } from '../../../socle/montants';
import { decompterFacture, decompterCreance, joursEntre } from '../decompte';
import type { FacturePourDecompte } from '../decompte';

/**
 * Le décompte — le calcul dont une erreur coûte de l'argent réel au client.
 *
 * Les cinq cas que le brief impose (§ 4.3) sont couverts nommément : facture
 * partiellement payée, plusieurs factures à taux différents, avoir intervenant
 * en cours de période, année bissextile, changement de taux en cours de
 * période.
 *
 * CHAQUE ATTENDU CI-DESSOUS EST CALCULÉ À LA MAIN dans son commentaire. Un
 * attendu recopié depuis la sortie du code ne teste rien : il constate ce que
 * le code fait, au lieu de dire ce qu'il devrait faire.
 */

/** 10 % l'an. */
const DIX_POUR_CENT = fraction(10n, 100n);
/** 20 % l'an. */
const VINGT_POUR_CENT = fraction(20n, 100n);

function facture(surcharge: Partial<FacturePourDecompte> = {}): FacturePourDecompte {
	return {
		reference: 'F-001',
		montantExigible: depuisEuros('10000,00'),
		dateExigibilite: '2025-01-01',
		reglements: [],
		taux: [{ debut: '2025-01-01', taux: DIX_POUR_CENT }],
		...surcharge
	};
}

describe('compte des jours', () => {
	it('compte les jours bornes incluse et exclue', () => {
		expect(joursEntre('2025-01-01', '2025-01-02')).toBe(1);
		expect(joursEntre('2025-01-01', '2026-01-01')).toBe(365);
	});

	it('connaît les années bissextiles', () => {
		// 2024 est bissextile, 2025 ne l'est pas.
		expect(joursEntre('2024-01-01', '2025-01-01')).toBe(366);
	});

	it('ne compte jamais de jours négatifs', () => {
		expect(joursEntre('2025-06-01', '2025-01-01')).toBe(0);
	});
});

describe('décompte d’une facture', () => {
	it('calcule une année pleine à taux fixe', () => {
		// 10 000,00 € à 10 % sur 365 jours d'une base de 365 :
		//   1 000 000 c × 10 × 365 / (100 × 365) = 100 000 c = 1 000,00 €
		const d = decompterFacture(facture(), '2026-01-01', 'ACT_365');

		expect(versEuros(d.principalRestantDu)).toBe('10 000,00');
		expect(versEuros(d.interets)).toBe('1 000,00');
		expect(versEuros(d.indemniteForfaitaire)).toBe('40,00');
		expect(versEuros(d.total)).toBe('11 040,00');
	});

	it('réduit la base d’intérêts à compter d’un paiement partiel', () => {
		// Paiement de 4 000,00 € le 2025-07-01.
		//   segment 1 : 2025-01-01 → 2025-07-01, 181 j sur 10 000,00 €
		//     1 000 000 × 10 × 181 / 36 500 = 49 589,04… → 49 589 c
		//   segment 2 : 2025-07-01 → 2026-01-01, 184 j sur 6 000,00 €
		//       600 000 × 10 × 184 / 36 500 = 30 246,57… → 30 247 c
		//   intérêts = 79 836 c = 798,36 €
		//   total    = 6 000,00 + 798,36 + 40,00 = 6 838,36 €
		const d = decompterFacture(
			facture({
				reglements: [
					{ date: '2025-07-01', montant: depuisEuros('4000,00'), nature: 'PAIEMENT' }
				]
			}),
			'2026-01-01',
			'ACT_365'
		);

		expect(versEuros(d.principalRestantDu)).toBe('6 000,00');
		expect(versEuros(d.interets)).toBe('798,36');
		expect(versEuros(d.total)).toBe('6 838,36');
	});

	it('traite un avoir exactement comme un paiement, à sa date', () => {
		// Un avoir de 4 000,00 € au 2025-07-01 doit donner le même décompte
		// qu'un paiement du même montant à la même date : il éteint la dette
		// pour l'avenir, pas rétroactivement.
		const avecAvoir = decompterFacture(
			facture({
				reglements: [{ date: '2025-07-01', montant: depuisEuros('4000,00'), nature: 'AVOIR' }]
			}),
			'2026-01-01',
			'ACT_365'
		);

		expect(versEuros(avecAvoir.interets)).toBe('798,36');
		expect(versEuros(avecAvoir.principalRestantDu)).toBe('6 000,00');
	});

	it('applique le taux en vigueur à chaque période quand il change', () => {
		// 10 % jusqu'au 2025-07-01, puis 20 %.
		//   segment 1 : 181 j à 10 % → 49 589 c   (comme ci-dessus)
		//   segment 2 : 184 j à 20 %
		//     1 000 000 × 20 × 184 / 36 500 = 100 821,91… → 100 822 c
		//   intérêts = 150 411 c = 1 504,11 €
		const d = decompterFacture(
			facture({
				taux: [
					{ debut: '2025-01-01', taux: DIX_POUR_CENT },
					{ debut: '2025-07-01', taux: VINGT_POUR_CENT }
				]
			}),
			'2026-01-01',
			'ACT_365'
		);

		expect(versEuros(d.interets)).toBe('1 504,11');
	});

	it('rend une année bissextile pleine égale au taux annoncé, en ACT_ACT', () => {
		// 2024 compte 366 jours. En base réelle (366), une année pleine à 10 %
		// rend exactement 10 % — c'est la propriété qui définit la convention.
		const d = decompterFacture(
			facture({
				dateExigibilite: '2024-01-01',
				taux: [{ debut: '2024-01-01', taux: DIX_POUR_CENT }]
			}),
			'2025-01-01',
			'ACT_ACT'
		);

		expect(versEuros(d.interets)).toBe('1 000,00');
	});

	it('rend la même année bissextile plus chère en ACT_365, et l’écart est visible', () => {
		// La MÊME période sur une base fixe de 365 :
		//   1 000 000 × 10 × 366 / 36 500 = 100 273,97… → 100 274 c = 1 002,74 €
		//
		// Les deux conventions diffèrent de 2,74 € sur 10 000 €. C'est petit, et
		// c'est exactement pourquoi le choix ne doit pas être implicite : sur un
		// portefeuille, l'écart devient une somme réclamée sans fondement, ou
		// abandonnée.
		const d = decompterFacture(
			facture({
				dateExigibilite: '2024-01-01',
				taux: [{ debut: '2024-01-01', taux: DIX_POUR_CENT }]
			}),
			'2025-01-01',
			'ACT_365'
		);

		expect(versEuros(d.interets)).toBe('1 002,74');
	});

	it('ne produit aucun intérêt avant la date d’exigibilité', () => {
		const d = decompterFacture(facture(), '2024-06-01', 'ACT_365');
		expect(versEuros(d.interets)).toBe('0,00');
	});

	it('rend un décompte reproductible au centime', () => {
		// Le critère d'acceptation du brief : le même dossier rejoué à la même
		// date de référence donne exactement le même résultat.
		const f = facture({
			reglements: [{ date: '2025-03-15', montant: depuisEuros('1234,56'), nature: 'ACOMPTE' }],
			taux: [
				{ debut: '2025-01-01', taux: DIX_POUR_CENT },
				{ debut: '2025-09-01', taux: VINGT_POUR_CENT }
			]
		});
		const a = decompterFacture(f, '2026-01-01', 'ACT_ACT');
		const b = decompterFacture(f, '2026-01-01', 'ACT_ACT');
		expect(versEuros(a.total)).toBe(versEuros(b.total));
		expect(a.segments.length).toBe(b.segments.length);
	});
});

describe('traçabilité — chaque euro doit pouvoir être expliqué', () => {
	it('expose un segment par période homogène, avec son taux et ses jours', () => {
		const d = decompterFacture(
			facture({
				reglements: [
					{ date: '2025-07-01', montant: depuisEuros('4000,00'), nature: 'PAIEMENT' }
				],
				taux: [
					{ debut: '2025-01-01', taux: DIX_POUR_CENT },
					{ debut: '2025-10-01', taux: VINGT_POUR_CENT }
				]
			}),
			'2026-01-01',
			'ACT_365'
		);

		// Trois ruptures : l'exigibilité, le paiement, le changement de taux.
		expect(d.segments.map((s) => [s.debut, s.fin, s.jours])).toEqual([
			['2025-01-01', '2025-07-01', 181],
			['2025-07-01', '2025-10-01', 92],
			['2025-10-01', '2026-01-01', 92]
		]);
	});

	it('la somme des segments fait exactement le total des intérêts', () => {
		const d = decompterFacture(
			facture({
				reglements: [{ date: '2025-05-11', montant: depuisEuros('999,99'), nature: 'PAIEMENT' }]
			}),
			'2026-01-01',
			'ACT_365'
		);

		const sommeSegments = d.segments.reduce((total, s) => total + s.interets, 0n);
		expect(sommeSegments).toBe(d.interets);
	});
});

describe('décompte d’une créance — plusieurs factures', () => {
	it('additionne les factures et compte l’indemnité PAR FACTURE', () => {
		// Deux factures identiques d'un an à 10 % sur 10 000,00 € :
		//   principal 20 000,00 · intérêts 2 000,00 · indemnités 2 × 40,00
		const creance = decompterCreance(
			[facture({ reference: 'F-001' }), facture({ reference: 'F-002' })],
			'2026-01-01',
			'ACT_365'
		);

		expect(versEuros(creance.principalRestantDu)).toBe('20 000,00');
		expect(versEuros(creance.interets)).toBe('2 000,00');
		expect(versEuros(creance.indemniteForfaitaire)).toBe('80,00');
		expect(versEuros(creance.total)).toBe('22 080,00');
		expect(creance.lignes.map((l) => l.reference)).toEqual(['F-001', 'F-002']);
	});

	it('gère des taux différents d’une facture à l’autre', () => {
		// F-001 à 10 % → 1 000,00 € · F-002 à 20 % → 2 000,00 €
		const creance = decompterCreance(
			[
				facture({ reference: 'F-001' }),
				facture({
					reference: 'F-002',
					taux: [{ debut: '2025-01-01', taux: VINGT_POUR_CENT }]
				})
			],
			'2026-01-01',
			'ACT_365'
		);

		expect(versEuros(creance.interets)).toBe('3 000,00');
	});

	it('refuse une facture dont aucun taux ne couvre la date d’exigibilité', () => {
		// Sans taux applicable, le calcul serait arbitraire. Il doit échouer
		// bruyamment plutôt que de retenir zéro — un décompte amputé de ses
		// intérêts abandonne définitivement ce qu'il ne réclame pas.
		expect(() =>
			decompterFacture(
				facture({ taux: [{ debut: '2025-06-01', taux: DIX_POUR_CENT }] }),
				'2026-01-01',
				'ACT_365'
			)
		).toThrowError(/taux/i);
	});
});
