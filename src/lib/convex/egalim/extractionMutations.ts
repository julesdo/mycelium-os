import { v } from 'convex/values';
import { internalMutation, internalQuery } from '../_generated/server';

/**
 * Les écritures en base de l'orchestration d'extraction (`extraction.ts`).
 * Séparées dans leur propre fichier, sans `"use node";`, parce qu'une action
 * "use node" ne peut pas exporter de query ni de mutation dans le même
 * fichier — et `ctx.db` n'est de toute façon accessible que depuis ici.
 */

const vLigneAEnregistrer = v.object({
	rawLabel: v.string(),
	amountHT: v.number(),
	quantity: v.optional(v.number()),
	unit: v.optional(v.string()),
	unitPrice: v.optional(v.number()),
	vatRate: v.optional(v.number())
});

const vBaseTaux = v.object({ taux: v.number(), baseHT: v.number() });

/**
 * Normalisation minimale et provisoire : espaces et casse seulement. La
 * normalisation robuste aux erreurs OCR (0/O, !/I, 3/E, nombres scindés...)
 * est la tâche P1-T7 — ne pas la préempter ici.
 */
function normaliserBasique(rawLabel: string): string {
	return rawLabel.trim().replace(/\s+/g, ' ').toUpperCase();
}

export const obtenirDocument = internalQuery({
	args: { documentId: v.id('invoiceDocuments') },
	handler: async (ctx, { documentId }) => ctx.db.get(documentId)
});

export const obtenirJob = internalQuery({
	args: { jobId: v.id('classificationJobs') },
	handler: async (ctx, { jobId }) => ctx.db.get(jobId)
});

/**
 * Le job de coût est partagé entre l'extraction et la classification d'un
 * même lot (voir le commentaire sur la table `classificationJobs`). On
 * réutilise la ligne existante si elle existe déjà, sinon on la crée à zéro —
 * l'insertion transactionnelle de Convex évite la double création en cas
 * d'appel concurrent depuis deux documents du même lot.
 */
export const obtenirOuCreerJob = internalMutation({
	args: {
		organizationId: v.id('organizations'),
		batchId: v.id('invoiceBatches')
	},
	handler: async (ctx, { organizationId, batchId }) => {
		const existant = await ctx.db
			.query('classificationJobs')
			.withIndex('by_batch', (q) => q.eq('batchId', batchId))
			.first();
		if (existant) return existant;

		const jobId = await ctx.db.insert('classificationJobs', {
			organizationId,
			batchId,
			status: 'RUNNING',
			labelsTotal: 0,
			labelsDone: 0,
			labelsFailed: 0,
			tokensIn: 0,
			tokensOut: 0,
			cacheReadTokens: 0,
			costEur: 0,
			startedAt: Date.now()
		});
		const job = await ctx.db.get(jobId);
		if (!job) throw new Error('classificationJobs introuvable juste après sa création.');
		return job;
	}
});

/**
 * Accumule l'usage d'un appel Claude sur le job du lot et bascule son statut
 * à `CAPPED` dès que le coût cumulé atteint le plafond. Renvoie si le
 * plafond est atteint, pour que l'appelant arrête d'appeler Claude.
 */
export const accumulerCout = internalMutation({
	args: {
		jobId: v.id('classificationJobs'),
		tokensIn: v.number(),
		tokensOut: v.number(),
		cacheReadTokens: v.number(),
		coutEur: v.number(),
		capEur: v.number()
	},
	returns: v.boolean(),
	handler: async (ctx, { jobId, tokensIn, tokensOut, cacheReadTokens, coutEur, capEur }) => {
		const job = await ctx.db.get(jobId);
		if (!job) throw new Error('classificationJobs introuvable.');

		const nouveauCout = job.costEur + coutEur;
		const capAtteint = nouveauCout >= capEur;

		await ctx.db.patch(jobId, {
			tokensIn: job.tokensIn + tokensIn,
			tokensOut: job.tokensOut + tokensOut,
			cacheReadTokens: job.cacheReadTokens + cacheReadTokens,
			costEur: nouveauCout,
			status: capAtteint ? 'CAPPED' : job.status
		});

		return capAtteint;
	}
});

export const marquerReussite = internalMutation({
	args: {
		documentId: v.id('invoiceDocuments'),
		organizationId: v.id('organizations'),
		batchId: v.id('invoiceBatches'),
		lignes: v.array(vLigneAEnregistrer),
		totalHT: v.union(v.number(), v.null()),
		basesParTaux: v.array(vBaseTaux),
		invoiceDate: v.union(v.string(), v.null()),
		invoiceNumber: v.union(v.string(), v.null())
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const document = await ctx.db.get(args.documentId);
		if (!document) return null;

		const dateFacture = args.invoiceDate ?? document.invoiceDate ?? '';

		for (const ligne of args.lignes) {
			await ctx.db.insert('invoiceLines', {
				organizationId: args.organizationId,
				batchId: args.batchId,
				documentId: args.documentId,
				rawLabel: ligne.rawLabel,
				normalizedLabel: normaliserBasique(ligne.rawLabel),
				quantity: ligne.quantity,
				unit: ligne.unit,
				unitPrice: ligne.unitPrice,
				amountHT: ligne.amountHT,
				vatRate: ligne.vatRate,
				invoiceDate: dateFacture,
				// Pas de champs de classification ici : c'est la tâche P1-T7.
				reviewStatus: 'AUTO'
			});
		}

		await ctx.db.patch(args.documentId, {
			extractionStatus: 'DONE',
			extractionError: undefined,
			totalHT: args.totalHT ?? undefined,
			basesParTaux: args.basesParTaux,
			invoiceDate: args.invoiceDate ?? document.invoiceDate,
			invoiceNumber: args.invoiceNumber ?? document.invoiceNumber,
			linesCount: args.lignes.length
		});
	}
});

export const marquerEchec = internalMutation({
	args: {
		documentId: v.id('invoiceDocuments'),
		erreur: v.string()
	},
	handler: async (ctx, { documentId, erreur }) => {
		const document = await ctx.db.get(documentId);
		if (!document) return;
		await ctx.db.patch(documentId, {
			extractionStatus: 'FAILED',
			extractionError: erreur
		});
	}
});
