import { v, ConvexError } from 'convex/values';
import { internalMutation } from '../_generated/server';
import type { MutationCtx } from '../_generated/server';
import { internal } from '../_generated/api';
import type { Doc, Id } from '../_generated/dataModel';
import { authedMutation, authedQuery } from '../functions';
import { getUserOrg, requireOrgAdmin } from '../lib/auth';
import { sha256 } from '../../socle/empreinte';
import { composerRelance } from '../../verticales/recouvrement/relance';
import {
	PLAN_PAR_DEFAUT,
	prochainCreneauDEnvoi,
	type CleEtapePlan
} from '../../verticales/recouvrement/plan-relance';
import { resend, assertResendApiKey } from '../emails/resend';
import { relanceHtml } from '../emails/modeles/relance';
import { requireEnv } from '../env';
import { composer, type ChoixCourrier } from './envois';
import { paroleDuDossier, pauseDuDossier, planDuDossier } from './plan';
import { promesseACiter } from '../../verticales/recouvrement/parole';
import { resteDu } from './lecture';
import { pluriel } from '../../socle/francais';
import { ZERO, additionner, depuisCentimes, enCentimes, versEuros } from '../../socle/montants';
import { rattacherFactures } from './arret';

/**
 * LE PILOTE — l'agent qui vit en permanence (08/10/2026).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QU'IL REMPLACE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le produit relisait tout UNE fois par jour, à 6 h UTC (`battementQuotidien`).
 * Un dépôt de l'après-midi attendait le lendemain pour produire ses
 * propositions, une facture qui passait en retard ne se voyait qu'au matin
 * suivant, et l'écran disait « cette nuit ». Le fondateur : « stop cette
 * histoire d'agent qui ne fonctionne que le soir ! Tout doit se faire en live.
 * L'agent doit vivre en permanence. »
 *
 * Le pilote se RÉVEILLE :
 *   · à chaque changement qui compte — un dépôt lu, un virement rapproché ;
 *   · toutes les quinze minutes, pour ce que le temps seul fait avancer (une
 *     facture qui passe son échéance, une relance dont le jour arrive).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ IL MONTRE SON TRAVAIL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Un automatisme instantané ne se croit pas : le gérant veut tout revérifier,
 * et c'est l'effet « prise de notes » qu'on retire. Chaque travail du pilote
 * porte ses étapes, qui se cochent une à une sous les yeux du gérant (`CADENCE_MS`
 * entre deux) — et l'EFFET d'une étape (ouvrir un dossier, programmer une
 * relance) n'a lieu qu'au moment où elle se coche. Ce qu'on voit est ce qui se
 * passe, dans l'ordre où ça se passe.
 *
 * ⚠️ ANNOTATIONS DE RETOUR OBLIGATOIRES : ce module s'appelle lui-même par
 * `internal.recouvrement.pilote.*` (voir CLAUDE.md, le piège du cycle d'inférence).
 */

/** Le temps entre deux étapes d'un travail : assez pour se lire, pas pour attendre. */
const CADENCE_MS = 700;
/** Un réveil attend ce délai : une rafale de changements fait UNE veille. */
const DELAI_REVEIL_MS = 1500;
/** Une veille programmée qui n'a pas eu lieu depuis ce délai est tenue pour perdue. */
const VEILLE_PERDUE_MS = 60_000;
/**
 * Au plus tant de clients par travail : un portefeuille repris d'un coup s'ouvre
 * par lots, un lot par veille, plutôt qu'en une liste de deux cents étapes.
 */
const CLIENTS_PAR_TRAVAIL = 25;
/**
 * LE TEMPS POUR RETENIR UNE RELANCE. Elle est composée, programmée, visible sur
 * l'accueil et dans son dossier ; pendant une heure, le gérant peut l'arrêter
 * d'un geste. C'est le « Annuler l'envoi » de Gmail, à l'échelle d'un courrier.
 */
const DELAI_POUR_RETENIR_MS = 60 * 60 * 1000;
/**
 * Le délai laissé au client par la lettre officielle, quand le gérant n'en a pas
 * choisi : le même que celui que propose l'écran (`DELAI_DE_RELANCE_PAR_DEFAUT`,
 * dans `app/gestes-dossier.tsx`).
 */
const DELAI_LETTRE_PAR_DEFAUT = 8;

/** Le pilote de l'établissement, créé à son premier réveil. */
async function piloteDe(
	ctx: MutationCtx,
	organizationId: Id<'organizations'>
): Promise<Doc<'pilotes'>> {
	const existant = await ctx.db
		.query('pilotes')
		.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
		.first();
	if (existant !== null) return existant;
	const id = await ctx.db.insert('pilotes', { organizationId });
	return (await ctx.db.get(id))!;
}

/**
 * RÉVEILLER LE PILOTE — à appeler après tout changement qui compte.
 *
 * ⚠️ IL NE VEILLE PAS LUI-MÊME : il programme une veille à court délai, et ne
 * la programme pas deux fois. L'appelant (un import, un rapprochement) ne paie
 * donc rien, et dix rapprochements d'affilée font une seule veille.
 */
export const reveiller = internalMutation({
	args: { organizationId: v.id('organizations') },
	returns: v.null(),
	handler: async (ctx, { organizationId }): Promise<null> => {
		const pilote = await piloteDe(ctx, organizationId);
		const maintenant = Date.now();
		if (
			pilote.veilleProgrammee !== undefined &&
			pilote.veilleProgrammeePour !== undefined &&
			pilote.veilleProgrammeePour > maintenant - VEILLE_PERDUE_MS
		) {
			return null;
		}
		const veille = await ctx.scheduler.runAfter(
			DELAI_REVEIL_MS,
			internal.recouvrement.pilote.veiller,
			{ organizationId }
		);
		await ctx.db.patch(pilote._id, {
			veilleProgrammee: veille,
			veilleProgrammeePour: maintenant + DELAI_REVEIL_MS
		});
		return null;
	}
});

/**
 * LA VEILLE — ce que le pilote fait à chaque réveil.
 *
 * ⚠️ CHAQUE TÂCHE DANS SA PROPRE TRANSACTION. Le relevé du jour lit toute la
 * surveillance, la pose des propositions aussi : les enchaîner dans une seule
 * mutation doublerait les lectures d'une transaction et la rapprocherait de la
 * limite de documents lus. Programmées séparément, une tâche qui tombe
 * n'emporte pas les autres.
 */
export const veiller = internalMutation({
	args: { organizationId: v.id('organizations') },
	returns: v.null(),
	handler: async (ctx, { organizationId }): Promise<null> => {
		const pilote = await piloteDe(ctx, organizationId);
		const jour = new Date().toISOString().slice(0, 10);

		/*
		  1. LE RELEVÉ DU JOUR — briefing par courriel, notifications. Il ne se joue
		  qu'une fois par jour (`executerPourOrganisation` refuse de rejouer) : la
		  première veille après minuit UTC le fait, plus un cron à 6 h.
		*/
		const releve = await ctx.db
			.query('battements')
			.withIndex('by_org_and_jour', (q) => q.eq('organizationId', organizationId).eq('jour', jour))
			.first();
		if (releve === null) {
			await ctx.scheduler.runAfter(0, internal.recouvrement.battement.executerPourOrganisation, {
				organizationId,
				jour
			});
		}

		/*
		  2. LES PROPOSITIONS, DÈS QU'ELLES EXISTENT. La pose tient son plafond sur
		  la journée entière (`dejaCeJour`) et ne repose jamais ce qu'elle a déjà
		  posé : on peut l'appeler à chaque veille sans rien doubler.
		*/
		await ctx.scheduler.runAfter(0, internal.recouvrement.pilote.poserPropositions, {
			organizationId,
			jour
		});

		// 3. LES DOSSIERS QUI NAISSENT SEULS : une facture échue entre dans le
		//    dossier de son client, ouvert s'il n'existe pas.
		await ctx.scheduler.runAfter(0, internal.recouvrement.pilote.ouvrirLesDossiers, {
			organizationId,
			jour
		});

		// 4. LES RELANCES DU JOUR — seulement si le gérant a laissé le pilote relancer.
		if (pilote.envoiAutomatique === true) {
			await ctx.scheduler.runAfter(0, internal.recouvrement.pilote.programmerLesRelances, {
				organizationId,
				jour
			});
		}

		await ctx.db.patch(pilote._id, {
			veilleProgrammee: undefined,
			veilleProgrammeePour: undefined,
			derniereVeille: Date.now()
		});
		return null;
	}
});

