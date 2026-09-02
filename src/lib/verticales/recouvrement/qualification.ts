/**
 * Les types du domaine « qualification d'une créance ».
 *
 * L'ÉTAT D'UN CRITÈRE A TROIS VALEURS, PAS DEUX. `unknown` n'est pas un
 * `false` poli : c'est un état distinct, qui appelle une action différente. Un
 * critère `ko` ferme une procédure ; un critère `unknown` se lève en posant une
 * question à l'utilisateur. Les confondre reviendrait soit à écarter des
 * créances recouvrables, soit — bien pire — à présumer favorablement, ce que
 * le § 5 du brief interdit expressément.
 *
 * Le moteur de scoring complet (phase 4) s'appuiera sur ces types. Ils sont
 * posés ici parce que les procédures en ont besoin dès maintenant, et qu'un
 * type dupliqué finirait par diverger.
 */

/** Un critère est établi, expressément absent, ou indéterminé. */
export type EtatCritere = 'ok' | 'ko' | 'unknown';

/** Les pièces qui peuvent soutenir une créance. */
export type ClePiece =
	| 'FACTURE'
	| 'BON_DE_COMMANDE'
	| 'DEVIS_SIGNE'
	| 'BON_DE_LIVRAISON'
	| 'CGV'
	| 'CONTRAT'
	| 'ECHANGES'
	| 'MISE_EN_DEMEURE';

/**
 * Les quatre conditions légales confirmées par le brief comme vérifiées :
 * « la créance doit être certaine, liquide et exigible, et issue d'une
 * facturation entre commerçants ».
 */
export interface CreanceQualifiee {
	readonly certaine: EtatCritere;
	readonly liquide: EtatCritere;
	readonly exigible: EtatCritere;
	readonly entreCommercants: EtatCritere;
	readonly piecesFournies: readonly ClePiece[];
}

/** Les quatre conditions, dans l'ordre où elles se lisent. */
export const CONDITIONS_LEGALES = [
	'certaine',
	'liquide',
	'exigible',
	'entreCommercants'
] as const satisfies ReadonlyArray<keyof CreanceQualifiee>;

export type ConditionLegale = (typeof CONDITIONS_LEGALES)[number];

/** Comment nommer une condition dans un constat destiné à être lu. */
export const LIBELLE_CONDITION: Record<ConditionLegale, string> = {
	certaine: 'le caractère certain',
	liquide: 'le caractère liquide',
	exigible: "le caractère exigible",
	entreCommercants: 'la qualité de commerçant des deux parties'
};

export interface Evaluation {
	readonly eligible: boolean;
	/** Les conditions expressément absentes. Elles ferment la procédure. */
	readonly bloquants: readonly ConditionLegale[];
	/** Les conditions indéterminées. Elles se lèvent en posant la question. */
	readonly aDeterminer: readonly ConditionLegale[];
	/**
	 * Des CONSTATS, jamais des recommandations (§ 0.4 du brief). « Cette créance
	 * remplit les conditions X, Y, Z » est autorisé ; « vous devriez engager
	 * telle procédure » ne l'est pas — ce serait du conseil juridique.
	 */
	readonly constats: readonly string[];
}
