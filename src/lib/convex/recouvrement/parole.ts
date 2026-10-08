import { v, ConvexError } from 'convex/values';
import type { MutationCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';
import { authedMutation, authedQuery } from '../functions';
import { getUserOrg } from '../lib/auth';
import { estDateReelle } from '../../verticales/recouvrement/calendrier';
import { versements } from '../../verticales/recouvrement/gabarits/accord-echeancier';
import { lireEcheancier, pauseDuPlan } from '../../verticales/recouvrement/parole';
import { paroleDuDossier } from './plan';

/**
 * LA PAROLE DU CLIENT, LUE DANS LA BASE — voir `verticales/recouvrement/parole.ts`.
 *
 * La page d'un dossier dit si le plan se tait et pourquoi, et où en est
 * l'échéancier ; quand le client donne sa parole, la relance que le pilote avait
 * programmée ne part pas.
 */

const vPause = v.object({
	jusquAu: v.string(),
	raison: v.union(v.literal('PROMESSE'), v.literal('ECHEANCIER')),
	le: v.string(),
	montant: v.optional(v.int64())
});

const vEtatEcheance = v.union(
	v.literal('PAYEE'),
	v.literal('PARTIELLE'),
	v.literal('A_VENIR'),
	v.literal('EN_RETARD')
);

const vEcheancierLu = v.object({
	id: v.id('suiviDossier'),
	accordeLe: v.string(),
	etat: v.union(
		v.literal('EN_COURS'),
		v.literal('EN_RETARD'),
		v.literal('TERMINE'),
		v.literal('ARRETE')
	),
	total: v.int64(),
	paye: v.int64(),
	payees: v.number(),
	prochaine: v.union(v.null(), v.number()),
	echeances: v.array(
		v.object({ le: v.string(), montant: v.int64(), paye: v.int64(), etat: vEtatEcheance })
	)
});

/**
 * Ce que le client a dit, sur un dossier : la pause du plan, l'échéancier qui
 * court (le plus récent qui n'a pas été arrêté), et ce qui reste dû — de quoi
 * proposer un échéancier sur la bonne somme.
 */
export const duDossier = authedQuery({
	args: { creanceId: v.id('creances') },
	returns: v.union(
		v.null(),
		v.object({
			pause: v.union(v.null(), vPause),
			echeancier: v.union(v.null(), vEcheancierLu),
			resteDu: v.int64()
		})
	),
	handler: async (ctx, { creanceId }) => {
		const { organizationId } = await getUserOrg(ctx);
		const creance = await ctx.db.get(creanceId);
		if (creance === null || creance.organizationId !== organizationId) return null;
		const factures = await ctx.db
			.query('facturesVente')
			.withIndex('by_creance', (q) => q.eq('creanceId', creanceId))
			.collect();
		const aujourdHui = new Date().toISOString().slice(0, 10);
		const parole = await paroleDuDossier(ctx, creanceId, factures);
		const pause = pauseDuPlan({
			promesses: parole.promesses,
			echeanciers: parole.echeanciers,
			reglements: parole.reglements,
			aujourdHui,
			resteDu: parole.resteDu
		});
		const dernier = [...parole.echeanciers]
			.filter((e) => e.issue !== 'NON_TENUE')
			.sort((a, b) => b.ecritLe - a.ecritLe)[0];
		const lu =
			dernier === undefined ? null : lireEcheancier(dernier, parole.reglements, aujourdHui);
		return {
			pause,
			echeancier:
				dernier === undefined || lu === null
					? null
					: {
							id: dernier.id,
							accordeLe: dernier.accordeLe,
							etat: lu.etat,
							total: lu.total,
							paye: lu.paye,
							payees: lu.payees,
							prochaine: lu.prochaine,
							echeances: lu.echeances.map((e) => ({
								le: e.le,
								montant: e.montant,
								paye: e.paye,
								etat: e.etat
							}))
						},
			resteDu: parole.resteDu
		};
	}
});

/**
 * APRÈS UNE PAROLE DU CLIENT — une promesse notée, un échéancier convenu.
 *
 * ⚠️ LA RELANCE QUE LE PILOTE A PROGRAMMÉE NE PART PAS. Elle partait dans
 * l'heure, écrite avant que le client donne sa parole : elle est abandonnée, et
 * le plan la reprogrammera seul si la parole n'est pas tenue. Un courrier
 * préparé par le gérant n'est pas touché : c'est le sien.
 */
export async function apresUneParole(ctx: MutationCtx, creanceId: Id<'creances'>): Promise<void> {
	const envois = await ctx.db
		.query('envois')
		.withIndex('by_creance', (q) => q.eq('creanceId', creanceId))
		.collect();
	for (const envoi of envois) {
		if (envoi.etat !== 'PROGRAMME' || envoi.preparePar !== 'pilote') continue;
		if (envoi.envoiProgramme !== undefined) await ctx.scheduler.cancel(envoi.envoiProgramme);
		await ctx.db.patch(envoi._id, { etat: 'ABANDONNE', envoiProgramme: undefined });
	}
}

/** Les cadences qu'un échéancier propose : une fois par mois, ou toutes les deux semaines. */
const NOMBRES_ADMIS = [2, 3, 4, 5, 6, 8, 10, 12] as const;

/**
 * CONVENIR D'UN ÉCHÉANCIER — le client paiera en plusieurs fois.
 *
 * ⚠️ LA SOMME EST CE QUI RESTE DÛ SUR LES FACTURES, HORS PÉNALITÉS, et c'est
 * écrit sur la feuille. C'est ce que le gérant a au téléphone ; l'accord écrit
 * à faire signer (\`ACCORD_ECHEANCIER\`, dans Courriers) chiffre, lui, le
 * décompte arrêté.
 *
 * ⚠️ PARTS ÉGALES AU CENTIME, LE RELIQUAT SUR LE DERNIER — la même règle que
 * l'accord écrit (\`versements\`), pour que les deux ne se contredisent jamais.
 *
 * ⚠️ UN SEUL À LA FOIS. Un échéancier qui court se termine ou s'arrête avant
 * qu'on en convienne d'un autre : deux calendriers sur une même dette ne
 * diraient plus lequel compte.
 */
export const convenirEcheancier = authedMutation({
	args: {
		creanceId: v.id('creances'),
		nombre: v.number(),
		premiereLe: v.string(),
		intervalleMois: v.number()
	},
	returns: v.id('suiviDossier'),
	handler: async (ctx, args): Promise<Id<'suiviDossier'>> => {
		const { organizationId, user } = await getUserOrg(ctx);
		const creance = await ctx.db.get(args.creanceId);
		if (creance === null || creance.organizationId !== organizationId) {
			throw new ConvexError('Dossier introuvable');
		}
		if (!(NOMBRES_ADMIS as readonly number[]).includes(args.nombre)) {
			throw new ConvexError('Choisissez un nombre de versements entre 2 et 12.');
		}
		if (args.intervalleMois !== 1) {
			throw new ConvexError('Les versements sont mensuels.');
		}
		const aujourdHui = new Date().toISOString().slice(0, 10);
		if (!estDateReelle(args.premiereLe) || args.premiereLe < aujourdHui) {
			throw new ConvexError('Le premier versement tombe aujourd’hui ou plus tard.');
		}
		const factures = await ctx.db
			.query('facturesVente')
			.withIndex('by_creance', (q) => q.eq('creanceId', args.creanceId))
			.collect();
		const parole = await paroleDuDossier(ctx, args.creanceId, factures);
		if (parole.resteDu <= 0n) throw new ConvexError('Il ne reste rien à payer sur ce dossier.');
		const encours = parole.echeanciers.some((e) => {
			const lu = lireEcheancier(e, parole.reglements, aujourdHui);
			return lu.etat === 'EN_COURS' || lu.etat === 'EN_RETARD';
		});
		if (encours) {
			throw new ConvexError('Un échéancier court déjà sur ce dossier : arrêtez-le d’abord.');
		}

		const echeances = versements(
			parole.resteDu,
			args.nombre,
			args.premiereLe,
			args.intervalleMois
		).map((versement) => ({ le: versement.date, montant: versement.montant }));
		const entreeId = await ctx.db.insert('suiviDossier', {
			organizationId,
			creanceId: args.creanceId,
			genre: 'ECHEANCIER',
			texte: `Paiement en ${args.nombre} fois, un versement par mois`,
			echeances,
			auteurUserId: user._id,
			ecritLe: Date.now()
		});
		await apresUneParole(ctx, args.creanceId);
		return entreeId;
	}
});

/**
 * ARRÊTER UN ÉCHÉANCIER — le gérant n'y croit plus, ou le client a soldé autrement.
 *
 * ⚠️ IL NE SE SUPPRIME PAS. Il reste dans l'historique, arrêté, avec ses dates :
 * ce qui a été convenu un jour fait partie du dossier. Le plan de relance
 * reprend à la veille suivante.
 */
export const arreterEcheancier = authedMutation({
	args: { entreeId: v.id('suiviDossier') },
	returns: v.null(),
	handler: async (ctx, { entreeId }): Promise<null> => {
		const { organizationId } = await getUserOrg(ctx);
		const entree = await ctx.db.get(entreeId);
		if (entree === null || entree.organizationId !== organizationId) {
			throw new ConvexError('Échéancier introuvable');
		}
		if (entree.genre !== 'ECHEANCIER') throw new ConvexError('Ce n’est pas un échéancier.');
		await ctx.db.patch(entreeId, { issue: 'NON_TENUE' });
		return null;
	}
});
