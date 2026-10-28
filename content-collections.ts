import { defineCollection, defineConfig } from '@content-collections/core';
import { compileMDX } from '@content-collections/mdx';
import remarkGfm from 'remark-gfm';
import { z } from 'zod';
import { ancreDe } from './src/marketing/ancre';
import { ADRESSE_VALIDE, schemaEnteteArticle } from './src/lib/blog/schema';

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

/** L'adresse d'un article : son nom de fichier, en minuscules, chiffres et tirets. */

/** Les intertitres de niveau 2, pour le sommaire : `## Le titre` en début de ligne. */
const INTERTITRE = /^##\s+(.+?)\s*$/gm;

const articles = defineCollection({
	name: 'articles',
	typeName: 'ArticleBlog',
	directory: 'content/blog',
	include: '**/*.mdx',
	// L'en-tête vit dans `src/lib/blog/schema.ts`, que le CMS de l'admin lit aussi : ce que le
	// build refuse, l'admin refuse de le publier.
	schema: schemaEnteteArticle.extend({
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

/**
 * LES MÊMES ARTICLES, SANS LEUR CORPS (28/10/2026) : ce que montre l'accueil du site (le titre,
 * l'« En bref », l'étiquette, la durée de lecture). Lire `allArticles` dans l'accueil y ferait
 * entrer le texte compilé de chaque article ; `allResumes` n'en porte que l'en-tête.
 */
const resumes = defineCollection({
	name: 'resumes',
	typeName: 'ResumeDArticle',
	directory: 'content/blog',
	include: '**/*.mdx',
	schema: schemaEnteteArticle.extend({ content: z.string() }),
	transform: (article) => {
		const { content, ...entete } = article;
		const mots = content.split(/\s+/).filter(Boolean).length;
		return { ...entete, adresse: article._meta.path, minutes: Math.max(1, Math.round(mots / 200)) };
	}
});

export default defineConfig({
	content: [articles, resumes]
});
