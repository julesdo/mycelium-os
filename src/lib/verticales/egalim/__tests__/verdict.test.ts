import { describe, it, expect } from 'vitest';
import { deriverVerdict, SEUIL_CONFIANCE, type ClassificationBrute } from '../verdict';

function brute(p: Partial<ClassificationBrute> = {}): ClassificationBrute {
	return {
		normalizedLabel: 'PATES COMPLETES 5KG',
		isFood: true,
		family: 'EPICERIE_SECHE',
		qualifyingLabels: [],
		confidence: 0.99,
		...p
	};
}

describe('deriverVerdict — le barème tranche, pas le modèle', () => {
	it('AB rend le produit bio ET durable', () => {
		const v = deriverVerdict(brute({ qualifyingLabels: ['AB'] }), 'AUTO');
		expect(v.isBio).toBe(true);
		expect(v.isDurable).toBe(true);
	});

	it('la conversion compte dans les deux ratios, comme le bio', () => {
		const v = deriverVerdict(brute({ qualifyingLabels: ['CONVERSION'] }), 'AUTO');
		expect(v.isBio).toBe(true);
		expect(v.isDurable).toBe(true);
	});

	it('Label Rouge est durable mais PAS bio', () => {
		const v = deriverVerdict(brute({ qualifyingLabels: ['LABEL_ROUGE'] }), 'AUTO');
		expect(v.isBio).toBe(false);
		expect(v.isDurable).toBe(true);
	});

	it('aucun label ne qualifie rien', () => {
		const v = deriverVerdict(brute({ qualifyingLabels: [] }), 'AUTO');
		expect(v.isBio).toBe(false);
		expect(v.isDurable).toBe(false);
	});
});

describe('deriverVerdict — le non-alimentaire sort du calcul', () => {
	it('vide les labels d’un produit non alimentaire', () => {
		const v = deriverVerdict(
			brute({ isFood: false, family: 'AUTRE', qualifyingLabels: ['AB'] }),
			'AUTO'
		);
		expect(v.qualifyingLabels).toEqual([]);
		expect(v.isBio).toBe(false);
		expect(v.isDurable).toBe(false);
	});

	it('ramène la famille d’un non-alimentaire à AUTRE', () => {
		const v = deriverVerdict(brute({ isFood: false, family: 'EPICERIE_SECHE' }), 'AUTO');
		expect(v.family).toBe('AUTRE');
	});
});

describe('deriverVerdict — routage vers la revue humaine', () => {
	it('envoie systématiquement la viande en revue, même à confiance maximale', () => {
		const v = deriverVerdict(brute({ family: 'VIANDE', confidence: 1 }), 'AUTO');
		expect(v.reviewStatus).toBe('PENDING_REVIEW');
	});

	it('envoie systématiquement le poisson en revue', () => {
		const v = deriverVerdict(brute({ family: 'POISSON', confidence: 1 }), 'AUTO');
		expect(v.reviewStatus).toBe('PENDING_REVIEW');
	});

	it('envoie en revue une viande que le modèle a dite non alimentaire', () => {
		// La famille annoncée est examinée AVANT d'être ramenée à AUTRE :
		// sortir une viande du dénominateur par erreur est le pire des cas.
		const v = deriverVerdict(
			brute({ isFood: false, family: 'VIANDE', confidence: 1 }),
			'AUTO'
		);
		expect(v.reviewStatus).toBe('PENDING_REVIEW');
	});

	it('envoie en revue sous le seuil de confiance', () => {
		const v = deriverVerdict(brute({ confidence: SEUIL_CONFIANCE - 0.01 }), 'AUTO');
		expect(v.reviewStatus).toBe('PENDING_REVIEW');
	});

	it('laisse passer au seuil exact', () => {
		const v = deriverVerdict(brute({ confidence: SEUIL_CONFIANCE }), 'AUTO');
		expect(v.reviewStatus).toBe('AUTO');
	});

	it('un verdict humain est confirmé, jamais renvoyé en revue', () => {
		const v = deriverVerdict(brute({ family: 'VIANDE', confidence: 0.1 }), 'HUMAN');
		expect(v.reviewStatus).toBe('CONFIRMED');
	});
});

describe('deriverVerdict — statut de preuve', () => {
	it('un label revendiqué reste à justifier tant qu’aucune attestation n’est reçue', () => {
		const v = deriverVerdict(brute({ qualifyingLabels: ['AB'] }), 'AUTO');
		expect(v.proofStatus).toBe('TO_JUSTIFY');
	});

	it('sans label, il n’y a rien à prouver', () => {
		const v = deriverVerdict(brute({ qualifyingLabels: [] }), 'AUTO');
		expect(v.proofStatus).toBe('NONE');
	});

	it('une confirmation humaine ne vaut pas preuve — seul un justificatif fournisseur prouve', () => {
		const v = deriverVerdict(brute({ qualifyingLabels: ['AB'] }), 'HUMAN');
		expect(v.proofStatus).toBe('TO_JUSTIFY');
	});
});

describe('deriverVerdict — régularisations commerciales', () => {
	it('envoie en revue une remise globale sortie de l’alimentaire', () => {
		// Sortie du calcul, son montant négatif cesse de réduire les achats
		// alimentaires : le dénominateur enfle et les trois ratios baissent.
		const v = deriverVerdict(
			brute({ normalizedLabel: 'REMISE PROMO ETE -10%', isFood: false, confidence: 1 }),
			'AUTO'
		);
		expect(v.reviewStatus).toBe('PENDING_REVIEW');
	});

	it.each(['RABAIS FIN D’ANNEE', 'RISTOURNE ANNUELLE', 'ESCOMPTE REGLEMENT', 'GESTE COMMERCIAL'])(
		'%s hors alimentaire part en arbitrage',
		(libelle) => {
			const v = deriverVerdict(
				brute({ normalizedLabel: libelle, isFood: false, confidence: 1 }),
				'AUTO'
			);
			expect(v.reviewStatus).toBe('PENDING_REVIEW');
		}
	);

	it('laisse passer un avoir rattaché à un produit — il garde sa classification', () => {
		// Montant négatif, famille et labels du produit : il retranche du
		// numérateur comme du dénominateur, sans traitement particulier.
		const v = deriverVerdict(
			brute({
				normalizedLabel: 'AVOIR - CAROTTES BIO (RETOUR)',
				isFood: true,
				family: 'FRUITS_LEGUMES',
				qualifyingLabels: ['AB'],
				confidence: 0.95
			}),
			'AUTO'
		);
		expect(v.reviewStatus).toBe('AUTO');
		expect(v.isBio).toBe(true);
	});

	it('ne retient pas une régularisation dans un mot plus long', () => {
		const v = deriverVerdict(
			brute({ normalizedLabel: 'SACS POUBELLE 110L', isFood: false, confidence: 1 }),
			'AUTO'
		);
		expect(v.reviewStatus).toBe('AUTO');
	});
});
