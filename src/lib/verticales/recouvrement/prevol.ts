/**
 * LE PRÉ-VOL DE L'ARRÊT : LES TROIS CHOSES QUE LE LOGICIEL NE PEUT PAS VOIR.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POURQUOI TROIS QUESTIONS, ET PAS ZÉRO
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La première règle d'écran du projet interdit de demander une saisie que le
 * logiciel peut déduire. Ces trois-ci ne se déduisent d'aucune donnée : un
 * avoir jamais importé, un règlement encaissé sur un compte que rien ne lit,
 * une contestation arrivée par téléphone. Elles ne sont pas ABSENTES de la
 * base, elles sont INVISIBLES pour elle, et la différence est tout le sujet.
 *
 * ⚠️ LE DOUTE NE PROFITE JAMAIS AU PRODUIT. Une question sans réponse compte
 * comme un obstacle, jamais comme un feu vert : l'arrêt est irréversible, et
 * « personne n'a répondu » n'est pas « il n'y en a pas ».
 *
 * ⚠️ AUCUNE DES TROIS N'EST UNE QUESTION DE DROIT. Elles portent sur des FAITS
 * que le gérant connaît et que la base ignore. Rien ici n'a d'article, rien ici
 * ne se calcule : ce module ne touche à aucune valeur juridique, et c'est
 * pourquoi il peut vivre hors de `parametres.ts`.
 *
 * ⚠️ LES QUATRE PARTIES D'UN REFUS VIVENT ICI, SAUF LA QUATRIÈME (D0). Ce que
 * le produit peut faire tout de suite, ce qui manque, ce qui le lève : ces
 * trois-là sont les mêmes quel que soit le dossier. Ce que l'attente coûte
 * dépend de la créance ouverte, se chiffre en jours de prescription, et se
 * compose donc là où cette date est connue.
 */

export type ClePrevol =
	/** Un avoir émis au client et jamais importé. */
	| 'AVOIR_NON_RAPPROCHE'
	/** Un règlement partiel reçu et jamais importé. */
	| 'REGLEMENT_NON_IMPORTE'
	/** Une contestation arrivée par un canal que le logiciel ne lit pas. */
	| 'CONTESTATION_HORS_LOGICIEL';

/** Le gérant écarte le fait, ou le déclare. Rien d'autre, et surtout pas « peut-être ». */
export type ReponsePrevol = 'ECARTE' | 'DECLARE';

export type ReponsesPrevol = Partial<Record<ClePrevol, ReponsePrevol>>;

export interface QuestionPrevol {
	readonly cle: ClePrevol;
	readonly question: string;
	/** Le libellé du choix qui écarte le fait. */
	readonly ecarter: string;
	/** Le libellé du choix qui le déclare. */
	readonly declarer: string;
	/** Première partie du refus : ce que le produit fait tout de suite. */
	readonly peutFaire: string;
	/** Deuxième partie : ce qui manque, au constat. */
	readonly constat: string;
	/** Troisième partie : ce qui le lève, au constat et jamais à l'impératif. */
	readonly ceQuiLeLeve: string;
	/** Ce que le journal retient quand le fait est écarté. */
	readonly ecarteAuJournal: string;
	/** Ce que le journal retiendrait si le fait était déclaré. */
	readonly declareAuJournal: string;
}

