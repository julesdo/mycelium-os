/**
 * L'ADRESSE D'OÙ PARTENT LES RELANCES D'UN ÉTABLISSEMENT (23/10/2026).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ UNE ADRESSE PAR ÉTABLISSEMENT, SUR UN DOMAINE NEUTRE, SANS BOÎTE DERRIÈRE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Partir de `bonjour@letikette.com` nommait le logiciel et faisait écrire à
 * l'équipe le client qui répondait à l'expéditeur au lieu de l'adresse de
 * réponse — or Letikette ne reçoit aucune réponse du débiteur (ligne rouge
 * n° 1). Une adresse COMMUNE sur un domaine neutre réglerait le premier point,
 * pas le second, et en ajouterait un troisième : un débiteur relancé par deux
 * fournisseurs verrait la même adresse chez les deux, la signature d'un outil
 * commun, c'est-à-dire d'un cabinet de recouvrement.
 *
 * Chaque établissement part donc de SON adresse, tirée de son nom :
 * « Durand BTP » écrit de `durand-btp@<domaine neutre>`. Aucune boîte n'existe
 * derrière : on peut envoyer depuis n'importe quelle adresse d'un domaine
 * vérifié chez Resend, et les réponses vont à l'adresse du gérant (`reply_to`).
 *
 * ⚠️ SANS DOMAINE NEUTRE POSÉ, RIEN NE CHANGE : l'adresse commune d'avant
 * (`RELANCES_EMAIL`, à défaut `AUTH_EMAIL`). La variable `RELANCES_DOMAINE`
 * l'active, et une valeur qui n'est pas un domaine ne s'utilise pas.
 */

/** Les formes juridiques qu'une adresse n'a pas à porter : « SARL Durand » écrit de `durand@`. */
const FORMES_JURIDIQUES = new Set([
	'sarl',
	'sas',
	'sasu',
	'eurl',
	'sa',
	'snc',
	'sci',
	'scp',
	'scop',
	'selarl',
	'selas',
	'eirl',
	'ei'
]);

/** La longueur d'une partie locale, bien sous les soixante-quatre que permet la norme. */
const LONGUEUR_MAX = 40;

/** « Durand & Fils » → `durand-et-fils` ; « SARL DURAND BTP » → `durand-btp`. */
export function partieLocale(denomination: string): string {
	const mots = denomination
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/&/g, ' et ')
		.split(/[^a-z0-9]+/)
		.filter((mot) => mot !== '');
	let utiles = mots;
	while (utiles.length > 1 && FORMES_JURIDIQUES.has(utiles[0]!)) utiles = utiles.slice(1);
	while (utiles.length > 1 && FORMES_JURIDIQUES.has(utiles[utiles.length - 1]!)) {
		utiles = utiles.slice(0, -1);
	}
	if (utiles.length === 0) return 'contact';
	let partie = '';
	for (const mot of utiles) {
		const suivante = partie === '' ? mot : `${partie}-${mot}`;
		if (suivante.length > LONGUEUR_MAX) break;
		partie = suivante;
	}
	return partie === '' ? utiles[0]!.slice(0, LONGUEUR_MAX) : partie;
}

const DOMAINE = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

/** Le domaine neutre tel qu'écrit dans la configuration, ou `null` s'il n'en est pas un. */
export function lireDomaine(texte: string | undefined): string | null {
	if (texte === undefined) return null;
	const domaine = texte.trim().toLowerCase();
	return DOMAINE.test(domaine) ? domaine : null;
}

/** L'adresse nue d'un « Nom <adresse> ». */
function adresseNue(texte: string): string {
	return (/<([^>]+)>/.exec(texte)?.[1] ?? texte).trim();
}

/**
 * L'adresse d'envoi : l'établissement sur le domaine neutre quand il est posé,
 * l'adresse commune sinon.
 */
export function adresseDEnvoi(
	denomination: string,
	config: { readonly domaine: string | null; readonly commune: string }
): string {
	return config.domaine === null
		? adresseNue(config.commune)
		: `${partieLocale(denomination)}@${config.domaine}`;
}

/** L'en-tête `From` : le nom de l'établissement devant son adresse, sans ce qui casserait l'en-tête. */
export function enTeteExpediteur(denomination: string, adresse: string): string {
	const nom = denomination.replace(/["<>]/g, '').replace(/\s+/g, ' ').trim();
	return `"${nom}" <${adresse}>`;
}
