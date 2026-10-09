import { v, ConvexError } from 'convex/values';
import { authedQuery } from '../functions';
import { getUserOrg } from '../lib/auth';
import type { Doc, Id } from '../_generated/dataModel';
import type { MutationCtx } from '../_generated/server';
import { ZERO, additionner, depuisCentimes, enCentimes, versEuros } from '../../socle/montants';
import { controlerDecompte } from '../../verticales/recouvrement/controle';
import { parametresManquants, tousLesParametres } from '../../verticales/recouvrement/parametres';
import { ecartJours } from '../../verticales/recouvrement/calendrier';
import { deduireConditions } from '../../verticales/recouvrement/deduction';
import {
	prescriptionDe,
	regimePrescription,
	type SecteurCreance
} from '../../verticales/recouvrement/pays/france/prescription';
import { projeterDecompte, vNatureAbandon } from './decompte';
import { resteDu, rejouerQualification } from './creances';
import { vConventionJours, vImputation, vImputationDuDecompte, vTaux } from './tables';

/**
 * LE MONTANT DU JOUR D'UN DOSSIER — et le rattachement de factures.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ L'ARRÊT D'UN DÉCOMPTE N'EXISTE PLUS (09/10/2026)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Ce module portait « le seul geste irréversible du produit » : un écran plein
 * cadre, un contrôle de complétude, trois puis deux cases, un bouton qui figeait
 * le décompte. Or les pénalités courent jusqu'au paiement, et le chiffre qu'un
 * document réclame se fige désormais tout seul au jour où il part
 * (`decompte.daterLeDecompte`). Le fondateur : « pas besoin de l'arrêter, on a
 * juste besoin de le réclamer ».
 *
 * Restent `preparerArret` — le montant du jour que la page d'un dossier montre,
 * avec ce qu'il laisse de côté et la date limite pour agir — et
 * `rattacherFactures`, que le démarrage et le pilote emploient. Le contrôle de
 * complétude vit où il protège encore : une déclaration ne part pas sans les
 * factures du client restées hors du dossier (`envois.composer`).
 */

const vSegment = v.object({
	debut: v.string(),
	fin: v.string(),
	jours: v.number(),
	principal: v.int64(),
	taux: vTaux,
	baseAnnuelle: v.number(),
	interets: v.int64()
});

const vLigneProjetee = v.object({
	reference: v.string(),
	principalRestantDu: v.int64(),
	interets: v.int64(),
	indemniteForfaitaire: v.int64(),
	total: v.int64(),
	segments: v.array(vSegment),
	imputations: v.array(vImputation)
});

/**
 * L'abandon, plus ce qui dit s'il se répare d'un geste.
 *
 * ⚠️ `rattachable` N'EST PAS UNE COMMODITÉ D'AFFICHAGE. Sans lui, la sortie
 * « les inclure et refaire le décompte » serait un bouton qui lève une erreur
 * une fois sur deux : une facture déjà portée par une AUTRE créance ne peut pas
 * être rattachée à celle-ci, et la réclamer deux fois exposerait les deux
 * procédures.
 */
const vAbandonChiffre = v.object({
	nature: vNatureAbandon,
	reference: v.string(),
	montantEnJeu: v.union(v.int64(), v.null()),
	explication: v.string(),
	/** La facture écartée, quand l'abandon en désigne une. */
	factureId: v.union(v.id('facturesVente'), v.null()),
	/** Vrai quand cette facture peut rejoindre la créance sans en quitter une autre. */
	rattachable: v.boolean()
});

