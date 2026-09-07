import { ZERO, type Montant } from '../../socle/montants';
import { joursEntre } from './decompte';
import type { Evenement, Urgence } from './surveillance';

/**
 * LE BRIEFING DU MATIN — la règle, séparée de la plomberie.
 *
 * Ce fichier décide ce que le produit a à dire, et surtout S'IL A QUELQUE CHOSE
 * À DIRE. Il ne sait ni lire une base, ni envoyer un courriel : c'est ce qui le
 * rend testable en trois secondes et opposable à la relecture.
 *
 * La plomberie vit dans `convex/recouvrement/battement.ts` et ne porte aucune
 * règle.
 */

/**
 * L'identité d'un événement, stable d'un jour à l'autre.
 *
 * ⚠️ ELLE NE PORTE PAS LE MONTANT, ET C'EST ESSENTIEL. Les intérêts courent
 * chaque nuit : un montant dans la clé ferait paraître chaque événement nouveau
 * chaque matin, et le briefing crierait tous les jours.
 */
export function cleEvenement(evenement: Pick<Evenement, 'type' | 'reference'>): string {
	return `${evenement.type}:${evenement.reference}`;
}

/** Les clés présentes aujourd'hui et absentes du dernier relevé. */
export function clesNouvelles(
	evenements: readonly Evenement[],
	connues: readonly string[]
): string[] {
	const deja = new Set(connues);
	return evenements.map(cleEvenement).filter((cle) => !deja.has(cle));
}

/** Ce que le dernier briefing a dit, et quand. */
export interface Precedent {
	/** La date du dernier briefing ENVOYÉ, au format `AAAA-MM-JJ`. */
	readonly le: string;
	/** Les clés d'événement de ce jour-là. */
	readonly cles: readonly string[];
}

export type Decision = 'PARLER' | 'SE_TAIRE';

export interface Verdict {
	readonly decision: Decision;
	/** Pourquoi. Affiché dans le journal, et dans l'interface en cas d'échec. */
	readonly raison: string;
}

/**
 * Au bout de combien de jours de silence on reprend la parole pour rassurer.
 *
 * SEPT, ET C'EST UN ARBITRAGE PRODUIT, PAS UNE RÈGLE DE DROIT. Un silence plus
 * long finit par se lire comme une panne, et le client recommence à vérifier
 * lui-même — ce qui annule le produit. Plus court, et la rassurance redevient du
 * bruit hebdomadaire qu'on filtre.
 */
export const JOURS_AVANT_RASSURANCE = 7;

/**
 * LIMITE CONNUE : `facturesVente.reference` est une chaîne libre, sans
 * contrainte d'unicité dans le schéma. Deux débiteurs différents pourraient
 * donc porter la même référence de facture, ce qui ferait collisionner leurs
 * clés d'événement (`cleEvenement` ne porte que le type et la référence) et
 * sous-compterait les nouveautés dans `clesNouvelles`.
 *
 * LA CONSÉQUENCE EST BORNÉE. Un point CRITIQUE fait parler de toute façon : la
 * vérification des critiques passe avant celle des nouveautés ci-dessous. Le
 * seul cas dégradé est un événement NON critique, portant une référence déjà
 * connue chez un autre débiteur, qui ne serait pas compté comme nouveau — au
 * pire un jour de silence en trop, jamais un point critique tu. Corriger
 * vraiment demanderait de faire porter un identifiant unique aux événements,
 * ce qui dépasse cette fonction.
 *
 * Faut-il écrire au client ce matin ?
 *
 * L'ORDRE DES RAISONS COMPTE : la première qui s'applique gagne, et c'est elle
 * qu'on affiche. Un point critique prime sur une nouveauté, qui prime sur la
 * rassurance — pour que la raison affichée soit toujours la plus forte.
 */
