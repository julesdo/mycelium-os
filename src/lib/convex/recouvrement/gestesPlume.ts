import { v, ConvexError } from 'convex/values';
import type { MutationCtx } from '../_generated/server';
import { internal } from '../_generated/api';
import type { Doc, Id } from '../_generated/dataModel';
import { authedMutation } from '../functions';
import { getUserOrg } from '../lib/auth';
import { depuisCentimes, depuisEuros, enCentimes, versEuros } from '../../socle/montants';
import {
	NOMBRES_DE_VERSEMENTS,
	dateDuCalendrier,
	jourEnClair,
	type GenreGeste
} from '../../verticales/recouvrement/compagnon/gestes';
import { preparerProchaineRelance } from './pilote';
import { daterLeDecompte } from './decompte';
import { ouvrirLaPageDuJour } from './paiement';
import { declarerLaRemise } from './conseil';
import { apresUneParole, convenirLEcheancier } from './parole';
import { classerLeDossier } from './classement';
import { appliquerLaRepartition, composerProposition } from './lettrage';

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
): Promise<{
	echange: Doc<'echangesCompagnon'>;
	geste: GesteEcrit;
	creance: Doc<'creances'> | null;
}> {
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
	/*
	  LE DOSSIER DU GESTE : celui du fil, ou — dans la conversation de l'établissement
	  (12/10/2026) — celui que le geste nomme. Un écran à ouvrir n'en a pas toujours.
	*/
	const dossier =
		echange.portee === 'PORTEFEUILLE' ? geste.dossier : (echange.cible as Id<'creances'>);
	if (dossier === undefined) return { echange, geste, creance: null };
	const creance = await ctx.db.get(dossier);
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
	cible?: string,
	remplacement?: GesteEcrit
): Promise<void> {
	const gestes = (echange.gestes ?? []).map((g, i) =>
		i === rang
			? {
					...(remplacement ?? g),
					etat,
					...(resultat === undefined ? {} : { resultat }),
					...(cible === undefined ? {} : { cible })
				}
			: g
	);
	await ctx.db.patch(echange._id, { gestes });
}

/**
 * CE QUI SE CORRIGE SUR LA CARTE AVANT DE CONFIRMER (12/10/2026), genre par genre :
 * le jour, le montant, le texte. Rien d'autre ne se modifie — le genre d'un geste et
 * sa cible restent ceux que Plume a proposés et que le gérant a lus.
 */
const CHAMPS_MODIFIABLES: Partial<Record<GenreGeste, readonly ('date' | 'montant' | 'texte')[]>> = {
	RAPPEL: ['date', 'texte'],
	PROMESSE: ['date', 'montant'],
	ECHEANCIER: ['date', 'texte'],
	REGLEMENT: ['date', 'montant'],
	NOTE: ['texte'],
	EMAIL: ['texte'],
	REMISE_CONSEIL: ['date']
};

/**
 * LE GESTE, CORRIGÉ PAR LE GÉRANT — et relu : une valeur corrigée passe les mêmes
 * contrôles que celle que Plume avait proposée, puis ceux du geste lui-même.
 */
function ajuster(
	geste: GesteEcrit,
	ajustement: { date?: string; montant?: string; texte?: string } | undefined
): GesteEcrit {
	if (ajustement === undefined) return geste;
	const permis = CHAMPS_MODIFIABLES[geste.genre] ?? [];
	let ajuste: GesteEcrit = geste;
	if (ajustement.date !== undefined && permis.includes('date')) {
		const date = ajustement.date.trim();
		if (!dateDuCalendrier(date)) throw new ConvexError(`« ${date} » n’est pas une date.`);
		ajuste = { ...ajuste, date };
	}
	if (ajustement.montant !== undefined && permis.includes('montant')) {
		let montant: bigint;
		try {
			montant = enCentimes(depuisEuros(ajustement.montant));
		} catch {
			throw new ConvexError(`« ${ajustement.montant} » n’est pas un montant en euros.`);
		}
		if (montant <= 0n) throw new ConvexError('Le montant doit être supérieur à zéro.');
		ajuste = { ...ajuste, montant };
	}
	if (ajustement.texte !== undefined && permis.includes('texte')) {
		const texte = ajustement.texte.trim();
		if (texte === '') throw new ConvexError('Ce champ ne peut pas rester vide.');
		if (
			geste.genre === 'ECHEANCIER' &&
			!(NOMBRES_DE_VERSEMENTS as readonly number[]).includes(Number.parseInt(texte, 10))
		) {
			throw new ConvexError('Choisissez un nombre de versements entre 2 et 12.');
		}
		ajuste = { ...ajuste, texte: texte.slice(0, 1000) };
	}
	return ajuste;
}

