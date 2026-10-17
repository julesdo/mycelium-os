import { describe, expect, it } from 'vitest';
import {
	adresseDeRecherche,
	departementsEnClair,
	lireReponseDeLAnnuaire,
	versProspect,
	ZONES,
	SECTEURS
} from '../annuaire';

/** Une entreprise telle que l'API Recherche d'entreprises la rend (champs utiles). */
function entreprise(surcharges: Record<string, unknown> = {}) {
	return {
		siren: '799531322',
		nom_complet: '37 EXPRESS',
		activite_principale: '49.41A',
		tranche_effectif_salarie: '11',
		statut_diffusion: 'O',
		siege: { libelle_commune: 'AUBERVILLIERS', code_postal: '93300', departement: '93' },
		dirigeants: [
			{
				nom: 'BELLAICHE',
				prenoms: 'GUILLAUME',
				annee_de_naissance: '1980',
				date_de_naissance: '1980-04',
				qualite: 'Commissaire aux comptes suppléant',
				type_dirigeant: 'personne physique'
			},
			{
				siren: '908815434',
				denomination: 'FL INVESTMENT',
				qualite: 'Président de SAS',
				type_dirigeant: 'personne morale'
			},
			{
				nom: 'DE LA FONTAINE',
				prenoms: 'JEAN PIERRE',
				annee_de_naissance: '1975',
				date_de_naissance: '1975-02',
				qualite: 'Directeur général',
				type_dirigeant: 'personne physique'
			}
		],
		...surcharges
	};
}

describe('adresseDeRecherche', () => {
	it('demande les PME de 3 à 49 salariés en activité, du secteur et de la zone choisis', () => {
		const url = new URL(adresseDeRecherche({ secteur: 'TRANSPORT', zone: 'PETITE_COURONNE', page: 2 }));
		expect(url.origin + url.pathname).toBe('https://recherche-entreprises.api.gouv.fr/search');
		expect(url.searchParams.get('activite_principale')).toBe('49.41A,49.41B,49.41C');
		expect(url.searchParams.get('departement')).toBe('75,92,93,94');
		expect(url.searchParams.get('tranche_effectif_salarie')).toBe('02,03,11,12');
		expect(url.searchParams.get('etat_administratif')).toBe('A');
		expect(url.searchParams.get('categorie_entreprise')).toBe('PME');
		expect(url.searchParams.get('page')).toBe('2');
		expect(url.searchParams.get('per_page')).toBe('25');
	});

	it('cherche le bâtiment par sa section entière, pas par une liste de codes', () => {
		const url = new URL(adresseDeRecherche({ secteur: 'BATIMENT', zone: 'PARIS', page: 1 }));
		expect(url.searchParams.get('section_activite_principale')).toBe('F');
		expect(url.searchParams.has('activite_principale')).toBe(false);
		expect(url.searchParams.get('departement')).toBe('75');
	});

	it('couvre les huit départements d’Île-de-France', () => {
		expect(ZONES.ILE_DE_FRANCE.departements).toEqual(['75', '77', '78', '91', '92', '93', '94', '95']);
	});

	it('borne la page entre 1 et 400', () => {
		expect(new URL(adresseDeRecherche({ secteur: 'CABINETS', zone: 'PARIS', page: 0 })).searchParams.get('page')).toBe('1');
		expect(new URL(adresseDeRecherche({ secteur: 'CABINETS', zone: 'PARIS', page: 9999 })).searchParams.get('page')).toBe('400');
	});
});

describe('lireReponseDeLAnnuaire', () => {
	it('lit le total, les pages et chaque entreprise', () => {
		const page = lireReponseDeLAnnuaire({
			total_results: 186,
			total_pages: 8,
			page: 1,
			results: [entreprise()]
		});
		expect(page.total).toBe(186);
		expect(page.pages).toBe(8);
		expect(page.entreprises).toEqual([
			{
				siren: '799531322',
				entreprise: '37 EXPRESS',
				activite: 'Transports routiers de fret interurbains (49.41A)',
				effectif: '10 à 19 salariés',
				ville: 'Aubervilliers',
				dirigeant: 'Jean de La Fontaine',
				fonction: 'Directeur général'
			}
		]);
	});

	it('ne retient ni un commissaire aux comptes ni une société comme dirigeant', () => {
		const seuls = entreprise({
			dirigeants: [
				{ nom: 'X', prenoms: 'Y', qualite: 'Commissaire aux comptes titulaire', type_dirigeant: 'personne physique' },
				{ denomination: 'HOLDING', qualite: 'Président', type_dirigeant: 'personne morale' }
			]
		});
		const [e] = lireReponseDeLAnnuaire({ total_results: 1, total_pages: 1, results: [seuls] }).entreprises;
		expect(e?.dirigeant).toBeUndefined();
		expect(e?.fonction).toBeUndefined();
	});

	it('ne garde aucune date de naissance', () => {
		const page = lireReponseDeLAnnuaire({ total_results: 1, total_pages: 1, results: [entreprise()] });
		expect(JSON.stringify(page)).not.toMatch(/1975|1980|naissance/);
	});

	it('écarte une entreprise dont la diffusion est restreinte', () => {
		const page = lireReponseDeLAnnuaire({
			total_results: 2,
			total_pages: 1,
			results: [entreprise({ statut_diffusion: 'P', siren: '111111111' }), entreprise()]
		});
		expect(page.entreprises.map((e) => e.siren)).toEqual(['799531322']);
	});

	it('écarte une ligne sans SIREN valable plutôt que de l’inventer', () => {
		const page = lireReponseDeLAnnuaire({
			total_results: 1,
			total_pages: 1,
			results: [entreprise({ siren: '12' })]
		});
		expect(page.entreprises).toEqual([]);
	});

	it('nomme le code d’activité qu’elle ne connaît pas plutôt que de le taire', () => {
		const [e] = lireReponseDeLAnnuaire({
			total_results: 1,
			total_pages: 1,
			results: [entreprise({ activite_principale: '43.21A' })]
		}).entreprises;
		expect(e?.activite).toBe('Travaux de construction spécialisés (43.21A)');
		const [f] = lireReponseDeLAnnuaire({
			total_results: 1,
			total_pages: 1,
			results: [entreprise({ activite_principale: '99.99Z' })]
		}).entreprises;
		expect(f?.activite).toBe('99.99Z');
	});

	it('refuse une réponse qui n’a pas la forme attendue', () => {
		expect(() => lireReponseDeLAnnuaire({ erreur: 'trop de requêtes' })).toThrow();
	});
});

