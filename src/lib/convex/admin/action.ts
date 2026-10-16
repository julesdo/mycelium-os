import { customAction, customCtx } from 'convex-helpers/server/customFunctions';
import { action } from '../_generated/server';
import { internal } from '../_generated/api';
import type { RoleEquipe } from '../../admin/acces';
import type { Equipier } from './enveloppe';

/**
 * `equipeAction(role)` — comme `equipeQuery`, pour ce qui appelle l'extérieur (le
 * brouillon de Plume). Le verdict d'accès se rend par `admin/equipier.ts`, à chaque appel.
 */
export function equipeAction(roleMin: RoleEquipe) {
	return customAction(
		action,
		customCtx(async (ctx) => {
			const equipier: Equipier = await ctx.runQuery(internal.admin.equipier.equipierCourant, {
				roleMin
			});
			return { equipier };
		})
	);
}
