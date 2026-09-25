import { v, ConvexError } from 'convex/values';
import { authedMutation, authedQuery } from '../functions';
import { internal } from '../_generated/api';
import { getUserOrg } from '../lib/auth';
import type { Doc, Id } from '../_generated/dataModel';
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
import { prevolAuJournal, type ReponsesPrevol } from '../../verticales/recouvrement/prevol';
import { projeterDecompte, vNatureAbandon } from './decompte';
import { resteDu, rejouerQualification } from './creances';
import { vConventionJours, vImputation, vTaux } from './tables';

/**
 * L'ARRÊT D'UN DÉCOMPTE : LE SEUL GESTE IRRÉVERSIBLE DU PRODUIT.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CE QUE CE MODULE PROTÈGE, ET POURQUOI IL A SON ÉCRAN PLEIN CADRE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Un décompte arrêté est figé, définitivement. Rejouer produit un NOUVEAU
 * décompte daté. La question n'est jamais « combien réclame-t-on aujourd'hui »
 * mais « qu'a-t-on réclamé le jour où on l'a réclamé ».
 *
 * Trois étages avant le geste, et ils ne sont pas décoratifs :
 *
 *   1. LE CONTRÔLE DE COMPLÉTUDE, CHIFFRÉ. `controle.ts` compare le décompte
 *      à toutes les factures connues du débiteur et dit, facture par facture et
 *      en euros, ce qui serait abandonné. C'est le seul endroit du produit où un
 *      refus vaut mieux qu'un résultat : le titre ne porte que sur les sommes
 *      qu'il chiffre, et ce qui n'y figure pas est perdu.
 *   2. LE PRÉ-VOL. Trois faits que le logiciel ne peut pas voir (`prevol.ts`).
 *   3. LE BOUTON, qui porte son montant, sa date et son irréversibilité.
 *
 * ⚠️ L'ÉTAGE `PARAMETRE_MANQUANT` DE `controle.ts` NE S'EXERCE PAS ICI, ET ON LE
 * DIT. `parametresRequis` n'est passé par aucun appelant, donc la boucle tourne
 * sur un tableau vide, donc ce troisième étage ne peut pas se déclencher. Le
 * taire laisserait croire à un verrou qui ne mord pas. La lecture rend donc
 * l'état réel du référentiel, et l'écran l'affiche comme un constat : rien ne
 * bloque à ce titre, et voici pourquoi.
 *
 * ⚠️ AUCUN LOT. Ce geste ne s'applique jamais à plusieurs créances à la fois
 * (D6). Une sélection multiple sur un geste irréversible est une invitation à
 * figer quinze décomptes dont on n'a lu aucun contrôle.
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
			lignes: v.array(vLigneProjetee)
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
 * LA PREMIÈRE DES DEUX SORTIES DU CONTRÔLE : INCLURE, ET REFAIRE.
 *
 * ⚠️ ELLE PÈSE AUTANT QUE L'AUTRE, ET C'EST POUR ÇA QU'ELLE EXISTE VRAIMENT.
 * Afficher « ces deux factures ne sont pas au décompte » sans offrir de les y
 * mettre laisserait le gérant devant un constat sans prise, donc devant le seul
 * bouton restant : arrêter quand même. Un écran qui chiffre une perte et n'offre
 * qu'une façon de la subir la rend inévitable.
 *
 * ⚠️ LES CONDITIONS SE REDÉDUISENT, MAIS PAS TOUTES. `deduireConditions` remet
 * `certaine` à `unknown` par construction : la rejouer en entier effacerait ce
 * que le gérant a tranché sur le litige. Seules `liquide` et `exigible` bougent,
 * parce que seules elles dépendent du montant et de la date, qui viennent de
 * changer.
 */
export const inclureFactures = authedMutation({
	args: { creanceId: v.id('creances'), factureIds: v.array(v.id('facturesVente')) },
	returns: v.number(),
	handler: async (ctx, { creanceId, factureIds }): Promise<number> => {
		const { organizationId, user } = await getUserOrg(ctx);

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
					'rejoint cette créance avant l’arrêt du décompte.',
				source: 'Contrôle de complétude, écran d’arrêt',
				auteur: 'GERANT',
				auteurUserId: user._id,
				consigneLe: Date.now()
			});
		}

		if (aRattacher.length > 0) {
			const facturesDeLaCreance = await ctx.db
				.query('facturesVente')
				.withIndex('by_creance', (q) => q.eq('creanceId', creanceId))
				.collect();

			const restes = await Promise.all(
				facturesDeLaCreance.map((facture) => resteDu(ctx, facture))
			);
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
});

const vReponsePrevol = v.union(v.literal('ECARTE'), v.literal('DECLARE'));

/**
 * L'ARRÊT LUI-MÊME.
 *
 * ⚠️ LES TROIS RÉPONSES DU PRÉ-VOL SONT REQUISES PAR LE TYPE, pas seulement
 * vérifiées dans le corps. Une barrière s'exécute au point d'usage : un appelant
 * qui oublierait une question ne compile pas, et un appelant qui répondrait
 * « DECLARE » se voit refuser ici, côté serveur, même si l'écran l'avait laissé
 * passer.
 *
 * ⚠️ `abandonsAssumes` EST LA SECONDE SORTIE DU CONTRÔLE, et elle laisse une
 * trace. Arrêter un décompte incomplet reste possible — c'est une décision du
 * gérant, pas du logiciel — mais elle s'inscrit au journal, chiffrée, à la date
 * où elle a été prise.
 *
 * ⚠️ LE TYPE DE RETOUR EST ANNOTÉ À LA MAIN. Ce handler appelle
 * `internal.recouvrement.decompte.figerDecompte` ; l'annotation coupe court à
 * tout cycle d'inférence, et son absence dégraderait le type d'`api` tout
 * entier. Voir `CLAUDE.md`.
 */
