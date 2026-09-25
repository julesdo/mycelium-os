import { v, ConvexError } from 'convex/values';
import { authedMutation, authedQuery } from '../functions';
import { getUserOrg } from '../lib/auth';
import type { Doc, Id } from '../_generated/dataModel';
import type { MutationCtx } from '../_generated/server';
import { enCentimes } from '../../socle/montants';
import { ecartJours, estDateReelle } from '../../verticales/recouvrement/calendrier';
import {
	ANGLE_MORT_PRESCRIPTION,
	prescriptionDe,
	regimePrescription,
	type SecteurCreance
} from '../../verticales/recouvrement/pays/france/prescription';
import { projeterDecompte } from './decompte';
import { vConventionJours, vImputation, vTaux } from './tables';

/**
 * LE SUIVI D'UN DOSSIER REMIS AU CONSEIL (décision D12).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LA LIGNE ROUGE D'ABORD, PARCE QU'ELLE CADRE TOUT LE RESTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le produit NE PILOTE PAS le conseil. Il ne lui écrit pas, ne lui fixe aucun
 * délai, ne le relance pas, ne note pas son efficacité, et ne recommande aucune
 * démarche à personne. Il suit une REMISE faite par le gérant, et attend un
 * RETOUR déclaré par le gérant. Tout le reste serait du recouvrement pour compte
 * de tiers ou du conseil juridique.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POURQUOI CE SUIVI NE PEUT PAS ÊTRE UN PDF TÉLÉCHARGÉ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Un dossier qui sort du produit emporte avec lui la seule chose qui continue de
 * courir. La prescription ne s'arrête pas parce qu'un dossier est parti chez un
 * avocat, et un gérant qui a « transmis » croit avoir agi. C'est le mode de
 * panne le plus cher du produit : celui où l'utilisateur croit sa prescription
 * surveillée alors qu'elle ne l'est plus.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * QUATRE ÉTATS, ET AUCUNE TRANSITION AUTOMATIQUE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `PREPARE` → `REMIS` → `REVENU` → `CLOS`. Chaque pas vient d'une déclaration
 * humaine, et de rien d'autre. `CLOS` existe parce que, sans lui, un dossier
 * sans retour resterait ouvert pour toujours, et un suivi dont on ne peut pas
 * sortir est un mur (D0).
 *
 * ⚠️ CHAQUE TRANSITION PORTE DEUX DATES, PAS UNE. La date du FAIT fait courir
 * les délais ; la date de SAISIE ne sert jamais à un calcul. « Un gérant qui
 * enregistre le 20 mars une ordonnance signifiée le 3 doit voir ses trois mois
 * partir du 3 ; les confondre en offrirait dix-sept de plus. » Même discipline
 * que `evenementsProcedure`, et pour la même raison.
 *
 * ⚠️ `decompteId` NE CHANGE JAMAIS. Un dossier remis fige ce qu'il a emporté.
 * La question n'est pas « que dirait le dossier aujourd'hui » mais « qu'a lu le
 * conseil le jour où on le lui a remis ». Produire un dossier à jour crée un
 * NOUVEAU dossier daté, avec sa propre remise.
 */

const vEtatRemise = v.union(
	v.literal('PREPARE'),
	v.literal('REMIS'),
	v.literal('REVENU'),
	v.literal('CLOS')
);

const vSegment = v.object({
	debut: v.string(),
	fin: v.string(),
	jours: v.number(),
	principal: v.int64(),
	taux: vTaux,
	baseAnnuelle: v.number(),
	interets: v.int64()
});

const vPostes = v.object({
	principalRestantDu: v.int64(),
	interets: v.int64(),
	indemniteForfaitaire: v.int64(),
	total: v.int64()
});

/**
 * L'écart entre ce que le dossier porte et ce que le calcul du jour porte.
 *
 * ⚠️ IL SE DÉCOMPOSE EN TROIS POSTES, JAMAIS EN UN SEUL NOMBRE. « 132,47 € de
 * plus » ne dit pas si ce sont des intérêts courus, un règlement encaissé depuis
 * ou une facture rattachée entre-temps, et ces trois-là n'appellent pas la même
 * lecture. Un total qu'on ne peut pas décomposer est un chiffre qu'on demande de
 * croire.
 *
 * ⚠️ IL EST SIGNÉ. Un règlement reçu depuis l'arrêté fait BAISSER le montant du
 * jour, et une valeur absolue ferait lire une hausse là où il y a une baisse.
 */
