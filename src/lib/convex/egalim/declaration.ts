import { v } from 'convex/values';
import { authedQuery } from '../functions';
import { getUserOrg } from '../lib/auth';
import { SEUILS, LABELS_QUALIFIANTS, categorieDeclaration } from '../../egalim/referentiel';
import type { Label } from '../../egalim/types';
import { vFamille, vLabel } from './tables';

/**
 * Le récapitulatif de télédéclaration.
 *
 * CE QU'IL CHANGE. Jusqu'ici, le produit rendait trois taux et s'arrêtait là.
 * Or le gérant ne paie pas pour connaître son taux : il paie pour remplir sa
 * déclaration avant le 31 mars. Sans cet écran, il devait relire son tableau de
 * bord, retrouver les montants derrière les pourcentages, et les recopier — la
 * seule étape du parcours où il pouvait encore se tromper tout seul.
 *
 * CE QUE C'EST, ET CE QUE CE N'EST PAS. C'est un récapitulatif fait pour être
 * recopié dans la téléprocédure, champ par champ, plus un export CSV pour les
 * archives et le comptable. **Ce n'est pas un fichier d'import officiel** : le
 * format attendu par « ma cantine » n'est pas figé dans ce code, et fabriquer
 * un fichier en prétendant qu'il s'importe serait la pire promesse possible sur
 * un acte réglementaire. L'écran le dit en toutes lettres.
 *
 * IL LIT LES LIGNES VIVANTES, pas un diagnostic figé. Les deux répondent à des
 * questions différentes : le diagnostic dit « voilà ce que valait la mesure au
 * 14 mars », le récapitulatif dit « voilà ce que je déclare aujourd'hui ». Si
 * le gérant a corrigé une classification depuis, c'est la version corrigée
 * qu'il doit déclarer.
 *
 * IL DIT CE QU'IL NE COUVRE PAS. Le montant non classé et le montant encore en
 * attente de confirmation sont rendus à part, et affichés. Une déclaration
 * établie sur des achats partiellement mesurés reste défendable si on sait
 * lesquels ; elle ne l'est plus si on l'ignore.
 */

const vCategorie = v.object({
	label: vLabel,
	libelle: v.string(),
	montantHT: v.number()
});

export const recapitulatif = authedQuery({
	args: { annee: v.string() },
	returns: v.object({
		annee: v.string(),
		etablissement: v.object({
			nom: v.string(),
			siret: v.union(v.string(), v.null())
		}),

		/** Les trois montants que demande la déclaration simplifiée. */
		totalAlimentaireHT: v.number(),
		bioHT: v.number(),
		durableHorsBioHT: v.number(),

		taux: v.object({
			durable: v.number(),
			bio: v.number(),
			viandePoissonDurable: v.number()
		}),
		seuils: v.object({
			durable: v.number(),
			bio: v.number(),
			viandePoissonDurable: v.number()
		}),

		/** La ventilation détaillée, chaque produit dans une seule catégorie. */
		parCategorie: v.array(vCategorie),
		parFamille: v.array(
			v.object({
				family: vFamille,
				totalHT: v.number(),
				bioHT: v.number(),
				durableHorsBioHT: v.number()
			})
		),

		/** Ce que la mesure NE couvre pas. Affiché, jamais tu. */
		nonClasseHT: v.number(),
		aConfirmerHT: v.number(),
		facturesIllisibles: v.number(),

		/** Faux tant qu'il reste des achats à confirmer ou des fichiers illisibles. */
		pret: v.boolean()
	}),
	handler: async (ctx, { annee }) => {
		const { organizationId, org } = await getUserOrg(ctx);

		const lignes = await ctx.db
			.query('invoiceLines')
			.withIndex('by_org_and_date', (q) =>
				q
					.eq('organizationId', organizationId)
					.gte('invoiceDate', `${annee}-01-01`)
					.lte('invoiceDate', `${annee}-12-31`)
			)
			.collect();

		let totalAlimentaireHT = 0;
		let bioHT = 0;
		let durableHorsBioHT = 0;
		let nonClasseHT = 0;
		let aConfirmerHT = 0;
		let viandePoissonHT = 0;
		let viandePoissonDurableHT = 0;

		const parCategorie = new Map<Label, number>();
		const parFamille = new Map<
			string,
			{ totalHT: number; bioHT: number; durableHorsBioHT: number }
		>();

		for (const l of lignes) {
			if (l.reviewStatus === 'PENDING_REVIEW') {
				aConfirmerHT += Math.abs(l.amountHT);
			}

			// Une ligne sans classification n'est comptée NULLE PART, jamais du
			// côté non qualifiant. La ranger en non-durable ferait baisser le taux
			// sans qu'aucun contrôle ne puisse le voir — c'est le même défaut que
			// le doublon, en sens inverse.
			if (l.isFood === undefined || l.family === undefined) {
				nonClasseHT += Math.abs(l.amountHT);
				continue;
			}
			if (!l.isFood) continue;

			const montant = l.amountHT;
			totalAlimentaireHT += montant;

			const labels = (l.qualifyingLabels ?? []) as Label[];
			const bio = l.isBio === true;
			const durable = l.isDurable === true;

			if (bio) bioHT += montant;
			else if (durable) durableHorsBioHT += montant;

			if (l.family === 'VIANDE' || l.family === 'POISSON') {
				viandePoissonHT += montant;
				if (durable) viandePoissonDurableHT += montant;
			}

			const categorie = categorieDeclaration(labels);
			if (categorie) {
				parCategorie.set(categorie, (parCategorie.get(categorie) ?? 0) + montant);
			}

			const f = parFamille.get(l.family) ?? { totalHT: 0, bioHT: 0, durableHorsBioHT: 0 };
			f.totalHT += montant;
			if (bio) f.bioHT += montant;
			else if (durable) f.durableHorsBioHT += montant;
			parFamille.set(l.family, f);
		}

		const documents = await ctx.db
			.query('invoiceDocuments')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();
		const facturesIllisibles = documents.filter(
			(d) =>
				d.extractionStatus === 'FAILED' &&
				(d.invoiceDate === undefined || d.invoiceDate.startsWith(annee))
		).length;

		// Une division par zéro rendrait NaN, qui traverse tout le produit sans
		// bruit et s'affiche « NaN % » au moment le plus visible de l'année.
		const part = (numerateur: number, denominateur: number) =>
			denominateur > 0 ? numerateur / denominateur : 0;

		return {
			annee,
			etablissement: {
				nom: org.name ?? '',
				siret: org.siret ?? null
			},
			totalAlimentaireHT,
			bioHT,
			durableHorsBioHT,
			taux: {
				durable: part(bioHT + durableHorsBioHT, totalAlimentaireHT),
				bio: part(bioHT, totalAlimentaireHT),
				viandePoissonDurable: part(viandePoissonDurableHT, viandePoissonHT)
			},
			seuils: SEUILS,
			parCategorie: [...parCategorie.entries()]
				.map(([label, montantHT]) => ({
					label,
					libelle: LABELS_QUALIFIANTS[label].libelle,
					montantHT
				}))
				.sort((a, b) => b.montantHT - a.montantHT),
			parFamille: [...parFamille.entries()]
				.map(([family, f]) => ({ family: family as never, ...f }))
				.filter((f) => f.totalHT !== 0)
				.sort((a, b) => b.totalHT - a.totalHT),
			nonClasseHT,
			aConfirmerHT,
			facturesIllisibles,
			pret: aConfirmerHT === 0 && nonClasseHT === 0 && facturesIllisibles === 0
		};
	}
});
