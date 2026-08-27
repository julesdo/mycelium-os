/// <reference types="vite/client" />
import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../schema';
import { internal } from '../_generated/api';
import { requireOrgAdmin, requireOrgMember } from '../lib/auth';

/**
 * L'EFFACEMENT, ET LA BARRIÈRE DES RÔLES.
 *
 * Deux choses sont testées ici, et une seule d'entre elles est visible à
 * l'écran.
 *
 * 1. LA PURGE VIDE VRAIMENT, ET DANS LE BON ORDRE. Une suppression partielle est
 *    le pire des résultats : elle rend le manquement au règlement invisible —
 *    l'établissement a disparu de l'interface, donc tout a l'air fait — pendant
 *    que les lignes de facture restent en base. On vérifie table par table.
 *
 * 2. LE RÔLE EST UNE BARRIÈRE, PAS UNE ÉTIQUETTE. `requireOrgAdmin` n'était
 *    appelé nulle part ; il l'est maintenant depuis toutes les fonctions
 *    d'administration. Ces tests le tiennent en échec délibérément, parce qu'un
 *    contrôle qu'on n'a jamais vu refuser est un contrôle dont on ignore s'il
 *    fonctionne.
 *
 * Comme dans `cheminArgent.test.ts`, on teste les mutations INTERNES et les
 * fonctions de domaine : monter le composant Better Auth pour les mutations
 * authentifiées coûterait plus cher que ce que ça rapporterait.
 */
const modules = Object.fromEntries(
	Object.entries(import.meta.glob('../**/*.ts')).map(([chemin, charger]) => [
		'.' + chemin.slice(2),
		charger
	])
);

/** Un établissement peuplé : trois lignes, un document, un dépôt, un bilan, un fournisseur. */
async function poserEtablissement(t: ReturnType<typeof convexTest>) {
	return await t.run(async (ctx) => {
		const organizationId = await ctx.db.insert('organizations', {
			name: 'Clinique des Ormes',
			createdAt: Date.now()
		});

		const batchId = await ctx.db.insert('invoiceBatches', {
			organizationId,
			label: 'Exercice 2026',
			periodStart: '2026-01-01',
			periodEnd: '2026-12-31',
			status: 'READY',
			uploadedBy: 'user_admin',
			documentsTotal: 1,
			linesTotal: 3,
			labelsPendingReview: 0,
			createdAt: Date.now()
		});

		const storageId = await ctx.storage.store(new Blob([String.fromCharCode(65)]));
		const documentId = await ctx.db.insert('invoiceDocuments', {
			organizationId,
			batchId,
			storageId,
			filename: 'facture-001.pdf',
			mimeType: 'application/pdf',
			sourceType: 'PDF_TEXT',
			extractionStatus: 'DONE',
			linesCount: 3
		});

		for (const libelle of ['TOMATE GRAPPE BIO', 'FILET CABILLAUD MSC', 'HUILE TOURNESOL']) {
			await ctx.db.insert('invoiceLines', {
				organizationId,
				batchId,
				documentId,
				rawLabel: libelle,
				normalizedLabel: libelle,
				amountHT: 100,
				invoiceDate: '2026-03-01',
				reviewStatus: 'AUTO'
			});
		}

		await ctx.db.insert('suppliers', {
			organizationId,
			name: 'Metro',
			rawNames: ['METRO CASH'],
			type: 'GROSSISTE',
			attestationStatus: 'NONE'
		});

		await ctx.db.insert('classificationJobs', {
			organizationId,
			batchId,
			status: 'DONE',
			labelsTotal: 3,
			labelsDone: 3,
			labelsFailed: 0,
			tokensIn: 10,
			tokensOut: 10,
			cacheReadTokens: 0,
			costEur: 0.01,
			startedAt: Date.now()
		});

		await ctx.db.insert('diagnostics', {
			organizationId,
			batchId,
			periodStart: '2026-01-01',
			periodEnd: '2026-12-31',
			computedAt: Date.now(),
			classifierVersion: 'test',
			ratios: { durable: 0.39, bio: 0.21, meatFishDurable: 0.42, totalFoodHT: 300, totalHT: 300 },
			byFamily: [],
			bySupplier: [],
			gapEuros: { toDurable50: 33, toBio20: 0, toMeatFish60: 11 },
			status: 'DELIVERED'
		});

		await ctx.db.insert('notifications', {
			organizationId,
			userId: 'user_admin',
			type: 'DIAGNOSTIC_PRET',
			title: 'Votre bilan est prêt',
			message: 'Exercice 2026',
			isRead: false,
			createdAt: Date.now()
		});

		// Le référentiel global : il ne porte le nom d'aucune organisation et ne
		// doit JAMAIS partir avec elle.
		await ctx.db.insert('productLabels', {
			normalizedLabel: 'TOMATE GRAPPE BIO',
			isFood: true,
			family: 'FRUITS_LEGUMES',
			qualifyingLabels: ['AB'],
			justification: 'La mention AB atteste la certification biologique.',
			confidence: 0.98,
			source: 'HUMAN',
			confirmationsCount: 4,
			contested: false,
			classifierVersion: 'test',
			occurrences: 12
		});

		return { organizationId, batchId };
	});
}

