import { defineCollection, defineConfig } from '@content-collections/core';
import { compileMDX } from '@content-collections/mdx';
import remarkGfm from 'remark-gfm';
import { z } from 'zod';
import { ancreDe } from './src/marketing/ancre';
import { CATEGORIES, ILLUSTRATIONS } from './src/marketing/motifs-blog';

/**
 * LE BLOG, EN FICHIERS (06/10/2026).
 *
 * Un article = un fichier `.mdx` dans `content/blog/`, compilé au build. Aucun
 * CMS, aucun service, aucun coût : le blog se publie avec le site, au même
 * `git push`. Mode d'emploi et charte éditoriale : `content/blog/README.md`.
 *
 * ⚠️ L'EN-TÊTE EST VALIDÉ, ET UN EN-TÊTE FAUX ARRÊTE LE BUILD. Un titre trop
 * long, une date impossible ou une catégorie inconnue ne partent pas en ligne :
 * la construction échoue en nommant le champ.
 */

/**
 * Le YAML de l'en-tête lit `date: 2026-10-06` comme un objet `Date`. On le
 * ramène à `AAAA-MM-JJ` avant de le valider, ce qui garde la donnée
 * sérialisable et refuse un 30 février au lieu de le faire glisser au 2 mars.
 */
const dateDuJour = z.preprocess(
	(valeur) => (valeur instanceof Date ? valeur.toISOString().slice(0, 10) : valeur),
	z.iso.date()
);

/** L'adresse d'un article : son nom de fichier, en minuscules, chiffres et tirets. */
const ADRESSE_VALIDE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Les intertitres de niveau 2, pour le sommaire : `## Le titre` en début de ligne. */
const INTERTITRE = /^##\s+(.+?)\s*$/gm;

const articles = defineCollection({
	name: 'articles',
	typeName: 'ArticleBlog',
	directory: 'content/blog',
	include: '**/*.mdx',
	schema: z.object({
		titre: z.string().min(10).max(90),
		description: z.string().min(50).max(170),
		date: dateDuJour,
		misAJour: dateDuJour.optional(),
		auteur: z.string().default('L’équipe Letikette'),
		categorie: z.enum(CATEGORIES),
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
		// Trois à cinq phrases courtes : ce que le lecteur retient s'il ne lit que ça.
		enBref: z.array(z.string().min(10).max(220)).min(2).max(5).optional(),
		brouillon: z.boolean().default(false),
		// Le corps de l'article, déclaré explicitement : la propriété implicite est
		// dépréciée depuis content-collections 0.15.
		content: z.string()
	}),
	transform: async (article, contexte) => {
		const adresse = article._meta.path;
		if (!ADRESSE_VALIDE.test(adresse)) {
			throw new Error(
				`content/blog/${article._meta.fileName} : le nom du fichier devient l'adresse de l'article, ` +
					'il ne doit contenir que des minuscules sans accent, des chiffres et des tirets.'
			);
		}
		// Le sommaire : chaque intertitre de niveau 2, avec l'ancre que `mdx.tsx`
		// lui donnera au rendu (même fonction, `ancreDe`).
		const sommaire = [...article.content.matchAll(INTERTITRE)].map((trouve) => {
			const titre = (trouve[1] ?? '').trim();
			return { titre, ancre: ancreDe(titre) };
		});
		const mdx = await compileMDX(contexte, article, { remarkPlugins: [remarkGfm] });
		const mots = article.content.split(/\s+/).filter(Boolean).length;
		return {
			...article,
			adresse,
			mdx,
			sommaire,
			minutes: Math.max(1, Math.round(mots / 200))
		};
	}
});

export default defineConfig({
	content: [articles]
});
