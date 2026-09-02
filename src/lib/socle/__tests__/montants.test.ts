import { describe, it, expect } from 'vitest';
import {
	depuisEuros,
	versEuros,
	additionner,
	soustraire,
	multiplier,
	fraction,
	ZERO
} from '../montants';

/**
 * L'arithmétique des montants — le seul module du socle où une erreur se compte
 * en euros réels sur le compte de quelqu'un.
 *
 * EGalim tolérait les flottants : il produit un RATIO, et l'erreur de
 * représentation y est très inférieure au bruit de classification. Un décompte
 * de créance destiné à un titre exécutoire ne tolère rien : ce qui n'est pas
 * demandé dans l'acte est définitivement perdu, et un centime de trop est une
 * somme réclamée sans fondement.
 */

describe('lecture et écriture des montants', () => {
	it("additionne sans l'erreur de représentation des flottants", () => {
		// En flottant, 0.1 + 0.2 vaut 0.30000000000000004. C'est LA raison
		// d'être de ce module, donc le premier test.
		const dix = depuisEuros('0,10');
		const vingt = depuisEuros('0,20');
		expect(versEuros(additionner(dix, vingt))).toBe('0,30');
	});

	it('lit un montant écrit à la française, avec séparateur de milliers', () => {
		expect(versEuros(depuisEuros('1 234,56'))).toBe('1 234,56');
	});

	it("lit un montant écrit à l'anglaise, avec un point décimal", () => {
		expect(versEuros(depuisEuros('1234.56'))).toBe('1 234,56');
	});

	it('lit les espaces insécables que sèment les exports PDF et tableur', () => {
		// Insécable U+00A0 et insécable étroite U+202F : invisibles à l'œil, et
		// une fois sur deux ce sont eux qui séparent les milliers sur un export.
		// Écrits en échappements : un insécable littéral dans une source est
		// invisible à la relecture, et le linter le refuse a juste titre.
		const insecable = '1\u00A0234,56';
		const insecableEtroite = '1\u202F234,56';
		expect(versEuros(depuisEuros(insecable))).toBe('1 234,56');
		expect(versEuros(depuisEuros(insecableEtroite))).toBe('1 234,56');
	});

	it('lit les deux conventions de séparateur de milliers', () => {
		// Un export comptable français écrit 1.234,56 ; un export anglophone
		// écrit 1,234.56. Les deux se rencontrent dans le même dossier client.
		// Quand LES DEUX séparateurs sont présents, le plus à droite est le
		// décimal : il n'y a aucune ambiguïté à lever.
		expect(versEuros(depuisEuros('1.234,56'))).toBe('1 234,56');
		expect(versEuros(depuisEuros('1,234.56'))).toBe('1 234,56');
		expect(versEuros(depuisEuros('1.234.567,89'))).toBe('1 234 567,89');
		expect(versEuros(depuisEuros('-1.234,56'))).toBe('-1 234,56');
	});

	it('refuse toujours un séparateur unique suivi de trois chiffres', () => {
		// « 12,345 » n'est levable par aucune règle : 12 345 en anglais,
		// 12,345 € en français — soit un facteur mille. Un montant qu'on ne
		// sait pas lire doit être refusé, jamais deviné.
		expect(() => depuisEuros('12,345')).toThrow();
		expect(() => depuisEuros('12.345')).toThrow();
	});

	it('retire les symboles monétaires collés au montant', () => {
		expect(versEuros(depuisEuros('1 234,56 €'))).toBe('1 234,56');
	});

	it('lit un montant négatif — un avoir est une ligne comme une autre', () => {
		expect(versEuros(depuisEuros('-400,00'))).toBe('-400,00');
	});

	it('complète les centimes manquants plutôt que de les deviner', () => {
		expect(versEuros(depuisEuros('12'))).toBe('12,00');
		expect(versEuros(depuisEuros('12,5'))).toBe('12,50');
	});

	it('refuse un texte qui n’est pas un montant, plutôt que de rendre zéro', () => {
		// Rendre 0 sur une saisie illisible ferait disparaître une créance en
		// silence. L'échec doit être bruyant.
		expect(() => depuisEuros('')).toThrow();
		expect(() => depuisEuros('abc')).toThrow();
		expect(() => depuisEuros('12,345')).toThrow();
	});

	it('soustrait exactement, y compris en passant sous zéro', () => {
		const cent = depuisEuros('100,00');
		const centTrente = depuisEuros('130,00');
		expect(versEuros(soustraire(cent, centTrente))).toBe('-30,00');
	});

	it('additionne une longue série sans dérive cumulée', () => {
		// Mille fois 0,01 € vaut 10,00 €. En flottant, la somme dérive.
		const unCentime = depuisEuros('0,01');
		let total = depuisEuros('0');
		for (let i = 0; i < 1000; i++) total = additionner(total, unCentime);
		expect(versEuros(total)).toBe('10,00');
	});
});

describe('multiplication par une fraction — la brique des intérêts', () => {
	it('applique un taux simple sans perdre de précision', () => {
		// 1 000,00 € à 10 % = 100,00 €
		const principal = depuisEuros('1000,00');
		expect(versEuros(multiplier(principal, fraction(10n, 100n)))).toBe('100,00');
	});

	it('garde la chaîne exacte avant le seul arrondi, à la fin', () => {
		// 1 000,00 € à 12,45 % l'an, sur 173 jours d'une année de 365.
		//
		// En centimes, la chaîne entière reste entière :
		//   100 000 × 1 245 × 173 = 21 538 500 000
		//   10 000 × 365          =      3 650 000
		//   quotient 5 900, reste 3 500 000 sur 3 650 000, soit 0,9589
		// → 5 900,9589 centimes, arrondi à 5 901, soit 59,01 €.
		//
		// La division est unique et différée : c'est le seul endroit du calcul
		// où de l'information se perd, et on décide où.
		const principal = depuisEuros('1000,00');
		const taux = fraction(1245n * 173n, 10000n * 365n);
		expect(versEuros(multiplier(principal, taux))).toBe('59,01');
	});

	it('arrondit au centime le plus proche, en s’éloignant de zéro à égalité', () => {
		// 0,125 € doit donner 0,13 € et non 0,12 €. C'est l'arrondi commercial.
		const unEuro = depuisEuros('1,00');
		expect(versEuros(multiplier(unEuro, fraction(125n, 1000n)))).toBe('0,13');
		expect(versEuros(multiplier(unEuro, fraction(135n, 1000n)))).toBe('0,14');
	});

	it('arrondit symétriquement sur un montant négatif', () => {
		// Un avoir ne doit pas être arrondi dans l'autre sens : -0,125 € donne
		// -0,13 €. Sans quoi un décompte cesserait d'être symétrique, et
		// rejouer le même dossier en sens inverse ne rendrait pas zéro.
		const moinsUnEuro = depuisEuros('-1,00');
		expect(versEuros(multiplier(moinsUnEuro, fraction(125n, 1000n)))).toBe('-0,13');
	});

	it('refuse une fraction de dénominateur nul plutôt que de rendre l’infini', () => {
		expect(() => fraction(1n, 0n)).toThrow();
	});

	it('rend exactement zéro sur un principal nul', () => {
		expect(versEuros(multiplier(ZERO, fraction(1245n, 10000n)))).toBe('0,00');
	});
});
