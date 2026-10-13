import { DELAI_POUR_RETENIR_MS } from '../plan-relance';

/**
 * PLUME EN DIRECT — ce qu'il fait EN CE MOMENT, dit au-dessus de la barre (14/10/2026).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI : « QU'ON SENTE LE CÔTÉ FIABLE DU COMPAGNON »
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le fondateur : « il faut que le compagnon rassure l'utilisateur et l'accompagne
 * tout le temps, en automatique ». Plume travaillait sans qu'on le voie hors de
 * l'accueil, et une relance pouvait partir à votre nom pendant que vous étiez sur
 * une fiche client, sans que rien ne le dise à l'écran. Relevé sur Mobbin (14/10) :
 * le mini-lecteur d'Apple Music au-dessus de la barre d'onglets, l'activité en direct
 * de Flighty (« départ dans 2 h 58 »), la barre « Transcription en cours » de Notion,
 * le « Annuler ce paiement » de Monzo et son anneau qui se vide.
 *
 * Une CAPSULE se pose donc au-dessus de la barre, sur tous les écrans, tant qu'il se
 * passe quelque chose :
 *
 *   1. Plume TRAVAILLE : le titre de son travail, l'étape en cours, et l'anneau qui
 *      se remplit à mesure que les étapes se cochent ;
 *   2. une relance PART BIENTÔT : à qui, à quelle heure, dans combien de minutes,
 *      l'anneau qui se vide, et « Retenir » sous le pouce.
 *
 * Sinon, rien : Plume veille dans son bouton. Une capsule qui dirait « tout va
 * bien » en permanence serait du décor ; celle-ci n'existe que quand il y a quelque
 * chose à voir.
 *
 * ⚠️ LE TEMPS VIENT DE L'APPELANT. Ce module ne lit pas l'horloge : il reçoit
 * `maintenant`, et le composant le fait avancer chaque minute. Une requête Convex ne
 * le peut pas (son résultat ne se recalcule pas quand le temps passe).
 */

/** Une relance que le pilote a programmée, telle que la base la rend. */
export interface RelanceProgrammee {
	readonly envoiId: string;
	readonly client: string;
	readonly clientId: string;
	/** Le nom de l'étape du plan : « Rappel », « Deuxième rappel », « Lettre officielle ». */
	readonly etape: string;
	readonly partiraLe: number;
}

export interface TravailEnCours {
	/** Au présent, à la troisième personne : « Relit votre dépôt ». */
	readonly titre: string;
	/** L'étape qui se fait : « Ouvre le dossier de Durand ». */
	readonly etape: string | null;
	readonly faites: number;
	readonly total: number;
}

export type EnDirect =
	| {
			readonly genre: 'TRAVAIL';
			readonly titre: string;
			readonly ligne: string;
			/** De 0 à 1 : l'anneau se remplit. */
			readonly part: number;
	  }
	| {
			readonly genre: 'DEPART';
			readonly titre: string;
			readonly ligne: string;
			/** De 0 à 1 : ce qui reste de l'heure où elle se retient. L'anneau se vide. */
			readonly part: number;
			/**
			 * Plusieurs partent dans l'heure : « Retenir » ne dirait pas laquelle, la capsule
			 * mène à la page de Plume, où chacune a le sien.
			 */
			readonly plusieurs: boolean;
			readonly envoiId: string;
			readonly client: string;
			readonly clientId: string;
	  };

/**
 * L'HEURE OÙ UNE RELANCE SE MONTRE : une heure avant son départ, comme le pilote
 * la programme (`DELAI_POUR_RETENIR_MS`). Plus tôt, elle attend dans « Part bientôt »
 * sur la page de Plume.
 */
export const FENETRE_DU_DEPART_MS = DELAI_POUR_RETENIR_MS;

/** Une relance encore programmée après son heure part dans l'instant : on la montre encore. */
const RETARD_TOLERE_MS = 5 * 60_000;

/** « dans 23 min », « dans 1 h », « dans un instant ». */
export function dansCombien(ms: number): string {
	const minutes = Math.ceil(ms / 60_000);
	if (minutes <= 1) return 'dans un instant';
	if (minutes < 60) return `dans ${minutes} min`;
	return 'dans 1 h';
}

/** « deuxième rappel » : le nom de l'étape au milieu d'une phrase. */
function minuscule(texte: string): string {
	return texte.charAt(0).toLowerCase() + texte.slice(1);
}

/**
 * CE QUE LA CAPSULE MONTRE, OU RIEN.
 *
 * ⚠️ LE DÉLAI EN TITRE, LE CLIENT DESSOUS (relevé à 375 px). « Deuxième rappel à
 * Fournitures Durand » se coupait avant le nom du client. Comme Flighty (« départ
 * dans 2 h 58 », la porte dessous), le titre dit QUAND, en peu de mots ; la ligne
 * dit À QUI d'abord, pour que ce soit le client qui reste quand elle se coupe.
 *
 * ⚠️ LE TRAVAIL PASSE DEVANT. Il dure quelques secondes (une étape toutes les
 * 0,7 s) et c'est souvent lui qui programme la relance d'après : on le voit faire,
 * puis la capsule passe à ce qu'il a programmé.
 */
export function enDirect(args: {
	readonly maintenant: number;
	readonly travail: TravailEnCours | null;
	readonly programmees: readonly RelanceProgrammee[];
	/** « 14 h 30 » : l'heure de Paris, formatée par l'appelant. */
	readonly heure: (instant: number) => string;
}): EnDirect | null {
	const { maintenant, travail } = args;
	if (travail !== null && travail.total > 0) {
		const faites = Math.min(travail.faites, travail.total);
		return {
			genre: 'TRAVAIL',
			titre: travail.titre,
			ligne:
				travail.etape === null
					? `Étape ${Math.min(faites + 1, travail.total)} sur ${travail.total}`
					: `${travail.etape} · ${Math.min(faites + 1, travail.total)} sur ${travail.total}`,
			part: faites / travail.total
		};
	}
	const proches = [...args.programmees]
		.filter(
			(p) =>
				p.partiraLe - maintenant <= FENETRE_DU_DEPART_MS &&
				maintenant - p.partiraLe <= RETARD_TOLERE_MS
		)
		.sort((a, b) => a.partiraLe - b.partiraLe);
	const premiere = proches[0];
	if (premiere === undefined) return null;
	const reste = Math.max(0, premiere.partiraLe - maintenant);
	const autres = proches.length - 1;
	const derniere = proches.at(-1) ?? premiere;
	return {
		genre: 'DEPART',
		titre:
			autres === 0
				? `Relance ${dansCombien(reste)}`
				: `${autres + 1} relances d’ici ${args.heure(derniere.partiraLe)}`,
		ligne:
			autres === 0
				? `${premiere.client} · ${minuscule(premiere.etape)} à ${args.heure(premiere.partiraLe)}`
				: `${premiere.client} la première, ${dansCombien(reste)}`,
		part: Math.min(1, reste / FENETRE_DU_DEPART_MS),
		plusieurs: autres > 0,
		envoiId: premiere.envoiId,
		client: premiere.client,
		clientId: premiere.clientId
	};
}
