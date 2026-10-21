import { v, ConvexError } from 'convex/values';
import { internalMutation, internalQuery, type QueryCtx } from '../_generated/server';
import type { Doc, Id } from '../_generated/dataModel';
import { authedMutation, authedQuery } from '../functions';
import {
	organisationCourante,
	organisationCouranteOuNull,
	requireAdminDeLOrgCourante
} from '../lib/auth';
import { resteDu } from '../recouvrement/lecture';
import { dossiersClasses } from '../recouvrement/classement';
import { configPappers } from './pappersConfig';
import { limitesDeLOrganisation } from '../limites';
import { vCorpsDAnalyse, vNiveau } from './validateurs';
import {
	santeDuPortefeuille,
	type ClientDuPortefeuille
} from '../../verticales/recouvrement/risque/portefeuille';
import { AGE_AVANT_RELECTURE_MS } from '../../verticales/recouvrement/risque/regles';
import { notifier } from '../notifier';

/**
 * LES LECTURES ET ÉCRITURES DE L'ANALYSE DU RISQUE. Les appels à Pappers et au
 * journal officiel vivent dans `analyse.ts` ; ici, la base seulement.
 *
 * ⚠️ TOUT EST CLOISONNÉ PAR ÉTABLISSEMENT : une analyse se lit par
 * `by_org_and_siren` ou `by_org_and_debiteur`, et jamais par l'index de date de
 * la relecture, qui ne vit que dans `relecture.ts` (fonctions internes).
 */

/** Ce que l'écran reçoit d'une analyse : son corps, et son histoire. */
export const vAnalyseAffichee = v.object({
	siren: v.string(),
	analyseLe: v.number(),
	indicePrecedent: v.optional(v.number()),
	niveauPrecedent: v.optional(vNiveau),
	historique: v.array(v.object({ le: v.number(), indice: v.number() })),
	...vCorpsDAnalyse
});

/** Une analyse, sans ce qui ne regarde que le serveur (l'établissement, le client, qui l'a demandée). */
function analyseAffichee(ligne: Doc<'analysesRisque'>) {
	return {
		siren: ligne.siren,
		analyseLe: ligne.analyseLe,
		...(ligne.indicePrecedent === undefined ? {} : { indicePrecedent: ligne.indicePrecedent }),
		...(ligne.niveauPrecedent === undefined ? {} : { niveauPrecedent: ligne.niveauPrecedent }),
		historique: ligne.historique,
		denomination: ligne.denomination,
		...(ligne.formeJuridique === undefined ? {} : { formeJuridique: ligne.formeJuridique }),
		...(ligne.dateCreation === undefined ? {} : { dateCreation: ligne.dateCreation }),
		indice: ligne.indice,
		niveau: ligne.niveau,
		faits: ligne.faits,
		piliers: ligne.piliers,
		lisibilite: ligne.lisibilite,
		...(ligne.lisibiliteRaison === undefined ? {} : { lisibiliteRaison: ligne.lisibiliteRaison }),
		dirigeants: ligne.dirigeants,
		exercices: ligne.exercices,
		comptesConfidentiels: ligne.comptesConfidentiels,
		versionDesRegles: ligne.versionDesRegles
	};
}

/** Ce qu'un client vous doit, hors dossiers classés : la même règle que la liste des clients. */
async function encoursDuClient(
	ctx: QueryCtx,
	organizationId: Id<'organizations'>,
	debiteurId: Id<'debiteurs'>,
	classes: ReadonlySet<string>
): Promise<bigint> {
	const factures = await ctx.db
		.query('facturesVente')
		.withIndex('by_debiteur', (q) => q.eq('debiteurId', debiteurId))
		.collect();
	let total = 0n;
	for (const facture of factures) {
		if (facture.organizationId !== organizationId || facture.statutPaiement === 'SOLDEE') continue;
		if (facture.creanceId !== undefined && classes.has(facture.creanceId)) continue;
		const reste = await resteDu(ctx, facture);
		if (reste > 0n) total += reste;
	}
	return total;
}

async function debiteurDeLOrganisation(
	ctx: QueryCtx,
	organizationId: Id<'organizations'>,
	debiteurId: Id<'debiteurs'>
): Promise<Doc<'debiteurs'>> {
	const debiteur = await ctx.db.get(debiteurId);
	if (debiteur === null || debiteur.organizationId !== organizationId) {
		throw new ConvexError('Ce client n’existe pas dans votre établissement.');
	}
	return debiteur;
}

