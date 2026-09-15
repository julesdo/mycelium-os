import type {
	EtapeAffichee,
	EvenementAffiche,
	FicheIntervenant,
	RepertoireAffiche,
	ResultatAnnuaireAffiche,
	ResultatAvocatsAffiche,
	VoieAffichee
} from '../../ui';
import { MACHINES, etapesDeLaVoie } from '../../lib/verticales/recouvrement/apres-procedure';
import type { ConditionsDeduites } from '../../lib/verticales/recouvrement/deduction';
import {
	PROCEDURES,
	proceduresEnvisageables,
	type Procedure
} from '../../lib/verticales/recouvrement/procedures';
import type { EtatCritere } from '../../lib/verticales/recouvrement/qualification';
import { secteursProposes } from '../../screens/debiteur-detail';

/**
 * LES FIXTURES COMMUNES DE LA SALLE D'EXPOSITION.
 *
 * Celles-ci traversent plusieurs familles d'écrans, ou sont montrées telles
 * quelles par une démonstration de composant dans `routes/showroom.tsx`. Les
 * fixtures propres à une seule famille vivent avec elle (`onglets.tsx`,
 * `creance.tsx`, `procedure.tsx`, `debiteurs.tsx`, `import.tsx`, `reglages.tsx`,
 * `abonnement.tsx`, `equipe.tsx`, `donnees.tsx`). Une famille qui dérive ses
 * données d'une autre les importe de celle-ci : les données tirent de l'équipe
 * leur compte connecté, et l'équipe tire ses places de l'abonnement.
 *
 * ⚠️ CE FICHIER NE GROSSIT PLUS. Il dépasse trois cents lignes : un jeu partagé
 * de plus prend son propre fichier, comme la révélation et son bilan
 * (`revelation.ts`) et les dépôts (`depots.ts`).
 */

/** L'entreprise du gérant, telle que ses réglages la déclarent. */
interface EtablissementDemo {
	readonly nom: string;
	readonly siren: string;
	readonly adresse: string;
	/** Déclarée sur la page du créancier, jamais devinée. */
	readonly estCommercant: EtatCritere;
	readonly facturesParAn: number;
}

/**
 * L'ÉTABLISSEMENT DE LA SALLE : L'ENTREPRISE DU GÉRANT, ET IL N'Y EN A QU'UN.
 *
 * ⚠️ CE N'EST PAS UN DÉBITEUR, et il ne porte le nom d'aucun. Sous le nom d'un
 * débiteur, la salle présenterait le client du gérant comme sa propre
 * entreprise.
 *
 * La famille créance le nomme sur les relances qu'elle compose. La famille des
 * réglages le montre sur ses pages : son identité, son volume de factures et le
 * profil de créancier que le gérant enregistre. La famille de l'abonnement en
 * tire le palier. Aucune famille n'écrit ailleurs son nom, son SIREN, son
 * adresse ni son volume.
 *
 * ⚠️ SA QUALITÉ DE COMMERÇANT NE VAUT QU'UNE FOIS SON PROFIL ENREGISTRÉ. `'ok'`
 * est ce qu'il déclare en enregistrant son profil de créancier, et seules les
 * variantes « profil enregistré » de la famille des réglages la lisent. Sans
 * profil enregistré, elle est indéterminée : la page du créancier se replie sur
 * `'unknown'`, et la famille créance, qui ne lit aucun profil, écrit la sienne à
 * `'unknown'` (`CREANCIER_COMMERCANT_DEMO`), que son litige vide répond `'ok'`.
 */
export const ETABLISSEMENT_DEMO: EtablissementDemo = {
	nom: 'Thumbbb Agency',
	siren: '502592959',
	adresse: '12 rue des Ateliers, 75011 Paris',
	estCommercant: 'ok',
	facturesParAn: 420
};

