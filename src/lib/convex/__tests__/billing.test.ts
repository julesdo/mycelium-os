import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
	PLAN_FEATURES,
	PLAN_SEATS,
	PALIERS,
	DUREE_ESSAI_JOURS,
	planHasFeature,
	palierDeTaille,
	finDeLEssai,
	resolveEffectivePlan
} from '../billing';

describe('les étages', () => {
	it('donne le bilan aux deux étages payants', () => {
		expect(planHasFeature('diagnostic', 'diagnostic')).toBe(true);
		expect(planHasFeature('conformite', 'diagnostic')).toBe(true);
	});

	it("réserve la télédéclaration et le suivi mensuel à l'abonnement", () => {
		// C'est la seule différence entre les deux offres du business plan, et
		// c'est elle qui justifie de payer tous les mois plutôt qu'une fois.
		expect(planHasFeature('diagnostic', 'declaration')).toBe(false);
		expect(planHasFeature('diagnostic', 'suiviMensuel')).toBe(false);
		expect(planHasFeature('conformite', 'declaration')).toBe(true);
		expect(planHasFeature('conformite', 'suiviMensuel')).toBe(true);
	});

	it("n'ouvre rien sans abonnement", () => {
		for (const f of Object.keys(PLAN_FEATURES.none) as (keyof typeof PLAN_FEATURES.none)[]) {
			expect(planHasFeature('none', f)).toBe(false);
		}
	});

	it('ouvre tout en développement', () => {
		for (const f of Object.keys(PLAN_FEATURES.none) as (keyof typeof PLAN_FEATURES.none)[]) {
			expect(planHasFeature('dev', f)).toBe(true);
		}
	});

	it('définit un quota de sièges pour chaque étage payant', () => {
		expect(PLAN_SEATS.diagnostic).toBeGreaterThan(0);
		expect(PLAN_SEATS.conformite).toBeGreaterThan(PLAN_SEATS.diagnostic);
	});

	it("n'expose que des fonctionnalités qui existent vraiment", () => {
		// Ce test est le garde contre la rechute. `sourcing` et
		// `veilleReglementaire` figuraient ici sans avoir jamais été construits, et
		// l'étage `operateur` n'a plus de porteur commercial. Une grille tarifaire
		// bâtie dessus aurait vendu du vide.
		expect(Object.keys(PLAN_FEATURES.conformite).sort()).toEqual([
			'declaration',
			'depotFactures',
			'diagnostic',
			'suiviMensuel'
		]);
		expect(Object.keys(PLAN_FEATURES).sort()).toEqual(['conformite', 'dev', 'diagnostic', 'none']);
	});
});

describe('le palier de taille', () => {
	// Les bornes viennent du document 03 du business plan. Elles décident du
	// PRIX, jamais des fonctionnalités.
	it('range sous 250 couverts en S', () => {
		expect(palierDeTaille(80)).toBe('S');
		expect(palierDeTaille(249)).toBe('S');
	});

	it('range de 250 à 800 en M', () => {
		expect(palierDeTaille(250)).toBe('M');
		expect(palierDeTaille(300)).toBe('M');
		expect(palierDeTaille(800)).toBe('M');
	});

	it('range au-delà de 800 en L', () => {
		expect(palierDeTaille(801)).toBe('L');
		expect(palierDeTaille(2400)).toBe('L');
	});

	it('retient le palier le plus bas quand le profil est vide', () => {
		// Surfacturer un établissement qui n'a pas rempli son nombre de couverts
		// serait le pire des défauts : il découvrirait l'erreur sur sa facture.
		expect(palierDeTaille(undefined)).toBe('S');
		expect(palierDeTaille(0)).toBe('S');
		expect(palierDeTaille(-5)).toBe('S');
	});

	it('ne connaît que trois paliers', () => {
		expect([...PALIERS]).toEqual(['S', 'M', 'L']);
	});
});

describe("l'essai", () => {
	// CES TESTS SIMULENT LE JOUR OÙ PADDLE OUVRE, et c'est tout leur intérêt.
	// Sans clé, `resolveEffectivePlan` renvoie `dev` et tout est ouvert à tout le
	// monde : rien de ce qui suit ne serait exercé. La clé posée, la même fonction
	// bascule TOUS les établissements existants sur `none` — plus d'invitation,
	// plus de dépôt — et l'essai est la seule chose qui rende cette bascule
	// survivable. On la pose donc ici, plutôt que d'attendre de le découvrir en
	// production.
	beforeEach(() => vi.stubEnv('PADDLE_API_KEY', 'pdl_test'));
	afterEach(() => vi.unstubAllEnvs());

	const org = (freeTrialEndsAt?: number) =>
		({
			_id: 'org_1',
			_creationTime: 0,
			name: 'Clinique des Ormes',
			createdAt: 0,
			freeTrialEndsAt
		}) as unknown as Parameters<typeof resolveEffectivePlan>[0];

	it('dure trente jours', () => {
		const depuis = Date.parse('2026-03-01T00:00:00Z');
		expect(finDeLEssai(depuis)).toBe(depuis + 30 * 24 * 60 * 60 * 1000);
		expect(DUREE_ESSAI_JOURS).toBe(30);
	});

	it("ouvre l'abonnement complet tant qu'il court", () => {
		// L'essai donne le PLUS HAUT étage, pas le plus bas : un essai qui cache la
		// moitié du produit ne fait pas essayer le produit.
		const { tier, seatsAllowed } = resolveEffectivePlan(org(Date.now() + 60_000));
		expect(tier).toBe('conformite');
		expect(seatsAllowed).toBe(PLAN_SEATS.conformite);
		expect(planHasFeature(tier, 'declaration')).toBe(true);
	});

	it('ne rouvre rien une fois expiré', () => {
		expect(resolveEffectivePlan(org(Date.now() - 60_000)).tier).toBe('none');
	});

	it("laisse sur 'none' un établissement qui n'a jamais eu d'essai", () => {
		expect(resolveEffectivePlan(org(undefined)).tier).toBe('none');
	});
});