describe("la purge d'un établissement", () => {
	it('vide toutes les tables cloisonnées, puis retire l’établissement', async () => {
		const t = convexTest(schema, modules);
		const { organizationId } = await poserEtablissement(t);

		await t.mutation(internal.rgpd.purgerEtablissement, { organizationId, passe: 0 });

		await t.run(async (ctx) => {
			expect(await ctx.db.get(organizationId)).toBeNull();
			for (const table of [
				'invoiceLines',
				'invoiceDocuments',
				'invoiceBatches',
				'suppliers',
				'diagnostics',
				'classificationJobs',
				'notifications'
			] as const) {
				const restant = await ctx.db.query(table).collect();
				expect(restant, `${table} devrait être vide`).toHaveLength(0);
			}
		});
	});

	it('laisse intact le référentiel global de libellés', async () => {
		// C'est la garantie que le schéma promet et que la politique de
		// confidentialité répète : `productLabels` ne contient ni montant, ni
		// fournisseur, ni organisation, ni utilisateur. Elle n'appartient à
		// personne, et l'effacer sous couvert d'effacer de la donnée client
		// ferait repayer à tous les autres une classification déjà tranchée.
		const t = convexTest(schema, modules);
		const { organizationId } = await poserEtablissement(t);

		await t.mutation(internal.rgpd.purgerEtablissement, { organizationId, passe: 0 });

		await t.run(async (ctx) => {
			const referentiel = await ctx.db.query('productLabels').collect();
			expect(referentiel).toHaveLength(1);
			// DÉSTRUCTURATION, ET NI `[0]` NI `.at(0)`. Le typecheck qu'exécute
			// `convex deploy` n'est pas celui de `bun run check:convex` : il active
			// `noUncheckedIndexedAccess`, qui refuse `referentiel[0].x`, ET il vise
			// une bibliothèque antérieure à ES2022, où `Array.prototype.at`
			// n'existe pas. Les deux se sont découvertes l'une après l'autre, sur
			// un déploiement de production échoué. La forme ci-dessous passe les
			// deux.
			const [premier] = referentiel;
			expect(premier?.normalizedLabel).toBe('TOMATE GRAPPE BIO');
		});
	});

	it('ne touche pas aux données d’un autre établissement', async () => {
		const t = convexTest(schema, modules);
		const a = await poserEtablissement(t);
		const b = await poserEtablissement(t);

		await t.mutation(internal.rgpd.purgerEtablissement, {
			organizationId: a.organizationId,
			passe: 0
		});

		await t.run(async (ctx) => {
			expect(await ctx.db.get(b.organizationId)).not.toBeNull();
			const lignes = await ctx.db
				.query('invoiceLines')
				.withIndex('by_org_and_date', (q) => q.eq('organizationId', b.organizationId))
				.collect();
			expect(lignes).toHaveLength(3);
		});
	});

	it('s’arrête sans erreur sur un établissement déjà vide', async () => {
		// La purge se replanifie : la dernière passe retombe forcément sur un
		// établissement dont il ne reste rien. Elle ne doit ni boucler ni lever.
		const t = convexTest(schema, modules);
		const { organizationId } = await poserEtablissement(t);

		await t.mutation(internal.rgpd.purgerEtablissement, { organizationId, passe: 0 });
		await expect(
			t.mutation(internal.rgpd.purgerEtablissement, { organizationId, passe: 1 })
		).resolves.toBeNull();
	});
});

describe('la barrière des rôles', () => {
	async function poserMembres(t: ReturnType<typeof convexTest>) {
		return await t.run(async (ctx) => {
			const organizationId = await ctx.db.insert('organizations', {
				name: 'Clinique des Ormes',
				createdAt: Date.now()
			});
			await ctx.db.insert('organizationMembers', {
				organizationId,
				userId: 'user_admin',
				role: 'ORG_ADMIN',
				joinedAt: Date.now()
			});
			await ctx.db.insert('organizationMembers', {
				organizationId,
				userId: 'user_membre',
				role: 'ORG_MEMBER',
				joinedAt: Date.now()
			});
			return organizationId;
		});
	}

	it('laisse passer un administrateur', async () => {
		const t = convexTest(schema, modules);
		const organizationId = await poserMembres(t);
		await t.run(async (ctx) => {
			const m = await requireOrgAdmin(ctx, organizationId, 'user_admin');
			expect(m.role).toBe('ORG_ADMIN');
		});
	});

	it('refuse un membre simple', async () => {
		const t = convexTest(schema, modules);
		const organizationId = await poserMembres(t);
		await t.run(async (ctx) => {
			await expect(requireOrgAdmin(ctx, organizationId, 'user_membre')).rejects.toThrow();
		});
	});

	it('refuse un étranger, même sur la simple appartenance', async () => {
		// C'est la barrière du cloisonnement multi-tenant, et elle compte plus que
		// celle du rôle : sans elle, connaître un identifiant d'organisation
		// suffirait à lire les factures d'un autre client.
		const t = convexTest(schema, modules);
		const organizationId = await poserMembres(t);
		await t.run(async (ctx) => {
			await expect(requireOrgMember(ctx, organizationId, 'user_inconnu')).rejects.toThrow();
			await expect(requireOrgAdmin(ctx, organizationId, 'user_inconnu')).rejects.toThrow();
		});
	});
});
