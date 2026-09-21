import { ConvexError } from 'convex/values';
import type { Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';

/**
 * CE QU'UNE IMAGE DE PROFIL OU UN LOGO A LE DROIT D'ÊTRE.
 *
 * ⚠️ LE CONTRÔLE SE FAIT ICI, SUR LE FICHIER STOCKÉ, ET PAS SEULEMENT DANS LE
 * NAVIGATEUR. `accept="image/*"` sur un champ de fichier est une commodité : il
 * se contourne en une requête. Le type et le poids qui comptent sont ceux que le
 * stockage a enregistrés, lus dans sa table système.
 *
 * Un fichier refusé quitte le stockage aussitôt : sinon il y reste sans que plus
 * rien ne le référence.
 */
export const POIDS_MAX_IMAGE = 2 * 1024 * 1024;

/**
 * ⚠️ PAS DE SVG, MÊME POUR UN LOGO. Un SVG est un document qui peut porter du
 * script ; servi tel quel par le stockage, il s'exécuterait chez qui ouvre son
 * adresse. Les quatre formats d'image ordinaires suffisent.
 */
export const TYPES_IMAGE_ACCEPTES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

export async function verifierImageStockee(
	ctx: MutationCtx,
	storageId: Id<'_storage'>
): Promise<void> {
	const fichier = await ctx.db.system.get(storageId);
	if (fichier === null) throw new ConvexError('Fichier introuvable');

	const estImage = TYPES_IMAGE_ACCEPTES.includes(fichier.contentType ?? '');
	const tropLourd = fichier.size > POIDS_MAX_IMAGE;
	if (!estImage || tropLourd) {
		await ctx.storage.delete(storageId);
		throw new ConvexError(
			!estImage
				? 'Seules les images PNG, JPEG, WebP ou GIF sont acceptées.'
				: 'Cette image dépasse 2 Mo. Choisissez-en une plus légère.'
		);
	}
}
