import { v, ConvexError } from 'convex/values';
import { internalAction, internalMutation, internalQuery } from './_generated/server';
import { internal } from './_generated/api';
import { authedQuery, authedMutation } from './functions';
import { getUserOrg, requireOrgAdmin } from './lib/auth';
import type { Id } from './_generated/dataModel';
import { detectProvider, parseByProvider, normalizeRegistration } from './fuelParsers';

// ─── Internal queries (called from action) ────────────────────────────────────

export const getVehiclesForOrgInternal = internalQuery({
	args: { organizationId: v.id('organizations') },
	handler: async (ctx, { organizationId }) =>
		ctx.db
			.query('vehicles')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect()
});

export const checkCostExists = internalQuery({
	args: {
		organizationId: v.id('organizations'),
		vehicleId: v.id('vehicles'),
		date: v.number(),
		amount: v.number()
	},
	handler: async (ctx, { organizationId, vehicleId, date, amount }) => {
		 
		const existing = await ctx.db
			.query('costs')
			.withIndex('by_org_date', (q) => q.eq('organizationId', organizationId).eq('date', date))
			.filter((q) => q.and(q.eq(q.field('vehicleId'), vehicleId), q.eq(q.field('amount'), amount)))
			.first();
		return !!existing;
	}
});

// ─── Internal mutations (called from action) ──────────────────────────────────

export const createFuelImportRecord = internalMutation({
	args: {
		organizationId: v.id('organizations'),
		provider: v.union(
			v.literal('TOTAL_CARDS'),
			v.literal('BP_PLUS'),
			v.literal('SHELL_FLEET'),
			v.literal('GENERIC')
		),
		fileName: v.string(),
		fileStorageId: v.string(),
		importedBy: v.string()
	},
	handler: async (ctx, args) =>
		ctx.db.insert('fuelImports', {
			...args,
			periodStart: '',
			periodEnd: '',
			totalLines: 0,
			matchedLines: 0,
			unmatchedLines: 0,
			anomalyCount: 0,
			totalAmount: 0,
			status: 'PROCESSING',
			createdAt: Date.now()
		})
});

export const updateFuelImportStatus = internalMutation({
	args: {
		importId: v.id('fuelImports'),
		status: v.union(
			v.literal('PROCESSING'),
			v.literal('REVIEW'),
			v.literal('COMPLETED'),
			v.literal('FAILED')
		),
		periodStart: v.optional(v.string()),
		periodEnd: v.optional(v.string()),
		totalLines: v.optional(v.number()),
		matchedLines: v.optional(v.number()),
		unmatchedLines: v.optional(v.number()),
		anomalyCount: v.optional(v.number()),
		totalAmount: v.optional(v.number()),
		unmatchedRegistrations: v.optional(v.array(v.string())),
		failureReason: v.optional(v.string())
	},
	handler: async (ctx, { importId, ...fields }) => {
		const patch: Record<string, unknown> = { status: fields.status };
		if (fields.periodStart !== undefined) patch.periodStart = fields.periodStart;
		if (fields.periodEnd !== undefined) patch.periodEnd = fields.periodEnd;
		if (fields.totalLines !== undefined) patch.totalLines = fields.totalLines;
		if (fields.matchedLines !== undefined) patch.matchedLines = fields.matchedLines;
		if (fields.unmatchedLines !== undefined) patch.unmatchedLines = fields.unmatchedLines;
		if (fields.anomalyCount !== undefined) patch.anomalyCount = fields.anomalyCount;
		if (fields.totalAmount !== undefined) patch.totalAmount = fields.totalAmount;
		if (fields.unmatchedRegistrations !== undefined)
			patch.unmatchedRegistrations = fields.unmatchedRegistrations;
		if (fields.failureReason !== undefined) patch.failureReason = fields.failureReason;

		await ctx.db.patch(importId, patch as any);
	}
});

