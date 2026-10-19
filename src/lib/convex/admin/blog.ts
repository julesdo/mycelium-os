import { ConvexError, v } from 'convex/values';
import {
	configurationDepuis,
	DOSSIER_DU_BLOG,
	ErreurGitHub,
	lireLeFichier,
	listerLesArticles,
	type ConfigurationDepot
} from '../../blog/github';
import { lireArticle } from '../../blog/source';
import { equipeAction } from './action';
import { equipeQuery } from './enveloppe';

/**
 * LE CMS DU BLOG, CÔTÉ LECTURE (19/10/2026). Le fondateur : « un vrai headless CMS GitHub,
 * via Convex branché à GitHub ». Les articles restent les fichiers du dépôt ; Convex les
 * lit par l'API de GitHub, avec un jeton qui ne quitte jamais le serveur. La publication
 * vit dans `blogPublication.ts` (elle compile le MDX, il lui faut Node).
 *
 * DORMANT sans `GITHUB_CMS_TOKEN` : l'écran dit ce qu'il faut poser, rien d'autre.
 */

function configuration(): ConfigurationDepot {
	const config = configurationDepuis(process.env);
	if (config === null) throw new ConvexError('GitHub n’est pas branché : GITHUB_CMS_TOKEN manque.');
	return config;
}

function relayer(e: unknown): never {
	if (e instanceof ErreurGitHub) throw new ConvexError(e.message);
	throw e;
}

/** Le CMS est-il branché, et sur quel dépôt ? Le jeton n'en sort jamais. */
export const etat = equipeQuery('LECTURE')({
	args: {},
	returns: v.object({
		branche: v.boolean(),
		depot: v.union(v.string(), v.null()),
		brancheGit: v.union(v.string(), v.null())
	}),
	handler: async () => {
		const config = configurationDepuis(process.env);
		return {
			branche: config !== null,
			depot: config?.depot ?? null,
			brancheGit: config?.branche ?? null
		};
	}
});

const vArticleListe = v.object({
	adresse: v.string(),
	sha: v.string(),
	titre: v.union(v.string(), v.null()),
	description: v.union(v.string(), v.null()),
	date: v.union(v.string(), v.null()),
	categorie: v.union(v.string(), v.null()),
	pilier: v.union(v.string(), v.null()),
	brouillon: v.boolean(),
	/** L'en-tête ne se lit pas : l'article casserait la construction. */
	erreurs: v.array(v.string())
});

/** Les articles du dépôt, avec ce que dit leur en-tête. */
export const lister = equipeAction('LECTURE')({
	args: {},
	returns: v.array(vArticleListe),
	handler: async () => {
		const config = configuration();
		try {
			const fichiers = await listerLesArticles(config);
			return await Promise.all(
				fichiers.map(async (fichier) => {
					const { texte } = await lireLeFichier(config, fichier.chemin);
					const lu = lireArticle(texte);
					const adresse = fichier.nom.replace(/\.mdx$/, '');
					if ('erreurs' in lu) {
						return {
							adresse,
							sha: fichier.sha,
							titre: null,
							description: null,
							date: null,
							categorie: null,
							pilier: null,
							brouillon: false,
							erreurs: lu.erreurs
						};
					}
					return {
						adresse,
						sha: fichier.sha,
						titre: lu.entete.titre,
						description: lu.entete.description,
						date: lu.entete.date,
						categorie: lu.entete.categorie,
						pilier: lu.entete.pilier ?? null,
						brouillon: lu.entete.brouillon,
						erreurs: []
					};
				})
			);
		} catch (e) {
			return relayer(e);
		}
	}
});

/** Le fichier d'un article et son empreinte, que la publication rendra à GitHub. */
export const lire = equipeAction('LECTURE')({
	args: { adresse: v.string() },
	returns: v.object({ source: v.string(), sha: v.string() }),
	handler: async (_ctx, { adresse }) => {
		if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(adresse)) throw new ConvexError('Adresse invalide.');
		try {
			const { texte, sha } = await lireLeFichier(
				configuration(),
				`${DOSSIER_DU_BLOG}/${adresse}.mdx`
			);
			return { source: texte, sha };
		} catch (e) {
			return relayer(e);
		}
	}
});
