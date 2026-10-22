/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../schema';
import { internal } from '../_generated/api';
import { attribuerLaRecommandation } from '../croissance/parrainage';

/**
 * LA RECOMMANDATION, EN BASE (21/10/2026, moment 7) : le lien rattache le nouvel
 * établissement à celui qui l'a recommandé ; sa première vraie échéance payée offre un
 * mois aux deux, une seule fois, douze par an au plus pour qui recommande.
 */
const modules = Object.fromEntries(
	Object.entries(import.meta.glob('../**/*.ts')).map(([chemin, charger]) => [
		'.' + chemin.slice(2),
		charger
	])
);
const DELAI_CONVEX = 30_000;
const CODE = 'K7M2P9QRST';

async function deuxEtablissements(t: ReturnType<typeof convexTest>, recompensesDuParrain = 0) {
	return t.run(async (ctx) => {
		const parrain = await ctx.db.insert('organizations', {
			name: 'Garnier Bâtiment',
			createdAt: Date.now(),
			codeParrainage: CODE,
			paddleCustomerId: 'ctm_parrain',
			recompensesParrainage: Array.from({ length: recompensesDuParrain }, () => ({
				raison: 'PARRAIN' as const,
				gagneeLe: Date.now()
			}))
		});
		await ctx.db.insert('organizationMembers', {
			organizationId: parrain,
			userId: 'parrain',
			role: 'ORG_ADMIN',
			joinedAt: Date.now()
		});
		const filleul = await ctx.db.insert('organizations', {
			name: 'Menuiserie Dupont',
			createdAt: Date.now(),
			paddleSubscriptionId: 'sub_filleul',
			paddleCustomerId: 'ctm_filleul'
		});
		return { parrain, filleul };
	});
}

describe('l’attribution', () => {
	it(
		'rattache le nouvel établissement à celui dont il a suivi le lien',
		async () => {
			const t = convexTest(schema, modules);
			const { parrain, filleul } = await deuxEtablissements(t);
			await t.run((ctx) => attribuerLaRecommandation(ctx, filleul, 'nouveau', 'k7m2p9qrst'));
			expect((await t.run((ctx) => ctx.db.get(filleul)))?.parrainePar).toBe(parrain);
		},
		DELAI_CONVEX
	);

	it(
		'ne rattache ni à soi-même, ni sur un code qui n’existe pas',
		async () => {
			const t = convexTest(schema, modules);
			const { filleul } = await deuxEtablissements(t);
			await t.run(async (ctx) => {
				await attribuerLaRecommandation(ctx, filleul, 'parrain', CODE);
				await attribuerLaRecommandation(ctx, filleul, 'nouveau', 'ZZZZZZZZZZ');
			});
			expect((await t.run((ctx) => ctx.db.get(filleul)))?.parrainePar).toBeUndefined();
		},
		DELAI_CONVEX
	);
});

describe('la première vraie échéance payée', () => {
	it(
		'offre un mois aux deux, une seule fois, et rien pour l’essai à 0 €',
		async () => {
			const t = convexTest(schema, modules);
			const { parrain, filleul } = await deuxEtablissements(t);
			await t.run((ctx) => ctx.db.patch(filleul, { parrainePar: parrain }));
			const payee = { paddleSubscriptionId: 'sub_filleul', paddleCustomerId: 'ctm_filleul' };
			await t.mutation(internal.croissance.parrainage.noterUneEcheancePayee, { ...payee, ttc: 0 });
			expect((await t.run((ctx) => ctx.db.get(filleul)))?.recompensesParrainage).toBeUndefined();
			await t.mutation(internal.croissance.parrainage.noterUneEcheancePayee, {
				...payee,
				ttc: 7_080
			});
			await t.mutation(internal.croissance.parrainage.noterUneEcheancePayee, {
				...payee,
				ttc: 7_080
			});
			const [f, p] = await t.run(async (ctx) => [
				await ctx.db.get(filleul),
				await ctx.db.get(parrain)
			]);
			expect(f?.recompensesParrainage?.map((r) => r.raison)).toEqual(['FILLEUL']);
			expect(f?.recompenseEnAttente).toBe(true);
			expect(p?.recompensesParrainage?.map((r) => r.raison)).toEqual(['PARRAIN']);
			expect(p?.recompenseEnAttente).toBe(true);
		},
		DELAI_CONVEX
	);

	it(
		'garde le mois du recommandé quand celui qui recommande a déjà ses douze',
		async () => {
			const t = convexTest(schema, modules);
			const { parrain, filleul } = await deuxEtablissements(t, 12);
			await t.run((ctx) => ctx.db.patch(filleul, { parrainePar: parrain }));
			await t.mutation(internal.croissance.parrainage.noterUneEcheancePayee, {
				paddleSubscriptionId: 'sub_filleul',
				paddleCustomerId: 'ctm_filleul',
				ttc: 7_080
			});
			const [f, p] = await t.run(async (ctx) => [
				await ctx.db.get(filleul),
				await ctx.db.get(parrain)
			]);
			expect(f?.recompensesParrainage).toHaveLength(1);
			expect(p?.recompensesParrainage).toHaveLength(12);
		},
		DELAI_CONVEX
	);
});
