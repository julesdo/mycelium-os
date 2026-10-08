import { v, ConvexError } from 'convex/values';
import { authedMutation, authedQuery } from '../functions';
import { getUserOrg } from '../lib/auth';
import type { Id } from '../_generated/dataModel';
import {
	INTITULE_DE_LA_NOTE,
	INTITULE_DU_CANAL,
	composerLaFrise,
	intituleDuFait,
	type FaitDeLaFrise
} from '../../verticales/recouvrement/frise';
import { apresUneParole } from './parole';
import { paroleDuDossier } from './plan';

/**
 * LE SUIVI D'UN DOSSIER — ce que le gérant sait, et que le logiciel ignorait.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI CE MODULE EXISTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le produit calculait très bien et n'avait aucune mémoire du travail humain :
 * pas de note libre, pas de promesse de paiement, pas d'appel consigné, pas de
 * rappel qu'on se pose à soi-même (audit du 29/09/2026, F3). Le gérant gardait
 * son carnet à côté, et l'application restait un rapport qu'on vient consulter
 * au lieu d'être le lieu où le travail se fait.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QUE CE MODULE NE FAIT PAS, ET NE FERA PAS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Il n'en DÉDUIT aucun droit. Une promesse de paiement n'est pas une
 * reconnaissance de dette, et ce logiciel ne dira jamais qu'elle en est une :
 * ce serait une qualification juridique, qui revient au gérant et à son avocat
 * (ligne rouge n° 3). Elle est notée parce qu'elle porte une DATE, et qu'à
 * cette date on veut savoir si elle a été tenue.
 *
 * ⚠️ ET RIEN N'EST DEVINÉ. Une promesse dont l'issue n'est pas tranchée n'est
 * pas « non tenue » : elle est « on ne sait pas encore », et c'est ce qui la
 * fait remonter dans la file le jour dit.
 */

const vGenre = v.union(
	v.literal('NOTE'),
	v.literal('ECHANGE'),
	v.literal('PROMESSE'),
	v.literal('RAPPEL')
);

const vCanal = v.union(
	v.literal('APPEL'),
	v.literal('COURRIEL'),
	v.literal('SMS'),
	v.literal('COURRIER'),
	v.literal('VISITE')
);

/** Ce qu'on lit : les quatre genres qu'on note ici, et l'échéancier, convenu ailleurs. */
const vGenreLu = v.union(vGenre, v.literal('ECHEANCIER'));

const vEntree = v.object({
	_id: v.id('suiviDossier'),
	genre: vGenreLu,
	texte: v.string(),
	canal: v.optional(vCanal),
	survenuLe: v.optional(v.string()),
	montantPromis: v.optional(v.int64()),
	promisPourLe: v.optional(v.string()),
	issue: v.optional(v.union(v.literal('TENUE'), v.literal('NON_TENUE'))),
	rappelLe: v.optional(v.string()),
	faitLe: v.optional(v.string()),
	ecritLe: v.number(),
	/**
	 * Pour une promesse pas encore tranchée : ce qui est arrivé sur le dossier
	 * depuis qu'elle a été notée. Un FAIT qui aide le gérant à trancher — jamais
	 * le logiciel qui tranche à sa place (voir `trancherPromesse`).
	 */
	recuDepuis: v.optional(v.int64())
});

/** Une date du calendrier, ou rien. Une chaîne mal formée ne s'enregistre pas en silence. */
function dateValide(valeur: string): boolean {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(valeur)) return false;
	// ⚠️ `Date.parse` NE LÈVE PAS SUR BUN : « 2026-02-30 » roule sur le 2 mars au
	// lieu de rendre `NaN`. On vérifie donc que la date se relit à l'identique.
	const relu = new Date(`${valeur}T00:00:00.000Z`);
	return !Number.isNaN(relu.getTime()) && relu.toISOString().slice(0, 10) === valeur;
}

async function mienne(
	ctx: { db: { get: (id: Id<'creances'>) => Promise<{ organizationId: Id<'organizations'> } | null> } },
	creanceId: Id<'creances'>,
	organizationId: Id<'organizations'>
) {
	const creance = await ctx.db.get(creanceId);
	if (creance === null || creance.organizationId !== organizationId) {
		throw new ConvexError('Dossier introuvable');
	}
}

/**
 * Tout ce qui a été noté sur un dossier, du plus récent au plus ancien.
 *
 * ⚠️ LE PLUS RÉCENT D'ABORD, et par la date de SAISIE. Un échange daté d'il y a
 * trois mois qu'on vient de noter est une information NEUVE : le ranger trois
 * mois en arrière le rendrait invisible le jour où il compte.
 */
