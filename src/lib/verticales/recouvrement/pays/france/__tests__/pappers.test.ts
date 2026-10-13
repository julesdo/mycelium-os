import { describe, expect, it } from 'vitest';
import {
	lireFichePappers,
	moisDeNaissance,
	rapprocherLeDirigeant,
	rechercheDuDirigeant
} from '../pappers';
import { filtreDesProcedures, proceduresOuvertes } from '../antecedents';

/**
 * LA LECTURE DE PAPPERS ET DU JOURNAL OFFICIEL DES ENTREPRISES POUR L'ANALYSE DU RISQUE.
 *
 * Les formes de réponse suivent la spécification OpenAPI 2.20.0 de Pappers (relevée
 * le 13/10/2026) ; les annonces sont celles, réelles, de `bodacc.test.ts`.
 */

const FICHE = {
	siren: '443061841',
	denomination: 'GOOGLE FRANCE',
	personne_morale: true,
	forme_juridique: 'SARL, société à responsabilité limitée',
	date_creation: '2002-05-16',
	entreprise_cessee: false,
	statut_rcs: 'Inscrit',
	procedure_collective_en_cours: false,
	procedures_collectives: [
		{ type: 'Redressement judiciaire', date_debut: '2010-04-16', date_fin: '2011-08-27' }
	],
	comptes: [
		{
			annee_cloture: 2024,
			date_cloture: '2024-12-31',
			date_depot: '2025-07-02',
			confidentialite: false,
			confidentialite_compte_de_resultat: true
		}
	],
	finances: [
		{ annee: 2023, chiffre_affaires: 600000000, resultat: 20000000 },
		{
			annee: 2024,
			date_de_cloture_exercice: '2024-12-31',
			chiffre_affaires: 682000000,
			resultat: -1250000.5,
			tresorerie: 'pas un nombre',
			autonomie_financiere: 32.4,
			liquidite_generale: 1.12,
			delai_paiement_fournisseurs_jours: 61,
			taux_croissance_chiffre_affaires: 13.6
		}
	],
	actif_net_inferieur_moitie_capital: { en_cours: true, date_debut: '2025-01-31', date_fin: null },
	representants: [
		{
			nom_complet: 'Jean Martin',
			nom: 'Martin',
			prenom: 'Jean Pierre',
			personne_morale: false,
			qualites: ['Gérant'],
			date_prise_de_poste: '2017-08-03',
			date_de_naissance: '1970-01-06'
		},
		{
			denomination: 'Holding Martin',
			siren: '552100554',
			personne_morale: true,
			qualites: ['Associé']
		}
	]
};

describe('la fiche Pappers', () => {
	it('se traduit sans rien inventer', () => {
		const fiche = lireFichePappers(FICHE, '2026-10-13');
		expect(fiche).not.toBeNull();
		expect(fiche!.exercices.map((e) => e.annee)).toEqual([2024, 2023]);
		const dernier = fiche!.exercices[0]!;
		expect(dernier.resultat).toBe(-125000050n);
		// Un champ mal typé devient inconnu, jamais zéro.
		expect(dernier.tresorerie).toBeUndefined();
		expect(dernier.delaiFournisseursJours).toBe(61);
		expect(fiche!.comptes[0]).toMatchObject({ confidentiels: false, resultatConfidentiel: true });
		expect(fiche!.actifNetSousMoitie).toEqual({ enCours: true, depuis: '2025-01-31' });
		expect(fiche!.procedures).toEqual([
			{ type: 'Redressement judiciaire', debut: '2010-04-16', fin: '2011-08-27' }
		]);
		expect(fiche!.dirigeants).toHaveLength(2);
		expect(fiche!.dirigeants[0]!.naissance).toEqual({ annee: 1970, mois: 1 });
		expect(fiche!.dirigeants[1]).toMatchObject({
			personneMorale: true,
			nomComplet: 'Holding Martin'
		});
	});

	it('refuse une identité incertaine', () => {
		expect(lireFichePappers({ ...FICHE, siren: '443061842' }, '2026-10-13')).toBeNull();
		expect(lireFichePappers(null, '2026-10-13')).toBeNull();
	});

	it('voit une entreprise radiée comme fermée', () => {
		expect(lireFichePappers({ ...FICHE, statut_rcs: 'Radié' }, '2026-10-13')?.fermee).toBe(true);
	});
});