const vPreparationArret = v.object({
	creanceId: v.id('creances'),
	debiteurId: v.id('debiteurs'),
	debiteur: v.string(),
	statut: v.union(
		v.literal('BROUILLON'),
		v.literal('QUALIFIEE'),
		v.literal('ENGAGEE'),
		v.literal('CLOSE')
	),
	/** La date d'arrêté : CELLE DU JOUR, jamais choisie. */
	arreteAu: v.string(),
	convention: vConventionJours,
	/** Le décompte tel qu'il serait figé. `null` quand il ne se calcule pas. */
	projection: v.union(
		v.null(),
		v.object({
			principalRestantDu: v.int64(),
			interets: v.int64(),
			indemniteForfaitaire: v.int64(),
			total: v.int64(),
			lignes: v.array(vLigneProjetee),
			imputation: vImputationDuDecompte
		})
	),
	/** Le motif nommé quand le calcul n'aboutit pas. Jamais un écran cassé (D0). */
	refusDeCalcul: v.union(
		v.null(),
		v.object({
			motif: v.union(
				v.literal('AUCUNE_FACTURE'),
				v.literal('EXIGIBILITE_MANQUANTE'),
				v.literal('CALCUL_IMPOSSIBLE')
			),
			detail: v.string()
		})
	),
	abandons: v.array(vAbandonChiffre),
	/** La somme des abandons CHIFFRABLES. Les autres ne s'additionnent pas. */
	montantAbandonne: v.int64(),
	nombreNonChiffrables: v.number(),
	/**
	 * L'état du troisième étage du contrôle, dit plutôt que sous-entendu.
	 *
	 * `exerce` vaut `false` tant qu'aucun module n'émet d'acte, et c'est le
	 * cas aujourd'hui.
	 */
	controleDesParametres: v.object({
		exerce: v.boolean(),
		total: v.number(),
		clesNonUtilisables: v.array(v.string())
	}),
	/** Ce que l'attente coûte, en jours de prescription. Quatrième partie d'un refus. */
	prescription: v.object({
		date: v.union(v.string(), v.null()),
		joursRestants: v.union(v.number(), v.null()),
		/** Nommé quand aucune date de départ exploitable n'existe. */
		motifInconnue: v.union(v.string(), v.null()),
		dureeAnnees: v.number(),
		/** Vrai quand le délai retenu est l'hypothèse la plus courte, faute de secteur. */
		hypothese: v.boolean(),
		source: v.string()
	}),
	/** Le dernier décompte déjà arrêté sur cette créance, pour l'atteindre depuis ici. */
	dernierDecompte: v.union(
		v.null(),
		v.object({ _id: v.id('decomptes'), arreteAu: v.string(), total: v.int64() })
	)
});

/**
 * LA PRESCRIPTION DE LA CRÉANCE : LA PLUS PROCHE DE SES FACTURES.
 *
 * ⚠️ LA PLUS PROCHE, PAS LA MOYENNE NI LA DERNIÈRE. C'est la première qui
 * s'éteint qui commande, et elle s'éteint en silence.
 */
function prescriptionDeLaCreance(
	factures: ReadonlyArray<Doc<'facturesVente'>>,
	secteur: SecteurCreance,
	aujourdHui: string
): { date: string | null; joursRestants: number | null; motifInconnue: string | null } {
	let plusProche: string | null = null;
	let motif: string | null = null;

	for (const facture of factures) {
		const calculee = prescriptionDe([facture.dateExigibilite, facture.dateEcheance], secteur);
		if (calculee.datePrescription === undefined) {
			motif = calculee.motifPrescriptionInconnue ?? motif;
			continue;
		}
		if (plusProche === null || calculee.datePrescription < plusProche) {
			plusProche = calculee.datePrescription;
		}
	}

	return {
		date: plusProche,
		joursRestants: plusProche === null ? null : ecartJours(aujourdHui, plusProche),
		// Le motif ne se rend QUE s'il ne reste aucune date : une facture abîmée
		// parmi dix ne doit pas faire croire que rien n'est surveillé.
		motifInconnue: plusProche === null ? motif : null
	};
}

