import { v, ConvexError } from 'convex/values';
import type { MutationCtx } from '../_generated/server';
import { internal } from '../_generated/api';
import type { Doc, Id } from '../_generated/dataModel';
import { authedMutation } from '../functions';
import { getUserOrg } from '../lib/auth';
import { depuisCentimes, versEuros } from '../../socle/montants';
import { dateDuCalendrier, jourEnClair } from '../../verticales/recouvrement/compagnon/gestes';
import { preparerProchaineRelance } from './pilote';
import { arreterLeDecompte } from './arret';
import { ouvrirLaPageDePaiement } from './paiement';
import { declarerLaRemise } from './conseil';
import { apresUneParole } from './parole';

/** Le dernier décompte arrêté d'un dossier, ou `null`. */
async function dernierDecompte(
	ctx: MutationCtx,
	organizationId: Id<'organizations'>,
	creanceId: Id<'creances'>
): Promise<Doc<'decomptes'> | null> {
	const decomptes = (
		await ctx.db
			.query('decomptes')
			.withIndex('by_creance', (q) => q.eq('creanceId', creanceId))
			.collect()
	).filter((d) => d.organizationId === organizationId);
	return decomptes.sort((a, b) => b.arreteAu.localeCompare(a.arreteAu))[0] ?? null;
}

/**
 * LES GESTES DE PLUME, CONFIRMÉS PAR LE GÉRANT (08/10/2026).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ PLUME PROPOSE, LE GÉRANT CONFIRME, ET C'EST LE GÉRANT QUI SIGNE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Un geste proposé dans la conversation d'un dossier n'a aucun effet tant que le
 * gérant n'a pas touché « Confirmer ». Alors seulement il se fait, ici, et il
 * s'inscrit au journal au nom du GÉRANT : c'est lui qui décide, Plume n'est pas un
 * troisième auteur (voir `journal.auteur`).
 *
 * ⚠️ TOUT SE RELIT AU MOMENT DE FAIRE. Entre la proposition et le toucher, le
 * client a pu payer, la relance partir, la date passer. Chaque geste revérifie ce
 * dont il dépend, et dit en clair pourquoi il ne se fait pas.
 *
 * ⚠️ AUCUN APPEL À `internal.recouvrement.gestesPlume.*` : un module qui s'appelle
 * lui-même par `internal` fait retomber le type de `api` entier sur `any`.
 */

type GesteEcrit = NonNullable<Doc<'echangesCompagnon'>['gestes']>[number];

async function leGeste(
	ctx: MutationCtx,
	organizationId: Id<'organizations'>,
	echangeId: Id<'echangesCompagnon'>,
	rang: number
): Promise<{ echange: Doc<'echangesCompagnon'>; geste: GesteEcrit; creance: Doc<'creances'> }> {
	const echange = await ctx.db.get(echangeId);
	if (
		echange === null ||
		echange.organizationId !== organizationId ||
		echange.role !== 'COMPAGNON'
	) {
		throw new ConvexError('Ce geste est introuvable.');
	}
	const geste = echange.gestes?.[rang];
	if (geste === undefined) throw new ConvexError('Ce geste est introuvable.');
	if (geste.etat !== 'PROPOSEE') throw new ConvexError('Ce geste a déjà été tranché.');
	const creance = await ctx.db.get(echange.cible as Id<'creances'>);
	if (creance === null || creance.organizationId !== organizationId) {
		throw new ConvexError('Ce dossier est introuvable.');
	}
	return { echange, geste, creance };
}

async function trancher(
	ctx: MutationCtx,
	echange: Doc<'echangesCompagnon'>,
	rang: number,
	etat: 'FAITE' | 'ECARTEE',
	resultat?: string,
	cible?: string
): Promise<void> {
	const gestes = (echange.gestes ?? []).map((g, i) =>
		i === rang
			? {
					...g,
					etat,
					...(resultat === undefined ? {} : { resultat }),
					...(cible === undefined ? {} : { cible })
				}
			: g
	);
	await ctx.db.patch(echange._id, { gestes });
}

/** Ce que le geste fait, et la phrase qui le dit une fois fait. */
async function faire(
	ctx: MutationCtx,
	organizationId: Id<'organizations'>,
	userId: string,
	geste: GesteEcrit,
	creance: Doc<'creances'>
): Promise<{ resultat: string; cible?: string }> {
	const texte = await faireLeGeste(ctx, organizationId, userId, geste, creance);
	return typeof texte === 'string' ? { resultat: texte } : texte;
}

