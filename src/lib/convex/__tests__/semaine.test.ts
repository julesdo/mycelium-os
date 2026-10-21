/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../schema';
import { lireLaSemaine } from '../recouvrement/semaine';
import { bornesDeLaSemaineEcoulee } from '../../verticales/recouvrement/votre-semaine';

/**
 * « VOTRE SEMAINE », LUE EN BASE (21/10/2026). Les paiements et les relances de la
 * semaine écoulée, et rien quand elle est vide.
 */
const modules = Object.fromEntries(
	Object.entries(import.meta.glob('../**/*.ts')).map(([chemin, charger]) => [
		'.' + chemin.slice(2),
		charger
	])
);
const DELAI_CONVEX = 30_000;
// Dans sept jours, la semaine écoulée est celle de l'arrivée (l'établissement naît au test).
const PLUS_TARD = Date.now() + 7 * 24 * 60 * 60 * 1000;
const SEMAINE = bornesDeLaSemaineEcoulee(PLUS_TARD);

async function unEtablissement(t: ReturnType<typeof convexTest>, avecPaiement: boolean) {
	return t.run(async (ctx) => {
		const organizationId = await ctx.db.insert('organizations', {
			name: 'Garnier Bâtiment',
			createdAt: Date.now()
		});
		const debiteurId = await ctx.db.insert('debiteurs', {
			organizationId,
			denomination: 'Garage Martin',
			denominationNormalisee: 'GARAGE MARTIN',
			denominationsBrutes: ['Garage Martin'],
			estCommercant: 'ok',
			santeFinanciere: 'SAINE',
			creeLe: Date.now()
		});
		const factureId = await ctx.db.insert('facturesVente', {
			organizationId,
			debiteurId,
			reference: 'FA-001',
			montantHT: 0n,
			montantTTC: 300_000n,
			dateEmission: '2026-01-01',
			dateEcheance: '2026-02-01',
			dateExigibilite: '2026-02-01',
			statutPaiement: 'SOLDEE',
			creeLe: Date.now()
		});
		if (avecPaiement) {
			await ctx.db.insert('reglements', {
				organizationId,
				factureId,
				date: SEMAINE.fin,
				montant: 300_000n,
				nature: 'PAIEMENT',
				creeLe: Date.now()
			});
		}
		return organizationId;
	});
}

describe('la semaine lue en base', () => {
	it(
		'compte ce qui est rentré la semaine écoulée',
		async () => {
			const t = convexTest(schema, modules);
			const organizationId = await unEtablissement(t, true);
			const semaine = await t.run(async (ctx) =>
				lireLaSemaine(ctx, (await ctx.db.get(organizationId))!, PLUS_TARD)
			);
			expect(semaine?.debut).toBe(SEMAINE.debut);
			expect(semaine?.rentre).toBe(300_000n);
			expect(semaine?.clientsQuiOntPaye).toBe(1);
		},
		DELAI_CONVEX
	);

	it(
		'se tait sur une semaine vide',
		async () => {
			const t = convexTest(schema, modules);
			const organizationId = await unEtablissement(t, false);
			const semaine = await t.run(async (ctx) =>
				lireLaSemaine(ctx, (await ctx.db.get(organizationId))!, PLUS_TARD)
			);
			expect(semaine).toBeNull();
		},
		DELAI_CONVEX
	);
});
