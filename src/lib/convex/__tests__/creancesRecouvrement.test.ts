/// <reference types="vite/client" />
import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import { ConvexError } from 'convex/values';
import schema from '../schema';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';

/**
 * La constitution d'une créance : choisir des factures, et savoir ce qu'elles
 * valent en droit.
 *
 * TROIS INVARIANTS Y SONT TENUS, et chacun se paierait cher s'il cédait.
 *
 * 1. **Une créance ne porte qu'UN débiteur.** Grouper deux clients dans un même
 *    dossier produirait un acte qu'aucun tribunal ne peut traiter, découvert
 *    après avoir payé le commissaire de justice.
 *
 * 2. **Une facture n'appartient qu'à UNE créance.** Sans quoi la même somme
 *    serait réclamée deux fois, dans deux procédures, au même débiteur.
 *
 * 3. **Le cloisonnement passe avant tout.** Connaître un identifiant de facture
 *    ne doit pas suffire à l'inclure dans sa propre créance.
 */

const modules = Object.fromEntries(
	Object.entries(import.meta.glob('../**/*.ts')).map(([chemin, charger]) => [
		'.' + chemin.slice(2),
		charger
	])
);

const AUJOURDHUI = '2026-09-03';

interface Decor {
	organizationId: Id<'organizations'>;
	debiteurId: Id<'debiteurs'>;
	factures: Id<'facturesVente'>[];
}

async function poser(
	t: ReturnType<typeof convexTest>,
	options: {
		debiteurCommercant?: 'ok' | 'ko' | 'unknown';
		creancierCommercant?: 'ok' | 'ko' | 'unknown';
		dateEcheance?: string;
		montants?: string[];
	} = {}
): Promise<Decor> {
	const montants = options.montants ?? ['12000,00'];

	return await t.run(async (ctx) => {
		const organizationId = await ctx.db.insert('organizations', {
			name: 'Thumbbb Agency',
			createdAt: Date.now()
		});

		await ctx.db.insert('profilsCreancier', {
			organizationId,
			denomination: 'Thumbbb Agency',
			estCommercant: options.creancierCommercant ?? 'ok',
			majLe: Date.now()
		});

		const debiteurId = await ctx.db.insert('debiteurs', {
			organizationId,
			denomination: 'Fournitures Durand',
			denominationNormalisee: 'FOURNITURES DURAND',
			denominationsBrutes: ['Fournitures Durand'],
			estCommercant: options.debiteurCommercant ?? 'ok',
			santeFinanciere: 'SAINE',
			creeLe: Date.now()
		});

		const factures: Id<'facturesVente'>[] = [];
		for (const [index, montant] of montants.entries()) {
			const centimes = BigInt(montant.replace(/[ ,.]/g, ''));
			factures.push(
				await ctx.db.insert('facturesVente', {
					organizationId,
					debiteurId,
					reference: `FA-${index + 1}`,
					montantHT: 0n,
					montantTTC: centimes,
					dateEmission: '2026-04-15',
					dateEcheance: options.dateEcheance ?? '2026-05-15',
					dateExigibilite: options.dateEcheance ?? '2026-05-15',
					exigibiliteDeduite: true,
					statutPaiement: 'IMPAYEE',
					creeLe: Date.now()
				})
			);
		}

		return { organizationId, debiteurId, factures };
	});
}

describe('constitution d’une créance', () => {
	it('regroupe les factures et calcule ce qui reste dû', async () => {
		const t = convexTest(schema, modules);
		const decor = await poser(t, { montants: ['12000,00', '3000,00'] });

		const creanceId = await t.mutation(internal.recouvrement.creances.creerCreance, {
			organizationId: decor.organizationId,
			factureIds: decor.factures,
			aujourdHui: AUJOURDHUI
		});

		await t.run(async (ctx) => {
			const creance = (await ctx.db.get(creanceId))!;
			expect(creance.debiteurId).toBe(decor.debiteurId);
			expect(creance.statut).toBe('BROUILLON');

			// Les factures pointent vers leur créance : le lien vit sur la facture.
			for (const factureId of decor.factures) {
				expect((await ctx.db.get(factureId))!.creanceId).toBe(creanceId);
			}
		});
	});

	it('déduit ce qui est déductible et laisse le reste indéterminé', async () => {
		const t = convexTest(schema, modules);
		const decor = await poser(t);

		const creanceId = await t.mutation(internal.recouvrement.creances.creerCreance, {
			organizationId: decor.organizationId,
			factureIds: decor.factures,
			aujourdHui: AUJOURDHUI
		});

		await t.run(async (ctx) => {
			const creance = (await ctx.db.get(creanceId))!;
			expect(creance.liquide).toBe('ok');
			expect(creance.exigible).toBe('ok');
			expect(creance.entreCommercants).toBe('ok');
			// Jamais déduit : l'absence de contestation connue n'est pas une
			// absence de contestation.
			expect(creance.certaine).toBe('unknown');
		});
	});

	it('sait qu’une facture non échue n’est pas exigible, au lieu de l’ignorer', async () => {
		const t = convexTest(schema, modules);
		const decor = await poser(t, { dateEcheance: '2027-01-01' });

		const creanceId = await t.mutation(internal.recouvrement.creances.creerCreance, {
			organizationId: decor.organizationId,
			factureIds: decor.factures,
			aujourdHui: AUJOURDHUI
		});

		await t.run(async (ctx) => {
			expect((await ctx.db.get(creanceId))!.exigible).toBe('ko');
		});
	});

	it('porte un score, borné entre 0 et 1', async () => {
		const t = convexTest(schema, modules);
		const decor = await poser(t);

		const creanceId = await t.mutation(internal.recouvrement.creances.creerCreance, {
			organizationId: decor.organizationId,
			factureIds: decor.factures,
			aujourdHui: AUJOURDHUI
		});

		await t.run(async (ctx) => {
			const score = (await ctx.db.get(creanceId))!.score!;
			expect(score).toBeGreaterThanOrEqual(0);
			expect(score).toBeLessThanOrEqual(1);
		});
	});
});