const vEcart = v.object({
	principalRestantDu: v.int64(),
	interets: v.int64(),
	indemniteForfaitaire: v.int64(),
	total: v.int64(),
	parFacture: v.array(
		v.object({
			reference: v.string(),
			/** Absente du décompte figé : la facture a rejoint la créance depuis. */
			nouvelle: v.boolean(),
			ecartTotal: v.int64(),
			ecartInterets: v.int64(),
			/** Les périodes du calcul du jour. C'est par elles que l'écart se refait à la main. */
			segments: v.array(vSegment),
			/** Ce que les règlements ont éteint, sans quoi les périodes ne font pas les intérêts. */
			imputations: v.array(vImputation)
		})
	)
});

const vSuiviRemise = v.object({
	decompteId: v.id('decomptes'),
	creanceId: v.id('creances'),
	debiteurId: v.union(v.id('debiteurs'), v.null()),
	debiteur: v.string(),
	remise: v.union(
		v.null(),
		v.object({
			_id: v.id('remisesAuConseil'),
			etat: vEtatRemise,
			intervenantId: v.union(v.id('intervenants'), v.null()),
			/** Le nom tel que le carnet du gérant le porte. Jamais proposé par le produit. */
			intervenant: v.union(v.string(), v.null()),
			remisLe: v.union(v.string(), v.null()),
			revenuLe: v.union(v.string(), v.null()),
			closLe: v.union(v.string(), v.null()),
			motifCloture: v.union(v.string(), v.null()),
			attendu: v.union(v.string(), v.null()),
			/** La date de SAISIE de la dernière transition. Jamais dans un calcul. */
			consigneLe: v.number()
		})
	),
	/** Ce que le dossier porte : le décompte figé, inchangeable. */
	fige: v.object({ ...vPostes.fields, arreteAu: v.string(), convention: vConventionJours }),
	/** Ce que le même calcul rend aujourd'hui. `null` quand il ne se calcule plus. */
	duJour: v.union(v.null(), v.object({ ...vPostes.fields, arreteAu: v.string() })),
	refusDuJour: v.union(
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
	ecart: v.union(v.null(), vEcart),
	/** Ce qui court pendant que le dossier est parti. */
	prescription: v.object({
		date: v.union(v.string(), v.null()),
		joursRestants: v.union(v.number(), v.null()),
		dureeAnnees: v.number(),
		hypothese: v.boolean(),
		source: v.string()
	}),
	/** L'angle mort, déclaré et jamais deviné. */
	angleMort: v.string(),
	/** Un constat arithmétique, refaisable à la main. `null` tant que rien n'est parti. */
	joursDepuisLaRemise: v.union(v.number(), v.null()),
	/** Combien de faits de procédure ont été consignés depuis la remise. */
	faitsDeProcedureDepuisLaRemise: v.number()
});

function moins(a: bigint, b: bigint): bigint {
	return a - b;
}

/**
 * Une date du FAIT, vérifiée à l'existence et pas seulement à la forme.
 *
 * ⚠️ `Date.parse` NE LÈVE PAS SUR UN 30 FÉVRIER : il roule sur le 2 mars. Un
 * garde-fou bâti sur `Number.isNaN` ne mord donc jamais, et une date impossible
 * entre en base pour faire lever un calcul, plus tard, ailleurs.
 */
function exigerDateDuFait(date: string, quoi: string): void {
	if (estDateReelle(date)) return;
	throw new ConvexError(
		`La date ${quoi} doit exister au calendrier, au format AAAA-MM-JJ. Reçue : ${date}. ` +
			'C’est la date du FAIT, celle qui fait courir les délais : une date impossible les ' +
			'ferait partir d’un jour qui n’a pas eu lieu.'
	);
}

async function remiseDuDecompte(
	ctx: MutationCtx,
	organizationId: Id<'organizations'>,
	remiseId: Id<'remisesAuConseil'>
): Promise<Doc<'remisesAuConseil'>> {
	const remise = await ctx.db.get(remiseId);
	if (remise === null || remise.organizationId !== organizationId) {
		throw new ConvexError('Suivi de dossier introuvable');
	}
	return remise;
}

export const suivreRemise = authedQuery({
	args: { decompteId: v.id('decomptes') },
	returns: v.union(v.null(), vSuiviRemise),
	handler: async (ctx, { decompteId }) => {
		const { organizationId } = await getUserOrg(ctx);

		const decompte = await ctx.db.get(decompteId);
		if (decompte === null || decompte.organizationId !== organizationId) return null;

		const creance = await ctx.db.get(decompte.creanceId);
		const sienne = creance !== null && creance.organizationId === organizationId ? creance : null;
		const debiteur = sienne === null ? null : await ctx.db.get(sienne.debiteurId);
		const sien = debiteur !== null && debiteur.organizationId === organizationId ? debiteur : null;
		const secteur: SecteurCreance = sien?.secteur ?? 'INDETERMINE';
		const regime = regimePrescription(secteur);

		const aujourdHui = new Date().toISOString().slice(0, 10);

		// LE MÊME CALCUL, À DEUX DATES. Le dossier porte le décompte figé ; la file
		// continue de compter au jour le jour. Ils divergent, et le taire serait
		// offrir un chiffre qu'on demande de croire.
		const projection =
			sienne === null
				? { decompte: null, refus: null }
				: await projeterDecompte(ctx, sienne, aujourdHui, decompte.convention);

		const parReferenceFigee = new Map(decompte.lignes.map((ligne) => [ligne.reference, ligne]));

		const ecart =
			projection.decompte === null
				? null
				: {
						principalRestantDu: moins(
							enCentimes(projection.decompte.principalRestantDu),
							decompte.principalRestantDu
						),
						interets: moins(enCentimes(projection.decompte.interets), decompte.interets),
						indemniteForfaitaire: moins(
							enCentimes(projection.decompte.indemniteForfaitaire),
							decompte.indemniteForfaitaire
						),
						total: moins(enCentimes(projection.decompte.total), decompte.total),
						parFacture: projection.decompte.lignes.map((ligne) => {
							const figee = parReferenceFigee.get(ligne.reference);
							return {
								reference: ligne.reference,
								nouvelle: figee === undefined,
								ecartTotal: moins(enCentimes(ligne.total), figee?.total ?? 0n),
								ecartInterets: moins(enCentimes(ligne.interets), figee?.interets ?? 0n),
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
							};
						})
					};

		const remise =
			sienne === null
				? null
				: (
						await ctx.db
							.query('remisesAuConseil')
							.withIndex('by_creance', (q) => q.eq('creanceId', sienne._id))
							.collect()
					)
						.filter(
							(suivi) =>
								suivi.organizationId === organizationId && suivi.decompteId === decompteId
						)
						.sort((a, b) => b.consigneLe - a.consigneLe)[0];

		const intervenant =
			remise?.intervenantId === undefined ? null : await ctx.db.get(remise.intervenantId);
		const sonIntervenant =
			intervenant !== null && intervenant.organizationId === organizationId ? intervenant : null;

		// LA PRESCRIPTION LA PLUS PROCHE DES FACTURES DE LA CRÉANCE. C'est la
		// première qui s'éteint qui commande, et elle s'éteint en silence.
		let plusProche: string | null = null;
		if (sienne !== null) {
			const factures = await ctx.db
				.query('facturesVente')
				.withIndex('by_creance', (q) => q.eq('creanceId', sienne._id))
				.collect();
			for (const facture of factures) {
				const calculee = prescriptionDe([facture.dateExigibilite, facture.dateEcheance], secteur);
				if (calculee.datePrescription === undefined) continue;
				if (plusProche === null || calculee.datePrescription < plusProche) {
					plusProche = calculee.datePrescription;
				}
			}
		}

		// LES FAITS DE PROCÉDURE CONSIGNÉS DEPUIS LA REMISE. Un COMPTE, et rien de
		// plus : « aucun fait consigné depuis 34 jours » est un constat refaisable
		// à la main, là où « votre avocat n'a pas répondu » serait une insinuation
		// sur un tiers que ce produit ne suit pas.
		const remisLe = remise?.remisLe;
		let faitsDepuis = 0;
		if (sienne !== null && remisLe !== undefined) {
			const faits = await ctx.db
				.query('evenementsProcedure')
				.withIndex('by_creance', (q) => q.eq('creanceId', sienne._id))
				.collect();
			faitsDepuis = faits.filter(
				(fait) => fait.organizationId === organizationId && fait.survenuLe >= remisLe
			).length;
		}

		return {
			decompteId,
			creanceId: decompte.creanceId,
			debiteurId: sien === null ? null : sien._id,
			debiteur: decompte.debiteur?.denomination ?? sien?.denomination ?? 'Débiteur inconnu',
			remise:
				remise === undefined || remise === null
					? null
					: {
							_id: remise._id,
							etat: remise.etat,
							intervenantId: remise.intervenantId ?? null,
							intervenant: sonIntervenant?.nom ?? null,
							remisLe: remise.remisLe ?? null,
							revenuLe: remise.revenuLe ?? null,
							closLe: remise.closLe ?? null,
							motifCloture: remise.motifCloture ?? null,
							attendu: remise.attendu ?? null,
							consigneLe: remise.consigneLe
						},
			fige: {
				arreteAu: decompte.arreteAu,
				convention: decompte.convention,
				principalRestantDu: decompte.principalRestantDu,
				interets: decompte.interets,
				indemniteForfaitaire: decompte.indemniteForfaitaire,
				total: decompte.total
			},
			duJour:
				projection.decompte === null
					? null
					: {
							arreteAu: aujourdHui,
							principalRestantDu: enCentimes(projection.decompte.principalRestantDu),
							interets: enCentimes(projection.decompte.interets),
							indemniteForfaitaire: enCentimes(projection.decompte.indemniteForfaitaire),
							total: enCentimes(projection.decompte.total)
						},
			refusDuJour: projection.refus,
			ecart,
			prescription: {
				date: plusProche,
				joursRestants: plusProche === null ? null : ecartJours(aujourdHui, plusProche),
				dureeAnnees: regime.dureeAnnees,
				hypothese: regime.hypothese,
				source: regime.source
			},
			angleMort: ANGLE_MORT_PRESCRIPTION,
			joursDepuisLaRemise: remisLe === undefined ? null : ecartJours(remisLe, aujourdHui),
			faitsDeProcedureDepuisLaRemise: faitsDepuis
		};
	}
});

/**
 * LE DOSSIER EST PRÊT : IL EST FIGÉ ET DATÉ, ET IL N'EST PAS PARTI.
 *
 * ⚠️ UN SEUL SUIVI OUVERT PAR DÉCOMPTE. Deux suivis sur la même pièce feraient
 * deux vérités sur une question qui n'en a qu'une : ce dossier est-il parti, et
 * quand.
 */
export const preparerDossier = authedMutation({
	args: { decompteId: v.id('decomptes') },
	returns: v.id('remisesAuConseil'),
	handler: async (ctx, { decompteId }): Promise<Id<'remisesAuConseil'>> => {
		const { organizationId } = await getUserOrg(ctx);

		const decompte = await ctx.db.get(decompteId);
		if (decompte === null || decompte.organizationId !== organizationId) {
			throw new ConvexError('Décompte introuvable');
		}

		const deja = (
			await ctx.db
				.query('remisesAuConseil')
				.withIndex('by_creance', (q) => q.eq('creanceId', decompte.creanceId))
				.collect()
		).find(
			(suivi) =>
				suivi.organizationId === organizationId &&
				suivi.decompteId === decompteId &&
				suivi.etat !== 'CLOS'
		);

		if (deja !== undefined) return deja._id;

		return await ctx.db.insert('remisesAuConseil', {
			organizationId,
			creanceId: decompte.creanceId,
			decompteId,
			etat: 'PREPARE',
			consigneLe: Date.now()
		});
	}
});

/**
 * LE GÉRANT DÉCLARE AVOIR REMIS LE DOSSIER, À UNE DATE.
 *
 * ⚠️ L'INTERVENANT EST FACULTATIF, ET C'EST LA LIGNE ROUGE. Un dossier se remet
 * sans nommer personne, et le produit ne propose JAMAIS de nom : la fiche vient
 * du carnet du gérant, pas d'un annuaire que le produit recommanderait.
 */
export const declarerRemise = authedMutation({
	args: {
		remiseId: v.id('remisesAuConseil'),
		/** La date du FAIT. */
		remisLe: v.string(),
		intervenantId: v.optional(v.id('intervenants')),
		/** Ce que le gérant déclare attendre, en toutes lettres. Facultatif. */
		attendu: v.optional(v.string())
	},
	returns: v.null(),
	handler: async (ctx, { remiseId, remisLe, intervenantId, attendu }): Promise<null> => {
		const { organizationId } = await getUserOrg(ctx);
		const remise = await remiseDuDecompte(ctx, organizationId, remiseId);
		exigerDateDuFait(remisLe, 'de remise');

		if (remise.etat !== 'PREPARE') {
			throw new ConvexError(
				`Ce dossier est déjà suivi à l’état « ${remise.etat} », et son suivi se lit sur cette ` +
					'page. Ce qui manque est un dossier encore à remettre : une remise ne se déclare ' +
					'qu’une fois, sans quoi la date du fait cesserait de dire quand il est parti. Ce ' +
					'refus se lève par un nouveau dossier produit depuis un décompte arrêté, qui porte ' +
					'sa propre remise. L’attente ne coûte rien : rien n’est modifié, et ce qui court ' +
					'reste la prescription, affichée ci-dessus.'
			);
		}

		if (intervenantId !== undefined) {
			const intervenant = await ctx.db.get(intervenantId);
			if (intervenant === null || intervenant.organizationId !== organizationId) {
				throw new ConvexError('Intervenant introuvable dans votre carnet');
			}
		}

		await ctx.db.patch(remiseId, {
			etat: 'REMIS',
			remisLe,
			intervenantId,
			attendu,
			// La date de SAISIE, à côté de la date du FAIT. Les confondre offrirait
			// des jours qui n'ont pas eu lieu sur l'échéance la plus dangereuse.
			consigneLe: Date.now()
		});
		return null;
	}
});

/** LE CONSEIL A RENDU QUELQUE CHOSE, ET LE GÉRANT LE CONSIGNE. */
export const declarerRetour = authedMutation({
	args: { remiseId: v.id('remisesAuConseil'), revenuLe: v.string() },
	returns: v.null(),
	handler: async (ctx, { remiseId, revenuLe }): Promise<null> => {
		const { organizationId } = await getUserOrg(ctx);
		const remise = await remiseDuDecompte(ctx, organizationId, remiseId);
		exigerDateDuFait(revenuLe, 'de retour');

		if (remise.etat !== 'REMIS') {
			throw new ConvexError(
				`Ce suivi est à l’état « ${remise.etat} » : un retour se consigne sur un dossier ` +
					'parti. Ce qui manque est la déclaration de remise, avec sa date. Ce refus se lève ' +
					'quand cette date est portée ici. L’attente ne coûte rien au suivi ; ce qui court ' +
					'est la prescription de la créance.'
			);
		}

		await ctx.db.patch(remiseId, { etat: 'REVENU', revenuLe, consigneLe: Date.now() });
		return null;
	}
});

/**
 * LE GÉRANT MET FIN AU SUIVI, AVEC SON MOTIF EN TOUTES LETTRES.
 *
 * ⚠️ SANS CET ÉTAT, UN DOSSIER SANS RETOUR RESTERAIT OUVERT POUR TOUJOURS, et
 * un suivi dont on ne peut pas sortir est un mur (D0). Il se clôt depuis
 * n'importe lequel des trois autres états : un dossier préparé et jamais parti
 * se referme aussi.
 */
export const cloreRemise = authedMutation({
	args: {
		remiseId: v.id('remisesAuConseil'),
		closLe: v.string(),
		/** En toutes lettres. Ce qui se relit dans un an, c'est la phrase, pas un code. */
		motifCloture: v.string()
	},
	returns: v.null(),
	handler: async (ctx, { remiseId, closLe, motifCloture }): Promise<null> => {
		const { organizationId } = await getUserOrg(ctx);
		const remise = await remiseDuDecompte(ctx, organizationId, remiseId);
		exigerDateDuFait(closLe, 'de clôture');

		if (remise.etat === 'CLOS') {
			throw new ConvexError(
				'Ce suivi est déjà clos, et sa clôture se lit sur cette page avec sa date et son ' +
					'motif. Ce qui manque est un suivi ouvert : une clôture ne se réécrit pas, sans ' +
					'quoi la date du fait cesserait de dire quand le gérant a mis fin au suivi. Ce ' +
					'refus se lève par un nouveau dossier produit depuis un décompte arrêté. ' +
					'L’attente ne coûte rien : rien n’est modifié.'
			);
		}

		if (motifCloture.trim().length === 0) {
			throw new ConvexError(
				'Le suivi se clôt, et la page continue d’afficher le décompte, l’écart du jour et la ' +
					'prescription. Ce qui manque est le motif, en toutes lettres : une clôture sans ' +
					'motif se relit dans un an comme un dossier abandonné sans qu’on sache pourquoi. ' +
					'Ce refus se lève par une phrase, même courte. L’attente ne coûte rien au suivi ; ' +
					'ce qui court est la prescription de la créance.'
			);
		}

		await ctx.db.patch(remiseId, {
			etat: 'CLOS',
			closLe,
			motifCloture: motifCloture.trim(),
			consigneLe: Date.now()
		});
		return null;
	}
});
