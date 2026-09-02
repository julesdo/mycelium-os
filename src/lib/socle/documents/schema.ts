import { z } from 'zod';

export const ligneExtraiteSchema = z.object({
	rawLabel: z
		.string()
		.describe(
			'Le libellé du produit tel qu’il apparaît, y compris toute mention de label figurant sur une ligne de continuation rattachée à ce produit.'
		),
	quantity: z.number().nullable(),
	unit: z.string().nullable(),
	unitPrice: z.number().nullable(),
	amountHT: z
		.number()
		.describe('Montant HT de la ligne. NÉGATIF pour un avoir, une remise ou un rabais.'),
	vatRate: z
		.number()
		.nullable()
		.describe('Taux de TVA de la ligne en pourcentage (5.5, 10, 20). null si absent.')
});

export const documentExtraitSchema = z.object({
	supplierName: z.string().nullable(),
	invoiceNumber: z.string().nullable(),
	invoiceDate: z.string().nullable().describe('Format AAAA-MM-JJ.'),
	lignes: z.array(ligneExtraiteSchema),
	totaux: z.object({
		totalHT: z.number().nullable(),
		basesParTaux: z
			.array(z.object({ taux: z.number(), baseHT: z.number() }))
			.describe('Bases de TVA par taux, telles qu’imprimées en pied de facture.')
	}),
	illisible: z
		.boolean()
		.describe(
			'true si le document n’est pas exploitable : trop flou, tronqué, ou ce n’est pas une facture.'
		),
	raisonIllisible: z.string().nullable()
});

export type LigneExtraite = z.infer<typeof ligneExtraiteSchema>;
export type DocumentExtrait = z.infer<typeof documentExtraitSchema>;
