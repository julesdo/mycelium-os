import { v } from 'convex/values';
import { estRentre } from './jalons';
import type { Id } from '../_generated/dataModel';
import type { QueryCtx } from '../_generated/server';
import { authedMutation, authedQuery } from '../functions';
import { getUserOrg } from '../lib/auth';
import { questionsEnAttente } from './lecture';
import { dossiersPrepares } from './prepares';
import {
	avancement,
	fusionner,
	jourDeParis,
	semaineEnCours,
	serieDeJours,
	somme,
	type ElementDuJour,
	type ParGenre
} from '../../verticales/recouvrement/compagnon/journee';

/**
 * LA JOURNÉE DE PLUME, CÔTÉ BASE (13/10/2026) — les trois défis du jour, la série,
 * la semaine. Les règles vivent dans `verticales/recouvrement/compagnon/journee.ts`.
 *
 * ⚠️ LA LECTURE CALCULE TOUT, L'ÉCRITURE NE FAIT QUE GARDER. `etat` dit l'avancement
 * juste même si `relever` n'est pas encore passé : le plus haut relevé et la journée
 * tenue se fusionnent avec ce qui reste à l'instant. `relever` garde ces deux
 * choses pour demain, quand la série se comptera.
 */

const vParGenre = v.object({ demarrer: v.number(), relire: v.number(), repondre: v.number() });
const vElement = v.union(v.null(), v.object({ dossier: v.string(), client: v.string() }));

/** Assez de jours pour une série d'un an ; au-delà, elle se compte sur ce qu'on lit. */
const JOURS_LUS = 400;

async function nomDuClient(ctx: QueryCtx, creanceId: Id<'creances'>): Promise<string> {
	const creance = await ctx.db.get(creanceId);
	const debiteur = creance === null ? null : await ctx.db.get(creance.debiteurId);
	return debiteur?.denomination ?? 'un client';
}

/** CE QUI ATTEND LE GÉRANT À L'INSTANT — les trois défis, et le premier de chacun. */
async function ceQuiReste(
	ctx: QueryCtx,
	organizationId: Id<'organizations'>
): Promise<{ restants: ParGenre; lettre: ElementDuJour | null; question: ElementDuJour | null }> {
	const prepares = await dossiersPrepares(ctx, organizationId);
	const lettres = await ctx.db
		.query('envois')
		.withIndex('by_org_and_etat', (q) =>
			q.eq('organizationId', organizationId).eq('etat', 'A_VALIDER')
		)
		.take(200);
	const questions = await questionsEnAttente(ctx, organizationId);
	const premiereLettre = lettres[0];
	const premiereQuestion = questions[0];
	return {
		restants: {
			demarrer: prepares.length,
			relire: lettres.length,
			repondre: questions.length
		},
		lettre:
			premiereLettre === undefined
				? null
				: {
						dossier: premiereLettre.creanceId,
						client: await nomDuClient(ctx, premiereLettre.creanceId)
					},
		question:
			premiereQuestion === undefined
				? null
				: {
						dossier: premiereQuestion.creanceId,
						client: await nomDuClient(ctx, premiereQuestion.creanceId)
					}
	};
}

/**
 * LA JOURNÉE, VUE DE LA BULLE : l'avancement des défis, la série, la semaine, et le
 * premier élément de chaque défi (pour que le geste y mène).
 */
