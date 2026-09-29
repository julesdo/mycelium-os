import { describe, it, expect } from 'vitest';
import { ibanLisible, lireIban } from '../iban';

/**
 * ⚠️ CE TEST EXISTE PARCE QUE LE DÉFAUT ÉTAIT EN PRODUCTION, ET MUET.
 *
 * Les deux expressions régulières de `profil.ts` avaient perdu leurs barres
 * obliques inverses : `/s+/g` retirait la lettre « s », et `d{2}` exigeait deux
 * « d » littéraux. Aucun IBAN ne passait, et le refus annonçait « sa clé de
 * contrôle ne tombe pas » alors que la clé n'était jamais calculée.
 *
 * Rien ne tombait : la compilation est contente, l'écran s'affiche, et c'est le
 * gérant qui découvre au moment d'écrire que son IBAN n'a jamais été enregistré.
 * Un seul cas passant aurait suffi à l'attraper — il est le premier ci-dessous.
 */
describe('l’IBAN', () => {
	it('accepte un IBAN réel, avec ou sans espaces, en minuscules', () => {
		// Les IBAN de test publiés par les registres nationaux, un par pays pour
		// que la transposition et le modulo se vérifient sur des longueurs
		// différentes (27, 22, 18 et 20 caractères).
		for (const saisi of [
			'FR7630006000011234567890189',
			'fr76 3000 6000 0112 3456 7890 189',
			'  FR76 30006000011234567890189  ',
			'DE89370400440532013000',
			'BE68539007547034',
			'NL91ABNA0417164300'
		]) {
			const lu = lireIban(saisi);
			expect(lu.ok, saisi).toBe(true);
		}
	});

	it('normalise : sans espaces, en majuscules', () => {
		const lu = lireIban('fr76 3000 6000 0112 3456 7890 189');
		expect(lu.ok && lu.iban).toBe('FR7630006000011234567890189');
	});

	it('distingue une saisie qui n’a pas la forme d’un IBAN d’une clé fausse', () => {
		// ⚠️ LA DISTINCTION N'EST PAS COSMÉTIQUE. « Ce n'est pas un IBAN » se
		// corrige en recopiant, « la clé ne tombe pas » en vérifiant un chiffre.
		// L'ancienne version annonçait la seconde sur toutes les saisies.
		expect(lireIban('')).toEqual({ ok: false, motif: 'FORME' });
		expect(lireIban('pas un iban')).toEqual({ ok: false, motif: 'FORME' });
		expect(lireIban('FR76')).toEqual({ ok: false, motif: 'FORME' });

		// La forme est bonne, un seul chiffre est faux : c'est la clé qui tombe.
		expect(lireIban('FR7630006000011234567890188')).toEqual({ ok: false, motif: 'CLE' });
	});

	it('calcule le reste chiffre par chiffre, donc tient sur 34 caractères', () => {
		// Un IBAN maltais : 31 caractères, soit 62 chiffres une fois transposé —
		// bien au-delà de ce qu'un `Number` retient exactement.
		expect(lireIban('MT84MALT011000012345MTLCAST001S').ok).toBe(true);
	});

	it('se relit par quatre, pour l’écran seulement', () => {
		expect(ibanLisible('FR7630006000011234567890189')).toBe(
			'FR76 3000 6000 0112 3456 7890 189'
		);
	});
});
