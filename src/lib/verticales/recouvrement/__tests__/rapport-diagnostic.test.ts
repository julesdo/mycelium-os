import { describe, it, expect } from 'vitest';
import { composerRapportDiagnostic, type DiagnosticPourRapport } from '../rapport-diagnostic';
import { PARAMETRES } from '../parametres';

/**
 * LE RAPPORT DU DIAGNOSTIC (19/10/2026) : une description pure, comme `piece.ts`, que
 * l'écran et le PDF lisent. Aucune valeur de loi n'y est tapée : les fondements et les
 * hypothèses viennent du registre.
 */
const DIAGNOSTIC: DiagnosticPourRapport = {
	du: '2026-07-19',
	arreteAu: '2026-10-19',
	impayees: {
		nombreFactures: 2,
		principal: 2_000_000n,
		interets: 31_000n,
		indemnites: 8_000n,
		supplement: 39_000n,
		lignes: [
			{
				reference: 'FA-1',
				debiteur: 'Durand',
				principalRestantDu: 1_000_000n,
				supplement: 20_000n
			},
			{ reference: 'FA-2', debiteur: null, principalRestantDu: 1_000_000n, supplement: 19_000n }
		]
	},
	payeesEnRetard: {
		nombreFactures: 1,
		interets: 8_493n,
		indemnites: 4_000n,
		supplement: 12_493n,
		lignes: [
			{
				reference: 'FA-3',
				debiteur: 'Martin',
				payeeLe: '2026-08-01',
				joursDeRetard: 31,
				supplement: 12_493n,
				echeanceSupposee: true
			}
		]
	},
	horsPeriode: { nombre: 4, principal: 500_000n },
	nonChiffrees: [{ reference: 'FA-9', raison: 'Date de paiement inconnue.' }],
	supplementTotal: 51_493n,
	echeancesSupposees: 1
};

describe('le rapport du diagnostic', () => {
	it('porte la somme en jeu, la date du calcul et la période', () => {
		const r = composerRapportDiagnostic(DIAGNOSTIC, 'Ateliers Martin');
		expect(r.etablissement).toBe('Ateliers Martin');
		expect(r.enJeu).toBe('514,93 €');
		expect(r.compteAu).toBe('19 octobre 2026');
		expect(r.periode).toBe('Factures depuis le 19 juillet 2026');
	});

	it('sépare ce qui est encore dû de ce que la loi ajoutait aux factures payées en retard', () => {
		const r = composerRapportDiagnostic(DIAGNOSTIC, 'Ateliers Martin');
		expect(r.sections.map((s) => s.titre)).toEqual([
			'Factures encore dues',
			'Factures payées en retard'
		]);
		const payees = r.tableaux.find((t) => t.titre === 'Factures payées en retard');
		expect(payees?.lignes[0]).toEqual(['FA-3', 'Martin', '1er août 2026', '31 j', '124,93 €']);
	});

	it('cite ses fondements au registre, et ses hypothèses', () => {
		const r = composerRapportDiagnostic(DIAGNOSTIC, 'Ateliers Martin');
		expect(r.fondements).toContain(PARAMETRES.sommesRegleesApresLEcheance.source);
		expect(r.fondements).toContain(PARAMETRES.indemniteForfaitaire.source);
		expect(r.hypotheses.join(' ')).toContain(PARAMETRES.delaiDeReglementSuppletif.source);
		expect(r.hypotheses.join(' ')).toContain('4 factures plus anciennes');
		expect(r.nonChiffrees).toEqual([{ reference: 'FA-9', raison: 'Date de paiement inconnue.' }]);
	});

	it('ne promet rien et ne pousse vers aucune procédure', () => {
		const r = composerRapportDiagnostic(DIAGNOSTIC, 'Ateliers Martin');
		const texte = JSON.stringify(r);
		expect(texte).not.toMatch(/garanti|vous devriez|injonction|assignation|huissier/i);
		expect(texte).not.toContain('—');
		expect(r.avertissement).toMatch(/décider/);
	});

	it('se passe de période et d’hypothèse quand il n’y en a pas', () => {
		const r = composerRapportDiagnostic(
			{
				...DIAGNOSTIC,
				du: null,
				horsPeriode: { nombre: 0, principal: 0n },
				echeancesSupposees: 0,
				payeesEnRetard: { ...DIAGNOSTIC.payeesEnRetard, lignes: [] }
			},
			'Ateliers Martin'
		);
		expect(r.periode).toBeNull();
		expect(r.hypotheses).toEqual([]);
	});
});
