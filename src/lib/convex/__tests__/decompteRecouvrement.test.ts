/// <reference types="vite/client" />
import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../schema';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { depuisCentimes, versEuros } from '../../socle/montants';

/**
 * Le décompte figé — le point où tout converge.
 *
 * Il fait travailler ensemble le calcul exact du socle, la série de taux
 * français, les règlements en base et l'indemnité forfaitaire. C'est le seul
 * test qui prouve que la chaîne entière tient, du FEC au montant réclamé.
 *
 * IL EST FIGÉ, DÉFINITIVEMENT. Rejouer le calcul produit un NOUVEAU décompte,
 * daté ; il n'écrase jamais le précédent. Ce qui compte n'est pas seulement de
 * savoir combien on réclame aujourd'hui, mais de prouver ce qu'on réclamait le
 * jour où on l'a réclamé.
 */

/**
 * Le premier test paie le chargement du graphe de modules Convex, ce qui
 * dépasse le délai par défaut de 5 s. Posé test par test plutôt que
 * globalement : un test lent ailleurs doit rester un signal.
 */
const DELAI_CONVEX = 30_000;

const modules = Object.fromEntries(
	Object.entries(import.meta.glob('../**/*.ts')).map(([chemin, charger]) => [
		'.' + chemin.slice(2),
		charger
	])
);

async function poserCreance(
	t: ReturnType<typeof convexTest>,
	options: { montantTTC?: bigint; dateExigibilite?: string; reglement?: { date: string; montant: bigint } } = {}
): Promise<{ organizationId: Id<'organizations'>; creanceId: Id<'creances'> }> {
	return await t.run(async (ctx) => {
		const organizationId = await ctx.db.insert('organizations', {
			name: 'Thumbbb Agency',
			createdAt: Date.now()
		});
		const debiteurId = await ctx.db.insert('debiteurs', {
			organizationId,
			denomination: 'Fournitures Durand',
			denominationNormalisee: 'FOURNITURES DURAND',
			denominationsBrutes: ['Fournitures Durand'],
			estCommercant: 'ok',
			santeFinanciere: 'SAINE',
			creeLe: Date.now()
		});
		const creanceId = await ctx.db.insert('creances', {
			organizationId,
			debiteurId,
			statut: 'QUALIFIEE',
			certaine: 'ok',
			liquide: 'ok',
			exigible: 'ok',
			entreCommercants: 'ok',
			creeLe: Date.now()
		});
		const factureId = await ctx.db.insert('facturesVente', {
			organizationId,
			debiteurId,
			creanceId,
			reference: 'FA-2026-118',
			montantHT: 0n,
			montantTTC: options.montantTTC ?? 1_000_000n,
			dateEmission: '2026-04-15',
			dateEcheance: options.dateExigibilite ?? '2026-05-01',
			dateExigibilite: options.dateExigibilite ?? '2026-05-01',
			exigibiliteDeduite: true,
			statutPaiement: 'IMPAYEE',
			creeLe: Date.now()
		});

		if (options.reglement) {
			await ctx.db.insert('reglements', {
				organizationId,
				factureId,
				date: options.reglement.date,
				montant: options.reglement.montant,
				nature: 'PAIEMENT',
				creeLe: Date.now()
			});
		}

		return { organizationId, creanceId };
	});
}

describe('décompte au taux légal français', () => {
	it('calcule les intérêts sur deux semestres, au centime', async () => {
		// 10 000,00 € exigibles au 2026-05-01, arrêtés au 2026-09-01.
		//   61 j à 12,15 % (S1) → 20 305 c · 62 j à 12,40 % (S2) → 21 063 c
		//   intérêts 413,68 € · indemnité 40,00 € · total 10 453,68 €
		const t = convexTest(schema, modules);
		const { creanceId } = await poserCreance(t);

		const decompteId = await t.mutation(internal.recouvrement.decompte.figerDecompte, {
			creanceId,
			arreteAu: '2026-09-01',
			convention: 'ACT_365'
		});

		await t.run(async (ctx) => {
			const decompte = (await ctx.db.get(decompteId))!;
			expect(versEuros(depuisCentimes(decompte.principalRestantDu))).toBe('10 000,00');
			expect(versEuros(depuisCentimes(decompte.interets))).toBe('413,68');
			expect(versEuros(depuisCentimes(decompte.indemniteForfaitaire))).toBe('40,00');
			expect(versEuros(depuisCentimes(decompte.total))).toBe('10 453,68');
		});
	}, DELAI_CONVEX);

	it('détaille les périodes, et leur somme fait le total', async () => {
		const t = convexTest(schema, modules);
		const { creanceId } = await poserCreance(t);

		const decompteId = await t.mutation(internal.recouvrement.decompte.figerDecompte, {
			creanceId,
			arreteAu: '2026-09-01',
			convention: 'ACT_365'
		});

		await t.run(async (ctx) => {
			const decompte = (await ctx.db.get(decompteId))!;
			const ligne = decompte.lignes[0]!;

			// Deux segments : le changement de taux au 1er juillet coupe la période.
			expect(ligne.segments).toHaveLength(2);
			expect(ligne.segments[0]!.debut).toBe('2026-05-01');
			expect(ligne.segments[1]!.debut).toBe('2026-07-01');
			expect(ligne.segments[0]!.taux.numerateur).toBe(1215n);
			expect(ligne.segments[1]!.taux.numerateur).toBe(1240n);

			const somme = ligne.segments.reduce((total, s) => total + s.interets, 0n);
			expect(somme).toBe(ligne.interets);
		});
	}, DELAI_CONVEX);

	it('réduit la base d’intérêts à compter d’un règlement', async () => {
		const t = convexTest(schema, modules);
		const { creanceId } = await poserCreance(t, {
			reglement: { date: '2026-07-01', montant: 400_000n }
		});

		const decompteId = await t.mutation(internal.recouvrement.decompte.figerDecompte, {
			creanceId,
			arreteAu: '2026-09-01',
			convention: 'ACT_365'
		});

		await t.run(async (ctx) => {
			const decompte = (await ctx.db.get(decompteId))!;
			expect(versEuros(depuisCentimes(decompte.principalRestantDu))).toBe('6 000,00');
			// Trois segments : exigibilité, changement de taux ET règlement
			// tombent le 1er juillet, donc deux ruptures confondues en une.
			expect(decompte.lignes[0]!.segments).toHaveLength(2);
		});
	}, DELAI_CONVEX);
});

