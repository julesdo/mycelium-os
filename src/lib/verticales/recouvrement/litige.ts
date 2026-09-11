import type { EtatCritere } from './qualification';

/**
 * LA QUALIFICATION DE LITIGE — module 3.2 du blueprint.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QU'IL REMPLACE : UNE QUESTION QU'AUCUN GÉRANT NE POUVAIT RÉPONDRE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * L'écran de créance demandait « Pouvez-vous confirmer le caractère certain de
 * cette créance ? ». C'est une notion de droit, posée à quelqu'un dont ce n'est
 * pas le métier, et dont la réponse ouvre des procédures non contradictoires
 * où la moindre contestation — même infondée — met fin à tout en laissant les
 * frais engagés.
 *
 * Le blueprint le dit en une phrase : « recueille un fait et ne conseille
 * rien ». C'est exactement la frontière que ce module tient.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LA RÉPARTITION DU TRAVAIL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le gérant fournit ce qu'il est SEUL à savoir : ce que son client lui a écrit,
 * refusé, réclamé. Six questions qui se répondent en regardant sa boîte mail et
 * ses bons de livraison.
 *
 * Le logiciel en tire ce qui relève de lui : le critère `certaine` des quatre
 * conditions légales, et l'état litigieux du dossier.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ IL NE MESURE PAS LE SÉRIEUX D'UNE CONTESTATION, ET LE DIT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Une créance est certaine si elle n'est pas SÉRIEUSEMENT contestée.
 * Apprécier le sérieux est un travail de juriste. Le produit constate qu'une
 * contestation existe, cesse de retenir le caractère certain, et écrit cette
 * abstention dans son constat — parce qu'un gérant qui lit « le caractère
 * certain n'est pas retenu » sans cette phrase comprend un verdict là où il n'y
 * a qu'un refus de trancher.
 *
 * C'est aussi l'issue prudente. Retenir le caractère certain malgré une
 * contestation connue ferait engager des frais sur un dossier qui se retourne ;
 * le contraire fait seulement attendre.
 */

/** Ce que le gérant peut répondre. « Je ne sais pas » est une vraie réponse. */
export type Reponse = 'OUI' | 'NON' | 'INCONNU';

export type CleFait =
	| 'CONTESTATION_ECRITE'
	| 'REFUS_RECEPTION'
	| 'AVOIR_RECLAME'
	| 'PENALITES_OPPOSEES'
	| 'INSTANCE_EN_COURS'
	| 'RECONNAISSANCE_ECRITE';

export interface QuestionFait {
	readonly cle: CleFait;
	/**
	 * La question, telle qu'elle se pose. Un fait observable, jamais une
	 * qualification — un test balaie ce champ à la recherche de « certain »,
	 * « sérieux » et leurs voisins.
	 */
	readonly question: string;
	/** Ce que la réponse change, en clair. Le gérant sait ce qu'il engage. */
	readonly portee: string;
	/**
	 * Vrai quand un « oui » constitue une contestation CONNUE.
	 *
	 * La reconnaissance de dette est la seule question qui ne l'est pas : elle
	 * va dans l'autre sens, et elle ne conditionne rien.
	 */
	readonly signeDeLitige: boolean;
}

/**
 * Les six faits, dans l'ordre où ils se posent.
 *
 * L'ORDRE N'EST PAS NEUTRE : le premier est de très loin le plus fréquent, et
 * une réponse positive arrête le questionnaire. Dans le cas qui compte — le
 * client conteste — le gérant répond à UNE question.
 */
export const QUESTIONS_LITIGE: readonly QuestionFait[] = [
	{
		cle: 'CONTESTATION_ECRITE',
		question:
			'Ce client vous a-t-il écrit pour contester cette facture — courrier, e-mail, ou réserve portée sur un bon de livraison ?',
		portee:
			'Une contestation écrite fait sortir le dossier des procédures listées ici, qui se déroulent toutes sans débat.',
		signeDeLitige: true
	},
	{
		cle: 'REFUS_RECEPTION',
		question: 'A-t-il refusé tout ou partie de la marchandise ou de la prestation ?',
		portee:
			'Un refus porte sur ce qui est dû, pas sur le paiement : il touche le montant lui-même.',
		signeDeLitige: true
	},
	{
		cle: 'AVOIR_RECLAME',
		question: 'Vous a-t-il réclamé un avoir que vous n’avez pas émis ?',
		portee: 'Un avoir réclamé et non émis est un désaccord ouvert sur le montant.',
		signeDeLitige: true
	},
	{
		cle: 'PENALITES_OPPOSEES',
		question: 'Vous a-t-il opposé des pénalités, une note de débit ou une retenue ?',
		portee:
			'Une retenue opposée est une créance qu’il invoque contre la vôtre. Les deux se répondent.',
		signeDeLitige: true
	},
	{
		cle: 'INSTANCE_EN_COURS',
		question: 'Une procédure judiciaire est-elle déjà en cours entre vous, sur cette relation ?',
		portee: 'Une instance ouverte occupe le terrain : le dossier n’est plus seul devant un juge.',
		signeDeLitige: true
	},
	{
		cle: 'RECONNAISSANCE_ECRITE',
		question:
			'Vous a-t-il confirmé par écrit qu’il devait cette somme — échéancier, promesse de paiement, accusé de dette ?',
		portee:
			'Cet écrit est une pièce du dossier. Il ne remplace aucune des réponses précédentes et n’en efface aucune.',
		signeDeLitige: false
	}
];

