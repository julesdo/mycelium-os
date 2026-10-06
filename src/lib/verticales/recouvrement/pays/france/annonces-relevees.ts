/**
 * SIX ANNONCES D'OUVERTURE, RELEVÉES AU BODACC LE 06/10/2026, MOT POUR MOT.
 *
 * Source : https://bodacc-datadila.opendatasoft.com, jeu « annonces-commerciales »,
 * champs `jugement.nature` et `jugement.complementJugement`. Elles servent au
 * test du lecteur de la personne nommée (`personne-nommee.ts`), et la première
 * à la salle d'exposition, qui montre la déclaration pré-remplie.
 *
 * ⚠️ ELLES VIVENT ICI, ET PAS DANS LA SALLE NI DANS LE TEST, parce qu'elles sont
 * une SOURCE citée : leur vocabulaire est celui du greffe, et un article du code
 * y figure. Les reformuler pour passer le lexique en ferait des textes que le
 * BODACC n'a jamais publiés — précisément ceux que le lecteur doit savoir lire.
 */
export const ANNONCES_RELEVEES = {
	/** Le cas le plus courant : une liquidation, un liquidateur, son adresse. */
	liquidation: {
		nature: "Jugement d'ouverture de liquidation judiciaire",
		complement:
			"Jugement prononçant la liquidation judiciaire, date de cessation des paiements le 2 octobre 2025, désignant liquidateur Selarl Mmj prise en la personne de Me Aymeric Mandin 23 Rue Victor Hugo 95300 Pontoise.Les déclarations des créances sont à adresser au liquidateur ou sur le portail électronique prévu par les articles L.814-2 et L.814-13 du code de commerce dans les deux mois à compter de la publication au Bodacc.Nature de la procédure d'insolvabilité : non concernée."
	},
	/** Un administrateur nommé AVANT le mandataire judiciaire. */
	redressementAvecAdministrateur: {
		nature: "Jugement d'ouverture d'une procédure de redressement judiciaire",
		complement:
			"Jugement prononçant l'ouverture d'une procédure de redressement judiciaire, date de cessation des paiements le 28 février 2026 désignant administrateur SCP Cbf Associes en la personne de Me Lou Flechard 41 Rue de Liège 75008 Paris avec les pouvoirs : assistance, mandataire judiciaire SELARL Asteren prise en la personne de Me Julia Ruth 14/16 Rue de Lorraine 93000 Bobigny Les déclarations des créances sont à adresser au mandataire judiciaire ou sur le portail électronique prévu par les articles L.814-2 et L.814-13 du code de commerce dans les deux mois à compter de la publication au Bodacc."
	},
	/** Un administrateur nommé APRÈS le mandataire judiciaire. */
	sauvegardeAdministrateurApres: {
		nature: "Jugement d'ouverture d'une procédure de sauvegarde",
		complement:
			"Jugement prononçant l'ouverture d'une procédure de sauvegarde et désignant mandataire judiciaire SCP Br associes prise en la personne de Me Laura Bes 24 rue du Lieutenant Goinet 97300 Cayenne, Administrateur Judiciaire : Selarl Aj associes prise en la personne de Me Lesly miroite 44 rue Schoelcher 97300 Cayenne. Les déclarations des créances sont à adresser au mandataire judiciaire ou sur le portail électronique prévu par les articles L. 814-2 et L. 814-13 du code de commerce dans les deux mois à compter de la publication au Bodacc."
	},
	/** Un chiffre collé dans le nom de la société, et un numéro « 2 B, ». */
	chiffreDansLeNom: {
		nature: "Jugement d'ouverture de liquidation judiciaire",
		complement:
			'Jugement prononçant la liquidation judiciaire , date de cessation des paiements le 01 Mars 2026, désignant liquidateur SELARL 4R SOLUTIONS prise en la personne de Maître Jean-Joachim BISSIEUX 2 B, avenue de Marbotte - 21000 Dijon . Les créances sont à adresser, dans les deux mois de la présente publication, auprès du liquidateur ou sur le portail électronique prévu par les articles L. 814-2 et L. 814-13 du code de commerce.'
	},
	/** Une réouverture qui « nomme » sans dire sous quel titre. */
	reouvertureSansTitre: {
		nature: "Autre jugement d'ouverture",
		complement:
			'Jugement prononçant la réouverture de la procédure de liquidation judiciaire et a nommé la SELARL MMJ prise en la personne de Me Aymeric MANDIN 23 rue Victor Hugo 95300 PONTOISE.Nomme M.Paul NATHAN juge commissaire en date du 25 septembre 2026.'
	},
	/** Une société dont le nom contient le titre lui-même. */
	titreDansLeNom: {
		nature: "Jugement d'ouverture d'une procédure de redressement judiciaire",
		complement:
			"Jugement prononçant l'ouverture d'une procédure de redressement judiciaire , date de cessation des paiements le 28 Juillet 2026 , désignant mandataire judiciaire SELARL SBCMJ - Mandataire Judiciaire prise en la personne de Maître Alexandre BANC 22, rue Taisson - 30100 Ales . Les créances sont à adresser, dans les deux mois de la présente publication, auprès du Mandataire Judiciaire ou sur le portail électronique prévu par les articles L. 814-2 et L. 814-13 du code de commerce."
	}
} as const;
