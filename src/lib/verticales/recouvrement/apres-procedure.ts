import { ajouterJours, ajouterMois } from './calendrier';
import { PARAMETRES, exiger } from './parametres';
import type { Echeance } from './procedures';

/**
 * LA MACHINE À ÉTATS POST-PROCÉDURE — module 4.5 du blueprint.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CE QU'ELLE AJOUTE À `procedures.ts`
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `Procedure.echeances(engageeLe)` calcule les délais d'une procédure engagée à
 * partir d'UNE date. C'est juste tant que rien ne s'est passé depuis.
 *
 * Après une décision, ça ne l'est plus. Une ordonnance rendue et pas encore
 * signifiée fait courir trois mois à peine de CADUCITÉ ; la même une fois
 * signifiée ne les fait plus courir du tout, et fait courir autre chose.
 * Afficher une caducité déjà évitée use la confiance ; ne pas afficher celle
 * qui court coûte le titre.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * L'ÉTAT SE REJOUE, IL NE SE STOCKE PAS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * On enregistre les ÉVÉNEMENTS — « l'ordonnance a été signifiée le 14 mars » —
 * et l'état se déduit en les rejouant. Un état stocké à côté de ses événements
 * fait deux vérités, et la divergence est invisible : rien ne casse quand un
 * état ment, il se contente d'être faux.
 *
 * C'est aussi ce qui rend le dossier auditable : « qu'est-ce qui a été fait, et
 * quand » est la question qu'on pose six mois plus tard.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LES DÉLAIS ABSENTS DU RÉFÉRENTIEL SONT NOMMÉS, JAMAIS DEVINÉS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le délai d'opposition à une ordonnance signifiée existe. Sa durée n'a été ni
 * fournie par le brief ni relevée sur une source citable — elle n'est donc
 * écrite nulle part, et surtout pas ici de mémoire. Un numéro d'article ou un
 * nombre de jours inventé est plus dangereux qu'une absence, parce qu'il a
 * l'air vérifiable.
 *
 * L'état déclare donc un ANGLE MORT, qui dit ce qui court sans dire combien.
 * Ne rien afficher laisserait croire que rien ne court, et un gérant qui croit
 * sa procédure surveillée ne la surveille pas lui-même.
 */

/** Un événement enregistré par le gérant : ce qui s'est passé, et quand. */
export interface EvenementSurvenu {
	readonly cle: string;
	/** La date du FAIT, pas celle de la saisie. Les délais courent depuis elle. */
	readonly survenuLe: string;
}

/** Une suite possible : ce qu'on peut constater depuis l'état courant. */
export interface Transition {
	readonly cle: string;
	/** Ce que le gérant a constaté, formulé comme un fait accompli. */
	readonly libelle: string;
	readonly vers: string;
}

export interface EtatProcedure {
	readonly libelle: string;
	/** Ce qui est vrai dans cet état. Un constat, jamais une consigne. */
	readonly constat: string;
	readonly transitions: readonly Transition[];
	/** Les délais qui courent DANS cet état, depuis la date d'entrée. */
	echeances(depuisLe: string): readonly Echeance[];
	/**
	 * Ce qu'on sait courir sans savoir combien de temps.
	 *
	 * Chaque phrase NOMME le délai et dit qu'il n'est pas relevé. Le paramètre
	 * manquant s'écrira dans `parametres.ts` le jour où il sera fourni, et cette
	 * liste se videra d'elle-même.
	 */
	readonly anglesMorts: readonly string[];
	/** Terminal : plus rien ne court, et rien ne s'enregistre après. */
	readonly terminal: boolean;
}

export interface MachineProcedure {
	readonly entree: string;
	readonly etats: Readonly<Record<string, EtatProcedure>>;
}

const AUCUNE_ECHEANCE: readonly Echeance[] = [];
const AUCUN_ANGLE_MORT: readonly string[] = [];

/** Un état d'arrivée dont il n'y a plus rien à dire ni à surveiller. */
function terminal(libelle: string, constat: string): EtatProcedure {
	return {
		libelle,
		constat,
		transitions: [],
		echeances: () => AUCUNE_ECHEANCE,
		anglesMorts: AUCUN_ANGLE_MORT,
		terminal: true
	};
}

/**
 * L'INJONCTION DE PAYER.
 *
 * Les états reprennent ce que `procedures.ts` énonce déjà dans ses
 * `conditionsEchec` — l'opposition qui bascule en contradictoire, la caducité
 * à trois mois. Ce module les structure ; il n'en ajoute aucun.
 */
