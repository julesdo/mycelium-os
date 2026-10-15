/// <reference types="vite/client" />
import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../schema';
import { internal } from '../_generated/api';

/**
 * LE RELEVÉ DES ÉTAPES — ce qu'il lit dans la base, et ce qu'il en garde.
 *
 * La déduction elle-même est testée en pur (`croissance/__tests__`). Ici, ce qui
 * naît de la base : les bons index, une facture échue reconnue comme telle, le
 * score et le prochain conseil écrits, et une date d'étape jamais réécrite.
 */
const modules = Object.fromEntries(
	Object.entries(import.meta.glob('../**/*.ts')).map(([chemin, charger]) => [
		'.' + chemin.slice(2),
		charger
	])
);

const DELAI_CONVEX = 30_000;

describe('releverLesEtapes', () => {
	it(
		'note les étapes lues dans la base, le score et le prochain conseil',
		async () => {
			const t = convexTest(schema, modules);
			const inscritLe = Date.now() - 60_000;
			const organizationId = await t.run(async (ctx) => {
				const organizationId = await ctx.db.insert('organizations', {
					name: 'Ateliers Martin',
					createdAt: inscritLe,
					paddleStatus: 'active',
					paddlePlanTier: 'solo',
					paddleRythme: 'mensuel'
				});
				await ctx.db.insert('organizationMembers', {
					organizationId,
					userId: 'user_test_1',
					role: 'ORG_ADMIN',
					joinedAt: inscritLe
				});
				await ctx.db.insert('pilotes', {
					organizationId,
					envoiAutomatique: true,
					activeLe: inscritLe + 1000
				});
				const debiteurId = await ctx.db.insert('debiteurs', {
					organizationId,
					denomination: 'Fournitures Durand',
					denominationNormalisee: 'FOURNITURES DURAND',
					denominationsBrutes: ['Fournitures Durand'],
					estCommercant: 'ok',
					santeFinanciere: 'SAINE',
					creeLe: inscritLe
				});
				await ctx.db.insert('facturesVente', {
					organizationId,
					debiteurId,
					reference: 'FA-2026-0042',
					montantHT: 0n,
					montantTTC: 100_00n,
					dateEmission: '2026-01-01',
					dateEcheance: '2026-02-01',
					statutPaiement: 'IMPAYEE',
					creeLe: inscritLe
				});
				await ctx.db.insert('parcoursComptes', {
					organizationId,
					etapes: { INSCRIT: inscritLe }
				});
				return organizationId;
			});

			await t.mutation(internal.croissance.releve.releverLesEtapes, { organizationId });

			const parcours = await t.run(async (ctx) =>
				ctx.db
					.query('parcoursComptes')
					.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
					.unique()
			);
			expect(parcours?.etapes.INSCRIT).toBe(inscritLe);
			expect(parcours?.etapes.MONTANT_REVELE).toBeTypeOf('number');
			expect(parcours?.etapes.RELANCES_ACTIVEES).toBe(inscritLe + 1000);
			expect(parcours?.etapes.ABONNE).toBeTypeOf('number');
			expect(parcours?.etapes.FACTURES_DEPOSEES).toBeUndefined();
			expect(parcours?.formuleVue).toBe('solo');
			expect(parcours?.score).toBeGreaterThan(0);
			expect(parcours?.prochainConseilLe).toBeTypeOf('number');

			// Un second relevé ne réécrit pas les dates.
			const premier = parcours?.etapes.MONTANT_REVELE;
			await t.mutation(internal.croissance.releve.releverLesEtapes, { organizationId });
			const apres = await t.run(async (ctx) =>
				ctx.db
					.query('parcoursComptes')
					.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
					.unique()
			);
			expect(apres?.etapes.MONTANT_REVELE).toBe(premier);
		},
		DELAI_CONVEX
	);

	it(
		'ouvre le parcours d’un établissement qui n’en avait pas',
		async () => {
			const t = convexTest(schema, modules);
			const organizationId = await t.run(async (ctx) =>
				ctx.db.insert('organizations', { name: 'Ancien', createdAt: Date.now() - 90 * 86_400_000 })
			);
			await t.mutation(internal.croissance.releve.releverLesEtapes, { organizationId });
			const parcours = await t.run(async (ctx) =>
				ctx.db
					.query('parcoursComptes')
					.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
					.unique()
			);
			expect(parcours?.etapes.INSCRIT).toBeTypeOf('number');
			// Inscrit il y a trois mois : aucun conseil rétroactif.
			expect(parcours?.prochainConseilLe).toBeUndefined();
		},
		DELAI_CONVEX
	);
});
