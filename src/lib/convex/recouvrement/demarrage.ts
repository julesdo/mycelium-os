import { v, ConvexError } from 'convex/values';
import { internal } from '../_generated/api';
import type { Doc, Id } from '../_generated/dataModel';
import type { QueryCtx } from '../_generated/server';
import { authedMutation, authedQuery } from '../functions';
import { getUserOrg } from '../lib/auth';
import { additionner, depuisCentimes, enCentimes, versEuros } from '../../socle/montants';
import { pluriel } from '../../socle/francais';
import { dateDuCalendrier } from '../../verticales/recouvrement/compagnon/gestes';
import { vReponseFait } from './tables';
import { resteDu } from './lecture';
import { rattacherFactures } from './arret';
import { planDuDossier } from './plan';
import { commencerTravail } from './pilote';

/**
 * DÉMARRER UN DOSSIER — seul et guidé, ou en lot (08/10/2026).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QUE LE FONDATEUR A DEMANDÉ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * « L'onboarding pour créer un dossier doit être d'une facilité et assisté en
 * mode chat mélangé à un stepper hyper facile […] si on a 40 procédures détectées
 * à démarrer, ça peut être compliqué, donc il faut aussi une solution. »
 *
 *   · SEUL (`/app/demarrer/$id`) : Plume a déjà tout réuni — les factures échues,
 *     l'adresse du client, le plan. Il ne pose que ce qu'il ne peut pas savoir, une
 *     question à la fois, comme Maya chez Lemonade. Tout s'écrit au dernier geste.
 *   · EN LOT (`/app/demarrer`) : les dossiers prêts sont tous cochés, un bouton les
 *     démarre, et Plume les démarre un par un sous les yeux du gérant. Ceux à qui il
 *     manque quelque chose sont rangés à part, avec ce qui manque.
 *
 * ⚠️ DÉMARRER N'ENVOIE RIEN PAR SOI-MÊME. Le dossier entre dans le plan de relance ;
 * ce qui part ensuite suit les règles de toujours (activation des relances, une
 * heure pour retenir, rien vers un tribunal).
 */

const vFactureADemarrer = v.object({
	id: v.id('facturesVente'),
	reference: v.string(),
	montantTTC: v.int64(),
	resteDu: v.int64(),
	echeance: v.union(v.string(), v.null()),
	dansLeDossier: v.boolean()
});

/** Le dossier ouvert d'un client : ni classé, ni porté devant un professionnel. */
async function dossierOuvert(
	ctx: QueryCtx,
	debiteurId: Id<'debiteurs'>
): Promise<Doc<'creances'> | null> {
	const dossiers = await ctx.db
		.query('creances')
		.withIndex('by_debiteur', (q) => q.eq('debiteurId', debiteurId))
		.collect();
	return dossiers.find((c) => c.statut !== 'CLOSE' && c.engageeLe === undefined) ?? null;
}

/**
 * CE QUE PLUME A RÉUNI POUR DÉMARRER LE DOSSIER D'UN CLIENT.
 *
 * Les factures proposées : celles déjà dans son dossier ouvert, et celles qui ont
 * passé leur échéance sans entrer dans aucun dossier. Une facture réglée, ou déjà
 * dans un autre dossier, n'y est pas.
 */