const injonctionDePayer: MachineProcedure = {
	entree: 'REQUETE_DEPOSEE',
	etats: {
		REQUETE_DEPOSEE: {
			libelle: 'Requête déposée',
			constat: 'La requête est au greffe. Le juge statue sans débat, sur pièces.',
			transitions: [
				{
					cle: 'ordonnance-rendue',
					libelle: 'Le juge a rendu son ordonnance',
					vers: 'ORDONNANCE_RENDUE'
				},
				{
					cle: 'requete-rejetee',
					libelle: 'La requête a été rejetée, en tout ou partie',
					vers: 'REQUETE_REJETEE'
				}
			],
			// Le délai dans lequel le juge statue n'est pas un délai légal opposable :
			// il dépend de la juridiction. Rien à surveiller, et rien à inventer.
			echeances: () => AUCUNE_ECHEANCE,
			anglesMorts: AUCUN_ANGLE_MORT,
			terminal: false
		},

		ORDONNANCE_RENDUE: {
			libelle: 'Ordonnance rendue',
			constat: 'L’ordonnance existe et n’est pas encore signifiée au débiteur.',
			transitions: [
				{
					cle: 'ordonnance-signifiee',
					libelle: 'L’ordonnance a été signifiée au débiteur',
					vers: 'ORDONNANCE_SIGNIFIEE'
				}
			],
			echeances(depuisLe) {
				// ⚠️ TROIS MOIS À COMPTER DE L'ORDONNANCE, pas du dépôt de la requête.
				// C'est l'échéance la plus dangereuse du produit : passée, l'ordonnance
				// est perdue et tout est à reprendre pendant que la prescription court.
				const mois = exiger(PARAMETRES.delaiSignificationInjonction);
				return [
					{
						cle: 'signification',
						libelle: 'Signification de l’ordonnance',
						dateLimite: ajouterMois(depuisLe, mois),
						gravite: 'CADUCITE',
						consequence:
							`Passé ce délai de ${mois} mois, l’ordonnance est caduque. La créance n’est ` +
							'pas éteinte, mais la procédure est à reprendre depuis le début, et le temps ' +
							'écoulé rapproche la prescription.'
					}
				];
			},
			anglesMorts: AUCUN_ANGLE_MORT,
			terminal: false
		},

		ORDONNANCE_SIGNIFIEE: {
			libelle: 'Ordonnance signifiée',
			constat:
				'Le débiteur a reçu l’ordonnance. Un délai d’opposition court à compter de cette ' +
				'signification.',
			transitions: [
				{
					cle: 'opposition-formee',
					libelle: 'Le débiteur a formé opposition',
					vers: 'OPPOSITION'
				},
				{
					cle: 'absence-opposition-constatee',
					libelle: 'L’absence d’opposition a été constatée',
					vers: 'TITRE_EXECUTOIRE'
				}
			],
			echeances: () => AUCUNE_ECHEANCE,
			// ⚠️ L'ANGLE MORT LE PLUS COÛTEUX DE CE MODULE, et il est déclaré plutôt
			// que comblé. La durée du délai d'opposition n'a pas été fournie ; elle
			// n'est donc ni ici, ni au référentiel. La deviner de mémoire ferait
			// afficher une date fausse, que le gérant tiendrait pour surveillée.
			anglesMorts: [
				'Un délai d’opposition court depuis la signification. Sa durée n’est pas relevée dans ' +
					'le référentiel juridique de ce logiciel : cette échéance-là n’est PAS surveillée, et ' +
					'reste à vérifier auprès de l’acte signifié, qui la porte.'
			],
			terminal: false
		},

		OPPOSITION: terminal(
			'Opposition formée',
			'L’affaire bascule en procédure contradictoire. Les procédures que ce logiciel évalue ' +
				'se déroulent toutes sans débat : ce dossier sort de ce qu’il sait mesurer.'
		),

		TITRE_EXECUTOIRE: {
			libelle: 'Titre exécutoire',
			constat: 'L’ordonnance est devenue exécutoire.',
			transitions: [],
			echeances: () => AUCUNE_ECHEANCE,
			// Un titre exécutoire a lui aussi une durée de vie, et elle n'est pas au
			// référentiel. Même traitement : on la nomme, on ne la chiffre pas.
			anglesMorts: [
				'Un titre exécutoire ne se conserve pas indéfiniment. Le délai qui s’y attache n’est ' +
					'pas relevé dans le référentiel de ce logiciel : il n’est PAS surveillé.'
			],
			terminal: true
		},

		REQUETE_REJETEE: terminal(
			'Requête rejetée',
			'Le juge n’a pas fait droit à la requête, ou pas entièrement. La créance n’est pas ' +
				'éteinte ; cette voie-ci est fermée.'
		)
	}
};