describe('les invariants qui protègent l’acte', () => {
	it('refuse deux débiteurs dans une même créance', async () => {
		const t = convexTest(schema, modules);
		const decor = await poser(t);

		const autreFacture = await t.run(async (ctx) => {
			const autreDebiteur = await ctx.db.insert('debiteurs', {
				organizationId: decor.organizationId,
				denomination: 'Ateliers Martin',
				denominationNormalisee: 'ATELIERS MARTIN',
				denominationsBrutes: ['Ateliers Martin'],
				estCommercant: 'ok',
				santeFinanciere: 'SAINE',
				creeLe: Date.now()
			});
			return await ctx.db.insert('facturesVente', {
				organizationId: decor.organizationId,
				debiteurId: autreDebiteur,
				reference: 'FA-AUTRE',
				montantHT: 0n,
				montantTTC: 500_000n,
				dateEmission: '2026-04-15',
				statutPaiement: 'IMPAYEE',
				creeLe: Date.now()
			});
		});

		await expect(
			t.mutation(internal.recouvrement.creances.creerCreance, {
				organizationId: decor.organizationId,
				factureIds: [...decor.factures, autreFacture],
				aujourdHui: AUJOURDHUI
			})
		).rejects.toThrow(/débiteur/i);
	});

	it('refuse une facture déjà rattachée à une autre créance', async () => {
		const t = convexTest(schema, modules);
		const decor = await poser(t);

		await t.mutation(internal.recouvrement.creances.creerCreance, {
			organizationId: decor.organizationId,
			factureIds: decor.factures,
			aujourdHui: AUJOURDHUI
		});

		await expect(
			t.mutation(internal.recouvrement.creances.creerCreance, {
				organizationId: decor.organizationId,
				factureIds: decor.factures,
				aujourdHui: AUJOURDHUI
			})
		).rejects.toThrow(/déjà/i);
	});

	it('refuse une facture d’une autre organisation', async () => {
		const t = convexTest(schema, modules);
		const premier = await poser(t);
		const second = await poser(t);

		await expect(
			t.mutation(internal.recouvrement.creances.creerCreance, {
				organizationId: premier.organizationId,
				factureIds: second.factures,
				aujourdHui: AUJOURDHUI
			})
		).rejects.toThrow(ConvexError);
	});

	it('refuse une créance sans aucune facture', async () => {
		const t = convexTest(schema, modules);
		const decor = await poser(t);

		await expect(
			t.mutation(internal.recouvrement.creances.creerCreance, {
				organizationId: decor.organizationId,
				factureIds: [],
				aujourdHui: AUJOURDHUI
			})
		).rejects.toThrow();
	});
});

describe('le questionnaire — ce qui reste à trancher', () => {
	it('enregistre la réponse du gérant et recalcule le score', async () => {
		const t = convexTest(schema, modules);
		const decor = await poser(t);

		const creanceId = await t.mutation(internal.recouvrement.creances.creerCreance, {
			organizationId: decor.organizationId,
			factureIds: decor.factures,
			aujourdHui: AUJOURDHUI
		});

		const avant = await t.run(async (ctx) => (await ctx.db.get(creanceId))!.score!);

		await t.mutation(internal.recouvrement.creances.repondreQuestionnaire, {
			creanceId,
			reponses: { certaine: 'ok' },
			aujourdHui: AUJOURDHUI
		});

		await t.run(async (ctx) => {
			const creance = (await ctx.db.get(creanceId))!;
			expect(creance.certaine).toBe('ok');
			expect(creance.score!).toBeGreaterThan(avant);
			// Une créance dont on a tranché la dernière condition est qualifiée.
			expect(creance.statut).toBe('QUALIFIEE');
			expect(creance.qualifieeLe).toBeTypeOf('number');
		});
	});

	it('ne qualifie pas une créance dont une condition reste indéterminée', async () => {
		const t = convexTest(schema, modules);
		const decor = await poser(t, { debiteurCommercant: 'unknown' });

		const creanceId = await t.mutation(internal.recouvrement.creances.creerCreance, {
			organizationId: decor.organizationId,
			factureIds: decor.factures,
			aujourdHui: AUJOURDHUI
		});

		await t.mutation(internal.recouvrement.creances.repondreQuestionnaire, {
			creanceId,
			reponses: { certaine: 'ok' },
			aujourdHui: AUJOURDHUI
		});

		await t.run(async (ctx) => {
			expect((await ctx.db.get(creanceId))!.statut).toBe('BROUILLON');
		});
	});
});
