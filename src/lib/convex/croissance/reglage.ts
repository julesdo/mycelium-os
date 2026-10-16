import { v, ConvexError } from 'convex/values';
import { authedMutation, authedQuery } from '../functions';
import { getUserOrg } from '../lib/auth';

/**
 * LES CONSEILS DE PLUME, PAR E-MAIL OU NON — un réglage de la personne, comme le
 * point du matin (`recouvrement/briefing.ts`). Le lien de chaque conseil fait la
 * même chose en un clic (`croissance/conseils.ts`).
 */
export const mesConseils = authedQuery({
	args: {},
	returns: v.boolean(),
	handler: async (ctx): Promise<boolean> => {
		const { organizationId, user } = await getUserOrg(ctx);
		const membre = await ctx.db
			.query('organizationMembers')
			.withIndex('by_org_and_user', (q) =>
				q.eq('organizationId', organizationId).eq('userId', user._id)
			)
			.first();
		return membre?.conseilsParCourriel !== false;
	}
});

export const reglerMesConseils = authedMutation({
	args: { parCourriel: v.boolean() },
	returns: v.null(),
	handler: async (ctx, { parCourriel }): Promise<null> => {
		const { organizationId, user } = await getUserOrg(ctx);
		const membre = await ctx.db
			.query('organizationMembers')
			.withIndex('by_org_and_user', (q) =>
				q.eq('organizationId', organizationId).eq('userId', user._id)
			)
			.first();
		if (membre === null) throw new ConvexError('Vous n’êtes pas membre de cet établissement.');
		await ctx.db.patch(membre._id, { conseilsParCourriel: parCourriel });
		return null;
	}
});
