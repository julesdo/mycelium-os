import { describe, it, expect } from 'vitest';
import { depuisCentimes } from '../montants';
import { composerVirementEpc } from '../virement-epc';

/**
 * ⚠️ CE QU'ON VÉRIFIE ICI, C'EST OÙ VA L'ARGENT.
 *
 * Un QR mal composé ne rend pas d'erreur : l'application bancaire le lit quand
 * même, et pré-remplit un virement faux. Un virement faux part vers un compte
 * et ne revient pas. Chaque borne de la norme est donc contrôlée, et chaque
 * contrôle vérifie un REFUS — la seule issue acceptable quand on ne peut pas
 * composer juste.
 */

const CORRECT = {
	beneficiaire: 'Charpentes Vidal',
	iban: 'FR76 3000 6000 0112 3456 7890 189',
	montant: depuisCentimes(637_350n),
	reference: 'Dossier FD-2026-118'
};

describe('le virement en QR', () => {
	it('compose les onze lignes de la norme, dans l’ordre', () => {
		const compose = composerVirementEpc(CORRECT);
		expect(compose.ok).toBe(true);
		if (!compose.ok) return;

		expect(compose.charge.split('\n')).toEqual([
			'BCD',
			'002',
			'1',
			'SCT',
			// Le BIC : facultatif en version 002, et le produit ne le connaît pas.
			'',
			'Charpentes Vidal',
			// ⚠️ NORMALISÉ, SANS ESPACES : la banque lit l'IBAN, pas sa mise en forme.
			'FR7630006000011234567890189',
			'EUR6373.50',
			'',
			'',
			'Dossier FD-2026-118'
		]);
	});

	it('écrit le montant à la manière de la norme, jamais à la française', () => {
		// « 6 373,50 » est juste à l'écran et illisible pour une banque.
		const cas: readonly [bigint, string][] = [
			[1n, 'EUR0.01'],
			[100n, 'EUR1.00'],
			[637_350n, 'EUR6373.50'],
			[100_000_000n, 'EUR1000000.00'],
			[99_999_999_999n, 'EUR999999999.99']
		];
		for (const [centimes, attendu] of cas) {
			const compose = composerVirementEpc({ ...CORRECT, montant: depuisCentimes(centimes) });
			expect(compose.ok, String(centimes)).toBe(true);
			if (compose.ok) expect(compose.charge.split('\n')[7]).toBe(attendu);
		}
	});

	it('refuse un montant nul ou hors des bornes, au lieu de composer', () => {
		const nul = composerVirementEpc({ ...CORRECT, montant: depuisCentimes(0n) });
		expect(nul.ok).toBe(false);
		if (!nul.ok) expect(nul.manques.join(' ')).toMatch(/montant est nul/i);

		const trop = composerVirementEpc({ ...CORRECT, montant: depuisCentimes(100_000_000_000n) });
		expect(trop.ok).toBe(false);
		if (!trop.ok) expect(trop.manques.join(' ')).toMatch(/dépasse/i);
	});

	it('refuse un IBAN faux, et dit lequel des deux défauts c’est', () => {
		const forme = composerVirementEpc({ ...CORRECT, iban: 'pas un iban' });
		expect(forme.ok).toBe(false);
		if (!forme.ok) expect(forme.manques.join(' ')).toMatch(/n’a pas la forme/i);

		// La forme est bonne, un chiffre est faux : c'est la clé qui tombe.
		const cle = composerVirementEpc({ ...CORRECT, iban: 'FR7630006000011234567890188' });
		expect(cle.ok).toBe(false);
		if (!cle.ok) expect(cle.manques.join(' ')).toMatch(/clé de contrôle/i);
	});

	it('refuse sans bénéficiaire et sans référence, et nomme les deux d’un coup', () => {
		const rien = composerVirementEpc({ ...CORRECT, beneficiaire: '  ', reference: '' });
		expect(rien.ok).toBe(false);
		// ⚠️ LES DEUX, PAS LE PREMIER. Un refus qui s'arrête au premier manque fait
		// recommencer autant de fois qu'il y a de champs vides.
		if (!rien.ok) {
			expect(rien.manques).toHaveLength(2);
			expect(rien.manques.join(' ')).toMatch(/bénéficiaire/i);
			expect(rien.manques.join(' ')).toMatch(/référence/i);
		}
	});

	it('refuse ce qui dépasse les bornes de longueur, plutôt que de tronquer', () => {
		const nomLong = composerVirementEpc({ ...CORRECT, beneficiaire: 'A'.repeat(71) });
		expect(nomLong.ok).toBe(false);
		if (!nomLong.ok) expect(nomLong.manques.join(' ')).toMatch(/71 caractères/);

		const refLongue = composerVirementEpc({ ...CORRECT, reference: 'R'.repeat(141) });
		expect(refLongue.ok).toBe(false);
		if (!refLongue.ok) expect(refLongue.manques.join(' ')).toMatch(/141 caractères/);
	});

	it('compte les OCTETS, pas les caractères', () => {
		// ⚠️ LA NORME BORNE LA CHARGE À 331 OCTETS, et un accent en vaut deux en
		// UTF-8. Compté en caractères, un nom accentué passerait le contrôle et
		// produirait un QR que la banque refuse de lire.
		const accents = composerVirementEpc({
			...CORRECT,
			beneficiaire: 'Éé'.repeat(35), // 70 caractères, 140 octets
			reference: 'à'.repeat(140) // 140 caractères, 280 octets
		});
		expect(accents.ok).toBe(false);
		if (!accents.ok) expect(accents.manques.join(' ')).toMatch(/octets/i);
	});
});
