import { FAMILLES_VIANDE_POISSON, type Famille } from './types';
import { SEUIL_CONFIANCE } from './verdict';

/**
 * Le nombre d'organisations distinctes qui doivent avoir confirmé un libellé
 * pour qu'on cesse de le demander aux suivantes.
 *
 * Trois plutôt que deux : deux confirmations peuvent venir de deux gérants qui
 * cliquent vite sur la même proposition. À trois, le hasard devient improbable.
 * C'est une constante de qualité, revue à la mesure du taux de correction, pas
 * une vérité.
 */
export const SEUIL_CONSENSUS = 3;

/** Ce que le cache global sait d'un libellé. Aucune identité, jamais. */
export interface EntreeCache {
	confidence: number;
	confirmationsCount: number;
	/** Une correction a contredit le verdict : le libellé redevient une question. */
	contested: boolean;
}

/**
 * Faut-il demander ce libellé à cette organisation ?
 *
 * `cache` vaut `null` pour un libellé jamais rencontré. `famille` est celle que
 * la classification annonce.
 */
export function doitEtreDemande(cache: EntreeCache | null, famille: Famille): boolean {
	// Le filet juridique ne se délègue pas à une statistique : ces familles
	// portent le seuil des 60 %, où une erreur coûte le plus cher.
	//
	// Cette garde double celle de `deriverVerdict` dans `verdict.ts`, et c'est
	// délibéré : les deux fonctions répondent à des questions différentes
	// (« ce verdict doit-il être arbitré ? » contre « faut-il redemander ce
	// libellé à cette organisation ? »), mais l'invariant est le même et il est
	// trop coûteux pour ne tenir qu'à un seul endroit. Les deux s'appuient sur
	// la MÊME constante `FAMILLES_VIANDE_POISSON` : élargir la liste des
	// familles sensibles se fait là-bas, une fois, et les deux suivent.
	if (FAMILLES_VIANDE_POISSON.includes(famille)) return true;

	if (cache === null) return true;
	if (cache.contested) return true;
	if (cache.confidence < SEUIL_CONFIANCE) return true;

	return cache.confirmationsCount < SEUIL_CONSENSUS;
}