// ─────────────────────────────────────────────────────────────────────────
// CE QUE PLUME LIT
// ─────────────────────────────────────────────────────────────────────────

const MOT: Readonly<Record<Doc<'analysesRisque'>['niveau'], string>> = {
	RIEN_A_SIGNALER: 'rien à signaler',
	A_SURVEILLER: 'à surveiller',
	PRUDENCE: 'prudence',
	RISQUE_ELEVE: 'risque élevé',
	PROCEDURE: 'procédure en cours',
	FERMEE: 'entreprise fermée'
};

/**
 * LA SANTÉ D'UN CLIENT, EN UNE LIGNE POUR PLUME (13/10/2026) : l'indice, son
 * niveau, la date, les deux faits qui pèsent le plus, et ce que l'indice n'est
 * pas. Aucun montant n'y est recalculé : les faits sont ceux de l'analyse.
 */
export async function santePourPlume(
	ctx: QueryCtx,
	organizationId: Id<'organizations'>,
	debiteurId: Id<'debiteurs'> | undefined
): Promise<string[]> {
	if (debiteurId === undefined) return [];
	const analyse = await ctx.db
		.query('analysesRisque')
		.withIndex('by_org_and_debiteur', (q) =>
			q.eq('organizationId', organizationId).eq('debiteurId', debiteurId)
		)
		.first();
	if (analyse === null)
		return ['Santé du client : jamais analysée (l’écran « Sa santé » de sa fiche le permet).'];
	const lourds = analyse.faits
		.filter((f) => f.effet < 0)
		.slice(0, 2)
		.map((f) => f.titre.charAt(0).toLowerCase() + f.titre.slice(1));
	return [
		`Santé du client, analysée le ${new Date(analyse.analyseLe).toISOString().slice(0, 10)} d’après Pappers et vos factures : « ${MOT[analyse.niveau]} »` +
			(lourds.length === 0 ? '.' : `. Ce qui pèse le plus : ${lourds.join(' ; ')}.`) +
			' Elle résume des faits publics ; elle ne dit pas si ce client paiera.'
	];
}

/** LES CLIENTS À REGARDER, EN UNE LIGNE POUR LA CONVERSATION DE L'ÉTABLISSEMENT, sans montant. */
export async function clientsARegarderPourPlume(
	ctx: QueryCtx,
	organizationId: Id<'organizations'>
): Promise<string[]> {
	const analyses = await ctx.db
		.query('analysesRisque')
		.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
		.collect();
	// Les plus fragiles d'abord, dix au plus : assez pour répondre sur un client nommé.
	const lus = analyses
		.filter((a) => a.debiteurId !== undefined)
		.sort((a, b) => a.indice - b.indice)
		.slice(0, 10);
	if (lus.length === 0) return [];
	return [
		`Santé des clients analysés (d’après Pappers et vos factures ; elle résume des faits et ne dit pas si un client paiera) : ${lus
			.map((a) => {
				const lourd = a.faits.find((f) => f.effet < 0);
				// Le fait COURT, sans montant : la conversation de l'établissement n'en écrit aucun.
				return `${a.denomination} : « ${MOT[a.niveau]} »${lourd === undefined ? '' : `, ${lourd.court.charAt(0).toLowerCase()}${lourd.court.slice(1)}`}`;
			})
			.join(' ; ')}. L’écran « La santé de vos clients » les détaille.`
	];
}

// ─────────────────────────────────────────────────────────────────────────
// CE QUE L'ÉCRAN LIT
// ─────────────────────────────────────────────────────────────────────────

/**
 * LA SANTÉ D'UN CLIENT : sa dernière analyse, ce qu'il vous doit, votre plafond.
 * `disponible` est faux tant que Pappers n'est pas branché.
 */
