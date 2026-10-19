import { z } from 'zod';
import { CATEGORIES, ILLUSTRATIONS, PILIERS } from '../../marketing/motifs-blog';

/**
 * L'EN-TÊTE D'UN ARTICLE DU BLOG, UNE SEULE DÉFINITION (19/10/2026).
 *
 * Deux lecteurs : content-collections, qui refuse au build un article mal rempli
 * (`content-collections.ts`), et le CMS de l'admin, qui refuse de publier sur GitHub ce
 * que le build refuserait (`blog/source.ts`). Écrite à deux endroits, la règle finirait
 * par diverger : l'admin publierait un article qui casse la construction du site.
 */

const dateDuJour = z.preprocess(
	(valeur) => (valeur instanceof Date ? valeur.toISOString().slice(0, 10) : valeur),
	z.iso.date()
);

export const AUTEUR_PAR_DEFAUT = 'L’équipe Letikette';

export const schemaEnteteArticle = z.object({
	titre: z.string().min(10).max(90),
	description: z.string().min(50).max(170),
	date: dateDuJour,
	misAJour: dateDuJour.optional(),
	auteur: z.string().default(AUTEUR_PAR_DEFAUT),
	categorie: z.enum(CATEGORIES),
	// Le pilier de la ligne éditoriale (`motifs-blog.ts`), facultatif.
	pilier: z.enum(PILIERS).optional(),
	// La couverture illustrée, dessinée dans la DA (`blog-couvertures.tsx`) sur la
	// teinte de la catégorie. `facture` par défaut.
	illustration: z.enum(ILLUSTRATIONS).default('facture'),
	// Une vraie image, seulement si l'article en a besoin : elle remplace alors
	// l'illustration. Une image propre au blog (`/blog/`) ou une capture (`/ecrans/`).
	couverture: z
		.object({
			src: z.string().regex(/^\/(blog|ecrans)\//),
			alt: z.string().min(5)
		})
		.optional(),
	// Deux à cinq phrases courtes : ce que le lecteur retient s'il ne lit que ça.
	enBref: z.array(z.string().min(10).max(220)).min(2).max(5).optional(),
	brouillon: z.boolean().default(false)
});

export type EnteteArticle = z.output<typeof schemaEnteteArticle>;

/** Le nom du fichier devient l'adresse : des minuscules sans accent, des chiffres, des tirets. */
export const ADRESSE_VALIDE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