export const etat = authedQuery({
	args: {},
	returns: v.object({
		jour: v.string(),
		restants: vParGenre,
		max: vParGenre,
		faits: v.number(),
		total: v.number(),
		defis: v.array(
			v.object({
				genre: v.union(v.literal('demarrer'), v.literal('relire'), v.literal('repondre')),
				nom: v.string(),
				fait: v.number(),
				total: v.number()
			})
		),
		/** Tenue à l'instant : rien n'attend, ou plus rien. */
		tenue: v.boolean(),
		serie: v.number(),
		semaine: v.array(
			v.object({
				jour: v.string(),
				lettre: v.string(),
				etat: v.union(
					v.literal('TENUE'),
					v.literal('MANQUEE'),
					v.literal('AUJOURDHUI'),
					v.literal('AVENIR'),
					v.literal('REPOS')
				)
			})
		),
		lettre: vElement,
		question: vElement
	}),
	handler: async (ctx) => {
		const { organizationId, user } = await getUserOrg(ctx);
		const jour = jourDeParis(Date.now());
		const { restants, lettre, question } = await ceQuiReste(ctx, organizationId);
		const lignes = await ctx.db
			.query('journeesPlume')
			.withIndex('by_org_and_user_and_jour', (q) =>
				q.eq('organizationId', organizationId).eq('userId', user._id)
			)
			.order('desc')
			.take(JOURS_LUS);
		const duJour = lignes.find((ligne) => ligne.jour === jour) ?? null;
		const max = fusionner(duJour?.max ?? null, restants);
		const tenue = duJour?.tenue === true || somme(restants) === 0;
		const tenues = new Map(lignes.map((ligne) => [ligne.jour, ligne.tenue]));
		tenues.set(jour, tenue);
		const avance = avancement(max, restants);
		return {
			jour,
			restants,
			max,
			faits: avance.faits,
			total: avance.total,
			defis: [...avance.defis],
			tenue,
			serie: serieDeJours(tenues, jour),
			semaine: [...semaineEnCours(tenues, jour)],
			lettre,
			question
		};
	}
});

/** Ce qui s'est passé depuis la visite précédente : les faits du point de Plume. */
const vFaitsDuRetour = v.object({
	depuis: v.number(),
	maintenant: v.number(),
	relancesParties: v.object({ nombre: v.number(), client: v.union(v.string(), v.null()) }),
	paiements: v.object({
		nombre: v.number(),
		client: v.union(v.string(), v.null()),
		total: v.int64()
	}),
	dossiersOuverts: v.number(),
	aLire: v.number(),
	programmees: v.object({ nombre: v.number(), premiere: v.union(v.number(), v.null()) }),
	enAttente: v.number()
});

/**
 * OUVRIR UNE VISITE — noter que le gérant est là, et rendre ce qui s'est passé
 * depuis sa visite précédente (14/10/2026).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ UNE MUTATION QUI REND UN INSTANTANÉ, ET C'EST VOULU
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le point de Plume (`compagnon/retour.ts`) dit ce qui s'est passé PENDANT
 * l'absence : c'est une photographie prise à l'arrivée, pas un abonnement. Une
 * requête recalculerait le point à chaque paiement et, surtout, ne pourrait pas
 * écrire l'heure de la visite. Ici, la même transaction lit la visite précédente,
 * compte ce qui a eu lieu depuis, et pose l'heure de celle-ci.
 *
 * `null` à la toute première visite : il n'y a pas d'« avant » à raconter.
 *
 * ⚠️ RIEN N'Y VIENT DU NAVIGATEUR : ni l'heure, ni la visite précédente.
 */