export const createFuelAnomaly = internalMutation({
	args: {
		organizationId: v.id('organizations'),
		fuelImportId: v.id('fuelImports'),
		vehicleId: v.optional(v.id('vehicles')),
		registration: v.optional(v.string()),
		type: v.union(
			v.literal('WEEKEND_FILL'),
			v.literal('ABNORMAL_VOLUME'),
			v.literal('SUSPICIOUS_LOCATION'),
			v.literal('DUPLICATE'),
			v.literal('NO_ACTIVE_RESERVATION')
		),
		severity: v.union(v.literal('HIGH'), v.literal('MEDIUM'), v.literal('LOW')),
		rawLine: v.string(),
		date: v.number(),
		amount: v.number(),
		liters: v.optional(v.number()),
		station: v.optional(v.string())
	},
	handler: async (ctx, args) =>
		ctx.db.insert('fuelAnomalies', {
			...args,
			resolution: 'PENDING',
			createdAt: Date.now()
		})
});

export const insertCostInternal = internalMutation({
	args: {
		organizationId: v.id('organizations'),
		vehicleId: v.id('vehicles'),
		amount: v.number(),
		liters: v.number(),
		station: v.string(),
		date: v.number(),
		importedBy: v.string()
	},
	handler: async (ctx, args) => {
		const costId = await ctx.db.insert('costs', {
			organizationId: args.organizationId,
			vehicleId: args.vehicleId,
			category: 'CARBURANT',
			amount: args.amount,
			date: args.date,
			description: `${args.liters}L${args.station ? ` — ${args.station}` : ''}`,
			source: 'IMPORT',
			createdBy: args.importedBy,
			createdAt: Date.now()
		});
		await ctx.scheduler.runAfter(0, internal.integrations.accounting.pushEntityToAccounting, {
			entityType: 'COST',
			entityId: costId,
			organizationId: args.organizationId
		});
		return costId;
	}
});

// ─── Internal action — main processing ────────────────────────────────────────

