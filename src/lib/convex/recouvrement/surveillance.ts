import { v } from 'convex/values';
import { internalQuery } from '../_generated/server';
import type { QueryCtx } from '../_generated/server';
import { authedQuery } from '../functions';
import { resteDu } from './lecture';
import type { Doc, Id } from '../_generated/dataModel';
import { additionner, depuisCentimes, enCentimes, ZERO, type Montant } from '../../socle/montants';
import { habitudeDePaiement, lireRupture } from '../../verticales/recouvrement/comportement';
import type { PaiementObserve } from '../../verticales/recouvrement/comportement';
import { ecartJours, estDateReelle } from '../../verticales/recouvrement/calendrier';
import { suivreProcedure } from '../../verticales/recouvrement/apres-procedure';
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
	/**
	 * L'OBJET QUE L'ÉVÉNEMENT DÉSIGNE, pour que la rangée s'ouvre.
	 *
	 * ⚠️ FACULTATIF, PARCE QUE LE DOMAINE LE REND FACULTATIF. Une donnée ancienne
	 * peut ne pas porter d'identifiant exploitable ; la rangée s'affiche alors
	 * sans mener nulle part, ce qui est la vérité. Fabriquer une destination
	 * serait pire : elle ouvrirait le mauvais dossier.
	 */
	cible: v.optional(
		v.object({
			genre: v.union(v.literal('DEBITEUR'), v.literal('CREANCE')),
			id: v.string(),
			/**
			 * Le client d'une cible `CREANCE`. Une cible `DEBITEUR` dit déjà de qui
			 * il s'agit ; une cible `CREANCE` ne le dit pas, et `reference` est un
			 * texte qu'on affiche, jamais un identifiant qu'on rapproche.
			 */
			debiteurId: v.optional(v.string())
		})
	),
	montant: v.union(v.int64(), v.null()),
	urgence: vUrgence,
	explication: v.string(),
	action: v.string(),
	/**
	 * LE JOUR OÙ CE QUE L'ÉVÉNEMENT CONSTATE SE PRODUIT, en AAAA-MM-JJ.
	 *
	 * ⚠️ FACULTATIVE, PARCE QUE LE DOMAINE LA REND FACULTATIVE : seuls
	 * `FACTURE_ECHUE`, `PRESCRIPTION_PROCHE` et `ECHEANCE_PROCEDURE` ont une
	 * date dans la donnée. Voir `Evenement.dateDuFait`, qui porte la règle.
	 *
	 * ⚠️ ET LES DEUX HANDLERS DE CE FICHIER LA RECOPIENT L'UN COMME L'AUTRE. Ils
	 * reconstruisent l'événement champ par champ : en oublier un le supprime en
	 * silence, sans que le compilateur ni le validateur ne bronchent. C'est ce
	 * qui est arrivé à `cible` le 12 septembre 2026, et c'est pour ça que le
	 * test qui part de la base jusqu'au bout existe.
	 */
	dateDuFait: v.optional(v.string())
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
				// « Ouvrir la fiche de X » : l'action l'écrivait déjà, et rien ne
				// permettait de le faire. C'est ce qui la rend vraie.
				debiteurId: debiteurId as string,
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
			// Ce qui rend la rangee cliquable dans le flux. Le DEBITEUR, parce
			// qu'une facture n'a pas d'ecran a elle : c'est son volet qui la porte.
			debiteurId: facture.debiteurId as string,
			montantExigible: depuisCentimes(facture.montantTTC),
			dateEcheance: facture.dateEcheance ?? facture.dateEmission,
			statutPaiement: facture.statutPaiement,
			...prescriptionDe([facture.dateExigibilite, facture.dateEcheance], secteur)
		});
	}

	const creancesBrutes = await ctx.db
		.query('creances')
		.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
		.collect();

	/**
	 * CE QUI RESTE À RÉCLAMER SUR CHAQUE CRÉANCE.
	 *
	 * ⚠️ `total` VALAIT `ZERO`, EN DUR, POUR TOUTES. Chaque événement de la file
	 * porte un montant, et c'est structurel : un gérant arbitre entre 12 000 € et
	 * 300 €, pas entre deux libellés. Une créance mûre annoncée à « 0,00 € » se
	 * lit comme une créance sans enjeu, c'est-à-dire comme rien.
	 *
	 * Les factures sont déjà en main, soldées exclues, comme partout ailleurs dans
	 * cette fonction.
	 *
	 * ⚠️ ET C'EST `resteDu` QUI COMPTE, PAS LE MONTANT TTC. Une facture payée à
	 * moitié est « non soldée » : sommer son TTC gonflerait la file d'un argent
	 * déjà reçu, et un montant faux par excès est pire qu'un montant absent, parce
	 * qu'il se réclame. On appelle la fonction du produit plutôt que de resoustraire
	 * les règlements ici : deux définitions de ce qui reste dû finiraient par
	 * diverger, exactement comme les deux définitions de « mûre » qu'on vient de
	 * réunir.
	 */
	const totalParCreance = new Map<Id<'creances'>, Montant>();
	for (const facture of facturesBrutes) {
		if (facture.statutPaiement === 'SOLDEE') continue;
		if (facture.creanceId === undefined) continue;
		totalParCreance.set(
			facture.creanceId,
			additionner(totalParCreance.get(facture.creanceId) ?? ZERO, await resteDu(ctx, facture))
		);
	}

	const creances = creancesBrutes.map((creance) => ({
		// ⚠️ LA RÉFÉRENCE PORTAIT L'IDENTIFIANT CONVEX DE LA CRÉANCE, qui s'affichait
		// tel quel dans la file : une suite de trente-deux caractères que personne
		// ne peut rattacher à un client. Le nom du débiteur est ce que le gérant
		// reconnaît, et la table est en main juste au-dessus.
		reference: debiteurs.get(creance.debiteurId)?.denomination ?? 'Débiteur inconnu',
		id: creance._id as string,
		// Le client, pour que la cible `CREANCE` dise de qui elle parle. La
		// dénomination juste au-dessus s'affiche ; elle ne se rapproche pas.
		debiteurId: creance.debiteurId as string,
		total: totalParCreance.get(creance._id) ?? ZERO,
		// Absent sur les créances écrites avant ce champ : le doute ne profite
		// jamais au produit, une maturité qu'on n'a pas calculée n'est pas acquise.
		eligible: creance.eligible ?? false,
		statut: creance.statut
	}));

	/**
	 * ⚠️ LES ÉCHÉANCES DE PROCÉDURE VIENNENT DE LA MACHINE À ÉTATS, PLUS DE LA
	 * TABLE `dossiers` — ET C'EST UNE CORRECTION, PAS UN REFACTORING.
	 *
	 * Cette liste se lisait dans `dossiers` : « une créance, plus une procédure
	 * choisie, plus son avancement ». Rien n'écrivait cette table. Aucune
	 * mutation, aucun import, aucun écran. Dixième occurrence du défaut
	 * « déclaré, lu, jamais alimenté » dans ce dépôt.
	 *
	 * Le coût était le pire de tous : la surveillance SAIT produire des
	 * événements `ECHEANCE_PROCEDURE`, et elle n'en produisait jamais. La
	 * caducité d'une ordonnance à trois mois — l'échéance qui fait perdre un
	 * titre exécutoire — ne pouvait apparaître ni dans le flux, ni dans le
	 * briefing quotidien. « Un radar qui ne se réveille pas n'est pas un radar,
	 * c'est un rapport. »
	 *
	 * ⚠️ ET LES ÉCHÉANCES SE REJOUENT, ELLES NE SE STOCKENT PAS. `dossiers` les
	 * figeait à l'engagement, pour une raison qui se défend — une échéance est
	 * une promesse faite à une date. Mais la machine les DÉRIVE de l'état
	 * courant, et c'est plus juste : une ordonnance signifiée ne fait plus
	 * courir sa caducité. Des échéances figées auraient continué de l'annoncer,
	 * et une alerte qui persiste après l'acte use la confiance dans toutes les
	 * autres.
	 */
	const dossiers: DossierSurveille[] = [];
	for (const creance of creancesBrutes) {
		if (creance.procedureEngagee === undefined || creance.engageeLe === undefined) continue;

		const lignes = await ctx.db
			.query('evenementsProcedure')
			.withIndex('by_creance', (q) => q.eq('creanceId', creance._id))
			.collect();

		// Triées par date du FAIT, comme partout ailleurs : rejouer dans l'ordre
		// de saisie laisserait la machine à l'état d'entrée sans rien dire.
		const journal = lignes
			.filter((e) => e.organizationId === organizationId)
			.sort((a, b) => (a.survenuLe < b.survenuLe ? -1 : a.survenuLe > b.survenuLe ? 1 : 0))
			.map((e) => ({ cle: e.cle, survenuLe: e.survenuLe }));

		let suivi;
		try {
			suivi = suivreProcedure(creance.procedureEngagee, journal, creance.engageeLe);
		} catch {
			// Une procédure sans machine ne peut pas arriver ici — `engagerProcedure`
			// la refuse — mais une donnée ancienne le pourrait. On la passe plutôt
			// que d'éteindre le flux entier d'un établissement.
			continue;
		}

		if (suivi.echeances.length === 0) continue;
		dossiers.push({
			// ⚠️ LA RÉFÉRENCE PORTAIT L'IDENTIFIANT CONVEX DE LA CRÉANCE, qui
			// s'affichait tel quel dans la file et dans le briefing du matin : une
			// suite de trente-deux caractères que personne ne peut rattacher à un
			// client. Le même défaut que sur les créances mûres, corrigé là-bas et
			// laissé ici — sur la seule rangée du produit qui annonce la perte d'un
			// titre exécutoire. La table des débiteurs est en main depuis le haut de
			// cette fonction.
			reference: debiteurs.get(creance.debiteurId)?.denomination ?? 'Débiteur inconnu',
			creanceId: creance._id as string,
			debiteurId: creance.debiteurId as string,
			// ⚠️ IL VALAIT `ZERO`, ÉCRIT EN DUR, SUR L'ÉCHÉANCE LA PLUS DANGEREUSE
			// DU PRODUIT. Chaque événement de la file porte un montant, et c'est
			// structurel : un gérant arbitre entre 12 000 € et 300 €, pas entre deux
			// libellés. Une caducité annoncée à « 0,00 € » se lit comme une échéance
			// sans enjeu — c'est-à-dire comme une ligne qu'on remet à demain, le jour
			// où elle est la seule qui ne se rattrape pas.
			//
			// C'est le MÊME décompte que celui des créances mûres, pris à la même
			// source : `resteDu`, déjà sommé par créance juste au-dessus. Le
			// resoustraire ici donnerait deux définitions de ce qui reste dû, et
			// elles finiraient par diverger.
			montantEnJeu: totalParCreance.get(creance._id) ?? ZERO,
			echeances: suivi.echeances.map((echeance) => ({
				cle: echeance.cle,
				libelle: echeance.libelle,
				dateLimite: echeance.dateLimite,
				gravite: echeance.gravite,
				// Dérivées de l'état : une échéance qui ne court plus a DISPARU de la
				// liste. Il n'y a donc rien à marquer comme traité.
				traitee: false
			}))
		});
	}

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
			id: debiteur._id as string,
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
				action: evenement.action,
				// ⚠️ SANS CETTE LIGNE, LA CIBLE MEURT ICI. Le domaine la calcule, le
				// validateur la declare, et ces deux handlers reconstruisent l objet
				// champ par champ : en oublier un le supprime en silence, sans que le
				// compilateur bronche — un champ facultatif absent reste valide.
				//
				// C est exactement le defaut « declare, lu, jamais alimente », et il a
				// ete commis ICI le 12 septembre 2026 : les rangees du flux etaient
				// rendues cliquables, verifiees dans la salle d exposition — qui fournit
				// SES PROPRES donnees — et inertes dans l application reelle.
				...(evenement.cible === undefined ? {} : { cible: evenement.cible }),
				// ⚠️ MÊME PIÈGE, MÊME REMÈDE. `dateDuFait` est facultative : l'oublier
				// ici la supprimerait en silence, et la file retomberait sur le tri par
				// montant sans qu'un seul test ne tombe.
				...(evenement.dateDuFait === undefined ? {} : { dateDuFait: evenement.dateDuFait })
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
				action: evenement.action,
				// ⚠️ SANS CETTE LIGNE, LA CIBLE MEURT ICI. Le domaine la calcule, le
				// validateur la declare, et ces deux handlers reconstruisent l objet
				// champ par champ : en oublier un le supprime en silence, sans que le
				// compilateur bronche — un champ facultatif absent reste valide.
				//
				// C est exactement le defaut « declare, lu, jamais alimente », et il a
				// ete commis ICI le 12 septembre 2026 : les rangees du flux etaient
				// rendues cliquables, verifiees dans la salle d exposition — qui fournit
				// SES PROPRES donnees — et inertes dans l application reelle.
				...(evenement.cible === undefined ? {} : { cible: evenement.cible }),
				// ⚠️ MÊME PIÈGE, MÊME REMÈDE. Voir `fluxInterne` juste au-dessus : une
				// `dateDuFait` oubliée d'un seul des deux handlers rendrait la file
				// triée dans l'application et pas dans le briefing, ou l'inverse.
				...(evenement.dateDuFait === undefined ? {} : { dateDuFait: evenement.dateDuFait })
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
