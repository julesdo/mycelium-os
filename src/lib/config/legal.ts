/**
 * L'identité légale affichée partout : pied de page public, mentions des
 * rapports, en-tête des courriers aux fournisseurs. Source unique, pour que ces
 * trois endroits ne puissent pas diverger.
 *
 * ⚠️ ADRESSE À CHANGER, ET ELLE N'A TOUJOURS PAS ÉTÉ CHANGÉE, VOLONTAIREMENT.
 *
 * Le déménagement vers Suresnes est décidé, et la demande de le refléter ici a
 * été formulée deux fois. Elle n'est pas exécutable, pour deux raisons qui
 * tiennent toutes les deux.
 *
 * 1. L'ADRESSE COMPLÈTE N'A JAMAIS ÉTÉ FOURNIE. « Suresnes » est une commune,
 *    pas une domiciliation : il manque le numéro, la voie et le code postal. Une
 *    adresse légale ne se devine pas — c'est la mention qui permet d'assigner
 *    l'entreprise.
 *
 * 2. LE REGISTRE DIT AUTRE CHOSE. Interrogé à nouveau le 27 août 2026
 *    (`recherche-entreprises.api.gouv.fr`, SIREN 879853026, données INSEE à jour
 *    au 5 décembre 2025), il donne **77 rue de Campeyraut, 33000 Bordeaux**,
 *    marqué `est_siege: true`, et ne connaît aucun établissement à Suresnes.
 *    Tant que le transfert n'est pas déclaré au greffe, le siège social EST
 *    Bordeaux. Afficher Suresnes mettrait les mentions légales en contradiction
 *    avec le registre public — exactement l'inverse du but recherché, et une
 *    irrégularité opposable.
 *
 * Donc, dans cet ordre : déclarer le transfert au greffe, attendre la mise à
 * jour du registre, puis remplacer la seule ligne `address` ci-dessous. Rien
 * d'autre n'est à toucher, les trois emplacements la lisent d'ici. La commande
 * qui vérifie où en est le registre :
 *
 *     curl -s "https://recherche-entreprises.api.gouv.fr/search?q=879853026"
 */
/**
 * Le domaine canonique, en absolu.
 *
 * IL EST ÉCRIT EN DUR, ET C'EST VOULU. Les balises Open Graph exigent une URL
 * ABSOLUE : un chemin relatif ne produit aucune vignette, et l'échec est
 * silencieux — le lien se partage nu, sans image, et personne ne s'en aperçoit
 * avant qu'un prospect l'ait reçu. Le déduire de `window.location` est
 * impossible : ces balises sont lues par des robots qui n'exécutent pas de
 * script. Le déduire d'une variable d'environnement publique le rendrait
 * dépendant d'une configuration de plateforme, pour une valeur qui ne change
 * qu'avec le nom de la marque.
 */
export const SITE_CANONIQUE = 'https://www.letikette.com';

export const LEGAL_CONFIG = {
	brandName: 'Letikette',
	companyName: 'Jules-Camille Doré',
	operatorName: 'Letikette',
	legalForm: 'Entrepreneur Individuel',
	tradeName: 'Thumbbb Agency',
	address: '77 Rue de Campeyraut, 33000 Bordeaux, France',
	siren: '879 853 026',
	siret: '879 853 026 00026',
	rcs: 'Non inscrit au RCS',
	rne: 'Inscrit au RNE (INPI)',
	vatNumber: 'FR37879853026',
	naf: '62.01Z',
	effectiveDate: 'June 29, 2026',
	email: {
		user: 'bonjour',
		domain: 'letikette',
		tld: 'com'
	},
	dpo: {
		user: 'bonjour',
		domain: 'letikette',
		tld: 'com'
	}
} as const;

export function getLegalEmailAddress(): string {
	return `${LEGAL_CONFIG.email.user}@${LEGAL_CONFIG.email.domain}.${LEGAL_CONFIG.email.tld}`;
}

export function getDPOEmailAddress(): string {
	return `${LEGAL_CONFIG.dpo.user}@${LEGAL_CONFIG.dpo.domain}.${LEGAL_CONFIG.dpo.tld}`;
}

export function getObfuscatedLegalEmailAddress(): string {
	return `${LEGAL_CONFIG.email.user} [at] ${LEGAL_CONFIG.email.domain} [dot] ${LEGAL_CONFIG.email.tld}`;
}
