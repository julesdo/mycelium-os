import { v } from 'convex/values';
import { internalMutation, internalQuery } from '../_generated/server';
import type { Id } from '../_generated/dataModel';
import { authedQuery } from '../functions';
import { getUserOrg } from '../lib/auth';
import { ZERO, additionner, depuisCentimes, enCentimes, versEuros } from '../../socle/montants';
import { pluriel } from '../../socle/francais';
import { etatDuReferentiel } from '../../verticales/recouvrement/referentiel';
import { jourEnClair } from '../../verticales/recouvrement/compagnon/gestes';
import { PLAN_PAR_DEFAUT, type CleEtapePlan } from '../../verticales/recouvrement/plan-relance';
import { lignesDesDossiers, resteDu } from './lecture';
import {
	compteurDepuis,
	cumulDuMois,
	documentsDuTour,
	lireLEtatDuDossier,
	moisCourant,
	vCompteur
} from './conversationLecture';
import { vDocumentJoint, vGestePropose, vSourceConstat } from './tables';
import { vResume } from '../coffre/coffre';

/**
 * PLUME SUR TOUT L'ÉTABLISSEMENT — ce qui se lit et s'écrit autour de la conversation
 * hors dossier (12/10/2026). L'appel au modèle vit dans `conversation.ts` (`"use
 * node"`) ; ici, la base, cloisonnée par `getUserOrg` au point de lecture.
 *
 * ⚠️ LE FIL DE L'ÉTABLISSEMENT EST UN FIL COMME LES AUTRES (`echangesCompagnon`,
 * portée `PORTEFEUILLE`) : son identifiant est celui de l'établissement, et son
 * compteur est le même plafond mensuel que celui des dossiers.
 */

/** Combien de dossiers le contexte liste un à un ; les autres se disent en une ligne. */
const DOSSIERS_LISTES = 60;
const CLIENTS_LISTES = 20;

const JOUR = new Intl.DateTimeFormat('fr-FR', {
	weekday: 'long',
	day: 'numeric',
	month: 'long',
	timeZone: 'UTC'
});
const jour = (iso: string) => JOUR.format(new Date(`${iso}T00:00:00.000Z`));
const euros = (centimes: bigint) => `${versEuros(depuisCentimes(centimes))} €`;

const vContexte = v.object({
	etablissement: v.string(),
	aujourdHui: v.string(),
	enBref: v.array(v.string()),
	dossiers: v.array(
		v.object({
			id: v.string(),
			clientId: v.string(),
			client: v.string(),
			ligne: v.string(),
			signaux: v.array(v.string())
		})
	),
	dossiersNonListes: v.number(),
	clientsSansDossier: v.array(v.object({ id: v.string(), client: v.string(), ligne: v.string() })),
	partentBientot: v.array(v.string()),
	valeurs: v.array(
		v.object({
			cle: v.string(),
			source: v.string(),
			verifieLe: v.string(),
			verifie: v.boolean(),
			valideParAvocat: v.boolean()
		})
	),
	echanges: v.array(
		v.object({ role: v.union(v.literal('GERANT'), v.literal('COMPAGNON')), texte: v.string() })
	)
});

/**
 * L'ÉTABLISSEMENT, TEL QUE PLUME A LE DROIT DE LE VOIR : ses dossiers ouverts (les
 * mêmes chiffres que l'écran Dossiers, `lignesDesDossiers`), les clients en retard
 * hors dossier, ce qui part bientôt, le référentiel et le fil.
 *
 * ⚠️ TOUT MONTANT PART EN TOUTES LETTRES, DÉJÀ RENDU, et ne sert qu'à choisir les
 * dossiers dont on parle : Plume n'en écrit aucun (`prompt-etablissement.ts`).
 */
