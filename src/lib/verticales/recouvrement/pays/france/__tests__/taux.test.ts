import { describe, it, expect } from 'vitest';
import { depuisEuros, versEuros, multiplier } from '../../../../../socle/montants';
import { decompterFacture } from '../../../decompte';
import {
	TAUX_BCE_PAR_SEMESTRE,
	TAUX_INTERET_LEGAL,
	PLANCHERS_PUBLIES,
	semestreDe,
	tauxPenaliteParDefaut,
	plancherContractuel,
	periodesDeTauxParDefaut
} from '../taux';

/**
 * Les taux français, et surtout : la preuve qu'ils sont cohérents entre eux.
 *
 * Ces valeurs viennent de sources publiques, pas d'une mémoire de modèle. Le
 * test le plus important de ce fichier ne vérifie aucune fonction : il recoupe
 * nos taux d'intérêt légal contre les PLANCHERS publiés indépendamment. Si
 * quelqu'un recopie mal un chiffre, les deux séries cessent de concorder.
 */

describe('découpage en semestres', () => {
	it('range une date dans son semestre', () => {
		expect(semestreDe('2026-01-01')).toBe('2026-S1');
		expect(semestreDe('2026-06-30')).toBe('2026-S1');
		expect(semestreDe('2026-07-01')).toBe('2026-S2');
		expect(semestreDe('2026-12-31')).toBe('2026-S2');
	});
});

describe('cohérence croisée des séries — le test qui attrape une faute de frappe', () => {
	it.each(Object.keys(PLANCHERS_PUBLIES))(
		'le plancher publié de %s vaut bien trois fois notre taux légal professionnel',
		(semestre) => {
			const legal = TAUX_INTERET_LEGAL[semestre]!.professionnels;
			expect(legal * 3n).toBe(PLANCHERS_PUBLIES[semestre]!);
		}
	);

	it('couvre les mêmes semestres dans les deux séries de taux', () => {
		expect(Object.keys(TAUX_BCE_PAR_SEMESTRE).sort()).toEqual(
			Object.keys(TAUX_INTERET_LEGAL).sort()
		);
	});

	it('publie deux taux légaux distincts par semestre, comme la loi le prévoit', () => {
		for (const [semestre, taux] of Object.entries(TAUX_INTERET_LEGAL)) {
			expect(taux.particuliers, semestre).not.toBe(taux.professionnels);
			// Le taux des particuliers est systématiquement le plus élevé.
			expect(taux.particuliers, semestre).toBeGreaterThan(taux.professionnels);
		}
	});
});

describe('taux de pénalité par défaut — L441-10 II', () => {
	it('applique le taux BCE majoré de dix points', () => {
		// S1 2026 : BCE 2,15 % + 10 = 12,15 %
		expect(tauxPenaliteParDefaut('2026-03-15')).toEqual({
			numerateur: 1215n,
			denominateur: 10000n
		});
	});

	it('suit le changement de semestre', () => {
		// S2 2026 : BCE 2,40 % + 10 = 12,40 %
		expect(tauxPenaliteParDefaut('2026-08-15')).toEqual({
			numerateur: 1240n,
			denominateur: 10000n
		});
	});

	it('retrouve le taux d’un semestre ancien', () => {
		// S1 2025 : BCE 3,15 % + 10 = 13,15 %
		expect(tauxPenaliteParDefaut('2025-02-01')).toEqual({
			numerateur: 1315n,
			denominateur: 10000n
		});
	});

	it('refuse un semestre hors série plutôt que d’extrapoler', () => {
		// Extrapoler un taux non publié produirait un décompte faux qui a l'air
		// juste — exactement ce que la règle 0.1 interdit.
		expect(() => tauxPenaliteParDefaut('2019-05-01')).toThrowError(/2019-S1/);
		expect(() => tauxPenaliteParDefaut('2030-01-01')).toThrowError(/2030-S1/);
	});
});

