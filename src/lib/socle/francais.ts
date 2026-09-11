/**
 * Le français que tout le produit écrit — et qui ne dépend d'aucune loi.
 *
 * ⚠️ POURQUOI UNE FONCTION POUR SI PEU. Le produit écrivait « 1 facture(s) »,
 * « il reste 3 jour(s) », « 2 déjà connue(s) » à six endroits. C'est une
 * notation de formulaire administratif, et elle se lit sur chaque dossier qui
 * n'en porte qu'un — c'est-à-dire souvent.
 *
 * `src/ui/format.ts` porte déjà la même règle pour l'interface. Celle-ci sert
 * aux textes composés hors de l'interface : notifications, étapes d'import,
 * événements de surveillance, et le briefing quotidien qui part par e-mail.
 * Deux copies valaient mieux que huit ; une seule aurait supposé que le socle
 * importe l'interface, ce que la frontière interdit.
 */

/** Le pluriel français, pour ne pas écrire « 1 factures ». */
export function pluriel(n: number): string {
	return Math.abs(n) > 1 ? 's' : '';
}
