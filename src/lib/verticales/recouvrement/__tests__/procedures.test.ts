import { describe, it, expect } from 'vitest';
import { ajouterMois } from '../calendrier';
import { PROCEDURES, procedureParCle, proceduresEnvisageables } from '../procedures';

/**
 * Les procédures comme modules (§ 6 du brief) — l'application doit rester
 * indifférente au droit applicable.
 *
 * Le décret d'application de la procédure L.126 n'est pas publié. Le produit
 * doit fonctionner sans lui, et le module doit se déclarer indisponible plutôt
 * que d'échouer au moment de produire l'acte.
 */

describe('calendrier — de quantième à quantième', () => {
	it('ajoute des mois en gardant le quantième', () => {
		expect(ajouterMois('2026-09-01', 3)).toBe('2026-12-01');
		expect(ajouterMois('2026-09-15', 1)).toBe('2026-10-15');
	});

	it('retombe sur le dernier jour du mois quand le quantième n’existe pas', () => {
		// 31 janvier + 1 mois : le 31 février n'existe pas.
		expect(ajouterMois('2026-01-31', 1)).toBe('2026-02-28');
		expect(ajouterMois('2024-01-31', 1)).toBe('2024-02-29');
	});

	it('franchit les années', () => {
		expect(ajouterMois('2026-11-30', 3)).toBe('2027-02-28');
	});
});

describe('injonction de payer', () => {
	const procedure = procedureParCle('injonction-de-payer');

	it('renvoie à sa machine à états pour ce qui court après', () => {
		// ⚠️ CE MODULE NE CALCULE PLUS DE DÉLAI. Il en calculait, depuis une date
		// unique — et cette date était ambiguë : les trois mois de signification
		// courent depuis l'ORDONNANCE, pas depuis l'engagement. Deux calculs du
		// même délai légal finissent par diverger, et personne ne regardait
		// celui-ci : il n'était appelé que par ce test.
		//
		// La vérification des bornes vit désormais dans `apres-procedure.test.ts`,
		// où chaque délai est rattaché à l'état qui le fait courir.
		expect(procedure.machine).toBe('injonction-de-payer');
	});

	it('peut évaluer, mais refuse de produire l’acte sans ses mentions obligatoires', () => {
		// Les mentions obligatoires d'une requête n'ont pas été fournies, et la
		// règle 0.1 interdit de les deviner. On peut donc tout faire SAUF
		// produire l'acte.
		expect(procedure.peutEvaluer()).toBe(true);
		expect(procedure.blocagesProductionActe().length).toBeGreaterThan(0);
	});
});

describe('L.126 — créances commerciales', () => {
	const procedure = procedureParCle('l126-creances-commerciales');

	it('existe, et se déclare indisponible faute de décret', () => {
		expect(procedure.peutEvaluer()).toBe(false);
		expect(procedure.blocagesProductionActe().join(' ')).toMatch(/tarifCommissaireJusticeL126/);
	});

	it('n’a ni plafond ni plancher de montant', () => {
		// Confirmé comme vérifié par le brief.
		expect(procedure.plancherMontant).toBeNull();
		expect(procedure.plafondMontant).toBeNull();
	});

	it('renvoie à sa machine à états pour ce qui court après', () => {
		// Le mois de contestation et les huit jours du procès-verbal sont
		// vérifiés dans `apres-procedure.test.ts`, depuis la SIGNIFICATION qui
		// les fait réellement courir.
		expect(procedure.machine).toBe('l126-creances-commerciales');
	});
});

describe('relance amiable — la sortie par défaut', () => {
	const procedure = procedureParCle('relance-amiable');

	it('est toujours disponible : personne ne reste sans action possible', () => {
		expect(procedure.peutEvaluer()).toBe(true);
		expect(procedure.blocagesProductionActe()).toEqual([]);
	});
});

describe('registre des procédures', () => {
	it('porte les trois modules du brief', () => {
		expect(Object.keys(PROCEDURES).sort()).toEqual([
			'injonction-de-payer',
			'l126-creances-commerciales',
			'relance-amiable'
		]);
	});

	it('ne propose jamais une liste vide — la relance amiable reste', () => {
		expect(proceduresEnvisageables().map((p) => p.cle)).toContain('relance-amiable');
	});

	it('ne trie pas les voies selon les conditions : le gérant qualifie, pas le logiciel', () => {
		// L'injonction de payer reste montrée quelles que soient les réponses : dire
		// qu'une créance ne la permet pas serait une qualification juridique.
		expect(proceduresEnvisageables().map((p) => p.cle)).toContain('injonction-de-payer');
		for (const procedure of Object.values(PROCEDURES)) {
			expect(procedure).not.toHaveProperty('evaluerEligibilite');
		}
	});

	it('refuse une clé inconnue plutôt que de rendre undefined', () => {
		expect(() => procedureParCle('procedure-imaginaire')).toThrow();
	});
});
