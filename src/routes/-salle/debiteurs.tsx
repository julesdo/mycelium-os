import { useState, type ReactNode } from 'react';
import {
	EcranDebiteurs,
	type DebiteursAffiches,
	type LigneDebiteur
} from '../../screens/debiteurs';
import { EcranHabitude, type HabitudeDuDebiteur } from '../../screens/debiteur/habitude';
import { EcranPieces } from '../../screens/debiteur/pieces';
import {
	additionner,
	depuisCentimes,
	enCentimes,
	soustraire,
	ZERO
} from '../../lib/socle/montants';
import { ecartJours, estDateReelle } from '../../lib/verticales/recouvrement/calendrier';
import {
	habitudeDePaiement,
	lireRupture,
	type PaiementObserve
} from '../../lib/verticales/recouvrement/comportement';
import { lirePreuve, type DocumentPreuve } from '../../lib/verticales/recouvrement/import/preuve';
import { lireAnnonce } from '../../lib/verticales/recouvrement/pays/france/bodacc';
import {
	prescriptionDe,
	type SecteurCreance
} from '../../lib/verticales/recouvrement/pays/france/prescription';
import {
	controlerTauxContractuel,
	pourcentageDepuisTaux,
	tauxDepuisPourcentage
} from '../../lib/verticales/recouvrement/taux-contractuel';
import type { ConstatRegistreAffiche, PieceAffichee, RuptureAffichee } from '../../ui';
import { SECTEURS_DEMO } from './communes';
import { formeDemo, lectureDemo, type EcranDuProduit, type EtatDemo } from './demo';

/**
 * LES ENTRÉES DE LA FAMILLE, DÉCLARÉES AVANT TOUT CE QUI S'EN CALCULE.
 *
 * ⚠️ LA FICHE DU DÉBITEUR MONTRAIT DES CHIFFRES QU'AUCUNE DE SES FACTURES NE
 * DONNAIT. Une créance de deux factures pour 12 000 € que ses factures ne
 * composaient pas, des dates de prescription écrites à la main, et un plancher
 * de taux recopié qu'aucun semestre du référentiel ne porte.
 *
 * Tout ce que la famille montre se calcule donc depuis ces entrées, comme les
 * requêtes du produit le calculent : les rangées comme `listerDebiteurs`, les
 * factures comme `listerFacturesDuDebiteur`, les créances comme `listerCreances`,
 * l'habitude et les ruptures comme `lireComportement`, les pièces comme la
 * lecture les consigne et comme `listerPiecesDuDebiteur` les ordonne, et le
 * constat du taux comme `poserLeTaux` le rend. Ne reste écrit que ce qu'aucune
 * fonction ne produit : les noms, les SIREN, les secteurs choisis, l'annonce du
 * registre, les factures et leurs règlements, les créances constituées, le taux
 * saisi, l'instant de chaque dépôt de pièce, ce que le modèle a lu dans chaque
 * pièce, et le jour de la démonstration.
 *
 * ⚠️ LES RÈGLEMENTS OBSERVÉS NE S'ÉCRIVENT PAS À PART. Ce sont ceux des
 * factures soldées, au dernier règlement de chacune : c'est là que la lecture
 * de l'habitude les prend, et les écrire deux fois ferait diverger la fiche, qui
 * liste ces factures, de la page qui en tire l'habitude.
 *
 * ⚠️ AUCUN DÉBITEUR N'EST `SAINE`, parce que rien dans le produit n'écrit cet
 * état : l'import crée `INCONNUE`, et le radar ne pose qu'une procédure
 * collective ou une radiation. La santé se calcule donc aussi, depuis l'annonce.
 *
 * Les trois noms ne sont montrés par aucune autre donnée de la salle.
 */

/**
 * Le jour de la démonstration, figé : les retards, les factures échues et le
 * contrôle du taux en dépendent. Un « aujourd'hui » qui bouge chaque matin ne se
 * compare plus d'une capture à l'autre.
 */
const AUJOURD_HUI_DEMO = '2026-09-10';

/** Un débiteur, tel que l'import le crée et que le gérant le complète sur sa fiche. */
interface DebiteurDemo {
	readonly _id: string;
	readonly denomination: string;
	/** Absent : ni l'export ni le gérant ne l'ont donné, et le radar ne peut pas le surveiller. */
	readonly siren?: string;
	/** Le secteur choisi sur la fiche (`renseignerSecteur`). Absent : l'import n'en pose aucun. */
	readonly secteur?: SecteurCreance;
}

/**
 * Le débiteur ouvert d'emblée : un payeur régulier dont deux impayés sortent de
 * l'habitude. Sa relation relève du transport de marchandises, et ses factures
 * se prescrivent sur ce régime.
 */
const PRINCIPAL_DEMO: DebiteurDemo = {
	_id: 'demo-debiteur-delorme',
	denomination: 'Imprimerie Delorme',
	// Ce SIREN et celui du garage (`519473029`) passent la clé de contrôle parce que le produit
	// l'exige, mais ils sont inventés et peuvent coïncider avec de vraies entreprises, dont l'une
	// se verrait prêter une liquidation : la salle n'existe qu'en développement, et ne doit jamais
	// servir à des captures publiées au dehors.
	siren: '831647250',
	secteur: 'TRANSPORT_MARCHANDISES'
};

