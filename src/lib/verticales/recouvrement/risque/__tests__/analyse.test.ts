import { describe, expect, it } from 'vitest';
import {
	analyserLeRisque,
	eurosRonds,
	type EntreesDeLAnalyse,
	type FicheEntreprise,
	type ParcoursDirigeant
} from '../analyse';
import { INDICE_DE_DEPART, PLAFOND_EN_PROCEDURE } from '../regles';

/**
 * L'INDICE DE SANTÉ : des faits, chacun sourcé, et un indice qui en est la somme.
 *
 * Ce que ces tests tiennent, au-delà du calcul :
 *   · l'indice se refait à la main (50 + la somme des effets) ;
 *   · des comptes confidentiels ne le baissent pas (L232-25), ils réduisent la lisibilité ;
 *   · un dirigeant mal rapproché ne se voit rien attribuer ;
 *   · aucun mot de jugement (« suspect », « fraude ») n'entre dans un fait.
 */

const AUJOURDHUI = '2026-10-13';

const SAINE: FicheEntreprise = {
	siren: '443061841',
	denomination: 'Imprimerie Delorme',
	formeJuridique: 'SAS, société par actions simplifiée',
	personneMorale: true,
	dateCreation: '2003-05-12',
	fermee: false,
	procedureEnCours: false,
	procedures: [],
	comptes: [
		{
			anneeCloture: 2025,
			dateCloture: '2025-12-31',
			dateDepot: '2026-06-20',
			confidentiels: false,
			resultatConfidentiel: false
		}
	],
	exercices: [
		{
			annee: 2025,
			dateCloture: '2025-12-31',
			chiffreAffaires: 420_000_00n,
			resultat: 38_500_00n,
			autonomieFinancierePct: 46,
			liquiditeGenerale: 1.8,
			delaiFournisseursJours: 38,
			croissancePct: 4
		}
	],
	actifNetSousMoitie: { enCours: false },
	dirigeants: [
		{
			nomComplet: 'Claire Delorme',
			nom: 'Delorme',
			prenom: 'Claire',
			personneMorale: false,
			qualites: ['Présidente'],
			depuis: '2003-05-12',
			naissance: { annee: 1971, mois: 4 }
		}
	],
	releveLe: AUJOURDHUI
};

const DIRIGEANTE_SANS_HISTOIRE: ParcoursDirigeant = {
	nomComplet: 'Claire Delorme',
	qualites: ['Présidente'],
	depuis: '2003-05-12',
	rapprochement: 'IDENTIFIE',
	societesTotal: 2,
	societes: [{ siren: '552100554', denomination: 'Delorme Immo', enActivite: true }],
	procedures: []
};

const entrees = (surcharge: Partial<EntreesDeLAnalyse> = {}): EntreesDeLAnalyse => ({
	fiche: SAINE,
	dirigeants: [DIRIGEANTE_SANS_HISTOIRE],
	paiements: { habitudeJours: 2, echantillon: 14, plusVieuxRetardJours: null, facturesEnRetard: 0 },
	aujourdHui: AUJOURDHUI,
	...surcharge
});

