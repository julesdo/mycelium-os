import { describe, it, expect } from 'vitest';
import { construirePromptExtraction } from '../documents/prompt';

describe('construirePromptExtraction', () => {
	it('est déterministe : deux appels produisent le même texte, octet pour octet', () => {
		const a = construirePromptExtraction();
		const b = construirePromptExtraction();
		expect(a).toBe(b);
	});

	it('dépasse 2000 caractères (minimum de mise en cache de 512 tokens sur Opus 5)', () => {
		expect(construirePromptExtraction().length).toBeGreaterThan(2000);
	});

	it('ne contient aucune séquence de chiffres ressemblant à une date', () => {
		const texte = construirePromptExtraction();
		// Formats JJ/MM/AAAA, JJ-MM-AAAA, JJ.MM.AAAA (et variantes à 2 chiffres)
		expect(texte).not.toMatch(/\d{1,2}[/\-.]\d{1,2}([/\-.]\d{2,4})?/);
		// Année isolée (19xx / 20xx)
		expect(texte).not.toMatch(/\b(19|20)\d{2}\b/);
	});

	it("ne mentionne aucune disposition de facture précise (colonnes fixes, gabarit)", () => {
		const texte = construirePromptExtraction();
		expect(texte).toMatch(/aucun format particulier/i);
	});
});
