/**
 * LA SEULE LECTURE D'HORLOGE DE L'INTERFACE.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ POURQUOI CETTE FONCTION A SON PROPRE FICHIER
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Elle vivait dans l'écran de révélation, sous un commentaire qui affirmait
 * « la date du jour est lue ici, et nulle part ailleurs ». C'était vrai tant
 * qu'un seul écran arrêtait un décompte. L'accueil porte maintenant le même
 * total en hero, et il lui faut la même date.
 *
 * Deux issues : recopier la fonction, ou l'extraire. Recopier aurait donné
 * DEUX horloges — et le jour où l'une passe en UTC et l'autre en heure locale,
 * l'accueil et le détail affichent deux totaux différents pour la même
 * créance, à quelques heures d'intervalle autour de minuit. Sur ce produit,
 * c'est exactement le genre d'écart qu'un débiteur relève et qu'on ne sait
 * plus expliquer.
 *
 * Tout le calcul en aval prend `arreteAu` en ARGUMENT, ce qui le rend
 * rejouable et testable à n'importe quelle date. Ce fichier est le seul point
 * de la chaîne qui interroge l'horloge, et c'est ce qui rend cette propriété
 * vérifiable plutôt que promise.
 *
 * ⚠️ `toISOString()` REND DE L'UTC, et c'est délibéré. Le décompte est une
 * pièce qui peut partir chez un tiers ; sa date d'arrêté doit être la même
 * pour un utilisateur à Brest et pour un serveur à Francfort. Une date locale
 * ferait qu'un décompte arrêté à 23 h 30 à Paris porterait le lendemain pour
 * le calcul et la veille à l'écran.
 */
export function aujourdHuiISO(): string {
	return new Date().toISOString().slice(0, 10);
}
