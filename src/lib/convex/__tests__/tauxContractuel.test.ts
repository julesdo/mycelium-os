/// <reference types="vite/client" />
import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../schema';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';

/**
 * LE TAUX CONTRACTUEL, ÉCRIT EN BASE.
 *
 * La lecture du pourcentage et le contrôle du plancher sont couverts par leurs
 * propres tests, en mémoire. Ce qui n'existe QU'ICI :
 *
 *   · le taux atteint RÉELLEMENT les factures — c'est tout l'objet de la
 *     correction, puisque le champ était lu et jamais écrit ;
 *   · il ne touche PAS les factures soldées : un décompte arrêté est figé ;
 *   · il ne franchit jamais la frontière d'un autre établissement ;
 *   · un taux sous le plancher est ENREGISTRÉ quand même, avec son constat.
 */
const modules = Object.fromEntries(
	Object.entries(import.meta.glob('../**/*.ts')).map(([chemin, charger]) => [
		'.' + chemin.slice(2),
		charger
	])
);

const DELAI_CONVEX = 30_000;
const LE_JOUR = '2026-03-15';

async function poser(
	t: ReturnType<typeof convexTest>,
	statuts: readonly ('IMPAYEE' | 'SOLDEE')[],
	nomOrg = 'Ateliers Martin'
): Promise<{ organizationId: Id<'organizations'>; debiteurId: Id<'debiteurs'> }> {
	return await t.run(async (ctx) => {
		const organizationId = await ctx.db.insert('organizations', {
			name: nomOrg,
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
		for (const [rang, statut] of statuts.entries()) {
			await ctx.db.insert('facturesVente', {
				organizationId,
				debiteurId,
				reference: `F-${rang}`,
				montantHT: 0n,
				montantTTC: 100_000n,
				dateEmission: '2026-01-01',
				dateExigibilite: '2026-02-01',
				statutPaiement: statut,
				creeLe: Date.now()
			});
		}
		return { organizationId, debiteurId };
	});
}

describe('poser un taux contractuel', () => {
	it(
		'l’écrit RÉELLEMENT sur les factures non soldées',
		async () => {
			// ⚠️ LE TEST QUI PORTE TOUTE LA CORRECTION. Le champ était lu par les
			// deux moteurs de calcul et écrit nulle part : c'est cette assertion-là
			// qui manquait, et elle aurait attrapé le défaut.
			const t = convexTest(schema, modules);
			const { organizationId, debiteurId } = await poser(t, ['IMPAYEE', 'IMPAYEE']);

			const resultat = await t.mutation(internal.recouvrement.tauxContractuel.renseignerInterne, {
				organizationId,
				debiteurId,
				pourcentage: '15,00',
				aLaDate: LE_JOUR
			});

			expect(resultat.facturesTouchees).toBe(2);

			const taux = await t.run(async (ctx) =>
				(await ctx.db.query('facturesVente').collect()).map((f) => f.tauxContractuel)
			);
			expect(taux).toEqual([
				{ numerateur: 1500n, denominateur: 10_000n },
				{ numerateur: 1500n, denominateur: 10_000n }
			]);
		},
		DELAI_CONVEX
	);

	it(
		'ne touche JAMAIS une facture soldée',
		async () => {
			// ⚠️ UN DÉCOMPTE ARRÊTÉ EST FIGÉ, DÉFINITIVEMENT. Une facture réglée a
			// produit ses intérêts sur le taux en vigueur quand elle courait ; les
			// récrire changerait un décompte peut-être déjà remis, peut-être déjà
			// contesté.
			const t = convexTest(schema, modules);
			const { organizationId, debiteurId } = await poser(t, ['SOLDEE', 'IMPAYEE']);

			await t.mutation(internal.recouvrement.tauxContractuel.renseignerInterne, {
				organizationId,
				debiteurId,
				pourcentage: '15,00',
				aLaDate: LE_JOUR
			});

			const parStatut = await t.run(async (ctx) =>
				(await ctx.db.query('facturesVente').collect()).map((f) => ({
					statut: f.statutPaiement,
					aUnTaux: f.tauxContractuel !== undefined
				}))
			);
			expect(parStatut).toContainEqual({ statut: 'SOLDEE', aUnTaux: false });
			expect(parStatut).toContainEqual({ statut: 'IMPAYEE', aUnTaux: true });
		},
		DELAI_CONVEX
	);

	it(
		'ne franchit jamais la frontière d’un autre établissement',
		async () => {
			const t = convexTest(schema, modules);
			const mien = await poser(t, ['IMPAYEE']);
			await poser(t, ['IMPAYEE'], 'Clinique des Ormes');

			await t.mutation(internal.recouvrement.tauxContractuel.renseignerInterne, {
				organizationId: mien.organizationId,
				debiteurId: mien.debiteurId,
				pourcentage: '15,00',
				aLaDate: LE_JOUR
			});

			const avecTaux = await t.run(
				async (ctx) =>
					(await ctx.db.query('facturesVente').collect()).filter(
						(f) => f.tauxContractuel !== undefined
					).length
			);
			expect(avecTaux).toBe(1);
		},
		DELAI_CONVEX
	);

	it(
		'ENREGISTRE un taux sous le plancher, et le constate',
		async () => {
			// ⚠️ REFUSER REVIENDRAIT À RELEVER D'OFFICE UN TAUX JUGÉ TROP BAS,
			// c'est-à-dire à écrire une conséquence juridique que personne n'a
			// validée. On constate, le créancier décide.
			const t = convexTest(schema, modules);
			const { organizationId, debiteurId } = await poser(t, ['IMPAYEE']);

			const resultat = await t.mutation(internal.recouvrement.tauxContractuel.renseignerInterne, {
				organizationId,
				debiteurId,
				pourcentage: '1,00',
				aLaDate: LE_JOUR
			});

			expect(resultat.sousLePlancher).toBe(true);
			expect(resultat.constat).toMatch(/plancher/i);

			const taux = await t.run(
				async (ctx) => (await ctx.db.query('facturesVente').collect())[0]?.tauxContractuel
			);
			expect(taux).toEqual({ numerateur: 100n, denominateur: 10_000n });
		},
		DELAI_CONVEX
	);

	it(
		'refuse un taux illisible, sans rien écrire',
		async () => {
			const t = convexTest(schema, modules);
			const { organizationId, debiteurId } = await poser(t, ['IMPAYEE']);

			await expect(
				t.mutation(internal.recouvrement.tauxContractuel.renseignerInterne, {
					organizationId,
					debiteurId,
					pourcentage: '12,455',
					aLaDate: LE_JOUR
				})
			).rejects.toThrow();

			const taux = await t.run(
				async (ctx) => (await ctx.db.query('facturesVente').collect())[0]?.tauxContractuel
			);
			// ⚠️ `== null` ET PAS `toBeUndefined()`. Le harnais `convex-test` rend
			// `null` là où Convex rend `undefined` pour un champ optionnel ABSENT.
			// Les deux disent la même chose ; exiger l'un des deux ferait échouer
			// un test sur une différence de harnais, pas sur le produit.
			expect(taux == null).toBe(true);
		},
		DELAI_CONVEX
	);

	it(
		'retire la stipulation et fait retomber sur le taux légal',
		async () => {
			const t = convexTest(schema, modules);
			const { organizationId, debiteurId } = await poser(t, ['IMPAYEE']);

			await t.mutation(internal.recouvrement.tauxContractuel.renseignerInterne, {
				organizationId,
				debiteurId,
				pourcentage: '15,00',
				aLaDate: LE_JOUR
			});
			await t.mutation(internal.recouvrement.tauxContractuel.renseignerInterne, {
				organizationId,
				debiteurId,
				pourcentage: null,
				aLaDate: LE_JOUR
			});

			const taux = await t.run(
				async (ctx) => (await ctx.db.query('facturesVente').collect())[0]?.tauxContractuel
			);
			// ⚠️ `== null` ET PAS `toBeUndefined()`. Le harnais `convex-test` rend
			// `null` là où Convex rend `undefined` pour un champ optionnel ABSENT.
			// Les deux disent la même chose ; exiger l'un des deux ferait échouer
			// un test sur une différence de harnais, pas sur le produit.
			expect(taux == null).toBe(true);
		},
		DELAI_CONVEX
	);
});
