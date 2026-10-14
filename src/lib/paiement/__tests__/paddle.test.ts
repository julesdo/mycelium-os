import { describe, expect, it } from 'vitest';
import { DUREE_ESSAI_JOURS, GRILLE } from '../../config/tarifs';
import {
	CLE_ORGANISATION,
	CLE_SCEAU,
	catalogueAttendu,
	ecartsDuPrix,
	etiquetteDuPrix,
	environnementDuJeton,
	environnementPaddle,
	lireEvenement,
	sceauValide,
	sceller,
	signatureValide,
	statutInterne
} from '../paddle';

describe("l'environnement", () => {
	it('se lit sur la clé', () => {
		expect(environnementPaddle({ PADDLE_API_KEY: 'pdl_sdbx_apikey_x' })).toBe('sandbox');
		expect(environnementPaddle({ PADDLE_API_KEY: 'pdl_live_apikey_x' })).toBe('production');
	});

	it('suit la variable quand la clé ne dit rien', () => {
		expect(environnementPaddle({ PADDLE_ENVIRONMENT: 'sandbox', PADDLE_API_KEY: 'ancienne' })).toBe(
			'sandbox'
		);
		expect(environnementPaddle({})).toBe('production');
	});

	it('refuse une variable qui contredit la clé, au lieu de choisir', () => {
		expect(() =>
			environnementPaddle({ PADDLE_ENVIRONMENT: 'sandbox', PADDLE_API_KEY: 'pdl_live_apikey_x' })
		).toThrow(/clé live/);
		expect(() => environnementPaddle({ PADDLE_ENVIRONMENT: 'prod' })).toThrow(/sandbox/);
	});

	it('lit aussi le jeton côté client', () => {
		expect(environnementDuJeton('test_abc')).toBe('sandbox');
		expect(environnementDuJeton('live_abc')).toBe('production');
		expect(environnementDuJeton('abc')).toBeNull();
	});
});

describe('la signature d’un rappel', () => {
	const secret = 'pdl_ntfset_secret';
	const corps = '{"event_type":"subscription.created"}';

	async function entete(ts: number, corpsSigne = corps) {
		const cle = await crypto.subtle.importKey(
			'raw',
			new TextEncoder().encode(secret),
			{ name: 'HMAC', hash: 'SHA-256' },
			false,
			['sign']
		);
		const sig = await crypto.subtle.sign(
			'HMAC',
			cle,
			new TextEncoder().encode(`${ts}:${corpsSigne}`)
		);
		const h1 = Array.from(new Uint8Array(sig))
			.map((o) => o.toString(16).padStart(2, '0'))
			.join('');
		return `ts=${ts};h1=${h1}`;
	}

	it('accepte un rappel signé et frais', async () => {
		expect(
			await signatureValide({ corps, entete: await entete(1000), secret, maintenantS: 1003 })
		).toBe(true);
	});

	it('refuse un corps modifié', async () => {
		expect(
			await signatureValide({
				corps: corps + ' ',
				entete: await entete(1000),
				secret,
				maintenantS: 1000
			})
		).toBe(false);
	});

	it('refuse un rappel rejoué au-delà de cinq secondes', async () => {
		expect(
			await signatureValide({ corps, entete: await entete(1000), secret, maintenantS: 1006 })
		).toBe(false);
	});

	it('refuse un en-tête incomplet', async () => {
		expect(await signatureValide({ corps, entete: 'ts=1000', secret, maintenantS: 1000 })).toBe(
			false
		);
	});
});

describe('le sceau de l’établissement', () => {
	it('se vérifie pour son établissement, et pour lui seul', async () => {
		const sceau = await sceller('secret', 'org_a');
		expect(await sceauValide('secret', 'org_a', sceau)).toBe(true);
		expect(await sceauValide('secret', 'org_b', sceau)).toBe(false);
		expect(await sceauValide('autre-secret', 'org_a', sceau)).toBe(false);
	});
});