describe('le rapprochement d’un dirigeant', () => {
	it('lit le mois de naissance dans les trois graphies', () => {
		expect(moisDeNaissance('1970-01-06')).toEqual({ annee: 1970, mois: 1 });
		expect(moisDeNaissance('1970-01')).toEqual({ annee: 1970, mois: 1 });
		expect(moisDeNaissance('06/01/1970')).toEqual({ annee: 1970, mois: 1 });
		expect(moisDeNaissance('1970-13')).toBeUndefined();
	});

	it('cherche par nom, premier prénom et mois de naissance, au format de Pappers', () => {
		const fiche = lireFichePappers(FICHE, '2026-10-13')!;
		expect(rechercheDuDirigeant(fiche.dirigeants[0]!)).toMatchObject({
			nom_dirigeant: 'Martin',
			prenom_dirigeant: 'Jean',
			date_de_naissance_dirigeant_min: '01-01-1970',
			date_de_naissance_dirigeant_max: '31-01-1970'
		});
		// Une personne morale, ou une naissance inconnue : on ne cherche pas.
		expect(rechercheDuDirigeant(fiche.dirigeants[1]!)).toBeNull();
		expect(rechercheDuDirigeant({ ...fiche.dirigeants[0]!, naissance: undefined })).toBeNull();
	});

	const personne = (sirens: string[]) => ({
		nom: 'Martin',
		prenom: 'Jean',
		nb_entreprises_total: sirens.length,
		entreprises: sirens.map((siren, i) => ({
			siren,
			denomination: `Société ${i}`,
			entreprise_cessee: i === 1,
			date_creation: '2019-01-10',
			...(i === 1 ? { date_cessation: '2020-03-01' } : {})
		}))
	});

	it('retient la seule personne qui dirige la société analysée', () => {
		const lu = rapprocherLeDirigeant(
			{ resultats: [personne(['443061841', '853479236']), personne(['502592959'])] },
			'443061841'
		);
		expect(lu.rapprochement).toBe('IDENTIFIE');
		expect(lu.societes.map((s) => s.siren)).toEqual(['853479236']);
		expect(lu.societes[0]).toMatchObject({ enActivite: false, fermeeLe: '2020-03-01' });
	});

	it('n’attribue rien entre deux homonymes qui la dirigeraient tous deux, ni à personne', () => {
		expect(
			rapprocherLeDirigeant(
				{ resultats: [personne(['443061841']), personne(['443061841', '502592959'])] },
				'443061841'
			).rapprochement
		).toBe('HOMONYMES');
		expect(
			rapprocherLeDirigeant({ resultats: [personne(['502592959'])] }, '443061841').rapprochement
		).toBe('NON_TROUVE');
		expect(rapprocherLeDirigeant({ resultats: [] }, '443061841').rapprochement).toBe('NON_TROUVE');
	});
});

describe('les procédures des autres sociétés, au journal officiel des entreprises', () => {
	const societes = [
		{ siren: '853479236', denomination: 'M.B Food', enActivite: false },
		{ siren: '502592959', denomination: 'Galland', enActivite: true }
	];

	it('cherche tous les SIREN en une requête, sur la seule famille des procédures', () => {
		expect(filtreDesProcedures(societes)).toBe(
			'(registre="853479236" OR registre="502592959") AND familleavis="collective"'
		);
		expect(filtreDesProcedures([])).toBeNull();
	});

	it('garde le jugement d’ouverture, jamais une sanction qui vise une personne', () => {
		const liquidation = {
			id: 'A202601721671',
			dateparution: '2026-09-09',
			familleavis: 'collective',
			familleavis_lib: 'Procédures collectives',
			registre: ['853479236', '853 479 236'],
			jugement:
				'{"type": "initial", "famille": "Jugement d\'ouverture", "nature": "Jugement d\'ouverture de liquidation judiciaire", "date": "2026-08-31"}',
			url_complete:
				'https://www.bodacc.fr/pages/annonces-commerciales-detail/?q.id=id:A202601721671'
		};
		const interdiction = {
			id: 'A202601721583',
			dateparution: '2026-09-09',
			familleavis: 'collective',
			familleavis_lib: 'Procédures collectives',
			registre: ['502592959', '502 592 959'],
			jugement:
				'{"type": "initial", "famille": "Extrait de jugement", "nature": "Jugement d\'interdiction de gérer", "date": "2026-09-03"}',
			url_complete: 'https://www.bodacc.fr/x'
		};
		expect(proceduresOuvertes([liquidation, interdiction, liquidation], societes)).toEqual([
			{
				siren: '853479236',
				denomination: 'M.B Food',
				dateParution: '2026-09-09',
				nature: "Jugement d'ouverture de liquidation judiciaire",
				url: 'https://www.bodacc.fr/pages/annonces-commerciales-detail/?q.id=id:A202601721671'
			}
		]);
	});
});
