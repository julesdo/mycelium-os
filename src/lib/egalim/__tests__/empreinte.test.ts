import { describe, it, expect } from 'vitest';
import {
	empreinteBilan,
	formeCanonique,
	empreinteLisible,
	type BilanAEmpreindre
} from '../empreinte';

/**
 * Ce que ces tests protègent : la seule chose qui donne une valeur probante à
 * la signature. Une empreinte qui change sans que la mesure change accuse à
 * tort — le produit dirait « ce bilan a été modifié » d'un bilan intact, et
 * personne ne saurait pourquoi. Une empreinte qui NE change PAS quand la mesure
 * change est pire : elle certifie un chiffre qui n'est plus le bon.
 *
 * Les deux moitiés sont donc testées avec la même sévérité : ce qui doit
 * laisser l'empreinte identique, et ce qui doit la faire changer.
 */

const BILAN: BilanAEmpreindre = {
	organizationName: 'Votre cantine',
	siret: '12345678900012',
	periodStart: '2026-01-01',
	periodEnd: '2026-12-31',
	computedAt: Date.parse('2027-03-14T10:00:00Z'),
	classifierVersion: '2026-08',
	ratios: {
		durable: 0.39,
		bio: 0.21,
		meatFishDurable: 0.47,
		totalFoodHT: 180000,
		totalHT: 210000
	},
	byFamily: [
		{ family: 'VIANDE', totalHT: 50400, durableHT: 7100, bioHT: 900 },
		{ family: 'FRUITS_LEGUMES', totalHT: 28800, durableHT: 12600, bioHT: 11800 }
	],
	bySupplier: [
		{ supplierName: 'Grossiste Alpha', totalHT: 82000, durableHT: 12000 },
		{ supplierName: 'Maison Bertin', totalHT: 41000, durableHT: 22000 }
	]
};

describe('l’empreinte ne bouge pas quand la mesure ne bouge pas', () => {
	it('deux calculs du même bilan donnent la même empreinte', async () => {
		expect(await empreinteBilan(BILAN)).toBe(await empreinteBilan(BILAN));
	});

	it('l’ordre des familles rendu par la base ne compte pas', async () => {
		// Convex ne promet aucun ordre sur un `collect()`. Sans le tri, deux
		// lectures du même bilan produiraient deux empreintes, et le produit
		// annoncerait une modification à chaque rechargement.
		const inverse = { ...BILAN, byFamily: [...BILAN.byFamily].reverse() };
		expect(await empreinteBilan(inverse)).toBe(await empreinteBilan(BILAN));
	});

	it('l’ordre des fournisseurs non plus', async () => {
		const inverse = { ...BILAN, bySupplier: [...BILAN.bySupplier].reverse() };
		expect(await empreinteBilan(inverse)).toBe(await empreinteBilan(BILAN));
	});

	it('une différence sous le centime ne compte pas', async () => {
		// Une somme de flottants varie au dernier bit selon l'ordre d'addition.
		// Une déclaration se remplit en euros : cette variation-là ne doit pas
		// invalider une signature.
		const presque = {
			...BILAN,
			ratios: { ...BILAN.ratios, totalFoodHT: 180000 + 1e-9 }
		};
		expect(await empreinteBilan(presque)).toBe(await empreinteBilan(BILAN));
	});
});

describe('l’empreinte bouge dès que la mesure bouge', () => {
	const doitChanger = async (modif: Partial<BilanAEmpreindre>) => {
		const avant = await empreinteBilan(BILAN);
		const apres = await empreinteBilan({ ...BILAN, ...modif });
		expect(apres).not.toBe(avant);
	};

	it('un centime sur le total des achats', () =>
		doitChanger({ ratios: { ...BILAN.ratios, totalFoodHT: 180000.01 } }));

	it('un taux', () => doitChanger({ ratios: { ...BILAN.ratios, durable: 0.391 } }));

	it('un montant par famille', () =>
		doitChanger({
			byFamily: [{ family: 'VIANDE', totalHT: 50401, durableHT: 7100, bioHT: 900 }, BILAN.byFamily[1]!]
		}));

	it('un fournisseur ajouté', () =>
		doitChanger({
			bySupplier: [...BILAN.bySupplier, { supplierName: 'Halles', totalHT: 1, durableHT: 0 }]
		}));

	it('la version du barème', () => doitChanger({ classifierVersion: '2027-01' }));

	it('la période mesurée', () => doitChanger({ periodEnd: '2026-12-30' }));

	it('le SIRET', () => doitChanger({ siret: '99999999900099' }));

	it('le nom de l’établissement', () => doitChanger({ organizationName: 'Autre cantine' }));

	it('la date de la mesure', () =>
		doitChanger({ computedAt: Date.parse('2027-03-15T10:00:00Z') }));
});

describe('la forme canonique', () => {
	it('porte un identifiant de version', () => {
		// Sans lui, changer la façon de sérialiser invaliderait silencieusement
		// toutes les signatures existantes. Avec lui, on peut faire coexister
		// deux formes et savoir laquelle a servi.
		expect(formeCanonique(BILAN)).toContain('mycelium.bilan.v1');
	});

	it('fixe les décimales plutôt que de laisser flotter', () => {
		expect(formeCanonique(BILAN)).toContain('180000.00');
		expect(formeCanonique(BILAN)).toContain('0.390000');
	});

	it('rend un SIRET absent comme une chaîne vide, pas comme « null »', async () => {
		// `null` et `"null"` se sérialisent différemment selon le chemin de code.
		// On fige la représentation ici pour qu'elle ne dépende de rien d'autre.
		expect(formeCanonique({ ...BILAN, siret: null })).toContain('"",');
		await expect(empreinteBilan({ ...BILAN, siret: null })).resolves.toMatch(/^[0-9a-f]{64}$/);
	});
});

describe('empreinteLisible', () => {
	it('découpe en blocs de quatre, en majuscules', () => {
		expect(empreinteLisible('a3f1c9d2')).toBe('A3F1 C9D2');
	});

	it('supporte une empreinte complète de 64 caractères', () => {
		const lisible = empreinteLisible('a'.repeat(64));
		expect(lisible.split(' ')).toHaveLength(16);
	});
});
