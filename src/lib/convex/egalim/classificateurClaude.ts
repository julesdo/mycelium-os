'use node';

import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { lotClasseSchema, type ClassificationClaude } from './classificationSchema';
import { construirePromptSysteme } from './prompt';
import { avecReprise } from './reprise';

/**
 * L'appel de classification : un lot de libellés distincts, un appel. Le
 * référentiel entier part dans le bloc système avec son point de cache ; les
 * libellés partent APRÈS, dans `messages`. Placés avant, chaque lot
 * réécrirait le cache au lieu de le lire, et le coût par diagnostic sortirait
 * du budget sans le moindre signal.
 */

const MODELE_CLASSIFICATION = 'claude-opus-5';
const MAX_TOKENS = 16_000;

/**
 * Classer un libellé contre un barème n'est pas un raisonnement profond, et
 * les tokens de réflexion se facturent au prix de sortie. La contrepartie
 * assumée est que les faux amis (V.B.F., « plein air », HVE niveau 2) sont
 * précisément là où un passage rapide glisse. C'est la mesure du taux
 * d'erreur sur factures réelles (P1-T12) qui doit trancher s'il faut monter,
 * pas une intuition.
 */
const EFFORT_CLASSIFICATION = 'low' as const;

export interface UsageClassification {
	tokensIn: number;
	tokensOut: number;
	cacheReadTokens: number;
}

function construireSysteme(): Anthropic.TextBlockParam[] {
	return [
		{
			type: 'text',
			text: construirePromptSysteme(),
			cache_control: { type: 'ephemeral' }
		}
	];
}

/**
 * Classe un lot de libellés distincts. Renvoie les classifications telles que
 * le modèle les a rendues : le rapprochement avec les libellés demandés, et
 * le sort des manquants, sont l'affaire de l'appelant (`classification.ts`).
 */
export async function classifierAvecClaude(args: {
	libelles: readonly string[];
}): Promise<{ classifications: ClassificationClaude[]; usage: UsageClassification }> {
	const client = new Anthropic({ maxRetries: 0 });

	const response = await avecReprise(() =>
		client.messages.create({
			model: MODELE_CLASSIFICATION,
			max_tokens: MAX_TOKENS,
			system: construireSysteme(),
			// Le thinking reste actif par défaut — ne pas le désactiver, sous
			// peine de laisser Opus 5 fuir des balises <thinking> dans la sortie.
			// Aucun paramètre d'échantillonnage : temperature/top_p/top_k
			// renvoient tous une 400 sur Opus 5.
			output_config: {
				effort: EFFORT_CLASSIFICATION,
				format: zodOutputFormat(lotClasseSchema)
			},
			messages: [
				{
					role: 'user',
					content: `Classe les ${args.libelles.length} libellés suivants, un par ligne :\n\n${args.libelles.join('\n')}`
				}
			]
		})
	);

	if (response.stop_reason === 'refusal') {
		throw new Error('Claude a refusé de classer ce lot (stop_reason: refusal).');
	}
	if (response.stop_reason === 'max_tokens') {
		throw new Error(
			`Réponse tronquée : le lot dépasse le budget de ${MAX_TOKENS} tokens de sortie.`
		);
	}

	const blocTexte = response.content.find(
		(bloc): bloc is Anthropic.TextBlock => bloc.type === 'text'
	);
	if (!blocTexte) {
		throw new Error('Réponse Claude sans bloc texte exploitable.');
	}

	let jsonBrut: unknown;
	try {
		jsonBrut = JSON.parse(blocTexte.text);
	} catch {
		throw new Error('La réponse de Claude n’est pas un JSON valide.');
	}

	const lot = lotClasseSchema.parse(jsonBrut);

	return {
		classifications: lot.classifications,
		usage: {
			tokensIn: response.usage.input_tokens,
			tokensOut: response.usage.output_tokens,
			cacheReadTokens: response.usage.cache_read_input_tokens ?? 0
		}
	};
}
