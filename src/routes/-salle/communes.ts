import type { DossierAffiche } from '../../screens/procedures';
import type { EtapeAffichee, EvenementAffiche } from '../../ui';

/**
 * LES FIXTURES COMMUNES DE LA SALLE D'EXPOSITION.
 *
 * Celles-ci traversent plusieurs familles d'écrans, ou sont montrées telles
 * quelles par une démonstration de composant dans `routes/showroom.tsx`. Les
 * fixtures propres à une seule famille vivent avec elle (`onglets.tsx`,
 * `creance.tsx`).
 */

/**
 * Le flux de surveillance, avec les cas qui cassent.
 *
 * Une prescription DÉJÀ dépassée, une caducité à quelques jours, un montant à
 * cinq chiffres à côté d'un montant à trois — c'est l'alignement des chiffres
 * et la hiérarchie des urgences qu'on vient regarder, pas le bonheur.
 */
export const EVENEMENTS_DEMO: EvenementAffiche[] = [
	{
		/**
		 * ⚠️ EN URGENCE NORMALE, ET IL EST EN TÊTE DE FIXTURE EXPRÈS.
		 *
		 * C'est le signal que le seuil absolu rate : 85 jours de retard chez un
		 * client qui règle toujours à 12. Il doit se lire comme une INFORMATION
		 * au milieu d'alertes critiques — s'il criait aussi fort qu'une
		 * prescription, il diluerait le seul signal du produit qui annonce une
		 * perte sèche.
		 */
		type: 'HABITUDE_ROMPUE',
		reference: 'FA-2026-0311',
		// ⚠️ LE MÊME MONTANT QUE L'ÉCHÉANCE QU'ELLE REMPLACE. La fixture portait
		// deux montants différents pour cette référence — 4 200 € ici, 249,90 € sur
		// la ligne d'échéance — ce qui ne peut pas arriver en production et rendait
		// la salle d'exposition menteuse sur le seul point qui compte : l'exactitude.
		montant: 24_990n,
		urgence: 'NORMALE',
		// Échue le 1er août, relevé au 2 septembre : trente-deux jours. Le constat
		// doit coller aux dates des autres fixtures, sans quoi on illustre un état
		// que le calcul ne produirait jamais.
		explication:
			'Ce débiteur règle habituellement à 5 jours de son échéance, sur 23 règlements observés. Cette facture en est à 32, soit 27 de plus que son habitude.',
		action:
			'Ouvrir la fiche de Fournitures Durand : son historique de règlements y est. ' +
			'Ou rattacher cette facture à une créance, ou enregistrer son règlement.',
		// ⚠️ CHAQUE RANGÉE DU FLUX S'OUVRE MAINTENANT, et la démonstration doit le
		// montrer : c'est la correction qui compte sur cet écran. « Ouvrir la fiche
		// de Fournitures Durand » était écrit depuis toujours, et rien ne
		// permettait de le faire.
		cible: { genre: 'DEBITEUR', id: 'demo-debiteur' }
	},
	{
		type: 'PRESCRIPTION_PROCHE',
		reference: 'FA-2021-0087',
		montant: 924_000n,
		urgence: 'CRITIQUE',
		explication: 'La facture FA-2021-0087 est PRESCRITE depuis le 2026-08-14.',
		action: 'Ne plus engager de frais sur cette facture : la créance est éteinte.',
		// Même une créance éteinte s'ouvre : c'est là qu'on va CONSTATER la perte,
		// et le seul endroit où « ne plus engager de frais » devient vérifiable.
		cible: { genre: 'DEBITEUR', id: 'demo-debiteur' }
	},
	{
		type: 'ECHEANCE_PROCEDURE',
		reference: 'Ateliers Martin — injonction',
		montant: 1_845_000n,
		urgence: 'CRITIQUE',
		explication: "Signification de l'ordonnance : il reste 9 jour(s) avant le 2026-09-12.",
		// La démonstration porte la MÊME formulation que le produit : une capture
		// qui montrerait « faire signifier sans délai » ferait recopier une consigne
		// de procédure que la ligne rouge 3 interdit.
		action: 'Ouvrir ce dossier : la date limite et son journal y sont.',
		cible: { genre: 'CREANCE', id: 'demo-creance' }
	},
	{
		type: 'CREANCE_MURE',
		reference: 'Fournitures Durand',
		montant: 3_120_050n,
		urgence: 'HAUTE',
		explication: 'La créance atteint le seuil de qualification (0,90 pour un seuil de 0.75).',
		action: 'Examiner les procédures envisageables pour cette créance.',
		cible: { genre: 'CREANCE', id: 'demo-creance' }
	}
	// ⚠️ L'ÉVÉNEMENT `FACTURE_ECHUE` DE FA-2026-0311 A ÉTÉ RETIRÉ D'ICI. Le
	// détecteur ne l'émet plus dès qu'une rupture couvre la même facture — la
	// rupture dit tout ce qu'il disait, et davantage. Le garder illustrerait un
	// état que le produit ne peut plus produire.
];

