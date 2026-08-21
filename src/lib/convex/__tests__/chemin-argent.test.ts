/// <reference types="vite/client" />
import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../schema';
import { internal } from '../_generated/api';
import { recompterLot } from '../egalim/lot';
import type { Id } from '../_generated/dataModel';

/**
 * LE CHEMIN QUI RAPPORTE : déposer, classer, confirmer, éditer le bilan.
 *
 * POURQUOI CE FICHIER EXISTE. Trois bugs sont sortis le même matin, tous sur ce
 * chemin, tous invisibles au type et au lint, et tous découverts par le gérant
 * plutôt que par nous :
 *
 *   1. `labelsPendingReview` était écrit une fois puis jamais décrémenté :
 *      l'écran annonçait « 3 produits attendent » devant une file vide.
 *   2. Le lot restait donc en `REVIEW`, et `produireDiagnostic` refuse de figer
 *      une mesure tant qu'il reste un arbitrage — un gérant qui avait TOUT
 *      confirmé ne pouvait jamais obtenir la seule chose qu'il achète.
 *   3. `produireSiPret` portait un commentaire disant qu'elle devait être
 *      appelée après chaque arbitrage. Elle ne l'était nulle part.
 *
 * Les trois sont des bugs de MACHINE À ÉTATS : rien de faux dans une fonction
 * prise isolément, tout faux dans leur enchaînement. C'est exactement ce
 * qu'aucun test unitaire n'attrape et ce que celui-ci attrape.
 *
 * CE QU'IL NE TESTE PAS, et pourquoi. Les mutations authentifiées passent par
 * le composant Better Auth, qui apporte ses propres tables : le monter ici
 * coûterait plus que ce que ça rapporte. On teste donc les mutations INTERNES
 * et les fonctions de domaine — celles où les trois bugs vivaient réellement.
 */

/**
 * Les modules Convex, avec des chemins recalés sur la racine Convex.
 *
 * `convex-test` résout `internal.egalim.diagnostics` en cherchant la clé
 * `./egalim/diagnostics.ts`. Le glob de Vite, lui, rend des chemins relatifs à
 * CE fichier — `../egalim/diagnostics.ts`. Le décalage d'un cran fait échouer
 * toute résolution, avec pour seul message « Could not find module », qui
 * n'oriente vers rien.
 *
 * Le glob ne peut pas vivre à la racine Convex : `import.meta.glob` est une
 * facilité de Vite, et le bundler de Convex ne la comprend pas — un fichier qui
 * l'emploierait ferait échouer `convex deploy`. On recale donc ici.
 */
const modules = Object.fromEntries(
	Object.entries(import.meta.glob('../**/*.ts')).map(([chemin, charger]) => [
		'.' + chemin.slice(2),
		charger
	])
);

/** Un lot d'exercice, ses documents et ses lignes, posés directement en base. */
async function poser(
	t: ReturnType<typeof convexTest>,
	options: { labelsEnAttente: string[]; labelsConfirmes?: string[]; statut?: 'REVIEW' | 'READY' }
) {
	return await t.run(async (ctx) => {
		const organizationId = await ctx.db.insert('organizations', {
			name: 'Votre cantine',
			siret: '12345678900012',
			createdAt: Date.now()
		});

		const batchId = await ctx.db.insert('invoiceBatches', {
			organizationId,
			label: 'Exercice 2026',
			periodStart: '2026-01-01',
			periodEnd: '2026-12-31',
			status: options.statut ?? 'REVIEW',
			uploadedBy: 'utilisateur-test',
			documentsTotal: 1,
			linesTotal: 0,
			// Volontairement FAUX au départ : c'est l'état dans lequel les lots
			// créés avant le correctif se trouvent encore, et le test doit prouver
			// qu'on s'en remet.
			labelsPendingReview: 99,
			createdAt: Date.now()
		});

		// Un vrai identifiant de stockage : le harnais valide les références comme
		// le ferait la production, et une chaîne inventée est refusée. C'est une
		// bonne nouvelle — un test qui accepte des données impossibles ne prouve
		// rien sur des données réelles.
		const storageId = await ctx.storage.store(new Blob([String.fromCharCode(65)]));

		const documentId = await ctx.db.insert('invoiceDocuments', {
			organizationId,
			batchId,
			storageId,
			filename: 'export-2026.csv',
			mimeType: 'text/csv',
			sourceType: 'CSV',
			extractionStatus: 'DONE',
			invoiceDate: '2026-03-18',
			totalHT: 1000,
			linesCount: 0
		});

		const ligne = (normalizedLabel: string, reviewStatus: 'PENDING_REVIEW' | 'CONFIRMED') =>
			ctx.db.insert('invoiceLines', {
				organizationId,
				batchId,
				documentId,
				rawLabel: normalizedLabel,
				normalizedLabel,
				amountHT: 100,
				invoiceDate: '2026-03-18',
				isFood: true,
				family: 'FRUITS_LEGUMES' as const,
				qualifyingLabels: [],
				isBio: false,
				isDurable: false,
				reviewStatus,
				classifierVersion: '2026-08'
			});

		for (const l of options.labelsEnAttente) await ligne(l, 'PENDING_REVIEW');
		for (const l of options.labelsConfirmes ?? []) await ligne(l, 'CONFIRMED');

		return { organizationId, batchId, documentId };
	});
}

