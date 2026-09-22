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
import { configQonto } from './qontoConfig';
import { vStatutConnexionQonto } from './validateurs';

/** Une connexion telle qu'elle est en base, ou son absence — pour les lectures internes. */
const vConnexionOuNull = v.union(v.null(), doc(schema, 'connexionsQonto'));

/** Dix minutes : au-delà, une synchronisation « en cours » est tenue pour morte. */
const SYNCHRO_TENUE_POUR_MORTE_MS = 10 * 60 * 1000;

/**
 * CE QUE L'ÉCRAN SAIT D'UNE CONNEXION : son état, jamais ses jetons.
 */
export const maConnexionQonto = authedQuery({
	args: {},
	returns: v.object({
		disponible: v.boolean(),
		statut: v.union(v.null(), vStatutConnexionQonto),
		derniereSynchro: v.union(v.null(), v.number()),
		facturesLues: v.number(),
		erreur: v.union(v.null(), v.string())
	}),
	handler: async (ctx) => {
		const disponible = configQonto() !== null;
		const organizationId = await organisationCouranteOuNull(ctx, ctx.user._id);
		const connexion =
			organizationId === null
				? null
				: await ctx.db
						.query('connexionsQonto')
						.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
						.unique();
		return {
			disponible,
			statut: connexion?.statut ?? null,
			derniereSynchro: connexion?.derniereSynchro ?? null,
			facturesLues: connexion?.facturesLues ?? 0,
			erreur: connexion?.erreur ?? null
		};
	}
});

export const organisationAdministree = internalQuery({
	args: { userId: v.string() },
	returns: v.id('organizations'),
	handler: async (ctx, { userId }) => requireAdminDeLOrgCourante(ctx, userId)
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
			.query('connexionsQonto')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.unique()
});

export const lireConnexion = internalQuery({
	args: { connexionId: v.id('connexionsQonto') },
	returns: vConnexionOuNull,
	handler: async (ctx, { connexionId }) => ctx.db.get(connexionId)
});

export const connexionParEtat = internalQuery({
	args: { etatOAuth: v.string() },
	returns: vConnexionOuNull,
	handler: async (ctx, { etatOAuth }) =>
		ctx.db
			.query('connexionsQonto')
			.withIndex('by_etat_oauth', (q) => q.eq('etatOAuth', etatOAuth))
			.unique()
});

export const connexionParOrganisationQonto = internalQuery({
	args: { qontoOrganizationId: v.string() },
	returns: vConnexionOuNull,
	handler: async (ctx, { qontoOrganizationId }) =>
		ctx.db
			.query('connexionsQonto')
			.withIndex('by_qonto_organization', (q) => q.eq('qontoOrganizationId', qontoOrganizationId))
			.unique()
});

/**
 * Une ligne par établissement connecté : la table reste petite.
 *
 * ⚠️ BORNÉE À 1 000, ET C'EST UN PLAFOND À SURVEILLER, PAS UN OUBLI. Au-delà,
 * le rattrapage ne verrait plus toutes les connexions : il faudra alors
 * paginer. Le webhook, lui, n'est pas concerné.
 */
export const connexionsASynchroniser = internalQuery({
	args: {},
	returns: v.array(v.id('connexionsQonto')),
	handler: async (ctx) => {
		const toutes = await ctx.db.query('connexionsQonto').take(1000);
		return toutes
			.filter(
				(c) =>
					c.statut !== 'REVOQUEE' &&
					c.statut !== 'EN_ATTENTE' &&
					c.jetonRafraichissementChiffre !== undefined
			)
			.map((c) => c._id);
	}
});

export const preparerConnexion = internalMutation({
	args: {
		organizationId: v.id('organizations'),
		etatOAuth: v.string(),
		etatExpireLe: v.number()
	},
	returns: v.null(),
	handler: async (ctx, { organizationId, etatOAuth, etatExpireLe }) => {
		const existante = await ctx.db
			.query('connexionsQonto')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.unique();
		if (existante === null) {
			await ctx.db.insert('connexionsQonto', {
				organizationId,
				statut: 'EN_ATTENTE',
				etatOAuth,
				etatExpireLe,
				creeLe: Date.now()
			});
		} else {
			await ctx.db.patch(existante._id, { etatOAuth, etatExpireLe, erreur: undefined });
		}
		return null;
	}
});

