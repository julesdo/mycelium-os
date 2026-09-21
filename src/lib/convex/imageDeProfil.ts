import { v, ConvexError } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { authedMutation, authedQuery } from './functions';
import { verifierImageStockee } from './images';

/**
 * LE VISAGE DE L'UTILISATEUR CONNECTÉ : une photo, un avatar, ou rien.
 *
 * Voir les champs d'image de `userProfiles` dans le schéma : pourquoi pas
 * `user.image`, et pourquoi photo et avatar s'excluent. Chaque fonction ne lit et n'écrit QUE le profil de
 * la personne connectée — aucun argument ne désigne un autre utilisateur.
 */

const styleAvatar = v.union(
	v.literal('notionists'),
	v.literal('lorelei'),
	v.literal('thumbs'),
	v.literal('shapes')
);

async function profilDe(ctx: QueryCtx | MutationCtx, userId: string): Promise<Doc<'userProfiles'> | null> {
	return ctx.db
		.query('userProfiles')
		.withIndex('by_userId', (q) => q.eq('userId', userId))
		.unique();
}

/** Ce que l'interface a besoin de savoir pour dessiner le visage. */
export const monImage = authedQuery({
	args: {},
	returns: v.union(
		v.null(),
		v.object({
			imageUrl: v.union(v.string(), v.null()),
			avatar: v.union(v.null(), v.object({ style: styleAvatar, graine: v.string() }))
		})
	),
	handler: async (ctx) => {
		const profil = await profilDe(ctx, ctx.user._id);
		if (profil === null) return null;
		return {
			imageUrl: profil.imageUrl ?? null,
			avatar:
				profil.avatarStyle !== undefined && profil.avatarGraine !== undefined
					? { style: profil.avatarStyle, graine: profil.avatarGraine }
					: null
		};
	}
});

export const genererUrlImageProfil = authedMutation({
	args: {},
	returns: v.string(),
	handler: async (ctx) => ctx.storage.generateUploadUrl()
});

/**
 * ⚠️ L'ANCIENNE PHOTO QUITTE LE STOCKAGE AVEC LA NOUVELLE — même règle que le
 * logo d'un établissement. Et l'avatar choisi s'efface : une photo le remplace.
 */
export const enregistrerImageProfil = authedMutation({
	args: { storageId: v.id('_storage') },
	returns: v.string(),
	handler: async (ctx, { storageId }): Promise<string> => {
		await verifierImageStockee(ctx, storageId);

		const imageUrl = await ctx.storage.getUrl(storageId);
		if (!imageUrl) throw new ConvexError('Fichier introuvable');

		const profil = await profilDe(ctx, ctx.user._id);
		await remplacer(ctx, profil, ctx.user._id, {
			imageStorageId: storageId,
			imageUrl,
			avatarStyle: undefined,
			avatarGraine: undefined
		});
		return imageUrl;
	}
});

/** Un avatar choisi remplace la photo, qui quitte le stockage. */
export const choisirAvatar = authedMutation({
	args: { style: styleAvatar, graine: v.string() },
	returns: v.null(),
	handler: async (ctx, { style, graine }) => {
		// Une graine est un mot, pas un document : la borner empêche d'écrire
		// n'importe quoi de volumineux sous couvert d'avatar.
		if (graine.length === 0 || graine.length > 64) throw new ConvexError('Avatar invalide');

		const profil = await profilDe(ctx, ctx.user._id);
		await remplacer(ctx, profil, ctx.user._id, {
			imageStorageId: undefined,
			imageUrl: undefined,
			avatarStyle: style,
			avatarGraine: graine
		});
		return null;
	}
});

/** Revenir aux initiales : ni photo, ni avatar. */
export const retirerImageProfil = authedMutation({
	args: {},
	returns: v.null(),
	handler: async (ctx) => {
		const profil = await profilDe(ctx, ctx.user._id);
		if (profil === null) return null;
		await remplacer(ctx, profil, ctx.user._id, {
			imageStorageId: undefined,
			imageUrl: undefined,
			avatarStyle: undefined,
			avatarGraine: undefined
		});
		return null;
	}
});

async function remplacer(
	ctx: MutationCtx,
	profil: Doc<'userProfiles'> | null,
	userId: string,
	champs: {
		imageStorageId: Id<'_storage'> | undefined;
		imageUrl: string | undefined;
		avatarStyle: Doc<'userProfiles'>['avatarStyle'];
		avatarGraine: string | undefined;
	}
): Promise<void> {
	if (profil === null) {
		await ctx.db.insert('userProfiles', { userId, ...champs });
		return;
	}
	if (profil.imageStorageId !== undefined && profil.imageStorageId !== champs.imageStorageId) {
		await ctx.storage.delete(profil.imageStorageId);
	}
	await ctx.db.patch(profil._id, champs);
}
