import { describe, it, expect } from 'vitest';
import { additionner, depuisEuros, versEuros, ZERO, type Montant } from '../../../socle/montants';
import { detecterEvenements, montantIdentifie, PREAVIS } from '../surveillance';
import type { EtatSurveille } from '../surveillance';

/**
 * La surveillance (§ 7 du brief) — ce qui porte l'abonnement, et ce qui est
 * indépendant de toute procédure.
 *
 * « Chaque événement porte un montant en euros. » C'est la propriété qui
 * distingue une file d'alertes d'une liste de tâches : un gérant arbitre entre
 * 12 000 € et 300 €, pas entre « facture échue » et « échéance proche ».
 */

const AUJOURDHUI = '2026-09-02';

function etat(surcharge: Partial<EtatSurveille> = {}): EtatSurveille {
	return { factures: [], creances: [], dossiers: [], debiteurs: [], ...surcharge };
}

describe('factures arrivées à échéance', () => {
	it('signale une facture impayée dont l’échéance est passée, avec son montant', () => {
		const evenements = detecterEvenements(
			etat({
				factures: [
					{
						reference: 'F-001',
						montantExigible: depuisEuros('12000,00'),
						dateEcheance: '2026-09-01',
						statutPaiement: 'IMPAYEE'
					}
				]
			}),
			AUJOURDHUI
		);

		expect(evenements).toHaveLength(1);
		expect(evenements[0]!.type).toBe('FACTURE_ECHUE');
		expect(versEuros(evenements[0]!.montant!)).toBe('12 000,00');
	});

	it('ne signale pas une facture non encore échue', () => {
		const evenements = detecterEvenements(
			etat({
				factures: [
					{
						reference: 'F-001',
						montantExigible: depuisEuros('12000,00'),
						dateEcheance: '2026-10-01',
						statutPaiement: 'IMPAYEE'
					}
				]
			}),
			AUJOURDHUI
		);
		expect(evenements).toEqual([]);
	});

	it('ne signale pas une facture soldée, même échue', () => {
		const evenements = detecterEvenements(
			etat({
				factures: [
					{
						reference: 'F-001',
						montantExigible: depuisEuros('12000,00'),
						dateEcheance: '2026-01-01',
						statutPaiement: 'SOLDEE'
					}
				]
			}),
			AUJOURDHUI
		);
		expect(evenements).toEqual([]);
	});

	it('signale une facture partiellement payée', () => {
		const evenements = detecterEvenements(
			etat({
				factures: [
					{
						reference: 'F-001',
						montantExigible: depuisEuros('5000,00'),
						dateEcheance: '2026-08-01',
						statutPaiement: 'PARTIELLEMENT_PAYEE'
					}
				]
			}),
			AUJOURDHUI
		);
		expect(evenements.map((e) => e.type)).toEqual(['FACTURE_ECHUE']);
	});
});

