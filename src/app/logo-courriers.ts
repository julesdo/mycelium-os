import { ajusterDans, cadreDuContenu } from '../lib/socle/cadrage';
import { teintesDominantes } from '../lib/socle/couleurs';
import { LOGO_POIDS_MAX } from '../lib/verticales/recouvrement/marque';

/**
 * LE LOGO DES COURRIERS, PRÉPARÉ DANS LE NAVIGATEUR (23/10/2026).
 *
 * Ce que le gérant choisit (une photo, un PNG exporté d'un site, un SVG, un WebP)
 * devient ce qu'un e-mail sait porter : un PNG rogné de ses marges vides, ramené
 * à 600 × 200 au plus. Outlook ne lit pas le WebP, Gmail ne lit pas le SVG, et un
 * fichier de deux mégaoctets voyagerait dans chaque relance.
 *
 * Les teintes franches du logo en sont tirées au passage : l'écran propose la
 * première quand aucune couleur n'est posée. Rien ne part au serveur ici ; le PNG
 * se téléverse à « Enregistrer ».
 */

export interface LogoPrepare {
	readonly fichier: Blob;
	/** L'image en `data:`, pour l'aperçu : le cadre de l'e-mail ne lit pas une adresse `blob:`. */
	readonly apercu: string;
	readonly largeur: number;
	readonly hauteur: number;
	readonly teintes: readonly string[];
}

const TYPES_LUS = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'];

/** Au-delà, même un logo se refuse : c'est une photo d'appareil, pas un logo. */
const POIDS_BRUT_MAX = 15_000_000;

/** La taille de travail : assez pour rogner juste, pas assez pour bloquer un téléphone. */
const COTE_DE_TRAVAIL = 2000;

function charger(source: string): Promise<HTMLImageElement> {
	return new Promise((resoudre, rejeter) => {
		const image = new Image();
		image.onload = () => resoudre(image);
		image.onerror = () => rejeter(new Error('Cette image ne s’ouvre pas. Essayez un PNG ou un JPEG.'));
		image.src = source;
	});
}

function enPng(canevas: HTMLCanvasElement): Promise<Blob> {
	return new Promise((resoudre, rejeter) => {
		canevas.toBlob(
			(blob) => (blob === null ? rejeter(new Error('Le logo n’a pas pu se préparer.')) : resoudre(blob)),
			'image/png'
		);
	});
}

function contexte(canevas: HTMLCanvasElement): CanvasRenderingContext2D {
	const ctx = canevas.getContext('2d', { willReadFrequently: true });
	if (ctx === null) throw new Error('Ce navigateur ne sait pas préparer une image.');
	return ctx;
}

export async function preparerLogo(fichier: File): Promise<LogoPrepare> {
	if (!TYPES_LUS.includes(fichier.type)) {
		throw new Error('Choisissez une image : PNG, JPEG, WebP, GIF ou SVG.');
	}
	if (fichier.size > POIDS_BRUT_MAX) {
		throw new Error('Cette image est trop lourde pour un logo : quinze mégaoctets au plus.');
	}
	const adresse = URL.createObjectURL(fichier);
	try {
		const image = await charger(adresse);
		// Un SVG sans dimensions écrites se lit à 0 × 0 : il prend alors la largeur d'une lettre.
		const naturelle = {
			largeur: image.naturalWidth || 600,
			hauteur: image.naturalHeight || 200
		};
		const travail = ajusterDans(naturelle.largeur, naturelle.hauteur, COTE_DE_TRAVAIL, COTE_DE_TRAVAIL);
		const toile = document.createElement('canvas');
		toile.width = travail.largeur;
		toile.height = travail.hauteur;
		const ctx = contexte(toile);
		ctx.drawImage(image, 0, 0, travail.largeur, travail.hauteur);
		const pixels = ctx.getImageData(0, 0, travail.largeur, travail.hauteur).data;
		const cadre = cadreDuContenu(pixels, travail.largeur, travail.hauteur);
		if (cadre === null) throw new Error('Cette image paraît vide : choisissez votre logo.');

		const final = ajusterDans(cadre.largeur, cadre.hauteur, 600, 200);
		const sortie = document.createElement('canvas');
		sortie.width = final.largeur;
		sortie.height = final.hauteur;
		const ctxSortie = contexte(sortie);
		ctxSortie.imageSmoothingQuality = 'high';
		ctxSortie.drawImage(
			toile,
			cadre.x,
			cadre.y,
			cadre.largeur,
			cadre.hauteur,
			0,
			0,
			final.largeur,
			final.hauteur
		);
		const png = await enPng(sortie);
		if (png.size > LOGO_POIDS_MAX) {
			throw new Error('Ce logo reste trop lourd une fois préparé : choisissez une image plus simple.');
		}
		return {
			fichier: png,
			apercu: sortie.toDataURL('image/png'),
			largeur: final.largeur,
			hauteur: final.hauteur,
			teintes: teintesDominantes(ctxSortie.getImageData(0, 0, final.largeur, final.hauteur).data)
		};
	} finally {
		URL.revokeObjectURL(adresse);
	}
}