export const preparer = authedQuery({
	args: { debiteurId: v.id('debiteurs') },
	returns: v.union(
		v.null(),
		v.object({
			client: v.object({
				denomination: v.string(),
				email: v.union(v.string(), v.null()),
				suspendu: v.boolean(),
				horsPilote: v.boolean()
			}),
			creancier: v.object({ emailReponses: v.union(v.string(), v.null()) }),
			dossier: v.union(v.null(), v.object({ creanceId: v.id('creances'), aDemarrer: v.boolean() })),
			factures: v.array(vFactureADemarrer),
			envoiAutomatique: v.boolean()
		})
	),
	handler: async (ctx, { debiteurId }) => {
		const { organizationId } = await getUserOrg(ctx);
		const debiteur = await ctx.db.get(debiteurId);
		if (debiteur === null || debiteur.organizationId !== organizationId) return null;
		const aujourdHui = new Date().toISOString().slice(0, 10);
		const ouvert = await dossierOuvert(ctx, debiteurId);
		const factures = await ctx.db
			.query('facturesVente')
			.withIndex('by_debiteur', (q) => q.eq('debiteurId', debiteurId))
			.collect();
		const proposees = [];
		for (const facture of factures) {
			if (facture.organizationId !== organizationId || facture.statutPaiement === 'SOLDEE')
				continue;
			const dansLeDossier = ouvert !== null && facture.creanceId === ouvert._id;
			const exigible = facture.dateExigibilite ?? facture.dateEcheance;
			const libreEtEchue =
				facture.creanceId === undefined && exigible !== undefined && exigible < aujourdHui;
			if (!dansLeDossier && !libreEtEchue) continue;
			proposees.push({
				id: facture._id,
				reference: facture.reference,
				montantTTC: facture.montantTTC,
				resteDu: enCentimes(await resteDu(ctx, facture)),
				echeance: exigible ?? null,
				dansLeDossier
			});
		}
		proposees.sort((a, b) => (a.echeance ?? '').localeCompare(b.echeance ?? ''));
		const profil = await ctx.db
			.query('profilsCreancier')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.first();
		const pilote = await ctx.db
			.query('pilotes')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.first();
		return {
			client: {
				denomination: debiteur.denomination,
				email: debiteur.email === undefined || debiteur.email === '' ? null : debiteur.email,
				suspendu:
					debiteur.santeFinanciere === 'PROCEDURE_COLLECTIVE' ||
					debiteur.santeFinanciere === 'RADIEE',
				horsPilote: debiteur.horsPilote === true
			},
			creancier: {
				emailReponses: profil?.email === undefined || profil.email === '' ? null : profil.email
			},
			dossier:
				ouvert === null ? null : { creanceId: ouvert._id, aDemarrer: ouvert.aDemarrer === true },
			factures: proposees,
			envoiAutomatique: pilote?.envoiAutomatique === true
		};
	}
});

const ADRESSE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * DÉMARRER LE DOSSIER D'UN CLIENT — le dernier geste du démarrage guidé.
 *
 * ⚠️ TOUT S'ÉCRIT ICI, ET SEULEMENT ICI. Les questions de Plume ne touchent à rien
 * tant que le gérant n'a pas appuyé sur « Démarrer » : on peut revenir sur une
 * réponse, quitter, recommencer, sans rien laisser à moitié écrit.
 *
 * ⚠️ UNE CONTESTATION NE BLOQUE RIEN (décision du fondateur, 08/10/2026 : « on ne
 * devrait pas bloquer »). Elle est notée au dossier, et le dossier démarre comme les
 * autres : Plume le suit et le relance selon le plan. Le gérant qui préfère garder
 * ce client en main le retire du pilote, d'un geste ou d'une phrase à Plume.
 */