export const contexteDeLEtablissement = internalQuery({
	args: { toursRepris: v.number() },
	returns: v.object({
		contexte: vContexte,
		compteur: vCompteur,
		connus: v.object({ dossiers: v.array(v.string()), clients: v.array(v.string()) })
	}),
	handler: async (ctx, { toursRepris }) => {
		const { organizationId } = await getUserOrg(ctx);
		const mois = moisCourant();
		const aujourdHui = new Date().toISOString().slice(0, 10);

		const profil = await ctx.db
			.query('profilsCreancier')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.first();
		const organisation = await ctx.db.get(organizationId);
		const pilote = await ctx.db
			.query('pilotes')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.first();

		const lignes = await lignesDesDossiers(ctx, organizationId);
		const ouverts = lignes.filter(
			(ligne) => !ligne.classe && ligne.etape !== 'REGLE' && ligne.principalRestantDu > 0n
		);
		const listes = ouverts.slice(0, DOSSIERS_LISTES);

		const dossiers = await Promise.all(
			listes.map(async (ligne) => {
				const creance = await ctx.db.get(ligne._id);
				const debiteur = await ctx.db.get(ligne.debiteurId);
				const signaux: string[] = [];
				if (ligne.aDemarrer) signaux.push('préparé, attend que le dirigeant le démarre');
				if (
					debiteur?.santeFinanciere === 'PROCEDURE_COLLECTIVE' ||
					debiteur?.santeFinanciere === 'RADIEE'
				) {
					signaux.push('client en procédure collective ou radié : relances suspendues');
				}
				if (debiteur?.horsPilote === true)
					signaux.push('retiré du pilote : Plume ne le relance pas');
				if (debiteur?.email === undefined || debiteur.email === '')
					signaux.push('adresse e-mail du client inconnue');
				if (
					(creance?.faitsLitige ?? []).some(
						(fait) => fait.cle === 'CONTESTATION_ECRITE' && fait.reponse === 'OUI'
					)
				) {
					signaux.push('le client conteste (noté, rien ne s’arrête)');
				}
				if (ligne.courrierAValider) signaux.push('un courrier attend la relecture du dirigeant');
				const pause = ligne.prochaineEtape?.pause;
				if (pause !== undefined) {
					signaux.push(
						pause.raison === 'PROMESSE'
							? `promesse de paiement pour le ${jour(pause.le)}`
							: `paiement en plusieurs fois en cours, prochain versement le ${jour(pause.le)}`
					);
				} else if (ligne.prochaineEtape !== undefined) {
					signaux.push(
						`prochaine étape : ${ligne.prochaineEtape.nom.toLowerCase()}, ${ligne.prochaineEtape.le <= aujourdHui ? 'aujourd’hui' : jour(ligne.prochaineEtape.le)}`
					);
				}
				if (ligne.etape === 'TRIBUNAL') signaux.push('confié à un professionnel');
				else if (ligne.professionnelDesigne) signaux.push('un professionnel est désigné');
				if (ligne.dernierCourrierLe !== undefined)
					signaux.push(`dernier courrier parti le ${jour(ligne.dernierCourrierLe)}`);
				if (ligne.dateLimiteAgir !== undefined)
					signaux.push(`date limite pour agir en justice : ${jour(ligne.dateLimiteAgir)}`);
				return {
					id: ligne._id as string,
					clientId: ligne.debiteurId as string,
					client: ligne.debiteur,
					ligne: `reste à payer ${euros(ligne.principalRestantDu)} sur ${ligne.nombreFactures} facture${pluriel(ligne.nombreFactures)}`,
					signaux
				};
			})
		);

		/*
		  LES CLIENTS EN RETARD HORS DE TOUT DOSSIER : ceux que le gérant garde en main,
		  ou dont la facture vient de passer son échéance. Plume propose de démarrer leur
		  dossier, jamais de l'ouvrir seul.
		*/
		const libres = (
			await ctx.db
				.query('facturesVente')
				.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
				.collect()
		).filter(
			(facture) =>
				facture.creanceId === undefined &&
				facture.statutPaiement !== 'SOLDEE' &&
				facture.dateEcheance !== undefined &&
				facture.dateEcheance < aujourdHui
		);
		const parClient = new Map<Id<'debiteurs'>, typeof libres>();
		for (const facture of libres) {
			parClient.set(facture.debiteurId, [...(parClient.get(facture.debiteurId) ?? []), facture]);
		}
		const clientsSansDossier = (
			await Promise.all(
				[...parClient.entries()].map(async ([debiteurId, factures]) => {
					const debiteur = await ctx.db.get(debiteurId);
					const restes = await Promise.all(factures.map((facture) => resteDu(ctx, facture)));
					const reste = enCentimes(restes.length > 0 ? additionner(...restes) : ZERO);
					return {
						id: debiteurId as string,
						client: debiteur?.denomination ?? 'Client',
						reste,
						ligne: `${factures.length} facture${pluriel(factures.length)} en retard, ${euros(reste)}`
					};
				})
			)
		)
			.filter((client) => client.reste > 0n)
			.sort((a, b) => (b.reste > a.reste ? 1 : b.reste < a.reste ? -1 : 0))
			.slice(0, CLIENTS_LISTES)
			.map(({ id, client, ligne }) => ({ id, client, ligne }));

		const programmes = await ctx.db
			.query('envois')
			.withIndex('by_org_and_etat', (q) =>
				q.eq('organizationId', organizationId).eq('etat', 'PROGRAMME')
			)
			.take(10);
		const partentBientot: string[] = [];
		const dossiersQuiPartent: string[] = [];
		for (const envoi of programmes) {
			const creance = await ctx.db.get(envoi.creanceId);
			const debiteur = creance === null ? null : await ctx.db.get(creance.debiteurId);
			const etape =
				PLAN_PAR_DEFAUT.find((e) => e.cle === (envoi.etapePlan as CleEtapePlan | undefined))?.nom ??
				'Relance';
			const le = new Date(envoi.partiraLe ?? envoi.prepareLe).toISOString().slice(0, 10);
			partentBientot.push(
				`${debiteur?.denomination ?? 'Client'} : ${etape.toLowerCase()}, ${le <= aujourdHui ? 'aujourd’hui' : jour(le)}, sauf si le dirigeant la retient — identifiant DOSSIER : ${envoi.creanceId}`
			);
			dossiersQuiPartent.push(envoi.creanceId);
		}

		const enLecture = (
			await ctx.db
				.query('importsRecouvrement')
				.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
				.order('desc')
				.take(50)
		).filter((depot) => depot.statut === 'EN_ATTENTE' || depot.statut === 'LECTURE').length;

		const total = ouverts.reduce((somme, ligne) => somme + ligne.principalRestantDu, 0n);
		const aDemarrer = ouverts.filter((ligne) => ligne.aDemarrer).length;
		const aRelire = ouverts.filter((ligne) => ligne.courrierAValider).length;
		const enBref = [
			`${ouverts.length} dossier${pluriel(ouverts.length)} ouvert${pluriel(ouverts.length)} ; reste à payer, hors pénalités : ${euros(total)}.`,
			pilote?.envoiAutomatique === true
				? 'Les relances automatiques sont activées : Plume envoie les relances du plan au nom du dirigeant, une heure après les avoir montrées.'
				: 'Les relances automatiques ne sont pas activées : Plume prépare les relances, le dirigeant les relit et les envoie.',
			...(aDemarrer > 0
				? [
						`${aDemarrer} dossier${pluriel(aDemarrer)} préparé${pluriel(aDemarrer)} par Plume attend${aDemarrer > 1 ? 'ent' : ''} que le dirigeant les démarre ; rien ne part avant.`
					]
				: []),
			...(aRelire > 0
				? [
						`${aRelire} courrier${pluriel(aRelire)} attend${aRelire > 1 ? 'ent' : ''} la relecture du dirigeant.`
					]
				: []),
			...(clientsSansDossier.length > 0
				? [
						`${clientsSansDossier.length} client${pluriel(clientsSansDossier.length)} ont des factures en retard hors de tout dossier.`
					]
				: []),
			...(enLecture > 0
				? [`${enLecture} dépôt${pluriel(enLecture)} de factures en cours de lecture au coffre.`]
				: [])
		];

		const echanges = (
			await ctx.db
				.query('echangesCompagnon')
				.withIndex('by_org_and_fil', (q) =>
					q.eq('organizationId', organizationId).eq('fil', organizationId)
				)
				.collect()
		)
			.sort((a, b) => a.diteLe - b.diteLe)
			.slice(-toursRepris)
			.map((tour) => ({ role: tour.role, texte: tour.texte }));

		return {
			contexte: {
				etablissement: profil?.denomination ?? organisation?.name ?? 'Votre établissement',
				aujourdHui: `Aujourd’hui : ${jourEnClair(aujourdHui)} ${aujourdHui.slice(0, 4)} (${aujourdHui}).`,
				enBref,
				dossiers,
				dossiersNonListes: Math.max(0, ouverts.length - listes.length),
				clientsSansDossier,
				partentBientot,
				valeurs: etatDuReferentiel().fiches.map((fiche) => ({
					cle: fiche.cle,
					source: fiche.source,
					verifieLe: fiche.verifieLe,
					verifie: fiche.verifie,
					valideParAvocat: fiche.valideParAvocat
				})),
				echanges
			},
			compteur: compteurDepuis(await cumulDuMois(ctx, organizationId, mois), mois),
			connus: {
				dossiers: [...new Set([...dossiers.map((d) => d.id), ...dossiersQuiPartent])],
				clients: [
					...new Set([...dossiers.map((d) => d.clientId), ...clientsSansDossier.map((c) => c.id)])
				]
			}
		};
	}
});