export const enregistrerJetons = internalMutation({
	args: {
		connexionId: v.id('connexionsQonto'),
		jetonAccesChiffre: v.string(),
		jetonRafraichissementChiffre: v.string(),
		jetonExpireLe: v.number(),
		/** Absent au premier retour de Qonto : l'écran passe alors en « lecture ». */
		garderStatut: v.optional(v.boolean())
	},
	returns: v.null(),
	handler: async (ctx, { connexionId, garderStatut, ...jetons }) => {
		await ctx.db.patch(connexionId, {
			...jetons,
			...(garderStatut
				? {}
				: {
						statut: 'SYNCHRONISATION' as const,
						etatOAuth: undefined,
						etatExpireLe: undefined,
						erreur: undefined
					})
		});
		return null;
	}
});

export const enregistrerAbonnement = internalMutation({
	args: {
		connexionId: v.id('connexionsQonto'),
		abonnementWebhookId: v.string(),
		secretWebhookChiffre: v.string(),
		qontoOrganizationId: v.string()
	},
	returns: v.null(),
	handler: async (ctx, { connexionId, ...abonnement }) => {
		await ctx.db.patch(connexionId, abonnement);
		return null;
	}
});

export const marquerConnexion = internalMutation({
	args: {
		connexionId: v.id('connexionsQonto'),
		statut: vStatutConnexionQonto,
		erreur: v.optional(v.string())
	},
	returns: v.null(),
	handler: async (ctx, { connexionId, statut, erreur }) => {
		await ctx.db.patch(connexionId, { statut, erreur, synchroDebuteeLe: undefined });
		return null;
	}
});

/**
 * PRENDRE LA MAIN POUR SYNCHRONISER, ou rendre `null` si une autre
 * synchronisation tourne déjà. Deux synchronisations en parallèle
 * consommeraient deux fois le même jeton de rafraîchissement, qui est à usage
 * unique : la seconde échouerait, et la connexion passerait en échec pour rien.
 */
export const commencerSynchro = internalMutation({
	args: { connexionId: v.id('connexionsQonto') },
	returns: vConnexionOuNull,
	handler: async (ctx, { connexionId }) => {
		const connexion = await ctx.db.get(connexionId);
		if (connexion === null || connexion.statut === 'REVOQUEE') return null;
		const enCours =
			connexion.synchroDebuteeLe !== undefined &&
			connexion.synchroDebuteeLe > Date.now() - SYNCHRO_TENUE_POUR_MORTE_MS;
		if (enCours) return null;
		await ctx.db.patch(connexionId, { statut: 'SYNCHRONISATION', synchroDebuteeLe: Date.now() });
		return connexion;
	}
});

export const avancerSynchro = internalMutation({
	args: { connexionId: v.id('connexionsQonto'), facturesLues: v.number() },
	returns: v.null(),
	handler: async (ctx, { connexionId, facturesLues }) => {
		await ctx.db.patch(connexionId, { facturesLues });
		return null;
	}
});

export const terminerSynchro = internalMutation({
	args: { connexionId: v.id('connexionsQonto'), curseur: v.string() },
	returns: v.null(),
	handler: async (ctx, { connexionId, curseur }) => {
		await ctx.db.patch(connexionId, {
			statut: 'A_JOUR',
			curseur,
			derniereSynchro: Date.now(),
			synchroDebuteeLe: undefined,
			erreur: undefined
		});
		return null;
	}
});

export const supprimerConnexion = internalMutation({
	args: { connexionId: v.id('connexionsQonto') },
	returns: v.null(),
	handler: async (ctx, { connexionId }) => {
		await ctx.db.delete(connexionId);
		return null;
	}
});
