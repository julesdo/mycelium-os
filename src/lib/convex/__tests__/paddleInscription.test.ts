/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../schema';
import { internal } from '../_generated/api';

/**
 * L'ORDRE RÉEL DES RAPPELS DE PADDLE (14/10/2026).
 *
 * Au premier paiement du bac à sable, Paddle a envoyé `subscription.created`,
 * `subscription.activated`, puis `transaction.completed`. Le dernier passait par
 * l'inscription complète avec ce qu'un paiement connaît : il effaçait la date du
 * prochain prélèvement, et aurait sorti de l'essai un établissement qui y
 * entrait. Un paiement rattache désormais, il ne réécrit pas.
 */
const modules = Object.fromEntries(
	Object.entries(import.meta.glob('../**/*.ts')).map(([chemin, charger]) => [
		'.' + chemin.slice(2),
		charger
	])
);

const JOUR = 24 * 60 * 60 * 1000;

async function preparer() {
	const t = convexTest(schema, modules);
	const organizationId = await t.run(async (ctx) => {
		await ctx.db.insert('prixPaddle', {
			etiquette: 'equipe-annuel-essai',
			prixId: 'pri_equipe_annuel_essai',
			formule: 'equipe',
			rythme: 'annuel',
			essai: true,
			montant: '39000',
			enregistreLe: Date.now()
		});
		return await ctx.db.insert('organizations', { name: 'Ateliers Martin', createdAt: Date.now() });
	});
	return { t, organizationId };
}

describe('les rappels de Paddle, dans l’ordre où ils arrivent', () => {
	it('un paiement après l’abonnement n’efface ni l’essai ni ses dates', async () => {
		const { t, organizationId } = await preparer();
		const maintenant = Date.now();
		const finDEssai = maintenant + 30 * JOUR;

		await t.mutation(internal.paddle.upsertSubscription, {
			paddleSubscriptionId: 'sub_1',
			paddleCustomerId: 'ctm_1',
			paddleStatus: 'trialing',
			priceId: 'pri_equipe_annuel_essai',
			prochainPrelevementLe: finDEssai,
			essaiFinLe: finDEssai,
			organizationId,
			survenuLe: maintenant
		});
		// Le paiement à 0 € du premier jour, une seconde plus tard.
		const rattachement = await t.mutation(internal.paddle.rattacherLePaiement, {
			paddleSubscriptionId: 'sub_1',
			paddleCustomerId: 'ctm_1',
			priceId: 'pri_equipe_annuel_essai',
			organizationId
		});

		expect(rattachement.action).toBe('deja-inscrit');
		const org = await t.run((ctx) => ctx.db.get(organizationId));
		expect(org?.paddleStatus).toBe('trialing');
		expect(org?.paddleEssaiFinLe).toBe(finDEssai);
		expect(org?.paddleProchainPrelevementLe).toBe(finDEssai);
		expect(org?.paddlePlanTier).toBe('equipe');
	}, 120_000);

	it('un paiement sans rappel d’abonnement rattache l’établissement à sa formule', async () => {
		const { t, organizationId } = await preparer();

		const rattachement = await t.mutation(internal.paddle.rattacherLePaiement, {
			paddleSubscriptionId: 'sub_2',
			paddleCustomerId: 'ctm_2',
			priceId: 'pri_equipe_annuel_essai',
			organizationId
		});

		expect(rattachement.action).toBe('rattache');
		const org = await t.run((ctx) => ctx.db.get(organizationId));
		expect(org?.paddleSubscriptionId).toBe('sub_2');
		expect(org?.paddleStatus).toBe('active');
		expect(org?.paddlePlanTier).toBe('equipe');
		expect(org?.paddleRythme).toBe('annuel');
	}, 120_000);
});
