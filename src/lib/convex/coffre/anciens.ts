'use node';

import { v } from 'convex/values';
import { internalAction } from '../_generated/server';
import { internal } from '../_generated/api';
import { lireAuCoffre } from './serrure';

/**
 * LES DOCUMENTS D'AVANT LE COFFRE, SCELLÉS À LEUR TOUR (12/10/2026).
 *
 * Les dépôts et pièces enregistrés avant le coffre sont en clair dans le
 * stockage. Cette action les scelle un à un — vérification, empreinte,
 * chiffrement, original effacé —, puis reporte le nouveau fichier sur les
 * factures qu'un dépôt avait produites. Elle se relance tant qu'il en reste.
 *
 * À lancer une fois après le déploiement :
 *   npx convex run --prod coffre/anciens:scellerLesAnciens
 *
 * ⚠️ UN DOCUMENT ANCIEN N'EST JAMAIS EFFACÉ POUR UN FORMAT REFUSÉ. Il a déjà été
 * lu, et soutient peut-être un dossier : il se scelle quand même
 * (`conserverSiRefuse`). Seule une erreur le laisse en clair, et le compte rendu
 * la nomme.
 */
export const scellerLesAnciens = internalAction({
	args: {},
	returns: v.object({ scelles: v.number(), laisses: v.array(v.string()) }),
	// ⚠️ ANNOTATION DE RETOUR OBLIGATOIRE : l'action se relance elle-même.
	handler: async (ctx): Promise<{ scelles: number; laisses: string[] }> => {
		const enClair = await ctx.runQuery(internal.coffre.coffreInterne.documentsEnClair, {});
		let scelles = 0;
		const laisses: string[] = [];
		for (const document of enClair) {
			try {
				const fichier = await lireAuCoffre(ctx, { ...document, conserverSiRefuse: true });
				if ('refus' in fichier) {
					laisses.push(`${document.nom} : ${fichier.refus}`);
					continue;
				}
				scelles += 1;
				if ('importId' in document.cible && fichier.vientDEtreScelle) {
					let curseur: string | null = null;
					do {
						curseur = await ctx.runMutation(internal.coffre.coffreInterne.reporterSurLesFactures, {
							organizationId: document.organizationId,
							ancien: document.storageId,
							nouveau: fichier.storageId,
							curseur
						});
					} while (curseur !== null);
				}
			} catch (erreur) {
				laisses.push(
					`${document.nom} : ${erreur instanceof Error ? erreur.message : 'erreur inconnue'}`
				);
			}
		}
		// Il en reste peut-être : la liste est bornée à cinquante par passage.
		if (enClair.length === 50 && scelles > 0) {
			await ctx.scheduler.runAfter(0, internal.coffre.anciens.scellerLesAnciens, {});
		}
		return { scelles, laisses };
	}
});