export const lire = authedQuery({
	args: { creanceId: v.id('creances') },
	returns: v.array(vEntree),
	handler: async (ctx, { creanceId }) => {
		const { organizationId } = await getUserOrg(ctx);
		await mienne(ctx, creanceId, organizationId);

		const entrees = await ctx.db
			.query('suiviDossier')
			.withIndex('by_creance', (q) => q.eq('creanceId', creanceId))
			.collect();
		const ouvertes = entrees.some((e) => e.genre === 'PROMESSE' && e.issue === undefined);
		const reglements = ouvertes
			? (
					await paroleDuDossier(
						ctx,
						creanceId,
						await ctx.db
							.query('facturesVente')
							.withIndex('by_creance', (q) => q.eq('creanceId', creanceId))
							.collect()
					)
				).reglements
			: [];
		const recuDepuis = (ecritLe: number): bigint => {
			const depuis = new Date(ecritLe).toISOString().slice(0, 10);
			return reglements.reduce((s, r) => (r.le >= depuis ? s + r.montant : s), 0n);
		};

		return entrees
			.filter((e) => e.organizationId === organizationId)
			.sort((a, b) => b.ecritLe - a.ecritLe)
			.map((e) => ({
				_id: e._id,
				genre: e.genre,
				texte: e.texte,
				canal: e.canal,
				survenuLe: e.survenuLe,
				montantPromis: e.montantPromis,
				promisPourLe: e.promisPourLe,
				issue: e.issue,
				rappelLe: e.rappelLe,
				faitLe: e.faitLe,
				ecritLe: e.ecritLe,
				...(e.genre === 'PROMESSE' && e.issue === undefined
					? { recuDepuis: recuDepuis(e.ecritLe) }
					: {})
			}));
	}
});

/**
 * Noter quelque chose sur un dossier.
 *
 * ⚠️ UNE SEULE MUTATION POUR LES QUATRE GENRES, et les contrôles sont par
 * genre. Quatre mutations quasi identiques finiraient par diverger sur le
 * cloisonnement ou sur la validation des dates — et c'est toujours celle qu'on
 * a oublié de relire qui laisse passer.
 */
export const noter = authedMutation({
	args: {
		creanceId: v.id('creances'),
		genre: vGenre,
		texte: v.string(),
		canal: v.optional(vCanal),
		survenuLe: v.optional(v.string()),
		montantPromis: v.optional(v.int64()),
		promisPourLe: v.optional(v.string()),
		rappelLe: v.optional(v.string())
	},
	returns: v.id('suiviDossier'),
	handler: async (ctx, args): Promise<Id<'suiviDossier'>> => {
		const { organizationId, user } = await getUserOrg(ctx);
		await mienne(ctx, args.creanceId, organizationId);

		const texte = args.texte.trim();
		if (texte === '') throw new ConvexError('Écrivez ce que vous voulez retenir.');

		// ⚠️ CHAQUE GENRE EXIGE CE QUI LE REND UTILE, et le refus le NOMME. Une
		// promesse sans date ne remonte jamais dans la file : l'accepter en
		// silence donnerait une note qui se croit une promesse.
		if (args.genre === 'ECHANGE') {
			if (args.canal === undefined) throw new ConvexError('Dites par quoi l’échange a eu lieu.');
			if (args.survenuLe === undefined || !dateValide(args.survenuLe)) {
				throw new ConvexError('Donnez le jour de l’échange.');
			}
		}
		if (args.genre === 'PROMESSE') {
			if (args.montantPromis === undefined || args.montantPromis <= 0n) {
				throw new ConvexError('Donnez le montant qu’il a promis.');
			}
			if (args.promisPourLe === undefined || !dateValide(args.promisPourLe)) {
				throw new ConvexError('Donnez le jour pour lequel il l’a promis.');
			}
		}
		if (args.genre === 'RAPPEL') {
			if (args.rappelLe === undefined || !dateValide(args.rappelLe)) {
				throw new ConvexError('Donnez le jour où vous voulez y revenir.');
			}
		}

		const entreeId = await ctx.db.insert('suiviDossier', {
			organizationId,
			creanceId: args.creanceId,
			genre: args.genre,
			texte,
			...(args.genre === 'ECHANGE' ? { canal: args.canal, survenuLe: args.survenuLe } : {}),
			...(args.genre === 'PROMESSE'
				? { montantPromis: args.montantPromis, promisPourLe: args.promisPourLe }
				: {}),
			...(args.genre === 'RAPPEL' ? { rappelLe: args.rappelLe } : {}),
			auteurUserId: user._id,
			ecritLe: Date.now()
		});
		// Une promesse fait taire le plan : la relance programmée par le pilote ne part pas.
		if (args.genre === 'PROMESSE') await apresUneParole(ctx, args.creanceId);
		return entreeId;
	}
});

/**
 * Trancher ce qu'il est advenu d'une promesse.
 *
 * ⚠️ C'EST LE GÉRANT QUI TRANCHE, PAS LE LOGICIEL. Un rapprochement bancaire
 * pourrait suggérer qu'un versement est arrivé ; il ne dit pas que c'est CELUI
 * qui était promis, ni qu'il solde la promesse. Déduire « tenue » d'un virement
 * du bon montant au bon jour serait une supposition présentée comme un fait.
 */
