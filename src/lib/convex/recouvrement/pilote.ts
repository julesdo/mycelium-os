import { v } from 'convex/values';
import { internalMutation } from '../_generated/server';
import type { MutationCtx } from '../_generated/server';
import { internal } from '../_generated/api';
import type { Doc, Id } from '../_generated/dataModel';
import { authedQuery } from '../functions';
import { getUserOrg } from '../lib/auth';
import { pluriel } from '../../socle/francais';
import { depuisCentimes, versEuros } from '../../socle/montants';
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
			await ctx.runMutation(internal.recouvrement.creances.creerCreance, {
				organizationId,
				factureIds: libres,
				aujourdHui: new Date().toISOString().slice(0, 10)
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
			// Les relances du pilote arrivent avec leur propre lot ; aucun travail ne
			// porte encore cet effet. Le dire vaut mieux qu'un succès qui ne fait rien.
			throw new Error('La programmation des relances n’est pas encore branchée.');
	}
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

		if (fini) await demarrerLeSuivant(ctx, travail.organizationId);
		else {
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
				.withIndex('by_org_and_etat', (q) => q.eq('organizationId', organizationId).eq('etat', etat))
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
					(reglementsCrees > 0
						? ` et ${reglementsCrees} règlement${pluriel(reglementsCrees)}`
						: '')
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
		travaux: v.array(vTravail)
	}),
	handler: async (ctx) => {
		const { organizationId } = await getUserOrg(ctx);
		const pilote = await ctx.db
			.query('pilotes')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.first();
		const recents = await ctx.db
			.query('travauxPilote')
			.withIndex('by_org_and_commence', (q) => q.eq('organizationId', organizationId))
			.order('desc')
			.take(8);
		return {
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
