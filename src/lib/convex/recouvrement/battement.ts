import { v } from 'convex/values';
import { internalMutation } from '../_generated/server';
import type { MutationCtx } from '../_generated/server';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { depuisCentimes } from '../../socle/montants';
import { cleEvenement, decider } from '../../verticales/recouvrement/briefing';
import type { Precedent } from '../../verticales/recouvrement/briefing';
import type { Evenement } from '../../verticales/recouvrement/surveillance';

/**
 * LE BATTEMENT QUOTIDIEN — la plomberie, et rien d'autre.
 *
 * Toute la règle vit dans `verticales/recouvrement/briefing.ts` : quoi dire, et
 * surtout s'il y a quelque chose à dire. Ce fichier lit, écrit, planifie et
 * envoie. Il ne décide de rien.
 *
 * ⚠️ ANNOTATIONS DE RETOUR OBLIGATOIRES. Une fonction Convex qui en appelle une
 * autre par `internal.` crée un cycle d'inférence dès que les deux vivent dans
 * le même module : le type `api` ENTIER retombe à `any`, et des dizaines
 * d'erreurs apparaissent dans des fichiers qu'on n'a pas touchés. Chaque
 * handler ci-dessous porte donc son type de retour explicitement.
 */

/**
 * Le dernier relevé ANTÉRIEUR au jour traité, s'il existe.
 *
 * ⚠️ ANTÉRIEUR, ET PAS « LE PLUS RÉCENT ». Rejouer une date passée — ce qui
 * arrive en test et après un incident — ne doit pas se comparer à un relevé du
 * futur, sinon la comparaison des clés n'a plus de sens.
 *
 * Les relevés en ÉCHEC sont écartés : ils ne portent aucune clé, et s'y comparer
 * ferait paraître tous les événements nouveaux le lendemain d'une panne.
 *
 * ⚠️ LECTURE BORNÉE, DÉLIBÉRÉMENT. `by_org_and_jour` trie déjà par jour : en
 * parcourant en ordre décroissant à partir de `jour` (exclu), le premier relevé
 * qui n'est PAS en ÉCHEC est le précédent cherché, et on arrête là. Un
 * `.collect()` sur `by_org` lirait TOUT l'historique de l'organisation à chaque
 * nuit — ~1095 documents à trois ans, ~3650 à dix, un coût qui croît en O(T²)
 * sur la durée de vie du produit et qui finit par heurter la limite de
 * documents lus par transaction ; ce jour-là, le battement de ce client échoue
 * tous les soirs jusqu'à intervention manuelle. Ici, le coût est borné au
 * nombre de nuits en ÉCHEC consécutives juste avant `jour`, plus une — presque
 * toujours une seule lecture. NE PAS « SIMPLIFIER » EN REVENANT AU `.collect()`.
 */
async function precedentDe(
	ctx: MutationCtx,
	organizationId: Id<'organizations'>,
	jour: string
): Promise<Precedent | null> {
	const iterateur = ctx.db
		.query('battements')
		.withIndex('by_org_and_jour', (q) => q.eq('organizationId', organizationId).lt('jour', jour))
		.order('desc');

	for await (const releve of iterateur) {
		if (releve.statut !== 'ECHEC') return { le: releve.jour, cles: releve.cles };
	}
	return null;
}

export const executerPourOrganisation = internalMutation({
	args: {
		organizationId: v.id('organizations'),
		jour: v.string()
	},
	returns: v.null(),
	handler: async (ctx, { organizationId, jour }): Promise<null> => {
		// 1. On ne rejoue pas. Un briefing envoyé deux fois détruit plus de
		//    confiance qu'un briefing manquant.
		const deja = await ctx.db
			.query('battements')
			.withIndex('by_org_and_jour', (q) => q.eq('organizationId', organizationId).eq('jour', jour))
			.unique();
		if (deja !== null) return null;

		try {
			const flux = await ctx.runQuery(internal.recouvrement.surveillance.fluxInterne, {
				organizationId,
				aujourdHui: jour
			});

			const evenements: Evenement[] = flux.evenements.map((brut) => ({
				type: brut.type,
				reference: brut.reference,
				montant: brut.montant === null ? null : depuisCentimes(brut.montant),
				urgence: brut.urgence,
				explication: brut.explication,
				action: brut.action
			}));

			const precedent = await precedentDe(ctx, organizationId, jour);
			const verdict = decider(evenements, precedent, jour);

			await ctx.db.insert('battements', {
				organizationId,
				jour,
				statut: verdict.decision === 'PARLER' ? 'PARLE' : 'TU',
				raison: verdict.raison,
				cles: evenements.map(cleEvenement),
				montantIdentifie: flux.montantIdentifie,
				termineLe: Date.now()
			});

			return null;
		} catch (erreur) {
			// 2. L'échec laisse une trace. Un battement qui plante en silence
			//    laisse le client croire qu'il est surveillé alors qu'il ne l'est
			//    plus — le pire état possible du produit.
			//
			// ⚠️ SI CET INSERT ÉCHOUE À SON TOUR, ON NE LE RATTRAPE PAS. Un `try`
			// imbriqué ici cacherait une erreur d'écriture derrière un succès
			// apparent — pire que de la laisser sortir. En la laissant sortir,
			// Convex abandonne toute la transaction et AUCUN relevé n'est écrit
			// pour ce jour ; c'est un état dégradé assumé, pas rattrapé, pour
			// rester visible (journal, alerte de plateforme) plutôt que d'être
			// étouffé ici.
			await ctx.db.insert('battements', {
				organizationId,
				jour,
				statut: 'ECHEC',
				raison: 'le battement n’a pas pu s’exécuter',
				cles: [],
				montantIdentifie: 0n,
				erreur: erreur instanceof Error ? erreur.message : String(erreur),
				termineLe: Date.now()
			});
			return null;
		}
	}
});
