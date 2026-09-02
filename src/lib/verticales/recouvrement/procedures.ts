import type { Montant } from '../../socle/montants';
import { ajouterJours, ajouterMois } from './calendrier';
import { PARAMETRES, estUtilisable, exiger, type ParametreLegalBase } from './parametres';
import {
	CONDITIONS_LEGALES,
	LIBELLE_CONDITION,
	type ClePiece,
	type ConditionLegale,
	type CreanceQualifiee,
	type Evaluation
} from './qualification';

/**
 * Les procédures comme modules — la décision d'architecture la plus importante
 * du projet selon le brief (§ 6).
 *
 * L'APPLICATION DOIT RESTER INDIFFÉRENTE AU DROIT APPLICABLE. Le décret
 * d'application de la procédure L.126 n'est pas publié, et le produit doit
 * fonctionner sans lui. Il doit aussi pouvoir accueillir d'autres pays plus
 * tard, sans qu'on touche au socle ni au décompte.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * DEUX CAPACITÉS DISTINCTES, ET C'EST LA CLÉ DE CE MODULE
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Le brief veut `injonction-de-payer` « opérationnelle en premier », et
 * interdit par ailleurs (règle 0.1) d'inventer une règle juridique. Les
 * MENTIONS OBLIGATOIRES d'une requête en injonction de payer n'ont pas été
 * fournies : ce sont des règles juridiques, je ne les devine pas.
 *
 * La contradiction n'est qu'apparente, et se résout en séparant :
 *
 *   - **ÉVALUER** — dire si une créance remplit les conditions, calculer son
 *     décompte, surveiller son calendrier. Disponible aujourd'hui, et c'est
 *     l'essentiel de ce qui porte l'abonnement.
 *   - **PRODUIRE L'ACTE** — écrire le document qui part au greffe. Bloqué tant
 *     que ses mentions ne sont pas fournies ET validées.
 *
 * Un module qui se déclare partiellement disponible est plus utile qu'un module
 * absent, et infiniment moins dangereux qu'un module qui produirait un acte aux
 * mentions inventées : un acte irrégulier se rejette, et le délai continue de
 * courir pendant qu'on le refait.
 */

export interface Echeance {
	readonly cle: string;
	readonly libelle: string;
	readonly dateLimite: string;
	/**
	 * `CADUCITE` : passée cette date, le droit est perdu. `INFORMATIVE` : la
	 * date structure la suite sans rien éteindre. La distinction commande
	 * l'insistance de l'alerte — tout mettre au même niveau revient à ne rien
	 * signaler.
	 */
	readonly gravite: 'CADUCITE' | 'INFORMATIVE';
	readonly consequence: string;
}

export interface Procedure {
	readonly cle: string;
	readonly nom: string;
	/** Les clés de `PARAMETRES` sans lesquelles l'acte ne peut pas être produit. */
	readonly parametresRequis: readonly string[];
	readonly piecesExigees: readonly ClePiece[];
	readonly piecesRecommandees: readonly ClePiece[];
	/** `null` quand la procédure n'en connaît pas — ce qui est le cas de L.126. */
	readonly plancherMontant: Montant | null;
	readonly plafondMontant: Montant | null;
	readonly conditionsEchec: readonly string[];
	/** La procédure peut-elle au moins être évaluée contre une créance ? */
	peutEvaluer(): boolean;
	/** Ce qui empêche de produire l'acte. Vide = rien n'empêche. */
	blocagesProductionActe(): readonly string[];
	evaluerEligibilite(creance: CreanceQualifiee): Evaluation;
	echeances(engageeLe: string): readonly Echeance[];
}

function parametre(cle: string): ParametreLegalBase | undefined {
	return (PARAMETRES as Record<string, ParametreLegalBase>)[cle];
}

/** Les clés requises qui ne sont pas utilisables, avec la raison. */
function blocages(cles: readonly string[]): string[] {
	return cles
		.filter((cle) => {
			const p = parametre(cle);
			return p === undefined || !estUtilisable(p);
		})
		.map((cle) => {
			const p = parametre(cle);
			return p === undefined
				? `« ${cle} » : paramètre absent du référentiel.`
				: `« ${cle} » : ${p.note}`;
		});
}

