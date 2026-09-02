/// <reference types="vite/client" />
import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../schema';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';

/**
 * L'enregistrement d'un import, et les trois façons dont il pourrait mentir.
 *
 * 1. **En doublonnant.** Un gérant redépose son export « pour être sûr ». Si la
 *    facture entre deux fois, la créance double et le total reste plausible —
 *    exactement le défaut que le dédoublonnage d'EGalim existe pour empêcher.
 *
 * 2. **En perdant un règlement.** Un règlement dont la facture est inconnue ne
 *    doit pas disparaître : il signale soit un import partiel, soit une facture
 *    antérieure au périmètre. Le compter est la seule façon de s'en apercevoir.
 *
 * 3. **En devinant l'exigibilité.** Elle n'est pas toujours la date d'échéance.
 *    On la déduit quand on n'a rien de mieux, mais on MARQUE qu'elle est
 *    déduite, pour que le gérant sache ce qu'il confirme.
 */

const modules = Object.fromEntries(
	Object.entries(import.meta.glob('../**/*.ts')).map(([chemin, charger]) => [
		'.' + chemin.slice(2),
		charger
	])
);

async function poserOrganisation(t: ReturnType<typeof convexTest>): Promise<Id<'organizations'>> {
	return await t.run(async (ctx) =>
		ctx.db.insert('organizations', { name: 'Thumbbb Agency', createdAt: Date.now() })
	);
}

const FACTURE_DURAND = {
	reference: 'FA-2026-0042',
	debiteur: 'Fournitures Durand',
	debiteurCompte: '411DURAND',
	montantTTC: 1_200_000n,
	dateEmission: '2026-04-15',
	dateEcheance: '2026-05-15'
};

describe('enregistrement d’un import', () => {
	it('crée le débiteur et la facture', async () => {
		const t = convexTest(schema, modules);
		const organizationId = await poserOrganisation(t);

		const bilan = await t.mutation(internal.recouvrement.import.enregistrerImport, {
			organizationId,
			factures: [FACTURE_DURAND],
			reglements: []
		});

		expect(bilan.debiteursCrees).toBe(1);
		expect(bilan.facturesCreees).toBe(1);

		await t.run(async (ctx) => {
			const factures = await ctx.db.query('facturesVente').collect();
			expect(factures).toHaveLength(1);
			expect(factures[0]!.montantTTC).toBe(1_200_000n);
			expect(factures[0]!.statutPaiement).toBe('IMPAYEE');

			const debiteurs = await ctx.db.query('debiteurs').collect();
			expect(debiteurs[0]!.denomination).toBe('Fournitures Durand');
			// Rien n'est su de sa qualité de commerçant : on ne la présume pas.
			expect(debiteurs[0]!.estCommercant).toBe('unknown');
		});
	});

	it('déduit l’exigibilité de l’échéance, et le marque', async () => {
		const t = convexTest(schema, modules);
		const organizationId = await poserOrganisation(t);

		await t.mutation(internal.recouvrement.import.enregistrerImport, {
			organizationId,
			factures: [FACTURE_DURAND],
			reglements: []
		});

		await t.run(async (ctx) => {
			const facture = (await ctx.db.query('facturesVente').collect())[0]!;
			expect(facture.dateExigibilite).toBe('2026-05-15');
			expect(facture.exigibiliteDeduite).toBe(true);
		});
	});

	it('n’invente aucune exigibilité quand l’échéance manque', async () => {
		const t = convexTest(schema, modules);
		const organizationId = await poserOrganisation(t);

		await t.mutation(internal.recouvrement.import.enregistrerImport, {
			organizationId,
			factures: [{ ...FACTURE_DURAND, dateEcheance: undefined }],
			reglements: []
		});

		await t.run(async (ctx) => {
			const facture = (await ctx.db.query('facturesVente').collect())[0]!;
			expect(facture.dateEcheance).toBeUndefined();
			expect(facture.dateExigibilite).toBeUndefined();
		});
	});

	it('ne crée pas deux fois la même facture si l’export est redéposé', async () => {
		const t = convexTest(schema, modules);
		const organizationId = await poserOrganisation(t);

		const args = { organizationId, factures: [FACTURE_DURAND], reglements: [] };
		await t.mutation(internal.recouvrement.import.enregistrerImport, args);
		const second = await t.mutation(internal.recouvrement.import.enregistrerImport, args);

		expect(second.facturesCreees).toBe(0);
		expect(second.facturesDejaConnues).toBe(1);

		await t.run(async (ctx) => {
			expect(await ctx.db.query('facturesVente').collect()).toHaveLength(1);
		});
	});

	it('réutilise un débiteur déjà connu au lieu d’en créer un second', async () => {
		const t = convexTest(schema, modules);
		const organizationId = await poserOrganisation(t);

		await t.mutation(internal.recouvrement.import.enregistrerImport, {
			organizationId,
			factures: [FACTURE_DURAND],
			reglements: []
		});
		const second = await t.mutation(internal.recouvrement.import.enregistrerImport, {
			organizationId,
			factures: [{ ...FACTURE_DURAND, reference: 'FA-2026-0043' }],
			reglements: []
		});

		expect(second.debiteursCrees).toBe(0);
		await t.run(async (ctx) => {
			expect(await ctx.db.query('debiteurs').collect()).toHaveLength(1);
		});
	});
});