export function decider(
	evenements: readonly Evenement[],
	precedent: Precedent | null,
	aujourdHui: string
): Verdict {
	if (precedent === null) {
		return { decision: 'PARLER', raison: 'premier briefing' };
	}

	const critiques = evenements.filter((evenement) => evenement.urgence === 'CRITIQUE');
	if (critiques.length > 0) {
		return {
			decision: 'PARLER',
			raison: `${critiques.length} point${critiques.length > 1 ? 's' : ''} critique${critiques.length > 1 ? 's' : ''}`
		};
	}

	const nouvelles = clesNouvelles(evenements, precedent.cles);
	if (nouvelles.length > 0) {
		return {
			decision: 'PARLER',
			raison: `${nouvelles.length} nouveau${nouvelles.length > 1 ? 'x' : ''} point${nouvelles.length > 1 ? 's' : ''}`
		};
	}

	// `joursEntre` plafonne à zéro un écart négatif — pensé là-bas pour que les
	// intérêts ne courent pas à l'envers, mais le même plancher nous sert ici
	// aussi : un `precedent.le` postérieur à `aujourdHui` (horloge remise à
	// l'heure, relevé rejoué) rend 0, donc SE_TAIRE, jamais une fausse alerte de
	// sept jours.
	if (joursEntre(precedent.le, aujourdHui) >= JOURS_AVANT_RASSURANCE) {
		return { decision: 'PARLER', raison: 'sept jours sans nouvelle' };
	}

	return { decision: 'SE_TAIRE', raison: 'rien de nouveau, rien de critique' };
}

/** Du plus urgent au moins urgent. Sert à trier, jamais à afficher. */
const RANG_URGENCE: Record<Urgence, number> = { CRITIQUE: 0, HAUTE: 1, NORMALE: 2 };

export interface Briefing {
	readonly titre: string;
	readonly intro: string;
	/** Trois lignes au plus. Ce qui a bougé, ce qui meurt, ce qui reste dû. */
	readonly lignes: readonly string[];
	/** L'action du jour, ou `null` quand il n'y a rien à faire. */
	readonly action: string | null;
	readonly montantIdentifie: Montant;
}

/**
 * Le briefing du matin : trois lignes et UNE action.
 *
 * ⚠️ CE N'EST PAS UN DIGEST. Un message qui liste douze points ne dit pas quoi
 * faire : il transfère la charge de trier à celui qui le lit. Le produit trie,
 * et ne propose qu'une action — celle de l'événement le plus urgent, et à
 * urgence égale, du plus cher.
 *
 * LE MONTANT EST TRANSPORTÉ, JAMAIS RECALCULÉ. Il vient du moteur de décompte.
 * Le refaire ici ouvrirait la porte à deux chiffres qui divergent, et c'est
 * exactement ce que tout ce produit évite.
 *
 * PAS DE DATE EN PARAMÈTRE, ET CE N'EST PAS UN OUBLI. La composition ne
 * dépend pas du jour : toute la dépendance au temps est déjà consommée en
 * amont, dans le calcul du flux (qui arrête les décomptes au jour dit) et
 * dans `decider` (qui compte les jours de silence). Ici, on ne fait que
 * projeter un état déjà calculé.
 */
export function composerBriefing(
	evenements: readonly Evenement[],
	montantIdentifie: Montant
): Briefing {
	if (evenements.length === 0) {
		return {
			titre: 'Rien ne meurt cette semaine',
			intro: 'Aucune échéance ne réclame votre attention. Vos délais sont surveillés.',
			lignes: ['Aucun point d’attention.'],
			action: null,
			montantIdentifie
		};
	}

	const tries = [...evenements].sort((a, b) => {
		const parUrgence = RANG_URGENCE[a.urgence] - RANG_URGENCE[b.urgence];
		if (parUrgence !== 0) return parUrgence;
		// À urgence égale, le plus cher d'abord. Un `bigint` ne se soustrait pas
		// en `number` : on compare, on ne calcule pas.
		const montantA = a.montant ?? ZERO;
		const montantB = b.montant ?? ZERO;
		if (montantB > montantA) return 1;
		if (montantB < montantA) return -1;
		return 0;
	});

	const premier = tries[0]!;
	const critiques = evenements.filter((evenement) => evenement.urgence === 'CRITIQUE').length;

	const lignes = [
		critiques > 0
			? `${critiques} point${critiques > 1 ? 's' : ''} critique${critiques > 1 ? 's' : ''} sur ${evenements.length} au total.`
			: `${evenements.length} point${evenements.length > 1 ? 's' : ''} d’attention, aucun critique.`,
		premier.explication,
		'Le détail de chaque montant est décomposable dans le produit.'
	];

	return {
		titre: critiques > 0 ? 'Une échéance réclame votre attention' : 'Votre point du matin',
		intro: premier.explication,
		lignes,
		action: premier.action,
		montantIdentifie
	};
}
