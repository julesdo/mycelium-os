export const LEGAL_CONFIG = {
	brandName: 'Mycelium Fleet OS',
	companyName: 'Mycelium SAS',
	operatorName: 'Mycelium',
	// TODO: replace with registered address once confirmed with legal counsel
	address: '75001 Paris, France',
	// TODO: fill in once registered
	siren: 'XXX XXX XXX',
	rcs: 'Paris',
	// TODO: fill in once obtained
	vatNumber: 'FR XX XXX XXX XXX',
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
