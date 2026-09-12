import { v, ConvexError, type Infer } from 'convex/values';
import { internalMutation, internalQuery } from '../_generated/server';
import type { MutationCtx, QueryCtx } from '../_generated/server';
import type { Doc, Id } from '../_generated/dataModel';
import { authedMutation, authedQuery } from '../functions';
import { getUserOrg } from '../lib/auth';
import {
	MACHINES,
	libelleEvenement,
	suivreProcedure
} from '../../verticales/recouvrement/apres-procedure';

/**
 * LA MACHINE À ÉTATS POST-PROCÉDURE, CÔTÉ BASE — module 4.5.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QUE LE PRODUIT NE SAVAIT PAS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `creances.statut` connaissait déjà la valeur `ENGAGEE`. Elle ne disait NI
 * quelle procédure avait été prise, NI depuis quand — et sans ces deux
 * informations, aucun délai post-décision ne pouvait courir. Le produit savait
 * dire qu'un dossier était parti, et plus rien après.
 *
 * Or c'est précisément l'après qui se perd : trois mois pour signifier une
 * ordonnance, sous peine de caducité. Passée, tout est à reprendre pendant que
 * la prescription continue de courir.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * L'ÉTAT SE REJOUE, IL NE SE STOCKE PAS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Aucun champ ne porte l'état courant. Il se déduit du journal à chaque
 * lecture. Deux vérités finiraient par diverger, et la divergence serait muette
 * — rien ne casse quand un état ment.
 */

const vEcheance = v.object({
	cle: v.string(),
	libelle: v.string(),
	dateLimite: v.string(),
	gravite: v.union(v.literal('CADUCITE'), v.literal('INFORMATIVE')),
	consequence: v.string()
});

const vSuivi = v.object({
	etat: v.string(),
	libelle: v.string(),
	constat: v.string(),
	depuisLe: v.string(),
	echeances: v.array(vEcheance),
	/** Ce qui court sans qu'on sache combien de temps. Jamais daté. */
	anglesMorts: v.array(v.string()),
	suites: v.array(v.object({ cle: v.string(), libelle: v.string(), vers: v.string() })),
	terminal: v.boolean(),
	/** Le journal, du plus ancien au plus récent. C'est lui qu'on relit à deux ans. */
	journal: v.array(v.object({ cle: v.string(), libelle: v.string(), survenuLe: v.string() }))
});

/** Le suivi complet d'une créance engagée, rejoué depuis son journal. */
async function lireSuivi(ctx: QueryCtx | MutationCtx, creance: Doc<'creances'>) {
	if (creance.procedureEngagee === undefined || creance.engageeLe === undefined) {
		throw new ConvexError('Cette créance n’a engagé aucune procédure.');
	}

	const lignes = await ctx.db
		.query('evenementsProcedure')
		.withIndex('by_creance', (q) => q.eq('creanceId', creance._id))
		.collect();

	// ⚠️ TRIÉES PAR DATE DU FAIT, PAS PAR ORDRE DE SAISIE. Un gérant qui note le
	// 20 mars une ordonnance signifiée le 3 puis, le 21, qu'elle avait été rendue
	// le 10 janvier, écrit ses lignes à l'envers. Rejouer dans l'ordre de saisie
	// laisserait la machine à l'état d'entrée, sans rien dire.
	const journal = lignes
		.filter((e) => e.organizationId === creance.organizationId)
		.sort((a, b) => (a.survenuLe < b.survenuLe ? -1 : a.survenuLe > b.survenuLe ? 1 : 0))
		.map((e) => ({ cle: e.cle, survenuLe: e.survenuLe }));

	// Le journal LISIBLE : la clé reste pour la machine, le libellé vient du
	// domaine. Une clé inconnue — un événement d'une version antérieure — garde
	// sa clé plutôt que de disparaître de l'historique.
	const journalLisible = journal.map((e) => ({
		...e,
		libelle: libelleEvenement(creance.procedureEngagee!, e.cle) ?? e.cle
	}));

	// Les tableaux du domaine sont `readonly` — c'est voulu, rien ne modifie une
	// échéance après coup. Convex attend des tableaux mutables : on recopie ICI,
	// à la frontière, plutôt que d'affaiblir le type du domaine pour convenir à
	// une plateforme.
	const suivi = suivreProcedure(creance.procedureEngagee, journal, creance.engageeLe);
	return {
		etat: suivi.etat,
		libelle: suivi.libelle,
		constat: suivi.constat,
		depuisLe: suivi.depuisLe,
		echeances: suivi.echeances.map((e) => ({ ...e })),
		anglesMorts: [...suivi.anglesMorts],
		suites: suivi.suites.map((s) => ({ ...s })),
		terminal: suivi.terminal,
		journal: journalLisible
	};
}

