export const LEGAL_CONFIG = {
	brandName: 'AI.MYCELIUM',
	companyName: 'Mycelium Inc.',
	operatorName: 'Mycelium',
	address: '123 Main Street, Suite 100, Berlin, Germany',
	email: {
		user: 'mycelium',
		domain: 'mycelium',
		tld: 'com'
	}
} as const;

export function getLegalEmailAddress(): string {
	return `${LEGAL_CONFIG.email.user}@${LEGAL_CONFIG.email.domain}.${LEGAL_CONFIG.email.tld}`;
}

export function getObfuscatedLegalEmailAddress(): string {
	return `${LEGAL_CONFIG.email.user} [at] ${LEGAL_CONFIG.email.domain} [dot] ${LEGAL_CONFIG.email.tld}`;
}
