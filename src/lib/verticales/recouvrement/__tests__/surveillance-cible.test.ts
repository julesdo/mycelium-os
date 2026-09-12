import { describe, it, expect } from 'vitest';
import { depuisEuros } from '../../../socle/montants';
import { detecterEvenements } from '../surveillance';
import type { EtatSurveille } from '../surveillance';

/**
 * CHAQUE ÉVÉNEMENT DÉSIGNE UN OBJET QU'ON PEUT OUVRIR.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE DÉFAUT : LE FLUX EST LA RAISON D'OUVRIR LE PRODUIT, ET IL EST INERTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le flux d'événements est ce qui a bougé depuis hier — c'est-à-dire la raison
 * pour laquelle un gérant ouvre ce logiciel le matin. Chaque rangée nomme une
 * facture, une créance ou un débiteur, explique ce qui se passe, et écrit
 * l'action « en toutes lettres ».
 *
 * Et rien n'était cliquable. On lisait « La facture FA-2026-0311 sera prescrite
 * le 14 octobre », puis on allait chercher soi-même le débiteur dans la liste.
 * Le produit désignait un objet précis et laissait l'utilisateur le retrouver à
 * la main.
 *
 * ⚠️ LA CIBLE EST UN IDENTIFIANT, PAS UNE ROUTE. Ce module est dans
 * `verticales/` : il connaît le droit, jamais l'interface. Une route écrite ici
 * ferait passer la frontière du socle dans le mauvais sens, et
 * `frontiere.test.ts` a raison de l'interdire. L'écran traduit le genre en
 * destination ; le domaine dit seulement DE QUOI il parle.
 *
 * ⚠️ ET ELLE EST FACULTATIVE. L'appelant peut ne pas connaître l'identifiant —
 * un test du domaine, par exemple, qui ne branche aucune base. Un événement sans
 * cible reste un événement valable : il s'affiche, il ne mène nulle part. Rendre
 * la cible obligatoire imposerait à tout appelant de fabriquer un identifiant,
 * et on sait ce que valent les identifiants fabriqués.
 */

const AUJOURDHUI = '2026-09-02';

function etat(surcharge: Partial<EtatSurveille> = {}): EtatSurveille {
	return { factures: [], creances: [], dossiers: [], debiteurs: [], ...surcharge };
}

describe('la cible d’un événement', () => {
	it('mène au débiteur pour une facture échue', () => {
		const [evenement] = detecterEvenements(
			etat({
				factures: [
					{
						reference: 'F-001',
						debiteurId: 'deb_1',
						montantExigible: depuisEuros('12000,00'),
						dateEcheance: '2026-09-01',
						statutPaiement: 'IMPAYEE'
					}
				]
			}),
			AUJOURDHUI
		);

		// Le débiteur, et pas la facture : une facture n'a pas d'écran à elle.
		// C'est le volet du débiteur qui la porte, ligne à ligne.
		expect(evenement?.cible).toEqual({ genre: 'DEBITEUR', id: 'deb_1' });
	});

	it('mène au débiteur pour une prescription qui approche', () => {
		const [evenement] = detecterEvenements(
			etat({
				factures: [
					{
						reference: 'F-002',
						debiteurId: 'deb_2',
						montantExigible: depuisEuros('800,00'),
						dateEcheance: '2025-01-01',
						datePrescription: '2026-09-10',
						statutPaiement: 'IMPAYEE'
					}
				]
			}),
			AUJOURDHUI
		);

		expect(evenement?.type).toBe('PRESCRIPTION_PROCHE');
		expect(evenement?.cible).toEqual({ genre: 'DEBITEUR', id: 'deb_2' });
	});

	it('mène à la créance quand c’est une créance qui bouge', () => {
		const [evenement] = detecterEvenements(
			etat({
				creances: [
					{
						reference: 'C-001',
						id: 'cre_1',
						total: depuisEuros('12000,00'),
						score: 0.9,
						statut: 'QUALIFIEE'
					}
				]
			}),
			AUJOURDHUI
		);

		expect(evenement?.type).toBe('CREANCE_MURE');
		expect(evenement?.cible).toEqual({ genre: 'CREANCE', id: 'cre_1' });
	});

	it('mène au débiteur quand sa situation se dégrade', () => {
		const [evenement] = detecterEvenements(
			etat({
				debiteurs: [
					{
						reference: 'Fournitures Durand',
						id: 'deb_3',
						encoursTotal: depuisEuros('4000,00'),
						santePrecedente: 'SAINE',
						santeActuelle: 'PROCEDURE_COLLECTIVE'
					}
				]
			}),
			AUJOURDHUI
		);

		expect(evenement?.type).toBe('DEBITEUR_DEGRADE');
		expect(evenement?.cible).toEqual({ genre: 'DEBITEUR', id: 'deb_3' });
	});

	it('reste valable sans identifiant — la cible est alors absente', () => {
		// ⚠️ C'EST LA MOITIÉ QUI EMPÊCHE D'INVENTER. Un appelant qui ne connaît pas
		// l'identifiant ne doit pas être forcé d'en fabriquer un : la rangée
		// s'affiche et ne mène nulle part, ce qui est la vérité.
		const [evenement] = detecterEvenements(
			etat({
				factures: [
					{
						reference: 'F-003',
						montantExigible: depuisEuros('500,00'),
						dateEcheance: '2026-09-01',
						statutPaiement: 'IMPAYEE'
					}
				]
			}),
			AUJOURDHUI
		);

		expect(evenement?.type).toBe('FACTURE_ECHUE');
		expect(evenement?.cible).toBeUndefined();
	});
});
