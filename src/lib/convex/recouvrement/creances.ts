import { v, ConvexError } from 'convex/values';
import { internalMutation } from '../_generated/server';
import { authedMutation, authedQuery } from '../functions';
import { internal } from '../_generated/api';
import { getUserOrg } from '../lib/auth';
import type { MutationCtx } from '../_generated/server';
import type { Doc, Id } from '../_generated/dataModel';
import { additionner, depuisCentimes, soustraire, ZERO } from '../../socle/montants';
import {
	deduireConditions,
	qualiteEntreCommercants
} from '../../verticales/recouvrement/deduction';
import { qualifier } from '../../verticales/recouvrement/scoring';
import {
	lireLitige,
	proposerFaits,
	questionsRestantes,
	signauxDepuisFaits,
	type CleFait,
	type PropositionFait,
	type Reponse,
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
 * Un horodatage rendu lisible, pour les refus qui CITENT une créance existante.
 *
 * `toLocaleDateString` n'est pas utilisé : le runtime Convex n'offre pas les
 * données de locale, et il rendrait une date à l'américaine sans lever.
 */
function enFrancais(horodatage: number): string {
	return dateEnFrancais(new Date(horodatage).toISOString().slice(0, 10));
}

/** Une date AAAA-MM-JJ rendue lisible, sans jamais la réinterpréter. */
function dateEnFrancais(iso: string): string {
	const [annee, mois, jour] = iso.split('-');
	return `${jour}/${mois}/${annee}`;
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

/**
 * Recalcule le score d'une créance ET sa maturité, à partir de son état courant.
 *
 * ⚠️ LES DEUX ENSEMBLE, ET STOCKÉS ENSEMBLE. « Mûre » n'est plus un score
 * au-dessus d'un seuil mais « toutes conditions établies et aucun bloquant »
 * (17 septembre 2026), et ce verdict ne se recompose pas à la lecture :
 * `qualifier()` a besoin des pièces, des faits déclarés, de la santé du débiteur
 * et des retards observés, soit quatre lectures de plus par créance sur tout
 * l'établissement, dans une boucle qui tourne chaque nuit sur toutes.
 */
async function recalculerScore(
	ctx: MutationCtx,
	creance: Doc<'creances'>,
	aujourdHui: string
): Promise<{ score: number; eligible: boolean }> {
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

	return { score: qualification.score, eligible: qualification.eligible };
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
			throw new ConvexError(
				'Aucune créance n’est constituée, et vos factures importées restent toutes ' +
					'sélectionnables. Ce qui manque est une facture au moins : une créance sans ' +
					'facture n’a rien à réclamer, donc rien à chiffrer. Ce refus se lève dès qu’une ' +
					'facture est retenue dans la sélection. L’attente ne coûte rien ici : rien n’a ' +
					'été écrit, et aucune facture n’a changé d’état.'
			);
		}

		const factures: Doc<'facturesVente'>[] = [];
		for (const factureId of factureIds) {
			const facture = await ctx.db.get(factureId);

			// ⚠️ LE CLOISONNEMENT AVANT TOUT, ET LE MESSAGE RESTE IDENTIQUE À CELUI
			// D'UNE FACTURE INEXISTANTE. Les quatre parties sont dites, mais aucune
			// ne change selon le cas : un refus plus bavard sur l'un des deux dirait
			// à qui connaît un identifiant qu'il existe ailleurs.
			if (facture === null || facture.organizationId !== organizationId) {
				throw new ConvexError(
					'Facture introuvable. Les autres factures de votre établissement restent ' +
						'sélectionnables, et aucune créance n’a été constituée. Ce qui manque est une ' +
						'facture de cet établissement portant cet identifiant. Ce refus se lève par une ' +
						'sélection reprise depuis la liste de vos factures. L’attente ne coûte rien : ' +
						'cette sélection n’a rien écrit.'
				);
			}
			if (facture.creanceId !== undefined) {
				// La créance qui la porte est CITÉE : « déjà rattachée » sans dire à
				// quoi oblige à parcourir toutes les créances du débiteur pour
				// retrouver celle qui la réclame déjà.
				const porteuse = await ctx.db.get(facture.creanceId);
				const porteur = porteuse === null ? null : await ctx.db.get(porteuse.debiteurId);
				const citation =
					porteuse === null
						? 'à une créance'
						: `à la créance de ${porteur?.denomination ?? 'ce débiteur'}, constituée le ` +
							`${enFrancais(porteuse.creeLe)}`;

				throw new ConvexError(
					`La facture ${facture.reference} est déjà réclamée : son montant figure ${citation}, ` +
						'et rien n’en est perdu. Ce qui manque est la possibilité de la porter une ' +
						'seconde fois : la réclamer deux fois exposerait les deux procédures. Ce refus ' +
						'se lève par une sélection qui ne reprend pas cette facture ; aucun geste du ' +
						'produit ne détache aujourd’hui une facture de sa créance, et c’est dit ici ' +
						'plutôt que laissé à chercher. L’attente ne coûte rien sur cette facture, ' +
						'puisqu’elle est déjà réclamée.'
				);
			}
			factures.push(facture);
		}

		const debiteurId = factures[0]!.debiteurId;
		if (factures.some((facture) => facture.debiteurId !== debiteurId)) {
			const combien = new Set(factures.map((facture) => facture.debiteurId)).size;
			throw new ConvexError(
				`Une créance par débiteur se compose depuis cette même sélection : les ` +
					`${factures.length} factures sont déjà lues, et chaque groupe repart de la liste ` +
					`où vous venez de les choisir. Ce qui manque est un débiteur unique — cette ` +
					`sélection en porte ${combien}. Ce refus se lève par une sélection ramenée à un ` +
					`seul débiteur, sans quoi l’acte produit serait irrecevable. L’attente ne coûte ` +
					`rien : aucune créance n’a été constituée et aucune facture n’a changé d’état.`
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
		await ctx.db.patch(creanceId, await recalculerScore(ctx, creance, aujourdHui));

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
		const qualification = await recalculerScore(ctx, misAJour, aujourdHui);

		const complete = toutesTranchees(conditions);
		await ctx.db.patch(creanceId, {
			...qualification,
			statut: complete && creance.statut === 'BROUILLON' ? 'QUALIFIEE' : creance.statut,
			qualifieeLe: complete ? Date.now() : creance.qualifieeLe
		});

		return null;
	}
});

/**
 * LA QUALITÉ DE COMMERÇANT DU DÉBITEUR VIENT D'ÊTRE DÉDUITE : LES CRÉANCES LA REPRENNENT.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SANS CE REJEU, LE CHAMP SERAIT ALIMENTÉ ET JAMAIS RELU
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `debiteurs.estCommercant` n'est lu qu'à la CONSTITUTION d'une créance
 * (`creerCreance`). Une déduction qui arrive après — et elle arrive presque
 * toujours après, puisqu'on retient un établissement au registre une fois les
 * factures importées — ne toucherait aucune créance existante. Le gérant
 * verrait la qualité de commerçant remplie sur la fiche du débiteur et la
 * question lui être reposée sur chacune de ses créances : le douzième cas de
 * « déclaré, lu, jamais alimenté » de ce dépôt, à l'envers.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QUI NE SE REJOUE PAS, ET POURQUOI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * · **Une créance dont `entreCommercants` ne vaut pas `unknown` n'est pas
 *   touchée.** Elle porte soit une réponse du gérant, soit une déduction déjà
 *   faite, et les deux l'emportent : le logiciel remplit ce qui est vide, il
 *   n'efface pas ce qui est tranché. Une déduction récente ne corrige donc pas
 *   une déduction ancienne — arbitrage du 17 septembre 2026.
 * · **Une créance CLOSE n'est pas touchée.** Son dossier est refermé ; rouvrir
 *   un critère dessus ferait bouger un score que plus personne ne regarde.
 * · **Les trois autres conditions ne sont pas recalculées.** Seule celle qui
 *   vient de changer l'est, via `qualiteEntreCommercants`.
 *
 * Le statut suit la même règle que le questionnaire : une créance BROUILLON
 * dont les quatre conditions sont désormais tranchées devient QUALIFIEE. Sans
 * ça, la déduction lèverait la dernière question sans jamais faire avancer la
 * créance, et le gérant n'aurait plus aucun geste pour la débloquer.
 *
 * ⚠️ LE CLOISONNEMENT EST REVÉRIFIÉ EN PLUS DE L'INDEX. `by_debiteur` n'est pas
 * indexé sur `organizationId` : un identifiant de débiteur suffirait à toucher
 * les créances d'un autre établissement.
 */
export const rejouerCommercialiteInterne = internalMutation({
	args: {
		organizationId: v.id('organizations'),
		debiteurId: v.id('debiteurs'),
		aujourdHui: v.string()
	},
	returns: v.null(),
	handler: async (ctx, { organizationId, debiteurId, aujourdHui }): Promise<null> => {
		const debiteur = await ctx.db.get(debiteurId);
		if (debiteur === null || debiteur.organizationId !== organizationId) return null;

		const profil = await ctx.db
			.query('profilsCreancier')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.first();

		const entreCommercants = qualiteEntreCommercants(
			profil?.estCommercant ?? 'unknown',
			debiteur.estCommercant
		);

		// Rien de tranché des deux côtés : il n'y a rien à reprendre, et écrire
		// `unknown` sur `unknown` ferait bouger des scores pour rien.
		if (entreCommercants === 'unknown') return null;

		const creances = await ctx.db
			.query('creances')
			.withIndex('by_debiteur', (q) => q.eq('debiteurId', debiteurId))
			.collect();

		for (const creance of creances) {
			if (creance.organizationId !== organizationId) continue;
			if (creance.statut === 'CLOSE') continue;
			if (creance.entreCommercants !== 'unknown') continue;

			await ctx.db.patch(creance._id, { entreCommercants });

			const misAJour = (await ctx.db.get(creance._id))!;
			const complete = toutesTranchees({
				certaine: misAJour.certaine,
				liquide: misAJour.liquide,
				exigible: misAJour.exigible,
				entreCommercants: misAJour.entreCommercants
			});

			await ctx.db.patch(creance._id, {
				...(await recalculerScore(ctx, misAJour, aujourdHui)),
				statut: complete && creance.statut === 'BROUILLON' ? 'QUALIFIEE' : creance.statut,
				qualifieeLe: complete ? (creance.qualifieeLe ?? Date.now()) : creance.qualifieeLe
			});
		}

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
			...(await recalculerScore(ctx, misAJour, aujourdHui)),
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

/**
 * LES RÉPONSES QUE LE LOGICIEL PROPOSE AU QUESTIONNAIRE — A4 et A10.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ELLE NE FAIT QUE LIRE, ET C'EST TOUT L'INTÉRÊT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * « Le logiciel décide, le gérant confirme » : deux des six questions ont
 * souvent déjà leur réponse en base, et les reposer fait ressaisir ce qu'on a
 * lu à sa place. Mais un « oui » sur `CONTESTATION_ECRITE` éteint l'éligibilité
 * de la créance : une réponse écrite d'office serait une qualification
 * juridique emportée par un geste que personne n'a fait.
 *
 * Cette fonction est donc une QUERY, pas une mutation. Le seul chemin
 * d'écriture reste `declarerFaitLitige`, et il exige un appui.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * DEUX GISEMENTS, ET LE CLOISONNEMENT REVÉRIFIÉ SUR CHACUN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Les réserves lues sur les pièces du dossier — pièces rattachées aux factures
 * de la créance, et pièces de portée débiteur. Et les faits déclarés sur les
 * AUTRES créances du même client, avec leur date.
 *
 * L'index `by_debiteur` ne porte pas l'organisation : le cloisonnement est
 * revérifié document par document, comme à `tauxContractuel.ts`. Sans exception.
 */
export const propositionsLitige = authedQuery({
	args: { creanceId: v.id('creances') },
	returns: v.array(
		v.object({
			cle: vCleFaitLitige,
			reponse: vReponseFait,
			/** D'où vient la proposition, citée. */
			source: v.string(),
			/** Quand, et de quelle date il s'agit. */
			date: v.string()
		})
	),
	handler: async (ctx, { creanceId }): Promise<PropositionFait[]> => {
		const { organizationId } = await getUserOrg(ctx);

		const creance = await ctx.db.get(creanceId);
		if (creance === null || creance.organizationId !== organizationId) {
			throw new ConvexError('Créance introuvable');
		}

		// ── LES RÉSERVES LUES SUR LES PIÈCES DU DOSSIER ────────────────────────
		const factures = await ctx.db
			.query('facturesVente')
			.withIndex('by_creance', (q) => q.eq('creanceId', creanceId))
			.collect();

		const pieceIds = new Set<Id<'pieces'>>();
		for (const facture of factures) {
			if (facture.organizationId !== organizationId) continue;
			const liaisons = await ctx.db
				.query('piecesFactures')
				.withIndex('by_facture', (q) => q.eq('factureId', facture._id))
				.collect();
			for (const liaison of liaisons) pieceIds.add(liaison.pieceId);
		}

		const auDebiteur = await ctx.db
			.query('pieces')
			.withIndex('by_debiteur', (q) => q.eq('debiteurId', creance.debiteurId))
			.collect();
		for (const piece of auDebiteur) pieceIds.add(piece._id);

		const avecReserve: Doc<'pieces'>[] = [];
		for (const pieceId of pieceIds) {
			const piece = await ctx.db.get(pieceId);
			if (piece === null || piece.organizationId !== organizationId) continue;
			if (piece.reserves === undefined || piece.reserves.trim() === '') continue;
			avecReserve.push(piece);
		}

		// La plus récemment déposée d'abord : `proposerFaits` ne retient que la
		// première, et c'est celle qu'on vient de lire qui décrit le dossier.
		avecReserve.sort((a, b) => b.ajouteeLe - a.ajouteeLe);

		// ── LES FAITS DÉJÀ DÉCLARÉS SUR LES AUTRES CRÉANCES DE CE CLIENT ───────
		const creancesDuDebiteur = await ctx.db
			.query('creances')
			.withIndex('by_debiteur', (q) => q.eq('debiteurId', creance.debiteurId))
			.collect();

		const declarations: { cle: CleFait; reponse: Reponse; declareLe: number }[] = [];
		for (const autre of creancesDuDebiteur) {
			if (autre._id === creanceId) continue;
			if (autre.organizationId !== organizationId) continue;
			for (const fait of autre.faitsLitige ?? []) {
				declarations.push({ cle: fait.cle, reponse: fait.reponse, declareLe: fait.declareLe });
			}
		}

		// De la plus ancienne à la plus récente : la dernière l'emporte.
		declarations.sort((a, b) => a.declareLe - b.declareLe);

		return [
			...proposerFaits({
				reserves: avecReserve.map((piece) => ({
					texte: piece.reserves!,
					piece: piece.reference ?? piece.filename,
					// ⚠️ LA PHRASE DIT DE QUELLE DATE IL S'AGIT. La date du document et
					// celle de son dépôt peuvent être séparées de plusieurs mois, et un
					// « 12/03/2026 » nu laisserait croire l'une pour l'autre.
					date:
						piece.dateDocument !== undefined
							? `document du ${dateEnFrancais(piece.dateDocument)}`
							: `pièce déposée le ${enFrancais(piece.ajouteeLe)}`
				})),
				declarationsAnterieures: declarations.map((declaration) => ({
					cle: declaration.cle,
					reponse: declaration.reponse,
					date: `déclarée le ${enFrancais(declaration.declareLe)}`
				}))
			})
		];
	}
});
