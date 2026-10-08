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
 * ⚠️ UNE CONTESTATION NE BLOQUE PLUS L'ARRÊT (décision du fondateur, 08/10/2026 :
 * « on ne devrait pas bloquer »). Un avoir ou un règlement oublié change le
 * MONTANT : le figer serait figer un chiffre faux, et ces deux cases restent à
 * cocher. Une contestation, elle, ne change aucun chiffre : le décompte constate un
 * compte à une date. Elle se DÉCLARE, s'inscrit au journal de l'arrêt, et l'arrêt se
 * fait quand même. Elle a sa propre question, hors des cases (`QUESTION_CONTESTATION`).
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
	/**
	 * L'affirmation que le gérant COCHE pour écarter le fait.
	 *
	 * ⚠️ UNE CASE, PLUS DEUX BOUTONS (01/10/2026). Chaque question portait un
	 * segment à deux choix — six cibles pour trois faits. C'est désormais la
	 * liste à cocher de Coinbase ou de World App avant un geste irréversible :
	 * trois affirmations, et le bouton reste inerte tant qu'elles ne sont pas
	 * toutes cochées. Une case non cochée est une question SANS RÉPONSE, qui ne
	 * franchit rien ; c'est la règle d'origine, tenue autrement.
	 *
	 * Court, parce qu'il tient sur UNE rangée à 393 px.
	 */
	readonly ecarter: string;
	/** Pourquoi la case compte, en une ligne : la sous-ligne de la rangée. */
	readonly pourquoi: string;
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
		pourquoi: 'Un avoir que le logiciel n’a pas lu gonflerait le total.',
		peutFaire:
			'Le décompte se calcule et se lit en entier : chaque facture, chaque période de ' +
			'pénalités, chaque centime se refait à la main. Il ne se fige pas tant qu’un avoir ' +
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
		ecarter: 'Tous les règlements importés',
		pourquoi: 'Un règlement absent ferait courir des pénalités en trop.',
		peutFaire:
			'Le décompte se calcule sur les règlements connus, et montre période par période sur ' +
			'quel principal les pénalités de retard courent.',
		constat:
			'Un règlement absent laisse courir les pénalités sur un principal déjà entamé. Le ' +
			'total arrêté serait plus élevé que ce qui reste dû, et votre client le verra s’il ' +
			'refait le calcul.',
		ceQuiLeLeve:
			'Le règlement importé à sa date, ou lettré à sa facture, fait repartir les pénalités du ' +
			'bon principal au bon jour.',
		ecarteAuJournal: 'règlement partiel non importé : écarté',
		declareAuJournal: 'règlement partiel non importé : déclaré'
	}
];

/**
 * LA CONTESTATION — une déclaration facultative, qui ne retient rien.
 *
 * Le gérant la coche s'il en a reçu une (par courrier, e-mail ou téléphone) : elle
 * s'inscrit au journal de l'arrêt, et le décompte se fige quand même. Laissée vide,
 * elle se dit « non déclarée », jamais « aucune » : le logiciel ne sait que ce qu'on
 * lui déclare.
 */
export const QUESTION_CONTESTATION = {
	cle: 'CONTESTATION_HORS_LOGICIEL' as const,
	declarer: 'Mon client conteste tout ou partie',
	pourquoi: 'Facultatif : c’est noté au journal de l’arrêt, et rien ne bloque.',
	declareAuJournal: 'contestation reçue : déclarée, l’arrêt se fait quand même',
	nonDeclareeAuJournal: 'contestation : non déclarée'
};

/** Les questions auxquelles personne n'a encore répondu. */
export function questionsSansReponse(reponses: ReponsesPrevol): readonly QuestionPrevol[] {
	return QUESTIONS_PREVOL.filter((question) => reponses[question.cle] === undefined);
}

/** Les faits que le gérant a déclarés présents. Chacun tient l'arrêt. */
export function questionsDeclarees(reponses: ReponsesPrevol): readonly QuestionPrevol[] {
	return QUESTIONS_PREVOL.filter((question) => reponses[question.cle] === 'DECLARE');
}

/**
 * Le pré-vol est franchi quand les DEUX faits qui changent le montant sont écartés.
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
	return [
		...QUESTIONS_PREVOL.map((question) => {
			const reponse = reponses[question.cle];
			if (reponse === 'ECARTE') return question.ecarteAuJournal;
			if (reponse === 'DECLARE') return question.declareAuJournal;
			const sujet = question.ecarteAuJournal.split(' : ')[0] ?? question.cle;
			return `${sujet} : sans réponse`;
		}),
		reponses.CONTESTATION_HORS_LOGICIEL === 'DECLARE'
			? QUESTION_CONTESTATION.declareAuJournal
			: QUESTION_CONTESTATION.nonDeclareeAuJournal
	].join(' ; ');
}

/** Les faits déclarés qui RETIENNENT l'arrêt : ceux qui changent le montant, seuls. */
export function declaresQuiRetiennent(reponses: ReponsesPrevol): readonly QuestionPrevol[] {
	return QUESTIONS_PREVOL.filter((question) => reponses[question.cle] === 'DECLARE');
}