export const demarrer = authedMutation({
	args: {
		debiteurId: v.id('debiteurs'),
		factureIds: v.array(v.id('facturesVente')),
		email: v.optional(v.string()),
		emailReponses: v.optional(v.string()),
		contestation: vReponseFait,
		avoir: vReponseFait,
		promesse: v.optional(v.object({ date: v.string(), montant: v.int64() }))
	},
	returns: v.object({
		creanceId: v.id('creances'),
		prochaine: v.union(
			v.null(),
			v.object({ nom: v.string(), le: v.string(), automatique: v.boolean() })
		)
	}),
	handler: async (
		ctx,
		args
	): Promise<{
		creanceId: Id<'creances'>;
		prochaine: { nom: string; le: string; automatique: boolean } | null;
	}> => {
		const { organizationId, user } = await getUserOrg(ctx);
		const debiteur = await ctx.db.get(args.debiteurId);
		if (debiteur === null || debiteur.organizationId !== organizationId) {
			throw new ConvexError('Ce client est introuvable.');
		}
		const aujourdHui = new Date().toISOString().slice(0, 10);
		const ouvert = await dossierOuvert(ctx, args.debiteurId);

		// Les factures choisies : de ce client, non réglées, libres ou déjà dans son dossier.
		const choisies: Doc<'facturesVente'>[] = [];
		for (const factureId of args.factureIds) {
			const facture = await ctx.db.get(factureId);
			if (
				facture === null ||
				facture.organizationId !== organizationId ||
				facture.debiteurId !== args.debiteurId ||
				facture.statutPaiement === 'SOLDEE'
			) {
				continue;
			}
			if (facture.creanceId !== undefined && facture.creanceId !== ouvert?._id) continue;
			choisies.push(facture);
		}
		if (ouvert === null && choisies.length === 0) {
			throw new ConvexError('Choisissez au moins une facture à réclamer.');
		}

		// Les adresses, quand le gérant les a données.
		const email = args.email?.trim() ?? '';
		if (email !== '') {
			if (!ADRESSE.test(email))
				throw new ConvexError(`« ${email} » ne ressemble pas à une adresse électronique.`);
			await ctx.db.patch(debiteur._id, { email, emailSource: 'SAISIE' });
		}
		const emailReponses = args.emailReponses?.trim() ?? '';
		if (emailReponses !== '') {
			if (!ADRESSE.test(emailReponses)) {
				throw new ConvexError(`« ${emailReponses} » ne ressemble pas à une adresse électronique.`);
			}
			const profil = await ctx.db
				.query('profilsCreancier')
				.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
				.first();
			if (profil !== null)
				await ctx.db.patch(profil._id, { email: emailReponses, majLe: Date.now() });
		}

		// Le dossier : celui qui existe, complété, ou un nouveau.
		let creanceId: Id<'creances'>;
		if (ouvert !== null) {
			creanceId = ouvert._id;
			const libres = choisies.filter((f) => f.creanceId === undefined).map((f) => f._id);
			if (libres.length > 0) {
				await rattacherFactures(ctx, {
					organizationId,
					creanceId,
					factureIds: libres,
					par: {
						auteur: 'GERANT',
						userId: user._id,
						source: 'Votre démarrage du dossier',
						phrase: 'rejoint le dossier : vous l’avez choisie en le démarrant.'
					}
				});
			}
			if (ouvert.aDemarrer === true) await ctx.db.patch(creanceId, { aDemarrer: undefined });
		} else {
			creanceId = await ctx.runMutation(internal.recouvrement.creances.creerCreance, {
				organizationId,
				factureIds: choisies.map((f) => f._id),
				aujourdHui
			});
		}

		// Ce que le gérant seul pouvait dire.
		await ctx.runMutation(internal.recouvrement.creances.declarerFaitLitige, {
			creanceId,
			cle: 'CONTESTATION_ECRITE',
			reponse: args.contestation,
			aujourdHui
		});
		await ctx.runMutation(internal.recouvrement.creances.declarerFaitLitige, {
			creanceId,
			cle: 'AVOIR_RECLAME',
			reponse: args.avoir,
			aujourdHui
		});
		if (args.promesse !== undefined) {
			if (!dateDuCalendrier(args.promesse.date) || args.promesse.montant <= 0n) {
				throw new ConvexError('Cette promesse est incomplète : il manque son jour ou son montant.');
			}
			await ctx.db.insert('suiviDossier', {
				organizationId,
				creanceId,
				genre: 'PROMESSE',
				texte: 'Promesse de paiement, notée au démarrage',
				montantPromis: args.promesse.montant,
				promisPourLe: args.promesse.date,
				auteurUserId: user._id,
				ecritLe: Date.now()
			});
		}

		const total = choisies.reduce((somme, f) => somme + f.montantTTC, 0n);
		await ctx.db.insert('journal', {
			organizationId,
			cible: creanceId as string,
			cle: 'DOSSIER_DEMARRE_GUIDE',
			apres:
				`Vous avez démarré ce dossier avec Plume : ${choisies.length} facture${pluriel(choisies.length)}, ` +
				`${versEuros(depuisCentimes(total))} €.`,
			source: 'Votre démarrage du dossier',
			auteur: 'GERANT',
			auteurUserId: user._id,
			consigneLe: Date.now()
		});

		// Plume reprend tout de suite : la première relance se programme maintenant.
		await ctx.scheduler.runAfter(0, internal.recouvrement.pilote.reveiller, { organizationId });

		const creance = (await ctx.db.get(creanceId))!;
		const factures = await ctx.db
			.query('facturesVente')
			.withIndex('by_creance', (q) => q.eq('creanceId', creanceId))
			.collect();
		const plan = await planDuDossier(ctx, creance, factures, aujourdHui);
		return {
			creanceId,
			prochaine:
				plan === null
					? null
					: {
							nom: plan.prochaine.etape.nom,
							le: plan.prochaine.le,
							automatique: plan.prochaine.etape.automatique
						}
		};
	}
});

