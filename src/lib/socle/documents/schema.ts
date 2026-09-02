import { z } from 'zod';

/**
 * La part d'une facture qui ne dépend d'aucun domaine.
 *
 * CE QUI EST ICI, ET POURQUOI. Une ligne de facture et un pied de facture ont
 * la même forme qu'on achète ou qu'on vende : un libellé, une quantité, un
 * montant, un taux de TVA ; puis un total et des bases de TVA. Ces champs
 * n'appellent aucune décision métier, et les dupliquer par verticale les ferait
 * diverger sans raison.
 *
 * CE QUI N'Y EST PAS. L'EN-TÊTE. Il désigne la CONTREPARTIE, et c'est
 * précisément là que les deux verticales cessent de se ressembler :
 *
 *   · sur une facture d'ACHAT, la contrepartie est le fournisseur qui l'a
 *     émise — c'est lui qu'EGalim doit rattacher à ses attestations ;
 *   · sur une facture de VENTE, l'émetteur est le créancier lui-même, et la
 *     contrepartie est le CLIENT — c'est-à-dire le débiteur, seule partie qui
 *     intéresse le recouvrement, et qui n'apparaît dans aucun champ du schéma
 *     d'achat.
 *
 * Chaque verticale étend donc la base avec l'en-tête qu'elle sait lire.
 */

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

export const totauxSchema = z.object({
	totalHT: z.number().nullable(),
	basesParTaux: z
		.array(z.object({ taux: z.number(), baseHT: z.number() }))
		.describe('Bases de TVA par taux, telles qu’imprimées en pied de facture.')
});

/**
 * Les champs communs, exposés séparément pour qu'une verticale les compose avec
 * son en-tête via `z.object({ ...champsCommunsDocument, ... })`.
 */
export const champsCommunsDocument = {
	lignes: z.array(ligneExtraiteSchema),
	totaux: totauxSchema,
	illisible: z
		.boolean()
		.describe(
			'true si le document n’est pas exploitable : trop flou, tronqué, ou ce n’est pas une facture.'
		),
	raisonIllisible: z.string().nullable()
} as const;

export const documentExtraitBaseSchema = z.object(champsCommunsDocument);

export type LigneExtraite = z.infer<typeof ligneExtraiteSchema>;
export type Totaux = z.infer<typeof totauxSchema>;
export type DocumentExtraitBase = z.infer<typeof documentExtraitBaseSchema>;