describe('règlements', () => {
	it('rattache un règlement et passe la facture en partiellement payée', async () => {
		const t = convexTest(schema, modules);
		const organizationId = await poserOrganisation(t);

		await t.mutation(internal.recouvrement.import.enregistrerImport, {
			organizationId,
			factures: [FACTURE_DURAND],
			reglements: [{ reference: 'FA-2026-0042', date: '2026-06-10', montant: 400_000n }]
		});

		await t.run(async (ctx) => {
			const reglements = await ctx.db.query('reglements').collect();
			expect(reglements).toHaveLength(1);
			expect(reglements[0]!.montant).toBe(400_000n);

			const facture = (await ctx.db.query('facturesVente').collect())[0]!;
			expect(facture.statutPaiement).toBe('PARTIELLEMENT_PAYEE');
		});
	});

	it('solde la facture quand les règlements l’égalent', async () => {
		const t = convexTest(schema, modules);
		const organizationId = await poserOrganisation(t);

		await t.mutation(internal.recouvrement.import.enregistrerImport, {
			organizationId,
			factures: [FACTURE_DURAND],
			reglements: [{ reference: 'FA-2026-0042', date: '2026-06-10', montant: 1_200_000n }]
		});

		await t.run(async (ctx) => {
			const facture = (await ctx.db.query('facturesVente').collect())[0]!;
			expect(facture.statutPaiement).toBe('SOLDEE');
		});
	});

	it('compte un règlement orphelin au lieu de le perdre', async () => {
		const t = convexTest(schema, modules);
		const organizationId = await poserOrganisation(t);

		const bilan = await t.mutation(internal.recouvrement.import.enregistrerImport, {
			organizationId,
			factures: [FACTURE_DURAND],
			reglements: [{ reference: 'FA-INCONNUE', date: '2026-06-10', montant: 100_000n }]
		});

		expect(bilan.reglementsOrphelins).toBe(1);
		await t.run(async (ctx) => {
			expect(await ctx.db.query('reglements').collect()).toHaveLength(0);
		});
	});

	it('ne rejoue pas un règlement déjà enregistré', async () => {
		const t = convexTest(schema, modules);
		const organizationId = await poserOrganisation(t);

		const args = {
			organizationId,
			factures: [FACTURE_DURAND],
			reglements: [{ reference: 'FA-2026-0042', date: '2026-06-10', montant: 400_000n }]
		};
		await t.mutation(internal.recouvrement.import.enregistrerImport, args);
		await t.mutation(internal.recouvrement.import.enregistrerImport, args);

		await t.run(async (ctx) => {
			expect(await ctx.db.query('reglements').collect()).toHaveLength(1);
		});
	});
});

describe('cloisonnement entre organisations', () => {
	it('ne réutilise jamais le débiteur ni la facture d’une autre organisation', async () => {
		const t = convexTest(schema, modules);
		const premiere = await poserOrganisation(t);
		const seconde = await t.run(async (ctx) =>
			ctx.db.insert('organizations', { name: 'Autre cantine', createdAt: Date.now() })
		);

		await t.mutation(internal.recouvrement.import.enregistrerImport, {
			organizationId: premiere,
			factures: [FACTURE_DURAND],
			reglements: []
		});
		const bilan = await t.mutation(internal.recouvrement.import.enregistrerImport, {
			organizationId: seconde,
			factures: [FACTURE_DURAND],
			reglements: []
		});

		// Même référence, même débiteur : ce sont pourtant deux dossiers
		// étrangers l'un à l'autre.
		expect(bilan.debiteursCrees).toBe(1);
		expect(bilan.facturesCreees).toBe(1);

		await t.run(async (ctx) => {
			expect(await ctx.db.query('facturesVente').collect()).toHaveLength(2);
			expect(await ctx.db.query('debiteurs').collect()).toHaveLength(2);
		});
	});
});