const vPourGestes = v.object({
	aujourdHui: v.string(),
	restantDu: v.int64(),
	relancable: v.boolean(),
	horsPilote: v.boolean(),
	relanceProgrammee: v.boolean(),
	emailConnu: v.union(v.string(), v.null()),
	contestationDeclaree: v.boolean(),
	ibanConnu: v.boolean(),
	remiseEnCours: v.boolean(),
	arretable: v.boolean(),
	echeancierEnCours: v.optional(v.boolean()),
	classe: v.optional(v.boolean()),
	aDemarrer: v.optional(v.boolean())
});

/**
 * L'ÉTAT DES DOSSIERS QU'UN GESTE VISE, pour le relire avant de l'afficher — par la
 * même fonction que la conversation d'un dossier (`lireLEtatDuDossier`).
 */
export const etatsPourGestes = internalQuery({
	args: { creanceIds: v.array(v.id('creances')) },
	returns: v.array(v.object({ creanceId: v.id('creances'), pourGestes: vPourGestes })),
	handler: async (ctx, { creanceIds }) => {
		const { organizationId } = await getUserOrg(ctx);
		const etats = [];
		for (const creanceId of [...new Set(creanceIds)].slice(0, 6)) {
			const creance = await ctx.db.get(creanceId);
			if (creance === null || creance.organizationId !== organizationId) continue;
			const factures = await ctx.db
				.query('facturesVente')
				.withIndex('by_creance', (q) => q.eq('creanceId', creanceId))
				.collect();
			const debiteur = await ctx.db.get(creance.debiteurId);
			const { pourGestes } = await lireLEtatDuDossier(
				ctx,
				organizationId,
				creance,
				factures,
				debiteur
			);
			etats.push({ creanceId, pourGestes });
		}
		return etats;
	}
});

