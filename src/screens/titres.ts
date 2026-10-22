import { NOM_DU_PILOTE } from '../ui/plume';
import type { TypeDeNotification } from '../lib/notifications/categories';

/**
 * LE NOM DES ÉCRANS QU'UNE PAGE POUSSÉE NOMME EN REPLI.
 *
 * ⚠️ UNE SEULE SOURCE POUR DEUX LECTURES. Le parent en tire son titre, que
 * `PageEcran` publie et que le retour par l'historique relit ; l'enfant en tire
 * le libellé de son retour, celui qu'il porte après un rechargement. Écrits
 * deux fois, ils avaient divergé (« Équipe » et « Votre équipe », « Importer
 * vos factures » et « Importer ») sans qu'aucun test tombe, et le retour
 * changeait de nom au rechargement pour la même destination.
 */
export const TITRE_ECRAN = {
	aujourdhui: 'Aujourd’hui',
	debiteurs: 'Vos clients',
	/*
	  ⚠️ CINQ NOMS SONT PARTIS AVEC LEURS ADRESSES. « Abonnement », « Équipe »,
	  « Réglages » et « Vos données » nommaient quatre écrans que `/app/compte`
	  remplace : ce sont maintenant des SECTIONS d'une même page, et le titre
	  d'une section vit dans la section, pas dans une table de replis. Un nom
	  laissé ici après la mort de son écran est un commentaire faux dans un
	  fichier vert.
	*/
	compte: 'Votre compte',
	imports: 'Vos dépôts',
	coffre: 'Coffre-fort'
} as const;

/** Les genres d'une notification, tels que la base les écrit. */
/** Les genres de la boîte de réception : ceux des notifications, à une seule source. */
export type GenreNotification = TypeDeNotification;

/**
 * LE TITRE D'UNE NOTIFICATION VIENT DE SON GENRE, PAS DE LA BASE.
 *
 * ⚠️ LA NUIT ÉCRIVAIT « PRESCRIPTION PROCHE », le mot du droit, dans le titre
 * qu'elle stockait. Lu à l'écran, il passait sous le nez du lexique (qui ne
 * balaie pas la base) ; et une notification ne se réécrit pas. Le titre se
 * déduit donc du genre, dans les mots de tout le monde — ceux des cartes du
 * matin (`RESUME_PAR_TYPE`) —, et le titre stocké n'est plus lu.
 *
 * Ici et non dans l'écran des notifications (13/10/2026) : la bulle de Plume, montée
 * avec la coquille, annonce une notification par son titre, et la coquille ne
 * charge aucun écran entier.
 */
export const TITRE_DE_NOTIFICATION: Readonly<Record<GenreNotification, string>> = {
	PRESCRIPTION_PROCHE: 'Date limite pour agir',
	ECHEANCE_PROCHE: 'Échéance de procédure',
	IMPORT_TERMINE: 'Import terminé',
	DEBITEUR_DEGRADE: 'Situation dégradée au registre',
	HUMAN_ASSIST_REPLY: 'Nouvelle réponse',
	CREANCE_MURE: 'Un dossier à regarder',
	PILOTE_BLOQUE: `${NOM_DU_PILOTE} a besoin de vous`,
	RISQUE_EN_BAISSE: 'La santé d’un client baisse',
	ABONNEMENT: 'Votre abonnement',
	PAIEMENT_RECU: 'Paiement reçu',
	JALON: 'Une réussite',
	SEMAINE: 'Votre semaine',
	RECOMMANDATION: 'Recommandation'
};
