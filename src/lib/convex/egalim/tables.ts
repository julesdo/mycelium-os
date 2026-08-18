import { defineTable } from 'convex/server';
import { v } from 'convex/values';

export const vFamille = v.union(
	v.literal('VIANDE'),
	v.literal('POISSON'),
	v.literal('FRUITS_LEGUMES'),
	v.literal('LAITIERS'),
	v.literal('EPICERIE_SECHE'),
	v.literal('EPICERIE_APPERTISEE'),
	v.literal('BOISSONS'),
	v.literal('AUTRE')
);

export const vLabel = v.union(
	v.literal('AB'),
	v.literal('CONVERSION'),
	v.literal('LABEL_ROUGE'),
	v.literal('AOP_AOC_IGP_STG'),
	v.literal('HVE3'),
	v.literal('FERMIER'),
	v.literal('PECHE_DURABLE'),
	v.literal('COMMERCE_EQUITABLE'),
	v.literal('RUP'),
	v.literal('CYCLE_DE_VIE')
);

export const egalimTables = {
	// Un dépôt de factures : « factures 2025 — Clinique X »
	invoiceBatches: defineTable({
		organizationId: v.id('organizations'),
		label: v.string(),
		periodStart: v.string(), // AAAA-MM-JJ
		periodEnd: v.string(),
		status: v.union(
			v.literal('DRAFT'),
			v.literal('EXTRACTING'),
			v.literal('CLASSIFYING'),
			v.literal('REVIEW'),
			v.literal('READY'),
			v.literal('FAILED')
		),
		uploadedBy: v.string(),
		documentsTotal: v.number(),
		linesTotal: v.number(),
		labelsPendingReview: v.number(),
		createdAt: v.number()
	})
		.index('by_org', ['organizationId'])
		.index('by_org_and_status', ['organizationId', 'status']),

	// Un fichier déposé
	invoiceDocuments: defineTable({
		organizationId: v.id('organizations'),
		batchId: v.id('invoiceBatches'),
		storageId: v.id('_storage'),
		filename: v.string(),
		mimeType: v.string(),
		sourceType: v.union(
			v.literal('CSV'),
			v.literal('EXCEL'),
			v.literal('PDF_TEXT'),
			v.literal('PDF_SCAN'),
			v.literal('IMAGE'),
			v.literal('TEXTE')
		),
		extractionStatus: v.union(v.literal('PENDING'), v.literal('DONE'), v.literal('FAILED')),
		extractionError: v.optional(v.string()),
		supplierId: v.optional(v.id('suppliers')),
		invoiceDate: v.optional(v.string()),
		invoiceNumber: v.optional(v.string()),
		totalHT: v.optional(v.number()),
		// Bases de TVA imprimées en pied de facture, servant à vérifier l'extraction
		basesParTaux: v.optional(v.array(v.object({ taux: v.number(), baseHT: v.number() }))),
		linesCount: v.number()
	})
		.index('by_batch', ['batchId'])
		.index('by_org', ['organizationId'])
		.index('by_batch_and_status', ['batchId', 'extractionStatus']),

	// LA table centrale — ~3 000 lignes par cantine et par an
	invoiceLines: defineTable({
		organizationId: v.id('organizations'),
		batchId: v.id('invoiceBatches'),
		documentId: v.id('invoiceDocuments'),
		// La source, jamais modifiée
		rawLabel: v.string(),
		normalizedLabel: v.string(),
		quantity: v.optional(v.number()),
		unit: v.optional(v.string()),
		unitPrice: v.optional(v.number()),
		amountHT: v.number(),
		vatRate: v.optional(v.number()),
		invoiceDate: v.string(),
		supplierId: v.optional(v.id('suppliers')),
		// Le verdict — renseigné à la classification
		isFood: v.optional(v.boolean()),
		family: v.optional(vFamille),
		qualifyingLabels: v.optional(v.array(vLabel)),
		isBio: v.optional(v.boolean()),
		isDurable: v.optional(v.boolean()),
		justification: v.optional(v.string()),
		confidence: v.optional(v.number()),
		reviewStatus: v.union(
			v.literal('AUTO'),
			v.literal('PENDING_REVIEW'),
			v.literal('CONFIRMED'),
			v.literal('CORRECTED')
		),
		proofStatus: v.optional(
			v.union(v.literal('PROVEN'), v.literal('TO_JUSTIFY'), v.literal('NONE'))
		),
		classifierVersion: v.optional(v.string())
	})
		.index('by_batch', ['batchId'])
		.index('by_org_and_date', ['organizationId', 'invoiceDate'])
		.index('by_batch_and_review', ['batchId', 'reviewStatus'])
		// Borné au lot, jamais global : appliquer une classification ne doit
		// jamais faire LIRE les lignes d'une autre organisation. C'est aussi la
		// bonne sémantique métier — un diagnostic livré est figé, un lot
		// antérieur ne se reclasse pas.
		.index('by_batch_and_label', ['batchId', 'normalizedLabel']),

	// Cache global de classification par libellé distinct.
	// SANS organizationId, délibérément : ne contient QUE la chaîne de libellé
	// et sa classification. Jamais de montant, de quantité, de fournisseur ni
	// de lien vers une organisation. Ce qui est mutualisé est du référentiel
	// produit, pas de la donnée client.
	productLabels: defineTable({
		normalizedLabel: v.string(),
		isFood: v.boolean(),
		family: vFamille,
		qualifyingLabels: v.array(vLabel),
		justification: v.string(),
		confidence: v.number(),
		source: v.union(v.literal('AUTO'), v.literal('HUMAN')),
		confirmedBy: v.optional(v.string()),
		confirmedAt: v.optional(v.number()),
		classifierVersion: v.string(),
		occurrences: v.number()
	})
		.index('by_normalized_label', ['normalizedLabel'])
		.index('by_source', ['source']),

	suppliers: defineTable({
		organizationId: v.id('organizations'),
		name: v.string(),
		rawNames: v.array(v.string()),
		siret: v.optional(v.string()),
		type: v.union(v.literal('GROSSISTE'), v.literal('PRODUCTEUR'), v.literal('AUTRE')),
		attestationStatus: v.union(
			v.literal('NONE'),
			v.literal('REQUESTED'),
			v.literal('RECEIVED'),
			v.literal('REFUSED')
		)
	})
		.index('by_org', ['organizationId'])
		.index('by_org_and_name', ['organizationId', 'name']),

	// Le rapport FIGÉ. Les ratios sont stockés calculés, jamais recalculés.
	diagnostics: defineTable({
		organizationId: v.id('organizations'),
		batchId: v.id('invoiceBatches'),
		periodStart: v.string(),
		periodEnd: v.string(),
		computedAt: v.number(),
		classifierVersion: v.string(),
		ratios: v.object({
			durable: v.number(),
			bio: v.number(),
			meatFishDurable: v.number(),
			totalFoodHT: v.number(),
			totalHT: v.number()
		}),
		byFamily: v.array(
			v.object({
				family: vFamille,
				totalHT: v.number(),
				durableHT: v.number(),
				bioHT: v.number()
			})
		),
		bySupplier: v.array(
			v.object({
				supplierName: v.string(),
				totalHT: v.number(),
				durableHT: v.number(),
				bioHT: v.number()
			})
		),
		gapEuros: v.object({
			toDurable50: v.number(),
			toBio20: v.number(),
			toMeatFish60: v.number()
		}),
		status: v.union(v.literal('DRAFT'), v.literal('DELIVERED')),
		deliveredAt: v.optional(v.number()),
		tier: v.optional(v.union(v.literal('S'), v.literal('M'), v.literal('L')))
	})
		.index('by_org', ['organizationId'])
		.index('by_batch', ['batchId']),

	// Les courriers de demande de justificatif — le point du livrable qui
	// rembourse souvent la prestation à lui seul
	attestationRequests: defineTable({
		organizationId: v.id('organizations'),
		supplierId: v.id('suppliers'),
		diagnosticId: v.id('diagnostics'),
		lineIds: v.array(v.id('invoiceLines')),
		amountAtStake: v.number(),
		status: v.union(
			v.literal('DRAFT'),
			v.literal('SENT'),
			v.literal('RECEIVED'),
			v.literal('REFUSED')
		),
		sentAt: v.optional(v.number())
	})
		.index('by_org', ['organizationId'])
		.index('by_diagnostic', ['diagnosticId']),

	// Suivi et contrôle de coût de l'extraction ET de la classification
	classificationJobs: defineTable({
		organizationId: v.id('organizations'),
		batchId: v.id('invoiceBatches'),
		status: v.union(
			v.literal('RUNNING'),
			v.literal('DONE'),
			v.literal('FAILED'),
			v.literal('CAPPED')
		),
		labelsTotal: v.number(),
		labelsDone: v.number(),
		labelsFailed: v.number(),
		tokensIn: v.number(),
		tokensOut: v.number(),
		cacheReadTokens: v.number(),
		costEur: v.number(),
		startedAt: v.number(),
		finishedAt: v.optional(v.number()),
		error: v.optional(v.string())
	}).index('by_batch', ['batchId'])
};