export const risqueDuClient = authedQuery({
	args: { debiteurId: v.id('debiteurs') },
	returns: v.object({
		disponible: v.boolean(),
		denomination: v.string(),
		siren: v.union(v.null(), v.string()),
		encours: v.int64(),
		plafond: v.union(v.null(), v.int64()),
		analyse: v.union(v.null(), vAnalyseAffichee)
	}),
	handler: async (ctx, { debiteurId }) => {
		const organizationId = await organisationCourante(ctx, ctx.user._id);
		const debiteur = await debiteurDeLOrganisation(ctx, organizationId, debiteurId);
		const classes = await dossiersClasses(ctx, organizationId);
		const encours = await encoursDuClient(ctx, organizationId, debiteurId, classes);
		const ligne =
			(await ctx.db
				.query('analysesRisque')
				.withIndex('by_org_and_debiteur', (q) =>
					q.eq('organizationId', organizationId).eq('debiteurId', debiteurId)
				)
				.first()) ??
			// Analysé comme entreprise avant de devenir client : la même analyse sert.
			(debiteur.siren === undefined
				? null
				: await ctx.db
						.query('analysesRisque')
						.withIndex('by_org_and_siren', (q) =>
							q.eq('organizationId', organizationId).eq('siren', debiteur.siren!)
						)
						.first());
		return {
			disponible: configPappers() !== null,
			denomination: debiteur.denomination,
			siren: debiteur.siren ?? null,
			encours,
			plafond: debiteur.plafondEncours ?? null,
			analyse: ligne === null ? null : analyseAffichee(ligne)
		};
	}
});

/** UNE ENTREPRISE QU'ON S'APPRÊTE À SERVIR, par son SIREN : son analyse, et si elle est déjà cliente. */
export const risqueDUneEntreprise = authedQuery({
	args: { siren: v.string() },
	returns: v.object({
		disponible: v.boolean(),
		analyse: v.union(v.null(), vAnalyseAffichee),
		client: v.union(v.null(), v.object({ id: v.id('debiteurs'), denomination: v.string() }))
	}),
	handler: async (ctx, { siren }) => {
		const organizationId = await organisationCourante(ctx, ctx.user._id);
		const ligne = await ctx.db
			.query('analysesRisque')
			.withIndex('by_org_and_siren', (q) =>
				q.eq('organizationId', organizationId).eq('siren', siren)
			)
			.first();
		const client = await ctx.db
			.query('debiteurs')
			.withIndex('by_org_and_siren', (q) =>
				q.eq('organizationId', organizationId).eq('siren', siren)
			)
			.first();
		return {
			disponible: configPappers() !== null,
			analyse: ligne === null ? null : analyseAffichee(ligne),
			client: client === null ? null : { id: client._id, denomination: client.denomination }
		};
	}
});

/** Les clients de l'établissement, tels que le portefeuille les lit. */
async function clientsDuPortefeuille(
	ctx: QueryCtx,
	organizationId: Id<'organizations'>
): Promise<ClientDuPortefeuille[]> {
	const debiteurs = await ctx.db
		.query('debiteurs')
		.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
		.collect();
	const analyses = await ctx.db
		.query('analysesRisque')
		.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
		.collect();
	const parDebiteur = new Map<string, Doc<'analysesRisque'>>();
	const parSiren = new Map<string, Doc<'analysesRisque'>>();
	for (const a of analyses) {
		if (a.debiteurId !== undefined) parDebiteur.set(a.debiteurId, a);
		parSiren.set(a.siren, a);
	}
	const classes = await dossiersClasses(ctx, organizationId);
	return Promise.all(
		debiteurs.map(async (d): Promise<ClientDuPortefeuille> => {
			const a =
				parDebiteur.get(d._id) ?? (d.siren === undefined ? undefined : parSiren.get(d.siren));
			const faitPrincipal = a?.faits.find((f) => f.effet < 0)?.court ?? a?.faits[0]?.court ?? null;
			return {
				id: d._id,
				nom: d.denomination,
				siren: d.siren ?? null,
				encours: await encoursDuClient(ctx, organizationId, d._id, classes),
				plafond: d.plafondEncours ?? null,
				analyse:
					a === undefined
						? null
						: {
								indice: a.indice,
								niveau: a.niveau,
								analyseLe: a.analyseLe,
								indicePrecedent: a.indicePrecedent ?? null,
								niveauPrecedent: a.niveauPrecedent ?? null,
								faitPrincipal
							}
			};
		})
	);
}

const vClientDuPortefeuille = v.object({
	id: v.string(),
	nom: v.string(),
	siren: v.union(v.null(), v.string()),
	encours: v.int64(),
	plafond: v.union(v.null(), v.int64()),
	analyse: v.union(
		v.null(),
		v.object({
			indice: v.number(),
			niveau: vNiveau,
			analyseLe: v.number(),
			indicePrecedent: v.union(v.null(), v.number()),
			niveauPrecedent: v.union(v.null(), vNiveau),
			faitPrincipal: v.union(v.null(), v.string())
		})
	)
});

