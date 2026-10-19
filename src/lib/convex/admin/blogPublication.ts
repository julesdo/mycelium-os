'use node';

import { compile } from '@mdx-js/mdx';
import remarkGfm from 'remark-gfm';
import { ConvexError, v } from 'convex/values';
import { internal } from '../_generated/api';
import {
	configurationDepuis,
	DOSSIER_DU_BLOG,
	ecrireLeFichier,
	ErreurGitHub
} from '../../blog/github';
import { ecrireArticle, lireArticle, relireArticle } from '../../blog/source';
import { equipeAction } from './action';

/**
 * PUBLIER UN ARTICLE DU BLOG (19/10/2026) : un commit sur la branche que Vercel déploie.
 * Le site se reconstruit seul, et l'article paraît à sa date, à Paris.
 *
 * ⚠️ RIEN NE PART QUE LA CONSTRUCTION REFUSERAIT. Un article qui casse le build bloquerait
 * TOUS les déploiements suivants, code compris. Avant d'écrire : l'en-tête passe le schéma
 * du build (`blog/schema.ts`), le corps se compile comme content-collections le compile
 * (MDX, remark-gfm), et la relecture n'a aucun bloquant (mot interdit, source absente du
 * registre, adresse invalide). Le fondateur seul publie ; chaque publication va au journal.
 */
export const publier = equipeAction('FONDATEUR')({
	args: {
		adresse: v.string(),
		source: v.string(),
		/** L'empreinte lue à l'ouverture ; absente pour un nouvel article. */
		sha: v.optional(v.string())
	},
	returns: v.object({ commit: v.string(), url: v.string(), sha: v.string() }),
	handler: async (ctx, { adresse, source, sha }) => {
		const config = configurationDepuis(process.env);
		if (config === null)
			throw new ConvexError('GitHub n’est pas branché : GITHUB_CMS_TOKEN manque.');

		const lu = lireArticle(source);
		if ('erreurs' in lu) throw new ConvexError(lu.erreurs.join(' '));
		const { bloquants } = relireArticle(adresse, lu, []);
		if (bloquants.length > 0) throw new ConvexError(bloquants.join(' '));
		try {
			await compile(lu.corps, { remarkPlugins: [remarkGfm] });
		} catch (e) {
			throw new ConvexError(`Le corps ne se compile pas : ${(e as Error).message}`);
		}

		// Réécrit dans la forme canonique : l'en-tête dans son ordre, sans valeur par défaut.
		const texte = ecrireArticle(lu);
		const message =
			`blog : ${lu.entete.titre}\n\n` +
			`${sha === undefined ? 'Créé' : 'Modifié'} depuis l’admin de Letikette par ${ctx.equipier.email}.`;
		try {
			const resultat = await ecrireLeFichier(
				config,
				`${DOSSIER_DU_BLOG}/${adresse}.mdx`,
				texte,
				message,
				sha
			);
			await ctx.runMutation(internal.admin.blogJournal.noterPublication, {
				auteur: ctx.equipier.email,
				adresse,
				titre: lu.entete.titre
			});
			return resultat;
		} catch (e) {
			if (e instanceof ErreurGitHub) throw new ConvexError(e.message);
			throw e;
		}
	}
});