/**
 * LES DOSSIERS QUE PLUME A PRÉPARÉS, et ce qui manque à chacun pour partir.
 *
 * ⚠️ « PRÊT » VEUT DIRE QUE PLUME PEUT LE RELANCER : l'adresse du client est
 * connue, et il n'est ni en procédure collective ni radié. Le reste attend une
 * réponse du gérant, et la liste dit laquelle.
 */
export const lot = authedQuery({
	args: {},
	returns: v.object({
		emailReponsesConnu: v.boolean(),
		dossiers: v.array(
			v.object({
				creanceId: v.id('creances'),
				debiteurId: v.id('debiteurs'),
				client: v.string(),
				restantDu: v.int64(),
				nombreFactures: v.number(),
				manque: v.union(v.string(), v.null())
			})
		)
	}),
	handler: async (ctx) => {
		const { organizationId } = await getUserOrg(ctx);
		const prepares = (
			await ctx.db
				.query('creances')
				.withIndex('by_org_and_aDemarrer', (q) =>
					q.eq('organizationId', organizationId).eq('aDemarrer', true)
				)
				.take(500)
		).filter((c) => c.statut !== 'CLOSE');
		const dossiers = [];
		for (const creance of prepares) {
			const debiteur = await ctx.db.get(creance.debiteurId);
			if (debiteur === null) continue;
			const factures = await ctx.db
				.query('facturesVente')
				.withIndex('by_creance', (q) => q.eq('creanceId', creance._id))
				.collect();
			const restes = await Promise.all(factures.map((f) => resteDu(ctx, f)));
			const suspendu =
				debiteur.santeFinanciere === 'PROCEDURE_COLLECTIVE' ||
				debiteur.santeFinanciere === 'RADIEE';
			dossiers.push({
				creanceId: creance._id,
				debiteurId: debiteur._id,
				client: debiteur.denomination,
				restantDu: enCentimes(additionner(...restes)),
				nombreFactures: factures.length,
				manque: suspendu
					? 'En procédure collective ou radié'
					: debiteur.email === undefined || debiteur.email === ''
						? 'Il me manque son adresse e-mail'
						: null
			});
		}
		dossiers.sort((a, b) => Number(b.restantDu - a.restantDu));
		const profil = await ctx.db
			.query('profilsCreancier')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.first();
		return {
			emailReponsesConnu: profil?.email !== undefined && profil.email !== '',
			dossiers
		};
	}
});

/** Au plus tant de dossiers par travail : une liste plus longue se démarre en deux fois. */
const DOSSIERS_PAR_LOT = 100;

/**
 * DÉMARRER EN LOT — Plume les démarre un par un, sous les yeux du gérant.
 *
 * ⚠️ UN TRAVAIL VISIBLE, PAS UNE BOUCLE MUETTE. Quarante dossiers qui passent d'un
 * coup à « démarré » se revérifient un par un ; quarante étapes qui se cochent se
 * croient (le fondateur : « rendre le travail de l'IA visible »).
 */
export const demarrerEnLot = authedMutation({
	args: { creanceIds: v.array(v.id('creances')) },
	returns: v.number(),
	handler: async (ctx, { creanceIds }): Promise<number> => {
		const { organizationId, user } = await getUserOrg(ctx);
		const etapes = [];
		for (const creanceId of creanceIds.slice(0, DOSSIERS_PAR_LOT)) {
			const creance = await ctx.db.get(creanceId);
			if (creance === null || creance.organizationId !== organizationId) continue;
			if (creance.aDemarrer !== true || creance.statut === 'CLOSE') continue;
			const debiteur = await ctx.db.get(creance.debiteurId);
			etapes.push({
				libelle: `Démarre le dossier de ${debiteur?.denomination ?? 'ce client'}`,
				effet: { genre: 'DEMARRER_DOSSIER' as const, creanceId, par: user._id }
			});
		}
		if (etapes.length === 0) return 0;
		await commencerTravail(ctx, {
			organizationId,
			genre: 'DOSSIERS',
			titre: `Démarre ${etapes.length} dossier${pluriel(etapes.length)}`,
			etapes,
			bilan: `${etapes.length} dossier${pluriel(etapes.length)} démarré${pluriel(etapes.length)} : je suis leur plan de relance.`
		});
		return etapes.length;
	}
});
