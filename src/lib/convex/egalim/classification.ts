'use node';

import { v } from 'convex/values';
import { internalAction } from '../_generated/server';
import { internal } from '../_generated/api';
import type { ActionCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';
import { classifierAvecClaude, type UsageClassification } from './classificateurClaude';
import type { ClassificationClaude } from './classificationSchema';
import { rapprocher } from './appariement';
import { CAP_EUR, estimerCout } from './cout';

/**
 * L'orchestration de la classification — le cœur du produit.
 *
 * Elle ne classe JAMAIS des lignes, elle classe des libellés distincts : les
 * ~3 000 lignes d'une cantine sur douze mois se ramènent à 300–500 libellés,
 * et c'est cette réduction qui fait tenir le coût dans le prix du diagnostic.
 *
 * `"use node"` pour le SDK Anthropic — jamais dans un fichier qui exporte
 * aussi des query/mutation (voir `classificationMutations.ts`, à côté).
 */

/** Libellés distincts par appel Claude. */
const TAILLE_LOT = 50;

/**
 * Une tranche : les libellés déjà connus sont appliqués depuis le cache, le
 * reste part chez Claude.
 *
 * Quand le budget est épuisé, la lecture de cache a QUAND MÊME lieu. Elle ne
 * coûte rien, et envoyer en arbitrage humain des libellés dont la réponse est
 * déjà connue dépenserait la seule ressource réellement chère ici : le temps
 * de l'opérateur.
 */
async function traiterTranche(
	ctx: ActionCtx,
	batchId: Id<'invoiceBatches'>,
	jobId: Id<'classificationJobs'>,
	libelles: readonly string[],
	budgetEpuise: boolean
): Promise<{ classes: number; echoues: number }> {
	const { restants, appliques } = await ctx.runMutation(
		internal.egalim.classificationMutations.appliquerLibellesEnCache,
		{ batchId, libelles: [...libelles] }
	);

	if (restants.length === 0) {
		return { classes: appliques, echoues: 0 };
	}

	if (budgetEpuise) {
		await ctx.runMutation(internal.egalim.classificationMutations.marquerLibellesNonClasses, {
			batchId,
			libelles: restants
		});
		return { classes: appliques, echoues: restants.length };
	}

	let resultat: { classifications: ClassificationClaude[]; usage: UsageClassification };
	try {
		resultat = await classifierAvecClaude({ libelles: restants });
	} catch {
		// L'appel a échoué malgré ses reprises : ces libellés partent en
		// arbitrage humain plutôt que de bloquer le lot entier.
		await ctx.runMutation(internal.egalim.classificationMutations.marquerLibellesNonClasses, {
			batchId,
			libelles: restants
		});
		return { classes: appliques, echoues: restants.length };
	}

	// Le coût est comptabilisé AVANT d'exploiter la réponse : un appel émis est
	// facturé, qu'on sache ou non quoi faire de ce qu'il a rendu.
	await ctx.runMutation(internal.egalim.extractionMutations.accumulerCout, {
		jobId,
		tokensIn: resultat.usage.tokensIn,
		tokensOut: resultat.usage.tokensOut,
		cacheReadTokens: resultat.usage.cacheReadTokens,
		coutEur: estimerCout(resultat.usage),
		capEur: CAP_EUR
	});

	const { appariees, manquants } = rapprocher(restants, resultat.classifications);

	for (const classification of appariees) {
		await ctx.runMutation(internal.egalim.classificationMutations.appliquerClassification, {
			batchId,
			classification: {
				normalizedLabel: classification.normalizedLabel,
				isFood: classification.isFood,
				family: classification.family,
				qualifyingLabels: classification.qualifyingLabels,
				justification: classification.justification,
				confidence: classification.confidence
			}
		});
	}

	if (manquants.length > 0) {
		await ctx.runMutation(internal.egalim.classificationMutations.marquerLibellesNonClasses, {
			batchId,
			libelles: manquants
		});
	}

	return { classes: appliques + appariees.length, echoues: manquants.length };
}

/**
 * Classe une tranche de libellés puis se re-planifie pour la suivante.
 *
 * `offset` est un index dans la liste triée des libellés distincts du lot,
 * liste stable pendant toute la classification. Il croît strictement d'une
 * invocation à l'autre : la boucle termine, y compris lorsqu'une tranche
 * échoue entièrement — un libellé qui résiste part en arbitrage humain, il
 * n'est jamais rejoué indéfiniment.
 *
 * Le franchissement du plafond n'interrompt PAS la boucle : elle continue à
 * vider le cache, gratuitement, et n'émet plus d'appel payant. Un seul chemin
 * de code, une seule condition d'arrêt.
 */
export const classifierLot = internalAction({
	args: {
		batchId: v.id('invoiceBatches'),
		offset: v.number()
	},
	returns: v.null(),
	handler: async (ctx, { batchId, offset }) => {
		const contexte = await ctx.runQuery(
			internal.egalim.classificationMutations.obtenirContexte,
			{ batchId }
		);
		if (!contexte) return null;

		const { libelles, total } = await ctx.runQuery(
			internal.egalim.classificationMutations.listerLibellesDuLot,
			{ batchId, offset, limite: TAILLE_LOT }
		);

		if (offset === 0) {
			await ctx.runMutation(internal.egalim.classificationMutations.demarrerClassification, {
				batchId,
				jobId: contexte.jobId,
				labelsTotal: total
			});
		}

		// Plus rien à classer : le lot est bouclé.
		if (libelles.length === 0) {
			await ctx.runMutation(internal.egalim.classificationMutations.finaliserClassification, {
				batchId,
				jobId: contexte.jobId,
				erreur:
					contexte.jobStatus === 'CAPPED'
						? `Budget de traitement du lot atteint (${CAP_EUR} €) — les libellés non couverts par le cache sont partis en arbitrage humain.`
						: undefined
			});
			return null;
		}

		// Un document voisin du même lot partage ce job de coût et a pu faire
		// basculer le plafond entre deux tranches : on relit l'état, on ne le
		// suppose pas.
		const { classes, echoues } = await traiterTranche(
			ctx,
			batchId,
			contexte.jobId,
			libelles,
			contexte.jobStatus === 'CAPPED'
		);

		await ctx.runMutation(internal.egalim.classificationMutations.avancerJob, {
			jobId: contexte.jobId,
			libellesClasses: classes,
			libellesEchoues: echoues
		});

		await ctx.scheduler.runAfter(0, internal.egalim.classification.classifierLot, {
			batchId,
			offset: offset + TAILLE_LOT
		});
		return null;
	}
});