export const processFuelImport = internalAction({
	args: {
		importId: v.id('fuelImports'),
		organizationId: v.id('organizations'),
		fileStorageId: v.string(),
		importedBy: v.string()
	},
	handler: async (ctx, { importId, organizationId, fileStorageId, importedBy }) => {
		try {
			// 1. Read file from storage
			const blob = await ctx.storage.get(fileStorageId as Id<'_storage'>);
			if (!blob) throw new Error('Fichier introuvable dans le stockage');
			const csv = await blob.text();

			// 2. Detect provider and parse
			const provider = detectProvider(csv);
			const transactions = parseByProvider(csv, provider);

			if (transactions.length === 0) {
				await ctx.runMutation(internal.fuelImport.updateFuelImportStatus, {
					importId,
					status: 'FAILED',
					failureReason: 'Aucune transaction valide trouvée dans le fichier'
				});
				return;
			}

			// 3. Match immatriculations → vehicleIds
			const vehicles = await ctx.runQuery(internal.fuelImport.getVehiclesForOrgInternal, {
				organizationId
			});
			const vehicleByReg = new Map(vehicles.map((v) => [normalizeRegistration(v.registration), v]));

			type Matched = { t: (typeof transactions)[0]; vehicleId: Id<'vehicles'> };
			const matched: Matched[] = [];
			const unmatchedRegs = new Set<string>();

			for (const t of transactions) {
				const vehicle = vehicleByReg.get(t.registration);
				if (vehicle) {
					matched.push({ t, vehicleId: vehicle._id });
				} else if (t.registration) {
					unmatchedRegs.add(t.registration);
				}
			}

			// 4. Detect anomalies on matched lines
			type AnomalyInfo = {
				t: (typeof transactions)[0];
				vehicleId: Id<'vehicles'>;
				type: 'WEEKEND_FILL' | 'ABNORMAL_VOLUME' | 'DUPLICATE';
				severity: 'HIGH' | 'MEDIUM' | 'LOW';
			};
			const anomalies: AnomalyInfo[] = [];
			const anomalyLineKeys = new Set<string>();

			for (let i = 0; i < matched.length; i++) {
				const { t, vehicleId } = matched[i];

				// Règle 1 : plein le week-end (0 = dimanche, 6 = samedi)
				const day = t.date.getDay();
				if (day === 0 || day === 6) {
					anomalies.push({ t, vehicleId, type: 'WEEKEND_FILL', severity: 'MEDIUM' });
					anomalyLineKeys.add(t.rawLine);
					continue;
				}

				// Règle 2 : volume anormal > 120L
				if (t.liters > 120) {
					anomalies.push({ t, vehicleId, type: 'ABNORMAL_VOLUME', severity: 'HIGH' });
					anomalyLineKeys.add(t.rawLine);
					continue;
				}

				// Règle 3 : doublon (même véhicule, même montant ± 2€, ± 30min)
				const isDuplicate = matched.some(
					({ t: other, vehicleId: otherId }, j) =>
						j !== i &&
						otherId === vehicleId &&
						Math.abs(other.amount - t.amount) < 2 &&
						Math.abs(other.date.getTime() - t.date.getTime()) < 30 * 60 * 1000
				);
				if (isDuplicate) {
					anomalies.push({ t, vehicleId, type: 'DUPLICATE', severity: 'HIGH' });
					anomalyLineKeys.add(t.rawLine);
				}
			}

			// 5. Compute period range
			const timestamps = transactions.map((t) => t.date.getTime()).filter((n) => !isNaN(n));
			const periodStart = timestamps.length
				? new Date(Math.min(...timestamps)).toISOString().slice(0, 10)
				: '';
			const periodEnd = timestamps.length
				? new Date(Math.max(...timestamps)).toISOString().slice(0, 10)
				: '';
			const totalAmount = transactions.reduce((s, t) => s + t.amount, 0);

			// 6. Persist anomaly records
			for (const a of anomalies) {
				await ctx.runMutation(internal.fuelImport.createFuelAnomaly, {
					organizationId,
					fuelImportId: importId,
					vehicleId: a.vehicleId,
					registration: a.t.registration,
					type: a.type,
					severity: a.severity,
					rawLine: a.t.rawLine,
					date: a.t.date.getTime(),
					amount: a.t.amount,
					liters: a.t.liters,
					station: a.t.station || undefined
				});
			}

			// 7. Create costs for clean matched lines (idempotent)
			let _costsCreated = 0;
			for (const { t, vehicleId } of matched) {
				if (anomalyLineKeys.has(t.rawLine)) continue;
				const date = new Date(t.date.toISOString().slice(0, 10)).getTime();
				const exists = await ctx.runQuery(internal.fuelImport.checkCostExists, {
					organizationId,
					vehicleId,
					date,
					amount: t.amount
				});
				if (exists) continue;
				await ctx.runMutation(internal.fuelImport.insertCostInternal, {
					organizationId,
					vehicleId,
					amount: t.amount,
					liters: t.liters,
					station: t.station,
					date,
					importedBy
				});
				_costsCreated++;
			}

			// 8. Update import record
			await ctx.runMutation(internal.fuelImport.updateFuelImportStatus, {
				importId,
				status: anomalies.length > 0 ? 'REVIEW' : 'COMPLETED',
				periodStart,
				periodEnd,
				totalLines: transactions.length,
				matchedLines: matched.length,
				unmatchedLines: transactions.length - matched.length,
				anomalyCount: anomalies.length,
				totalAmount,
				unmatchedRegistrations: Array.from(unmatchedRegs)
			});
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Erreur inconnue';
			await ctx.runMutation(internal.fuelImport.updateFuelImportStatus, {
				importId,
				status: 'FAILED',
				failureReason: msg
			});
		}
	}
});

// ─── Public mutations ─────────────────────────────────────────────────────────

export const generateFuelUploadUrl = authedMutation({
	args: {},
	handler: async (ctx) => {
		await getUserOrg(ctx);
		return ctx.storage.generateUploadUrl();
	}
});

export const startFuelImport = authedMutation({
	args: {
		fileStorageId: v.string(),
		fileName: v.string()
	},
	handler: async (ctx, { fileStorageId, fileName }) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);

		// Detect provider from filename as a hint (actual detection in action)
		const provider = 'GENERIC' as const;

		const importId = await ctx.db.insert('fuelImports', {
			organizationId,
			provider,
			fileName,
			fileStorageId,
			periodStart: '',
			periodEnd: '',
			totalLines: 0,
			matchedLines: 0,
			unmatchedLines: 0,
			anomalyCount: 0,
			totalAmount: 0,
			status: 'PROCESSING',
			importedBy: user._id,
			createdAt: Date.now()
		});

		await ctx.scheduler.runAfter(0, internal.fuelImport.processFuelImport, {
			importId,
			organizationId,
			fileStorageId,
			importedBy: user._id
		});

		return importId;
	}
});

