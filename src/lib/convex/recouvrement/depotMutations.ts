import { v } from 'convex/values';
import { internalQuery, internalMutation } from '../_generated/server';
import { internal } from '../_generated/api';
import { vChiffrementDocument } from './tables';

/**
 * Les lectures et écritures du dépôt.
 *
 * Séparées de `depot.ts` parce que celui-ci porte `"use node"` pour décoder les
 * fichiers, et qu'un fichier du répertoire Convex ne peut pas à la fois porter
 * cette directive et exporter des `query` / `mutation`. Même découpage
 * qu'`extraction.ts` / `extractionMutations.ts` côté EGalim.
 */

const vMode = v.union(v.literal('EXPORT_COMPTABLE'), v.literal('FACTURE_DEPOSEE'));

const vStatut = v.union(
	v.literal('EN_ATTENTE'),
	v.literal('LECTURE'),
	v.literal('TERMINE'),
	v.literal('ECHOUE')
);

const vBilan = v.object({
	format: v.string(),
	debiteursCrees: v.number(),
	facturesCreees: v.number(),
	facturesDejaConnues: v.number(),
	reglementsCrees: v.number(),
	reglementsOrphelins: v.number(),
	horsPerimetre: v.number(),
	ignorees: v.array(v.object({ texte: v.string(), raison: v.string() })),
	ignoreesTotal: v.number()
});

/*
  ⚠️ L'ENVOI ET L'ENREGISTREMENT ONT DÉMÉNAGÉ AU COFFRE (12/10/2026). Un fichier
  n'entre plus que par `coffre/coffre.ts` (`genererUrlCoffre`, `confierAuCoffre`),
  qui le fait sceller avant toute lecture. Le suivi d'un dépôt se lit là-bas aussi
  (`suivreLeDepot`, `listerLeCoffre`).
*/

export const obtenirImport = internalQuery({
	args: { importId: v.id('importsRecouvrement') },
	returns: v.union(
		v.null(),
		v.object({
			organizationId: v.id('organizations'),
			storageId: v.id('_storage'),
			mode: vMode,
			/** Le type MIME et le nom : la lecture d’une facture déposée en dépend. */
			mimeType: v.string(),
			filename: v.string(),
			statut: vStatut,
			chiffrement: v.optional(vChiffrementDocument),
			empreinte: v.optional(v.string())
		})
	),
	handler: async (ctx, { importId }) => {
		const suivi = await ctx.db.get(importId);
		if (suivi === null) return null;
		return {
			organizationId: suivi.organizationId,
			storageId: suivi.storageId,
			mode: suivi.mode,
			mimeType: suivi.mimeType,
			filename: suivi.filename,
			statut: suivi.statut,
			chiffrement: suivi.chiffrement,
			empreinte: suivi.empreinte
		};
	}
});

export const marquerEtape = internalMutation({
	args: { importId: v.id('importsRecouvrement'), statut: vStatut, etape: v.string() },
	returns: v.null(),
	handler: async (ctx, { importId, statut, etape }) => {
		await ctx.db.patch(importId, { statut, etape });
		return null;
	}
});

export const marquerBilan = internalMutation({
	args: { importId: v.id('importsRecouvrement'), etape: v.string(), bilan: vBilan },
	returns: v.null(),
	handler: async (ctx, { importId, etape, bilan }): Promise<null> => {
		await ctx.db.patch(importId, {
			statut: 'TERMINE',
			etape,
			bilan,
			termineLe: Date.now()
		});
		// Un dépôt lu est une étape du parcours (`croissance/releve.ts`).
		const depot = await ctx.db.get(importId);
		if (depot !== null) {
			await ctx.scheduler.runAfter(0, internal.croissance.releve.releverLesEtapes, {
				organizationId: depot.organizationId
			});
		}
		return null;
	}
});

export const marquerEchec = internalMutation({
	args: { importId: v.id('importsRecouvrement'), erreur: v.string() },
	returns: v.null(),
	handler: async (ctx, { importId, erreur }) => {
		await ctx.db.patch(importId, {
			statut: 'ECHOUE',
			// L'erreur EST le message d'écran : elle doit se lire, pas se décoder.
			etape: 'La lecture a échoué.',
			erreur,
			termineLe: Date.now()
		});
		return null;
	}
});
