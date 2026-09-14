import type { AccueilAffiche } from '../../screens/accueil';
import type { CreanceAffichee } from '../../screens/creance';
import type { DossierAffiche } from '../../screens/procedures';
import {
	ceQuiManque,
	travauxDuVeilleur,
	type EtapeAffichee,
	type EvenementAffiche
} from '../../ui';
import { pyramideDePreuves } from '../../lib/verticales/recouvrement/solidite';
import { questionsRestantes } from '../../lib/verticales/recouvrement/litige';

/**
 * LES DONNÉES DE DÉMONSTRATION DE LA SALLE D'EXPOSITION.
 *
 * Déplacées depuis `routes/showroom.tsx`, pour que le registre des écrans du
 * produit (`-salle/ecrans.tsx`) et la salle elle-même puissent toutes les deux
 * s'en servir sans dépendre l'une de l'autre.
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

/**
 * L'ACCUEIL, DANS SES DEUX ÉTATS, ET C'EST TOUTE LA RAISON DE CES DEUX ENTRÉES.
 *
 * Le défaut qu'on corrige était qu'il en avait DEUX FORMES : un écran garni, et
 * une page d'accueil vide qui ne lui ressemblait pas. Les regarder côte à côte
 * dans la salle d'exposition est le seul moyen de vérifier qu'ils sont bien le
 * même écran — même hero, même rangée d'actions, même géométrie — et que seule
 * la carte du bas change.
 */
export const ACCUEIL_DEMO: AccueilAffiche = {
	// 48 320,55 € : un montant à cinq chiffres avec des centimes non nuls, parce
	// que c'est le pire cas typographique du hero — l'espace de groupement, la
	// virgule et les deux petits chiffres doivent tenir sur une ligne à 375 px.
	total: 4_832_055n,
	nombreFactures: 7,
	interetsCourusDepuisHier: 274n,
	// ⚠️ LES TROIS PARTS SOMMENT EXACTEMENT AU TOTAL. Une donnée de
	// démonstration qui ne boucle pas est pire qu'absente : elle laisse passer
	// une barre dont les segments ne correspondent pas au chiffre du hero, et
	// c'est précisément le défaut que ce composant existe pour empêcher.
	//   4 500 015 + 304 040 + 28 000 = 4 832 055
	// L'indemnité vaut 7 × 40 € — une par facture en retard, ce qui la relie au
	// `nombreFactures` juste au-dessus.
	parts: { principal: 4_500_015n, interets: 304_040n, indemnites: 28_000n },
	evenements: EVENEMENTS_DEMO,
	hypotheses: [
		"Le secteur de Ateliers Martin n'est pas déterminé : la prescription est calculée sur le délai le plus court (1 an). Préciser le secteur lèvera cette hypothèse."
	],
	anglesMorts: [],
	surveillance: { etat: 'NORMAL' },
	/**
	 * ⚠️ DEUX RANGÉES, ET ELLES NE SE RESSEMBLENT PAS. La démonstration doit
	 * montrer le veilleur dans ses deux régimes à la fois : un dépôt qui TOURNE
	 * EN CE MOMENT — la seule ligne animée de toute l'application — et un relevé
	 * de la nuit qui porte la phrase exacte de la machine.
	 *
	 * C'est la seule façon de vérifier au regard que le pouls se distingue sans
	 * emprunter une couleur de seuil, et que « rien de nouveau, rien de
	 * critique » se lit comme un travail fait plutôt que comme un écran vide.
	 */
	travaux: travauxDuVeilleur({
		battement: {
			jour: '2026-09-11',
			statut: 'TU',
			raison: 'rien de nouveau, rien de critique',
			termineLe: Date.UTC(2026, 8, 11, 6, 12)
		},
		depotsEnCours: [
			{ id: 'demo-depot', filename: 'export-comptable-aout.csv', etape: 'lecture de 412 lignes' }
		],
		// Une trouvaille, et une seule : elles sont rares par construction.
		// Seul ce qui fait perdre un droit sans qu on ait rien fait en produit une.
		trouvailles: [
			{
				id: 'demo-notif',
				titre: 'Prescription proche',
				message: 'La facture FA-2021-0087 sera prescrite le 2026-10-14, dans 32 jours.',
				lien: '/app/debiteurs?d=demo-debiteur'
			}
		],
		aujourdHui: '2026-09-11'
	}),
	/**
	 * DEUX VERROUS SUR TROIS, et le plus coûteux en tête.
	 *
	 * ⚠️ CELUI DU PROFIL CRÉANCIER EST LE PLUS SILENCIEUX DU PRODUIT : sans lui,
	 * la condition « entre commerçants » reste indéterminée et l'éligibilité à
	 * l'injonction de payer n'est JAMAIS acquise. L'écran de créance affichait
	 * cette condition non remplie sans jamais dire d'où venait le blocage — et
	 * la salle d'exposition doit montrer l'état où le défaut se voyait.
	 */
	verrous: ceQuiManque({
		profilCreancierComplet: false,
		nombreFactures: 7,
		debiteursSansSiren: 4
	}),
	/**
	 * ⚠️ « CE QUI COURT » APPARAÎT ICI, ET NULLE PART DANS L'ÉTAT VIERGE. C'est
	 * la seule façon de vérifier au regard que la section se tait quand elle est
	 * vide : les deux accueils se regardent côte à côte, et le bloc doit être
	 * absent d'un et présent dans l'autre — pas présent et à zéro.
	 */
	dossiers: DOSSIERS_DEMO
};