/**
 * LES SECTEURS, TELS QUE LA FICHE DU DÉBITEUR LES PROPOSE.
 *
 * ⚠️ ILS SE CALCULENT, ILS NE SE RECOPIENT PLUS. La salle écrivait à la main
 * « Prescription : 5 ans », « 1 an », « 2 ans » : une seconde vérité sur les
 * durées du référentiel, que la règle la plus stricte du projet interdit, salle
 * comprise. `DemoIdentite` et la famille des débiteurs les montrent toutes deux.
 */
export const SECTEURS_DEMO = secteursProposes();

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

/** Une voie telle que `creanceComplete` la rend : avec `suivie`, que la feuille ne lit pas. */
export type VoieDeLaCreance = VoieAffichee & { readonly suivie: boolean };

/**
 * UNE VOIE, TELLE QUE `creanceComplete` LA REND.
 *
 * Reprise de `src/lib/convex/recouvrement/lecture.ts`, lignes 514, 515 et 605 à
 * 632 : envisageable sur les seules conditions et évaluable, suivie si une
 * machine décrit son après, ses blocages et ses étapes lus dans le domaine. Les
 * clés envisageables ne dépendent que des conditions : les calculer pour chaque
 * voie rend ce que la requête rend en les calculant une fois.
 *
 * ⚠️ RIEN N'Y EST ÉCRIT À LA MAIN. `VOIE_DEMO` écrivait `disponible: true` et
 * `blocages: []`, et cachait ainsi le seul blocage réel de l'injonction : ses
 * mentions obligatoires, que le référentiel ne fournit pas encore.
 */
export function voieDeLaCreance(
	procedure: Procedure,
	conditions: ConditionsDeduites
): VoieDeLaCreance {
	const clesEnvisageables = new Set(
		proceduresEnvisageables({ ...conditions, piecesFournies: [] }).map(
			(envisageable) => envisageable.cle
		)
	);

	return {
		cle: procedure.cle,
		nom: procedure.nom,
		disponible: clesEnvisageables.has(procedure.cle) && procedure.peutEvaluer(),
		suivie: procedure.machine !== null,
		blocages: [...procedure.blocagesProductionActe()],
		etapes:
			procedure.machine === null || MACHINES[procedure.machine] === undefined
				? []
				: etapesDeLaVoie(procedure.machine).map((etape) => ({
						etat: etape.etat,
						libelle: etape.libelle,
						constat: etape.constat
					})),
		conditionsEchec: [...procedure.conditionsEchec]
	};
}

/**
 * LA VOIE DE DEMONSTRATION VIENT DU DOMAINE, PAS D'UNE COPIE.
 *
 * ⚠️ RECOPIER LES QUATRE LIBELLES ICI FERAIT DEUX FORMULATIONS DU MEME FAIT, et
 * la salle d'exposition montrerait alors une procédure qui n'est plus celle du
 * produit. `apres-procedure.ts` le dit déjà de son côté : le libellé vit avec la
 * transition qui le produit. Une salle qui ment sur ce qu'on vient y regarder
 * est pire qu'une salle vide.
 *
 * L'injonction de payer, et pas L.126 : c'est la voie complète — quatre étapes
 * sur la ligne, trois façons d'échouer — donc celle qui met la feuille à
 * l'épreuve sur les quatre largeurs de référence.
 */
export const VOIE_DEMO: VoieAffichee = voieDeLaCreance(PROCEDURES['injonction-de-payer'], {
	// Les quatre conditions acquises : la rangée de `DemoVoie` dit la voie
	// « Envisageable », et le domaine ne la rend envisageable qu'ainsi.
	certaine: 'ok',
	liquide: 'ok',
	exigible: 'ok',
	entreCommercants: 'ok'
});

/**
 * LE CARNET DE LA SALLE — deux fiches, deux rôles, et « Moi-même » choisi.
 *
 * ⚠️ DEUX RÔLES DIFFÉRENTS EXPRÈS. C'est ce qui met le sous-titre à l'épreuve :
 * « Commissaire de justice · Bobigny » est la chaîne la plus longue que cette
 * carte ait à porter, et c'est sur 375 px qu'elle se casse, pas sur 1280.
 */
