import { v } from 'convex/values';
import { doc } from 'convex-helpers/validators';
import { internalMutation, internalQuery } from '../_generated/server';
import schema from '../schema';
import { authedQuery } from '../functions';
import {
	organisationCourante,
	organisationCouranteOuNull,
	requireAdminDeLOrgCourante
} from '../lib/auth';
import { configChift } from './chiftConfig';
import { vStatutConnexion } from './validateurs';

/**
 * LES LECTURES ET ÉCRITURES DE LA CONNEXION CHIFT. La plomberie réseau vit dans
 * `chift.ts` ; ici, la base seulement.
 */

const vConnexionOuNull = v.union(v.null(), doc(schema, 'connexionsChift'));

/** Dix minutes : au-delà, une lecture « en cours » est tenue pour morte. */
const SYNCHRO_TENUE_POUR_MORTE_MS = 10 * 60 * 1000;

/** CE QUE L'ÉCRAN SAIT D'UNE CONNEXION : son état et le nom des logiciels, rien d'autre. */
export const maConnexionChift = authedQuery({
	args: {},
	returns: v.object({
		disponible: v.boolean(),
		statut: v.union(v.null(), vStatutConnexion),
		logiciels: v.array(v.string()),
		derniereSynchro: v.union(v.null(), v.number()),
		facturesLues: v.number(),
		facturesNonLues: v.number(),
		erreur: v.union(v.null(), v.string())
	}),
	handler: async (ctx) => {
		const disponible = configChift() !== null;
		const organizationId = await organisationCouranteOuNull(ctx, ctx.user._id);
		const connexion =
			organizationId === null
				? null
				: await ctx.db
						.query('connexionsChift')
						.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
						.unique();
		return {
			disponible,
			statut: connexion?.statut ?? null,
			logiciels: connexion?.logiciels ?? [],
			derniereSynchro: connexion?.derniereSynchro ?? null,
			facturesLues: connexion?.facturesLues ?? 0,
			facturesNonLues: connexion?.facturesNonLues ?? 0,
			erreur: connexion?.erreur ?? null
		};
	}
});

export const organisationAdministree = internalQuery({
	args: { userId: v.string() },
	returns: v.object({ organizationId: v.id('organizations'), nom: v.string() }),
	handler: async (ctx, { userId }) => {
		const organizationId = await requireAdminDeLOrgCourante(ctx, userId);
		const organisation = await ctx.db.get(organizationId);
		return { organizationId, nom: organisation?.name ?? 'Établissement' };
	}
});

export const organisationDuMembre = internalQuery({
	args: { userId: v.string() },
	returns: v.id('organizations'),
	handler: async (ctx, { userId }) => organisationCourante(ctx, userId)
});

export const connexionDeLOrganisation = internalQuery({
	args: { organizationId: v.id('organizations') },
	returns: vConnexionOuNull,
	handler: async (ctx, { organizationId }) =>
		ctx.db
			.query('connexionsChift')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.unique()
});

export const connexionParConsommateur = internalQuery({
	args: { consommateurId: v.string() },
	returns: vConnexionOuNull,
	handler: async (ctx, { consommateurId }) =>
		ctx.db
			.query('connexionsChift')
			.withIndex('by_consommateur', (q) => q.eq('consommateurId', consommateurId))
			.unique()
});

/**
 * Toutes les lignes, y compris celles « en attente » : un gérant qui a branché
 * son logiciel pendant qu'un webhook se perdait est rattrapé ici.
 *
 * ⚠️ BORNÉE À 1 000, ET C'EST UN PLAFOND À SURVEILLER, PAS UN OUBLI — même
 * réglage que Qonto. Au-delà, il faudra paginer.
 */
export const connexionsASynchroniser = internalQuery({
	args: {},
	returns: v.array(v.id('connexionsChift')),
	handler: async (ctx) => {
		const toutes = await ctx.db.query('connexionsChift').take(1000);
		return toutes.map((c) => c._id);
	}
});