export const QUESTIONS_PREVOL: readonly QuestionPrevol[] = [
	{
		cle: 'AVOIR_NON_RAPPROCHE',
		question: 'Un avoir émis à ce client, que ce décompte ne connaît pas ?',
		ecarter: 'Aucun avoir à déduire',
		declarer: 'Il en existe un',
		peutFaire:
			'Le décompte se calcule et se lit en entier : chaque facture, chaque période ' +
			'd’intérêts, chaque centime se refait à la main. Il ne se fige pas tant qu’un avoir ' +
			'déclaré n’est pas déduit.',
		constat:
			'Un avoir que le logiciel n’a jamais lu ne diminue pas le principal qu’il calcule. Le ' +
			'total arrêté serait plus élevé que ce qui reste réellement dû.',
		ceQuiLeLeve:
			'L’avoir importé avec les factures de ce client, ou rapproché à la facture qu’il ' +
			'annule, ramène le principal à son montant réel.',
		ecarteAuJournal: 'avoir non rapproché : écarté',
		declareAuJournal: 'avoir non rapproché : déclaré'
	},
	{
		cle: 'REGLEMENT_NON_IMPORTE',
		question: 'Un règlement partiel reçu et non importé ?',
		ecarter: 'Tout ce qui est reçu est importé',
		declarer: 'Un règlement manque',
		peutFaire:
			'Le décompte se calcule sur les règlements connus, et montre période par période sur ' +
			'quel principal les intérêts courent.',
		constat:
			'Un règlement absent laisse courir les intérêts sur un principal déjà entamé. Le total ' +
			'arrêté serait plus élevé que ce qui reste dû, et le débiteur qui refait le calcul le ' +
			'verra.',
		ceQuiLeLeve:
			'Le règlement importé à sa date, ou lettré à sa facture, fait repartir les intérêts du ' +
			'bon principal au bon jour.',
		ecarteAuJournal: 'règlement partiel non importé : écarté',
		declareAuJournal: 'règlement partiel non importé : déclaré'
	},
	{
		cle: 'CONTESTATION_HORS_LOGICIEL',
		question: 'Une contestation reçue hors du logiciel ?',
		ecarter: 'Aucune contestation reçue',
		declarer: 'Une contestation est arrivée',
		peutFaire:
			'Le décompte se calcule et se lit en entier. Il constate un compte arrêté à une date, ' +
			'et rien de plus.',
		constat:
			'Le logiciel ne connaît que ce qui lui est déclaré : l’absence de contestation CONNUE ' +
			'n’est pas une absence de contestation. Une contestation arrivée par un autre canal ne ' +
			'figure nulle part dans ce qu’il chiffre.',
		ceQuiLeLeve:
			'La date à laquelle cette contestation a été sue, portée quelque part que le logiciel ' +
			'lit. Tant que rien ne la porte, il chiffre comme si elle n’existait pas.',
		ecarteAuJournal: 'contestation hors du logiciel : écartée',
		declareAuJournal: 'contestation hors du logiciel : déclarée'
	}
];

/** Les questions auxquelles personne n'a encore répondu. */
export function questionsSansReponse(reponses: ReponsesPrevol): readonly QuestionPrevol[] {
	return QUESTIONS_PREVOL.filter((question) => reponses[question.cle] === undefined);
}

/** Les faits que le gérant a déclarés présents. Chacun tient l'arrêt. */
export function questionsDeclarees(reponses: ReponsesPrevol): readonly QuestionPrevol[] {
	return QUESTIONS_PREVOL.filter((question) => reponses[question.cle] === 'DECLARE');
}

/**
 * Le pré-vol est franchi quand les TROIS faits sont écartés.
 *
 * ⚠️ PAS « aucun n'est déclaré ». Une question laissée sans réponse ne franchit
 * rien : c'est la même règle que `unknown` dans les conditions de qualification,
 * et pour la même raison.
 */
export function prevolFranchi(reponses: ReponsesPrevol): boolean {
	return QUESTIONS_PREVOL.every((question) => reponses[question.cle] === 'ECARTE');
}

/**
 * Ce que le journal retient du pré-vol, en toutes lettres.
 *
 * Il entre dans l'entrée d'arrêt, et pas dans une entrée à lui : la question
 * n'est pas « qu'a-t-on coché » mais « sur quelles déclarations ce décompte
 * a-t-il été figé ».
 */
export function prevolAuJournal(reponses: ReponsesPrevol): string {
	return QUESTIONS_PREVOL.map((question) => {
		const reponse = reponses[question.cle];
		if (reponse === 'ECARTE') return question.ecarteAuJournal;
		if (reponse === 'DECLARE') return question.declareAuJournal;
		const sujet = question.ecarteAuJournal.split(' : ')[0] ?? question.cle;
		return `${sujet} : sans réponse`;
	}).join(' ; ');
}