async function faireLeGeste(
	ctx: MutationCtx,
	organizationId: Id<'organizations'>,
	userId: string,
	geste: GesteEcrit,
	creance: Doc<'creances'>
): Promise<string | { resultat: string; cible: string }> {
	const aujourdHui = new Date().toISOString().slice(0, 10);
	const debiteur = await ctx.db.get(creance.debiteurId);
	if (debiteur === null) throw new ConvexError('Ce client est introuvable.');

	switch (geste.genre) {
		case 'RELANCER': {
			const essai = await preparerProchaineRelance(ctx, organizationId, creance._id, userId);
			if (!essai.ok) throw new ConvexError(essai.raison);
			return {
				resultat: `J’ai préparé ${essai.etape} : il attend votre relecture avant de partir.`,
				cible: essai.envoiId
			};
		}
		case 'RAPPEL': {
			const date = geste.date ?? '';
			if (!dateDuCalendrier(date) || date < aujourdHui) {
				throw new ConvexError('Ce jour est passé : redemandez un rappel à Plume.');
			}
			await ctx.db.insert('suiviDossier', {
				organizationId,
				creanceId: creance._id,
				genre: 'RAPPEL',
				texte: geste.texte ?? 'Revenir sur ce dossier',
				rappelLe: date,
				auteurUserId: userId,
				ecritLe: Date.now()
			});
			return `Rappel posé pour ${jourEnClair(date)}.`;
		}
		case 'PROMESSE': {
			const date = geste.date ?? '';
			const montant = geste.montant ?? 0n;
			if (!dateDuCalendrier(date) || montant <= 0n) {
				throw new ConvexError('Cette promesse est incomplète : redites-la à Plume.');
			}
			await ctx.db.insert('suiviDossier', {
				organizationId,
				creanceId: creance._id,
				genre: 'PROMESSE',
				texte: 'Promesse de paiement',
				montantPromis: montant,
				promisPourLe: date,
				auteurUserId: userId,
				ecritLe: Date.now()
			});
			// La relance que le pilote avait programmée ne part pas sur une parole donnée.
			await apresUneParole(ctx, creance._id);
			return `Promesse de ${versEuros(depuisCentimes(montant))} € notée pour ${jourEnClair(date)}.`;
		}
		case 'NOTE': {
			const texte = (geste.texte ?? '').trim();
			if (texte === '') throw new ConvexError('Cette note est vide.');
			await ctx.db.insert('suiviDossier', {
				organizationId,
				creanceId: creance._id,
				genre: 'NOTE',
				texte,
				auteurUserId: userId,
				ecritLe: Date.now()
			});
			return 'Noté au dossier.';
		}
		case 'EMAIL': {
			const email = (geste.texte ?? '').trim();
			if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
				throw new ConvexError(`« ${email} » ne ressemble pas à une adresse électronique.`);
			}
			await ctx.db.patch(debiteur._id, { email, emailSource: 'SAISIE' });
			await ctx.scheduler.runAfter(0, internal.recouvrement.pilote.reveiller, { organizationId });
			return `Adresse enregistrée : ${email}.`;
		}
		case 'RETIRER_DU_PILOTE':
			await ctx.db.patch(debiteur._id, { horsPilote: true });
			return `Je ne relance plus ${debiteur.denomination}. Je le reprends dès que vous me le demandez.`;
		case 'REMETTRE_AU_PILOTE':
			await ctx.db.patch(debiteur._id, { horsPilote: undefined });
			await ctx.scheduler.runAfter(0, internal.recouvrement.pilote.reveiller, { organizationId });
			return `Je reprends ${debiteur.denomination}.`;
		case 'RETENIR': {
			const programmees = (
				await ctx.db
					.query('envois')
					.withIndex('by_creance', (q) => q.eq('creanceId', creance._id))
					.collect()
			).filter((e) => e.etat === 'PROGRAMME');
			if (programmees.length === 0) {
				throw new ConvexError(
					'Plus rien n’est programmé : la relance est partie, ou déjà retenue.'
				);
			}
			for (const envoi of programmees) {
				if (envoi.envoiProgramme !== undefined) await ctx.scheduler.cancel(envoi.envoiProgramme);
				await ctx.db.patch(envoi._id, { etat: 'ABANDONNE', envoiProgramme: undefined });
			}
			await ctx.db.patch(debiteur._id, { horsPilote: true });
			return 'Retenue. Elle ne partira pas, et ce client sort du pilote.';
		}
		case 'OUVRIR':
			// Un écran s'ouvre côté navigateur : rien ne s'écrit ici.
			return 'Ouvert.';
		case 'CONTESTATION': {
			// ⚠️ UN FAIT DU DOSSIER, PAS UN VERROU : rien ne s'arrête quand on le note.
			const conteste = geste.texte !== 'NON';
			await ctx.runMutation(internal.recouvrement.creances.declarerFaitLitige, {
				creanceId: creance._id,
				cle: 'CONTESTATION_ECRITE',
				reponse: conteste ? 'OUI' : 'NON',
				aujourdHui
			});
			return conteste
				? 'C’est noté : votre client conteste. Rien ne s’arrête, je continue de suivre le dossier.'
				: 'C’est noté : il ne conteste plus.';
		}
		case 'ARRETER_DECOMPTE': {
			const { total, decompteId } = await arreterLeDecompte(ctx, {
				organizationId,
				userId,
				creanceId: creance._id,
				convention: 'ACT_365',
				prevol: { AVOIR_NON_RAPPROCHE: 'ECARTE', REGLEMENT_NON_IMPORTE: 'ECARTE' },
				abandonsAssumes: false
			});
			return {
				resultat: `Décompte arrêté à ${versEuros(depuisCentimes(total))} €. Il ne se modifie plus.`,
				cible: decompteId
			};
		}
		case 'LIEN_PAIEMENT': {
			const decompte = await dernierDecompte(ctx, organizationId, creance._id);
			if (decompte === null) {
				throw new ConvexError('Aucun décompte n’est arrêté : demandez-moi d’abord de l’arrêter.');
			}
			const jeton = await ouvrirLaPageDePaiement(ctx, organizationId, userId, decompte._id);
			return { resultat: 'Sa page de paiement est ouverte.', cible: jeton };
		}
		case 'REMISE_CONSEIL': {
			const decompte = await dernierDecompte(ctx, organizationId, creance._id);
			if (decompte === null) {
				throw new ConvexError('Aucun décompte n’est arrêté : demandez-moi d’abord de l’arrêter.');
			}
			const remisLe =
				geste.date !== undefined && dateDuCalendrier(geste.date) ? geste.date : aujourdHui;
			await declarerLaRemise(ctx, organizationId, {
				decompteId: decompte._id,
				remisLe,
				...(geste.texte === undefined ? {} : { attendu: geste.texte })
			});
			return {
				resultat: `Remise notée au ${jourEnClair(remisLe)}. Je suis ses dates.`,
				cible: decompte._id
			};
		}
	}
}

