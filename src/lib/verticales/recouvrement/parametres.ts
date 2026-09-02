/**
 * Les paramètres juridiques du recouvrement — la seule source de vérité.
 *
 * RÈGLE ABSOLUE (0.1 du brief de remodelage) : aucune valeur juridique n'est
 * écrite en dur ailleurs. Ni un taux, ni un délai, ni un seuil, ni un montant.
 * Une valeur qui n'est pas ici n'existe pas.
 *
 * UNE VALEUR NON VALIDÉE NE PEUT PAS SERVIR. `exiger()` lève. Elle ne retombe
 * pas sur zéro, pas sur une valeur par défaut, pas sur la dernière connue :
 * un décompte amputé d'un poste est un décompte qui a l'air juste, et ce qui
 * n'est pas chiffré dans un acte exécutoire est définitivement perdu.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * DEUX ARBITRAGES PRIS EN LISANT LE BRIEF, À RATIFIER PAR JULES
 * ─────────────────────────────────────────────────────────────────────────
 *
 * 1. LE BRIEF SE CONTREDIT SUR QUATRE ENTRÉES. Le § 4.1 les range d'abord
 *    parmi les valeurs « à créer avec `value: null` », puis les redonne juste
 *    en dessous parmi celles « que je peux te confirmer comme vérifié (à
 *    recopier avec `verified: true`) » : l'indemnité forfaitaire, le délai de
 *    contestation L.126, le délai du procès-verbal de non-contestation et le
 *    délai de signification de l'injonction de payer.
 *
 *    La seconde liste l'emporte : elle est plus spécifique, postérieure, et
 *    porte une instruction explicite. Ces quatre entrées sont donc `verifie:
 *    true`. Si c'est l'inverse qui était voulu, il suffit de basculer le
 *    booléen — rien d'autre ne bougera, et tout ce qui en dépend se déclarera
 *    indisponible de lui-même.
 *
 * 2. LES ARTICLES SOURCES N'ONT PAS ÉTÉ FOURNIS. Le brief donne des valeurs
 *    (« 40 euros par facture ») sans citer les textes qui les fondent. La
 *    règle 0.1 interdit de deviner ce qui manque — et cette interdiction vaut
 *    pour la SOURCE autant que pour la valeur : un numéro d'article inventé de
 *    mémoire, recopié dans un courrier au débiteur, est plus dangereux qu'une
 *    source absente, parce qu'il a l'air vérifiable.
 *
 *    `source` cite donc le brief, et chaque `note` réclame l'article. C'est
 *    tracable, et c'est faux nulle part.
 */

/** L'unité d'un paramètre. Un délai en mois n'est pas un délai en jours. */
export type Unite = 'centimes' | 'jours' | 'mois' | 'annees' | 'sans';

/**
 * La forme commune à tous les paramètres, quel que soit le type de leur valeur.
 *
 * Elle existe parce qu'un montant se porte en `bigint` et un délai en `number` :
 * sans ce type de base, toute fonction qui PARCOURT les paramètres — les lister,
 * dire lesquels manquent — buterait sur une union que TypeScript ne sait pas
 * unifier, et l'inspection deviendrait impossible à écrire sans `any`.
 */
export interface ParametreLegalBase {
	/** Le nom qui apparaît dans le message d'erreur quand il manque. */
	readonly cle: string;
	readonly valeur: unknown;
	readonly unite: Unite;
	/** L'article ou le texte. Jamais deviné. */
	readonly source: string;
	/** Date ISO de la dernière vérification. */
	readonly verifieLe: string;
	/** `false` par défaut. Seule une validation par un avocat le passe à `true`. */
	readonly verifie: boolean;
	readonly note: string;
}

export interface ParametreLegal<T> extends ParametreLegalBase {
	/** `null` tant que la valeur n'a pas été fournie. */
	readonly valeur: T | null;
}

/** Tous les paramètres, sous leur forme inspectable. */
export function tousLesParametres(): readonly ParametreLegalBase[] {
	return Object.values(PARAMETRES);
}

const BRIEF = 'Brief de remodelage du 2026-09-02, § 4.1 — article source non fourni';
const LE = '2026-09-02';

const ARTICLE_A_FOURNIR =
	"L'article qui fonde cette valeur reste à renseigner. La valeur est tenue pour vérifiée sur " +
	'la foi du brief, mais un courrier au débiteur doit pouvoir citer son texte.';