/** Fait passer toutes les lignes d'un libellé en confirmé, comme le fait un arbitrage. */
async function confirmer(t: ReturnType<typeof convexTest>, batchId: Id<'invoiceBatches'>, label: string) {
	await t.run(async (ctx) => {
		// Sans index : le contexte rendu par `t.run` n'est pas paramétré par notre
		// schéma, et les index n'y sont pas typés. Sur un jeu de test de quelques
		// lignes, un filtre en mémoire dit la même chose sans assertion de type —
		// et une assertion de type dans un test de régression éteindrait
		// précisément la vérification qu'on est venu chercher.
		const toutes = await ctx.db.query('invoiceLines').collect();
		const lignes = toutes.filter(
			(l) => l.batchId === batchId && l.normalizedLabel === label
		);
		for (const l of lignes) await ctx.db.patch(l._id, { reviewStatus: 'CONFIRMED' });
	});
}

const lire = (t: ReturnType<typeof convexTest>, batchId: Id<'invoiceBatches'>) =>
	t.run(async (ctx) => ctx.db.get(batchId));

describe('le compteur d’arbitrage se recompte, il ne se mémorise pas de travers', () => {
	it('un lot dont le compteur est faux se remet d’aplomb à la première relecture', async () => {
		const t = convexTest(schema, modules);
		const { batchId } = await poser(t, { labelsEnAttente: ['CAROTTE', 'POMME', 'BOEUF'] });

		// Le lot porte 99 en base — la valeur héritée d'avant le correctif.
		expect((await lire(t, batchId))?.labelsPendingReview).toBe(99);

		const etat = await t.run(async (ctx) => recompterLot(ctx, batchId));

		expect(etat).toEqual({ restants: 3, status: 'REVIEW' });
		expect((await lire(t, batchId))?.labelsPendingReview).toBe(3);
	});

	it('il compte des LIBELLÉS distincts, pas des lignes de facture', async () => {
		const t = convexTest(schema, modules);
		// Le même produit sur trois lignes reste UN produit à confirmer. Compter
		// les lignes annoncerait au gérant trois fois le travail réel.
		const { batchId } = await poser(t, { labelsEnAttente: ['CAROTTE', 'CAROTTE', 'CAROTTE'] });

		const etat = await t.run(async (ctx) => recompterLot(ctx, batchId));
		expect(etat?.restants).toBe(1);
	});

	it('le dernier arbitrage fait passer le lot en PRÊT', async () => {
		const t = convexTest(schema, modules);
		const { batchId } = await poser(t, { labelsEnAttente: ['CAROTTE', 'POMME'] });

		await confirmer(t, batchId, 'CAROTTE');
		expect(await t.run(async (ctx) => recompterLot(ctx, batchId))).toEqual({
			restants: 1,
			status: 'REVIEW'
		});

		await confirmer(t, batchId, 'POMME');
		expect(await t.run(async (ctx) => recompterLot(ctx, batchId))).toEqual({
			restants: 0,
			status: 'READY'
		});

		// C'EST LE BUG QUI TUAIT LA CHAÎNE. Sans ce passage en READY, le gérant
		// avait tout confirmé et ne pouvait plus jamais éditer son bilan.
		expect((await lire(t, batchId))?.status).toBe('READY');
	});

	it('un lot encore en classification n’est pas déclaré prêt', async () => {
		const t = convexTest(schema, modules);
		// Sa file est vide parce que la classification n'a rien produit ENCORE.
		// La lire comme « prêt » annoncerait un bilan disponible au milieu du
		// traitement, sur une mesure incomplète.
		const { batchId } = await poser(t, { labelsEnAttente: [], statut: 'READY' });
		await t.run(async (ctx) => ctx.db.patch(batchId, { status: 'CLASSIFYING' }));

		expect(await t.run(async (ctx) => recompterLot(ctx, batchId))).toBeNull();
		expect((await lire(t, batchId))?.status).toBe('CLASSIFYING');
	});
});