export const CARNET_DEMO: readonly FicheIntervenant[] = [
	{ _id: 'fiche-avocat', nom: 'Cabinet Perrin', role: 'AVOCAT', ressort: 'Paris' },
	{
		_id: 'fiche-commissaire',
		nom: 'Étude Lemoine',
		role: 'COMMISSAIRE_DE_JUSTICE',
		ressort: 'Bobigny'
	}
];

/**
 * TROIS ÉTUDES DE DÉMONSTRATION — ET CE SONT DE VRAIES.
 *
 * Relevées le 12 septembre 2026 en interrogeant l'API Recherche d'entreprises
 * sur le département 44, qui en rend vingt-deux. Des données inventées auraient
 * caché ce que la vraie réponse a de particulier : des dénominations en
 * capitales, parfois doublées d'un sigle, et une adresse de siège qui n'est pas
 * toujours dans le département cherché.
 */
export const ETUDES_DEMO: ResultatAnnuaireAffiche = {
	departement: '44',
	total: 22,
	etudes: [
		{
			siren: '921924908',
			// ⚠️ L'APOSTROPHE EST DROITE, ET LE NOM EST DOUBLÉ. C'est le registre qui
			// écrit ainsi ; le redresser en apostrophe courbe ou retirer les
			// parenthèses reviendrait à faire répéter à la salle d'exposition une
			// dénomination que la source ne porte pas — exactement ce que l'écran
			// s'interdit de faire avec les vraies réponses.
			nom: "COMMISSAIRES DE L'OUEST (COMMISSAIRES DE L'OUEST) (CDOUEST)",
			commune: 'NANTES',
			codePostal: '44100',
			adresse: '14 BOULEVARD WINSTON CHURCHILL 44100 NANTES'
		},
		{
			siren: '883711400',
			nom: 'MOCAER, CLAVIERE, VIOTTI',
			commune: 'NORT-SUR-ERDRE',
			codePostal: '44390',
			adresse: "5 RUE D'ANJOU 44390 NORT-SUR-ERDRE"
		},
		{
			siren: '911195980',
			nom: 'SOLUTIONS HUISSIER',
			commune: 'SAINT-NAZAIRE',
			codePostal: '44600',
			adresse: '5 RUE DES TROENES 44600 SAINT-NAZAIRE'
		}
	],
	source:
		'Registre des entreprises (API Recherche d’entreprises, DINUM), filtré sur la convention ' +
		'collective 3250 et l’activité 69.10Z. Ce n’est pas le tableau de la profession : une étude ' +
		'qui n’a pas déclaré sa convention collective n’y figure pas, et une radiation disciplinaire ' +
		'n’y figure pas non plus. Le filtre de département porte sur les établissements, pas sur le ' +
		'siège : une étude dont le siège est ailleurs peut remonter.',
	releveeLe: '2026-09-12'
};

/**
 * LE RÉPERTOIRE DE LA SALLE — DE VRAIS BARREAUX, EN NOMBRE RÉDUIT.
 *
 * Relevés le 12 septembre 2026 dans la livraison du 17 juillet 2026 de
 * l'annuaire national des avocats. La livraison réelle en porte plus de cent
 * cinquante ; vingt suffisent à mettre la liste déroulante et sa recherche à
 * l'épreuve, et les noms sont écrits comme le fichier les écrit — en capitales,
 * sans accent, et parfois sous le nom du DÉPARTEMENT plutôt que de la ville
 * (« CHARENTE », « VAL DE MARNE »). Les redresser ferait afficher à la salle
 * des libellés que la source ne porte pas.
 */
export const BARREAUX_DEMO: RepertoireAffiche = {
	barreaux: [
		'AGEN',
		'ALBERTVILLE',
		'ALES',
		'ARDENNES',
		'ARRAS',
		'AUXERRE',
		'BEAUVAIS',
		'BESANCON',
		'BLOIS',
		'BORDEAUX',
		'BOURGES',
		'BRIEY',
		'CARPENTRAS',
		'CHALON-SUR-SAONE',
		'CHARENTE',
		'COLMAR',
		'HAUTE-MARNE',
		'LOT',
		'MEUSE',
		'VAL DE MARNE'
	],
	complete: true,
	releveeLe: '2026-07-17'
};

