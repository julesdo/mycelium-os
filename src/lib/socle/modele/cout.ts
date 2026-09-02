/**
 * Le barème de coût et le plafond, définis UNE fois pour l'extraction comme
 * pour la classification.
 *
 * Les deux étapes partagent le même `classificationJobs` (une ligne par lot) :
 * deux plafonds écrits séparément finiraient par diverger, et le lot serait
 * arrêté à un seuil différent selon l'étape qui le franchit.
 */

/** Plafond dur par lot. Au-delà, plus aucun appel payant n'est émis. */
export const CAP_EUR = 10;

// Prix Opus 5 (liste), en dollars ; traités comme des euros dans `costEur` —
// c'est un budget indicatif de pilotage, pas une facture, donc pas de
// conversion de change ici.
const PRIX_INPUT_PAR_TOKEN = 5 / 1_000_000;
const PRIX_OUTPUT_PAR_TOKEN = 25 / 1_000_000;
const FACTEUR_CACHE = 0.1;

export interface UsageAppel {
	tokensIn: number;
	tokensOut: number;
	cacheReadTokens: number;
}

export function estimerCout(usage: UsageAppel): number {
	return (
		usage.tokensIn * PRIX_INPUT_PAR_TOKEN +
		usage.cacheReadTokens * PRIX_INPUT_PAR_TOKEN * FACTEUR_CACHE +
		usage.tokensOut * PRIX_OUTPUT_PAR_TOKEN
	);
}

/**
 * Erreur d'appel Claude qui TRANSPORTE l'usage déjà consommé.
 *
 * Un appel dont la réponse ne passe pas la validation de schéma a bien été
 * émis, et donc facturé. Sans ce transport, l'usage se perdait avec
 * l'exception : le plafond de 10 € ne se déclenchait jamais sur le chemin
 * d'échec, qui est précisément celui qui coûte le plus, puisque chaque appel
 * y est rejoué jusqu'à trois fois.
 *
 * Sur une extraction découpée en pages, l'usage accumulé des morceaux déjà
 * traités voyage avec l'erreur du morceau fautif.
 */
export class ErreurAppelClaude extends Error {
	readonly usage: UsageAppel;

	constructor(message: string, usage: UsageAppel) {
		super(message);
		this.name = 'ErreurAppelClaude';
		this.usage = usage;
	}
}

/** L'usage porté par une erreur, ou zéro si elle n'en porte pas. */
export function usageDeLErreur(erreur: unknown): UsageAppel {
	if (erreur instanceof ErreurAppelClaude) return erreur.usage;
	return { tokensIn: 0, tokensOut: 0, cacheReadTokens: 0 };
}

export function usageNul(): UsageAppel {
	return { tokensIn: 0, tokensOut: 0, cacheReadTokens: 0 };
}
