import { v } from 'convex/values';
import { internalQuery, internalMutation } from '../_generated/server';
import type { QueryCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';
import { authedQuery } from '../functions';
import { getUserOrg } from '../lib/auth';
import { additionner, depuisCentimes, enCentimes, versEuros } from '../../socle/montants';
import { planDuDossier } from './plan';
import { resteDu } from './lecture';
import { etatDuReferentiel } from '../../verticales/recouvrement/referentiel';
import { pourcentageDepuisTaux } from '../../verticales/recouvrement/taux-contractuel';
import {
	AVERTISSEMENT_MENSUEL,
	ARRET_MENSUEL,
	evaluerPlafond
} from '../../verticales/recouvrement/compagnon/disponibilite';
import { vGestePropose, vLigneDEtat, vSourceConstat } from './tables';
import { jourEnClair } from '../../verticales/recouvrement/compagnon/gestes';

/**
 * CE QUI SE LIT ET S'ÉCRIT AUTOUR DE LA CONVERSATION.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI CE FICHIER EST SÉPARÉ DE `conversation.ts`
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `conversation.ts` porte `"use node"`, parce que l'appel modèle passe par le
 * SDK. Un module `"use node"` n'exporte QUE des actions : ni `query`, ni
 * `mutation`. Le dépôt sépare déjà `depot.ts` de `depotMutations.ts` pour cette
 * raison exacte, et on la suit.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE CLOISONNEMENT SE FAIT ICI, PAS DANS L'ACTION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Une action n'a pas de base de données : elle ne peut pas appeler
 * `getUserOrg`, qui relit le profil et REVÉRIFIE l'appartenance. Tout ce que
 * ces fonctions rendent est donc filtré par `organizationId` ici, et l'action
 * ne reçoit jamais d'identifiant d'établissement du client — ce qui reviendrait
 * à le croire sur parole.
 *
 * ⚠️ ET UNE CRÉANCE D'UN AUTRE ÉTABLISSEMENT REND `null`, PAS UNE ERREUR. Un
 * message distinct dirait au demandeur que l'identifiant existe ailleurs.
 */

// ═══════════════════════════════════════════════════════════════════════════
// LE CONTEXTE DU DOSSIER, TEL QUE LE COMPAGNON A LE DROIT DE LE VOIR
// ═══════════════════════════════════════════════════════════════════════════

const vContexteDossier = v.object({
	debiteur: v.string(),
	etat: v.optional(v.array(v.string())),
	faits: v.array(v.string()),
	pieces: v.array(v.object({ id: v.string(), libelle: v.string() })),
	decomptes: v.array(
		v.object({
			id: v.string(),
			arreteAu: v.union(v.string(), v.null()),
			total: v.string(),
			segments: v.array(v.string()),
			reglements: v.optional(v.array(v.string()))
		})
	),
	valeurs: v.array(
		v.object({
			cle: v.string(),
			source: v.string(),
			verifieLe: v.string(),
			verifie: v.boolean(),
			valideParAvocat: v.boolean()
		})
	),
	hypotheses: v.array(v.string()),
	anglesMorts: v.array(v.string()),
	echanges: v.array(
		v.object({
			role: v.union(v.literal('GERANT'), v.literal('COMPAGNON')),
			texte: v.string()
		})
	)
});

const vCompteur = v.object({
	niveau: v.union(v.literal('OUVERT'), v.literal('AVERTI'), v.literal('ARRETE')),
	cumul: v.number(),
	reste: v.number(),
	avertissement: v.number(),
	arret: v.number(),
	mois: v.string()
});

/** `AAAA-MM`, en UTC comme toutes les dates du produit. */
function moisCourant(): string {
	return new Date().toISOString().slice(0, 7);
}

/**
 * Ce que l'établissement a consommé ce mois-ci, en budget de pilotage.
 *
 * ⚠️ ON SOMME CE QUI A ÉTÉ ÉCRIT, ON NE LE RECALCULE PAS. `coutEstime` est figé
 * au moment du tour ; refaire la somme depuis les jetons ferait dépendre les
 * mois passés du barème du jour, et le seuil se serait déplacé sans que
 * personne ne l'ait décidé.
 */
async function cumulDuMois(
	ctx: QueryCtx,
	organizationId: Id<'organizations'>,
	mois: string
): Promise<number> {
	const tours = await ctx.db
		.query('echangesCompagnon')
		.withIndex('by_org_and_mois', (q) => q.eq('organizationId', organizationId).eq('mois', mois))
		.collect();

	let cumul = 0;
	for (const tour of tours) cumul += tour.usage?.coutEstime ?? 0;
	return cumul;
}

function compteurDepuis(cumul: number, mois: string) {
	const etat = evaluerPlafond(cumul);
	return {
		niveau: etat.niveau,
		cumul: etat.cumul,
		reste: etat.reste,
		avertissement: AVERTISSEMENT_MENSUEL,
		arret: ARRET_MENSUEL,
		mois
	};
}

/**
 * Le dossier réduit à ce qui se cite, et le compteur du mois.
 *
 * ⚠️ TOUT MONTANT PART EN TOUTES LETTRES, DÉJÀ RENDU. Les centimes sont des
 * `bigint` partout dans le produit ; `versEuros` est la seule conversion, et
 * elle se fait ici, une fois. Laisser un nombre traverser jusqu'au modèle
 * rouvrirait la porte au flottant sur un chiffre qui finit dans un décompte.
 */
/** Ce que `gestes.ts` relit : l'état du dossier, au moment de la question. */
const vPourGestes = v.object({
	aujourdHui: v.string(),
	restantDu: v.int64(),
	relancable: v.boolean(),
	horsPilote: v.boolean(),
	relanceProgrammee: v.boolean(),
	emailConnu: v.union(v.string(), v.null()),
	contestationDeclaree: v.boolean(),
	decompteArrete: v.boolean(),
	ibanConnu: v.boolean(),
	remiseEnCours: v.boolean(),
	arretable: v.boolean(),
	echeancierEnCours: v.optional(v.boolean()),
	classe: v.optional(v.boolean())
});

interface ContexteLu {
	/** Où en est le dossier, en clair : ce que Plume joint quand il ne peut pas répondre mieux. */
	resume: { texte: string; vers?: string }[];
	pourGestes: {
		aujourdHui: string;
		restantDu: bigint;
		relancable: boolean;
		horsPilote: boolean;
		relanceProgrammee: boolean;
		emailConnu: string | null;
		contestationDeclaree: boolean;
		decompteArrete: boolean;
		ibanConnu: boolean;
		remiseEnCours: boolean;
		arretable: boolean;
		echeancierEnCours?: boolean;
		classe?: boolean;
	};
	contexte: {
		debiteur: string;
		etat: string[];
		faits: string[];
		pieces: { id: string; libelle: string }[];
		decomptes: { id: string; arreteAu: string | null; total: string; segments: string[] }[];
		valeurs: {
			cle: string;
			source: string;
			verifieLe: string;
			verifie: boolean;
			valideParAvocat: boolean;
		}[];
		hypotheses: string[];
		anglesMorts: string[];
		echanges: { role: 'GERANT' | 'COMPAGNON'; texte: string }[];
	};
	compteur: {
		niveau: 'OUVERT' | 'AVERTI' | 'ARRETE';
		cumul: number;
		reste: number;
		avertissement: number;
		arret: number;
		mois: string;
	};
}

export const contexteDuDossier = internalQuery({
	args: { creanceId: v.id('creances'), toursRepris: v.number() },
	returns: v.union(
		v.null(),
		v.object({
			contexte: vContexteDossier,
			compteur: vCompteur,
			pourGestes: vPourGestes,
			resume: v.array(v.object({ texte: v.string(), vers: v.optional(v.string()) }))
		})
	),
	handler: async (ctx, { creanceId, toursRepris }): Promise<ContexteLu | null> => {
		const { organizationId } = await getUserOrg(ctx);
		const mois = moisCourant();

		const creance = await ctx.db.get(creanceId);
		if (creance === null || creance.organizationId !== organizationId) return null;

		const debiteur = await ctx.db.get(creance.debiteurId);

		const factures = await ctx.db
			.query('facturesVente')
			.withIndex('by_creance', (q) => q.eq('creanceId', creanceId))
			.collect();

		const decomptes = (
			await ctx.db
				.query('decomptes')
				.withIndex('by_creance', (q) => q.eq('creanceId', creanceId))
				.collect()
		).filter((decompte) => decompte.organizationId === organizationId);

		const pieces = (
			await ctx.db
				.query('pieces')
				.withIndex('by_debiteur', (q) => q.eq('debiteurId', creance.debiteurId))
				.collect()
		).filter((piece) => piece.organizationId === organizationId);

		/*
		  ⚠️ DES FAITS EN CLAIR, ET PLUS LES CRITÈRES JURIDIQUES DE LA BASE. Le contexte
		  portait « Qualité de commerçant du débiteur : ok » et « Créance certaine :
		  unknown. Liquide… Exigible… » : le modèle les recopiait dans sa réponse, et les
		  filtres retenaient la phrase pour un mot du droit sans source (« commerçant »).
		  Ces critères se lisent sur la page du dossier ; ils n'aident pas à répondre au
		  gérant.
		*/
		const ETAT_DE_PAIEMENT: Readonly<Record<string, string>> = {
			IMPAYEE: 'pas encore payée',
			PARTIELLEMENT_PAYEE: 'payée en partie',
			SOLDEE: 'payée',
			LITIGIEUSE: 'contestée'
		};
		const faits: string[] = [
			`${factures.length} facture${factures.length > 1 ? 's' : ''} dans ce dossier.`
		];
		for (const facture of factures) {
			faits.push(
				`Facture ${facture.reference}, émise le ${facture.dateEmission}, ` +
					`à payer le ${facture.dateEcheance}, ` +
					`montant TTC ${versEuros(depuisCentimes(facture.montantTTC))} €, ` +
					`${ETAT_DE_PAIEMENT[facture.statutPaiement] ?? facture.statutPaiement}.`
			);
		}

		/**
		 * ⚠️ LE SECTEUR INDÉTERMINÉ EST UNE HYPOTHÈSE, ET ELLE S'ANNONCE.
		 * `surveillance.ts` retient alors le délai le plus court, et un gérant
		 * qui croit sa prescription surveillée ne la surveille pas lui-même.
		 */
		const hypotheses: string[] =
			debiteur?.secteur === undefined || debiteur.secteur === 'INDETERMINE'
				? [
						'Le secteur de ce client n’est pas déterminé : le logiciel retient le délai de ' +
							'prescription le plus court, et le déclare comme une hypothèse.'
					]
				: [`Le secteur retenu pour ce client est ${debiteur.secteur}.`];

		/*
		  OÙ EN EST LE DOSSIER — ce qui permet à Plume de proposer un geste possible,
		  et seulement celui-là : la date du jour (« mardi » se calcule), ce qui reste
		  dû, l'adresse du client, le plan, ce qui est programmé ou attend.
		*/
		const aujourdHui = new Date().toISOString().slice(0, 10);
		const restes = await Promise.all(factures.map((facture) => resteDu(ctx, facture)));
		const restantDu = enCentimes(additionner(...restes));
		const envois = await ctx.db
			.query('envois')
			.withIndex('by_creance', (q) => q.eq('creanceId', creanceId))
			.collect();
		const programmee = envois.find((e) => e.etat === 'PROGRAMME');
		const enAttente = envois.some((e) => e.etat === 'A_VALIDER');
		const pilote = await ctx.db
			.query('pilotes')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.first();
		const plan = await planDuDossier(ctx, creance, factures, aujourdHui, envois);
		const suspendu =
			debiteur?.santeFinanciere === 'PROCEDURE_COLLECTIVE' ||
			debiteur?.santeFinanciere === 'RADIEE';
		const relancable =
			creance.statut !== 'CLOSE' && creance.engageeLe === undefined && !suspendu && restantDu > 0n;
		const horsPilote = debiteur?.horsPilote === true;
		const contestationDeclaree = (creance.faitsLitige ?? []).some(
			(fait) => fait.cle === 'CONTESTATION_ECRITE' && fait.reponse === 'OUI'
		);
		const profil = await ctx.db
			.query('profilsCreancier')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.first();
		const ibanConnu = profil?.iban !== undefined && profil.iban !== '';
		const remiseEnCours = (
			await ctx.db
				.query('remisesAuConseil')
				.withIndex('by_creance', (q) => q.eq('creanceId', creanceId))
				.collect()
		).some((remise) => remise.etat === 'REMIS' || remise.etat === 'REVENU');
		const dernierArrete = [...decomptes].sort((a, b) => b.arreteAu.localeCompare(a.arreteAu))[0];
		const arretable = creance.statut !== 'CLOSE' && restantDu > 0n;
		const etat: string[] = [
			`Aujourd’hui : ${jourEnClair(aujourdHui)} ${aujourdHui.slice(0, 4)} (${aujourdHui}).`,
			`Reste à payer sur les factures du dossier, hors pénalités : ${versEuros(depuisCentimes(restantDu))} €.`,
			debiteur?.email === undefined || debiteur.email === ''
				? 'Adresse électronique du client : inconnue.'
				: `Adresse électronique du client : ${debiteur.email}.`,
			horsPilote
				? 'Le dirigeant a retiré ce client du pilote : Plume ne le relance pas.'
				: pilote?.envoiAutomatique === true
					? 'Plume envoie seul les relances du plan, au nom du dirigeant, une heure après les avoir montrées.'
					: 'Plume prépare les relances ; le dirigeant les relit et les envoie lui-même.',
			plan === null
				? 'Le plan de relance n’a plus d’étape à venir sur ce dossier.'
				: `Prochaine étape du plan : ${plan.prochaine.etape.nom}, prévue le ${plan.prochaine.le}.`,
			...(plan?.pause === null || plan?.pause === undefined
				? []
				: [
						plan.pause.raison === 'PROMESSE'
							? `Le client a promis de payer le ${plan.pause.le} : les relances automatiques se taisent jusqu’au ${plan.pause.jusquAu} inclus.`
							: `Un échéancier est en cours, prochain versement le ${plan.pause.le} : les relances automatiques se taisent jusqu’au ${plan.pause.jusquAu} inclus.`
					]),
			...(programmee === undefined
				? []
				: [
						`Une relance est programmée et partira le ${new Date(programmee.partiraLe ?? programmee.prepareLe).toISOString().slice(0, 10)}, sauf si le dirigeant la retient.`
					]),
			...(enAttente ? ['Un courrier attend la relecture du dirigeant dans ce dossier.'] : []),
			...(contestationDeclaree
				? [
						'Le dirigeant a noté que le client conteste. Cela ne bloque rien : le dossier continue, relances comprises.'
					]
				: []),
			dernierArrete === undefined
				? 'Aucun décompte n’est arrêté sur ce dossier.'
				: `Dernier décompte arrêté le ${dernierArrete.arreteAu}.`,
			ibanConnu
				? 'L’IBAN du dirigeant est renseigné : la page de paiement peut s’ouvrir.'
				: 'L’IBAN du dirigeant n’est pas renseigné : la page de paiement ne peut pas s’ouvrir.',
			...(remiseEnCours ? ['Le dossier est remis au conseil du dirigeant.'] : []),
			...(relancable
				? []
				: [
						suspendu
							? 'Ce client est en procédure collective ou radié : les relances sont suspendues.'
							: restantDu <= 0n
								? 'Les factures de ce dossier sont réglées : il n’y a plus rien à relancer.'
								: 'Ce dossier est classé ou confié à un professionnel : il ne se relance plus.'
					])
		];

		/*
		  OÙ EN EST LE DOSSIER, EN CLAIR — composé ici, à partir de la base, jamais par
		  le modèle. Plume le joint à sa réponse quand on lui demande où en est le
		  dossier, ou quand une de ses phrases n'a pas pu être rendue.
		*/
		const JOUR = new Intl.DateTimeFormat('fr-FR', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			timeZone: 'UTC'
		});
		const leJour = (iso: string) =>
			iso <= aujourdHui ? 'aujourd’hui' : JOUR.format(new Date(`${iso}T00:00:00.000Z`));
		/*
		  ⚠️ CHAQUE LIGNE MÈNE À CE QU'ELLE DIT (08/10/2026) : le reste à payer aux
		  pénalités et frais, la relance au courrier, l'adresse à la fiche, le décompte
		  arrêté à sa page. Une ligne qui dit « c'est là » sans y mener fait chercher.
		*/
		const resume: { texte: string; vers?: string }[] = [
			restantDu > 0n
				? {
						texte: `Il reste ${versEuros(depuisCentimes(restantDu))} € à payer sur ${factures.length} facture${factures.length > 1 ? 's' : ''}.`,
						vers: 'section:decompte'
					}
				: { texte: 'Ses factures sont payées.' },
			...(creance.aDemarrer === true
				? [
						{
							texte:
								'Le dossier est prêt, et attend que vous le démarriez : je ne relance rien avant.',
							vers: 'demarrer'
						}
					]
				: []),
			...(suspendu
				? [{ texte: 'Il est en procédure collective ou radié : les relances sont suspendues.' }]
				: horsPilote
					? [{ texte: 'Vous gardez ce client en main : je ne le relance pas.', vers: 'fiche' }]
					: []),
			...(programmee === undefined
				? []
				: [
						{
							texte: `Une relance part ${leJour(new Date(programmee.partiraLe ?? programmee.prepareLe).toISOString().slice(0, 10))}, à votre nom. Vous pouvez encore la retenir.`,
							vers: 'section:courriers'
						}
					]),
			...(enAttente
				? [{ texte: 'Un courrier attend votre relecture.', vers: 'section:courriers' }]
				: []),
			...(plan === null || programmee !== undefined || creance.aDemarrer === true || !relancable
				? []
				: [
						{
							texte: `Prochaine étape : ${plan.prochaine.etape.nom.toLowerCase()}, ${leJour(plan.prochaine.le)}.`,
							vers: 'section:courriers'
						}
					]),
			debiteur?.email === undefined || debiteur.email === ''
				? { texte: 'Son adresse e-mail manque : je ne peux pas lui écrire.', vers: 'fiche' }
				: { texte: `Je lui écris à ${debiteur.email}.`, vers: 'fiche' },
			...(contestationDeclaree
				? [{ texte: 'Il conteste : c’est noté, et le dossier continue.', vers: 'section:litige' }]
				: []),
			dernierArrete === undefined
				? { texte: 'Aucun décompte n’est encore arrêté.', vers: 'arret' }
				: {
						texte: `Décompte arrêté le ${JOUR.format(new Date(`${dernierArrete.arreteAu}T00:00:00.000Z`))}.`,
						vers: `decompte:${dernierArrete._id}`
					},
			...(remiseEnCours
				? [
						{
							texte: 'Le dossier est remis à votre conseil.',
							...(dernierArrete === undefined ? {} : { vers: `decompte:${dernierArrete._id}` })
						}
					]
				: [])
		];

		const anglesMorts: string[] = [];
		if (debiteur?.siren === undefined) {
			anglesMorts.push(
				'Ce débiteur n’a pas de SIREN relevé : sa santé n’est pas surveillée au registre public.'
			);
		}
		if (decomptes.length === 0) {
			anglesMorts.push(
				'Aucun décompte n’a été arrêté sur cette créance : aucune somme n’y est encore figée ni datée.'
			);
		}

		return {
			resume,
			pourGestes: {
				aujourdHui,
				restantDu,
				relancable,
				horsPilote,
				relanceProgrammee: programmee !== undefined,
				emailConnu: debiteur?.email ?? null,
				contestationDeclaree,
				decompteArrete: dernierArrete !== undefined,
				ibanConnu,
				remiseEnCours,
				arretable,
				echeancierEnCours: plan?.pause?.raison === 'ECHEANCIER',
				classe: creance.statut === 'CLOSE'
			},
			contexte: {
				debiteur: debiteur?.denomination ?? 'Débiteur inconnu',
				etat,
				faits,
				pieces: pieces.map((piece) => ({
					id: piece._id,
					libelle:
						`${piece.type}${piece.reference === undefined ? '' : ` ${piece.reference}`}` +
						`${piece.dateDocument === undefined ? '' : `, daté du ${piece.dateDocument}`}` +
						`${piece.reserves === undefined ? '' : `, réserve portée : « ${piece.reserves} »`}`
				})),
				decomptes: decomptes.map((decompte) => ({
					id: decompte._id,
					arreteAu: decompte.arreteAu,
					total: `${versEuros(depuisCentimes(decompte.total))} €`,
					segments: decompte.lignes.flatMap((ligne) =>
						ligne.segments.map(
							(segment) =>
								`${ligne.reference} : ${versEuros(depuisCentimes(segment.principal))} € ` +
								`du ${segment.debut} au ${segment.fin}, ${segment.jours} jours, ` +
								`taux ${pourcentageDepuisTaux(segment.taux)} %, base annuelle ${segment.baseAnnuelle}, ` +
								`intérêts ${versEuros(depuisCentimes(segment.interets))} €`
						)
					),
					// Ce que chaque règlement a éteint : sans ces lignes, la somme des segments
					// dépasse les intérêts dus, et le décompte transmis ne se refait plus.
					reglements: decompte.lignes.flatMap((ligne) =>
						(ligne.imputations ?? []).map(
							(imputation) =>
								`${ligne.reference} : ${imputation.nature === 'AVOIR' ? 'avoir' : imputation.nature === 'CREDIT' ? 'crédit non détaillé' : 'règlement'} du ${imputation.date}, ` +
								`${versEuros(depuisCentimes(imputation.montant))} €, dont ` +
								`${versEuros(depuisCentimes(imputation.surInterets))} € sur les intérêts courus et ` +
								`${versEuros(depuisCentimes(imputation.surPrincipal))} € sur le principal`
						)
					)
				})),
				/**
				 * ⚠️ LES VALEURS PARTENT DÉJÀ RÉSOLUES, AVEC LEURS DEUX BOOLÉENS.
				 * Le compagnon cite une CLÉ, jamais un module de pays (B15) : c'est
				 * le registre qui sait qu'une valeur appartient à une juridiction, et
				 * c'est lui qui nomme le module dans `resoluPar`.
				 */
				valeurs: etatDuReferentiel().fiches.map((fiche) => ({
					cle: fiche.cle,
					source: fiche.source,
					verifieLe: fiche.verifieLe,
					verifie: fiche.verifie,
					valideParAvocat: fiche.valideParAvocat
				})),
				hypotheses,
				anglesMorts,
				/**
				 * ⚠️ LES DERNIERS TOURS, ET CEUX-LÀ SEULS. Un fil sans mémoire
				 * redemande au gérant ce qu'il vient de dire ; un fil sans borne
				 * fait grossir le contexte de chaque question jusqu'à ce que le
				 * plafond du mois morde en trois jours.
				 */
				echanges: (
					await ctx.db
						.query('echangesCompagnon')
						.withIndex('by_org_and_fil', (q) =>
							q.eq('organizationId', organizationId).eq('fil', creanceId)
						)
						.collect()
				)
					.sort((a, b) => a.diteLe - b.diteLe)
					.slice(-toursRepris)
					.map((tour) => ({ role: tour.role, texte: tour.texte }))
			},
			compteur: compteurDepuis(await cumulDuMois(ctx, organizationId, mois), mois)
		};
	}
});

