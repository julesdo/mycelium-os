import { describe, it, expect } from 'vitest';
import { fraction } from '../../../socle/montants';
import { controlerTauxContractuel, tauxDepuisPourcentage } from '../taux-contractuel';
import { plancherContractuel } from '../pays/france/taux';

/**
 * LE TAUX CONTRACTUEL — le déclarer, le contrôler, ne jamais le corriger.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI CE MODULE EXISTE : UN CHAMP LU ET JAMAIS ALIMENTÉ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `facturesVente.tauxContractuel` était déclaré au schéma et LU par les deux
 * moteurs de calcul — le décompte et la révélation — qui s'en servent pour
 * remplacer la série légale par une stipulation.
 *
 * Il n'était ÉCRIT nulle part. Aucune mutation, aucun import, aucun écran.
 *
 * Conséquence, invisible et coûteuse : tout créancier dont les conditions
 * générales stipulent un taux — c'est le cas courant en B2B — retombait
 * silencieusement sur le taux légal. Le produit sous-réclamait, ce qui est
 * exactement l'inverse de sa raison d'être.
 *
 * C'est la cinquième occurrence du défaut « déclaré, lu, jamais alimenté »
 * dans ce dépôt.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ON CONSTATE LE PLANCHER, ON NE RELÈVE AUCUN TAUX
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `pays/france/taux.ts` le dit déjà : « relever d'office un taux contractuel
 * jugé trop bas serait écrire une conséquence juridique que personne n'a
 * validée ». Ce module s'y tient. Un taux sous le plancher est ENREGISTRÉ tel
 * que le créancier le déclare, et le constat le dit — au créancier de voir.
 */

describe('lire un taux saisi', () => {
	it('accepte un pourcentage à deux décimales, sans flottant', () => {
		// ⚠️ AUCUN FLOTTANT DANS LA CHAÎNE. 12,45 % devient 1245/10000, exactement
		// comme les taux du registre. Passer par `Number` réintroduirait ici la
		// seule chose que tout le produit évite depuis le parseur.
		const taux = tauxDepuisPourcentage('12,45');
		expect(taux).toEqual(fraction(1245n, 10000n));
	});

	it('accepte la notation à point comme à virgule', () => {
		expect(tauxDepuisPourcentage('12.45')).toEqual(tauxDepuisPourcentage('12,45'));
	});

	it('accepte un entier', () => {
		expect(tauxDepuisPourcentage('15')).toEqual(fraction(1500n, 10000n));
	});

	it('refuse trois décimales plutôt que d’arrondir', () => {
		// Arrondir silencieusement un taux qui entre dans un décompte opposable
		// est la définition d'un chiffre faux qu'on ne peut plus expliquer.
		expect(() => tauxDepuisPourcentage('12,455')).toThrow(/décimale/i);
	});

	it('refuse ce qui n’est pas un nombre', () => {
		expect(() => tauxDepuisPourcentage('douze')).toThrow();
		expect(() => tauxDepuisPourcentage('')).toThrow();
		expect(() => tauxDepuisPourcentage('1e3')).toThrow();
	});

	it('refuse un taux négatif ou nul', () => {
		// Un taux nul n'est pas une stipulation, c'est une renonciation — et elle
		// ne se déduit pas d'un champ laissé à zéro.
		expect(() => tauxDepuisPourcentage('0')).toThrow();
		expect(() => tauxDepuisPourcentage('-5')).toThrow();
	});
});

describe('contrôler un taux contre le plancher légal', () => {
	const LE_JOUR = '2026-03-15';

	it('ne dit rien sur un taux au-dessus du plancher', () => {
		const plancher = plancherContractuel(LE_JOUR);
		// Un taux franchement au-dessus : le plancher légal tourne autour de 10 %,
		// quinze points le dépassent dans tous les semestres relevés.
		const controle = controlerTauxContractuel(fraction(1500n, 10000n), LE_JOUR);

		expect(controle.sousLePlancher).toBe(false);
		expect(controle.plancher).toEqual(plancher);
	});

	it('CONSTATE un taux sous le plancher, sans le corriger', () => {
		// ⚠️ LE TEST QUI PORTE LA RÈGLE. Un pour cent est sous n'importe quel
		// plancher relevé. Le module doit le DIRE et rendre le taux INCHANGÉ.
		const declare = fraction(100n, 10000n);
		const controle = controlerTauxContractuel(declare, LE_JOUR);

		expect(controle.sousLePlancher).toBe(true);
		expect(controle.taux).toEqual(declare);
		expect(controle.constat).toMatch(/plancher/i);
	});

	it('ne recommande jamais de démarche dans son constat', () => {
		// Ligne rouge 3 : le produit énonce des constats, jamais des consignes.
		const controle = controlerTauxContractuel(fraction(100n, 10000n), LE_JOUR);
		expect(controle.constat).not.toMatch(/relanc|poursuiv|assign|injonction|mettez|devez/i);
	});

	it('rend le plancher lisible, pour que le créancier refasse le calcul', () => {
		// Un constat qui dit « sous le plancher » sans dire lequel oblige à nous
		// croire. Décomposé, il se refait à la main — c'est la règle du produit.
		const controle = controlerTauxContractuel(fraction(100n, 10000n), LE_JOUR);
		expect(controle.plancherLisible).toMatch(/%/);
	});

	it('ne lève pas sur un semestre absent de la série — il le NOMME', () => {
		// ⚠️ Un semestre non relevé fait lever `plancherContractuel`. Ici cette
		// exception emporterait l'enregistrement d'un taux parfaitement valable.
		// Le contrôle devient alors « inconnu », et le taux s'enregistre quand
		// même : on ne refuse pas une donnée du client parce qu'il nous manque
		// une valeur juridique.
		const controle = controlerTauxContractuel(fraction(1500n, 10000n), '1999-01-01');

		expect(controle.plancherConnu).toBe(false);
		expect(controle.sousLePlancher).toBe(false);
		expect(controle.constat).toMatch(/1999|plancher/i);
	});
});
