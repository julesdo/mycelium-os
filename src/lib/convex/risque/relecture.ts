import { v } from 'convex/values';
import { internalAction, internalQuery } from '../_generated/server';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { configPappers } from './pappersConfig';
import { AGE_AVANT_RELECTURE_MS } from '../../verticales/recouvrement/risque/regles';

/**
 * LA RELECTURE MENSUELLE — chaque nuit, les analyses de plus d'un mois des
 * clients qui vous doivent encore de l'argent sont refaites (13/10/2026).
 *
 * ⚠️ CE FICHIER NOMME `analysesRisque.by_date`, LE SECOND INDEX QUI TRAVERSE LES
 * ORGANISATIONS, ET IL N'EXPOSE AUCUNE FONCTION AUTHENTIFIÉE. Même règle que
 * `debiteurs.by_siren` : une requête authentifiée qui s'en servirait rendrait
 * les analyses d'autres établissements.
 *
 * ⚠️ ELLE NE RELIT QUE CE QUE LE GÉRANT A DÉJÀ FAIT ANALYSER. Aucune analyse ne
 * part d'elle-même sur un client que personne n'a demandé : chacune coûte des
 * crédits, et c'est l'établissement qui choisit de les dépenser.
 */

/** Au plus tant d'analyses relancées par nuit, tous établissements confondus. */
const PAR_NUIT = 200;

type Cible = { organizationId: Id<'organizations'>; debiteurId: Id<'debiteurs'>; siren: string };

export const analysesARelire = internalQuery({
	args: { avant: v.number() },
	returns: v.array(
		v.object({
			organizationId: v.id('organizations'),
			debiteurId: v.id('debiteurs'),
			siren: v.string()
		})
	),
	handler: async (ctx, { avant }): Promise<Cible[]> => {
		const vieilles = await ctx.db
			.query('analysesRisque')
			.withIndex('by_date', (q) => q.lt('analyseLe', avant))
			.take(PAR_NUIT * 2);
		const aRelire: Cible[] = [];
		for (const analyse of vieilles) {
			const debiteurId = analyse.debiteurId;
			if (debiteurId === undefined) continue;
			// « Vous doit encore de l'argent » : au moins une facture qui n'est pas soldée.
			const factures = await ctx.db
				.query('facturesVente')
				.withIndex('by_debiteur', (q) => q.eq('debiteurId', debiteurId))
				.collect();
			if (!factures.some((f) => f.statutPaiement !== 'SOLDEE')) continue;
			aRelire.push({ organizationId: analyse.organizationId, debiteurId, siren: analyse.siren });
			if (aRelire.length >= PAR_NUIT) break;
		}
		return aRelire;
	}
});

export const relireLesAnalyses = internalAction({
	args: {},
	returns: v.object({ relancees: v.number() }),
	handler: async (ctx): Promise<{ relancees: number }> => {
		if (configPappers() === null) return { relancees: 0 };
		const aRelire: Cible[] = await ctx.runQuery(internal.risque.relecture.analysesARelire, {
			avant: Date.now() - AGE_AVANT_RELECTURE_MS
		});
		for (const [i, cible] of aRelire.entries()) {
			// Espacées : Pappers ne voit pas arriver deux cents requêtes d'un coup.
			await ctx.scheduler.runAfter(i * 3000, internal.risque.analyse.analyser, {
				organizationId: cible.organizationId,
				debiteurId: cible.debiteurId,
				siren: cible.siren,
				demandePar: 'relecture',
				relecture: true
			});
		}
		return { relancees: aRelire.length };
	}
});
