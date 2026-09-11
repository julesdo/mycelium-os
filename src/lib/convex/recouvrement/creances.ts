import { v, ConvexError } from 'convex/values';
import { internalMutation } from '../_generated/server';
import { authedMutation } from '../functions';
import { internal } from '../_generated/api';
import { getUserOrg } from '../lib/auth';
import type { MutationCtx } from '../_generated/server';
import type { Doc, Id } from '../_generated/dataModel';
import { additionner, depuisCentimes, soustraire, ZERO } from '../../socle/montants';
import { deduireConditions } from '../../verticales/recouvrement/deduction';
import { qualifier } from '../../verticales/recouvrement/scoring';
import {
	lireLitige,
	questionsRestantes,
	signauxDepuisFaits,
	type CleFait,
	type Reponses
} from '../../verticales/recouvrement/litige';
import type { ClePiece, EtatCritere } from '../../verticales/recouvrement/qualification';
import { vCleFaitLitige, vEtatCritere, vReponseFait } from './tables';

/**
 * La constitution et la qualification d'une créance.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * TROIS INVARIANTS, ET CE QU'ILS COÛTERAIENT S'ILS CÉDAIENT
 * ─────────────────────────────────────────────────────────────────────────
 *
 * 1. **Un seul débiteur par créance.** Grouper deux clients dans un même
 *    dossier produirait un acte qu'aucun tribunal ne peut traiter — découvert
 *    après avoir mandaté et payé un commissaire de justice.
 *
 * 2. **Une facture n'appartient qu'à une créance.** Sans quoi la même somme
 *    partirait dans deux procédures contre le même débiteur, qui aurait beau
 *    jeu de faire tomber les deux.
 *
 * 3. **Le cloisonnement passe avant tout.** Connaître un identifiant de facture
 *    ne doit pas suffire à l'inclure dans sa propre créance.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LA DATE EST UN ARGUMENT, PAS UNE LECTURE D'HORLOGE
 * ─────────────────────────────────────────────────────────────────────────
 *
 * `aujourdHui` arrive de l'appelant. L'exigibilité en dépend, et un test qui ne
 * peut pas fixer la date ne peut pas vérifier qu'une facture non échue est bien
 * refusée. C'est la même discipline que le décompte.
 */

/**
 * Les conditions que le gérant peut encore trancher à la main.
 *
 * ⚠️ `certaine` N'Y EST PLUS, ET C'EST LE MODULE 3.2. Elle s'y trouvait, et
 * l'écran demandait littéralement « Pouvez-vous confirmer le caractère certain
 * de cette créance ? » — une notion de droit, posée à quelqu'un dont ce n'est
 * pas le métier, dont la réponse ouvre des procédures sans débat où la moindre
 * contestation met fin à tout en laissant les frais engagés.
 *
 * Elle se DÉDUIT maintenant des faits déclarés, via `declarerFaitLitige`. La
 * retirer d'ici est la barrière : tant qu'elle y était, un second chemin
 * pouvait la poser sans qu'aucun fait ne la soutienne.
 */
const vReponses = v.object({
	liquide: v.optional(vEtatCritere),
	exigible: v.optional(vEtatCritere),
	entreCommercants: v.optional(vEtatCritere)
});

/** Ce qui reste dû sur une facture, règlements et avoirs déduits. */
async function resteDu(ctx: MutationCtx, facture: Doc<'facturesVente'>) {
	const reglements = await ctx.db
		.query('reglements')
		.withIndex('by_facture', (q) => q.eq('factureId', facture._id))
		.collect();

	const verse = additionner(...reglements.map((r) => depuisCentimes(r.montant)));
	return soustraire(depuisCentimes(facture.montantTTC), verse);
}

/**
 * Une pièce COMPTE-T-ELLE dans les critères de solidité ?
 *
 * ⚠️ `INDETERMINE` N'EST PAS UNE PIÈCE, c'est un document déposé dont la
 * lecture n'a rien conclu. Le laisser entrer ferait franchir un seuil de
 * qualification sur un fichier que personne n'a lu — et c'est ce seuil qui
 * décide si des frais s'engagent.
 *
 * Le compilateur tient cette règle : `ClePiece` ne contient pas
 * `INDETERMINE`, donc l'oublier est une erreur de build, pas un défaut muet.
 */