describe('plancher contractuel — trois fois le taux légal', () => {
	it('vaut trois fois le taux légal des professionnels', () => {
		// S2 2026 : 3 × 2,75 % = 8,25 %
		expect(plancherContractuel('2026-08-15')).toEqual({
			numerateur: 825n,
			denominateur: 10000n
		});
	});

	it('refuse un semestre hors série', () => {
		expect(() => plancherContractuel('2019-05-01')).toThrow();
	});
});

describe('séries de périodes pour le décompte', () => {
	it('découpe la période en un segment par semestre traversé', () => {
		const periodes = periodesDeTauxParDefaut('2026-05-01', '2026-09-01');
		expect(periodes.map((p) => p.debut)).toEqual(['2026-05-01', '2026-07-01']);
		expect(periodes[0]!.taux.numerateur).toBe(1215n);
		expect(periodes[1]!.taux.numerateur).toBe(1240n);
	});

	it('rend une seule période quand tout tient dans un semestre', () => {
		const periodes = periodesDeTauxParDefaut('2026-02-01', '2026-05-01');
		expect(periodes).toHaveLength(1);
		expect(periodes[0]!.debut).toBe('2026-02-01');
	});

	it('traverse plusieurs années', () => {
		const periodes = periodesDeTauxParDefaut('2025-03-01', '2026-08-01');
		expect(periodes.map((p) => p.debut)).toEqual([
			'2025-03-01',
			'2025-07-01',
			'2026-01-01',
			'2026-07-01'
		]);
	});
});

describe('bout en bout — un décompte réel au taux légal français', () => {
	it('calcule les intérêts d’une facture impayée sur deux semestres', () => {
		// 10 000,00 € exigibles au 2026-05-01, arrêtés au 2026-09-01, en ACT_365.
		//
		//   segment 1 : 2026-05-01 → 2026-07-01, 61 j à 12,15 %
		//     1 000 000 × 1215 × 61 / (10 000 × 365) = 74 115 000 000 / 3 650 000
		//     = 20 305,47…  → 20 305 c
		//   segment 2 : 2026-07-01 → 2026-09-01, 62 j à 12,40 %
		//     1 000 000 × 1240 × 62 / 3 650 000 = 76 880 000 000 / 3 650 000
		//     = 21 063,01…  → 21 063 c
		//   intérêts = 41 368 c = 413,68 €
		const decompte = decompterFacture(
			{
				reference: 'F-2026-118',
				montantExigible: depuisEuros('10000,00'),
				dateExigibilite: '2026-05-01',
				reglements: [],
				taux: periodesDeTauxParDefaut('2026-05-01', '2026-09-01')
			},
			'2026-09-01',
			'ACT_365'
		);

		expect(decompte.segments).toHaveLength(2);
		expect(versEuros(decompte.interets)).toBe('413,68');
		// 10 000,00 principal + 413,68 intérêts + 40,00 indemnité
		expect(versEuros(decompte.total)).toBe('10 453,68');
	});

	it('l’indemnité forfaitaire reste de 40 € par facture', () => {
		const decompte = decompterFacture(
			{
				reference: 'F-001',
				montantExigible: depuisEuros('100,00'),
				dateExigibilite: '2026-05-01',
				reglements: [],
				taux: periodesDeTauxParDefaut('2026-05-01', '2026-05-02')
			},
			'2026-05-02',
			'ACT_365'
		);
		expect(versEuros(decompte.indemniteForfaitaire)).toBe('40,00');
	});
});

describe('un taux contractuel sous le plancher', () => {
	it('se compare au plancher sans être corrigé en silence', () => {
		// 5 % l'an, très en dessous du plancher de 8,25 % au S2 2026. Le module
		// doit permettre de le CONSTATER ; corriger le taux d'office écrirait
		// une conséquence juridique que personne n'a validée.
		const cinqPourCent = { numerateur: 500n, denominateur: 10000n };
		const plancher = plancherContractuel('2026-08-15');
		const cent = depuisEuros('100,00');

		expect(versEuros(multiplier(cent, cinqPourCent))).toBe('5,00');
		expect(versEuros(multiplier(cent, plancher))).toBe('8,25');
	});
});
