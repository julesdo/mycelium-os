import { describe, it, expect } from 'vitest';
import { depuisEuros, versEuros, fraction } from '../../../socle/montants';
import { decompterFacture, decompterCreance, joursEntre } from '../decompte';
import { PARAMETRES, exiger } from '../parametres';
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
		const d = decompterFacture(facture(), '2026-01-01', 'ACT_365', 'PENALITES_DABORD');

		expect(versEuros(d.principalRestantDu)).toBe('10 000,00');
		expect(versEuros(d.interets)).toBe('1 000,00');
		expect(versEuros(d.indemniteForfaitaire)).toBe('40,00');
		expect(versEuros(d.total)).toBe('11 040,00');
	});

	it('impute un paiement partiel d’abord sur les intérêts courus, puis sur le principal', () => {
		// Paiement de 4 000,00 € le 2025-07-01 (C. civ. 1343-1).
		//   segment 1 : 2025-01-01 → 2025-07-01, 181 j sur 10 000,00 €
		//     1 000 000 × 10 × 181 / 36 500 = 49 589,04… → 49 589 c courus
		//   le paiement éteint 49 589 c d'intérêts, puis 350 411 c de principal
		//     principal = 1 000 000 − 350 411 = 649 589 c
		//   segment 2 : 2025-07-01 → 2026-01-01, 184 j sur 6 495,89 €
		//       649 589 × 10 × 184 / 36 500 = 32 746,40… → 32 746 c
		//   intérêts dus = 49 589 + 32 746 − 49 589 = 32 746 c = 327,46 €
		//   total        = 6 495,89 + 327,46 + 40,00 = 6 863,35 €
		//
		// L'ancien calcul déduisait tout du principal et rendait 6 838,36 € :
		// il abandonnait 24,99 € au débiteur sur cette seule facture.
		const d = decompterFacture(
			facture({
				reglements: [{ date: '2025-07-01', montant: depuisEuros('4000,00'), nature: 'PAIEMENT' }]
			}),
			'2026-01-01',
			'ACT_365',
			'PENALITES_DABORD'
		);

		expect(versEuros(d.principalRestantDu)).toBe('6 495,89');
		expect(versEuros(d.interets)).toBe('327,46');
		expect(versEuros(d.total)).toBe('6 863,35');
		expect(
			d.imputations.map((i) => [i.date, versEuros(i.surInterets), versEuros(i.surPrincipal)])
		).toEqual([['2025-07-01', '495,89', '3 504,11']]);
	});

	it('laisse dues les pénalités d’un débiteur qui règle le principal en retard', () => {
		// 10 000,00 € réglés le 2025-03-01, pour une échéance au 2025-01-01.
		//   segment 1 : 59 j sur 10 000,00 € → 1 000 000 × 10 × 59 / 36 500 = 16 164,38… → 16 164 c
		//   le paiement éteint d'abord les 16 164 c, puis 983 836 c de principal
		//     principal = 16 164 c
		//   segment 2 : 306 j sur 161,64 € → 16 164 × 10 × 306 / 36 500 = 1 355,11… → 1 355 c
		//   total = 161,64 + 13,55 + 40,00 = 215,19 €
		const d = decompterFacture(
			facture({
				reglements: [{ date: '2025-03-01', montant: depuisEuros('10000,00'), nature: 'PAIEMENT' }]
			}),
			'2026-01-01',
			'ACT_365',
			'PENALITES_DABORD'
		);

		expect(versEuros(d.principalRestantDu)).toBe('161,64');
		expect(versEuros(d.interets)).toBe('13,55');
		expect(versEuros(d.indemniteForfaitaire)).toBe('40,00');
		expect(versEuros(d.total)).toBe('215,19');
	});

	it('impute un avoir sur le principal seul, à sa date : il réduit le prix, ce n’est pas un paiement', () => {
		// Un avoir de 4 000,00 € au 2025-07-01 éteint la dette pour l'avenir, pas
		// rétroactivement, et il ne touche pas aux intérêts déjà courus.
		//   segment 2 sur 6 000,00 € : 600 000 × 10 × 184 / 36 500 = 30 246,57… → 30 247 c
		//   intérêts = 49 589 + 30 247 = 79 836 c = 798,36 €
		const avecAvoir = decompterFacture(
			facture({
				reglements: [{ date: '2025-07-01', montant: depuisEuros('4000,00'), nature: 'AVOIR' }]
			}),
			'2026-01-01',
			'ACT_365',
			'PENALITES_DABORD'
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
			'ACT_365',
			'PENALITES_DABORD'
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
			'ACT_ACT',
			'PENALITES_DABORD'
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
			'ACT_365',
			'PENALITES_DABORD'
		);

		expect(versEuros(d.interets)).toBe('1 002,74');
	});

	it('ne produit ni intérêt ni indemnité avant la date d’exigibilité', () => {
		// Pas de retard, donc pas de frais de recouvrement : les 40 € n'étaient
		// dus qu'à une facture en retard, et le calcul les ajoutait quand même.
		const d = decompterFacture(facture(), '2024-06-01', 'ACT_365', 'PENALITES_DABORD');
		expect(versEuros(d.interets)).toBe('0,00');
		expect(versEuros(d.indemniteForfaitaire)).toBe('0,00');
		expect(versEuros(d.total)).toBe('10 000,00');
	});

	it('ne compte pas l’indemnité d’une facture réglée à son échéance', () => {
		const d = decompterFacture(
			facture({
				reglements: [{ date: '2025-01-01', montant: depuisEuros('10000,00'), nature: 'PAIEMENT' }]
			}),
			'2026-01-01',
			'ACT_365',
			'PENALITES_DABORD'
		);
		expect(versEuros(d.principalRestantDu)).toBe('0,00');
		expect(versEuros(d.interets)).toBe('0,00');
		expect(versEuros(d.indemniteForfaitaire)).toBe('0,00');
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
		const a = decompterFacture(f, '2026-01-01', 'ACT_ACT', 'PENALITES_DABORD');
		const b = decompterFacture(f, '2026-01-01', 'ACT_ACT', 'PENALITES_DABORD');
		expect(versEuros(a.total)).toBe(versEuros(b.total));
		expect(a.segments.length).toBe(b.segments.length);
	});
});

