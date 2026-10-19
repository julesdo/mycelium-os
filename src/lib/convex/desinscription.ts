import { v } from 'convex/values';
import { mutation } from './_generated/server';
import { arreterLeProspect } from './admin/prospects';

/**
 * LA DÉSINSCRIPTION D'UN PROSPECT, DEPUIS LE LIEN DE SES E-MAILS (19/10/2026).
 *
 * La CNIL demande qu'on puisse s'opposer simplement à la prospection : un clic sur le
 * lien du pied (`crm/consentement.piedLegal`), puis un bouton sur la page
 * `/desinscription/<jeton>`. La page ne montre rien du prospect ; c'est ce POST qui
 * désinscrit, comme « Stop » sur sa fiche (`arreterLeProspect`).
 *
 * ⚠️ LA MÊME RÉPONSE POUR UN JETON INCONNU, DÉJÀ UTILISÉ OU VALIDE : rien ne permet de
 * savoir, de l'extérieur, si une adresse figure dans notre fichier. Le jeton est un
 * `crypto.randomUUID()` ; c'est lui la serrure, et il ne sert qu'à ça.
 */
export const seDesinscrire = mutation({
	args: { jeton: v.string() },
	returns: v.null(),
	handler: async (ctx, { jeton }): Promise<null> => {
		const propre = jeton.trim().slice(0, 100);
		if (propre === '') return null;
		const p = await ctx.db
			.query('prospects')
			.withIndex('by_jeton_desinscription', (q) => q.eq('jetonDesinscription', propre))
			.unique();
		if (p === null || p.statut === 'STOP') return null;
		await ctx.db.patch(p._id, { dernierContactDuProspectLe: Date.now() });
		await arreterLeProspect(ctx, p, 'lien de désinscription');
		return null;
	}
});
