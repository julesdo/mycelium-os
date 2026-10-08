import { v } from 'convex/values';
import type { MutationCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';
import { authedQuery } from '../functions';
import { getUserOrg } from '../lib/auth';
import { pauseDuDossier } from './plan';

/**
 * LA PAROLE DU CLIENT, LUE DANS LA BASE — voir `verticales/recouvrement/parole.ts`.
 *
 * La page d'un dossier dit si le plan se tait et pourquoi ; et quand le client
 * donne sa parole, la relance que le pilote avait programmée ne part pas.
 */

const vPause = v.object({
	jusquAu: v.string(),
	raison: v.union(v.literal('PROMESSE'), v.literal('ECHEANCIER')),
	le: v.string(),
	montant: v.optional(v.int64())
});

/** Ce que le client a dit, sur un dossier : la pause du plan, et la promesse en cours. */
export const duDossier = authedQuery({
	args: { creanceId: v.id('creances') },
	returns: v.union(
		v.null(),
		v.object({
			pause: v.union(v.null(), vPause)
		})
	),
	handler: async (ctx, { creanceId }) => {
		const { organizationId } = await getUserOrg(ctx);
		const creance = await ctx.db.get(creanceId);
		if (creance === null || creance.organizationId !== organizationId) return null;
		const factures = await ctx.db
			.query('facturesVente')
			.withIndex('by_creance', (q) => q.eq('creanceId', creanceId))
			.collect();
		const aujourdHui = new Date().toISOString().slice(0, 10);
		return { pause: await pauseDuDossier(ctx, creanceId, factures, aujourdHui) };
	}
});

/**
 * APRÈS UNE PAROLE DU CLIENT — une promesse notée, un échéancier convenu.
 *
 * ⚠️ LA RELANCE QUE LE PILOTE A PROGRAMMÉE NE PART PAS. Elle partait dans
 * l'heure, écrite avant que le client donne sa parole : elle est abandonnée, et
 * le plan la reprogrammera seul si la parole n'est pas tenue. Un courrier
 * préparé par le gérant n'est pas touché : c'est le sien.
 */
export async function apresUneParole(ctx: MutationCtx, creanceId: Id<'creances'>): Promise<void> {
	const envois = await ctx.db
		.query('envois')
		.withIndex('by_creance', (q) => q.eq('creanceId', creanceId))
		.collect();
	for (const envoi of envois) {
		if (envoi.etat !== 'PROGRAMME' || envoi.preparePar !== 'pilote') continue;
		if (envoi.envoiProgramme !== undefined) await ctx.scheduler.cancel(envoi.envoiProgramme);
		await ctx.db.patch(envoi._id, { etat: 'ABANDONNE', envoiProgramme: undefined });
	}
}