/**
 * CONFIRMER UN GESTE PROPOSÉ PAR PLUME — et le faire.
 *
 * ⚠️ UN REFUS LAISSE LE GESTE PROPOSÉ : le gérant lit pourquoi il ne s'est pas fait
 * (`ConvexError`), et la carte reste là, avec « Non merci ».
 */
export const confirmer = authedMutation({
	args: { echangeId: v.id('echangesCompagnon'), rang: v.number() },
	returns: v.string(),
	handler: async (ctx, { echangeId, rang }): Promise<string> => {
		const { organizationId, user } = await getUserOrg(ctx);
		const { echange, geste, creance } = await leGeste(ctx, organizationId, echangeId, rang);
		const { resultat, cible } = await faire(ctx, organizationId, user._id, geste, creance);
		await trancher(ctx, echange, rang, 'FAITE', resultat, cible);
		if (geste.genre !== 'OUVRIR') {
			await ctx.db.insert('journal', {
				organizationId,
				cible: creance._id as string,
				cle: `GESTE_${geste.genre}`,
				apres: resultat,
				source: 'Proposé par Plume, confirmé par vous',
				auteur: 'GERANT',
				auteurUserId: user._id,
				consigneLe: Date.now()
			});
		}
		return resultat;
	}
});

/** « Non merci » : le geste reste dans le fil, laissé de côté. */
export const ecarter = authedMutation({
	args: { echangeId: v.id('echangesCompagnon'), rang: v.number() },
	returns: v.null(),
	handler: async (ctx, { echangeId, rang }): Promise<null> => {
		const { organizationId } = await getUserOrg(ctx);
		const { echange } = await leGeste(ctx, organizationId, echangeId, rang);
		await trancher(ctx, echange, rang, 'ECARTEE');
		return null;
	}
});