export const resolveAnomaly = authedMutation({
	args: {
		anomalyId: v.id('fuelAnomalies'),
		resolution: v.union(v.literal('ACCEPTED'), v.literal('REJECTED')),
		notes: v.optional(v.string())
	},
	handler: async (ctx, { anomalyId, resolution, notes }) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);

		const anomaly = await ctx.db.get(anomalyId);
		if (!anomaly) throw new ConvexError('Anomalie introuvable');
		if (anomaly.organizationId !== organizationId) throw new ConvexError('Accès refusé');
		if (anomaly.resolution !== 'PENDING')
			throw new ConvexError('Cette anomalie a déjà été traitée');

		await ctx.db.patch(anomalyId, {
			resolution,
			resolvedBy: user._id,
			resolvedAt: Date.now(),
			notes
		});

		// Si acceptée : créer le coût carburant correspondant
		if (resolution === 'ACCEPTED' && anomaly.vehicleId) {
			const date = new Date(new Date(anomaly.date).toISOString().slice(0, 10)).getTime();
			const costId = await ctx.db.insert('costs', {
				organizationId,
				vehicleId: anomaly.vehicleId,
				category: 'CARBURANT',
				amount: anomaly.amount,
				date,
				description: `${anomaly.liters ?? '?'}L${anomaly.station ? ` — ${anomaly.station}` : ''} (anomalie validée)`,
				source: 'IMPORT',
				createdBy: user._id,
				createdAt: Date.now()
			});
			await ctx.scheduler.runAfter(0, internal.integrations.accounting.pushEntityToAccounting, {
				entityType: 'COST',
				entityId: costId,
				organizationId
			});
		}

		// Vérifier si toutes les anomalies sont résolues → compléter l'import
		 
		const pending = await ctx.db
			.query('fuelAnomalies')
			.withIndex('by_import', (q) => q.eq('fuelImportId', anomaly.fuelImportId))
			.filter((q) => q.eq(q.field('resolution'), 'PENDING'))
			.collect();

		const remainingPending = pending.filter((a) => a._id !== anomalyId);
		if (remainingPending.length === 0) {
			await ctx.db.patch(anomaly.fuelImportId, { status: 'COMPLETED' });
		}
	}
});

export const completeImport = authedMutation({
	args: { importId: v.id('fuelImports') },
	handler: async (ctx, { importId }) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);

		const imp = await ctx.db.get(importId);
		if (!imp) throw new ConvexError('Import introuvable');
		if (imp.organizationId !== organizationId) throw new ConvexError('Accès refusé');

		await ctx.db.patch(importId, { status: 'COMPLETED' });
	}
});

// ─── Public queries ───────────────────────────────────────────────────────────

export const getFuelImport = authedQuery({
	args: { importId: v.string() },
	handler: async (ctx, { importId }) => {
		if (!importId) return null;
		await getUserOrg(ctx);

		return ctx.db.get(importId as any);
	}
});

export const listFuelImports = authedQuery({
	args: { limit: v.optional(v.number()) },
	handler: async (ctx, { limit }) => {
		const { organizationId } = await getUserOrg(ctx);
		const imports = await ctx.db
			.query('fuelImports')
			.withIndex('by_org_and_created', (q) => q.eq('organizationId', organizationId))
			.order('desc')
			.take(limit ?? 20);
		return imports;
	}
});

export const getFuelAnomalies = authedQuery({
	args: { importId: v.string() },
	handler: async (ctx, { importId }) => {
		if (!importId) return [];
		await getUserOrg(ctx);
		return ctx.db
			.query('fuelAnomalies')
			.withIndex('by_import', (q) => q.eq('fuelImportId', importId as Id<'fuelImports'>))
			.collect();
	}
});