export const preparerArret = authedQuery({
	args: { creanceId: v.id('creances') },
	returns: v.union(v.null(), vPreparationArret),
	handler: async (ctx, { creanceId }) => {
		const { organizationId } = await getUserOrg(ctx);

		const creance = await ctx.db.get(creanceId);
		if (creance === null || creance.organizationId !== organizationId) return null;

		const debiteur = await ctx.db.get(creance.debiteurId);
		const sien = debiteur !== null && debiteur.organizationId === organizationId ? debiteur : null;
		const secteur: SecteurCreance = sien?.secteur ?? 'INDETERMINE';
		const regime = regimePrescription(secteur);

		// LA DATE D'ARRÊTÉ EST CELLE DU JOUR. Laisser choisir ouvrirait la porte à
		// un décompte arrêté à une date qui arrange.
		const arreteAu = new Date().toISOString().slice(0, 10);
		const convention = 'ACT_365' as const;

		const projection = await projeterDecompte(ctx, creance, arreteAu, convention);

		// TOUTES les factures du MÊME débiteur. C'est la comparaison avec cette
		// liste qui révèle l'oubli ; sans elle le contrôle ne peut rien voir.
		const facturesDuDebiteur = (
			await ctx.db
				.query('facturesVente')
				.withIndex('by_debiteur', (q) => q.eq('debiteurId', creance.debiteurId))
				.collect()
		).filter((facture) => facture.organizationId === organizationId);

		const parReference = new Map(facturesDuDebiteur.map((facture) => [facture.reference, facture]));

		const controle =
			projection.decompte === null
				? null
				: controlerDecompte({
						decompte: projection.decompte,
						facturesConnues: facturesDuDebiteur.map((facture) => ({
							reference: facture.reference,
							montantExigible: depuisCentimes(facture.montantTTC)
						}))
					});

		const abandons = (controle?.abandons ?? []).map((abandon) => {
			const facture = parReference.get(abandon.reference);
			return {
				nature: abandon.nature,
				reference: abandon.reference,
				montantEnJeu: abandon.montantEnJeu === null ? null : enCentimes(abandon.montantEnJeu),
				explication: abandon.explication,
				factureId: facture === undefined ? null : facture._id,
				rattachable:
					abandon.nature === 'FACTURE_ECARTEE' &&
					facture !== undefined &&
					facture.creanceId === undefined
			};
		});

		const facturesDeLaCreance = facturesDuDebiteur.filter(
			(facture) => facture.creanceId === creanceId
		);

		const decomptes = await ctx.db
			.query('decomptes')
			.withIndex('by_creance', (q) => q.eq('creanceId', creanceId))
			.order('desc')
			.take(1);
		const dernier = decomptes[0];

		return {
			creanceId,
			debiteurId: creance.debiteurId,
			debiteur: sien?.denomination ?? 'Débiteur inconnu',
			statut: creance.statut,
			arreteAu,
			convention,
			projection:
				projection.decompte === null
					? null
					: {
							principalRestantDu: enCentimes(projection.decompte.principalRestantDu),
							interets: enCentimes(projection.decompte.interets),
							indemniteForfaitaire: enCentimes(projection.decompte.indemniteForfaitaire),
							total: enCentimes(projection.decompte.total),
							imputation: {
								ordre: projection.decompte.imputation.ordre,
								confirme: projection.decompte.imputation.confirme,
								...(projection.decompte.imputation.totalAutreOrdre === null
									? {}
									: { totalAutreOrdre: enCentimes(projection.decompte.imputation.totalAutreOrdre) })
							},
							lignes: projection.decompte.lignes.map((ligne) => ({
								reference: ligne.reference,
								principalRestantDu: enCentimes(ligne.principalRestantDu),
								interets: enCentimes(ligne.interets),
								indemniteForfaitaire: enCentimes(ligne.indemniteForfaitaire),
								total: enCentimes(ligne.total),
								segments: ligne.segments.map((segment) => ({
									debut: segment.debut,
									fin: segment.fin,
									jours: segment.jours,
									principal: enCentimes(segment.principal),
									taux: {
										numerateur: segment.taux.numerateur,
										denominateur: segment.taux.denominateur
									},
									baseAnnuelle: segment.baseAnnuelle,
									interets: enCentimes(segment.interets)
								})),
								imputations: ligne.imputations.map((imputation) => ({
									date: imputation.date,
									nature: imputation.nature,
									montant: enCentimes(imputation.montant),
									surInterets: enCentimes(imputation.surInterets),
									surPrincipal: enCentimes(imputation.surPrincipal)
								}))
							}))
						},
			refusDeCalcul: projection.refus,
			abandons,
			montantAbandonne: enCentimes(controle?.montantAbandonne ?? ZERO),
			nombreNonChiffrables: abandons.filter((abandon) => abandon.montantEnJeu === null).length,
			controleDesParametres: {
				// ⚠️ TOUJOURS `false` AUJOURD'HUI, et le jour où un module émettra un
				// acte, c'est lui qui nommera les clés dont il dépend. Écrire `true`
				// ici sans passer `parametresRequis` afficherait un verrou imaginaire.
				exerce: false,
				total: tousLesParametres().length,
				clesNonUtilisables: parametresManquants()
			},
			prescription: {
				...prescriptionDeLaCreance(facturesDeLaCreance, secteur, arreteAu),
				dureeAnnees: regime.dureeAnnees,
				hypothese: regime.hypothese,
				source: regime.source
			},
			dernierDecompte:
				dernier === undefined || dernier.organizationId !== organizationId
					? null
					: { _id: dernier._id, arreteAu: dernier.arreteAu, total: dernier.total }
		};
	}
});

/**
 * RATTACHER DES FACTURES À UN DOSSIER — le geste du gérant à l'arrêt, et celui du
 * pilote quand une nouvelle facture du même client passe son échéance.
 *
 * ⚠️ UNE SEULE ÉCRITURE POUR LES DEUX. Les conditions se redéduisent de la même
 * façon, le journal dit qui a rattaché (`GERANT` ou `MACHINE`) : deux copies
 * divergeraient au premier changement de la règle d'exigibilité.
 */
