import { estBio, estDurable } from './referentiel';
import {
	FAMILLES_VIANDE_POISSON,
	type Famille,
	type Label,
	type ProofStatus,
	type ReviewStatus
} from './types';

/**
 * Le passage de ce que le modèle a RELEVÉ à ce que la loi en CONCLUT.
 *
 * Ce module est la charnière d'auditabilité du produit. Le modèle ne dit
 * jamais qu'un produit est bio ou durable : il relève les labels que le
 * libellé établit, et c'est le barème — du code versionné, relu, testé
 * exhaustivement — qui en tire les deux booléens qui font le ratio. Un
 * contrôleur doit pouvoir remonter du chiffre au texte de loi sans jamais
 * passer par un modèle.
 */

/** En dessous, la classification part en arbitrage humain. */
export const SEUIL_CONFIANCE = 0.85;

/** Ce que le modèle renvoie pour un libellé — des constats, pas des conclusions. */
export interface ClassificationBrute {
	normalizedLabel: string;
	isFood: boolean;
	family: Famille;
	qualifyingLabels: readonly Label[];
	confidence: number;
}

/**
 * Mentions de régularisation commerciale : remises globales, ristournes,
 * avoirs, gestes commerciaux.
 */
const MENTIONS_REGULARISATION =
	/\b(REMISE|RABAIS|RISTOURNE|ESCOMPTE|AVOIR|GESTE COMMERCIAL|PENALITE)\b/;

/**
 * Une régularisation que le modèle a rangée hors alimentaire mérite toujours
 * un œil humain.
 *
 * Un avoir rattaché à un produit identifiable ne pose pas de difficulté : il
 * porte un montant négatif, garde la classification de son produit, et
 * retranche du numérateur comme du dénominateur. Une remise GLOBALE, elle,
 * n'a pas de produit. Sortie du calcul comme non alimentaire, son montant
 * négatif cesse de réduire les achats alimentaires : le dénominateur enfle
 * d'autant et les trois ratios baissent sans raison.
 *
 * Sur une remise de fin d'année, l'écart suffit à faire manquer un seuil à
 * une cantine qui le tenait. La répartition au prorata des lignes
 * alimentaires est le traitement juste, mais elle demande une décision
 * comptable, pas une règle : d'où l'arbitrage.
 */
function estRegularisationHorsAlimentaire(brute: ClassificationBrute): boolean {
	return !brute.isFood && MENTIONS_REGULARISATION.test(brute.normalizedLabel);
}

/**
 * Pourquoi ce libellé attend un arbitrage.
 *
 * Le motif change complètement le travail de l'opérateur : un VIANDE_POISSON
 * à 0,97 de confiance se confirme d'un coup d'œil, un CONFIANCE_BASSE à 0,4
 * demande de réfléchir. Sans le motif affiché, les deux se ressemblent et
 * l'opérateur ralentit sur les deux.
 *
 * Dérivé de la ligne stockée, et non mémorisé : une seule source pour la
 * décision d'envoyer en revue et pour son explication.
 */
export type MotifRevue =
	| 'NON_CLASSE'
	| 'VIANDE_POISSON'
	| 'REGULARISATION'
	| 'CONFIANCE_BASSE';

export function motifRevue(ligne: {
	normalizedLabel: string;
	isFood?: boolean;
	family?: Famille;
	confidence?: number;
}): MotifRevue {
	// Le modèle n'a rien rendu pour ce libellé : rien à confirmer, tout à faire.
	if (ligne.isFood === undefined || ligne.family === undefined) return 'NON_CLASSE';
	if (FAMILLES_VIANDE_POISSON.includes(ligne.family)) return 'VIANDE_POISSON';
	if (!ligne.isFood && MENTIONS_REGULARISATION.test(ligne.normalizedLabel)) {
		return 'REGULARISATION';
	}
	return 'CONFIANCE_BASSE';
}

export interface Verdict {
	isFood: boolean;
	family: Famille;
	qualifyingLabels: Label[];
	isBio: boolean;
	isDurable: boolean;
	proofStatus: ProofStatus;
	reviewStatus: ReviewStatus;
}

/**
 * `source` distingue un verdict produit par le modèle d'un verdict arbitré
 * par un humain : le second n'est jamais renvoyé en revue.
 */
export function deriverVerdict(
	brute: ClassificationBrute,
	source: 'AUTO' | 'HUMAN'
): Verdict {
	// La famille ANNONCÉE est examinée avant toute correction : un produit que
	// le modèle dit non alimentaire tout en le rangeant en viande sortirait
	// sinon du dénominateur sans que personne ne le voie. C'est le pire cas
	// possible sur la famille qui porte le seuil des 60 %.
	const familleAnnoncee = brute.family;

	// Le non-alimentaire ne porte aucun label et n'appartient à aucune famille :
	// frais de port, consignes, emballages, produits d'entretien.
	const isFood = brute.isFood;
	const family: Famille = isFood ? brute.family : 'AUTRE';
	const qualifyingLabels: Label[] = isFood ? [...brute.qualifyingLabels] : [];

	const aArbitrer =
		FAMILLES_VIANDE_POISSON.includes(familleAnnoncee) ||
		brute.confidence < SEUIL_CONFIANCE ||
		estRegularisationHorsAlimentaire(brute);

	const reviewStatus: ReviewStatus =
		source === 'HUMAN' ? 'CONFIRMED' : aArbitrer ? 'PENDING_REVIEW' : 'AUTO';

	// Un label lu sur une facture est une REVENDICATION du fournisseur, pas une
	// preuve. Seul un justificatif reçu fait passer à PROVEN — c'est l'objet des
	// courriers de demande d'attestation, et souvent le point du livrable qui
	// rembourse la prestation à lui seul. Une confirmation humaine porte sur la
	// lecture du libellé, jamais sur l'existence du certificat.
	const proofStatus: ProofStatus = qualifyingLabels.length > 0 ? 'TO_JUSTIFY' : 'NONE';

	return {
		isFood,
		family,
		qualifyingLabels,
		isBio: estBio(qualifyingLabels),
		isDurable: estDurable(qualifyingLabels),
		proofStatus,
		reviewStatus
	};
}