const vClientARegarder = v.object({ client: vClientDuPortefeuille, raison: v.string() });

/** Les listes du module pur sont en lecture seule ; le validateur de retour les veut modifiables. */
function santeMutable(sante: ReturnType<typeof santeDuPortefeuille>) {
	const regard = (r: (typeof sante.aRegarder)[number]) => ({
		raison: r.raison,
		client: { ...r.client }
	});
	return {
		...sante,
		repartition: sante.repartition.map((p) => ({ ...p })),
		missions: sante.missions.map((m) => ({ ...m })),
		aRegarder: sante.aRegarder.map(regard),
		changements: sante.changements.map(regard)
	};
}

/** LA SANTÉ DU PORTEFEUILLE, pour `/app/risque`. Voir `risque/portefeuille.ts`. */
export const santeDesClients = authedQuery({
	args: {},
	returns: v.object({
		disponible: v.boolean(),
		budgetRestant: v.number(),
		sante: v.object({
			indice: v.union(v.null(), v.number()),
			niveau: v.union(v.null(), vNiveau),
			encoursTotal: v.int64(),
			encoursAnalyse: v.int64(),
			repartition: v.array(
				v.object({
					tranche: v.union(vNiveau, v.literal('NON_ANALYSE')),
					encours: v.int64(),
					clients: v.number()
				})
			),
			missions: v.array(
				v.object({
					cle: v.union(v.literal('SIREN'), v.literal('ANALYSE'), v.literal('PLAFOND')),
					titre: v.string(),
					detail: v.string(),
					faits: v.number(),
					total: v.number(),
					prochain: v.union(v.null(), v.object({ id: v.string(), nom: v.string() }))
				})
			),
			couverture: v.number(),
			aRegarder: v.array(vClientARegarder),
			changements: v.array(vClientARegarder)
		})
	}),
	handler: async (ctx) => {
		const organizationId = await organisationCourante(ctx, ctx.user._id);
		const clients = await clientsDuPortefeuille(ctx, organizationId);
		const mois = new Date().toISOString().slice(0, 7);
		const consommation = await ctx.db
			.query('consommationRisque')
			.withIndex('by_org_and_mois', (q) => q.eq('organizationId', organizationId).eq('mois', mois))
			.first();
		const { analysesParMois } = await limitesDeLOrganisation(ctx, organizationId);
		return {
			disponible: configPappers() !== null,
			budgetRestant: Math.max(0, analysesParMois - (consommation?.analyses ?? 0)),
			sante: santeMutable(santeDuPortefeuille(clients, Date.now()))
		};
	}
});

/**
 * CE QUE L'ACCUEIL EN DIT : combien de clients méritent un regard, et la
 * couverture. Une requête étroite, pour que l'accueil ne se redessine pas à
 * chaque analyse.
 */
export const resumeDuRisque = authedQuery({
	args: {},
	returns: v.union(
		v.null(),
		v.object({ aRegarder: v.number(), couverture: v.number(), analyses: v.number() })
	),
	handler: async (ctx) => {
		const organizationId = await organisationCouranteOuNull(ctx, ctx.user._id);
		if (organizationId === null || configPappers() === null) return null;
		const clients = await clientsDuPortefeuille(ctx, organizationId);
		const sante = santeDuPortefeuille(clients, Date.now());
		return {
			aRegarder: sante.aRegarder.length,
			couverture: sante.couverture,
			analyses: clients.filter((c) => c.analyse !== null).length
		};
	}
});

// ─────────────────────────────────────────────────────────────────────────
// CE QUE LE GÉRANT ÉCRIT
// ─────────────────────────────────────────────────────────────────────────

/** Mille milliards de centimes : au-delà, c'est une faute de frappe. */
const PLAFOND_MAXIMAL = 1_000_000_000_000n;

/**
 * LE PLAFOND D'ENCOURS D'UN CLIENT, ou son retrait (`null`). Rien ne le propose :
 * le gérant fixe le sien. Tout membre peut le poser : c'est un repère de gestion,
 * pas un réglage de l'établissement.
 */