export const arreter = authedMutation({
	args: {
		creanceId: v.id('creances'),
		convention: vConventionJours,
		prevol: v.object({
			AVOIR_NON_RAPPROCHE: vReponsePrevol,
			REGLEMENT_NON_IMPORTE: vReponsePrevol,
			CONTESTATION_HORS_LOGICIEL: vReponsePrevol
		}),
		abandonsAssumes: v.boolean()
	},
	returns: v.id('decomptes'),
	handler: async (
		ctx,
		{ creanceId, convention, prevol, abandonsAssumes }
	): Promise<Id<'decomptes'>> => {
		const { organizationId, user } = await getUserOrg(ctx);

		const creance = await ctx.db.get(creanceId);
		if (creance === null || creance.organizationId !== organizationId) {
			throw new ConvexError('Créance introuvable');
		}

		const reponses: ReponsesPrevol = prevol;
		const declares = Object.entries(prevol).filter(([, reponse]) => reponse === 'DECLARE');
		if (declares.length > 0) {
			throw new ConvexError(
				'Ce décompte se calcule et se lit en entier, et il ne se fige pas. Ce qui manque est ' +
					'l’élément que vous venez de déclarer : il change le principal ou ce que le logiciel ' +
					'sait du dossier, et un décompte figé ne se corrige plus. Ce refus se lève quand ' +
					'l’élément déclaré est entré dans le logiciel, ou quand il cesse d’exister. ' +
					`L’attente ne coûte rien au décompte : il n’est parti nulle part. Ce qui court est ` +
					'la prescription, affichée sur cet écran.'
			);
		}

		const arreteAu = new Date().toISOString().slice(0, 10);

		// LE CONTRÔLE SE REJOUE ICI, ET PAS SEULEMENT À L'ÉCRAN. Entre la lecture
		// et le tap, un import a pu ajouter une facture ; un contrôle qui ne
		// vivrait que dans le rendu laisserait figer un décompte que l'écran
		// n'avait pas contrôlé.
		const projection = await projeterDecompte(ctx, creance, arreteAu, convention);
		if (projection.decompte === null) throw new ConvexError(projection.refus!.detail);

		const facturesDuDebiteur = (
			await ctx.db
				.query('facturesVente')
				.withIndex('by_debiteur', (q) => q.eq('debiteurId', creance.debiteurId))
				.collect()
		).filter((facture) => facture.organizationId === organizationId);

		const controle = controlerDecompte({
			decompte: projection.decompte,
			facturesConnues: facturesDuDebiteur.map((facture) => ({
				reference: facture.reference,
				montantExigible: depuisCentimes(facture.montantTTC)
			}))
		});

		if (!controle.complet && !abandonsAssumes) {
			throw new ConvexError(
				'Le décompte est calculé et chacun de ses postes se lit : rien n’est perdu à ce ' +
					'stade. Ce qui manque est votre décision sur ce que ce décompte laisse de côté, ' +
					`chiffré à ${versEuros(controle.montantAbandonne)} € : le titre ne porte que sur ` +
					'les sommes qu’il chiffre. Ce refus se lève de deux façons, de même poids : les ' +
					'factures écartées rejoignent la créance et le décompte se refait, ou l’arrêt se ' +
					'fait sans elles et la décision s’inscrit au journal. L’attente ne coûte rien au ' +
					'décompte ; ce qui court est la prescription de la créance.'
			);
		}

		const decompteId: Id<'decomptes'> = await ctx.runMutation(
			internal.recouvrement.decompte.figerDecompte,
			{ creanceId, arreteAu, convention }
		);

		await ctx.db.insert('journal', {
			organizationId,
			cible: decompteId as string,
			cle: 'DECOMPTE_ARRETE',
			apres:
				`Décompte arrêté au ${arreteAu}, total ${versEuros(projection.decompte.total)} €, ` +
				`sur ${projection.decompte.lignes.length} facture(s). Il est figé définitivement.`,
			source: `Pré-vol : ${prevolAuJournal(reponses)}`,
			auteur: 'GERANT',
			auteurUserId: user._id,
			consigneLe: Date.now()
		});

		// UNE ENTRÉE PAR ABANDON, ET PAS UNE LIGNE RÉCAPITULATIVE. Ce qui se
		// relit six mois plus tard est « quelle facture », pas « combien au
		// total » : le total se refait, la référence ne se retrouve pas.
		for (const abandon of controle.abandons) {
			await ctx.db.insert('journal', {
				organizationId,
				cible: decompteId as string,
				cle: 'ABANDON_ASSUME_A_L_ARRET',
				apres: abandon.explication,
				source: 'Contrôle de complétude, au moment de l’arrêt',
				auteur: 'GERANT',
				auteurUserId: user._id,
				consigneLe: Date.now()
			});
		}

		return decompteId;
	}
});
