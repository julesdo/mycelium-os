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
 * Les quatre conditions légales : la créance doit être certaine, liquide et
 * exigible, et avoir fait l'objet d'une facturation entre commerçants.
 *
 * Elles ne viennent plus du brief mais de leur texte, relevé le 16 septembre
 * 2026 — voir `PARAMETRES.conditionsCreanceL126`, qui le cite et porte les deux
 * réserves qui comptent : le texte vise la FACTURATION et non les personnes, et
 * il n'a encore reçu aucune interprétation.
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
	exigible: 'le caractère exigible',
	entreCommercants: 'la qualité de commerçant des deux parties'
};

/**
 * LE TABLEAU À TROIS COLONNES — ce que dit la loi, ce qu'il y a dans votre
 * dossier, ce que vous avez répondu.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ IL REMPLACE UN VERDICT, ET IL N'EN REND AUCUN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * L'écran disait « mûre pour une procédure » et la surveillance annonçait « une
 * créance est mûre ». Dire d'une créance qu'elle remplit ses conditions, c'est
 * qualifier des faits au regard du droit : une consultation juridique, que ce
 * logiciel ne donne pas (relecture du 25/09/2026, § 2). Il lit, il calcule et il
 * montre ; le gérant qualifie, choisit et signe.
 *
 * Aucune ligne ne conclut donc. La première colonne lit le texte, la deuxième
 * dit ce que le logiciel a trouvé dans les factures et les réponses, la troisième
 * rend la réponse du gérant — ou dit qu'elle manque, ou qu'elle a été
 * pré-remplie et attend sa confirmation.
 */

/** Le nom d'une condition, en mots de tous les jours. Le terme juridique vient en second. */
export const NOM_CONDITION: Record<ConditionLegale, string> = {
	certaine: 'La somme est due',
	liquide: 'Le montant est chiffré',
	exigible: 'La date de paiement est passée',
	entreCommercants: 'La facture est entre commerçants'
};

/** Le terme du texte, affiché en second, pour qui voudrait le retrouver. */
export const TERME_JURIDIQUE: Record<ConditionLegale, string> = {
	certaine: 'créance certaine',
	liquide: 'créance liquide',
	exigible: 'créance exigible',
	entreCommercants: 'facturation entre commerçants'
};

/**
 * Ce que dit la loi, condition par condition : une lecture du texte cité par
 * `PARAMETRES.conditionsCreanceL126`, en mots simples. Une information sur
 * l'état du droit, jamais une conclusion sur le dossier.
 */
export const CE_QUE_DIT_LA_LOI: Record<ConditionLegale, string> = {
	certaine: 'Votre client doit vous devoir cette somme sans discussion possible.',
	liquide: 'Le montant réclamé doit être connu et chiffré en euros.',
	exigible: 'La date à laquelle il fallait payer doit être passée.',
	entreCommercants: 'La facture doit avoir été émise entre commerçants.'
};

/** Ce que le logiciel a trouvé, pour remplir la colonne du milieu. */
export interface FaitsDuDossier {
	readonly aujourdHui: string;
	readonly nombreFactures: number;
	/** Le total des factures, déjà écrit en euros. `null` quand aucune n'est chiffrée. */
	readonly totalFactures: string | null;
	/** L'échéance la plus ancienne des factures, en ISO. */
	readonly echeanceLaPlusAncienne: string | null;
	/** Le gérant a-t-il répondu au moins une fois aux questions sur une contestation ? */
	readonly litigeRenseigne: boolean;
	readonly litigieux: boolean;
	readonly creancierCommercant: EtatCritere;
	readonly debiteurCommercant: EtatCritere;
}

export type EtatReponse = 'CONFIRMEE' | 'A_CONFIRMER' | 'SANS_REPONSE';

export interface LigneCondition {
	readonly condition: ConditionLegale;
	readonly nom: string;
	readonly termeJuridique: string;
	readonly ceQueDitLaLoi: string;
	readonly source: string;
	readonly dansLeDossier: string;
	/** La valeur retenue : celle du gérant, ou celle pré-remplie qu'il n'a pas encore confirmée. */
	readonly reponse: EtatCritere;
	readonly etatReponse: EtatReponse;
	/**
	 * `false` pour la somme due : elle se répond par les questions sur une éventuelle
	 * contestation, des faits que le gérant seul connaît, jamais par un « oui » global.
	 */
	readonly repondable: boolean;
}

function commercant(etat: EtatCritere): string {
	return etat === 'ok' ? 'commerçant' : etat === 'ko' ? 'pas commerçant' : 'pas déterminé';
}

function dansLeDossier(
	condition: ConditionLegale,
	faits: FaitsDuDossier,
	dateLisible: (iso: string) => string
): string {
	switch (condition) {
		case 'certaine':
			if (!faits.litigeRenseigne) return 'Vous n’avez pas encore dit si votre client conteste.';
			return faits.litigieux
				? 'Vous avez indiqué que votre client conteste, ou qu’un fait le laisse penser.'
				: 'Vous n’avez signalé aucune contestation.';
		case 'liquide':
			return faits.totalFactures === null
				? 'Aucune facture chiffrée dans ce dossier.'
				: `${faits.nombreFactures} facture${faits.nombreFactures > 1 ? 's' : ''}, ${faits.totalFactures} au total.`;
		case 'exigible':
			if (faits.echeanceLaPlusAncienne === null) {
				return 'Aucune date de paiement lisible sur les factures.';
			}
			return faits.echeanceLaPlusAncienne < faits.aujourdHui
				? `Date de paiement dépassée depuis le ${dateLisible(faits.echeanceLaPlusAncienne)}.`
				: `Date de paiement : le ${dateLisible(faits.echeanceLaPlusAncienne)}, pas encore passée.`;
		case 'entreCommercants':
			return (
				`Vous : ${commercant(faits.creancierCommercant)}. ` +
				`Votre client : ${commercant(faits.debiteurCommercant)}, d’après le registre.`
			);
	}
}

/**
 * Les quatre lignes du tableau, dans l'ordre où elles se lisent.
 *
 * ⚠️ UNE VALEUR PRÉ-REMPLIE N'EST PAS UNE RÉPONSE. Le logiciel déduit le montant
 * et l'échéance des factures, la qualité de commerçant du registre : il le dit
 * « à confirmer » tant que le gérant ne l'a pas confirmé, et `confirmees` est la
 * seule preuve qu'il l'a fait.
 */
export function lignesConditions(
	etats: Pick<CreanceQualifiee, ConditionLegale>,
	confirmees: readonly string[],
	faits: FaitsDuDossier,
	source: string,
	dateLisible: (iso: string) => string
): readonly LigneCondition[] {
	return CONDITIONS_LEGALES.map((condition) => {
		const reponse = etats[condition];
		// La somme due se confirme par les réponses sur la contestation.
		const confirmee =
			condition === 'certaine' ? faits.litigeRenseigne : confirmees.includes(condition);
		return {
			condition,
			nom: NOM_CONDITION[condition],
			termeJuridique: TERME_JURIDIQUE[condition],
			ceQueDitLaLoi: CE_QUE_DIT_LA_LOI[condition],
			source,
			dansLeDossier: dansLeDossier(condition, faits, dateLisible),
			reponse,
			etatReponse: reponse === 'unknown' ? 'SANS_REPONSE' : confirmee ? 'CONFIRMEE' : 'A_CONFIRMER',
			repondable: condition !== 'certaine'
		};
	});
}
