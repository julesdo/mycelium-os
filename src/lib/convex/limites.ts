import { ConvexError, v } from 'convex/values';
import { internalQuery, type QueryCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { resolveEffectivePlan } from './billing';
import { GRILLE, limitesDe, type Limites, type PlanTier } from '../config/tarifs';

/**
 * LES LIMITES D'UNE FORMULE, APPLIQUÉES AU POINT D'USAGE (14/10/2026).
 *
 * La grille (`config/tarifs.ts`) déclare ce que chaque palier ouvre ; ce module
 * le fait respecter là où ça se joue :
 *
 *   · AGIR : Découverte mesure, rien ne part. Le pilote ne programme rien, et
 *     un courrier ne se prépare pas (`envois.preparer`, `preparerEnLot`, le
 *     « Relancer » de Plume) ;
 *   · LES CLIENTS SUIVIS : le pilote relance les N premiers clients en retard
 *     dont le dossier est démarré, dans l'ordre où ils sont arrivés ; les
 *     suivants sont MESURÉS, et leurs relances attendent la formule du dessus ;
 *   · LES ANALYSES de santé client, par mois (`risque/donnees.ts`) ;
 *   · LES LOGICIELS : Qonto pour Solo et Découverte, tous au-delà (`connexions/nango.ts`) ;
 *   · LES UTILISATEURS : `assertSeatAvailable` (`billing.ts`).
 *
 * ⚠️ RIEN N'EST EFFACÉ NI CACHÉ. Une limite atteinte arrête ce qui PART, jamais
 * ce qui se LIT : les factures, les calculs et les dossiers restent là.
 */

export async function limitesDeLOrganisation(
	ctx: Pick<QueryCtx, 'db'>,
	organizationId: Id<'organizations'>
): Promise<Limites & { tier: PlanTier }> {
	const org = await ctx.db.get(organizationId);
	const tier: PlanTier = org === null ? 'none' : resolveEffectivePlan(org).tier;
	return { ...limitesDe(tier), tier };
}

/** Le refus quand Découverte voudrait faire partir quelque chose. */
export const REFUS_SANS_FORMULE =
	'Les courriers et les relances partent avec une formule : Compte, puis Abonnement. Trente jours d’essai, 0 € aujourd’hui.';

export async function exigerDeQuoiAgir(
	ctx: Pick<QueryCtx, 'db'>,
	organizationId: Id<'organizations'>
): Promise<void> {
	const { agir } = await limitesDeLOrganisation(ctx, organizationId);
	if (!agir) throw new ConvexError(REFUS_SANS_FORMULE);
}

// Le compte des clients suivis vit à part (`suivis.ts`) : `billing.ts` le lit
// aussi, et ce module-ci lit `billing.ts`.
export { debiteursSuivis } from './suivis';

/** Ce qui se dit quand la limite des clients suivis est atteinte. */
export function messageDeLimiteAtteinte(tier: PlanTier, limite: number): string {
	const nom =
		tier === 'solo' || tier === 'equipe' || tier === 'pro' ? GRILLE[tier].nom : 'votre formule';
	return `Vous suivez ${limite} clients en retard, le maximum de ${nom}. Les suivants sont mesurés ; leurs relances attendent la formule du dessus (Compte, puis Abonnement).`;
}

/** Les limites, pour une action (qui n'a pas de base). */
export const _limitesInterne = internalQuery({
	args: { organizationId: v.id('organizations') },
	handler: async (ctx, { organizationId }): Promise<Limites & { tier: PlanTier }> =>
		limitesDeLOrganisation(ctx, organizationId)
});