/** Un payeur lent, mais fidèle à lui-même : son impayé est échu, et reste dans son habitude. */
const PAYEUR_LENT_DEMO: DebiteurDemo = {
	_id: 'demo-debiteur-caron',
	denomination: 'Serrurerie Caron',
	secteur: 'GENERAL'
};

/** Un client récent : trop peu de règlements pour une habitude, et aucun secteur choisi. */
const NOUVEAU_CLIENT_DEMO: DebiteurDemo = {
	_id: 'demo-debiteur-lefebvre',
	denomination: 'Garage Lefebvre',
	siren: '519473029'
};

const DEBITEURS_DEMO: readonly DebiteurDemo[] = [
	PRINCIPAL_DEMO,
	PAYEUR_LENT_DEMO,
	NOUVEAU_CLIENT_DEMO
];

/**
 * Les annonces que le radar a lues au BODACC, dans la forme où l'API les rend :
 * `jugement` arrive en chaîne JSON, et la nature s'écrit comme le registre
 * l'écrit. L'identifiant et l'URL sont ceux d'une annonce de démonstration : ils
 * ne désignent aucune annonce publiée.
 */
const ANNONCES_BODACC_DEMO: readonly unknown[] = [
	{
		id: 'A2026DEMO0001',
		familleavis: 'collective',
		familleavis_lib: 'Procédures collectives',
		registre: [NOUVEAU_CLIENT_DEMO.siren],
		dateparution: '2026-09-04',
		tribunal: 'Greffe du Tribunal de Commerce de Lyon',
		url_complete: 'https://www.bodacc.fr/pages/annonces-commerciales-detail/?q.id=id:A2026DEMO0001',
		jugement: JSON.stringify({
			famille: "Jugement d'ouverture",
			nature: "Jugement d'ouverture de liquidation judiciaire",
			date: '2026-08-27'
		})
	}
];

/** Un règlement, dans la forme de la table `reglements`. */
interface ReglementDemo {
	readonly date: string;
	readonly montant: bigint;
}

/** Une facture telle que l'export comptable l'apporte, avec les règlements qui la concernent. */
interface FactureDemo {
	readonly debiteurId: string;
	readonly reference: string;
	readonly montantTTC: bigint;
	readonly dateEmission: string;
	readonly dateEcheance: string;
	readonly reglements: readonly ReglementDemo[];
}

/**
 * Les factures de l'établissement, dans l'ordre de l'export.
 *
 * Chaque facture soldée l'a été d'un seul virement. Une facture de l'imprimerie
 * a reçu un acompte, et reste due pour le reste.
 */