/** Les réponses recueillies. Une clé absente est une question non posée. */
export type Reponses = Partial<Record<CleFait, Reponse>>;

export interface LectureLitige {
	/**
	 * Le critère légal `certaine`, déduit des faits et de rien d'autre.
	 *
	 * `ko` dès qu'un fait de litige est connu ; `ok` seulement quand les CINQ
	 * sont expressément écartés ; `unknown` tant qu'il en reste un en l'air.
	 */
	readonly certaine: EtatCritere;
	/** Vrai dès qu'un fait de litige est établi. Ferme les procédures listées. */
	readonly litigieux: boolean;
	readonly faitsOpposes: readonly CleFait[];
	/** Les faits de litige laissés sans réponse, ou répondus « je ne sais pas ». */
	readonly faitsIndetermines: readonly CleFait[];
	/** Des constats, au présent, sans destinataire ni injonction. */
	readonly constats: readonly string[];
}

/**
 * Les cinq faits qui constituent une contestation connue.
 *
 * Le tuple est la source : `FaitDeLitige` s'en déduit, et `SignalContestation`
 * dans `scoring.ts` l'accueille tel quel. Une clé ajoutée ici devient donc un
 * signal de contestation sans autre geste — et le compilateur réclame sa
 * description.
 */
export const FAITS_DE_LITIGE = [
	'CONTESTATION_ECRITE',
	'REFUS_RECEPTION',
	'AVOIR_RECLAME',
	'PENALITES_OPPOSEES',
	'INSTANCE_EN_COURS'
] as const satisfies readonly CleFait[];

export type FaitDeLitige = (typeof FAITS_DE_LITIGE)[number];

/**
 * Ce qu'un fait établi dit du dossier — un CONSTAT, au présent.
 *
 * ⚠️ CES PHRASES SORTENT DU MODULE. `scoring.ts` les affiche comme description
 * de risque, et l'écran de créance comme constat. Les dupliquer ailleurs ferait
 * un second endroit où le produit parle de la situation d'un client.
 */
export const DESCRIPTIONS_FAITS_LITIGE: Record<FaitDeLitige, string> = {
	CONTESTATION_ECRITE: 'Ce client a contesté la facture par écrit.',
	REFUS_RECEPTION: 'Ce client a refusé tout ou partie de ce qui lui a été livré.',
	AVOIR_RECLAME: 'Ce client réclame un avoir qui n’a pas été émis.',
	PENALITES_OPPOSEES: 'Ce client oppose des pénalités, une note de débit ou une retenue.',
	INSTANCE_EN_COURS: 'Une procédure judiciaire est en cours entre les deux parties.'
};

const CONSTAT_PAR_FAIT: Record<CleFait, string> = {
	...DESCRIPTIONS_FAITS_LITIGE,
	RECONNAISSANCE_ECRITE: 'Ce client a reconnu la dette par écrit.'
};

function question(cle: CleFait): QuestionFait {
	// `QUESTIONS_LITIGE` couvre toutes les clés du type : la recherche aboutit
	// toujours. L'assertion tient parce que les deux sont dans ce fichier — si
	// une clé s'ajoutait sans sa question, `CONSTAT_PAR_FAIT` lèverait d'abord
	// au compilateur.
	return QUESTIONS_LITIGE.find((q) => q.cle === cle)!;
}

/**
 * Les signaux de contestation que ces déclarations produisent.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ SIXIÈME OCCURRENCE DU DÉFAUT « DÉCLARÉ, LU, JAMAIS ALIMENTÉ »
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `ElementsCreance.signauxContestation` est lu par `qualifier()`, qui en fait
 * des risques de gravité BLOQUANTE — et son propre commentaire l'appelle « le
 * risque produit numéro un ». Les DEUX seuls appelants lui passaient `[]` écrit
 * en dur. Le risque numéro un ne pouvait donc jamais se déclencher.
 *
 * Ce module est ce qui manquait : il n'existait aucune saisie d'où un signal
 * aurait pu venir. Les cinq autres signaux de `scoring.ts` attendent, eux,
 * l'extracteur de preuves — ils viendront des documents, pas d'une déclaration.
 * Les deux familles coexistent, et leur provenance se lit dans leur nom.
 */
export function signauxDepuisFaits(reponses: Reponses): readonly FaitDeLitige[] {
	return FAITS_DE_LITIGE.filter((cle) => reponses[cle] === 'OUI');
}

