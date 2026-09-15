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
	debiteurs: 'Vos débiteurs',
	abonnement: 'Abonnement',
	equipe: 'Équipe',
	reglages: 'Réglages',
	donnees: 'Vos données',
	imports: 'Importer vos factures'
} as const;