// ═══════════════════════════════════════════════════════════════════════════
// L'ÉCRITURE DES DEUX TOURS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Les deux tours d'un échange, écrits ENSEMBLE.
 *
 * ⚠️ UNE LIGNE PAR TOUR, et c'est la leçon d'`attestationRequests` : un tableau
 * Convex plafonne à 8 192 entrées et le dépassement fait échouer l'écriture
 * entière — un fil bavard perdrait son dernier tour ET tous les autres.
 *
 * ⚠️ LA QUESTION S'ÉCRIT MÊME QUAND LA RÉPONSE EST REFUSÉE. Ce qui a été
 * demandé fait partie de ce qui s'est passé, et le fil doit pouvoir le dire. Le
 * tour du compagnon porte alors le texte du refus, et son usage quand l'appel a
 * bien été émis : un appel refusé au rendu a quand même été facturé.
 */
export const consignerEchange = internalMutation({
	args: {
		creanceId: v.id('creances'),
		fil: v.string(),
		question: v.string(),
		reponse: v.string(),
		pastilles: v.array(v.object({ phrase: v.number(), source: vSourceConstat })),
		/**
		 * ⚠️ LES PHRASES, ET C'EST ELLES QUI SE RELISENT. `reponse` reste leur
		 * concaténation — le fil la réinjecte telle quelle dans le contexte du
		 * tour suivant — mais les bornes ne se déduisent plus de la ponctuation.
		 *
		 * Facultatif : un refus et une question n'ont pas de phrases sourcées, et
		 * ils n'en reçoivent pas d'inventées.
		 */
		phrases: v.optional(
			v.array(v.object({ texte: v.string(), source: v.optional(vSourceConstat) }))
		),
		/** Les gestes proposés, déjà relus par `gestes.ts`. */
		gestes: v.optional(v.array(vGestePropose)),
		/** Où en est le dossier, en clair, quand Plume le joint à sa réponse. */
		etatDuDossier: v.optional(v.array(vLigneDEtat)),
		usage: v.optional(
			v.object({
				tokensIn: v.number(),
				tokensOut: v.number(),
				cacheReadTokens: v.number(),
				coutEstime: v.number()
			})
		)
	},
	returns: v.null(),
	handler: async (ctx, args): Promise<null> => {
		const { organizationId } = await getUserOrg(ctx);

		const creance = await ctx.db.get(args.creanceId);
		if (creance === null || creance.organizationId !== organizationId) return null;

		const horodatage = Date.now();
		const moisDuTour = moisCourant();

		await ctx.db.insert('echangesCompagnon', {
			organizationId,
			fil: args.fil,
			portee: 'CREANCE',
			cible: args.creanceId,
			role: 'GERANT',
			texte: args.question,
			pastilles: [],
			mois: moisDuTour,
			diteLe: horodatage
		});

		await ctx.db.insert('echangesCompagnon', {
			organizationId,
			fil: args.fil,
			portee: 'CREANCE',
			cible: args.creanceId,
			role: 'COMPAGNON',
			texte: args.reponse,
			pastilles: args.pastilles,
			phrases: args.phrases,
			...(args.gestes === undefined || args.gestes.length === 0 ? {} : { gestes: args.gestes }),
			...(args.etatDuDossier === undefined || args.etatDuDossier.length === 0
				? {}
				: { etatDuDossier: args.etatDuDossier }),
			usage: args.usage,
			mois: moisDuTour,
			// +1 ms : deux tours écrits dans la même transaction porteraient sinon
			// le même horodatage, et l'ordre du fil dépendrait de l'ordre d'insertion.
			diteLe: horodatage + 1
		});

		return null;
	}
});

