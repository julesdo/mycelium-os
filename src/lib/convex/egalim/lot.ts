import type { MutationCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';

/**
 * L'état d'un lot, recompté depuis ses lignes.
 *
 * POURQUOI CETTE FONCTION EXISTE, et ce qu'elle a coûté avant d'exister.
 * `labelsPendingReview` était écrit UNE fois, à la clôture de la
 * classification, et plus jamais. Confirmer un produit mettait bien ses lignes
 * à jour, mais laissait le compteur du lot à sa valeur d'origine. Trois écrans
 * en dépendaient, et la chaîne entière s'arrêtait là :
 *
 *   - le dépôt annonçait « vos factures précédentes attendent vos
 *     confirmations » devant une file vide, et refusait tout nouveau fichier ;
 *   - le lot restait en `REVIEW`, donc `produireDiagnostic` refusait de figer
 *     la mesure — le gérant ne pouvait jamais obtenir son diagnostic ;
 *   - le tableau de bord comptait des produits en attente qui n'existaient plus.
 *
 * La règle qui en découle, et qui vaut pour tout le domaine : **un compteur
 * dérivable ne se mémorise pas de travers.** Il se recompte à chaque écriture
 * qui peut le changer, et les lectures qui décident quelque chose d'important
 * ne lui font de toute façon pas confiance.
 *
 * La fonction ne planifie RIEN. La production automatique du diagnostic
 * appartient à l'arbitrage, pas au recomptage : appeler cette fonction pour
 * réparer un état ne doit pas produire de livrable en effet de bord.
 */
export async function recompterLot(
	ctx: MutationCtx,
	batchId: Id<'invoiceBatches'>
): Promise<{ restants: number; status: 'REVIEW' | 'READY' } | null> {
	const batch = await ctx.db.get(batchId);
	if (!batch) return null;

	// Seuls les deux états où l'arbitrage a un sens. Un lot en extraction ou en
	// classification n'a pas encore de file : y lire « prêt » parce qu'elle est
	// vide annoncerait un diagnostic disponible au milieu du traitement.
	if (batch.status !== 'REVIEW' && batch.status !== 'READY') return null;

	const enAttente = await ctx.db
		.query('invoiceLines')
		.withIndex('by_batch_and_review', (q) =>
			q.eq('batchId', batchId).eq('reviewStatus', 'PENDING_REVIEW')
		)
		.collect();

	// En libellés distincts, comme au moment de la clôture : c'est l'unité de
	// travail du gérant, et la même que celle qu'affiche la file.
	const restants = new Set(enAttente.map((l) => l.normalizedLabel)).size;
	const status = restants > 0 ? ('REVIEW' as const) : ('READY' as const);

	if (batch.labelsPendingReview !== restants || batch.status !== status) {
		await ctx.db.patch(batchId, { labelsPendingReview: restants, status });
	}

	return { restants, status };
}
