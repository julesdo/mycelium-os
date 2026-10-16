import { describe, it, expect } from 'vitest';
import { filtrerReponseSupport } from '../filtres';
import {
	construireMessageSupport,
	construirePromptSupport,
	reponseSupportSchema,
	type ContexteDuCompte
} from '../prompt-support';

const phrase = (texte: string, genre: 'ARTICLE' | 'COMPTE' | 'AUCUNE' = 'ARTICLE') => ({
	texte,
	source: { genre, ...(genre === 'AUCUNE' ? {} : { cle: 'formules' }) }
});

describe('filtrerReponseSupport', () => {
	it('garde une réponse de fonctionnement sourcée, chiffres compris', () => {
		const r = filtrerReponseSupport([
			phrase('Solo coûte 12 € HT par mois.'),
			phrase('Les relances partent de 9 h à 18 h.', 'COMPTE'),
			phrase('Je vous montre l’écran.', 'AUCUNE')
		]);
		expect(r.gardees).toHaveLength(3);
		expect(r.retirees).toBe(0);
	});

	it('retire le mot interdit, les verdicts, les conseils, les promesses, la justice et les montants sans source', () => {
		const r = filtrerReponseSupport([
			phrase('Nous vous garantissons le recouvrement.'),
			phrase('Vous êtes éligible au remboursement.'),
			phrase('Vous devriez relancer ce client.'),
			phrase('Je vais vous rembourser ce mois-ci.'),
			phrase('Vous pouvez saisir le tribunal de commerce.'),
			phrase('Votre client vous doit 1 250 €.', 'AUCUNE')
		]);
		expect(r.gardees).toEqual([]);
		expect(r.retirees).toBe(6);
	});
});

describe('le prompt de Plume support', () => {
	it('est figé à l’octet, assez long pour le cache, sans date ni interpolation', () => {
		const prompt = construirePromptSupport();
		expect(prompt).toBe(construirePromptSupport());
		expect(prompt.length).toBeGreaterThan(2000);
		expect(prompt).not.toMatch(/\d{4}-\d{2}-\d{2}/);
		expect(prompt).not.toContain('${');
	});

	it('dit ce qu’il ne lit pas, et qu’il est un assistant automatique', () => {
		const prompt = construirePromptSupport();
		expect(prompt).toMatch(/assistant automatique/i);
		expect(prompt).toMatch(/jamais.*dossiers/i);
		for (const genre of ['ARTICLE', 'COMPTE', 'AUCUNE']) expect(prompt).toContain(genre);
	});

	it('accepte une réponse structurée et refuse un écran hors de la liste', () => {
		const juste = {
			phrases: [{ texte: 'Dans Compte › Votre formule.', source: { genre: 'ARTICLE', cle: 'resilier' } }],
			ecrans: ['FORMULE'],
			sujet: 'ABONNEMENT',
			nePeutPasRepondre: false,
			questionDeDossier: false
		};
		expect(reponseSupportSchema.safeParse(juste).success).toBe(true);
		expect(reponseSupportSchema.safeParse({ ...juste, ecrans: ['/admin'] }).success).toBe(false);
	});
});

describe('construireMessageSupport', () => {
	const contexte: ContexteDuCompte = {
		etablissement: 'Garnier Bâtiment',
		role: 'MEMBRE',
		formule: 'Équipe',
		etatAbonnement: 'actif',
		prochainPrelevementLe: '2026-11-02',
		membres: 3,
		relancesActivees: true,
		connexions: [{ fournisseur: 'Pennylane', derniereLecture: '2026-10-15', erreur: null }],
		documentsEnEchec: 0
	};

	it('ne montre l’argent qu’à un administrateur', () => {
		const pourMembre = construireMessageSupport({ contexte, historique: [], question: 'Quand suis-je prélevé ?' });
		expect(pourMembre).not.toContain('2026-11-02');
		const pourAdmin = construireMessageSupport({
			contexte: { ...contexte, role: 'ADMINISTRATEUR' },
			historique: [],
			question: 'Quand suis-je prélevé ?'
		});
		expect(pourAdmin).toContain('2026-11-02');
	});

	it('porte l’historique et la question, dans cet ordre', () => {
		const message = construireMessageSupport({
			contexte,
			historique: [
				{ auteur: 'GERANT', texte: 'Bonjour' },
				{ auteur: 'PLUME', texte: 'Bonjour, je vous écoute.' }
			],
			question: 'Comment résilier ?'
		});
		expect(message.indexOf('Bonjour, je vous écoute.')).toBeLessThan(message.indexOf('Comment résilier ?'));
	});
});
