import { v, ConvexError } from 'convex/values';
import { doc } from 'convex-helpers/validators';
import { internalMutation, internalQuery } from '../_generated/server';
import type { Id } from '../_generated/dataModel';
import schema from '../schema';
import { authedMutation, authedQuery } from '../functions';
import {
	organisationCourante,
	organisationCouranteOuNull,
	requireAdminDeLOrgCourante
} from '../lib/auth';
import { configNango } from './nangoConfig';
import { vStatutConnexion } from './validateurs';

/**
 * LES LECTURES ET ÉCRITURES DES CONNEXIONS NANGO. La plomberie réseau vit dans
 * `nango.ts` ; ici, la base seulement.
 */

/** Au plus cent références à vérifier : au-delà, l'écran en dit le nombre. */
const PLAFOND_ANNULEES = 100;

const vConnexionAffichee = v.object({
	id: v.id('connexionsNango'),
	nom: v.string(),
	fournisseur: v.string(),
	/** La clé de l'intégration dans le tableau de bord : « Reconnecter » la rouvre. */
	integrationId: v.string(),
	statut: vStatutConnexion,
	derniereSynchro: v.union(v.null(), v.number()),
	facturesLues: v.number(),
	facturesNonLues: v.number(),
	annuleesALaSource: v.array(v.string()),
	erreur: v.union(v.null(), v.string())
});

/**
 * CE QUE L'ÉCRAN SAIT DES LOGICIELS BRANCHÉS : leur nom, leur état, ce qui est
 * entré. Jamais l'identifiant de la connexion chez Nango, qui ne sert qu'au serveur.
 */
export const mesConnexionsNango = authedQuery({
	args: {},
	returns: v.object({ disponible: v.boolean(), connexions: v.array(vConnexionAffichee) }),
	handler: async (ctx) => {
		const disponible = configNango() !== null;
		const organizationId = await organisationCouranteOuNull(ctx, ctx.user._id);
		if (organizationId === null) return { disponible, connexions: [] };
		const lignes = await ctx.db
			.query('connexionsNango')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();
		return {
			disponible,
			connexions: lignes.map((ligne) => ({
				id: ligne._id,
				nom: ligne.nom,
				fournisseur: ligne.fournisseur,
				integrationId: ligne.integrationId,
				statut: ligne.statut,
				derniereSynchro: ligne.derniereSynchro ?? null,
				facturesLues: ligne.facturesLues ?? 0,
				facturesNonLues: ligne.facturesNonLues ?? 0,
				annuleesALaSource: ligne.annuleesALaSource ?? [],
				erreur: ligne.erreur ?? null
			}))
		};
	}
});

