export const LEGAL_CONFIG = {
	brandName: 'Mycelium Fleet OS',
	companyName: 'Jules-Camille Doré',
	operatorName: 'Mycelium',
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
		user: 'legal',
		domain: 'mycelium',
		tld: 'io'
	},
	dpo: {
		user: 'privacy',
		domain: 'mycelium',
		tld: 'io'
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
