import { v, ConvexError } from 'convex/values';
import { authedMutation } from '../functions';
import { getUserOrg } from '../lib/auth';

/**
 * Les demandes d'attestation fournisseur.
 *
 * Une ligne d'achat dont le libellé annonce « bio » sans certificat au dossier
 * n'est pas défendable en contrôle : elle est mesurée comme qualifiante « à
 * justifier », et elle ne le restera pas indéfiniment. Le courrier de demande
 * au fournisseur est le geste qui la transforme en preuve.
 *
 * C'est le point du produit qui rapporte le plus vite : trois à huit points de
 * ratio récupérés sans changer un seul achat, simplement en réclamant les
 * certificats qu'on a le droit d'exiger.
 *
 * Le suivi est délibérément pauvre : brouillon, envoyée, reçue, refusée. On ne
 * relance pas à la place du gérant, on ne devine pas une date de réponse, et on
 * n'invente aucun statut intermédiaire. Chaque état correspond à un fait qu'il
 * constate.
 */

const vStatut = v.union(
	v.literal('DRAFT'),
	v.literal('SENT'),
	v.literal('RECEIVED'),
	v.literal('REFUSED')
);

/**
 * Change l'état d'une demande.
 *
 * Le passage à `RECEIVED` ne reclasse RIEN tout seul : recevoir un certificat
 * ne dit pas quelles lignes il couvre, et un diagnostic remis est figé de toute
 * façon. Le gérant confirme les libellés concernés dans sa file, comme pour le
 * reste. C'est plus lent, et c'est la seule façon que la mesure reste la sienne.
 */
export const changerStatut = authedMutation({
	args: {
		attestationId: v.id('attestationRequests'),
		statut: vStatut
	},
	returns: v.null(),
	handler: async (ctx, { attestationId, statut }) => {
		const { organizationId } = await getUserOrg(ctx);
		const demande = await ctx.db.get(attestationId);
		if (!demande || demande.organizationId !== organizationId) {
			throw new ConvexError('Demande introuvable');
		}
		if (demande.status === statut) return null;

		await ctx.db.patch(attestationId, {
			status: statut,
			...(statut === 'SENT' ? { sentAt: Date.now() } : {})
		});
		return null;
	}
});
