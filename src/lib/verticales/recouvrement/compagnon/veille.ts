import { pluriel } from '../../../socle/francais';
import { JOURS_DE_GRACE } from '../parole';
import { DELAI_POUR_RETENIR_MS, HEURES_D_ENVOI } from '../plan-relance';

/**
 * LA MAISON DE PLUME — son état en une phrase, et ce qu'il s'engage à faire
 * (14/10/2026).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI : LA CONFIANCE SE DONNE À CE QUI DIT CE QU'IL FAIT, ET CE QU'IL NE FAIT PAS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le fondateur : « qu'on sente le côté fiable du compagnon, il ne faut pas que ce
 * soit cheap ». Relevé sur Mobbin (14/10) : le centre de sécurité de Chime (« vous
 * êtes en bonne forme », puis ce qui est en place), l'épargne automatique de
 * Wealthfront (chaque règle écrite en clair avant de l'activer, « modifiable à tout
 * moment »), Noom (« je ne donne pas d'avis médical ») et la fiche de Mo chez Alan.
 *
 * La page de Plume s'ouvre donc sur sa MAISON : où il en est en une phrase
 * (« Tout est en ordre », « 3 choses attendent votre feu vert »), trois faits
 * vérifiables (sa dernière relecture, les dossiers suivis, si les relances partent
 * seules), sa journée, et ses ENGAGEMENTS — ce qu'il fait, ce qu'il ne fait jamais.
 *
 * ⚠️ UN ENGAGEMENT EST UNE LIGNE DE CODE, PAS UNE PROMESSE DE MARKETING. Chacun
 * lit la constante qui le tient (\`HEURES_D_ENVOI\`, \`DELAI_POUR_RETENIR_MS\`,
 * \`JOURS_DE_GRACE\`) ou décrit une barrière testée (ligne rouge n° 1). Changer la
 * règle change la phrase ; une phrase qui dirait autre chose que le code serait
 * exactement le « cheap » qu'on retire.
 */

export type HumeurDeVeille = 'travaille' | 'attention' | 'content' | 'repos';

export interface EtatDeLaVeille {
	readonly titre: string;
	readonly ligne: string;
	readonly humeur: HumeurDeVeille;
}

/** OÙ EN EST PLUME, en une phrase et une ligne. Le plus pressant d'abord. */
export function etatDeLaVeille(args: {
	/** Le titre du travail en cours : « Prépare vos relances ». */
	readonly travail: string | null;
	/** Ce qui attend le gérant : dossiers à démarrer, lettres à relire, questions. */
	readonly enAttente: number;
	readonly dossiersSuivis: number;
	readonly relancesAutomatiques: boolean;
	/** « demain à 9 h » : la prochaine relance programmée. */
	readonly prochaine: string | null;
}): EtatDeLaVeille {
	if (args.travail !== null) {
		return {
			titre: 'Je travaille',
			ligne: `${args.travail}. Vous le voyez se faire, étape par étape.`,
			humeur: 'travaille'
		};
	}
	if (args.enAttente > 0) {
		const n = args.enAttente;
		return {
			titre: `${n} chose${pluriel(n)} ${n > 1 ? 'attendent' : 'attend'} votre feu vert`,
			ligne: `${n > 1 ? 'Je les ai préparées' : 'Je l’ai préparée'} ; rien ne part sans vous.`,
			humeur: 'attention'
		};
	}
	if (args.dossiersSuivis === 0) {
		return {
			titre: 'Je veille sur vos factures',
			ligne: 'Joignez-moi vos factures : j’ouvre le dossier de chaque client en retard.',
			humeur: 'repos'
		};
	}
	return {
		titre: 'Tout est en ordre',
		ligne: !args.relancesAutomatiques
			? 'Les relances automatiques sont coupées : je prépare, vous envoyez.'
			: args.prochaine === null
				? 'Aucune relance à faire pour l’instant.'
				: `Prochaine relance ${args.prochaine}.`,
		humeur: 'content'
	};
}

export type IconeDEngagement =
	| 'HEURES'
	| 'RETENIR'
	| 'COUPEES'
	| 'PAIEMENT'
	| 'PROMESSE'
	| 'NOM'
	| 'JUSTICE';

export interface Engagement {
	readonly icone: IconeDEngagement;
	readonly texte: string;
}

/** « une heure », « 30 minutes » : le délai pour retenir, dit comme on le dit. */
function delaiEnMots(ms: number): string {
	const minutes = Math.round(ms / 60_000);
	if (minutes === 60) return 'une heure';
	if (minutes % 60 === 0) return `${minutes / 60} heures`;
	return `${minutes} minutes`;
}

/**
 * CE QUE PLUME FAIT, ET CE QU'IL NE FAIT JAMAIS — selon que les relances partent
 * seules ou non. À la première personne, une phrase chacun.
 */
export function engagementsDePlume(relancesAutomatiques: boolean): readonly Engagement[] {
	const envoi: Engagement[] = relancesAutomatiques
		? [
				{
					icone: 'HEURES',
					texte: `Je n’écris à vos clients qu’en semaine, de ${HEURES_D_ENVOI.de} h à ${HEURES_D_ENVOI.a} h.`
				},
				{
					icone: 'RETENIR',
					texte: `Chaque relance s’affiche ${delaiEnMots(DELAI_POUR_RETENIR_MS)} avant de partir : vous la retenez d’un geste.`
				}
			]
		: [
				{
					icone: 'COUPEES',
					texte:
						'Les relances automatiques sont coupées : je prépare chaque lettre, et c’est vous qui l’envoyez.'
				}
			];
	return [
		...envoi,
		{
			icone: 'PAIEMENT',
			texte: 'Un paiement reçu arrête les relances de ce qu’il règle, même au dernier moment.'
		},
		{
			icone: 'PROMESSE',
			texte: `Quand votre client promet de payer, je me tais jusqu’au jour promis, et ${JOURS_DE_GRACE} jours de plus.`
		},
		{
			icone: 'NOM',
			texte: 'Tout part à votre nom ; les réponses de vos clients arrivent sur votre adresse.'
		},
		{
			icone: 'JUSTICE',
			texte:
				'Rien ne part vers un tribunal : ce qui va en justice passe par l’avocat que vous choisissez.'
		}
	];
}
