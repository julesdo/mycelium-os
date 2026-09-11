/// <reference types="vite/client" />
import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../schema';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';

/**
 * LE SUIVI D'UNE PROCÉDURE ENGAGÉE, EN BASE — module 4.5.
 *
 * La machine à états est couverte en mémoire par `verticales/recouvrement/
 * apres-procedure`. Ce qui n'existe QU'ICI :
 *
 *   · engager une procédure enregistre LAQUELLE et QUAND — `statut: 'ENGAGEE'`
 *     ne le disait pas, donc aucun délai post-décision ne pouvait courir ;
 *   · un événement atteint réellement le journal, avec la date du FAIT ;
 *   · l'état se rejoue depuis le journal, il n'est stocké nulle part ;
 *   · rien ne franchit la frontière d'un autre établissement.
 */
const modules = Object.fromEntries(
	Object.entries(import.meta.glob('../**/*.ts')).map(([chemin, charger]) => [
		'.' + chemin.slice(2),
		charger
	])
);

const DELAI_CONVEX = 30_000;

async function poserCreance(
	t: ReturnType<typeof convexTest>,
	nomOrg = 'Thumbbb Agency'
): Promise<{ organizationId: Id<'organizations'>; creanceId: Id<'creances'> }> {
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
		return { organizationId, creanceId };
	});
}

describe('engager une procédure', () => {
	it(
		'enregistre LAQUELLE et QUAND',
		async () => {
			// ⚠️ `statut: 'ENGAGEE'` NE SUFFISAIT PAS. Le statut existait depuis le
			// début et ne disait ni quelle voie avait été prise, ni depuis quand :
			// aucun délai post-décision ne pouvait donc courir.
			const t = convexTest(schema, modules);
			const { creanceId } = await poserCreance(t);

			await t.mutation(internal.recouvrement.apresProcedure.engagerProcedureInterne, {
				creanceId,
				procedure: 'injonction-de-payer',
				engageeLe: '2026-01-05'
			});

			const creance = await t.run(async (ctx) => (await ctx.db.get(creanceId))!);
			expect(creance.statut).toBe('ENGAGEE');
			expect(creance.procedureEngagee).toBe('injonction-de-payer');
			expect(creance.engageeLe).toBe('2026-01-05');
		},
		DELAI_CONVEX
	);

	it(
		'refuse une procédure sans machine à états',
		async () => {
			// Engager une relance amiable n'a pas d'après à surveiller. Accepter
			// laisserait un dossier « engagé » dont le suivi ne rendrait jamais rien.
			const t = convexTest(schema, modules);
			const { creanceId } = await poserCreance(t);

			await expect(
				t.mutation(internal.recouvrement.apresProcedure.engagerProcedureInterne, {
					creanceId,
					procedure: 'relance-amiable',
					engageeLe: '2026-01-05'
				})
			).rejects.toThrow();
		},
		DELAI_CONVEX
	);
});

describe('le journal des événements', () => {
	async function engagee(t: ReturnType<typeof convexTest>, nomOrg?: string) {
		const decor = await poserCreance(t, nomOrg);
		await t.mutation(internal.recouvrement.apresProcedure.engagerProcedureInterne, {
			creanceId: decor.creanceId,
			procedure: 'injonction-de-payer',
			engageeLe: '2026-01-05'
		});
		return decor;
	}

	it(
		'retient la date du FAIT, pas celle de la saisie',
		async () => {
			// ⚠️ LA DISTINCTION QUI PORTE LE MODULE. Un gérant qui enregistre le
			// 20 mars une ordonnance signifiée le 3 doit voir ses trois mois partir
			// du 3. Les confondre lui en offrirait dix-sept de plus, sur l'échéance
			// la plus dangereuse du produit.
			const t = convexTest(schema, modules);
			const { creanceId } = await engagee(t);

			await t.mutation(internal.recouvrement.apresProcedure.consignerInterne, {
				creanceId,
				cle: 'ordonnance-rendue',
				survenuLe: '2026-01-10'
			});

			const journal = await t.run(async (ctx) =>
				ctx.db
					.query('evenementsProcedure')
					.withIndex('by_creance', (q) => q.eq('creanceId', creanceId))
					.collect()
			);
			expect(journal).toHaveLength(1);
			expect(journal[0]!.survenuLe).toBe('2026-01-10');
			expect(journal[0]!.consigneLe).toEqual(expect.any(Number));
		},
		DELAI_CONVEX
	);

	it(
		'rejoue l’état et fait courir la caducité depuis l’ordonnance',
		async () => {
			const t = convexTest(schema, modules);
			const { creanceId } = await engagee(t);

			await t.mutation(internal.recouvrement.apresProcedure.consignerInterne, {
				creanceId,
				cle: 'ordonnance-rendue',
				survenuLe: '2026-01-10'
			});

			const suivi = await t.mutation(internal.recouvrement.apresProcedure.consignerInterne, {
				creanceId,
				cle: 'ordonnance-signifiee',
				survenuLe: '2026-02-10'
			});

			expect(suivi.etat).toBe('ORDONNANCE_SIGNIFIEE');
			// Signifiée : la caducité ne court plus, et l'angle mort apparaît.
			expect(suivi.echeances).toEqual([]);
			expect(suivi.anglesMorts.join(' ')).toMatch(/opposition/i);
		},
		DELAI_CONVEX
	);

	it(
		'refuse une créance qui n’a engagé aucune procédure',
		async () => {
			const t = convexTest(schema, modules);
			const { creanceId } = await poserCreance(t);

			await expect(
				t.mutation(internal.recouvrement.apresProcedure.consignerInterne, {
					creanceId,
					cle: 'ordonnance-rendue',
					survenuLe: '2026-01-10'
				})
			).rejects.toThrow();
		},
		DELAI_CONVEX
	);

	it(
		'ne franchit jamais la frontière d’un autre établissement',
		async () => {
			const t = convexTest(schema, modules);
			const mien = await engagee(t);
			await engagee(t, 'Clinique des Ormes');

			await t.mutation(internal.recouvrement.apresProcedure.consignerInterne, {
				creanceId: mien.creanceId,
				cle: 'ordonnance-rendue',
				survenuLe: '2026-01-10'
			});

			const total = await t.run(async (ctx) =>
				(await ctx.db.query('evenementsProcedure').collect()).filter(
					(e) => e.organizationId === mien.organizationId
				)
			);
			expect(total).toHaveLength(1);
			const tous = await t.run(async (ctx) => ctx.db.query('evenementsProcedure').collect());
			expect(tous).toHaveLength(1);
		},
		DELAI_CONVEX
	);
});