/**
 * LES DEUX TOURS D'UN ÉCHANGE SUR L'ÉTABLISSEMENT, écrits ensemble — comme sur un
 * dossier (`consignerEchange`), au fil de l'établissement.
 */
export const consignerEchangeEtablissement = internalMutation({
	args: {
		question: v.string(),
		reponse: v.string(),
		phrases: v.optional(
			v.array(v.object({ texte: v.string(), source: v.optional(vSourceConstat) }))
		),
		gestes: v.optional(v.array(vGestePropose)),
		documents: v.optional(v.array(vDocumentJoint)),
		dossiersCites: v.optional(v.array(v.id('creances'))),
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
		const horodatage = Date.now();
		const moisDuTour = moisCourant();
		await ctx.db.insert('echangesCompagnon', {
			organizationId,
			fil: organizationId,
			portee: 'PORTEFEUILLE',
			cible: organizationId,
			role: 'GERANT',
			texte: args.question,
			pastilles: [],
			...(args.documents === undefined || args.documents.length === 0
				? {}
				: { documents: args.documents }),
			mois: moisDuTour,
			diteLe: horodatage
		});
		await ctx.db.insert('echangesCompagnon', {
			organizationId,
			fil: organizationId,
			portee: 'PORTEFEUILLE',
			cible: organizationId,
			role: 'COMPAGNON',
			texte: args.reponse,
			pastilles: [],
			phrases: args.phrases,
			...(args.gestes === undefined || args.gestes.length === 0 ? {} : { gestes: args.gestes }),
			...(args.dossiersCites === undefined || args.dossiersCites.length === 0
				? {}
				: { dossiersCites: args.dossiersCites }),
			usage: args.usage,
			mois: moisDuTour,
			diteLe: horodatage + 1
		});
		return null;
	}
});

