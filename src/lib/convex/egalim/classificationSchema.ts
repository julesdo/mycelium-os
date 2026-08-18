import { z } from 'zod';
import { FAMILLES, LABELS } from '../../egalim/types';

/**
 * Le contrat de sortie de la classification. Il ne demande NI `isBio` NI
 * `isDurable` : le modèle relève ce que le libellé établit, le barème conclut
 * (voir `verdict.ts`).
 */
export const classificationSchema = z.object({
	normalizedLabel: z
		.string()
		.describe(
			'Le libellé reçu, recopié À L’IDENTIQUE. Seule clé de rapprochement — ne pas le corriger.'
		),
	isFood: z
		.boolean()
		.describe(
			'false pour les frais de port, consignes, emballages, produits d’entretien et petit équipement.'
		),
	family: z.enum(FAMILLES),
	qualifyingLabels: z
		.array(z.enum(LABELS))
		.describe('Vide si le libellé n’établit aucun label du barème.'),
	justification: z.string().describe('Une phrase en français citant ce qui fonde la décision.'),
	// Volontairement SANS borne dans le schéma : une confiance légèrement hors
	// bornes ferait échouer le `parse()` du lot entier, soit 50 libellés perdus
	// pour un chiffre à 1.02. La valeur est bornée côté code, à la lecture.
	confidence: z.number().describe('Entre 0 et 1.')
});

export const lotClasseSchema = z.object({
	classifications: z.array(classificationSchema)
});

export type ClassificationClaude = z.infer<typeof classificationSchema>;
export type LotClasse = z.infer<typeof lotClasseSchema>;
