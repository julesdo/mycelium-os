import { describe, it, expect } from 'vitest';
import { brouillonSchema, construireMessageBrouillon, construirePromptBrouillon } from '../prompt-brouillon';

describe('le brouillon de Plume pour l’équipe', () => {
	it('part d’un prompt figé, qui dit que c’est un brouillon relu par un humain', () => {
		const prompt = construirePromptBrouillon();
		expect(prompt).toBe(construirePromptBrouillon());
		expect(prompt).toMatch(/brouillon/i);
		expect(prompt).toMatch(/relu/i);
		expect(prompt).not.toMatch(/\d{4}-\d{2}-\d{2}/);
	});

	it('porte la conversation entière, l’équipe comprise, et la tâche', () => {
		const message = construireMessageBrouillon({
			prenomDuGerant: 'Jules',
			fil: [
				{ auteur: 'GERANT', texte: 'Je veux changer l’adresse e-mail du compte' },
				{ auteur: 'EQUIPE', texte: 'Pouvez-vous confirmer la nouvelle adresse ?' },
				{ auteur: 'GERANT', texte: 'jules@nouveau.fr' }
			]
		});
		expect(message).toContain('Pouvez-vous confirmer');
		expect(message.indexOf('jules@nouveau.fr')).toBeGreaterThan(message.indexOf('Pouvez-vous'));
		expect(message).toContain('Jules');
	});

	it('n’accepte qu’un texte borné', () => {
		expect(brouillonSchema.safeParse({ texte: 'Bonjour Jules, c’est fait.' }).success).toBe(true);
		expect(brouillonSchema.safeParse({ texte: 'x'.repeat(3000) }).success).toBe(false);
	});
});
