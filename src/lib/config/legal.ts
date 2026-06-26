export const LEGAL_CONFIG = {
	brandName: 'Mycelium Fleet OS',
	companyName: 'Mycelium SAS',
	operatorName: 'Mycelium',
	// TODO: replace with registered address once confirmed
	address: 'Paris, France',
	email: {
		user: 'legal',
		domain: 'mycelium',
		tld: 'io'
	}
} as const;

export function getLegalEmailAddress(): string {
	return `${LEGAL_CONFIG.email.user}@${LEGAL_CONFIG.email.domain}.${LEGAL_CONFIG.email.tld}`;
}

export function getObfuscatedLegalEmailAddress(): string {
	return `${LEGAL_CONFIG.email.user} [at] ${LEGAL_CONFIG.email.domain} [dot] ${LEGAL_CONFIG.email.tld}`;
}