describe('traçabilité — chaque euro doit pouvoir être expliqué', () => {
	it('expose un segment par période homogène, avec son taux et ses jours', () => {
		const d = decompterFacture(
			facture({
				reglements: [{ date: '2025-07-01', montant: depuisEuros('4000,00'), nature: 'PAIEMENT' }],
				taux: [
					{ debut: '2025-01-01', taux: DIX_POUR_CENT },
					{ debut: '2025-10-01', taux: VINGT_POUR_CENT }
				]
			}),
			'2026-01-01',
			'ACT_365',
			'PENALITES_DABORD'
		);

		// Trois ruptures : l'exigibilité, le paiement, le changement de taux.
		expect(d.segments.map((s) => [s.debut, s.fin, s.jours])).toEqual([
			['2025-01-01', '2025-07-01', 181],
			['2025-07-01', '2025-10-01', 92],
			['2025-10-01', '2026-01-01', 92]
		]);
	});

	it('les segments, moins ce que les règlements ont éteint, font exactement les intérêts dus', () => {
		const d = decompterFacture(
			facture({
				reglements: [
					{ date: '2025-05-11', montant: depuisEuros('999,99'), nature: 'PAIEMENT' },
					{ date: '2025-09-30', montant: depuisEuros('150,00'), nature: 'AVOIR' }
				]
			}),
			'2026-01-01',
			'ACT_365',
			'PENALITES_DABORD'
		);

		const sommeSegments = d.segments.reduce((total, s) => total + s.interets, 0n);
		const eteints = d.imputations.reduce((total, i) => total + i.surInterets, 0n);
		expect(sommeSegments - eteints).toBe(d.interets);
	});

	it('les règlements, sur le principal, font exactement ce qui a été payé du principal', () => {
		const d = decompterFacture(
			facture({
				reglements: [
					{ date: '2024-12-15', montant: depuisEuros('500,00'), nature: 'ACOMPTE' },
					{ date: '2025-05-11', montant: depuisEuros('999,99'), nature: 'PAIEMENT' }
				]
			}),
			'2026-01-01',
			'ACT_365',
			'PENALITES_DABORD'
		);

		const surPrincipal = d.imputations.reduce((total, i) => total + i.surPrincipal, 0n);
		expect(depuisEuros('10000,00') - surPrincipal).toBe(d.principalRestantDu);
		// L'acompte versé avant l'échéance va tout entier au principal : rien n'avait couru.
		expect(versEuros(d.imputations[0]!.surInterets)).toBe('0,00');
	});
});

describe('décompte d’une créance — plusieurs factures', () => {
	it('additionne les factures et compte l’indemnité PAR FACTURE', () => {
		// Deux factures identiques d'un an à 10 % sur 10 000,00 € :
		//   principal 20 000,00 · intérêts 2 000,00 · indemnités 2 × 40,00
		const creance = decompterCreance(
			[facture({ reference: 'F-001' }), facture({ reference: 'F-002' })],
			'2026-01-01',
			'ACT_365',
			'PENALITES_DABORD'
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
			'ACT_365',
			'PENALITES_DABORD'
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
				'ACT_365',
				'PENALITES_DABORD'
			)
		).toThrowError(/taux/i);
	});
});