export const ouvrirLaVisite = authedMutation({
	args: {},
	returns: v.union(v.null(), vFaitsDuRetour),
	handler: async (ctx) => {
		const { organizationId, user } = await getUserOrg(ctx);
		const maintenant = Date.now();
		const jour = jourDeParis(maintenant);
		const recentes = await ctx.db
			.query('journeesPlume')
			.withIndex('by_org_and_user_and_jour', (q) =>
				q.eq('organizationId', organizationId).eq('userId', user._id)
			)
			.order('desc')
			.take(14);
		const depuis = recentes.find((ligne) => ligne.vueLe !== undefined)?.vueLe ?? null;

		const { restants } = await ceQuiReste(ctx, organizationId);
		const duJour = recentes.find((ligne) => ligne.jour === jour) ?? null;
		if (duJour === null) {
			await ctx.db.insert('journeesPlume', {
				organizationId,
				userId: user._id,
				jour,
				max: fusionner(null, restants),
				tenue: somme(restants) === 0,
				vueLe: maintenant
			});
		} else {
			await ctx.db.patch(duJour._id, { vueLe: maintenant });
		}
		if (depuis === null) return null;

		// Les relances que le pilote a envoyées depuis.
		const parties = (
			await ctx.db
				.query('envois')
				.withIndex('by_org_and_etat', (q) =>
					q.eq('organizationId', organizationId).eq('etat', 'PARTI')
				)
				.order('desc')
				.take(100)
		).filter((e) => e.validePar === 'pilote' && (e.valideLe ?? 0) > depuis);
		const premiereRelance = parties[0];

		// L'argent qui est rentré, comme la semaine et les réussites (`estRentre`) : les
		// paiements synchronisés comptent, un avoir jamais. L'e-mail du réveil dit la même chose.
		const paiements = (
			await ctx.db
				.query('reglements')
				.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
				.order('desc')
				.take(100)
		).filter((r) => r.creeLe > depuis && estRentre(r));
		const premierPaiement = paiements[0];
		const factureDuPaiement =
			premierPaiement === undefined ? null : await ctx.db.get(premierPaiement.factureId);

		// Les dossiers que Plume a ouverts seul : les étapes cochées depuis.
		const travaux = await ctx.db
			.query('travauxPilote')
			.withIndex('by_org_and_etat', (q) =>
				q.eq('organizationId', organizationId).eq('etat', 'FAIT')
			)
			.order('desc')
			.take(40);
		const dossiersOuverts = travaux
			.flatMap((t) => t.etapes)
			.filter((e) => e.effet?.genre === 'OUVRIR_DOSSIER' && (e.faiteLe ?? 0) > depuis).length;

		const notifications = await ctx.db
			.query('notifications')
			.withIndex('by_user_and_created', (q) => q.eq('userId', user._id).gt('createdAt', depuis))
			.take(100);
		const aLire = notifications.filter(
			(n) => !n.isRead && n.organizationId === organizationId
		).length;

		const programmes = await ctx.db
			.query('envois')
			.withIndex('by_org_and_etat', (q) =>
				q.eq('organizationId', organizationId).eq('etat', 'PROGRAMME')
			)
			.take(50);
		const departs = programmes.map((e) => e.partiraLe ?? e.prepareLe);

		return {
			depuis,
			maintenant,
			relancesParties: {
				nombre: parties.length,
				client:
					premiereRelance === undefined ? null : await nomDuClient(ctx, premiereRelance.creanceId)
			},
			paiements: {
				nombre: paiements.length,
				client:
					factureDuPaiement === null
						? null
						: ((await ctx.db.get(factureDuPaiement.debiteurId))?.denomination ?? null),
				total: paiements.reduce((somme, r) => somme + r.montant, 0n)
			},
			dossiersOuverts,
			aLire,
			programmees: {
				nombre: departs.length,
				premiere: departs.length === 0 ? null : Math.min(...departs)
			},
			enAttente: somme(restants)
		};
	}
});

/**
 * GARDER LA JOURNÉE — le plus haut relevé, et si elle est tenue. Appelée par la bulle
 * quand ce qui reste change ; idempotente, et rien n'y vient du navigateur : elle
 * recompte elle-même.
 */
export const relever = authedMutation({
	args: {},
	returns: v.null(),
	handler: async (ctx): Promise<null> => {
		const { organizationId, user } = await getUserOrg(ctx);
		const jour = jourDeParis(Date.now());
		const { restants } = await ceQuiReste(ctx, organizationId);
		const ligne = await ctx.db
			.query('journeesPlume')
			.withIndex('by_org_and_user_and_jour', (q) =>
				q.eq('organizationId', organizationId).eq('userId', user._id).eq('jour', jour)
			)
			.first();
		const max = fusionner(ligne?.max ?? null, restants);
		const tenue = ligne?.tenue === true || somme(restants) === 0;
		if (ligne === null) {
			await ctx.db.insert('journeesPlume', {
				organizationId,
				userId: user._id,
				jour,
				max,
				tenue
			});
			return null;
		}
		const changeDeMax = somme(max) !== somme(ligne.max);
		if (!changeDeMax && tenue === ligne.tenue) return null;
		await ctx.db.patch(ligne._id, { max, tenue });
		return null;
	}
});
