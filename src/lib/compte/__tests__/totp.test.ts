import { describe, it, expect } from 'vitest';
import { cleDuTotp, cleLisible } from '../totp';

describe('cleDuTotp', () => {
	it('lit la clé dans l’adresse otpauth', () => {
		expect(
			cleDuTotp(
				'otpauth://totp/Letikette:jules%40exemple.fr?secret=JBSWY3DPEHPK3PXP&issuer=Letikette'
			)
		).toBe('JBSWY3DPEHPK3PXP');
	});

	it('rend null sur une adresse sans clé ou illisible', () => {
		expect(cleDuTotp('otpauth://totp/Letikette?issuer=Letikette')).toBeNull();
		expect(cleDuTotp('pas une adresse')).toBeNull();
	});
});

describe('cleLisible', () => {
	it('groupe la clé par quatre caractères, pour la recopier sans se tromper', () => {
		expect(cleLisible('JBSWY3DPEHPK3PXP')).toBe('JBSW Y3DP EHPK 3PXP');
	});
});