/** « J'ai vérifié » : les annulations signalées quittent l'écran. Réservé aux administrateurs. */
export const effacerAnnulees = authedMutation({
	args: { id: v.id('connexionsNango') },
	returns: v.null(),
	handler: async (ctx, { id }): Promise<null> => {
		const organizationId = await requireAdminDeLOrgCourante(ctx, ctx.user._id);
		const ligne = await ctx.db.get(id);
		if (ligne === null || ligne.organizationId !== organizationId) {
			throw new ConvexError('Cette connexion n’existe pas dans votre établissement.');
		}
		await ctx.db.patch(id, { annuleesALaSource: [] });
		return null;
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

/** L'établissement que nomme une étiquette de webhook, s'il existe. */
export const organisationEtiquetee = internalQuery({
	args: { identifiant: v.string() },
	returns: v.union(v.null(), v.id('organizations')),
	handler: async (ctx, { identifiant }) => {
		const id = ctx.db.normalizeId('organizations', identifiant);
		if (id === null) return null;
		return (await ctx.db.get(id)) === null ? null : id;
	}
});

export const connexion = internalQuery({
	args: { id: v.id('connexionsNango') },
	returns: v.union(v.null(), doc(schema, 'connexionsNango')),
	handler: async (ctx, { id }) => ctx.db.get(id)
});

export const connexionParIdentifiant = internalQuery({
	args: { connectionId: v.string() },
	returns: v.union(v.null(), doc(schema, 'connexionsNango')),
	handler: async (ctx, { connectionId }) =>
		ctx.db
			.query('connexionsNango')
			.withIndex('by_connection', (q) => q.eq('connectionId', connectionId))
			.unique()
});

/**
 * Les connexions à relire : toutes, sauf celles dont l'accès a été retiré.
 *
 * ⚠️ BORNÉ : cinq mille logiciels branchés, soit bien plus que notre portefeuille.
 * Le jour où on l'atteint, la relecture périodique se paginera.
 */
const PLAFOND_RELECTURE = 5_000;

export const connexionsALire = internalQuery({
	args: {},
	returns: v.array(v.id('connexionsNango')),
	handler: async (ctx) => {
		const lignes = await ctx.db.query('connexionsNango').take(PLAFOND_RELECTURE);
		return lignes.filter((ligne) => ligne.statut !== 'REVOQUEE').map((ligne) => ligne._id);
	}
});

/**
 * ENREGISTRER (OU RETROUVER) UNE CONNEXION, après avoir vérifié chez Nango
 * qu'elle porte bien l'étiquette de CET établissement.
 *
 * ⚠️ UNE CONNEXION NE CHANGE JAMAIS D'ÉTABLISSEMENT. Si l'identifiant est déjà
 * rattaché à un autre, on refuse : c'est le seul cas où un identifiant pourrait
 * faire lire chez l'un les factures de l'autre.
 */
export const enregistrerConnexion = internalMutation({
	args: {
		organizationId: v.id('organizations'),
		connectionId: v.string(),
		integrationId: v.string(),
		fournisseur: v.string(),
		nom: v.string(),
		configLecture: v.optional(v.record(v.string(), v.string())),
		erreur: v.optional(v.string()),
		creePar: v.string()
	},
	returns: v.id('connexionsNango'),
	handler: async (ctx, args): Promise<Id<'connexionsNango'>> => {
		const existante = await ctx.db
			.query('connexionsNango')
			.withIndex('by_connection', (q) => q.eq('connectionId', args.connectionId))
			.unique();
		if (existante !== null && existante.organizationId !== args.organizationId) {
			throw new ConvexError('Cette connexion appartient à un autre établissement.');
		}
		const statut = args.erreur === undefined ? ('EN_ATTENTE' as const) : ('ECHEC' as const);
		if (existante !== null) {
			await ctx.db.patch(existante._id, {
				integrationId: args.integrationId,
				fournisseur: args.fournisseur,
				nom: args.nom,
				// Une reconnexion remet la connexion en route ; on garde son histoire.
				statut,
				...(args.configLecture === undefined ? {} : { configLecture: args.configLecture }),
				erreur: args.erreur
			});
			return existante._id;
		}
		return ctx.db.insert('connexionsNango', {
			organizationId: args.organizationId,
			connectionId: args.connectionId,
			integrationId: args.integrationId,
			fournisseur: args.fournisseur,
			nom: args.nom,
			statut,
			...(args.configLecture === undefined ? {} : { configLecture: args.configLecture }),
			...(args.erreur === undefined ? {} : { erreur: args.erreur }),
			creePar: args.creePar,
			creeLe: Date.now()
		});
	}
});

/**
 * COMMENCER UNE PASSE DE LECTURE, ou rendre `null` si une autre tourne déjà, si
 * l'accès a été retiré, ou si la connexion n'est pas prête (sa configuration manque).
 *
 * ⚠️ UNE LECTURE PEUT DURER PLUSIEURS PASSES : chaque passe a un budget de temps,
 * et la suivante reprend à la page posée (`suite`). Le verrou couvre une passe ;
 * la lecture, elle, garde son début (`lectureDebuteeLe`), qui deviendra la date
 * depuis laquelle la prochaine relira.
 */
export const debuterLecture = internalMutation({
	args: { id: v.id('connexionsNango'), maintenant: v.number(), dureeDuVerrou: v.number() },
	returns: v.union(
		v.null(),
		v.object({
			organizationId: v.id('organizations'),
			connectionId: v.string(),
			integrationId: v.string(),
			fournisseur: v.string(),
			nom: v.string(),
			configLecture: v.record(v.string(), v.string()),
			suite: v.union(v.null(), v.string()),
			depuis: v.union(v.null(), v.number()),
			facturesLues: v.number(),
			facturesNonLues: v.number()
		})
	),
	handler: async (ctx, { id, maintenant, dureeDuVerrou }) => {
		const ligne = await ctx.db.get(id);
		if (ligne === null || ligne.statut === 'REVOQUEE' || ligne.configLecture === undefined) {
			return null;
		}
		if (ligne.verrouJusquA !== undefined && ligne.verrouJusquA > maintenant) return null;
		const reprise = ligne.suite !== undefined;
		await ctx.db.patch(id, {
			statut: 'SYNCHRONISATION',
			verrouJusquA: maintenant + dureeDuVerrou,
			lectureDebuteeLe: reprise ? (ligne.lectureDebuteeLe ?? maintenant) : maintenant,
			...(reprise ? {} : { facturesLues: 0, facturesNonLues: 0 }),
			erreur: undefined
		});
		return {
			organizationId: ligne.organizationId,
			connectionId: ligne.connectionId,
			integrationId: ligne.integrationId,
			fournisseur: ligne.fournisseur,
			nom: ligne.nom,
			configLecture: ligne.configLecture,
			suite: reprise ? ligne.suite! : null,
			depuis: ligne.derniereLectureComplete ?? null,
			facturesLues: reprise ? (ligne.facturesLues ?? 0) : 0,
			facturesNonLues: reprise ? (ligne.facturesNonLues ?? 0) : 0
		};
	}
});

/** La fin d'une passe : le verrou tombe, la suite (s'il y en a une) reste posée. */
export const relacherVerrou = internalMutation({
	args: { id: v.id('connexionsNango') },
	returns: v.null(),
	handler: async (ctx, { id }): Promise<null> => {
		if ((await ctx.db.get(id)) !== null) await ctx.db.patch(id, { verrouJusquA: undefined });
		return null;
	}
});

/**
 * UNE PAGE ÉCRITE. Les compteurs avancent, la suite se pose (pour reprendre
 * après une coupure), et les annulations qu'on connaît déjà se retiennent.
 *
 * ⚠️ UNE ANNULATION N'EST SIGNALÉE QUE SI LA FACTURE EST CHEZ NOUS ET OUVERTE.
 * Une facture annulée que nous n'avons jamais lue n'apprend rien au gérant ; une
 * facture soldée ne sera plus relancée de toute façon.
 */
export const noterPage = internalMutation({
	args: {
		id: v.id('connexionsNango'),
		suite: v.union(v.null(), v.string()),
		facturesLues: v.number(),
		facturesNonLues: v.number(),
		annulees: v.array(v.string())
	},
	returns: v.null(),
	handler: async (ctx, args): Promise<null> => {
		const ligne = await ctx.db.get(args.id);
		if (ligne === null) return null;
		const aVerifier = new Set(ligne.annuleesALaSource ?? []);
		for (const reference of args.annulees) {
			if (aVerifier.size >= PLAFOND_ANNULEES) break;
			const connue = await ctx.db
				.query('facturesVente')
				.withIndex('by_org_and_reference', (q) =>
					q.eq('organizationId', ligne.organizationId).eq('reference', reference)
				)
				.first();
			if (connue !== null && connue.statutPaiement !== 'SOLDEE') aVerifier.add(reference);
		}
		const commun = {
			facturesLues: args.facturesLues,
			facturesNonLues: args.facturesNonLues,
			annuleesALaSource: [...aVerifier],
			derniereSynchro: Date.now()
		};
		if (args.suite === null) {
			await ctx.db.patch(args.id, {
				...commun,
				statut: 'A_JOUR',
				suite: undefined,
				derniereLectureComplete: ligne.lectureDebuteeLe ?? Date.now(),
				lectureDebuteeLe: undefined
			});
		} else {
			await ctx.db.patch(args.id, { ...commun, suite: args.suite });
		}
		return null;
	}
});

/** Une lecture qui échoue : la ligne le dit, et la suivante repartira de la page en cours. */
export const noterEchec = internalMutation({
	args: { id: v.id('connexionsNango'), erreur: v.string(), revoquee: v.boolean() },
	returns: v.null(),
	handler: async (ctx, { id, erreur, revoquee }): Promise<null> => {
		const ligne = await ctx.db.get(id);
		if (ligne === null) return null;
		// La page en cours reste posée : la prochaine lecture reprendra là.
		await ctx.db.patch(id, {
			statut: revoquee ? 'REVOQUEE' : 'ECHEC',
			erreur,
			verrouJusquA: undefined
		});
		return null;
	}
});

/** Ce que dit un webhook d'authentification : accès renouvelé, perdu, ou retiré. */
export const noterAcces = internalMutation({
	args: {
		connectionId: v.string(),
		etat: v.union(v.literal('RENOUVELE'), v.literal('EN_PANNE'), v.literal('RETIRE'))
	},
	returns: v.null(),
	handler: async (ctx, { connectionId, etat }): Promise<null> => {
		const ligne = await ctx.db
			.query('connexionsNango')
			.withIndex('by_connection', (q) => q.eq('connectionId', connectionId))
			.unique();
		if (ligne === null) return null;
		if (etat === 'RENOUVELE') {
			if (ligne.statut === 'ECHEC')
				await ctx.db.patch(ligne._id, { statut: 'A_JOUR', erreur: undefined });
			return null;
		}
		await ctx.db.patch(ligne._id, {
			statut: etat === 'RETIRE' ? 'REVOQUEE' : 'ECHEC',
			erreur:
				etat === 'RETIRE'
					? `L’accès à ${ligne.nom} a été retiré. Rebranchez-le pour reprendre la lecture.`
					: `L’accès à ${ligne.nom} ne se renouvelle plus. Nango réessaie ; si cela dure, rebranchez-le.`
		});
		return null;
	}
});

/** Débranchée chez Nango : la ligne part, les factures entrées restent. */
export const retirerConnexion = internalMutation({
	args: { id: v.id('connexionsNango') },
	returns: v.null(),
	handler: async (ctx, { id }): Promise<null> => {
		await ctx.db.delete(id);
		return null;
	}
});
