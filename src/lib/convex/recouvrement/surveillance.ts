import { v } from 'convex/values';
import { internalQuery } from '../_generated/server';
import type { QueryCtx } from '../_generated/server';
import { authedQuery } from '../functions';
import type { Id } from '../_generated/dataModel';
import { additionner, depuisCentimes, enCentimes, ZERO } from '../../socle/montants';
import {
	detecterEvenements,
	montantIdentifie,
	type DebiteurSurveille,
	type DossierSurveille,
	type EtatSurveille,
	type FactureSurveillee
} from '../../verticales/recouvrement/surveillance';
import {
	dateDePrescription,
	regimePrescription,
	type SecteurCreance
} from '../../verticales/recouvrement/pays/france/prescription';
import { getUserOrg } from '../lib/auth';

/**
 * Le flux d'événements — ce qui donne une raison d'ouvrir le produit.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CE QUI SE PASSE ICI ET NULLE PART AILLEURS
 * ─────────────────────────────────────────────────────────────────────────
 *
 * La détection est pure et testée à part. L'assemblage, lui, fait une chose
 * qu'aucun autre endroit ne fait : **il calcule la date de prescription de
 * chaque facture depuis le secteur de son débiteur**.
 *
 * C'est le raccordement qui rend la prescription sectorielle réelle. Le module
 * France sait qu'un transport se prescrit par un an et un régime général par
 * cinq ; sans cet assemblage, il resterait une bibliothèque que rien n'appelle,
 * et la surveillance continuerait de déclarer la prescription en angle mort.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LES HYPOTHÈSES REMONTENT AVEC LES ÉVÉNEMENTS
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Un débiteur sans secteur déterminé reçoit le délai LE PLUS COURT — un an —
 * et ça se voit : `hypotheses` le dit, nommément. Sans quoi le gérant lirait
 * « prescrite » sur une créance qui ne l'est peut-être pas, ou l'inverse, sans
 * savoir que le produit a supposé quelque chose à sa place.
 */

const vUrgence = v.union(v.literal('CRITIQUE'), v.literal('HAUTE'), v.literal('NORMALE'));

const vEvenement = v.object({
	type: v.union(
		v.literal('FACTURE_ECHUE'),
		v.literal('CREANCE_MURE'),
		v.literal('ECHEANCE_PROCEDURE'),
		v.literal('DEBITEUR_DEGRADE'),
		v.literal('PRESCRIPTION_PROCHE')
	),
	reference: v.string(),
	montant: v.union(v.int64(), v.null()),
	urgence: vUrgence,
	explication: v.string(),
	action: v.string()
});

const vFlux = v.object({
	evenements: v.array(vEvenement),
	montantIdentifie: v.int64(),
	/** Ce que le produit a SUPPOSÉ, faute de donnée. Jamais tu. */
	hypotheses: v.array(v.string()),
	/** Ce que le produit ne voit pas du tout. */
	anglesMorts: v.array(v.string())
});

/**
 * Rassemble ce que la surveillance doit examiner.
 *
 * Les factures soldées sont écartées ici plutôt que dans le détecteur : elles
 * n'ont aucune raison de traverser le calcul, et sur un portefeuille de
 * plusieurs années elles sont la majorité.
 */
