import { v, ConvexError, type Infer } from 'convex/values';
import { internalMutation, internalQuery, type MutationCtx } from '../_generated/server';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { libelleDuSegment, SEGMENTS_PAR_DEFAUT } from '../../crm/prospects-du-jour';
import { ZONES } from '../../crm/annuaire';
import { equipeMutation, equipeQuery } from './enveloppe';
import { vResultatDeTravail, vSegment, vZone } from './validateursProspection';

/**
 * PLUME, LES PROSPECTS DU JOUR (20/10/2026). Le fondateur : « utiliser Plume pour analyser
 * les meilleurs prospects et les ajouter en automatique chaque jour ».
 *
 * Éteint tant qu'un fondateur ne l'allume pas : chaque matin, un appel au modèle. Allumé,
 * le cron du matin lance un travail « Prospects du jour » (`prospectsDuJourExecution.ts`),
 * visible dans la file comme les autres ; « Chercher maintenant » le lance à la main.
 */

/** Plume choisit au plus vingt prospects par jour : au-delà, l'équipe ne les appelle pas. */
const PAR_JOUR_MAX = 20;
/** Un seul choix du matin : un second lancé dans les vingt heures attend demain. */
const UN_PAR_JOUR_MS = 20 * 3_600_000;

type Segment = Infer<typeof vSegment>;

const vReglages = v.object({
	actif: v.boolean(),
	parJour: v.number(),
	zone: vZone,
	segments: v.array(vSegment),
	curseurs: v.array(v.object({ cle: v.string(), page: v.number() }))
});
type Reglages = Infer<typeof vReglages>;

const PAR_DEFAUT: Reglages = {
	actif: false,
	parJour: 10,
	zone: 'PETITE_COURONNE',
	segments: [...SEGMENTS_PAR_DEFAUT] as Segment[],
	curseurs: []
};

export const lireReglages = internalQuery({
	args: {},
	returns: vReglages,
	handler: async (ctx): Promise<Reglages> => {
		const doc = await ctx.db.query('reglagesProspection').first();
		if (doc === null) return PAR_DEFAUT;
		return {
			actif: doc.actif,
			parJour: doc.parJour,
			zone: doc.zone,
			segments: doc.segments,
			curseurs: doc.curseurs
		};
	}
});

/** Ce que l'écran montre : le réglage, et le dernier choix de Plume. */
export const reglages = equipeQuery('LECTURE')({
	args: {},
	returns: v.object({
		actif: v.boolean(),
		parJour: v.number(),
		zone: vZone,
		libelleZone: v.string(),
		segments: v.array(v.string()),
		dernier: v.union(
			v.null(),
			v.object({
				_id: v.id('travauxEquipe'),
				etat: v.string(),
				creeLe: v.number(),
				resultat: v.optional(vResultatDeTravail)
			})
		)
	}),
	handler: async (ctx) => {
		const doc = await ctx.db.query('reglagesProspection').first();
		const r: Reglages =
			doc === null
				? PAR_DEFAUT
				: {
						actif: doc.actif,
						parJour: doc.parJour,
						zone: doc.zone,
						segments: doc.segments,
						curseurs: doc.curseurs
					};
		const recents = await ctx.db
			.query('travauxEquipe')
			.withIndex('by_creeLe')
			.order('desc')
			.take(30);
		const dernier = recents.find((t) => t.genre === 'PROSPECTS_DU_JOUR');
		return {
			actif: r.actif,
			parJour: r.parJour,
			zone: r.zone,
			libelleZone: ZONES[r.zone].libelle,
			segments: r.segments.map(libelleDuSegment),
			dernier:
				dernier === undefined
					? null
					: {
							_id: dernier._id,
							etat: dernier.etat,
							creeLe: dernier.creeLe,
							...(dernier.resultat === undefined ? {} : { resultat: dernier.resultat })
						}
		};
	}
});

