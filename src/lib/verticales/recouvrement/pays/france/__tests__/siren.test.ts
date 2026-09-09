import { describe, it, expect } from 'vitest';
import { estSirenValide, normaliserSiren, sirenDepuisSiret } from '../siren';

/**
 * LE SIREN — l'identifiant sans lequel aucun registre public n'est interrogeable.
 *
 * La colonne existe en base depuis le premier jour, elle est lue à l'écran, et
 * **rien ne l'a jamais écrite**. C'est le blocage qui commande tout le reste :
 * le radar BODACC et la normalisation Sirene s'interrogent par SIREN, et sans
 * lui ils ne rapprocheraient rien — ou pire, rapprocheraient par NOM.
 *
 * ⚠️ POURQUOI PAS PAR NOM. Une correspondance de raison sociale sur un flux
 * national annoncerait tôt ou tard à un gérant que son client solvable est en
 * liquidation. C'est la faute symétrique de la relance d'un client qui a déjà
 * payé, et elle coûte plus cher : elle fait cesser des livraisons.
 *
 * LES SIREN DE RÉFÉRENCE CI-DESSOUS SONT RÉELS, relevés le 9 septembre 2026 sur
 * le BODACC — pas fabriqués. Un jeu d'essai inventé pour un algorithme de clé de
 * contrôle valide surtout la manière dont on l'a inventé.
 */

/** Relevés dans le flux BODACC du 9 septembre 2026. */
const SIREN_REELS = ['853479236', '502592959', '109192302'];

describe('normaliserSiren', () => {
	it('accepte les graphies usuelles et rend neuf chiffres nus', () => {
		expect(normaliserSiren('853 479 236')).toBe('853479236');
		expect(normaliserSiren('853479236')).toBe('853479236');
		expect(normaliserSiren('  853-479-236 ')).toBe('853479236');
		expect(normaliserSiren('SIREN 853.479.236')).toBe('853479236');
	});

	it('refuse ce qui n’a pas neuf chiffres', () => {
		expect(normaliserSiren('85347923')).toBeNull();
		expect(normaliserSiren('8534792360')).toBeNull();
		expect(normaliserSiren('')).toBeNull();
		expect(normaliserSiren('pas un numéro')).toBeNull();
	});

	it('refuse un numéro dont la clé de contrôle ne tombe pas', () => {
		// Le dernier chiffre est une clé : 853479237 est bien formé et faux.
		expect(normaliserSiren('853479237')).toBeNull();
	});
});

describe('estSirenValide', () => {
	it('valide les SIREN réels relevés au registre', () => {
		for (const siren of SIREN_REELS) {
			expect(estSirenValide(siren), siren).toBe(true);
		}
	});

	it('refuse chaque altération d’un chiffre d’un SIREN réel', () => {
		// La clé de Luhn attrape toute faute de frappe d'UN chiffre. C'est
		// exactement le service qu'on lui demande : un SIREN saisi à la main.
		const bon = '853479236';
		let attrapees = 0;
		let essais = 0;
		for (let position = 0; position < 9; position++) {
			for (let chiffre = 0; chiffre <= 9; chiffre++) {
				const altere = bon.slice(0, position) + String(chiffre) + bon.slice(position + 1);
				if (altere === bon) continue;
				essais += 1;
				if (!estSirenValide(altere)) attrapees += 1;
			}
		}
		expect(essais).toBe(81);
		expect(attrapees).toBe(81);
	});

	it('refuse neuf zéros', () => {
		// Bien formé, clé juste — et ce n'est l'identifiant de personne. Le laisser
		// passer ferait rapprocher au registre une entreprise qui n'existe pas.
		expect(estSirenValide('000000000')).toBe(false);
	});
});

describe('sirenDepuisSiret', () => {
	it('extrait le SIREN des neuf premiers chiffres', () => {
		// Un SIRET est un SIREN suivi d'un NIC de cinq chiffres : le SIREN s'en
		// LIT, il ne s'en calcule pas.
		expect(sirenDepuisSiret('85347923600017')).toBe('853479236');
		expect(sirenDepuisSiret('853 479 236 00017')).toBe('853479236');
	});

	it('refuse un SIRET qui n’a pas quatorze chiffres', () => {
		expect(sirenDepuisSiret('853479236')).toBeNull();
		expect(sirenDepuisSiret('853479236000178')).toBeNull();
	});

	it('refuse un SIRET dont le SIREN ne tient pas', () => {
		expect(sirenDepuisSiret('85347923700017')).toBeNull();
	});

	it('ne prétend PAS vérifier la clé du SIRET lui-même', () => {
		// On ne valide que ce qu'on sait valider. Le NIC porte sa propre clé, dont
		// l'algorithme n'a pas été relevé : l'inventer produirait des refus
		// arbitraires sur des numéros parfaitement valides.
		expect(sirenDepuisSiret('85347923699999')).toBe('853479236');
	});
});