async function assembler(
	ctx: QueryCtx,
	organizationId: Id<'organizations'>
): Promise<{ etat: EtatSurveille; hypotheses: string[] }> {
	const facturesBrutes = await ctx.db
		.query('facturesVente')
		.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
		.collect();

	const debiteurs = new Map(
		(
			await ctx.db
				.query('debiteurs')
				.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
				.collect()
		).map((debiteur) => [debiteur._id, debiteur])
	);

	const hypotheses = new Set<string>();
	const factures: FactureSurveillee[] = [];

	for (const facture of facturesBrutes) {
		if (facture.statutPaiement === 'SOLDEE') continue;

		const debiteur = debiteurs.get(facture.debiteurId);
		const secteur: SecteurCreance = debiteur?.secteur ?? 'INDETERMINE';
		const regime = regimePrescription(secteur);

		if (regime.hypothese && debiteur !== undefined) {
			hypotheses.add(
				`Le secteur de ${debiteur.denomination} n'est pas déterminé : la prescription est ` +
					`calculée sur le délai le plus court (${regime.dureeAnnees} an). Préciser le ` +
					'secteur lèvera cette hypothèse.'
			);
		}

		// Le point de départ de la prescription n'est pas l'exigibilité au sens
		// strict, mais elle en est la meilleure approximation disponible : c'est
		// le jour où le créancier a pu agir. Le régime le documente pour que le
		// gérant sache quelle date lui serait demandée s'il veut l'affiner.
		const depart = facture.dateExigibilite ?? facture.dateEcheance;

		factures.push({
			reference: facture.reference,
			montantExigible: depuisCentimes(facture.montantTTC),
			dateEcheance: facture.dateEcheance ?? facture.dateEmission,
			statutPaiement: facture.statutPaiement,
			datePrescription: depart === undefined ? undefined : dateDePrescription(depart, secteur)
		});
	}

	const creances = (
		await ctx.db
			.query('creances')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect()
	).map((creance) => ({
		reference: creance._id as string,
		total: ZERO,
		score: creance.score ?? 0,
		statut: creance.statut
	}));

	const dossiers: DossierSurveille[] = (
		await ctx.db
			.query('dossiers')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect()
	).map((dossier) => ({
		reference: dossier._id as string,
		montantEnJeu: ZERO,
		echeances: dossier.echeances.map((echeance) => ({
			cle: echeance.cle,
			libelle: echeance.libelle,
			dateLimite: echeance.dateLimite,
			gravite: echeance.gravite,
			traitee: echeance.traiteeLe !== undefined
		}))
	}));

	// La dégradation d'un débiteur se constate entre deux relevés. Tant qu'on
	// n'historise pas la santé, on ne peut pas la détecter — et il vaut mieux
	// ne rien annoncer que d'inventer une dégradation.
	const debiteursSurveilles: DebiteurSurveille[] = [];

	return {
		etat: { factures, creances, dossiers, debiteurs: debiteursSurveilles },
		hypotheses: [...hypotheses]
	};
}

/** Le flux, sans authentification — pour les tests et les tâches planifiées. */
export const fluxInterne = internalQuery({
	args: { organizationId: v.id('organizations'), aujourdHui: v.string() },
	returns: vFlux,
	handler: async (ctx, { organizationId, aujourdHui }) => {
		const { etat, hypotheses } = await assembler(ctx, organizationId);
		const resultat = detecterEvenements(etat, aujourdHui, { avecAnglesMorts: true });

		return {
			evenements: resultat.map((evenement) => ({
				type: evenement.type,
				reference: evenement.reference,
				montant: evenement.montant === null ? null : enCentimes(evenement.montant),
				urgence: evenement.urgence,
				explication: evenement.explication,
				action: evenement.action
			})),
			montantIdentifie: enCentimes(montantIdentifie(resultat)),
			hypotheses,
			anglesMorts: [...resultat.anglesMorts]
		};
	}
});

/** Le flux de l'établissement courant. */
export const flux = authedQuery({
	args: { aujourdHui: v.optional(v.string()) },
	returns: vFlux,
	handler: async (ctx, { aujourdHui }) => {
		const { organizationId } = await getUserOrg(ctx);

		// La date est un argument pour rester rejouable ; à défaut, celle du
		// serveur, en UTC, qui est aussi celle des dates ISO stockées.
		const jour = aujourdHui ?? new Date().toISOString().slice(0, 10);

		const { etat, hypotheses } = await assembler(ctx, organizationId);
		const resultat = detecterEvenements(etat, jour, { avecAnglesMorts: true });

		return {
			evenements: resultat.map((evenement) => ({
				type: evenement.type,
				reference: evenement.reference,
				montant: evenement.montant === null ? null : enCentimes(evenement.montant),
				urgence: evenement.urgence,
				explication: evenement.explication,
				action: evenement.action
			})),
			montantIdentifie: enCentimes(montantIdentifie(resultat)),
			hypotheses,
			anglesMorts: [...resultat.anglesMorts]
		};
	}
});

/** Le cumul, pour le compteur d'accueil. */
export function cumulIdentifie(montants: readonly bigint[]): bigint {
	return enCentimes(additionner(...montants.map(depuisCentimes)));
}