export const poserPropositions = internalMutation({
	args: { organizationId: v.id('organizations'), jour: v.string() },
	returns: v.null(),
	handler: async (ctx, { organizationId, jour }): Promise<null> => {
		const flux = await ctx.runQuery(internal.recouvrement.surveillance.fluxInterne, {
			organizationId,
			aujourdHui: jour
		});
		await ctx.runMutation(internal.recouvrement.propositions.poserLesPropositionsDuJour, {
			organizationId,
			jour,
			evenements: flux.evenements
		});
		return null;
	}
});

/**
 * TOUTES LES QUINZE MINUTES, chaque établissement se réveille : c'est ce qui
 * fait avancer ce que seul le temps change.
 *
 * ⚠️ UN RÉVEIL PAR ÉTABLISSEMENT, PAS UNE VEILLE GÉANTE : une organisation qui
 * échoue n'emporte pas les suivantes. Et le réveil se coalesce : un
 * établissement qui vient d'être réveillé par un dépôt ne veille pas deux fois.
 */
export const reveillerTous = internalMutation({
	args: {},
	returns: v.null(),
	handler: async (ctx): Promise<null> => {
		// ⚠️ LECTURE NON BORNÉE, ASSUMÉE COMME DANS `battement.ts` : une poignée
		// d'organisations aujourd'hui. Paginer le jour où leur nombre approche la
		// limite de documents lus par transaction.
		const organisations = await ctx.db.query('organizations').take(1000);
		for (const organisation of organisations) {
			await ctx.scheduler.runAfter(0, internal.recouvrement.pilote.reveiller, {
				organizationId: organisation._id
			});
		}
		return null;
	}
});

// ─────────────────────────────────────────────────────────────────────────
// LES TRAVAUX — ce que le pilote fait, étape par étape
// ─────────────────────────────────────────────────────────────────────────

type Etape = Doc<'travauxPilote'>['etapes'][number];
type Effet = NonNullable<Etape['effet']>;

/**
 * COMMENCER UN TRAVAIL — ou le mettre en file derrière celui qui tourne.
 *
 * `bilan` est la ligne qui restera quand tout sera coché : on sait, au départ,
 * ce que le travail va produire.
 */
export async function commencerTravail(
	ctx: MutationCtx,
	travail: {
		readonly organizationId: Id<'organizations'>;
		readonly genre: Doc<'travauxPilote'>['genre'];
		readonly titre: string;
		readonly etapes: readonly { readonly libelle: string; readonly effet?: Effet }[];
		readonly bilan: string;
	}
): Promise<Id<'travauxPilote'>> {
	const tourne = await ctx.db
		.query('travauxPilote')
		.withIndex('by_org_and_etat', (q) =>
			q.eq('organizationId', travail.organizationId).eq('etat', 'EN_COURS')
		)
		.first();
	const id = await ctx.db.insert('travauxPilote', {
		organizationId: travail.organizationId,
		genre: travail.genre,
		titre: travail.titre,
		etapes: travail.etapes.map((etape) => ({
			libelle: etape.libelle,
			...(etape.effet === undefined ? {} : { effet: etape.effet })
		})),
		etat: tourne === null ? 'EN_COURS' : 'EN_ATTENTE',
		bilan: travail.bilan,
		commenceLe: Date.now()
	});
	if (tourne === null) {
		await ctx.scheduler.runAfter(CADENCE_MS, internal.recouvrement.pilote.avancerTravail, {
			travailId: id
		});
	}
	return id;
}

/**
 * L'EFFET D'UNE ÉTAPE, au moment où elle se coche.
 *
 * ⚠️ IL RELIT AVANT D'ÉCRIRE. Entre la veille qui a décidé et l'étape qui
 * s'exécute, quelques secondes ont passé : le gérant a pu ouvrir le dossier à
 * la main, un virement a pu solder une facture. Chaque effet reprend l'état du
 * moment, et ne fait que ce qui reste à faire.
 */
async function executerEffet(
	ctx: MutationCtx,
	organizationId: Id<'organizations'>,
	effet: Effet
): Promise<void> {
	switch (effet.genre) {
		case 'OUVRIR_DOSSIER': {
			const libres: Id<'facturesVente'>[] = [];
			for (const factureId of effet.factureIds) {
				const facture = await ctx.db.get(factureId);
				if (
					facture !== null &&
					facture.organizationId === organizationId &&
					facture.creanceId === undefined &&
					facture.statutPaiement !== 'SOLDEE'
				) {
					libres.push(factureId);
				}
			}
			if (libres.length === 0) return;
			const creanceId = await ctx.runMutation(internal.recouvrement.creances.creerCreance, {
				organizationId,
				factureIds: libres,
				aujourdHui: new Date().toISOString().slice(0, 10)
			});
			// ⚠️ PRÉPARÉ, PAS DÉMARRÉ : rien ne part tant que le gérant ne l'a pas démarré.
			await ctx.db.patch(creanceId, { aDemarrer: true });
			/*
			  ⚠️ LE DOSSIER DIT QUI L'A OUVERT. Sans cette ligne, la frise du dossier
			  commençait au premier geste du gérant, et un dossier ouvert par le pilote
			  semblait sorti de nulle part — exactement ce qui fait tout revérifier.
			*/
			let total = 0n;
			for (const factureId of libres) {
				const facture = await ctx.db.get(factureId);
				if (facture !== null) total += facture.montantTTC;
			}
			await ctx.db.insert('journal', {
				organizationId,
				cible: creanceId as string,
				cle: 'OUVERT_PAR_LE_PILOTE',
				avant: 'aucun dossier pour ces factures',
				apres:
					`Plume a préparé ce dossier : ${libres.length} facture${pluriel(libres.length)} ` +
					`échue${pluriel(libres.length)}, ${versEuros(depuisCentimes(total))} €. Il attend que vous le démarriez.`,
				source: 'Le pilote, à l’échéance',
				auteur: 'MACHINE',
				consigneLe: Date.now()
			});
			return;
		}
		case 'RATTACHER_AU_DOSSIER': {
			const creance = await ctx.db.get(effet.creanceId);
			// Le dossier a été classé ou engagé entre-temps : on n'y ajoute rien, la
			// facture attendra la prochaine veille, qui en ouvrira un autre.
			if (creance === null || creance.statut === 'CLOSE' || creance.engageeLe !== undefined) return;
			const libres: Id<'facturesVente'>[] = [];
			for (const factureId of effet.factureIds) {
				const facture = await ctx.db.get(factureId);
				if (
					facture !== null &&
					facture.debiteurId === creance.debiteurId &&
					facture.creanceId === undefined &&
					facture.statutPaiement !== 'SOLDEE'
				) {
					libres.push(factureId);
				}
			}
			if (libres.length === 0) return;
			await rattacherFactures(ctx, {
				organizationId,
				creanceId: effet.creanceId,
				factureIds: libres,
				par: {
					auteur: 'MACHINE',
					source: 'Le pilote, à l’échéance',
					phrase: 'rejoint le dossier : elle a passé son échéance sans être réglée.'
				}
			});
			return;
		}
		case 'PROGRAMMER_RELANCE':
			await programmerUneRelance(ctx, organizationId, effet.creanceId, effet.etape);
			return;
		case 'ENVOYER':
			await envoyerMaintenant(ctx, effet.envoiId);
			return;
		case 'DEMARRER_DOSSIER':
			await marquerDemarre(ctx, organizationId, effet.creanceId, effet.par);
			return;
	}
}

