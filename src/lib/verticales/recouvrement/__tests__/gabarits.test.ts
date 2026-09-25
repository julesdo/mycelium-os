import { describe, it, expect } from 'vitest';
import type { CreancierCourrier, DebiteurCourrier, DecompteCourrier } from '../gabarits/commun';
import { composerLettreRelance } from '../gabarits/lettre-relance-officielle';
import {
	composerDeclaration,
	composerInformationMandataire
} from '../gabarits/procedure-collective';
import {
	composerDemandeSignification,
	composerTransmissionAvocat
} from '../gabarits/professionnels';
import { composerAccordEcheancier, versements } from '../gabarits/accord-echeancier';

const CREANCIER: CreancierCourrier = {
	denomination: 'Ateliers Martin',
	formeJuridique: 'SARL',
	siren: '552100554',
	adresse: '12 rue des Forges, 33000 Bordeaux',
	email: 'claire@ateliers-martin.fr',
	signataireNom: 'Claire Martin',
	signataireQualite: 'Gérante',
	capitalSocial: 1_000_000n,
	immatriculeRcs: true,
	villeGreffeRcs: 'Bordeaux',
	iban: 'FR7630006000011234567890189'
};

const DEBITEUR: DebiteurCourrier = {
	denomination: 'Fournitures Durand',
	formeJuridique: 'SAS',
	siren: '732829320',
	adresse: '4 avenue de la Gare, 69001 Lyon',
	sante: 'SAINE'
};

const DECOMPTE: DecompteCourrier = {
	arreteAu: '2026-09-03',
	convention: 'ACT_365',
	principal: 600_000n,
	interets: 20_305n,
	indemnites: 4_000n,
	total: 624_305n,
	lignes: [
		{
			reference: 'FA-2026-118',
			principal: 600_000n,
			interets: 20_305n,
			indemnite: 4_000n,
			total: 624_305n,
			tauxConvenu: false
		}
	]
};

const FACTURE = {
	reference: 'FA-2026-118',
	dateEmission: '2026-04-01',
	dateExigibilite: '2026-05-01',
	montantTTC: 1_000_000n,
	reglementsRecus: 400_000n,
	resteDu: 600_000n,
	exigibiliteLueSurLaFacture: true
};

function relance(surcharge: Partial<Parameters<typeof composerLettreRelance>[0]> = {}) {
	return composerLettreRelance({
		creancier: CREANCIER,
		debiteur: DEBITEUR,
		factures: [FACTURE],
		decompte: DECOMPTE,
		referenceInterne: 'D-2026-0042',
		dateCourrier: '2026-09-25',
		choix: {
			delaiJours: 8,
			suite: 'SUITE_GENERALE',
			modalite: 'VIREMENT_IBAN',
			reserveIndemnisationComplementaire: false
		},
		...surcharge
	});
}

const PROCEDURE = {
	nature: 'Jugement d’ouverture de redressement judiciaire',
	dateJugement: '2026-09-04',
	dateParution: '2026-09-18',
	tribunal: 'tribunal de commerce de Lyon',
	mandataireNom: 'SELARL Exemple',
	mandataireAdresse: '1 quai du Rhône, 69002 Lyon'
};

describe('la lettre de relance officielle', () => {
	it('se compose au seul nom du créancier, et réclame le total figé', () => {
		const r = relance();
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.corps).toContain('Ateliers Martin SARL, au capital de 10 000,00 €');
		expect(r.corps).toContain('SIREN 552100554 – RCS Bordeaux');
		expect(r.corps).toContain('6 243,05 €');
		// 25 septembre + 8 jours choisis + 3 jours d'acheminement = 6 octobre.
		expect(r.corps).toContain('au plus tard le 6 octobre 2026');
	});

	it('n’emploie aucun mot d’acte de commissaire de justice, ni la prescription', () => {
		const r = relance();
		if (!r.ok) throw new Error('attendu');
		expect(r.corps).not.toMatch(
			/sommation|commandement|signifi|exploit|à la requête de|prescri|formule exécutoire/i
		);
	});

	it('refuse en nommant ce qui manque', () => {
		const r = relance({ creancier: { ...CREANCIER, iban: undefined } });
		expect(r.ok).toBe(false);
		if (r.ok) return;
		expect(r.manques.join(' ')).toMatch(/IBAN/);
	});

	it('refuse quand un règlement est arrivé depuis le calcul', () => {
		expect(relance({ factures: [{ ...FACTURE, resteDu: 500_000n }] }).ok).toBe(false);
	});

	it('refuse pour un client en procédure collective', () => {
		expect(relance({ debiteur: { ...DEBITEUR, sante: 'PROCEDURE_COLLECTIVE' } }).ok).toBe(false);
	});
});

