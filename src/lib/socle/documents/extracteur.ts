'use node';

import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { ZodType } from 'zod';
import { avecReprise } from '../modele/reprise';
import { ErreurAppelClaude } from '../modele/cout';

/**
 * L'extracteur universel : PDF, image, photo, texte brut OCR — tout ce que le
 * parseur CSV déterministe (`csv.ts`) ne peut pas lire. Un parseur par forme
 * ne survit pas à la diversité des émetteurs ; celui-ci ne décrit aucune
 * disposition et rend une sortie que le schéma valide avant qu'on fasse
 * confiance à quoi que ce soit.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LE SCHÉMA ET LE PROMPT SONT INJECTÉS — L'ABSTRACTION EST VENUE DU SECOND CAS
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Ils étaient codés en dur ici tant qu'une seule verticale existait, et
 * décrivaient une facture d'ACHAT : `supplierName`, « facture fournisseur de
 * restauration collective ». L'audit l'avait relevé comme une fuite du domaine
 * dans le socle, sans qu'il y ait alors de quoi la corriger utilement.
 *
 * Le recouvrement a fourni le second exemple, et il tranche : sur une facture
 * de VENTE, l'émetteur est le créancier lui-même, et le débiteur — la seule
 * partie qui nous intéresse — ne figure dans aucun champ du schéma d'achat.
 * Les deux formes diffèrent réellement.
 *
 * Ce qui reste ici est la MACHINERIE, et elle est identique dans les deux cas :
 * découpage du contenu, blocs image, point de coupure de cache, relance ciblée,
 * validation, et transport de l'usage facturé jusque dans les erreurs. Chaque
 * verticale apporte ce qu'elle veut lire.
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
function construireSysteme(prompt: string): Anthropic.TextBlockParam[] {
	return [
		{
			type: 'text',
			text: prompt,
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
 * Extrait un document via Claude, selon le schéma que la verticale fournit.
 *
 * `messageRelance` porte l'écart constaté au tour précédent, pour une relance
 * ciblée plutôt qu'une répétition aveugle de la même requête.
 *
 * Le prompt doit être DÉTERMINISTE — même texte, octet pour octet, d'un appel à
 * l'autre. Il part avec `cache_control: ephemeral`, et le cache ne sert que
 * sur un préfixe identique : une variation multiplie le coût par document sans
 * qu'aucun test ne tombe.
 */
export async function extraireAvecClaude<T>(args: {
	contenu: ContenuDocument;
	/** Ce que la verticale veut lire. Valide la réponse avant tout usage. */
	schema: ZodType<T>;
	/** Le prompt système de la verticale. Déterministe, obligatoirement. */
	prompt: string;
	messageRelance?: string;
}): Promise<{ doc: T; usage: UsageExtraction }> {
	const client = new Anthropic({ maxRetries: 0 });

	const response = await avecReprise(() =>
		client.messages.create({
			model: MODELE_EXTRACTION,
			max_tokens: MAX_TOKENS,
			system: construireSysteme(args.prompt),
			// effort bas : lire un tableau n'est pas un raisonnement profond.
			// Le thinking reste actif par défaut — ne pas le désactiver, sous
			// peine de laisser Opus 5 fuir des balises <thinking> dans la sortie.
			// Aucun paramètre d'échantillonnage : temperature/top_p/top_k
			// renvoient tous une 400 sur Opus 5.
			output_config: {
				effort: 'low',
				format: zodOutputFormat(args.schema)
			},
			messages: [
				{
					role: 'user',
					content: construireBlocsContenu(args.contenu, args.messageRelance)
				}
			]
		})
	);

	// Capture AVANT toute cause d'echec : l'appel a ete emis, donc facture.
	// L'erreur le transportera jusqu'au comptable de couts.
	const usage = {
		tokensIn: response.usage.input_tokens,
		tokensOut: response.usage.output_tokens,
		cacheReadTokens: response.usage.cache_read_input_tokens ?? 0
	};

	if (response.stop_reason === 'refusal') {
		throw new ErreurAppelClaude('Claude a refusé d’extraire ce document (stop_reason: refusal).', usage);
	}
	if (response.stop_reason === 'max_tokens') {
		throw new ErreurAppelClaude(`Réponse tronquée : la facture dépasse le budget de ${MAX_TOKENS} tokens de sortie.`, usage);
	}

	const blocTexte = response.content.find(
		(bloc): bloc is Anthropic.TextBlock => bloc.type === 'text'
	);
	if (!blocTexte) {
		throw new ErreurAppelClaude('Réponse Claude sans bloc texte exploitable.', usage);
	}

	let jsonBrut: unknown;
	try {
		jsonBrut = JSON.parse(blocTexte.text);
	} catch {
		throw new ErreurAppelClaude('La réponse de Claude n’est pas un JSON valide.', usage);
	}

	// Une réponse non conforme au schéma est une erreur, pas une donnée à
	// rattraper : documentExtraitSchema.parse() lève si ce n'est pas conforme.
	let doc: T;
	try {
		doc = args.schema.parse(jsonBrut);
	} catch {
		// L'appel a bien été facturé : son usage doit remonter au plafond.
		throw new ErreurAppelClaude(
			'Réponse de Claude non conforme au schéma d’extraction.',
			usage
		);
	}

	return {
		doc,
		usage
	};
}