describe('versProspect', () => {
	const trouvee = {
		siren: '799531322',
		entreprise: '37 EXPRESS',
		activite: 'Transports routiers de fret interurbains (49.41A)',
		effectif: '10 à 19 salariés',
		ville: 'Aubervilliers',
		dirigeant: 'Jean de La Fontaine',
		fonction: 'Directeur général'
	};

	it('entre « à contacter », avec sa source et sa date', () => {
		const p = versProspect(trouvee, 'TRANSPORT', Date.UTC(2026, 9, 17, 10));
		expect(p.statut).toBe('A_CONTACTER');
		expect(p.cible).toBe('PME');
		expect(p.trouveOu).toBe('Annuaire des entreprises (data.gouv.fr), le 17/10/2026');
		expect(p.siren).toBe('799531322');
		expect(p.email).toBeUndefined();
	});

	it('range un cabinet comptable dans sa cible', () => {
		expect(versProspect(trouvee, 'CABINETS', 0).cible).toBe('CABINET');
	});

	it('a un libellé pour chaque secteur', () => {
		for (const s of Object.values(SECTEURS)) expect(s.libelle.length).toBeGreaterThan(3);
	});
});

describe('departementsEnClair', () => {
	it('dit ce que chaque zone couvre', () => {
		expect(departementsEnClair('PARIS')).toBe('Paris (75)');
		expect(departementsEnClair('PETITE_COURONNE')).toBe('Paris (75), 92, 93 et 94');
		expect(departementsEnClair('ILE_DE_FRANCE')).toBe('Paris (75), 77, 78, 91, 92, 93, 94 et 95');
	});
});

describe('le siège dans la zone', () => {
	it('écarte une entreprise qui n’a qu’un établissement dans la zone, et le compte', () => {
		const page = lireReponseDeLAnnuaire(
			{
				total_results: 2,
				total_pages: 1,
				results: [
					entreprise({ siren: '392165080', siege: { libelle_commune: 'MIONS', departement: '69' } }),
					entreprise()
				]
			},
			['75', '92', '93', '94']
		);
		expect(page.entreprises.map((e) => e.siren)).toEqual(['799531322']);
		expect(page.horsZone).toBe(1);
	});
});

describe('le nom', () => {
	it('retire un sigle qui redit le nom', () => {
		const [e] = lireReponseDeLAnnuaire({
			total_results: 1,
			total_pages: 1,
			results: [entreprise({ nom_complet: 'COMEANDWORK (COMEANDWORK)' })]
		}).entreprises;
		expect(e?.entreprise).toBe('COMEANDWORK');
	});

	it('garde un sigle qui apprend quelque chose', () => {
		const [e] = lireReponseDeLAnnuaire({
			total_results: 1,
			total_pages: 1,
			results: [entreprise({ nom_complet: 'SOCIETE EUROPEENNE D’AUDIT (SEA)' })]
		}).entreprises;
		expect(e?.entreprise).toBe('SOCIETE EUROPEENNE D’AUDIT (SEA)');
	});
});

describe('la forme juridique', () => {
	it('écarte une association, un organisme public ou mutualiste : ce ne sont pas des clients', () => {
		const page = lireReponseDeLAnnuaire({
			total_results: 4,
			total_pages: 1,
			results: [
				entreprise({ siren: '312731987', nature_juridique: '9220' }),
				entreprise({ siren: '100000001', nature_juridique: '7389' }),
				entreprise({ siren: '100000002', nature_juridique: '8210' }),
				entreprise({ nature_juridique: '5710' })
			]
		});
		expect(page.entreprises.map((e) => e.siren)).toEqual(['799531322']);
	});
});
