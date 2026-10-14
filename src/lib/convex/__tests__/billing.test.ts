import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { finDeLEssai, resolveEffectivePlan } from '../billing';
import {
	DUREE_ESSAI_JOURS,
	FORMULES,
	GRILLE,
	LIMITES,
	formuleRecommandee,
	limitesDe,
	moisOfferts,
	mensualiteDeLAnnee
} from '../../config/tarifs';

describe('la grille', () => {
	it('fait payer dix mois à qui paie l’année', () => {
		for (const f of FORMULES) {
			expect(GRILLE[f].annuel).toBe(GRILLE[f].mensuel * 10);
			expect(moisOfferts(f)).toBe(2);
		}
		expect(mensualiteDeLAnnee('equipe')).toBe(3250);
	});

	it('monte de formule en formule, en prix comme en limites', () => {
		expect(GRILLE.solo.mensuel).toBeLessThan(GRILLE.equipe.mensuel);
		expect(GRILLE.equipe.mensuel).toBeLessThan(GRILLE.pro.mensuel);
		expect(LIMITES.solo.utilisateurs).toBeLessThan(LIMITES.equipe.utilisateurs);
		expect(LIMITES.equipe.utilisateurs).toBeLessThan(LIMITES.pro.utilisateurs);
		expect(LIMITES.pro.clientsSuivis).toBeNull();
	});

	it('laisse Découverte mesurer sans rien faire partir', () => {
		expect(LIMITES.decouverte.agir).toBe(false);
		expect(LIMITES.decouverte.clientsSuivis).toBe(0);
		for (const f of FORMULES) expect(LIMITES[f].agir).toBe(true);
	});

	it('ne borne rien en développement', () => {
		expect(limitesDe('dev').clientsSuivis).toBeNull();
		expect(limitesDe('none')).toBe(LIMITES.decouverte);
	});

	it('propose Solo à une entreprise individuelle, Équipe sinon', () => {
		expect(formuleRecommandee('Entrepreneur individuel')).toBe('solo');
		expect(formuleRecommandee('SAS, société par actions simplifiée')).toBe('equipe');
		expect(formuleRecommandee(undefined)).toBe('equipe');
	});
});

describe('le palier effectif', () => {
	beforeEach(() => {
		vi.stubEnv('PADDLE_API_KEY', 'pdl_test');
		vi.stubEnv('PADDLE_FACTURATION_OUVERTE', 'oui');
	});
	afterEach(() => vi.unstubAllEnvs());

	const org = (champs: Record<string, unknown> = {}) =>
		({
			_id: 'org_1',
			_creationTime: 0,
			name: 'Clinique des Ormes',
			createdAt: 0,
			...champs
		}) as unknown as Parameters<typeof resolveEffectivePlan>[0];

	it('ouvre la formule souscrite, à l’essai comme payée', () => {
		expect(
			resolveEffectivePlan(org({ paddleStatus: 'trialing', paddlePlanTier: 'solo' })).tier
		).toBe('solo');
		const pro = resolveEffectivePlan(org({ paddleStatus: 'active', paddlePlanTier: 'pro' }));
		expect(pro.tier).toBe('pro');
		expect(pro.seatsAllowed).toBe(LIMITES.pro.utilisateurs);
	});

	it('relit les étages d’avant dans la grille d’aujourd’hui', () => {
		expect(
			resolveEffectivePlan(org({ paddleStatus: 'active', paddlePlanTier: 'procedures' })).tier
		).toBe('equipe');
		expect(
			resolveEffectivePlan(org({ paddleStatus: 'active', paddlePlanTier: 'suivi' })).tier
		).toBe('solo');
	});

	it('ouvre Équipe tant qu’un accès offert court, puis Découverte', () => {
		expect(resolveEffectivePlan(org({ freeTrialEndsAt: Date.now() + 60_000 })).tier).toBe('equipe');
		expect(resolveEffectivePlan(org({ freeTrialEndsAt: Date.now() - 60_000 })).tier).toBe('none');
		expect(resolveEffectivePlan(org()).tier).toBe('none');
	});

	it('fait retomber un paiement échoué sur Découverte', () => {
		expect(
			resolveEffectivePlan(org({ paddleStatus: 'past_due', paddlePlanTier: 'pro' })).tier
		).toBe('none');
	});

	it('ne ferme rien tant que la facturation n’est pas ouverte, même clé posée', () => {
		// La clé live se pose à la migration, avant que Paddle ait vérifié le
		// compte : personne ne doit être fermé sans pouvoir payer.
		vi.stubEnv('PADDLE_FACTURATION_OUVERTE', '');
		expect(resolveEffectivePlan(org()).tier).toBe('dev');
	});

	it('compte trente jours pour un accès offert', () => {
		const depuis = Date.parse('2026-03-01T00:00:00Z');
		expect(finDeLEssai(depuis)).toBe(depuis + DUREE_ESSAI_JOURS * 24 * 60 * 60 * 1000);
		expect(DUREE_ESSAI_JOURS).toBe(30);
	});
});

/**
 * LES DEUX PORTES DE DÉVELOPPEMENT, ET CELLE QUI ÉTAIT RESTÉE OUVERTE.
 *
 * `setSimulatedTier` refuse de tourner dès qu'une clé Paddle est posée, donc en
 * production. `activateDevPlan`, qui accorde le plan complet et 9 999 sièges,
 * n'avait aucun garde équivalent : n'importe quel compte pouvait se donner
 * l'abonnement le plus cher du produit. Les deux portent désormais le MÊME
 * garde, déclaré une fois.
 */
describe('les portes de développement', () => {
	it('refusent de s’ouvrir dès qu’une clé Paddle est posée', async () => {
		const { estEnvironnementDeDeveloppement } = await import('../billing');
		const avant = process.env.PADDLE_API_KEY;
		try {
			process.env.PADDLE_API_KEY = 'pdl_live_quelquechose';
			expect(estEnvironnementDeDeveloppement()).toBe(false);
			delete process.env.PADDLE_API_KEY;
			expect(estEnvironnementDeDeveloppement()).toBe(true);
		} finally {
			if (avant === undefined) delete process.env.PADDLE_API_KEY;
			else process.env.PADDLE_API_KEY = avant;
		}
	});
});
