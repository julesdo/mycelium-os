import { describe, it, expect } from 'vitest';
import { ajouterMois } from '../calendrier';
import { PROCEDURES, procedureParCle, proceduresEnvisageables } from '../procedures';
import type { CreanceQualifiee } from '../qualification';

/**
 * Les procédures comme modules (§ 6 du brief) — l'application doit rester
 * indifférente au droit applicable.
 *
 * Le décret d'application de la procédure L.126 n'est pas publié. Le produit
 * doit fonctionner sans lui, et le module doit se déclarer indisponible plutôt
 * que d'échouer au moment de produire l'acte.
 */

function qualifiee(surcharge: Partial<CreanceQualifiee> = {}): CreanceQualifiee {
	return {
		certaine: 'ok',
		liquide: 'ok',
		exigible: 'ok',
		entreCommercants: 'ok',
		piecesFournies: ['FACTURE'],
		...surcharge
	};
}

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

	it('évalue une créance qui remplit les quatre conditions', () => {
		const evaluation = procedure.evaluerEligibilite(qualifiee());
		expect(evaluation.eligible).toBe(true);
		expect(evaluation.bloquants).toEqual([]);
	});

	it('écarte une créance dont une condition est expressément absente', () => {
		const evaluation = procedure.evaluerEligibilite(qualifiee({ entreCommercants: 'ko' }));
		expect(evaluation.eligible).toBe(false);
		expect(evaluation.bloquants).toContain('entreCommercants');
	});

	it('n’éligibilise jamais sur une condition inconnue — le doute ne profite pas', () => {
		// « Chaque critère renvoie unknown plutôt que ok si la donnée manque.
		//   Ne jamais présumer favorablement. » (§ 5 du brief)
		const evaluation = procedure.evaluerEligibilite(qualifiee({ exigible: 'unknown' }));
		expect(evaluation.eligible).toBe(false);
		expect(evaluation.aDeterminer).toContain('exigible');
		// Un inconnu n'est PAS un bloquant : il se lève en posant la question.
		expect(evaluation.bloquants).not.toContain('exigible');
	});

	it('énonce des constats, jamais une recommandation', () => {
		// § 0.4 : « cette créance remplit les conditions X, Y, Z » est autorisé ;
		// « vous devriez engager telle procédure » est interdit.
		const evaluation = procedure.evaluerEligibilite(qualifiee());
		const texte = evaluation.constats.join(' ').toLowerCase();
		expect(texte).not.toMatch(/vous devriez|nous (vous )?recommandons|il faut engager|conseillons/);
	});

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

	it('accepte une créance que rien ne qualifie', () => {
		const evaluation = procedure.evaluerEligibilite(
			qualifiee({ certaine: 'unknown', liquide: 'unknown', exigible: 'ko', entreCommercants: 'ko' })
		);
		expect(evaluation.eligible).toBe(true);
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
		const envisageables = proceduresEnvisageables(
			qualifiee({ certaine: 'ko', liquide: 'ko', exigible: 'ko', entreCommercants: 'ko' })
		);
		expect(envisageables.map((p) => p.cle)).toContain('relance-amiable');
	});

	it('refuse une clé inconnue plutôt que de rendre undefined', () => {
		expect(() => procedureParCle('procedure-imaginaire')).toThrow();
	});
});