/** Le consommateur vient d'être créé chez Chift, ou existait déjà : la ligne attend le gérant. */
export const enregistrerConsommateur = internalMutation({
	args: { organizationId: v.id('organizations'), consommateurId: v.string() },
	returns: v.id('connexionsChift'),
	handler: async (ctx, { organizationId, consommateurId }) => {
		const existante = await ctx.db
			.query('connexionsChift')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.unique();
		if (existante !== null) {
			// Un logiciel déjà branché le reste : on n'efface ni son état ni ses chiffres.
			await ctx.db.patch(existante._id, {
				consommateurId,
				erreur: undefined,
				...(existante.statut === 'A_JOUR' || existante.statut === 'SYNCHRONISATION'
					? {}
					: { statut: 'EN_ATTENTE' as const })
			});
			return existante._id;
		}
		return ctx.db.insert('connexionsChift', {
			organizationId,
			consommateurId,
			statut: 'EN_ATTENTE',
			creeLe: Date.now()
		});
	}
});

export const lireConnexion = internalQuery({
	args: { connexionId: v.id('connexionsChift') },
	returns: vConnexionOuNull,
	handler: async (ctx, { connexionId }) => ctx.db.get(connexionId)
});

/**
 * PRENDRE LA MAIN POUR LIRE, ou rendre `null` si une autre lecture tourne déjà.
 * Le statut ne bouge pas ici : c'est la lecture qui dira s'il y a un logiciel
 * branché, et donc s'il faut passer en « lecture ».
 */
export const commencerSynchro = internalMutation({
	args: { connexionId: v.id('connexionsChift') },
	returns: vConnexionOuNull,
	handler: async (ctx, { connexionId }) => {
		const connexion = await ctx.db.get(connexionId);
		if (connexion === null) return null;
		const enCours =
			connexion.synchroDebuteeLe !== undefined &&
			connexion.synchroDebuteeLe > Date.now() - SYNCHRO_TENUE_POUR_MORTE_MS;
		if (enCours) return null;
		await ctx.db.patch(connexionId, { synchroDebuteeLe: Date.now() });
		return connexion;
	}
});

/** Un logiciel branché et actif : l'écran passe en « lecture de vos factures ». */
export const ouvrirLecture = internalMutation({
	args: { connexionId: v.id('connexionsChift'), logiciels: v.array(v.string()) },
	returns: v.null(),
	handler: async (ctx, { connexionId, logiciels }) => {
		await ctx.db.patch(connexionId, { statut: 'SYNCHRONISATION', logiciels, erreur: undefined });
		return null;
	}
});

export const avancerSynchro = internalMutation({
	args: { connexionId: v.id('connexionsChift'), facturesLues: v.number() },
	returns: v.null(),
	handler: async (ctx, { connexionId, facturesLues }) => {
		await ctx.db.patch(connexionId, { facturesLues });
		return null;
	}
});

export const terminerSynchro = internalMutation({
	args: {
		connexionId: v.id('connexionsChift'),
		curseur: v.string(),
		facturesLues: v.number(),
		facturesNonLues: v.number()
	},
	returns: v.null(),
	handler: async (ctx, { connexionId, curseur, facturesLues, facturesNonLues }) => {
		await ctx.db.patch(connexionId, {
			statut: 'A_JOUR',
			curseur,
			facturesLues,
			facturesNonLues,
			derniereSynchro: Date.now(),
			synchroDebuteeLe: undefined,
			erreur: undefined
		});
		return null;
	}
});

/**
 * RENDRE LA MAIN SANS AVOIR LU : aucun logiciel actif. « En attente » tant que
 * le gérant n'en a jamais branché, « accès retiré » s'il en avait un.
 */
export const relacherSynchro = internalMutation({
	args: { connexionId: v.id('connexionsChift') },
	returns: v.null(),
	handler: async (ctx, { connexionId }) => {
		const connexion = await ctx.db.get(connexionId);
		if (connexion === null) return null;
		const avaitUnLogiciel = (connexion.logiciels ?? []).length > 0;
		await ctx.db.patch(connexionId, {
			statut: avaitUnLogiciel ? 'REVOQUEE' : 'EN_ATTENTE',
			synchroDebuteeLe: undefined
		});
		return null;
	}
});

export const marquerConnexion = internalMutation({
	args: {
		connexionId: v.id('connexionsChift'),
		statut: vStatutConnexion,
		erreur: v.optional(v.string())
	},
	returns: v.null(),
	handler: async (ctx, { connexionId, statut, erreur }) => {
		await ctx.db.patch(connexionId, { statut, erreur, synchroDebuteeLe: undefined });
		return null;
	}
});

export const supprimerConnexion = internalMutation({
	args: { connexionId: v.id('connexionsChift') },
	returns: v.null(),
	handler: async (ctx, { connexionId }) => {
		await ctx.db.delete(connexionId);
		return null;
	}
});