/** Ce que le geste fait, et la phrase qui le dit une fois fait. */
async function faire(
	ctx: MutationCtx,
	organizationId: Id<'organizations'>,
	userId: string,
	geste: GesteEcrit,
	creance: Doc<'creances'> | null
): Promise<{ resultat: string; cible?: string }> {
	// Un écran s'ouvre côté navigateur : rien ne s'écrit, et aucun dossier n'est requis.
	if (geste.genre === 'OUVRIR') return { resultat: 'Ouvert.' };
	if (creance === null) throw new ConvexError('Ce geste ne dit pas quel dossier il touche.');
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
			// Un geste proposé avant le 09/10/2026 : le montant se date, il ne s'« arrête » plus.
			const date = await daterLeDecompte(ctx, {
				creance,
				aujourdHui,
				pour: 'votre demande à Plume',
				auteur: 'GERANT',
				userId
			});
			if ('refus' in date) throw new ConvexError(date.refus);
			return {
				resultat: `Montant daté à ${versEuros(depuisCentimes(date.decompte.total))} €. Les pénalités continuent de courir jusqu’au paiement.`,
				cible: date.decompte._id
			};
		}
		case 'LIEN_PAIEMENT': {
			// Le montant se date à l'ouverture : plus de décompte à arrêter d'abord.
			const jeton = await ouvrirLaPageDuJour(ctx, organizationId, userId, creance._id);
			return { resultat: 'Sa page de paiement est ouverte.', cible: jeton };
		}
		case 'REMISE_CONSEIL': {
			// Le dossier remis emporte le montant du jour, daté.
			const date = await daterLeDecompte(ctx, {
				creance,
				aujourdHui,
				pour: 'la remise à votre conseil',
				auteur: 'GERANT',
				userId
			});
			if ('refus' in date) throw new ConvexError(date.refus);
			const decompte = date.decompte;
			const remisLe =
				geste.date !== undefined && dateDuCalendrier(geste.date) && geste.date <= aujourdHui
					? geste.date
					: aujourdHui;
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
		case 'ECHEANCIER': {
			const nombre = Number.parseInt(geste.texte ?? '', 10);
			const date = geste.date ?? '';
			await convenirLEcheancier(ctx, organizationId, userId, {
				creanceId: creance._id,
				nombre,
				premiereLe: date,
				intervalleMois: 1
			});
			return `Paiement en ${nombre} fois convenu, premier versement ${jourEnClair(date)}. Tant que les versements arrivent, je ne le relance pas.`;
		}
		case 'CLASSER': {
			const motif = geste.texte;
			if (motif !== 'GESTE_COMMERCIAL' && motif !== 'IRRECOUVRABLE' && motif !== 'ERREUR') {
				throw new ConvexError('Cette raison ne se classe pas d’un geste : dites-la-moi.');
			}
			await classerLeDossier(ctx, organizationId, userId, { creanceId: creance._id, motif });
			return 'Dossier classé. Les relances s’arrêtent, et il se rouvre depuis sa page.';
		}
		case 'REGLEMENT': {
			/*
			  UN PAIEMENT REÇU, RAPPROCHÉ COMME SUR LA FICHE (« Virement reçu ») : s'il
			  solde exactement un jeu de factures, ce sont elles ; s'il n'en solde aucun,
			  il se répartit dans l'ordre que prévoit la loi. Quand plusieurs jeux de
			  factures font ce montant, le logiciel ne choisit pas : le gérant le fait sur
			  la fiche, où les combinaisons s'affichent.
			*/
			const montant = geste.montant ?? 0n;
			const date = geste.date ?? aujourdHui;
			if (montant <= 0n || !dateDuCalendrier(date) || date > aujourdHui) {
				throw new ConvexError('Ce paiement est incomplet : redites-moi son montant et son jour.');
			}
			const proposition = await composerProposition(
				ctx,
				organizationId,
				creance.debiteurId,
				montant
			);
			const dit = `Paiement de ${versEuros(depuisCentimes(montant))} € noté au ${jourEnClair(date)}`;
			if (proposition.issue === 'UNIQUE') {
				const references = proposition.combinaisons[0]?.references ?? [];
				await ctx.runMutation(internal.recouvrement.lettrage.appliquerInterne, {
					organizationId,
					debiteurId: creance.debiteurId,
					references,
					montant,
					date
				});
				await ctx.scheduler.runAfter(0, internal.recouvrement.pilote.reveiller, { organizationId });
				return `${dit} : il solde ${references.join(', ')}. Ce qui est réglé ne se relance plus.`;
			}
			if (proposition.issue === 'AUCUNE') {
				await appliquerLaRepartition(ctx, organizationId, creance.debiteurId, montant, date);
				await ctx.scheduler.runAfter(0, internal.recouvrement.pilote.reveiller, { organizationId });
				return `${dit}, réparti sur ses factures dans l’ordre que prévoit la loi. Ce qui est réglé ne se relance plus.`;
			}
			throw new ConvexError(
				'Plusieurs jeux de factures font ce montant : choisissez lesquelles il règle sur sa fiche, sous « Virement reçu ».'
			);
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
	args: {
		echangeId: v.id('echangesCompagnon'),
		rang: v.number(),
		/** Ce que le gérant a corrigé sur la carte avant de confirmer (12/10/2026). */
		ajustement: v.optional(
			v.object({
				date: v.optional(v.string()),
				montant: v.optional(v.string()),
				texte: v.optional(v.string())
			})
		)
	},
	returns: v.string(),
	handler: async (ctx, { echangeId, rang, ajustement }): Promise<string> => {
		const { organizationId, user } = await getUserOrg(ctx);
		const lu = await leGeste(ctx, organizationId, echangeId, rang);
		const { echange, creance } = lu;
		const geste = ajuster(lu.geste, ajustement);
		const { resultat, cible } = await faire(ctx, organizationId, user._id, geste, creance);
		await trancher(
			ctx,
			echange,
			rang,
			'FAITE',
			resultat,
			cible,
			geste === lu.geste ? undefined : geste
		);
		if (geste.genre !== 'OUVRIR' && creance !== null) {
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
