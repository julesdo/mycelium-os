/**
 * OUVRIR UNE RELANCE DANS LA MESSAGERIE DU GÉRANT.
 *
 * ⚠️ LIGNE ROUGE N° 1 : CE PRODUIT N'ÉCRIT JAMAIS AU DÉBITEUR. Rien ici
 * n'envoie quoi que ce soit. On construit une adresse `mailto:` que le
 * NAVIGATEUR remet au logiciel de courrier du gérant, qui ouvre un brouillon
 * qu'il relit, signe et envoie lui-même. Le recouvrement pour compte de tiers
 * est une activité encadrée ; la différence entre « ouvrir » et « envoyer »
 * n'est pas une nuance de vocabulaire.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI UN PLAFOND, ET POURQUOI IL EST DIT AU LIEU D'ÊTRE SUBI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Une adresse `mailto` trop longue ne rend pas une erreur : elle échoue EN
 * SILENCE, et de deux façons différentes.
 *
 *   · À partir de **2 046 caractères**, Chrome affiche bien son invite
 *     « ouvrir dans… » — on clique, et RIEN ne se passe.
 *   · À partir de **2 083 caractères**, Windows tronque l'adresse sans le
 *     dire, potentiellement au milieu d'un montant.
 *
 * Longueurs mesurées sur les gabarits réels du produit : une relance de
 * niveau 1 franchit les 2 000 caractères entre la 14e et la 15e facture, une
 * de niveau 2 entre la 17e et la 18e. Ce n'est donc pas un cas limite
 * théorique : c'est le dossier d'un client qu'on relance depuis un an.
 *
 * On mesure AVANT d'ouvrir, et au-delà du plafond on refuse en le disant. Une
 * panne invisible par construction est exactement ce que ce dépôt refuse : un
 * repli silencieux est un mensonge.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ET `mailto` N'ATTACHE AUCUN FICHIER
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La RFC 6068 ne garantit que `subject` et `body` ; aucun client de courrier
 * n'accepte de pièce jointe par ce chemin, et c'est une protection, pas une
 * limite : personne ne peut faire partir un décompte sans l'avoir ouvert. Le
 * détail période par période ne tiendrait de toute façon jamais — une ligne de
 * segment fait 87 caractères, 172 une fois encodée.
 */

/**
 * Le plafond retenu, avec sa marge sous le premier seuil qui casse.
 *
 * ⚠️ 1 900 ET PAS 2 045. L'encodage d'un accent coûte trois caractères au lieu
 * d'un, et un nom de client ou un numéro de facture inattendu peut ajouter
 * cinquante caractères à un message qu'on croyait mesuré. Se coller au seuil
 * exact ferait dépendre le bon fonctionnement du produit de l'orthographe d'une
 * raison sociale.
 */
export const PLAFOND_MAILTO = 1900;

export function tientDansLaMessagerie(longueur: number): boolean {
	return longueur <= PLAFOND_MAILTO;
}

/**
 * Le pourcent-encodage de la RFC 6068, plus strict qu'`encodeURIComponent`.
 *
 * ⚠️ `encodeURIComponent` LAISSE PASSER `!`, `'`, `(`, `)` ET `*`, que la RFC
 * 3986 classe comme sous-délimiteurs. Certains clients de courrier coupent le
 * corps du message à la première apostrophe non encodée — et une relance
 * française en contient toujours une.
 */
function encoder(texte: string): string {
	return encodeURIComponent(texte).replace(
		/[!'()*]/g,
		(c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
	);
}

export interface AdresseMessagerie {
	readonly url: string;
	readonly longueur: number;
	/** Vrai quand aucun destinataire n'est connu : le brouillon s'ouvrira vide de son `À :`. */
	readonly sansDestinataire: boolean;
}

/**
 * L'adresse à remettre au navigateur, et sa longueur pour décider avant.
 *
 * ⚠️ LES SAUTS DE LIGNE DEVIENNENT `%0D%0A`. La RFC 6068 impose le couple
 * retour-chariot / saut-de-ligne dans un corps de message : un `%0A` seul est
 * rendu par certains clients comme une espace, et le brouillon arrive en un
 * seul paragraphe illisible. `encodeURIComponent` ne fait pas cette conversion,
 * elle se fait ici, avant.
 */
export function adresseMessagerie({
	destinataire,
	objet,
	corps
}: {
	destinataire: string | undefined;
	objet: string;
	corps: string;
}): AdresseMessagerie {
	const sansDestinataire = destinataire === undefined || destinataire.trim() === '';
	// Les fins de ligne sont d'abord NORMALISÉES : un corps qui porte déjà des
	// « \r\n » donnerait sinon des « \r\r\n », que certains clients affichent en
	// double interligne.
	const corpsNormalise = corps.replace(/\r\n|\r|\n/g, '\r\n');

	const url =
		`mailto:${sansDestinataire ? '' : encoder(destinataire.trim())}` +
		`?subject=${encoder(objet)}&body=${encoder(corpsNormalise)}`;

	return { url, longueur: url.length, sansDestinataire };
}
