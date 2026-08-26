/**
 * L'identité légale affichée partout : pied de page public, mentions des
 * rapports, en-tête des courriers aux fournisseurs. Source unique, pour que ces
 * trois endroits ne puissent pas diverger.
 *
 * ⚠️ ADRESSE À CHANGER, ET ELLE N'A PAS ÉTÉ CHANGÉE ICI, VOLONTAIREMENT.
 *
 * Le déménagement vers Suresnes est décidé, mais l'adresse complète n'était pas
 * disponible au moment de l'écrire, et une adresse légale ne s'invente pas.
 *
 * Surtout : le registre officiel interrogé le 26 août 2026
 * (`recherche-entreprises.api.gouv.fr`, SIREN 879853026, données à jour au
 * 6 décembre 2025) donne toujours **77 rue de Campeyraut, 33000 Bordeaux**
 * comme siège. Tant que le transfert n'est pas déclaré au greffe, le siège
 * social EST Bordeaux, et afficher Suresnes mettrait le site en contradiction
 * avec le registre — exactement l'inverse du but recherché.
 *
 * Donc, dans cet ordre : déclarer le transfert, attendre la mise à jour du
 * registre, puis remplacer la seule ligne `address` ci-dessous. Rien d'autre
 * n'est à toucher, les trois emplacements la lisent d'ici.
 */
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
