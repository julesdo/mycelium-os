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

/**
 * La version de la formule de signature, enregistrée avec chaque signature.
 *
 * Ce que quelqu'un a signé doit rester lisible tel qu'il l'a signé, même après
 * que le texte a évolué. Sans cette version, une reformulation d'une virgule
 * réécrirait rétroactivement ce que trois cents gérants ont accepté.
 */
export const VERSION_MENTION_SIGNATURE = '2026-08';

/**
 * Ce que le gérant déclare en signant son bilan.
 *
 * Rédigé au plus près de ce qu'il peut réellement attester : que les factures
 * déposées sont celles de son établissement, et qu'il a relu les
 * classifications qui lui ont été soumises. Rien de plus. Lui faire attester
 * l'exactitude d'un classement automatique qu'il n'a jamais vu serait lui
 * faire signer notre travail.
 */
export const MENTION_SIGNATURE =
	'En signant, je certifie que les factures déposées sont celles de mon ' +
	'établissement pour la période mesurée, et que j’ai relu les classifications ' +
	'qui m’ont été soumises. Cette signature vaut approbation du présent bilan ' +
	'à sa date d’édition.';

/**
 * Ce que cette signature vaut, dit sans l'enjoliver.
 *
 * C'EST LA MENTION LA PLUS IMPORTANTE DU PRODUIT après celles de
 * responsabilité. Une signature électronique QUALIFIÉE au sens du règlement
 * eIDAS suppose un prestataire de services de confiance qualifié, qui vérifie
 * l'identité du signataire et délivre un certificat — un service payant et
 * soumis à agrément. Aucune brique libre et gratuite ne peut s'y substituer :
 * la contrainte est juridique, pas technique.
 *
 * Ce que nous produisons est une signature électronique SIMPLE, adossée à une
 * piste d'audit. Elle est recevable, et sa force probante dépend de la
 * fiabilité du procédé — d'où la piste. Laisser croire qu'elle est qualifiée
 * serait la promesse la plus coûteuse que ce produit puisse faire, parce
 * qu'elle ne se découvrirait qu'au moment d'un litige.
 */
export const MENTION_PORTEE_SIGNATURE =
	'Signature électronique simple au sens du règlement eIDAS, adossée à une piste ' +
	'd’audit : compte authentifié du signataire, horodatage serveur et empreinte ' +
	'numérique de la mesure. Elle ne constitue pas une signature électronique ' +
	'qualifiée, laquelle suppose un prestataire de services de confiance qualifié.';