const FACTURES_DEMO: readonly FactureDemo[] = [
	{
		debiteurId: PRINCIPAL_DEMO._id,
		reference: 'FA-2025-0412',
		montantTTC: 384_000n,
		dateEmission: '2025-09-15',
		dateEcheance: '2025-10-15',
		reglements: [{ date: '2025-10-27', montant: 384_000n }]
	},
	{
		debiteurId: PAYEUR_LENT_DEMO._id,
		reference: 'FA-2025-0433',
		montantTTC: 125_000n,
		dateEmission: '2025-09-26',
		dateEcheance: '2025-10-26',
		reglements: [{ date: '2025-12-09', montant: 125_000n }]
	},
	{
		debiteurId: PRINCIPAL_DEMO._id,
		reference: 'FA-2025-0468',
		montantTTC: 291_540n,
		dateEmission: '2025-10-20',
		dateEcheance: '2025-11-19',
		reglements: [{ date: '2025-11-30', montant: 291_540n }]
	},
	{
		debiteurId: PAYEUR_LENT_DEMO._id,
		reference: 'FA-2025-0507',
		montantTTC: 98_000n,
		dateEmission: '2025-11-14',
		dateEcheance: '2025-12-14',
		reglements: [{ date: '2026-01-28', montant: 98_000n }]
	},
	{
		debiteurId: PRINCIPAL_DEMO._id,
		reference: 'FA-2025-0531',
		montantTTC: 410_280n,
		dateEmission: '2025-12-01',
		dateEcheance: '2025-12-31',
		reglements: [{ date: '2026-01-12', montant: 410_280n }]
	},
	{
		debiteurId: PRINCIPAL_DEMO._id,
		reference: 'FA-2026-0027',
		montantTTC: 336_000n,
		dateEmission: '2026-01-20',
		dateEcheance: '2026-02-19',
		reglements: [{ date: '2026-03-06', montant: 336_000n }]
	},
	{
		debiteurId: PAYEUR_LENT_DEMO._id,
		reference: 'FA-2026-0041',
		montantTTC: 143_000n,
		dateEmission: '2026-01-26',
		dateEcheance: '2026-02-25',
		reglements: [{ date: '2026-04-11', montant: 143_000n }]
	},
	{
		debiteurId: PRINCIPAL_DEMO._id,
		reference: 'FA-2026-0089',
		montantTTC: 278_060n,
		dateEmission: '2026-03-02',
		dateEcheance: '2026-04-01',
		reglements: [{ date: '2026-04-14', montant: 278_060n }]
	},
	{
		debiteurId: PAYEUR_LENT_DEMO._id,
		reference: 'FA-2026-0098',
		montantTTC: 110_500n,
		dateEmission: '2026-03-12',
		dateEcheance: '2026-04-11',
		reglements: [{ date: '2026-05-28', montant: 110_500n }]
	},
	{
		debiteurId: NOUVEAU_CLIENT_DEMO._id,
		reference: 'FA-2026-0133',
		montantTTC: 31_200n,
		dateEmission: '2026-04-27',
		dateEcheance: '2026-05-27',
		reglements: [{ date: '2026-06-03', montant: 31_200n }]
	},
	{
		debiteurId: PRINCIPAL_DEMO._id,
		reference: 'FA-2026-0142',
		montantTTC: 548_000n,
		dateEmission: '2026-05-06',
		dateEcheance: '2026-06-05',
		reglements: []
	},
	{
		debiteurId: PAYEUR_LENT_DEMO._id,
		reference: 'FA-2026-0151',
		montantTTC: 132_000n,
		dateEmission: '2026-05-18',
		dateEcheance: '2026-06-17',
		reglements: [{ date: '2026-07-30', montant: 132_000n }]
	},
	{
		debiteurId: NOUVEAU_CLIENT_DEMO._id,
		reference: 'FA-2026-0171',
		montantTTC: 26_880n,
		dateEmission: '2026-06-01',
		dateEcheance: '2026-07-01',
		reglements: [{ date: '2026-07-09', montant: 26_880n }]
	},
	{
		debiteurId: PRINCIPAL_DEMO._id,
		reference: 'FA-2026-0177',
		montantTTC: 391_200n,
		dateEmission: '2026-06-08',
		dateEcheance: '2026-07-08',
		reglements: []
	},
	{
		debiteurId: PAYEUR_LENT_DEMO._id,
		reference: 'FA-2026-0196',
		montantTTC: 157_500n,
		dateEmission: '2026-07-03',
		dateEcheance: '2026-08-02',
		reglements: []
	},
	{
		debiteurId: NOUVEAU_CLIENT_DEMO._id,
		reference: 'FA-2026-0201',
		montantTTC: 48_600n,
		dateEmission: '2026-07-22',
		dateEcheance: '2026-08-21',
		reglements: []
	},
	{
		debiteurId: PRINCIPAL_DEMO._id,
		reference: 'FA-2026-0203',
		montantTTC: 264_000n,
		dateEmission: '2026-07-25',
		dateEcheance: '2026-08-24',
		reglements: [{ date: '2026-09-01', montant: 100_000n }]
	},
	{
		debiteurId: PRINCIPAL_DEMO._id,
		reference: 'FA-2026-0206',
		montantTTC: 184_650n,
		dateEmission: '2026-07-26',
		dateEcheance: '2026-08-25',
		reglements: []
	}
];

/** Une créance constituée par le gérant (`creer`), et les factures qu'il y a rattachées. */
interface CreanceDemo {
	readonly _id: string;
	readonly debiteurId: string;
	readonly statut: 'BROUILLON' | 'QUALIFIEE';
	readonly references: readonly string[];
}

/** Deux créances sur l'imprimerie, dont un brouillon : les deux formes que la rangée distingue. */
const CREANCES_DEMO: readonly CreanceDemo[] = [
	{
		_id: 'demo-creance-delorme',
		debiteurId: PRINCIPAL_DEMO._id,
		statut: 'QUALIFIEE',
		references: ['FA-2026-0142', 'FA-2026-0177']
	},
	{
		_id: 'demo-creance-delorme-brouillon',
		debiteurId: PRINCIPAL_DEMO._id,
		statut: 'BROUILLON',
		references: ['FA-2026-0206']
	}
];

/**
 * Le taux de retard que le gérant a saisi sur la fiche de l'imprimerie, tel
 * qu'il l'a tapé, le jour de la démonstration (`enregistrerTaux`).
 */
const TAUX_SAISI_DEMO = { debiteurId: PRINCIPAL_DEMO._id, pourcentage: '12' };

/** Une lecture où le modèle n'a rien relevé : chaque pièce plus bas n'en change que ce qu'il a lu. */
const RIEN_RELEVE_DEMO: DocumentPreuve = {
	type: 'INCONNU',
	reference: null,
	date: null,
	referencesLiees: [],
	contrepartie: null,
	receptionSignee: null,
	reservesEmises: null,
	reserves: null,
	tauxRetardPourcent: null,
	illisible: false,
	raisonIllisible: null
};

/** Une pièce déposée sur la page des pièces, et ce que le modèle en a rendu. */
interface PieceDemo {
	readonly _id: string;
	readonly debiteurId: string;
	readonly filename: string;
	/** `null` : la lecture tourne encore. */
	readonly lecture: DocumentPreuve | null;
	/** La nature que le gérant a choisie à la main, après la lecture (`classerPiece`). */
	readonly classeeEn?: string;
	/** L'instant du dépôt, en millisecondes, comme `enregistrer` l'écrit (`pieces.ts`, ligne 77). */
	readonly ajouteeLe: number;
}

