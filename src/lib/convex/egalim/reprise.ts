'use node';

import { APIConnectionError, InternalServerError, RateLimitError } from '@anthropic-ai/sdk';

/**
 * La politique de reprise sur appel Claude, définie UNE fois pour l'extraction
 * comme pour la classification. Deux politiques divergentes finiraient par
 * diverger tout court.
 */

const TENTATIVES_RESEAU = 3;
const DELAI_BASE_MS = 500;

/** 429, 5xx (dont 529 surchargé), et erreurs réseau : tout le reste est une vraie erreur de requête. */
export function estErreurTransitoire(erreur: unknown): boolean {
	return (
		erreur instanceof RateLimitError ||
		erreur instanceof InternalServerError ||
		erreur instanceof APIConnectionError
	);
}

/**
 * 3 tentatives avec backoff exponentiel sur erreur transitoire. Un 400 (bug
 * de la requête, jamais transitoire) part immédiatement sans être rejoué.
 */
export async function avecReprise<T>(appel: () => Promise<T>): Promise<T> {
	let derniereErreur: unknown;
	for (let tentative = 1; tentative <= TENTATIVES_RESEAU; tentative++) {
		try {
			return await appel();
		} catch (erreur) {
			derniereErreur = erreur;
			if (tentative === TENTATIVES_RESEAU || !estErreurTransitoire(erreur)) {
				throw erreur;
			}
			const delaiMs = DELAI_BASE_MS * 2 ** (tentative - 1);
			await new Promise((resolve) => setTimeout(resolve, delaiMs));
		}
	}
	// Inatteignable : chaque itération ci-dessus renvoie ou relance.
	throw derniereErreur;
}