describe('échéances de procédure', () => {
	it('traite la caducité de signification comme critique', () => {
		// Le brief la désigne comme le cas critique : passée, l'ordonnance est
		// perdue.
		const evenements = detecterEvenements(
			etat({
				dossiers: [
					{
						reference: 'D-001',
						montantEnJeu: depuisEuros('8000,00'),
						echeances: [
							{
								cle: 'signification',
								libelle: "Signification de l'ordonnance",
								dateLimite: '2026-09-20',
								gravite: 'CADUCITE'
							}
						]
					}
				]
			}),
			AUJOURDHUI
		);

		expect(evenements).toHaveLength(1);
		expect(evenements[0]!.type).toBe('ECHEANCE_PROCEDURE');
		expect(evenements[0]!.urgence).toBe('CRITIQUE');
		expect(versEuros(evenements[0]!.montant!)).toBe('8 000,00');
	});

	it('prévient plus tôt sur une caducité que sur une échéance informative', () => {
		expect(PREAVIS.CADUCITE).toBeGreaterThan(PREAVIS.INFORMATIVE);
	});

	it('ne prévient pas d’une échéance encore lointaine', () => {
		const evenements = detecterEvenements(
			etat({
				dossiers: [
					{
						reference: 'D-001',
						montantEnJeu: depuisEuros('8000,00'),
						echeances: [
							{
								cle: 'signification',
								libelle: 'Signification',
								dateLimite: '2027-06-01',
								gravite: 'CADUCITE'
							}
						]
					}
				]
			}),
			AUJOURDHUI
		);
		expect(evenements).toEqual([]);
	});

	it('signale encore une échéance dépassée — le silence serait pire', () => {
		const evenements = detecterEvenements(
			etat({
				dossiers: [
					{
						reference: 'D-001',
						montantEnJeu: depuisEuros('8000,00'),
						echeances: [
							{
								cle: 'signification',
								libelle: 'Signification',
								dateLimite: '2026-08-01',
								gravite: 'CADUCITE'
							}
						]
					}
				]
			}),
			AUJOURDHUI
		);
		expect(evenements).toHaveLength(1);
		expect(evenements[0]!.urgence).toBe('CRITIQUE');
	});

	it('ignore une échéance déjà traitée', () => {
		const evenements = detecterEvenements(
			etat({
				dossiers: [
					{
						reference: 'D-001',
						montantEnJeu: depuisEuros('8000,00'),
						echeances: [
							{
								cle: 'signification',
								libelle: 'Signification',
								dateLimite: '2026-09-20',
								gravite: 'CADUCITE',
								traitee: true
							}
						]
					}
				]
			}),
			AUJOURDHUI
		);
		expect(evenements).toEqual([]);
	});
});

describe('créances mûres et débiteurs qui se dégradent', () => {
	it('signale une créance qui vient d’atteindre le seuil', () => {
		const evenements = detecterEvenements(
			etat({
				creances: [
					{
						reference: 'C-001',
						total: depuisEuros('30000,00'),
						score: 0.9,
						statut: 'QUALIFIEE'
					}
				]
			}),
			AUJOURDHUI
		);
		expect(evenements.map((e) => e.type)).toEqual(['CREANCE_MURE']);
		expect(versEuros(evenements[0]!.montant!)).toBe('30 000,00');
	});

	it('ne resignale pas une créance déjà engagée', () => {
		const evenements = detecterEvenements(
			etat({
				creances: [
					{ reference: 'C-001', total: depuisEuros('30000,00'), score: 0.9, statut: 'ENGAGEE' }
				]
			}),
			AUJOURDHUI
		);
		expect(evenements).toEqual([]);
	});

	it('signale un débiteur dont la santé s’est dégradée', () => {
		const evenements = detecterEvenements(
			etat({
				debiteurs: [
					{
						reference: 'Fournitures Durand',
						encoursTotal: depuisEuros('4500,00'),
						santePrecedente: 'SAINE',
						santeActuelle: 'PROCEDURE_COLLECTIVE'
					}
				]
			}),
			AUJOURDHUI
		);
		expect(evenements.map((e) => e.type)).toEqual(['DEBITEUR_DEGRADE']);
		expect(versEuros(evenements[0]!.montant!)).toBe('4 500,00');
	});

	it('ne signale pas un débiteur dont la santé s’améliore', () => {
		const evenements = detecterEvenements(
			etat({
				debiteurs: [
					{
						reference: 'Fournitures Durand',
						encoursTotal: depuisEuros('4500,00'),
						santePrecedente: 'PROCEDURE_COLLECTIVE',
						santeActuelle: 'SAINE'
					}
				]
			}),
			AUJOURDHUI
		);
		expect(evenements).toEqual([]);
	});
});