describe('ce qui est figé l’est définitivement', () => {
	it('rejoué à la même date, rend exactement le même total', async () => {
		const t = convexTest(schema, modules);
		const { creanceId } = await poserCreance(t);

		const premier = await t.mutation(internal.recouvrement.decompte.figerDecompte, {
			creanceId,
			arreteAu: '2026-09-01',
			convention: 'ACT_365'
		});
		const second = await t.mutation(internal.recouvrement.decompte.figerDecompte, {
			creanceId,
			arreteAu: '2026-09-01',
			convention: 'ACT_365'
		});

		await t.run(async (ctx) => {
			const a = (await ctx.db.get(premier))!;
			const b = (await ctx.db.get(second))!;
			expect(a.total).toBe(b.total);
			// Deux documents distincts : le second n'écrase pas le premier.
			expect(premier).not.toBe(second);
			expect(await ctx.db.query('decomptes').collect()).toHaveLength(2);
		});
	}, DELAI_CONVEX);

	it('garde la convention employée, sans laquelle le chiffre n’est pas défendable', async () => {
		const t = convexTest(schema, modules);
		const { creanceId } = await poserCreance(t);

		const decompteId = await t.mutation(internal.recouvrement.decompte.figerDecompte, {
			creanceId,
			arreteAu: '2026-09-01',
			convention: 'ACT_ACT'
		});

		await t.run(async (ctx) => {
			const decompte = (await ctx.db.get(decompteId))!;
			expect(decompte.convention).toBe('ACT_ACT');
			expect(decompte.arreteAu).toBe('2026-09-01');
		});
	}, DELAI_CONVEX);
});

describe('les refus', () => {
	it('refuse une facture sans date d’exigibilité, plutôt que d’en inventer une', async () => {
		const t = convexTest(schema, modules);
		const { organizationId, creanceId } = await poserCreance(t);

		await t.run(async (ctx) => {
			const facture = (
				await ctx.db
					.query('facturesVente')
					.withIndex('by_creance', (q) => q.eq('creanceId', creanceId))
					.collect()
			)[0]!;
			await ctx.db.patch(facture._id, { dateExigibilite: undefined });
			expect(organizationId).toBeTruthy();
		});

		await expect(
			t.mutation(internal.recouvrement.decompte.figerDecompte, {
				creanceId,
				arreteAu: '2026-09-01',
				convention: 'ACT_365'
			})
		).rejects.toThrow(/exigibilit/i);
	}, DELAI_CONVEX);

	it('refuse un arrêté sur un semestre dont le taux n’est pas publié', async () => {
		// La série s'arrête au second semestre 2026 : au-delà, on ne devine pas.
		const t = convexTest(schema, modules);
		const { creanceId } = await poserCreance(t);

		await expect(
			t.mutation(internal.recouvrement.decompte.figerDecompte, {
				creanceId,
				arreteAu: '2028-01-01',
				convention: 'ACT_365'
			})
		).rejects.toThrow(/2027-S1|Taux BCE/i);
	}, DELAI_CONVEX);

	it('refuse une créance sans facture', async () => {
		const t = convexTest(schema, modules);
		const { creanceId } = await poserCreance(t);

		await t.run(async (ctx) => {
			const facture = (
				await ctx.db
					.query('facturesVente')
					.withIndex('by_creance', (q) => q.eq('creanceId', creanceId))
					.collect()
			)[0]!;
			await ctx.db.delete(facture._id);
		});

		await expect(
			t.mutation(internal.recouvrement.decompte.figerDecompte, {
				creanceId,
				arreteAu: '2026-09-01',
				convention: 'ACT_365'
			})
		).rejects.toThrow(/facture/i);
	}, DELAI_CONVEX);
});
