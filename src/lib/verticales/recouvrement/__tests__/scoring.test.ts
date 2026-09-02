import { describe, it, expect } from 'vitest';
import { qualifier, POIDS, SEUIL_QUALIFICATION } from '../scoring';
import type { ElementsCreance } from '../scoring';

/**
 * Le moteur de qualification (§ 5 du brief) : dire si une créance est mûre, et
 * pourquoi.
 *
 * Deux règles du brief sont testées comme des invariants, pas comme des
 * options :
 *
 *   - « Chaque critère renvoie `unknown` plutôt que `ok` si la donnée manque.
 *     Ne jamais présumer favorablement. »
 *   - « Une contestation, même infondée, met fin à la procédure simplifiée. »
 *     C'est le risque produit numéro un.
 */

function elements(surcharge: Partial<ElementsCreance> = {}): ElementsCreance {
	return {
		certaine: 'ok',
		liquide: 'ok',
		exigible: 'ok',
		entreCommercants: 'ok',
		piecesFournies: ['FACTURE'],
		signauxContestation: [],
		santeDebiteur: 'SAINE',
		retardsAnterieurs: 0,
		...surcharge
	};
}

describe('score', () => {
	it('atteint 1 quand tout est établi et toutes les pièces fournies', () => {
		const q = qualifier(
			elements({
				piecesFournies: [
					'FACTURE',
					'BON_DE_COMMANDE',
					'BON_DE_LIVRAISON',
					'CGV',
					'MISE_EN_DEMEURE'
				]
			})
		);
		expect(q.score).toBe(1);
		expect(q.eligible).toBe(true);
	});

	it('reflète la faiblesse d’une facture isolée', () => {
		// Les quatre conditions légales pèsent 3 chacune, soit 12 sur un total
		// de 20. Une facture seule vaut donc 0,6 : recevable en droit, fragile
		// en preuve.
		const q = qualifier(elements());
		expect(q.score).toBeCloseTo(0.6, 5);
	});

	it('monte quand la commande et la livraison sont documentées', () => {
		// (12 + 3 + 3) / 20 = 0,9
		const q = qualifier(
			elements({ piecesFournies: ['FACTURE', 'BON_DE_COMMANDE', 'BON_DE_LIVRAISON'] })
		);
		expect(q.score).toBeCloseTo(0.9, 5);
	});

	it('tient un devis signé pour équivalent à un bon de commande', () => {
		const avecBon = qualifier(elements({ piecesFournies: ['FACTURE', 'BON_DE_COMMANDE'] }));
		const avecDevis = qualifier(elements({ piecesFournies: ['FACTURE', 'DEVIS_SIGNE'] }));
		expect(avecDevis.score).toBe(avecBon.score);
	});

	it('ne compte jamais deux fois la même force probante', () => {
		const un = qualifier(elements({ piecesFournies: ['FACTURE', 'BON_DE_COMMANDE'] }));
		const deux = qualifier(
			elements({ piecesFournies: ['FACTURE', 'BON_DE_COMMANDE', 'DEVIS_SIGNE'] })
		);
		expect(deux.score).toBe(un.score);
	});

	it('reste borné entre 0 et 1', () => {
		const rien = qualifier(
			elements({
				certaine: 'ko',
				liquide: 'ko',
				exigible: 'ko',
				entreCommercants: 'ko',
				piecesFournies: []
			})
		);
		expect(rien.score).toBe(0);
	});

	it('les poids déclarés totalisent bien le dénominateur du score', () => {
		const total = Object.values(POIDS).reduce((somme, poids) => somme + poids, 0);
		expect(total).toBe(20);
	});
});

describe('le doute ne profite jamais au produit', () => {
	it('n’éligibilise pas sur une condition indéterminée', () => {
		const q = qualifier(elements({ exigible: 'unknown' }));
		expect(q.eligible).toBe(false);
	});

	it('ne compte pas un critère indéterminé comme acquis dans le score', () => {
		const inconnu = qualifier(elements({ exigible: 'unknown' }));
		const absent = qualifier(elements({ exigible: 'ko' }));
		expect(inconnu.score).toBe(absent.score);
	});

	it('pose une question pour chaque critère réellement indéterminé, et pour eux seuls', () => {
		// « Prévoir un questionnaire court, déclenché uniquement sur les critères
		//   réellement unknown. » (§ 5)
		const q = qualifier(elements({ exigible: 'unknown', entreCommercants: 'unknown' }));
		expect(q.questions).toHaveLength(2);
		expect(q.questions.join(' ')).toMatch(/exigib/i);
		expect(q.questions.join(' ')).toMatch(/commerçant/i);
	});

	it('ne pose aucune question quand tout est tranché', () => {
		expect(qualifier(elements()).questions).toEqual([]);
	});
});

