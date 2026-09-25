import type { Montant } from '../../socle/montants';
import { PARAMETRES, estUtilisable, type ParametreLegalBase } from './parametres';
import type { ClePiece } from './qualification';

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
 *   - **MONTRER** — lire les pièces, calculer le décompte, surveiller le
 *     calendrier, et mettre les conditions du texte en face du dossier. Le
 *     logiciel ne conclut pas : c'est le gérant qui qualifie (relecture du
 *     25/09/2026). Disponible aujourd'hui, et c'est l'essentiel de ce qui porte
 *     l'abonnement.
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
	 * Le jour où le délai aurait fini sans le report au premier jour ouvrable
	 * (code de procédure civile, 642). Absent quand il n'y a pas eu de report.
	 */
	readonly reporteeDe?: string;
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
	/** Le logiciel connaît-il assez cette voie pour la montrer et en suivre les délais ? */
	peutEvaluer(): boolean;
	/** Ce qui empêche de produire l'acte. Vide = rien n'empêche. */
	blocagesProductionActe(): readonly string[];
	/**
	 * La machine à états qui décrit ce qui se passe APRÈS l'engagement.
	 *
	 * ⚠️ CE MODULE NE CALCULE PLUS AUCUN DÉLAI LUI-MÊME. Il portait une méthode
	 * `echeances(engageeLe)` qui recalculait les mêmes bornes que la machine, à
	 * partir d'une seule date — et cette date était ambiguë : les trois mois de
	 * signification courent depuis l'ORDONNANCE, pas depuis l'engagement.
	 *
	 * Elle n'était appelée par aucun écran, seulement par ses propres tests :
	 * septième occurrence dans ce dépôt d'un code écrit, testé, et jamais
	 * consommé. Deux calculs du même délai légal finissent par diverger, et le
	 * plus dangereux des deux est celui que personne ne regarde.
	 *
	 * `null` quand la procédure n'a pas d'après modélisé — la relance amiable
	 * n'a ni décision ni délai qui en découle.
	 */
	readonly machine: string | null;
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
		"L'ordonnance n'est pas signifiée dans le délai légal : elle est non avenue, et tout est à refaire.",
		'Le juge rejette la requête ou ne fait droit que partiellement.'
	],
	peutEvaluer: () => true,
	blocagesProductionActe: () => blocages(injonctionDePayer.parametresRequis),
	machine: 'injonction-de-payer'
};

const l126: Procedure = {
	cle: 'l126-creances-commerciales',
	nom: 'Procédure L.126, créances commerciales',
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
		'Le débiteur conteste dans le mois : la procédure simplifiée prend fin, même si la contestation est infondée.',
		'Le commandement ne peut pas être signifié au débiteur.'
	],
	/**
	 * Indisponible, et pas seulement pour produire l'acte : tant que le décret
	 * n'est pas publié, on ne sait pas ce qu'on évaluerait. Annoncer une
	 * éligibilité sur des conditions inconnues serait pire que de se taire.
	 */
	peutEvaluer: () => blocages(l126.parametresRequis).length === 0,
	blocagesProductionActe: () => blocages(l126.parametresRequis),
	machine: 'l126-creances-commerciales'
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
	// Aucune décision, donc aucun délai qui en découle. `null` le DIT, là où un
	// tableau vide se lirait « rien ne court » sur une procédure qui en aurait.
	machine: null
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
 * Les voies que le logiciel sait montrer et suivre.
 *
 * ⚠️ ELLE NE TRIE PLUS SELON LES CONDITIONS. Elle écartait une voie dont une
 * condition manquait : c'était dire à la place du gérant que sa créance ne la
 * permettait pas, une qualification juridique. Toutes les voies connues sont
 * montrées, avec ce que dit la loi ; le gérant choisit, et un avocat peut lui
 * répondre sur ce qui s'applique à son cas.
 *
 * NE REND JAMAIS UNE LISTE VIDE — la relance amiable en fait toujours partie.
 *
 * ÉNUMÈRE, NE CLASSE PAS. Ordonner les procédures par « pertinence » reviendrait
 * à recommander la première, ce que le § 0.4 interdit.
 */
export function proceduresEnvisageables(): readonly Procedure[] {
	return Object.values(PROCEDURES).filter((procedure) => procedure.peutEvaluer());
}
