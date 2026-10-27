import { describe, expect, it } from 'vitest';
import {
	ALPHABET_DES_CODES,
	FENETRE_DES_ESSAIS_MS,
	LONGUEUR_DES_CODES,
	MAX_ESSAIS,
	avantageValide,
	codeDepuisOctets,
	consequencesDuCode,
	corpsDeLaRemisePrivilege,
	refusPourLEtablissement,
	empreinteDuCode,
	etatDuCode,
	finDuCode,
	formaterCode,
	libelleDeLAvantage,
	normaliserCode,
	remiseAnnuelleCentimes,
	saisieDuCode,
	tenterUnCode
} from '../codes-privilege';

describe('un code privilège', () => {
	it('tient seize signes de l’alphabet de Crockford, soit 80 bits', () => {
		expect(ALPHABET_DES_CODES).toHaveLength(32);
		expect(ALPHABET_DES_CODES).not.toMatch(/[ILOU]/);
		expect(codeDepuisOctets(new Uint8Array(10))).toBe('0000000000000000');
		expect(codeDepuisOctets(new Uint8Array(10).fill(255))).toBe('ZZZZZZZZZZZZZZZZ');
		const code = codeDepuisOctets(Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
		expect(code).toHaveLength(LONGUEUR_DES_CODES);
		expect([...code].every((c) => ALPHABET_DES_CODES.includes(c))).toBe(true);
	});

	it('refuse de se tirer sur moins de dix octets', () => {
		expect(() => codeDepuisOctets(new Uint8Array(9))).toThrow();
	});

	it('change dès qu’un seul bit change', () => {
		const a = codeDepuisOctets(new Uint8Array(10));
		const octets = new Uint8Array(10);
		octets[9] = 1;
		expect(codeDepuisOctets(octets)).not.toBe(a);
	});

	it('se montre par groupes de quatre, et se reconnaît à ses quatre derniers signes', () => {
		expect(formaterCode('ABCDEFGHJKMNPQRS')).toBe('ABCD-EFGH-JKMN-PQRS');
		expect(finDuCode('ABCDEFGHJKMNPQRS')).toBe('PQRS');
	});
});

describe('la saisie d’un code', () => {
	it('se lit quelle que soit la casse, les espaces ou les tirets', () => {
		expect(normaliserCode('abcd-efgh-jkmn-pqrs')).toBe('ABCDEFGHJKMNPQRS');
		expect(normaliserCode(' ABCD EFGH JKMN PQRS ')).toBe('ABCDEFGHJKMNPQRS');
	});

	it('lit O pour zéro, I et L pour un, comme Crockford', () => {
		expect(normaliserCode('OOOO-IIII-LLLL-0000')).toBe('0000111111110000');
	});

	it('refuse ce qui n’a pas seize signes valides', () => {
		expect(normaliserCode('ABCD-EFGH-JKMN-PQR')).toBeNull();
		expect(normaliserCode('ABCD-EFGH-JKMN-PQRST')).toBeNull();
		expect(normaliserCode('ABCD-EFGH-JKMN-PQRU')).toBeNull();
		expect(normaliserCode('')).toBeNull();
	});

	it('se met en forme pendant la frappe, sans jamais dépasser seize signes', () => {
		expect(saisieDuCode('abcd')).toBe('ABCD');
		expect(saisieDuCode('abcde')).toBe('ABCD-E');
		expect(saisieDuCode('ab!c d')).toBe('ABCD');
		expect(saisieDuCode('o')).toBe('0');
		expect(saisieDuCode('ABCD-EFGH-JKMN-PQRS-TV')).toBe('ABCD-EFGH-JKMN-PQRS');
	});

	it('a la même empreinte quelle que soit sa graphie, et jamais le code en clair', async () => {
		const a = await empreinteDuCode('abcd-efgh-jkmn-pqrs');
		const b = await empreinteDuCode('ABCDEFGHJKMNPQRS');
		expect(a).toBe(b);
		expect(a).toMatch(/^[0-9a-f]{64}$/);
		expect(a).not.toContain('ABCD');
		expect(await empreinteDuCode('ABCDEFGHJKMNPQRT')).not.toBe(a);
	});
});

describe('ce qu’offre un code', () => {
	it('se dit en une ligne', () => {
		expect(libelleDeLAvantage({ genre: 'REMISE', pourcent: 50, mois: 3 })).toBe(
			'−50\u00a0% pendant 3 mois'
		);
		expect(libelleDeLAvantage({ genre: 'REMISE', pourcent: 100, mois: 1 })).toBe('1 mois offert');
		expect(libelleDeLAvantage({ genre: 'REMISE', pourcent: 100, mois: 3 })).toBe('3 mois offerts');
		expect(libelleDeLAvantage({ genre: 'A_VIE', formule: 'pro' })).toBe('Accès Pro offert à vie');
		expect(libelleDeLAvantage({ genre: 'A_VIE', formule: 'equipe' })).toBe(
			'Accès Équipe offert à vie'
		);
	});

	it('refuse une remise hors bornes', () => {
		expect(avantageValide({ genre: 'REMISE', pourcent: 50, mois: 3 })).toBeNull();
		expect(avantageValide({ genre: 'REMISE', pourcent: 0, mois: 3 })).not.toBeNull();
		expect(avantageValide({ genre: 'REMISE', pourcent: 101, mois: 3 })).not.toBeNull();
		expect(avantageValide({ genre: 'REMISE', pourcent: 12.5, mois: 3 })).not.toBeNull();
		expect(avantageValide({ genre: 'REMISE', pourcent: 50, mois: 0 })).not.toBeNull();
		expect(avantageValide({ genre: 'REMISE', pourcent: 50, mois: 25 })).not.toBeNull();
		expect(avantageValide({ genre: 'A_VIE', formule: 'solo' })).toBeNull();
	});
});

describe('l’état d’un code', () => {
	const MAINTENANT = Date.UTC(2026, 9, 27, 12);
	it('est disponible tant que rien ne l’a touché', () => {
		expect(etatDuCode({}, MAINTENANT)).toBe('DISPONIBLE');
		expect(etatDuCode({ expireLe: MAINTENANT + 1 }, MAINTENANT)).toBe('DISPONIBLE');
	});
	it('nomme l’usage, l’expiration et la révocation, la révocation d’abord', () => {
		expect(etatDuCode({ utiliseLe: MAINTENANT - 1 }, MAINTENANT)).toBe('UTILISE');
		expect(etatDuCode({ expireLe: MAINTENANT }, MAINTENANT)).toBe('EXPIRE');
		expect(etatDuCode({ utiliseLe: MAINTENANT - 2, revoqueLe: MAINTENANT - 1 }, MAINTENANT)).toBe(
			'REVOQUE'
		);
		// Utilisé avant d'expirer : il reste utilisé, l'avantage tient.
		expect(etatDuCode({ utiliseLe: MAINTENANT - 2, expireLe: MAINTENANT - 1 }, MAINTENANT)).toBe(
			'UTILISE'
		);
	});
});

describe('les essais d’un établissement', () => {
	const T = Date.UTC(2026, 9, 27, 12);
	it(`en permet ${MAX_ESSAIS} par fenêtre, puis s’arrête`, () => {
		let etat: { nombre: number; depuis: number } | undefined;
		for (let i = 0; i < MAX_ESSAIS; i++) {
			const r = tenterUnCode(etat, T + i);
			expect(r.autorise).toBe(true);
			etat = r.etat;
		}
		expect(tenterUnCode(etat, T + 10).autorise).toBe(false);
	});
	it('repart à zéro une fois la fenêtre passée', () => {
		const plein = { nombre: MAX_ESSAIS, depuis: T };
		const r = tenterUnCode(plein, T + FENETRE_DES_ESSAIS_MS);
		expect(r.autorise).toBe(true);
		expect(r.etat).toEqual({ nombre: 1, depuis: T + FENETRE_DES_ESSAIS_MS });
	});
});

describe('un code pour un établissement', () => {
	const vierge = { accesOffert: false, remiseEnAttente: false, abonnement: null };
	const auMois = {
		...vierge,
		abonnement: {
			statut: 'active' as const,
			formule: 'equipe' as const,
			rythme: 'mensuel' as const,
			resilie: false
		}
	};

	it('refuse un accès à vie à qui l’a déjà, et une remise qui ne servirait pas', () => {
		expect(refusPourLEtablissement({ genre: 'A_VIE', formule: 'pro' }, vierge)).toBeNull();
		expect(
			refusPourLEtablissement({ genre: 'A_VIE', formule: 'pro' }, { ...vierge, accesOffert: true })
		).toMatch(/déjà un accès offert/);
		expect(
			refusPourLEtablissement(
				{ genre: 'REMISE', pourcent: 50, mois: 3 },
				{ ...vierge, accesOffert: true }
			)
		).toMatch(/ne servirait à rien/);
		expect(
			refusPourLEtablissement(
				{ genre: 'REMISE', pourcent: 50, mois: 3 },
				{ ...vierge, remiseEnAttente: true }
			)
		).toMatch(/attend déjà/);
	});

	it('dit ce que l’accès à vie change, abonnement compris', () => {
		expect(consequencesDuCode({ genre: 'A_VIE', formule: 'pro' }, auMois)).toEqual([
			'Toutes les fonctions de Pro, sans aucun prélèvement.',
			'Votre abonnement Équipe s’arrête à son échéance : plus rien n’est prélevé ensuite.',
			'Le code ne servira plus : il ne s’utilise qu’une fois.'
		]);
		expect(consequencesDuCode({ genre: 'A_VIE', formule: 'pro' }, vierge)).toHaveLength(2);
	});

	it('dit où la remise tombe : au mois, à l’année, ou à la souscription', () => {
		const remise = { genre: 'REMISE' as const, pourcent: 50, mois: 3 };
		expect(consequencesDuCode(remise, auMois)[0]).toBe(
			'−50\u00a0% sur vos 3 prochains prélèvements.'
		);
		expect(consequencesDuCode({ genre: 'REMISE', pourcent: 100, mois: 1 }, auMois)[0]).toBe(
			'Votre prochain prélèvement est offert.'
		);
		expect(consequencesDuCode({ genre: 'REMISE', pourcent: 20, mois: 1 }, auMois)[0]).toBe(
			'−20\u00a0% sur votre prochain prélèvement.'
		);
		expect(
			consequencesDuCode(remise, {
				...vierge,
				abonnement: { statut: 'active', formule: 'pro', rythme: 'annuel', resilie: false }
			})[0]
		).toBe('223,50\u00a0€ HT déduits de votre prochaine échéance annuelle.');
		expect(consequencesDuCode(remise, vierge)[0]).toMatch(/dès que vous aurez choisi une formule/);
	});
});

describe('la remise chez Paddle', () => {
	it('vaut la part du prix mensuel HT sur les mois offerts, pour un abonnement à l’année', () => {
		expect(remiseAnnuelleCentimes('pro', 50, 3)).toBe(22_350);
		expect(remiseAnnuelleCentimes('solo', 100, 1)).toBe(1_200);
	});

	it('court N prélèvements au mois, en pourcentage', () => {
		expect(
			corpsDeLaRemisePrivilege({
				organisationId: 'org_1',
				avantage: { genre: 'REMISE', pourcent: 50, mois: 3 },
				formule: 'pro',
				rythme: 'mensuel'
			})
		).toMatchObject({
			amount: '50',
			type: 'percentage',
			recur: true,
			maximum_recurring_intervals: 3,
			usage_limit: 1,
			enabled_for_checkout: false,
			custom_data: { letikette_organisation: 'org_1' }
		});
	});

	it('se déduit une fois de l’échéance annuelle, en montant fixe', () => {
		const corps = corpsDeLaRemisePrivilege({
			organisationId: 'org_1',
			avantage: { genre: 'REMISE', pourcent: 50, mois: 3 },
			formule: 'pro',
			rythme: 'annuel'
		});
		expect(corps).toMatchObject({
			amount: '22350',
			type: 'flat',
			currency_code: 'EUR',
			recur: false,
			usage_limit: 1,
			enabled_for_checkout: false
		});
		expect(corps).not.toHaveProperty('maximum_recurring_intervals');
	});
});
