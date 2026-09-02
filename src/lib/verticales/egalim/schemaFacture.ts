import { z } from 'zod';
import { champsCommunsDocument } from '../../socle/documents/schema';

/**
 * Ce qu'EGalim lit d'une facture d'ACHAT, en plus des champs communs.
 *
 * L'en-tête désigne la CONTREPARTIE, et pour une facture d'achat c'est le
 * fournisseur qui l'a émise. Il ne sert pas qu'à ranger : c'est lui qu'on
 * rattache aux demandes d'attestation, et c'est sur son nom normalisé que se
 * fait le dédoublonnage de documents.
 */
export const documentExtraitSchema = z.object({
	supplierName: z.string().nullable(),
	invoiceNumber: z.string().nullable(),
	invoiceDate: z.string().nullable().describe('Format AAAA-MM-JJ.'),
	...champsCommunsDocument
});

export type DocumentExtrait = z.infer<typeof documentExtraitSchema>;