/**
 * DÉMARRER UN DOSSIER — ce que fait « Démarrer », seul ou en lot.
 *
 * ⚠️ LE JOURNAL LE PORTE AU NOM DU GÉRANT : c'est lui qui a décidé de démarrer,
 * même quand Plume coche l'étape. Un dossier déjà démarré, classé ou d'un autre
 * établissement ne bouge pas.
 */
export async function marquerDemarre(
	ctx: MutationCtx,
	organizationId: Id<'organizations'>,
	creanceId: Id<'creances'>,
	par: string
): Promise<boolean> {
	const creance = await ctx.db.get(creanceId);
	if (creance === null || creance.organizationId !== organizationId) return false;
	if (creance.aDemarrer !== true || creance.statut === 'CLOSE') return false;
	await ctx.db.patch(creanceId, { aDemarrer: undefined });
	await ctx.db.insert('journal', {
		organizationId,
		cible: creanceId as string,
		cle: 'DOSSIER_DEMARRE',
		avant: 'préparé par Plume',
		apres: 'Vous avez démarré ce dossier : Plume suit son plan de relance.',
		source: 'Votre démarrage',
		auteur: 'GERANT',
		auteurUserId: par,
		consigneLe: Date.now()
	});
	return true;
}

/**
 * COCHER L'ÉTAPE SUIVANTE — et faire ce qu'elle dit.
 *
 * ⚠️ UN EFFET QUI ÉCHOUE MET LE TRAVAIL EN ÉCHEC, IL NE LE LAISSE PAS TOURNER.
 * Un travail resté « en cours » pour toujours dirait au gérant que le pilote
 * travaille quand il est arrêté — le pire état possible. Les effets relisent et
 * valident AVANT d'écrire, donc un échec ne laisse rien à moitié écrit.
 */
export const avancerTravail = internalMutation({
	args: { travailId: v.id('travauxPilote') },
	returns: v.null(),
	handler: async (ctx, { travailId }): Promise<null> => {
		const travail = await ctx.db.get(travailId);
		if (travail === null || travail.etat !== 'EN_COURS') return null;

		const rang = travail.etapes.findIndex((etape) => etape.faiteLe === undefined);
		let fini = rang < 0;
		if (!fini) {
			const etape = travail.etapes[rang]!;
			if (etape.effet !== undefined) {
				try {
					await executerEffet(ctx, travail.organizationId, etape.effet);
				} catch (erreur) {
					await ctx.db.patch(travailId, {
						etat: 'ECHEC',
						erreur: erreur instanceof Error ? erreur.message : String(erreur),
						termineLe: Date.now()
					});
					await demarrerLeSuivant(ctx, travail.organizationId);
					return null;
				}
			}
			const etapes = travail.etapes.map((e, i) => (i === rang ? { ...e, faiteLe: Date.now() } : e));
			fini = rang === etapes.length - 1;
			await ctx.db.patch(travailId, {
				etapes,
				...(fini ? { etat: 'FAIT' as const, termineLe: Date.now() } : {})
			});
		} else {
			await ctx.db.patch(travailId, { etat: 'FAIT', termineLe: Date.now() });
		}

		if (fini) {
			await demarrerLeSuivant(ctx, travail.organizationId);
			// Des dossiers viennent de s'ouvrir : leurs relances se programment tout de
			// suite, pas au prochain quart d'heure.
			if (travail.genre === 'DOSSIERS') {
				await ctx.scheduler.runAfter(0, internal.recouvrement.pilote.reveiller, {
					organizationId: travail.organizationId
				});
			}
		} else {
			await ctx.scheduler.runAfter(CADENCE_MS, internal.recouvrement.pilote.avancerTravail, {
				travailId
			});
		}
		return null;
	}
});

/** Le travail qui attendait le plus longtemps démarre quand le précédent finit. */
async function demarrerLeSuivant(
	ctx: MutationCtx,
	organizationId: Id<'organizations'>
): Promise<void> {
	const suivant = await ctx.db
		.query('travauxPilote')
		.withIndex('by_org_and_etat', (q) =>
			q.eq('organizationId', organizationId).eq('etat', 'EN_ATTENTE')
		)
		.first();
	if (suivant === null) return;
	await ctx.db.patch(suivant._id, { etat: 'EN_COURS', commenceLe: Date.now() });
	await ctx.scheduler.runAfter(CADENCE_MS, internal.recouvrement.pilote.avancerTravail, {
		travailId: suivant._id
	});
}

// ─────────────────────────────────────────────────────────────────────────
// LES DOSSIERS QUI NAISSENT SEULS (P2)
// ─────────────────────────────────────────────────────────────────────────

/**
 * OUVRIR LES DOSSIERS DES CLIENTS EN RETARD — sans que le gérant ait rien touché.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QU'IL REMPLACE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * « Lancer un dossier », client par client, depuis sa fiche : le premier geste
 * de tout le parcours, et le premier que les applications du marché ne
 * demandent pas. Une facture qui passe son échéance entre dans le dossier de son
 * client ; s'il n'en a pas d'ouvert, le pilote l'ouvre.
 *
 * ⚠️ CE QU'IL NE TOUCHE PAS
 *
 *   · un client que le gérant a retiré du pilote (`horsPilote`) ;
 *   · une facture en litige, ou déjà dans un dossier ;
 *   · un dossier classé ou porté devant un professionnel : une nouvelle facture
 *     y ouvrirait un autre dossier, jamais ne s'y glisserait ;
 *   · un client déjà dans un travail qui attend : deux travaux ne se disputent
 *     pas le même dossier.
 */