export const fixerPlafond = authedMutation({
	args: { debiteurId: v.id('debiteurs'), plafond: v.union(v.null(), v.int64()) },
	returns: v.null(),
	handler: async (ctx, { debiteurId, plafond }): Promise<null> => {
		const organizationId = await organisationCourante(ctx, ctx.user._id);
		const debiteur = await debiteurDeLOrganisation(ctx, organizationId, debiteurId);
		if (plafond !== null && (plafond <= 0n || plafond > PLAFOND_MAXIMAL)) {
			throw new ConvexError('Le plafond doit être un montant positif.');
		}
		await ctx.db.patch(debiteur._id, { plafondEncours: plafond ?? undefined });
		return null;
	}
});

// ─────────────────────────────────────────────────────────────────────────
// CE QUE LES ACTIONS LISENT ET ÉCRIVENT
// ─────────────────────────────────────────────────────────────────────────

export const organisationDuMembre = internalQuery({
	args: { userId: v.string() },
	returns: v.id('organizations'),
	handler: async (ctx, { userId }) => organisationCourante(ctx, userId)
});

export const organisationAdministree = internalQuery({
	args: { userId: v.string() },
	returns: v.id('organizations'),
	handler: async (ctx, { userId }) => requireAdminDeLOrgCourante(ctx, userId)
});

/**
 * LES CLIENTS QUE LA MISSION « ANALYSER » VISE : un SIREN, de l'argent dehors, et
 * aucune analyse depuis plus d'un mois. Les plus gros d'abord.
 */
export const clientsAAnalyser = internalQuery({
	args: { organizationId: v.id('organizations'), maintenant: v.number() },
	returns: v.array(v.id('debiteurs')),
	handler: async (ctx, { organizationId, maintenant }) => {
		const clients = await clientsDuPortefeuille(ctx, organizationId);
		return clients
			.filter(
				(c) =>
					c.siren !== null &&
					c.encours > 0n &&
					(c.analyse === null || maintenant - c.analyse.analyseLe > AGE_AVANT_RELECTURE_MS)
			)
			.sort((a, b) => (b.encours > a.encours ? 1 : b.encours < a.encours ? -1 : 0))
			.map((c) => c.id as Id<'debiteurs'>);
	}
});

/** Le client à analyser : son SIREN et son nom, dans CET établissement. */
export const clientAAnalyser = internalQuery({
	args: { organizationId: v.id('organizations'), debiteurId: v.id('debiteurs') },
	returns: v.object({ siren: v.union(v.null(), v.string()), denomination: v.string() }),
	handler: async (ctx, { organizationId, debiteurId }) => {
		const debiteur = await debiteurDeLOrganisation(ctx, organizationId, debiteurId);
		return { siren: debiteur.siren ?? null, denomination: debiteur.denomination };
	}
});

/** Le client qui porte ce SIREN dans l'établissement, s'il y en a un. */
export const clientDuSiren = internalQuery({
	args: { organizationId: v.id('organizations'), siren: v.string() },
	returns: v.union(v.null(), v.id('debiteurs')),
	handler: async (ctx, { organizationId, siren }) => {
		const client = await ctx.db
			.query('debiteurs')
			.withIndex('by_org_and_siren', (q) =>
				q.eq('organizationId', organizationId).eq('siren', siren)
			)
			.first();
		return client?._id ?? null;
	}
});

/** La date de la dernière analyse de ce SIREN, pour ne pas la refaire dans l'heure. */
export const derniereAnalyse = internalQuery({
	args: { organizationId: v.id('organizations'), siren: v.string() },
	returns: v.union(v.null(), v.number()),
	handler: async (ctx, { organizationId, siren }) => {
		const ligne = await ctx.db
			.query('analysesRisque')
			.withIndex('by_org_and_siren', (q) =>
				q.eq('organizationId', organizationId).eq('siren', siren)
			)
			.first();
		return ligne?.analyseLe ?? null;
	}
});

/**
 * RÉSERVER UNE ANALYSE DANS LE BUDGET DU MOIS. `false` quand il est atteint :
 * l'action le dit au lieu d'appeler Pappers.
 */
export const reserverUneAnalyse = internalMutation({
	args: { organizationId: v.id('organizations'), mois: v.string() },
	returns: v.boolean(),
	handler: async (ctx, { organizationId, mois }): Promise<boolean> => {
		const ligne = await ctx.db
			.query('consommationRisque')
			.withIndex('by_org_and_mois', (q) => q.eq('organizationId', organizationId).eq('mois', mois))
			.first();
		// Le plafond de la formule (`limites.ts`), relecture mensuelle comprise.
		const { analysesParMois } = await limitesDeLOrganisation(ctx, organizationId);
		if (analysesParMois <= 0) return false;
		if (ligne === null) {
			await ctx.db.insert('consommationRisque', { organizationId, mois, analyses: 1 });
			return true;
		}
		if (ligne.analyses >= analysesParMois) return false;
		await ctx.db.patch(ligne._id, { analyses: ligne.analyses + 1 });
		return true;
	}
});