async function engager(
	ctx: MutationCtx,
	creanceId: Id<'creances'>,
	procedure: string,
	engageeLe: string
) {
	const creance = await ctx.db.get(creanceId);
	if (creance === null) throw new ConvexError('Créance introuvable');

	// ⚠️ ON REFUSE PLUTÔT QUE D'ENGAGER SANS SUIVI. Une procédure sans machine
	// — la relance amiable — n'a pas d'après à surveiller. L'accepter laisserait
	// un dossier marqué « engagé » dont le suivi ne rendrait jamais rien, et le
	// gérant croirait surveillé ce que personne ne regarde.
	if (MACHINES[procedure] === undefined) {
		throw new ConvexError(
			`« ${procedure} » n’a pas d’après modélisé dans ce logiciel : rien n’y serait surveillé.`
		);
	}

	await ctx.db.patch(creanceId, {
		statut: 'ENGAGEE',
		procedureEngagee: procedure,
		engageeLe
	});
	return null;
}

async function consigner(
	ctx: MutationCtx,
	creanceId: Id<'creances'>,
	cle: string,
	survenuLe: string
) {
	const creance = await ctx.db.get(creanceId);
	if (creance === null) throw new ConvexError('Créance introuvable');
	if (creance.procedureEngagee === undefined) {
		throw new ConvexError('Cette créance n’a engagé aucune procédure.');
	}

	await ctx.db.insert('evenementsProcedure', {
		organizationId: creance.organizationId,
		creanceId,
		procedure: creance.procedureEngagee,
		cle,
		survenuLe,
		consigneLe: Date.now()
	});

	return await lireSuivi(ctx, (await ctx.db.get(creanceId))!);
}

/** Sans authentification — pour les tests. */
export const engagerProcedureInterne = internalMutation({
	args: {
		creanceId: v.id('creances'),
		procedure: v.string(),
		engageeLe: v.string()
	},
	returns: v.null(),
	handler: async (ctx, { creanceId, procedure, engageeLe }) =>
		engager(ctx, creanceId, procedure, engageeLe)
});

export const consignerInterne = internalMutation({
	args: {
		creanceId: v.id('creances'),
		cle: v.string(),
		survenuLe: v.string()
	},
	returns: vSuivi,
	handler: async (ctx, { creanceId, cle, survenuLe }) => consigner(ctx, creanceId, cle, survenuLe)
});

export const lireSuiviInterne = internalQuery({
	args: { creanceId: v.id('creances') },
	returns: vSuivi,
	handler: async (ctx, { creanceId }) => {
		const creance = await ctx.db.get(creanceId);
		if (creance === null) throw new ConvexError('Créance introuvable');
		return await lireSuivi(ctx, creance);
	}
});

/**
 * Les entrées authentifiées.
 *
 * Le cloisonnement se pose ICI, avant toute délégation : les fonctions internes
 * font confiance à leur appelant.
 */
async function mienne(
	ctx: QueryCtx | MutationCtx,
	creanceId: Id<'creances'>,
	organizationId: Id<'organizations'>
): Promise<Doc<'creances'>> {
	const creance = await ctx.db.get(creanceId);
	if (creance === null || creance.organizationId !== organizationId) {
		throw new ConvexError('Créance introuvable');
	}
	return creance;
}

export const engagerProcedure = authedMutation({
	args: {
		creanceId: v.id('creances'),
		procedure: v.string(),
		/** La date de l'engagement. Elle sert d'origine tant que rien n'a bougé. */
		engageeLe: v.string()
	},
	returns: v.null(),
	handler: async (ctx, { creanceId, procedure, engageeLe }): Promise<null> => {
		const { organizationId } = await getUserOrg(ctx);
		await mienne(ctx, creanceId, organizationId);
		return await engager(ctx, creanceId, procedure, engageeLe);
	}
});

export const consignerEvenement = authedMutation({
	args: {
		creanceId: v.id('creances'),
		cle: v.string(),
		survenuLe: v.string()
	},
	returns: vSuivi,
	handler: async (ctx, { creanceId, cle, survenuLe }) => {
		const { organizationId } = await getUserOrg(ctx);
		await mienne(ctx, creanceId, organizationId);
		return await consigner(ctx, creanceId, cle, survenuLe);
	}
});

/**
 * Le suivi d'une créance engagée, ou `null`.
 *
 * ⚠️ `null` PLUTÔT QU'UNE ERREUR sur une créance non engagée. L'écran de
 * créance appelle cette requête sur TOUT dossier, y compris ceux qui n'ont
 * jamais rien engagé — c'est le cas courant. Lever y ferait remonter une erreur
 * permanente sur un état parfaitement normal.
 */
export const suiviDeLaCreance = authedQuery({
	args: { creanceId: v.id('creances') },
	returns: v.union(vSuivi, v.null()),
	handler: async (ctx, { creanceId }) => {
		const { organizationId } = await getUserOrg(ctx);
		const creance = await mienne(ctx, creanceId, organizationId);
		if (creance.procedureEngagee === undefined) return null;
		return await lireSuivi(ctx, creance);
	}
});