/**
 * TROIS AVOCATS DE DÉMONSTRATION — ET CE SONT DE VRAIS.
 *
 * Relevés le 12 septembre 2026 dans la livraison du 17 juillet 2026, au barreau
 * de Bordeaux, qui en compte 2 214. Des fiches inventées auraient caché ce que
 * le vrai fichier a de particulier, et chacune des trois est ici pour une
 * raison :
 *
 *   · ANDREAU n'a PAS de SIREN — le fichier laisse la colonne vide sur nombre
 *     de fiches. La rangée retombe alors sur la raison sociale, au lieu
 *     d'afficher un tiret qui se lirait comme une valeur ;
 *   · BALTAZAR porte une seconde ligne d'adresse (« 2ème étage »), recollée à
 *     la première par l'import ;
 *   · BERTRAND déclare deux spécialités, dont la plus longue du référentiel du
 *     CNB — c'est sur 375 px qu'elle casse la rangée, pas sur 1280.
 *
 * ⚠️ LA LISTE EST VOLONTAIREMENT TRONQUÉE : trois fiches affichées, 2 214 qui
 * correspondent. C'est l'état qu'on vient vérifier à l'œil — celui où la liste
 * doit DIRE qu'elle est incomplète, faute de quoi elle ment par le silence.
 *
 * ⚠️ ET `specialitesDeclarees` NE PORTE QUE CELLES DU TRIO, pour la même
 * raison : la salle montre une tranche, et la liste de filtres d'une tranche
 * est celle de cette tranche.
 */
export const AVOCATS_DEMO: ResultatAvocatsAffiche = {
	barreau: 'BORDEAUX',
	specialite: null,
	total: 2214,
	lectureTronquee: false,
	specialitesDeclarees: [
		'Droit de la sécurité sociale et de la protection sociale',
		'Droit des sociétés',
		'Droit du travail',
		'Droit fiscal et droit douanier',
		'Droit public'
	],
	avocats: [
		{
			nom: 'ANDREAU',
			prenom: 'Pierre',
			raisonSociale: 'FIDUCIAIRE SAINT JOSEPH',
			adresse: '9 Cours de Gourgues',
			codePostal: '33000',
			ville: 'BORDEAUX',
			specialites: ['Droit des sociétés', 'Droit fiscal et droit douanier']
		},
		{
			nom: 'BALTAZAR',
			prenom: 'Marie-Christine',
			raisonSociale: 'BALTAZAR MARIE-CHRISTINE',
			siren: '502005747',
			adresse: '12 rue Elisée Reclus, 2ème étage',
			codePostal: '33000',
			ville: 'BORDEAUX',
			specialites: ['Droit public']
		},
		{
			nom: 'BERTRAND',
			prenom: 'Stéphanie',
			raisonSociale: 'STEPHANIE BERTRAND AVOCAT',
			siren: '832397772',
			adresse: '4 rue de la Maison Daurade',
			codePostal: '33000',
			ville: 'BORDEAUX',
			specialites: ['Droit de la sécurité sociale et de la protection sociale', 'Droit du travail']
		}
	],
	source:
		'Annuaire national des avocats (Conseil national des barreaux), publié sur data.gouv.fr sous ' +
		'Licence Ouverte 2.0. C’est une photographie mensuelle : une fiche peut décrire une situation ' +
		'périmée — un avocat qui a changé de barreau, déménagé, ou cessé d’exercer depuis le relevé. ' +
		'Les spécialités sont celles que l’avocat a DÉCLARÉES au fichier : leur absence ne dit pas ' +
		'qu’il n’en a aucune, elle dit qu’aucune n’est inscrite.',
	releveeLe: '2026-07-17'
};
