/**
 * Les mentions juridiques obligatoires de la restitution.
 *
 * Elles vivaient auparavant en clair dans le composant de l'écran de
 * diagnostic. Une phrase de gabarit se réécrit sans y penser, et personne ne
 * relit un rapport avant de l'envoyer à un client : la ligne rouge se
 * franchissait donc en une modification de copie, sans revue.
 *
 * On applique ici la même règle qu'au barème : **c'est du code, jamais des
 * données.** Ces constantes passent en revue, sont couvertes par un test, et
 * tout écran de restitution doit les afficher plutôt que reformuler.
 */

/**
 * Qui porte la responsabilité de la déclaration.
 *
 * Le ratio EGalim se calcule sur la TOTALITÉ des achats de la cantine, y
 * compris ceux que Mycelium n'a jamais vus. Laisser croire que Mycelium
 * déclare créerait une obligation de résultat sur un résultat dont il ne
 * détient aucun levier.
 */
export const MENTION_RESPONSABILITE =
	'Cette mesure est établie à partir des factures que vous avez déposées. ' +
	'La déclaration annuelle sur « ma cantine » reste signée par votre établissement, ' +
	'qui demeure responsable de l’exactitude des données transmises.';

/**
 * Qu'un diagnostic est figé.
 *
 * Un rapport qui bougerait après coup n'est pas une preuve. Une nouvelle
 * mesure produit un nouveau diagnostic daté, jamais une mise à jour de
 * l'ancien.
 */
export const MENTION_FIGE = (dateISO: string): string =>
	`Ce diagnostic est figé à sa date d’établissement, le ${dateISO}. ` +
	'Toute mesure ultérieure produit un nouveau diagnostic, daté à son tour.';

/** Ce que Mycelium fait, dit sans jamais promettre un résultat. */
export const MENTION_OBLIGATION_DE_MOYENS =
	'Mycelium mesure votre taux de produits durables et biologiques, le documente ' +
	'et le fait progresser, selon une obligation de moyens.';
