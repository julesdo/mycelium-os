import type { Doc, Id } from '../_generated/dataModel';
import type { QueryCtx } from '../_generated/server';
import { additionner, enCentimes } from '../../socle/montants';
import { resteDu } from './lecture';

/**
 * LES DOSSIERS QUE PLUME PROPOSE DE DÉMARRER : préparés, ni classés ni soldés.
 *
 * ⚠️ UN DOSSIER SOLDÉ GARDE \`aDemarrer\` (audit des parcours Pro du 27/10/2026). Arnaud,
 * réglé de ses 4 812,40 €, restait parmi les démarrages proposés. Effacer le drapeau
 * l'aurait fait passer pour DÉMARRÉ : un règlement annulé ensuite l'aurait livré au
 * pilote sans que le gérant l'ait jamais démarré (ligne rouge n° 1). Le drapeau reste
 * en base ; c'est la proposition qui s'en va, ici, pour tous les écrans qui la comptent.
 *
 * Un dossier sans facture reste proposé : rien ne dit qu'il est réglé.
 */
export async function dossiersPrepares(
	ctx: QueryCtx,
	organizationId: Id<'organizations'>
): Promise<
	{
		readonly creance: Doc<'creances'>;
		readonly factures: readonly Doc<'facturesVente'>[];
		readonly restantDu: bigint;
	}[]
> {
	const prepares = await ctx.db
		.query('creances')
		.withIndex('by_org_and_aDemarrer', (q) =>
			q.eq('organizationId', organizationId).eq('aDemarrer', true)
		)
		.take(500);
	const resultat = [];
	for (const creance of prepares) {
		if (creance.statut === 'CLOSE') continue;
		const factures = await ctx.db
			.query('facturesVente')
			.withIndex('by_creance', (q) => q.eq('creanceId', creance._id))
			.collect();
		const restantDu = enCentimes(
			additionner(...(await Promise.all(factures.map((f) => resteDu(ctx, f)))))
		);
		if (factures.length > 0 && restantDu <= 0n) continue;
		resultat.push({ creance, factures, restantDu });
	}
	return resultat;
}
