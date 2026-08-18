/**
 * La normalisation des libellés — l'étape qui fait l'économie du produit :
 * ~3 000 lignes de factures deviennent 300 à 500 libellés distincts, et seuls
 * ces distincts partent en classification.
 *
 * Elle ne sert QU'À rapprocher deux écritures d'un même produit. Elle ne
 * cherche pas à produire du français correct, et le libellé lisible par un
 * humain reste `rawLabel`, conservé intact sur chaque ligne. Les deux fautes
 * possibles n'ont donc pas le même poids :
 *
 *   - fusionner à tort deux produits différents fausse le diagnostic ;
 *   - ne pas fusionner deux écritures d'un même produit coûte un appel.
 *
 * Tout arbitrage ci-dessous penche du côté de la deuxième.
 */

/**
 * Ligatures : `NFD` ne les décompose pas (ce n'est pas une décomposition
 * canonique). BŒUF / BOEUF est le cas qui compte — il tombe dans la famille
 * qui porte le seuil des 60 %, où une non-fusion se paie.
 */
const LIGATURES: ReadonlyArray<[RegExp, string]> = [
	[/Œ/g, 'OE'],
	[/Æ/g, 'AE']
];

/**
 * Substitutions d'OCR observées sur de vraies factures fournisseurs.
 * Appliquées UNIQUEMENT à l'intérieur d'un mot alphabétique — un chiffre
 * bordé de lettres est presque toujours une erreur de reconnaissance, un
 * chiffre isolé ou bordé de chiffres est presque toujours un vrai chiffre.
 *
 * Contre-exemples que cette règle protège :
 *   « 2.5KG », « 4/4 », « REF 88213 », « H.V.E 3 », « Code 1 »
 */
const SUBSTITUTIONS_OCR: ReadonlyArray<[RegExp, string]> = [
	[/(?<=[A-Z])0(?=[A-Z])/g, 'O'], // CAR0TTES -> CAROTTES
	[/(?<=[A-Z])3(?=[A-Z])/g, 'E'], // L3S -> LES
	[/(?<=[A-Z])1(?=[A-Z])/g, 'I'], // PR1X -> PRIX
	[/(?<=[A-Z])5(?=[A-Z])/g, 'S'], // CA5SE -> CASSE
	[/(?<![A-Z0-9])8(?=[A-Z]{2})/g, 'B'], // 8RETONNES -> BRETONNES
	// Le `!` se substitue sans condition : il n'apparaît jamais légitimement
	// dans un libellé produit. Il vaut tantôt I, tantôt L (FR!GO -> FRIGO,
	// L!VRAISON -> LIVRAISON) — on retient I uniformément, ce qui suffit pour
	// rapprocher deux écritures du même produit.
	[/!/g, 'I']
];

/**
 * Un jeton qui se lit comme une quantité, un conditionnement ou une référence
 * numérique n'est JAMAIS réparé : ses chiffres sont de vrais chiffres.
 *
 * Le cas que les lookarounds ci-dessus ne couvrent pas seuls est le
 * conditionnement multiplicatif — dans « 4X1KG », le 1 est bordé de deux
 * lettres et serait pris pour un I.
 *
 * Le suffixe d'unité est borné à 3 lettres (KG, G, GR, L, CL, ML, PCE, BTE…)
 * et cette borne porte une tension assumée : au-delà, « 8RETONNES » entrerait
 * dans le motif et cesserait d'être réparable. Un « 1PIECE » collé resterait
 * donc hors du filet — il s'écrit « 1 PIECE » en pratique.
 */
const JETONS_MESURE: readonly RegExp[] = [
	/^\d+([.,]\d+)?(\s*[X*]\s*\d+([.,]\d+)?)*[A-Z]{0,3}$/, // 2.5KG, 4X1KG, 12X500G, 88213, 3
	/^\d+\/\d+$/ // 4/4, 1/2 — les formats de conserve
];

function estJetonMesure(jeton: string): boolean {
	return JETONS_MESURE.some((motif) => motif.test(jeton));
}

function reparerOcr(jeton: string): string {
	if (estJetonMesure(jeton)) return jeton;
	let resultat = jeton;
	for (const [motif, remplacement] of SUBSTITUTIONS_OCR) {
		resultat = resultat.replace(motif, remplacement);
	}
	return resultat;
}

/**
 * Le socle commun aux libellés et aux fournisseurs, dans cet ordre :
 * majuscules, ligatures, retrait des accents, réparation d'OCR jeton par
 * jeton, écrasement des espaces.
 *
 * Ne retire NI les chiffres, NI les unités, NI les mentions de
 * conditionnement : « 4/4 » et « 2.5KG » distinguent des produits réellement
 * différents, et les fusionner ferait classer une conserve comme un sac de
 * 25 kg.
 */
function normaliserSocle(texte: string): string {
	let resultat = texte.toUpperCase();

	for (const [motif, remplacement] of LIGATURES) {
		resultat = resultat.replace(motif, remplacement);
	}

	// Apostrophe typographique et apostrophe droite désignent le même mot.
	resultat = resultat.replace(/[‘’ʼ]/g, "'");

	// NFD sépare la lettre de ses diacritiques, la classe Unicode les retire.
	resultat = resultat.normalize('NFD').replace(/\p{Diacritic}/gu, '');

	// `\s` couvre l'espace insécable, que les exports PDF et tableur sèment
	// partout — sans quoi deux écritures identiques à l'œil restent distinctes.
	return resultat
		.split(/\s+/)
		.filter((jeton) => jeton !== '')
		.map(reparerOcr)
		.join(' ');
}

/** Le libellé d'un produit, ramené à sa forme de regroupement. */
export function normaliserLibelle(rawLabel: string): string {
	return normaliserSocle(rawLabel);
}

/**
 * Formes juridiques retirées du nom d'un fournisseur : elles varient d'une
 * facture à l'autre pour la même maison (« POMONA », « Pomona S.A. »,
 * « POMONA SA »). Les formes agricoles y figurent parce que la moitié du
 * carnet d'un producteur en porte une.
 */
const FORMES_JURIDIQUES = new Set([
	'SAS',
	'SASU',
	'SARL',
	'EURL',
	'SA',
	'SNC',
	'SCS',
	'SCOP',
	'SCIC',
	'GIE',
	'EARL',
	'GAEC',
	'SCEA',
	'SCA',
	'SEM'
]);

/**
 * Le nom d'un fournisseur, ramené à sa forme de regroupement. Mêmes étapes
 * que pour un libellé, plus le retrait des points d'acronyme (qui ramène
 * « S.A.R.L. » à « SARL ») puis des formes juridiques elles-mêmes.
 */
export function normaliserFournisseur(nom: string): string {
	const socle = normaliserSocle(nom);

	// Les points ne portent aucun sens dans un nom de société, et les retirer
	// est ce qui fait coïncider « S.A.R.L. » avec « SARL ».
	const sansPoints = socle
		.replace(/\./g, '')
		.split(/\s+/)
		.filter((jeton) => jeton !== '');

	const utiles = sansPoints.filter((jeton) => !FORMES_JURIDIQUES.has(jeton));

	// Un nom réduit à sa seule forme juridique ne doit pas devenir vide : mieux
	// vaut un regroupement grossier qu'un fournisseur sans nom.
	return (utiles.length > 0 ? utiles : sansPoints).join(' ');
}
