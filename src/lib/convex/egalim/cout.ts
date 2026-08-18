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
