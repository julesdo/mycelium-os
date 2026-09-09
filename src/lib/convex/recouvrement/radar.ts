import { v } from 'convex/values';
import { internalAction, internalMutation } from '../_generated/server';
import { internal } from '../_generated/api';
import { lireAnnonce } from '../../verticales/recouvrement/pays/france/bodacc';
import type { ConstatBodacc } from '../../verticales/recouvrement/pays/france/bodacc';

/**
 * LE RADAR DE SOLVABILITÉ — le delta quotidien du BODACC, appliqué.
 *
 * Toute la lecture d'une annonce vit dans
 * `verticales/recouvrement/pays/france/bodacc.ts` : ce fichier interroge,
 * rapproche et écrit. Il ne classe rien.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * UN DELTA, PAS UN BALAYAGE — ET AUCUN CACHE MUTUALISÉ
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Le BODACC porte 3,3 millions d'annonces de procédure collective. On ne lit
 * que celles PARUES le jour traité, on les applique, et on les jette.
 *
 * `docs/blueprint/B-PRODUIT-TECH.md` § 5 annonçait que ce radar « tentera
 * d'introduire la première exception au multi-tenant » avec un cache BODACC
 * partagé. **On ne le fait pas, et on n'en a pas besoin.** La donnée publique
 * atterrit uniquement là où elle est déjà pertinente : sur la fiche débiteur du
 * client, déjà cloisonnée. Aucune table hors organisation, aucune ligne à
 * ajouter à la purge RGPD, et la doctrine « rien n'est mutualisé, donc rien
 * n'est épargné » tient telle quelle.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ ON NE CLASSE QUE DANS UN SENS
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Une annonce peut faire basculer un débiteur en `PROCEDURE_COLLECTIVE` ou
 * `RADIEE`. **Aucune ne le ramène à `SAINE`.** Décider qu'une entreprise va de
 * nouveau bien est une lecture juridique, et elle irait dans le sens qui fait
 * engager des frais sur un débiteur qui ne paiera pas. Un jugement de clôture
 * enregistre son constat, visible ; l'état reste où il est jusqu'à ce qu'un
 * humain en décide.
 */

const vConstat = v.object({
	identifiantAnnonce: v.string(),
	siren: v.string(),
	dateParution: v.string(),
	nature: v.string(),
	dateJugement: v.optional(v.string()),
	tribunal: v.optional(v.string()),
	url: v.string(),
	effetSurLaSante: v.union(
		v.literal('PROCEDURE_COLLECTIVE'),
		v.literal('RADIEE'),
		v.literal('AUCUN')
	)
});

/**
 * Applique un lot de constats aux débiteurs qui portent le SIREN visé.
 *
 * ⚠️ LE RAPPROCHEMENT SE FAIT PAR IDENTIFIANT, JAMAIS PAR RAISON SOCIALE. Sur un
 * flux national, une correspondance de nom finit par annoncer à un gérant que
 * son client solvable est en liquidation — et il cesse de le livrer. Un débiteur
 * sans SIREN n'est donc pas surveillé, et l'écran le DIT au lieu de le laisser
 * croire couvert.
 *
 * ⚠️ ET ELLE TRAVERSE LES ORGANISATIONS, PAR CONSTRUCTION. Deux clients peuvent
 * suivre le même débiteur ; n'en servir qu'un laisserait l'autre engager des
 * frais. C'est la raison d'être de l'index `by_siren`, le seul du produit qui ne
 * commence pas par `organizationId` — et un test refuse qu'une fonction
 * authentifiée le nomme.
 */