const vDossier = v.object({
	creanceId: v.id('creances'),
	debiteur: v.string(),
	procedure: v.string(),
	engageeLe: v.string(),
	etat: v.string(),
	libelle: v.string(),
	terminal: v.boolean(),
	/** L'échéance la plus proche, celle qui commande. `null` s'il n'y en a pas. */
	prochaineEcheance: v.union(vEcheance, v.null()),
	intervenant: v.union(v.string(), v.null()),
	anglesMorts: v.array(v.string()),
	/**
	 * ⚠️ LE JOURNAL VOYAGE AVEC LE DOSSIER, et ce n'est pas du confort. Le rail
	 * se calcule par `parcoursDeLaVoie(procedure, journal, engageeLe)` : sans le
	 * journal, il rend toujours l'état d'entrée. L'écran afficherait « requête
	 * déposée » sur un dossier dont l'ordonnance est rendue depuis deux mois,
	 * aucun test ne tomberait, et le rail mentirait exactement là où ce produit
	 * ne peut pas se le permettre.
	 */
	journal: v.array(v.object({ cle: v.string(), survenuLe: v.string() }))
});

/**
 * Les dossiers engagés, le plus pressé en tête.
 *
 * ⚠️ L'ORDRE EST CELUI DU DANGER, PAS CELUI DE LA SAISIE. Une caducité passe
 * devant une échéance informative, et une échéance proche devant une lointaine.
 * Un dossier sans échéance ferme la marche : il n'y a rien à y perdre
 * aujourd'hui.
 */
async function listerDossiers(ctx: QueryCtx, organizationId: Id<'organizations'>) {
	const creances = await ctx.db
		.query('creances')
		.withIndex('by_org_and_statut', (q) =>
			q.eq('organizationId', organizationId).eq('statut', 'ENGAGEE')
		)
		.collect();

	const dossiers: Infer<typeof vDossier>[] = [];
	for (const creance of creances) {
		if (creance.procedureEngagee === undefined || creance.engageeLe === undefined) continue;

		const suivi = await lireSuivi(ctx, creance);
		const debiteur = await ctx.db.get(creance.debiteurId);
		const intervenant =
			creance.intervenantId === undefined ? null : await ctx.db.get(creance.intervenantId);

		dossiers.push({
			creanceId: creance._id,
			debiteur: debiteur?.denomination ?? 'Débiteur inconnu',
			procedure: creance.procedureEngagee,
			engageeLe: creance.engageeLe,
			etat: suivi.etat,
			libelle: suivi.libelle,
			terminal: suivi.terminal,
			prochaineEcheance: suivi.echeances[0] ?? null,
			intervenant: intervenant?.nom ?? null,
			anglesMorts: suivi.anglesMorts,
			journal: suivi.journal.map((e) => ({ cle: e.cle, survenuLe: e.survenuLe }))
		});
	}

	return dossiers.sort((a, b) => {
		const rang = (d: (typeof dossiers)[number]) =>
			d.prochaineEcheance === null ? 2 : d.prochaineEcheance.gravite === 'CADUCITE' ? 0 : 1;
		if (rang(a) !== rang(b)) return rang(a) - rang(b);
		if (a.prochaineEcheance === null || b.prochaineEcheance === null) return 0;
		return a.prochaineEcheance.dateLimite < b.prochaineEcheance.dateLimite ? -1 : 1;
	});
}

export const dossiersInterne = internalQuery({
	args: { organizationId: v.id('organizations') },
	returns: v.array(vDossier),
	handler: async (ctx, { organizationId }): Promise<Awaited<ReturnType<typeof listerDossiers>>> =>
		listerDossiers(ctx, organizationId)
});

export const dossiersEngages = authedQuery({
	args: {},
	returns: v.array(vDossier),
	handler: async (ctx): Promise<Awaited<ReturnType<typeof listerDossiers>>> => {
		const { organizationId } = await getUserOrg(ctx);
		return await listerDossiers(ctx, organizationId);
	}
});

export const rattacherIntervenant = authedMutation({
	args: {
		creanceId: v.id('creances'),
		intervenantId: v.union(v.id('intervenants'), v.null())
	},
	returns: v.null(),
	handler: async (ctx, { creanceId, intervenantId }): Promise<null> => {
		const { organizationId } = await getUserOrg(ctx);
		await mienne(ctx, creanceId, organizationId);

		if (intervenantId !== null) {
			const fiche = await ctx.db.get(intervenantId);
			if (fiche === null || fiche.organizationId !== organizationId) {
				throw new ConvexError('Intervenant introuvable');
			}
		}

		await ctx.db.patch(creanceId, {
			intervenantId: intervenantId ?? undefined
		});
		return null;
	}
});
