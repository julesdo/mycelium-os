import { v, ConvexError } from 'convex/values';
import { action, internalAction, internalMutation, internalQuery } from './_generated/server';
import type { MutationCtx } from './_generated/server';
import { authedQuery, authedMutation } from './functions';
import { api, components, internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { requireAdminDeLOrgCourante, requireOrgMember } from './lib/auth';

/**
 * LES DEUX DROITS QUE LA POLITIQUE DE CONFIDENTIALITÉ PROMET, ET QU'AUCUN CODE
 * NE TENAIT.
 *
 * La section 10 du document `docs/juridique/03-politique-de-confidentialite.md`
 * annonce l'accès, la portabilité et l'effacement. Jusqu'ici ces trois lignes
 * n'étaient adossées à rien : il aurait fallu répondre à la main, à la première
 * demande, en écrivant des requêtes dans un tableau de bord. Un droit qui
 * dépend de la disponibilité de son opérateur n'est pas exerçable.
 *
 * TROIS DÉCISIONS QUI STRUCTURENT TOUT CE FICHIER.
 *
 * 1. L'EXPORT ET LA SUPPRESSION SONT RÉSERVÉS À L'ADMINISTRATEUR. Le contenu
 *    d'un établissement, ce sont douze mois de factures : des prix négociés,
 *    des volumes, la liste des fournisseurs. C'est le secret des affaires du
 *    client, pas la donnée personnelle d'un employé. Ouvrir l'export à tout
 *    membre en ferait une voie d'exfiltration silencieuse. Un membre garde son
 *    droit d'accès à SES données personnelles — nom, adresse, rôle, date
 *    d'arrivée — que l'export contient et que le DPO fournit sur demande.
 *
 * 2. LA SUPPRESSION EST DÉFINITIVE ET NE PASSE PAS PAR UNE CORBEILLE. Le RGPD
 *    demande l'effacement, pas la mise de côté. Un « supprimé » qui reste
 *    lisible en base est un manquement, et il se découvre au pire moment.
 *
 * 3. RIEN N'EST MUTUALISÉ, DONC RIEN N'EST ÉPARGNÉ. Le produit a un temps
 *    porté une table globale de classification de libellés, expressément
 *    exclue de la purge parce qu'elle n'appartenait à personne. Le recouvrement
 *    n'a pas d'équivalent : un débiteur, un montant, une échéance sont des
 *    données client, toujours. La purge est donc totale, sans exception à
 *    justifier.
 */

// ── Ce que l'écran affiche avant d'agir ──────────────────────────────────────

/**
 * L'inventaire de ce qui est détenu, pour l'afficher AVANT toute action.
 *
 * Un écran de suppression qui dit « toutes vos données » ne dit rien : le gérant
 * ne sait pas ce qu'il perd, donc il n'ose pas, ou il ose sans savoir. Les
 * compteurs viennent des totaux déjà tenus sur les dépôts, jamais d'un
 * balayage des lignes : compter trois ans de factures à chaque ouverture de
 * l'écran des réglages coûterait plus cher que l'export lui-même.
 */
export const apercuDeMesDonnees = authedQuery({
	args: {},
	returns: v.union(
		v.null(),
		v.object({
			nomEtablissement: v.string(),
			estAdmin: v.boolean(),
			creeLe: v.number(),
			depots: v.number(),
			factures: v.number(),
			decomptes: v.number(),
			debiteurs: v.number(),
			membres: v.number()
		})
	),
	handler: async (ctx) => {
		const profile = await ctx.db
			.query('userProfiles')
			.withIndex('by_userId', (q) => q.eq('userId', ctx.user._id))
			.unique();
		if (!profile?.currentOrganizationId) return null;
		const orgId = profile.currentOrganizationId;

		const membership = await requireOrgMember(ctx, orgId, ctx.user._id);
		const org = await ctx.db.get(orgId);
		if (!org) return null;

		const depots = await ctx.db
			.query('importsRecouvrement')
			.withIndex('by_org', (q) => q.eq('organizationId', orgId))
			.collect();
		const decomptes = await ctx.db
			.query('decomptes')
			.withIndex('by_org', (q) => q.eq('organizationId', orgId))
			.collect();
		const debiteurs = await ctx.db
			.query('debiteurs')
			.withIndex('by_org', (q) => q.eq('organizationId', orgId))
			.collect();
		const factures = await ctx.db
			.query('facturesVente')
			.withIndex('by_org', (q) => q.eq('organizationId', orgId))
			.collect();
		const membres = await ctx.db
			.query('organizationMembers')
			.withIndex('by_organization', (q) => q.eq('organizationId', orgId))
			.collect();

		return {
			nomEtablissement: org.name,
			estAdmin: membership.role === 'ORG_ADMIN',
			creeLe: org.createdAt,
			depots: depots.length,
			factures: factures.length,
			decomptes: decomptes.length,
			debiteurs: debiteurs.length,
			membres: membres.length
		};
	}
});

// ── L'export ─────────────────────────────────────────────────────────────────

/**
 * Le droit d'accès et de portabilité, exercé sans nous.
 *
 * Le format est du JSON : c'est ce que l'article 20 appelle « structuré,
 * couramment utilisé et lisible par machine ». Un PDF serait plus joli et
 * n'exercerait pas le droit — on ne réimporte pas un PDF ailleurs.
 */
export const contexteExport = authedQuery({
	args: {},
	returns: v.object({
		organizationId: v.id('organizations'),
		nomEtablissement: v.string()
	}),
	handler: async (ctx) => {
		const organizationId = await requireAdminDeLOrgCourante(ctx, ctx.user._id);
		const org = await ctx.db.get(organizationId);
		if (!org) throw new ConvexError('Établissement introuvable');
		return { organizationId, nomEtablissement: org.name };
	}
});

/**
 * Une page de l'export.
 *
 * `v.any()` sur le contenu, et c'est délibéré : ce que renvoie cette fonction
 * EST la forme de la table, telle que `tables.ts` la définit. Recopier ici un
 * validateur champ par champ créerait une seconde définition du schéma, qui
 * divergerait au premier ajout de colonne — et l'export perdrait
 * silencieusement une donnée, ce qui est exactement le défaut qu'un export ne
 * doit pas avoir.
 */
const vPage = v.object({
	elements: v.array(v.any()),
	curseur: v.string(),
	fini: v.boolean()
});

const PAR_PAGE = 400;

export const _pageDeFactures = internalQuery({
	args: { organizationId: v.id('organizations'), curseur: v.union(v.string(), v.null()) },
	returns: vPage,
	handler: async (ctx, { organizationId, curseur }) => {
		const page = await ctx.db
			.query('facturesVente')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.paginate({ cursor: curseur, numItems: PAR_PAGE });
		return { elements: page.page, curseur: page.continueCursor, fini: page.isDone };
	}
});

export const _pageDeReglements = internalQuery({
	args: { organizationId: v.id('organizations'), curseur: v.union(v.string(), v.null()) },
	returns: vPage,
	handler: async (ctx, { organizationId, curseur }) => {
		const page = await ctx.db
			.query('reglements')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.paginate({ cursor: curseur, numItems: PAR_PAGE });
		return { elements: page.page, curseur: page.continueCursor, fini: page.isDone };
	}
});

/**
 * Tout ce qui tient en une lecture : l'établissement, ses dépôts, ses créances,
 * ses décomptes, ses dossiers, ses débiteurs, ses membres. Ces tables se
 * comptent en dizaines de lignes — seules les factures et les règlements
 * demandent une pagination.
 */
export const _entetesExport = internalQuery({
	args: { organizationId: v.id('organizations') },
	returns: v.any(),
	handler: async (ctx, { organizationId }) => {
		const org = await ctx.db.get(organizationId);

		const [depots, creances, decomptes, dossiers, debiteurs, pieces, membres, invitations] =
			await Promise.all([
				ctx.db
					.query('importsRecouvrement')
					.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
					.collect(),
				ctx.db
					.query('creances')
					.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
					.collect(),
				ctx.db
					.query('decomptes')
					.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
					.collect(),
				ctx.db
					.query('dossiers')
					.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
					.collect(),
				ctx.db
					.query('debiteurs')
					.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
					.collect(),
				ctx.db
					.query('pieces')
					.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
					.collect(),
				ctx.db
					.query('organizationMembers')
					.withIndex('by_organization', (q) => q.eq('organizationId', organizationId))
					.collect(),
				ctx.db
					.query('organizationInvitations')
					.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
					.collect()
			]);

		return { org, depots, creances, decomptes, dossiers, debiteurs, pieces, membres, invitations };
	}
});

type Contexte = { organizationId: Id<'organizations'>; nomEtablissement: string };

type Entetes = {
	org: unknown;
	depots: unknown[];
	creances: unknown[];
	decomptes: unknown[];
	dossiers: unknown[];
	debiteurs: unknown[];
	pieces: unknown[];
	membres: unknown[];
	invitations: unknown[];
};

/**
 * Construit le fichier d'export et renvoie son lien de téléchargement.
 *
 * LE LIEN EXPIRE. Le fichier est déposé dans le stockage Convex, dont l'URL est
 * publique pour qui la détient : un export contenant douze mois d'achats ne doit
 * pas rester joignable indéfiniment. Une heure suffit à le télécharger, et
 * `cleanupExport` s'en charge — la même fonction qui ramasse déjà les exports du
 * produit.
 */
export const exporterMesDonnees = action({
	args: {},
	returns: v.object({
		url: v.string(),
		octets: v.number(),
		lignes: v.number(),
		nomFichier: v.string()
	}),
	handler: async (ctx) => {
		// LES DEUX ANNOTATIONS CI-DESSOUS NE SONT PAS DÉCORATIVES. Une action qui
		// appelle une fonction de son propre fichier crée un cycle d'inférence :
		// le type de retour de l'action dépend de celui de la requête, qui dépend
		// du module, qui dépend de l'action. TypeScript abandonne et retombe sur
		// `any`, ce que la génération de types de Convex refuse. Les annoter
		// explicitement rompt le cycle ; c'est le remède documenté.
		const contexte: Contexte = await ctx.runQuery(api.rgpd.contexteExport, {});
		const { organizationId, nomEtablissement } = contexte;

		const entetes: Entetes = await ctx.runQuery(internal.rgpd._entetesExport, { organizationId });

		const factures: unknown[] = [];
		let curseur: string | null = null;
		for (;;) {
			const page: { elements: unknown[]; curseur: string; fini: boolean } = await ctx.runQuery(
				internal.rgpd._pageDeFactures,
				{ organizationId, curseur }
			);
			factures.push(...page.elements);
			if (page.fini) break;
			curseur = page.curseur;
		}

		const reglements: unknown[] = [];
		curseur = null;
		for (;;) {
			const page: { elements: unknown[]; curseur: string; fini: boolean } = await ctx.runQuery(
				internal.rgpd._pageDeReglements,
				{ organizationId, curseur }
			);
			reglements.push(...page.elements);
			if (page.fini) break;
			curseur = page.curseur;
		}

		const contenu = {
			aPropos: {
				produit: 'Letikette',
				exportLe: new Date().toISOString(),
				etablissement: nomEtablissement,
				format: 'JSON, une clé par table',
				note: "Cet export contient l'INTÉGRALITÉ des données détenues pour cet établissement. Aucune table n'en est exclue : rien n'est mutualisé entre clients."
			},
			etablissement: entetes.org,
			membres: entetes.membres,
			invitations: entetes.invitations,
			depots: entetes.depots,
			debiteurs: entetes.debiteurs,
			factures,
			reglements,
			pieces: entetes.pieces,
			creances: entetes.creances,
			decomptes: entetes.decomptes,
			dossiers: entetes.dossiers
		};

		const json = JSON.stringify(contenu, null, 2);
		const blob = new Blob([json], { type: 'application/json' });
		const storageId = await ctx.storage.store(blob);
		const url = await ctx.storage.getUrl(storageId);
		if (!url) throw new ConvexError("Le fichier d'export n'a pas pu être déposé.");

		await ctx.scheduler.runAfter(60 * 60 * 1000, internal.exports.cleanup.cleanupExport, {
			storageId
		});

		return {
			url,
			octets: blob.size,
			lignes: factures.length + reglements.length,
			nomFichier: `letikette-export-${new Date().toISOString().slice(0, 10)}.json`
		};
	}
});

// ── La suppression de l'établissement ────────────────────────────────────────

/**
 * Le budget de suppression d'une passe.
 *
 * Une transaction Convex est bornée en écritures. Un établissement de trois ans
 * porte une dizaine de milliers de lignes de facture : les supprimer d'un coup
 * ferait échouer la mutation, et — pire — elle échouerait APRÈS avoir été
 * annoncée à l'écran comme lancée. La purge avance donc par passes qui se
 * replanifient, et la dernière seulement retire l'établissement lui-même.
 */
const BUDGET_PASSE = 400;

/** Garde-fou : au-delà, quelque chose ne se supprime pas et boucle. */
const PASSES_MAX = 500;

export const supprimerEtablissement = authedMutation({
	args: { confirmation: v.string() },
	returns: v.null(),
	handler: async (ctx, { confirmation }) => {
		const organizationId = await requireAdminDeLOrgCourante(ctx, ctx.user._id);
		const org = await ctx.db.get(organizationId);
		if (!org) throw new ConvexError('Établissement introuvable');

		// LA CONFIRMATION EST LE NOM DE L'ÉTABLISSEMENT, pas une case à cocher.
		// C'est le seul garde-fou qui résiste au clic machinal, et il est vérifié
		// SUR LE SERVEUR : l'écran peut le demander, seul le serveur peut l'exiger.
		if (confirmation.trim() !== org.name.trim()) {
			throw new ConvexError(
				'Le nom saisi ne correspond pas à celui de l’établissement. Rien n’a été supprimé.'
			);
		}

		// L'ACCÈS SE COUPE D'ABORD, LA DONNÉE PART ENSUITE. Retirer les
		// appartenances en premier fait que plus personne n'ouvre un établissement
		// à moitié vidé pendant que la purge avance.
		const membres = await ctx.db
			.query('organizationMembers')
			.withIndex('by_organization', (q) => q.eq('organizationId', organizationId))
			.collect();
		for (const m of membres) {
			await ctx.db.delete(m._id);
			await recalerProfil(ctx, m.userId, organizationId);
		}

		const invitations = await ctx.db
			.query('organizationInvitations')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();
		for (const i of invitations) await ctx.db.delete(i._id);

		await ctx.scheduler.runAfter(0, internal.rgpd.purgerEtablissement, {
			organizationId,
			passe: 0
		});
		return null;
	}
});

/**
 * Une passe de purge. Elle se replanifie tant qu'il reste quelque chose.
 *
 * L'ORDRE DES TABLES SUIT LES DÉPENDANCES, du feuillage vers la racine : les
 * lignes avant les documents, les documents avant les dépôts, les dépôts avant
 * l'établissement. Une passe interrompue laisse donc toujours un état où ce qui
 * subsiste est cohérent, jamais des lignes orphelines pointant vers un dépôt
 * disparu.
 */
export const purgerEtablissement = internalMutation({
	args: { organizationId: v.id('organizations'), passe: v.number() },
	returns: v.null(),
	handler: async (ctx, { organizationId, passe }) => {
		if (passe > PASSES_MAX) {
			throw new Error(
				`Purge de ${organizationId} interrompue après ${PASSES_MAX} passes : quelque chose ne se supprime pas.`
			);
		}

		let budget = BUDGET_PASSE;
		const encore = () => budget > 0;
		const replanifier = async () => {
			await ctx.scheduler.runAfter(0, internal.rgpd.purgerEtablissement, {
				organizationId,
				passe: passe + 1
			});
		};

		// 1. Les règlements — le plus gros volume : plusieurs par facture.
		if (encore()) {
			const reglements = await ctx.db
				.query('reglements')
				.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
				.take(budget);
			for (const r of reglements) await ctx.db.delete(r._id);
			budget -= reglements.length;
		}

		// 2. Les factures de vente.
		if (encore()) {
			const factures = await ctx.db
				.query('facturesVente')
				.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
				.take(budget);
			for (const f of factures) await ctx.db.delete(f._id);
			budget -= factures.length;
		}

		// 3. Les pièces, leur contenu dans le stockage, et leurs liaisons.
		//    Le fichier part AVANT la ligne qui le référence : l'inverse laisserait
		//    un objet orphelin dans le stockage, que plus rien ne désigne et que
		//    personne ne saurait retrouver pour l'effacer.
		if (encore()) {
			budget = await viderParIndexOrg(ctx, 'piecesFactures', organizationId, budget);
		}
		if (encore()) {
			const pieces = await ctx.db
				.query('pieces')
				.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
				.take(budget);
			for (const piece of pieces) {
				await effacerDuStockage(ctx, piece.storageId);
				await ctx.db.delete(piece._id);
			}
			budget -= pieces.length;
		}

		// 4. Les fichiers déposés, et leur contenu dans le stockage.
		if (encore()) {
			const depots = await ctx.db
				.query('importsRecouvrement')
				.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
				.take(budget);
			for (const depot of depots) {
				await effacerDuStockage(ctx, depot.storageId);
				await ctx.db.delete(depot._id);
			}
			budget -= depots.length;
		}

		// 5. Le reste, table par table. L'ordre suit les dépendances : ce qui est
		//    référencé part après ce qui le référence.
		budget = await viderParIndexOrg(ctx, 'decomptes', organizationId, budget);
		budget = await viderParIndexOrg(ctx, 'dossiers', organizationId, budget);
		budget = await viderParIndexOrg(ctx, 'creances', organizationId, budget);
		budget = await viderParIndexOrg(ctx, 'debiteurs', organizationId, budget);
		budget = await viderParIndexOrg(ctx, 'profilsCreancier', organizationId, budget);
		budget = await viderParIndexOrg(ctx, 'notifications', organizationId, budget);

		if (budget <= 0) {
			await replanifier();
			return null;
		}

		// 5. L'établissement lui-même, en dernier, et son logo avec lui.
		const org = await ctx.db.get(organizationId);
		if (org) {
			if (org.logoStorageId) await effacerDuStockage(ctx, org.logoStorageId);
			await ctx.db.delete(organizationId);
		}
		return null;
	}
});

// ── La suppression du compte ─────────────────────────────────────────────────

export const supprimerMonCompte = authedMutation({
	args: { confirmation: v.string() },
	returns: v.null(),
	handler: async (ctx, { confirmation }) => {
		const attendu = (ctx.user.email ?? '').trim().toLowerCase();
		if (!attendu) throw new ConvexError('Ce compte n’a pas d’adresse e-mail : contactez-nous.');
		if (confirmation.trim().toLowerCase() !== attendu) {
			throw new ConvexError(
				'L’adresse saisie ne correspond pas à celle de votre compte. Rien n’a été supprimé.'
			);
		}

		const userId = ctx.user._id;
		const appartenances = await ctx.db
			.query('organizationMembers')
			.withIndex('by_user', (q) => q.eq('userId', userId))
			.collect();

		// PREMIÈRE PASSE : on vérifie TOUT avant de supprimer QUOI QUE CE SOIT.
		// Convex annulerait de toute façon la transaction en cas d'erreur, mais un
		// message qui arrive après une suppression partielle se lit comme un dégât,
		// et le lecteur du code ne devrait pas avoir à connaître la transactionnalité
		// pour être sûr que rien ne se perd.
		const aPurger: Id<'organizations'>[] = [];
		for (const a of appartenances) {
			const tous = await ctx.db
				.query('organizationMembers')
				.withIndex('by_organization', (q) => q.eq('organizationId', a.organizationId))
				.collect();
			const autres = tous.filter((m) => m.userId !== userId);

			if (autres.length === 0) {
				// Seul membre : l'établissement disparaît avec le compte. Le laisser
				// derrière produirait une organisation que personne ne peut plus ouvrir
				// et dont les factures resteraient en base — c'est-à-dire l'inverse
				// exact de l'effacement demandé.
				aPurger.push(a.organizationId);
				continue;
			}

			if (a.role === 'ORG_ADMIN' && !autres.some((m) => m.role === 'ORG_ADMIN')) {
				const org = await ctx.db.get(a.organizationId);
				throw new ConvexError(
					`Vous êtes le seul administrateur de « ${org?.name ?? 'cet établissement'} », qui compte ${autres.length} autre(s) membre(s). Nommez un autre administrateur, ou supprimez l’établissement, avant de supprimer votre compte.`
				);
			}
		}

		// SECONDE PASSE : on agit.
		for (const a of appartenances) await ctx.db.delete(a._id);

		const profile = await ctx.db
			.query('userProfiles')
			.withIndex('by_userId', (q) => q.eq('userId', userId))
			.unique();
		if (profile) await ctx.db.delete(profile._id);

		for (const organizationId of aPurger) {
			await ctx.scheduler.runAfter(0, internal.rgpd.purgerEtablissement, {
				organizationId,
				passe: 0
			});
		}

		await ctx.scheduler.runAfter(0, internal.rgpd.purgerNotifications, { userId, passe: 0 });
		await ctx.scheduler.runAfter(0, internal.rgpd.oublierIdentite, { userId });
		return null;
	}
});

export const purgerNotifications = internalMutation({
	args: { userId: v.string(), passe: v.number() },
	returns: v.null(),
	handler: async (ctx, { userId, passe }) => {
		if (passe > PASSES_MAX) throw new Error(`Purge des notifications de ${userId} interrompue.`);

		const lot = await ctx.db
			.query('notifications')
			.withIndex('by_user', (q) => q.eq('userId', userId))
			.take(BUDGET_PASSE);
		for (const n of lot) await ctx.db.delete(n._id);

		if (lot.length === BUDGET_PASSE) {
			await ctx.scheduler.runAfter(0, internal.rgpd.purgerNotifications, {
				userId,
				passe: passe + 1
			});
		}
		return null;
	}
});

/**
 * L'identité, retirée de Better Auth.
 *
 * POURQUOI UNE ACTION PLANIFIÉE, ET PAS LA MÊME MUTATION. Better Auth vit dans
 * un composant Convex séparé, avec ses propres tables. Si une de ces
 * suppressions échoue — un modèle absent parce qu'un greffon n'est pas installé,
 * par exemple — elle ne doit pas annuler l'effacement des données du produit,
 * qui lui a réussi. On isole donc, et chaque modèle est tenté séparément.
 *
 * L'ORDRE COMPTE : les sessions d'abord. Tant qu'une session vit, le compte
 * répond encore, et une fenêtre ouverte ailleurs continuerait de travailler sur
 * une identité en cours d'effacement.
 */
export const oublierIdentite = internalAction({
	args: { userId: v.string() },
	returns: v.null(),
	handler: async (ctx, { userId }) => {
		for (const model of ['session', 'account'] as const) {
			for (;;) {
				const res = (await ctx.runMutation(components.betterAuth.adapter.deleteMany, {
					input: {
						model,
						where: [{ field: 'userId', operator: 'eq' as const, value: userId }]
					},
					paginationOpts: { cursor: null, numItems: 200 }
				})) as { count: number };
				if (!res || res.count === 0) break;
			}
		}

		await ctx.runMutation(components.betterAuth.adapter.deleteOne, {
			input: {
				model: 'user',
				where: [{ field: '_id', operator: 'eq' as const, value: userId }]
			}
		});
		return null;
	}
});

// ── Outils ───────────────────────────────────────────────────────────────────

type CtxEcriture = MutationCtx;

/**
 * Vide une table cloisonnée par organisation, dans la limite du budget restant.
 *
 * Les six tables concernées portent toutes le même index sur `organizationId` —
 * seul son nom change, `by_org` ou `by_organization`. Écrire six fois la même
 * boucle aurait été six occasions d'en oublier une au prochain ajout de table.
 */
async function viderParIndexOrg(
	ctx: CtxEcriture,
	table:
		| 'piecesFactures'
		| 'decomptes'
		| 'dossiers'
		| 'creances'
		| 'debiteurs'
		| 'profilsCreancier'
		| 'notifications',
	organizationId: Id<'organizations'>,
	budget: number
): Promise<number> {
	if (budget <= 0) return budget;
	const lot = await ctx.db
		.query(table)
		.withIndex('by_org', (q: any) => q.eq('organizationId', organizationId))
		.take(budget);
	for (const d of lot) await ctx.db.delete(d._id);
	return budget - lot.length;
}

/**
 * Un fichier qui a déjà disparu du stockage n'est pas une erreur.
 *
 * Le ramasse-miettes horaire des fichiers orphelins peut être passé avant nous.
 * Laisser remonter l'exception ferait échouer toute la passe, et la purge
 * bouclerait indéfiniment sur le même document.
 */
async function effacerDuStockage(ctx: CtxEcriture, storageId: Id<'_storage'>): Promise<void> {
	try {
		await ctx.storage.delete(storageId);
	} catch {
		// déjà supprimé
	}
}

/**
 * Un compte qui perd son établissement courant doit en retrouver un autre, ou
 * aucun — jamais celui qui vient de disparaître.
 */
async function recalerProfil(
	ctx: CtxEcriture,
	userId: string,
	quitte: Id<'organizations'>
): Promise<void> {
	const profile = await ctx.db
		.query('userProfiles')
		.withIndex('by_userId', (q) => q.eq('userId', userId))
		.unique();
	if (!profile || profile.currentOrganizationId !== quitte) return;

	const autre = await ctx.db
		.query('organizationMembers')
		.withIndex('by_user', (q) => q.eq('userId', userId))
		.first();
	await ctx.db.patch(profile._id, {
		currentOrganizationId: autre?.organizationId ?? undefined
	});
}
