'use node';

import { v } from 'convex/values';
import { internalAction } from '../_generated/server';
import { internal } from '../_generated/api';
import { extraireAvecClaude, type ContenuDocument } from '../../socle/documents/extracteur';
import {
	construirePromptPreuve,
	documentPreuveSchema,
	lirePreuve
} from '../../verticales/recouvrement/import/preuve';

/**
 * LA LECTURE D'UNE PIÈCE JUSTIFICATIVE — module 1.2.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ELLE NE CLASSE JAMAIS AU HASARD
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Une pièce entre en `INDETERMINE`. Si la lecture n'aboutit pas — document
 * flou, format non lisible, modèle indécis — elle y RESTE, avec un constat qui
 * le dit. Une pièce indéterminée ne compte dans aucun critère de solidité, donc
 * ne fait franchir aucun seuil.
 *
 * C'est la précaution qui compte le plus ici : le score décide si une procédure
 * s'engage, et une procédure engagée coûte des frais qui restent dus.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ UN ÉCHEC D'APPEL N'EST PAS UN ÉCHEC DE DÉPÔT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le fichier du gérant est déjà en base quand cette action tourne. Une clé
 * d'API absente ou un modèle indisponible ne doivent donc pas faire disparaître
 * sa pièce : elle reste, en `ECHEC`, et il peut la classer à la main. Perdre le
 * dépôt parce que la lecture a échoué serait punir l'utilisateur d'une panne
 * qui ne le concerne pas.
 */

/** Ce que Claude sait lire directement, sans conversion préalable. */
const TYPES_IMAGE = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export const lireLaPiece = internalAction({
	args: { pieceId: v.id('pieces') },
	returns: v.null(),
	handler: async (ctx, { pieceId }) => {
		const piece = await ctx.runQuery(internal.recouvrement.pieces.obtenirInterne, { pieceId });
		if (piece === null) return null;

		let contenu: ContenuDocument;
		try {
			const blob = await ctx.storage.get(piece.storageId);
			if (blob === null) throw new Error('Le fichier déposé est introuvable dans le stockage.');

			const octets = Buffer.from(await blob.arrayBuffer());
			const mime = piece.mimeType ?? '';

			if (mime === 'application/pdf') {
				// ⚠️ LE PDF PART TEL QUEL. Le convertir en images détruirait sa couche
				// texte, et ferait relire par OCR des références et des montants déjà
				// présents — sur un document qui entre dans un dossier opposable.
				contenu = { type: 'pdf', base64: octets.toString('base64') };
			} else if (TYPES_IMAGE.includes(mime)) {
				contenu = {
					type: 'images',
					images: [{ mediaType: mime, base64: octets.toString('base64') }]
				};
			} else {
				// Le reste est traité comme du texte : un .txt, un .eml, un export de
				// messagerie. S'il n'est pas décodable, la ligne suivante lèvera.
				contenu = { type: 'texte', texte: octets.toString('utf8') };
			}
		} catch (erreur) {
			await ctx.runMutation(internal.recouvrement.pieces.marquerEchecInterne, {
				pieceId,
				constat:
					erreur instanceof Error
						? `Ce fichier n’a pas pu être ouvert : ${erreur.message}`
						: 'Ce fichier n’a pas pu être ouvert.'
			});
			return null;
		}

		try {
			const { doc } = await extraireAvecClaude({
				contenu,
				schema: documentPreuveSchema,
				prompt: construirePromptPreuve()
			});

			const lue = lirePreuve(doc);
			await ctx.runMutation(internal.recouvrement.pieces.consignerLectureInterne, {
				pieceId,
				type: lue.type,
				reference: lue.reference,
				dateDocument: lue.date,
				reserves: lue.reserves,
				// ⚠️ LE CONSTAT DU DOMAINE, MOT POUR MOT. Le reformuler ici ferait un
				// second endroit où le produit dit ce qu'il a lu dans une pièce.
				constat: lue.constat
			});
		} catch (erreur) {
			await ctx.runMutation(internal.recouvrement.pieces.marquerEchecInterne, {
				pieceId,
				constat:
					'La lecture automatique n’a pas abouti : ' +
					(erreur instanceof Error ? erreur.message : 'appel au modèle en échec') +
					'. Le document est enregistré et reste à classer.'
			});
		}

		return null;
	}
});