export async function rattacherFactures(
	ctx: MutationCtx,
	{
		organizationId,
		creanceId,
		factureIds,
		par
	}: {
		readonly organizationId: Id<'organizations'>;
		readonly creanceId: Id<'creances'>;
		readonly factureIds: readonly Id<'facturesVente'>[];
		readonly par:
			| {
					readonly auteur: 'GERANT';
					readonly userId: string;
					readonly source: string;
					readonly phrase: string;
			  }
			| { readonly auteur: 'MACHINE'; readonly source: string; readonly phrase: string };
	}
): Promise<number> {
	const creance = await ctx.db.get(creanceId);
	if (creance === null || creance.organizationId !== organizationId) {
		throw new ConvexError('Créance introuvable');
	}

	const aujourdHui = new Date().toISOString().slice(0, 10);
	const aRattacher: Array<Doc<'facturesVente'>> = [];

	for (const factureId of factureIds) {
		const facture = await ctx.db.get(factureId);
		if (facture === null || facture.organizationId !== organizationId) {
			throw new ConvexError('Facture introuvable');
		}
		if (facture.debiteurId !== creance.debiteurId) {
			throw new ConvexError(
				`La facture ${facture.reference} n’est pas émise au même client que cette créance. ` +
					'Ce qui manque est un débiteur unique : une créance ne porte que les factures ' +
					'd’un seul. Ce refus se lève par une créance constituée pour ce client-là. ' +
					'L’attente ne coûte rien ici : rien n’a changé, et le décompte reste calculable ' +
					'en l’état.'
			);
		}
		if (facture.creanceId !== undefined && facture.creanceId !== creanceId) {
			throw new ConvexError(
				`La facture ${facture.reference} est déjà réclamée par une autre créance, et rien ` +
					'n’en est perdu. Ce qui manque est la possibilité de la porter une seconde fois : ' +
					'la réclamer deux fois exposerait les deux procédures. Ce refus se lève par un ' +
					'décompte produit sur la créance qui la porte déjà ; aucun geste du produit ne ' +
					'détache aujourd’hui une facture de sa créance, et c’est dit ici plutôt que ' +
					'laissé à chercher. L’attente ne coûte rien sur cette facture, puisqu’elle est ' +
					'déjà réclamée.'
			);
		}
		if (facture.creanceId === undefined) aRattacher.push(facture);
	}

	for (const facture of aRattacher) {
		await ctx.db.patch(facture._id, { creanceId });
		await ctx.db.insert('journal', {
			organizationId,
			cible: creanceId as string,
			cle: 'FACTURE_RATTACHEE',
			avant: 'hors de cette créance',
			apres:
				`La facture ${facture.reference} (${versEuros(depuisCentimes(facture.montantTTC))} €) ` +
				par.phrase,
			source: par.source,
			auteur: par.auteur,
			...(par.auteur === 'GERANT' ? { auteurUserId: par.userId } : {}),
			consigneLe: Date.now()
		});
	}

	if (aRattacher.length > 0) {
		const facturesDeLaCreance = await ctx.db
			.query('facturesVente')
			.withIndex('by_creance', (q) => q.eq('creanceId', creanceId))
			.collect();

		const restes = await Promise.all(facturesDeLaCreance.map((facture) => resteDu(ctx, facture)));
		const montantExigible = restes.length > 0 ? additionner(...restes) : ZERO;

		// L'exigibilité de la créance est la PLUS TARDIVE de ses factures : tant
		// qu'une seule n'est pas due, l'ensemble ne l'est pas. Même règle qu'à la
		// constitution, et pour la même raison.
		const exigibilites = facturesDeLaCreance
			.map((facture) => facture.dateExigibilite)
			.filter((date): date is string => date !== undefined);
		const dateExigibilite =
			exigibilites.length === facturesDeLaCreance.length && exigibilites.length > 0
				? exigibilites.reduce((tardive, date) => (date > tardive ? date : tardive))
				: undefined;

		const conditions = deduireConditions({
			montantExigible,
			dateExigibilite,
			aujourdHui,
			// Ces deux-là ne servent qu'à `entreCommercants`, qu'on ne réécrit pas.
			creancierCommercant: 'unknown',
			debiteurCommercant: 'unknown'
		});

		await ctx.db.patch(creanceId, {
			liquide: conditions.liquide,
			exigible: conditions.exigible
		});

		await rejouerQualification(ctx, organizationId, [creanceId], aujourdHui);
	}

	return aRattacher.length;
}