/** Au plus tant d'indices gardés dans l'historique d'une analyse. */
const HISTORIQUE_MAXIMAL = 24;

/**
 * ENREGISTRER UNE ANALYSE, en place : l'indice d'avant devient `indicePrecedent`,
 * l'historique s'allonge. Rend ce qu'il faut pour décider d'une notification.
 */
export const enregistrerAnalyse = internalMutation({
	args: {
		organizationId: v.id('organizations'),
		siren: v.string(),
		debiteurId: v.optional(v.id('debiteurs')),
		demandePar: v.string(),
		analyseLe: v.number(),
		...vCorpsDAnalyse
	},
	returns: v.object({
		id: v.id('analysesRisque'),
		indiceAvant: v.union(v.null(), v.number()),
		niveauAvant: v.union(v.null(), vNiveau)
	}),
	handler: async (ctx, args) => {
		const { organizationId, siren, debiteurId, demandePar, analyseLe, ...corps } = args;
		const existante = await ctx.db
			.query('analysesRisque')
			.withIndex('by_org_and_siren', (q) =>
				q.eq('organizationId', organizationId).eq('siren', siren)
			)
			.first();
		const historique = [
			...(existante?.historique ?? []),
			{ le: analyseLe, indice: corps.indice }
		].slice(-HISTORIQUE_MAXIMAL);
		if (existante === null) {
			const id = await ctx.db.insert('analysesRisque', {
				organizationId,
				siren,
				...(debiteurId === undefined ? {} : { debiteurId }),
				demandePar,
				analyseLe,
				historique,
				...corps
			});
			return { id, indiceAvant: null, niveauAvant: null };
		}
		await ctx.db.patch(existante._id, {
			...(debiteurId === undefined ? {} : { debiteurId }),
			demandePar,
			analyseLe,
			indicePrecedent: existante.indice,
			niveauPrecedent: existante.niveau,
			historique,
			...corps,
			// Un champ facultatif absent de la nouvelle analyse doit disparaître, pas survivre.
			formeJuridique: corps.formeJuridique,
			dateCreation: corps.dateCreation,
			lisibiliteRaison: corps.lisibiliteRaison
		});
		return { id: existante._id, indiceAvant: existante.indice, niveauAvant: existante.niveau };
	}
});

/**
 * PRÉVENIR L'ÉTABLISSEMENT D'UNE BAISSE FRANCHE, une fois : la boîte de réception
 * de chaque membre reçoit le client, son niveau, et le fait qui pèse le plus. Une
 * notification non lue sur le même client n'est pas répétée.
 */
export const prevenirDUneBaisse = internalMutation({
	args: {
		organizationId: v.id('organizations'),
		lien: v.string(),
		denomination: v.string(),
		niveau: v.string(),
		indiceAvant: v.number(),
		indiceApres: v.number(),
		fait: v.union(v.null(), v.string())
	},
	returns: v.null(),
	handler: async (ctx, args): Promise<null> => {
		const deja = await ctx.db
			.query('notifications')
			.withIndex('by_org', (q) => q.eq('organizationId', args.organizationId))
			.collect();
		if (deja.some((n) => n.type === 'RISQUE_EN_BAISSE' && n.link === args.lien && !n.isRead)) {
			return null;
		}
		const membres = await ctx.db
			.query('organizationMembers')
			.withIndex('by_organization', (q) => q.eq('organizationId', args.organizationId))
			.collect();
		const message =
			`${args.denomination} passe de ${args.indiceAvant} à ${args.indiceApres} (${args.niveau.toLowerCase()})` +
			(args.fait === null ? '.' : ` : ${args.fait.charAt(0).toLowerCase()}${args.fait.slice(1)}.`);
		for (const membre of membres) {
			await notifier(ctx, {
				organizationId: args.organizationId,
				userId: membre.userId,
				type: 'RISQUE_EN_BAISSE',
				title: 'La santé d’un client baisse',
				message,
				...(args.lien === undefined ? {} : { link: args.lien })
			});
		}
		return null;
	}
});
