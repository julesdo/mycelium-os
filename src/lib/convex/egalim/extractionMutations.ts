import { v } from 'convex/values';
import { internalMutation, internalQuery } from '../_generated/server';
import { internal } from '../_generated/api';
import type { MutationCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';
import { normaliserLibelle, normaliserFournisseur } from './normalisation';

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
 * Les retours des queries internes sont volontairement RESTREINTS aux champs
 * que l'orchestration consomme, plutôt que de renvoyer le document entier.
 * Deux raisons : le validateur reste court et lisible, et il n'existe pas de
 * seconde description de la table qui pourrait diverger de `tables.ts`.
 * Ajouter un champ ici est un geste délibéré, pas un effet de bord.
 */
const vDocumentPourExtraction = v.object({
	_id: v.id('invoiceDocuments'),
	organizationId: v.id('organizations'),
	batchId: v.id('invoiceBatches'),
	storageId: v.id('_storage'),
	filename: v.string(),
	mimeType: v.string()
});

const vJobPourExtraction = v.object({
	_id: v.id('classificationJobs'),
	status: v.union(
		v.literal('RUNNING'),
		v.literal('DONE'),
		v.literal('FAILED'),
		v.literal('CAPPED')
	)
});

export const obtenirDocument = internalQuery({
	args: { documentId: v.id('invoiceDocuments') },
	returns: v.union(vDocumentPourExtraction, v.null()),
	handler: async (ctx, { documentId }) => {
		const document = await ctx.db.get(documentId);
		if (!document) return null;
		return {
			_id: document._id,
			organizationId: document.organizationId,
			batchId: document.batchId,
			storageId: document.storageId,
			filename: document.filename,
			mimeType: document.mimeType
		};
	}
});

export const obtenirJob = internalQuery({
	args: { jobId: v.id('classificationJobs') },
	returns: v.union(vJobPourExtraction, v.null()),
	handler: async (ctx, { jobId }) => {
		const job = await ctx.db.get(jobId);
		return job ? { _id: job._id, status: job.status } : null;
	}
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
	returns: vJobPourExtraction,
	handler: async (ctx, { organizationId, batchId }) => {
		const existant = await ctx.db
			.query('classificationJobs')
			.withIndex('by_batch', (q) => q.eq('batchId', batchId))
			.first();
		if (existant) return { _id: existant._id, status: existant.status };

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
		return { _id: job._id, status: job.status };
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

/**
 * Rattache un nom de fournisseur imprimé à une fiche `suppliers` de
 * l'organisation, en créant la fiche au besoin.
 *
 * Le rapprochement se fait sur le nom NORMALISÉ (formes juridiques retirées,
 * substitutions d'OCR appliquées) : « POMONA », « Pomona S.A. » et
 * « P0MONA SAS » désignent la même maison, et les compter séparément
 * éclaterait les courriers de demande d'attestation en trois envois au même
 * destinataire. `rawNames` garde toutes les graphies rencontrées.
 */
async function rattacherFournisseur(
	ctx: MutationCtx,
	organizationId: Id<'organizations'>,
	nomImprime: string | null
): Promise<Id<'suppliers'> | undefined> {
	if (!nomImprime || nomImprime.trim() === '') return undefined;

	const nom = normaliserFournisseur(nomImprime);
	if (nom === '') return undefined;

	const existant = await ctx.db
		.query('suppliers')
		.withIndex('by_org_and_name', (q) =>
			q.eq('organizationId', organizationId).eq('name', nom)
		)
		.first();

	if (existant) {
		if (!existant.rawNames.includes(nomImprime)) {
			await ctx.db.patch(existant._id, { rawNames: [...existant.rawNames, nomImprime] });
		}
		return existant._id;
	}

	return await ctx.db.insert('suppliers', {
		organizationId,
		name: nom,
		rawNames: [nomImprime],
		// Le type et le statut d'attestation se renseignent plus tard, à la
		// main : rien dans une facture ne dit si l'on a affaire à un grossiste
		// ou à un producteur.
		type: 'AUTRE',
		attestationStatus: 'NONE'
	});
}

export const marquerReussite = internalMutation({
	args: {
		documentId: v.id('invoiceDocuments'),
		organizationId: v.id('organizations'),
		batchId: v.id('invoiceBatches'),
		lignes: v.array(vLigneAEnregistrer),
		totalHT: v.union(v.number(), v.null()),
		basesParTaux: v.array(vBaseTaux),
		invoiceDate: v.union(v.string(), v.null()),
		invoiceNumber: v.union(v.string(), v.null()),
		/**
		 * Nom du fournisseur tel qu'imprimé. Rattaché aux lignes parce que les
		 * courriers de demande d'attestation se groupent par fournisseur, et
		 * que ce sont eux qui rendent le diagnostic immédiatement rentable.
		 * `null` pour un export comptable, qui ne le porte pas toujours.
		 */
		supplierName: v.optional(v.union(v.string(), v.null())),
		/**
		 * Anomalie non bloquante constatée pendant l'extraction — typiquement des
		 * lignes au montant illisible, écartées plutôt que devinées. Le document
		 * reste exploitable, mais l'opérateur doit savoir que le dénominateur est
		 * incomplet. Stockée dans `extractionError` malgré un statut `DONE` : un
		 * `extractionError` non vide sur un document `DONE` est un avertissement,
		 * pas un échec.
		 */
		avertissement: v.optional(v.string())
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const document = await ctx.db.get(args.documentId);
		if (!document) return null;

		const dateFacture = args.invoiceDate ?? document.invoiceDate ?? '';
		const supplierId = await rattacherFournisseur(
			ctx,
			args.organizationId,
			args.supplierName ?? null
		);

		for (const ligne of args.lignes) {
			await ctx.db.insert('invoiceLines', {
				organizationId: args.organizationId,
				batchId: args.batchId,
				documentId: args.documentId,
				supplierId,
				rawLabel: ligne.rawLabel,
				normalizedLabel: normaliserLibelle(ligne.rawLabel),
				quantity: ligne.quantity,
				unit: ligne.unit,
				unitPrice: ligne.unitPrice,
				amountHT: ligne.amountHT,
				vatRate: ligne.vatRate,
				invoiceDate: dateFacture,
				// Pas de champs de classification ici : c'est `classification.ts` qui les
				// renseigne, par libellé distinct et non par ligne.
				reviewStatus: 'AUTO'
			});
		}

		await ctx.db.patch(args.documentId, {
			extractionStatus: 'DONE',
			extractionError: args.avertissement,
			supplierId,
			totalHT: args.totalHT ?? undefined,
			basesParTaux: args.basesParTaux,
			invoiceDate: args.invoiceDate ?? document.invoiceDate,
			invoiceNumber: args.invoiceNumber ?? document.invoiceNumber,
			linesCount: args.lignes.length
		});
		return null;
	}
});

/**
 * Enchaîne sur la classification quand le DERNIER document du lot a fini de
 * s'extraire, réussi ou échoué.
 *
 * Appelée après chaque document plutôt que planifiée à l'avance : c'est le
 * seul endroit qui sait quand une extraction se termine, et l'ordre
 * d'arrivée des documents n'est pas connu à l'avance. Le test « plus aucun
 * PENDING » est fait en transaction, donc un seul appelant peut le voir
 * passer à vrai.
 */
export const enchainerSiLotTermine = internalMutation({
	args: { batchId: v.id('invoiceBatches') },
	returns: v.boolean(),
	handler: async (ctx, { batchId }) => {
		const restants = await ctx.db
			.query('invoiceDocuments')
			.withIndex('by_batch_and_status', (q) =>
				q.eq('batchId', batchId).eq('extractionStatus', 'PENDING')
			)
			.first();
		if (restants) return false;

		const batch = await ctx.db.get(batchId);
		// Déjà passé à la suite : ne pas relancer une seconde chaîne.
		if (!batch || batch.status !== 'EXTRACTING') return false;

		await ctx.db.patch(batchId, { status: 'CLASSIFYING' });
		await ctx.scheduler.runAfter(0, internal.egalim.classification.classifierLot, {
			batchId,
			offset: 0
		});
		return true;
	}
});

export const marquerEchec = internalMutation({
	args: {
		documentId: v.id('invoiceDocuments'),
		erreur: v.string()
	},
	returns: v.null(),
	handler: async (ctx, { documentId, erreur }) => {
		const document = await ctx.db.get(documentId);
		if (!document) return null;
		await ctx.db.patch(documentId, {
			extractionStatus: 'FAILED',
			extractionError: erreur
		});
		return null;
	}
});