function compteCommePreuve(type: string): type is ClePiece {
	return type !== 'INDETERMINE';
}

/**
 * Les pièces qui soutiennent cette créance.
 *
 * Deux portées se cumulent : celles rattachées à une facture précise (bon de
 * livraison), et celles rattachées au débiteur (CGV, contrat-cadre). Sans la
 * seconde, des CGV signées une fois pour toutes ne compteraient jamais, et le
 * score sous-estimerait tous les dossiers d'un client régulier.
 */
async function piecesDeLaCreance(
	ctx: MutationCtx,
	debiteurId: Id<'debiteurs'>,
	factureIds: readonly Id<'facturesVente'>[]
): Promise<ClePiece[]> {
	const trouvees = new Set<ClePiece>(['FACTURE']);

	for (const factureId of factureIds) {
		const liaisons = await ctx.db
			.query('piecesFactures')
			.withIndex('by_facture', (q) => q.eq('factureId', factureId))
			.collect();

		for (const liaison of liaisons) {
			const piece = await ctx.db.get(liaison.pieceId);
			if (piece !== null && compteCommePreuve(piece.type)) trouvees.add(piece.type);
		}
	}

	const auDebiteur = await ctx.db
		.query('pieces')
		.withIndex('by_debiteur', (q) => q.eq('debiteurId', debiteurId))
		.collect();
	for (const piece of auDebiteur) {
		if (compteCommePreuve(piece.type)) trouvees.add(piece.type);
	}

	return [...trouvees];
}

/**
 * Les retards déjà observés sur ce débiteur.
 *
 * DÉDUIT, PAS DEMANDÉ. Une facture échue et non soldée EST un retard observé :
 * l'information est déjà en base, et la redemander au gérant serait exactement
 * ce que la première règle d'écran interdit.
 */
async function retardsObserves(
	ctx: MutationCtx,
	organizationId: Id<'organizations'>,
	debiteurId: Id<'debiteurs'>,
	aujourdHui: string
): Promise<number> {
	const factures = await ctx.db
		.query('facturesVente')
		.withIndex('by_debiteur', (q) => q.eq('debiteurId', debiteurId))
		.collect();

	return factures.filter(
		(facture) =>
			facture.organizationId === organizationId &&
			facture.dateEcheance !== undefined &&
			facture.dateEcheance < aujourdHui &&
			facture.statutPaiement !== 'SOLDEE'
	).length;
}

/** Recalcule le score d'une créance à partir de son état courant. */
async function recalculerScore(
	ctx: MutationCtx,
	creance: Doc<'creances'>,
	aujourdHui: string
): Promise<number> {
	const factures = await ctx.db
		.query('facturesVente')
		.withIndex('by_creance', (q) => q.eq('creanceId', creance._id))
		.collect();

	const debiteur = await ctx.db.get(creance.debiteurId);

	const qualification = qualifier({
		certaine: creance.certaine,
		liquide: creance.liquide,
		exigible: creance.exigible,
		entreCommercants: creance.entreCommercants,
		piecesFournies: await piecesDeLaCreance(
			ctx,
			creance.debiteurId,
			factures.map((f) => f._id)
		),
		// ⚠️ CE TABLEAU ÉTAIT ÉCRIT `[]` EN DUR, ET C'EST LE SIXIÈME CHAMP DE CE
		// DÉPÔT « déclaré, lu, jamais alimenté ». `qualifier()` en tire des
		// risques BLOQUANTS et son propre commentaire les appelle « le risque
		// produit numéro un » : il ne pouvait pas se déclencher une seule fois.
		//
		// Il vient maintenant du questionnaire de qualification de litige. Les
		// cinq autres signaux du moteur — ceux qui se lisent dans les documents —
		// attendent toujours l'extracteur, et ceux-là sont réellement absents.
		signauxContestation: signauxDepuisFaits(reponsesDeLaCreance(creance)),
		santeDebiteur: debiteur?.santeFinanciere ?? 'INCONNUE',
		retardsAnterieurs: await retardsObserves(
			ctx,
			creance.organizationId,
			creance.debiteurId,
			aujourdHui
		)
	});

	return qualification.score;
}