/**
 * Ce que les réponses établissent.
 *
 * ⚠️ « PERSONNE N'A RIEN DIT » ET « LE GÉRANT DÉCLARE QUE RIEN DE TOUT ÇA N'A
 * EU LIEU » NE SONT PAS LE MÊME ÉTAT, et c'est tout l'apport de ce module.
 *
 * `deduction.ts` pose `certaine: 'unknown'` en toutes circonstances, avec une
 * raison juste : l'absence de contestation CONNUE n'est pas une absence de
 * contestation, et rien dans une facture ne dit qu'elle n'est pas contestée.
 *
 * Un gérant qui écarte les cinq faits un par un produit exactement ce qui
 * manquait : une absence de contestation connue, déclarée par le seul témoin
 * possible. Ce module est donc la seule chose du produit qui ait le droit de
 * faire passer `certaine` à `ok` — et il ne le fait que là.
 */
export function lireLitige(reponses: Reponses): LectureLitige {
	const faitsOpposes = FAITS_DE_LITIGE.filter((cle) => reponses[cle] === 'OUI');
	const faitsIndetermines = FAITS_DE_LITIGE.filter((cle) => {
		const r = reponses[cle];
		return r === undefined || r === 'INCONNU';
	});

	const litigieux = faitsOpposes.length > 0;
	const constats: string[] = [];

	if (litigieux) {
		for (const cle of faitsOpposes) constats.push(CONSTAT_PAR_FAIT[cle]);

		// ⚠️ L'AVEU, ET IL EST OBLIGATOIRE. Sans lui, « le caractère certain n'est
		// pas retenu » se lit comme un verdict sur la valeur de la créance. C'est
		// une abstention : le produit ne sait pas dire si la contestation tient.
		constats.push(
			'Le caractère certain n’est donc pas retenu. Le logiciel ne mesure pas si cette ' +
				'contestation est sérieuse — c’est une appréciation juridique, et il s’en abstient.'
		);

		// Le blueprint : « une réponse positive ferme les procédures simplifiées ».
		// Ici c'est un constat sur ce que le produit ÉVALUE, pas un conseil sur ce
		// qu'il resterait à faire — cette phrase-là serait du conseil juridique.
		constats.push(
			'Les procédures que ce logiciel évalue se déroulent toutes sans débat contradictoire : ' +
				'une contestation y met fin, même infondée, et les frais engagés restent dus. Ce ' +
				'dossier sort de ce que le logiciel sait mesurer.'
		);
	} else if (faitsIndetermines.length > 0) {
		constats.push(
			`Le caractère certain reste indéterminé : ${faitsIndetermines.length} ` +
				`${faitsIndetermines.length > 1 ? 'faits ne sont pas renseignés' : 'fait n’est pas renseigné'}.`
		);
	} else {
		constats.push(
			'Aucune contestation connue : les cinq faits ont été expressément écartés. Le caractère ' +
				'certain est retenu sur cette déclaration.'
		);
	}

	if (reponses.RECONNAISSANCE_ECRITE === 'OUI') {
		constats.push(CONSTAT_PAR_FAIT.RECONNAISSANCE_ECRITE);

		// ⚠️ CE QUE LE LOGICIEL NE VOIT PAS S'AFFICHE AUSSI. Une reconnaissance de
		// dette produit des effets sur le délai de prescription. La règle exacte
		// n'a été ni relevée sur une source citable ni validée par un juriste :
		// elle n'est donc écrite nulle part dans le référentiel, et le compteur de
		// prescription l'ignore.
		//
		// L'ignorer va dans le sens prudent — le délai retenu reste le plus court,
		// donc l'alerte arrive plus tôt. Mais un gérant qui croit sa prescription
		// repoussée par cet écrit ne la surveille pas lui-même. On le dit.
		constats.push(
			'Cet écrit est enregistré comme une pièce du dossier. Il n’entre PAS dans le calcul ' +
				'du délai de prescription, qui continue de courir depuis l’échéance de la facture.'
		);
	}

	return {
		certaine: litigieux ? 'ko' : faitsIndetermines.length > 0 ? 'unknown' : 'ok',
		litigieux,
		faitsOpposes,
		faitsIndetermines,
		constats
	};
}

/**
 * Les questions qu'il reste à poser.
 *
 * ⚠️ ELLE S'ARRÊTE DÈS QU'UN LITIGE EST ÉTABLI. « Le logiciel décide, le gérant
 * confirme » : une fois la contestation connue, les questions suivantes ne
 * changent plus ni le critère, ni l'état du dossier. Les poser ferait dépenser
 * la seule ressource vraiment rare — l'attention du gérant — pour zéro
 * information.
 */
export function questionsRestantes(reponses: Reponses): readonly QuestionFait[] {
	if (FAITS_DE_LITIGE.some((cle) => reponses[cle] === 'OUI')) return [];

	return QUESTIONS_LITIGE.filter((q) => {
		const r = reponses[q.cle];
		return r === undefined || r === 'INCONNU';
	}).map((q) => question(q.cle));
}