export const ouvrirLesDossiers = internalMutation({
	args: { organizationId: v.id('organizations'), jour: v.string() },
	returns: v.null(),
	handler: async (ctx, { organizationId, jour }): Promise<null> => {
		const enRetard: Doc<'facturesVente'>[] = [];
		for (const statut of ['IMPAYEE', 'PARTIELLEMENT_PAYEE'] as const) {
			const factures = await ctx.db
				.query('facturesVente')
				.withIndex('by_org_and_statut', (q) =>
					q.eq('organizationId', organizationId).eq('statutPaiement', statut)
				)
				.collect();
			for (const facture of factures) {
				const exigible = facture.dateExigibilite ?? facture.dateEcheance;
				if (facture.creanceId === undefined && exigible !== undefined && exigible < jour) {
					enRetard.push(facture);
				}
			}
		}
		if (enRetard.length === 0) return null;

		// Les clients déjà dans un travail qui tourne ou qui attend.
		const occupes = new Set<string>();
		for (const etat of ['EN_COURS', 'EN_ATTENTE'] as const) {
			const travaux = await ctx.db
				.query('travauxPilote')
				.withIndex('by_org_and_etat', (q) =>
					q.eq('organizationId', organizationId).eq('etat', etat)
				)
				.collect();
			for (const travail of travaux) {
				for (const etape of travail.etapes) {
					if (etape.faiteLe !== undefined || etape.effet === undefined) continue;
					if (etape.effet.genre === 'OUVRIR_DOSSIER') occupes.add(etape.effet.debiteurId);
					if (etape.effet.genre === 'RATTACHER_AU_DOSSIER') {
						const creance = await ctx.db.get(etape.effet.creanceId);
						if (creance !== null) occupes.add(creance.debiteurId);
					}
				}
			}
		}

		const parClient = new Map<Id<'debiteurs'>, Doc<'facturesVente'>[]>();
		for (const facture of enRetard) {
			if (occupes.has(facture.debiteurId)) continue;
			const siennes = parClient.get(facture.debiteurId) ?? [];
			siennes.push(facture);
			parClient.set(facture.debiteurId, siennes);
		}

		const etapes: { libelle: string; effet: Effet }[] = [];
		let ouverts = 0;
		let ajoutees = 0;
		for (const [debiteurId, factures] of parClient) {
			if (etapes.length >= CLIENTS_PAR_TRAVAIL) break;
			const debiteur = await ctx.db.get(debiteurId);
			if (debiteur === null || debiteur.horsPilote === true) continue;

			const dossiers = await ctx.db
				.query('creances')
				.withIndex('by_debiteur', (q) => q.eq('debiteurId', debiteurId))
				.collect();
			const ouvert = dossiers.find((c) => c.statut !== 'CLOSE' && c.engageeLe === undefined);
			const total = factures.reduce((somme, f) => somme + f.montantTTC, 0n);
			const combien = `${factures.length} facture${pluriel(factures.length)}, ${versEuros(depuisCentimes(total))} €`;
			const factureIds = factures.map((f) => f._id);

			if (ouvert === undefined) {
				etapes.push({
					libelle: `Ouvre le dossier de ${debiteur.denomination} : ${combien}`,
					effet: { genre: 'OUVRIR_DOSSIER', debiteurId, factureIds }
				});
				ouverts += 1;
			} else {
				etapes.push({
					libelle: `Ajoute au dossier de ${debiteur.denomination} : ${combien}`,
					effet: { genre: 'RATTACHER_AU_DOSSIER', creanceId: ouvert._id, factureIds }
				});
				ajoutees += factures.length;
			}
		}
		if (etapes.length === 0) return null;

		const morceaux = [
			ouverts === 0 ? null : `${ouverts} dossier${pluriel(ouverts)} ouvert${pluriel(ouverts)}`,
			ajoutees === 0
				? null
				: `${ajoutees} facture${pluriel(ajoutees)} ajoutée${pluriel(ajoutees)} à un dossier`
		].filter((m): m is string => m !== null);

		await commencerTravail(ctx, {
			organizationId,
			genre: 'DOSSIERS',
			titre:
				ouverts > 0
					? 'Ouvre les dossiers de vos clients en retard'
					: 'Range les nouvelles factures en retard',
			etapes,
			bilan: `${morceaux.join(', ')}.`
		});
		return null;
	}
});

// ─────────────────────────────────────────────────────────────────────────
// LES RELANCES QUI PARTENT SEULES (P3)
// ─────────────────────────────────────────────────────────────────────────

/*
  ⚠️ LA DÉCISION DU 08/10/2026, ET CE QU'ELLE CHANGE.

  Jusqu'ici, rien ne partait sans que le gérant ait validé le document : le
  logiciel préparait, le gérant validait puis envoyait lui-même. Le fondateur a
  tranché : « on fait comme Qonto et les autres, on s'autorise à relancer
  automatiquement ». Pennylane, Qonto et Upflow envoient les relances de leurs
  clients depuis leur plateforme, au nom de ces clients.

  Ce que le pilote garde de l'ancienne règle :
    · rien ne part tant qu'un ADMINISTRATEUR n'a pas activé les relances
      (`activerRelances`), une fois, après avoir lu ce qui partira ;
    · chaque relance est visible et RETENABLE pendant une heure avant de partir ;
    · elle part au nom du créancier, et les réponses arrivent à SON adresse ;
    · un client en procédure collective ou radié ne se relance pas ;
    · rien ne va vers un tribunal ni chez un avocat sans le gérant : l'étape
      « remise à votre conseil » n'est jamais automatique.
*/

const NOM_DE_L_ETAPE: Readonly<Record<'RAPPEL' | 'SECOND_RAPPEL' | 'LETTRE_OFFICIELLE', string>> = {
	RAPPEL: 'le rappel',
	SECOND_RAPPEL: 'le deuxième rappel',
	LETTRE_OFFICIELLE: 'la lettre officielle'
};

type EtapeEnvoyable = 'RAPPEL' | 'SECOND_RAPPEL' | 'LETTRE_OFFICIELLE';

function estEnvoyable(cle: string): cle is EtapeEnvoyable {
	return cle === 'RAPPEL' || cle === 'SECOND_RAPPEL' || cle === 'LETTRE_OFFICIELLE';
}

type Composee =
	| {
			readonly ok: true;
			readonly modele: 'RAPPEL' | 'RELANCE_OFFICIELLE';
			readonly objet: string;
			readonly corps: string;
			readonly resume: readonly string[];
			readonly choix: string;
			readonly decompteId: Id<'decomptes'> | null;
	  }
	| { readonly ok: false; readonly manques: readonly string[] };

/**
 * LA LETTRE D'UNE ÉTAPE, COMPOSÉE COMME À LA MAIN — et ce qui l'empêche, nommé.
 *
 * ⚠️ LES MÊMES GABARITS QUE LE GÉRANT : le rappel de niveau 1 (`relance.ts`),
 * la lettre officielle des courriers (`envois.ts`, `composer`). Le pilote
 * n'écrit aucune phrase à lui.
 *
 * ⚠️ ET CE QUI MANQUE POUR ENVOYER EST COMPTÉ ICI, PAS DÉCOUVERT À L'ENVOI :
 * l'adresse du client, la vôtre pour les réponses, et pour la lettre officielle
 * un décompte arrêté (les trois points que seul le gérant connaît).
 */
