import { v } from 'convex/values';
import { internalQuery } from '../_generated/server';
import { lireLEquipier, type Equipier } from './enveloppe';
import { vRoleEquipe } from './tables';

/**
 * L'ÉQUIPIER DE LA SESSION, POUR UNE ACTION (16/10/2026). Une action n'a pas de base :
 * elle demande ici, avec la même identité, le même verdict que `equipeQuery`.
 */
export const equipierCourant = internalQuery({
	args: { roleMin: vRoleEquipe },
	returns: v.object({
		email: v.string(),
		role: vRoleEquipe,
		userId: v.string(),
		nom: v.string()
	}),
	handler: async (ctx, { roleMin }): Promise<Equipier> => lireLEquipier(ctx, roleMin)
});