/**
 * LA PROCÉDURE L.126 — créances commerciales.
 *
 * ⚠️ SES DEUX DÉLAIS S'AJOUTENT. Le procès-verbal se dresse huit jours après
 * l'EXPIRATION du mois de contestation, pas huit jours après la signification.
 * Les superposer avancerait la date de huit jours sur un procès-verbal qui
 * serait alors dressé trop tôt.
 */
const l126: MachineProcedure = {
	entree: 'ENGAGEE',
	etats: {
		// ⚠️ ON ENTRE EN ENGAGEANT, PAS EN SIGNIFIANT. Faire du commandement
		// signifié l'état d'entrée priverait cet état de sa DATE : les délais y
		// courent depuis la signification, et sans événement pour la porter ils
		// repartiraient du jour où l'on regarde. Le mois de contestation se
		// serait alors décalé à chaque ouverture de l'écran.
		ENGAGEE: {
			libelle: 'Procédure engagée',
			constat:
				'Le commandement n’est pas encore signifié. Les délais de cette procédure courent ' +
				'depuis la signification, pas depuis l’engagement.',
			transitions: [
				{
					cle: 'commandement-signifie',
					libelle: 'Le commandement a été signifié au débiteur',
					vers: 'COMMANDEMENT_SIGNIFIE'
				}
			],
			echeances: () => AUCUNE_ECHEANCE,
			anglesMorts: AUCUN_ANGLE_MORT,
			terminal: false
		},

		COMMANDEMENT_SIGNIFIE: {
			libelle: 'Commandement signifié',
			constat:
				'Le commandement a été signifié. Le débiteur peut contester, et une contestation ' +
				'met fin à la procédure simplifiée, même infondée.',
			transitions: [
				{
					cle: 'contestation-recue',
					libelle: 'Le débiteur a contesté',
					vers: 'CONTESTATION'
				},
				{
					cle: 'proces-verbal-dresse',
					libelle: 'Le procès-verbal de non-contestation a été dressé',
					vers: 'TITRE_EXECUTOIRE'
				}
			],
			echeances(depuisLe) {
				const moisContestation = exiger(PARAMETRES.delaiContestationL126);
				const joursProcesVerbal = exiger(PARAMETRES.delaiProcesVerbalNonContestation);
				const finContestation = ajouterMois(depuisLe, moisContestation);

				return [
					{
						cle: 'fin-contestation',
						libelle: 'Expiration du délai de contestation',
						dateLimite: finContestation,
						gravite: 'INFORMATIVE',
						consequence:
							'Jusqu’à cette date, le débiteur peut contester et mettre fin à la procédure ' +
							'simplifiée.'
					},
					{
						cle: 'proces-verbal-possible',
						libelle: 'Procès-verbal de non-contestation possible',
						dateLimite: ajouterJours(finContestation, joursProcesVerbal),
						gravite: 'INFORMATIVE',
						consequence:
							`À partir de cette date, et pas avant, le procès-verbal peut être dressé. Les ` +
							`${joursProcesVerbal} jours s’ajoutent au délai de contestation, ils ne s’y ` +
							'superposent pas.'
					}
				];
			},
			anglesMorts: AUCUN_ANGLE_MORT,
			terminal: false
		},

		CONTESTATION: terminal(
			'Contestation reçue',
			'La procédure simplifiée prend fin, que la contestation soit fondée ou non. Les frais ' +
				'engagés restent dus.'
		),

		TITRE_EXECUTOIRE: terminal(
			'Titre exécutoire',
			'Le procès-verbal de non-contestation a été dressé.'
		)
	}
};

export const MACHINES: Readonly<Record<string, MachineProcedure>> = {
	'injonction-de-payer': injonctionDePayer,
	'l126-creances-commerciales': l126
};

/**
 * Comment un événement se NOMME, pour le journal.
 *
 * ⚠️ LE JOURNAL NE MONTRE PAS DES CLÉS. « ordonnance-rendue » est un
 * identifiant de code ; ce qu'on relit à deux ans est « Le juge a rendu son
 * ordonnance ». Le libellé vit avec la transition qui le produit — l'écrire
 * une seconde fois côté écran ferait deux formulations du même fait.
 *
 * `null` sur une clé inconnue : un événement enregistré par une version
 * antérieure du logiciel doit rester lisible, même sans son libellé.
 */