/**
 * Les pièces de l'imprimerie, dans l'ordre du dépôt : deux bons de livraison lus,
 * dont un porte une réserve, un scan illisible, des conditions générales que la
 * lecture a prises pour un contrat et que le gérant a reclassées, et un dernier
 * dépôt, du jour de la démonstration, encore en lecture. La requête les rend dans
 * l'ordre inverse (`piecesDu`).
 */
const PIECES_DEMO: readonly PieceDemo[] = [
	{
		_id: 'demo-piece-bl-0142',
		debiteurId: PRINCIPAL_DEMO._id,
		filename: 'BL-2026-0142.pdf',
		lecture: {
			...RIEN_RELEVE_DEMO,
			type: 'BON_DE_LIVRAISON',
			reference: 'BL-2026-0142',
			date: '2026-05-06',
			referencesLiees: ['FA-2026-0142'],
			// Émargé à la livraison : le constat le dit en toutes lettres, et le
			// barème ne bouge pas pour autant.
			receptionSignee: true
		},
		ajouteeLe: Date.parse('2026-06-09T08:40:00Z')
	},
	{
		_id: 'demo-piece-bl-0177',
		debiteurId: PRINCIPAL_DEMO._id,
		filename: 'BL-2026-0177.pdf',
		lecture: {
			...RIEN_RELEVE_DEMO,
			type: 'BON_DE_LIVRAISON',
			reference: 'BL-2026-0177',
			date: '2026-06-08',
			referencesLiees: ['FA-2026-0177'],
			// Une mention manuscrite, et personne n'a signé : le constat dit les
			// deux, parce qu'un bon non émargé compte au score comme un bon signé.
			receptionSignee: false,
			reservesEmises: true,
			reserves: 'Deux colis manquants, signalés à la livraison.'
		},
		ajouteeLe: Date.parse('2026-06-10T09:15:00Z')
	},
	{
		_id: 'demo-piece-scan',
		debiteurId: PRINCIPAL_DEMO._id,
		filename: 'scan_20260612.jpg',
		lecture: { ...RIEN_RELEVE_DEMO, illisible: true },
		ajouteeLe: Date.parse('2026-06-12T16:05:00Z')
	},
	{
		_id: 'demo-piece-conditions',
		debiteurId: PRINCIPAL_DEMO._id,
		filename: 'conditions-generales.pdf',
		// Le taux stipulé est relevé sur ce document parce que `lirePreuve` ne le
		// rend que depuis des conditions générales ou un contrat. Il reste une
		// proposition : la fiche du débiteur le montre avec la pièce qui le porte,
		// et rien ne s'applique aux factures avant un appui.
		lecture: {
			...RIEN_RELEVE_DEMO,
			type: 'CONTRAT',
			date: '2025-09-01',
			tauxRetardPourcent: 12.5
		},
		classeeEn: 'CGV',
		ajouteeLe: Date.parse('2026-06-15T10:30:00Z')
	},
	{
		_id: 'demo-piece-releve',
		debiteurId: PRINCIPAL_DEMO._id,
		filename: 'releve-livraisons-aout.pdf',
		lecture: null,
		ajouteeLe: Date.parse(`${AUJOURD_HUI_DEMO}T07:55:00Z`)
	}
];

/*
  CE QUI SE CALCULE, COMME LES REQUÊTES DU PRODUIT LE CALCULENT.
*/

/**
 * La santé et le dernier constat du registre, comme `appliquerConstats` les écrit
 * (`src/lib/convex/recouvrement/radar.ts`, lignes 77 à 119) avec les constats de
 * `lireAnnonce` : rapprochés par SIREN, jamais par nom. Avant toute annonce, la
 * santé est celle que l'import pose (`src/lib/convex/recouvrement/import.ts`,
 * ligne 120).
 */
function santeDuRegistre(debiteur: DebiteurDemo): {
	readonly santeFinanciere: LigneDebiteur['santeFinanciere'];
	readonly constatRegistre: ConstatRegistreAffiche | undefined;
} {
	let santeFinanciere: LigneDebiteur['santeFinanciere'] = 'INCONNUE';
	let constatRegistre: ConstatRegistreAffiche | undefined;

	for (const brut of ANNONCES_BODACC_DEMO) {
		const constat = lireAnnonce(brut);
		if (constat === null || debiteur.siren === undefined || constat.siren !== debiteur.siren) {
			continue;
		}
		constatRegistre = {
			dateParution: constat.dateParution,
			nature: constat.nature,
			dateJugement: constat.dateJugement,
			tribunal: constat.tribunal,
			url: constat.url
		};
		if (constat.effetSurLaSante !== 'AUCUN' && constat.effetSurLaSante !== santeFinanciere) {
			santeFinanciere = constat.effetSurLaSante;
		}
	}

	return { santeFinanciere, constatRegistre };
}