/** Le premier jour : tout est à zéro, et RIEN ne disparaît pour autant. */
export const ACCUEIL_VIERGE: AccueilAffiche = {
	total: 0n,
	nombreFactures: 0,
	interetsCourusDepuisHier: 0n,
	parts: { principal: 0n, interets: 0n, indemnites: 0n },
	evenements: [],
	hypotheses: [],
	anglesMorts: [],
	surveillance: { etat: 'NORMAL' },
	/**
	 * ⚠️ LE PREMIER JOUR, LE VEILLEUR PARLE QUAND MÊME — et il dit la vérité,
	 * qui est qu'il n'a pas encore tourné. C'est l'application de la règle « le
	 * vide montre le chemin » au travail de fond : un bloc absent apprendrait au
	 * gérant que son absence est normale, et le jour où il manque parce que la
	 * machine est tombée, plus rien ne le distinguerait d'un jour calme.
	 */
	travaux: travauxDuVeilleur({
		battement: null,
		depotsEnCours: [],
		aujourdHui: '2026-09-11'
	}),
	/**
	 * ⚠️ VIDE, ET C'EST JUSTE. Au premier jour, la carte de démarrage porte déjà
	 * « importez vos factures », seule à l'écran et avec le seul faisceau de
	 * l'application. Répéter la même consigne dans une seconde carte est le plus
	 * sûr moyen de n'en faire lire aucune — l'écran ne montre donc les verrous
	 * qu'une fois la première facture entrée.
	 */
	verrous: [],
	/** Rien d'engagé : la section « Ce qui court » ne doit pas exister du tout. */
	dossiers: []
};

/**
 * LA CRÉANCE, AVEC UNE PROCÉDURE COLLECTIVE, DÉLIBÉRÉMENT.
 *
 * C'est le cas qui rend la rangée du débiteur indispensable : le radar l'a
 * relevée au registre pendant la nuit, elle a fait baisser le score affiché
 * juste au-dessus, et l'écran doit montrer l'état où ce défaut se voyait.
 */
const PYRAMIDE_DEMO = pyramideDePreuves(['FACTURE', 'BON_DE_COMMANDE']);

export const CREANCE_DEMO: CreanceAffichee = {
	debiteur: 'Fournitures Durand',
	debiteurId: 'demo-debiteur',
	/**
	 * ⚠️ UNE PROCÉDURE COLLECTIVE DANS LA DÉMONSTRATION, délibérément.
	 *
	 * C'est le cas qui rend la rangée du débiteur indispensable : le radar
	 * l'a relevée au registre pendant la nuit, elle a fait baisser le score
	 * affiché juste au-dessus, et jusqu'ici l'écran n'en disait rien. La
	 * salle d'exposition doit montrer l'état où le défaut se voyait, pas
	 * celui où il ne se voyait pas.
	 */
	santeDebiteur: 'PROCEDURE_COLLECTIVE',
	score: 0.65,
	eligible: false,
	principalRestantDu: 1_200_000n,
	factures: [{ _id: 'f1' }, { _id: 'f2' }],
	questions: [
		{ condition: 'entreCommercants', libelle: 'Les deux parties sont-elles commerçantes ?' }
	],
	litige: {
		litigieux: false,
		constats: [],
		questions: questionsRestantes({ CONTESTATION_ECRITE: 'NON' }).map((q) => ({ cle: q.cle }))
	},
	risques: [{ type: 'RETARDS_REPETES', gravite: 'MOYENNE' }],
	solidite: { etablies: PYRAMIDE_DEMO.etablies, attendues: PYRAMIDE_DEMO.attendues },
	relances: [
		{ niveau: 1, disponible: true },
		{ niveau: 2, disponible: false },
		{ niveau: 3, disponible: false }
	],
	procedures: [
		{ cle: 'relance-amiable', disponible: true },
		{ cle: 'injonction-de-payer', disponible: false }
	],
	regimePrescriptionNote: 'Régime général : cinq ans à compter de l’exigibilité. Secteur déterminé.'
};