export const trancherPromesse = authedMutation({
	args: {
		entreeId: v.id('suiviDossier'),
		issue: v.union(v.literal('TENUE'), v.literal('NON_TENUE'))
	},
	returns: v.null(),
	handler: async (ctx, { entreeId, issue }): Promise<null> => {
		const { organizationId } = await getUserOrg(ctx);
		const entree = await ctx.db.get(entreeId);
		if (entree === null || entree.organizationId !== organizationId) {
			throw new ConvexError('Note introuvable');
		}
		if (entree.genre !== 'PROMESSE') throw new ConvexError('Cette note n’est pas une promesse.');
		await ctx.db.patch(entreeId, { issue });
		return null;
	}
});

/** Déclarer un rappel fait : il cesse de remonter dans la file. */
export const rappelFait = authedMutation({
	args: { entreeId: v.id('suiviDossier'), faitLe: v.string() },
	returns: v.null(),
	handler: async (ctx, { entreeId, faitLe }): Promise<null> => {
		const { organizationId } = await getUserOrg(ctx);
		const entree = await ctx.db.get(entreeId);
		if (entree === null || entree.organizationId !== organizationId) {
			throw new ConvexError('Note introuvable');
		}
		if (entree.genre !== 'RAPPEL') throw new ConvexError('Cette note n’est pas un rappel.');
		if (!dateValide(faitLe)) throw new ConvexError('Donnez le jour où vous l’avez fait.');
		await ctx.db.patch(entreeId, { faitLe });
		return null;
	}
});

/**
 * Effacer une note.
 *
 * ⚠️ ELLE S'EFFACE VRAIMENT. Ce n'est ni un décompte, ni un courrier validé,
 * ni un fait de procédure : rien ne s'appuie dessus, et une note prise par
 * erreur — sur le mauvais dossier, avec le mauvais montant — doit pouvoir
 * disparaître. Ce qui est figé dans ce produit l'est pour une raison, et une
 * note du gérant n'en a aucune.
 */
export const effacer = authedMutation({
	args: { entreeId: v.id('suiviDossier') },
	returns: v.null(),
	handler: async (ctx, { entreeId }): Promise<null> => {
		const { organizationId } = await getUserOrg(ctx);
		const entree = await ctx.db.get(entreeId);
		if (entree === null || entree.organizationId !== organizationId) {
			throw new ConvexError('Note introuvable');
		}
		await ctx.db.delete(entreeId);
		return null;
	}
});

/**
 * LA FRISE DU DOSSIER — ce que la machine a constaté et ce que le gérant a
 * noté, dans une seule ligne de temps.
 *
 * ⚠️ LE JOURNAL ÉTAIT EN BASE ET S'AFFICHAIT NULLE PART. Le chantier de la page
 * dossier l'avait nommé comme un contenu « sans nouveau foyer » ; il en a un.
 *
 * ⚠️ ET LA CIBLE DU JOURNAL EST UNE CHAÎNE, PAS UN IDENTIFIANT TYPÉ. Un fait
 * porte sur une créance, un débiteur, une facture ou une pièce : l'index
 * `by_org_and_cible` s'interroge avec l'identifiant en chaîne, celui du dossier
 * qu'on regarde.
 */
export const frise = authedQuery({
	args: { creanceId: v.id('creances') },
	returns: v.array(
		v.object({
			quand: v.number(),
			auteur: v.union(v.literal('LOGICIEL'), v.literal('VOUS')),
			titre: v.string(),
			detail: v.optional(v.string()),
			source: v.optional(v.string())
		})
	),
	handler: async (ctx, { creanceId }) => {
		const { organizationId } = await getUserOrg(ctx);
		await mienne(ctx, creanceId, organizationId);

		const faitsDuJournal = await ctx.db
			.query('journal')
			.withIndex('by_org_and_cible', (q) =>
				q.eq('organizationId', organizationId).eq('cible', creanceId as string)
			)
			.collect();

		const notes = await ctx.db
			.query('suiviDossier')
			.withIndex('by_creance', (q) => q.eq('creanceId', creanceId))
			.collect();

		const faits: FaitDeLaFrise[] = [];

		for (const entree of faitsDuJournal) {
			faits.push({
				quand: entree.consigneLe,
				// ⚠️ L'AUTEUR VIENT DE LA DONNÉE, jamais de la clé. Deux faits de même
				// clé peuvent avoir deux auteurs : une qualification posée par le
				// gérant et la même relevée au registre ne se lisent pas pareil.
				auteur: entree.auteur === 'GERANT' ? 'VOUS' : 'LOGICIEL',
				titre: intituleDuFait(entree.cle),
				...(entree.apres === undefined ? {} : { detail: entree.apres }),
				...(entree.source === undefined ? {} : { source: entree.source })
			});
		}

		for (const note of notes) {
			if (note.organizationId !== organizationId) continue;
			faits.push({
				quand: note.ecritLe,
				auteur: 'VOUS',
				titre: INTITULE_DE_LA_NOTE[note.genre] ?? 'Note',
				detail: note.texte,
				...(note.canal === undefined ? {} : { source: INTITULE_DU_CANAL[note.canal] })
			});
		}

		return [...composerLaFrise(faits)];
	}
});
