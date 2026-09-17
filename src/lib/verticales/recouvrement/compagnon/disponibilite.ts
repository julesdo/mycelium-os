import { estimerCout, type UsageAppel } from '../../../socle/modele/cout';
import { composerRefus, type Refus } from './refus';

/**
 * CE QUI FAIT TAIRE LE COMPAGNON, ET CE QU'IL DIT ALORS (D0, D14, B14).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * DEUX RAISONS, UNE SEULE FORME
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le compagnon cesse de répondre pour exactement deux raisons, et aucune autre
 * ne doit jamais atteindre l'écran nue : le compteur mensuel de coût a mordu,
 * ou la clé d'appel n'est pas posée sur le déploiement. Les deux se disent en
 * QUATRE PARTIES, comme tout refus de ce produit : ce qu'on peut faire tout de
 * suite, ce qui manque, ce qui le lève, ce que l'attente coûte.
 *
 * ⚠️ ET D0 PRIME : ON NE COUPE JAMAIS L'EXPÉRIENCE. Quand le plafond mord, la
 * file continue de se rendre ENTIÈREMENT, les propositions se posent, les
 * décomptes se chiffrent et la prescription reste surveillée — parce qu'aucun
 * des trois ne passe par un appel modèle (D4). Ce qui s'arrête est la
 * conversation LIBRE, et elle seule.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CES DEUX NOMBRES NE SONT PAS DES VALEURS JURIDIQUES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Ils ne vivent donc pas dans `parametres.ts`, qui porte le droit et rien
 * d'autre. Ce sont deux hypothèses de pilotage, datées du 17 septembre par D14,
 * écrites pour être déplacées sur des nombres d'usage — exactement comme le
 * plafond de sept propositions l'est dans son propre commentaire.
 *
 * ⚠️ ET L'UNITÉ EST UN DOLLAR LU COMME UN EURO. `socle/modele/cout.ts` le dit
 * de lui-même : « prix Opus 5 (liste), en dollars ; traités comme des euros
 * dans costEur », « un budget indicatif de pilotage, pas une facture, donc pas
 * de conversion de change ici ». Rien de ce que ce module chiffre n'est
 * opposable à personne, et rien ne s'en réclame : c'est pourquoi ces deux
 * seuils sont des `number` et non des entiers de centimes, alors que tout ce
 * que le produit RÉCLAME est en `bigint`.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI LE PLAFOND EXISTE : C'EST LA QUEUE, PAS LA MOYENNE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Sur un abonnement à prix fixe, la moyenne ne coûte rien — une question vaut
 * environ quatre centimes, préfixe système servi en cache. Ce qui coûte, c'est
 * l'emballement : la boucle, le fichier collé en entier, le fil qu'on relance
 * cent fois. Le risque couvert est sans borne ; le coût de le couvrir est ce
 * fichier.
 */

/** Le plafond mou : on prévient, on ne coupe rien. Par mois et par établissement. */
export const AVERTISSEMENT_MENSUEL = 20;

/** Le plafond de sécurité : la conversation LIBRE s'arrête, et elle seule. */
export const ARRET_MENSUEL = 30;

export type NiveauPlafond = 'OUVERT' | 'AVERTI' | 'ARRETE';

export interface EtatPlafond {
	readonly niveau: NiveauPlafond;
	/** Le cumul du mois, en budget de pilotage. Jamais une facture. */
	readonly cumul: number;
	/** Ce qui reste avant le plafond de sécurité. Zéro quand il a mordu. */
	readonly reste: number;
	/** Renseigné au seul niveau `ARRETE`. Le reste du produit continue. */
	readonly refus: Refus | null;
}

/**
 * Le coût d'un tour de parole, estimé une fois et écrit avec lui.
 *
 * ⚠️ ON ESTIME À L'ÉCRITURE, ON SOMME À LA LECTURE. Recalculer le cumul du mois
 * à partir des jetons ferait dépendre l'historique du barème du jour : un
 * changement de prix réécrirait en silence ce qu'ont coûté les mois passés, et
 * le seuil se serait déplacé sans que personne ne l'ait décidé.
 */
export function coutDuTour(usage: UsageAppel): number {
	return estimerCout(usage);
}

/**
 * Où en est l'établissement ce mois-ci.
 *
 * Le seuil se lit sur ce qui a DÉJÀ été consommé : une question est autorisée
 * tant que le cumul n'a pas atteint le plafond, et c'est elle qui peut le
 * franchir. Refuser d'avance une question dont on ne connaît pas encore le coût
 * aurait fermé la conversation plus tôt que le plafond ne le dit.
 */
export function evaluerPlafond(cumul: number): EtatPlafond {
	const reste = Math.max(0, ARRET_MENSUEL - cumul);

	if (cumul >= ARRET_MENSUEL) {
		return { niveau: 'ARRETE', cumul, reste: 0, refus: refusPlafondAtteint(cumul) };
	}
	if (cumul >= AVERTISSEMENT_MENSUEL) return { niveau: 'AVERTI', cumul, reste, refus: null };
	return { niveau: 'OUVERT', cumul, reste, refus: null };
}

