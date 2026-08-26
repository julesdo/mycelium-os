import { v } from 'convex/values';
import { internalMutation } from '../_generated/server';
import { internal } from '../_generated/api';
import type { MutationCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';

/**
 * Le rappel de la campagne « ma cantine ».
 *
 * LE SEUL DÉCLENCHEUR CALENDAIRE DU PRODUIT. Tout le reste part d'une action du
 * gérant : il dépose, la lecture se termine, un bilan sort. Ici, c'est la date
 * qui décide, parce que l'échéance est réelle et qu'un dossier oublié en février
 * ne se signale jamais tout seul.
 *
 * DEUX ENVOIS, PAS DIX. Le 1er février, quand il reste deux mois pour agir, et
 * le 15 mars, quand il reste deux semaines. Un rappel hebdomadaire ferait de
 * nous un expéditeur qu'on met en indésirable, et le premier réflexe d'un gérant
 * agacé est de bloquer l'adresse — celle-là même qui porte aussi ses bilans.
 *
 * ON N'ÉCRIT QU'À CEUX QUI ONT DÉPOSÉ QUELQUE CHOSE. Un établissement inscrit
 * qui n'a jamais rien envoyé n'a pas de dossier à sauver : lui rappeler une
 * échéance serait de la prospection déguisée en service, et ça ne se fait pas
 * depuis l'adresse qui sert aux e-mails transactionnels.
 *
 * LE MESSAGE DÉPEND DE L'ÉTAT DU DOSSIER, et c'est tout l'intérêt : voir
 * `rappelDeclaration.ts`. Un bilan prêt appelle « allez saisir », une file
 * pleine appelle « il reste douze produits », un exercice incomplet appelle
 * « il manque des mois ».
 */

/**
 * Combien d'établissements par transaction.
 *
 * Une mutation Convex a des limites de lecture et d'écriture, et un
 * `.collect()` sur toute une table les franchit dès que le produit marche. On
 * pagine donc, et chaque page programme la suivante dans une transaction
 * neuve. Cinquante est prudent : chaque établissement coûte trois requêtes
 * indexées.
 */
const PAR_PAGE = 50;

/**
 * L'exercice concerné par la campagne en cours.
 *
 * La déclaration qui ferme le 31 mars porte sur l'ANNÉE CIVILE PRÉCÉDENTE.
 * Envoyer un rappel sur l'année en cours, en février, n'aurait aucun sens :
 * elle vient de commencer.
 */
function exerciceDeLaCampagne(maintenant: number): number {
	return new Date(maintenant).getUTCFullYear() - 1;
}

/**
 * Ce qu'on peut dire à cet établissement, ou rien du tout.
 *
 * Renvoie `null` quand il n'y a pas lieu d'écrire : aucune facture déposée sur
 * l'exercice. C'est le seul filtre, et il est volontairement strict.
 */
async function etatDuDossier(
	ctx: MutationCtx,
	organizationId: Id<'organizations'>,
	annee: number
) {
	const debut = `${annee}-01-01`;
	const fin = `${annee}-12-31`;

	const lignes = await ctx.db
		.query('invoiceLines')
		.withIndex('by_org_and_date', (q) =>
			q.eq('organizationId', organizationId).gte('invoiceDate', debut).lte('invoiceDate', fin)
		)
		.take(5000);

	if (lignes.length === 0) return null;

	const diagnostics = await ctx.db
		.query('diagnostics')
		.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
		.collect();

	const pourLExercice = diagnostics.filter(
		(d) => d.periodStart <= fin && d.periodEnd >= debut
	);
	if (pourLExercice.length > 0) {
		return { situation: 'BILAN_PRET' as const, annee };
	}

	const enAttente = lignes.filter((l) => l.reviewStatus === 'PENDING_REVIEW');
	if (enAttente.length > 0) {
		return {
			situation: 'FILE_PLEINE' as const,
			annee,
			aConfirmer: new Set(enAttente.map((l) => l.normalizedLabel)).size
		};
	}

	// Ni bilan ni file : il manque de la matière. On compte les mois réellement
	// couverts plutôt que d'affirmer « votre exercice est incomplet » sans dire
	// de combien.
	const mois = new Set(lignes.map((l) => l.invoiceDate.slice(0, 7)));
	return { situation: 'INCOMPLET' as const, annee, moisCouverts: mois.size };
}

export const rappelerLaCampagne = internalMutation({
	args: { curseur: v.optional(v.union(v.string(), v.null())) },
	returns: v.null(),
	handler: async (ctx, { curseur }) => {
		const annee = exerciceDeLaCampagne(Date.now());

		const page = await ctx.db
			.query('organizations')
			.paginate({ cursor: curseur ?? null, numItems: PAR_PAGE });

		for (const org of page.page) {
			const etat = await etatDuDossier(ctx, org._id, annee);
			if (!etat) continue;
			await ctx.scheduler.runAfter(0, internal.emails.envoiProduit.envoyerRappelDeclaration, {
				organizationId: org._id,
				etat
			});
		}

		if (!page.isDone) {
			await ctx.scheduler.runAfter(0, internal.egalim.rappels.rappelerLaCampagne, {
				curseur: page.continueCursor
			});
		}
		return null;
	}
});
