import { describe, it, expect } from 'vitest';
import { construirePromptSysteme } from '../prompt';
import { FAUX_AMIS, MENTIONS_NON_QUALIFIANTES, LABELS_QUALIFIANTS } from '../../../egalim/referentiel';
import { FAMILLES } from '../../../egalim/types';

describe('construirePromptSysteme', () => {
	it('produit exactement le même texte à chaque appel', () => {
		expect(construirePromptSysteme()).toBe(construirePromptSysteme());
	});

	it('dépasse le minimum cacheable de 512 tokens (~2 000 caractères)', () => {
		// Sous ce seuil, `cache_control` est accepté sans erreur mais ne cache
		// RIEN, et le coût par diagnostic sort du budget sans aucun signal.
		expect(construirePromptSysteme().length).toBeGreaterThan(2000);
	});

	it('cite les faux amis relevés sur de vraies factures', () => {
		const p = construirePromptSysteme();
		expect(p).toContain('V.B.F.');
		expect(p).toContain('plein air');
	});

	it('ne contient ni date ni horodatage — ce qui invaliderait le cache', () => {
		const p = construirePromptSysteme();
		expect(p).not.toMatch(/\d{4}-\d{2}-\d{2}/);
		expect(p).not.toMatch(/\b\d{10,}\b/);
	});

	it('énumère la totalité du barème, des familles et des mentions creuses', () => {
		const p = construirePromptSysteme();
		for (const code of Object.keys(LABELS_QUALIFIANTS)) expect(p).toContain(code);
		for (const famille of FAMILLES) expect(p).toContain(famille);
		for (const mention of MENTIONS_NON_QUALIFIANTES) expect(p).toContain(mention);
		for (const faux of FAUX_AMIS) expect(p).toContain(faux.mention);
	});

	it('ne demande jamais au modèle de trancher bio ou durable', () => {
		// Les deux booléens se déduisent du barème, code versionné et relu.
		// Les laisser au modèle rendrait le chiffre indéfendable en contrôle.
		const p = construirePromptSysteme();
		expect(p).not.toContain('isBio');
		expect(p).not.toContain('isDurable');
	});
});
