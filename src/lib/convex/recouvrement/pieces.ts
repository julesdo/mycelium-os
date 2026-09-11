import { v, ConvexError } from 'convex/values';
import { internalMutation, internalQuery } from '../_generated/server';
import type { MutationCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';
import { internal } from '../_generated/api';
import { authedMutation, authedQuery } from '../functions';
import { getUserOrg } from '../lib/auth';
import { vTypePiece } from './tables';

/**
 * LES PIÈCES JUSTIFICATIVES — module 1.2.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE FICHIER DÉBLOQUE UN VERDICT QUI ÉTAIT INATTEIGNABLE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La table `pieces` était lue par `creances.ts` (score de solidité) et par
 * `lecture.ts` (écran de créance), et écrite NULLE PART. Huitième occurrence du
 * défaut « déclaré, lu, jamais alimenté » dans ce dépôt.
 *
 * Les précédentes dégradaient un calcul. Celle-ci en rendait un impossible :
 * les quatre conditions légales valent 12 points sur 20, le seuil de
 * qualification est à 0,75 — soit 15 — et les 8 points restants sont tous
 * documentaires. Une créance parfaite en droit plafonnait donc à 0,60, et
 * AUCUNE ne pouvait être éligible, quoi que fasse le créancier.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LE LOGICIEL RECONNAÎT, LE GÉRANT CONFIRME
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Une pièce déposée n'est PAS classée à l'enregistrement. Elle entre en
 * `INDETERMINE`, la lecture part en tâche planifiée, et le type se pose quand
 * quelque chose l'a réellement établi. Demander « quel type de document
 * déposez-vous ? » devant un PDF qui porte « BON DE LIVRAISON » en en-tête est
 * le champ vide que la première règle d'écran interdit ; classer au hasard
 * ferait franchir un seuil sur un document que personne n'a lu.
 */

/** Ce que la lecture peut conclure. `null` = elle n'a pas su. */
const vTypeLu = v.union(vTypePiece, v.null());

async function enregistrer(
	ctx: MutationCtx,
	args: {
		organizationId: Id<'organizations'>;
		storageId: Id<'_storage'>;
		filename: string;
		mimeType: string;
		debiteurId?: Id<'debiteurs'>;
		factureIds: Id<'facturesVente'>[];
	}
): Promise<Id<'pieces'>> {
	// ⚠️ LE CLOISONNEMENT AVANT L'ÉCRITURE, sur CHAQUE facture. Connaître un
	// identifiant ne doit pas suffire à rattacher une pièce à la facture d'un
	// autre établissement — ce serait lui faire porter une preuve étrangère.
	for (const factureId of args.factureIds) {
		const facture = await ctx.db.get(factureId);
		if (facture === null || facture.organizationId !== args.organizationId) {
			throw new ConvexError('Facture introuvable');
		}
	}
	if (args.debiteurId !== undefined) {
		const debiteur = await ctx.db.get(args.debiteurId);
		if (debiteur === null || debiteur.organizationId !== args.organizationId) {
			throw new ConvexError('Débiteur introuvable');
		}
	}

	const pieceId = await ctx.db.insert('pieces', {
		organizationId: args.organizationId,
		type: 'INDETERMINE',
		statut: 'EN_LECTURE',
		storageId: args.storageId,
		filename: args.filename,
		mimeType: args.mimeType,
		debiteurId: args.debiteurId,
		ajouteeLe: Date.now()
	});

	for (const factureId of args.factureIds) {
		await ctx.db.insert('piecesFactures', {
			organizationId: args.organizationId,
			pieceId,
			factureId
		});
	}

	return pieceId;
}

export const enregistrerInterne = internalMutation({
	args: {
		organizationId: v.id('organizations'),
		storageId: v.id('_storage'),
		filename: v.string(),
		mimeType: v.string(),
		debiteurId: v.optional(v.id('debiteurs')),
		factureIds: v.array(v.id('facturesVente'))
	},
	returns: v.id('pieces'),
	handler: async (ctx, args) => enregistrer(ctx, args)
});

/**
 * Ce que la lecture a conclu, écrit sur la pièce.
 *
 * ⚠️ UN TYPE `null` LAISSE `INDETERMINE`. C'est l'aveu que la lecture n'a pas
 * abouti, et il vaut mieux qu'un classement au hasard : une pièce indéterminée
 * ne compte dans aucun critère de solidité, donc ne fait franchir aucun seuil.
 */
export const consignerLectureInterne = internalMutation({
	args: {
		pieceId: v.id('pieces'),
		type: vTypeLu,
		reference: v.union(v.string(), v.null()),
		dateDocument: v.union(v.string(), v.null()),
		reserves: v.union(v.string(), v.null()),
		constat: v.string()
	},
	returns: v.null(),
	handler: async (ctx, { pieceId, type, reference, dateDocument, reserves, constat }) => {
		const piece = await ctx.db.get(pieceId);
		if (piece === null) throw new ConvexError('Pièce introuvable');

		await ctx.db.patch(pieceId, {
			type: type ?? 'INDETERMINE',
			statut: type === null ? 'A_CLASSER' : 'LUE',
			reference: reference ?? undefined,
			dateDocument: dateDocument ?? undefined,
			reserves: reserves ?? undefined,
			constat
		});
		return null;
	}
});

export const marquerEchecInterne = internalMutation({
	args: { pieceId: v.id('pieces'), constat: v.string() },
	returns: v.null(),
	handler: async (ctx, { pieceId, constat }) => {
		await ctx.db.patch(pieceId, { statut: 'ECHEC', constat });
		return null;
	}
});

async function classer(
	ctx: MutationCtx,
	organizationId: Id<'organizations'>,
	pieceId: Id<'pieces'>,
	type: string
) {
	const piece = await ctx.db.get(pieceId);
	if (piece === null || piece.organizationId !== organizationId) {
		throw new ConvexError('Pièce introuvable');
	}

	// `CLASSEE_MAIN` et pas `LUE` : en relisant le dossier, savoir si le
	// classement vient du modèle ou du gérant change le crédit qu'on lui donne.
	await ctx.db.patch(pieceId, {
		type: type as 'BON_DE_LIVRAISON',
		statut: 'CLASSEE_MAIN'
	});
	return null;
}

export const classerInterne = internalMutation({
	args: {
		organizationId: v.id('organizations'),
		pieceId: v.id('pieces'),
		type: vTypePiece
	},
	returns: v.null(),
	handler: async (ctx, { organizationId, pieceId, type }) =>
		classer(ctx, organizationId, pieceId, type)
});

export const obtenirInterne = internalQuery({
	args: { pieceId: v.id('pieces') },
	returns: v.union(
		v.object({
			storageId: v.id('_storage'),
			mimeType: v.optional(v.string()),
			filename: v.string()
		}),
		v.null()
	),
	handler: async (ctx, { pieceId }) => {
		const piece = await ctx.db.get(pieceId);
		if (piece === null) return null;
		return { storageId: piece.storageId, mimeType: piece.mimeType, filename: piece.filename };
	}
});

// ═══════════════════════════════════════════════════════════════════════════
// Les entrées authentifiées.
// ═══════════════════════════════════════════════════════════════════════════

/** L'URL d'envoi. Le fichier n'appartient à personne tant qu'il n'est pas enregistré. */
export const genererUrlPiece = authedMutation({
	args: {},
	returns: v.string(),
	handler: async (ctx) => {
		await getUserOrg(ctx);
		return await ctx.storage.generateUploadUrl();
	}
});

/**
 * Enregistre une pièce déposée et lance sa lecture.
 *
 * Le type de retour est annoté à la main : ce handler appelle
 * `internal.recouvrement.pieces.*`, c'est-à-dire son propre module, et sans
 * annotation le cycle d'inférence ferait retomber `api` tout entier sur `any`.
 */
export const deposerPiece = authedMutation({
	args: {
		storageId: v.id('_storage'),
		filename: v.string(),
		mimeType: v.string(),
		debiteurId: v.optional(v.id('debiteurs')),
		factureIds: v.array(v.id('facturesVente'))
	},
	returns: v.id('pieces'),
	handler: async (ctx, args): Promise<Id<'pieces'>> => {
		const { organizationId } = await getUserOrg(ctx);
		const pieceId = await enregistrer(ctx, { ...args, organizationId });

		// La lecture part en tâche planifiée : un appel modèle dépasse le temps
		// d'une mutation, et l'écran doit montrer la pièce déposée immédiatement
		// plutôt que de faire attendre devant un bouton figé.
		await ctx.scheduler.runAfter(0, internal.recouvrement.preuve.lireLaPiece, { pieceId });
		return pieceId;
	}
});

export const classerPiece = authedMutation({
	args: { pieceId: v.id('pieces'), type: vTypePiece },
	returns: v.null(),
	handler: async (ctx, { pieceId, type }): Promise<null> => {
		const { organizationId } = await getUserOrg(ctx);
		return await classer(ctx, organizationId, pieceId, type);
	}
});

export const retirerPiece = authedMutation({
	args: { pieceId: v.id('pieces') },
	returns: v.null(),
	handler: async (ctx, { pieceId }) => {
		const { organizationId } = await getUserOrg(ctx);
		const piece = await ctx.db.get(pieceId);
		if (piece === null || piece.organizationId !== organizationId) {
			throw new ConvexError('Pièce introuvable');
		}

		// Les liaisons partent AVANT la pièce, et le fichier AVANT sa ligne :
		// l'inverse laisserait un objet orphelin dans le stockage, que plus rien
		// ne désigne et que personne ne saurait retrouver pour l'effacer. Même
		// ordre que la purge RGPD.
		const liaisons = await ctx.db
			.query('piecesFactures')
			.withIndex('by_piece', (q) => q.eq('pieceId', pieceId))
			.collect();
		for (const liaison of liaisons) await ctx.db.delete(liaison._id);

		await ctx.storage.delete(piece.storageId);
		await ctx.db.delete(pieceId);
		return null;
	}
});

/** Les pièces d'un débiteur, celles de portée débiteur comme celles des factures. */
export const listerPiecesDuDebiteur = authedQuery({
	args: { debiteurId: v.id('debiteurs') },
	returns: v.array(
		v.object({
			_id: v.id('pieces'),
			type: vTypePiece,
			statut: v.optional(v.string()),
			filename: v.string(),
			reference: v.optional(v.string()),
			dateDocument: v.optional(v.string()),
			reserves: v.optional(v.string()),
			constat: v.optional(v.string()),
			ajouteeLe: v.number()
		})
	),
	handler: async (ctx, { debiteurId }) => {
		const { organizationId } = await getUserOrg(ctx);

		const debiteur = await ctx.db.get(debiteurId);
		if (debiteur === null || debiteur.organizationId !== organizationId) {
			throw new ConvexError('Débiteur introuvable');
		}

		const factures = await ctx.db
			.query('facturesVente')
			.withIndex('by_debiteur', (q) => q.eq('debiteurId', debiteurId))
			.collect();

		const trouvees = new Map<Id<'pieces'>, true>();
		for (const facture of factures) {
			if (facture.organizationId !== organizationId) continue;
			const liaisons = await ctx.db
				.query('piecesFactures')
				.withIndex('by_facture', (q) => q.eq('factureId', facture._id))
				.collect();
			for (const liaison of liaisons) trouvees.set(liaison.pieceId, true);
		}

		const auDebiteur = await ctx.db
			.query('pieces')
			.withIndex('by_debiteur', (q) => q.eq('debiteurId', debiteurId))
			.collect();
		for (const piece of auDebiteur) trouvees.set(piece._id, true);

		const pieces = [];
		for (const pieceId of trouvees.keys()) {
			const piece = await ctx.db.get(pieceId);
			if (piece === null || piece.organizationId !== organizationId) continue;
			pieces.push({
				_id: piece._id,
				type: piece.type,
				statut: piece.statut,
				filename: piece.filename,
				reference: piece.reference,
				dateDocument: piece.dateDocument,
				reserves: piece.reserves,
				constat: piece.constat,
				ajouteeLe: piece.ajouteeLe
			});
		}

		// La plus récente d'abord : c'est celle qu'on vient de déposer.
		return pieces.sort((a, b) => b.ajouteeLe - a.ajouteeLe);
	}
});