/**
 * L'évaluation contre les quatre conditions légales.
 *
 * LE DOUTE NE PROFITE À PERSONNE, et surtout pas au produit. Un critère
 * `unknown` empêche l'éligibilité au même titre qu'un `ko` — mais il est rangé
 * ailleurs, parce que le travail qu'il appelle est différent : un `ko` ferme le
 * dossier, un `unknown` se lève en posant une question. Les confondre
 * ferait renoncer à des créances recouvrables.
 */
function evaluerConditionsLegales(creance: CreanceQualifiee): Evaluation {
	const bloquants: ConditionLegale[] = [];
	const aDeterminer: ConditionLegale[] = [];
	const remplies: ConditionLegale[] = [];

	for (const condition of CONDITIONS_LEGALES) {
		const etat = creance[condition];
		if (etat === 'ok') remplies.push(condition);
		else if (etat === 'ko') bloquants.push(condition);
		else aDeterminer.push(condition);
	}

	// Des constats, au présent, sans destinataire ni injonction.
	const constats: string[] = [];
	if (remplies.length > 0) {
		constats.push(
			`La créance remplit ${remplies.map((c) => LIBELLE_CONDITION[c]).join(', ')}.`
		);
	}
	for (const condition of bloquants) {
		constats.push(`${LIBELLE_CONDITION[condition]} n'est pas rempli.`);
	}
	for (const condition of aDeterminer) {
		constats.push(`${LIBELLE_CONDITION[condition]} n'est pas déterminé par les pièces fournies.`);
	}

	return {
		eligible: bloquants.length === 0 && aDeterminer.length === 0,
		bloquants,
		aDeterminer,
		constats
	};
}

const injonctionDePayer: Procedure = {
	cle: 'injonction-de-payer',
	nom: 'Injonction de payer',
	// Les mentions obligatoires manquent : la requête ne peut pas être écrite.
	parametresRequis: ['mentionsObligatoiresInjonction', 'delaiSignificationInjonction'],
	piecesExigees: ['FACTURE'],
	piecesRecommandees: ['BON_DE_COMMANDE', 'BON_DE_LIVRAISON', 'CGV', 'MISE_EN_DEMEURE'],
	plancherMontant: null,
	plafondMontant: null,
	conditionsEchec: [
		"Le débiteur forme opposition dans le délai : l'affaire bascule en procédure contradictoire.",
		"L'ordonnance n'est pas signifiée dans les trois mois : elle est caduque, définitivement.",
		'Le juge rejette la requête ou ne fait droit que partiellement.'
	],
	peutEvaluer: () => true,
	blocagesProductionActe: () => blocages(injonctionDePayer.parametresRequis),
	evaluerEligibilite: evaluerConditionsLegales,
	echeances(engageeLe) {
		const mois = exiger(PARAMETRES.delaiSignificationInjonction);
		return [
			{
				cle: 'signification',
				libelle: "Signification de l'ordonnance",
				dateLimite: ajouterMois(engageeLe, mois),
				gravite: 'CADUCITE',
				consequence:
					`Passé ce délai de ${mois} mois, l'ordonnance est caduque. La créance n'est pas ` +
					`éteinte, mais la procédure est à reprendre depuis le début, et le temps écoulé ` +
					'rapproche la prescription.'
			}
		];
	}
};

