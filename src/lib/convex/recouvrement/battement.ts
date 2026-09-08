import { v } from 'convex/values';
import { internalMutation } from '../_generated/server';
import type { MutationCtx } from '../_generated/server';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { depuisCentimes } from '../../socle/montants';
import { cleEvenement, decider, composerBriefing } from '../../verticales/recouvrement/briefing';
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
 */
async function precedentDe(
	ctx: MutationCtx,
	organizationId: Id<'organizations'>,
	jour: string
): Promise<Precedent | null> {
	const releves = await ctx.db
		.query('battements')
		.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
		.collect();

	const anterieurs = releves
		.filter((releve) => releve.jour < jour && releve.statut !== 'ECHEC')
		.sort((a, b) => (a.jour < b.jour ? 1 : -1));

	const dernier = anterieurs[0];
	return dernier ? { le: dernier.jour, cles: dernier.cles } : null;
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

			// L'envoi arrive à la tâche suivante. Composer dès maintenant garde la
			// règle exercée par les tests, et rend l'ajout de l'envoi trivial.
			if (verdict.decision === 'PARLER') {
				composerBriefing(evenements, depuisCentimes(flux.montantIdentifie));
			}

			return null;
		} catch (erreur) {
			// 2. L'échec laisse une trace. Un battement qui plante en silence
			//    laisse le client croire qu'il est surveillé alors qu'il ne l'est
			//    plus — le pire état possible du produit.
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
