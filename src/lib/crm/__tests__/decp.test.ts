import { describe, it, expect } from 'vitest';
import {
	adresseDecpDeLaZone,
	adresseDecpDuTitulaire,
	anneeDeDepart,
	genreDAcheteur,
	lireExportDecp,
	lireLigneDecp,
	lirePageDecp,
	regrouperParTitulaire,
	versProspectDecp
} from '../decp';

/**
 * LES DONNÉES DE LA COMMANDE PUBLIQUE (19/10/2026, audit, lot 5) : l'API tabulaire de
 * data.gouv.fr, ses valeurs non normalisées, ses titulaires recopiés par avenant et ses
 * montants qui sont des plafonds. Les lignes viennent de réponses réelles (sonde du
 * 19/10/2026), raccourcies.
 */
const LIGNE = {
	uid: '262501760000172026S25390_72224000',
	acheteur_id: '26250176000017',
	acheteur_nom: 'CHU BESANCON (CHRU ST JACQUES)',
	acheteur_categorie: 'Établissement hospitalier',
	titulaire_id: '81269851200041',
	titulaire_typeIdentifiant: 'SIRET',
	titulaire_nom: 'AVERROES SANTE SOCIAL',
	titulaire_categorie: 'PME',
	titulaire_departement_code: '75',
	montant: 89700,
	montant_rationalise: 89700,
	dateNotification: '2026-10-12',
	dureeMois: 11
};

describe('l’adresse de la recherche', () => {
	it('part de l’année que la loi laisse encore réclamer', () => {
		expect(anneeDeDepart('2026-10-19')).toBe('2022-01-01');
	});

	it('filtre les attributions initiales des PME de la zone, accents encodés en UTF-8', () => {
		const url = new URL(
			adresseDecpDeLaZone({
				acheteurs: 'HOPITAUX',
				zone: 'PETITE_COURONNE',
				jour: '2026-10-19',
				page: 2
			})
		);
		expect(url.pathname).toMatch(/\/data\/$/);
		expect(url.searchParams.get('acheteur_categorie__in')).toBe('Établissement hospitalier');
		expect(url.toString()).toContain('%C3%89tablissement');
		expect(url.searchParams.get('titulaire_departement_code__in')).toBe('75,92,93,94');
		expect(url.searchParams.get('modification_id__exact')).toBe('0');
		expect(url.searchParams.get('dateNotification__greater')).toBe('2022-01-01');
		expect(url.searchParams.get('page')).toBe('2');
		expect(url.searchParams.get('page_size')).toBe('200');
	});

	it('cherche un titulaire par les bornes de son SIREN, faute de « commence par »', () => {
		const url = new URL(adresseDecpDuTitulaire({ siren: '414488171', jour: '2026-10-19' }));
		expect(url.pathname).toMatch(/\/data\/json\/$/);
		expect(url.searchParams.get('titulaire_id__greater')).toBe('41448817100000');
		expect(url.searchParams.get('titulaire_id__less')).toBe('41448817199999');
	});
});

describe('une ligne de la commande publique', () => {
	it('se lit en centimes, avec le genre de l’acheteur', () => {
		const lue = lireLigneDecp({ ...LIGNE, montant_rationalise: 10893.96 });
		expect(lue).toMatchObject({
			ok: true,
			ligne: {
				uid: LIGNE.uid,
				acheteurId: '26250176000017',
				genre: 'HOPITAL',
				titulaireSiret: '81269851200041',
				montantCentimes: 1089396n,
				dateNotification: '2026-10-12',
				dureeMois: 11
			}
		});
	});

	it('accepte « Siret » ou « siret » : les valeurs ne sont pas normalisées', () => {
		expect(lireLigneDecp({ ...LIGNE, titulaire_typeIdentifiant: 'siret' }).ok).toBe(true);
	});

	it('écarte une personne dont les données ne sont pas diffusibles', () => {
		expect(
			lireLigneDecp({ ...LIGNE, titulaire_nom: '[Données personnelles non-diffusibles]' })
		).toEqual({ ok: false, raison: 'NON_DIFFUSIBLE' });
	});

	it('écarte un titulaire sans SIRET et une date impossible', () => {
		expect(lireLigneDecp({ ...LIGNE, titulaire_typeIdentifiant: 'TVA' })).toEqual({
			ok: false,
			raison: 'SANS_SIRET'
		});
		expect(lireLigneDecp({ ...LIGNE, dateNotification: '-infinity' }).ok).toBe(false);
		expect(lireLigneDecp({ ...LIGNE, dateNotification: '2026-02-30' }).ok).toBe(false);
	});

	it('reconnaît une collectivité, et laisse le reste à part', () => {
		expect(genreDAcheteur('Commune')).toBe('COLLECTIVITE');
		expect(genreDAcheteur('Groupement de communes')).toBe('COLLECTIVITE');
		expect(genreDAcheteur('État')).toBe('AUTRE');
		expect(genreDAcheteur(undefined)).toBe('AUTRE');
	});
});

describe('une page et un export', () => {
	it('lit la page et compte les pages de deux cents', () => {
		const page = lirePageDecp({
			data: [LIGNE, { ...LIGNE, titulaire_nom: '[Données personnelles non-diffusibles]' }],
			meta: { page: 1, page_size: 200, total: 6277 }
		});
		expect(page.pages).toBe(32);
		expect(page.lignes).toHaveLength(1);
		expect(page.nonDiffusibles).toBe(1);
	});

	it('lève sur une réponse qui n’a pas sa forme', () => {
		expect(() => lirePageDecp({ erreur: 'x' })).toThrow();
		expect(() => lireExportDecp({ data: [] })).toThrow();
	});

	it('lit un export, qui est un tableau', () => {
		expect(lireExportDecp([LIGNE]).lignes).toHaveLength(1);
	});
});

describe('le regroupement par titulaire', () => {
	it('compte chaque marché une fois, même recopié', () => {
		const lignes = [
			LIGNE,
			LIGNE,
			{
				...LIGNE,
				uid: 'autre',
				acheteur_id: '26750045200672',
				acheteur_nom: 'AP-HP',
				montant_rationalise: 10000
			}
		].flatMap((l) => {
			const lue = lireLigneDecp(l);
			return lue.ok ? [lue.ligne] : [];
		});
		const [t] = regrouperParTitulaire(lignes);
		expect(t).toMatchObject({
			siren: '812698512',
			siret: '81269851200041',
			nom: 'AVERROES SANTE SOCIAL',
			marches: 2,
			nombreDAcheteurs: 2,
			plafondCentimes: 9970000n,
			dernierMarche: '2026-10-12'
		});
	});
});

describe('le prospect', () => {
	it('dit sa vraie source, et reste à contacter', () => {
		const lue = lireLigneDecp(LIGNE);
		if (!lue.ok) throw new Error('ligne illisible');
		const [t] = regrouperParTitulaire([lue.ligne]);
		const p = versProspectDecp(t!, null, Date.UTC(2026, 9, 19, 10));
		expect(p).toMatchObject({
			entreprise: 'AVERROES SANTE SOCIAL',
			siren: '812698512',
			cible: 'PME',
			statut: 'A_CONTACTER',
			trouveOu: 'Données de la commande publique (data.gouv.fr), le 19/10/2026'
		});
	});
});
