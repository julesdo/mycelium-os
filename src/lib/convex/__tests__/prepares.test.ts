/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../schema';
import type { Id } from '../_generated/dataModel';
import { dossiersPrepares } from '../recouvrement/prepares';

/**
 * UN DOSSIER SOLDÉ NE SE PROPOSE PLUS AU DÉMARRAGE (audit des parcours Pro du
 * 27/10/2026). Arnaud, réglé de ses 4 812,40 €, restait parmi les dossiers que Plume
 * propose de démarrer. Il reste préparé — rien ne le relance sans le gérant —, mais il
 * n'a plus rien à démarrer.
 */
const modules = Object.fromEntries(
	Object.entries(import.meta.glob('../**/*.ts')).map(([chemin, charger]) => [
		'.' + chemin.slice(2),
		charger
	])
);
const DELAI = 30_000;

async function dossierPrepare(
	t: ReturnType<typeof convexTest>,
	organizationId: Id<'organizations'>,
	nom: string,
	montantTTC: bigint,
	regle: bigint
): Promise<Id<'creances'>> {
	return t.run(async (ctx) => {
		const debiteurId = await ctx.db.insert('debiteurs', {
			organizationId,
			denomination: nom,
			denominationNormalisee: nom.toUpperCase(),
			denominationsBrutes: [nom],
			estCommercant: 'ok',
			santeFinanciere: 'SAINE',
			creeLe: Date.now()
		});
		const creanceId = await ctx.db.insert('creances', {
			organizationId,
			debiteurId,
			statut: 'BROUILLON',
			certaine: 'unknown',
			liquide: 'ok',
			exigible: 'ok',
			entreCommercants: 'ok',
			aDemarrer: true,
			creeLe: Date.now()
		});
		const factureId = await ctx.db.insert('facturesVente', {
			organizationId,
			debiteurId,
			creanceId,
			reference: `F-${nom}`,
			montantHT: 0n,
			montantTTC,
			dateEmission: '2026-01-01',
			dateEcheance: '2026-02-01',
			dateExigibilite: '2026-02-01',
			statutPaiement: 'IMPAYEE',
			creeLe: Date.now()
		});
		if (regle > 0n) {
			await ctx.db.insert('reglements', {
				organizationId,
				factureId,
				date: '2026-10-20',
				montant: regle,
				nature: 'PAIEMENT',
				creeLe: Date.now()
			});
		}
		return creanceId;
	});
}

describe('les dossiers proposés au démarrage', () => {
	it(
		'écartent un dossier soldé, gardent celui qui doit encore',
		async () => {
			const t = convexTest(schema, modules);
			const organizationId = await t.run((ctx) =>
				ctx.db.insert('organizations', { name: 'Atelier', createdAt: Date.now() })
			);
			const arnaud = await dossierPrepare(t, organizationId, 'Arnaud', 481_240n, 481_240n);
			const durand = await dossierPrepare(t, organizationId, 'Durand', 1_240_000n, 0n);
			const moreau = await dossierPrepare(t, organizationId, 'Moreau', 500_000n, 100_000n);

			const prepares = await t.run((ctx) => dossiersPrepares(ctx, organizationId));
			const ids = prepares.map((p) => p.creance._id);
			expect(ids).not.toContain(arnaud);
			expect(ids).toEqual(expect.arrayContaining([durand, moreau]));
			expect(prepares.find((p) => p.creance._id === moreau)?.restantDu).toBe(400_000n);
			// Toujours préparé en base : rien ne le relance sans le gérant.
			await t.run(async (ctx) => {
				expect((await ctx.db.get(arnaud))?.aDemarrer).toBe(true);
			});
		},
		DELAI
	);
});
