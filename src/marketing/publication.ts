import { jourDeParis } from '../lib/admin/dates';

/**
 * LA PUBLICATION DATÉE DU BLOG (19/10/2026, audit stratégique, lot 6).
 *
 * Un article par semaine, écrit d'avance : sa `date` est le jour où il sort, À PARIS. Avant,
 * il n'existe pas en ligne, ni dans la liste, ni à son adresse, ni dans le flux, ni dans le
 * plan du site, exactement comme un brouillon. En développement, tout se lit.
 *
 * ⚠️ LE SITE EST RENDU AU SERVEUR, À CHAQUE VISITE : un article daté de lundi apparaît
 * lundi à minuit, heure de Paris, sans nouveau déploiement.
 */
export function estPublie(
	article: { readonly date: string; readonly brouillon: boolean },
	maintenant: number,
	developpement: boolean
): boolean {
	if (developpement) return true;
	return !article.brouillon && article.date <= jourDeParis(maintenant);
}