async function ecrireReglages(
	ctx: MutationCtx,
	changement: Partial<Reglages>,
	par: string | undefined
): Promise<void> {
	const doc = await ctx.db.query('reglagesProspection').first();
	const suite = {
		...(par === undefined ? {} : { modifiePar: par, modifieLe: Date.now() })
	};
	if (doc === null) {
		await ctx.db.insert('reglagesProspection', { ...PAR_DEFAUT, ...changement, ...suite });
	} else {
		await ctx.db.patch(doc._id, { ...changement, ...suite });
	}
}

export const regler = equipeMutation('FONDATEUR')({
	args: { actif: v.boolean(), parJour: v.number(), zone: vZone },
	returns: v.null(),
	handler: async (ctx, { actif, parJour, zone }) => {
		const nombre = Math.trunc(parJour);
		if (nombre < 1 || nombre > PAR_JOUR_MAX)
			throw new ConvexError(`Entre 1 et ${PAR_JOUR_MAX} prospects par jour.`);
		await ecrireReglages(ctx, { actif, parJour: nombre, zone }, ctx.equipier.email);
		return null;
	}
});

/** La page où chaque segment reprendra demain. */
export const avancerCurseurs = internalMutation({
	args: { curseurs: v.array(v.object({ cle: v.string(), page: v.number() })) },
	returns: v.null(),
	handler: async (ctx, { curseurs }) => {
		await ecrireReglages(ctx, { curseurs }, undefined);
		return null;
	}
});

async function creerLeTravail(
	ctx: MutationCtx,
	r: Reglages,
	par: string
): Promise<Id<'travauxEquipe'>> {
	const id = await ctx.db.insert('travauxEquipe', {
		genre: 'PROSPECTS_DU_JOUR',
		libelle: `Prospects du jour · Plume · ${ZONES[r.zone].court}`,
		criteres: { zone: r.zone, page: 1 },
		etat: 'EN_ATTENTE',
		etape: 'En attente',
		par,
		vu: false,
		creeLe: Date.now()
	});
	await ctx.scheduler.runAfter(0, internal.admin.prospectsDuJourExecution.executer, { id });
	return id;
}

async function dejaLanceAujourdhui(ctx: MutationCtx): Promise<boolean> {
	const recents = await ctx.db.query('travauxEquipe').withIndex('by_creeLe').order('desc').take(30);
	return recents.some(
		(t) =>
			t.genre === 'PROSPECTS_DU_JOUR' &&
			(t.etat === 'EN_ATTENTE' || t.etat === 'EN_COURS' || t.creeLe > Date.now() - UN_PAR_JOUR_MS)
	);
}

/** « Chercher maintenant » : le choix du jour, sans attendre demain matin. */
export const lancerMaintenant = equipeMutation('SUPPORT')({
	args: {},
	returns: v.id('travauxEquipe'),
	handler: async (ctx): Promise<Id<'travauxEquipe'>> => {
		const recents = await ctx.db.query('travauxEquipe').withIndex('by_creeLe').order('desc').take(30);
		if (recents.some((t) => t.genre === 'PROSPECTS_DU_JOUR' && (t.etat === 'EN_ATTENTE' || t.etat === 'EN_COURS')))
			throw new ConvexError('Plume cherche déjà : le choix arrive dans la file.');
		const doc = await ctx.db.query('reglagesProspection').first();
		const r: Reglages = doc === null ? PAR_DEFAUT : { ...doc };
		return creerLeTravail(ctx, r, ctx.equipier.email);
	}
});

/** Le cron du matin : allumé et pas encore lancé aujourd'hui, Plume cherche. */
export const lancerDuJour = internalMutation({
	args: {},
	returns: v.null(),
	handler: async (ctx) => {
		const doc = await ctx.db.query('reglagesProspection').first();
		if (doc === null || !doc.actif) return null;
		if (await dejaLanceAujourdhui(ctx)) return null;
		await creerLeTravail(ctx, { ...doc }, 'Plume');
		return null;
	}
});