/**
 * Les faits déclarés, relus dans la forme que le domaine attend.
 *
 * Le tableau stocké porte une date par réponse — ce que le domaine n'a pas à
 * connaître. Il n'a besoin que de « quel fait, quelle réponse ».
 */
function reponsesDeLaCreance(creance: Doc<'creances'>): Reponses {
	const reponses: Reponses = {};
	for (const fait of creance.faitsLitige ?? []) reponses[fait.cle] = fait.reponse;
	return reponses;
}

/** Les quatre conditions sont-elles toutes tranchées ? */
function toutesTranchees(conditions: {
	certaine: EtatCritere;
	liquide: EtatCritere;
	exigible: EtatCritere;
	entreCommercants: EtatCritere;
}): boolean {
	return Object.values(conditions).every((etat) => etat !== 'unknown');
}

export const creerCreance = internalMutation({
	args: {
		organizationId: v.id('organizations'),
		factureIds: v.array(v.id('facturesVente')),
		aujourdHui: v.string()
	},
	returns: v.id('creances'),
	handler: async (ctx, { organizationId, factureIds, aujourdHui }) => {
		if (factureIds.length === 0) {
			throw new ConvexError('Une créance sans facture n’a rien à réclamer.');
		}

		const factures: Doc<'facturesVente'>[] = [];
		for (const factureId of factureIds) {
			const facture = await ctx.db.get(factureId);

			// Le cloisonnement AVANT tout : même message qu'une facture
			// inexistante, pour ne pas révéler qu'elle existe ailleurs.
			if (facture === null || facture.organizationId !== organizationId) {
				throw new ConvexError('Facture introuvable');
			}
			if (facture.creanceId !== undefined) {
				throw new ConvexError(
					`La facture ${facture.reference} appartient déjà à une créance. La réclamer ` +
						'deux fois exposerait les deux procédures.'
				);
			}
			factures.push(facture);
		}

		const debiteurId = factures[0]!.debiteurId;
		if (factures.some((facture) => facture.debiteurId !== debiteurId)) {
			throw new ConvexError(
				'Une créance ne peut porter que sur UN débiteur. Constituer une créance par ' +
					'débiteur, sans quoi l’acte produit serait irrecevable.'
			);
		}

		const [profil, debiteur] = await Promise.all([
			ctx.db
				.query('profilsCreancier')
				.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
				.first(),
			ctx.db.get(debiteurId)
		]);

		const restes = await Promise.all(factures.map((facture) => resteDu(ctx, facture)));
		const montantExigible = restes.length > 0 ? additionner(...restes) : ZERO;

		// L'exigibilité de la créance est la PLUS TARDIVE de ses factures : tant
		// qu'une seule n'est pas due, l'ensemble ne l'est pas.
		const exigibilites = factures
			.map((facture) => facture.dateExigibilite)
			.filter((date): date is string => date !== undefined);
		const dateExigibilite =
			exigibilites.length === factures.length && exigibilites.length > 0
				? exigibilites.reduce((tardive, date) => (date > tardive ? date : tardive))
				: undefined;

		const conditions = deduireConditions({
			montantExigible,
			dateExigibilite,
			aujourdHui,
			creancierCommercant: profil?.estCommercant ?? 'unknown',
			debiteurCommercant: debiteur?.estCommercant ?? 'unknown'
		});

		const creanceId = await ctx.db.insert('creances', {
			organizationId,
			debiteurId,
			statut: 'BROUILLON',
			...conditions,
			creeLe: Date.now()
		});

		for (const facture of factures) {
			await ctx.db.patch(facture._id, { creanceId });
		}

		const creance = (await ctx.db.get(creanceId))!;
		await ctx.db.patch(creanceId, {
			score: await recalculerScore(ctx, creance, aujourdHui)
		});

		return creanceId;
	}
});

/**
 * Le gérant tranche ce que le logiciel n'a pas pu déduire.
 *
 * La créance ne devient `QUALIFIEE` que lorsque les QUATRE conditions sont
 * tranchées — pas quand le questionnaire a été soumis. La nuance compte : une
 * créance qualifiée est une créance sur laquelle on peut décider, et il en
 * manque toujours une si personne n'a dit si le débiteur est commerçant.
 */