/**
 * UNE DATE IMPOSSIBLE NE DOIT JAMAIS DEVENIR UNE AUTRE DATE.
 *
 * `instant()` se contentait du format `AAAA-MM-JJ` puis d'un garde-fou sur
 * `Number.isNaN(Date.parse(...))`. Ce garde-fou ne mord pas sur le moteur de
 * bun : `Date.parse('2026-02-30T00:00:00Z')` ne rend PAS `NaN`, il roule sur le
 * 2 mars. Une échéance saisie au 30 février produisait donc silencieusement
 * deux jours d'intérêts en moins sur une somme réclamée.
 *
 * ⚠️ C'est le seul endroit du produit où une date fausse se transforme en
 * EUROS. Elle doit lever, pas se corriger.
 */
describe('dates impossibles', () => {
	it('refuse une date qui n’existe pas au lieu de rouler sur le mois suivant', () => {
		expect(() => joursEntre('2026-02-30', '2026-03-10')).toThrow(/2026-02-30/);
		expect(() => joursEntre('2026-01-01', '2026-02-30')).toThrow(/2026-02-30/);
	});

	it('refuse un mois hors bornes', () => {
		expect(() => joursEntre('2026-13-01', '2026-12-31')).toThrow(/2026-13-01/);
	});

	it('compte toujours juste sur les dates réelles', () => {
		expect(joursEntre('2026-02-28', '2026-03-01')).toBe(1);
		expect(joursEntre('2024-02-28', '2024-03-01')).toBe(2);
		expect(joursEntre('2026-03-01', '2026-02-28')).toBe(0);
	});
});

describe('l’ordre d’imputation — un choix du gérant', () => {
	const AVEC_PAIEMENT = facture({
		reglements: [{ date: '2025-07-01', montant: depuisEuros('4000,00'), nature: 'PAIEMENT' }]
	});

	it('impute un paiement d’abord sur le principal quand c’est l’ordre choisi', () => {
		// Paiement de 4 000,00 € le 2025-07-01, principal d'abord.
		//   segment 1 : 181 j sur 10 000,00 € → 49 589 c courus
		//   le paiement va entier au principal : 1 000 000 − 400 000 = 600 000 c
		//   segment 2 : 184 j sur 6 000,00 € → 600 000 × 10 × 184 / 36 500 = 30 246,57… → 30 247 c
		//   intérêts = 49 589 + 30 247 = 79 836 c ; total = 600 000 + 79 836 + 4 000 = 683 836 c
		const d = decompterFacture(AVEC_PAIEMENT, '2026-01-01', 'ACT_365', 'PRINCIPAL_DABORD');
		expect(versEuros(d.principalRestantDu)).toBe('6 000,00');
		expect(versEuros(d.interets)).toBe('798,36');
		expect(versEuros(d.total)).toBe('6 838,36');
		expect(versEuros(d.imputations[0]!.surInterets)).toBe('0,00');
	});

	it('retient le total le plus bas tant que le gérant n’a pas choisi, et chiffre l’autre', () => {
		// Pénalités d'abord : 6 863,35 € (voir plus haut). Principal d'abord : 6 838,36 €.
		// Le doute ne profite jamais au produit : c'est le second qui est retenu.
		const d = decompterCreance([AVEC_PAIEMENT], '2026-01-01', 'ACT_365', 'A_CONFIRMER');
		expect(versEuros(d.total)).toBe('6 838,36');
		expect(d.imputation.ordre).toBe('PRINCIPAL_DABORD');
		expect(d.imputation.confirme).toBe(false);
		expect(versEuros(d.imputation.totalAutreOrdre!)).toBe('6 863,35');
	});

	it('applique l’ordre confirmé, sans chiffrer d’autre variante', () => {
		const d = decompterCreance([AVEC_PAIEMENT], '2026-01-01', 'ACT_365', 'PENALITES_DABORD');
		expect(versEuros(d.total)).toBe('6 863,35');
		expect(d.imputation).toEqual({
			ordre: 'PENALITES_DABORD',
			confirme: true,
			totalAutreOrdre: null
		});
	});

	it('ne demande rien quand les deux ordres donnent le même total', () => {
		// Aucun paiement : l'ordre ne change rien, il n'y a pas de variante à montrer.
		const d = decompterCreance([facture()], '2026-01-01', 'ACT_365', 'A_CONFIRMER');
		expect(d.imputation.totalAutreOrdre).toBeNull();
	});
});

describe('aucun jour de pénalité compté en trop', () => {
	it('compte exactement les jours de retard, de l’échéance à l’arrêté', () => {
		// Échéance le 2025-01-01, arrêté le 2025-01-31 : 30 jours de retard. Que l'on
		// compte de l'échéance incluse à l'arrêté exclu, ou du lendemain de
		// l'échéance à l'arrêté inclus (L441-10 II), c'est le même nombre.
		expect(exiger(PARAMETRES.pointDepartPenalitesRetard)).toBe('LENDEMAIN_ECHEANCE');
		const d = decompterFacture(facture(), '2025-01-31', 'ACT_365', 'PENALITES_DABORD');
		expect(d.segments.reduce((jours, s) => jours + s.jours, 0)).toBe(30);
	});
});
