import { describe, it, expect } from 'vitest';
import { estimer } from '../estimation';
import { adresseDelaisDesBudgets, lireDelaisDesBudgets, RETARDS_PUBLICS } from '../retards-publics';
import type { LigneDecp } from '../decp';
import { tauxInteretsMoratoires } from '../../verticales/recouvrement/pays/france/commande-publique';

/**
 * L'ESTIMATION AVANT L'APPEL (19/10/2026, audit, lot 5) : un majorant décomposé par
 * acheteur et par année, qui se refait à la main, et ses hypothèses écrites.
 */
const JOUR = '2026-10-19';

function ligne(champs: Partial<LigneDecp> & Pick<LigneDecp, 'uid'>): LigneDecp {
	return {
		acheteurId: '26250176000017',
		acheteurNom: 'CHU BESANCON',
		genre: 'HOPITAL',
		titulaireSiret: '81269851200041',
		titulaireNom: 'AVERROES SANTE SOCIAL',
		montantCentimes: 12_000_000n,
		dateNotification: '2025-01-15',
		dureeMois: 12,
		...champs
	};
}

describe('l’estimation d’un fournisseur public', () => {
	it('répartit le plafond mois par mois et applique le retard moyen des hôpitaux', () => {
		const e = estimer([ligne({ uid: 'a' })], new Map(), JOUR);
		expect(e.segments).toHaveLength(1);
		const s = e.segments[0]!;
		expect(s).toMatchObject({
			acheteur: 'CHU BESANCON',
			annee: 2025,
			montantAnnuelCentimes: 12_000_000n
		});
		// 70,2 jours en moyenne pour 50 permis : 20,2 jours de retard.
		expect(s.joursDeRetard).toBe(20.2);
		const t = tauxInteretsMoratoires('2025-07-01');
		const attendu = (((12_000_000 * Number(t.numerateur)) / Number(t.denominateur)) * 20.2) / 365;
		expect(Number(s.interetsCentimes)).toBeCloseTo(attendu, 0);
		// Douze factures, 50,7 % payées en retard : six indemnités.
		expect(s.indemnitesCentimes).toBe(6n * 4000n);
		expect(e.totalCentimes).toBe(s.interetsCentimes + s.indemnitesCentimes);
		expect(e.dateButoir).toBe('2029-12-31');
	});

	it('ne compte ni les années que la loi peut laisser prescrites, ni les mois à venir', () => {
		const e = estimer(
			[
				ligne({ uid: 'ancien', dateNotification: '2021-06-01', dureeMois: 24 }),
				ligne({ uid: 'neuf', dateNotification: '2026-09-01', dureeMois: 12 })
			],
			new Map(),
			JOUR
		);
		expect(e.segments.map((s) => s.annee)).toEqual([2022, 2023, 2026]);
		const de2026 = e.segments.find((s) => s.annee === 2026)!;
		expect(de2026.montantAnnuelCentimes).toBe(2_000_000n);
		expect(e.dateButoir).toBe('2026-12-31');
	});

	it('lit le délai du budget de la collectivité, et ne compte rien sous le délai permis', () => {
		const commune = ligne({
			uid: 'c',
			genre: 'COLLECTIVITE',
			acheteurId: '21930008800019',
			acheteurNom: 'COMMUNE DE BONDY'
		});
		const avecBudget = estimer([commune], new Map([['21930008800019', 607]]), JOUR);
		// 60,7 jours pour 30 permis : 30,7 jours de retard.
		expect(avecBudget.segments[0]!.joursDeRetard).toBe(30.7);
		expect(avecBudget.totalCentimes > 0n).toBe(true);

		const sansBudget = estimer([commune], new Map(), JOUR);
		// La moyenne des collectivités de métropole est sous le délai : rien n'est compté.
		expect(sansBudget.segments[0]!.joursDeRetard).toBe(0);
		expect(sansBudget.totalCentimes).toBe(0n);
		expect(sansBudget.dateButoir).toBeNull();
	});

	it('laisse les autres acheteurs de côté, et l’écrit', () => {
		const e = estimer([ligne({ uid: 'etat', genre: 'AUTRE' })], new Map(), JOUR);
		expect(e.segments).toHaveLength(0);
		expect(e.hypotheses.join(' ')).toMatch(/1 marché avec d’autres acheteurs publics/);
	});

	it('écrit ses hypothèses : le plafond, la répartition, les sources', () => {
		const e = estimer([ligne({ uid: 'a', dureeMois: undefined })], new Map(), JOUR);
		const texte = e.hypotheses.join(' ');
		expect(texte).toMatch(/plafond/);
		expect(texte).toMatch(/douze mois/);
		expect(texte).toContain(RETARDS_PUBLICS.hopitaux.source);
	});
});

describe('les délais des budgets de collectivité (DGFiP)', () => {
	it('se demandent par SIRET', () => {
		const url = new URL(adresseDelaisDesBudgets(['23750007900312', '21750001600019']));
		expect(url.searchParams.get('where')).toBe('code_insee in (23750007900312, 21750001600019)');
	});

	it('gardent le budget principal, en dixièmes de jour', () => {
		const lus = lireDelaisDesBudgets({
			total_count: 3,
			results: [
				{ code_insee: 23750007900312, type_bc: 'BP', dgp_annuel_moyen: 70.98 },
				{ code_insee: 23750007900312, type_bc: 'BA', dgp_annuel_moyen: 12 },
				{ code_insee: 21750001600019, type_bc: 'BP', dgp_annuel_moyen: 31.41 }
			]
		});
		expect(lus.get('23750007900312')).toBe(710);
		expect(lus.get('21750001600019')).toBe(314);
	});
});