/** Le taux saisi, contrôlé comme `poserLeTaux` le contrôle (`src/lib/convex/recouvrement/tauxContractuel.ts`, lignes 101 à 108). */
const CONTROLE_TAUX_DEMO = controlerTauxContractuel(
	tauxDepuisPourcentage(TAUX_SAISI_DEMO.pourcentage),
	AUJOURD_HUI_DEMO
);

/**
 * Les factures telles que la base les porte. L'import déduit l'exigibilité de
 * l'échéance et le marque (`import.ts`, lignes 203 à 206), puis recalcule le
 * statut depuis tous les règlements (lignes 126 à 130 et 263 à 274). `creer`
 * rattache les factures d'une créance, et `poserLeTaux` pose le taux saisi sur
 * les factures non soldées du débiteur (`tauxContractuel.ts`, lignes 76 à 121).
 */
const LIGNES_FACTURES_DEMO = FACTURES_DEMO.map((facture) => {
	const regle = facture.reglements.reduce((somme, reglement) => somme + reglement.montant, 0n);
	const statutPaiement: 'IMPAYEE' | 'PARTIELLEMENT_PAYEE' | 'SOLDEE' =
		regle <= 0n ? 'IMPAYEE' : regle >= facture.montantTTC ? 'SOLDEE' : 'PARTIELLEMENT_PAYEE';

	return {
		...facture,
		_id: facture.reference,
		dateExigibilite: facture.dateEcheance,
		exigibiliteDeduite: true,
		statutPaiement,
		creanceId: CREANCES_DEMO.find((creance) => creance.references.includes(facture.reference))?._id,
		tauxContractuel:
			facture.debiteurId === TAUX_SAISI_DEMO.debiteurId && statutPaiement !== 'SOLDEE'
				? CONTROLE_TAUX_DEMO.taux
				: undefined
	};
});

type LigneFactureDemo = (typeof LIGNES_FACTURES_DEMO)[number];

/** Ce qui reste dû sur une facture, calculé comme `resteDu` (`src/lib/convex/recouvrement/lecture.ts`, lignes 110 à 120). */
function resteDu(facture: LigneFactureDemo) {
	return soustraire(
		depuisCentimes(facture.montantTTC),
		additionner(...facture.reglements.map((reglement) => depuisCentimes(reglement.montant)))
	);
}

/**
 * Les rangées de la liste, comme `listerDebiteurs` les rend (`lecture.ts`,
 * lignes 136 à 177) : l'encours et les factures échues sur les seules factures
 * non soldées, le plus gros encours d'abord. Le serveur lit son horloge pour
 * dire qu'une facture est échue ; la salle lit son jour figé.
 */
const LIGNES_DEMO = DEBITEURS_DEMO.map((debiteur) => {
	const nonSoldees = LIGNES_FACTURES_DEMO.filter(
		(facture) => facture.debiteurId === debiteur._id && facture.statutPaiement !== 'SOLDEE'
	);
	const restes = nonSoldees.map(resteDu);

	return {
		_id: debiteur._id,
		denomination: debiteur.denomination,
		siren: debiteur.siren,
		...santeDuRegistre(debiteur),
		secteurDetermine: debiteur.secteur !== undefined && debiteur.secteur !== 'INDETERMINE',
		secteur: debiteur.secteur,
		encours: enCentimes(restes.length > 0 ? additionner(...restes) : ZERO),
		facturesEchues: nonSoldees.filter((facture) => facture.dateEcheance < AUJOURD_HUI_DEMO).length
	};
}).sort((a, b) => (b.encours > a.encours ? 1 : b.encours < a.encours ? -1 : 0));

type LigneDemo = (typeof LIGNES_DEMO)[number];

/** Le nom d'un débiteur, lu dans la liste comme les pages de détail le lisent. */
function denominationDe(debiteurId: string): string | null {
	return LIGNES_DEMO.find((ligne) => ligne._id === debiteurId)?.denomination ?? null;
}

/**
 * Les factures d'un débiteur, comme `listerFacturesDuDebiteur` les rend
 * (`lecture.ts`, lignes 181 à 229) : la prescription depuis l'exigibilité puis
 * l'échéance, sur le secteur du débiteur, ou `INDETERMINE` s'il n'en a pas.
 */
function facturesDu(debiteurId: string) {
	const secteur =
		DEBITEURS_DEMO.find((debiteur) => debiteur._id === debiteurId)?.secteur ?? 'INDETERMINE';

	return LIGNES_FACTURES_DEMO.filter((facture) => facture.debiteurId === debiteurId).map(
		(facture) => ({
			_id: facture._id,
			reference: facture.reference,
			montantTTC: facture.montantTTC,
			tauxContractuelPourcent:
				facture.tauxContractuel === undefined
					? undefined
					: pourcentageDepuisTaux(facture.tauxContractuel),
			resteDu: enCentimes(resteDu(facture)),
			dateEmission: facture.dateEmission,
			dateEcheance: facture.dateEcheance,
			dateExigibilite: facture.dateExigibilite,
			exigibiliteDeduite: facture.exigibiliteDeduite,
			statutPaiement: facture.statutPaiement,
			datePrescription: prescriptionDe([facture.dateExigibilite, facture.dateEcheance], secteur)
				.datePrescription,
			dansUneCreance: facture.creanceId !== undefined
		})
	);
}