export const repondreQuestionnaire = internalMutation({
	args: {
		creanceId: v.id('creances'),
		reponses: vReponses,
		aujourdHui: v.string()
	},
	returns: v.null(),
	handler: async (ctx, { creanceId, reponses, aujourdHui }) => {
		const creance = await ctx.db.get(creanceId);
		if (creance === null) throw new ConvexError('Créance introuvable');

		const conditions = {
			certaine: creance.certaine,
			liquide: reponses.liquide ?? creance.liquide,
			exigible: reponses.exigible ?? creance.exigible,
			entreCommercants: reponses.entreCommercants ?? creance.entreCommercants
		};

		await ctx.db.patch(creanceId, conditions);

		const misAJour = (await ctx.db.get(creanceId))!;
		const score = await recalculerScore(ctx, misAJour, aujourdHui);

		const complete = toutesTranchees(conditions);
		await ctx.db.patch(creanceId, {
			score,
			statut: complete && creance.statut === 'BROUILLON' ? 'QUALIFIEE' : creance.statut,
			qualifieeLe: complete ? Date.now() : creance.qualifieeLe
		});

		return null;
	}
});

/**
 * LE QUESTIONNAIRE DE QUALIFICATION DE LITIGE — module 3.2.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * UN FAIT ENTRE, UN CRITÈRE SORT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le gérant déclare ce qu'il est SEUL à savoir — son client lui a-t-il écrit
 * pour contester, a-t-il refusé la livraison, réclamé un avoir. Le logiciel en
 * tire le critère `certaine`, qui n'est plus jamais saisi directement.
 *
 * ⚠️ ET `certaine` SE RECALCULE ENTIÈREMENT À CHAQUE DÉCLARATION, depuis le
 * tableau complet. Pas d'accumulation : un gérant qui corrige « oui » en
 * « non » doit voir le critère se rouvrir, sinon le produit garderait une
 * contestation qu'il vient de retirer.
 */
export const declarerFaitLitige = internalMutation({
	args: {
		creanceId: v.id('creances'),
		cle: vCleFaitLitige,
		reponse: vReponseFait,
		aujourdHui: v.string()
	},
	returns: v.object({
		certaine: vEtatCritere,
		litigieux: v.boolean(),
		constats: v.array(v.string()),
		questionsRestantes: v.array(
			v.object({ cle: vCleFaitLitige, question: v.string(), portee: v.string() })
		)
	}),
	handler: async (ctx, { creanceId, cle, reponse, aujourdHui }) => {
		const creance = await ctx.db.get(creanceId);
		if (creance === null) throw new ConvexError('Créance introuvable');

		// Une réponse REMPLACE la précédente. Deux lignes sur le même fait
		// laisseraient deux vérités en base, et la lecture prendrait celle qui
		// traîne — donc peut-être celle que le gérant vient de corriger.
		const faits = [
			...(creance.faitsLitige ?? []).filter((f) => f.cle !== cle),
			{ cle, reponse, declareLe: Date.now() }
		];
		await ctx.db.patch(creanceId, { faitsLitige: faits });

		const reponses: Reponses = {};
		for (const fait of faits) reponses[fait.cle] = fait.reponse;
		const lecture = lireLitige(reponses);

		const conditions = {
			certaine: lecture.certaine,
			liquide: creance.liquide,
			exigible: creance.exigible,
			entreCommercants: creance.entreCommercants
		};
		await ctx.db.patch(creanceId, { certaine: lecture.certaine });

		// Le score se relit sur la créance à jour : `recalculerScore` y reprend
		// les faits déclarés pour ses signaux de contestation.
		const misAJour = (await ctx.db.get(creanceId))!;
		const complete = toutesTranchees(conditions);
		await ctx.db.patch(creanceId, {
			score: await recalculerScore(ctx, misAJour, aujourdHui),
			statut: complete && creance.statut === 'BROUILLON' ? 'QUALIFIEE' : creance.statut,
			qualifieeLe: complete ? (creance.qualifieeLe ?? Date.now()) : creance.qualifieeLe
		});

		return {
			certaine: lecture.certaine,
			litigieux: lecture.litigieux,
			constats: [...lecture.constats],
			questionsRestantes: questionsRestantes(reponses).map((q) => ({
				cle: q.cle,
				question: q.question,
				portee: q.portee
			}))
		};
	}
});