async function composerEtape(
	ctx: MutationCtx,
	organizationId: Id<'organizations'>,
	creance: Doc<'creances'>,
	debiteur: Doc<'debiteurs'>,
	etape: EtapeEnvoyable,
	aujourdHui: string
): Promise<Composee> {
	const profil = await ctx.db
		.query('profilsCreancier')
		.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
		.first();
	const manques: string[] = [];
	if (debiteur.email === undefined || debiteur.email === '') {
		manques.push(`l’adresse e-mail de ${debiteur.denomination} (sa fiche)`);
	}
	if (profil?.email === undefined || profil.email === '') {
		manques.push('votre adresse e-mail pour les réponses (Mon compte, vos courriers)');
	}
	if (profil?.denomination === undefined || profil.denomination === '') {
		manques.push('le nom de votre entreprise (Mon compte)');
	}

	if (etape === 'LETTRE_OFFICIELLE') {
		const choix: ChoixCourrier = {
			modele: 'RELANCE_OFFICIELLE',
			delaiJours: profil?.delaiRelanceParDefautJours ?? DELAI_LETTRE_PAR_DEFAUT,
			suite: 'SUITE_GENERALE',
			modalite:
				profil?.iban !== undefined && profil.iban !== '' ? 'VIREMENT_IBAN' : 'SELON_FACTURES',
			reserveIndemnisationComplementaire: false
		};
		const { composition, decompteId } = await composer(
			ctx,
			organizationId,
			creance._id,
			choix,
			aujourdHui
		);
		if (!composition.ok) return { ok: false, manques: [...manques, ...composition.manques] };
		if (manques.length > 0) return { ok: false, manques };
		return {
			ok: true,
			modele: 'RELANCE_OFFICIELLE',
			objet: composition.objet,
			corps: composition.corps,
			resume: composition.resume,
			choix: JSON.stringify(choix),
			decompteId
		};
	}

	const toutes = await ctx.db
		.query('facturesVente')
		.withIndex('by_creance', (q) => q.eq('creanceId', creance._id))
		.collect();
	const factures = toutes.filter((f) => f.statutPaiement !== 'SOLDEE');
	const restes = await Promise.all(factures.map((f) => resteDu(ctx, f)));
	// Le rappel qui reprend après une promesse non couverte la cite (`parole.ts`).
	const parole = await paroleDuDossier(ctx, creance._id, toutes);
	const promesse = promesseACiter({
		promesses: parole.promesses,
		echeanciers: parole.echeanciers,
		reglements: parole.reglements,
		aujourdHui,
		resteDu: parole.resteDu
	});
	const relance = composerRelance(1, {
		creancier: profil?.denomination ?? '',
		debiteur: debiteur.denomination,
		factures: factures.map((f) => ({
			reference: f.reference,
			montantTTC: depuisCentimes(f.montantTTC),
			dateEcheance: f.dateEcheance
		})),
		principalRestantDu: restes.length > 0 ? additionner(...restes) : ZERO,
		santeDebiteur: debiteur.santeFinanciere,
		constatRegistre: debiteur.constatRegistre,
		aujourdHui,
		rang: etape === 'SECOND_RAPPEL' ? 2 : 1,
		...(promesse === null
			? {}
			: {
					promesseManquee: {
						le: promesse.le,
						...(promesse.montant === undefined
							? {}
							: { montant: depuisCentimes(promesse.montant) })
					}
				})
	});
	if (!relance.disponible) return { ok: false, manques: [...manques, relance.constat] };
	if (manques.length > 0) return { ok: false, manques };
	return {
		ok: true,
		modele: 'RAPPEL',
		objet: relance.objet,
		corps: relance.corps,
		resume: factures.map(
			(f) => `Facture ${f.reference}, ${versEuros(depuisCentimes(f.montantTTC))} €`
		),
		choix: JSON.stringify({ modele: 'RAPPEL', rang: etape === 'SECOND_RAPPEL' ? 2 : 1 }),
		decompteId: null
	};
}

/**
 * DIRE AU GÉRANT CE QUI MANQUE — une fois, dans sa boîte de réception.
 *
 * ⚠️ PAS DEUX FOIS LA MÊME. Une notification non lue sur le même dossier, avec
 * le même message, suffit : la répéter à chaque quart d'heure en ferait du bruit.
 */
async function signalerCeQuiManque(
	ctx: MutationCtx,
	organizationId: Id<'organizations'>,
	creanceId: Id<'creances'>,
	debiteurId: Id<'debiteurs'> | null,
	client: string,
	etape: EtapeEnvoyable,
	manques: readonly string[]
): Promise<void> {
	/*
	  ⚠️ LA NOTIFICATION MÈNE LÀ OÙ ÇA SE RÉPARE (08/10/2026) : la fiche du client
	  pour son adresse, votre compte pour la vôtre, l'arrêt pour un décompte. Elle
	  menait au dossier, qui ne permet de réparer aucun des trois.
	*/
	const lien =
		debiteurId !== null && manques.some((manque) => manque.includes('(sa fiche)'))
			? `/app/clients/${debiteurId}`
			: manques.some((manque) => manque.includes('(Mon compte'))
				? '/app/compte'
				: manques.some((manque) => manque.includes('décompte'))
					? `/app/arret/${creanceId}`
					: `/app/dossier/${creanceId}`;
	const message = `Pour ${NOM_DE_L_ETAPE[etape]} de ${client}, il manque ${manques.join(', ')}.`;
	const deja = await ctx.db
		.query('notifications')
		.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
		.collect();
	if (
		deja.some(
			(n) => n.type === 'PILOTE_BLOQUE' && n.link === lien && n.message === message && !n.isRead
		)
	) {
		return;
	}
	const membres = await ctx.db
		.query('organizationMembers')
		.withIndex('by_organization', (q) => q.eq('organizationId', organizationId))
		.collect();
	for (const membre of membres) {
		await ctx.runMutation(internal.notifications.createNotification, {
			organizationId,
			userId: membre.userId,
			type: 'PILOTE_BLOQUE',
			title: 'Plume a besoin de vous',
			message,
			link: lien
		});
	}
}

/**
 * LES RELANCES DU JOUR — ce que le pilote programme à cette veille.
 *
 * ⚠️ IL NE PROGRAMME QUE CE QUI EST DÛ, DANS L'ORDRE DU PLAN, ET RIEN D'AUTRE :
 *   · un dossier classé, confié à un professionnel, ou dont le client est retiré
 *     du pilote, en procédure collective ou radié, ne se relance pas ;
 *   · un dossier qui a déjà un courrier en attente (programmé, ou préparé à la
 *     main et pas encore validé) attend que celui-là soit parti ;
 *   · ce qui manque pour envoyer se signale au gérant, une fois.
 */
export const programmerLesRelances = internalMutation({
	args: { organizationId: v.id('organizations'), jour: v.string() },
	returns: v.null(),
	handler: async (ctx, { organizationId, jour }): Promise<null> => {
		const pilote = await piloteDe(ctx, organizationId);
		if (pilote.envoiAutomatique !== true) return null;

		const occupes = new Set<string>();
		for (const etat of ['EN_COURS', 'EN_ATTENTE'] as const) {
			const travaux = await ctx.db
				.query('travauxPilote')
				.withIndex('by_org_and_etat', (q) =>
					q.eq('organizationId', organizationId).eq('etat', etat)
				)
				.collect();
			for (const travail of travaux) {
				for (const etape of travail.etapes) {
					if (etape.faiteLe === undefined && etape.effet?.genre === 'PROGRAMMER_RELANCE') {
						occupes.add(etape.effet.creanceId);
					}
				}
			}
		}

		const creances = await ctx.db
			.query('creances')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();
		const etapes: { libelle: string; effet: Effet }[] = [];
		for (const creance of creances) {
			if (etapes.length >= RELANCES_PAR_TRAVAIL) break;
			if (creance.statut === 'CLOSE' || creance.engageeLe !== undefined) continue;
			// Préparé par Plume, pas encore démarré : rien ne part.
			if (creance.aDemarrer === true) continue;
			if (occupes.has(creance._id)) continue;
			const debiteur = await ctx.db.get(creance.debiteurId);
			if (debiteur === null || debiteur.horsPilote === true) continue;
			if (
				debiteur.santeFinanciere === 'PROCEDURE_COLLECTIVE' ||
				debiteur.santeFinanciere === 'RADIEE'
			) {
				continue;
			}

			const envois = await ctx.db
				.query('envois')
				.withIndex('by_creance', (q) => q.eq('creanceId', creance._id))
				.collect();
			if (envois.some((e) => e.etat === 'PROGRAMME' || e.etat === 'A_VALIDER')) continue;

			const factures = await ctx.db
				.query('facturesVente')
				.withIndex('by_creance', (q) => q.eq('creanceId', creance._id))
				.collect();
			const plan = await planDuDossier(ctx, creance, factures, jour, envois);
			if (plan === null || !plan.prochaine.due) continue;
			const cle = plan.prochaine.etape.cle;
			// La remise au conseil n'est jamais automatique : la carte du dossier la
			// porte avec la pastille des questions, et c'est le gérant qui décide.
			if (!plan.prochaine.etape.automatique || !estEnvoyable(cle)) continue;

			const essai = await composerEtape(ctx, organizationId, creance, debiteur, cle, jour);
			if (!essai.ok) {
				await signalerCeQuiManque(
					ctx,
					organizationId,
					creance._id,
					debiteur._id,
					debiteur.denomination,
					cle,
					essai.manques
				);
				continue;
			}
			etapes.push({
				libelle: `Prépare ${NOM_DE_L_ETAPE[cle]} de ${debiteur.denomination}`,
				effet: { genre: 'PROGRAMMER_RELANCE', creanceId: creance._id, etape: cle }
			});
		}
		if (etapes.length === 0) return null;

		await commencerTravail(ctx, {
			organizationId,
			genre: 'RELANCES',
			titre: 'Prépare les relances du jour',
			etapes,
			bilan:
				`${etapes.length} relance${pluriel(etapes.length)} programmée${pluriel(etapes.length)}, ` +
				'à retenir pendant une heure avant leur départ.'
		});
		return null;
	}
});