/**
 * Les créances, comme `listerCreances` les rend (`lecture.ts`, lignes 698 à
 * 726) : le reste dû et le nombre des factures qui leur sont rattachées.
 */
const CREANCES_LISTEES_DEMO = CREANCES_DEMO.map((creance) => {
	const factures = LIGNES_FACTURES_DEMO.filter((facture) => facture.creanceId === creance._id);
	const restes = factures.map(resteDu);

	return {
		_id: creance._id,
		debiteurId: creance.debiteurId,
		statut: creance.statut,
		principalRestantDu: enCentimes(restes.length > 0 ? additionner(...restes) : ZERO),
		nombreFactures: factures.length
	};
});

/**
 * L'habitude et les ruptures d'un débiteur, comme `lireComportement` les lit
 * (`src/lib/convex/recouvrement/comportement.ts`, lignes 86 à 161). Les factures
 * soldées font l'échantillon, au dernier règlement daté de chacune
 * (`dateAcquittement`, lignes 47 à 62). Les impayés déjà exigibles se lisent au
 * jour figé, et seules les ruptures restent, les écarts les plus francs d'abord.
 */
function comportementDu(debiteurId: string) {
	const miennes = LIGNES_FACTURES_DEMO.filter((facture) => facture.debiteurId === debiteurId);

	const observes: PaiementObserve[] = [];
	for (const facture of miennes) {
		if (facture.statutPaiement !== 'SOLDEE') continue;
		if (!estDateReelle(facture.dateExigibilite)) continue;
		const dates = facture.reglements
			.map((reglement) => reglement.date)
			.filter((date) => estDateReelle(date))
			.sort();
		const acquitte = dates.length === 0 ? null : (dates[dates.length - 1] ?? null);
		if (acquitte === null) continue;
		observes.push({
			reference: facture.reference,
			dateExigibilite: facture.dateExigibilite,
			datePaiement: acquitte
		});
	}

	const habitude = habitudeDePaiement(observes);

	const ruptures: RuptureAffichee[] = [];
	for (const facture of miennes) {
		if (facture.statutPaiement === 'SOLDEE') continue;
		if (!estDateReelle(facture.dateExigibilite)) continue;
		const retard = ecartJours(facture.dateExigibilite, AUJOURD_HUI_DEMO);
		if (retard <= 0) continue;
		const lecture = lireRupture(habitude, retard);
		if (lecture.etat !== 'RUPTURE') continue;
		ruptures.push({
			reference: facture.reference,
			habituelJours: lecture.habituelJours,
			ecartJours: lecture.ecartJours,
			constat: lecture.constat
		});
	}
	ruptures.sort((a, b) => b.ecartJours - a.ecartJours);

	return { habitude, ruptures };
}

/** Une pièce telle que la requête la rend : ce que les écrans affichent, et l'instant du dépôt qui l'ordonne. */
type PieceListee = PieceAffichee & { readonly ajouteeLe: number };

/**
 * Une pièce telle que `listerPiecesDuDebiteur` la rend
 * (`src/lib/convex/recouvrement/pieces.ts`, lignes 272 et suivantes). Déposée,
 * elle entre à classer et en lecture, datée de son dépôt (`enregistrer`, lignes
 * 69 à 78). Lue, `lireLaPiece` passe à `consignerLectureInterne` ce que
 * `lirePreuve` tire du modèle (`src/lib/convex/recouvrement/preuve.ts`, lignes
 * 90 à 100 ; `pieces.ts`, lignes 125 à 132). Classée à la main, seules sa nature
 * et son statut changent (`classer`, lignes 159 à 162).
 */
function pieceEnBase(piece: PieceDemo): PieceListee {
	const deposee = { _id: piece._id, filename: piece.filename, ajouteeLe: piece.ajouteeLe };
	if (piece.lecture === null) return { ...deposee, type: 'INDETERMINE', statut: 'EN_LECTURE' };

	const lue = lirePreuve(piece.lecture);
	const consignee = {
		...deposee,
		type: lue.type ?? 'INDETERMINE',
		statut: lue.type === null ? 'A_CLASSER' : 'LUE',
		reference: lue.reference ?? undefined,
		dateDocument: lue.date ?? undefined,
		reserves: lue.reserves ?? undefined,
		tauxRetardStipule: lue.tauxRetardPourcent ?? undefined,
		constat: lue.constat
	};

	return piece.classeeEn === undefined
		? consignee
		: { ...consignee, type: piece.classeeEn, statut: 'CLASSEE_MAIN' };
}

/**
 * Les pièces d'un débiteur, la plus récente d'abord : `listerPiecesDuDebiteur`
 * les trie ainsi (`pieces.ts`, lignes 333 et 334), et les deux écrans les
 * montrent dans cet ordre.
 */
function piecesDu(debiteurId: string): PieceListee[] {
	return PIECES_DEMO.filter((piece) => piece.debiteurId === debiteurId)
		.map(pieceEnBase)
		.sort((a, b) => b.ajouteeLe - a.ajouteeLe);
}