export const PARAMETRES = {
	// ── Ce qui manque, et qui bloque le décompte ────────────────────────────

	tauxInteretLegalDefaut: {
		cle: 'tauxInteretLegalDefaut',
		valeur: null,
		unite: 'sans',
		source: BRIEF,
		verifieLe: LE,
		verifie: false,
		note:
			"Taux d'intérêt de retard applicable en l'absence de stipulation contractuelle. " +
			'À fournir par Jules après validation par un avocat. SANS CETTE VALEUR, aucun décompte ' +
			"n'est calculable sur une facture dont les CGV ne stipulent pas de taux."
	} satisfies ParametreLegal<bigint>,

	tauxInteretMinimalLegal: {
		cle: 'tauxInteretMinimalLegal',
		valeur: null,
		unite: 'sans',
		source: BRIEF,
		verifieLe: LE,
		verifie: false,
		note:
			"Plancher légal du taux d'intérêt de retard. Sert à refuser un taux contractuel " +
			'qui lui serait inférieur. À fournir par Jules après validation par un avocat.'
	} satisfies ParametreLegal<bigint>,

	delaiPrescriptionCommerciale: {
		cle: 'delaiPrescriptionCommerciale',
		valeur: null,
		unite: 'annees',
		source: BRIEF,
		verifieLe: LE,
		verifie: false,
		note:
			'Délai de prescription en matière commerciale. À fournir par Jules après validation ' +
			"par un avocat. Sans lui, la surveillance ne peut pas alerter sur l'approche de la " +
			'prescription (phase 6 du brief).'
	} satisfies ParametreLegal<number>,

	tarifCommissaireJusticeL126: {
		cle: 'tarifCommissaireJusticeL126',
		valeur: null,
		unite: 'centimes',
		source: 'Décret d’application de la procédure L.126 — NON PUBLIÉ à ce jour',
		verifieLe: LE,
		verifie: false,
		note:
			"Le brief indique explicitement de laisser null : le décret n'est pas publié. " +
			"Le module l126-creances-commerciales doit se déclarer indisponible tant qu'il " +
			"n'est pas renseigné."
	} satisfies ParametreLegal<bigint>,

	mentionsObligatoiresInjonction: {
		cle: 'mentionsObligatoiresInjonction',
		valeur: null,
		unite: 'sans',
		source: 'Non fourni — ni par le brief, ni par ailleurs',
		verifieLe: LE,
		verifie: false,
		note:
			"Les mentions que doit porter une requête en injonction de payer. Ce sont des règles " +
			"juridiques : la règle 0.1 interdit de les deviner, et une requête aux mentions " +
			'inventées est PIRE que pas de requête du tout — elle se fait rejeter, et le délai ' +
			"continue de courir pendant qu'on la refait. Tant que cette entrée est vide, la " +
			"procédure peut évaluer une créance mais pas produire l'acte.",
		} satisfies ParametreLegal<readonly string[]>,

	// ── Ce que le brief confirme comme vérifié ──────────────────────────────

	indemniteForfaitaire: {
		cle: 'indemniteForfaitaire',
		valeur: 4000n,
		unite: 'centimes',
		source: BRIEF,
		verifieLe: LE,
		verifie: true,
		note: `Indemnité forfaitaire pour frais de recouvrement : 40 € PAR FACTURE, jamais par créance. ${ARTICLE_A_FOURNIR}`
	} satisfies ParametreLegal<bigint>,

	delaiContestationL126: {
		cle: 'delaiContestationL126',
		valeur: 1,
		unite: 'mois',
		source: BRIEF,
		verifieLe: LE,
		verifie: true,
		note: `Un mois à compter de la signification du commandement. Le point de départ est la SIGNIFICATION, pas l'émission. ${ARTICLE_A_FOURNIR}`
	} satisfies ParametreLegal<number>,

	delaiProcesVerbalNonContestation: {
		cle: 'delaiProcesVerbalNonContestation',
		valeur: 8,
		unite: 'jours',
		source: BRIEF,
		verifieLe: LE,
		verifie: true,
		note: `Le procès-verbal peut être dressé au plus tôt huit jours APRÈS L'EXPIRATION du délai d'un mois de contestation — les deux délais s'ajoutent, ils ne se recouvrent pas. ${ARTICLE_A_FOURNIR}`
	} satisfies ParametreLegal<number>,

	delaiSignificationInjonction: {
		cle: 'delaiSignificationInjonction',
		valeur: 3,
		unite: 'mois',
		source: BRIEF,
		verifieLe: LE,
		verifie: true,
		note: `Trois mois SOUS PEINE DE CADUCITÉ, pour les ordonnances rendues à compter du 1er septembre 2026. C'est l'échéance la plus dangereuse du produit : passée, l'ordonnance est perdue. ${ARTICLE_A_FOURNIR}`
	} satisfies ParametreLegal<number>
} as const;

/** Un paramètre est utilisable s'il porte une valeur ET qu'elle est validée. */
export function estUtilisable(parametre: ParametreLegalBase): boolean {
	return parametre.verifie && parametre.valeur !== null;
}

/**
 * La valeur d'un paramètre, ou une erreur qui dit quoi faire.
 *
 * C'est le seul accès autorisé. Lire `.valeur` directement contourne la
 * barrière, et le décompte produirait un `null` traité comme zéro quelque part
 * en aval — exactement le mode de défaillance que la règle 0.1 interdit.
 */
export function exiger<T>(parametre: ParametreLegal<T>): T {
	if (parametre.valeur === null) {
		throw new Error(
			`Paramètre juridique « ${parametre.cle} » sans valeur : le calcul est impossible. ` +
				`La valeur doit être fournie par Jules et validée par un avocat avant tout usage. ` +
				`Note : ${parametre.note}`
		);
	}
	if (!parametre.verifie) {
		throw new Error(
			`Paramètre juridique « ${parametre.cle} » non vérifié : sa valeur est connue mais ` +
				`n'a pas été validée par un avocat, et ne peut donc pas servir à un décompte ` +
				`opposable. Source déclarée : ${parametre.source}`
		);
	}
	return parametre.valeur;
}

/**
 * Les clés des paramètres inutilisables, pour qu'un module de procédure puisse
 * se déclarer indisponible AVANT qu'un utilisateur ne s'engage — plutôt que
 * d'échouer au moment de produire l'acte.
 */
export function parametresManquants(): string[] {
	return tousLesParametres()
		.filter((parametre) => !estUtilisable(parametre))
		.map((parametre) => parametre.cle);
}
