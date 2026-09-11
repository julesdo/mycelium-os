/// <reference types="vite/client" />
import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../schema';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';

/**
 * LE LETTRAGE, BRANCHÉ SUR LA BASE.
 *
 * La règle est couverte par ses propres tests, en mémoire. Ce qui n'existe QU'ICI :
 * ne proposer que les factures du BON débiteur, ne compter que ce qui reste dû
 * après les règlements déjà enregistrés, et — pour l'application — refuser de
 * faire confiance à ce que l'écran renvoie.
 *
 * ⚠️ LE SERVEUR REVÉRIFIE LE TOTAL. L'écran propose une combinaison, le gérant la
 * choisit, et la mutation reçoit une liste de références. Les appliquer sans
 * recontrôler la somme laisserait un écran périmé — ou une main malveillante —
 * solder des factures avec un montant qui ne correspond pas.
 */
const modules = Object.fromEntries(
	Object.entries(import.meta.glob('../**/*.ts')).map(([chemin, charger]) => [
		'.' + chemin.slice(2),
		charger
	])
);

const DELAI_CONVEX = 30_000;

async function poser(
	t: ReturnType<typeof convexTest>,
	factures: Array<{ reference: string; montantTTC: bigint }>,
	nom = 'Ateliers Martin'
): Promise<{ organizationId: Id<'organizations'>; debiteurId: Id<'debiteurs'> }> {
	return await t.run(async (ctx) => {
		const organizationId = await ctx.db.insert('organizations', {
			name: nom,
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
		for (const facture of factures) {
			await ctx.db.insert('facturesVente', {
				organizationId,
				debiteurId,
				reference: facture.reference,
				montantHT: 0n,
				montantTTC: facture.montantTTC,
				dateEmission: '2026-01-01',
				dateEcheance: '2026-02-01',
				dateExigibilite: '2026-02-01',
				statutPaiement: 'IMPAYEE',
				creeLe: Date.now()
			});
		}
		return { organizationId, debiteurId };
	});
}

describe('la proposition de lettrage', () => {
	it(
		'retrouve la combinaison qui fait le montant reçu',
		async () => {
			const t = convexTest(schema, modules);
			const { organizationId, debiteurId } = await poser(t, [
				{ reference: 'FA-001', montantTTC: 120_000n },
				{ reference: 'FA-002', montantTTC: 240_000n },
				{ reference: 'FA-003', montantTTC: 122_000n }
			]);

			const propose = await t.query(internal.recouvrement.lettrage.proposerInterne, {
				organizationId,
				debiteurId,
				montant: 482_000n
			});

			expect(propose.issue).toBe('UNIQUE');
			expect([...(propose.combinaisons[0]?.references ?? [])].sort()).toEqual([
				'FA-001',
				'FA-002',
				'FA-003'
			]);
		},
		DELAI_CONVEX
	);

	it(
		'ne compte que ce qui RESTE dû après les règlements déjà enregistrés',
		async () => {
			// Une facture de 1 200 € déjà réglée à 700 € pèse 500 € dans le
			// rapprochement. Retenir son montant d'origine ferait manquer toutes les
			// combinaisons qui la contiennent.
			const t = convexTest(schema, modules);
			const { organizationId, debiteurId } = await poser(t, [
				{ reference: 'FA-001', montantTTC: 120_000n }
			]);
			await t.run(async (ctx) => {
				const facture = (await ctx.db.query('facturesVente').collect())[0]!;
				await ctx.db.insert('reglements', {
					organizationId,
					factureId: facture._id,
					date: '2026-03-01',
					montant: 70_000n,
					nature: 'PAIEMENT',
					creeLe: Date.now()
				});
			});

			const propose = await t.query(internal.recouvrement.lettrage.proposerInterne, {
				organizationId,
				debiteurId,
				montant: 50_000n
			});

			expect(propose.issue).toBe('UNIQUE');
		},
		DELAI_CONVEX
	);

	it(
		'ne regarde JAMAIS les factures d’un autre débiteur',
		async () => {
			// Un rapprochement entre clients est absurde et invisible : le paiement
			// d'un client solderait la facture d'un autre.
			const t = convexTest(schema, modules);
			const mien = await poser(t, [{ reference: 'FA-001', montantTTC: 100_000n }]);
			await poser(t, [{ reference: 'AUTRE-001', montantTTC: 400_000n }], 'Clinique des Ormes');

			const propose = await t.query(internal.recouvrement.lettrage.proposerInterne, {
				organizationId: mien.organizationId,
				debiteurId: mien.debiteurId,
				montant: 400_000n
			});

			expect(propose.issue).toBe('AUCUNE');
		},
		DELAI_CONVEX
	);

	it(
		'rend les DEUX lectures quand elles existent, sans trancher',
		async () => {
			const t = convexTest(schema, modules);
			const { organizationId, debiteurId } = await poser(t, [
				{ reference: 'FA-001', montantTTC: 100_000n },
				{ reference: 'FA-002', montantTTC: 100_000n }
			]);

			const propose = await t.query(internal.recouvrement.lettrage.proposerInterne, {
				organizationId,
				debiteurId,
				montant: 100_000n
			});

			expect(propose.issue).toBe('AMBIGU');
			expect(propose.combinaisons).toHaveLength(2);
		},
		DELAI_CONVEX
	);
});

describe('l’application d’un lettrage', () => {
	it(
		'enregistre un règlement par facture de la combinaison',
		async () => {
			const t = convexTest(schema, modules);
			const { organizationId, debiteurId } = await poser(t, [
				{ reference: 'FA-001', montantTTC: 120_000n },
				{ reference: 'FA-002', montantTTC: 240_000n }
			]);

			await t.mutation(internal.recouvrement.lettrage.appliquerInterne, {
				organizationId,
				debiteurId,
				references: ['FA-001', 'FA-002'],
				montant: 360_000n,
				date: '2026-04-15'
			});

			const reglements = await t.run(async (ctx) => ctx.db.query('reglements').collect());
			expect(reglements).toHaveLength(2);
			expect(reglements.map((r) => r.montant).sort()).toEqual([120_000n, 240_000n]);

			const statuts = await t.run(async (ctx) =>
				(await ctx.db.query('facturesVente').collect()).map((f) => f.statutPaiement)
			);
			expect(statuts).toEqual(['SOLDEE', 'SOLDEE']);
		},
		DELAI_CONVEX
	);

	it(
		'REFUSE quand la somme des factures ne fait pas le montant annoncé',
		async () => {
			// ⚠️ LE TEST QUI COMPTE. L'écran propose, le gérant choisit, et la
			// mutation reçoit une liste de références. Les appliquer sans recontrôler
			// laisserait un écran périmé solder des factures avec un montant faux.
			const t = convexTest(schema, modules);
			const { organizationId, debiteurId } = await poser(t, [
				{ reference: 'FA-001', montantTTC: 120_000n },
				{ reference: 'FA-002', montantTTC: 240_000n }
			]);

			await expect(
				t.mutation(internal.recouvrement.lettrage.appliquerInterne, {
					organizationId,
					debiteurId,
					references: ['FA-001'],
					montant: 360_000n,
					date: '2026-04-15'
				})
			).rejects.toThrow();

			expect(await t.run(async (ctx) => ctx.db.query('reglements').collect())).toEqual([]);
		},
		DELAI_CONVEX
	);

	it(
		'refuse une facture qui n’est pas de ce débiteur',
		async () => {
			const t = convexTest(schema, modules);
			const mien = await poser(t, [{ reference: 'FA-001', montantTTC: 100_000n }]);
			await poser(t, [{ reference: 'AUTRE-001', montantTTC: 100_000n }], 'Clinique des Ormes');

			await expect(
				t.mutation(internal.recouvrement.lettrage.appliquerInterne, {
					organizationId: mien.organizationId,
					debiteurId: mien.debiteurId,
					references: ['AUTRE-001'],
					montant: 100_000n,
					date: '2026-04-15'
				})
			).rejects.toThrow();
		},
		DELAI_CONVEX
	);

	it(
		'refuse une date qui n’existe pas au calendrier',
		async () => {
			// La date du règlement entre dans le calcul des intérêts : un
			// « 2026-02-30 » y produirait un décalage muet.
			const t = convexTest(schema, modules);
			const { organizationId, debiteurId } = await poser(t, [
				{ reference: 'FA-001', montantTTC: 100_000n }
			]);

			await expect(
				t.mutation(internal.recouvrement.lettrage.appliquerInterne, {
					organizationId,
					debiteurId,
					references: ['FA-001'],
					montant: 100_000n,
					date: '2026-02-30'
				})
			).rejects.toThrow(/2026-02-30/);
		},
		DELAI_CONVEX
	);
});