const l126: Procedure = {
	cle: 'l126-creances-commerciales',
	nom: 'Procédure L.126 — créances commerciales',
	parametresRequis: [
		'tarifCommissaireJusticeL126',
		'delaiContestationL126',
		'delaiProcesVerbalNonContestation'
	],
	piecesExigees: ['FACTURE'],
	piecesRecommandees: ['BON_DE_COMMANDE', 'BON_DE_LIVRAISON', 'CGV'],
	// Confirmé comme vérifié par le brief : ni plafond ni plancher.
	plancherMontant: null,
	plafondMontant: null,
	conditionsEchec: [
		"Le débiteur conteste dans le mois : la procédure simplifiée prend fin, même si la contestation est infondée.",
		"Le commandement ne peut pas être signifié au débiteur."
	],
	/**
	 * Indisponible, et pas seulement pour produire l'acte : tant que le décret
	 * n'est pas publié, on ne sait pas ce qu'on évaluerait. Annoncer une
	 * éligibilité sur des conditions inconnues serait pire que de se taire.
	 */
	peutEvaluer: () => blocages(l126.parametresRequis).length === 0,
	blocagesProductionActe: () => blocages(l126.parametresRequis),
	evaluerEligibilite: evaluerConditionsLegales,
	echeances(engageeLe) {
		const moisContestation = exiger(PARAMETRES.delaiContestationL126);
		const joursProcesVerbal = exiger(PARAMETRES.delaiProcesVerbalNonContestation);

		// Les deux délais S'AJOUTENT : le procès-verbal se dresse huit jours
		// après l'EXPIRATION du mois, pas huit jours après la signification.
		const finContestation = ajouterMois(engageeLe, moisContestation);

		return [
			{
				cle: 'fin-contestation',
				libelle: 'Expiration du délai de contestation',
				dateLimite: finContestation,
				gravite: 'INFORMATIVE',
				consequence:
					"Jusqu'à cette date, le débiteur peut contester et mettre fin à la procédure simplifiée."
			},
			{
				cle: 'proces-verbal-possible',
				libelle: 'Procès-verbal de non-contestation possible',
				dateLimite: ajouterJours(finContestation, joursProcesVerbal),
				gravite: 'INFORMATIVE',
				consequence:
					`À partir de cette date, et pas avant, le procès-verbal peut être dressé. ` +
					`Les ${joursProcesVerbal} jours s'ajoutent au délai de contestation, ils ne s'y ` +
					'superposent pas.'
			}
		];
	}
};

const relanceAmiable: Procedure = {
	cle: 'relance-amiable',
	nom: 'Relance amiable',
	parametresRequis: [],
	piecesExigees: ['FACTURE'],
	piecesRecommandees: [],
	plancherMontant: null,
	plafondMontant: null,
	conditionsEchec: ['Le débiteur ne répond pas, ou refuse de payer.'],
	peutEvaluer: () => true,
	blocagesProductionActe: () => [],
	/**
	 * TOUJOURS ÉLIGIBLE, délibérément. C'est la sortie par défaut du brief : on
	 * ne laisse jamais un utilisateur sans action possible. Une créance dont
	 * rien n'est établi reste une créance qu'on peut réclamer amiablement.
	 *
	 * Les constats de qualification sont conservés : ils expliquent pourquoi
	 * les autres voies ne sont pas ouvertes, sans jamais recommander celle-ci.
	 */
	evaluerEligibilite(creance) {
		const analyse = evaluerConditionsLegales(creance);
		return { ...analyse, eligible: true };
	},
	echeances: () => []
};

export const PROCEDURES = {
	'injonction-de-payer': injonctionDePayer,
	'l126-creances-commerciales': l126,
	'relance-amiable': relanceAmiable
} as const;

export type CleProcedure = keyof typeof PROCEDURES;

/** Une clé inconnue lève : rendre `undefined` reporterait l'erreur plus loin. */
export function procedureParCle(cle: string): Procedure {
	const trouvee = (PROCEDURES as Record<string, Procedure | undefined>)[cle];
	if (trouvee === undefined) {
		throw new Error(
			`Procédure inconnue : « ${cle} ». Procédures disponibles : ${Object.keys(PROCEDURES).join(', ')}.`
		);
	}
	return trouvee;
}

/**
 * Les procédures envisageables pour une créance.
 *
 * NE REND JAMAIS UNE LISTE VIDE — la relance amiable en fait toujours partie.
 * C'est une exigence du brief, et c'est aussi la seule façon de ne pas laisser
 * quelqu'un devant un écran qui dit non sans dire quoi faire.
 *
 * ÉNUMÈRE, NE CLASSE PAS. Ordonner les procédures par « pertinence » reviendrait
 * à recommander la première, ce que le § 0.4 interdit.
 */
export function proceduresEnvisageables(creance: CreanceQualifiee): readonly Procedure[] {
	return Object.values(PROCEDURES).filter(
		(procedure) =>
			procedure.cle === 'relance-amiable' ||
			(procedure.peutEvaluer() && procedure.evaluerEligibilite(creance).eligible)
	);
}
