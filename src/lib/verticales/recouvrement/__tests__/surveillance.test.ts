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

/**
 * POURQUOI LA PRESCRIPTION N'EST PAS SURVEILLÉE — ET POURQUOI IL FAUT LE DIRE
 * JUSTE.
 *
 * Le message d'angle mort accusait le secteur : « leur secteur n'est pas
 * déterminé, donc la date n'a pas pu être calculée ». C'était FAUX, et depuis
 * le premier jour : un secteur indéterminé ne produit pas d'absence de date, il
 * produit une date calculée sur le délai LE PLUS COURT — c'est exactement ce
 * que `regimePrescription` fait, hypothèse à l'appui. La date manque pour une
 * autre raison, et il n'y en a que deux.
 *
 * L'ENJEU N'EST PAS COSMÉTIQUE : les deux motifs appellent deux gestes
 * différents. Saisir une échéance absente n'est pas corriger une date fausse, et
 * un gérant envoyé vers le mauvais écran ne lève pas son angle mort.
 */
describe('angles morts — le motif, pas seulement le fait', () => {
	function sansPrescription(motif?: 'AUCUNE_DATE_DE_DEPART' | 'DATE_DE_DEPART_INEXPLOITABLE') {
		return detecterEvenements(
			etat({
				factures: [
					{
						reference: 'F-042',
						montantExigible: depuisEuros('9000,00'),
						dateEcheance: '2026-08-01',
						statutPaiement: 'IMPAYEE',
						motifPrescriptionInconnue: motif
					}
				]
			}),
			AUJOURDHUI,
			{ avecAnglesMorts: true }
		).anglesMorts.join(' ');
	}

	it('n’accuse plus le secteur, qui n’y est pour rien', () => {
		expect(sansPrescription()).not.toMatch(/secteur/i);
	});

	it('dit qu’il manque une date de départ, et quoi faire', () => {
		const message = sansPrescription('AUCUNE_DATE_DE_DEPART');
		expect(message).toMatch(/F-042/);
		expect(message).toMatch(/échéance/i);
	});

	it('dit qu’une date est inexploitable, et que c’est une autre correction', () => {
		const message = sansPrescription('DATE_DE_DEPART_INEXPLOITABLE');
		expect(message).toMatch(/F-042/);
		expect(message).toMatch(/corriger|inexploitable|n’existe pas/i);
	});

	it('sépare les deux motifs plutôt que de les fondre en une phrase', () => {
		const { anglesMorts } = detecterEvenements(
			etat({
				factures: [
					{
						reference: 'F-sans-date',
						montantExigible: depuisEuros('9000,00'),
						dateEcheance: '2026-08-01',
						statutPaiement: 'IMPAYEE',
						motifPrescriptionInconnue: 'AUCUNE_DATE_DE_DEPART'
					},
					{
						reference: 'F-date-fausse',
						montantExigible: depuisEuros('4000,00'),
						dateEcheance: '2026-08-01',
						statutPaiement: 'IMPAYEE',
						motifPrescriptionInconnue: 'DATE_DE_DEPART_INEXPLOITABLE'
					}
				]
			}),
			AUJOURDHUI,
			{ avecAnglesMorts: true }
		);

		expect(anglesMorts).toHaveLength(2);
		const sansDate = anglesMorts.find((m) => m.includes('F-sans-date'));
		expect(sansDate).toBeDefined();
		expect(sansDate).not.toMatch(/F-date-fausse/);
	});

	it('en l’absence de motif, retient celui qui n’accuse personne à tort', () => {
		// Les jeux de démonstration et les appelants antérieurs ne renseignent pas
		// le motif. Le défaut doit être le constat le plus faible — pas une
		// affirmation sur une donnée qu'on n'a pas.
		expect(sansPrescription()).toMatch(/F-042/);
	});
});

/**
 * LA MÊME RÈGLE POUR LES ÉCHÉANCES DE PROCÉDURE.
 *
 * `dateLimite` est une chaîne en base comme le reste. Une seule échéance dont
 * la date n'existe pas faisait lever `joursEntre` au milieu de la boucle, donc
 * mourir la détection ENTIÈRE — les factures échues comprises, alors qu'elles
 * n'y sont pour rien.
 *
 * ⚠️ ET C'EST LA CADUCITÉ QUI EST EN JEU. Le délai dont la perte est
 * irréversible ne peut pas être celui qu'on laisse disparaître en silence : il
 * remonte en angle mort NOMMÉ, avec sa gravité.
 */