/** Le cumul en toutes lettres, à deux décimales, avec son unité déclarée. */
function budget(valeur: number): string {
	return `${valeur.toFixed(2)} (budget de pilotage, jamais une facture)`;
}

/**
 * Ce que le compagnon dit quand le plafond de sécurité a mordu.
 *
 * ⚠️ LA PREMIÈRE PARTIE N'EST PAS UNE FORMULE DE POLITESSE. Elle énumère ce qui
 * continue, et ce qui continue est presque tout : le produit entier se rend sans
 * un seul appel modèle. Un refus qui commencerait par ce qui manque se lirait
 * comme une panne du logiciel, alors que c'est une conversation qui s'arrête.
 */
function refusPlafondAtteint(cumul: number): Refus {
	return composerRefus({
		peutFaire:
			'Tout le reste du produit continue, et ne dépend d’aucun appel modèle : la file et son ' +
			'tri, les échéances surveillées, le délai de prescription, les décomptes et leurs ' +
			'segments, les propositions posées sur les rangées, les pièces classées et les ' +
			'brouillons de courrier. Rien de ce qui se calcule ne s’arrête ici.',
		constat:
			`La conversation libre de cet établissement s’arrête pour ce mois-ci : son compteur ` +
			`atteint ${budget(cumul)}, pour un plafond de sécurité de ${ARRET_MENSUEL}. Ce plafond ` +
			`existe pour l’emballement — la boucle, le fichier collé en entier —, pas pour l’usage ` +
			`ordinaire, qu’il ne rencontre jamais.`,
		blocages: [
			'Ce verrou se lève de lui-même au premier jour du mois suivant, quand le compteur ' +
				'repart de zéro.'
		],
		coutDeLAttente:
			'Ce que l’attente coûte est chiffrable, et vaut zéro sur les droits : aucune échéance, ' +
			'aucun délai et aucune somme réclamée ne dépendent d’une réponse du compagnon. Ce qui ' +
			'court continue d’être compté et affiché sur chaque rangée.'
	});
}

/**
 * Ce que le compagnon dit quand la clé d'appel n'est pas posée.
 *
 * ⚠️ IL LE DIT, PLUTÔT QUE DE LAISSER REMONTER UNE ERREUR DE SDK. Une clé
 * absente rendait jusqu'ici un message technique en anglais, écrit pour un
 * développeur, au milieu d'un dossier de recouvrement. Ce n'est pas un refus :
 * c'est un mur, avec l'air d'une panne.
 */
export function refusSansCle(): Refus {
	return composerRefus({
		peutFaire:
			'Tout le reste du produit continue, et ne dépend d’aucun appel modèle : la file et son ' +
			'tri, les échéances surveillées, le délai de prescription, les décomptes et leurs ' +
			'segments, les propositions posées sur les rangées et les brouillons de courrier.',
		constat:
			'La conversation n’a pas de clé d’appel sur ce déploiement. Elle est la seule surface ' +
			'du produit qui en dépende, avec la lecture des documents déposés.',
		blocages: [
			'Ce verrou se lève par la pose de la clé d’appel sur le déploiement, du côté de ' +
				'l’exploitant du logiciel. Il ne dépend d’aucune donnée du dossier.'
		],
		coutDeLAttente:
			'Ce que l’attente coûte est chiffrable, et vaut zéro sur les droits : aucune échéance, ' +
			'aucun délai et aucune somme réclamée ne dépendent d’une réponse du compagnon.'
	});
}

/**
 * Ce que le compagnon dit quand l'appel n'a pas abouti.
 *
 * ⚠️ IL NOMME L'ÉCHEC À SA PLACE, sans le réessayer en silence et sans le
 * deviner. C'est la même discipline que la lecture d'un document : « lecture
 * échouée », datée, avec son geste de reprise — jamais escamotée.
 */
export function refusAppelEchoue(): Refus {
	return composerRefus({
		peutFaire:
			'Tout le reste du produit continue, et ne dépend d’aucun appel modèle : la file, les ' +
			'échéances surveillées, le délai de prescription, les décomptes et leurs segments.',
		constat:
			'La réponse n’a pas abouti. L’appel a été émis une fois et n’a pas rendu de texte ' +
			'exploitable ; rien n’a été réessayé en silence, et rien n’a été deviné à la place.',
		blocages: ['Ce refus se lève en reposant la question : le dossier, lui, n’a pas changé.'],
		coutDeLAttente:
			'Ce que l’attente coûte est chiffrable, et vaut zéro sur les droits : aucune échéance, ' +
			'aucun délai et aucune somme réclamée ne dépendent d’une réponse du compagnon.'
	});
}
