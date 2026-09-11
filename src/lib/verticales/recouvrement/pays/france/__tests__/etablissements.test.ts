import { describe, expect, it } from 'vitest';
import { lireEtablissements } from '../etablissements';

/**
 * TROUVER UN DÉBITEUR AU REGISTRE, À PARTIR DE SON NOM.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE DÉFAUT QUE CE MODULE CORRIGE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le volet d'un débiteur demandait son SIREN dans un CHAMP DE SAISIE VIDE. Le
 * gérant devait aller le chercher ailleurs et le recopier à neuf chiffres.
 *
 * C'est la règle d'écran n° 1 du projet, retournée : « le logiciel décide, le
 * gérant confirme. Aucun écran ne demande une saisie que le logiciel peut
 * déduire. Un champ vide qu'il aurait pu remplir est un défaut. »
 *
 * Et le logiciel POUVAIT : le BODACC est branché depuis le radar de
 * solvabilité, il est ouvert, sans clé, et il porte pour chaque annonce le nom
 * du commerçant, son SIREN, sa forme juridique et l'adresse de son siège.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ON PROPOSE, ON NE CHOISIT PAS — ET C'EST MESURÉ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Une recherche sur « BOULANGERIE MARTIN » rend six sociétés distinctes, dans
 * six villes. Choisir automatiquement la première écrirait un SIREN faux dans
 * un dossier — et ce SIREN commande le radar de solvabilité ET l'éligibilité à
 * toute procédure. C'est exactement la faute que `bodacc.ts` interdit déjà pour
 * la surveillance : « rapprocher par raison sociale finirait par annoncer à un
 * gérant que son client solvable est en liquidation ».
 *
 * La différence entre les deux gestes tient en un mot : la surveillance
 * APPLIQUE sans que personne regarde, cette recherche PROPOSE et attend un
 * doigt. Le module rend donc une liste ordonnée, jamais un choix.
 */

/** Une annonce telle que l'API la rend. Réduite à ce que le module lit. */
function annonce(sur: Record<string, unknown>): Record<string, unknown> {
	return {
		commercant: 'BOULANGERIE MARTIN',
		registre: ['421 931 452', '421931452'],
		ville: 'Fécamp',
		dateparution: '2026-07-19',
		listepersonnes: JSON.stringify({
			personne: {
				denomination: 'BOULANGERIE MARTIN',
				formeJuridique: 'Société par Actions Simplifiée',
				adresseSiegeSocial: {
					numeroVoie: '6',
					typeVoie: 'Place',
					nomVoie: 'Nicolas Sellé',
					codePostal: '76400',
					ville: 'Fécamp'
				}
			}
		}),
		...sur
	};
}

describe('la recherche d’un établissement au registre', () => {
	it('rend le SIREN, la forme juridique et l’adresse, sans rien demander', () => {
		const [trouve] = lireEtablissements([annonce({})]);

		expect(trouve).toMatchObject({
			siren: '421931452',
			denomination: 'BOULANGERIE MARTIN',
			formeJuridique: 'Société par Actions Simplifiée',
			ville: 'Fécamp',
			adresse: '6 Place Nicolas Sellé 76400 Fécamp'
		});
	});

	it('dédoublonne par SIREN : une société, pas ses quarante annonces', () => {
		// Une société déposant ses comptes chaque année apparaît autant de fois.
		// Quarante rangées identiques ne sont pas un choix, c'est un mur.
		const trouves = lireEtablissements([
			annonce({ dateparution: '2026-07-19' }),
			annonce({ dateparution: '2025-07-02' }),
			annonce({ dateparution: '2024-06-28' })
		]);

		expect(trouves).toHaveLength(1);
		// La plus récente gagne : c'est elle qui porte le nom et l'adresse à jour.
		expect(trouves[0]?.derniereParution).toBe('2026-07-19');
	});

	it('garde les sociétés distinctes, dans l’ordre où l’API les rend', () => {
		const trouves = lireEtablissements([
			annonce({ registre: ['421931452'], ville: 'Fécamp' }),
			annonce({ registre: ['805188000'], commercant: 'BOULANGERIE SAINT MARTIN', ville: 'Vesoul' })
		]);

		expect(trouves.map((e) => e.siren)).toEqual(['421931452', '805188000']);
	});

	it('écarte une annonce dont aucun numéro ne passe sa clé de contrôle', () => {
		// ⚠️ MÊME EXIGENCE QUE LA SURVEILLANCE. Un SIREN qui ne vérifie pas sa clé
		// est une donnée abîmée ; proposé au gérant, il serait recopié dans un
		// dossier et commanderait ensuite le radar. On préfère ne rien proposer.
		expect(lireEtablissements([annonce({ registre: ['000000000'] })])).toEqual([]);
		expect(lireEtablissements([annonce({ registre: [] })])).toEqual([]);
		expect(lireEtablissements([annonce({ registre: null })])).toEqual([]);
	});

	it('ne lève jamais, quelle que soit l’annonce', () => {
		// `listepersonnes` arrive en CHAÎNE JSON, comme `jugement`, et cassera tôt
		// ou tard. Une annonce illisible ne doit pas éteindre la recherche.
		expect(() => lireEtablissements([annonce({ listepersonnes: '{cassé' })])).not.toThrow();
		expect(() => lireEtablissements([annonce({ listepersonnes: null })])).not.toThrow();
		expect(() => lireEtablissements([null, 42, 'texte'])).not.toThrow();
		expect(lireEtablissements([])).toEqual([]);
	});

	it('reste utilisable quand le siège n’est pas lisible', () => {
		// L'adresse est un CONFORT de reconnaissance, pas la donnée qu'on cherche.
		// Son absence ne doit pas faire disparaître un candidat valable.
		const [trouve] = lireEtablissements([annonce({ listepersonnes: null })]);

		expect(trouve?.siren).toBe('421931452');
		expect(trouve?.adresse).toBeUndefined();
		// Faute de `listepersonnes`, on retombe sur le nom du commerçant — qui est
		// une colonne à part, et présente.
		expect(trouve?.denomination).toBe('BOULANGERIE MARTIN');
	});
});