describe('la lecture d’un événement', () => {
	const donnees = { [CLE_ORGANISATION]: 'org_a', [CLE_SCEAU]: 'abc' };

	it('lit un abonnement, son prix, sa période et son lien', () => {
		const lu = lireEvenement({
			event_type: 'subscription.created',
			occurred_at: '2026-10-14T09:00:00Z',
			data: {
				id: 'sub_1',
				customer_id: 'ctm_1',
				status: 'active',
				items: [{ price: { id: 'pri_1' } }],
				current_billing_period: { ends_at: '2026-11-14T09:00:00Z' },
				custom_data: donnees
			}
		});
		expect(lu).toEqual({
			genre: 'abonnement',
			abonnementId: 'sub_1',
			clientId: 'ctm_1',
			statut: 'active',
			prixId: 'pri_1',
			finDePeriode: Date.parse('2026-11-14T09:00:00Z'),
			prochainPrelevementLe: null,
			essaiFinLe: null,
			resiliationLe: null,
			lien: { organisationId: 'org_a', sceau: 'abc' },
			survenuLe: Date.parse('2026-10-14T09:00:00Z')
		});
	});

	it('lit la fin de l’essai, le premier prélèvement et une résiliation programmée', () => {
		const lu = lireEvenement({
			event_type: 'subscription.updated',
			occurred_at: '2026-10-14T09:00:00Z',
			data: {
				id: 'sub_1',
				customer_id: 'ctm_1',
				status: 'trialing',
				next_billed_at: '2026-11-13T09:00:00Z',
				items: [{ price: { id: 'pri_1' }, trial_dates: { ends_at: '2026-11-13T09:00:00Z' } }],
				scheduled_change: { action: 'cancel', effective_at: '2026-11-13T09:00:00Z' }
			}
		});
		expect(lu).toMatchObject({
			genre: 'abonnement',
			essaiFinLe: Date.parse('2026-11-13T09:00:00Z'),
			prochainPrelevementLe: Date.parse('2026-11-13T09:00:00Z'),
			resiliationLe: Date.parse('2026-11-13T09:00:00Z')
		});
	});

	it('ne prête aucune fin de période à un abonnement résilié', () => {
		const lu = lireEvenement({
			event_type: 'subscription.canceled',
			occurred_at: '2026-10-14T09:00:00Z',
			data: { id: 'sub_1', customer_id: 'ctm_1', status: 'canceled', items: [] }
		});
		expect(lu.genre === 'abonnement' && lu.finDePeriode).toBeNull();
		expect(lu.genre === 'abonnement' && lu.lien).toBeNull();
	});

	it('lit un paiement unique, sans abonnement', () => {
		const lu = lireEvenement({
			event_type: 'transaction.completed',
			occurred_at: '2026-10-14T09:00:00Z',
			data: {
				id: 'txn_1',
				subscription_id: null,
				customer_id: 'ctm_1',
				items: [{ price: { id: 'pri_bilan' } }],
				custom_data: donnees
			}
		});
		expect(lu).toMatchObject({
			genre: 'paiement',
			transactionId: 'txn_1',
			abonnementId: null,
			prixIds: ['pri_bilan']
		});
	});

	it('ignore ce qui manque de quoi se ranger, et ce qui ne le concerne pas', () => {
		expect(
			lireEvenement({
				event_type: 'subscription.updated',
				occurred_at: '2026-10-14T09:00:00Z',
				data: { status: 'active' }
			}).genre
		).toBe('ignore');
		expect(lireEvenement({ event_type: 'customer.created', data: {} }).genre).toBe('ignore');
		expect(lireEvenement('pas un objet').genre).toBe('ignore');
	});

	it('ne lit aucun statut inconnu comme ouvert', () => {
		expect(statutInterne('active')).toBe('active');
		expect(statutInterne('trialing')).toBe('trialing');
		expect(statutInterne('cancelled')).toBe('canceled');
		expect(statutInterne('nouveau')).toBe('canceled');
	});
});

describe('le catalogue attendu', () => {
	const tous = catalogueAttendu().flatMap((p) => p.prix);

	it('tire chaque montant de la grille affichée', () => {
		for (const prix of tous) {
			const attendu =
				prix.rythme === 'annuel' ? GRILLE[prix.formule].annuel : GRILLE[prix.formule].mensuel;
			expect(prix.montant).toBe(String(attendu * 100));
		}
	});

	it('porte douze prix : trois formules, deux rythmes, avec ou sans essai', () => {
		expect(tous).toHaveLength(12);
		expect(new Set(tous.map((p) => p.etiquette)).size).toBe(12);
		expect(tous.filter((p) => p.essai).every((p) => p.essaiJours === DUREE_ESSAI_JOURS)).toBe(true);
		expect(tous.filter((p) => !p.essai).every((p) => p.essaiJours === null)).toBe(true);
		expect(
			tous.filter((p) => p.rythme === 'annuel').every((p) => p.cycle.interval === 'year')
		).toBe(true);
		expect(etiquetteDuPrix('equipe', 'annuel', true)).toBe('equipe-annuel-essai');
	});

	it('nomme chaque écart sans rien corriger', () => {
		const attendu = tous.find((p) => p.etiquette === 'solo-mensuel-essai');
		if (attendu === undefined) throw new Error('prix absent');
		expect(
			ecartsDuPrix(attendu, {
				id: 'pri_1',
				montant: attendu.montant,
				devise: 'EUR',
				cycle: { interval: 'month', frequency: 1 },
				essai: { interval: 'day', frequency: DUREE_ESSAI_JOURS },
				modeDeTaxe: 'external'
			})
		).toEqual([]);
		expect(
			ecartsDuPrix(attendu, {
				id: 'pri_1',
				montant: '9900',
				devise: 'EUR',
				cycle: { interval: 'year', frequency: 1 },
				essai: null,
				modeDeTaxe: 'internal'
			})
		).toHaveLength(4);
	});
});