/**
 * Le volet de preuve, composé comme la route le compose (`debiteurs.tsx`).
 * `voletLu` dit si les lectures du volet (factures, pièces, habitude) ont
 * répondu : faux, elles valent `undefined`, comme `useQuery` les rend avant sa
 * réponse, et la route en tire un volet en lecture. Le constat du taux est celui
 * que `poserLeTaux` rend pour un débiteur qui a des factures non soldées
 * (`tauxContractuel.ts`, lignes 127 à 130), et la route ne le garde que sous le
 * débiteur auquel il se rapporte.
 */
function detailDu(
	choisi: string | null,
	debiteurs: readonly LigneDemo[],
	selection: ReadonlySet<string>,
	onBasculerFacture: (factureId: string) => void,
	voletLu: boolean
): DebiteursAffiches['detail'] {
	const debiteurChoisi = debiteurs.find((debiteur) => debiteur._id === choisi);
	const lu = voletLu ? choisi : null;
	const factures = lu === null ? undefined : facturesDu(lu);
	const pieces = lu === null ? undefined : piecesDu(lu);
	const comportement = lu === null ? undefined : comportementDu(lu);

	return {
		debiteurId: choisi ?? '',
		denomination: debiteurChoisi?.denomination ?? '',
		etatRecherche: { phase: 'REPOS' },
		onChercherAuRegistre: () => undefined,
		onRetenirEtablissement: () => undefined,
		debiteur: choisi === null || debiteurChoisi === undefined ? null : debiteurChoisi,
		factures: choisi === null || factures === undefined || pieces === undefined ? null : factures,
		creances: CREANCES_LISTEES_DEMO.filter((creance) => creance.debiteurId === choisi),
		optionsSecteur: SECTEURS_DEMO,
		erreurSiren: null,
		tauxStipule: factures?.find((facture) => facture.tauxContractuelPourcent !== undefined)
			?.tauxContractuelPourcent,
		constatTaux: TAUX_SAISI_DEMO.debiteurId === choisi ? CONTROLE_TAUX_DEMO.constat : null,
		pieces: pieces ?? [],
		habitude: comportement?.habitude ?? null,
		ruptures: comportement?.ruptures ?? [],
		propositionLettrage: null,
		lettrageEnCours: false,
		erreurLettrage: null,
		selection,
		erreur: null,
		onEnregistrerSiren: () => undefined,
		onChoisirSecteur: () => undefined,
		onEnregistrerTaux: () => undefined,
		onChercherLettrage: () => undefined,
		onAppliquerLettrage: () => undefined,
		onBasculerFacture,
		onConstituer: () => undefined
	};
}

/** La facture cochée d'emblée : la première de l'imprimerie qui n'est ni soldée, ni déjà dans une créance. */
const COCHEES_DEMO: readonly string[] = facturesDu(PRINCIPAL_DEMO._id)
	.filter((facture) => facture.statutPaiement !== 'SOLDEE' && !facture.dansUneCreance)
	.slice(0, 1)
	.map((facture) => facture._id);

/** Une forme de la liste : si les lectures du volet ouvert ont répondu. */
interface FormeDebiteursDemo {
	readonly voletLu: boolean;
}

/** La forme principale : le volet du débiteur ouvert est lu. */
const VOLET_LU_DEMO: FormeDebiteursDemo = { voletLu: true };

/**
 * Les formes nommées de la liste. « fiche en lecture » : le débiteur principal
 * est ouvert, et les lectures de son volet n'ont pas encore répondu. C'est ce
 * que la route montre à chaque ouverture d'une fiche, le temps que ses requêtes
 * répondent.
 */
const FORMES_DEBITEURS_DEMO: Readonly<Record<string, FormeDebiteursDemo>> = {
	'fiche en lecture': { voletLu: false }
};

/**
 * ⚠️ LE DÉBITEUR PRINCIPAL EST OUVERT D'EMBLÉE, ET UNE FACTURE Y EST COCHÉE.
 * Sous 1024 px la preuve est une feuille plein écran, au-dessus c'est le volet
 * droit, et le bouton qui constitue une créance se voit sans un clic.
 *
 * Ouvrir un autre débiteur, refermer, cocher : ces gestes changent l'écran comme
 * dans la route. Ceux qui écriraient en base, et les deux recherches (le
 * registre, le rapprochement d'un virement), ne font rien : les démonstrations
 * de l'identité et du lettrage montrent déjà ce qu'elles répondent.
 */
