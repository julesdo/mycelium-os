import { useSyncExternalStore } from 'react';

/**
 * L'HORLOGE DE L'IMPORT — et pourquoi l'import est le seul écran qui en a une.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QU'ELLE SERT À VOIR : UNE LECTURE QUI NE REVIENDRA PAS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La lecture d'un dépôt part en tâche planifiée
 * (`convex/recouvrement/depot.ts`). Elle écrit son étape, puis son bilan ou son
 * échec. Si le processus tombe entre les deux — déploiement, coupure, tâche
 * évincée — le dépôt reste sur `LECTURE` en base, DÉFINITIVEMENT : plus rien
 * ne le reprend, et plus rien ne l'échoue.
 *
 * L'écran affichait alors « Lecture… » pour l'éternité. C'est le pire des
 * états possibles : il est indistinguable d'une lecture qui marche, donc le
 * gérant attend, et ses factures n'entreront jamais. Un repli silencieux est un
 * mensonge — ici le silence durait des mois.
 *
 * ⚠️ ELLE NE DIAGNOSTIQUE RIEN, ELLE COMPTE. L'écran n'écrit pas « la lecture
 * est morte » : il n'en sait rien, un gros PDF peut être lent. Il écrit ce
 * qu'il observe — « sans nouvelle depuis 14 min » — et laisse le gérant
 * conclure. Le doute ne profite pas au produit : il ne se tait pas non plus.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI `useSyncExternalStore` ET PAS UN `useState` DANS UN EFFET
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Lire `Date.now()` au rendu rend le rendu impur, et le produit passe déjà sa
 * date en argument partout (`ui/horloge.ts`) pour que tout calcul soit
 * rejouable. Le temps qui passe est un abonnement, pas un état dérivé : c'est
 * exactement ce pour quoi `useSyncExternalStore` existe, et `navigation.tsx`
 * s'en sert déjà.
 *
 * ⚠️ ET LE SERVEUR NE REND PAS D'HEURE. Une heure de serveur, hydratée par une
 * heure de client, ferait diverger les deux rendus — et surtout, sur une page
 * rendue il y a vingt secondes, afficherait un « depuis N min » faux. Le
 * serveur rend donc `null`, qui veut dire « aucune horloge », et l'écran ne dit
 * alors RIEN sur l'ancienneté. Il ne devine pas.
 */

const MINUTE_MS = 60_000;

/**
 * ⚠️ MÉMORISÉE, OBLIGATOIREMENT. `getSnapshot` doit rendre la MÊME valeur tant
 * que rien n'a changé : une lecture fraîche de `Date.now()` à chaque appel
 * ferait boucler le rendu à l'infini, parce que React compare l'instantané à
 * celui d'avant pour décider s'il doit redessiner.
 */
let minuteConnue = Math.floor(Date.now() / MINUTE_MS);

function minuteCourante(): number {
	const maintenant = Math.floor(Date.now() / MINUTE_MS);
	if (maintenant !== minuteConnue) minuteConnue = maintenant;
	return minuteConnue;
}

/** Aucune horloge côté serveur. Voir l'en-tête : `null` se dit, il ne se devine pas. */
function pasDHorloge(): null {
	return null;
}

/**
 * ⚠️ TRENTE SECONDES, PAS SOIXANTE. Un réveil calé sur la minute pleine
 * dériverait : posé à 10:00:59, il ne franchirait 10:01 qu'à 10:01:59, et
 * l'écran afficherait « 1 min » pendant deux minutes. Échantillonner deux fois
 * par minute borne l'erreur à trente secondes sans coûter davantage — le
 * rendu ne se refait que quand l'entier change.
 */
function abonner(onChange: () => void): () => void {
	const battement = window.setInterval(onChange, MINUTE_MS / 2);
	return () => window.clearInterval(battement);
}

/**
 * La minute courante, ou `null` quand aucune horloge n'est disponible.
 *
 * Multipliée par `MINUTE_MS`, elle redonne un horodatage : c'est ce que les
 * écrans comparent à `deposeLe`.
 */
export function useMinute(): number | null {
	return useSyncExternalStore(abonner, minuteCourante, pasDHorloge);
}

/**
 * Au-delà, une lecture qui n'a rien écrit se DIT.
 *
 * ⚠️ CE N'EST PAS UNE VALEUR JURIDIQUE, et ce seuil n'a donc pas sa place dans
 * `parametres.ts` : il ne fonde aucun montant, aucun délai opposable, rien
 * qu'on écrirait dans un acte. C'est un seuil d'affichage, et il est écrit
 * large exprès. La lecture la plus lente du produit est celle d'un PDF par le
 * modèle, qui se compte en dizaines de secondes ; un quart d'heure laisse
 * passer dix fois la pire lecture honnête avant de dire quoi que ce soit.
 */
export const MINUTES_SANS_NOUVELLE = 15;

/**
 * L'âge d'un dépôt en minutes, ou `null` si on ne peut pas le dire.
 *
 * ⚠️ `null` DANS TROIS CAS, ET AUCUN NE DOIT ÊTRE REPLIÉ SUR ZÉRO : pas
 * d'horloge (rendu serveur), horodatage absent, ou horloge en retard sur le
 * dépôt (le poste du gérant peut être déréglé). Zéro dirait « à l'instant »,
 * ce qu'on ne sait pas.
 */
export function minutesDepuis(quand: number, minute: number | null): number | null {
	if (minute === null) return null;
	const ecoule = minute * MINUTE_MS - quand;
	if (ecoule < 0) return null;
	return Math.floor(ecoule / MINUTE_MS);
}

/**
 * Une durée, dite comme on la dit.
 *
 * ⚠️ « SANS NOUVELLE DEPUIS 11 520 MIN » N'EST PAS UNE INFORMATION. Une lecture
 * tombée peut l'être depuis des jours — c'est même le cas le plus probable,
 * puisque rien ne la reprend — et le nombre de minutes devient alors un chiffre
 * qu'il faut diviser de tête pour comprendre qu'on attend depuis une semaine.
 * Trois paliers suffisent, et chacun garde un seul chiffre significatif : c'est
 * un ordre de grandeur qu'on lit, pas une durée qu'on oppose à quiconque.
 */
export function delaiLisible(minutes: number): string {
	if (minutes < 60) return `${minutes} min`;
	const heures = Math.floor(minutes / 60);
	if (heures < 24) return `${heures} h`;
	const jours = Math.floor(heures / 24);
	return `${jours} jour${jours > 1 ? 's' : ''}`;
}