/** Au plus tant de relances par travail, comme pour les dossiers. */
const RELANCES_PAR_TRAVAIL = 25;

/**
 * PROGRAMMER UNE RELANCE — l'effet de l'étape « Prépare le rappel de Durand ».
 *
 * ⚠️ IL RELIT TOUT, COMME TOUS LES EFFETS : un paiement arrivé, un client retiré
 * du pilote, une étape déjà faite entre la décision et maintenant, et rien n'est
 * programmé. Ce qui manque désormais se signale ; rien ne lève, pour ne pas
 * arrêter les relances des autres clients du même travail.
 */
async function programmerUneRelance(
	ctx: MutationCtx,
	organizationId: Id<'organizations'>,
	creanceId: Id<'creances'>,
	etape: string
): Promise<void> {
	if (!estEnvoyable(etape)) return;
	const creance = await ctx.db.get(creanceId);
	if (creance === null || creance.statut === 'CLOSE' || creance.engageeLe !== undefined) return;
	if (creance.aDemarrer === true) return;
	const debiteur = await ctx.db.get(creance.debiteurId);
	if (debiteur === null || debiteur.horsPilote === true) return;
	const jour = new Date().toISOString().slice(0, 10);
	const factures = await ctx.db
		.query('facturesVente')
		.withIndex('by_creance', (q) => q.eq('creanceId', creanceId))
		.collect();
	const plan = await planDuDossier(ctx, creance, factures, jour);
	if (plan === null || !plan.prochaine.due || plan.prochaine.etape.cle !== etape) return;

	const lettre = await composerEtape(ctx, organizationId, creance, debiteur, etape, jour);
	if (!lettre.ok) {
		await signalerCeQuiManque(
			ctx,
			organizationId,
			creanceId,
			debiteur._id,
			debiteur.denomination,
			etape,
			lettre.manques
		);
		return;
	}

	const partiraLe = prochainCreneauDEnvoi(Date.now() + DELAI_POUR_RETENIR_MS);
	const envoiId = await ctx.db.insert('envois', {
		organizationId,
		creanceId,
		modele: lettre.modele,
		...(lettre.decompteId === null ? {} : { decompteId: lettre.decompteId }),
		destinataire: debiteur.email!,
		canal: 'MESSAGERIE',
		objet: lettre.objet,
		corps: lettre.corps,
		resume: [...lettre.resume],
		choix: lettre.choix,
		etat: 'PROGRAMME',
		preparePar: 'pilote',
		prepareLe: Date.now(),
		etapePlan: etape,
		partiraLe
	});
	const depart = await ctx.scheduler.runAt(partiraLe, internal.recouvrement.pilote.lancerEnvoi, {
		envoiId
	});
	await ctx.db.patch(envoiId, { envoiProgramme: depart });
}

/**
 * PRÉPARER LA PROCHAINE RELANCE, À LA DEMANDE DU GÉRANT — le geste « Relancer » que
 * Plume propose dans la conversation d'un dossier.
 *
 * ⚠️ ELLE N'EST PAS PROGRAMMÉE, ELLE ATTEND SA RELECTURE. Comme tout courrier
 * demandé à la main, elle se pose « à valider » dans le dossier : le gérant la relit,
 * la valide, puis l'envoie. Seul ce que le plan fait seul part seul.
 *
 * ⚠️ C'EST L'ÉTAPE SUIVANTE DU PLAN, MÊME SI SON JOUR N'EST PAS ARRIVÉ : le gérant
 * qui demande « relance-le » veut relancer maintenant. Le rappel courtois si rien
 * n'est parti, le deuxième rappel ensuite, la lettre officielle après ; jamais la
 * remise au conseil, qui reste sa décision.
 */
export async function preparerProchaineRelance(
	ctx: MutationCtx,
	organizationId: Id<'organizations'>,
	creanceId: Id<'creances'>,
	par: string
): Promise<
	| { readonly ok: true; readonly envoiId: Id<'envois'>; readonly etape: string }
	| { readonly ok: false; readonly raison: string }
> {
	const creance = await ctx.db.get(creanceId);
	if (creance === null || creance.organizationId !== organizationId) {
		return { ok: false, raison: 'Ce dossier est introuvable.' };
	}
	const debiteur = await ctx.db.get(creance.debiteurId);
	if (debiteur === null) return { ok: false, raison: 'Ce client est introuvable.' };
	if (
		debiteur.santeFinanciere === 'PROCEDURE_COLLECTIVE' ||
		debiteur.santeFinanciere === 'RADIEE'
	) {
		return {
			ok: false,
			raison: 'Ce client est en procédure collective ou radié : les relances sont suspendues.'
		};
	}
	const envois = await ctx.db
		.query('envois')
		.withIndex('by_creance', (q) => q.eq('creanceId', creanceId))
		.collect();
	if (envois.some((e) => e.etat === 'A_VALIDER' || e.etat === 'PROGRAMME')) {
		return { ok: false, raison: 'Une relance attend déjà sur ce dossier : celle-là d’abord.' };
	}
	const jour = new Date().toISOString().slice(0, 10);
	const factures = await ctx.db
		.query('facturesVente')
		.withIndex('by_creance', (q) => q.eq('creanceId', creanceId))
		.collect();
	const plan = await planDuDossier(ctx, creance, factures, jour, envois);
	if (plan === null) return { ok: false, raison: 'Ce dossier n’a plus d’étape de relance.' };
	const cle = plan.prochaine.etape.cle;
	if (!estEnvoyable(cle)) {
		return {
			ok: false,
			raison: 'L’étape suivante est la remise à votre conseil : c’est vous qui la décidez.'
		};
	}
	const lettre = await composerEtape(ctx, organizationId, creance, debiteur, cle, jour);
	if (!lettre.ok) return { ok: false, raison: `Il manque ${lettre.manques.join(', ')}.` };
	const envoiId = await ctx.db.insert('envois', {
		organizationId,
		creanceId,
		modele: lettre.modele,
		...(lettre.decompteId === null ? {} : { decompteId: lettre.decompteId }),
		destinataire: debiteur.email!,
		canal: 'MESSAGERIE',
		objet: lettre.objet,
		corps: lettre.corps,
		resume: [...lettre.resume],
		choix: lettre.choix,
		etat: 'A_VALIDER',
		preparePar: par,
		prepareLe: Date.now(),
		etapePlan: cle
	});
	return { ok: true, envoiId, etape: NOM_DE_L_ETAPE[cle] };
}