// ═══════════════════════════════════════════════════════════════════════════
// CE QUE L'ÉCRAN LIT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * UN TOUR TEL QUE L'ÉCRAN LE REÇOIT — ET LE CONTENU N'Y PASSE QU'UNE FOIS.
 *
 * ⚠️ `texte` ET `phrases` SONT EXCLUSIFS, DÉLIBÉRÉMENT. `texte` est la
 * concaténation des phrases : les envoyer tous les deux faisait traverser le
 * réseau deux fois le même contenu, dont une moitié que `compagnon/tour.ts` ne
 * lit jamais quand les phrases sont là. La requête est réactive et tout le fil
 * repart à chaque question posée, donc ce doublon se payait à chaque tour.
 *
 * ⚠️ ET `pastilles` NE SORT PLUS DU TOUT. Les rangs étaient l'ancien chemin de
 * relecture ; il a été retiré (voir `compagnon/tour.ts`, au-dessus de
 * `relireTour`), et plus personne ne les lit à l'écran. Le champ reste ÉCRIT —
 * il est requis au schéma et une table qui porte des documents ne perd pas un
 * champ requis sans casser son déploiement — mais il ne se transporte plus.
 */
const vTourAffiche = v.object({
	_id: v.id('echangesCompagnon'),
	fil: v.string(),
	role: v.union(v.literal('GERANT'), v.literal('COMPAGNON')),
	/**
	 * Le texte recollé, rendu SEULEMENT quand `phrases` ne le porte pas : les
	 * tours du gérant, les refus, et les tours écrits avant que les phrases le
	 * soient. Absent quand `phrases` est là.
	 */
	texte: v.optional(v.string()),
	/** Absent sur les tours écrits avant que les phrases le soient, et sur les refus. */
	phrases: v.optional(v.array(v.object({ texte: v.string(), source: v.optional(vSourceConstat) }))),
	/** Les gestes que Plume a proposés dans ce tour, et ce qu'il en est advenu. */
	gestes: v.optional(v.array(vGestePropose)),
	/** Où en est le dossier, en clair, quand Plume l'a joint. */
	etatDuDossier: v.optional(v.array(vLigneDEtat)),
	diteLe: v.number()
});