describe('prescription — la seule échéance qui éteint une créance toute seule', () => {
	it('alerte quand la prescription approche, avec le montant en jeu', () => {
		const evenements = detecterEvenements(
			etat({
				factures: [
					{
						reference: 'F-ancienne',
						montantExigible: depuisEuros('9000,00'),
						dateEcheance: '2021-10-01',
						statutPaiement: 'IMPAYEE',
						datePrescription: '2026-10-01'
					}
				]
			}),
			AUJOURDHUI
		);

		const prescription = evenements.find((e) => e.type === 'PRESCRIPTION_PROCHE');
		expect(prescription).toBeDefined();
		expect(prescription!.urgence).toBe('CRITIQUE');
		expect(versEuros(prescription!.montant!)).toBe('9 000,00');
	});

	it('n’alerte pas sur une prescription encore lointaine', () => {
		const evenements = detecterEvenements(
			etat({
				factures: [
					{
						reference: 'F-001',
						montantExigible: depuisEuros('9000,00'),
						dateEcheance: '2026-08-01',
						statutPaiement: 'IMPAYEE',
						datePrescription: '2030-01-01'
					}
				]
			}),
			AUJOURDHUI
		);
		expect(evenements.map((e) => e.type)).not.toContain('PRESCRIPTION_PROCHE');
	});

	it('prévient plus tôt d’une prescription que d’une caducité de procédure', () => {
		// Une prescription eteint la creance sans que personne n'ait rien fait,
		// et la faire cesser demande d'engager une procedure entiere.
		expect(PREAVIS.PRESCRIPTION).toBeGreaterThan(PREAVIS.CADUCITE);
	});

	it('signale une facture dont la prescription n’est pas calculable', () => {
		// Sans secteur, la date n'a pas pu etre calculee en amont. Le silence
		// laisserait croire que la creance est surveillee.
		const { anglesMorts } = detecterEvenements(
			etat({
				factures: [
					{
						reference: 'F-sans-secteur',
						montantExigible: depuisEuros('9000,00'),
						dateEcheance: '2026-08-01',
						statutPaiement: 'IMPAYEE'
					}
				]
			}),
			AUJOURDHUI,
			{ avecAnglesMorts: true }
		);
		expect(anglesMorts.join(' ')).toMatch(/F-sans-secteur/);
	});

	it('ne déclare aucun angle mort quand tout est daté', () => {
		const { anglesMorts } = detecterEvenements(
			etat({
				factures: [
					{
						reference: 'F-001',
						montantExigible: depuisEuros('9000,00'),
						dateEcheance: '2026-08-01',
						statutPaiement: 'IMPAYEE',
						datePrescription: '2031-08-01'
					}
				]
			}),
			AUJOURDHUI,
			{ avecAnglesMorts: true }
		);
		expect(anglesMorts).toEqual([]);
	});
});

describe('ordre et cumul', () => {
	it('remonte le plus urgent en premier, puis le plus gros montant', () => {
		const evenements = detecterEvenements(
			etat({
				factures: [
					{
						reference: 'F-001',
						montantExigible: depuisEuros('500,00'),
						dateEcheance: '2026-08-01',
						statutPaiement: 'IMPAYEE'
					},
					{
						reference: 'F-002',
						montantExigible: depuisEuros('20000,00'),
						dateEcheance: '2026-08-01',
						statutPaiement: 'IMPAYEE'
					}
				],
				dossiers: [
					{
						reference: 'D-001',
						montantEnJeu: depuisEuros('100,00'),
						echeances: [
							{
								cle: 'signification',
								libelle: 'Signification',
								dateLimite: '2026-09-10',
								gravite: 'CADUCITE'
							}
						]
					}
				]
			}),
			AUJOURDHUI
		);

		expect(evenements.map((e) => e.reference)).toEqual(['D-001', 'F-002', 'F-001']);
	});

	it('cumule ce que le produit a permis d’identifier', () => {
		const evenements = detecterEvenements(
			etat({
				factures: [
					{
						reference: 'F-001',
						montantExigible: depuisEuros('500,00'),
						dateEcheance: '2026-08-01',
						statutPaiement: 'IMPAYEE'
					},
					{
						reference: 'F-002',
						montantExigible: depuisEuros('20000,00'),
						dateEcheance: '2026-08-01',
						statutPaiement: 'IMPAYEE'
					}
				]
			}),
			AUJOURDHUI
		);
		expect(versEuros(montantIdentifie(evenements))).toBe('20 500,00');
	});

	it('porte une action au bout de chaque événement', () => {
		const evenements = detecterEvenements(
			etat({
				factures: [
					{
						reference: 'F-001',
						montantExigible: depuisEuros('500,00'),
						dateEcheance: '2026-08-01',
						statutPaiement: 'IMPAYEE'
					}
				]
			}),
			AUJOURDHUI
		);
		expect(evenements.every((e) => e.action.length > 0)).toBe(true);
	});
});

