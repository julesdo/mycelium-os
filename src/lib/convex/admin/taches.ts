import { v, ConvexError } from 'convex/values';
import type { Doc } from '../_generated/dataModel';
import type { QueryCtx } from '../_generated/server';
import { equipeMutation, equipeQuery } from './enveloppe';

/**
 * LES TÂCHES DE L'ÉQUIPE (16/10/2026) : quoi, pour quand, pour qui, sur quelle
 * fiche. Une tâche « Appeler » naît seule quand un compte atteint le score de 60
 * (`croissance/releve.ts`). Elles se cochent d'un toucher, et se décochent.
 */

const SEPT_JOURS = 7 * 24 * 60 * 60 * 1000;

export const vTache = v.object({
	id: v.id('tachesCrm'),
	titre: v.string(),
	pour: v.number(),
	assigneA: v.optional(v.string()),
	faiteLe: v.optional(v.number()),
	origine: v.union(v.literal('MAIN'), v.literal('SCORE')),
	fiche: v.optional(
		v.object({
			type: v.union(v.literal('COMPTE'), v.literal('PROSPECT')),
			id: v.string(),
			libelle: v.string()
		})
	)
});

export async function tacheAffichee(
	ctx: QueryCtx,
	t: Doc<'tachesCrm'>
): Promise<typeof vTache.type> {
	let fiche: (typeof vTache.type)['fiche'];
	if (t.organizationId !== undefined) {
		const org = await ctx.db.get(t.organizationId);
		if (org !== null) fiche = { type: 'COMPTE', id: org._id, libelle: org.name };
	} else if (t.prospectId !== undefined) {
		const p = await ctx.db.get(t.prospectId);
		if (p !== null) fiche = { type: 'PROSPECT', id: p._id, libelle: p.entreprise };
	}
	return {
		id: t._id,
		titre: t.titre,
		pour: t.pour,
		origine: t.origine,
		...(t.assigneA === undefined ? {} : { assigneA: t.assigneA }),
		...(t.faiteLe === undefined ? {} : { faiteLe: t.faiteLe }),
		...(fiche === undefined ? {} : { fiche })
	};
}

/** Les tâches ouvertes et celles faites depuis sept jours ; le groupement se fait à l'écran. */
export const liste = equipeQuery('LECTURE')({
	args: {
		fiche: v.optional(
			v.union(
				v.object({ compte: v.id('organizations') }),
				v.object({ prospect: v.id('prospects') })
			)
		)
	},
	returns: v.array(vTache),
	handler: async (ctx, { fiche }) => {
		let taches: Doc<'tachesCrm'>[];
		if (fiche !== undefined) {
			taches =
				'compte' in fiche
					? await ctx.db
							.query('tachesCrm')
							.withIndex('by_org', (q) => q.eq('organizationId', fiche.compte))
							.take(200)
					: await ctx.db
							.query('tachesCrm')
							.withIndex('by_prospect', (q) => q.eq('prospectId', fiche.prospect))
							.take(200);
		} else {
			const ouvertes = await ctx.db
				.query('tachesCrm')
				.withIndex('by_faite_et_pour', (q) => q.eq('faiteLe', undefined))
				.take(500);
			const faites = await ctx.db
				.query('tachesCrm')
				.withIndex('by_faite_et_pour', (q) => q.gte('faiteLe', Date.now() - SEPT_JOURS))
				.take(200);
			taches = [...ouvertes, ...faites];
		}
		const resultat = [];
		for (const t of taches) resultat.push(await tacheAffichee(ctx, t));
		return resultat;
	}
});

export const creer = equipeMutation('SUPPORT')({
	args: {
		titre: v.string(),
		pour: v.number(),
		assigneA: v.optional(v.string()),
		fiche: v.optional(
			v.union(
				v.object({ compte: v.id('organizations') }),
				v.object({ prospect: v.id('prospects') })
			)
		)
	},
	returns: v.id('tachesCrm'),
	handler: async (ctx, { titre, pour, assigneA, fiche }) => {
		const propre = titre.trim().slice(0, 300);
		if (propre === '') throw new ConvexError('Dites ce qu’il faut faire.');
		if (!Number.isFinite(pour)) throw new ConvexError('Date invalide.');
		return await ctx.db.insert('tachesCrm', {
			titre: propre,
			pour,
			assigneA: assigneA ?? ctx.equipier.email,
			origine: 'MAIN',
			creePar: ctx.equipier.email,
			creeLe: Date.now(),
			...(fiche === undefined
				? {}
				: 'compte' in fiche
					? { organizationId: fiche.compte }
					: { prospectId: fiche.prospect })
		});
	}
});

export const cocher = equipeMutation('SUPPORT')({
	args: { tacheId: v.id('tachesCrm'), faite: v.boolean() },
	returns: v.null(),
	handler: async (ctx, { tacheId, faite }): Promise<null> => {
		const t = await ctx.db.get(tacheId);
		if (t === null) throw new ConvexError('Tâche introuvable.');
		await ctx.db.patch(tacheId, { faiteLe: faite ? Date.now() : undefined });
		return null;
	}
});