/** Combien de tours le fil de l'établissement montre : les plus récents. */
const TOURS_MONTRES = 40;

/**
 * LE FIL DE L'ÉTABLISSEMENT, et où en est le compteur du mois. Les dossiers cités
 * partent en identifiants : l'écran les dessine avec les chiffres de `indexDossiers`,
 * qu'il lit déjà.
 */
export const filDeLEtablissement = authedQuery({
	args: {},
	returns: v.object({
		tours: v.array(
			v.object({
				_id: v.id('echangesCompagnon'),
				role: v.union(v.literal('GERANT'), v.literal('COMPAGNON')),
				texte: v.optional(v.string()),
				phrases: v.optional(
					v.array(v.object({ texte: v.string(), source: v.optional(vSourceConstat) }))
				),
				gestes: v.optional(v.array(vGestePropose)),
				documents: v.optional(
					v.array(v.object({ nom: v.string(), resume: v.union(vResume, v.null()) }))
				),
				dossiersCites: v.optional(v.array(v.id('creances'))),
				diteLe: v.number()
			})
		),
		compteur: vCompteur
	}),
	handler: async (ctx) => {
		const { organizationId } = await getUserOrg(ctx);
		const mois = moisCourant();
		const compteur = compteurDepuis(await cumulDuMois(ctx, organizationId, mois), mois);
		const tours = (
			await ctx.db
				.query('echangesCompagnon')
				.withIndex('by_org_and_fil', (q) =>
					q.eq('organizationId', organizationId).eq('fil', organizationId)
				)
				.collect()
		)
			.sort((a, b) => a.diteLe - b.diteLe)
			.slice(-TOURS_MONTRES);
		return {
			tours: await Promise.all(
				tours.map(async (tour) => {
					const portePhrases = tour.phrases !== undefined && tour.phrases.length > 0;
					return {
						_id: tour._id,
						role: tour.role,
						texte: portePhrases ? undefined : tour.texte,
						phrases: portePhrases ? tour.phrases : undefined,
						gestes: tour.gestes,
						documents: await documentsDuTour(ctx, organizationId, tour.documents),
						dossiersCites: tour.dossiersCites,
						diteLe: tour.diteLe
					};
				})
			),
			compteur
		};
	}
});

/**
 * LES DERNIÈRES CONVERSATIONS SUR UN DOSSIER, pour les reprendre depuis la page de
 * Plume (12/10/2026, sur l'historique de Perplexity et de Fireflies) : le client, la
 * dernière question posée, et quand.
 *
 * ⚠️ LECTURE BORNÉE : les deux cents derniers tours de l'établissement suffisent à
 * trouver les cinq dernières conversations ; une plus ancienne se rouvre depuis son
 * dossier.
 */
export const conversationsRecentes = authedQuery({
	args: {},
	returns: v.array(
		v.object({
			creanceId: v.id('creances'),
			client: v.string(),
			question: v.string(),
			le: v.number()
		})
	),
	handler: async (ctx) => {
		const { organizationId } = await getUserOrg(ctx);
		const tours = await ctx.db
			.query('echangesCompagnon')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.order('desc')
			.take(200);
		const vues = new Set<string>();
		const recentes: { creanceId: Id<'creances'>; client: string; question: string; le: number }[] =
			[];
		for (const tour of tours) {
			if (tour.portee !== 'CREANCE' || tour.role !== 'GERANT' || vues.has(tour.cible)) continue;
			vues.add(tour.cible);
			const creance = await ctx.db.get(tour.cible as Id<'creances'>);
			if (creance === null || creance.organizationId !== organizationId) continue;
			const debiteur = await ctx.db.get(creance.debiteurId);
			recentes.push({
				creanceId: creance._id,
				client: debiteur?.denomination ?? 'Client',
				question:
					tour.texte.trim() === ''
						? `${tour.documents?.length ?? 0} document${(tour.documents?.length ?? 0) > 1 ? 's' : ''} joint${(tour.documents?.length ?? 0) > 1 ? 's' : ''}`
						: tour.texte,
				le: tour.diteLe
			});
			if (recentes.length >= 5) break;
		}
		return recentes;
	}
});
