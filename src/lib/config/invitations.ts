/**
 * LA DURÉE DE VALIDITÉ D'UNE INVITATION. Source unique.
 *
 * Elle était écrite deux fois côté serveur — `inviteOrganizationMember` et
 * `bulkInviteOrganizationMembers` — et une troisième fois EN TOUTES LETTRES sur
 * l'écran qui la promet : « un lien valable sept jours ». Le jour où le serveur
 * passe à trois, l'écran continue d'annoncer sept, rien ne casse, et le collègue
 * clique sur un lien périmé en ayant lu le contraire.
 *
 * Ce module est PUR — pas d'import Convex, pas de React — exactement comme
 * `tarifs.ts` : c'est ce qui lui permet d'être lu par les fonctions serveur ET
 * par le bundle du navigateur.
 */

/** Sept jours, en jours. Le chiffre que l'écran écrit. */
export const JOURS_VALIDITE_INVITATION = 7;

/** La même durée, en millisecondes. Le chiffre que le serveur additionne à `Date.now()`. */
export const MS_VALIDITE_INVITATION = JOURS_VALIDITE_INVITATION * 24 * 60 * 60 * 1000;

/** « sept jours ». Écrit une fois, pour que l'écran ne recompose pas la phrase. */
export const VALIDITE_INVITATION_EN_TOUTES_LETTRES =
	JOURS_VALIDITE_INVITATION === 7 ? 'sept jours' : `${JOURS_VALIDITE_INVITATION} jours`;