describe('échéance de procédure à la date inexploitable', () => {
	function avecEcheance(dateLimite: string) {
		return detecterEvenements(
			etat({
				factures: [
					{
						reference: 'F-001',
						montantExigible: depuisEuros('9000,00'),
						dateEcheance: '2026-08-01',
						statutPaiement: 'IMPAYEE',
						datePrescription: '2031-08-01'
					}
				],
				dossiers: [
					{
						reference: 'D-001',
						montantEnJeu: depuisEuros('9000,00'),
						echeances: [
							{
								cle: 'signification',
								libelle: 'Signifier l’ordonnance',
								dateLimite,
								gravite: 'CADUCITE'
							}
						]
					}
				]
			}),
			AUJOURDHUI,
			{ avecAnglesMorts: true }
		);
	}

	it('ne fait pas mourir la détection des factures', () => {
		const { anglesMorts, ...rien } = avecEcheance('2026-02-30');
		void rien;
		const echue = avecEcheance('2026-02-30').find((e) => e.reference === 'F-001');
		expect(echue).toBeDefined();
		expect(anglesMorts.length).toBeGreaterThan(0);
	});

	it('nomme l’échéance perdue de vue, avec son dossier', () => {
		const { anglesMorts } = avecEcheance('2026-02-30');
		const dit = anglesMorts.join(' ');
		expect(dit).toMatch(/D-001/);
		expect(dit).toMatch(/Signifier l’ordonnance/);
	});

	it('n’émet aucun événement pour une échéance qu’il ne sait pas dater', () => {
		// Émettre « dans NaN jours » serait pire que se taire : le gérant agirait
		// sur un chiffre faux. On ne dit rien, et on dit qu'on ne dit rien.
		const evenements = avecEcheance('2026-02-30');
		expect(evenements.filter((e) => e.type === 'ECHEANCE_PROCEDURE')).toEqual([]);
	});

	it('laisse passer une échéance datée normalement', () => {
		const { anglesMorts } = avecEcheance('2026-09-10');
		expect(anglesMorts.join(' ')).not.toMatch(/D-001/);
	});
});

/**
 * UN DÉBITEUR SANS IDENTIFIANT N'EST PAS SURVEILLÉ AUX REGISTRES PUBLICS.
 *
 * Le radar BODACC rapproche par SIREN, et jamais par raison sociale. Un débiteur
 * qui n'en porte pas est donc invisible au registre : une procédure collective
 * ouverte à son encontre passerait inaperçue.
 *
 * ⚠️ ET C'EST LE FLUX QUI DOIT LE DIRE, PAS SEULEMENT LA FICHE. La fiche le dit
 * déjà, à l'endroit où on peut y remédier — mais un gérant qui n'ouvre jamais la
 * fiche d'un client qui « va bien » ne le saura pas. C'est exactement la même
 * règle que pour la prescription : un utilisateur qui croit son débiteur
 * surveillé ne le surveille pas lui-même.
 *
 * ON NE NOMME QUE CEUX QUI PORTENT UN ENCOURS. Un débiteur soldé n'est pas un
 * risque, et l'annoncer noierait ceux qui en sont un.
 */
describe('débiteurs invisibles au registre', () => {
	it('nomme un débiteur sans identifiant qui doit encore de l’argent', () => {
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
				],
				debiteursSansIdentifiant: ['Fournitures Durand']
			}),
			AUJOURDHUI,
			{ avecAnglesMorts: true }
		);

		const dit = anglesMorts.join(' ');
		expect(dit).toMatch(/Fournitures Durand/);
		expect(dit).toMatch(/registre|SIREN/i);
	});

	it('dit le geste qui lève l’angle mort', () => {
		const { anglesMorts } = detecterEvenements(
			etat({ debiteursSansIdentifiant: ['Fournitures Durand'] }),
			AUJOURDHUI,
			{ avecAnglesMorts: true }
		);
		expect(anglesMorts.join(' ')).toMatch(/saisir|renseigner/i);
	});

	it('ne dit rien quand tous les débiteurs sont identifiés', () => {
		const { anglesMorts } = detecterEvenements(etat({ debiteursSansIdentifiant: [] }), AUJOURDHUI, {
			avecAnglesMorts: true
		});
		expect(anglesMorts.join(' ')).not.toMatch(/registre/i);
	});
});

