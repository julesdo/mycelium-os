/**
 * LA FRISE D'UN DOSSIER — ce qui s'est passé, et quand.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI ELLE EXISTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le journal des faits existait en base depuis des mois et n'était affiché
 * nulle part : le chantier de la page dossier l'avait nommé comme un contenu
 * « sans nouveau foyer ». Et rien ne portait le travail humain — un appel, une
 * promesse, une note (audit du 29/09/2026, F3). « Où j'en suis sur ce dossier »
 * ne se lisait donc pas : il fallait rouvrir sa messagerie.
 *
 * ⚠️ DEUX SOURCES, UNE SEULE LIGNE DE TEMPS. Ce que la machine a constaté et
 * ce que le gérant a noté se lisent ensemble, parce que c'est ensemble qu'ils
 * racontent le dossier. La colonne `auteur` dit lequel est lequel, et elle ne
 * se devine pas : un constat de la machine et une note du gérant n'ont pas le
 * même poids le jour où un tiers lit le dossier.
 *
 * ⚠️ AUCUN CODE À L'ÉCRAN. Une clé de journal inconnue de ce module ne s'affiche
 * pas en `ORDRE_IMPUTATION_CHOISI` : elle prend un intitulé générique, et son
 * texte — déjà écrit en toutes lettres à la consignation — porte le détail. Un
 * identifiant de développeur sur l'écran d'un gérant est un défaut, pas une
 * information.
 */

export type AuteurDuFait = 'LOGICIEL' | 'VOUS';

export interface FaitDeLaFrise {
	/** L'horodatage, en millisecondes. C'est lui qui range la frise. */
	readonly quand: number;
	readonly auteur: AuteurDuFait;
	readonly titre: string;
	/** Ce qui s'est passé, en toutes lettres. Absent quand le titre suffit. */
	readonly detail?: string;
	/** D'où vient le fait : « le journal officiel des entreprises du 16/09 ». */
	readonly source?: string;
}

/**
 * Les faits que le logiciel consigne, et leur intitulé de tous les jours.
 *
 * ⚠️ UNE CLÉ ABSENTE N'EST PAS UNE ERREUR, c'est un fait plus récent que cette
 * table. Elle prend alors l'intitulé générique ci-dessous, et son texte porte
 * le reste : mieux vaut un titre vague et un détail exact qu'un code.
 */
export const INTITULE_DU_FAIT: Readonly<Record<string, string>> = {
	OUVERT_PAR_LE_PILOTE: 'Plume a préparé le dossier',
	DOSSIER_DEMARRE: 'Vous avez démarré le dossier',
	DOSSIER_DEMARRE_GUIDE: 'Vous avez démarré le dossier avec Plume',
	GESTE_RELANCER: 'Plume a préparé une relance, à votre demande',
	GESTE_RAPPEL: 'Vous avez posé un rappel',
	DOSSIER_CLASSE: 'Vous avez classé le dossier',
	DOSSIER_ROUVERT: 'Vous avez rouvert le dossier',
	GESTE_PROMESSE: 'Vous avez noté une promesse de paiement',
	GESTE_NOTE: 'Vous avez noté quelque chose',
	GESTE_EMAIL: 'Vous avez enregistré son adresse',
	GESTE_RETIRER_DU_PILOTE: 'Vous avez retiré ce client du pilote',
	GESTE_REMETTRE_AU_PILOTE: 'Vous avez remis ce client au pilote',
	GESTE_RETENIR: 'Vous avez retenu une relance',
	DECOMPTE_ARRETE: 'Un décompte a été arrêté',
	DECOMPTE_DATE: 'Le montant réclamé a été daté',
	FACTURE_RATTACHEE: 'Une facture a rejoint le dossier',
	ORDRE_IMPUTATION_CHOISI: 'Vous avez choisi ce que remboursent les paiements reçus',
	PROPOSITION_RETENUE: 'Vous avez retenu une proposition du logiciel',
	PROPOSITION_CORRIGEE: 'Vous avez corrigé une proposition retenue',
	ABANDON_ASSUME_A_L_ARRET: 'Vous avez assumé ce que le décompte laisse de côté',
	CONTESTATION_ECRITE: 'Vous avez répondu sur une contestation écrite',
	RECONNAISSANCE_ECRITE: 'Vous avez répondu sur une reconnaissance écrite'
};

const INTITULE_GENERIQUE = 'Un fait a été consigné';

export function intituleDuFait(cle: string): string {
	return INTITULE_DU_FAIT[cle] ?? INTITULE_GENERIQUE;
}

/** Ce qu'un genre de note du gérant annonce en tête de sa rangée. */
export const INTITULE_DE_LA_NOTE: Readonly<Record<string, string>> = {
	NOTE: 'Note',
	ECHANGE: 'Échange avec votre client',
	PROMESSE: 'Il a promis de payer',
	RAPPEL: 'Vous vouliez y revenir',
	ECHEANCIER: 'Paiement en plusieurs fois convenu'
};

/** Par quoi l'échange a eu lieu, dit comme on le dit. */
export const INTITULE_DU_CANAL: Readonly<Record<string, string>> = {
	APPEL: 'Au téléphone',
	COURRIEL: 'Par courriel',
	SMS: 'Par SMS',
	COURRIER: 'Par courrier',
	VISITE: 'De vive voix'
};

/**
 * La frise, du plus récent au plus ancien.
 *
 * ⚠️ À HORODATAGE ÉGAL, L'ORDRE EST CELUI DES ENTRÉES. Deux faits consignés
 * dans la même milliseconde — un import qui rattache douze factures — n'ont
 * pas d'ordre réel entre eux : en inventer un par identifiant donnerait un
 * classement stable mais faux, et le lecteur y lirait une chronologie.
 */
export function composerLaFrise(faits: readonly FaitDeLaFrise[]): readonly FaitDeLaFrise[] {
	return [...faits].sort((a, b) => b.quand - a.quand);
}
