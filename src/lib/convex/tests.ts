import { components } from './_generated/api';
import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

/**
 * Fonctions réservées au harnais e2e.
 *
 * Ce module avait été supprimé par le tri de la phase 0 en même temps que les
 * tables du métier flotte auxquelles il touchait, ce qui a laissé toute la
 * suite Playwright inopérante : `global-setup.ts` sonde `api.tests.health`
 * avant chaque exécution et échouait au bout de 90 s sans que personne ne le
 * voie, faute d'avoir relancé la suite depuis le pivot.
 *
 * Il est ici reconstruit au strict nécessaire, sur le schéma EGalim : seules
 * les six fonctions que `e2e/global-setup.ts` et `e2e/global-teardown.ts`
 * appellent réellement. Tout ce qui touchait aux fils de support, aux
 * préférences de notification et aux compteurs du tableau de bord a disparu
 * avec les tables correspondantes.
 *
 * Chaque fonction exige `AUTH_E2E_TEST_SECRET`, qui n'est renseigné que sur
 * les déploiements de test.
 */

function requireTestSecret(secret: string): void {
	const expected = process.env.AUTH_E2E_TEST_SECRET;
	if (!expected || secret !== expected) {
		throw new Error('Unauthorized: Invalid test secret');
	}
}

/**
 * Sonde de disponibilité. Le plugin convex-vite démarre le déploiement du
 * backend de façon asynchrone après que vite commence à servir : le contrôle
 * de port de Playwright réussit donc bien avant que Convex soit joignable.
 *
 * Elle est volontairement gardée par le secret, ce qui en fait aussi un
 * contrôle de propagation : si le secret n'a pas atteint le backend, la sonde
 * renvoie Unauthorized et le setup échoue tout de suite avec un message clair
 * plutôt qu'au premier appel de signup.
 */
export const health = query({
	args: { secret: v.string() },
	returns: v.object({ ok: v.boolean() }),
	handler: async (_ctx, { secret }) => {
		requireTestSecret(secret);
		return { ok: true };
	}
});

/** Marque l'adresse d'un compte de test comme vérifiée, sans passer par l'email. */
export const verifyTestUserEmail = mutation({
	args: { email: v.string(), secret: v.string() },
	returns: v.object({ success: v.boolean(), error: v.optional(v.string()) }),
	handler: async (ctx, { email, secret }) => {
		requireTestSecret(secret);

		const user = await ctx.runQuery(components.betterAuth.adapter.findOne, {
			model: 'user',
			where: [{ field: 'email', value: email }]
		});
		if (!user) return { success: false, error: 'User not found' };

		await ctx.runMutation(components.betterAuth.adapter.updateOne, {
			input: {
				model: 'user',
				where: [{ field: 'email', value: email }],
				update: { emailVerified: true }
			}
		});
		return { success: true };
	}
});

/** Promeut un compte de test au rôle staff Letikette et vérifie son adresse. */
export const createTestAdminUser = mutation({
	args: { email: v.string(), secret: v.string() },
	returns: v.object({ success: v.boolean(), error: v.optional(v.string()) }),
	handler: async (ctx, { email, secret }) => {
		requireTestSecret(secret);

		const user = await ctx.runQuery(components.betterAuth.adapter.findOne, {
			model: 'user',
			where: [{ field: 'email', value: email }]
		});
		if (!user) return { success: false, error: 'User not found. Sign up the user first.' };

		await ctx.runMutation(components.betterAuth.adapter.updateOne, {
			input: {
				model: 'user',
				where: [{ field: 'email', value: email }],
				update: { role: 'admin', emailVerified: true }
			}
		});
		return { success: true };
	}
});

/**
 * Supprime un compte de test et tout ce qui s'y rattache côté auth. Les
 * boucles sont bornées par la pagination de l'adaptateur, jamais par une
 * hypothèse sur le nombre de sessions.
 */
