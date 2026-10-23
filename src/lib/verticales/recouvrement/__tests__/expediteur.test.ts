import { describe, expect, it } from 'vitest';
import { adresseDEnvoi, enTeteExpediteur, lireDomaine, partieLocale } from '../expediteur';

describe('la partie locale, tirée du nom de l’établissement', () => {
	it('rend un nom lisible, sans accents ni espaces', () => {
		expect(partieLocale('Thumbbb Agency')).toBe('thumbbb-agency');
		expect(partieLocale('Électricité Générale Côté Sud')).toBe('electricite-generale-cote-sud');
		expect(partieLocale('Durand & Fils')).toBe('durand-et-fils');
		expect(partieLocale('L’Atelier du Bois')).toBe('l-atelier-du-bois');
	});

	it('retire la forme juridique, en tête comme en fin', () => {
		expect(partieLocale('SARL DURAND BTP')).toBe('durand-btp');
		expect(partieLocale('Menuiserie Dupont SAS')).toBe('menuiserie-dupont');
		expect(partieLocale('Transports Martin (EURL)')).toBe('transports-martin');
	});

	it('garde la forme juridique quand il ne resterait qu’elle', () => {
		expect(partieLocale('SAS')).toBe('sas');
	});

	it('tient en quarante signes, coupée à un mot entier', () => {
		const longue = partieLocale(
			'Société Nouvelle des Établissements de Charpente et de Couverture du Grand Ouest'
		);
		expect(longue.length).toBeLessThanOrEqual(40);
		expect(longue.endsWith('-')).toBe(false);
		expect(longue.startsWith('societe-nouvelle-des-etablissements')).toBe(true);
	});

	it('rend « contact » pour un nom sans lettre ni chiffre', () => {
		expect(partieLocale('—')).toBe('contact');
		expect(partieLocale('')).toBe('contact');
	});
});

describe('le domaine neutre', () => {
	it('lit un domaine, sans tenir compte de la casse ni des espaces', () => {
		expect(lireDomaine(' Suivi-Factures.FR ')).toBe('suivi-factures.fr');
	});

	it('refuse ce qui n’est pas un domaine, au lieu d’envoyer depuis une adresse fausse', () => {
		expect(lireDomaine('relances@suivi-factures.fr')).toBeNull();
		expect(lireDomaine('suivi factures.fr')).toBeNull();
		expect(lireDomaine('localhost')).toBeNull();
		expect(lireDomaine(undefined)).toBeNull();
	});
});

describe('l’adresse d’envoi d’un établissement', () => {
	it('prend le nom de l’établissement sur le domaine neutre', () => {
		expect(
			adresseDEnvoi('Durand BTP', { domaine: 'suivi-factures.fr', commune: 'bonjour@letikette.com' })
		).toBe('durand-btp@suivi-factures.fr');
	});

	it('garde l’adresse commune tant qu’aucun domaine neutre n’est posé', () => {
		expect(adresseDEnvoi('Durand BTP', { domaine: null, commune: 'Letikette <bonjour@letikette.com>' })).toBe(
			'bonjour@letikette.com'
		);
	});

	it('met le nom de l’établissement devant, sans guillemet qui casserait l’en-tête', () => {
		expect(enTeteExpediteur('Durand "BTP" <SARL>', 'durand-btp@suivi-factures.fr')).toBe(
			'"Durand BTP SARL" <durand-btp@suivi-factures.fr>'
		);
	});
});
