/// <reference types="vite/client" />
import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../schema';
import { internal } from '../_generated/api';

/**
 * LE BATTEMENT — la plomberie, et ce qu'elle doit garantir.
 *
 * Trois propriétés se vérifient ici et nulle part ailleurs, parce qu'elles
 * naissent de l'interaction avec la base et pas de la règle :
 *
 * 1. ON NE REJOUE PAS. Deux exécutions le même jour laissent un seul relevé.
 * 2. L'ÉCHEC LAISSE UNE TRACE. Un battement qui plante s'enregistre en `ECHEC`,
 *    pour que l'interface du client puisse le dire.
 * 3. LE SILENCE S'ENREGISTRE AUSSI. Se taire est un résultat : sans relevé, le
 *    lendemain croirait que rien n'a tourné et parlerait pour rien.
 */
const modules = Object.fromEntries(
	Object.entries(import.meta.glob('../**/*.ts')).map(([chemin, charger]) => [
		'.' + chemin.slice(2),
		charger
	])
);

const DELAI_CONVEX = 30_000;

async function organisation(t: ReturnType<typeof convexTest>) {
	return t.run(async (ctx) =>
		ctx.db.insert('organizations', { name: 'Ateliers Martin', createdAt: Date.now() })
	);
}

describe('executerPourOrganisation', () => {
	it(
		'enregistre un relevé même quand il n’y a rien à dire',
		async () => {
			const t = convexTest(schema, modules);
			const organizationId = await organisation(t);

			await t.mutation(internal.recouvrement.battement.executerPourOrganisation, {
				organizationId,
				jour: '2026-09-03'
			});

			const releves = await t.run(async (ctx) => ctx.db.query('battements').collect());
			expect(releves).toHaveLength(1);
			expect(releves[0]!.jour).toBe('2026-09-03');
		},
		DELAI_CONVEX
	);

	it(
		'refuse de rejouer le même jour',
		async () => {
			const t = convexTest(schema, modules);
			const organizationId = await organisation(t);

			await t.mutation(internal.recouvrement.battement.executerPourOrganisation, {
				organizationId,
				jour: '2026-09-03'
			});
			await t.mutation(internal.recouvrement.battement.executerPourOrganisation, {
				organizationId,
				jour: '2026-09-03'
			});

			const releves = await t.run(async (ctx) => ctx.db.query('battements').collect());
			expect(releves).toHaveLength(1);
		},
		DELAI_CONVEX
	);

	it(
		'se tait le lendemain quand rien n’a bougé, et l’enregistre',
		async () => {
			const t = convexTest(schema, modules);
			const organizationId = await organisation(t);

			await t.mutation(internal.recouvrement.battement.executerPourOrganisation, {
				organizationId,
				jour: '2026-09-03'
			});
			await t.mutation(internal.recouvrement.battement.executerPourOrganisation, {
				organizationId,
				jour: '2026-09-04'
			});

			const releve = await t.run(async (ctx) =>
				ctx.db
					.query('battements')
					.withIndex('by_org_and_jour', (q) =>
						q.eq('organizationId', organizationId).eq('jour', '2026-09-04')
					)
					.unique()
			);
			expect(releve?.statut).toBe('TU');
		},
		DELAI_CONVEX
	);

	it(
		'cloisonne par organisation',
		async () => {
			// Le multi-tenant est strict, sans exception. Le battement d'une
			// organisation ne doit rien lire ni écrire chez une autre.
			const t = convexTest(schema, modules);
			const premiere = await organisation(t);
			const seconde = await organisation(t);

			await t.mutation(internal.recouvrement.battement.executerPourOrganisation, {
				organizationId: premiere,
				jour: '2026-09-03'
			});

			const chezLaSeconde = await t.run(async (ctx) =>
				ctx.db
					.query('battements')
					.withIndex('by_org', (q) => q.eq('organizationId', seconde))
					.collect()
			);
			expect(chezLaSeconde).toEqual([]);
		},
		DELAI_CONVEX
	);
});