export const deleteTestUser = mutation({
	args: { email: v.string(), secret: v.string() },
	returns: v.object({
		success: v.boolean(),
		error: v.optional(v.string()),
		accountsDeleted: v.optional(v.number()),
		sessionsDeleted: v.optional(v.number())
	}),
	handler: async (ctx, { email, secret }) => {
		requireTestSecret(secret);

		const user = await ctx.runQuery(components.betterAuth.adapter.findOne, {
			model: 'user',
			where: [{ field: 'email', value: email }]
		});
		if (!user) return { success: false, error: 'User not found' };

		let accountsDeleted = 0;
		let sessionsDeleted = 0;

		for (const model of ['account', 'session'] as const) {
			let encore = true;
			while (encore) {
				const resultat = await ctx.runMutation(components.betterAuth.adapter.deleteMany, {
					input: { model, where: [{ field: 'userId', value: user._id }] },
					paginationOpts: { numItems: 100, cursor: null }
				});
				const supprimes = resultat?.deletedCount ?? 0;
				if (model === 'account') accountsDeleted += supprimes;
				else sessionsDeleted += supprimes;
				encore = supprimes >= 100;
			}
		}

		await ctx.runMutation(components.betterAuth.adapter.deleteOne, {
			input: { model: 'user', where: [{ field: 'email', value: email }] }
		});

		return { success: true, accountsDeleted, sessionsDeleted };
	}
});

/**
 * Purge les artefacts EGalim laissés par une exécution : lots, documents,
 * lignes, diagnostics et demandes d'attestation des organisations de test.
 *
 * `productLabels` est délibérément ÉPARGNÉE. C'est le cache global de
 * classification, sans lien vers aucune organisation : ce qu'une exécution y
 * dépose est du référentiel produit, pas de la donnée de test, et le vider
 * ferait repayer les mêmes classifications à chaque passage.
 */
export const cleanupTestData = mutation({
	args: { secret: v.string() },
	returns: v.object({ success: v.boolean(), supprimes: v.number() }),
	handler: async (ctx, { secret }) => {
		requireTestSecret(secret);

		const organisations = await ctx.db.query('organizations').collect();
		const orgsDeTest = organisations.filter((o) => /^OrgOf-/.test(o.name));

		let supprimes = 0;
		for (const org of orgsDeTest) {
			const lots = await ctx.db
				.query('invoiceBatches')
				.withIndex('by_org', (q) => q.eq('organizationId', org._id))
				.collect();

			for (const lot of lots) {
				for (const table of ['invoiceLines', 'invoiceDocuments'] as const) {
					const docs = await ctx.db
						.query(table)
						.withIndex('by_batch', (q) => q.eq('batchId', lot._id))
						.collect();
					for (const d of docs) {
						await ctx.db.delete(d._id);
						supprimes++;
					}
				}

				const diagnostics = await ctx.db
					.query('diagnostics')
					.withIndex('by_batch', (q) => q.eq('batchId', lot._id))
					.collect();
				for (const d of diagnostics) {
					const demandes = await ctx.db
						.query('attestationRequests')
						.withIndex('by_diagnostic', (q) => q.eq('diagnosticId', d._id))
						.collect();
					for (const demande of demandes) {
						await ctx.db.delete(demande._id);
						supprimes++;
					}
					await ctx.db.delete(d._id);
					supprimes++;
				}

				const jobs = await ctx.db
					.query('classificationJobs')
					.withIndex('by_batch', (q) => q.eq('batchId', lot._id))
					.collect();
				for (const j of jobs) {
					await ctx.db.delete(j._id);
					supprimes++;
				}

				await ctx.db.delete(lot._id);
				supprimes++;
			}
		}

		return { success: true, supprimes };
	}
});

/**
 * Conservée parce que `e2e/global-teardown.ts` l'appelle encore. Les fils de
 * support anonymes ont disparu avec le pivot : il n'y a plus rien à purger,
 * et le teardown ne doit pas échouer pour autant.
 */
export const cleanupAnonymousSupportThreads = mutation({
	args: { secret: v.string(), threadIds: v.array(v.string()) },
	returns: v.object({ success: v.boolean(), deletedSupportThreads: v.number() }),
	handler: async (_ctx, { secret }) => {
		requireTestSecret(secret);
		return { success: true, deletedSupportThreads: 0 };
	}
});
