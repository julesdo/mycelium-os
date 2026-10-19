/// <reference types="vite/client" />
import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../schema';
import { internal } from '../_generated/api';
import { offreFondateurs } from '../paddle';
import { ETIQUETTE_FONDATEURS } from '../../paiement/offres';
import { OFFRES } from '../../config/tarifs';

/**
 * LES OFFRES PADDLE (19/10/2026, audit, lot 8) : les places de l'offre fondateurs se
 * comptent sur les abonnements vivants au prix fondateurs, et l'abonnement courant sait
 * qu'il est à ce prix (ce que \`changerDeFormule\` protège).
 */
const modules = Object.fromEntries(
	Object.entries(import.meta.glob('../**/*.ts')).map(([chemin, charger]) => [
		'.' + chemin.slice(2),
		charger
	])
);
const DELAI_CONVEX = 30_000;
const PRIX = 'pri_fondateurs';

function harnais() {
	const t = convexTest(schema, modules);
	return t;
}

async function rangerLePrix(t: ReturnType<typeof harnais>) {
	await t.run(async (ctx) => {
		await ctx.db.insert('prixPaddle', {
			etiquette: ETIQUETTE_FONDATEURS,
			prixId: PRIX,
			formule: 'pro',
			rythme: 'annuel',
			essai: false,
			montant: String(OFFRES.fondateurs.prixCentimes),
			fondateurs: true,
			enregistreLe: Date.now()
		});
	});
}

describe('l’offre fondateurs', () => {
	it(
		'compte les places sur les abonnements vivants, jamais sur un résilié',
		async () => {
			const t = harnais();
			await rangerLePrix(t);
			await t.run(async (ctx) => {
				for (const paddleStatus of ['active', 'trialing', 'canceled'] as const) {
					await ctx.db.insert('organizations', {
						name: `Établissement ${paddleStatus}`,
						createdAt: Date.now(),
						paddlePrixId: PRIX,
						paddleStatus
					});
				}
			});
			const offre = await t.run(async (ctx) => offreFondateurs(ctx, '2026-10-19'));
			expect(offre).toEqual({
				prixId: PRIX,
				restantes: OFFRES.fondateurs.places - 2,
				jusquAu: OFFRES.fondateurs.jusquAu
			});
		},
		DELAI_CONVEX
	);

	it(
		'se ferme après son dernier jour, et sans prix rangé',
		async () => {
			const t = harnais();
			expect(await t.run(async (ctx) => offreFondateurs(ctx, '2026-10-19'))).toBeNull();
			await rangerLePrix(t);
			expect(await t.run(async (ctx) => offreFondateurs(ctx, '2027-01-01'))).toBeNull();
		},
		DELAI_CONVEX
	);

	it(
		'l’abonnement courant se sait au prix fondateurs',
		async () => {
			const t = harnais();
			await rangerLePrix(t);
			await t.run(async (ctx) => {
				const organizationId = await ctx.db.insert('organizations', {
					name: 'Menuiserie Dupont',
					createdAt: Date.now(),
					paddlePrixId: PRIX,
					paddleStatus: 'active',
					paddleSubscriptionId: 'sub_1'
				});
				await ctx.db.insert('organizationMembers', {
					organizationId,
					userId: 'user_1',
					role: 'ORG_ADMIN',
					joinedAt: Date.now()
				});
				await ctx.db.insert('userProfiles', {
					userId: 'user_1',
					currentOrganizationId: organizationId
				});
			});
			const courant = await t.query(internal.paddle._abonnementCourant, { userId: 'user_1' });
			expect(courant?.prixFondateurs).toBe(true);
		},
		DELAI_CONVEX
	);
});
