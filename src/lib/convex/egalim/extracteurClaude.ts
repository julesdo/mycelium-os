'use node';

import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { documentExtraitSchema, type DocumentExtrait } from './extractionSchema';
import { construirePromptExtraction } from './promptExtraction';
import { avecReprise } from './reprise';

/**
 * L'extracteur Claude universel : PDF, image, photo, texte brut OCR — tout ce
 * que le parseur CSV déterministe (`parsers/csv.ts`) ne peut pas lire. Un
 * parseur par forme ne survit pas à la diversité des fournisseurs ; celui-ci
 * ne décrit aucune disposition (voir `promptExtraction.ts`) et rend une
 * sortie typée que `documentExtraitSchema` valide avant de faire confiance à
 * quoi que ce soit.
 */

const MODELE_EXTRACTION = 'claude-opus-5';
const MAX_TOKENS = 16_000;

const TYPES_IMAGE_ACCEPTES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
type TypeImageAccepte = (typeof TYPES_IMAGE_ACCEPTES)[number];

export interface ContenuTexte {
	type: 'texte';
	texte: string;
}

export interface ContenuImages {
	type: 'images';
	images: Array<{ mediaType: string; base64: string }>;
}

export type ContenuDocument = ContenuTexte | ContenuImages;

export interface UsageExtraction {
	tokensIn: number;
	tokensOut: number;
	cacheReadTokens: number;
}

/**
 * Le bloc système, seul porteur du prompt d'extraction, avec son point de
 * coupure de cache. Le contenu du document part toujours dans `messages`,
 * après ce point — jamais avant, sous peine de réécrire le cache à chaque
 * appel au lieu de le lire (voir `promptExtraction.ts` pour le déterminisme
 * du texte lui-même).
 */
function construireSysteme(): Anthropic.TextBlockParam[] {
	return [
		{
			type: 'text',
			text: construirePromptExtraction(),
			cache_control: { type: 'ephemeral' }
		}
	];
}

/**
 * L'API vision de Claude n'accepte que 4 types MIME d'image. `mediaType` nous
 * arrive en `string` (le type de la photo n'est connu qu'à l'exécution) ; on
 * le vérifie donc ici plutôt que de le caster à l'aveugle.
 */
function validerTypeImage(mediaType: string): TypeImageAccepte {
	if ((TYPES_IMAGE_ACCEPTES as readonly string[]).includes(mediaType)) {
		// Vérifié juste au-dessus : mediaType est bien l'un des types acceptés.
		return mediaType as TypeImageAccepte;
	}
	throw new Error(
		`Type d'image non supporté par Claude : "${mediaType}". Types acceptés : ${TYPES_IMAGE_ACCEPTES.join(', ')}.`
	);
}

function construireBlocsContenu(
	contenu: ContenuDocument,
	messageRelance: string | undefined
): Anthropic.ContentBlockParam[] {
	const blocs: Anthropic.ContentBlockParam[] = [];

	if (messageRelance) {
		blocs.push({
			type: 'text',
			text: `RELANCE — écart constaté sur ta précédente extraction de ce document :\n${messageRelance}`
		});
	}

	if (contenu.type === 'texte') {
		blocs.push({ type: 'text', text: contenu.texte });
	} else {
		for (const image of contenu.images) {
			blocs.push({
				type: 'image',
				source: {
					type: 'base64',
					media_type: validerTypeImage(image.mediaType),
					data: image.base64
				}
			});
		}
	}

	return blocs;
}

/**
 * Extrait les lignes d'une facture via Claude. `messageRelance` porte l'écart
 * constaté par `verifierExtraction` au tour précédent, pour une relance
 * ciblée plutôt qu'une répétition aveugle de la même requête.
 */
export async function extraireAvecClaude(args: {
	contenu: ContenuDocument;
	messageRelance?: string;
}): Promise<{ doc: DocumentExtrait; usage: UsageExtraction }> {
	const client = new Anthropic({ maxRetries: 0 });

	const response = await avecReprise(() =>
		client.messages.create({
			model: MODELE_EXTRACTION,
			max_tokens: MAX_TOKENS,
			system: construireSysteme(),
			// effort bas : lire un tableau n'est pas un raisonnement profond.
			// Le thinking reste actif par défaut — ne pas le désactiver, sous
			// peine de laisser Opus 5 fuir des balises <thinking> dans la sortie.
			// Aucun paramètre d'échantillonnage : temperature/top_p/top_k
			// renvoient tous une 400 sur Opus 5.
			output_config: {
				effort: 'low',
				format: zodOutputFormat(documentExtraitSchema)
			},
			messages: [
				{
					role: 'user',
					content: construireBlocsContenu(args.contenu, args.messageRelance)
				}
			]
		})
	);

	if (response.stop_reason === 'refusal') {
		throw new Error('Claude a refusé d’extraire ce document (stop_reason: refusal).');
	}
	if (response.stop_reason === 'max_tokens') {
		throw new Error(
			`Réponse tronquée : la facture dépasse le budget de ${MAX_TOKENS} tokens de sortie.`
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

	// Une réponse non conforme au schéma est une erreur, pas une donnée à
	// rattraper : documentExtraitSchema.parse() lève si ce n'est pas conforme.
	const doc = documentExtraitSchema.parse(jsonBrut);

	return {
		doc,
		usage: {
			tokensIn: response.usage.input_tokens,
			tokensOut: response.usage.output_tokens,
			cacheReadTokens: response.usage.cache_read_input_tokens ?? 0
		}
	};
}
