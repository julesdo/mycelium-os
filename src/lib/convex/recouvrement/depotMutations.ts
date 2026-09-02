import { v, ConvexError } from 'convex/values';
import { internalQuery, internalMutation } from '../_generated/server';
import { authedMutation, authedQuery } from '../functions';
import { internal } from '../_generated/api';
import { getUserOrg } from '../lib/auth';

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

/** L'URL d'envoi. Le fichier n'appartient à personne tant qu'il n'est pas enregistré. */
export const genererUrlDepot = authedMutation({
	args: {},
	returns: v.string(),
	handler: async (ctx) => {
		// L'appartenance s'établit à `enregistrerFichier`, qui vérifie
		// l'organisation. Une URL d'envoi seule ne donne accès à rien.
		await getUserOrg(ctx);
		return await ctx.storage.generateUploadUrl();
	}
});

/**
 * Enregistre un fichier déposé et lance sa lecture.
 *
 * La lecture part en tâche planifiée plutôt qu'en ligne : un export de deux
 * cents factures dépasserait le temps d'une mutation, et surtout l'écran doit
 * pouvoir montrer la progression au lieu d'attendre.
 */
export const enregistrerFichier = authedMutation({
	args: {
		storageId: v.id('_storage'),
		filename: v.string(),
		mimeType: v.string(),
		mode: vMode
	},
	returns: v.id('importsRecouvrement'),
	handler: async (ctx, args) => {
		const { organizationId } = await getUserOrg(ctx);

		const importId = await ctx.db.insert('importsRecouvrement', {
			organizationId,
			storageId: args.storageId,
			filename: args.filename,
			mimeType: args.mimeType,
			mode: args.mode,
			statut: 'EN_ATTENTE',
			etape: 'En attente de lecture…',
			deposeLe: Date.now()
		});

		await ctx.scheduler.runAfter(0, internal.recouvrement.depot.traiterImport, { importId });
		return importId;
	}
});

export const obtenirImport = internalQuery({
	args: { importId: v.id('importsRecouvrement') },
	returns: v.union(
		v.null(),
		v.object({
			organizationId: v.id('organizations'),
			storageId: v.id('_storage'),
			mode: vMode,
			statut: vStatut
		})
	),
	handler: async (ctx, { importId }) => {
		const suivi = await ctx.db.get(importId);
		if (suivi === null) return null;
		return {
			organizationId: suivi.organizationId,
			storageId: suivi.storageId,
			mode: suivi.mode,
			statut: suivi.statut
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
	handler: async (ctx, { importId, etape, bilan }) => {
		await ctx.db.patch(importId, {
			statut: 'TERMINE',
			etape,
			bilan,
			termineLe: Date.now()
		});
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

/** Les dépôts récents de l'établissement, du plus récent au plus ancien. */
export const listerImports = authedQuery({
	args: { limite: v.optional(v.number()) },
	returns: v.array(
		v.object({
			_id: v.id('importsRecouvrement'),
			filename: v.string(),
			mode: vMode,
			statut: vStatut,
			etape: v.optional(v.string()),
			erreur: v.optional(v.string()),
			bilan: v.optional(vBilan),
			deposeLe: v.number()
		})
	),
	handler: async (ctx, { limite }) => {
		const { organizationId } = await getUserOrg(ctx);

		const imports = await ctx.db
			.query('importsRecouvrement')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.order('desc')
			.take(limite ?? 20);

		return imports.map((suivi) => ({
			_id: suivi._id,
			filename: suivi.filename,
			mode: suivi.mode,
			statut: suivi.statut,
			etape: suivi.etape,
			erreur: suivi.erreur,
			bilan: suivi.bilan,
			deposeLe: suivi.deposeLe
		}));
	}
});

/** Le suivi d'un dépôt précis, pour l'écran qui le regarde travailler. */
export const suivreImport = authedQuery({
	args: { importId: v.id('importsRecouvrement') },
	returns: v.object({
		filename: v.string(),
		statut: vStatut,
		etape: v.optional(v.string()),
		erreur: v.optional(v.string()),
		bilan: v.optional(vBilan)
	}),
	handler: async (ctx, { importId }) => {
		const { organizationId } = await getUserOrg(ctx);
		const suivi = await ctx.db.get(importId);

		// Le cloisonnement vient AVANT tout : connaître un identifiant ne doit
		// pas suffire à lire le dépôt d'un autre établissement.
		if (suivi === null || suivi.organizationId !== organizationId) {
			throw new ConvexError('Dépôt introuvable');
		}

		return {
			filename: suivi.filename,
			statut: suivi.statut,
			etape: suivi.etape,
			erreur: suivi.erreur,
			bilan: suivi.bilan
		};
	}
});
