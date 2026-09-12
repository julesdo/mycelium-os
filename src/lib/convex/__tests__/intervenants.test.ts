/// <reference types="vite/client" />
import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../schema';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';

// ⚠️ ADAPTÉ : `convexTest(schema)` seul échoue sur toute la suite de ce dépôt
// (`(intermediate value).glob is not a function`) — chaque fichier voisin
// (`apresProcedure.test.ts`, `battementRecouvrement.test.ts`, ...) construit ce
// glob de modules et le passe en second argument. Vérifié en lançant le test
// tel quel avant d'ajouter cette ligne.
const modules = Object.fromEntries(
	Object.entries(import.meta.glob('../**/*.ts')).map(([chemin, charger]) => [
		'.' + chemin.slice(2),
		charger
	])
);

// ⚠️ ADAPTÉ : la table `organizations` n'a pas de champ `slug` (voir
// `src/lib/convex/schema.ts`) et exige `createdAt`. Patron copié de
// `src/lib/convex/__tests__/rgpd.test.ts` (`poserEtablissement`).
async function unEtablissement(t: ReturnType<typeof convexTest>): Promise<Id<'organizations'>> {
	return await t.run(async (ctx) =>
		ctx.db.insert('organizations', { name: 'Ets de test', createdAt: Date.now() })
	);
}

// ⚠️ ADAPTÉ : le premier test à monter `convex-test` dans ce fichier dépasse le
// délai par défaut de vitest (5000ms) — coût de démarrage à froid, pas un
// blocage réel : les tests suivants passent en quelques millisecondes. Même
// constante et même patron que `apresProcedure.test.ts` et
// `battementRecouvrement.test.ts`, faute de `testTimeout` global.
const DELAI_CONVEX = 30_000;

describe('le carnet d’intervenants', () => {
	it(
		'retient une fiche saisie à la main, et la rend',
		async () => {
			const t = convexTest(schema, modules);
			const organizationId = await unEtablissement(t);

			await t.mutation(internal.recouvrement.intervenants.ajouterInterne, {
				organizationId,
				nom: 'Étude Sellier',
				role: 'COMMISSAIRE_DE_JUSTICE',
				ressort: 'Rennes',
				origine: 'SAISI_A_LA_MAIN'
			});

			const carnet = await t.query(internal.recouvrement.intervenants.listerInterne, {
				organizationId
			});
			expect(carnet).toHaveLength(1);
			expect(carnet[0]!.nom).toBe('Étude Sellier');
			expect(carnet[0]!.role).toBe('COMMISSAIRE_DE_JUSTICE');
		},
		DELAI_CONVEX
	);

	/**
	 * La traçabilité n'est pas facultative. Une fiche venue d'un répertoire
	 * public sans sa source ni sa date devient indiscernable d'une donnée
	 * officielle et fraîche, alors que les deux fichiers sont des photographies
	 * datées.
	 */
	it(
		'refuse une fiche venue d’un répertoire sans sa source ni sa date',
		async () => {
			const t = convexTest(schema, modules);
			const organizationId = await unEtablissement(t);

			await expect(
				t.mutation(internal.recouvrement.intervenants.ajouterInterne, {
					organizationId,
					nom: 'Me Dubreuil',
					role: 'AVOCAT',
					origine: 'RETENU_DEPUIS_UN_REPERTOIRE'
				})
			).rejects.toThrow(/source/i);
		},
		DELAI_CONVEX
	);

	it(
		'cloisonne : le carnet d’un établissement ignore celui d’un autre',
		async () => {
			const t = convexTest(schema, modules);
			const mien = await unEtablissement(t);
			const autre = await t.run(async (ctx) =>
				ctx.db.insert('organizations', { name: 'Autre', createdAt: Date.now() })
			);

			await t.mutation(internal.recouvrement.intervenants.ajouterInterne, {
				organizationId: autre,
				nom: 'Me Voisin',
				role: 'AVOCAT',
				origine: 'SAISI_A_LA_MAIN'
			});

			const carnet = await t.query(internal.recouvrement.intervenants.listerInterne, {
				organizationId: mien
			});
			expect(carnet).toHaveLength(0);
		},
		DELAI_CONVEX
	);
});
