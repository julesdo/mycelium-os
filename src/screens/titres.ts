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
	/*
	  ⚠️ CINQ NOMS SONT PARTIS AVEC LEURS ADRESSES. « Abonnement », « Équipe »,
	  « Réglages » et « Vos données » nommaient quatre écrans que `/app/compte`
	  remplace : ce sont maintenant des SECTIONS d'une même page, et le titre
	  d'une section vit dans la section, pas dans une table de replis. Un nom
	  laissé ici après la mort de son écran est un commentaire faux dans un
	  fichier vert.
	*/
	compte: 'Votre compte',
	imports: 'Importer vos factures'
} as const;