describe('l’indice de santé', () => {
	it('se refait à la main : le départ, plus la somme des effets', () => {
		const analyse = analyserLeRisque(entrees());
		const somme = analyse.faits.reduce((total, f) => total + f.effet, 0);
		expect(analyse.indice).toBe(Math.min(100, INDICE_DE_DEPART + somme));
		expect(analyse.niveau).toBe('RIEN_A_SIGNALER');
		expect(analyse.lisibilite).toBe('BONNE');
		// Chaque fait porte sa source.
		for (const f of analyse.faits) expect(f.source.nom.length).toBeGreaterThan(3);
	});

	it('plafonne une entreprise en procédure collective, et le dit en tête', () => {
		const analyse = analyserLeRisque(
			entrees({
				fiche: {
					...SAINE,
					procedureEnCours: true,
					procedures: [{ type: 'Redressement judiciaire', debut: '2026-09-01' }]
				}
			})
		);
		expect(analyse.niveau).toBe('PROCEDURE');
		expect(analyse.indice).toBeLessThanOrEqual(PLAFOND_EN_PROCEDURE);
		expect(analyse.faits[0]?.cle).toBe('procedure-en-cours');
		expect(analyse.piliers.find((p) => p.pilier === 'REGISTRE')?.traits).toBe(1);
	});

	it('met une entreprise fermée à zéro', () => {
		const analyse = analyserLeRisque(entrees({ fiche: { ...SAINE, fermee: true } }));
		expect(analyse).toMatchObject({ indice: 0, niveau: 'FERMEE' });
	});

	it('ne baisse pas l’indice sur des comptes confidentiels, et réduit la lisibilité', () => {
		const confidentielle: FicheEntreprise = {
			...SAINE,
			comptes: [{ ...SAINE.comptes[0]!, confidentiels: true }],
			exercices: []
		};
		const analyse = analyserLeRisque(entrees({ fiche: confidentielle }));
		const fait = analyse.faits.find((f) => f.cle === 'confidentialite');
		expect(fait?.effet).toBe(0);
		expect(fait?.poids).toBe('INFORMATIF');
		expect(fait?.source.article).toBe('Article L232-25 du code de commerce');
		expect(analyse.lisibilite).toBe('PARTIELLE');
		expect(analyse.lisibiliteRaison).toContain('confidentiels');
		expect(analyse.piliers.find((p) => p.pilier === 'FINANCES')).toMatchObject({
			connu: false,
			traits: 0,
			resume: 'Comptes confidentiels'
		});
	});

	it('n’attribue rien à un dirigeant dont le rapprochement est incertain', () => {
		const homonyme: ParcoursDirigeant = {
			...DIRIGEANTE_SANS_HISTOIRE,
			rapprochement: 'HOMONYMES',
			procedures: [
				{
					siren: '853479236',
					denomination: 'M.B Food',
					dateParution: '2024-03-01',
					nature: 'Jugement d’ouverture de liquidation judiciaire',
					url: 'https://www.bodacc.fr/'
				}
			]
		};
		const analyse = analyserLeRisque(entrees({ dirigeants: [homonyme] }));
		expect(analyse.faits.some((f) => f.cle.startsWith('procedures-'))).toBe(false);
		expect(analyse.lisibiliteRaison).toContain('rapprochés');
	});

	it('compte les procédures des autres sociétés d’un dirigeant identifié, avec les années', () => {
		const avecPasse: ParcoursDirigeant = {
			...DIRIGEANTE_SANS_HISTOIRE,
			procedures: [
				{
					siren: '853479236',
					denomination: 'M.B Food',
					dateParution: '2024-03-01',
					nature: 'Jugement d’ouverture de liquidation judiciaire',
					url: 'https://www.bodacc.fr/a'
				},
				{
					siren: '502592959',
					denomination: 'Galland',
					dateParution: '2021-06-10',
					nature: 'Jugement d’ouverture de redressement judiciaire',
					url: 'https://www.bodacc.fr/b'
				},
				// Hors de la fenêtre de dix ans : elle ne compte pas.
				{
					siren: '552100554',
					denomination: 'Delorme Immo',
					dateParution: '2009-01-12',
					nature: 'Jugement d’ouverture de liquidation judiciaire',
					url: 'https://www.bodacc.fr/c'
				}
			]
		};
		const analyse = analyserLeRisque(entrees({ dirigeants: [avecPasse] }));
		const fait = analyse.faits.find((f) => f.cle === 'procedures-Claire Delorme');
		expect(fait?.effet).toBe(-12);
		expect(fait?.titre).toBe(
			'2 autres sociétés dirigées par Claire Delorme ont connu une procédure collective'
		);
		expect(fait?.detail).toContain('2021, 2024');
	});

	it('lit un prospect sans le pénaliser de ne pas encore être client', () => {
		const analyse = analyserLeRisque(entrees({ paiements: null }));
		expect(analyse.piliers.find((p) => p.pilier === 'PAIEMENTS')).toMatchObject({
			connu: false,
			resume: 'Pas encore client'
		});
		expect(analyse.lisibilite).toBe('BONNE');
	});

	it('ne reproche jamais à une entreprise individuelle de ne pas déposer de comptes', () => {
		const individuelle: FicheEntreprise = {
			...SAINE,
			personneMorale: false,
			formeJuridique: 'Entrepreneur individuel',
			comptes: [],
			exercices: []
		};
		const analyse = analyserLeRisque(entrees({ fiche: individuelle }));
		expect(analyse.faits.some((f) => f.cle.startsWith('comptes-'))).toBe(false);
	});

	it('dit qu’une société commerciale n’a déposé aucun compte depuis deux ans', () => {
		const silencieuse: FicheEntreprise = {
			...SAINE,
			comptes: [{ ...SAINE.comptes[0]!, anneeCloture: 2021, dateCloture: '2021-12-31' }],
			exercices: []
		};
		const analyse = analyserLeRisque(entrees({ fiche: silencieuse }));
		expect(analyse.faits.find((f) => f.cle === 'comptes-en-retard')?.titre).toBe(
			'Aucun compte déposé depuis l’exercice 2021'
		);
	});

	it('montre les capitaux propres entamés avec ce que la loi impose', () => {
		const entamee: FicheEntreprise = {
			...SAINE,
			actifNetSousMoitie: { enCours: true, depuis: '2025-12-31' }
		};
		const fait = analyserLeRisque(entrees({ fiche: entamee })).faits.find(
			(f) => f.cle === 'actif-net-sous-moitie'
		);
		expect(fait?.effet).toBe(-15);
		expect(fait?.source.article).toBe('Articles L223-42 et L225-248 du code de commerce');
	});

	it('n’écrit aucun mot de jugement dans un fait', () => {
		const pire = analyserLeRisque(
			entrees({
				fiche: {
					...SAINE,
					dateCreation: '2026-03-01',
					exercices: [
						{
							annee: 2025,
							resultat: -82_000_00n,
							tresorerie: -12_000_00n,
							autonomieFinancierePct: -8,
							liquiditeGenerale: 0.6,
							delaiFournisseursJours: 104,
							croissancePct: -34
						},
						{ annee: 2024, resultat: -10_000_00n }
					]
				},
				paiements: {
					habitudeJours: 72,
					echantillon: 6,
					plusVieuxRetardJours: 124,
					facturesEnRetard: 2
				}
			})
		);
		expect(pire.niveau).toBe('RISQUE_ELEVE');
		for (const f of pire.faits) {
			expect(`${f.titre} ${f.detail ?? ''}`).not.toMatch(/suspect|fraud|escroc|garanti/i);
		}
		expect(pire.faits.find((f) => f.cle === 'resultat')?.titre).toBe(
			`Perte de ${eurosRonds(82_000_00n)} en 2025`
		);
	});
});