/**
 * LA VOIE ENTIÈRE, ET PAS SEULEMENT LÀ OÙ LE DOSSIER EN EST.
 *
 * Les données couvrent délibérément les trois statuts et les deux branches : une
 * étape franchie, l’étape courante, deux étapes à venir, et les deux issues qui
 * font sortir de la ligne. Un jeu où tout serait franchi ne montrerait ni le
 * disque vide, ni le trait pointillé d’une branche non prise — c’est-à-dire rien
 * de ce qu’on vient regarder.
 *
 * ⚠️ IL EST REMONTÉ ICI POUR SERVIR DEUX ÉCRANS. Le rail seul se regarde sous
 * l'entrée « rail » ; le même dossier se regarde monté dans l'onglet des
 * procédures et sur l'accueil. Deux jeux de démonstration pour la même voie
 * finiraient par diverger, et on irait vérifier une géométrie sur des données
 * que le produit ne rendrait jamais ensemble.
 */
export const RAIL_DEMO: EtapeAffichee[] = [
	{
		etat: 'REQUETE_DEPOSEE',
		libelle: 'Requête déposée',
		statut: 'FRANCHIE',
		atteinteLe: '2026-06-04',
		branches: [
			{
				etat: 'REQUETE_REJETEE',
				libelle: 'Requête rejetée',
				constat:
					'Le juge n’a pas fait droit à la requête, ou pas entièrement. La créance n’est pas ' +
					'éteinte ; cette voie-ci est fermée.'
			}
		],
		brancheSuivie: null
	},
	{
		etat: 'ORDONNANCE_RENDUE',
		libelle: 'Ordonnance rendue',
		statut: 'COURANTE',
		atteinteLe: '2026-08-28',
		branches: [],
		brancheSuivie: null
	},
	{
		etat: 'ORDONNANCE_SIGNIFIEE',
		libelle: 'Ordonnance signifiée',
		statut: 'A_VENIR',
		atteinteLe: null,
		branches: [
			{
				etat: 'OPPOSITION',
				libelle: 'Opposition formée',
				constat:
					'L’affaire bascule en procédure contradictoire. Les procédures que ce logiciel ' +
					'évalue se déroulent toutes sans débat : ce dossier sort de ce qu’il sait mesurer.'
			}
		],
		brancheSuivie: null
	},
	{
		etat: 'TITRE_EXECUTOIRE',
		libelle: 'Titre exécutoire',
		statut: 'A_VENIR',
		atteinteLe: null,
		branches: [],
		brancheSuivie: null
	}
];

/**
 * LES DOSSIERS ENGAGÉS — le pire cas d'abord.
 *
 * ⚠️ LE PREMIER PORTE UNE CADUCITÉ, ET LE SECOND UN ANGLE MORT. C'est le couple
 * qu'il faut voir côte à côte : une date que le logiciel COMPTE, et un délai
 * qu'il sait courir sans savoir jusqu'à quand. Un jeu où tout serait mesuré
 * cacherait précisément ce que la règle « ce que le logiciel ne voit pas
 * s'affiche aussi » existe pour montrer.
 */
export const DOSSIERS_DEMO: DossierAffiche[] = [
	{
		creanceId: 'demo-creance-martin',
		debiteur: 'Ateliers Martin',
		libelle: 'Ordonnance rendue',
		engageeLe: '2026-06-04',
		intervenant: 'SCP Reynal & Vasseur, commissaires de justice',
		prochaineEcheance: {
			libelle: 'Signification de l’ordonnance',
			dateLimite: '2026-11-28',
			gravite: 'CADUCITE',
			consequence:
				'Passé ce délai de 3 mois, l’ordonnance est caduque. La créance n’est pas éteinte, ' +
				'mais la procédure est à reprendre depuis le début, et le temps écoulé rapproche la ' +
				'prescription.'
		},
		anglesMorts: [],
		etapes: RAIL_DEMO
	},
	{
		creanceId: 'demo-creance-durand',
		debiteur: 'Fournitures Durand',
		libelle: 'Ordonnance signifiée',
		engageeLe: '2026-01-10',
		intervenant: null,
		prochaineEcheance: null,
		anglesMorts: [
			'Un délai d’opposition court depuis la signification. Sa durée n’est pas relevée dans le ' +
				'référentiel juridique de ce logiciel : cette échéance-là n’est PAS surveillée, et reste ' +
				'à vérifier auprès de l’acte signifié, qui la porte.'
		],
		etapes: RAIL_DEMO.map((etape, rang) =>
			rang === 1
				? { ...etape, statut: 'FRANCHIE' as const }
				: rang === 2
					? { ...etape, statut: 'COURANTE' as const, atteinteLe: '2026-02-10' }
					: etape
		)
	}
];
