import { PARAMETRES } from '../lib/verticales/recouvrement/parametres';

/**
 * LES ARTICLES CITÉS PAR LA PAGE, LUS SUR LA SOURCE DES PARAMÈTRES.
 *
 * ⚠️ CE MODULE EXISTE POUR QU'IL N'Y EN AIT PAS DEUX. Le repérage d'un numéro
 * d'article dans une chaîne de source vivait en privé dans `la-loi.tsx` ; le
 * premier écran en a eu besoin à son tour, et la tentation évidente était de
 * recopier trois lignes de regex. Une seconde copie d'une règle de lecture du
 * droit finit toujours par diverger de la première, et le jour où elle diverge
 * la page cite deux articles différents pour la même valeur.
 *
 * ⚠️ ET SURTOUT : AUCUN NUMÉRO N'EST ÉCRIT ICI. C'est la règle la plus stricte
 * du projet — « ne jamais deviner un article de loi, même de mémoire ». Ce qui
 * s'affiche est extrait de la SOURCE relevée sur Légifrance et portée par le
 * paramètre lui-même. Le jour où la source change, la page change avec elle ; le
 * jour où elle disparaît, la page n'affiche rien plutôt qu'un numéro périmé.
 */
export function articleDe(source: string): string | null {
	const trouve = source.match(/\b[LRD]\.? ?\d{3}-\d+/);
	return trouve ? trouve[0] : null;
}

/**
 * Les deux articles qui fondent ce que le produit mesure : celui du taux
 * d'intérêt de retard, et celui du délai de prescription commerciale.
 *
 * `filter` sur `null` : une source sans numéro repérable ne produit pas une
 * chaîne vide dans la liste, elle n'y entre pas.
 */
export const ARTICLES_DU_SOCLE: readonly string[] = [
	articleDe(PARAMETRES.tauxInteretLegalDefaut.source),
	articleDe(PARAMETRES.delaiPrescriptionCommerciale.source)
].filter((article): article is string => article !== null);