/**
 * Les entrées authentifiées.
 *
 * Elles sont MINCES, délibérément : elles résolvent l'organisation, fournissent
 * la date du jour, et délèguent. Toute la logique reste dans les mutations
 * internes, qui sont celles que les tests exercent — monter le composant Better
 * Auth pour tester coûterait plus cher que ça ne rapporterait, comme le note
 * déjà `rgpd.test.ts`.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LE TYPE DE RETOUR EST ANNOTÉ À LA MAIN, ET CE N'EST PAS DÉCORATIF
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Ces handlers appellent `internal.recouvrement.creances.*` — c'est-à-dire une
 * fonction de LEUR PROPRE MODULE. Le type de `internal` inclut donc le type de
 * ces handlers, qui dépend de `internal` : TypeScript boucle, renonce, et
 * retombe sur `any`.
 *
 * Le coût de cet `any` n'est pas local. Il remonte dans le type de `api` tout
 * entier, et TOUS les écrans perdent leur inférence d'un coup — y compris ceux
 * d'EGalim, qui n'ont rien à voir. C'est exactement ce qui est arrivé en
 * écrivant ces deux fonctions : dix-huit erreurs apparues dans des routes qui
 * n'avaient pas bougé.
 *
 * L'annotation explicite casse le cycle. Ne pas la retirer.
 */
export const creer = authedMutation({
	args: { factureIds: v.array(v.id('facturesVente')) },
	returns: v.id('creances'),
	handler: async (ctx, { factureIds }): Promise<Id<'creances'>> => {
		const { organizationId } = await getUserOrg(ctx);
		return await ctx.runMutation(internal.recouvrement.creances.creerCreance, {
			organizationId,
			factureIds,
			aujourdHui: new Date().toISOString().slice(0, 10)
		});
	}
});

export const repondre = authedMutation({
	args: { creanceId: v.id('creances'), reponses: vReponses },
	returns: v.null(),
	handler: async (ctx, { creanceId, reponses }): Promise<null> => {
		const { organizationId } = await getUserOrg(ctx);

		// Le cloisonnement AVANT la délégation : la mutation interne fait
		// confiance à son appelant, c'est donc ici que la barrière se pose.
		const creance = await ctx.db.get(creanceId);
		if (creance === null || creance.organizationId !== organizationId) {
			throw new ConvexError('Créance introuvable');
		}

		await ctx.runMutation(internal.recouvrement.creances.repondreQuestionnaire, {
			creanceId,
			reponses,
			aujourdHui: new Date().toISOString().slice(0, 10)
		});
		return null;
	}
});

/**
 * Déclarer un fait de litige.
 *
 * Le type de retour est annoté à la main pour la même raison que ses voisines :
 * ce handler appelle `internal.recouvrement.creances.*`, c'est-à-dire son
 * propre module, et sans annotation le cycle d'inférence ferait retomber `api`
 * tout entier sur `any`.
 */
export const declarerFait = authedMutation({
	args: { creanceId: v.id('creances'), cle: vCleFaitLitige, reponse: vReponseFait },
	returns: v.object({
		certaine: vEtatCritere,
		litigieux: v.boolean(),
		constats: v.array(v.string()),
		questionsRestantes: v.array(
			v.object({ cle: vCleFaitLitige, question: v.string(), portee: v.string() })
		)
	}),
	handler: async (
		ctx,
		{ creanceId, cle, reponse }
	): Promise<{
		certaine: EtatCritere;
		litigieux: boolean;
		constats: string[];
		questionsRestantes: { cle: CleFait; question: string; portee: string }[];
	}> => {
		const { organizationId } = await getUserOrg(ctx);

		// Le cloisonnement AVANT la délégation, comme pour `repondre`.
		const creance = await ctx.db.get(creanceId);
		if (creance === null || creance.organizationId !== organizationId) {
			throw new ConvexError('Créance introuvable');
		}

		return await ctx.runMutation(internal.recouvrement.creances.declarerFaitLitige, {
			creanceId,
			cle,
			reponse,
			aujourdHui: new Date().toISOString().slice(0, 10)
		});
	}
});