/** L'adresse d'où partent les relances, et le nom du créancier devant. */
function expediteurPour(denomination: string): string {
	const brute =
		process.env.RELANCES_EMAIL ?? requireEnv('AUTH_EMAIL', { feature: 'relances du pilote' });
	const adresse = /<([^>]+)>/.exec(brute)?.[1] ?? brute.trim();
	const nom = denomination.replace(/["<>]/g, '').trim();
	return `"${nom}" <${adresse}>`;
}

/**
 * L'HEURE DU DÉPART EST ARRIVÉE — le pilote le montre, puis envoie.
 *
 * ⚠️ SANS L'ENVOI CONFIGURÉ, LA RELANCE REDEVIENT UN COURRIER À VALIDER. Une
 * clé d'envoi absente ne doit ni laisser la relance « programmée » pour toujours
 * (le plan la croirait partie), ni la jeter : elle attend le gérant, qui le sait.
 */
export const lancerEnvoi = internalMutation({
	args: { envoiId: v.id('envois') },
	returns: v.null(),
	handler: async (ctx, { envoiId }): Promise<null> => {
		const envoi = await ctx.db.get(envoiId);
		if (envoi === null || envoi.etat !== 'PROGRAMME') return null;
		const creance = await ctx.db.get(envoi.creanceId);
		const debiteur = creance === null ? null : await ctx.db.get(creance.debiteurId);
		const client = debiteur?.denomination ?? 'ce client';

		const configure =
			process.env.AUTH_E2E_TEST_SECRET === undefined &&
			process.env.RESEND_API_KEY !== undefined &&
			(process.env.RELANCES_EMAIL !== undefined || process.env.AUTH_EMAIL !== undefined);
		if (!configure) {
			await ctx.db.patch(envoiId, { etat: 'A_VALIDER', envoiProgramme: undefined });
			if (envoi.etapePlan !== undefined) {
				await signalerCeQuiManque(
					ctx,
					envoi.organizationId,
					envoi.creanceId,
					creance?.debiteurId ?? null,
					client,
					envoi.etapePlan,
					[
						'l’envoi des e-mails, qui n’est pas configuré : la relance attend votre validation dans le dossier'
					]
				);
			}
			return null;
		}

		const nom = envoi.etapePlan === undefined ? 'la relance' : NOM_DE_L_ETAPE[envoi.etapePlan];
		await commencerTravail(ctx, {
			organizationId: envoi.organizationId,
			genre: 'RELANCES',
			titre: `Envoie ${nom} à ${client}`,
			etapes: [
				{ libelle: 'Vérifie qu’aucun paiement n’est arrivé' },
				{ libelle: 'Relit le texte, tel qu’il a été programmé' },
				{ libelle: `Envoie à ${envoi.destinataire}`, effet: { genre: 'ENVOYER', envoiId } }
			],
			bilan: `${nom.charAt(0).toUpperCase()}${nom.slice(1)} est parti chez ${client}.`
		});
		return null;
	}
});

/**
 * ENVOYER — l'effet de la dernière étape.
 *
 * ⚠️ UN PAIEMENT ARRIVÉ ENTRE-TEMPS ARRÊTE TOUT. Ce qui reste dû se relit au
 * moment du départ : une relance pour une facture payée dans l'heure est la
 * pire erreur d'un logiciel de recouvrement.
 */
async function envoyerMaintenant(ctx: MutationCtx, envoiId: Id<'envois'>): Promise<void> {
	const envoi = await ctx.db.get(envoiId);
	if (envoi === null || envoi.etat !== 'PROGRAMME') return;
	const creance = await ctx.db.get(envoi.creanceId);
	const debiteur = creance === null ? null : await ctx.db.get(creance.debiteurId);
	if (
		creance === null ||
		debiteur === null ||
		creance.statut === 'CLOSE' ||
		creance.engageeLe !== undefined ||
		debiteur.horsPilote === true
	) {
		await ctx.db.patch(envoiId, { etat: 'ABANDONNE', envoiProgramme: undefined });
		return;
	}
	const factures = await ctx.db
		.query('facturesVente')
		.withIndex('by_creance', (q) => q.eq('creanceId', creance._id))
		.collect();
	const restes = await Promise.all(factures.map((f) => resteDu(ctx, f)));
	const reste = enCentimes(restes.length > 0 ? additionner(...restes) : ZERO);
	if (reste <= 0n) {
		await ctx.db.patch(envoiId, { etat: 'ABANDONNE', envoiProgramme: undefined });
		return;
	}
	// Le client a donné sa parole entre la programmation et le départ : la
	// relance du pilote ne part pas (`parole.ts`). Celle du gérant, si.
	if (
		envoi.preparePar === 'pilote' &&
		(await pauseDuDossier(ctx, creance._id, factures, new Date().toISOString().slice(0, 10))) !==
			null
	) {
		await ctx.db.patch(envoiId, { etat: 'ABANDONNE', envoiProgramme: undefined });
		return;
	}
	const profil = await ctx.db
		.query('profilsCreancier')
		.withIndex('by_org', (q) => q.eq('organizationId', envoi.organizationId))
		.first();
	if (profil?.email === undefined || profil.email === '') {
		throw new ConvexError('Il manque votre adresse e-mail pour les réponses.');
	}

	assertResendApiKey();
	await resend.sendEmail(ctx, {
		from: expediteurPour(profil.denomination),
		to: envoi.destinataire,
		subject: envoi.objet,
		text: envoi.corps,
		html: relanceHtml(envoi.corps),
		replyTo: [profil.email]
	});
	await ctx.db.patch(envoiId, {
		etat: 'PARTI',
		partiLe: new Date().toISOString().slice(0, 10),
		empreinte: sha256(envoi.corps),
		validePar: 'pilote',
		valideLe: Date.now(),
		envoiProgramme: undefined
	});
}

/**
 * RETENIR UNE RELANCE PROGRAMMÉE — le geste qui reste au gérant.
 *
 * ⚠️ RETENIR RETIRE LE CLIENT DU PILOTE. Annuler seulement cette relance la
 * ferait reprogrammer au quart d'heure suivant ; le gérant qui retient dit qu'il
 * garde ce client en main. Il le rend au pilote depuis sa fiche.
 */
export const retenir = authedMutation({
	args: { envoiId: v.id('envois') },
	returns: v.null(),
	handler: async (ctx, { envoiId }): Promise<null> => {
		const { organizationId } = await getUserOrg(ctx);
		const envoi = await ctx.db.get(envoiId);
		if (envoi === null || envoi.organizationId !== organizationId) {
			throw new ConvexError('Relance introuvable');
		}
		if (envoi.etat !== 'PROGRAMME') {
			throw new ConvexError(
				'Cette relance n’est plus programmée : elle est partie, ou déjà retenue.'
			);
		}
		if (envoi.envoiProgramme !== undefined) await ctx.scheduler.cancel(envoi.envoiProgramme);
		await ctx.db.patch(envoiId, { etat: 'ABANDONNE', envoiProgramme: undefined });
		const creance = await ctx.db.get(envoi.creanceId);
		if (creance !== null) await ctx.db.patch(creance.debiteurId, { horsPilote: true });
		return null;
	}
});

/**
 * LAISSER LE PILOTE RELANCER — l'activation, une fois, par un administrateur.
 *
 * ⚠️ UN ADMINISTRATEUR, COMME POUR VALIDER UN COURRIER : c'est la même
 * responsabilité, prise une fois pour toutes les relances du plan au lieu d'une
 * fois par lettre. L'écran montre avant ce qui partira, à qui, d'où et quand.
 */
export const activerRelances = authedMutation({
	args: { actif: v.boolean() },
	returns: v.null(),
	handler: async (ctx, { actif }): Promise<null> => {
		const { organizationId, user } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);
		const pilote = await piloteDe(ctx, organizationId);
		await ctx.db.patch(pilote._id, {
			envoiAutomatique: actif,
			...(actif ? { activeLe: Date.now(), activePar: user._id } : {})
		});
		if (actif) {
			await ctx.scheduler.runAfter(0, internal.recouvrement.pilote.reveiller, { organizationId });
		}
		return null;
	}
});

// ─────────────────────────────────────────────────────────────────────────
// APRÈS UN DÉPÔT — la relecture, montrée
// ─────────────────────────────────────────────────────────────────────────

/**
 * CE QUE LE PILOTE A RELU DANS UN DÉPÔT, étape par étape.
 *
 * ⚠️ DES FAITS, PAS UN DÉCOR. Chaque étape dit un nombre qui vient de la base
 * au moment de la relecture : ce qui est entré, combien de clients, combien de
 * factures sont déjà en retard. L'animation est le rythme ; le contenu est vrai.
 */
export const relireApresImport = internalMutation({
	args: {
		organizationId: v.id('organizations'),
		facturesCreees: v.number(),
		reglementsCrees: v.number(),
		debiteursTouches: v.array(v.id('debiteurs'))
	},
	returns: v.null(),
	handler: async (
		ctx,
		{ organizationId, facturesCreees, reglementsCrees, debiteursTouches }
	): Promise<null> => {
		if (facturesCreees === 0 && reglementsCrees === 0) {
			await ctx.runMutation(internal.recouvrement.pilote.reveiller, { organizationId });
			return null;
		}
		const aujourdHui = new Date().toISOString().slice(0, 10);

		let enRetard = 0;
		const clientsEnRetard = new Set<string>();
		for (const debiteurId of debiteursTouches) {
			const factures = await ctx.db
				.query('facturesVente')
				.withIndex('by_debiteur', (q) => q.eq('debiteurId', debiteurId))
				.collect();
			for (const facture of factures) {
				const exigible = facture.dateExigibilite ?? facture.dateEcheance;
				if (
					facture.statutPaiement !== 'SOLDEE' &&
					exigible !== undefined &&
					exigible < aujourdHui
				) {
					enRetard += 1;
					clientsEnRetard.add(debiteurId);
				}
			}
		}

		const lu =
			facturesCreees > 0
				? `${facturesCreees} facture${pluriel(facturesCreees)}` +
					(reglementsCrees > 0 ? ` et ${reglementsCrees} règlement${pluriel(reglementsCrees)}` : '')
				: `${reglementsCrees} règlement${pluriel(reglementsCrees)}`;
		const clients = debiteursTouches.length;
		const nbClientsEnRetard = clientsEnRetard.size;

		await commencerTravail(ctx, {
			organizationId,
			genre: 'RELECTURE',
			titre: 'Relit votre dépôt',
			etapes: [
				{ libelle: `Lit ${lu}` },
				{ libelle: `Range par client : ${clients} client${pluriel(clients)}` },
				{
					libelle:
						enRetard === 0
							? 'Cherche les retards : aucune facture échue'
							: `Repère ${enRetard} facture${pluriel(enRetard)} en retard`
				},
				{ libelle: 'Met à jour les dates limites pour agir' }
			],
			bilan:
				enRetard === 0
					? 'Rien en retard dans ce dépôt.'
					: `${enRetard} facture${pluriel(enRetard)} en retard chez ${nbClientsEnRetard} client${pluriel(nbClientsEnRetard)}.`
		});

		await ctx.runMutation(internal.recouvrement.pilote.reveiller, { organizationId });
		return null;
	}
});

// ─────────────────────────────────────────────────────────────────────────
// CE QUE L'ÉCRAN LIT
// ─────────────────────────────────────────────────────────────────────────

const vTravail = v.object({
	id: v.id('travauxPilote'),
	genre: v.union(
		v.literal('RELECTURE'),
		v.literal('DOSSIERS'),
		v.literal('RELANCES'),
		v.literal('PAIEMENTS')
	),
	titre: v.string(),
	etapes: v.array(v.object({ libelle: v.string(), faite: v.boolean() })),
	etat: v.union(
		v.literal('EN_ATTENTE'),
		v.literal('EN_COURS'),
		v.literal('FAIT'),
		v.literal('ECHEC')
	),
	bilan: v.union(v.string(), v.null()),
	commenceLe: v.number(),
	termineLe: v.union(v.number(), v.null())
});

/**
 * LE PILOTE, VU DE L'ÉCRAN : ce qu'il fait maintenant, et ce qu'il vient de faire.
 *
 * ⚠️ `derniereVeille` À `null` SE DIT « PAS ENCORE », JAMAIS « TOUT VA BIEN ». Un
 * établissement dont le pilote ne s'est jamais réveillé n'est pas surveillé.
 */
export const etat = authedQuery({
	args: {},
	returns: v.object({
		derniereVeille: v.union(v.number(), v.null()),
		travaux: v.array(vTravail),
		/** Le gérant a laissé le pilote relancer seul. */
		envoiAutomatique: v.boolean(),
		/** Quand les relances ont été activées, et si c'est par ce compte : la trace de l'engagement. */
		activeLe: v.union(v.number(), v.null()),
		activeParVous: v.boolean(),
		/** Ce compte peut activer ou couper les relances : un administrateur. */
		peutActiver: v.boolean(),
		/** Les dossiers que Plume a préparés et qui attendent d'être démarrés. */
		aDemarrer: v.number(),
		/** Les relances programmées, la plus proche d'abord : ce qui part bientôt. */
		programmes: v.array(
			v.object({
				envoiId: v.id('envois'),
				creanceId: v.id('creances'),
				client: v.string(),
				etape: v.string(),
				partiraLe: v.number()
			})
		)
	}),
	handler: async (ctx) => {
		const { organizationId, user } = await getUserOrg(ctx);
		const membre = await ctx.db
			.query('organizationMembers')
			.withIndex('by_org_and_user', (q) =>
				q.eq('organizationId', organizationId).eq('userId', user._id)
			)
			.first();
		const enAttente = await ctx.db
			.query('envois')
			.withIndex('by_org_and_etat', (q) =>
				q.eq('organizationId', organizationId).eq('etat', 'PROGRAMME')
			)
			.take(20);
		const programmes = [];
		for (const envoi of enAttente) {
			const creance = await ctx.db.get(envoi.creanceId);
			const debiteur = creance === null ? null : await ctx.db.get(creance.debiteurId);
			programmes.push({
				envoiId: envoi._id,
				creanceId: envoi.creanceId,
				client: debiteur?.denomination ?? 'Client',
				etape:
					PLAN_PAR_DEFAUT.find((e) => e.cle === (envoi.etapePlan as CleEtapePlan | undefined))
						?.nom ?? 'Relance',
				partiraLe: envoi.partiraLe ?? envoi.prepareLe
			});
		}
		programmes.sort((a, b) => a.partiraLe - b.partiraLe);
		const pilote = await ctx.db
			.query('pilotes')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.first();
		const recents = await ctx.db
			.query('travauxPilote')
			.withIndex('by_org_and_commence', (q) => q.eq('organizationId', organizationId))
			.order('desc')
			.take(8);
		const prepares = await ctx.db
			.query('creances')
			.withIndex('by_org_and_aDemarrer', (q) =>
				q.eq('organizationId', organizationId).eq('aDemarrer', true)
			)
			.take(500);
		return {
			aDemarrer: prepares.filter((c) => c.statut !== 'CLOSE').length,
			envoiAutomatique: pilote?.envoiAutomatique === true,
			activeLe: pilote?.activeLe ?? null,
			activeParVous: pilote?.activePar === user._id,
			peutActiver: membre?.role === 'ORG_ADMIN',
			programmes,
			derniereVeille: pilote?.derniereVeille ?? null,
			travaux: recents.map((t) => ({
				id: t._id,
				genre: t.genre,
				titre: t.titre,
				etapes: t.etapes.map((e) => ({ libelle: e.libelle, faite: e.faiteLe !== undefined })),
				etat: t.etat,
				bilan: t.bilan ?? null,
				commenceLe: t.commenceLe,
				termineLe: t.termineLe ?? null
			}))
		};
	}
});