/**
 * Le fil d'un dossier, et où en est le compteur du mois.
 *
 * ⚠️ IL REND LE COMPTEUR MÊME QUAND LE FIL EST VIDE. Le champ de saisie doit
 * pouvoir dire, avant qu'on tape, que la conversation libre est arrêtée pour ce
 * mois-ci — et ce que le produit continue de faire sans elle. Un champ qui
 * accepterait la frappe pour refuser à l'envoi serait un mur avec un délai.
 */
export const filDuDossier = authedQuery({
	args: { creanceId: v.id('creances') },
	returns: v.object({ tours: v.array(vTourAffiche), compteur: vCompteur }),
	handler: async (ctx, { creanceId }) => {
		const { organizationId } = await getUserOrg(ctx);
		const mois = moisCourant();
		const compteur = compteurDepuis(await cumulDuMois(ctx, organizationId, mois), mois);

		const creance = await ctx.db.get(creanceId);
		if (creance === null || creance.organizationId !== organizationId) {
			return { tours: [], compteur };
		}

		const tours = await ctx.db
			.query('echangesCompagnon')
			.withIndex('by_org_and_cible', (q) =>
				q.eq('organizationId', organizationId).eq('cible', creanceId)
			)
			.collect();

		return {
			tours: tours
				.sort((a, b) => a.diteLe - b.diteLe)
				.map((tour) => {
					// ⚠️ LA CONDITION EST CELLE DE `relireTour`, À LA LETTRE. Un tableau
					// de phrases VIDE s'y lit comme une absence — c'est le cas des tours
					// du gérant et des refus —, et le texte reste alors le seul contenu
					// du tour. Écrire ici une condition plus large ferait disparaître le
					// texte d'un tour que l'écran rendrait vide.
					const portePhrases = tour.phrases !== undefined && tour.phrases.length > 0;
					return {
						_id: tour._id,
						fil: tour.fil,
						role: tour.role,
						texte: portePhrases ? undefined : tour.texte,
						phrases: portePhrases ? tour.phrases : undefined,
						gestes: tour.gestes,
						etatDuDossier: tour.etatDuDossier,
						diteLe: tour.diteLe
					};
				}),
			compteur
		};
	}
});

