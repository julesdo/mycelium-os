import { describe, expect, it } from 'vitest';
import { jalonsFranchis, ligneSecondaire, plusHautJalon, texteDuJalon } from '../jalons';

/**
 * LES RÉUSSITES DU GÉRANT (21/10/2026, le parcours de l'habitude) : une fois chacune,
 * relevées sur ce qui s'est vraiment passé, et la ligne qui les accompagne choisie par
 * ordre de priorité.
 */
const RIEN = { relancesParties: 0, paiements: 0, rentreCumule: 0n, dossiersSoldes: 0 };

describe('les jalons franchis', () => {
	it('franchit 1 000 € à 1 000 €, et pas 10 000 €', () => {
		const cles = jalonsFranchis({ ...RIEN, paiements: 3, rentreCumule: 100_000n });
		expect(cles).toContain('RENTRE_1000');
		expect(cles).toContain('PREMIER_PAIEMENT');
		expect(cles).not.toContain('RENTRE_10000');
	});

	it('franchit la première relance dès qu’une est partie', () => {
		expect(jalonsFranchis({ ...RIEN, relancesParties: 1 })).toEqual(['PREMIERE_RELANCE']);
		expect(jalonsFranchis(RIEN)).toEqual([]);
	});

	it('montre le plus haut : l’argent passe avant le dossier soldé', () => {
		expect(plusHautJalon(['PREMIERE_RELANCE', 'PREMIER_PAIEMENT', 'RENTRE_10000'])).toBe(
			'RENTRE_10000'
		);
		expect(plusHautJalon(['PREMIER_DOSSIER_SOLDE', 'RENTRE_1000'])).toBe('RENTRE_1000');
		expect(plusHautJalon([])).toBeNull();
	});
});

describe('la ligne sous la célébration', () => {
	const CTX = { pushActif: true, mensuel: false, anneeProposee: false, recommandationCoupee: false };

	it('propose les notifications après la première relance, quand elles dorment', () => {
		expect(ligneSecondaire('PREMIERE_RELANCE', { ...CTX, pushActif: false })).toBe('PUSH');
		expect(ligneSecondaire('PREMIERE_RELANCE', CTX)).toBeNull();
	});

	it('propose l’année une fois à qui paie au mois, puis la recommandation', () => {
		expect(ligneSecondaire('RENTRE_10000', { ...CTX, mensuel: true })).toBe('ANNEE');
		expect(ligneSecondaire('RENTRE_10000', { ...CTX, mensuel: true, anneeProposee: true })).toBe(
			'RECOMMANDATION'
		);
		expect(ligneSecondaire('RENTRE_10000', CTX)).toBe('RECOMMANDATION');
		expect(ligneSecondaire('RENTRE_10000', { ...CTX, recommandationCoupee: true })).toBeNull();
	});
});

describe('le texte d’un jalon', () => {
	it('dit ce qui est rentré sur les dossiers suivis, jamais grâce à qui', () => {
		const t = texteDuJalon('RENTRE_10000', { semaines: 7, clients: 14, client: null });
		expect(t.titre).toBe('Rentrés sur les dossiers suivis');
		expect(t.montant).toBe(1_000_000n);
		expect(t.detail).toBe('En 7 semaines, sur 14 clients.');
		expect(`${t.titre} ${t.detail}`).not.toMatch(/grâce à|garanti/i);
	});
});