function DebiteursDemo({ etat, variante }: { etat: EtatDemo; variante?: string }) {
	const [choisi, setChoisi] = useState<string | null>(PRINCIPAL_DEMO._id);
	const [selection, setSelection] = useState<ReadonlySet<string>>(() => new Set(COCHEES_DEMO));

	// Lue avant `lectureDemo` : une variante inconnue lève dans chaque état.
	const { voletLu } = formeDemo(variante, VOLET_LU_DEMO, FORMES_DEBITEURS_DEMO);

	function basculer(factureId: string) {
		setSelection((precedente) => {
			const suivante = new Set(precedente);
			if (suivante.has(factureId)) suivante.delete(factureId);
			else suivante.add(factureId);
			return suivante;
		});
	}

	const gestes = {
		onOuvrir: (debiteurId: string) => {
			setChoisi(debiteurId);
			setSelection(new Set());
		},
		onFermer: () => setChoisi(null)
	};

	return (
		<EcranDebiteurs
			enfant={null}
			donnees={lectureDemo(
				etat,
				{
					...gestes,
					debiteurs: LIGNES_DEMO,
					choisi,
					detail: detailDu(choisi, LIGNES_DEMO, selection, basculer, voletLu)
				},
				{
					...gestes,
					debiteurs: [],
					choisi: null,
					detail: detailDu(null, [], selection, basculer, voletLu)
				}
			)}
		/>
	);
}

/** Une page de l'habitude : le débiteur qu'elle montre, et ce que la route lui passe. */
interface HabitudeMontree {
	readonly debiteurId: string;
	readonly valeur: HabitudeDuDebiteur;
}

/** La page de l'habitude d'un débiteur de la famille, composée comme sa route la compose. */
function habitudeDe(debiteur: DebiteurDemo): HabitudeMontree {
	const { habitude, ruptures } = comportementDu(debiteur._id);
	return {
		debiteurId: debiteur._id,
		valeur: { denomination: denominationDe(debiteur._id), habitude, ruptures }
	};
}

/** L'habitude du débiteur principal : connue, et rompue par ses deux impayés les plus anciens. */
const HABITUDE_DEMO = habitudeDe(PRINCIPAL_DEMO);

/**
 * Les formes nommées de la page : les deux autres débiteurs de la famille, sans
 * rien changer à leurs entrées. Le payeur lent montre une habitude sans rupture,
 * le client récent un historique trop court pour en établir une.
 */
const FORMES_HABITUDE_DEMO: Readonly<Record<string, HabitudeMontree>> = {
	'aucune rupture': habitudeDe(PAYEUR_LENT_DEMO),
	'sans historique': habitudeDe(NOUVEAU_CLIENT_DEMO)
};

/** Ce que la page des pièces reçoit en plus de ses pièces : aucun dépôt en cours, et des gestes qui n'écrivent rien. */
const PIECES_BASE_DEMO = {
	denomination: denominationDe(PRINCIPAL_DEMO._id),
	enCours: false,
	erreur: null,
	onDeposer: () => undefined,
	onClasser: () => undefined,
	onRetirer: () => undefined
};

/**
 * UNE PAGE DU DÉBITEUR, DANS LE VOLET DROIT DE LA LISTE.
 *
 * La liste est prête et ce débiteur y est choisi, comme en production quand on
 * ouvre sa page depuis sa fiche : l'état choisi dans la salle est celui de la
 * page. À 1024 px et au-delà les deux volets se voient ; en dessous, la page seule.
 */
function AvecLesDebiteurs({ debiteurId, children }: { debiteurId: string; children: ReactNode }) {
	return (
		<EcranDebiteurs
			enfant={children}
			donnees={lectureDemo('pret', {
				debiteurs: LIGNES_DEMO,
				choisi: debiteurId,
				onOuvrir: () => undefined,
				onFermer: () => undefined,
				detail: detailDu(
					debiteurId,
					LIGNES_DEMO,
					new Set<string>(),
					() => undefined,
					VOLET_LU_DEMO.voletLu
				)
			})}
		/>
	);
}

export const ECRANS_DEBITEURS: readonly EcranDuProduit[] = [
	{
		route: '/app/debiteurs',
		libelle: 'débiteurs',
		vide: true,
		variantes: Object.keys(FORMES_DEBITEURS_DEMO),
		Demo: DebiteursDemo
	},
	{
		route: '/app/debiteurs/$id/habitude',
		libelle: 'habitude',
		vide: false,
		variantes: Object.keys(FORMES_HABITUDE_DEMO),
		Demo: ({ etat, variante }) => {
			// Lue avant `lectureDemo` : une variante inconnue lève dans chaque état.
			const forme = formeDemo(variante, HABITUDE_DEMO, FORMES_HABITUDE_DEMO);
			return (
				<AvecLesDebiteurs debiteurId={forme.debiteurId}>
					<EcranHabitude identifiant={forme.debiteurId} donnees={lectureDemo(etat, forme.valeur)} />
				</AvecLesDebiteurs>
			);
		}
	},
	{
		route: '/app/debiteurs/$id/pieces',
		libelle: 'pièces',
		vide: true,
		Demo: ({ etat }) => (
			<AvecLesDebiteurs debiteurId={PRINCIPAL_DEMO._id}>
				<EcranPieces
					identifiant={PRINCIPAL_DEMO._id}
					donnees={lectureDemo(
						etat,
						{ ...PIECES_BASE_DEMO, pieces: piecesDu(PRINCIPAL_DEMO._id) },
						{ ...PIECES_BASE_DEMO, pieces: [] }
					)}
				/>
			</AvecLesDebiteurs>
		)
	}
];
