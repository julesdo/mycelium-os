/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../schema';
import { internal } from '../_generated/api';

/**
 * LE PRÉAVIS DE L'OUVERTURE : trente jours d'accès offert à chaque établissement
 * sans abonnement, une notification à ses administrateurs, et jamais deux fois.
 */
const modules = Object.fromEntries(
	Object.entries(import.meta.glob('../**/*.ts')).map(([chemin, charger]) => [
		'.' + chemin.slice(2),
		charger
	])
);

describe('le préavis de l’ouverture', () => {
	it('offre trente jours aux comptes existants, les prévient, et ne recommence pas', async () => {
		const t = convexTest(schema, modules);
		const { sansAbonnement, abonne } = await t.run(async (ctx) => {
			const sansAbonnement = await ctx.db.insert('organizations', {
				name: 'Ateliers Martin',
				createdAt: Date.now()
			});
			const abonne = await ctx.db.insert('organizations', {
				name: 'Fournitures Durand',
				paddleStatus: 'active',
				paddlePlanTier: 'pro',
				createdAt: Date.now()
			});
			for (const organizationId of [sansAbonnement, abonne]) {
				await ctx.db.insert('organizationMembers', {
					organizationId,
					userId: `admin_${organizationId}`,
					role: 'ORG_ADMIN',
					joinedAt: Date.now()
				});
			}
			return { sansAbonnement, abonne };
		});

		const lecture = await t.mutation(internal.ouvertureFacturation.prevenir, {});
		expect(lecture).toMatchObject({ etablissements: 1, envoye: false });

		const envoi = await t.mutation(internal.ouvertureFacturation.prevenir, { envoyer: true });
		expect(envoi).toMatchObject({ etablissements: 1, envoye: true, suite: null });

		const apres = await t.run(async (ctx) => ({
			org: await ctx.db.get(sansAbonnement),
			autre: await ctx.db.get(abonne),
			notes: await ctx.db.query('notifications').collect()
		}));
		expect(apres.org?.freeTrialEndsAt ?? 0).toBeGreaterThan(Date.now() + 29 * 24 * 60 * 60 * 1000);
		expect(apres.autre?.freeTrialEndsAt).toBeUndefined();
		expect(apres.notes).toHaveLength(1);
		expect(apres.notes[0]?.type).toBe('ABONNEMENT');
		expect(apres.notes[0]?.message).not.toMatch(/garanti/i);

		const encore = await t.mutation(internal.ouvertureFacturation.prevenir, { envoyer: true });
		expect(encore.etablissements).toBe(0);
	}, 30_000);
});
