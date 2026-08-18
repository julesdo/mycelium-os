import { v, ConvexError } from 'convex/values';
import { internalMutation, internalQuery } from '../_generated/server';
import { internal } from '../_generated/api';
import { authedMutation } from '../functions';
import { REFERENTIEL_VERSION } from '../../egalim/referentiel';
import { deriverVerdict, type ClassificationBrute } from './verdict';
import { vFamille, vLabel } from './tables';

/**
 * Les écritures en base de la classification (`classification.ts`). Séparées
 * pour la même raison que celles de l'extraction : une action `"use node"` ne
 * peut pas exporter de query ni de mutation dans le même fichier.
 */

const vClassification = v.object({
	normalizedLabel: v.string(),
	isFood: v.boolean(),
	family: vFamille,
	qualifyingLabels: v.array(vLabel),
	justification: v.string(),
	confidence: v.number()
});

const vContexte = v.object({
	organizationId: v.id('organizations'),
	jobId: v.id('classificationJobs'),
	jobStatus: v.union(
		v.literal('RUNNING'),
		v.literal('DONE'),
		v.literal('FAILED'),
		v.literal('CAPPED')
	)
});

/** Une confiance hors bornes est ramenée dans [0, 1] plutôt que de faire échouer le lot. */
function borner(confidence: number): number {
	if (!Number.isFinite(confidence)) return 0;
	return Math.min(1, Math.max(0, confidence));
}

/**
 * Les libellés distincts du lot, triés, découpés en tranches.
 *
 * La liste est re-dérivée à chaque invocation plutôt que mémorisée : elle est
 * stable pendant toute la classification (l'extraction est terminée, et
 * classer ne modifie jamais `normalizedLabel`), et un curseur mémorisé est un
 * état de plus qui peut se désynchroniser. Le prix est une relecture des
 * lignes du lot par tranche, ce que Convex encaisse sans difficulté à
 * l'échelle d'une cantine (~3 000 lignes par an).
 */
export const listerLibellesDuLot = internalQuery({
	args: {
		batchId: v.id('invoiceBatches'),
		offset: v.number(),
		limite: v.number()
	},
	returns: v.object({ libelles: v.array(v.string()), total: v.number() }),
	handler: async (ctx, { batchId, offset, limite }) => {
		const lignes = await ctx.db
			.query('invoiceLines')
			.withIndex('by_batch', (q) => q.eq('batchId', batchId))
			.collect();

		const distincts = [...new Set(lignes.map((l) => l.normalizedLabel))].sort();
		return {
			libelles: distincts.slice(offset, offset + limite),
			total: distincts.length
		};
	}
});

export const obtenirContexte = internalQuery({
	args: { batchId: v.id('invoiceBatches') },
	returns: v.union(vContexte, v.null()),
	handler: async (ctx, { batchId }) => {
		const batch = await ctx.db.get(batchId);
		if (!batch) return null;

		const job = await ctx.db
			.query('classificationJobs')
			.withIndex('by_batch', (q) => q.eq('batchId', batchId))
			.first();
		if (!job) return null;

		return { organizationId: batch.organizationId, jobId: job._id, jobStatus: job.status };
	}
});

export const demarrerClassification = internalMutation({
	args: {
		batchId: v.id('invoiceBatches'),
		jobId: v.id('classificationJobs'),
		labelsTotal: v.number()
	},
	returns: v.null(),
	handler: async (ctx, { batchId, jobId, labelsTotal }) => {
		await ctx.db.patch(batchId, { status: 'CLASSIFYING' });
		await ctx.db.patch(jobId, { labelsTotal, labelsDone: 0, labelsFailed: 0 });
		return null;
	}
});

/**
 * Applique un verdict à toutes les lignes du lot qui portent ce libellé, et
 * tient le cache global à jour. Renvoie le nombre de lignes touchées.
 *
 * C'est le SEUL point d'écriture d'une classification issue du modèle, et il
 * porte à ce titre la garantie la plus importante du module : un arbitrage
 * humain ne peut jamais être défait par une passe du modèle. Si le cache
 * porte déjà une entrée `HUMAN`, c'est elle qui s'applique et la proposition
 * du modèle est jetée. La lecture de cache faite en amont par l'action n'est
 * donc qu'une économie d'appel : la correction ne dépend pas d'elle.
 *
 * Plafond d'écriture : chaque ligne du lot est touchée au plus une fois par
 * passe, ce qui borne le nombre d'écritures au nombre de lignes du lot. Un
 * lot de plus de 8 000 lignes (~3 ans de factures) devrait être scindé.
 */
