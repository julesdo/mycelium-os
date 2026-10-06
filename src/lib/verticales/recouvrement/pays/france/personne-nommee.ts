/**
 * LA PERSONNE NOMMÉE PAR LE TRIBUNAL, LUE DANS L'ANNONCE D'OUVERTURE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI CE LECTEUR (06/10/2026)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Pour déclarer sa créance, le gérant recopiait à la main le nom et l'adresse
 * du mandataire judiciaire ou du liquidateur, alors que l'annonce du BODACC,
 * déjà au dossier, les écrit :
 *
 *   « …, désignant liquidateur Selarl Mmj prise en la personne de Me Aymeric
 *   Mandin 23 Rue Victor Hugo 95300 Pontoise.Les déclarations des créances sont
 *   à adresser au liquidateur… »
 *
 * Ce module en tire les deux champs. Ce n'est PAS une lecture du droit : il ne
 * dit pas à qui déclarer, il recopie qui l'annonce désigne sous le titre que
 * l'intitulé de la procédure appelle (liquidateur en liquidation, mandataire
 * judiciaire sinon). Le gérant voit la citation au-dessus des deux champs, qui
 * restent modifiables, et valide le courrier avant qu'il parte.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ DANS LE DOUTE, RIEN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Un nom coupé au mauvais endroit enverrait la déclaration à une adresse qui
 * n'existe pas, dans un délai qui ne se rattrape pas. Le lecteur rend donc
 * `null` dès que la forme n'est pas celle qu'il connaît : pas de désignation
 * sous le bon titre, pas de numéro de rue avant le code postal, pas de code
 * postal. Les champs restent alors vides, comme avant, et la citation est là.
 *
 * Mesuré le 06/10/2026 sur 250 annonces d'ouverture consécutives du BODACC.
 */

export interface PersonneNommee {
	/** Tel que l'annonce l'écrit : « Selarl Mmj prise en la personne de Me Aymeric Mandin ». */
	readonly nom: string;
	/** « 23 Rue Victor Hugo 95300 Pontoise ». */
	readonly adresse: string;
}

/**
 * Ce qui ferme la désignation : la suite de l'annonce, ou la désignation
 * suivante. « avec les pouvoirs » suit l'adresse d'un administrateur.
 */
const FIN_DE_DESIGNATION =
	/,?\s*(?:et\s+)?d[ée]signant\b|,?\s*avec les pouvoirs|,?\s*\b(?:administrateur|mandataire judiciaire|liquidateur)\b|\.?\s*Les (?:déclarations (?:des |de )?)?créances|\.?\s*Nature de la procédure|\.?\s*Procédure ouverte/i;

/**
 * Le numéro qui ouvre une adresse : « 23 », « 4/6, », « 14/16 », « 42 ter »,
 * « 2 B, », « 30 bis, ». Il doit être suivi d'un mot : « 4R SOLUTIONS », nom
 * d'une société, ne s'y prend pas, parce que la lettre y est collée au chiffre.
 */
const NUMERO_DE_RUE =
	/(?:^|\s)(\d{1,4}(?:\s?[/-]{1,2}\s?\d{1,4})?(?:\s(?:bis|ter|quater)\b|\s[A-Z](?=,))?,?\s+(?=\p{L}))/u;

const CODE_POSTAL = /\b\d{5}\b/;

/** Nettoie les bords : une virgule, un point, « la » ou « le » devant une société. */
function nettoyer(texte: string): string {
	return texte
		.replace(/\s+/g, ' ')
		.replace(/^(?:la|le)\s+/i, '')
		.replace(/[\s,.;:-]+$/, '')
		.trim();
}

export function personneNommeeDansLAnnonce(
	complement: string,
	nature: string
): PersonneNommee | null {
	const titre = /liquidation/i.test(nature)
		? 'liquidateur'
		: /redressement|sauvegarde/i.test(nature)
			? 'mandataire judiciaire'
			: null;
	if (titre === null) return null;

	// La désignation : le titre, puis éventuellement « : », puis la personne. On
	// écarte « au liquidateur » et « auprès du Mandataire Judiciaire », qui
	// suivent dans la phrase sur les déclarations.
	const designation = new RegExp(
		`(?:^|[\\s,])(?<!\\bau |\\bdu )${titre}(?: judiciaire)?\\s*:?\\s+`,
		'i'
	);
	const trouve = designation.exec(complement);
	if (trouve === null) return null;

	const suite = complement.slice(trouve.index + trouve[0].length);
	const fin = FIN_DE_DESIGNATION.exec(suite);
	const segment = fin === null ? suite : suite.slice(0, fin.index);

	const numero = NUMERO_DE_RUE.exec(segment);
	if (numero === null) return null;
	// Le groupe capturé est le numéro lui-même, sans l'espace qui le précède.
	const debutAdresse = numero.index + numero[0].length - (numero[1]?.length ?? 0);

	const nom = nettoyer(segment.slice(0, debutAdresse));
	const adresse = nettoyer(segment.slice(debutAdresse));
	if (nom === '' || !CODE_POSTAL.test(adresse)) return null;
	return { nom, adresse };
}
