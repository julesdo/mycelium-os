import { ConvexError, v, type Infer } from 'convex/values';
import { internalMutation, type MutationCtx } from '../_generated/server';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { equipeMutation, equipeQuery, noterAuJournal } from './enveloppe';
import { equipeAction } from './action';
import { vAvantagePrivilege } from './tables';
import {
	MAX_CODES_PAR_CREATION,
	OCTETS_D_UN_CODE,
	avantageValide,
	codeDepuisOctets,
	empreinteDuCode,
	etatDuCode,
	finDuCode,
	formaterCode,
	libelleDeLAvantage
} from '../../paiement/codes-privilege';

/**
 * LES CODES PRIVILÈGES, CÔTÉ ÉQUIPE (27/10/2026). Le fondateur seul les crée et les
 * révoque ; ils se lisent dans « L'équipe », à côté du journal.
 *
 * ⚠️ LE CODE SE TIRE DANS UNE ACTION : l'aléa d'une mutation est rejoué à l'identique
 * quand Convex la reprend, celui d'une action vient du système. Le code en clair ne
 * quitte l'action que vers l'écran qui l'a demandé, une fois ; la base n'en reçoit que
 * l'empreinte et les quatre derniers signes.
 *
 * Révoquer un code utilisé met fin à son avantage : l'accès à vie se retire, la remise
 * en attente s'efface, et celle déjà posée chez Paddle s'en retire.
 */

const vEtat = v.union(
	v.literal('DISPONIBLE'),
	v.literal('UTILISE'),
	v.literal('REVOQUE'),
	v.literal('EXPIRE')
);

const vCodeListe = v.object({
	id: v.id('codesPrivilege'),
	fin: v.string(),
	libelle: v.string(),
	avantage: vAvantagePrivilege,
	titre: v.string(),
	etat: vEtat,
	creePar: v.string(),
	creeLe: v.number(),
	expireLe: v.optional(v.number()),
	utiliseLe: v.optional(v.number()),
	utiliseParNom: v.optional(v.string()),
	utiliseParOrganisation: v.optional(v.id('organizations')),
	revoqueLe: v.optional(v.number())
});
export type CodeListe = Infer<typeof vCodeListe>;

export const lister = equipeQuery('FONDATEUR')({
	args: {},
	returns: v.array(vCodeListe),
	handler: async (ctx): Promise<CodeListe[]> => {
		const codes = await ctx.db
			.query('codesPrivilege')
			.withIndex('by_cree_le')
			.order('desc')
			.take(300);
		const maintenant = Date.now();
		return codes.map((c) => ({
			id: c._id,
			fin: c.fin,
			libelle: c.libelle,
			avantage: c.avantage,
			titre: libelleDeLAvantage(c.avantage),
			etat: etatDuCode(c, maintenant),
			creePar: c.creePar,
			creeLe: c.creeLe,
			...(c.expireLe === undefined ? {} : { expireLe: c.expireLe }),
			...(c.utiliseLe === undefined ? {} : { utiliseLe: c.utiliseLe }),
			...(c.utiliseParNom === undefined ? {} : { utiliseParNom: c.utiliseParNom }),
			...(c.utiliseParOrganisation === undefined
				? {}
				: { utiliseParOrganisation: c.utiliseParOrganisation }),
			...(c.revoqueLe === undefined ? {} : { revoqueLe: c.revoqueLe })
		}));
	}
});

const JOUR = 24 * 60 * 60 * 1000;

/** Crée N codes et les rend en clair, une seule fois. */
export const creer = equipeAction('FONDATEUR')({
	args: {
		libelle: v.string(),
		avantage: vAvantagePrivilege,
		nombre: v.number(),
		/** La validité avant usage, en jours ; `null` : sans limite. */
		validiteJours: v.union(v.number(), v.null())
	},
	handler: async (ctx, { libelle, avantage, nombre, validiteJours }): Promise<string[]> => {
		const nom = libelle.trim();
		if (nom.length < 2 || nom.length > 80) {
			throw new ConvexError('Dites pour qui est ce code, en deux à quatre-vingts signes.');
		}
		const refus = avantageValide(avantage);
		if (refus !== null) throw new ConvexError(refus);
		if (!Number.isInteger(nombre) || nombre < 1 || nombre > MAX_CODES_PAR_CREATION) {
			throw new ConvexError(`De 1 à ${MAX_CODES_PAR_CREATION} codes à la fois.`);
		}
		if (validiteJours !== null && (!Number.isInteger(validiteJours) || validiteJours < 1)) {
			throw new ConvexError('La validité se compte en jours entiers.');
		}
		const codes = Array.from({ length: nombre }, () =>
			codeDepuisOctets(crypto.getRandomValues(new Uint8Array(OCTETS_D_UN_CODE)))
		);
		const lignes = await Promise.all(
			codes.map(async (code) => ({ empreinte: await empreinteDuCode(code), fin: finDuCode(code) }))
		);
		await ctx.runMutation(internal.admin.codes._inserer, {
			lignes,
			libelle: nom,
			avantage,
			...(validiteJours === null ? {} : { expireLe: Date.now() + validiteJours * JOUR }),
			auteur: ctx.equipier.email
		});
		return codes.map(formaterCode);
	}
});

