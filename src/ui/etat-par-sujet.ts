/** Une valeur, et le sujet pour lequel on l'a posée. */
export interface PosePourUnSujet<T> {
	/** L'identifiant du sujet ouvert au moment où la valeur a été posée. */
	readonly sujet: string;
	readonly valeur: T;
}

/**
 * CE QU'UN VOLET A POSÉ POUR UN SUJET, RELU SOUS CE SUJET SEUL.
 *
 * ⚠️ UN VOLET QUI CHANGE DE SUJET NE MONTRE PAS CE QU'ON A POSÉ POUR LE
 * PRÉCÉDENT. La route des débiteurs gardait dans ses états la sélection de
 * factures, les erreurs, les candidats du registre, le montant et la date d'un
 * virement. Le débiteur ouvert vit dans l'adresse, et en changer ne remonte pas
 * la route : un clic ne vidait que la sélection, le retour du navigateur ne
 * vidait rien. La fiche de B proposait alors les candidats trouvés pour A,
 * « Retenir » pouvait écrire sur B le SIREN et la forme juridique de A, et le
 * radar aurait surveillé la mauvaise entreprise.
 *
 * Chaque état porte donc le sujet pour lequel il a été posé, et se lit ici : la
 * valeur sous ce sujet, l'état de repos sous tout autre, et quand aucun sujet
 * n'est choisi.
 *
 * ⚠️ AU RENDU, JAMAIS DANS UN EFFET. Vider l'état dans un `useEffect` quand le
 * sujet change laisse d'abord passer un rendu où l'ancienne valeur se lit sous le
 * nouveau sujet, puis en demande un second. Dérivée au rendu, la valeur n'a pas
 * de rendu intermédiaire, et le projet interdit `setState` dans un effet.
 *
 * ⚠️ UN GESTE ASYNCHRONE POSE POUR LE SUJET QUI L'A LANCÉ. Il le capture à son
 * départ : une réponse qui arrive après un changement de sujet s'inscrit sur
 * celui qui l'a demandée, et ne s'affiche pas sous le suivant.
 */
export function lirePourLeSujet<T>(
	pose: PosePourUnSujet<T> | null,
	sujet: string | null,
	repos: T
): T {
	return pose !== null && pose.sujet === sujet ? pose.valeur : repos;
}
