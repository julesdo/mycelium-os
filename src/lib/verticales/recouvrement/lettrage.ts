import { ZERO, additionner, soustraire, type Montant } from '../../socle/montants';

/**
 * LE LETTRAGE DÉGRADÉ — retrouver quelles factures composent un virement.
 *
 * Un client paie 4 820 € en une fois, sans référence. Aucune facture ne porte ce
 * montant : c'est une somme. Tant que le rapprochement n'est pas fait, ces
 * factures restent « impayées » — le produit les fait remonter, les compte dans
 * le montant identifié, et finira par proposer de relancer.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ ON NE TRANCHE JAMAIS UNE AMBIGUÏTÉ
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Relancer un client qui a déjà payé est la pire erreur possible d'un logiciel
 * de recouvrement : elle ne coûte pas un chiffre faux à l'écran, elle coûte une
 * relation commerciale. Dès qu'il existe DEUX combinaisons pour un même montant,
 * ce module les montre toutes et demande. Choisir aurait une chance sur deux
 * d'être faux, et l'erreur se paie chez le client du client.
 *
 * C'est la même famille de décision que le refus de rapprocher un débiteur par
 * raison sociale au BODACC : quand se tromper coûte plus cher que ne rien dire,
 * on ne dit rien.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ ET AUCUNE TOLÉRANCE SUR LE MONTANT
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Un paiement de 4 820,01 € ne solde pas une somme de 4 820,00 €. Le centime
 * d'écart cache peut-être un escompte, un frais bancaire, ou une facture qu'on
 * ne connaît pas — trois situations qui appellent trois gestes différents, et
 * qu'un rapprochement approximatif confondrait en silence.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ LE PROBLÈME EST EXPONENTIEL, ET LA BORNE SE DIT
 * ─────────────────────────────────────────────────────────────────────────
 *
 * C'est une somme de sous-ensembles. Vingt factures font un million de
 * combinaisons ; trois cents, un nombre sans nom. L'espace est donc borné, et le
 * dépassement REMONTE au lieu de faire ramer le serveur : un écran qui charge
 * sans fin ne dit pas au gérant qu'il doit filtrer sa recherche.
 *
 * ⚠️ CE MODULE NE CONNAÎT PAS LA NOTION DE DÉBITEUR. C'est l'appelant qui ne lui
 * passe que les factures du bon — lui donner celles de tout l'établissement
 * produirait des rapprochements entre clients, absurdes et invisibles.
 */

export interface FactureCandidate {
	readonly reference: string;
	/** Ce qui reste dû sur cette facture. Une facture soldée n'est pas candidate. */
	readonly resteDu: Montant;
}

export interface Combinaison {
	readonly references: readonly string[];
	readonly total: Montant;
}

export type Lettrage =
	| { readonly issue: 'UNIQUE'; readonly combinaison: Combinaison }
	| {
			readonly issue: 'AMBIGU';
			readonly combinaisons: readonly Combinaison[];
			/** Vrai quand d'autres combinaisons existent au-delà de ce qui est montré. */
			readonly tronque: boolean;
	  }
	| { readonly issue: 'AUCUNE' }
	| { readonly issue: 'TROP_DE_CANDIDATES'; readonly candidates: number };

/**
 * Le nombre de factures au-delà duquel on refuse de chercher.
 *
 * DIX-HUIT, soit au plus 262 144 sous-ensembles — le pire cas tient en quelques
 * dizaines de millisecondes, et l'élagage par somme restante le réduit
 * énormément en pratique. Au-delà, la recherche cesse d'être bornée dans le
 * temps, et un gérant préfère un message qui lui dit de restreindre sa fenêtre
 * à un écran qui tourne.
 */
export const PLAFOND_CANDIDATES = 18;

/**
 * Combien de combinaisons on montre au plus.
 *
 * En proposer cinquante-six à un gérant n'est pas lui demander de trancher,
 * c'est lui demander d'abandonner. Le fait qu'il y en ait davantage se DIT
 * (`tronque`), sinon il croirait choisir dans une liste complète.
 */
const PLAFOND_COMBINAISONS = 10;

export function lettrer(candidates: readonly FactureCandidate[], montant: Montant): Lettrage {
	// Un montant nul ou négatif n'a pas de rapprochement : l'ensemble vide
	// sommerait à zéro et passerait pour une réponse.
	if (montant <= ZERO) return { issue: 'AUCUNE' };

	if (candidates.length > PLAFOND_CANDIDATES) {
		return { issue: 'TROP_DE_CANDIDATES', candidates: candidates.length };
	}

	// Une facture soldée ne participe à rien, et une facture plus grosse que le
	// paiement ne peut appartenir à aucune combinaison : les écarter d'abord
	// réduit l'espace sans changer une seule réponse.
	//
	// LE TRI EST DÉCROISSANT, et il sert deux choses : l'élagage par somme
	// restante mord bien plus tôt, et l'ORDRE DE SORTIE devient indépendant de
	// l'ordre d'entrée — deux exécutions proposent les mêmes choix dans le même
	// ordre. Un écran qui réordonne ses options à chaque rendu se lit comme un bug.
	const utiles = candidates
		.filter((facture) => facture.resteDu > ZERO && facture.resteDu <= montant)
		.sort((a, b) =>
			a.resteDu === b.resteDu
				? a.reference.localeCompare(b.reference)
				: b.resteDu > a.resteDu
					? 1
					: -1
		);

	const trouvees: Combinaison[] = [];
	let depasse = false;

	/** Les sommes restantes, pour élaguer sans les recalculer. */
	const restantes: Montant[] = new Array(utiles.length + 1).fill(ZERO);
	for (let rang = utiles.length - 1; rang >= 0; rang--) {
		restantes[rang] = additionner(restantes[rang + 1]!, utiles[rang]!.resteDu);
	}

	const chemin: string[] = [];

	function explorer(rang: number, reste: Montant): void {
		if (depasse) return;
		if (reste === ZERO) {
			if (trouvees.length >= PLAFOND_COMBINAISONS) {
				depasse = true;
				return;
			}
			trouvees.push({ references: [...chemin], total: montant });
			return;
		}
		if (rang >= utiles.length) return;
		// Ce qui reste devant ne suffit plus : inutile de descendre.
		if (restantes[rang]! < reste) return;

		const facture = utiles[rang]!;
		if (facture.resteDu <= reste) {
			chemin.push(facture.reference);
			// `soustraire`, et surtout PAS un cast. Le type branché n'est pas une
			// formalité : c'est lui qui garantit qu'aucun bigint non marqué n'entre
			// dans la chaîne monétaire, et ce module décide quelles factures sont
			// déclarées soldées.
			explorer(rang + 1, soustraire(reste, facture.resteDu));
			chemin.pop();
		}
		explorer(rang + 1, reste);
	}

	explorer(0, montant);

	if (trouvees.length === 0) return { issue: 'AUCUNE' };
	if (trouvees.length === 1 && !depasse) return { issue: 'UNIQUE', combinaison: trouvees[0]! };
	return { issue: 'AMBIGU', combinaisons: trouvees, tronque: depasse };
}