export const _inserer = internalMutation({
	args: {
		lignes: v.array(v.object({ empreinte: v.string(), fin: v.string() })),
		libelle: v.string(),
		avantage: vAvantagePrivilege,
		expireLe: v.optional(v.number()),
		auteur: v.string()
	},
	returns: v.null(),
	handler: async (ctx, { lignes, libelle, avantage, expireLe, auteur }): Promise<null> => {
		const maintenant = Date.now();
		for (const { empreinte, fin } of lignes) {
			// 80 bits ne se croisent pas ; si cela arrivait, rien ne s'écrit et la création
			// se refait, plutôt qu'un code qui en ouvrirait deux.
			const deja = await ctx.db
				.query('codesPrivilege')
				.withIndex('by_empreinte', (q) => q.eq('empreinte', empreinte))
				.first();
			if (deja !== null) throw new ConvexError('Un code tiré existe déjà. Recréez-les.');
			await ctx.db.insert('codesPrivilege', {
				empreinte,
				fin,
				libelle,
				avantage,
				creePar: auteur,
				creeLe: maintenant,
				...(expireLe === undefined ? {} : { expireLe })
			});
		}
		await noterAuJournal(ctx, auteur, {
			action: 'CODES_CREES',
			cible: {
				type: 'CODE',
				libelle: `${lignes.length > 1 ? `${lignes.length} codes` : 'un code'} « ${libelle} » (${libelleDeLAvantage(avantage)})`
			}
		});
		return null;
	}
});

/** Révoque un code ; s'il a servi, son avantage prend fin. */
export const revoquer = equipeMutation('FONDATEUR')({
	args: { id: v.id('codesPrivilege') },
	returns: v.null(),
	handler: async (ctx, { id }): Promise<null> => revoquerLeCode(ctx, id, ctx.equipier.email)
});

/** Le cœur de la révocation, appelé tel quel par les tests (Better Auth n'y est pas). */
export async function revoquerLeCode(
	ctx: MutationCtx,
	id: Id<'codesPrivilege'>,
	auteur: string
): Promise<null> {
	const code = await ctx.db.get(id);
	if (code === null) throw new ConvexError('Ce code n’existe plus.');
	if (code.revoqueLe !== undefined) return null;
	const maintenant = Date.now();
	await ctx.db.patch(id, { revoqueLe: maintenant, revoquePar: auteur });

	const org =
		code.utiliseParOrganisation === undefined
			? null
			: await ctx.db.get(code.utiliseParOrganisation);
	if (org !== null) {
		if (org.accesOffert?.codeId === id) {
			await ctx.db.patch(org._id, { accesOffert: undefined });
		}
		const remise = org.remisePrivilege;
		if (remise?.codeId === id) {
			await ctx.db.patch(org._id, { remisePrivilege: undefined });
			if (
				remise.etat === 'APPLIQUEE' &&
				remise.remiseId !== undefined &&
				org.paddleSubscriptionId !== undefined
			) {
				await ctx.scheduler.runAfter(0, internal.paddle.retirerLaRemisePrivilege, {
					organizationId: org._id,
					abonnementId: org.paddleSubscriptionId,
					remiseId: remise.remiseId
				});
			}
		}
	}
	await noterAuJournal(ctx, auteur, {
		action: 'CODE_REVOQUE',
		cible: { type: 'CODE', id, libelle: `le code « ${code.libelle} » (…${code.fin})` },
		...(org === null ? {} : { organizationId: org._id })
	});
	return null;
}
