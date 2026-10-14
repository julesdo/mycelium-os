import type { QueryCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';

/**
 * Les clients en retard que le pilote suit, dans l'ordre où leur premier
 * dossier ouvert est arrivé : dossier ni classé, ni confié à un professionnel,
 * démarré par le gérant, client pas retiré du pilote.
 */
export async function debiteursSuivis(
	ctx: Pick<QueryCtx, 'db'>,
	organizationId: Id<'organizations'>
): Promise<Id<'debiteurs'>[]> {
	const creances = await ctx.db
		.query('creances')
		.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
		.collect();
	const ouvertes = creances
		.filter((c) => c.statut !== 'CLOSE' && c.engageeLe === undefined && c.aDemarrer !== true)
		.sort((a, b) => a._creationTime - b._creationTime);
	const suivis: Id<'debiteurs'>[] = [];
	for (const creance of ouvertes) {
		if (suivis.includes(creance.debiteurId)) continue;
		const debiteur = await ctx.db.get(creance.debiteurId);
		if (debiteur === null || debiteur.horsPilote === true) continue;
		suivis.push(creance.debiteurId);
	}
	return suivis;
}
