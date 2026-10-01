import { describe, expect, it } from 'vitest';
import {
	ColonnesIntrouvables,
	derniereLivraison,
	lireLivraison,
	prefixeDuCodePostal,
	prefixeSuivant,
	releveDuFichier,
	specialiteProche
} from '../annuaire-avocats';

/**
 * L'ANNUAIRE DES AVOCATS, LU — ce qui le faisait rester vide sans que rien ne
 * le dise (01/10/2026 : table vide en production, zéro avocat pour tous).
 */

// L'en-tête de la livraison du 23/09/2026, recopié du fichier.
const ENTETE =
	'NomBarreau;avNom;avPrenom;cbRaisonSociale;cbSiretSiren;cbAdresse1;cbAdresse2;cbCp;cbVille;spLibelle1;spLibelle2;spLibelle3;acDateSerment;avLang'.split(
		';'
	);

describe('l’annuaire des avocats', () => {
	it('lit une livraison et écarte les rangées incomplètes, sans les compléter', () => {
		const { fiches, ecartees } = lireLivraison([
			ENTETE,
			[
				'AGEN',
				'DARRIEUX',
				'Arnaud',
				'LEGI-GARONNE',
				'921902524',
				'9 Rue Pontarique',
				'',
				'47000',
				'AGEN',
				'Droit du travail',
				'',
				'',
				'',
				'Français'
			],
			['', 'SANS', 'Barreau', '', '', '', '', '', '', '', '', '', '', '']
		]);
		expect(fiches).toHaveLength(1);
		expect(ecartees).toBe(1);
		expect(fiches[0]).toMatchObject({
			barreau: 'AGEN',
			codePostal: '47000',
			specialites: ['Droit du travail']
		});
	});

	it('refuse une colonne disparue en la nommant, au lieu d’ingérer des champs vides', () => {
		expect(() => lireLivraison([ENTETE.filter((e) => e !== 'cbCp'), []])).toThrow(
			ColonnesIntrouvables
		);
	});

	it('refuse une livraison sans aucune fiche : on ne vide pas l’annuaire pour rien', () => {
		expect(() => lireLivraison([ENTETE])).toThrow(/Aucune fiche lisible/);
	});

	it('date le relevé par le NOM du fichier, et refuse une date impossible', () => {
		expect(releveDuFichier('annuaire-avocats-20260923.csv')).toBe('2026-09-23');
		expect(releveDuFichier('annuaire-avocats-20260231.csv')).toBeNull();
		expect(releveDuFichier('annuaire.csv')).toBeNull();
	});

	it('choisit la livraison la plus récente par son relevé, pas par sa mise en ligne', () => {
		const jeu = {
			resources: [
				{ title: 'annuaire-avocats-20260515.csv', url: 'https://exemple/mai.csv' },
				{ title: 'annuaire-avocats-20260923.csv', url: 'https://exemple/septembre.csv' },
				{ title: 'notice.pdf', url: 'https://exemple/notice.pdf' }
			]
		};
		expect(derniereLivraison(jeu)).toEqual({
			releveeLe: '2026-09-23',
			url: 'https://exemple/septembre.csv'
		});
		expect(derniereLivraison({})).toBeNull();
	});

	it('reconnaît les deux spécialités proches, sous leurs graphies relevées', () => {
		expect(specialiteProche('Droit commercial, des affaires et de la concurrence')).toBe(true);
		expect(specialiteProche('Droit des garanties, des sûretés et des mesures d’exécution')).toBe(
			true
		);
		expect(specialiteProche("Droit des garanties, des sûretés et  des mesures d'exécution")).toBe(
			true
		);
		expect(specialiteProche('Droit du travail')).toBe(false);
	});

	it('lit un département dans un code postal, outre-mer compris', () => {
		expect(prefixeDuCodePostal('44000')).toBe('44');
		expect(prefixeDuCodePostal('97110')).toBe('971');
		expect(prefixeDuCodePostal('4400')).toBeNull();
		expect(prefixeSuivant('44')).toBe('45');
		expect(prefixeSuivant('09')).toBe('10');
		expect(prefixeSuivant('971')).toBe('972');
	});
});