export const appliquerClassification = internalMutation({
	args: {
		batchId: v.id('invoiceBatches'),
		classification: vClassification
	},
	returns: v.number(),
	handler: async (ctx, { batchId, classification }) => {
		const existant = await ctx.db
			.query('productLabels')
			.withIndex('by_normalized_label', (q) =>
				q.eq('normalizedLabel', classification.normalizedLabel)
			)
			.first();

		const arbitreParUnHumain = existant !== null && existant.source === 'HUMAN';

		const brute: ClassificationBrute = arbitreParUnHumain
			? {
					normalizedLabel: classification.normalizedLabel,
					isFood: existant.isFood,
					family: existant.family,
					qualifyingLabels: existant.qualifyingLabels,
					confidence: existant.confidence
				}
			: {
					normalizedLabel: classification.normalizedLabel,
					isFood: classification.isFood,
					family: classification.family,
					qualifyingLabels: classification.qualifyingLabels,
					confidence: borner(classification.confidence)
				};

		const justification = arbitreParUnHumain
			? existant.justification
			: classification.justification;
		const verdict = deriverVerdict(brute, arbitreParUnHumain ? 'HUMAN' : 'AUTO');

		const lignes = await ctx.db
			.query('invoiceLines')
			.withIndex('by_batch_and_label', (q) =>
				q.eq('batchId', batchId).eq('normalizedLabel', classification.normalizedLabel)
			)
			.collect();

		for (const ligne of lignes) {
			await ctx.db.patch(ligne._id, {
				isFood: verdict.isFood,
				family: verdict.family,
				qualifyingLabels: verdict.qualifyingLabels,
				isBio: verdict.isBio,
				isDurable: verdict.isDurable,
				justification,
				confidence: brute.confidence,
				proofStatus: verdict.proofStatus,
				reviewStatus: verdict.reviewStatus,
				classifierVersion: REFERENTIEL_VERSION
			});
		}

		if (!existant) {
			await ctx.db.insert('productLabels', {
				normalizedLabel: classification.normalizedLabel,
				isFood: brute.isFood,
				family: brute.family,
				qualifyingLabels: [...brute.qualifyingLabels],
				justification,
				confidence: brute.confidence,
				source: 'AUTO',
				classifierVersion: REFERENTIEL_VERSION,
				occurrences: lignes.length
			});
		} else if (arbitreParUnHumain) {
			// On ne touche qu'au compteur : la classification humaine reste
			// intacte, y compris sa `classifierVersion` d'origine, qui dit sous
			// quel barème l'arbitrage a été rendu.
			await ctx.db.patch(existant._id, { occurrences: existant.occurrences + lignes.length });
		} else {
			await ctx.db.patch(existant._id, {
				isFood: brute.isFood,
				family: brute.family,
				qualifyingLabels: [...brute.qualifyingLabels],
				justification,
				confidence: brute.confidence,
				classifierVersion: REFERENTIEL_VERSION,
				occurrences: existant.occurrences + lignes.length
			});
		}

		return lignes.length;
	}
});

/**
 * Applique les libellés déjà connus du cache global, et renvoie ceux qui
 * restent à classer. Une seule traversée pour les deux : la lecture de cache
 * et l'application partagent exactement la même condition de réutilisabilité.
 *
 * Réutilisable = arbitré par un humain (quel que soit le barème d'alors, un
 * verdict humain prime), ou produit par le modèle sous le barème courant.
 * Une entrée `AUTO` sous un barème périmé est reclassée : quand le barème
 * change, toute conclusion qui en découle est à refaire.
 */
export const appliquerLibellesEnCache = internalMutation({
	args: {
		batchId: v.id('invoiceBatches'),
		libelles: v.array(v.string())
	},
	returns: v.object({ restants: v.array(v.string()), appliques: v.number() }),
	handler: async (ctx, { batchId, libelles }) => {
		const restants: string[] = [];
		let appliques = 0;

		for (const libelle of libelles) {
			const cache = await ctx.db
				.query('productLabels')
				.withIndex('by_normalized_label', (q) => q.eq('normalizedLabel', libelle))
				.first();

			if (
				cache === null ||
				(cache.source !== 'HUMAN' && cache.classifierVersion !== REFERENTIEL_VERSION)
			) {
				restants.push(libelle);
				continue;
			}

			const verdict = deriverVerdict(
				{
					normalizedLabel: libelle,
					isFood: cache.isFood,
					family: cache.family,
					qualifyingLabels: cache.qualifyingLabels,
					confidence: cache.confidence
				},
				cache.source
			);

			const lignes = await ctx.db
				.query('invoiceLines')
				.withIndex('by_batch_and_label', (q) =>
					q.eq('batchId', batchId).eq('normalizedLabel', libelle)
				)
				.collect();

			for (const ligne of lignes) {
				await ctx.db.patch(ligne._id, {
					isFood: verdict.isFood,
					family: verdict.family,
					qualifyingLabels: verdict.qualifyingLabels,
					isBio: verdict.isBio,
					isDurable: verdict.isDurable,
					justification: cache.justification,
					confidence: cache.confidence,
					proofStatus: verdict.proofStatus,
					reviewStatus: verdict.reviewStatus,
					classifierVersion: cache.classifierVersion
				});
			}

			await ctx.db.patch(cache._id, { occurrences: cache.occurrences + lignes.length });
			appliques += 1;
		}

		return { restants, appliques };
	}
});

