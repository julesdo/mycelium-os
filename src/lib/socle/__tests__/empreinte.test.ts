import { describe, it, expect } from 'vitest';
import { sha256 } from '../empreinte';

describe('l’empreinte SHA-256', () => {
	it('rend les vecteurs de test publiés (FIPS 180-2)', () => {
		expect(sha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
		expect(sha256('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
		expect(sha256('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')).toBe(
			'248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1'
		);
	});

	it('encode en UTF-8 avant de hacher', () => {
		expect(sha256('é')).not.toBe(sha256('e'));
		expect(sha256('é')).toHaveLength(64);
	});
});
