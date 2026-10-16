import { describe, it, expect } from 'vitest';
import { filtrerReponseSupport, relireLeMessageDeLEquipe } from '../filtres';
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
		dossiersADemarrer: 2,
		relancesProgrammees: 1,
		prochaineRelanceLe: '2026-10-17 à 10 h',
		relancesBloquees: { emailClient: 1, votreEmail: false },
		connexions: [{ fournisseur: 'Pennylane', etat: 'A_JOUR', derniereLecture: '2026-10-15' }],
		documentsEnEchec: 0
	};

	it('dit ce que fait le pilote en nombres, sans un nom', () => {
		const message = construireMessageSupport({ contexte, historique: [], question: 'Ma relance est partie ?' });
		expect(message).toContain('Dossiers à démarrer : 2');
		expect(message).toContain('Relances programmées : 1, la prochaine le 2026-10-17 à 10 h');
		expect(message).toContain('Relances bloquées faute de l’e-mail du client : 1');
		expect(message).not.toContain('faute de votre e-mail');
	});

	it('dit l’état d’un logiciel branché par un code fermé, jamais le texte de l’erreur', () => {
		const message = construireMessageSupport({
			contexte: {
				...contexte,
				connexions: [{ fournisseur: 'Pennylane', etat: 'LECTURE_ECHOUEE', derniereLecture: null }]
			},
			historique: [],
			question: 'Pennylane ne lit plus rien'
		});
		expect(message).toContain('Pennylane : la dernière lecture a échoué');
	});

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

	it('demande de reformuler après un « Pas vraiment »', () => {
		const normal = construireMessageSupport({ contexte, historique: [], question: 'Comment résilier ?' });
		const encore = construireMessageSupport({ contexte, historique: [], question: 'Comment résilier ?', reformuler: true });
		expect(normal).not.toMatch(/reformule/i);
		expect(encore).toMatch(/reformule/i);
	});
});

describe('relireLeMessageDeLEquipe', () => {
	it('refuse le mot interdit et les verdicts, net', () => {
		expect(relireLeMessageDeLEquipe('Nous vous garantissons le résultat.').refus).not.toBeNull();
		expect(relireLeMessageDeLEquipe('Votre créance est prescrite.').refus).not.toBeNull();
	});

	it('demande de confirmer un conseil ou une voie de justice', () => {
		const r = relireLeMessageDeLEquipe('Vous devriez voir un avocat avant le tribunal.');
		expect(r.refus).toBeNull();
		expect(r.avertissement).not.toBeNull();
	});

	it('laisse passer une réponse ordinaire, geste commercial compris (l’équipe en décide)', () => {
		expect(relireLeMessageDeLEquipe('C’est fait : je vous rembourse le mois d’octobre.')).toEqual({
			refus: null,
			avertissement: null
		});
	});
});