describe('montantIdentifie ne compte pas la même somme plusieurs fois', () => {
	it('une facture échue ET proche de prescription ne compte qu’une fois', () => {
		// La même facture produit ICI DEUX événements — FACTURE_ECHUE et
		// PRESCRIPTION_PROCHE — parce que les deux boucles de `detecter()`
		// parcourent les mêmes factures. Additionner les deux montants compterait
		// deux fois le même argent : la facture reste UNE dette de 10 000 €, pas
		// deux.
		const evenements = detecterEvenements(
			etat({
				factures: [
					{
						reference: 'F-001',
						montantExigible: depuisEuros('10000,00'),
						dateEcheance: '2026-01-01',
						statutPaiement: 'IMPAYEE',
						datePrescription: '2026-09-10'
					}
				]
			}),
			AUJOURDHUI
		);

		expect(evenements.map((e) => e.type).sort()).toEqual(['FACTURE_ECHUE', 'PRESCRIPTION_PROCHE']);
		expect(versEuros(montantIdentifie(evenements))).toBe('10 000,00');
	});

	it('la même facture reprise dans une créance et un encours dégradé ne compte qu’une fois', () => {
		// Le cas complet du défaut signalé : une facture de 10 000 € qui est À LA
		// FOIS échue, proche de prescription, portée par une créance mûre et
		// comprise dans l'encours d'un débiteur qui se dégrade. Les cinq boucles
		// de `detecter()` produisent alors QUATRE événements sur LA MÊME somme.
		// Sommer les quatre montants ferait passer 10 000 € identifiés à 40 000 €
		// affichés — le défaut démontré dans le brief.
		const evenements = detecterEvenements(
			etat({
				factures: [
					{
						reference: 'F-001',
						montantExigible: depuisEuros('10000,00'),
						dateEcheance: '2026-01-01',
						statutPaiement: 'IMPAYEE',
						datePrescription: '2026-09-10'
					}
				],
				creances: [
					{ reference: 'C-001', total: depuisEuros('10000,00'), score: 0.9, statut: 'QUALIFIEE' }
				],
				debiteurs: [
					{
						reference: 'Débiteur X',
						encoursTotal: depuisEuros('10000,00'),
						santePrecedente: 'SAINE',
						santeActuelle: 'PROCEDURE_COLLECTIVE'
					}
				]
			}),
			AUJOURDHUI
		);

		// Les quatre événements existent bien : la détection elle-même n'est pas
		// en cause, seul le cumul l'est.
		expect(evenements).toHaveLength(4);

		// La somme des quatre montants serait 40 000,00 € — la preuve du défaut,
		// reproduite ici exactement comme l'ancien `montantIdentifie` la calculait
		// (additionner le montant de chaque événement, sans distinction de type).
		const montantsBruts = evenements
			.map((e) => e.montant)
			.filter((montant): montant is Montant => montant !== null);
		const sommeDesQuatre = montantsBruts.length > 0 ? additionner(...montantsBruts) : ZERO;
		expect(versEuros(sommeDesQuatre)).toBe('40 000,00');

		// Ce que `montantIdentifie` doit répondre : la facture est l'unité
		// atomique de ce qui est dû, et elle vaut 10 000 €, pas 40 000 €.
		expect(versEuros(montantIdentifie(evenements))).toBe('10 000,00');
	});
});