export function libelleEvenement(cleProcedure: string, cleEvenement: string): string | null {
	const machine = MACHINES[cleProcedure];
	if (machine === undefined) return null;

	for (const etat of Object.values(machine.etats)) {
		const transition = etat.transitions.find((t) => t.cle === cleEvenement);
		if (transition !== undefined) return transition.libelle;
	}
	return null;
}

/**
 * L'état atteint après avoir rejoué les événements.
 *
 * ⚠️ UN ÉVÉNEMENT HORS SÉQUENCE EST IGNORÉ, PAS REFUSÉ. Le gérant enregistre
 * ce qu'il constate, dans l'ordre où il s'en souvient : « l'ordonnance a été
 * signifiée » peut arriver avant qu'il ait pensé à noter qu'elle était rendue.
 * Lever perdrait la saisie ; la machine reste où elle est, et l'écran montre un
 * état qui ne correspond pas — ce qui est précisément le signal utile.
 */
export function etatApres(
	machine: MachineProcedure,
	evenements: readonly EvenementSurvenu[]
): string {
	let courant = machine.entree;

	for (const evenement of evenements) {
		const etat = machine.etats[courant];
		if (etat === undefined || etat.terminal) break;

		const transition = etat.transitions.find((t) => t.cle === evenement.cle);
		if (transition !== undefined) courant = transition.vers;
	}

	return courant;
}

export interface SuiviProcedure {
	readonly etat: string;
	readonly libelle: string;
	readonly constat: string;
	/** Depuis quand on est dans cet état. L'origine des délais qui y courent. */
	readonly depuisLe: string;
	/** Triées par date : la plus proche d'abord, c'est celle qui commande. */
	readonly echeances: readonly Echeance[];
	readonly anglesMorts: readonly string[];
	/** Ce qu'on peut enregistrer ensuite, et rien d'autre. */
	readonly suites: readonly Transition[];
	readonly terminal: boolean;
}

/**
 * Le suivi complet d'une procédure, à partir de ses événements.
 *
 * ⚠️ ELLE LÈVE SUR UNE PROCÉDURE SANS MACHINE plutôt que de rendre un suivi
 * vide. Un suivi vide se lirait « rien ne court », alors que la vérité est
 * « ce logiciel ne sait pas ce qui court ». Les deux phrases n'appellent pas la
 * même conduite, et c'est toute la règle du repli silencieux.
 */
export function suivreProcedure(
	cleProcedure: string,
	evenements: readonly EvenementSurvenu[],
	/**
	 * La date d'engagement de la procédure.
	 *
	 * ⚠️ ELLE SERT D'ORIGINE TANT QU'AUCUN ÉVÉNEMENT N'A FAIT AVANCER LA MACHINE.
	 * Y mettre le jour courant ferait glisser toutes les échéances de l'état
	 * d'entrée d'un jour par jour — un délai qui recule à mesure qu'on
	 * l'approche, c'est-à-dire un délai qui ne tombe jamais.
	 */
	engageeLe: string
): SuiviProcedure {
	const machine = MACHINES[cleProcedure];
	if (machine === undefined) {
		throw new Error(
			`Aucune machine à états pour « ${cleProcedure} ». Cette procédure n’a pas d’après ` +
				'modélisé dans ce logiciel.'
		);
	}

	const cleEtat = etatApres(machine, evenements);
	const etat = machine.etats[cleEtat]!;

	// La date d'entrée dans l'état courant : celle du DERNIER événement qui a
	// réellement fait avancer la machine. Prendre le dernier événement tout court
	// ferait repartir un délai de caducité sur une saisie sans effet.
	let depuisLe = engageeLe;
	let curseur = machine.entree;
	for (const evenement of evenements) {
		const traverse = machine.etats[curseur];
		if (traverse === undefined || traverse.terminal) break;
		const transition = traverse.transitions.find((t) => t.cle === evenement.cle);
		if (transition !== undefined) {
			curseur = transition.vers;
			depuisLe = evenement.survenuLe;
		}
	}

	return {
		etat: cleEtat,
		libelle: etat.libelle,
		constat: etat.constat,
		depuisLe,
		echeances: [...etat.echeances(depuisLe)].sort((a, b) =>
			a.dateLimite < b.dateLimite ? -1 : a.dateLimite > b.dateLimite ? 1 : 0
		),
		anglesMorts: etat.anglesMorts,
		suites: etat.transitions,
		terminal: etat.terminal
	};
}
