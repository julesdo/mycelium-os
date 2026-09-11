import { v } from 'convex/values';
import { internalQuery } from '../_generated/server';
import type { QueryCtx } from '../_generated/server';
import { authedQuery } from '../functions';
import type { Doc, Id } from '../_generated/dataModel';
import { additionner, depuisCentimes, enCentimes, ZERO, type Montant } from '../../socle/montants';
import { habitudeDePaiement, lireRupture } from '../../verticales/recouvrement/comportement';
import type { PaiementObserve } from '../../verticales/recouvrement/comportement';
import { ecartJours, estDateReelle } from '../../verticales/recouvrement/calendrier';
import {
	detecterEvenements,
	montantIdentifie,
	type DebiteurSurveille,
	type DossierSurveille,
	type EtatSurveille,
	type FactureSurveillee,
	type RuptureSurveillee
} from '../../verticales/recouvrement/surveillance';
import {
	prescriptionDe,
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
		v.literal('PRESCRIPTION_PROCHE'),
		/**
		 * ⚠️ IL N'EST PAS AJOUTÉ AU VALIDATEUR DE `notifications.ts`, ET C'EST
		 * DÉLIBÉRÉ.
		 *
		 * Une rupture d'habitude est en urgence NORMALE : elle n'éteint rien, et
		 * rien n'est perdu si on la lit demain. Les notifications interrompent —
		 * elles sont réservées à ce qui fait perdre un droit sans qu'on ait rien
		 * fait, c'est-à-dire à la prescription et aux échéances de procédure.
		 *
		 * Envoyer une notification pour chaque rupture ferait exactement ce que ce
		 * module existe pour éviter : du bruit qu'on apprend à ignorer, jusqu'au
		 * jour où il portait le signal qui comptait.
		 */
		v.literal('HABITUDE_ROMPUE')
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
 * LES HABITUDES ROMPUES DE TOUT L'ÉTABLISSEMENT.
 *
 * ⚠️ UNE HABITUDE EST PROPRE À UN DÉBITEUR, donc le calcul se fait client par
 * client. La tentation serait d'établir une habitude moyenne sur
 * l'établissement : elle ne décrirait personne, et masquerait exactement ce
 * que le module existe pour voir — que CE client-là, lui, a changé.
 *
 * ⚠️ ET LES RÈGLEMENTS SE CHARGENT EN UNE SEULE REQUÊTE, par l'index
 * `by_org`. Les charger facture par facture ferait une requête par facture :
 * sur un établissement à deux mille factures, la surveillance quotidienne
 * deviendrait le poste de coût principal du produit.
 */
async function rupturesDHabitude(
	ctx: QueryCtx,
	organizationId: Id<'organizations'>,
	facturesBrutes: readonly Doc<'facturesVente'>[],
	debiteurs: ReadonlyMap<Id<'debiteurs'>, Doc<'debiteurs'>>,
	aujourdHui: string
): Promise<RuptureSurveillee[]> {
	const reglements = await ctx.db
		.query('reglements')
		.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
		.collect();

	// ⚠️ LE DERNIER RÈGLEMENT, ET PAS LE PREMIER. Une facture réglée en trois
	// fois n'est acquittée qu'au troisième versement : retenir le premier ferait
	// passer un paiement étalé sur quatre mois pour un paiement à l'heure, et le
	// client qui échelonne — précisément celui qu'on veut voir — deviendrait
	// invisible.
	const acquitteLe = new Map<Id<'facturesVente'>, string>();
	for (const reglement of reglements) {
		if (!estDateReelle(reglement.date)) continue;
		const connu = acquitteLe.get(reglement.factureId);
		if (connu === undefined || reglement.date > connu) {
			acquitteLe.set(reglement.factureId, reglement.date);
		}
	}

	const historiqueParDebiteur = new Map<Id<'debiteurs'>, PaiementObserve[]>();
	const impayeesParDebiteur = new Map<
		Id<'debiteurs'>,
		{ reference: string; montantTTC: bigint; exigibilite: string }[]
	>();

	for (const facture of facturesBrutes) {
		// La date d'exigibilité est FACULTATIVE au schéma — un FEC n'en porte
		// pas. Une facture sans point de départ ne dit rien sur une habitude.
		const exigibilite = facture.dateExigibilite;
		if (exigibilite === undefined || !estDateReelle(exigibilite)) continue;

		if (facture.statutPaiement === 'SOLDEE') {
			const paye = acquitteLe.get(facture._id);
			if (paye === undefined) continue;
			const liste = historiqueParDebiteur.get(facture.debiteurId) ?? [];
			liste.push({
				reference: facture.reference,
				dateExigibilite: exigibilite,
				datePaiement: paye
			});
			historiqueParDebiteur.set(facture.debiteurId, liste);
			continue;
		}

		const liste = impayeesParDebiteur.get(facture.debiteurId) ?? [];
		liste.push({
			reference: facture.reference,
			montantTTC: facture.montantTTC,
			exigibilite
		});
		impayeesParDebiteur.set(facture.debiteurId, liste);
	}

	const ruptures: RuptureSurveillee[] = [];

	for (const [debiteurId, impayees] of impayeesParDebiteur) {
		const habitude = habitudeDePaiement(historiqueParDebiteur.get(debiteurId) ?? []);
		// Sans habitude établie, on ne dit rien : le doute ne profite jamais au
		// produit, et une rupture annoncée sur trois observations serait du bruit.
		if (!habitude.connue) continue;

		const denomination = debiteurs.get(debiteurId)?.denomination;
		if (denomination === undefined) continue;

		for (const facture of impayees) {
			const retard = ecartJours(facture.exigibilite, aujourdHui);
			if (retard <= 0) continue;

			const lecture = lireRupture(habitude, retard);
			if (lecture.etat !== 'RUPTURE') continue;

			ruptures.push({
				reference: facture.reference,
				debiteur: denomination,
				montantExigible: depuisCentimes(facture.montantTTC),
				habituelJours: lecture.habituelJours,
				ecartJours: lecture.ecartJours,
				constat: lecture.constat
			});
		}
	}

	return ruptures;
}

/**
 * Rassemble ce que la surveillance doit examiner.
 *
 * Les factures soldées sont écartées ici plutôt que dans le détecteur : elles
 * n'ont aucune raison de traverser le calcul, et sur un portefeuille de
 * plusieurs années elles sont la majorité.
 */
async function assembler(
	ctx: QueryCtx,
	organizationId: Id<'organizations'>,
	aujourdHui: string
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
		//
		// ⚠️ `prescriptionDe` NE LÈVE JAMAIS, et c'est ce qui tient cet écran
		// debout. `dateEcheance` est une chaîne côté Convex : un « 2026-02-30 »
		// traverse la validation du schéma sans un mot, puis faisait lever le
		// calcul. Cette boucle parcourt TOUTES les factures de l'établissement —
		// une seule ligne abîmée éteignait la surveillance entière, et le gérant
		// se croyait couvert pendant que le battement échouait chaque matin.
		// Désormais elle devient un angle mort NOMMÉ, et les autres continuent.
		factures.push({
			reference: facture.reference,
			montantExigible: depuisCentimes(facture.montantTTC),
			dateEcheance: facture.dateEcheance ?? facture.dateEmission,
			statutPaiement: facture.statutPaiement,
			...prescriptionDe([facture.dateExigibilite, facture.dateEcheance], secteur)
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

	// LA DÉGRADATION D'UN DÉBITEUR SE CONSTATE ENTRE DEUX RELEVÉS, et le produit
	// n'en historisait qu'un : cette liste était vide EN DUR, avec le commentaire
	// « tant qu'on n'historise pas la santé, on ne peut pas la détecter ». Un type
	// d'événement déclaré, testé, et que rien ne pouvait déclencher.
	//
	// Le radar BODACC écrit désormais `santePrecedente`. Sans ce raccordement, il
	// remplirait un champ que personne ne relit — le défaut symétrique.
	//
	// ⚠️ L'ENCOURS EST PORTÉ, MAIS IL N'ENTRE PAS DANS LE MONTANT IDENTIFIÉ.
	// C'est une VUE AGRÉGÉE des factures déjà comptées ; `montantIdentifie` ne
	// retient que FACTURE_ECHUE et PRESCRIPTION_PROCHE, dédupliquées par
	// référence. C'est la leçon du double compte, et elle tient ici aussi.
	const restantDuParDebiteur = new Map<string, Montant>();
	for (const facture of facturesBrutes) {
		if (facture.statutPaiement === 'SOLDEE') continue;
		const deja = restantDuParDebiteur.get(facture.debiteurId) ?? ZERO;
		restantDuParDebiteur.set(
			facture.debiteurId,
			additionner(deja, depuisCentimes(facture.montantTTC))
		);
	}

	const debiteursSurveilles: DebiteurSurveille[] = [...debiteurs.values()]
		.filter(
			(debiteur) =>
				debiteur.santePrecedente !== undefined &&
				debiteur.santePrecedente !== debiteur.santeFinanciere
		)
		.map((debiteur) => ({
			// La DÉNOMINATION, pas l'identifiant : cet événement s'affiche, et un
			// identifiant Convex ne dit rien à un gérant.
			reference: debiteur.denomination,
			encoursTotal: restantDuParDebiteur.get(debiteur._id) ?? ZERO,
			santePrecedente: debiteur.santePrecedente!,
			santeActuelle: debiteur.santeFinanciere
		}));

	// Un debiteur SANS identifiant public n'est pas suivi au registre : le radar
	// rapproche par SIREN, jamais par raison sociale. On ne nomme que ceux qui
	// portent un encours — un debiteur solde n'est pas un risque, et l'annoncer
	// noierait ceux qui en sont un.
	const debiteursSansIdentifiant = [...debiteurs.values()]
		.filter(
			(debiteur) =>
				debiteur.siren === undefined && (restantDuParDebiteur.get(debiteur._id) ?? ZERO) > ZERO
		)
		.map((debiteur) => debiteur.denomination);

	const ruptures = await rupturesDHabitude(
		ctx,
		organizationId,
		facturesBrutes,
		debiteurs,
		aujourdHui
	);

	return {
		etat: {
			factures,
			creances,
			dossiers,
			debiteurs: debiteursSurveilles,
			debiteursSansIdentifiant,
			ruptures
		},
		hypotheses: [...hypotheses]
	};
}

/** Le flux, sans authentification — pour les tests et les tâches planifiées. */
export const fluxInterne = internalQuery({
	args: { organizationId: v.id('organizations'), aujourdHui: v.string() },
	returns: vFlux,
	handler: async (ctx, { organizationId, aujourdHui }) => {
		const { etat, hypotheses } = await assembler(ctx, organizationId, aujourdHui);
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

		const { etat, hypotheses } = await assembler(ctx, organizationId, jour);
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
