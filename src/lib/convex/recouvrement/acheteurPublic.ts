import { v, ConvexError } from 'convex/values';
import { internalAction, internalMutation } from '../_generated/server';
import { internal } from '../_generated/api';
import { authedMutation } from '../functions';
import { getUserOrg } from '../lib/auth';

/**
 * LE CLIENT PUBLIC (19/10/2026, lot 1 bis) : un hôpital, une commune, une université ne
 * paient pas au barème commercial. Leur catégorie juridique se lit au registre des
 * entreprises par leur SIREN (le BODACC ne connaît ni les hôpitaux ni les communes) ;
 * le barème s'en déduit (`commande-publique.baremeDuDebiteur`) ; et le gérant peut le
 * corriger, parce que c'est une qualification, pas une déduction cachée.
 */

const BASE_RECHERCHE_ENTREPRISES = 'https://recherche-entreprises.api.gouv.fr/search';

const vQualification = v.union(
	v.literal('POUVOIR_ADJUDICATEUR'),
	v.literal('SANTE'),
	v.literal('ENTREPRISE_PUBLIQUE'),
	v.literal('PRIVE')
);

/**
 * La catégorie juridique d'un SIREN au registre. Rien ne s'écrit si le registre ne
 * répond pas ou rend une autre entreprise : on ne range pas un client sur une réponse
 * douteuse, on le laisse au gérant.
 */
export const releverCategorieJuridique = internalAction({
	args: { debiteurId: v.id('debiteurs'), siren: v.string() },
	returns: v.null(),
	// ⚠️ ANNOTATION DE RETOUR OBLIGATOIRE : l'action appelle son propre module.
	handler: async (ctx, { debiteurId, siren }): Promise<null> => {
		try {
			const reponse = await fetch(
				`${BASE_RECHERCHE_ENTREPRISES}?q=${encodeURIComponent(siren)}&page=1&per_page=1`
			);
			if (!reponse.ok) return null;
			const charge = (await reponse.json()) as { results?: unknown };
			const premier = Array.isArray(charge.results) ? charge.results[0] : undefined;
			if (typeof premier !== 'object' || premier === null) return null;
			const fiche = premier as { siren?: unknown; nature_juridique?: unknown };
			if (fiche.siren !== siren || typeof fiche.nature_juridique !== 'string') return null;
			await ctx.runMutation(internal.recouvrement.acheteurPublic.noterCategorieJuridique, {
				debiteurId,
				siren,
				categorieJuridique: fiche.nature_juridique
			});
		} catch {
			// Le registre injoignable : rien de faux n'est écrit, le gérant qualifie.
		}
		return null;
	}
});

export const noterCategorieJuridique = internalMutation({
	args: { debiteurId: v.id('debiteurs'), siren: v.string(), categorieJuridique: v.string() },
	returns: v.null(),
	handler: async (ctx, { debiteurId, siren, categorieJuridique }): Promise<null> => {
		const debiteur = await ctx.db.get(debiteurId);
		// Le SIREN a pu changer pendant la lecture : la catégorie d'un autre numéro ne
		// décrit pas ce client.
		if (debiteur === null || debiteur.siren !== siren) return null;
		const code = categorieJuridique.trim();
		if (!/^\d{4}$/.test(code)) return null;
		await ctx.db.patch(debiteurId, { categorieJuridique: code });
		return null;
	}
});

/** Le gérant qualifie son client : une catégorie d'acheteur public, « privé », ou rien. */
export const qualifierAcheteur = authedMutation({
	args: { debiteurId: v.id('debiteurs'), qualification: v.union(vQualification, v.null()) },
	returns: v.null(),
	handler: async (ctx, { debiteurId, qualification }): Promise<null> => {
		const { organizationId } = await getUserOrg(ctx);
		const debiteur = await ctx.db.get(debiteurId);
		if (debiteur === null || debiteur.organizationId !== organizationId) {
			throw new ConvexError('Client introuvable.');
		}
		await ctx.db.patch(debiteurId, {
			acheteurPublic: qualification === null ? undefined : qualification
		});
		return null;
	}
});