describe('signaux de contestation — le risque produit numéro un', () => {
	it('écarte l’éligibilité dès qu’un signal est présent, même sur un score élevé', () => {
		const q = qualifier(
			elements({
				piecesFournies: ['FACTURE', 'BON_DE_COMMANDE', 'BON_DE_LIVRAISON', 'CGV', 'MISE_EN_DEMEURE'],
				signauxContestation: ['LITIGE_DANS_ECHANGES']
			})
		);
		expect(q.score).toBe(1);
		expect(q.eligible).toBe(false);
	});

	it('range la contestation en gravité bloquante', () => {
		const q = qualifier(elements({ signauxContestation: ['ECART_COMMANDE_FACTURE'] }));
		const risque = q.risques.find((r) => r.type === 'ECART_COMMANDE_FACTURE');
		expect(risque!.gravite).toBe('BLOQUANTE');
	});

	it('remonte chaque signal séparément', () => {
		const q = qualifier(
			elements({
				signauxContestation: ['RECLAMATION_ANTERIEURE', 'AVOIR_PARTIEL_ACCORDE']
			})
		);
		expect(q.risques.map((r) => r.type)).toEqual([
			'RECLAMATION_ANTERIEURE',
			'AVOIR_PARTIEL_ACCORDE'
		]);
	});
});

describe('signaux de recouvrabilité', () => {
	it('signale une procédure collective sans en tirer de conséquence juridique', () => {
		const q = qualifier(elements({ santeDebiteur: 'PROCEDURE_COLLECTIVE' }));
		const risque = q.risques.find((r) => r.type === 'PROCEDURE_COLLECTIVE');

		expect(risque).toBeDefined();
		expect(risque!.gravite).toBe('HAUTE');
		// Le brief ne donne pas l'effet juridique d'une procédure collective sur
		// le recouvrement : on constate, on ne conclut pas.
		expect(risque!.description.toLowerCase()).not.toMatch(/vous devez|il faut|suspend|interdit/);
	});

	it('signale une radiation', () => {
		const q = qualifier(elements({ santeDebiteur: 'RADIEE' }));
		expect(q.risques.map((r) => r.type)).toContain('DEBITEUR_RADIE');
	});

	it('ne signale rien sur un débiteur sain et ponctuel', () => {
		expect(qualifier(elements()).risques).toEqual([]);
	});

	it('signale un historique de retard au-delà de deux occurrences', () => {
		expect(qualifier(elements({ retardsAnterieurs: 2 })).risques).toEqual([]);
		const q = qualifier(elements({ retardsAnterieurs: 3 }));
		expect(q.risques.map((r) => r.type)).toContain('RETARDS_REPETES');
	});
});

describe('pièces manquantes', () => {
	it('énumère ce qui renforcerait le dossier, sans le réclamer', () => {
		const q = qualifier(elements());
		expect(q.piecesManquantes).toContain('BON_DE_COMMANDE');
		expect(q.piecesManquantes).toContain('BON_DE_LIVRAISON');
	});

	it('n’énumère plus une pièce fournie', () => {
		const q = qualifier(elements({ piecesFournies: ['FACTURE', 'BON_DE_LIVRAISON'] }));
		expect(q.piecesManquantes).not.toContain('BON_DE_LIVRAISON');
	});
});

describe('seuil', () => {
	it('n’éligibilise pas sous le seuil, même sans risque ni inconnue', () => {
		// Une facture seule vaut 0,6. Le seuil est plus haut : la créance part
		// en relance amiable, pas en procédure.
		expect(SEUIL_QUALIFICATION).toBeGreaterThan(0.6);
		expect(qualifier(elements()).eligible).toBe(false);
	});
});