describe('le bilan se produit tout seul quand le dernier produit tombe', () => {
	/** Un job de classification terminé : `produireSiPret` l'exige. */
	async function jobTermine(t: ReturnType<typeof convexTest>, ids: {
		organizationId: Id<'organizations'>;
		batchId: Id<'invoiceBatches'>;
	}) {
		await t.run(async (ctx) => {
			await ctx.db.insert('classificationJobs', {
				organizationId: ids.organizationId,
				batchId: ids.batchId,
				status: 'DONE',
				labelsTotal: 2,
				labelsDone: 2,
				labelsFailed: 0,
				tokensIn: 0,
				tokensOut: 0,
				cacheReadTokens: 0,
				costEur: 0,
				startedAt: Date.now(),
				finishedAt: Date.now()
			});
		});
	}

	it('produit le bilan une fois la file vide', async () => {
		const t = convexTest(schema, modules);
		const ids = await poser(t, { labelsEnAttente: [], labelsConfirmes: ['CAROTTE'], statut: 'READY' });
		await jobTermine(t, ids);

		const diagnosticId = await t.mutation(internal.egalim.diagnostics.produireSiPret, {
			batchId: ids.batchId
		});

		expect(diagnosticId).not.toBeNull();
		// 30 s : c est le seul test qui PRODUIT vraiment un bilan — lecture de
		// toutes les lignes, agregation, creation des demandes d attestation. Les
		// autres sortent tot et tiennent largement dans le delai par defaut.
	}, 30_000);

	it('ne produit RIEN tant qu’un produit attend', async () => {
		const t = convexTest(schema, modules);
		const ids = await poser(t, { labelsEnAttente: ['POMME'], labelsConfirmes: ['CAROTTE'] });
		await jobTermine(t, ids);

		expect(
			await t.mutation(internal.egalim.diagnostics.produireSiPret, { batchId: ids.batchId })
		).toBeNull();
	});

	it('appelée deux fois, elle ne produit pas deux bilans', async () => {
		const t = convexTest(schema, modules);
		const ids = await poser(t, { labelsEnAttente: [], labelsConfirmes: ['CAROTTE'], statut: 'READY' });
		await jobTermine(t, ids);

		const premier = await t.mutation(internal.egalim.diagnostics.produireSiPret, {
			batchId: ids.batchId
		});
		const second = await t.mutation(internal.egalim.diagnostics.produireSiPret, {
			batchId: ids.batchId
		});

		// L'arbitrage la planifie à chaque décision : sans cette idempotence, un
		// gérant qui confirme trente produits d'affilée obtiendrait trente bilans.
		expect(second).toBe(premier);
		const combien = await t.run(async (ctx) =>
			(await ctx.db.query('diagnostics').collect()).length
		);
		expect(combien).toBe(1);
	});

	it('ne produit rien tant que la classification n’est pas allée à son terme', async () => {
		const t = convexTest(schema, modules);
		const ids = await poser(t, { labelsEnAttente: [], labelsConfirmes: ['CAROTTE'], statut: 'READY' });
		// Un job SANS `finishedAt` : la file est vide parce que les tranches
		// suivantes n'ont pas encore été traitées, pas parce que tout est fait.
		await t.run(async (ctx) => {
			await ctx.db.insert('classificationJobs', {
				organizationId: ids.organizationId,
				batchId: ids.batchId,
				status: 'RUNNING',
				labelsTotal: 400,
				labelsDone: 12,
				labelsFailed: 0,
				tokensIn: 0,
				tokensOut: 0,
				cacheReadTokens: 0,
				costEur: 0,
				startedAt: Date.now()
			});
		});

		expect(
			await t.mutation(internal.egalim.diagnostics.produireSiPret, { batchId: ids.batchId })
		).toBeNull();
	});
});