export const appliquerConstats = internalMutation({
	args: { constats: v.array(vConstat) },
	returns: v.object({ debiteursTouches: v.number() }),
	handler: async (ctx, { constats }): Promise<{ debiteursTouches: number }> => {
		let debiteursTouches = 0;

		for (const constat of constats) {
			const concernes = await ctx.db
				.query('debiteurs')
				.withIndex('by_siren', (q) => q.eq('siren', constat.siren))
				.collect();

			for (const debiteur of concernes) {
				// IDEMPOTENCE. Le delta se rejoue après un incident, et un second
				// passage ne doit pas écraser `santePrecedente` par l'état que le
				// premier vient de poser — la dégradation disparaîtrait du flux.
				if (debiteur.constatRegistre?.identifiantAnnonce === constat.identifiantAnnonce) {
					continue;
				}

				// L'état visé, ou `null` quand l'annonce n'en désigne aucun. Nommé
				// plutôt que déduit d'un booléen : c'est ce qui permet à TypeScript
				// de constater que `AUCUN` n'est jamais écrit en base — `AUCUN` est un
				// verdict de lecture, pas un état de santé.
				const vise =
					constat.effetSurLaSante === 'AUCUN' ||
					constat.effetSurLaSante === debiteur.santeFinanciere
						? null
						: constat.effetSurLaSante;

				await ctx.db.patch(debiteur._id, {
					constatRegistre: {
						identifiantAnnonce: constat.identifiantAnnonce,
						dateParution: constat.dateParution,
						nature: constat.nature,
						dateJugement: constat.dateJugement,
						tribunal: constat.tribunal,
						url: constat.url
					},
					...(vise === null
						? {}
						: {
								santePrecedente: debiteur.santeFinanciere,
								santeFinanciere: vise,
								santeConstateeLe: Date.now()
							})
				});
				debiteursTouches += 1;
			}
		}

		return { debiteursTouches };
	}
});

/** Ce qu'une page de l'API rend au plus. Le maximum accepté par OpenDataSoft. */
const PAR_PAGE = 100;
/**
 * Le nombre de pages qu'on accepte de lire en une nuit.
 *
 * BORNE DURE, ET DÉLIBÉRÉE. Un jour de forte activité publie quelques milliers
 * d'annonces de procédure collective ; dix mille est large. Sans borne, une
 * réponse inattendue de l'API — un filtre ignoré, par exemple — ferait boucler
 * l'action sur trois millions d'enregistrements.
 */
const PAGES_MAX = 100;

const BASE_BODACC =
	'https://bodacc-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/annonces-commerciales/records';

/**
 * Le delta d'un jour, lu puis appliqué.
 *
 * ⚠️ UNE ANNONCE ILLISIBLE N'EMPORTE PAS LE LOT. `lireAnnonce` rend `null` sur
 * ce qu'elle ne sait pas lire — un `jugement` dont le JSON est cassé, un SIREN
 * qui ne passe pas sa clé — et la boucle continue. Sur un flux de plusieurs
 * millions d'enregistrements, une donnée aberrante finit toujours par arriver ;
 * elle ne doit pas éteindre la surveillance de tout le monde pour une nuit.
 */
export const lireDeltaDuJour = internalAction({
	args: { jour: v.string() },
	returns: v.object({ annoncesLues: v.number(), debiteursTouches: v.number() }),
	handler: async (ctx, { jour }): Promise<{ annoncesLues: number; debiteursTouches: number }> => {
		let annoncesLues = 0;
		let debiteursTouches = 0;

		for (let page = 0; page < PAGES_MAX; page++) {
			const url =
				`${BASE_BODACC}?limit=${PAR_PAGE}&offset=${page * PAR_PAGE}` +
				`&where=${encodeURIComponent(`dateparution="${jour}" AND (familleavis="collective" OR familleavis="radiation")`)}`;

			const reponse = await fetch(url);
			if (!reponse.ok) {
				throw new Error(
					`BODACC a répondu ${reponse.status} sur la page ${page} du ${jour}. ` +
						'Le relevé du jour est incomplet.'
				);
			}

			const charge = (await reponse.json()) as { results?: unknown[] };
			const enregistrements = Array.isArray(charge.results) ? charge.results : [];
			if (enregistrements.length === 0) break;

			annoncesLues += enregistrements.length;

			const constats = enregistrements
				.map((brut) => lireAnnonce(brut))
				.filter((constat): constat is ConstatBodacc => constat !== null);

			if (constats.length > 0) {
				const bilan = await ctx.runMutation(internal.recouvrement.radar.appliquerConstats, {
					constats
				});
				debiteursTouches += bilan.debiteursTouches;
			}

			if (enregistrements.length < PAR_PAGE) break;
		}

		return { annoncesLues, debiteursTouches };
	}
});

/**
 * Le radar quotidien.
 *
 * ⚠️ IL LIT LA VEILLE, PAS LE JOUR MÊME. Le BODACC publie au fil de la journée ;
 * interroger le jour courant à trois heures du matin rendrait une page vide, et
 * le produit se croirait à jour.
 */
export const radarQuotidien = internalAction({
	args: {},
	returns: v.null(),
	handler: async (ctx): Promise<null> => {
		const hier = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
		await ctx.runAction(internal.recouvrement.radar.lireDeltaDuJour, { jour: hier });
		return null;
	}
});