/**
 * CE QUE L'EN-TÊTE DE LA CONVERSATION D'UN DOSSIER DIT : le client, ce qu'il doit
 * encore, et la prochaine étape du plan. C'est la phrase d'accueil de Plume :
 * « Je m'occupe du dossier de Durand. Prochaine étape : rappel, jeudi. »
 *
 * ⚠️ UN DOSSIER D'UN AUTRE ÉTABLISSEMENT REND `null`, comme `contexteDuDossier` :
 * un message distinct dirait que l'identifiant existe ailleurs.
 */
export const resumeDuDossier = authedQuery({
	args: { creanceId: v.id('creances') },
	returns: v.union(
		v.null(),
		v.object({
			client: v.string(),
			debiteurId: v.id('debiteurs'),
			restantDu: v.int64(),
			nombreFactures: v.number(),
			prochaineEtape: v.union(
				v.null(),
				v.object({ nom: v.string(), le: v.string(), automatique: v.boolean() })
			),
			envoiAutomatique: v.boolean()
		})
	),
	handler: async (ctx, { creanceId }) => {
		const { organizationId } = await getUserOrg(ctx);
		const creance = await ctx.db.get(creanceId);
		if (creance === null || creance.organizationId !== organizationId) return null;
		const debiteur = await ctx.db.get(creance.debiteurId);
		const factures = await ctx.db
			.query('facturesVente')
			.withIndex('by_creance', (q) => q.eq('creanceId', creanceId))
			.collect();
		const restes = await Promise.all(factures.map((facture) => resteDu(ctx, facture)));
		const plan = await planDuDossier(ctx, creance, factures, new Date().toISOString().slice(0, 10));
		const pilote = await ctx.db
			.query('pilotes')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.first();
		return {
			client: debiteur?.denomination ?? 'Client',
			debiteurId: creance.debiteurId,
			restantDu: enCentimes(additionner(...restes)),
			nombreFactures: factures.length,
			prochaineEtape:
				plan === null
					? null
					: {
							nom: plan.prochaine.etape.nom,
							le: plan.prochaine.le,
							automatique: plan.prochaine.etape.automatique
						},
			envoiAutomatique: pilote?.envoiAutomatique === true
		};
	}
});