/**
 * Les libellés que le modèle n'a pas rendus, ou dont l'appel a échoué. Leurs
 * lignes partent en arbitrage humain SANS classification : mieux vaut une
 * ligne visiblement en attente qu'une ligne muettement comptée comme non
 * qualifiante, qui fausserait le ratio vers le bas sans que rien ne le
 * signale.
 */
export const marquerLibellesNonClasses = internalMutation({
	args: {
		batchId: v.id('invoiceBatches'),
		libelles: v.array(v.string())
	},
	returns: v.number(),
	handler: async (ctx, { batchId, libelles }) => {
		let touchees = 0;
		for (const libelle of libelles) {
			const lignes = await ctx.db
				.query('invoiceLines')
				.withIndex('by_batch_and_label', (q) =>
					q.eq('batchId', batchId).eq('normalizedLabel', libelle)
				)
				.collect();
			for (const ligne of lignes) {
				await ctx.db.patch(ligne._id, { reviewStatus: 'PENDING_REVIEW' });
				touchees += 1;
			}
		}
		return touchees;
	}
});

export const avancerJob = internalMutation({
	args: {
		jobId: v.id('classificationJobs'),
		libellesClasses: v.number(),
		libellesEchoues: v.number()
	},
	returns: v.null(),
	handler: async (ctx, { jobId, libellesClasses, libellesEchoues }) => {
		const job = await ctx.db.get(jobId);
		if (!job) return null;
		await ctx.db.patch(jobId, {
			labelsDone: job.labelsDone + libellesClasses,
			labelsFailed: job.labelsFailed + libellesEchoues
		});
		return null;
	}
});

/**
 * Clôture : le lot passe en revue s'il reste des libellés à arbitrer, prêt
 * sinon. `labelsPendingReview` compte des LIBELLÉS distincts et non des
 * lignes — c'est l'unité de travail de l'arbitrage, et donc la seule qui
 * annonce honnêtement la charge à venir.
 */
export const finaliserClassification = internalMutation({
	args: {
		batchId: v.id('invoiceBatches'),
		jobId: v.id('classificationJobs'),
		erreur: v.optional(v.string())
	},
	returns: v.null(),
	handler: async (ctx, { batchId, jobId, erreur }) => {
		const lignes = await ctx.db
			.query('invoiceLines')
			.withIndex('by_batch', (q) => q.eq('batchId', batchId))
			.collect();

		const libellesEnRevue = new Set(
			lignes.filter((l) => l.reviewStatus === 'PENDING_REVIEW').map((l) => l.normalizedLabel)
		);

		await ctx.db.patch(batchId, {
			status: libellesEnRevue.size > 0 ? 'REVIEW' : 'READY',
			linesTotal: lignes.length,
			labelsPendingReview: libellesEnRevue.size
		});

		// Rien à arbitrer : le diagnostic se produit sans intervention.
		if (libellesEnRevue.size === 0) {
			await ctx.scheduler.runAfter(0, internal.egalim.diagnostics.produireSiPret, { batchId });
		}

		const job = await ctx.db.get(jobId);
		await ctx.db.patch(jobId, {
			// Un job plafonné le reste : le dire `DONE` masquerait que le lot est
			// incomplet faute de budget.
			status: job?.status === 'CAPPED' ? 'CAPPED' : erreur ? 'FAILED' : 'DONE',
			finishedAt: Date.now(),
			error: erreur
		});
		return null;
	}
});

/**
 * Le seul export public de ce fichier : lancer la classification d'un lot.
 *
 * Relancer un lot déjà classé est sûr — les libellés connus repartent du cache
 * global sans appel, et un arbitrage humain n'est jamais défait (voir
 * `appliquerClassification`). Le déclenchement automatique à la fin de
 * l'extraction relève du dépôt de factures (P1-T10).
 */
export const lancerClassification = authedMutation({
	args: { batchId: v.id('invoiceBatches') },
	returns: v.null(),
	handler: async (ctx, { batchId }) => {
		const batch = await ctx.db.get(batchId);
		if (!batch) throw new ConvexError('Lot introuvable');

		// Deux chaînes lancées en parallèle produiraient le même résultat — les
		// écritures sont idempotentes — mais paieraient deux fois les mêmes
		// appels, le cache n'étant pas encore chaud pour la seconde.
		if (batch.status === 'CLASSIFYING') {
			throw new ConvexError('Ce lot est déjà en cours de classification');
		}

		const membership = await ctx.db
			.query('organizationMembers')
			.withIndex('by_org_and_user', (q) =>
				q.eq('organizationId', batch.organizationId).eq('userId', ctx.user._id)
			)
			.unique();
		if (!membership) {
			throw new ConvexError("Non autorisé : vous n'êtes pas membre de cette organisation");
		}

		await ctx.runMutation(internal.egalim.extractionMutations.obtenirOuCreerJob, {
			organizationId: batch.organizationId,
			batchId
		});

		await ctx.scheduler.runAfter(0, internal.egalim.classification.classifierLot, {
			batchId,
			offset: 0
		});
		return null;
	}
});