describe('les habitudes de paiement rompues', () => {
	/**
	 * ⚠️ POURQUOI CE SIGNAL ENTRE DANS LE FLUX ET NE RESTE PAS DANS LA FICHE.
	 *
	 * Une rupture d'habitude ne se voit que si on ouvre la fiche du débiteur —
	 * c'est-à-dire si on le soupçonne déjà. Or c'est précisément le signal qu'on
	 * ne peut PAS soupçonner : il vit sous tous les seuils de retard, sur un
	 * client réputé bon payeur, et le gérant n'a aucune raison d'aller le
	 * chercher.
	 *
	 * Un radar qu'il faut penser à consulter n'est pas un radar.
	 */
	const RUPTURE = {
		reference: 'FA-0311',
		debiteur: 'Fournitures Durand',
		montantExigible: depuisEuros('4200,00'),
		habituelJours: 12,
		ecartJours: 73,
		constat:
			'Ce débiteur règle habituellement à 12 jours de son échéance, sur 23 règlements observés. Cette facture en est à 85, soit 73 de plus que son habitude.'
	};

	it('remonte une rupture dans le flux, avec son montant', () => {
		const evenements = detecterEvenements(etat({ ruptures: [RUPTURE] }), AUJOURDHUI);

		expect(evenements).toHaveLength(1);
		expect(evenements[0]!.type).toBe('HABITUDE_ROMPUE');
		expect(versEuros(evenements[0]!.montant!)).toBe('4 200,00');
	});

	it('reprend le CONSTAT du domaine mot pour mot', () => {
		// ⚠️ LIGNE ROUGE 3. La surveillance ne reformule pas : si elle récrivait
		// la phrase, elle pourrait y glisser un verbe d'action, et c'est
		// exactement ce que le module de comportement refuse de faire.
		const evenements = detecterEvenements(etat({ ruptures: [RUPTURE] }), AUJOURDHUI);

		expect(evenements[0]!.explication).toBe(RUPTURE.constat);
		expect(evenements[0]!.action).not.toMatch(/relanc|mise en demeure|injonction|poursuiv/i);
	});

	it('reste en urgence NORMALE, et c’est délibéré', () => {
		// ⚠️ UNE RUPTURE N'ÉTEINT RIEN. La monter en CRITIQUE la mettrait au même
		// rang qu'une prescription qui court — et diluerait le seul signal du
		// produit qui annonce une perte sèche et irréversible.
		const evenements = detecterEvenements(etat({ ruptures: [RUPTURE] }), AUJOURDHUI);

		expect(evenements[0]!.urgence).toBe('NORMALE');
	});

	/** La même facture, vue par la détection d'échéance. */
	const FACTURE_ECHUE_MEME = {
		reference: 'FA-0311',
		montantExigible: depuisEuros('4200,00'),
		dateEcheance: '2026-06-10',
		statutPaiement: 'IMPAYEE' as const
	};

	it('REMPLACE l’événement d’échéance de la même facture', () => {
		// ⚠️ DÉFAUT VU À L'ÉCRAN, PAS EN TEST. La même facture sortait DEUX fois
		// dans le flux — une ligne « échue depuis le 10 juin », une ligne « sort
		// de son habitude ». Deux rangées pour une facture, avec deux textes
		// différents : le lecteur cherche laquelle est la vraie.
		//
		// La rupture est strictement PLUS informative : son constat porte déjà le
		// retard en jours. Elle prend donc la place de l'échéance au lieu de s'y
		// ajouter. Les deux sont en urgence NORMALE, donc rien n'est dégradé.
		const evenements = detecterEvenements(
			etat({ factures: [FACTURE_ECHUE_MEME], ruptures: [RUPTURE] }),
			AUJOURDHUI
		);

		const surCetteFacture = evenements.filter((e) => e.reference === 'FA-0311');
		expect(surCetteFacture).toHaveLength(1);
		expect(surCetteFacture[0]!.type).toBe('HABITUDE_ROMPUE');
	});

	it('laisse intacte l’échéance d’une AUTRE facture', () => {
		const autre = { ...FACTURE_ECHUE_MEME, reference: 'FA-0999' };
		const evenements = detecterEvenements(
			etat({ factures: [autre], ruptures: [RUPTURE] }),
			AUJOURDHUI
		);

		expect(evenements.filter((e) => e.type === 'FACTURE_ECHUE')).toHaveLength(1);
	});

	it('compte dans le montant identifié, À LA PLACE de l’échéance remplacée', () => {
		// ⚠️ LA CONTREPARTIE DU REMPLACEMENT, et elle n'est pas optionnelle. Le
		// compteur ne retenait que FACTURE_ECHUE et PRESCRIPTION_PROCHE :
		// supprimer l'échéance sans admettre la rupture ferait DISPARAÎTRE le
		// montant de la facture du total identifié — un chiffre qui baisse parce
		// qu'on a ajouté une détection.
		//
		// La déduplication par référence, déjà en place, garantit qu'elle n'est
		// jamais comptée deux fois.
		const evenements = detecterEvenements(
			etat({ factures: [FACTURE_ECHUE_MEME], ruptures: [RUPTURE] }),
			AUJOURDHUI
		);

		expect(versEuros(montantIdentifie(evenements))).toBe('4 200,00');
	});

	it('ne dit rien quand aucune rupture n’est fournie', () => {
		expect(detecterEvenements(etat(), AUJOURDHUI)).toEqual([]);
		expect(detecterEvenements(etat({ ruptures: [] }), AUJOURDHUI)).toEqual([]);
	});
});