describe('la déclaration de ce qu’il vous doit', () => {
	it('se compose sur un calcul arrêté à la veille du jugement', () => {
		const r = composerDeclaration({
			creancier: CREANCIER,
			debiteur: { ...DEBITEUR, sante: 'PROCEDURE_COLLECTIVE' },
			procedure: PROCEDURE,
			factures: [FACTURE],
			decompte: DECOMPTE,
			dateCourrier: '2026-09-25',
			aucuneSurete: true,
			aucunProces: true,
			pouvoir: null
		});
		expect(r.ok, JSON.stringify(r)).toBe(true);
		if (!r.ok) return;
		expect(r.corps).toContain('certifie sincère');
		expect(r.corps).toContain('en qualité de mandataire judiciaire');
		expect(r.corps).toContain('procédure de redressement judiciaire');
	});

	it('refuse sans les confirmations du gérant', () => {
		const r = composerDeclaration({
			creancier: CREANCIER,
			debiteur: DEBITEUR,
			procedure: PROCEDURE,
			factures: [FACTURE],
			decompte: DECOMPTE,
			dateCourrier: '2026-09-25',
			aucuneSurete: false,
			aucunProces: true,
			pouvoir: null
		});
		expect(r.ok).toBe(false);
	});
});

describe('tous les courriers', () => {
	it('se composent, ne nomment jamais le logiciel et ne promettent rien', () => {
		const compositions = [
			relance(),
			composerInformationMandataire({
				creancier: CREANCIER,
				debiteur: DEBITEUR,
				procedure: { ...PROCEDURE, nature: 'Jugement d’ouverture de liquidation judiciaire' },
				dateCourrier: '2026-09-25'
			}),
			composerTransmissionAvocat({
				creancier: CREANCIER,
				debiteur: DEBITEUR,
				avocat: { nom: 'Me Dupont', adresse: '3 cours Victor Hugo, 33000 Bordeaux' },
				factures: [FACTURE],
				decompte: DECOMPTE,
				horsDecompte: [],
				etapesAccomplies: [],
				procedureCollective: null,
				prescriptions: [],
				ordonnanceLe: null,
				significationLe: null,
				oppositionLe: null,
				projets: [],
				pieces: ['facture FA-2026-118'],
				dateCourrier: '2026-09-25',
				confidentiel: true
			}),
			composerDemandeSignification({
				creancier: CREANCIER,
				debiteur: DEBITEUR,
				etude: { nom: 'SCP Exemple', adresse: '8 rue Sainte-Catherine, 33000 Bordeaux' },
				ordonnance: {
					date: '2026-09-10',
					juridiction: 'le président du tribunal de commerce de Lyon',
					numero: '2026/123'
				},
				nombrePieces: 3,
				reglementsDepuis: [],
				dateCourrier: '2026-09-25'
			}),
			composerAccordEcheancier({
				creancier: CREANCIER,
				debiteur: DEBITEUR,
				decompte: DECOMPTE,
				factures: [FACTURE],
				referenceInterne: 'D-2026-0042',
				dateCourrier: '2026-09-25',
				choix: {
					nombre: 3,
					premiereEcheance: '2026-10-15',
					intervalleMois: 1,
					penalites: 'RENONCIATION',
					delaiRegularisationJours: 15,
					debiteurSignataireNom: 'Paul Durand',
					debiteurSignataireQualite: 'Président'
				}
			})
		];
		for (const c of compositions) {
			expect(c.ok, JSON.stringify(c)).toBe(true);
			if (!c.ok) continue;
			expect(c.corps).not.toMatch(/letikette|garanti|pour le compte de|mandaté par/i);
		}
	});

	it('répartissent un échéancier au centime, le reliquat sur le dernier versement', () => {
		const v = versements(100_000n, 3, '2026-10-31', 1);
		expect(v.map((x) => x.montant)).toEqual([33_333n, 33_333n, 33_334n]);
		expect(v.map((x) => x.date)).toEqual(['2026-10-31', '2026-11-30', '2026-12-31']);
	});
});
